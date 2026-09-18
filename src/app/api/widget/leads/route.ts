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

  // Fallback to active client on single-tenant / domain setups
  return await prisma.whatsAppClient.findFirst({ where: { isActive: true } });
}

/** Sanitize a raw price to a clean integer rupee amount. Values < 1 (e.g. 7.6e-148 from repeated /100 divisions) are corrupt → return 0. */
function sanitizeRupeePrice(raw: any): number {
  if (raw === null || raw === undefined) return 0;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!isFinite(n) || isNaN(n) || n <= 0) return 0;
  if (n < 1) return 0;  // Scientifically tiny = corrupt data from repeated /100 divisions
  if (n > 999999) return 0;  // Sanity cap (no product > ₹9,99,999)
  return Math.round(n);
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

    // 2. Fetch recent Storefront Widget Clicks & Add-To-Cart Sessions (Strict 7-Day Window)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Auto-delete recordings older than 7 days to optimize DB memory & performance
    prisma.whatsAppChatbotLog.deleteMany({
      where: {
        clientId: client.id,
        nodeType: "WIDGET_SESSION_REF",
        createdAt: { lt: sevenDaysAgo }
      }
    }).catch((e) => console.warn("[Leads Route] 7-day session auto-purge skipped:", e.message));

    const sessionWhere: any = {
      clientId: client.id,
      nodeType: "WIDGET_SESSION_REF",
      createdAt: { gte: sevenDaysAgo },
    };
    if (cleanQueryPhone.length >= 6) {
      const last10 = cleanQueryPhone.slice(-10);
      sessionWhere.OR = [
        { phone: cleanQueryPhone },
        { phone: `91${last10}` },
        { phone: last10 },
        { phone: { contains: last10 } },
      ];
    }

    function formatSessionDate(d: Date): { formattedDate: string; formattedTime: string; dateCategory: string } {
      const now = new Date();
      const sessionDate = new Date(d);

      const isToday = now.toDateString() === sessionDate.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.toDateString() === sessionDate.toDateString();

      const diffDays = Math.round((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      let dateCategory = "OLDER";
      let formattedDate = sessionDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

      if (isToday) {
        dateCategory = "TODAY";
        formattedDate = `Today, ${sessionDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
      } else if (isYesterday) {
        dateCategory = "YESTERDAY";
        formattedDate = `Yesterday, ${sessionDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
      } else if (diffDays <= 7) {
        dateCategory = "LAST_7_DAYS";
      }

      const formattedTime = sessionDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      return { formattedDate, formattedTime, dateCategory };
    }

    const rawSessions = await prisma.whatsAppChatbotLog.findMany({
      where: sessionWhere,
      orderBy: { createdAt: "desc" },
      take: cleanQueryPhone ? 150 : 50,
    });

    // Group raw telemetry logs into discrete user browsing sessions
    const sessionGroups: Record<string, any[]> = {};
    for (const log of rawSessions) {
      let p: any = {};
      try {
        p = typeof log.payload === "string" ? JSON.parse(log.payload) : (log.payload || {});
      } catch {
        p = {};
      }

      // Group key: refId or 30-minute session window
      const timeWindowKey = new Date(log.createdAt).toISOString().slice(0, 13);
      const refKey = (log.nodeId && log.nodeId !== "WIDGET_SESSION_REF" && log.nodeId !== "WIDGET_SESSION")
        ? log.nodeId
        : (p.refId || `SESSION_${timeWindowKey}`);

      if (!sessionGroups[refKey]) {
        sessionGroups[refKey] = [];
      }
      sessionGroups[refKey].push({ log, payload: p });
    }

    const parsedSessions = Object.keys(sessionGroups).map((refKey) => {
      const group = sessionGroups[refKey];
      // Sort chronologically ascending within session to compile sequential timeline
      group.sort((a, b) => new Date(a.log.createdAt).getTime() - new Date(b.log.createdAt).getTime());

      const firstItem = group[0];
      const lastItem = group[group.length - 1];
      const startTime = new Date(firstItem.log.createdAt);
      const endTime = new Date(lastItem.log.createdAt);

    // Helper: Recursively unwrap nested proxy URLs to guarantee clean store URLs
    function cleanActualStoreUrl(rawUrl: string | null | undefined): string {
      if (!rawUrl || typeof rawUrl !== "string") return "";
      let url = rawUrl.trim();
      let maxDepth = 15;
      while (maxDepth > 0 && (url.includes("/api/cobrowse/proxy?url=") || url.includes("/api/cobrowse/proxy?"))) {
        maxDepth--;
        try {
          const match = url.match(/[?&]url=([^&]+)/);
          if (match && match[1]) {
            url = decodeURIComponent(match[1]);
          } else {
            break;
          }
        } catch {
          break;
        }
      }
      url = url.replace(/([?&])device=[^&]+/gi, '');
      url = url.replace(/([?&])cb_ts=[^&]+/gi, '');
      url = url.replace(/\?$/, '');
      if (url.includes("/api/cobrowse/proxy")) return "https://esponsports.com";
      return url;
    }

    // Find cart from any entry that had cart items in this session
    let finalCart: any = null;
    for (let i = group.length - 1; i >= 0; i--) {
      if (group[i].payload.cart && (group[i].payload.cart.item_count > 0 || group[i].payload.cart.items?.length > 0)) {
        finalCart = group[i].payload.cart;
        break;
      }
    }
    if (!finalCart) {
      finalCart = lastItem.payload.cart || firstItem.payload.cart || null;
    }

    // Sanitize & recover cart prices from repeating division loops
    if (finalCart) {
      finalCart = { ...finalCart };
      finalCart.total_price = sanitizeRupeePrice(finalCart.total_price);
      if (Array.isArray(finalCart.items)) {
        finalCart.items = finalCart.items.map((it: any) => ({
          ...it,
          price: sanitizeRupeePrice(it.price)
        }));
      }
    }

    // Merge unique page journey and unwrap URLs
    const seenUrls = new Set<string>();
    const mergedJourney: any[] = [];
    for (const item of group) {
      const j = Array.isArray(item.payload.pageJourney) ? item.payload.pageJourney : [];
      for (const step of j) {
        const cleanPath = cleanActualStoreUrl(step.path || step.url);
        const cleanUrl = cleanActualStoreUrl(step.url || step.path);
        const key = (cleanPath || cleanUrl) + "_" + (step.title || "");
        if (!seenUrls.has(key)) {
          seenUrls.add(key);
          mergedJourney.push({
            ...step,
            path: cleanPath,
            url: cleanUrl
          });
        }
      }
    }

      // Merge unique searches
      const searchSet = new Set<string>();
      for (const item of group) {
        const s = Array.isArray(item.payload.searches) ? item.payload.searches : [];
        s.forEach((term: string) => term && searchSet.add(term));
        if (item.payload.searchQuery) searchSet.add(item.payload.searchQuery);
      }

      // Merge screen timeline events
      const mergedTimeline: any[] = [];
      const seenTimelineKeys = new Set<string>();
      for (const item of group) {
        const t = Array.isArray(item.payload.screenTimeline) ? item.payload.screenTimeline : [];
        for (const ev of t) {
          const evKey = (ev.time || "") + "_" + (ev.type || "") + "_" + (ev.label || "");
          if (!seenTimelineKeys.has(evKey)) {
            seenTimelineKeys.add(evKey);
            mergedTimeline.push(ev);
          }
        }
      }

      // Fallback timeline from journey if empty
      if (mergedTimeline.length === 0 && mergedJourney.length > 0) {
        mergedJourney.forEach((p, idx) => {
          mergedTimeline.push({
            time: p.time || "Recently",
            type: "PAGE",
            label: "Visited: " + (p.title || p.path || "Storefront"),
            depth: 20 + ((idx * 25) % 80),
            x: 50,
            y: 40
          });
        });
      }

      // Viewport & device detection (Default to authentic Mobile for WhatsApp storefront visitors)
      const vp = lastItem.payload.viewport || firstItem.payload.viewport || null;
      const dev = (vp && vp.device) ? vp.device : "Mobile";

      const { formattedDate, formattedTime, dateCategory } = formatSessionDate(startTime);
      const endFormattedTime = endTime.getTime() !== startTime.getTime()
        ? new Date(endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : null;

      const durationSec = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
      const durMinutes = Math.floor(durationSec / 60);
      const durSeconds = durationSec % 60;
      const durationFormatted = durMinutes > 0 ? `${durMinutes}m ${durSeconds}s` : `${durSeconds}s`;

      return {
        id: lastItem.log.id,
        refId: refKey,
        phone: lastItem.log.phone !== "WIDGET_SESSION" ? lastItem.log.phone : (lastItem.payload.phone || null),
        name: lastItem.payload.name || firstItem.payload.name || null,
        eventType: lastItem.payload.eventType || "VISITOR_SESSION",
        actionDesc: lastItem.log.actionDesc || lastItem.payload.pageTitle || "Website Visit",
        pageUrl: cleanActualStoreUrl(lastItem.payload.pageUrl || firstItem.payload.pageUrl || ""),
        pageTitle: lastItem.payload.pageTitle || firstItem.payload.pageTitle || "Online Store",
        platform: lastItem.payload.platform || "Shopify",
        detectedProduct: lastItem.payload.detectedProduct || firstItem.payload.detectedProduct || null,
        cart: finalCart,
        pageJourney: mergedJourney,
        searches: Array.from(searchSet),
        categoryInsights: lastItem.payload.categoryInsights || firstItem.payload.categoryInsights || null,
        sessionStats: lastItem.payload.sessionStats || firstItem.payload.sessionStats || { pageViews: mergedJourney.length || 1, totalDurationSec: durationSec },
        viewport: vp || { device: dev, width: 390, height: 844, formatted: `${dev} (390x844)` },
        scrollDepth: lastItem.payload.scrollDepth !== undefined ? lastItem.payload.scrollDepth : (firstItem.payload.scrollDepth || 0),
        screenTimeline: mergedTimeline,
        cursorX: lastItem.payload.cursorX ?? 50,
        cursorY: lastItem.payload.cursorY ?? 45,
        clickX: lastItem.payload.clickX ?? null,
        clickY: lastItem.payload.clickY ?? null,
        lastInteraction: lastItem.payload.lastInteraction || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        formattedDate,
        formattedTime: endFormattedTime ? `${formattedTime} - ${endFormattedTime}` : formattedTime,
        dateCategory,
        durationSec,
        durationFormatted,
        pageCount: mergedJourney.length || 1,
        actionCount: mergedTimeline.length,
        isWithCart: Boolean(finalCart && (finalCart.item_count > 0 || finalCart.items?.length > 0)),
        createdAt: lastItem.log.createdAt,
      };
    });

    // Sort aggregated sessions newest first
    parsedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
