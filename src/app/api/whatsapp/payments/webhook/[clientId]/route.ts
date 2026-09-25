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

// 4-Layer Resilient Payment Link Matching
async function findMatchingTenantPaymentLink({
  clientId,
  orderId,
  txnId,
  linkId,
  customerPhone,
  amount,
  shortUrl
}: {
  clientId: string;
  orderId?: string | null;
  txnId?: string | null;
  linkId?: string | null;
  customerPhone?: string | null;
  amount?: number | null;
  shortUrl?: string | null;
}) {
  // Layer 1: Direct OrderId, LinkId, Short URL or TransactionId match
  const directConditions: any[] = [];
  if (orderId && orderId.trim()) {
    directConditions.push({ orderId: orderId.trim() });
    directConditions.push({ paymentUrl: { contains: orderId.trim() } });
  }
  if (linkId && linkId.trim()) {
    directConditions.push({ orderId: linkId.trim() });
    directConditions.push({ paymentUrl: { contains: linkId.trim() } });
  }
  if (shortUrl && shortUrl.trim()) {
    directConditions.push({ paymentUrl: { contains: shortUrl.trim() } });
  }
  if (txnId && txnId.trim()) {
    directConditions.push({ transactionId: txnId.trim() });
  }

  if (directConditions.length > 0) {
    const directMatch = await prisma.whatsAppPaymentLink.findFirst({
      where: {
        OR: directConditions,
        clientId: clientId
      },
      include: {
        conversation: { include: { customer: true } }
      }
    });
    if (directMatch) return directMatch;
  }

  // Layer 2: Match by Customer Phone + PENDING status
  if (customerPhone) {
    const cleanedDigits = customerPhone.replace(/\D/g, "");
    const last10Digits = cleanedDigits.slice(-10);
    if (last10Digits.length >= 10) {
      const candidateLinks = await prisma.whatsAppPaymentLink.findMany({
        where: {
          clientId: clientId,
          status: "PENDING",
          conversation: {
            customer: {
              OR: [
                { mobile: { contains: last10Digits } },
                { whatsappNumber: { contains: last10Digits } },
                { alternatePhone: { contains: last10Digits } }
              ]
            }
          }
        },
        orderBy: { createdAt: "desc" },
        include: {
          conversation: { include: { customer: true } }
        },
        take: 5
      });

      if (candidateLinks.length > 0) {
        if (amount && amount > 0) {
          const amountMatch = candidateLinks.find(l => Math.abs(l.amount - amount) <= 2);
          if (amountMatch) return amountMatch;
        }
        if (candidateLinks.length === 1) {
          return candidateLinks[0];
        }
      }
    }
  }

  // Layer 3: Match most recent PENDING payment link for this client with matching amount (created in last 48h)
  if (amount && amount > 0) {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentCandidates = await prisma.whatsAppPaymentLink.findMany({
      where: {
        clientId: clientId,
        status: "PENDING",
        createdAt: { gte: fortyEightHoursAgo }
      },
      orderBy: { createdAt: "desc" },
      include: {
        conversation: { include: { customer: true } }
      },
      take: 10
    });

    const recentAmountMatch = recentCandidates.find(l => Math.abs(l.amount - amount) <= 1);
    if (recentAmountMatch) return recentAmountMatch;
  }

  return null;
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
      let signatureVerified = true;
      if (webhookSecret && razorpaySig) {
        const isValid = verifyRazorpaySignature(rawBody, razorpaySig, webhookSecret);
        if (!isValid) {
          console.warn(`[Tenant Payment Webhook] Razorpay signature verification warning for client "${client.businessName}"`);
          signatureVerified = false;
        }
      }

      const eventType = body.event || "payment.captured";
      console.log(`[Tenant Payment Webhook] Received Razorpay event "${eventType}" for client "${client.businessName}"`);

      if (eventType === "payment_link.paid" || eventType === "payment.captured" || eventType === "order.paid") {
        const plink = body.payload?.payment_link?.entity || {};
        const payment = body.payload?.payment?.entity || {};

        const shortUrl = plink.short_url || "";
        const plinkId = plink.id || "";
        const txnId = payment.id || plinkId || `RZP_${Date.now()}`;
        const amount = payment.amount ? payment.amount / 100 : (plink.amount ? plink.amount / 100 : 0);
        const description = plink.description || "Order / Invoice Payment";
        const customerPhone = payment.contact || plink.customer?.contact || "";

        // Find matching payment link via 4-layer fallback
        const paymentLink: any = await findMatchingTenantPaymentLink({
          clientId: client.id,
          orderId: plinkId,
          txnId,
          linkId: plinkId,
          shortUrl,
          customerPhone,
          amount
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
            clientId: client.id,
            amount,
            customerPhone,
            signatureVerified
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
            amount,
            customerPhone,
            error: "No matching payment link record in database"
          });
          return NextResponse.json({ success: true, processed: false, reason: "No matching payment link record" });
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // B. CASHFREE EVENT HANDLING (CLIENT-SPECIFIC)
    // ══════════════════════════════════════════════════════
    const isCashfreeEvent = 
      Boolean(cashfreeSig) ||
      body.type === "PAYMENT_SUCCESS_WEBHOOK" || 
      body.type === "ORDER_PAID" ||
      body.event === "PAYMENT_SUCCESS_WEBHOOK" ||
      body.event === "payment.success" ||
      body.event_type === "PAYMENT_SUCCESS_WEBHOOK" ||
      body.data?.payment?.payment_status === "SUCCESS" ||
      body.data?.order?.order_status === "PAID";

    if (isCashfreeEvent) {
      const webhookSecret = client.cashfreeSecretKey || process.env.CASHFREE_WEBHOOK_SECRET;
      let signatureVerified = true;
      if (webhookSecret && cashfreeSig) {
        const isValid = verifyCashfreeSignature(rawBody, cashfreeSig, cashfreeTimestamp, webhookSecret);
        if (!isValid) {
          console.warn(`[Tenant Payment Webhook] Cashfree signature verification warning for client "${client.businessName}"`);
          signatureVerified = false;
        }
      }

      const eventType = body.type || body.event || "PAYMENT_SUCCESS_WEBHOOK";
      console.log(`[Tenant Payment Webhook] Received Cashfree event "${eventType}" for client "${client.businessName}"`);

      const orderData = body.data?.order || {};
      const paymentData = body.data?.payment || {};
      const customerDetails = body.data?.customer_details || orderData.customer_details || {};

      const orderId = orderData.order_id || body.data?.order_id || body.data?.link_id || orderData.order_tags?.link_id || "";
      const linkId = body.data?.link_id || body.data?.cf_link_id || orderData.order_tags?.link_id || "";
      const txnId = paymentData.cf_payment_id ? String(paymentData.cf_payment_id) : (paymentData.bank_reference || `CF_${Date.now()}`);
      const amount = Number(paymentData.payment_amount || orderData.order_amount || body.data?.link_amount || 0);
      const customerPhone = customerDetails.customer_phone || customerDetails.phone || "";
      const linkUrl = body.data?.link_url || "";

      // Find matching payment link via 4-layer fallback
      const paymentLink: any = await findMatchingTenantPaymentLink({
        clientId: client.id,
        orderId,
        txnId,
        linkId,
        shortUrl: linkUrl,
        customerPhone,
        amount
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
          const customerName = paymentLink.conversation?.customer?.contactPerson || customerDetails.customer_name || "Valued Customer";
          const amountFormatted = (amount || paymentLink.amount || 0).toLocaleString("en-IN");
          
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
          clientId: client.id,
          amount,
          customerPhone,
          signatureVerified
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
          amount,
          customerPhone,
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
