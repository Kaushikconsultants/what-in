import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processWebhookPayload } from "../route";

// GET Endpoint - Tenant-Specific Webhook Verification Challenge from Meta WhatsApp API
export async function GET(req: NextRequest, { params }: { params: any }) {
  const resolvedParams = await Promise.resolve(params);
  const clientId = resolvedParams?.clientId?.trim();
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token")?.trim();
  const challenge = searchParams.get("hub.challenge");

  try {
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId parameter" }, { status: 400 });
    }

    const client = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [
          { webhookClientId: clientId },
          { id: clientId }
        ]
      }
    });

    if (!client) {
      console.warn(`[Tenant Webhook GET] Client not found for clientId: "${clientId}"`);
      return NextResponse.json({ error: "Client tenant not found" }, { status: 404 });
    }

    const brandSlug = (client.businessName || "client").toLowerCase().replace(/[^a-z0-9]/g, '_');
    const clientVerifyToken = `wm_${client.webhookClientId.slice(0, 8)}`;
    const brandToken = `${brandSlug}_whatsapp_secure_webhook_token_2026`;
    const brandTokenShort = `wm_${brandSlug}_token_2026`;

    const allowedTokens = [
      client.webhookVerifyToken?.trim(),
      clientVerifyToken,
      brandToken,
      brandTokenShort,
      client.webhookClientId?.trim(),
      client.id,
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim(),
      "whatin_whatsapp_secure_webhook_token_2026",
      "espon_whatsapp_secure_webhook_token_2026"
    ].filter(Boolean) as string[];

    console.log(`[Tenant Webhook GET] Incoming challenge for client "${client.businessName}". Token provided: "${token}"`);

    if (mode === "subscribe" && token && allowedTokens.some(t => t.toLowerCase() === token.toLowerCase())) {
      console.log(`[Tenant Webhook GET] Verification SUCCESS for client ${client.businessName} (${client.id})! Returning challenge.`);
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    console.warn(`[Tenant Webhook GET] Verification FAILED for client "${client.businessName}". Token "${token}" not in allowed:`, allowedTokens);
    return NextResponse.json({ error: "Forbidden - Invalid client verify token" }, { status: 403 });
  } catch (e: any) {
    console.error("[Tenant Webhook GET Error]:", e);
    return NextResponse.json({ error: "Server error", details: e.message }, { status: 500 });
  }
}

// POST Endpoint - Tenant-Specific Incoming Messages & Events
export async function POST(req: NextRequest, { params }: { params: any }) {
  const resolvedParams = await Promise.resolve(params);
  const clientId = resolvedParams?.clientId;

  try {
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId parameter" }, { status: 400 });
    }

    const client = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [
          { webhookClientId: clientId },
          { id: clientId }
        ]
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Client tenant not found" }, { status: 404 });
    }

    if (client.subscriptionStatus === "BLOCKED" || client.isActive === false) {
      return NextResponse.json({ status: "ignored", reason: "client_blocked" });
    }

    const body = await req.json();
    const result = await processWebhookPayload(body, client.id);

    return NextResponse.json({ status: "received", clientId: client.id, result });
  } catch (e: any) {
    console.error("[Tenant Webhook POST Error]:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
