import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";
import { sendInboxMessagePushNotification, sendNewOrderPushNotification } from "@/lib/pushNotifications";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req).catch(() => null);
    const isOwner = isOwnerAuthenticated(req);

    if (!authUser && !isOwner) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const testType = body.type === "order" ? "order" : "inbox";

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
        message: "Order test alert sent! Check your phone/browser notifications."
      });
    } else {
      await sendInboxMessagePushNotification({
        customerName: "Rahul Verma",
        customerPhone: "+91 98965 07407",
        messageText: "Hello! Is this product available in size XL? Can you share UPI payment link?",
        conversationId: "test-conv"
      });
      return NextResponse.json({
        success: true,
        message: "Inbox test alert sent! Check your phone/browser notifications."
      });
    }
  } catch (error: any) {
    console.error("[Push Test Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
