'use server';

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";
import { getRecoveryAgentSettings, saveRecoveryAgentSettings, RecoveryAgentSettings } from "@/lib/paymentRecoveryAgent";

export interface UnifiedOrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  sku?: string;
  image?: string;
}

export interface UnifiedOrder {
  id: string;
  orderNumber: string;
  source: "WHATSAPP_CATALOG" | "SHOPIFY" | "DIRECT_CRM" | "WHATSAPP_CHECKOUT";
  createdAt: string;
  customer: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    whatsappPhone: string;
    conversationId?: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  items: UnifiedOrderItem[];
  financials: {
    subtotal: number;
    discountPercent: number;
    discountCode?: string;
    discountAmount: number;
    tax: number;
    shippingFee: number;
    totalAmount: number;
    paymentMode: "PREPAID" | "PARTIAL_COD" | "FULL_COD" | "ONLINE";
    advanceAmountPaid: number;
    codBalanceDue: number;
    paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING" | "PAYMENT_UNDER_REVIEW" | "FAILED" | "REFUNDED";
    paymentLinkUrl?: string;
    transactionId?: string;
    paymentScreenshotUrl?: string;
    utrNumber?: string;
    proofUploadedAt?: string;
  };
  fulfillment: {
    status: "PROCESSING" | "PACKED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
    courierName?: string;
    awbNumber?: string;
    trackingUrl?: string;
    dispatchDate?: string;
  };
  notes?: string;
}

/**
 * Fetch unified orders across WhatsApp Catalog Orders, CRM Orders, and Shopify
 */
