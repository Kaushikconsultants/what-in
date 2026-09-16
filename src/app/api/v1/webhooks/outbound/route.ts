import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";
import { getAuthenticatedUser } from "@/lib/authSession";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rateLimiter";
import { generateWebhookSignature } from "@/lib/outboundWebhookDispatcher";

async function resolveClient(req: NextRequest) {
  // 1. Try API Key
  const auth = await validateApiKey(req);
  if (auth.authenticated && auth.client) {
    return { client: auth.client, apiKey: auth.apiKey };
  }

  // 2. Try User Session
  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return { client, apiKey: null };
  }

  // 3. Fallback to primary client
  const fallback = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
  return { client: fallback, apiKey: null };
}

/**
 * GET /api/v1/webhooks/outbound
 * List all outbound webhook subscriptions and recent dispatch logs
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { client, apiKey } = await resolveClient(req);

  if (!client) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(apiKey?.id || client.id, 120, 60);
  if (!rateLimit.allowed) {
    return withRateLimitHeaders(
      NextResponse.json({ success: false, error: "Rate limit exceeded." }, { status: 429 }),
      rateLimit
    );
  }

  try {
    const webhooks = await prisma.whatsAppOutboundWebhook.findMany({
      where: { clientId: client.id },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        data: webhooks.map((w) => ({
          ...w,
          subscribedEvents: (() => {
            try {
              return JSON.parse(w.subscribedEvents);
            } catch {
              return [w.subscribedEvents];
            }
          })(),
        })),
      }),
      rateLimit
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/webhooks/outbound
 * Create a new outbound webhook subscription OR trigger a test ping
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const { client, apiKey } = await resolveClient(req);

  if (!client) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(apiKey?.id || client.id, 120, 60);
  if (!rateLimit.allowed) {
    return withRateLimitHeaders(
      NextResponse.json({ success: false, error: "Rate limit exceeded." }, { status: 429 }),
      rateLimit
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, webhookId, targetUrl, subscribedEvents, description } = body;

    // Test Ping Action
    if (action === "ping" || action === "test") {
      const webhook = await prisma.whatsAppOutboundWebhook.findFirst({
        where: { id: webhookId, clientId: client.id },
      });

      if (!webhook) {
        return NextResponse.json({ success: false, error: "Webhook not found." }, { status: 404 });
      }

      const timestamp = new Date().toISOString();
      const pingPayload = {
        event: "webhook.test_ping",
        timestamp,
        clientId: client.id,
        data: {
          message: "👋 This is a live verification ping from Whatmore / Whatin Webhook Dispatcher.",
          webhookId: webhook.id,
          targetUrl: webhook.targetUrl,
          dispatchedAt: timestamp,
        },
      };

      const payloadString = JSON.stringify(pingPayload);
      const signature = generateWebhookSignature(payloadString, webhook.secretKey);
      const deliveryId = crypto.randomUUID();
      const pingStart = Date.now();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(webhook.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Whatmore-Webhook-Dispatcher/1.0",
            "X-Whatmore-Signature": `sha256=${signature}`,
            "X-Whatmore-Event": "webhook.test_ping",
            "X-Whatmore-Delivery": deliveryId,
            "X-Whatmore-Timestamp": timestamp,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const responseTimeMs = Date.now() - pingStart;

        // Log the test ping
        await prisma.whatsAppOutboundWebhookLog.create({
          data: {
            webhookId: webhook.id,
            event: "webhook.test_ping",
            payload: payloadString,
            statusCode: resp.status,
            responseTimeMs,
            success: resp.ok,
            errorMessage: resp.ok ? null : `HTTP ${resp.status}`,
          },
        });

        await prisma.whatsAppOutboundWebhook.update({
          where: { id: webhook.id },
          data: {
            lastDispatchedAt: new Date(),
            lastStatusCode: resp.status,
            lastError: resp.ok ? null : `HTTP status ${resp.status}`,
          },
        });

        return withRateLimitHeaders(
          NextResponse.json({
            success: resp.ok,
            statusCode: resp.status,
            responseTimeMs,
            message: resp.ok ? "Ping succeeded! Endpoint returned 2xx status." : `Endpoint returned HTTP ${resp.status}`,
          }),
          rateLimit
        );
      } catch (err: any) {
        const responseTimeMs = Date.now() - pingStart;
        const msg = err.name === "AbortError" ? "Request timed out after 8s" : err.message;

        await prisma.whatsAppOutboundWebhookLog.create({
          data: {
            webhookId: webhook.id,
            event: "webhook.test_ping",
            payload: payloadString,
            statusCode: 0,
            responseTimeMs,
            success: false,
            errorMessage: msg,
          },
        });

        return withRateLimitHeaders(
          NextResponse.json({
            success: false,
            statusCode: 0,
            responseTimeMs,
            error: `Connection failed: ${msg}`,
          }),
          rateLimit
        );
      }
    }

    // Create New Webhook
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return NextResponse.json(
        { success: false, error: "Valid targetUrl (starting with http:// or https://) is required." },
        { status: 400 }
      );
    }

    const secretKey = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const events = Array.isArray(subscribedEvents) && subscribedEvents.length > 0
      ? subscribedEvents
      : ["message.received", "message.status_update", "lead.captured"];

    const newWebhook = await prisma.whatsAppOutboundWebhook.create({
      data: {
        clientId: client.id,
        targetUrl: targetUrl.trim(),
        secretKey,
        subscribedEvents: JSON.stringify(events),
        description: description?.trim() || null,
        isActive: true,
      },
    });

    logApiRequest({
      clientId: client.id,
      apiKeyId: apiKey?.id,
      endpoint: "/api/v1/webhooks/outbound",
      httpMethod: "POST",
      statusCode: 201,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Created webhook: ${targetUrl}`,
    });

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        message: "Outbound webhook subscription created.",
        data: {
          ...newWebhook,
          subscribedEvents: events,
        },
      }, { status: 201 }),
      rateLimit
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/v1/webhooks/outbound
 * Update webhook status, URL, or events
 */
export async function PUT(req: NextRequest) {
  const { client } = await resolveClient(req);
  if (!client) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { id, targetUrl, subscribedEvents, isActive, description } = body;

    if (!id) return NextResponse.json({ success: false, error: "Missing webhook id." }, { status: 400 });

    const existing = await prisma.whatsAppOutboundWebhook.findFirst({
      where: { id, clientId: client.id },
    });

    if (!existing) return NextResponse.json({ success: false, error: "Webhook not found." }, { status: 404 });

    const updated = await prisma.whatsAppOutboundWebhook.update({
      where: { id },
      data: {
        targetUrl: targetUrl ? targetUrl.trim() : undefined,
        subscribedEvents: subscribedEvents ? JSON.stringify(subscribedEvents) : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/webhooks/outbound
 * Delete a webhook subscription
 */
export async function DELETE(req: NextRequest) {
  const { client } = await resolveClient(req);
  if (!client) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Missing webhook id." }, { status: 400 });

    await prisma.whatsAppOutboundWebhook.deleteMany({
      where: { id, clientId: client.id },
    });

    return NextResponse.json({ success: true, message: "Webhook subscription deleted." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
