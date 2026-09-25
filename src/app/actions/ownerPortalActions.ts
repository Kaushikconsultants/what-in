"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isOwnerAuthenticated, getAuthenticatedUser } from "@/lib/authSession";
import { DEFAULT_PLAN_TIERS, ALL_MODULE_KEYS, ModuleKey } from "@/lib/moduleRegistry";

const OWNER_SECRET = process.env.OWNER_PORTAL_SECRET || "whatin-owner-2026";

export async function verifyOwnerPasswordAction(password: string) {
  return { ok: password === OWNER_SECRET };
}

export async function getOwnerDashboardStatsAction() {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required", clients: [] };
    }

    // Auto-heal / sync existing records if needed
    await prisma.whatsAppClient.updateMany({
      where: {
        OR: [
          { businessName: { contains: "R3", mode: "insensitive" } },
          { contactEmail: { contains: "admin@r3", mode: "insensitive" } }
        ],
        monthlyMessageQuota: 5000
      },
      data: {
        monthlyMessageQuota: 100000,
        monthlyAiQuota: 50000
      }
    }).catch(() => null);

    await prisma.whatsAppClient.updateMany({
      where: {
        OR: [
          { contactEmail: "admin@whatmore.tinkal.in" },
          { contactEmail: "admin@what-in.tinkal.in" },
          { contactEmail: "admin@esponsports.com" }
        ],
        subscriptionStatus: "PAST_DUE"
      },
      data: {
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2036-12-31T23:59:59.000Z")
      }
    }).catch(() => null);

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://whatsapp.esponsports.com";
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
  monthlyMessageQuota?: number;
  monthlyAiQuota?: number;
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    const rawPassword = data.adminPassword?.trim() || "WhatMore@" + Math.floor(100000 + Math.random() * 900000);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const initialStatus = data.initialStatus || "ACTIVE";
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const generatedVerifyToken = data.webhookVerifyToken?.trim() || `whsec_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

    // Resolve default modules if not explicitly passed
    let modulesToSet = (data as any).enabledModules;
    if (!modulesToSet || !Array.isArray(modulesToSet) || modulesToSet.length === 0) {
      const plan = DEFAULT_PLAN_TIERS.find(p => p.id === data.subscriptionPlan);
      modulesToSet = plan ? plan.modules : ALL_MODULE_KEYS;
    }

    const client = await prisma.whatsAppClient.create({
      data: {
        businessName: data.businessName,
        contactEmail: data.contactEmail,
        adminEmail: data.contactEmail,
        adminPassword: hashedPassword,
        contactPhone: data.contactPhone,
        subscriptionPlan: data.subscriptionPlan,
        monthlyFee: Number(data.monthlyFee) || 0,
        maxAgents: Number(data.maxAgents) || 1,
        monthlyMessageQuota: Number(data.monthlyMessageQuota) || 5000,
        monthlyAiQuota: Number(data.monthlyAiQuota) || 500,
        enabledModules: JSON.stringify(modulesToSet),
        notes: data.notes || "",
        ownerWhatsApp: data.ownerWhatsApp || "",
        wabaId: data.wabaId || "",
        phoneId: data.phoneId || "",
        metaAccessToken: data.metaAccessToken || "",
        webhookVerifyToken: generatedVerifyToken,
        phoneNumber: data.phoneNumber || "",
        shopifyDomain: data.shopifyDomain || "",
        shopifyToken: data.shopifyToken || "",
        subscriptionStatus: initialStatus,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      }
    });

    // Create the primary Admin user in whatsAppAgentUser with bcrypt hashed password
    await prisma.whatsAppAgentUser.upsert({
      where: { email: data.contactEmail },
      update: {
        clientId: client.id,
        name: data.businessName + " Admin",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true
      },
      create: {
        clientId: client.id,
        name: data.businessName + " Admin",
        email: data.contactEmail,
        password: hashedPassword,
        role: "ADMIN",
        isActive: true
      }
    });

    // Seed default starter Chatbot Flow for this client
    await prisma.whatsAppChatbotFlow.create({
      data: {
        clientId: client.id,
        name: "Welcome & FAQ Flow",
        triggerKeyword: "HI, HELLO, START, MENU",
        nodesJson: JSON.stringify([
          { id: "node_1", type: "TRIGGER", title: "Trigger Keyword", text: "HI, HELLO, START, MENU", outputPort: "node_2" },
          { id: "node_2", type: "TEXT", title: "Welcome Greeting", text: `Welcome to ${data.businessName}! 👋 How can we help you today?`, outputPort: "node_3" },
          {
            id: "node_3",
            type: "CHOICE",
            title: "Main Options",
            text: "Please select an option below:",
            choices: [
              { id: "c1", text: "Explore Products", targetNode: "node_4" },
              { id: "c2", text: "Track My Order", targetNode: "node_5" },
              { id: "c3", text: "Talk to Agent", targetNode: "node_6" }
            ]
          },
          { id: "node_4", type: "TEXT", title: "Catalog", text: "Check out our latest collections and offers!", outputPort: null },
          { id: "node_5", type: "TEXT", title: "Order Help", text: "Please share your order number so we can look it up.", outputPort: null },
          { id: "node_6", type: "TEXT", title: "Agent Connecting", text: "Connecting you with an agent right away. Please hold on.", outputPort: null }
        ]),
        isActive: true,
        executionCount: 0
      }
    }).catch(() => {});

    // Seed default starter Canned Responses for this client
    await prisma.whatsAppCannedResponse.createMany({
      data: [
        { clientId: client.id, title: "Return Policy", shortcut: "/return", content: "Our return policy is 7 days from the date of delivery. Items must be unwashed and unworn. Can I help you initiate a return?" },
        { clientId: client.id, title: "Shipping Time", shortcut: "/shipping", content: "Standard shipping takes 3-5 business days. You will receive a tracking link as soon as your order is dispatched." },
        { clientId: client.id, title: "Greeting", shortcut: "/hi", content: `Hi there! Welcome to ${data.businessName} 👋 How can I help you today?` },
        { clientId: client.id, title: "Discount Code", shortcut: "/discount", content: "Use code WELCOME10 at checkout for 10% off your purchase!" },
      ]
    }).catch(() => {});

    // If initial status is ACTIVE, record an initial payment entry
    if (initialStatus === "ACTIVE" && Number(data.monthlyFee) > 0) {
      await prisma.whatsAppClientPayment.create({
        data: {
          clientId: client.id,
          amount: Number(data.monthlyFee),
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
      const verifyToken = generatedVerifyToken || `wm_${client.webhookClientId.slice(0, 8)}`;
      await prisma.whatsAppClient.update({
        where: { id: client.id },
        data: { webhookVerifyToken: verifyToken }
      });
    }
    return { success: true, client, defaultPassword: rawPassword, webhookRegistration };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function markClientPaidAction(clientId: string, notes?: string, extendMonths: number = 1) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    const now = new Date();
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required", payments: [] };
    }
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: "Password must be at least 4 characters" };
    }
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };

    const cleanPass = newPassword.trim();
    const hashedPassword = await bcrypt.hash(cleanPass, 10);

    await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: { adminPassword: hashedPassword }
    });

    // Also update in WhatsAppAgentUser if exists
    await prisma.whatsAppAgentUser.updateMany({
      where: { clientId, email: client.contactEmail },
      data: { password: hashedPassword }
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateClientDueDateAction(clientId: string, newDueDate: string | Date, newStatus?: string) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const { adminPassword, ...rest } = data;
    let hashedPassword = "";
    if (adminPassword && adminPassword.trim()) {
      hashedPassword = await bcrypt.hash(adminPassword.trim(), 10);
    }

    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: {
        ...rest,
        ...(hashedPassword ? { adminPassword: hashedPassword } : {})
      }
    });

    if (hashedPassword) {
      await prisma.whatsAppAgentUser.updateMany({
        where: { clientId, email: client.contactEmail },
        data: { password: hashedPassword }
      });
    }

    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleClientBlockAction(clientId: string, block: boolean) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    await prisma.whatsAppClient.delete({ where: { id: clientId } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addAgentToClientAction(clientId: string, data: { name: string; email: string; password: string; role: string }) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId }, include: { agents: true } });
    if (!client) return { success: false, error: "Client not found" };
    if (client.agents.length >= client.maxAgents) return { success: false, error: `Seat limit reached. Max ${client.maxAgents} agents allowed.` };
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const agent = await prisma.whatsAppAgentUser.create({
      data: {
        clientId,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role
      }
    });
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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
    const isOwner = await isOwnerAuthenticated();
    const authUser = await getAuthenticatedUser();
    if (!isOwner && !authUser) {
      return { success: false, error: "Unauthorized access" };
    }

    const effectiveClientId = (!isOwner && authUser?.clientId) ? authUser.clientId : clientId;

    const client = effectiveClientId
      ? await prisma.whatsAppClient.findUnique({ where: { id: effectiveClientId } })
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
      webhookUrl: client.customWebhookUrl || `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://whatsapp.esponsports.com"}/api/whatsapp/webhook/${client.webhookClientId}`,
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
    const isOwner = await isOwnerAuthenticated();
    const authUser = await getAuthenticatedUser();
    if (!isOwner && (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "OWNER"))) {
      return { success: false, error: "Unauthorized access" };
    }

    const effectiveClientId = (!isOwner && authUser?.clientId) ? authUser.clientId : data.clientId;
    const { clientId, ...rest } = data;
    let client: any;
    if (effectiveClientId) {
      client = await prisma.whatsAppClient.update({ where: { id: effectiveClientId }, data: rest });
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    if (!client.wabaId || !client.metaAccessToken) return { success: false, error: "Client is missing WABA ID or Access Token. Update them first." };
    
    const result = await registerMetaWebhook(client.wabaId, client.metaAccessToken, client.webhookClientId);
    
    if (result.success) {
      const verifyToken = `wm_${client.webhookClientId.slice(0, 8)}`;
      await prisma.whatsAppClient.update({ where: { id: clientId }, data: { webhookVerifyToken: verifyToken } });
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://whatsapp.esponsports.com";
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
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

// -------------------------------------------------------------
// 1. Meta WABA & Webhook Health Live Diagnostics
// -------------------------------------------------------------
export async function checkClientMetaHealthAction(clientId: string) {
  try {
    const isOwner = await isOwnerAuthenticated();
    const authUser = await getAuthenticatedUser();
    if (!isOwner && !authUser) {
      return { success: false, error: "Unauthorized access" };
    }

    const effectiveClientId = (!isOwner && authUser?.clientId) ? authUser.clientId : clientId;
    const client = await prisma.whatsAppClient.findUnique({ where: { id: effectiveClientId } });
    if (!client) return { success: false, error: "Client not found" };

    if (!client.metaAccessToken || !client.phoneId) {
      return {
        success: true,
        configured: false,
        status: "NOT_CONFIGURED",
        message: "WABA Phone ID or Permanent Access Token is missing.",
        client
      };
    }

    const start = Date.now();
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${client.phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier`,
      {
        headers: { Authorization: `Bearer ${client.metaAccessToken}` },
        cache: "no-store"
      }
    );
    const latency = Date.now() - start;
    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      return {
        success: true,
        configured: true,
        isValidToken: false,
        status: "TOKEN_INVALID",
        error: metaData.error?.message || "Invalid or expired Meta Access Token",
        errorCode: metaData.error?.code,
        latencyMs: latency,
        client
      };
    }

    // Also check WABA info if WABA ID is available
    let wabaName = "";
    if (client.wabaId) {
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/v21.0/${client.wabaId}?fields=name,timezone_id,currency`,
          { headers: { Authorization: `Bearer ${client.metaAccessToken}` }, cache: "no-store" }
        );
        const wabaData = await wabaRes.json();
        if (wabaData.name) wabaName = wabaData.name;
      } catch {}
    }

    return {
      success: true,
      configured: true,
      isValidToken: true,
      status: "HEALTHY",
      displayPhoneNumber: metaData.display_phone_number || client.phoneNumber || "Verified",
      verifiedName: metaData.verified_name || client.businessName,
      wabaName,
      qualityRating: metaData.quality_rating || "GREEN",
      codeVerificationStatus: metaData.code_verification_status || "VERIFIED",
      messagingLimitTier: metaData.messaging_limit_tier || "TIER_1K",
      latencyMs: latency,
      webhookVerified: !!client.webhookVerifyToken,
      client
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// 2. Message & AI Quotas Management
// -------------------------------------------------------------
export async function updateClientQuotasAction(clientId: string, data: {
  monthlyMessageQuota?: number;
  monthlyAiQuota?: number;
  resetCounts?: boolean;
}) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const updateData: any = {};
    if (data.monthlyMessageQuota !== undefined) updateData.monthlyMessageQuota = Number(data.monthlyMessageQuota);
    if (data.monthlyAiQuota !== undefined) updateData.monthlyAiQuota = Number(data.monthlyAiQuota);
    if (data.resetCounts) {
      updateData.messagesUsedCount = 0;
      updateData.aiRepliesUsedCount = 0;
    }

    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: updateData
    });
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function topUpClientQuotaAction(clientId: string, data: {
  addMessages?: number;
  addAiReplies?: number;
  resetCounter?: boolean;
}) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };

    const updateData: any = {};
    if (data.addMessages) {
      updateData.monthlyMessageQuota = (client.monthlyMessageQuota || 5000) + Number(data.addMessages);
    }
    if (data.addAiReplies) {
      updateData.monthlyAiQuota = (client.monthlyAiQuota || 500) + Number(data.addAiReplies);
    }
    if (data.resetCounter) {
      updateData.messagesUsedCount = 0;
      updateData.aiRepliesUsedCount = 0;
    }

    const updated = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: updateData
    });
    return { success: true, client: updated };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// 2b. SaaS Telemetry & Real-Time Usage Intelligence