export async function getUnifiedOrdersAction(filters?: {
  status?: string;
  paymentStatus?: string;
  paymentMode?: string;
  search?: string;
  limit?: number;
}) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const clientId = user?.clientId;

    const orders: UnifiedOrder[] = [];

    // 1. Fetch WhatsApp Catalog Orders from whatsAppMessage (messageType: ORDER)
    const catalogMessages = await prisma.whatsAppMessage.findMany({
      where: {
        messageType: "ORDER",
        ...(clientId ? { conversation: { clientId } } : {})
      },
      include: {
        conversation: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { sentAt: "desc" },
      take: filters?.limit || 100
    });

    // 2. Fetch all WhatsApp Payment Links & Proofs for this client
    const paymentLinks = await prisma.whatsAppPaymentLink.findMany({
      where: clientId
        ? {
            OR: [
              { clientId },
              { conversation: { clientId } },
              { customer: { clientId } }
            ]
          }
        : {},
      include: {
        conversation: {
          include: {
            customer: true
          }
        },
        customer: true
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100
    });

    const processedConvIds = new Set<string>();
    const processedPaymentLinkIds = new Set<string>();

    for (const msg of catalogMessages) {
      const conv = msg.conversation;
      const cust = conv?.customer;
      let orderMeta: any = {};
      try {
        orderMeta = JSON.parse(msg.metadata || "{}");
      } catch (_) {}

      const orderData = orderMeta.order || {};
      const rawItems: any[] = orderData.items || [];
      const totalAmt = Number(orderData.totalAmount) || 0;

      const items: UnifiedOrderItem[] = rawItems.map(it => ({
        id: it.retailer_id || it.sku || it.name,
        name: it.name || "Product",
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || (Number(it.item_price) || 0),
        total: (Number(it.quantity) || 1) * (Number(it.price) || (Number(it.item_price) || 0)),
        sku: it.sku || it.articleNumber || "",
        image: it.image || ""
      }));

      // Find matching payment link
      const pLink = paymentLinks.find(pl => pl.conversationId === msg.conversationId);
      if (pLink) {
        processedPaymentLinkIds.add(pLink.id);
      }
      if (msg.conversationId) {
        processedConvIds.add(msg.conversationId);
      }

      const isPaid = pLink?.status === "PAID";
      const isUnderReview = pLink?.status === "PAYMENT_UNDER_REVIEW";
      const pLinkAmount = pLink ? Number(pLink.amount) : 0;

      // Extract proof details if available
      let extractedScreenshot = isUnderReview ? pLink?.paymentUrl : undefined;
      let extractedUtr = pLink?.transactionId || undefined;

      const custNotes = cust?.notes || "";
      if (!extractedScreenshot && custNotes.includes("[PROOF UPLOADED]")) {
        const ssMatch = custNotes.match(/SS:\s*(https?:\/\/[^\s|]+)/i);
        if (ssMatch) extractedScreenshot = ssMatch[1];
        const utrMatch = custNotes.match(/UTR:\s*([^|]+)/i);
        if (utrMatch) extractedUtr = utrMatch[1].trim();
      }

      // Determine Payment Mode & Financials
      let paymentMode: "PREPAID" | "PARTIAL_COD" | "FULL_COD" | "ONLINE" = "PREPAID";
      let advancePaid = 0;
      let codBalance = 0;
      let paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING" | "PAYMENT_UNDER_REVIEW" | "FAILED" = "PENDING";
      let discountAmount = 0;
      let discountPercent = 0;

      const isFullCod = custNotes.toUpperCase().includes("FULL COD") || custNotes.toUpperCase().includes("CASH ON DELIVERY");
      const isPartialCod = pLink && pLinkAmount < totalAmt && pLinkAmount > 0;

      if (isUnderReview) {
        paymentStatus = "PAYMENT_UNDER_REVIEW";
        paymentMode = isPartialCod ? "PARTIAL_COD" : "PREPAID";
        advancePaid = 0;
        codBalance = isPartialCod ? Math.max(0, totalAmt - pLinkAmount) : 0;
      } else if (isFullCod) {
        paymentMode = "FULL_COD";
        advancePaid = 0;
        codBalance = totalAmt;
        paymentStatus = "PENDING";
      } else if (isPartialCod) {
        paymentMode = "PARTIAL_COD";
        advancePaid = isPaid ? pLinkAmount : 0;
        codBalance = Math.max(0, totalAmt - pLinkAmount);
        paymentStatus = isPaid ? "PARTIALLY_PAID" : "PENDING";
      } else if (pLink) {
        paymentMode = "PREPAID";
        advancePaid = isPaid ? pLinkAmount : 0;
        codBalance = 0;
        paymentStatus = isPaid ? "PAID" : "PENDING";
        if (pLinkAmount < totalAmt && totalAmt > 0) {
          discountAmount = totalAmt - pLinkAmount;
          discountPercent = Math.round((discountAmount / totalAmt) * 100);
        }
      }

      // Address parsing
      const fullAddress = orderData.customerAddress || cust?.shippingAddress || cust?.billingAddress || custNotes || "Address Pending";
      let city = orderData.customerCity || "";
      let state = orderData.customerState || "";
      let pincode = orderData.customerPincode || "";

      const pinMatch = fullAddress.match(/\b\d{6}\b/);
      if (pinMatch && !pincode) pincode = pinMatch[0];

      if (!city && custNotes) {
        const cityMatch = custNotes.match(/City:\s*([^,\n|]+)/i);
        if (cityMatch) city = cityMatch[1].trim();
      }
      if (!state && custNotes) {
        const stateMatch = custNotes.match(/State:\s*([^,\n|]+)/i);
        if (stateMatch) state = stateMatch[1].trim();
      }
      if (!pincode && custNotes) {
        const pinMatchNotes = custNotes.match(/Pincode:\s*(\d{6})/i);
        if (pinMatchNotes) pincode = pinMatchNotes[1];
      }

      const shortId = msg.id.slice(-6).toUpperCase();

      const itemsTotal = items.reduce((s, it) => s + it.total, 0);
      const computedSubtotal = orderData.subtotal !== undefined ? Number(orderData.subtotal) : (itemsTotal || totalAmt + discountAmount);
      const computedDiscountAmount = orderData.discountAmount !== undefined ? Number(orderData.discountAmount) : discountAmount;
      const computedDiscountPercent = orderData.discountPercent !== undefined ? Number(orderData.discountPercent) : discountPercent;
      const computedDiscountCode = orderData.discountCode !== undefined ? orderData.discountCode : (computedDiscountAmount > 0 ? "DISCOUNT" : undefined);
      const computedShippingFee = orderData.shippingFee !== undefined ? Number(orderData.shippingFee) : 0;
      const computedTotal = orderData.totalAmount !== undefined ? Number(orderData.totalAmount) : (totalAmt || Math.max(0, computedSubtotal - computedDiscountAmount + computedShippingFee));
      const computedPaymentMode = orderData.paymentMode || paymentMode;
      const computedAdvancePaid = orderData.advanceAmountPaid !== undefined ? Number(orderData.advanceAmountPaid) : advancePaid;
      const computedCodBalance = orderData.codBalanceDue !== undefined ? Number(orderData.codBalanceDue) : (computedPaymentMode === "PREPAID" ? 0 : Math.max(0, computedTotal - computedAdvancePaid));
      const computedPaymentStatus = orderData.paymentStatus || (isUnderReview ? "PAYMENT_UNDER_REVIEW" : (computedPaymentMode === "PREPAID" ? (isPaid ? "PAID" : "PENDING") : (computedAdvancePaid > 0 ? "PARTIALLY_PAID" : "PENDING")));

      orders.push({
        id: msg.id,
        orderNumber: `WA-${shortId}`,
        source: "WHATSAPP_CATALOG",
        createdAt: msg.sentAt ? msg.sentAt.toISOString() : new Date().toISOString(),
        customer: {
          id: cust?.id,
          name: orderData.customerName || cust?.contactPerson || cust?.businessName || "WhatsApp Customer",
          phone: orderData.customerPhone || cust?.mobile || cust?.whatsappNumber || "",
          email: "",
          whatsappPhone: cust?.whatsappNumber || cust?.mobile || orderData.customerPhone || "",
          conversationId: conv?.id,
          fullAddress,
          city,
          state,
          pincode,
          landmark: cust?.landmark || ""
        },
        items: items.length > 0 ? items : [{
          name: `Catalog Order (${orderData.totalQuantity || 1} items)`,
          quantity: orderData.totalQuantity || 1,
          price: totalAmt,
          total: totalAmt
        }],
        financials: {
          subtotal: computedSubtotal,
          discountPercent: computedDiscountPercent,
          discountCode: computedDiscountCode,
          discountAmount: computedDiscountAmount,
          shippingFee: computedShippingFee,
          tax: Number(orderData.tax) || 0,
          totalAmount: computedTotal,
          paymentMode: computedPaymentMode,
          advanceAmountPaid: computedAdvancePaid,
          codBalanceDue: computedCodBalance,
          paymentStatus: computedPaymentStatus,
          paymentLinkUrl: pLink?.paymentUrl,
          transactionId: extractedUtr,
          paymentScreenshotUrl: extractedScreenshot,
          utrNumber: extractedUtr,
        },
        fulfillment: {
          status: orderData.fulfillmentStatus || "PROCESSING",
          courierName: orderData.courierName || undefined,
          awbNumber: orderData.awbNumber || undefined,
          trackingUrl: orderData.trackingUrl || undefined,
          dispatchDate: orderData.dispatchDate || undefined
        },
        notes: orderData.customerNote || custNotes || undefined
      });
    }

    // 3. Unify standalone WhatsApp Payment Links & Proofs (Web checkout, manual UPI proof submissions)
    for (const pl of paymentLinks) {
      if (processedPaymentLinkIds.has(pl.id)) continue;

      const conv = pl.conversation;
      const cust = pl.customer || conv?.customer;
      const custNotes = cust?.notes || "";
      const isUnderReview = pl.status === "PAYMENT_UNDER_REVIEW";
      const isPaid = pl.status === "PAID";
      const pLinkAmount = Number(pl.amount) || 0;

      let extractedScreenshot = (isUnderReview || pl.paymentUrl?.includes("product-image")) ? pl.paymentUrl : undefined;
      let extractedUtr = pl.transactionId || undefined;

      if (!extractedScreenshot && custNotes.includes("[PROOF UPLOADED]")) {
        const ssMatch = custNotes.match(/SS:\s*(https?:\/\/[^\s|]+)/i);
        if (ssMatch) extractedScreenshot = ssMatch[1];
        const utrMatch = custNotes.match(/UTR:\s*([^|]+)/i);
        if (utrMatch) extractedUtr = utrMatch[1].trim();
      }

      const fullAddress = cust?.shippingAddress || cust?.billingAddress || custNotes || "Address on File";
      let city = "";
      let state = "";
      let pincode = "";

      const pinMatch = fullAddress.match(/\b\d{6}\b/);
      if (pinMatch) pincode = pinMatch[0];
      if (custNotes) {
        const cityMatch = custNotes.match(/City:\s*([^,\n|]+)/i);
        if (cityMatch) city = cityMatch[1].trim();
        const stateMatch = custNotes.match(/State:\s*([^,\n|]+)/i);
        if (stateMatch) state = stateMatch[1].trim();
        const pinM = custNotes.match(/Pincode:\s*(\d{6})/i);
        if (pinM && !pincode) pincode = pinM[1];
      }

      const isFullCod = custNotes.toUpperCase().includes("FULL COD") || custNotes.toUpperCase().includes("CASH ON DELIVERY");
      const isPartialCod = custNotes.toUpperCase().includes("PARTIAL") || custNotes.toUpperCase().includes("TOKEN");

      let paymentMode: "PREPAID" | "PARTIAL_COD" | "FULL_COD" | "ONLINE" = isPartialCod ? "PARTIAL_COD" : (isFullCod ? "FULL_COD" : "PREPAID");
      let paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING" | "PAYMENT_UNDER_REVIEW" | "FAILED" = isUnderReview
        ? "PAYMENT_UNDER_REVIEW"
        : (isPaid ? (isPartialCod ? "PARTIALLY_PAID" : "PAID") : "PENDING");

      const shortId = pl.id.slice(-6).toUpperCase();

      orders.push({
        id: pl.id,
        orderNumber: `WA-${shortId}`,
        source: "WHATSAPP_CHECKOUT",
        createdAt: pl.createdAt ? pl.createdAt.toISOString() : new Date().toISOString(),
        customer: {
          id: cust?.id,
          name: cust?.contactPerson || cust?.businessName || "WhatsApp Customer",
          phone: cust?.mobile || cust?.whatsappNumber || "",
          email: "",
          whatsappPhone: cust?.whatsappNumber || cust?.mobile || "",
          conversationId: conv?.id,
          fullAddress,
          city,
          state,
          pincode,
          landmark: cust?.landmark || ""
        },
        items: [{
          id: `item-${pl.id.slice(-6)}`,
          name: isPartialCod ? `Partial Advance Token (₹${pLinkAmount})` : `Order Package / Product (₹${pLinkAmount})`,
          quantity: 1,
          price: pLinkAmount,
          total: pLinkAmount
        }],
        financials: {
          subtotal: pLinkAmount,
          discountPercent: 0,
          discountAmount: 0,
          shippingFee: 0,
          tax: 0,
          totalAmount: pLinkAmount,
          paymentMode,
          advanceAmountPaid: isPaid ? pLinkAmount : (isUnderReview ? pLinkAmount : 0),
          codBalanceDue: 0,
          paymentStatus,
          paymentLinkUrl: pl.paymentUrl,
          transactionId: extractedUtr,
          paymentScreenshotUrl: extractedScreenshot,
          utrNumber: extractedUtr,
          proofUploadedAt: pl.updatedAt ? pl.updatedAt.toISOString() : undefined,
        },
        fulfillment: {
          status: isPaid ? "PACKED" : "PROCESSING",
        },
        notes: custNotes || undefined
      });
    }

    // 2. Fetch CRM Database Orders from prisma.order
    const dbOrders = await prisma.order.findMany({
      take: filters?.limit || 50,
      orderBy: { orderDate: "desc" },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      }
    }).catch(() => []);

    for (const ord of dbOrders) {
      const items: UnifiedOrderItem[] = (ord.items || []).map(it => ({
        id: it.id,
        name: it.product?.name || "Item",
        quantity: it.quantity,
        price: it.rate,
        total: it.total,
        sku: it.product?.sku || "",
        image: it.product?.images?.[0] || ""
      }));

      const cust = ord.customer;
      const fullAddress = cust?.shippingAddress || cust?.billingAddress || "Address on File";
      const pinMatch = fullAddress.match(/\b\d{6}\b/);

      orders.push({
        id: ord.id,
        orderNumber: ord.orderNumber || `#${ord.id.slice(-6).toUpperCase()}`,
        source: "DIRECT_CRM",
        createdAt: ord.orderDate ? ord.orderDate.toISOString() : ord.createdAt.toISOString(),
        customer: {
          id: cust?.id,
          name: cust?.contactPerson || cust?.businessName || "Customer",
          phone: cust?.mobile || cust?.whatsappNumber || "",
          email: "",
          whatsappPhone: cust?.whatsappNumber || cust?.mobile || "",
          fullAddress,
          city: "",
          state: ord.placeOfSupply || "",
          pincode: pinMatch ? pinMatch[0] : "",
          landmark: cust?.landmark || ""
        },
        items,
        financials: {
          subtotal: ord.subtotal || ord.totalValue,
          discountPercent: ord.discount > 0 && ord.subtotal > 0 ? Math.round((ord.discount / ord.subtotal) * 100) : 0,
          discountAmount: ord.discount || 0,
          shippingFee: 0,
          tax: ord.tax || 0,
          totalAmount: ord.totalValue,
          paymentMode: ord.outstandingAmount === 0 ? "PREPAID" : (ord.paymentReceived > 0 ? "PARTIAL_COD" : "FULL_COD"),
          advanceAmountPaid: ord.paymentReceived || 0,
          codBalanceDue: ord.outstandingAmount || 0,
          paymentStatus: ord.paymentStatus === "Paid" ? "PAID" : (ord.paymentReceived > 0 ? "PARTIALLY_PAID" : "PENDING")
        },
        fulfillment: {
          status: (ord.orderStatus?.toUpperCase() as any) || "PROCESSING",
          courierName: ord.courierName || undefined,
          awbNumber: ord.awbNumber || undefined,
          trackingUrl: ord.trackingUrl || undefined,
          dispatchDate: ord.dispatchDate ? ord.dispatchDate.toISOString() : undefined
        },
        notes: ord.notes || undefined
      });
    }

    // Filter results if filters are set
    let filtered = orders;

    if (filters?.status && filters.status !== "ALL") {
      filtered = filtered.filter(o => o.fulfillment.status === filters.status);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== "ALL") {
      filtered = filtered.filter(o => o.financials.paymentStatus === filters.paymentStatus);
    }

    if (filters?.paymentMode && filters.paymentMode !== "ALL") {
      filtered = filtered.filter(o => o.financials.paymentMode === filters.paymentMode);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(o => 
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.customer.city.toLowerCase().includes(q) ||
        o.customer.pincode.includes(q) ||
        o.items.some(it => it.name.toLowerCase().includes(q))
      );
    }

    // Compute Summary Metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.financials.totalAmount, 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + o.financials.discountAmount, 0);
    const prepaidCount = orders.filter(o => o.financials.paymentMode === "PREPAID").length;
    const partialCodCount = orders.filter(o => o.financials.paymentMode === "PARTIAL_COD").length;
    const fullCodCount = orders.filter(o => o.financials.paymentMode === "FULL_COD").length;

    return {
      success: true,
      orders: filtered,
      metrics: {
        totalOrders,
        totalRevenue,
        totalDiscounts,
        prepaidCount,
        partialCodCount,
        fullCodCount
      }
    };
  } catch (err: any) {
    console.error("[getUnifiedOrdersAction Error]:", err);
    return { success: false, error: err.message, orders: [], metrics: null };
  }
}

