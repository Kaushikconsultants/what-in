import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumberId, pin, accessToken, wabaId } = await req.json();

    if (!phoneNumberId || !pin) {
      return NextResponse.json({ success: false, error: "Missing phoneNumberId or pin" }, { status: 400 });
    }

    // Securely update or fetch the Access Token in the DB
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

    if (!account || !account.accessToken) {
      return NextResponse.json({ success: false, error: "No Meta Access Token found in the database. Please configure your Meta App credentials first." }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/register`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.accessToken}`,
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

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[WhatsApp Registration API Error]", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
