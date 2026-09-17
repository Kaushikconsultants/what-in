import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";

async function resolveClient(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return client;
  }

  const { searchParams } = new URL(req.url);
  const paramClientId = searchParams.get("clientId");
  if (paramClientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: paramClientId } });
    if (client) return client;
  }

  return null;
}

/**
 * GET /api/widget/leads
 * Fetches captured website leads, contact information, browsing context, and recent storefront sessions.
 */
export async function GET(req: NextRequest) {
  try {
    const client = await resolveClient(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    // 1. Fetch CRM Customers captured via website widget
    const customers = await prisma.customer.findMany({
      where: {
        clientId: client.id,
        OR: [
          { source: { contains: "Widget", mode: "insensitive" } },
          { source: { contains: "Website", mode: "insensitive" } },
          { tags: { contains: "Website", mode: "insensitive" } },
          { tags: { contains: "Website_Visitor", mode: "insensitive" } },
          { tags: { contains: "Website Lead", mode: "insensitive" } },
        ],
      },
      include: {
        whatsAppConversations: {
          select: {
            id: true,
            status: true,
            lastMessageText: true,
            lastMessageAt: true,
            unreadCount: true,
          },
          orderBy: { lastMessageAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const { searchParams } = new URL(req.url);
    const queryPhone = searchParams.get("phone")?.trim() || "";
    const cleanQueryPhone = queryPhone.replace(/\D/g, "");

    // 2. Fetch recent Storefront Widget Clicks & Add-To-Cart Sessions
    const sessionWhere: any = {
      clientId: client.id,
      nodeType: "WIDGET_SESSION_REF",
    };
    if (cleanQueryPhone.length >= 6) {
      sessionWhere.OR = [
        { phone: { contains: cleanQueryPhone } },
        { payload: { contains: cleanQueryPhone } },
      ];
    }

    const rawSessions = await prisma.whatsAppChatbotLog.findMany({
      where: sessionWhere,
      orderBy: { createdAt: "desc" },
      take: cleanQueryPhone ? 100 : 50,
    });

    const parsedSessions = rawSessions.map((s) => {
      let payload: any = {};
      try {
        payload = typeof s.payload === "string" ? JSON.parse(s.payload) : s.payload || {};
      } catch {
        payload = {};
      }

      return {
        id: s.id,
        refId: s.nodeId || payload.refId || "",
        phone: s.phone !== "WIDGET_SESSION" ? s.phone : payload.phone || null,
        name: payload.name || null,
        eventType: payload.eventType || "VISITOR_CLICK",
        actionDesc: s.actionDesc || payload.pageTitle || "Website Visit",
        pageUrl: payload.pageUrl || "",
        pageTitle: payload.pageTitle || "Online Store",
        platform: payload.platform || "Shopify",
        detectedProduct: payload.detectedProduct || null,
        cart: payload.cart || null,
        customMessage: payload.customMessage || null,
        pageJourney: Array.isArray(payload.pageJourney) ? payload.pageJourney : [],
        searches: Array.isArray(payload.searches) ? payload.searches : [],
        categoryInsights: payload.categoryInsights || null,
        sessionStats: payload.sessionStats || null,
        createdAt: s.createdAt,
      };
    });

    // 3. Match customers with their latest session if available
    const leads = customers.map((c) => {
      const conv = c.whatsAppConversations?.[0] || null;
      const cleanPhone = (c.mobile || c.whatsappNumber || "").replace(/\D/g, "");

      const matchedSession = parsedSessions.find((s) => {
        if (!s.phone) return false;
        const sClean = s.phone.replace(/\D/g, "");
        return sClean === cleanPhone || sClean.endsWith(cleanPhone) || cleanPhone.endsWith(sClean);
      }) || null;

      return {
        id: c.id,
        name: c.contactPerson || c.businessName || "Website Lead",
        businessName: c.businessName,
        mobile: c.mobile,
        whatsappNumber: c.whatsappNumber || c.mobile,
        source: c.source || "Website Widget",
        tags: (c.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
        leadStage: c.leadStage,
        notes: c.notes,
        createdAt: c.createdAt,
        conversationId: conv?.id || null,
        conversationStatus: conv?.status || null,
        lastMessageText: conv?.lastMessageText || null,
        lastMessageAt: conv?.lastMessageAt || null,
        unreadCount: conv?.unreadCount || 0,
        session: matchedSession ? {
          refId: matchedSession.refId,
          pageTitle: matchedSession.pageTitle,
          pageUrl: matchedSession.pageUrl,
          cart: matchedSession.cart,
          detectedProduct: matchedSession.detectedProduct,
          pageJourney: matchedSession.pageJourney,
          searches: matchedSession.searches,
          categoryInsights: matchedSession.categoryInsights,
          sessionStats: matchedSession.sessionStats,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      totalSessions: parsedSessions.length,
      leads,
      sessions: parsedSessions,
    });
  } catch (err: any) {
    console.error("[Widget Leads GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
