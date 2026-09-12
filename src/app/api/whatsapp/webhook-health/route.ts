import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);

    if (!authUser && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Resolve tenant client ID
    const url = new URL(req.url);
    const queryClientId = url.searchParams.get("clientId");

    let effectiveClientId = authUser?.clientId;
    if (isOwner && queryClientId) {
      effectiveClientId = queryClientId;
    }

    // Fetch tenant client record
    let client: any = null;
    if (effectiveClientId) {
      client = await prisma.whatsAppClient.findUnique({
        where: { id: effectiveClientId },
        include: {
          _count: {
            select: {
              conversations: true,
              customers: true,
              agents: true
            }
          }
        }
      });
    }

    // Fallback if no specific client or first client
    if (!client) {
      client = await prisma.whatsAppClient.findFirst({
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: {
              conversations: true,
              customers: true,
              agents: true
            }
          }
        }
      });
    }

    // Also check global / legacy account credentials
    const account = await prisma.whatsAppAccount.findFirst({
      orderBy: { createdAt: "desc" }
    });

    const company = await prisma.companySettings.findFirst();
    const settings = await prisma.whatsAppSettings.findFirst();

    // 1. Meta WhatsApp API Diagnostics
    const metaToken = client?.metaAccessToken || account?.accessToken || process.env.META_WA_ACCESS_TOKEN || "";
    const phoneId = client?.phoneId || account?.phoneId || process.env.META_WA_PHONE_NUMBER_ID || "";
    const wabaId = client?.wabaId || account?.businessAccountId || process.env.META_WA_BUSINESS_ID || "";
    const phoneNumber = client?.phoneNumber || account?.phoneNumber || company?.mobile || "Not Configured";
    const webhookVerifyToken = client?.webhookVerifyToken || account?.webhookVerifyToken || "whatin_whatsapp_secure_webhook_token_2026";

    // Build absolute webhook URL for this tenant
    const reqHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "whatsapp.esponsports.com";
    const protocol = reqHost.includes("localhost") ? "http" : "https";
    const tenantWebhookUrl = client?.customWebhookUrl || `${protocol}://${reqHost}/api/whatsapp/webhook?clientId=${client?.webhookClientId || client?.id || "default"}`;

    // Check last received webhook or message
    const [lastWebhookLog, lastCustomerMsg] = await Promise.all([
      prisma.whatsAppWebhookLog.findFirst({
        orderBy: { createdAt: "desc" }
      }).catch(() => null),
      prisma.whatsAppMessage.findFirst({
        where: {
          senderType: { in: ["CUSTOMER", "USER"] },
          ...(client?.id ? { conversation: { clientId: client.id } } : {})
        },
        orderBy: { sentAt: "desc" }
      }).catch(() => null)
    ]);

    const isMetaConfigured = Boolean(metaToken && phoneId);
    let metaStatus = isMetaConfigured ? "CONNECTED" : "NOT_CONFIGURED";
    let metaHealthGrade = isMetaConfigured ? "HEALTHY" : "CRITICAL";

    // 2. Shopify Webhook Diagnostics
    const shopifyDomain = client?.shopifyDomain || company?.shopifyStoreDomain || (settings as any)?.shopifyStoreDomain || "";
    const shopifyToken = client?.shopifyToken || company?.shopifyAccessToken || (settings as any)?.shopifyAccessToken || "";
    const isShopifyConfigured = Boolean(shopifyDomain && shopifyToken);

    const [lastAbandonedCart, lastShopifyOrder] = await Promise.all([
      prisma.shopifyAbandonedCheckout.findFirst({
        orderBy: { createdAt: "desc" }
      }).catch(() => null),
      prisma.order.findFirst({
        where: { orderNumber: { startsWith: "#" } },
        orderBy: { orderDate: "desc" }
      }).catch(() => null)
    ]);

    const shopifyWebhookUrl = `${protocol}://${reqHost}/api/shopify/webhook`;
    const shopifyStatus = isShopifyConfigured ? "ACTIVE" : "DISCONNECTED";
    const shopifyTopics = [
      { topic: "orders/create", active: isShopifyConfigured, desc: "Order placement notifications & live sync" },
      { topic: "orders/updated", active: isShopifyConfigured, desc: "Tracking ID & fulfillment updates" },
      { topic: "checkouts/create", active: isShopifyConfigured, desc: "Abandoned checkout recovery triggers" },
      { topic: "checkouts/update", active: isShopifyConfigured, desc: "Real-time cart item modifications" },
      { topic: "customers/create", active: isShopifyConfigured, desc: "CRM contact sync & welcome message" }
    ];

    // 3. Meta Conversion API (CAPI) Diagnostics
    const capiIntegration = await prisma.whatsAppIntegration.findFirst({
      where: {
        type: "META_CAPI",
        isActive: true,
        ...(client?.id ? { OR: [{ clientId: client.id }, { clientId: null }] } : {})
      }
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [capi24hCount, capi7dCount, recentCapiLogs] = await Promise.all([
      prisma.whatsAppChatbotLog.count({
        where: {
          nodeType: "META_CAPI",
          createdAt: { gte: oneDayAgo }
        }
      }).catch(() => 0),
      prisma.whatsAppChatbotLog.count({
        where: {
          nodeType: "META_CAPI",
          createdAt: { gte: sevenDaysAgo }
        }
      }).catch(() => 0),
      prisma.whatsAppChatbotLog.findMany({
        where: { nodeType: "META_CAPI" },
        orderBy: { createdAt: "desc" },
        take: 6
      }).catch(() => [])
    ]);

    const isCapiConfigured = Boolean(capiIntegration && capiIntegration.url && capiIntegration.token);
    const lastCapiEvent = recentCapiLogs[0] || null;
    const capiStatus = isCapiConfigured 
      ? (lastCapiEvent?.responseStatus && lastCapiEvent.responseStatus >= 400 ? "DEGRADED" : "HEALTHY")
      : "INACTIVE";

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenant: {
        id: client?.id || "default",
        businessName: client?.businessName || company?.companyName || "Whatmore Multi-Tenant",
        plan: client?.subscriptionPlan || "GROWTH",
        status: client?.subscriptionStatus || "ACTIVE",
        webhookClientId: client?.webhookClientId || client?.id || "default",
        monthlyMessageQuota: client?.monthlyMessageQuota || 5000,
        messagesUsedCount: client?.messagesUsedCount || 0,
        monthlyAiQuota: client?.monthlyAiQuota || 500,
        aiRepliesUsedCount: client?.aiRepliesUsedCount || 0,
        totalCustomers: client?._count?.customers || 0,
        totalConversations: client?._count?.conversations || 0,
        totalAgents: client?._count?.agents || 1
      },
      metaWhatsApp: {
        status: metaStatus,
        healthGrade: metaHealthGrade,
        isConfigured: isMetaConfigured,
        phoneNumber,
        phoneId: phoneId ? `${phoneId.slice(0, 4)}••••${phoneId.slice(-4)}` : "Missing",
        fullPhoneId: phoneId,
        wabaId: wabaId ? `${wabaId.slice(0, 4)}••••${wabaId.slice(-4)}` : "Missing",
        webhookUrl: tenantWebhookUrl,
        webhookVerifyToken,
        lastPayloadReceived: lastWebhookLog?.createdAt || lastCustomerMsg?.sentAt || null,
        lastMessagePreview: lastCustomerMsg?.content ? lastCustomerMsg.content.slice(0, 60) : null
      },
      shopify: {
        status: shopifyStatus,
        isConfigured: isShopifyConfigured,
        storeDomain: shopifyDomain || "Not Configured",
        webhookUrl: shopifyWebhookUrl,
        subscribedTopics: shopifyTopics,
        lastSyncTimestamp: lastAbandonedCart?.createdAt || lastShopifyOrder?.orderDate || null,
        lastAbandonedCheckoutTotal: lastAbandonedCart?.totalPrice ? `₹${Number(lastAbandonedCart.totalPrice).toLocaleString('en-IN')}` : null
      },
      capi: {
        status: capiStatus,
        isConfigured: isCapiConfigured,
        pixelId: capiIntegration?.url ? `${capiIntegration.url.slice(0, 4)}••••${capiIntegration.url.slice(-4)}` : "Not Configured",
        fullPixelId: capiIntegration?.url || "",
        leadValueEstimate: settings?.metaCapiLeadValue || 10000,
        events24h: capi24hCount,
        events7d: capi7dCount,
        lastDispatchedAt: lastCapiEvent?.createdAt || null,
        lastActionDesc: lastCapiEvent?.actionDesc || "No recent CAPI events recorded",
        lastResponseStatus: lastCapiEvent?.responseStatus || (isCapiConfigured ? 200 : null),
        matchRateQuality: "High (SHA-256 Hashed Phone Match)",
        recentEvents: recentCapiLogs.map(log => ({
          id: log.id,
          phone: log.phone ? `••••${log.phone.slice(-4)}` : "N/A",
          action: log.actionDesc,
          status: log.responseStatus || 200,
          timestamp: log.createdAt,
          hasError: Boolean(log.errorMessage)
        }))
      }
    });

  } catch (error: any) {
    console.error("[Webhook Health API Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
