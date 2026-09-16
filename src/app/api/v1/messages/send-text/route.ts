import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

/**
 * POST /api/v1/messages/send-text
 * Developer API to send direct session text messages (valid within 24-hour service window)
 * Required Scope: "messages:send"
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await validateApiKey(req, "messages:send");

  if (!auth.authenticated || !auth.client) {
    logApiRequest({
      endpoint: "/api/v1/messages/send-text",
      httpMethod: "POST",
      statusCode: auth.statusCode || 401,
      responseTimeMs: Date.now() - startTime,
      errorMessage: auth.error,
    });
    return NextResponse.json(
      { success: false, error: auth.error || "Unauthorized." },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { to, text, senderName = "API Bot" } = body;

    if (!to || !to.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'to'." },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'text'." },
        { status: 400 }
      );
    }

    let cleanPhone = to.toString().replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    // 1. Resolve or create Customer record for client
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { whatsappNumber: cleanPhone },
          { mobile: cleanPhone },
          { mobile: cleanPhone.slice(-10) },
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessName: `Customer ${cleanPhone}`,
          contactPerson: `Visitor +${cleanPhone.slice(-4)}`,
          whatsappNumber: cleanPhone,
          mobile: cleanPhone,
          customerType: "Wholesale",
          leadStage: "Contacted",
        },
      });
    }

    // 2. Resolve or create Conversation
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        customerId: customer.id,
        clientId: auth.client.id,
      },
    });

    if (!conversation) {
      const account = await prisma.whatsAppAccount.findFirst();
      conversation = await prisma.whatsAppConversation.create({
        data: {
          clientId: auth.client.id,
          accountId: account?.id || "default_account",
          customerId: customer.id,
          status: "OPEN",
          unreadCount: 0,
          lastMessageText: text.trim().slice(0, 100),
          lastMessageAt: new Date(),
        },
      });
    }

    // 3. Dispatch text message
    const res = await sendWhatsAppMessageAction({
      conversationId: conversation.id,
      senderType: "AGENT",
      senderName: senderName.trim(),
      messageType: "TEXT",
      content: text.trim(),
    });

    const isSuccess = Boolean(res?.success);
    const statusCode = isSuccess ? 200 : 400;

    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/messages/send-text",
      httpMethod: "POST",
      statusCode,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: JSON.stringify({ to: cleanPhone, text: text.slice(0, 100) }),
      errorMessage: isSuccess ? null : res.error,
    });

    if (isSuccess) {
      return NextResponse.json({
        success: true,
        message: "Message sent successfully.",
        data: res,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: res.error || "Failed to send text message. 24-hour service window may have expired; use /send-template instead.",
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("[API v1 /messages/send-text] Error:", err);
    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/messages/send-text",
      httpMethod: "POST",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
