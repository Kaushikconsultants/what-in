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

    const { clientId, refId, eventType, name, phone, identifiedPhone, visitorUuid, email, pageUrl, pageTitle, utmSource, customMessage, platform, detectedProduct, cart, pageJourney, searches, categoryInsights, sessionStats, isLiveActivity, searchQuery } = body;

    let client = null;
    if (clientId && typeof clientId === "string" && clientId.trim().length >= 5) {
      client = await prisma.whatsAppClient.findUnique({
        where: { id: clientId.trim() },
        include: { websiteWidget: true },
      });
    }

    if (!client) {
      client = await prisma.whatsAppClient.findFirst({
        where: { isActive: true },
        include: { websiteWidget: true },
      });
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found or inactive." },
        { status: 404, headers: corsHeaders }
      );
    }

    const targetWhatsApp = (client.phoneNumber || "917404388242").replace(/\D/g, "");

    let cleanPhone = (phone || identifiedPhone || "").toString().replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    // Auto-correlate: If phone is not provided in telemetry payload, resolve from existing linked session
    if ((!cleanPhone || cleanPhone.length < 10) && refId) {
      const linked = await prisma.whatsAppChatbotLog.findFirst({
        where: {
          clientId: client.id,
          nodeType: "WIDGET_SESSION_REF",
          nodeId: { equals: refId.toString().toUpperCase(), mode: "insensitive" },
          NOT: { phone: "WIDGET_SESSION" }
        },
        select: { phone: true },
        orderBy: { createdAt: "desc" }
      });
      if (linked?.phone && linked.phone !== "WIDGET_SESSION") {
        cleanPhone = linked.phone;
      }
    }

    const leadName = (name || "Website Visitor").trim();
    const effectivePlatform = platform || "Website";
    const source = utmSource || `${effectivePlatform} Widget`;

    // Persist visitor session context for chatbox attribution (Meta Ad style referral)
    if (refId) {
      const isAddToCart = eventType === "ADD_TO_CART";
      const cartSummaryText = cart && cart.item_count ? ` (${cart.item_count} items - ₹${cart.total_price || 0})` : "";
      
      let actionDesc = `Website context: ${pageTitle || pageUrl || "Storefront"}${cartSummaryText}`;
      if (isAddToCart) {
        actionDesc = `Live Add-To-Cart: ${pageTitle || "Product"}${cartSummaryText}`;
      } else if (categoryInsights && categoryInsights.category === "EDUCATION" && categoryInsights.courses?.length) {
        actionDesc = `Education Inquiry: ${categoryInsights.courses[0]}${categoryInsights.universities?.[0] ? ` at ${categoryInsights.universities[0]}` : ""}`;
      } else if (categoryInsights && categoryInsights.category === "REAL_ESTATE" && categoryInsights.properties?.length) {
        actionDesc = `Real Estate Inquiry: ${categoryInsights.properties[0]}`;
      } else if (categoryInsights && categoryInsights.category === "HEALTHCARE" && categoryInsights.specialties?.length) {
        actionDesc = `Healthcare Inquiry: ${categoryInsights.specialties[0]}`;
      }

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
            pageJourney: Array.isArray(pageJourney) ? pageJourney : [],
            searches: Array.isArray(searches) ? searches : [],
            categoryInsights: categoryInsights || null,
            sessionStats: sessionStats || null,
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

      // Live Activity Telemetry (Silent future website activity automatically updating customer profile)
      if (isLiveActivity || isAddToCart) {
        if (cleanPhone.length >= 10) {
          const existingCustomer = await prisma.customer.findFirst({
            where: {
              clientId: client.id,
              OR: [
                { whatsappNumber: cleanPhone },
                { mobile: cleanPhone },
                { mobile: cleanPhone.slice(-10) },
                { whatsappNumber: cleanPhone.slice(-10) }
              ]
            }
          });

          if (existingCustomer) {
            const conv = await prisma.whatsAppConversation.findFirst({
              where: { customerId: existingCustomer.id, clientId: client.id }
            });

            const isOnline = body.isOnline !== undefined
              ? Boolean(body.isOnline)
              : (eventType !== "TAB_CLOSED" && eventType !== "TAB_AWAY");

            const presenceState = body.presenceState || (
              eventType === "TAB_CLOSED"
                ? "OFFLINE"
                : (eventType === "TAB_AWAY" ? "AWAY" : "ONLINE")
            );

            // Broadcast real-time SSE event to live connected agent inboxes
            emitInboxEvent({
              type: "CUSTOMER_LIVE_ACTIVITY",
              conversationId: conv?.id,
              clientId: client.id,
              data: {
                customerId: existingCustomer.id,
                phone: cleanPhone,
                eventType: eventType || "PAGE_VIEW",
                pageUrl: pageUrl || "",
                pageTitle: pageTitle || "",
                actionDesc,
                searches: Array.isArray(searches) ? searches : [],
                categoryInsights: categoryInsights || null,
                pageJourney: Array.isArray(pageJourney) ? pageJourney : [],
                sessionStats: sessionStats || null,
                cart: cart || body.cart || null,
                detectedProduct: detectedProduct || body.detectedProduct || null,
                platform: effectivePlatform,
                scrollDepth: body.scrollDepth !== undefined ? Number(body.scrollDepth) : undefined,
                viewport: body.viewport || undefined,
                lastInteraction: body.lastInteraction || undefined,
                menuOpen: body.menuOpen !== undefined ? Boolean(body.menuOpen) : undefined,
                isMenu: body.isMenu !== undefined ? Boolean(body.isMenu) : undefined,
                cartOpen: body.cartOpen !== undefined ? Boolean(body.cartOpen) : undefined,
                isCart: body.isCart !== undefined ? Boolean(body.isCart) : undefined,
                clickSelector: body.clickSelector || undefined,
                cursorX: body.cursorX !== undefined ? Number(body.cursorX) : undefined,
                cursorY: body.cursorY !== undefined ? Number(body.cursorY) : undefined,
                clickX: body.clickX !== undefined ? Number(body.clickX) : undefined,
                clickY: body.clickY !== undefined ? Number(body.clickY) : undefined,
                screenTimeline: Array.isArray(body.screenTimeline) ? body.screenTimeline : undefined,
                isOnline,
                presenceState,
                timestamp: new Date().toISOString()
              }
            });

            // Append live activity entry to CRM customer notes (skip for heartbeats, pointer moves & small scrolls)
            if (eventType !== "HEARTBEAT" && eventType !== "TAB_AWAY" && eventType !== "SCROLL" && eventType !== "POINTER") {
              const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              let liveLogEntry = `\n[${timeStr}] 🌐 Browsing: "${pageTitle || pageUrl}"`;
              if (eventType === "SEARCH" && searchQuery) {
                liveLogEntry = `\n[${timeStr}] 🔍 Searched on site: "${searchQuery}"`;
              } else if (eventType === "TAB_CLOSED") {
                liveLogEntry = `\n[${timeStr}] 🚪 Left website / Closed tab`;
              } else if (body.lastInteraction) {
                liveLogEntry = `\n[${timeStr}] 👆 ${body.lastInteraction}`;
              } else if (categoryInsights?.courses?.length) {
                liveLogEntry += ` (Course: ${categoryInsights.courses[0]})`;
              }

            const existingNotes = existingCustomer.notes || "";
            const updatedNotes = existingNotes.length > 3000
              ? (existingNotes.slice(-2500) + liveLogEntry)
              : (existingNotes + liveLogEntry);

            const existingTags = (existingCustomer.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
            let tagUpdated = false;
            if (categoryInsights?.category === "EDUCATION" && !existingTags.includes("Education_Lead")) {
              existingTags.push("Education_Lead");
              tagUpdated = true;
            }
            if (categoryInsights?.courses?.[0]) {
              const cTag = `Course_${categoryInsights.courses[0].slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}`;
              if (!existingTags.includes(cTag)) {
                existingTags.push(cTag);
                tagUpdated = true;
              }
            }

            await prisma.customer.update({
              where: { id: existingCustomer.id },
              data: {
                notes: updatedNotes,
                tags: tagUpdated ? existingTags.join(", ") : undefined
              }
            }).catch(() => {});
          }
        }
      }

      return NextResponse.json(
        { success: true, event: "LIVE_ACTIVITY_RECORDED", refId, identifiedPhone: cleanPhone || null },
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

      let noteContent = `[${effectivePlatform}] Inquiry from "${pageTitle || pageUrl || "Website"}"${customMessage ? `: "${customMessage}"` : ""}`;
      if (Array.isArray(searches) && searches.length > 0) {
        noteContent += `\n🔍 Searches on site: ${searches.map((s) => `"${s}"`).join(", ")}`;
      }
      if (categoryInsights && categoryInsights.category === "EDUCATION") {
        const eduParts = [];
        if (categoryInsights.courses?.length) eduParts.push(`Courses: ${categoryInsights.courses.join(", ")}`);
        if (categoryInsights.universities?.length) eduParts.push(`Universities: ${categoryInsights.universities.join(", ")}`);
        if (categoryInsights.destinations?.length) eduParts.push(`Destinations: ${categoryInsights.destinations.join(", ")}`);
        if (eduParts.length) noteContent += `\n🎓 Education Intent: ${eduParts.join(" | ")}`;
      } else if (categoryInsights && categoryInsights.category === "REAL_ESTATE" && categoryInsights.properties?.length) {
        noteContent += `\n🏢 Properties Viewed: ${categoryInsights.properties.join(", ")}`;
      } else if (categoryInsights && categoryInsights.category === "HEALTHCARE" && categoryInsights.specialties?.length) {
        noteContent += `\n🏥 Specialties: ${categoryInsights.specialties.join(", ")}`;
      }
      if (Array.isArray(pageJourney) && pageJourney.length > 1) {
        const journeySummary = pageJourney.map((p) => p.title || p.path).join(" ➔ ");
        noteContent += `\n🧭 Browsing Trail (${pageJourney.length} pages): ${journeySummary}`;
      }

      const generatedTags = ["Website Lead"];
      if (effectivePlatform && effectivePlatform !== "Website") generatedTags.push(`${effectivePlatform} Lead`);
      if (categoryInsights && categoryInsights.category === "EDUCATION") {
        generatedTags.push("Education_Lead");
        if (categoryInsights.courses?.[0]) {
          generatedTags.push(`Course_${categoryInsights.courses[0].slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}`);
        }
      } else if (categoryInsights && categoryInsights.category === "REAL_ESTATE") {
        generatedTags.push("Real_Estate_Lead");
      } else if (categoryInsights && categoryInsights.category === "HEALTHCARE") {
        generatedTags.push("Healthcare_Lead");
      }
      if (cart && cart.item_count > 0) generatedTags.push("Cart_Abandonment");
      const platformTag = generatedTags.join(", ");

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
        pageJourney: pageJourney || [],
        searches: searches || [],
        categoryInsights: categoryInsights || null,
        sessionStats: sessionStats || null,
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
