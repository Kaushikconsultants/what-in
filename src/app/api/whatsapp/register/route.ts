import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOwnerAuthenticated, getAuthenticatedUser } from "@/lib/authSession";

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "OWNER" && user.role !== "SUPER_ADMIN" && !user.clientId))) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { phoneNumberId, pin, accessToken, wabaId } = await req.json();

    if (!phoneNumberId || !pin) {
      return NextResponse.json({ success: false, error: "Missing phoneNumberId or pin" }, { status: 400 });
    }

    let token = accessToken;
    let effectivePhoneId = phoneNumberId;

    let client: any = null;
    if (user?.clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    } else if (user?.email) {
      client = await prisma.whatsAppClient.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { adminEmail: user.email }
          ]
        }
      });
    }

    if (client) {
      if (accessToken) {
        await prisma.whatsAppClient.update({
          where: { id: client.id },
          data: {
            metaAccessToken: accessToken,
            phoneId: phoneNumberId,
            wabaId: wabaId || client.wabaId
          }
        });
      }
      token = token || client.metaAccessToken;
      effectivePhoneId = effectivePhoneId || client.phoneId;
    } else {
      let account = await prisma.whatsAppAccount.findFirst();
      if (accessToken) {
        if (account) {
          account = await prisma.whatsAppAccount.update({
            where: { id: account.id },
            data: { accessToken, phoneId: phoneNumberId, businessAccountId: wabaId || account.businessAccountId }
          });
        } else {
          account = await prisma.whatsAppAccount.create({
            data: {
              accessToken,
              phoneId: phoneNumberId,
              businessAccountId: wabaId || "",
              phoneNumber: "",
              name: "Main WhatsApp Account",
            }
          });
        }
      }
      token = token || account?.accessToken;
      effectivePhoneId = effectivePhoneId || account?.phoneId;
    }

    if (!token || !effectivePhoneId) {
      return NextResponse.json({ success: false, error: "No Meta Access Token or Phone ID found. Please configure your Meta credentials first." }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v21.0/${effectivePhoneId}/register`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: pin,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ success: false, error: data.error.message, details: data.error }, { status: 400 });
    }

    // Auto-subscribe WABA if provided
    if (wabaId) {
      try {
        await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (_) {}
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[WhatsApp Registration API Error]", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
