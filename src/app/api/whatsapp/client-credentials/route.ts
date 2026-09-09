import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    if (!client) {
      // Fall back to WhatsAppAccount
      const account = await prisma.whatsAppAccount.findFirst();
      return NextResponse.json({
        wabaId: account?.businessAccountId || "",
        phoneId: account?.phoneId || "",
        metaAccessToken: account?.accessToken || "",
        webhookVerifyToken: "",
        phoneNumber: account?.phoneNumber || "",
        shopifyDomain: "",
        shopifyToken: "",
        webhookUrl: `https://what-in.tinkal.in/api/whatsapp/webhook`,
        isClientBound: false,
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
      webhookUrl: `https://what-in.tinkal.in/api/whatsapp/webhook/${client.webhookClientId}`,
      isClientBound: true,
      clientId: client.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wabaId, phoneId, metaAccessToken, webhookVerifyToken, phoneNumber, shopifyDomain, shopifyToken } = body;
    
    // Update WhatsAppClient record
    const client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    if (client) {
      await prisma.whatsAppClient.update({
        where: { id: client.id },
        data: { wabaId, phoneId, metaAccessToken, webhookVerifyToken, phoneNumber, shopifyDomain, shopifyToken }
      });
    }

    // Also sync to legacy WhatsAppAccount for backward compat
    const account = await prisma.whatsAppAccount.findFirst();
    if (account) {
      await prisma.whatsAppAccount.update({
        where: { id: account.id },
        data: { businessAccountId: wabaId || account.businessAccountId, phoneId: phoneId || account.phoneId, accessToken: metaAccessToken || account.accessToken, phoneNumber: phoneNumber || account.phoneNumber }
      });
    } else if (wabaId && phoneId && metaAccessToken) {
      await prisma.whatsAppAccount.create({
        data: { businessAccountId: wabaId, phoneId, accessToken: metaAccessToken, phoneNumber: phoneNumber || "", status: "ACTIVE", displayName: "WhatsApp Business" }
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
