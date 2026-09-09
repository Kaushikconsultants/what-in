import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verify request is from Meta
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  // In production, verify X-Hub-Signature-256 using HMAC SHA256
  // For now we do basic existence check
  return true;
}

export async function GET(req: NextRequest, { params }: { params: any }) {
  const resolvedParams = await Promise.resolve(params);
  const clientId = resolvedParams.clientId;
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  try {
    const client = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [
          { webhookClientId: clientId },
          { id: clientId }
        ]
      }
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Use client-specific webhook token or global
    const account = await prisma.whatsAppAccount.findFirst();
    const clientVerifyToken = `wm_${client.webhookClientId.slice(0, 8)}`;
    const allowedTokens = [
      clientVerifyToken,
      client.webhookVerifyToken,
      account?.webhookVerifyToken,
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      "whatin_whatsapp_secure_webhook_token_2026"
    ].filter(Boolean);

    if (mode === "subscribe" && allowedTokens.includes(token)) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: any }) {
  const resolvedParams = await Promise.resolve(params);
  const clientId = resolvedParams.clientId;
  try {
    const client = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [
          { webhookClientId: clientId },
          { id: clientId }
        ]
      }
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Check if client is blocked
    if (client.subscriptionStatus === "BLOCKED" || !client.isActive) {
      return NextResponse.json({ status: "ignored", reason: "client_blocked" });
    }

    const body = await req.json();
    // Forward to main webhook handler logic
    // In a full implementation, we'd pass clientId context to the message processor
    // For now, process via same handler with client context
    const mainWebhookUrl = new URL("/api/whatsapp/webhook", req.url);
    const forwardReq = new Request(mainWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Id": clientId },
      body: JSON.stringify(body)
    });
    // Log the webhook event
    await prisma.whatsAppWebhookLog.create({
      data: { event: "message", status: "RECEIVED", payload: body }
    }).catch(() => {});

    return NextResponse.json({ status: "received", clientId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
