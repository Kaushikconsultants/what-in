import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

const VAPID_PUBLIC_KEY = "BB-KZlpv_rpNWxWRhy0qmhKvmRPSD54y7BKlbA07xsuRbUlEbDLASekDIHTFgX-au3sAOSG4WJ5ZaHgk9tJ0HEg";
const VAPID_PRIVATE_KEY = "yWJ-C37EvnvQMHhHuwWSwCiOn3Ni7x5Rt3pywRbdjso";

webPush.setVapidDetails(
  "mailto:support@whatmore.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    const secret = req.headers.get("x-internal-secret");
    const isSecretValid = process.env.INTERNAL_API_SECRET && secret === process.env.INTERNAL_API_SECRET;

    if (!isOwner && !user && !isSecretValid) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { subscription, payload } = await req.json();
    if (!subscription || !payload) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await webPush.sendNotification(subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Push Send Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