/**
 * Update Order Fulfillment Status & Tracking Info
 */
export async function updateOrderStatusAction(params: {
  orderId: string;
  status: "PROCESSING" | "PACKED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  courierName?: string;
  awbNumber?: string;
  trackingUrl?: string;
  sendWhatsAppNotification?: boolean;
}) {
  try {
    const { orderId, status, courierName, awbNumber, trackingUrl, sendWhatsAppNotification } = params;

    // Check if it's a DB order
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (dbOrder) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          orderStatus: status,
          courierName: courierName || dbOrder.courierName,
          awbNumber: awbNumber || dbOrder.awbNumber,
          trackingUrl: trackingUrl || dbOrder.trackingUrl,
          dispatchDate: status === "DISPATCHED" ? new Date() : dbOrder.dispatchDate
        }
      });
    } else {
      // Check if it's a WhatsApp catalog order message
      const msg = await prisma.whatsAppMessage.findUnique({
        where: { id: orderId }
      });
      if (msg) {
        let meta: any = {};
        try {
          meta = JSON.parse(msg.metadata || "{}");
        } catch (_) {}
        meta.order = {
          ...(meta.order || {}),
          fulfillmentStatus: status,
          courierName: courierName || meta.order?.courierName,
          awbNumber: awbNumber || meta.order?.awbNumber,
          trackingUrl: trackingUrl || meta.order?.trackingUrl,
          dispatchDate: status === "DISPATCHED" ? new Date().toISOString() : meta.order?.dispatchDate
        };
        await prisma.whatsAppMessage.update({
          where: { id: orderId },
          data: { metadata: JSON.stringify(meta) }
        });
      }
    }

    // If sendWhatsAppNotification is checked, send dispatch or update message
    if (sendWhatsAppNotification) {
      // Find conversation for customer
      let convId: string | null = null;
      if (dbOrder?.customer) {
        const last10 = (dbOrder.customer.mobile || dbOrder.customer.whatsappNumber || "").slice(-10);
        if (last10) {
          const conv = await prisma.whatsAppConversation.findFirst({
            where: {
              OR: [
                { customer: { mobile: { contains: last10 } } },
                { customer: { whatsappNumber: { contains: last10 } } }
              ]
            }
          });
          if (conv) convId = conv.id;
        }
      } else {
        const msg = await prisma.whatsAppMessage.findUnique({
          where: { id: orderId }
        });
        if (msg?.conversationId) {
          convId = msg.conversationId;
        }
      }

      if (convId) {
        let msgText = "";
        if (status === "DISPATCHED") {
          msgText = `🚚 *Your Order Has Been Dispatched!*\n\n` +
            `📦 Courier Partner: *${courierName || "Express Courier"}*\n` +
            (awbNumber ? `🔢 Tracking / AWB: *${awbNumber}*\n` : "") +
            (trackingUrl ? `🔗 Live Tracking: ${trackingUrl}\n\n` : "\n") +
            `Your package is on its way and will be delivered shortly. Shukriya!`;
        } else if (status === "DELIVERED") {
          msgText = `🎉 *Order Delivered!*\n\nYour package has been successfully delivered. We hope you love your products! Let us know if you need any assistance.`;
        } else {
          msgText = `ℹ️ *Order Status Update:*\nYour order status is now: *${status}*.`;
        }

        await sendWhatsAppMessageAction({
          conversationId: convId,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: msgText,
          senderName: "Order System"
        });
      }
    }

    return { success: true, message: `Order status updated to ${status}.` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Quick WhatsApp notification for an order
 */
export async function sendOrderWhatsAppMessageAction(params: {
  conversationId: string;
  content: string;
}) {
  try {
    const res = await sendWhatsAppMessageAction({
      conversationId: params.conversationId,
      senderId: "system",
      senderType: "SYSTEM",
      messageType: "TEXT",
      content: params.content,
      senderName: "Order Concierge"
    });
    return res;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface UpdateUnifiedOrderInput {
  orderId: string;
  source: "WHATSAPP_CATALOG" | "SHOPIFY" | "DIRECT_CRM" | "WHATSAPP_CHECKOUT";
  items: UnifiedOrderItem[];
  customer?: {
    name?: string;
    phone?: string;
    fullAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  financials: {
    subtotal: number;
    discountPercent?: number;
    discountCode?: string;
    discountAmount: number;
    shippingFee: number;
    tax?: number;
    totalAmount: number;
    paymentMode?: "PREPAID" | "PARTIAL_COD" | "FULL_COD" | "ONLINE";
    advanceAmountPaid?: number;
    codBalanceDue?: number;
    paymentStatus?: "PAID" | "PARTIALLY_PAID" | "PENDING" | "PAYMENT_UNDER_REVIEW" | "FAILED" | "REFUNDED";
  };
  notes?: string;
}

/**
 * Shopify-Style Edit Order Action:
 * Persists modifications to order items, prices, quantities, discounts, shipping fees,
 * payment splits (advance/COD balance), and customer shipping details.
 */
export async function updateUnifiedOrderAction(params: UpdateUnifiedOrderInput) {
  try {
    const { orderId, items, customer, financials, notes } = params;

    // 1. Try finding in WhatsApp catalog message
    const msg = await prisma.whatsAppMessage.findUnique({
      where: { id: orderId },
      include: { conversation: { include: { customer: true } } }
    });

    if (msg) {
      let meta: any = {};
      try {
        meta = JSON.parse(msg.metadata || "{}");
      } catch (_) {}

      meta.order = {
        ...(meta.order || {}),
        items: items.map(it => ({
          retailer_id: it.id || it.sku || it.name,
          name: it.name,
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
          item_price: Number(it.price) || 0,
          total: (Number(it.quantity) || 1) * (Number(it.price) || 0),
          sku: it.sku || "",
          image: it.image || ""
        })),
        subtotal: financials.subtotal,
        discountAmount: financials.discountAmount,
        discountPercent: financials.discountPercent || 0,
        discountCode: financials.discountCode || "",
        shippingFee: financials.shippingFee || 0,
        tax: financials.tax || 0,
        totalAmount: financials.totalAmount,
        totalQuantity: items.reduce((s, it) => s + (Number(it.quantity) || 1), 0),
        paymentMode: financials.paymentMode,
        advanceAmountPaid: financials.advanceAmountPaid,
        codBalanceDue: financials.codBalanceDue,
        paymentStatus: financials.paymentStatus,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        customerAddress: customer?.fullAddress,
        customerCity: customer?.city,
        customerState: customer?.state,
        customerPincode: customer?.pincode,
        customerNote: notes ?? meta.order?.customerNote
      };

      await prisma.whatsAppMessage.update({
        where: { id: orderId },
        data: { metadata: JSON.stringify(meta) }
      });

      if (msg.conversation?.customer && customer) {
        await prisma.customer.update({
          where: { id: msg.conversation.customer.id },
          data: {
            contactPerson: customer.name || msg.conversation.customer.contactPerson,
            shippingAddress: customer.fullAddress || msg.conversation.customer.shippingAddress
          }
        }).catch(() => null);
      }

      return { success: true, message: "Order updated successfully." };
    }

    // 2. Try finding in Database Order (prisma.order)
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (dbOrder) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          subtotal: financials.subtotal,
          discount: financials.discountAmount,
          tax: financials.tax || 0,
          totalValue: financials.totalAmount,
          paymentReceived: financials.advanceAmountPaid ?? dbOrder.paymentReceived,
          outstandingAmount: financials.codBalanceDue ?? Math.max(0, financials.totalAmount - (financials.advanceAmountPaid || 0)),
          paymentStatus: financials.paymentStatus === "PAID" ? "Paid" : (financials.paymentStatus === "PARTIALLY_PAID" ? "Partially Paid" : "Unpaid"),
          notes: notes ?? dbOrder.notes,
          placeOfSupply: customer?.state || dbOrder.placeOfSupply
        }
      });

      if (dbOrder.customer && customer) {
        await prisma.customer.update({
          where: { id: dbOrder.customer.id },
          data: {
            contactPerson: customer.name || dbOrder.customer.contactPerson,
            shippingAddress: customer.fullAddress || dbOrder.customer.shippingAddress
          }
        }).catch(() => null);
      }

      // Recreate order items in DB
      await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => null);
      const defaultProduct = await prisma.product.findFirst();
      if (defaultProduct) {
        for (const it of items) {
          await prisma.orderItem.create({
            data: {
              orderId,
              productId: defaultProduct.id,
              quantity: Number(it.quantity) || 1,
              rate: Number(it.price) || 0,
              total: (Number(it.quantity) || 1) * (Number(it.price) || 0),
              hsnCode: "6109"
            }
          }).catch(() => null);
        }
      }

      return { success: true, message: "Order updated successfully." };
    }

    return { success: false, error: "Order record not found." };
  } catch (err: any) {
    console.error("[updateUnifiedOrderAction Error]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch company and store branding details for Tax Invoice and Packing Slip
 */
export async function getStoreDetailsAction() {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const org = await prisma.organization.findFirst({
      where: user?.clientId ? { id: user.clientId } : undefined
    });

    return {
      success: true,
      store: {
        name: org?.name || org?.tradeName || "Espon Clothing",
        tradeName: org?.tradeName || org?.name || "Espon Clothing Pvt Ltd",
        gstin: org?.gstin || "07AAACE1234F1Z5",
        pan: org?.pan || "AAACE1234F",
        phone: org?.phone || "+91 98765 43210",
        email: org?.email || "support@esponclothing.com",
        website: org?.website || "www.esponclothing.com",
        address: org?.address || "Plot No 42, Garment Hub, Industrial Area",
        city: org?.city || "New Delhi",
        state: org?.state || "Delhi",
        pincode: org?.pincode || "110020",
        country: org?.country || "India"
      }
    };
  } catch (err: any) {
    return {
      success: false,
      store: {
        name: "Espon Clothing",
        tradeName: "Espon Clothing Pvt Ltd",
        gstin: "07AAACE1234F1Z5",
        pan: "AAACE1234F",
        phone: "+91 98765 43210",
        email: "support@esponclothing.com",
        website: "www.esponclothing.com",
        address: "Plot No 42, Garment Hub, Industrial Area",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110020",
        country: "India"
      }
    };
  }
}

/**
 * Server Action: Admin verifies or rejects uploaded manual UPI payment screenshot
 */
export async function verifyOrderPaymentScreenshotAction(params: {
  orderId: string;
  conversationId?: string;
  customerId?: string;
  status: "APPROVED" | "REJECTED";
  note?: string;
}) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const { orderId, conversationId, customerId, status, note } = params;

    // Find payment link or conversation
    let pLink = await prisma.whatsAppPaymentLink.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderId: orderId },
          ...(conversationId ? [{ conversationId }] : [])
        ]
      },
      include: {
        conversation: { include: { customer: true, client: true } },
        customer: true,
        client: true
      },
      orderBy: { createdAt: "desc" }
    });

    let convId = conversationId || pLink?.conversationId;
    let cust = pLink?.customer;
    let client = pLink?.client || pLink?.conversation?.client;

    if (!cust && customerId) {
      cust = await prisma.customer.findUnique({ where: { id: customerId } }) as any;
    }

    if (!client && user?.clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } }) as any;
    }

    if (pLink) {
      await prisma.whatsAppPaymentLink.update({
        where: { id: pLink.id },
        data: {
          status: status === "APPROVED" ? "PAID" : "FAILED",
          paidAt: status === "APPROVED" ? new Date() : undefined,
        }
      });
    }

    // Update catalog order message metadata if exists
    if (convId) {
      const orderMsg = await prisma.whatsAppMessage.findFirst({
        where: { conversationId: convId, messageType: "ORDER" },
        orderBy: { sentAt: "desc" }
      });

      if (orderMsg?.metadata) {
        try {
          const meta = JSON.parse(orderMsg.metadata);
          if (meta.order) {
            meta.order.paymentStatus = status === "APPROVED" ? "PAID" : "FAILED";
            if (status === "APPROVED") {
              meta.order.advanceAmountPaid = meta.order.totalAmount || pLink?.amount || 0;
              meta.order.codBalanceDue = 0;
            }
            await prisma.whatsAppMessage.update({
              where: { id: orderMsg.id },
              data: { metadata: JSON.stringify(meta) }
            });
          }
        } catch (_) {}
      }
    }

    if (status === "APPROVED") {
      const amount = pLink?.amount || 0;
      const customerName = cust?.contactPerson || cust?.businessName || "Valued Customer";
      const storeName = client?.businessName || "Official Store";

      if (convId) {
        const approvalMsg =
          `🎉 *Payment Verified & Order Confirmed!*\n\n` +
          `Dear ${customerName},\n` +
          `Your payment of *₹${amount > 0 ? amount.toLocaleString("en-IN") : "your order"}* has been successfully verified by our billing team.\n\n` +
          `📦 *Status:* Confirmed & Packaging for Dispatch\n` +
          `🚚 Our logistics team will share your live courier tracking link as soon as your parcel ships.\n\n` +
          `Thank you for shopping with *${storeName}*!`;

        await sendWhatsAppMessageAction({
          conversationId: convId,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: approvalMsg,
          senderName: storeName,
        });
      }

      return {
        success: true,
        message: "Payment successfully verified and confirmation sent to customer WhatsApp.",
      };
    } else {
      const customerName = cust?.contactPerson || cust?.businessName || "Customer";
      const storeName = client?.businessName || "Billing Support";

      if (convId) {
        const rejectionMsg =
          `⚠️ *Payment Proof Verification Notice*\n\n` +
          `Dear ${customerName},\n` +
          `We were unable to verify your uploaded payment screenshot.\n` +
          (note ? `*Note:* ${note}\n\n` : "\n") +
          `Please check your banking / UPI transaction or contact our support team for assistance.`;

        await sendWhatsAppMessageAction({
          conversationId: convId,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: rejectionMsg,
          senderName: storeName,
        });
      }

      return {
        success: true,
        message: "Payment proof marked as rejected and customer notified on WhatsApp.",
      };
    }
  } catch (err: any) {
    console.error("[Verify Payment Proof Error]:", err);
    return { success: false, error: err.message };
  }
}

