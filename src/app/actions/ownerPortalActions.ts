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
    const appUrl = "https://what-in.tinkal.in";
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
  adminPassword?: string;
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
  initialStatus?: string;
}) {
  try {
    const password = data.adminPassword?.trim() || "WhatIn@" + Math.floor(100000 + Math.random() * 900000);
    const initialStatus = data.initialStatus || "ACTIVE";
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const client = await prisma.whatsAppClient.create({
      data: {
        businessName: data.businessName,
        contactEmail: data.contactEmail,
        adminEmail: data.contactEmail,
        adminPassword: password,
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
        subscriptionStatus: initialStatus,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      }
    });

    // Create the primary Admin user in whatsAppAgentUser so the client can immediately login at /login
    await prisma.whatsAppAgentUser.upsert({
      where: { email: data.contactEmail },
      update: {
        clientId: client.id,
        name: data.businessName + " Admin",
        password: password,
        role: "ADMIN",
        isActive: true
      },
      create: {
        clientId: client.id,
        name: data.businessName + " Admin",
        email: data.contactEmail,
        password: password,
        role: "ADMIN",
        isActive: true
      }
    });

    // If initial status is ACTIVE, record an initial payment entry
    if (initialStatus === "ACTIVE" && data.monthlyFee > 0) {
      await prisma.whatsAppClientPayment.create({
        data: {
          clientId: client.id,
          amount: data.monthlyFee,
          periodStart: now,
          periodEnd: periodEnd,
          notes: "Initial Subscription Activation on Onboarding",
          markedByOwner: true
        }
      });
    }

    // Auto-register Meta webhook if credentials provided
    let webhookRegistration: { success: boolean; error?: string } = { success: false };
    if (data.wabaId && data.metaAccessToken) {
      webhookRegistration = await registerMetaWebhook(data.wabaId, data.metaAccessToken, client.webhookClientId);
      const verifyToken = `wm_${client.webhookClientId.slice(0, 8)}`;
      await prisma.whatsAppClient.update({
        where: { id: client.id },
        data: { webhookVerifyToken: verifyToken }
      });
    }
    return { success: true, client, defaultPassword: password, webhookRegistration };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function markClientPaidAction(clientId: string, notes?: string, extendMonths: number = 1) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    const now = new Date();
    // If client was already active with period in the future, extend from currentPeriodEnd, otherwise from now
    const baseDate = client.currentPeriodEnd && client.currentPeriodEnd > now ? client.currentPeriodEnd : now;
    const periodEnd = new Date(baseDate.getTime() + extendMonths * 30 * 24 * 60 * 60 * 1000);

    const [updated] = await prisma.$transaction([
      prisma.whatsAppClient.update({
        where: { id: clientId },
        data: { subscriptionStatus: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd }
      }),
      prisma.whatsAppClientPayment.create({
        data: {
          clientId,
          amount: client.monthlyFee * extendMonths,
          periodStart: now,
          periodEnd,
          notes: notes || `Monthly Renewal (${extendMonths} mo)`,
          markedByOwner: true
        }
      })
    ]);
    return { success: true, client: updated, periodEnd };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function recordClientPaymentAction(data: {
  clientId: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  periodEnd: string | Date;
  notes?: string;
}) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: data.clientId } });
    if (!client) return { success: false, error: "Client not found" };

    const now = new Date();
    const targetPeriodEnd = new Date(data.periodEnd);
    const fullNotes = `[${data.paymentMethod}]${data.transactionRef ? ` Ref: ${data.transactionRef}` : ""}${data.notes ? ` - ${data.notes}` : ""}`;

    const [updated, payment] = await prisma.$transaction([
      prisma.whatsAppClient.update({
        where: { id: data.clientId },
        data: {
          subscriptionStatus: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: targetPeriodEnd
        }
      }),
      prisma.whatsAppClientPayment.create({
        data: {
          clientId: data.clientId,
          amount: Number(data.amount),
          periodStart: now,
          periodEnd: targetPeriodEnd,
          notes: fullNotes,
          markedByOwner: true
        }
      })
    ]);

    return { success: true, client: updated, payment };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getClientPaymentsAction(clientId: string) {
  try {
    const client = await prisma.whatsAppClient.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        businessName: true,
        contactEmail: true,
        contactPhone: true,
        monthlyFee: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        adminPassword: true
      }
    });
    if (!client) return { success: false, error: "Client not found", payments: [] };

    const payments = await prisma.whatsAppClientPayment.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, client, payments };
  } catch (e: any) {
    return { success: false, error: e.message, payments: [] };
  }
}

export async function updateClientAdminPasswordAction(clientId: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: "Password must be at least 4 characters" };
    }
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };

    const cleanPass = newPassword.trim();

    await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: { adminPassword: cleanPass }
    });

    // Also update in WhatsAppAgentUser if exists
    await prisma.whatsAppAgentUser.updateMany({
      where: { clientId, email: client.contactEmail },
      data: { password: cleanPass }
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateClientDueDateAction(clientId: string, newDueDate: string | Date, newStatus?: string) {
  try {
    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: {
        currentPeriodEnd: new Date(newDueDate),
        ...(newStatus ? { subscriptionStatus: newStatus } : {})
      }
    });
    return { success: true, client };
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
  adminPassword?: string;
  wabaId?: string;
  phoneId?: string;
  metaAccessToken?: string;
  webhookVerifyToken?: string;
  phoneNumber?: string;
  shopifyDomain?: string;
  shopifyToken?: string;
}) {
  try {
    const { adminPassword, ...rest } = data;
    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: {
        ...rest,
        ...(adminPassword ? { adminPassword: adminPassword.trim() } : {})
      }
    });

    if (adminPassword && adminPassword.trim()) {
      await prisma.whatsAppAgentUser.updateMany({
        where: { clientId, email: client.contactEmail },
        data: { password: adminPassword.trim() }
      });
    }

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
      webhookUrl: `https://what-in.tinkal.in/api/whatsapp/webhook/${client.webhookClientId}`,
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
    
    const appUrl = "https://what-in.tinkal.in";
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

export async function loginAsClientAction(clientId: string) {
  try {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    const adminAgent = await prisma.whatsAppAgentUser.findFirst({
      where: { clientId: client.id, role: "ADMIN" }
    });
    return {
      success: true,
      user: {
        name: adminAgent?.name || client.businessName + " Admin",
        email: adminAgent?.email || client.contactEmail,
        role: "ADMIN",
        clientId: client.id,
        businessName: client.businessName
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

