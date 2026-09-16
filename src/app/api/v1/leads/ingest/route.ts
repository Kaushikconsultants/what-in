import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, logApiRequest, hashApiKey } from "@/lib/apiKeyAuth";
import { sendWhatsAppTemplateAction } from "@/app/actions/whatsAppPlatformActions";
import { emitInboxEvent } from "@/lib/inboxEvents";
import { syncLeadToGoogleSheet } from "@/lib/googleSheetsSync";

/**
 * Helper to authenticate webhook request via Header or Query String
 */
async function authenticateLeadWebhook(req: NextRequest) {
  // 1. Try standard header-based API key validation
  const auth = await validateApiKey(req, "leads:write");
  if (auth.authenticated && auth.client) {
    return { authenticated: true, client: auth.client, apiKey: auth.apiKey };
  }

  // 2. Try query parameter API key: ?apiKey=wapi_live_... or ?token=wapi_live_...
  const { searchParams } = new URL(req.url);
  const queryKey = searchParams.get("apiKey") || searchParams.get("token") || searchParams.get("key");

  if (queryKey && queryKey.startsWith("wapi_live_")) {
    const keyHash = hashApiKey(queryKey);
    const apiKey = await prisma.whatsAppApiKey.findFirst({
      where: { keyHash, status: "ACTIVE" },
      include: { client: true },
    });

    if (apiKey && apiKey.client && apiKey.client.isActive) {
      let allowedScopes: string[] = [];
      try {
        allowedScopes = JSON.parse(apiKey.scopes);
      } catch {
        allowedScopes = ["messages:send", "leads:write", "contacts:read"];
      }

      if (allowedScopes.includes("leads:write") || allowedScopes.includes("*")) {
        // Asynchronously update usage
        prisma.whatsAppApiKey
          .update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
          })
          .catch(() => {});

        return { authenticated: true, client: apiKey.client, apiKey };
      }
    }
  }

  // 3. Fallback for primary single-tenant testing
  const fallbackClient = await prisma.whatsAppClient.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (fallbackClient && process.env.NODE_ENV !== "production") {
    return { authenticated: true, client: fallbackClient, apiKey: null };
  }

  return { authenticated: false, error: auth.error || "Unauthorized lead webhook caller." };
}

