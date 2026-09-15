'use server';

import { 
  getRecoveryAgentSettings, 
  saveRecoveryAgentSettings, 
  generateRecoveryReply, 
  RecoveryAgentSettings 
} from "@/lib/paymentRecoveryAgent";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

export async function getPaymentRecoverySettingsAction() {
  try {
    const settings = await getRecoveryAgentSettings();
    return { success: true, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function savePaymentRecoverySettingsAction(settings: Partial<RecoveryAgentSettings>) {
  try {
    const updated = await saveRecoveryAgentSettings(settings);
    return { 
      success: true, 
      settings: updated,
      message: "Recovery agent settings saved successfully." 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendConversationalPaymentRecoveryAction(params: {
  paymentLinkId: string;
  objectionType?: "PRICE" | "SIZING" | "SHIPPING" | "GENERAL_CHECKIN";
}) {
  try {
    const link = await prisma.whatsAppPaymentLink.findUnique({
      where: { id: params.paymentLinkId },
      include: {
        conversation: { include: { customer: true } }
      }
    });

    if (!link) {
      return { success: false, error: "Payment link record not found." };
    }

    if (link.status === "PAID") {
      return { success: false, error: "Payment is already marked as PAID." };
    }

    const customer = link.conversation?.customer;
    const customerName = customer?.contactPerson || customer?.businessName || "Customer";
    const amount = Number(link.amount) || 0;
    const paymentUrl = link.paymentUrl || "https://whatsapp.esponsports.com/pay";
    const desc = link.orderId ? `Order #${link.orderId}` : (link.invoiceId ? `Invoice #${link.invoiceId}` : "your order");

    const { replyText, offeredDiscount, finalAmount } = await generateRecoveryReply({
      customerName,
      orderDescription: desc,
      amount,
      paymentUrl,
      customerObjectionType: params.objectionType || "GENERAL_CHECKIN"
    });

    // Send the WhatsApp recovery message
    if (link.conversationId) {
      await sendWhatsAppMessageAction({
        conversationId: link.conversationId,
        senderType: "AI",
        senderName: "Payment Recovery Concierge",
        messageType: "TEXT",
        content: replyText
      });
    }

    return {
      success: true,
      message: "Conversational recovery message sent to customer.",
      replyText,
      offeredDiscount,
      finalAmount
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
