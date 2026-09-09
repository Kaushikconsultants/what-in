import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";

const VAPID_PUBLIC_KEY = "BB-KZlpv_rpNWxWRhy0qmhKvmRPSD54y7BKlbA07xsuRbUlEbDLASekDIHTFgX-au3sAOSG4WJ5ZaHgk9tJ0HEg";
const VAPID_PRIVATE_KEY = "yWJ-C37EvnvQMHhHuwWSwCiOn3Ni7x5Rt3pywRbdjso";

webPush.setVapidDetails(
  "mailto:support@what-in.tinkal.in",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== (process.env.INTERNAL_API_SECRET || 'crm_internal_2026')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
