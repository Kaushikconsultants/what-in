import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInboxMessagePushNotification, sendNewOrderPushNotification } from "@/lib/pushNotifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const testType = body.type === "order" ? "order" : "inbox";

    // Auto-upsert subscription if passed directly from client
    if (body.subscription?.endpoint && body.subscription?.keys?.p256dh && body.subscription?.keys?.auth) {
      await prisma.whatsAppPushSubscription.upsert({
        where: { endpoint: body.subscription.endpoint },
        update: {
          p256dh: body.subscription.keys.p256dh,
          auth: body.subscription.keys.auth
        },
        create: {
          userId: "agent@esponclothing.com",
          endpoint: body.subscription.endpoint,
          p256dh: body.subscription.keys.p256dh,
          auth: body.subscription.keys.auth
        }
      }).catch(() => {});
    }

    const subs = await prisma.whatsAppPushSubscription.findMany();
    if (subs.length === 0) {
      return NextResponse.json({
        success: false,
        count: 0,
        error: "No active push subscriptions found on server. Please click 'Turn On Phone Alerts' first to register this device."
      }, { status: 400 });
    }

    if (testType === "order") {
      await sendNewOrderPushNotification({
        orderNumber: String(Math.floor(1000 + Math.random() * 9000)),
        customerName: "Priya Sharma",
        customerPhone: "+91 98765 43210",
        totalAmount: 2499,
        itemsCount: 2,
        source: "WhatsApp Catalog"
      });
      return NextResponse.json({
        success: true,
        count: subs.length,
        message: `🛍️ Order alert dispatched to ${subs.length} device(s)! Look at your lock-screen.`
      });
    } else {
      await sendInboxMessagePushNotification({
        customerName: "Rahul Verma",
        customerPhone: "+91 98965 07407",
        messageText: "Hello! Is this product available in size XL? Please share UPI payment link.",
        conversationId: "test-conv"
      });
      return NextResponse.json({
        success: true,
        count: subs.length,
        message: `💬 Message alert dispatched to ${subs.length} device(s)! Look at your lock-screen.`
      });
    }
  } catch (error: any) {
    console.error("[Push Test Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
