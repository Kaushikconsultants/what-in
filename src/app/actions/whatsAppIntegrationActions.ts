"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

function isValidPublicWebhookUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const hostname = parsed.hostname.toLowerCase();
    
    // Block loopback and metadata endpoints
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') || // AWS Metadata / Link-Local
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getWhatsAppIntegrationsAction() {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!user && !isOwner) {
      return { success: false, error: "Unauthorized access", integrations: [] };
    }

    const where: any = {};
    if (user?.clientId) {
      where.clientId = user.clientId;
    } else if (!isOwner && user) {
      where.clientId = null;
    }

    const integrations = await prisma.whatsAppIntegration.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, integrations };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createWhatsAppIntegrationAction(data: { name: string, url: string, token: string, type?: string }) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!isOwner && (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN'))) {
      return { success: false, error: "Unauthorized access: Admin privileges required" };
    }

    if (!data.name || !data.url) {
      return { success: false, error: "Name and URL are required" };
    }

    if (!isValidPublicWebhookUrl(data.url) && data.type !== 'META_CAPI' && data.type !== 'PIXEL') {
      return { success: false, error: "Invalid webhook URL: Private network/loopback IP addresses are not permitted." };
    }

    const integration = await prisma.whatsAppIntegration.create({
      data: {
        clientId: user?.clientId || null,
        name: data.name.trim(),
        url: data.url.trim(),
        token: data.token?.trim() || null,
        type: data.type || "CRM_LEAD"
      }
    });
    return { success: true, integration };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateWhatsAppIntegrationAction(id: string, data: { name: string, url: string, token: string, type?: string }) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!isOwner && (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN'))) {
      return { success: false, error: "Unauthorized access: Admin privileges required" };
    }

    if (data.url && !isValidPublicWebhookUrl(data.url) && data.type !== 'META_CAPI' && data.type !== 'PIXEL') {
      return { success: false, error: "Invalid webhook URL: Private network/loopback IP addresses are not permitted." };
    }

    const integration = await prisma.whatsAppIntegration.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        url: data.url?.trim(),
        token: data.token?.trim() || null,
        type: data.type || "CRM_LEAD"
      }
    });
    return { success: true, integration };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteWhatsAppIntegrationAction(id: string) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!isOwner && (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN'))) {
      return { success: false, error: "Unauthorized access: Admin privileges required" };
    }

    await prisma.whatsAppIntegration.delete({
      where: { id }
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleWhatsAppIntegrationAction(id: string, isActive: boolean) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!isOwner && (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN'))) {
      return { success: false, error: "Unauthorized access: Admin privileges required" };
    }

    const integration = await prisma.whatsAppIntegration.update({
      where: { id },
      data: { isActive }
    });
    return { success: true, integration };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function pushLeadToIntegrationAction(conversationId: string, integrationId: string) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!user && !isOwner) {
      return { success: false, error: "Unauthorized access" };
    }

    const integration = await prisma.whatsAppIntegration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new Error("Integration not found");
    if (integration.type === 'META_CAPI' || integration.type === 'PIXEL' || integration.type?.toUpperCase().includes('CAPI')) {
      throw new Error("Cannot push lead directly to a Meta Pixel / CAPI integration via CRM webhook");
    }

    if (!isValidPublicWebhookUrl(integration.url)) {
      throw new Error("Invalid integration URL: Requests to private or loopback networks are blocked.");
    }

    const conv = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: { customer: true, assignedEmployee: { include: { user: true } } }
    });
    if (!conv || !conv.customer) throw new Error("Conversation or customer not found");

    const payload = {
      name: conv.customer.contactPerson || conv.customer.businessName || 'Unknown',
      whatsappNumber: conv.customer.whatsappNumber || conv.customer.mobile,
      shopName: (conv.customer as any).shopName || '',
      agentEmail: conv.assignedEmployee?.user?.email || ''
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (integration.token) {
      headers['Authorization'] = integration.token;
    }

    const whRes = await fetch(integration.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!whRes.ok) {
      const errText = await whRes.text().catch(() => "");
      throw new Error(`Webhook failed with status ${whRes.status}: ${errText}`);
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function testMetaCatalogConnectionAction(catalogId: string, accessToken: string) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!user && !isOwner) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!catalogId || !accessToken) {
      return { success: false, error: "Catalog ID and Access Token are required" };
    }
    const cleanId = catalogId.trim();
    const cleanToken = accessToken.trim();
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(cleanId)}?fields=id,name,product_count,vertical&access_token=${encodeURIComponent(cleanToken)}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || "Failed to verify Meta Catalog" };
    }
    return { success: true, catalogId: data.id, catalogName: data.name || "Meta Product Catalog", productCount: data.product_count ?? 0, vertical: data.vertical || "commerce" };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error connecting to Meta Graph API" };
  }
}

