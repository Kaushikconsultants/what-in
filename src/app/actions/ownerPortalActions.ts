"use server";

import { prisma } from "@/lib/prisma";

const OWNER_SECRET = process.env.OWNER_PORTAL_SECRET || "whatin-owner-2026";

export async function verifyOwnerPasswordAction(password: string) {
  return { ok: password === OWNER_SECRET };
}

export async function getOwnerDashboardStatsAction() {
  try {
    const clients = await prisma.whatsAppClient.findMany({ include: { agents: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
    const total = clients.length;
    const active = clients.filter(c => c.subscriptionStatus === "ACTIVE").length;
    const pastDue = clients.filter(c => c.subscriptionStatus === "PAST_DUE").length;
    const blocked = clients.filter(c => c.subscriptionStatus === "BLOCKED").length;
    const trial = clients.filter(c => c.subscriptionStatus === "TRIAL").length;
    const mrr = clients.filter(c => c.subscriptionStatus === "ACTIVE").reduce((s, c) => s + c.monthlyFee, 0);
    return { success: true, stats: { total, active, pastDue, blocked, trial, mrr }, clients };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getOwnerClientsAction() {
  try {
    const clients = await prisma.whatsAppClient.findMany({
      include: { agents: true, payments: { orderBy: { createdAt: "desc" }, take: 5 } },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, clients };
  } catch (e: any) {
    return { success: false, error: e.message, clients: [] };
  }
}


// Auto-register webhook with Meta Graph API for a client
async function registerMetaWebhook(wabaId: string, accessToken: string, webhookClientId: string): Promise<{ success: boolean; error?: string }> {
  if (!wabaId || !accessToken) return { success: false, error: "Missing WABA ID or access token" };
  try {
    const appUrl = "https://what-inn.tikal.in";
    const callbackUrl = `${appUrl}/api/whatsapp/webhook/${webhookClientId}`;
    const verifyToken = `wm_${webhookClientId.slice(0, 8)}`;
    
    // Subscribe the WABA to webhook via Meta Graph API
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ callback_url: callbackUrl, verify_token: verifyToken, subscribed_fields: ["messages", "messaging_postbacks", "message_deliveries", "message_reads"] })
      }
    );
    const data = await res.json();
    if (data.success || res.ok) {
      return { success: true };
    }
    return { success: false, error: data.error?.message || "Meta API registration failed" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createClientAction(data: {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  subscriptionPlan: string;
  monthlyFee: number;
  maxAgents: number;
  notes?: string;
  ownerWhatsApp?: string;
  wabaId?: string;
  phoneId?: string;
  metaAccessToken?: string;
  webhookVerifyToken?: string;
  phoneNumber?: string;
  shopifyDomain?: string;
  shopifyToken?: string;
}) {
  try {
    const client = await prisma.whatsAppClient.create({
      data: {
        businessName: data.businessName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        subscriptionPlan: data.subscriptionPlan,
        monthlyFee: data.monthlyFee,
        maxAgents: data.maxAgents,
        notes: data.notes || "",
        ownerWhatsApp: data.ownerWhatsApp || "",
        wabaId: data.wabaId || "",
        phoneId: data.phoneId || "",
        metaAccessToken: data.metaAccessToken || "",
        webhookVerifyToken: data.webhookVerifyToken || "",
        phoneNumber: data.phoneNumber || "",
        shopifyDomain: data.shopifyDomain || "",
        shopifyToken: data.shopifyToken || "",
        subscriptionStatus: "TRIAL",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    });
    // Auto-register Meta webhook if credentials provided
    let webhookRegistration: { success: boolean; error?: string } = { success: false };
    if (data.wabaId && data.metaAccessToken) {
      webhookRegistration = await registerMetaWebhook(data.wabaId, data.metaAccessToken, client.webhookClientId);
      // Save the auto-generated verify token back to client
      const verifyToken = `wm_${client.webhookClientId.slice(0, 8)}`;
      await prisma.whatsAppClient.update({
        where: { id: client.id },
        data: { webhookVerifyToken: verifyToken }
      });
    }
    return { success: true, client, webhookRegistration };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function markClientPaidAction(clientId: string, notes?: string) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [updated] = await prisma.$transaction([
      prisma.whatsAppClient.update({
        where: { id: clientId },
        data: { subscriptionStatus: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd }
      }),
      prisma.whatsAppClientPayment.create({
        data: { clientId, amount: client.monthlyFee, periodStart: now, periodEnd, notes: notes || "Marked paid by owner", markedByOwner: true }
      })
    ]);
    return { success: true, client: updated };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateClientPlanAction(clientId: string, data: {
  subscriptionPlan?: string;
  monthlyFee?: number;
  maxAgents?: number;
  notes?: string;
  ownerWhatsApp?: string;
  wabaId?: string;
  phoneId?: string;
  metaAccessToken?: string;
  webhookVerifyToken?: string;
  phoneNumber?: string;
  shopifyDomain?: string;
  shopifyToken?: string;
}) {
  try {
    const client = await prisma.whatsAppClient.update({ where: { id: clientId }, data });
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleClientBlockAction(clientId: string, block: boolean) {
  try {
    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: { subscriptionStatus: block ? "BLOCKED" : "ACTIVE", isActive: !block }
    });
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteClientAction(clientId: string) {
  try {
    await prisma.whatsAppClient.delete({ where: { id: clientId } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addAgentToClientAction(clientId: string, data: { name: string; email: string; password: string; role: string }) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId }, include: { agents: true } });
    if (!client) return { success: false, error: "Client not found" };
    if (client.agents.length >= client.maxAgents) return { success: false, error: `Seat limit reached. Max ${client.maxAgents} agents allowed.` };
    const agent = await prisma.whatsAppAgentUser.create({ data: { clientId, ...data } });
    return { success: true, agent };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getClientStatusAction(clientId: string) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { blocked: false, pastDue: false, daysLeft: 0 };
    const now = new Date();
    const isPastDue = client.subscriptionStatus === "PAST_DUE" || (client.subscriptionStatus === "ACTIVE" && client.currentPeriodEnd < now);
    const isBlocked = client.subscriptionStatus === "BLOCKED" || (isPastDue && (now.getTime() - client.currentPeriodEnd.getTime()) > client.gracePeriodDays * 24 * 60 * 60 * 1000);
    const daysLeft = isPastDue ? Math.max(0, client.gracePeriodDays - Math.floor((now.getTime() - client.currentPeriodEnd.getTime()) / (24 * 60 * 60 * 1000))) : 0;
    return { blocked: isBlocked, pastDue: isPastDue && !isBlocked, daysLeft, ownerWhatsApp: client.ownerWhatsApp, subscriptionStatus: client.subscriptionStatus };
  } catch {
    return { blocked: false, pastDue: false, daysLeft: 0 };
  }
}

// Auto-update past-due statuses (call periodically or on page load)
export async function syncSubscriptionStatusesAction() {
  try {
    const now = new Date();
    const overdueClients = await prisma.whatsAppClient.findMany({
      where: { subscriptionStatus: "ACTIVE", currentPeriodEnd: { lt: now } }
    });
    for (const c of overdueClients) {
      const daysPastDue = Math.floor((now.getTime() - c.currentPeriodEnd.getTime()) / (24 * 60 * 60 * 1000));
      const newStatus = daysPastDue >= c.gracePeriodDays ? "BLOCKED" : "PAST_DUE";
      await prisma.whatsAppClient.update({ where: { id: c.id }, data: { subscriptionStatus: newStatus } });
    }
    return { success: true, updated: overdueClients.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getClientMetaCredentialsAction(clientId?: string) {
  try {
    const client = clientId
      ? await prisma.whatsAppClient.findUnique({ where: { id: clientId } })
      : await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    if (!client) return { success: false, error: "No client found" };
    return {
      success: true,
      wabaId: client.wabaId || "",
      phoneId: client.phoneId || "",
      metaAccessToken: client.metaAccessToken || "",
      webhookVerifyToken: client.webhookVerifyToken || "",
      phoneNumber: client.phoneNumber || "",
      shopifyDomain: client.shopifyDomain || "",
      shopifyToken: client.shopifyToken || "",
      webhookUrl: `https://what-inn.tikal.in/api/whatsapp/webhook/${client.webhookClientId}`,
      clientId: client.id,
      webhookClientId: client.webhookClientId,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function saveClientMetaCredentialsAction(data: {
  wabaId?: string;
  phoneId?: string;
  metaAccessToken?: string;
  webhookVerifyToken?: string;
  phoneNumber?: string;
  shopifyDomain?: string;
  shopifyToken?: string;
  clientId?: string;
}) {
  try {
    const { clientId, ...rest } = data;
    let client: any;
    if (clientId) {
      client = await prisma.whatsAppClient.update({ where: { id: clientId }, data: rest });
    } else {
      client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
      if (!client) return { success: false, error: "No client configured yet. Contact your service provider." };
      client = await prisma.whatsAppClient.update({ where: { id: client.id }, data: rest });
    }
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function registerWebhookForClientAction(clientId: string) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    if (!client.wabaId || !client.metaAccessToken) return { success: false, error: "Client is missing WABA ID or Access Token. Update them first." };
    
    const result = await registerMetaWebhook(client.wabaId, client.metaAccessToken, client.webhookClientId);
    
    if (result.success) {
      const verifyToken = `wm_${client.webhookClientId.slice(0, 8)}`;
      await prisma.whatsAppClient.update({ where: { id: clientId }, data: { webhookVerifyToken: verifyToken } });
    }
    
    const appUrl = "https://what-inn.tikal.in";
    return {
      ...result,
      webhookUrl: `${appUrl}/api/whatsapp/webhook/${client.webhookClientId}`,
      verifyToken: `wm_${client.webhookClientId.slice(0, 8)}`,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function setCustomWebhookUrlAction(clientId: string, customWebhookUrl: string) {
  try {
    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: { customWebhookUrl: customWebhookUrl || null }
    });
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
