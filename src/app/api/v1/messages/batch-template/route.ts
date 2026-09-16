import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";
import { getAuthenticatedUser } from "@/lib/authSession";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rateLimiter";
import { sendWhatsAppTemplateAction } from "@/app/actions/whatsAppPlatformActions";

async function resolveClient(req: NextRequest) {
  const auth = await validateApiKey(req, "messages:send");
  if (auth.authenticated && auth.client) {
    return { client: auth.client, apiKey: auth.apiKey };
  }

  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return { client, apiKey: null };
  }

  const fallback = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
  return { client: fallback, apiKey: null };
}

/**
 * POST /api/v1/messages/batch-template
 * High-performance batch WhatsApp template message broadcast API
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const { client, apiKey } = await resolveClient(req);

  if (!client) {
    return NextResponse.json({ success: false, error: "Unauthorized. Missing or invalid API key." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(apiKey?.id || client.id, 60, 60);
  if (!rateLimit.allowed) {
    return withRateLimitHeaders(
      NextResponse.json({ success: false, error: "Rate limit exceeded. Try again in " + rateLimit.retryAfter + " seconds." }, { status: 429 }),
      rateLimit
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { templateName, language = "en_US", recipients } = body;

    if (!templateName) {
      return NextResponse.json({ success: false, error: "Missing required field: 'templateName'." }, { status: 400 });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or empty 'recipients' array." }, { status: 400 });
    }

    if (recipients.length > 100) {
      return NextResponse.json(
        { success: false, error: "Batch size exceeds maximum limit of 100 recipients per request." },
        { status: 400 }
      );
    }

    let dispatched = 0;
    let failed = 0;
    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const recipient of recipients) {
      const rawPhone = recipient.phone || recipient.to;
      if (!rawPhone) {
        failed++;
        results.push({ phone: "", success: false, error: "Missing phone number." });
        continue;
      }

      let cleanPhone = rawPhone.toString().replace(/\D/g, "");
      if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

      // Build components
      let components: any[] = [];

      // 1. Raw components override
      if (Array.isArray(recipient.components)) {
        components = recipient.components;
      } else {
        // 2. Auto-format body parameters
        if (Array.isArray(recipient.parameters) && recipient.parameters.length > 0) {
          components.push({
            type: "body",
            parameters: recipient.parameters.map((p: any) => ({
              type: "text",
              text: String(p),
            })),
          });
        }

        // 3. Auto-format header media if provided
        if (recipient.mediaUrl) {
          const isDoc = recipient.mediaUrl.endsWith(".pdf") || recipient.mediaType === "document";
          components.push({
            type: "header",
            parameters: [
              isDoc
                ? { type: "document", document: { link: recipient.mediaUrl, filename: recipient.filename || "Brochure.pdf" } }
                : { type: "image", image: { link: recipient.mediaUrl } },
            ],
          });
        }
      }

      try {
        const sendResult = await sendWhatsAppTemplateAction(
          cleanPhone,
          templateName,
          recipient.language || language,
          components,
          undefined,
          "Batch API Dispatcher"
        );

        if (sendResult?.success) {
          dispatched++;
          results.push({
            phone: cleanPhone,
            success: true,
            messageId: (sendResult as any).messageId || (sendResult as any).id,
          });
        } else {
          failed++;
          results.push({
            phone: cleanPhone,
            success: false,
            error: (sendResult as any)?.error || "Delivery failed",
          });
        }
      } catch (sendErr: any) {
        failed++;
        results.push({
          phone: cleanPhone,
          success: false,
          error: sendErr.message,
        });
      }
    }

    logApiRequest({
      clientId: client.id,
      apiKeyId: apiKey?.id,
      endpoint: "/api/v1/messages/batch-template",
      httpMethod: "POST",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Batch of ${recipients.length} to template '${templateName}'. Success: ${dispatched}, Failed: ${failed}`,
    });

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        summary: {
          total: recipients.length,
          dispatched,
          failed,
        },
        results,
      }),
      rateLimit
    );
  } catch (err: any) {
    console.error("[Batch Template API Error]:", err);
    logApiRequest({
      clientId: client.id,
      apiKeyId: apiKey?.id,
      endpoint: "/api/v1/messages/batch-template",
      httpMethod: "POST",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