export async function fetchMetaCatalogsFromTokenAction(accessToken: string) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!user && !isOwner) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!accessToken || !accessToken.trim()) {
      return { success: false, error: "Access Token is required to fetch catalogs" };
    }
    const cleanToken = accessToken.trim();
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/assigned_product_catalogs?fields=id,name,product_count,vertical&limit=50&access_token=${encodeURIComponent(cleanToken)}`
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      return { 
        success: false, 
        error: data.error?.message || "Failed to fetch catalogs from Meta Graph API" 
      };
    }
    const catalogs = (data.data || []).map((c: any) => ({
      id: c.id,
      name: c.name || `Catalog ${c.id}`,
      productCount: c.product_count ?? 0,
      vertical: c.vertical || "commerce"
    }));
    return {
      success: true,
      catalogs
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error fetching catalogs from Meta" };
  }
}

export async function fetchMetaPixelsFromTokenAction(accessToken: string) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!user && !isOwner) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!accessToken || !accessToken.trim()) {
      return { success: false, error: "Access Token is required to fetch Meta Pixels / Datasets" };
    }
    const cleanToken = accessToken.trim();
    const discoveredPixels: { id: string; name: string; type?: string }[] = [];
    const seenIds = new Set<string>();

    const addPixel = (id: string, name?: string, type = "Pixel") => {
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        discoveredPixels.push({
          id,
          name: name || `Meta ${type} (${id})`,
          type
        });
      }
    };

    // 1. Fetch from ad accounts assigned to this user / system user
    try {
      const adAccountsRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,adspixels{id,name,is_unavailable}&limit=50&access_token=${encodeURIComponent(cleanToken)}`
      );
      const adData = await adAccountsRes.json();
      if (adData?.data && Array.isArray(adData.data)) {
        for (const act of adData.data) {
          if (act.adspixels?.data && Array.isArray(act.adspixels.data)) {
            for (const px of act.adspixels.data) {
              addPixel(px.id, px.name, "Pixel");
            }
          }
        }
      }
    } catch (_) {}

    // 2. Fetch from businesses (owned_pixels, client_pixels, owned_datasets)
    try {
      const bizRes = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_pixels{id,name},client_pixels{id,name},owned_datasets{id,name}&limit=25&access_token=${encodeURIComponent(cleanToken)}`
      );
      const bizData = await bizRes.json();
      if (bizData?.data && Array.isArray(bizData.data)) {
        for (const biz of bizData.data) {
          if (biz.owned_pixels?.data && Array.isArray(biz.owned_pixels.data)) {
            for (const px of biz.owned_pixels.data) addPixel(px.id, px.name, "Pixel");
          }
          if (biz.client_pixels?.data && Array.isArray(biz.client_pixels.data)) {
            for (const px of biz.client_pixels.data) addPixel(px.id, px.name, "Client Pixel");
          }
          if (biz.owned_datasets?.data && Array.isArray(biz.owned_datasets.data)) {
            for (const ds of biz.owned_datasets.data) addPixel(ds.id, ds.name, "Dataset");
          }
        }
      }
    } catch (_) {}

    // 3. Fallback direct /me/adspixels
    if (discoveredPixels.length === 0) {
      try {
        const directRes = await fetch(
          `https://graph.facebook.com/v21.0/me/adspixels?fields=id,name&limit=50&access_token=${encodeURIComponent(cleanToken)}`
        );
        const directData = await directRes.json();
        if (directData?.data && Array.isArray(directData.data)) {
          for (const px of directData.data) addPixel(px.id, px.name, "Pixel");
        }
      } catch (_) {}
    }

    if (discoveredPixels.length === 0) {
      return {
        success: false,
        error: "No Meta Pixels or Datasets found for this token. Ensure your System User has 'ads_management' or 'business_management' permission in Meta Business Suite."
      };
    }

    return {
      success: true,
      pixels: discoveredPixels
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error fetching pixels from Meta" };
  }
}

export async function testMetaPixelConnectionAction(pixelId: string, accessToken: string) {
  try {
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();
    if (!user && !isOwner) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!pixelId || !accessToken) {
      return { success: false, error: "Pixel ID and Access Token are required" };
    }
    const cleanId = pixelId.trim();
    const cleanToken = accessToken.trim();
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(cleanId)}?fields=id,name,is_unavailable&access_token=${encodeURIComponent(cleanToken)}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || "Failed to verify Meta Pixel / Dataset" };
    }
    return { success: true, pixelId: data.id, pixelName: data.name || "Meta Pixel" };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error connecting to Meta Graph API" };
  }
}

