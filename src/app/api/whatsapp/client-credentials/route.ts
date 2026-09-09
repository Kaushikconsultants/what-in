import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    let clientId: string | undefined;
    const userCookie = req.cookies.get("wm_user")?.value;
    if (userCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userCookie));
        if (parsed?.clientId) clientId = parsed.clientId;
        else if (parsed?.email) {
          const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: parsed.email } });
          if (agent?.clientId) clientId = agent.clientId;
          else {
            const clientByEmail = await prisma.whatsAppClient.findFirst({
              where: {
                OR: [
                  { adminEmail: parsed.email },
                  { contactEmail: parsed.email },
                  { contactPhone: parsed.phone || parsed.email },
                  { ownerWhatsApp: parsed.phone || parsed.email }
                ]
              }
            });
            if (clientByEmail) clientId = clientByEmail.id;
          }
        }
      } catch {}
    }

    if (!clientId) {
      const urlClientId = req.nextUrl.searchParams.get("clientId");
      if (urlClientId) clientId = urlClientId;
    }

    let client = null;
    if (clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
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

    return NextResponse.json({
      wabaId: client.wabaId || "",
      phoneId: client.phoneId || "",
      metaAccessToken: client.metaAccessToken || "",
      webhookVerifyToken: client.webhookVerifyToken || "",
      phoneNumber: client.phoneNumber || "",
      shopifyDomain: client.shopifyDomain || "",
      shopifyToken: client.shopifyToken || "",
      webhookUrl: client.customWebhookUrl || `https://what-in.tinkal.in/api/whatsapp/webhook/${client.webhookClientId || client.id}`,
      isClientBound: true,
      clientId: client.id,
      businessName: client.businessName,
      monthlyMessageQuota: client.monthlyMessageQuota || 5000,
      monthlyAiQuota: client.monthlyAiQuota || 500,
      messagesUsedCount: client.messagesUsedCount || 0,
      aiRepliesUsedCount: client.aiRepliesUsedCount || 0
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wabaId, phoneId, metaAccessToken, webhookVerifyToken, phoneNumber, shopifyDomain, shopifyToken, clientId: bodyClientId } = body;
    
    let clientId = bodyClientId;
    if (!clientId) {
      const userCookie = req.cookies.get("wm_user")?.value;
      if (userCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(userCookie));
          if (parsed?.clientId) clientId = parsed.clientId;
          else if (parsed?.email) {
            const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: parsed.email } });
            if (agent?.clientId) clientId = agent.clientId;
            else {
              const clientByEmail = await prisma.whatsAppClient.findFirst({
                where: {
                  OR: [
                    { adminEmail: parsed.email },
                    { contactEmail: parsed.email },
                    { contactPhone: parsed.phone || parsed.email },
                    { ownerWhatsApp: parsed.phone || parsed.email }
                  ]
                }
              });
              if (clientByEmail) clientId = clientByEmail.id;
            }
          }
        } catch {}
      }
    }

    if (!clientId) {
      return NextResponse.json({ error: "No authenticated client session found." }, { status: 401 });
    }

    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (wabaId !== undefined) updateData.wabaId = wabaId;
    if (phoneId !== undefined) updateData.phoneId = phoneId;
    if (metaAccessToken !== undefined) updateData.metaAccessToken = metaAccessToken;
    if (webhookVerifyToken !== undefined) updateData.webhookVerifyToken = webhookVerifyToken;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (shopifyDomain !== undefined) updateData.shopifyDomain = shopifyDomain;
    if (shopifyToken !== undefined) updateData.shopifyToken = shopifyToken;

    await prisma.whatsAppClient.update({
      where: { id: client.id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

