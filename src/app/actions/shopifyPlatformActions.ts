"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendWhatsAppMessageAction } from "./whatsAppPlatformActions";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

// Helper to check authentication
async function requireAuth() {
  const isOwner = await isOwnerAuthenticated();
  const user = await getAuthenticatedUser();
  if (!isOwner && !user) {
    throw new Error("Unauthorized access. Please log in.");
  }
  return { isOwner, user };
}

// Helper to get Shopify credentials from DB or Environment
async function getShopifyCredentials(clientId?: string) {
  if (clientId) {
    const client = await (prisma as any).whatsAppClient.findUnique({ where: { id: clientId } });
    if (client?.shopifyDomain && client?.shopifyToken) {
      const cleanDomain = client.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      return { domain: cleanDomain, token: client.shopifyToken };
    }
  }
  const clientCreds = await (prisma as any).whatsAppClient.findFirst({
    where: { shopifyDomain: { not: null }, shopifyToken: { not: null } }
  });
  if (clientCreds?.shopifyDomain && clientCreds?.shopifyToken) {
    const cleanDomain = clientCreds.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    return { domain: cleanDomain, token: clientCreds.shopifyToken };
  }
  const settings = await prisma.whatsAppSettings.findFirst();
  const company = await prisma.companySettings.findFirst();
  
  const rawDomain = (settings as any)?.shopifyStoreDomain || company?.shopifyStoreDomain || process.env.VITE_SHOPIFY_STORE_URL || 'i2tu0d-jc.myshopify.com';
  const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  const token = (settings as any)?.shopifyAccessToken || company?.shopifyAccessToken || process.env.VITE_SHOPIFY_ACCESS_TOKEN || '';

  return { domain: cleanDomain, token };
}

