import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

export async function POST(req: NextRequest) {
  try {
    const topic = req.headers.get("x-shopify-topic") || "unknown";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";
    const rawBody = await req.text();

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = {};
    }

    // Log the incoming webhook
    await prisma.shopifyWebhookLog.create({
      data: {
        topic,
        shopDomain,
        payload,
        status: "PROCESSED"
      }
    }).catch(err => console.error("Non-fatal: Failed to create ShopifyWebhookLog", err));

    // Handle 1: ORDERS / CREATE
    if (topic === "orders/create") {
      const rawPhone = payload.customer?.phone || payload.shipping_address?.phone || payload.billing_address?.phone || payload.phone || "";
      const digits = rawPhone.replace(/\D/g, "");
      const cleanPhone = digits.length === 10 ? `91${digits}` : digits;

      if (cleanPhone && cleanPhone.length >= 10) {
        const orderNumber = payload.name || `#${payload.order_number}`;
        const totalAmount = parseFloat(payload.total_price) || 0;
        const customerName = payload.customer ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim() : (payload.shipping_address?.name || 'Customer');
        const items = (payload.line_items || []).map((it: any) => `${it.quantity}x ${it.title}`).join(', ');
        const isCod = (payload.gateway || '').toLowerCase().includes('cod') || (payload.payment_gateway_names || []).some((g: string) => g.toLowerCase().includes('cod')) || payload.financial_status === 'pending';

        // Check customer / conversation
        const last10 = cleanPhone.slice(-10);
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { mobile: { contains: last10 } },
              { whatsappNumber: { contains: last10 } }
            ]
          }
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              contactPerson: customerName,
              mobile: cleanPhone,
              whatsappNumber: cleanPhone,
              leadStage: 'Customer',
              customerType: 'Retailer'
            }
          });
        }

        let account = await prisma.whatsAppAccount.findFirst({ orderBy: { createdAt: 'desc' } });
        let conv = await prisma.whatsAppConversation.findFirst({
          where: { customerId: customer.id }
        });

        if (!conv) {
          conv = await prisma.whatsAppConversation.create({
            data: {
              customerId: customer.id,
              accountId: account?.id,
              status: 'OPEN',
              orderStatus: 'Confirmed'
            }
          });
        }

        // 1. Order Confirmation Flow
        const confirmFlow = await prisma.shopifyAutomationFlow.findUnique({
          where: { flowKey: "ORDER_CONFIRMATION" }
        });

        if (confirmFlow?.isActive) {
          const confirmMsg = `🎉 *Order Confirmed! (${orderNumber})*\n\nHi ${customerName}, thank you for shopping with Espon Sports!\n\n🛍️ *Items:* ${items || 'Your ordered items'}\n💵 *Total Amount:* ₹${totalAmount.toLocaleString('en-IN')}\n📍 *Shipping To:* ${payload.shipping_address?.address1 || ''}, ${payload.shipping_address?.city || ''}\n\nOur dispatch team is packing your gear. We'll send your live courier tracking link as soon as it ships! 🚀`;

          await sendWhatsAppMessageAction({
            conversationId: conv.id,
            senderType: 'AGENT',
            senderName: 'Espon Support',
            messageType: 'TEXT',
            content: confirmMsg
          });

          await prisma.shopifyAutomationFlow.update({
            where: { flowKey: "ORDER_CONFIRMATION" },
            data: { totalTriggered: { increment: 1 } }
          });
        }

        // 2. COD to Prepaid Flow (if COD order)
        if (isCod) {
          const codFlow = await prisma.shopifyAutomationFlow.findUnique({
            where: { flowKey: "COD_TO_PREPAID" }
          });

          if (codFlow?.isActive) {
            const discountPct = codFlow.discountValue || 5;
            const discountVal = Math.round((totalAmount * discountPct) / 100);
            const finalAmount = totalAmount - discountVal;

            const creds = await prisma.whatsAppSettings.findFirst();
            const upiId = creds?.merchantUpiId || '9306817689@kotak811';
            const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Espon&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(`Prepaid Discount for ${orderNumber}`)}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiLink)}`;
            const payWebUrl = `https://whatsapp.esponsports.com/pay?pa=${encodeURIComponent(upiId)}&pn=Espon&am=${finalAmount}&tn=${encodeURIComponent(`Prepaid Discount for ${orderNumber}`)}`;

            const codMsg = `⚡ *Convert to Prepaid & Save ₹${discountVal} (Flat ${discountPct}% OFF)!*\n\nHi ${customerName}, you placed a COD Order *${orderNumber}* for ₹${totalAmount.toLocaleString('en-IN')}.\n\nPay online now via UPI/GPay to get:\n✅ *₹${discountVal} Instant Discount (Pay only ₹${finalAmount.toLocaleString('en-IN')})*\n✅ *Priority Express Dispatch*\n✅ *Contactless Delivery*\n\n🏦 UPI ID: *${upiId}*\n\nScan QR or tap 'Pay Now' below:`;

            await sendWhatsAppMessageAction({
              conversationId: conv.id,
              senderType: 'AGENT',
              senderName: 'Espon Billing',
              messageType: 'PAYMENT_LINK',
              content: codMsg,
              mediaUrl: payWebUrl,
              metadata: JSON.stringify({
                qrImageUrl: qrApiUrl,
                paymentUrl: payWebUrl,
                amount: finalAmount,
                upiId,
                orderNumber,
                isCodToPrepaid: true
              })
            });

            await prisma.shopifyAutomationFlow.update({
              where: { flowKey: "COD_TO_PREPAID" },
              data: { totalTriggered: { increment: 1 } }
            });
          }
        }

        // Mark any abandoned cart as RECOVERED
        const checkoutId = payload.checkout_id ? String(payload.checkout_id) : (payload.checkout_token ? String(payload.checkout_token) : null);
        if (checkoutId) {
          await prisma.shopifyAbandonedCheckout.updateMany({
            where: { checkoutId },
            data: {
              recoveryStatus: 'RECOVERED',
              recoveredAt: new Date()
            }
          });
        }
      }
    }

    // Handle 2: CHECKOUTS / CREATE & UPDATE (Abandoned Carts)
    if (topic === "checkouts/create" || topic === "checkouts/update") {
      const checkoutId = String(payload.id || payload.token);
      const rawPhone = payload.phone || payload.customer?.phone || payload.shipping_address?.phone || payload.billing_address?.phone || "";
      const digits = rawPhone.replace(/\D/g, "");
      const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
      const totalPrice = parseFloat(payload.total_price) || 0;
      const customerName = payload.customer ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim() : (payload.shipping_address?.name || 'Customer');

      const items = (payload.line_items || []).map((it: any) => ({
        id: it.id,
        title: it.title,
        variantTitle: it.variant_title,
        quantity: it.quantity,
        price: parseFloat(it.price) || 0,
        sku: it.sku || '',
        imageUrl: it.image_url || null
      }));

      await prisma.shopifyAbandonedCheckout.upsert({
        where: { checkoutId },
        create: {
          checkoutId,
          checkoutUrl: payload.abandoned_checkout_url || `https://${shopDomain}/checkouts/${payload.token}`,
          customerPhone: cleanPhone || null,
          customerEmail: payload.email || payload.customer?.email || null,
          customerName: customerName || 'Customer',
          totalPrice,
          currency: payload.currency || 'INR',
          lineItemsJson: JSON.stringify(items),
          recoveryStatus: payload.completed_at ? 'RECOVERED' : 'ABANDONED',
          abandonedAt: new Date(payload.created_at || payload.updated_at || Date.now()),
          recoveredAt: payload.completed_at ? new Date(payload.completed_at) : null
        },
        update: {
          totalPrice,
          recoveryStatus: payload.completed_at ? 'RECOVERED' : undefined,
          recoveredAt: payload.completed_at ? new Date(payload.completed_at) : undefined
        }
      });
    }

    // Handle 3: ORDERS / FULFILLED (Dispatch & Live Tracking)
    if (topic === "orders/fulfilled") {
      const rawPhone = payload.customer?.phone || payload.shipping_address?.phone || payload.phone || "";
      const digits = rawPhone.replace(/\D/g, "");
      const cleanPhone = digits.length === 10 ? `91${digits}` : digits;

      if (cleanPhone && cleanPhone.length >= 10) {
        const dispatchFlow = await prisma.shopifyAutomationFlow.findUnique({
          where: { flowKey: "ORDER_DISPATCHED" }
        });

        if (dispatchFlow?.isActive) {
          const last10 = cleanPhone.slice(-10);
          const conv = await prisma.whatsAppConversation.findFirst({
            where: {
              customer: {
                OR: [
                  { mobile: { contains: last10 } },
                  { whatsappNumber: { contains: last10 } }
                ]
              }
            }
          });

          if (conv) {
            const fulfillments = payload.fulfillments || [];
            const f = fulfillments[0] || {};
            const trackingNum = f.tracking_number || f.tracking_numbers?.[0] || 'Available shortly';
            const courier = f.tracking_company || 'Express Logistics';
            const trackingUrl = f.tracking_url || f.tracking_urls?.[0] || null;
            const orderNum = payload.name || `#${payload.order_number}`;

            const trackingMsg = `🚚 *Your Order ${orderNum} is Dispatched!*\n\nHi ${payload.customer?.first_name || 'there'}, your package has been shipped via *${courier}*.\n\n🔢 *AWB / Tracking Number:* ${trackingNum}\n\nTap below to track your delivery in real-time:`;

            await sendWhatsAppMessageAction({
              conversationId: conv.id,
              senderType: 'AGENT',
              senderName: 'Espon Logistics',
              messageType: trackingUrl ? 'PAYMENT_LINK' : 'TEXT',
              content: trackingMsg,
              mediaUrl: trackingUrl || undefined
            });

            await prisma.shopifyAutomationFlow.update({
              where: { flowKey: "ORDER_DISPATCHED" },
              data: { totalTriggered: { increment: 1 } }
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: true, topic });
  } catch (error: any) {
    console.error("Shopify Webhook Handler Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