// -------------------------------------------------------------
export async function getOwnerTelemetryStatsAction() {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    const clients = await prisma.whatsAppClient.findMany({
      select: {
        id: true,
        businessName: true,
        contactEmail: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        monthlyMessageQuota: true,
        monthlyAiQuota: true,
        messagesUsedCount: true,
        aiRepliesUsedCount: true,
        wabaId: true,
        phoneId: true,
        metaAccessToken: true,
        webhookClientId: true,
        createdAt: true,
      },
      orderBy: { messagesUsedCount: "desc" }
    });

    const totalMessagesUsed = clients.reduce((acc, c) => acc + (c.messagesUsedCount || 0), 0);
    const totalAiRepliesUsed = clients.reduce((acc, c) => acc + (c.aiRepliesUsedCount || 0), 0);
    const totalMessagesAllotted = clients.reduce((acc, c) => acc + (c.monthlyMessageQuota || 5000), 0);
    const totalAiAllotted = clients.reduce((acc, c) => acc + (c.monthlyAiQuota || 500), 0);

    const messageUtilizationPct = totalMessagesAllotted > 0 
      ? Math.min(100, Math.round((totalMessagesUsed / totalMessagesAllotted) * 100))
      : 0;

    const aiUtilizationPct = totalAiAllotted > 0
      ? Math.min(100, Math.round((totalAiRepliesUsed / totalAiAllotted) * 100))
      : 0;

    // Detect tenants with high quota utilization (>75% warning, >90% critical)
    const exhaustionAlerts: any[] = [];
    clients.forEach(c => {
      const msgQuota = c.monthlyMessageQuota || 5000;
      const aiQuota = c.monthlyAiQuota || 500;
      const msgPct = Math.round(((c.messagesUsedCount || 0) / msgQuota) * 100);
      const aiPct = Math.round(((c.aiRepliesUsedCount || 0) / aiQuota) * 100);

      const maxPct = Math.max(msgPct, aiPct);
      if (maxPct >= 75) {
        exhaustionAlerts.push({
          clientId: c.id,
          businessName: c.businessName,
          contactEmail: c.contactEmail,
          plan: c.subscriptionPlan,
          msgPct,
          aiPct,
          maxPct,
          severity: maxPct >= 90 ? "CRITICAL" : "WARNING",
          messagesUsed: c.messagesUsedCount || 0,
          messagesQuota: msgQuota,
          aiUsed: c.aiRepliesUsedCount || 0,
          aiQuota: aiQuota,
        });
      }
    });

    return {
      success: true,
      telemetry: {
        totalMessagesUsed,
        totalAiRepliesUsed,
        totalMessagesAllotted,
        totalAiAllotted,
        messageUtilizationPct,
        aiUtilizationPct,
        activeTenantsCount: clients.filter(c => c.subscriptionStatus === "ACTIVE").length,
        totalTenantsCount: clients.length,
        exhaustionAlerts: exhaustionAlerts.sort((a, b) => b.maxPct - a.maxPct),
        topConsumers: clients.slice(0, 6)
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// 2c. Meta Cloud API Sentinel & Auto-Healer Actions
// -------------------------------------------------------------
export async function checkAllClientsMetaHealthAction() {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    const clients = await prisma.whatsAppClient.findMany({
      select: {
        id: true,
        businessName: true,
        contactEmail: true,
        wabaId: true,
        phoneId: true,
        metaAccessToken: true,
        webhookClientId: true,
        webhookVerifyToken: true,
        phoneNumber: true
      }
    });

    const results = await Promise.all(
      clients.map(async (client) => {
        if (!client.metaAccessToken || !client.phoneId) {
          return {
            clientId: client.id,
            businessName: client.businessName,
            status: "NOT_CONFIGURED",
            message: "Missing token or phone ID",
            qualityRating: "UNKNOWN",
            isSubscribed: false,
          };
        }

        try {
          const res = await fetch(
            `https://graph.facebook.com/v21.0/${client.phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
            {
              headers: { Authorization: `Bearer ${client.metaAccessToken}` },
              cache: "no-store"
            }
          );
          const data = await res.json();
          if (!res.ok || data.error) {
            return {
              clientId: client.id,
              businessName: client.businessName,
              status: "TOKEN_INVALID",
              message: data.error?.message || "Invalid or expired token",
              qualityRating: "UNKNOWN",
              isSubscribed: false,
            };
          }

          // Check webhook subscription if WABA ID is provided
          let isSubscribed = true;
          if (client.wabaId) {
            try {
              const subRes = await fetch(
                `https://graph.facebook.com/v21.0/${client.wabaId}/subscribed_apps`,
                { headers: { Authorization: `Bearer ${client.metaAccessToken}` }, cache: "no-store" }
              );
              const subData = await subRes.json();
              isSubscribed = Array.isArray(subData.data) && subData.data.length > 0;
            } catch {
              isSubscribed = false;
            }
          }

          return {
            clientId: client.id,
            businessName: client.businessName,
            status: isSubscribed ? "HEALTHY" : "WEBHOOK_DEGRADED",
            message: isSubscribed ? "Active & Webhooks Subscribed" : "Token valid, but Webhook not subscribed to Meta",
            qualityRating: data.quality_rating || "GREEN",
            displayPhone: data.display_phone_number || client.phoneNumber,
            isSubscribed,
          };
        } catch (err: any) {
          return {
            clientId: client.id,
            businessName: client.businessName,
            status: "ERROR",
            message: err.message,
            qualityRating: "UNKNOWN",
            isSubscribed: false,
          };
        }
      })
    );

    return { success: true, results };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function repairClientMetaWebhookAction(clientId: string) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };
    if (!client.wabaId || !client.metaAccessToken) {
      return { success: false, error: "Client does not have WABA ID or Access Token configured" };
    }

    const res = await registerMetaWebhook(client.wabaId, client.metaAccessToken, client.webhookClientId);
    if (res.success) {
      return { success: true, message: `Successfully re-subscribed ${client.businessName} WABA to Meta Graph Webhooks.` };
    } else {
      return { success: false, error: res.error || "Meta Graph subscription failed" };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function repairAllWebhooksAction() {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    const clients = await prisma.whatsAppClient.findMany({
      where: {
        metaAccessToken: { not: null },
        wabaId: { not: null }
      }
    });

    const outcomes: { clientId: string; businessName: string; success: boolean; error?: string }[] = [];

    for (const client of clients) {
      if (client.wabaId && client.metaAccessToken) {
        const res = await registerMetaWebhook(client.wabaId, client.metaAccessToken, client.webhookClientId);
        outcomes.push({
          clientId: client.id,
          businessName: client.businessName,
          success: res.success,
          error: res.error
        });
      }
    }

    const successCount = outcomes.filter(o => o.success).length;
    return { success: true, total: outcomes.length, successCount, outcomes };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// 3. Global In-App Announcements (CRUD with Scheduling)
// -------------------------------------------------------------
export async function getAnnouncementsAction() {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required", announcements: [] };
    }
    const announcements = await prisma.whatsAppAnnouncement.findMany({
      orderBy: { createdAt: "desc" }
    });
    return { success: true, announcements };
  } catch (e: any) {
    return { success: false, error: e.message, announcements: [] };
  }
}

export async function getActiveAnnouncementsAction(targetPlan?: string) {
  try {
    const now = new Date();
    const whereClause: any = {
      isActive: true,
      AND: [
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } }
          ]
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } }
          ]
        }
      ]
    };

    if (targetPlan && targetPlan !== "ALL") {
      whereClause.AND.push({
        OR: [
          { targetPlan: null },
          { targetPlan: "ALL" },
          { targetPlan: targetPlan }
        ]
      });
    }

    const announcements = await prisma.whatsAppAnnouncement.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });
    return { success: true, announcements };
  } catch (e: any) {
    return { success: false, error: e.message, announcements: [] };
  }
}

