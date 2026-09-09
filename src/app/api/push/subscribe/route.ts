import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userCookie = req.cookies.get("wm_user")?.value;
    if (!userCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = JSON.parse(userCookie);
    const userEmail = userData.email;

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, p256dh, auth } = await req.json();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing subscription details" }, { status: 400 });
    }

    // Upsert the subscription using the endpoint as the unique identifier
    await prisma.whatsAppPushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: userEmail,
        p256dh,
        auth
      },
      create: {
        userId: userEmail,
        endpoint,
        p256dh,
        auth
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Push Subscribe Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