// ---------------------------------------------------------
// 1. SUMMARY METRICS & STATS
// ---------------------------------------------------------
export async function getShopifySummaryMetricsAction() {
  try {
    await requireAuth();
    const { domain, token } = await getShopifyCredentials();
    const isConfigured = Boolean(domain && token && token.length > 10);

    const abandonedInDb = await prisma.shopifyAbandonedCheckout.findMany({
      orderBy: { abandonedAt: 'desc' },
      take: 100
    });

    const totalAbandonedCount = abandonedInDb.length;
    const totalAbandonedValue = abandonedInDb.reduce((sum, c) => sum + (c.totalPrice || 0), 0);
    const recoveredCount = abandonedInDb.filter(c => c.recoveryStatus === 'RECOVERED').length;
    const recoveredValue = abandonedInDb
      .filter(c => c.recoveryStatus === 'RECOVERED')
      .reduce((sum, c) => sum + (c.totalPrice || 0), 0);
    
    const recoveryRate = totalAbandonedCount > 0 ? Math.round((recoveredCount / totalAbandonedCount) * 100) : 0;
    const nudgedCount = abandonedInDb.filter(c => c.nudgesSentCount > 0).length;

    // Get active flows count
    const activeFlowsCount = await prisma.shopifyAutomationFlow.count({
      where: { isActive: true }
    });

    return {
      success: true,
      isConfigured,
      domain,
      metrics: {
        totalAbandonedCount,
        totalAbandonedValue,
        recoveredCount,
        recoveredValue,
        recoveryRate,
        nudgedCount,
        activeFlowsCount
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 2. GET LIVE SHOPIFY ORDERS
// ---------------------------------------------------------
export async function getShopifyOrdersAction(params?: {
  limit?: number;
  status?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  search?: string;
}) {
  try {
    await requireAuth();
    const { domain, token } = await getShopifyCredentials();
    if (!domain || !token) {
      return { success: false, error: "Shopify store credentials not configured in Settings." };
    }

    const limit = params?.limit || 50;
    let url = `https://${domain}/admin/api/2024-10/orders.json?status=any&limit=${limit}`;

    if (params?.financialStatus && params.financialStatus !== 'all') {
      url += `&financial_status=${params.financialStatus}`;
    }
    if (params?.fulfillmentStatus && params.fulfillmentStatus !== 'all') {
      url += `&fulfillment_status=${params.fulfillmentStatus}`;
    }
    if (params?.search) {
      url += `&name=${encodeURIComponent(params.search)}`;
    }

    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Shopify API returned ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    const rawOrders = data.orders || [];

    // Map and enrich with WhatsApp conversation lookups
    const orders = await Promise.all(rawOrders.map(async (o: any) => {
      const rawPhone = o.customer?.phone || o.shipping_address?.phone || o.billing_address?.phone || o.phone || '';
      const digits = rawPhone.replace(/\D/g, '');
      const cleanPhone = digits.length === 10 ? `91${digits}` : digits;

      // Check if this customer already has a WhatsApp conversation in our app
      let conversationId = null;
      if (cleanPhone) {
        const last10 = cleanPhone.slice(-10);
        const conv = await prisma.whatsAppConversation.findFirst({
          where: {
            customer: {
              OR: [
                { mobile: { contains: last10 } },
                { whatsappNumber: { contains: last10 } }
              ]
            }
          },
          select: { id: true }
        });
        if (conv) conversationId = conv.id;
      }

      // Format line items
      const items = (o.line_items || []).map((it: any) => ({
        id: it.id,
        title: it.title,
        variantTitle: it.variant_title,
        quantity: it.quantity,
        price: parseFloat(it.price) || 0,
        sku: it.sku || ''
      }));

      // Shipping & tracking info
      const fulfillments = o.fulfillments || [];
      const firstFulfillment = fulfillments[0] || null;
      const trackingNumber = firstFulfillment?.tracking_number || firstFulfillment?.tracking_numbers?.[0] || null;
      const trackingCompany = firstFulfillment?.tracking_company || null;
      const trackingUrl = firstFulfillment?.tracking_url || firstFulfillment?.tracking_urls?.[0] || null;

      return {
        id: String(o.id),
        orderNumber: o.name || `#${o.order_number}`,
        createdAt: o.created_at,
        customerName: o.customer ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() : (o.shipping_address?.name || 'Customer'),
        customerEmail: o.customer?.email || o.email || '',
        customerPhone: cleanPhone,
        totalPrice: parseFloat(o.total_price) || 0,
        currency: o.currency || 'INR',
        financialStatus: o.financial_status || 'pending', // paid, pending, authorized, refunded, voided
        fulfillmentStatus: o.fulfillment_status || 'unfulfilled', // fulfilled, unfulfilled, partial
        paymentGateway: (o.payment_gateway_names && o.payment_gateway_names[0]) || (o.gateway || 'COD'),
        isCod: (o.gateway || '').toLowerCase().includes('cod') || (o.payment_gateway_names || []).some((g: string) => g.toLowerCase().includes('cod')) || o.financial_status === 'pending',
        shippingAddress: o.shipping_address ? `${o.shipping_address.address1 || ''}, ${o.shipping_address.city || ''}, ${o.shipping_address.province || ''} ${o.shipping_address.zip || ''}`.trim() : '',
        items,
        trackingNumber,
        trackingCompany,
        trackingUrl,
        conversationId,
        tags: o.tags || ''
      };
    }));

    return { success: true, orders, domain };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 3. GET ABANDONED CHECKOUTS
// ---------------------------------------------------------
export async function getShopifyAbandonedCheckoutsAction(params?: { limit?: number }) {
  try {
    await requireAuth();
    const { domain, token } = await getShopifyCredentials();
    if (!domain || !token) {
      return { success: false, error: "Shopify credentials not configured." };
    }

    const limit = params?.limit || 50;
    const url = `https://${domain}/admin/api/2024-10/checkouts.json?limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Shopify API returned ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    const rawCheckouts = data.checkouts || [];

    // Sync/Upsert with local DB tracking table
    const checkouts = await Promise.all(rawCheckouts.map(async (c: any) => {
      const rawPhone = c.phone || c.customer?.phone || c.shipping_address?.phone || c.billing_address?.phone || '';
      const digits = rawPhone.replace(/\D/g, '');
      const cleanPhone = digits.length === 10 ? `91${digits}` : digits;

      const checkoutId = String(c.id || c.token);
      const customerName = c.customer ? `${c.customer.first_name || ''} ${c.customer.last_name || ''}`.trim() : (c.shipping_address?.name || 'Customer');
      const totalPrice = parseFloat(c.total_price) || 0;

      const items = (c.line_items || []).map((it: any) => ({
        id: it.id,
        title: it.title,
        variantTitle: it.variant_title,
        quantity: it.quantity,
        price: parseFloat(it.price) || 0,
        sku: it.sku || '',
        imageUrl: it.image_url || null
      }));

      // Look up existing DB record to see nudge history
      let dbRecord = await prisma.shopifyAbandonedCheckout.findUnique({
        where: { checkoutId }
      });

      if (!dbRecord) {
        dbRecord = await prisma.shopifyAbandonedCheckout.create({
          data: {
            checkoutId,
            checkoutUrl: c.abandoned_checkout_url || `https://${domain}/checkouts/${c.token}`,
            customerPhone: cleanPhone || null,
            customerEmail: c.email || c.customer?.email || null,
            customerName: customerName || 'Customer',
            totalPrice,
            currency: c.currency || 'INR',
            lineItemsJson: JSON.stringify(items),
            recoveryStatus: c.completed_at ? 'RECOVERED' : 'ABANDONED',
            abandonedAt: new Date(c.created_at || c.updated_at || Date.now())
          }
        });
      } else if (c.completed_at && dbRecord.recoveryStatus !== 'RECOVERED') {
        dbRecord = await prisma.shopifyAbandonedCheckout.update({
          where: { checkoutId },
          data: {
            recoveryStatus: 'RECOVERED',
            recoveredAt: new Date(c.completed_at)
          }
        });
      }

      // Check if conversation exists
      let conversationId = null;
      if (cleanPhone) {
        const last10 = cleanPhone.slice(-10);
        const conv = await prisma.whatsAppConversation.findFirst({
          where: {
            customer: {
              OR: [
                { mobile: { contains: last10 } },
                { whatsappNumber: { contains: last10 } }
              ]
            }
          },
          select: { id: true }
        });
        if (conv) conversationId = conv.id;
      }

      return {
        id: dbRecord.id,
        checkoutId,
        checkoutUrl: dbRecord.checkoutUrl,
        customerName: dbRecord.customerName,
        customerEmail: dbRecord.customerEmail,
        customerPhone: cleanPhone,
        totalPrice: dbRecord.totalPrice,
        currency: dbRecord.currency,
        items,
        recoveryStatus: dbRecord.recoveryStatus,
        nudgesSentCount: dbRecord.nudgesSentCount,
        lastNudgeAt: dbRecord.lastNudgeAt,
        abandonedAt: dbRecord.abandonedAt,
        conversationId
      };
    }));

    return { success: true, checkouts, domain };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 4. SEND 1-CLICK WHATSAPP ABANDONED CART RECOVERY NUDGE
// ---------------------------------------------------------
export async function sendShopifyWhatsAppNudgeAction(data: {
  checkoutId: string;
  phone: string;
  customerName?: string;
  cartValue: number;
  itemsSummary: string;
  checkoutUrl: string;
  discountCode?: string;
}) {
  try {
    await requireAuth();
    const rawPhone = data.phone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: "Valid customer mobile number is required to send WhatsApp nudge." };
    }

    // Find or create customer
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
          businessName: data.customerName || `Customer ${last10}`,
          contactPerson: data.customerName || `Customer ${last10}`,
          mobile: cleanPhone,
          whatsappNumber: cleanPhone,
          leadStage: 'New Lead',
          customerType: 'Retailer',
          tags: 'Abandoned Cart'
        }
      });
    }

    // Find or create conversation
    let account = await prisma.whatsAppAccount.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!account) {
      account = await prisma.whatsAppAccount.create({ data: { name: 'Main Account', phoneNumber: '919876543210' } });
    }
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: { customerId: customer.id }
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          clientId: (customer as any)?.clientId || "8c519684-5a75-45be-b74b-5f9553f7ea32",
          customerId: customer.id,
          accountId: account.id,
          status: 'OPEN',
          leadStatus: 'Cart Recovery',
          tags: 'Abandoned Cart'
        }
      });
    }

    const discountText = data.discountCode 
      ? `🎁 *Special Offer:* Use coupon code *${data.discountCode}* at checkout to get an instant discount!` 
      : `Complete your order today to ensure priority dispatch.`;

    const recoveryMessage = `👋 Hey ${data.customerName || 'there'},\n\nYou left some awesome items in your cart at *Espon Sports*:\n\n🛍️ *Items:* ${data.itemsSummary}\n💰 *Cart Total:* ₹${data.cartValue.toLocaleString('en-IN')}\n\n${discountText}\n\nTap below to complete your order in 1-click:`;

    // Send via standard WhatsApp action with interactive link
    const sendRes = await sendWhatsAppMessageAction({
      conversationId: conversation.id,
      senderType: 'AGENT',
      senderName: 'Cart Recovery Bot',
      messageType: 'PAYMENT_LINK',
      content: recoveryMessage,
      mediaUrl: data.checkoutUrl,
      metadata: JSON.stringify({
        checkoutId: data.checkoutId,
        cartValue: data.cartValue,
        discountCode: data.discountCode,
        isAbandonedRecovery: true
      })
    });

    // Update local abandoned checkout record
    await prisma.shopifyAbandonedCheckout.updateMany({
      where: { checkoutId: data.checkoutId },
      data: {
        recoveryStatus: 'NUDGED',
        nudgesSentCount: { increment: 1 },
        lastNudgeAt: new Date()
      }
    });

    // Track flow stats
    await prisma.shopifyAutomationFlow.updateMany({
      where: { flowKey: 'ABANDONED_CART_DRIP' },
      data: { totalTriggered: { increment: 1 } }
    });

    revalidatePath('/whatsapp/shopify');
    return { success: true, conversationId: conversation.id, sendRes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 5. SEND 1-CLICK ORDER WHATSAPP ACTIONS (CONFIRMATION / COD TO PREPAID / TRACKING)
// ---------------------------------------------------------
export async function sendShopifyOrderWhatsAppAction(data: {
  orderId: string;
  orderNumber: string;
  actionType: 'CONFIRMATION' | 'COD_TO_PREPAID' | 'DISPATCH_TRACKING' | 'DELIVERED';
  phone: string;
  customerName?: string;
  totalAmount: number;
  itemsSummary?: string;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  discountPercentage?: number;
}) {
  try {
    await requireAuth();
    const rawPhone = data.phone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: "Valid customer mobile number required." };
    }

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
          businessName: data.customerName || `Customer ${last10}`,
          contactPerson: data.customerName || `Customer ${last10}`,
          mobile: cleanPhone,
          whatsappNumber: cleanPhone,
          leadStage: 'Customer',
          customerType: 'Retailer'
        }
      });
    }

    let account = await prisma.whatsAppAccount.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!account) {
      account = await prisma.whatsAppAccount.create({ data: { name: 'Main Account', phoneNumber: '919876543210' } });
    }
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: { customerId: customer.id }
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          clientId: (customer as any)?.clientId || "8c519684-5a75-45be-b74b-5f9553f7ea32",
          customerId: customer.id,
          accountId: account.id,
          status: 'OPEN',
          orderStatus: 'Confirmed'
        }
      });
    }

    let messageContent = '';
    let messageType = 'TEXT';
    let mediaUrl: string | undefined = undefined;

    if (data.actionType === 'CONFIRMATION') {
      messageContent = `🎉 *Order Confirmed! (Order ${data.orderNumber})*\n\nHi ${data.customerName || 'there'}, thank you for shopping with Espon Sports!\n\n🛍️ *Items:* ${data.itemsSummary || 'Your selected items'}\n💵 *Total Amount:* ₹${data.totalAmount.toLocaleString('en-IN')}\n\nOur team is preparing your package for express dispatch. We will share your live tracking link as soon as it ships! 🚀`;
    } else if (data.actionType === 'COD_TO_PREPAID') {
      const discountPct = data.discountPercentage || 5;
      const discountVal = Math.round((data.totalAmount * discountPct) / 100);
      const finalAmount = data.totalAmount - discountVal;
      
      const creds = await prisma.whatsAppSettings.findFirst();
      const upiId = creds?.merchantUpiId || '9306817689@kotak811';
      const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Espon&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(`Prepaid Discount for ${data.orderNumber}`)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiLink)}`;
      const payWebUrl = `https://whatsapp.esponsports.com/pay?pa=${encodeURIComponent(upiId)}&pn=Espon&am=${finalAmount}&tn=${encodeURIComponent(`Prepaid Discount for ${data.orderNumber}`)}`;

      messageType = 'PAYMENT_LINK';
      mediaUrl = payWebUrl;
      messageContent = `⚡ *Convert to Prepaid & Save ₹${discountVal} (Flat ${discountPct}% OFF)!*\n\nHi ${data.customerName || 'there'}, you placed a COD Order *${data.orderNumber}* for ₹${data.totalAmount.toLocaleString('en-IN')}.\n\nPay online now via UPI/GPay/PhonePe to get:\n✅ *₹${discountVal} Instant Discount (Pay only ₹${finalAmount.toLocaleString('en-IN')})*\n✅ *Priority Express Dispatch*\n✅ *Contactless Delivery*\n\n🏦 UPI ID: *${upiId}*\n\nScan the QR code or tap 'Pay Now' below:`;

      await sendWhatsAppMessageAction({
        conversationId: conversation.id,
        senderType: 'AGENT',
        senderName: 'Espon Billing',
        messageType: 'PAYMENT_LINK',
        content: messageContent,
        mediaUrl: payWebUrl,
        metadata: JSON.stringify({
          qrImageUrl: qrApiUrl,
          paymentUrl: payWebUrl,
          amount: finalAmount,
          upiId,
          orderNumber: data.orderNumber,
          isCodToPrepaid: true
        })
      });

      await prisma.shopifyAutomationFlow.updateMany({
        where: { flowKey: 'COD_TO_PREPAID' },
        data: { totalTriggered: { increment: 1 } }
      });

      revalidatePath('/whatsapp/shopify');
      return { success: true, conversationId: conversation.id };
    } else if (data.actionType === 'DISPATCH_TRACKING') {
      messageContent = `🚚 *Your Order ${data.orderNumber} is on the way!*\n\nHi ${data.customerName || 'there'}, your package has been dispatched.\n\n📦 *Courier:* ${data.courierName || 'Express Courier'}\n🔢 *Tracking AWB:* ${data.trackingNumber || 'Available shortly'}\n\nTap below to track your delivery status in real time:`;
      if (data.trackingUrl) {
        messageType = 'PAYMENT_LINK';
        mediaUrl = data.trackingUrl;
      }
    } else if (data.actionType === 'DELIVERED') {
      messageContent = `🎁 *Package Delivered! (Order ${data.orderNumber})*\n\nHi ${data.customerName || 'there'}, your Espon Sports order has been delivered!\n\nWe hope you love your new gear. How was your experience?\n\n⭐ *Reply 5* if you loved it!\n📸 Send us a photo wearing your new outfit to get a *₹200 Gift Voucher* for your next order!`;
    }

    const sendRes = await sendWhatsAppMessageAction({
      conversationId: conversation.id,
      senderType: 'AGENT',
      senderName: 'Espon Support',
      messageType,
      content: messageContent,
      mediaUrl
    });

    revalidatePath('/whatsapp/shopify');
    return { success: true, conversationId: conversation.id, sendRes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 6. PRE-GENERATED AUTOMATION FLOWS MANAGEMENT
// ---------------------------------------------------------
const DEFAULT_PREGENERATED_FLOWS = [
  {
    flowKey: "ORDER_CONFIRMATION",
    name: "📦 Instant Order Confirmation & Verification",
    description: "Sends automated WhatsApp confirmation with items list, delivery address, and interactive confirm/cancel buttons immediately after a Shopify order is placed.",
    triggerEvent: "orders/create",
    isActive: true,
    delayMinutes: 0,
    templateName: "order_confirmation_v2",
    messageCopy: "Hi {{1}}, thank you for shopping with Espon Sports! Your order #{{2}} for ₹{{3}} is confirmed and being packed."
  },
  {
    flowKey: "ABANDONED_CART_DRIP",
    name: "🛒 Abandoned Checkout 3-Stage Drip Recovery",
    description: "Recovers lost revenue by sending automated WhatsApp reminders (15 mins, 2 hours, 24 hours) with dynamic product cards, cart links, and limited-time discount codes.",
    triggerEvent: "checkouts/create",
    isActive: true,
    delayMinutes: 15,
    discountCode: "SAVE10",
    discountValue: 10,
    templateName: "abandoned_cart_recovery",
    messageCopy: "Hey {{1}}, you left items in your cart! Complete your order now and get 10% OFF with code SAVE10."
  },
  {
    flowKey: "COD_TO_PREPAID",
    name: "⚡ One-Click COD to Prepaid Converter (RTO Saver)",
    description: "Automatically offers a 5-10% instant discount / UPI QR code on COD orders to convert them into confirmed prepaid orders and eliminate expensive RTO losses.",
    triggerEvent: "orders/create",
    isActive: true,
    delayMinutes: 2,
    discountCode: "PREPAID5",
    discountValue: 5,
    templateName: "cod_to_prepaid_v1",
    messageCopy: "Save ₹{{1}} extra on Order #{{2}}! Pay online via UPI/GPay now to get instant cashback & priority dispatch."
  },
  {
    flowKey: "ORDER_DISPATCHED",
    name: "🚚 Order Dispatched & Live Tracking",
    description: "Notifies customers the moment their shipment is fulfilled with courier name, AWB tracking number, and 1-tap live package tracking button.",
    triggerEvent: "orders/fulfilled",
    isActive: true,
    delayMinutes: 0,
    templateName: "order_tracking_v1",
    messageCopy: "Your order #{{1}} is shipped via {{2}}! Tracking ID: {{3}}. Tap below to track your delivery live."
  },
  {
    flowKey: "ORDER_DELIVERED",
    name: "🎁 Order Delivered & Photo Review Collector",
    description: "Celebrates successful delivery, collects 5-star NPS feedback, and requests customer photo reviews in exchange for loyalty discount rewards.",
    triggerEvent: "orders/updated",
    isActive: true,
    delayMinutes: 60,
    discountCode: "VIP200",
    discountValue: 200,
    templateName: "order_delivered_review",
    messageCopy: "Your package #{{1}} has arrived! 🎉 How did we do? Reply with a photo to earn a ₹200 loyalty reward."
  },
  {
    flowKey: "NDR_RESOLUTION",
    name: "⚠️ NDR (Non-Delivery Report) Re-attempt Scheduler",
    description: "When courier delivery fails (Customer unavailable / Wrong address), an instant WhatsApp prompt allows the buyer to pick a new delivery slot or update their address.",
    triggerEvent: "courier/ndr",
    isActive: true,
    delayMinutes: 5,
    templateName: "ndr_reattempt_v1",
    messageCopy: "We attempted delivering your order #{{1}} today but couldn't reach you. Please confirm your preferred re-delivery date."
  }
];

export async function getShopifyAutomationFlowsAction() {
  try {
    await requireAuth();
    // Ensure all default flows are initialized in database
    for (const def of DEFAULT_PREGENERATED_FLOWS) {
      const existing = await prisma.shopifyAutomationFlow.findUnique({
        where: { flowKey: def.flowKey }
      });
      if (!existing) {
        await prisma.shopifyAutomationFlow.create({
          data: def
        });
      }
    }

    const flows = await prisma.shopifyAutomationFlow.findMany({
      orderBy: { createdAt: 'asc' }
    });

    return { success: true, flows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleShopifyAutomationFlowAction(flowId: string, isActive: boolean) {
  try {
    await requireAuth();
    const updated = await prisma.shopifyAutomationFlow.update({
      where: { id: flowId },
      data: { isActive }
    });
    revalidatePath('/whatsapp/shopify');
    return { success: true, flow: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShopifyAutomationFlowAction(flowId: string, data: {
  delayMinutes?: number;
  discountCode?: string;
  discountValue?: number;
  messageCopy?: string;
  templateName?: string;
}) {
  try {
    await requireAuth();
    const updated = await prisma.shopifyAutomationFlow.update({
      where: { id: flowId },
      data
    });
    revalidatePath('/whatsapp/shopify');
    return { success: true, flow: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 7. REGISTER SHOPIFY WEBHOOKS
// ---------------------------------------------------------
export async function registerShopifyWebhooksAction() {
  try {
    await requireAuth();
    const { domain, token } = await getShopifyCredentials();
    if (!domain || !token) {
      return { success: false, error: "Shopify credentials not found." };
    }

    const webhookUrl = `https://whatsapp.esponsports.com/api/shopify/webhook`;
    const topics = [
      'orders/create',
      'orders/fulfilled',
      'orders/updated',
      'checkouts/create',
      'checkouts/update'
    ];

    const results = [];
    for (const topic of topics) {
      const res = await fetch(`https://${domain}/admin/api/2024-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: webhookUrl,
            format: 'json'
          }
        })
      });
      const data = await res.json();
      results.push({ topic, status: res.status, data });
    }

    return { success: true, results, webhookUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
