import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    let clientId: string | undefined;

    if (isOwner) {
      // Owner can view specified client credentials
      clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    } else if (user) {
      // Regular users are strictly bound to their verified session clientId
      if (user.clientId) {
        clientId = user.clientId;
      } else {
        const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: user.email } });
        if (agent?.clientId) clientId = agent.clientId;
      }
    }

    let client = null;
    if (clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    } else if (!isOwner) {
      // Fallback to first client if single-instance
      client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!client) {
      return NextResponse.json({
        wabaId: "",
        phoneId: "",
        metaAccessToken: "",
        webhookVerifyToken: "",
        phoneNumber: "",
        shopifyDomain: "",
        shopifyToken: "",
        webhookUrl: `https://what-in.tinkal.in/api/whatsapp/webhook`,
        isClientBound: false,
        monthlyMessageQuota: 5000,
        monthlyAiQuota: 500,
        messagesUsedCount: 0,
        aiRepliesUsedCount: 0
      });
    }

    const isAdminOrOwner = isOwner || (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "OWNER"));

    const maskSecret = (val: string | null | undefined) => {
      if (!val) return "";
      if (isAdminOrOwner) return val;
      if (val.length <= 8) return "••••••••";
      return val.slice(0, 4) + "••••••••" + val.slice(-4);
    };

    return NextResponse.json({
      wabaId: client.wabaId || "",
      phoneId: client.phoneId || "",
      metaAccessToken: maskSecret(client.metaAccessToken),
      webhookVerifyToken: client.webhookVerifyToken || "",
      phoneNumber: client.phoneNumber || "",
      shopifyDomain: client.shopifyDomain || "",
      shopifyToken: maskSecret(client.shopifyToken),
      webhookUrl: client.customWebhookUrl || `https://what-in.tinkal.in/api/whatsapp/webhook/${client.id}`,
      isClientBound: true,
      clientId: client.id,
      name: client.businessName,
      plan: client.subscriptionPlan,
      monthlyMessageQuota: client.monthlyMessageQuota,
      monthlyAiQuota: client.monthlyAiQuota,
      messagesUsedCount: client.messagesUsedCount,
      aiRepliesUsedCount: client.aiRepliesUsedCount,
      // Payment Gateways
      activeGateway: client.activeGateway || "",
      razorpayKeyId: client.razorpayKeyId || "",
      razorpayKeySecret: maskSecret(client.razorpayKeySecret),
      cashfreeAppId: client.cashfreeAppId || "",
      cashfreeSecretKey: maskSecret(client.cashfreeSecretKey),
      merchantUpiId: client.merchantUpiId || "",
      merchantUpiName: client.merchantUpiName || "",
      // AI Configuration
      geminiApiKey: maskSecret(client.geminiApiKey),
      aiModel: client.aiModel || "gemini-2.5-flash",
      aiSystemPrompt: client.aiSystemPrompt || "",
      welcomeMessage: client.welcomeMessage || "Welcome! How can we help you today?",
      workingHoursStart: client.workingHoursStart || "09:00",
      workingHoursEnd: client.workingHoursEnd || "19:00"
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "OWNER"))) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
    }

    const body = await req.json();
    let targetClientId: string | undefined;

    if (isOwner) {
      targetClientId = body.clientId;
    } else if (user?.clientId) {
      targetClientId = user.clientId;
    }

    let client = null;
    if (targetClientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: targetClientId } });
    } else {
      client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!client) {
      return NextResponse.json({ error: "No client profile found" }, { status: 404 });
    }

    const safeSecret = (newVal: any, existingVal: any) => {
      if (newVal === undefined) return existingVal;
      if (typeof newVal === "string" && newVal.includes("••••")) return existingVal;
      return newVal;
    };

    const updated = await prisma.whatsAppClient.update({
      where: { id: client.id },
      data: {
        wabaId: body.wabaId !== undefined ? body.wabaId : client.wabaId,
        phoneId: body.phoneId !== undefined ? body.phoneId : client.phoneId,
        metaAccessToken: safeSecret(body.metaAccessToken, client.metaAccessToken),
        webhookVerifyToken: safeSecret(body.webhookVerifyToken, client.webhookVerifyToken),
        phoneNumber: body.phoneNumber !== undefined ? body.phoneNumber : client.phoneNumber,
        shopifyDomain: body.shopifyDomain !== undefined ? body.shopifyDomain : client.shopifyDomain,
        shopifyToken: safeSecret(body.shopifyToken, client.shopifyToken),
        customWebhookUrl: body.customWebhookUrl !== undefined ? body.customWebhookUrl : client.customWebhookUrl,
        // Gateways
        activeGateway: body.activeGateway !== undefined ? body.activeGateway : client.activeGateway,
        razorpayKeyId: body.razorpayKeyId !== undefined ? body.razorpayKeyId : client.razorpayKeyId,
        razorpayKeySecret: safeSecret(body.razorpayKeySecret, client.razorpayKeySecret),
        cashfreeAppId: body.cashfreeAppId !== undefined ? body.cashfreeAppId : client.cashfreeAppId,
        cashfreeSecretKey: safeSecret(body.cashfreeSecretKey, client.cashfreeSecretKey),
        merchantUpiId: body.merchantUpiId !== undefined ? body.merchantUpiId : client.merchantUpiId,
        merchantUpiName: body.merchantUpiName !== undefined ? body.merchantUpiName : client.merchantUpiName,
        // AI Configuration
        geminiApiKey: safeSecret(body.geminiApiKey, client.geminiApiKey),
        aiModel: body.aiModel !== undefined ? body.aiModel : client.aiModel,
        aiSystemPrompt: body.aiSystemPrompt !== undefined ? body.aiSystemPrompt : client.aiSystemPrompt,
        welcomeMessage: body.welcomeMessage !== undefined ? body.welcomeMessage : client.welcomeMessage,
        workingHoursStart: body.workingHoursStart !== undefined ? body.workingHoursStart : client.workingHoursStart,
        workingHoursEnd: body.workingHoursEnd !== undefined ? body.workingHoursEnd : client.workingHoursEnd
      }
    });

    return NextResponse.json({ success: true, clientId: updated.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
