import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLeadToGoogleSheet } from "@/lib/googleSheetsSync";
import { emitInboxEvent } from "@/lib/inboxEvents";
import { dispatchOutboundWebhook } from "@/lib/outboundWebhookDispatcher";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

/**
 * OPTIONS /api/widget/capture-lead
 * Handles CORS preflight requests from external customer storefronts.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/widget/capture-lead
 * Captures visitor clicks, browsing context, active cart items, and optional form leads before launching WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const rawText = await req.text().catch(() => "");
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = {};
      }
    }

    const { clientId, refId, eventType, name, phone, email, pageUrl, pageTitle, utmSource, customMessage, platform, detectedProduct, cart } = body;

    let client = clientId
      ? await prisma.whatsAppClient.findUnique({
          where: { id: clientId },
          include: { websiteWidget: true },
        })
      : null;

    if (!client) {
      client = await prisma.whatsAppClient.findFirst({
        where: { isActive: true },
        include: { websiteWidget: true },
      });
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Invalid client." },
        { status: 404, headers: corsHeaders }
      );
    }

    const targetWhatsApp = (client.phoneNumber || "917404388242").replace(/\D/g, "");

    let cleanPhone = (phone || "").toString().replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const leadName = (name || "Website Visitor").trim();
    const effectivePlatform = platform || "Website";
    const source = utmSource || `${effectivePlatform} Widget`;

    // Persist visitor session context for chatbox attribution (Meta Ad style referral)
    if (refId) {
      const isAddToCart = eventType === "ADD_TO_CART";
      const cartSummaryText = cart && cart.item_count ? ` (${cart.item_count} items - ₹${cart.total_price || 0})` : "";
      const actionDesc = isAddToCart
        ? `Live Add-To-Cart: ${pageTitle || "Product"}${cartSummaryText}`
        : `Website context: ${pageTitle || pageUrl || "Storefront"}${cartSummaryText}`;

      await prisma.whatsAppChatbotLog.create({
        data: {
          clientId: client.id,
          phone: cleanPhone || "WIDGET_SESSION",
          nodeId: refId.toString().toUpperCase(),
          nodeType: "WIDGET_SESSION_REF",
          actionDesc,
          payload: {
            refId: refId.toString().toUpperCase(),
            eventType: eventType || "VISITOR_CLICK",
            pageUrl: pageUrl || "",
            pageTitle: pageTitle || "",
            platform: effectivePlatform,
            detectedProduct: detectedProduct || null,
            cart: cart || null,
            customMessage: customMessage || null,
            name: leadName !== "Website Visitor" ? leadName : null,
            phone: cleanPhone || null,
            createdAt: new Date().toISOString(),
          },
        },
      }).catch((e) => console.warn("[Capture Lead] Ref Log save skipped:", e.message));

      // Fast exit for background add-to-cart beacon without phone
      if (isAddToCart && (!cleanPhone || cleanPhone.length < 10)) {
        return NextResponse.json(
          { success: true, event: "ADD_TO_CART_RECORDED", refId },
          { headers: corsHeaders }
        );
      }
    }

    let customer = null;
    if (cleanPhone.length >= 10) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { whatsappNumber: cleanPhone },
            { mobile: cleanPhone },
            { mobile: cleanPhone.slice(-10) },
          ],
        },
      });

      const noteContent = `[${effectivePlatform}] Inquiry from ${pageTitle || pageUrl || "Website"}${customMessage ? `: "${customMessage}"` : ""}`;
      const platformTag = effectivePlatform !== "Website" ? `${effectivePlatform} Lead` : "Website Lead";

      if (customer) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            contactPerson: leadName !== "Website Visitor" ? leadName : customer.contactPerson,
            billingAddress: email ? `Email: ${email}` : customer.billingAddress,
            tags: customer.tags ? (customer.tags.includes(platformTag) ? customer.tags : `${customer.tags}, ${platformTag}`) : platformTag,
            notes: customer.notes ? `${customer.notes}\n[${source}]: ${noteContent}` : noteContent,
          },
        });
      } else {
        customer = await prisma.customer.create({
          data: {
            businessName: `Website Lead ${cleanPhone}`,
            contactPerson: leadName,
            mobile: cleanPhone,
            whatsappNumber: cleanPhone,
            billingAddress: email ? `Email: ${email}` : null,
            customerType: "Wholesale",
            leadStage: "Contacted",
            tags: "Website Lead",
            notes: noteContent,
          },
        });
      }

      // Upsert conversation
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          customerId: customer.id,
          clientId: client.id,
        },
      });

      if (!conversation) {
        const account = await prisma.whatsAppAccount.findFirst();
        conversation = await prisma.whatsAppConversation.create({
          data: {
            clientId: client.id,
            accountId: account?.id || "default_account",
            customerId: customer.id,
            status: "OPEN",
            unreadCount: 1,
            lastMessageText: `Website inquiry from ${pageTitle || pageUrl || "Homepage"}`,
            lastMessageAt: new Date(),
          },
        });
      }

      // Google Sheet sync if enabled
      syncLeadToGoogleSheet(client.id, {
        name: customer.contactPerson || leadName,
        phone: cleanPhone,
        email: email || undefined,
        source,
        leadStage: customer.leadStage,
        tags: customer.tags,
        notes: noteContent,
      }).catch(() => {});

      // Live real-time notification
      emitInboxEvent({
        type: "CONVERSATION_UPDATE",
        conversationId: conversation.id,
        clientId: client.id,
        data: {
          customerName: customer.contactPerson,
          phone: cleanPhone,
          source,
        },
      });

      // Outbound Webhook dispatch to external subscribers (Zapier, ERP, Custom CRM)
      dispatchOutboundWebhook(client.id, "lead.captured", {
        leadId: customer?.id,
        name: customer?.contactPerson || leadName,
        phone: cleanPhone,
        email: email || null,
        source,
        pageUrl: pageUrl || null,
        pageTitle: pageTitle || null,
        customMessage: customMessage || null,
        platform: effectivePlatform,
        detectedProduct: detectedProduct || null,
        cart: cart || null,
        capturedAt: new Date().toISOString(),
      });
    }

    // Increment analytics
    await prisma.whatsAppWebsiteWidget.updateMany({
      where: { clientId: client.id },
      data: {
        totalClicks: { increment: 1 },
        totalLeadsCaptured: cleanPhone.length >= 10 ? { increment: 1 } : undefined,
      },
    });

    // Build 100% clean WhatsApp URL (NO ref codes, no URLs or cart text in customer message)
    const greeting = customMessage || client.websiteWidget?.welcomeMessage || "Hello! Can I get more info on this?";
    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(greeting)}`;

    return NextResponse.json(
      {
        success: true,
        whatsappUrl,
        customerId: customer?.id,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Widget Capture Lead] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
