import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = "BB-KZlpv_rpNWxWRhy0qmhKvmRPSD54y7BKlbA07xsuRbUlEbDLASekDIHTFgX-au3sAOSG4WJ5ZaHgk9tJ0HEg";
const VAPID_PRIVATE_KEY = "yWJ-C37EvnvQMHhHuwWSwCiOn3Ni7x5Rt3pywRbdjso";

try {
  webPush.setVapidDetails(
    "mailto:support@whatmore.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn("[webPush setVapidDetails warning]:", e);
}

/**
 * Dispatches a push notification directly in-process to all or selected admins.
 */
export async function sendPushNotificationToAdmins(title: string, body: string, url: string = "/whatsapp/templates") {
  try {
    const [adminUsers, adminAgents] = await Promise.all([
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } }),
      prisma.whatsAppAgentUser.findMany({ where: { role: "ADMIN" }, select: { email: true } })
    ]);

    const targetEmails = Array.from(new Set([
      ...adminUsers.map((u) => u.email),
      ...adminAgents.map((a) => a.email)
    ])).filter(Boolean);

    const subs = await prisma.whatsAppPushSubscription.findMany();
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/whatsapp-badge.png",
      type: "admin",
      url,
      timestamp: Date.now()
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        if (targetEmails.length > 0 && !targetEmails.includes(sub.userId)) {
          return;
        }
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          await webPush.sendNotification(pushSubscription, payload);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.whatsAppPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
  } catch (error) {
    console.error("[sendPushNotificationToAdmins] Error:", error);
  }
}

export async function notifyAdminsOfTemplateStatusChange(
  templateName: string,
  status: string,
  reason?: string | null,
  language: string = "en_US"
) {
  const normStatus = (status || "").toUpperCase();
  let notifTitle = "";
  let notifBody = "";

  if (normStatus === "APPROVED") {
    notifTitle = `🎉 Meta Template Approved: ${templateName}`;
    notifBody = `Template "${templateName}" (${language}) has been APPROVED by Meta and is now active!`;
  } else if (normStatus === "REJECTED") {
    notifTitle = `❌ Meta Template Rejected: ${templateName}`;
    notifBody = `Template "${templateName}" was REJECTED by Meta. Reason: ${reason || "Content policy guideline violation"}.`;
  } else if (normStatus === "PAUSED") {
    notifTitle = `⏸️ Meta Template Paused: ${templateName}`;
    notifBody = `Template "${templateName}" has been PAUSED by Meta due to delivery/quality ratings.`;
  } else if (normStatus === "DISABLED") {
    notifTitle = `🚫 Meta Template Disabled: ${templateName}`;
    notifBody = `Template "${templateName}" has been DISABLED by Meta.`;
  } else {
    notifTitle = `ℹ️ Meta Template Status: ${templateName}`;
    notifBody = `Template "${templateName}" status updated to ${normStatus}.`;
  }

  await sendPushNotificationToAdmins(notifTitle, notifBody, "/whatsapp/templates");

  try {
    await prisma.whatsAppWebhookLog.create({
      data: {
        event: `TEMPLATE_${normStatus}`,
        payload: {
          templateName,
          status: normStatus,
          reason,
          language,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (_) {}
}

/**
 * Dispatches an instant mobile push notification for new inbound WhatsApp customer messages directly via webPush.
 */
export async function sendInboxMessagePushNotification(params: {
  clientId?: string | null;
  customerName?: string | null;
  customerPhone: string;
  messageText: string;
  conversationId?: string | null;
}) {
  try {
    const subs = await prisma.whatsAppPushSubscription.findMany();
    if (subs.length === 0) {
      console.log("[Push Notification] No active subscriptions in database");
      return;
    }

    const senderDisplay = params.customerName
      ? `${params.customerName} (${params.customerPhone})`
      : params.customerPhone;

    const title = `💬 ${senderDisplay}`;
    const preview = params.messageText
      ? (params.messageText.length > 110 ? params.messageText.substring(0, 107) + "..." : params.messageText)
      : "Sent an attachment or photo";

    const payload = JSON.stringify({
      title,
      body: preview,
      icon: "/icon-192.png",
      badge: "/whatsapp-badge.png",
      type: "inbox",
      url: `/whatsapp/inbox?phone=${encodeURIComponent(params.customerPhone)}`,
      tag: `msg-${params.customerPhone}`,
      timestamp: Date.now()
    });

    console.log(`[Push Notification] Broadcasting to ${subs.length} device(s): ${title}`);

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          await webPush.sendNotification(pushSubscription, payload);
          console.log("[Push Notification] Delivered to endpoint:", sub.endpoint.substring(0, 45) + "...");
        } catch (err: any) {
          console.warn("[Push Notification Error]:", sub.id, err.statusCode, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.whatsAppPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
  } catch (error) {
    console.error("[sendInboxMessagePushNotification Error]:", error);
  }
}

/**
 * Dispatches a high-priority mobile push notification when a new order is received directly via webPush.
 */
export async function sendNewOrderPushNotification(params: {
  clientId?: string | null;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  itemsCount?: number;
  source?: string;
}) {
  try {
    const subs = await prisma.whatsAppPushSubscription.findMany();
    if (subs.length === 0) {
      console.log("[Push Notification] No active subscriptions in database");
      return;
    }

    const formattedAmount = Number(params.totalAmount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0
    });

    const title = `🛍️ New Order #${params.orderNumber} • ₹${formattedAmount}`;
    const body = `${params.customerName} placed an order (${params.itemsCount || 1} items) via ${params.source || "WhatsApp Catalog"}. Tap to fulfill.`;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/whatsapp-badge.png",
      type: "order",
      url: "/whatsapp/orders",
      tag: `order-${params.orderNumber}`,
      timestamp: Date.now()
    });

    console.log(`[Push Notification] Broadcasting Order alert to ${subs.length} device(s): ${title}`);

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          await webPush.sendNotification(pushSubscription, payload);
          console.log("[Push Notification] Order alert delivered to endpoint:", sub.endpoint.substring(0, 45) + "...");
        } catch (err: any) {
          console.warn("[Push Notification Order Error]:", sub.id, err.statusCode, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.whatsAppPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
  } catch (error) {
    console.error("[sendNewOrderPushNotification Error]:", error);
  }
}
