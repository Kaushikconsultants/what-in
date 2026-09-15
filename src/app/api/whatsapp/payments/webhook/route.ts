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

// GET Endpoint - Webhook Health & Info Check
export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "/api/whatsapp/payments/webhook",
    supportedGateways: ["RAZORPAY", "CASHFREE", "MANUAL_UPI"],
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

// POST Endpoint - Universal Ingestion for Razorpay & Cashfree Events
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let body: any = {};

  try {
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
        error: "Invalid JSON body"
      });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const razorpaySig = req.headers.get("x-razorpay-signature");
    const cashfreeSig = req.headers.get("x-webhook-signature");
    const cashfreeTimestamp = req.headers.get("x-webhook-timestamp");

    const settings = await prisma.whatsAppSettings.findFirst();

    // ══════════════════════════════════════════════════════
    // A. RAZORPAY EVENT HANDLING
    // ══════════════════════════════════════════════════════
    if (razorpaySig || body.event?.startsWith("payment") || body.event?.startsWith("order")) {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || settings?.razorpayKeySecret;
      if (webhookSecret && razorpaySig) {
        const isValid = verifyRazorpaySignature(rawBody, razorpaySig, webhookSecret);
        if (!isValid) {
          console.warn("[Payment Webhook] Razorpay signature verification failed");
          await logPaymentWebhookEvent({
            provider: "RAZORPAY",
            eventType: body.event || "UNKNOWN",
            status: "FAILED",
            httpStatus: 401,
            latencyMs: Date.now() - startTime,
            payload: body,
            error: "Unauthorized: Invalid Razorpay signature"
          });
          return NextResponse.json({ error: "Unauthorized: Invalid Razorpay signature" }, { status: 401 });
        }
      }

      const eventType = body.event;
      console.log(`[Payment Webhook] Received Razorpay event: ${eventType}`);

      if (eventType === "payment_link.paid" || eventType === "payment.captured" || eventType === "order.paid") {
        const plink = body.payload?.payment_link?.entity || {};
        const payment = body.payload?.payment?.entity || {};

        const shortUrl = plink.short_url || "";
        const plinkId = plink.id || "";
        const txnId = payment.id || plinkId || `RZP_${Date.now()}`;
        const amount = payment.amount ? payment.amount / 100 : (plink.amount ? plink.amount / 100 : 0);
        const description = plink.description || "Order / Invoice Payment";

        // Find matching payment link in database
        const paymentLink = await prisma.whatsAppPaymentLink.findFirst({
          where: {
            OR: [
              ...(shortUrl ? [{ paymentUrl: { contains: shortUrl } }] : []),
              ...(plinkId ? [{ paymentUrl: { contains: plinkId } }] : []),
              ...(plinkId ? [{ orderId: plinkId }] : []),
              { transactionId: txnId }
            ]
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
            
            const receiptMsg = `Payment Received & Verified\n\nHi ${customerName}, your payment of *₹${amountFormatted}* for ${description} has been confirmed.\n\nPayment Reference: ${txnId}\nDate: ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}\n\nThank you for doing business with us.`;

            await sendWhatsAppMessageAction({
              conversationId: paymentLink.conversationId,
              senderType: "SYSTEM",
              senderName: "Razorpay Gateway",
              messageType: "TEXT",
              content: receiptMsg
            }).catch(e => console.error("Failed to send payment receipt message:", e));

            emitInboxEvent({
              type: "CONVERSATION_UPDATE",
              conversationId: paymentLink.conversationId,
              clientId: paymentLink.clientId || null
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
            clientId: paymentLink.clientId || undefined
          });

          return NextResponse.json({ success: true, processed: true, gateway: "RAZORPAY", paymentLinkId: paymentLink.id });
        } else {
          console.warn(`[Payment Webhook] Razorpay payment received (${txnId}) but no matching payment link found in DB`);
          await logPaymentWebhookEvent({
            provider: "RAZORPAY",
            eventType,
            status: "IGNORED",
            httpStatus: 200,
            latencyMs: Date.now() - startTime,
            payload: body,
            error: "No matching payment link record in database"
          });
          return NextResponse.json({ success: true, processed: false, reason: "No matching payment link record" });
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // B. CASHFREE EVENT HANDLING
    // ══════════════════════════════════════════════════════
    if (cashfreeSig || body.type === "PAYMENT_SUCCESS_WEBHOOK" || body.type === "ORDER_PAID") {
      const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || settings?.cashfreeSecretKey;
      if (webhookSecret && cashfreeSig) {
        const isValid = verifyCashfreeSignature(rawBody, cashfreeSig, cashfreeTimestamp, webhookSecret);
        if (!isValid) {
          console.warn("[Payment Webhook] Cashfree signature verification failed");
          await logPaymentWebhookEvent({
            provider: "CASHFREE",
            eventType: body.type || "UNKNOWN",
            status: "FAILED",
            httpStatus: 401,
            latencyMs: Date.now() - startTime,
            payload: body,
            error: "Unauthorized: Invalid Cashfree signature"
          });
          return NextResponse.json({ error: "Unauthorized: Invalid Cashfree signature" }, { status: 401 });
        }
      }

      const eventType = body.type;
      console.log(`[Payment Webhook] Received Cashfree event: ${eventType}`);

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
          ]
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
          
          const receiptMsg = `Payment Received & Verified\n\nHi ${customerName}, your payment of *₹${amountFormatted}* has been confirmed.\n\nPayment Reference: ${txnId}\nDate: ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}\n\nThank you for shopping with us.`;

          await sendWhatsAppMessageAction({
            conversationId: paymentLink.conversationId,
            senderType: "SYSTEM",
            senderName: "Cashfree Gateway",
            messageType: "TEXT",
            content: receiptMsg
          }).catch(e => console.error("Failed to send Cashfree receipt message:", e));

          emitInboxEvent({
            type: "CONVERSATION_UPDATE",
            conversationId: paymentLink.conversationId,
            clientId: paymentLink.clientId || null
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
          clientId: paymentLink.clientId || undefined
        });

        return NextResponse.json({ success: true, processed: true, gateway: "CASHFREE", paymentLinkId: paymentLink.id });
      } else {
        await logPaymentWebhookEvent({
          provider: "CASHFREE",
          eventType,
          status: "IGNORED",
          httpStatus: 200,
          latencyMs: Date.now() - startTime,
          payload: body,
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
      error: "Unrecognized event type"
    });

    return NextResponse.json({ success: true, message: "Ignored unrecognized event" });
  } catch (error: any) {
    console.error("[Payment Webhook Fatal Error]:", error);
    await logPaymentWebhookEvent({
      provider: "UNKNOWN",
      eventType: "ERROR",
      status: "FAILED",
      httpStatus: 500,
      latencyMs: Date.now() - startTime,
      payload: body,
      error: error.message
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
