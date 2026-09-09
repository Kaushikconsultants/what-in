import { prisma } from "@/lib/prisma";

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
      icon: "/whatsapp-icon.png",
      badge: "/whatsapp-badge.png",
      data: { url }
    });

    for (const sub of subs) {
      if (targetEmails.length > 0 && !targetEmails.includes(sub.userId)) {
        continue;
      }

      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/push/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "crm_internal_2026"
          },
          body: JSON.stringify({ subscription, payload })
        }).catch((err) => {
          console.warn("[Push] Background send error:", err.message);
        });
      } catch (err) {
        console.warn("[Push] Failed for subscription:", sub.id, err);
      }
    }
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
    notifBody = `Template "${templateName}" (${language}) has been APPROVED by Meta and is now active for broadcasts & chat responses!`;
  } else if (normStatus === "REJECTED") {
    notifTitle = `❌ Meta Template Rejected: ${templateName}`;
    notifBody = `Template "${templateName}" was REJECTED by Meta. Reason: ${reason || "Content policy guideline violation"}. Click to review.`;
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

  // 1. Dispatch Web Push to all Admins
  await sendPushNotificationToAdmins(notifTitle, notifBody, "/whatsapp/templates");

  // 2. Log event in WhatsApp Webhook Log
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