export async function createAnnouncementAction(data: {
  title: string;
  message: string;
  type: string; // INFO, WARNING, MAINTENANCE, SUCCESS
  targetPlan?: string;
  startsAt?: string;
  expiresAt?: string;
}) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const announcement = await prisma.whatsAppAnnouncement.create({
      data: {
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type || "INFO",
        targetPlan: data.targetPlan || "ALL",
        isActive: true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      }
    });
    return { success: true, announcement };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateAnnouncementAction(id: string, data: {
  title?: string;
  message?: string;
  type?: string;
  targetPlan?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.message !== undefined) updateData.message = data.message.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.targetPlan !== undefined) updateData.targetPlan = data.targetPlan;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const announcement = await prisma.whatsAppAnnouncement.update({
      where: { id },
      data: updateData
    });
    return { success: true, announcement };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleAnnouncementAction(id: string, isActive: boolean) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const announcement = await prisma.whatsAppAnnouncement.update({
      where: { id },
      data: { isActive }
    });
    return { success: true, announcement };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteAnnouncementAction(id: string) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    await prisma.whatsAppAnnouncement.delete({ where: { id } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// 4. First-Login Password Change Action
// -------------------------------------------------------------
export async function changeUserPasswordAction(email: string, newPassword: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await getAuthenticatedUser();
    const isOwner = await isOwnerAuthenticated();

    // Verify caller is either changing their own password or is an authenticated owner
    if (!isOwner && (!user || user.email.toLowerCase() !== cleanEmail)) {
      return { success: false, error: "Unauthorized: You can only change your own password" };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: "Password must be at least 4 characters long" };
    }

    const cleanPass = newPassword.trim();
    const hashedPassword = await bcrypt.hash(cleanPass, 10);

    const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: cleanEmail } });
    const legacyUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!agent && !legacyUser) {
      return { success: false, error: "User account not found" };
    }

    if (agent) {
      await prisma.whatsAppAgentUser.update({
        where: { email: cleanEmail },
        data: {
          password: hashedPassword,
          mustChangePassword: false
        }
      });

      // If this user is an admin of a client, also update client adminPassword
      if (agent.role === "ADMIN" && agent.clientId) {
        await prisma.whatsAppClient.update({
          where: { id: agent.clientId },
          data: { adminPassword: hashedPassword }
        }).catch(() => {});
      }
    }

    if (legacyUser) {
      await prisma.user.update({
        where: { email: cleanEmail },
        data: { password: hashedPassword }
      }).catch(() => {});
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Super-Admin: Update enabled feature modules for a specific tenant client
 */
export async function updateClientModulesAction(clientId: string, modules: ModuleKey[], customLimits?: any) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: {
        enabledModules: JSON.stringify(modules),
        customLimitsJson: customLimits ? JSON.stringify(customLimits) : null,
      }
    });
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Super-Admin: Upgrade / Switch client to a specific plan tier
 */
export async function updateClientPlanTierAction(clientId: string, planId: string) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }
    const plan = DEFAULT_PLAN_TIERS.find(p => p.id === planId);
    if (!plan) return { success: false, error: "Plan not found" };

    const client = await prisma.whatsAppClient.update({
      where: { id: clientId },
      data: {
        subscriptionPlan: plan.id,
        monthlyFee: plan.monthlyFee,
        monthlyMessageQuota: plan.monthlyMessageQuota,
        monthlyAiQuota: plan.monthlyAiQuota,
        maxAgents: plan.maxAgents,
        enabledModules: JSON.stringify(plan.modules),
      }
    });
    return { success: true, client };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