/**
 * GET /api/v1/leads/ingest
 * Health-check & documentation endpoint for lead webhook
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ACTIVE",
    service: "Universal Inbound Lead Ingestion Webhook",
    supportedSources: [
      "Facebook Lead Ads",
      "Google Ads Webhook",
      "Zapier / Make / n8n",
      "WordPress / Elementor Form",
      "Webflow Form",
      "IndiaMART / JustDial",
      "Custom Webhook Form",
    ],
    usage: {
      method: "POST",
      headers: {
        "Authorization": "Bearer wapi_live_...",
        "Content-Type": "application/json",
      },
      body: {
        name: "Customer Full Name",
        phone: "+91 98765 43210 (or 10 digits)",
        email: "customer@example.com (optional)",
        source: "Facebook Lead Ads (optional)",
        city: "Mumbai (optional)",
        state: "Maharashtra (optional)",
        tags: ["VIP", "Inquiry"],
        notes: "Interested in bulk catalog",
        sendWelcomeTemplate: true,
        templateName: "welcome_greeting (optional)",
      },
    },
  });
}

/**
 * POST /api/v1/leads/ingest
 * Ingest inbound lead from any marketing source, normalize phone, upsert contact,
 * dispatch automated WhatsApp welcome brochure/template, and sync to Google Sheets.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await authenticateLeadWebhook(req);

  if (!auth.authenticated || !auth.client) {
    logApiRequest({
      endpoint: "/api/v1/leads/ingest",
      httpMethod: "POST",
      statusCode: 401,
      responseTimeMs: Date.now() - startTime,
      errorMessage: auth.error,
    });
    return NextResponse.json(
      { success: false, error: auth.error || "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const rawBody = await req.json().catch(() => ({}));

    // Universal flexible property mapping across different webhook providers
    const name = (
      rawBody.name ||
      rawBody.full_name ||
      rawBody.fullName ||
      rawBody.first_name ||
      rawBody.customer_name ||
      "Inbound Prospect"
    ).toString().trim();

    const rawPhone = (
      rawBody.phone ||
      rawBody.mobile ||
      rawBody.whatsapp ||
      rawBody.phone_number ||
      rawBody.contact_number ||
      rawBody.phoneNumber ||
      ""
    ).toString().trim();

    const email = (
      rawBody.email ||
      rawBody.email_address ||
      rawBody.emailAddress ||
      ""
    ).toString().trim() || null;

    const source = (
      rawBody.source ||
      rawBody.lead_source ||
      rawBody.utm_source ||
      rawBody.referrer ||
      "Inbound Webhook"
    ).toString().trim();

    const city = (rawBody.city || "").toString().trim() || null;
    const state = (rawBody.state || "").toString().trim() || null;
    const rawNotes = (rawBody.notes || rawBody.message || rawBody.inquiry || rawBody.comments || "").toString().trim() || null;

    let tags = rawBody.tags || [];
    if (typeof tags === "string") {
      tags = tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    }
    if (!tags.includes(source)) {
      tags.push(source);
    }

    const sendWelcomeTemplate = rawBody.sendWelcomeTemplate !== false;
    const requestedTemplateName = (rawBody.templateName || "").toString().trim();

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'phone' (or 'mobile', 'whatsapp')." },
        { status: 400 }
      );
    }

    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: `Invalid phone number format: '${rawPhone}'. Must have at least 10 digits.` },
        { status: 400 }
      );
    }

    // 1. Upsert Customer in CRM
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { whatsappNumber: cleanPhone },
          { mobile: cleanPhone },
          { mobile: cleanPhone.slice(-10) },
        ],
      },
    });

    const tagsString = tags.join(", ");
    const formattedAddress = [city, state, email ? `Email: ${email}` : ""].filter(Boolean).join(", ");
    const fullNotes = rawNotes ? `[${source}]: ${rawNotes}` : null;

    if (customer) {
      const existingTags = (customer.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
      const mergedTags = Array.from(new Set([...existingTags, ...tags])).join(", ");

      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          contactPerson: name && name !== "Inbound Prospect" ? name : customer.contactPerson,
          billingAddress: formattedAddress || customer.billingAddress,
          tags: mergedTags,
          notes: fullNotes ? (customer.notes ? `${customer.notes}\n${fullNotes}` : fullNotes) : customer.notes,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          businessName: `Lead ${cleanPhone}`,
          contactPerson: name,
          mobile: cleanPhone,
          whatsappNumber: cleanPhone,
          billingAddress: formattedAddress || null,
          source,
          customerType: "Wholesale",
          leadStage: "Contacted",
          tags: tagsString,
          notes: fullNotes,
        },
      });
    }

    // 2. Ensure Conversation Exists
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        customerId: customer.id,
        clientId: auth.client.id,
      },
    });

    if (!conversation) {
      const account = await prisma.whatsAppAccount.findFirst();
      conversation = await prisma.whatsAppConversation.create({
        data: {
          clientId: auth.client.id,
          accountId: account?.id || "default_account",
          customerId: customer.id,
          status: "OPEN",
          unreadCount: 1,
          lastMessageText: `New lead from ${source}`,
          lastMessageAt: new Date(),
        },
      });
    }

    // 3. Dispatch Automated WhatsApp Welcome Message if enabled
    let welcomeResult: any = null;
    if (sendWelcomeTemplate) {
      let targetTemplate = requestedTemplateName;

      // If not specified, look for an approved greeting template
      if (!targetTemplate) {
        const approvedTemplate = await prisma.whatsAppTemplate.findFirst({
          where: {
            status: "APPROVED",
            OR: [
              { name: { contains: "welcome", mode: "insensitive" } },
              { name: { contains: "greeting", mode: "insensitive" } },
              { name: { contains: "lead", mode: "insensitive" } },
            ],
          },
          orderBy: { updatedAt: "desc" },
        });
        if (approvedTemplate) {
          targetTemplate = approvedTemplate.name;
        }
      }

      if (targetTemplate) {
        try {
          welcomeResult = await sendWhatsAppTemplateAction(
            cleanPhone,
            targetTemplate,
            "en_US",
            [],
            conversation.id,
            "Lead Auto-Responder"
          );
        } catch (templateErr: any) {
          console.warn("[Lead Ingest] Non-fatal welcome template dispatch note:", templateErr.message);
        }
      }
    }

    // 4. Asynchronously Sync to Google Sheets if configured
    syncLeadToGoogleSheet(auth.client.id, {
      name: customer.contactPerson || name,
      phone: cleanPhone,
      email: email || undefined,
      source,
      leadStage: customer.leadStage,
      tags: customer.tags,
      city: city || undefined,
      state: state || undefined,
      notes: fullNotes || undefined,
    }).catch(() => {});

    // 5. Real-time Inbox Notification
    emitInboxEvent({
      type: "CONVERSATION_UPDATE",
      conversationId: conversation.id,
      clientId: auth.client.id,
      data: {
        customerName: customer.contactPerson,
        phone: cleanPhone,
        source,
      },
    });

    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/leads/ingest",
      httpMethod: "POST",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Captured lead: ${name} (${cleanPhone}) via ${source}`,
    });

    return NextResponse.json({
      success: true,
      message: "Lead ingested and processed successfully.",
      data: {
        customerId: customer.id,
        conversationId: conversation.id,
        phone: cleanPhone,
        source,
        welcomeTemplateDispatched: Boolean(welcomeResult?.success),
      },
    });
  } catch (err: any) {
    console.error("[API v1 /leads/ingest POST] Error:", err);
    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/leads/ingest",
      httpMethod: "POST",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });
    return NextResponse.json(
      { success: false, error: err.message || "Failed to ingest lead." },
      { status: 500 }
    );
  }
}
