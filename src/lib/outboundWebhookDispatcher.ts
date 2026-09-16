import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface OutboundWebhookPayload {
  event: string;
  timestamp: string;
  clientId: string;
  data: Record<string, any>;
}

/**
 * Calculates HMAC-SHA256 signature for outbound webhook payloads
 */
export function generateWebhookSignature(payloadString: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(payloadString).digest("hex");
}

/**
 * Dispatches an event payload asynchronously to all subscribed active webhooks for a client
 */
export async function dispatchOutboundWebhook(
  clientId: string,
  event: string,
  data: Record<string, any>
): Promise<void> {
  // Run asynchronously in the background so caller is not blocked
  (async () => {
    try {
      const webhooks = await prisma.whatsAppOutboundWebhook.findMany({
        where: {
          clientId,
          isActive: true,
        },
      });

      if (!webhooks || webhooks.length === 0) return;

      const timestamp = new Date().toISOString();
      const payload: OutboundWebhookPayload = {
        event,
        timestamp,
        clientId,
        data,
      };

      const payloadString = JSON.stringify(payload);

      for (const webhook of webhooks) {
        let subscribedEvents: string[] = [];
        try {
          subscribedEvents = JSON.parse(webhook.subscribedEvents);
        } catch {
          subscribedEvents = ["*"];
        }

        // Check if webhook is subscribed to this event or wildcard
        if (!subscribedEvents.includes("*") && !subscribedEvents.includes(event)) {
          continue;
        }

        const signature = generateWebhookSignature(payloadString, webhook.secretKey);
        const deliveryId = crypto.randomUUID();
        const startTime = Date.now();

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(webhook.targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Whatmore-Webhook-Dispatcher/1.0",
              "X-Whatmore-Signature": `sha256=${signature}`,
              "X-Whatmore-Event": event,
              "X-Whatmore-Delivery": deliveryId,
              "X-Whatmore-Timestamp": timestamp,
            },
            body: payloadString,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const responseTimeMs = Date.now() - startTime;
          const isSuccess = response.ok;

          // Record log
          await prisma.whatsAppOutboundWebhookLog.create({
            data: {
              webhookId: webhook.id,
              event,
              payload: payloadString.slice(0, 4000),
              statusCode: response.status,
              responseTimeMs,
              success: isSuccess,
              errorMessage: isSuccess ? null : `HTTP error ${response.status}`,
            },
          });

          // Update stats
          await prisma.whatsAppOutboundWebhook.update({
            where: { id: webhook.id },
            data: {
              totalDispatched: { increment: 1 },
              totalFailed: isSuccess ? undefined : { increment: 1 },
              lastDispatchedAt: new Date(),
              lastStatusCode: response.status,
              lastError: isSuccess ? null : `HTTP status ${response.status}`,
            },
          });
        } catch (fetchErr: any) {
          const responseTimeMs = Date.now() - startTime;
          const errorMsg = fetchErr.name === "AbortError" ? "Request timed out after 8s" : fetchErr.message;

          // Record failure log
          await prisma.whatsAppOutboundWebhookLog.create({
            data: {
              webhookId: webhook.id,
              event,
              payload: payloadString.slice(0, 4000),
              statusCode: 0,
              responseTimeMs,
              success: false,
              errorMessage: errorMsg ? errorMsg.slice(0, 500) : "Network error",
            },
          }).catch(() => {});

          // Update stats with failure
          await prisma.whatsAppOutboundWebhook.update({
            where: { id: webhook.id },
            data: {
              totalDispatched: { increment: 1 },
              totalFailed: { increment: 1 },
              lastDispatchedAt: new Date(),
              lastStatusCode: 0,
              lastError: errorMsg ? errorMsg.slice(0, 255) : "Failed to connect",
            },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error("[dispatchOutboundWebhook] Global dispatch error:", err);
    }
  })();
}
