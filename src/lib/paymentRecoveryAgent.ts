import { prisma } from "@/lib/prisma";

export interface RecoveryAgentSettings {
  enabled: boolean;
  delayHours: number; // e.g. 2
  allowDiscount: boolean; // default: false (controlled strictly by admin)
  discountPercent: number; // e.g. 5
  discountCode: string; // e.g. "SPECIAL5"
  productValuePitch: string;
  autoCatalogPaymentEnabled: boolean; // Auto-send payment link + QR on catalog orders
  autoCatalogDeliveryMethod: 'both' | 'qr' | 'link'; // Delivery format: both, qr, or link

  // NEW: In-WhatsApp Flow Address Collection & Customizable Partial COD
  flowCheckoutEnabled: boolean; // default: true (ask address via Flow before payment)
  metaFlowId?: string; // Real Meta Flow ID (e.g. 104829103948192)
  allowedPaymentModes: ('PREPAID' | 'PARTIAL_COD' | 'FULL_COD')[]; // e.g. ['PREPAID', 'PARTIAL_COD']
  partialCodMode: 'PERCENTAGE' | 'FIXED'; // e.g. 'PERCENTAGE' (10%) or 'FIXED' (₹200)
  partialCodValue: number; // e.g. 10 (%) or 200 (₹)
  minOrderValueForCod: number; // default: 0
  prepaidDiscountPercent: number; // default: 5 (incentive for full online payment)
  flowCtaText: string; // CTA button text in WhatsApp
  flowHeaderTitle: string; // Header title on Flow message
}

// In-memory fallback / cache with sensible defaults
declare global {
  var __recoverySettings: RecoveryAgentSettings | undefined;
}

const DEFAULT_SETTINGS: RecoveryAgentSettings = {
  enabled: false,
  delayHours: 2,
  allowDiscount: false, // OFF by default
  discountPercent: 5,
  discountCode: "SPECIAL5",
  productValuePitch: "",
  autoCatalogPaymentEnabled: true, // Enabled by default
  autoCatalogDeliveryMethod: "both",

  flowCheckoutEnabled: true,
  metaFlowId: "",
  allowedPaymentModes: ['PREPAID', 'PARTIAL_COD'],
  partialCodMode: 'PERCENTAGE',
  partialCodValue: 10,
  minOrderValueForCod: 0,
  prepaidDiscountPercent: 5,
  flowCtaText: "Enter Delivery Address 📍",
  flowHeaderTitle: "Confirm Delivery & Payment"
};

export async function getRecoveryAgentSettings(clientId?: string): Promise<RecoveryAgentSettings> {
  try {
    if (clientId) {
      const client = await prisma.whatsAppClient.findUnique({ 
        where: { id: clientId },
        select: { customLimitsJson: true, aiKnowledgeBase: true }
      }).catch(() => null);

      if (client?.customLimitsJson) {
        try {
          const parsed = JSON.parse(client.customLimitsJson);
          if (parsed.recoverySettings) {
            return { ...DEFAULT_SETTINGS, ...parsed.recoverySettings };
          }
        } catch (_) {}
      }

      if (client?.aiKnowledgeBase) {
        try {
          const parsed = JSON.parse(client.aiKnowledgeBase);
          if (parsed.recoverySettings) {
            return { ...DEFAULT_SETTINGS, ...parsed.recoverySettings };
          }
        } catch (_) {}
      }

      return { ...DEFAULT_SETTINGS };
    }

    const dbSettings = await prisma.whatsAppSettings.findFirst().catch(() => null);
    if (dbSettings && (dbSettings as any).customLimitsJson) {
      try {
        const parsed = JSON.parse((dbSettings as any).customLimitsJson || "{}");
        if (parsed.recoverySettings) {
          return { ...DEFAULT_SETTINGS, ...parsed.recoverySettings };
        }
      } catch (_) {}
    }
  } catch (_) {}

  return { ...DEFAULT_SETTINGS };
}

