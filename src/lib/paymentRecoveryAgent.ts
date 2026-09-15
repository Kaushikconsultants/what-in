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
  productValuePitch: "Each piece is crafted from 100% premium combed cotton with heavy GSM durability, reinforced stitching, and a 7-day hassle-free exchange promise. Our limited-edition batches sell out quickly, ensuring exclusivity.",
  autoCatalogPaymentEnabled: true, // Enabled by default
  autoCatalogDeliveryMethod: "both"
};

export async function getRecoveryAgentSettings(): Promise<RecoveryAgentSettings> {
  try {
    const dbSettings = await prisma.whatsAppSettings.findFirst();
    if (dbSettings && (dbSettings as any).aiKnowledgeBase) {
      const parsed = JSON.parse((dbSettings as any).aiKnowledgeBase || "{}");
      if (parsed.recoverySettings) {
        return { ...DEFAULT_SETTINGS, ...parsed.recoverySettings };
      }
    }
  } catch (_) {}

  return globalThis.__recoverySettings || DEFAULT_SETTINGS;
}

export async function saveRecoveryAgentSettings(settings: Partial<RecoveryAgentSettings>): Promise<RecoveryAgentSettings> {
  const current = await getRecoveryAgentSettings();
  const updated: RecoveryAgentSettings = {
    ...current,
    ...settings,
    allowDiscount: settings.allowDiscount !== undefined ? Boolean(settings.allowDiscount) : current.allowDiscount,
    autoCatalogPaymentEnabled: settings.autoCatalogPaymentEnabled !== undefined ? Boolean(settings.autoCatalogPaymentEnabled) : current.autoCatalogPaymentEnabled,
    autoCatalogDeliveryMethod: settings.autoCatalogDeliveryMethod || current.autoCatalogDeliveryMethod || 'both'
  };

  globalThis.__recoverySettings = updated;

  try {
    const dbSettings = await prisma.whatsAppSettings.findFirst();
    if (dbSettings) {
      let existingObj = {};
      try {
        existingObj = JSON.parse((dbSettings as any).aiKnowledgeBase || "{}");
      } catch (_) {}

      await prisma.whatsAppSettings.update({
        where: { id: dbSettings.id },
        data: {
          aiKnowledgeBase: JSON.stringify({ ...existingObj, recoverySettings: updated })
        }
      });
    }
  } catch (_) {}

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
}): Promise<{ replyText: string; offeredDiscount: boolean; finalAmount: number }> {
  const settings = await getRecoveryAgentSettings();
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
    const pitch = settings.productValuePitch || DEFAULT_SETTINGS.productValuePitch;
    return {
      replyText: `Hi ${name}! I completely understand your perspective. We price each piece thoughtfully so we never have to compromise on quality:\n\n✨ ${pitch}\n\nEvery order includes direct shipment tracking and our dedicated customer support. Since this collection is produced in small, limited batches to maintain high standards, would you like me to hold your reserved piece for the next 30 minutes?`,
      offeredDiscount: false,
      finalAmount: params.amount
    };
  }

  if (params.customerObjectionType === "SIZING") {
    return {
      replyText: `Hi ${name}! Sizing is super easy — our garments are tailored to standard true-to-size Indian regular/oversized fits with pre-shrunk premium fabric. Plus, we provide a 100% free, 7-day hassle-free size exchange if it doesn't fit like a glove! Would you like me to guide you on measurements?`,
      offeredDiscount: false,
      finalAmount: params.amount
    };
  }

  if (params.customerObjectionType === "SHIPPING") {
    return {
      replyText: `Hi ${name}! Orders are dispatched within 24–48 hours via premium express couriers (Bluedart, Delhivery) with live SMS and WhatsApp tracking. Typical delivery takes 2–4 business days across India!`,
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
