import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";
import { emitInboxEvent } from "@/lib/inboxEvents";
import { logPaymentWebhookEvent } from "@/lib/paymentWebhookLogger";

export const dynamic = "force-dynamic";

// Helper: Verify Razorpay webhook signature
function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Helper: Verify Cashfree webhook signature
function verifyCashfreeSignature(rawBody: string, signature: string | null, timestamp: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const dataToSign = timestamp ? `${timestamp}${rawBody}` : rawBody;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(dataToSign)
      .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// GET Endpoint - Tenant-Specific Payment Webhook Health & Info Check
export async function GET(req: NextRequest, { params }: { params: any }) {
  const resolvedParams = await Promise.resolve(params);
  const clientId = resolvedParams?.clientId?.trim();

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId parameter" }, { status: 400 });
  }

  const client = await prisma.whatsAppClient.findFirst({
    where: {
      OR: [
        { webhookClientId: clientId },
        { id: clientId }
      ]
    },
    select: { id: true, businessName: true, webhookClientId: true, activeGateway: true, merchantUpiId: true }
  });

  if (!client) {
    return NextResponse.json({ error: "Tenant client not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: "active",
    tenant: client.businessName,
    tenantId: client.id,
    webhookClientId: client.webhookClientId,
    activeGateway: client.activeGateway || "NOT_SET",
    merchantUpiId: client.merchantUpiId || "NOT_SET",
    supportedEvents: [
      "payment_link.paid (Razorpay)",
      "payment.captured (Razorpay)",
      "order.paid (Razorpay)",
      "PAYMENT_SUCCESS_WEBHOOK (Cashfree)",
      "ORDER_PAID (Cashfree)"
    ],
    timestamp: new Date().toISOString()
  });
}

// POST Endpoint - Tenant-Specific Ingestion for Razorpay & Cashfree Events
export async function POST(req: NextRequest, { params }: { params: any }) {
  const startTime = Date.now();
  const resolvedParams = await Promise.resolve(params);
  const clientId = resolvedParams?.clientId?.trim();
  let body: any = {};

  try {
    if (!clientId) {
      await logPaymentWebhookEvent({
        provider: "UNKNOWN",
        eventType: "MISSING_CLIENT_ID",
        status: "FAILED",
        httpStatus: 400,
        latencyMs: Date.now() - startTime,
        payload: {},
        error: "Missing clientId parameter"
      });
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
      await logPaymentWebhookEvent({
        provider: "UNKNOWN",
        eventType: "CLIENT_NOT_FOUND",
        status: "FAILED",
        httpStatus: 404,
        latencyMs: Date.now() - startTime,
        payload: { clientId },
        error: "Client tenant not found"
      });
      return NextResponse.json({ error: "Client tenant not found" }, { status: 404 });
    }

    if (client.subscriptionStatus === "BLOCKED" || client.isActive === false) {
      await logPaymentWebhookEvent({
        provider: "UNKNOWN",
        eventType: "CLIENT_BLOCKED",
        status: "IGNORED",
        httpStatus: 200,
        latencyMs: Date.now() - startTime,
        payload: { clientId: client.id },
        clientId: client.id,
        error: "Client subscription is blocked or inactive"
      });
      return NextResponse.json({ status: "ignored", reason: "client_blocked" });
    }

    const rawBody = await req.text();
    try {
      body = JSON.parse(rawBody);
    } catch {
      await logPaymentWebhookEvent({
        provider: "UNKNOWN",
        eventType: "PARSE_ERROR",
        status: "FAILED",
        httpStatus: 400,
        latencyMs: Date.now() - startTime,
        payload: { raw: rawBody },
        clientId: client.id,
        error: "Invalid JSON body"
      });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const razorpaySig = req.headers.get("x-razorpay-signature");
    const cashfreeSig = req.headers.get("x-webhook-signature");
    const cashfreeTimestamp = req.headers.get("x-webhook-timestamp");

    // ══════════════════════════════════════════════════════
    // A. RAZORPAY EVENT HANDLING (CLIENT-SPECIFIC)
    // ══════════════════════════════════════════════════════
    if (razorpaySig || body.event?.startsWith("payment") || body.event?.startsWith("order")) {
      const webhookSecret = client.razorpayKeySecret || process.env.RAZORPAY_WEBHOOK_SECRET;
      if (webhookSecret && razorpaySig) {
        const isValid = verifyRazorpaySignature(rawBody, razorpaySig, webhookSecret);
        if (!isValid) {
          console.warn(`[Tenant Payment Webhook] Razorpay signature verification failed for client "${client.businessName}"`);
          await logPaymentWebhookEvent({
            provider: "RAZORPAY",
            eventType: body.event || "UNKNOWN",
            status: "FAILED",
            httpStatus: 401,
            latencyMs: Date.now() - startTime,
            payload: body,
            clientId: client.id,
            error: "Unauthorized: Invalid Razorpay signature"
          });
          return NextResponse.json({ error: "Unauthorized: Invalid Razorpay signature" }, { status: 401 });
        }
      }

      const eventType = body.event;
      console.log(`[Tenant Payment Webhook] Received Razorpay event "${eventType}" for client "${client.businessName}"`);

      if (eventType === "payment_link.paid" || eventType === "payment.captured" || eventType === "order.paid") {
        const plink = body.payload?.payment_link?.entity || {};
        const payment = body.payload?.payment?.entity || {};

        const shortUrl = plink.short_url || "";
        const plinkId = plink.id || "";
        const txnId = payment.id || plinkId || `RZP_${Date.now()}`;
        const amount = payment.amount ? payment.amount / 100 : (plink.amount ? plink.amount / 100 : 0);
        const description = plink.description || "Order / Invoice Payment";

        // Find matching payment link scoped to this client
        const paymentLink = await prisma.whatsAppPaymentLink.findFirst({
          where: {
            OR: [
              ...(shortUrl ? [{ paymentUrl: { contains: shortUrl } }] : []),
              ...(plinkId ? [{ paymentUrl: { contains: plinkId } }] : []),
              ...(plinkId ? [{ orderId: plinkId }] : []),
              { transactionId: txnId }
            ],
            clientId: client.id
          },
          include: {
            conversation: { include: { customer: true } }
          }
        });

        if (paymentLink) {
          const now = new Date();
          await prisma.whatsAppPaymentLink.update({
            where: { id: paymentLink.id },
            data: {
              status: "PAID",
              transactionId: txnId,
              paidAt: now
            }
          });

          // Send automated WhatsApp confirmation receipt
          if (paymentLink.conversationId) {
            const customerName = paymentLink.conversation?.customer?.contactPerson || "Valued Customer";
            const amountFormatted = (amount || paymentLink.amount || 0).toLocaleString("en-IN");
            
            const receiptMsg = `Payment Received & Verified\n\nHi ${customerName}, your payment of *₹${amountFormatted}* for ${description} has been confirmed.\n\nPayment Reference: ${txnId}\nDate: ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}\n\nThank you for doing business with ${client.businessName}.`;

            await sendWhatsAppMessageAction({
              conversationId: paymentLink.conversationId,
              senderType: "SYSTEM",
              senderName: `${client.businessName} Billing`,
              messageType: "TEXT",
              content: receiptMsg
            }).catch(e => console.error("Failed to send payment receipt message:", e));

            emitInboxEvent({
              type: "CONVERSATION_UPDATE",
              conversationId: paymentLink.conversationId,
              clientId: client.id
            });
          }

          await logPaymentWebhookEvent({
            provider: "RAZORPAY",
            eventType,
            status: "SUCCESS",
            httpStatus: 200,
            latencyMs: Date.now() - startTime,
            payload: body,
            paymentLinkId: paymentLink.id,
            clientId: client.id
          });

          return NextResponse.json({ 
            success: true, 
            processed: true, 
            gateway: "RAZORPAY", 
            clientId: client.id, 
            paymentLinkId: paymentLink.id 
          });
        } else {
          console.warn(`[Tenant Payment Webhook] Razorpay payment received (${txnId}) for "${client.businessName}" but no matching record found`);
          await logPaymentWebhookEvent({
            provider: "RAZORPAY",
            eventType,
            status: "IGNORED",
            httpStatus: 200,
            latencyMs: Date.now() - startTime,
            payload: body,
            clientId: client.id,
            error: "No matching payment link record in database"
          });
          return NextResponse.json({ success: true, processed: false, reason: "No matching payment link record" });
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // B. CASHFREE EVENT HANDLING (CLIENT-SPECIFIC)
    // ══════════════════════════════════════════════════════
    if (cashfreeSig || body.type === "PAYMENT_SUCCESS_WEBHOOK" || body.type === "ORDER_PAID") {
      const webhookSecret = client.cashfreeSecretKey || process.env.CASHFREE_WEBHOOK_SECRET;
      if (webhookSecret && cashfreeSig) {
        const isValid = verifyCashfreeSignature(rawBody, cashfreeSig, cashfreeTimestamp, webhookSecret);
        if (!isValid) {
          console.warn(`[Tenant Payment Webhook] Cashfree signature verification failed for client "${client.businessName}"`);
          await logPaymentWebhookEvent({
            provider: "CASHFREE",
            eventType: body.type || "UNKNOWN",
            status: "FAILED",
            httpStatus: 401,
            latencyMs: Date.now() - startTime,
            payload: body,
            clientId: client.id,
            error: "Unauthorized: Invalid Cashfree signature"
          });
          return NextResponse.json({ error: "Unauthorized: Invalid Cashfree signature" }, { status: 401 });
        }
      }

      const eventType = body.type;
      console.log(`[Tenant Payment Webhook] Received Cashfree event "${eventType}" for client "${client.businessName}"`);

      const orderData = body.data?.order || {};
      const paymentData = body.data?.payment || {};

      const orderId = orderData.order_id || "";
      const txnId = paymentData.cf_payment_id ? String(paymentData.cf_payment_id) : `CF_${Date.now()}`;
      const amount = paymentData.payment_amount || orderData.order_amount || 0;

      const paymentLink = await prisma.whatsAppPaymentLink.findFirst({
        where: {
          OR: [
            ...(orderId ? [{ orderId: orderId }] : []),
            ...(orderId ? [{ paymentUrl: { contains: orderId } }] : []),
            { transactionId: txnId }
          ],
          clientId: client.id
        },
        include: {
          conversation: { include: { customer: true } }
        }
      });

      if (paymentLink) {
        const now = new Date();
        await prisma.whatsAppPaymentLink.update({
          where: { id: paymentLink.id },
          data: {
            status: "PAID",
            transactionId: txnId,
            paidAt: now
          }
        });

        if (paymentLink.conversationId) {
          const customerName = paymentLink.conversation?.customer?.contactPerson || "Valued Customer";
          const amountFormatted = Number(amount).toLocaleString("en-IN");
          
          const receiptMsg = `Payment Received & Verified\n\nHi ${customerName}, your payment of *₹${amountFormatted}* has been confirmed.\n\nPayment Reference: ${txnId}\nDate: ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}\n\nThank you for shopping with ${client.businessName}.`;

          await sendWhatsAppMessageAction({
            conversationId: paymentLink.conversationId,
            senderType: "SYSTEM",
            senderName: `${client.businessName} Billing`,
            messageType: "TEXT",
            content: receiptMsg
          }).catch(e => console.error("Failed to send Cashfree receipt message:", e));

          emitInboxEvent({
            type: "CONVERSATION_UPDATE",
            conversationId: paymentLink.conversationId,
            clientId: client.id
          });
        }

        await logPaymentWebhookEvent({
          provider: "CASHFREE",
          eventType,
          status: "SUCCESS",
          httpStatus: 200,
          latencyMs: Date.now() - startTime,
          payload: body,
          paymentLinkId: paymentLink.id,
          clientId: client.id
        });

        return NextResponse.json({ 
          success: true, 
          processed: true, 
          gateway: "CASHFREE", 
          clientId: client.id, 
          paymentLinkId: paymentLink.id 
        });
      } else {
        await logPaymentWebhookEvent({
          provider: "CASHFREE",
          eventType,
          status: "IGNORED",
          httpStatus: 200,
          latencyMs: Date.now() - startTime,
          payload: body,
          clientId: client.id,
          error: "No matching payment link record in database"
        });
        return NextResponse.json({ success: true, processed: false, reason: "No matching payment link record" });
      }
    }

    await logPaymentWebhookEvent({
      provider: "UNKNOWN",
      eventType: body.event || body.type || "UNKNOWN",
      status: "IGNORED",
      httpStatus: 200,
      latencyMs: Date.now() - startTime,
      payload: body,
      clientId: client.id,
      error: "Unrecognized event type"
    });

    return NextResponse.json({ success: true, message: "Ignored unrecognized event" });
  } catch (error: any) {
    console.error("[Tenant Payment Webhook Fatal Error]:", error);
    await logPaymentWebhookEvent({
      provider: "UNKNOWN",
      eventType: "ERROR",
      status: "FAILED",
      httpStatus: 500,
      latencyMs: Date.now() - startTime,
      payload: body,
      clientId: clientId || undefined,
      error: error.message
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
