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
  source: "WHATSAPP_CATALOG" | "SHOPIFY" | "DIRECT_CRM";
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
    paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING" | "FAILED" | "REFUNDED";
    paymentLinkUrl?: string;
    transactionId?: string;
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

    // Also fetch recent Payment Links for these conversations to attach payment details
    const convIds = catalogMessages.map(m => m.conversationId).filter(Boolean);
    const paymentLinks = convIds.length > 0
      ? await prisma.whatsAppPaymentLink.findMany({
          where: { conversationId: { in: convIds } },
          orderBy: { createdAt: "desc" }
        })
      : [];

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
      const isPaid = pLink?.status === "PAID";
      const pLinkAmount = pLink ? Number(pLink.amount) : 0;

      // Determine Payment Mode & Financials
      let paymentMode: "PREPAID" | "PARTIAL_COD" | "FULL_COD" | "ONLINE" = "PREPAID";
      let advancePaid = 0;
      let codBalance = 0;
      let paymentStatus: "PAID" | "PARTIALLY_PAID" | "PENDING" | "FAILED" = "PENDING";
      let discountAmount = 0;
      let discountPercent = 0;

      const custNotes = cust?.notes || "";
      const isFullCod = custNotes.toUpperCase().includes("FULL COD") || custNotes.toUpperCase().includes("CASH ON DELIVERY");
      const isPartialCod = pLink && pLinkAmount < totalAmt && pLinkAmount > 0;

      if (isFullCod) {
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
      const fullAddress = cust?.shippingAddress || cust?.billingAddress || custNotes || "Address Pending";
      let city = "";
      let state = "";
      let pincode = "";

      const pinMatch = fullAddress.match(/\b\d{6}\b/);
      if (pinMatch) pincode = pinMatch[0];

      if (custNotes) {
        const cityMatch = custNotes.match(/City:\s*([^,\n]+)/i);
        if (cityMatch) city = cityMatch[1].trim();
        const stateMatch = custNotes.match(/State:\s*([^,\n]+)/i);
        if (stateMatch) state = stateMatch[1].trim();
        const pinMatchNotes = custNotes.match(/Pincode:\s*(\d{6})/i);
        if (pinMatchNotes) pincode = pinMatchNotes[1];
      }

      const shortId = msg.id.slice(-6).toUpperCase();

      orders.push({
        id: msg.id,
        orderNumber: `WA-${shortId}`,
        source: "WHATSAPP_CATALOG",
        createdAt: msg.sentAt ? msg.sentAt.toISOString() : new Date().toISOString(),
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
        items: items.length > 0 ? items : [{
          name: `Catalog Order (${orderData.totalQuantity || 1} items)`,
          quantity: orderData.totalQuantity || 1,
          price: totalAmt,
          total: totalAmt
        }],
        financials: {
          subtotal: totalAmt + discountAmount,
          discountPercent,
          discountCode: discountPercent > 0 ? "PREPAID_OFF" : undefined,
          discountAmount,
          shippingFee: 0,
          tax: 0,
          totalAmount: totalAmt,
          paymentMode,
          advanceAmountPaid: advancePaid,
          codBalanceDue: codBalance,
          paymentStatus,
          paymentLinkUrl: pLink?.paymentUrl,
          transactionId: pLink?.transactionId || undefined
        },
        fulfillment: {
          status: "PROCESSING"
        },
        notes: orderData.customerNote || custNotes || undefined
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
