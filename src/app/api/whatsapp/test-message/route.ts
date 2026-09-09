import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: "Missing phone number" }, { status: 400 });
    }

    // Securely fetch the Access Token from DB
    const account = await prisma.whatsAppAccount.findFirst({
      where: { accessToken: { not: null } }
    });

    if (!account || !account.accessToken || !account.phoneId) {
      return NextResponse.json({ success: false, error: "No Meta Access Token or Phone ID found in the database. Please connect your API first." }, { status: 400 });
    }

    // Sanitize phone number (remove any + or spaces)
    const sanitizedPhone = phone.replace(/[^0-9]/g, '');

    const url = `https://graph.facebook.com/v20.0/${account.phoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: sanitizedPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US"
          }
        }
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ success: false, error: data.error.message, details: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[WhatsApp Test Message API Error]", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
