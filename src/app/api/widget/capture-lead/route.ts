import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLeadToGoogleSheet } from "@/lib/googleSheetsSync";
import { emitInboxEvent } from "@/lib/inboxEvents";
import { dispatchOutboundWebhook } from "@/lib/outboundWebhookDispatcher";

/**
 * POST /api/widget/capture-lead
 * Captures visitor name and phone from the website widget before launching WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientId, refId, name, phone, email, pageUrl, pageTitle, utmSource, customMessage, platform, detectedProduct, cart } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: "Missing clientId." }, { status: 400 });
    }

    const client = await prisma.whatsAppClient.findUnique({
      where: { id: clientId },
      include: { websiteWidget: true },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Invalid client." }, { status: 404 });
    }

    const targetWhatsApp = (client.phoneNumber || "917404388242").replace(/\D/g, "");

    let cleanPhone = (phone || "").toString().replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const leadName = (name || "Website Visitor").trim();
    const effectivePlatform = platform || "Website";
    const source = utmSource || `${effectivePlatform} Widget`;

    // Persist visitor session context for chatbox attribution (Meta Ad style referral)
    if (refId) {
      await prisma.whatsAppChatbotLog.create({
        data: {
          clientId: client.id,
          phone: cleanPhone || "WIDGET_SESSION",
          nodeId: refId.toString().toUpperCase(),
          nodeType: "WIDGET_SESSION_REF",
          actionDesc: `Website context: ${pageTitle || pageUrl || "Storefront"}`,
          payload: {
            refId: refId.toString().toUpperCase(),
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

    // Build clean WhatsApp URL with tracking ref (NO messy page URLs or cart text dumped into the customer message)
    let greeting = customMessage || client.websiteWidget?.welcomeMessage || "Hello! Can I get more info on this?";
    if (refId) {
      greeting += ` [Ref: ${refId.toString().toUpperCase()}]`;
    }

    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(greeting)}`;

    return NextResponse.json({
      success: true,
      whatsappUrl,
      customerId: customer?.id,
    });
  } catch (err: any) {
    console.error("[Widget Capture Lead] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
