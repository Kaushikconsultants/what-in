import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

const VAPID_PUBLIC_KEY = "BB-KZlpv_rpNWxWRhy0qmhKvmRPSD54y7BKlbA07xsuRbUlEbDLASekDIHTFgX-au3sAOSG4WJ5ZaHgk9tJ0HEg";

export async function GET() {
  return NextResponse.json({
    vapidPublicKey: VAPID_PUBLIC_KEY
  });
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req).catch(() => null);
    const isOwner = isOwnerAuthenticated(req);

    if (!authUser && !isOwner) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const userEmail = authUser?.email || "owner@platform.superadmin";
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