export async function saveRecoveryAgentSettings(settings: Partial<RecoveryAgentSettings>, clientId?: string): Promise<RecoveryAgentSettings> {
  const current = await getRecoveryAgentSettings(clientId);
  const updated: RecoveryAgentSettings = {
    ...current,
    ...settings,
    allowDiscount: settings.allowDiscount !== undefined ? Boolean(settings.allowDiscount) : current.allowDiscount,
    autoCatalogPaymentEnabled: settings.autoCatalogPaymentEnabled !== undefined ? Boolean(settings.autoCatalogPaymentEnabled) : current.autoCatalogPaymentEnabled,
    autoCatalogDeliveryMethod: settings.autoCatalogDeliveryMethod || current.autoCatalogDeliveryMethod || 'both',
    flowCheckoutEnabled: settings.flowCheckoutEnabled !== undefined ? Boolean(settings.flowCheckoutEnabled) : current.flowCheckoutEnabled,
    allowedPaymentModes: settings.allowedPaymentModes || current.allowedPaymentModes || ['PREPAID', 'PARTIAL_COD', 'FULL_COD'],
    partialCodMode: settings.partialCodMode || current.partialCodMode || 'PERCENTAGE',
    partialCodValue: settings.partialCodValue !== undefined ? Number(settings.partialCodValue) : current.partialCodValue,
    minOrderValueForCod: settings.minOrderValueForCod !== undefined ? Number(settings.minOrderValueForCod) : current.minOrderValueForCod,
    prepaidDiscountPercent: settings.prepaidDiscountPercent !== undefined ? Number(settings.prepaidDiscountPercent) : current.prepaidDiscountPercent,
    flowCtaText: settings.flowCtaText || current.flowCtaText || "Enter Delivery Address 📍",
    flowHeaderTitle: settings.flowHeaderTitle || current.flowHeaderTitle || "Confirm Delivery & Payment"
  };

  try {
    if (clientId) {
      const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
      if (client) {
        let existingObj: any = {};
        try { existingObj = JSON.parse(client.customLimitsJson || "{}"); } catch (_) {}
        await prisma.whatsAppClient.update({
          where: { id: clientId },
          data: {
            customLimitsJson: JSON.stringify({ ...existingObj, recoverySettings: updated })
          }
        });
      }
    }
  } catch (err: any) {
    console.error("[saveRecoveryAgentSettings] Error:", err);
  }

  return updated;
}

/**
 * Generate intelligent conversational recovery reply based on customer objection
 * Strictly obeys Admin's allowDiscount policy!
 */
export async function generateRecoveryReply(params: {
  customerName?: string;
  orderDescription?: string;
  amount: number;
  paymentUrl: string;
  customerObjectionType: "PRICE" | "SIZING" | "SHIPPING" | "GENERAL_CHECKIN";
  clientId?: string;
}): Promise<{ replyText: string; offeredDiscount: boolean; finalAmount: number }> {
  const settings = await getRecoveryAgentSettings(params.clientId);
  const name = params.customerName ? params.customerName.trim() : "there";
  const desc = params.orderDescription || "your order";

  if (params.customerObjectionType === "PRICE") {
    // 1. IF Admin authorized discount
    if (settings.allowDiscount && settings.discountPercent > 0) {
      const discountVal = (params.amount * settings.discountPercent) / 100;
      const discountedAmount = Math.round(params.amount - discountVal);

      return {
        replyText: `Hi ${name}! I completely understand. Because we'd love for you to experience our collection, I've authorized a special ${settings.discountPercent}% courtesy benefit (${settings.discountCode}) for your order of ${desc}.\n\nYour revised total is *₹${discountedAmount.toLocaleString('en-IN')}* (saved ₹${Math.round(discountVal).toLocaleString('en-IN')}).\n\nYou can complete your order securely here: ${params.paymentUrl}\n\nLet me know once done so we can prioritize your dispatch today!`,
        offeredDiscount: true,
        finalAmount: discountedAmount
      };
    }

    // 2. IF Admin did NOT authorize discount: NO discount, promote craftsmanship and quality
    const pitch = settings.productValuePitch || "We offer 100% authentic, premium quality products with verified standards, fast nationwide dispatch, and dedicated customer support.";
    return {
      replyText: `Hi ${name}! I completely understand your perspective. We price each item thoughtfully to maintain exceptional quality:\n\n✨ ${pitch}\n\nEvery order includes direct shipment tracking and our dedicated customer support. Since stock is in high demand, would you like me to reserve your order for you?`,
      offeredDiscount: false,
      finalAmount: params.amount
    };
  }

  if (params.customerObjectionType === "SIZING") {
    return {
      replyText: `Hi ${name}! Sizing is super easy — we provide standard true-to-size specifications with easy hassle-free exchange if needed. Would you like me to guide you with details?`,
      offeredDiscount: false,
      finalAmount: params.amount
    };
  }

  if (params.customerObjectionType === "SHIPPING") {
    return {
      replyText: `Hi ${name}! Orders are dispatched quickly via premium express couriers with live SMS and WhatsApp tracking. Typical delivery takes 2–4 business days across India!`,
      offeredDiscount: false,
      finalAmount: params.amount
    };
  }

  // Default friendly check-in
  return {
    replyText: `Hi ${name}! Hope you're having a great day. I noticed your payment link for ${desc} (₹${params.amount.toLocaleString('en-IN')}) is still pending.\n\nDid you run into any issues with the payment gateway, or do you have any questions before completing? I'm here to help!\n\nLink: ${params.paymentUrl}`,
    offeredDiscount: false,
    finalAmount: params.amount
  };
}

/**
 * Generate official Meta Flow JSON (v7.3) with Pincode auto-fill (State & District),
 * selectable city dropdown, full address fields, and customizable payment modes.
 */
