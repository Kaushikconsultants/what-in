"use server";

import { prisma } from "@/lib/prisma";

export async function getWhatsAppIntegrationsAction() {
  try {
    const integrations = await prisma.whatsAppIntegration.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, integrations };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createWhatsAppIntegrationAction(data: { name: string, url: string, token: string, type?: string }) {
  try {
    const integration = await prisma.whatsAppIntegration.create({
      data: {
        name: data.name,
        url: data.url,
        token: data.token || null,
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
    const integration = await prisma.whatsAppIntegration.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        token: data.token || null,
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
    const integration = await prisma.whatsAppIntegration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new Error("Integration not found");
    if (integration.type === 'META_CAPI' || integration.type === 'PIXEL' || integration.type?.toUpperCase().includes('CAPI')) {
      throw new Error("Cannot push lead directly to a Meta Pixel / CAPI integration via CRM webhook");
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