export function generateMetaCheckoutFlowJson(settings?: any) {
  const modes = settings?.allowedPaymentModes || ['PREPAID', 'PARTIAL_COD', 'FULL_COD'];
  const paymentOptions: Array<{ id: string; title: string }> = [];

  if (modes.includes('PREPAID')) {
    paymentOptions.push({
      id: "PREPAID",
      title: `100% Online Payment${settings?.prepaidDiscountPercent ? ` (${settings.prepaidDiscountPercent}% Instant Discount)` : ''}`
    });
  }
  if (modes.includes('PARTIAL_COD')) {
    const advDesc = settings?.partialCodMode === 'FIXED'
      ? `₹${settings.partialCodValue || 200} Advance`
      : `${settings?.partialCodValue || 10}% Advance`;
    paymentOptions.push({
      id: "PARTIAL_COD",
      title: `Partial COD (${advDesc} Now, Balance on Delivery)`
    });
  }
  if (modes.includes('FULL_COD')) {
    paymentOptions.push({
      id: "FULL_COD",
      title: "Full Cash on Delivery (100% COD)"
    });
  }
  if (paymentOptions.length === 0) {
    paymentOptions.push({ id: "PREPAID", title: "Pay Online" });
  }

  return {
    version: "6.3",
    data_api_version: "3.0",
    routing_model: {
      PINCODE_SCREEN: ["ADDRESS_PAYMENT_SCREEN"],
      ADDRESS_PAYMENT_SCREEN: []
    },
    screens: [
      {
        id: "PINCODE_SCREEN",
        title: "Step 1: Contact & Pincode",
        data: {
          full_name: { type: "string", __example__: "Customer" },
          phone: { type: "string", __example__: "9306817689" },
          pincode: { type: "string", __example__: "124021" },
          pincode_error: { type: "string", __example__: "" }
        },
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "TextHeading",
              text: "📍 Contact & Delivery Pincode"
            },
            {
              type: "TextInput",
              name: "full_name",
              label: "Full Name",
              required: true,
              "init-value": "${data.full_name}"
            },
            {
              type: "TextInput",
              name: "phone",
              label: "Contact Mobile Number",
              "input-type": "phone",
              required: true,
              "init-value": "${data.phone}"
            },
            {
              type: "TextInput",
              name: "pincode",
              label: "6-Digit Postal Pincode",
              "input-type": "number",
              required: true,
              "init-value": "${data.pincode}"
            },
            {
              type: "TextCaption",
              text: "Mobile number is prefilled. You can edit it if delivering for someone else."
            },
            {
              type: "Footer",
              label: "Verify Pincode & Continue ➡️",
              "on-click-action": {
                name: "data_exchange",
                payload: {
                  action: "pincode_lookup",
                  pincode: "${form.pincode}",
                  full_name: "${form.full_name}",
                  phone: "${form.phone}"
                }
              }
            }
          ]
        }
      },
      {
        id: "ADDRESS_PAYMENT_SCREEN",
        title: "Step 2: Delivery & Payment",
        terminal: true,
        data: {
          full_name: { type: "string", __example__: "Customer" },
          phone: { type: "string", __example__: "9306817689" },
          pincode: { type: "string", __example__: "124021" },
          state: { type: "string", __example__: "Haryana" },
          district: { type: "string", __example__: "Rohtak" },
          region_summary: { type: "string", __example__: "📍 Rohtak, Haryana (PIN: 124021)" },
          order_total_text: { type: "string", __example__: "🛍️ Total Order Amount: ₹2,000" },
          cities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" }
              }
            },
            __example__: [
              { id: "Rohtak H.O", title: "Rohtak H.O" },
              { id: "DLF Colony", title: "DLF Colony" }
            ]
          },
          payment_options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" }
              }
            },
            __example__: paymentOptions
          }
        },
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "TextHeading",
              text: "🏠 Verified Region"
            },
            {
              type: "TextSubheading",
              text: "${data.region_summary}"
            },
            {
              type: "Dropdown",
              name: "city",
              label: "Select Local Area / Post Office",
              required: true,
              "data-source": "${data.cities}"
            },
            {
              type: "TextInput",
              name: "house_flat",
              label: "House / Flat / Floor No., Building",
              required: true
            },
            {
              type: "TextInput",
              name: "street_landmark",
              label: "Street / Colony / Landmark",
              required: true
            },
            {
              type: "TextHeading",
              text: "💳 Payment Method"
            },
            {
              type: "TextSubheading",
              text: "${data.order_total_text}"
            },
            {
              type: "RadioButtonsGroup",
              name: "payment_mode",
              label: "Choose Payment Method",
              required: true,
              "data-source": "${data.payment_options}"
            },
            {
              type: "Footer",
              label: "Confirm & Place Order",
              "on-click-action": {
                name: "complete",
                payload: {
                  full_name: "${data.full_name}",
                  phone: "${data.phone}",
                  pincode: "${data.pincode}",
                  state: "${data.state}",
                  district: "${data.district}",
                  city: "${form.city}",
                  house_flat: "${form.house_flat}",
                  street_landmark: "${form.street_landmark}",
                  payment_mode: "${form.payment_mode}"
                }
              }
            }
          ]
        }
      }
    ]
  };
}

