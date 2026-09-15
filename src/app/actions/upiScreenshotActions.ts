'use server';

import { prisma } from "@/lib/prisma";
import { analyzeUpiPaymentScreenshot, UpiScreenshotAnalysis } from "@/lib/geminiUpiVision";
import { emitInboxEvent } from "@/lib/inboxEvents";

export async function processUpiScreenshotAction(params: {
  conversationId: string;
  mediaId?: string;
  mediaBase64?: string;
  mimeType?: string;
  caption?: string;
}) {
  try {
    const { conversationId, mediaId, mediaBase64, mimeType = "image/jpeg" } = params;

    // 1. Resolve image Base64
    let base64 = mediaBase64 || "";
    if (!base64 && mediaId) {
      // Fetch media using Meta Graph API with tenant fallback
      const conv = conversationId
        ? await prisma.whatsAppConversation.findUnique({
            where: { id: conversationId },
            include: { client: true }
          }).catch(() => null)
        : null;
      const account = await prisma.whatsAppAccount.findFirst();
      const token = (conv?.client as any)?.metaAccessToken || account?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
      if (token) {
        const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          if (metaJson.url) {
            const imgRes = await fetch(metaJson.url, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              base64 = Buffer.from(arrayBuf).toString("base64");
            }
          }
        }
      }
    }

    if (!base64) {
      return { success: false, error: "Could not retrieve image data for analysis." };
    }

    // 2. Query Gemini Vision for OCR & Anti-Fraud analysis
    const analysis: UpiScreenshotAnalysis = await analyzeUpiPaymentScreenshot(base64, mimeType);

    if (!analysis.isPaymentScreenshot) {
      return {
        success: true,
        isPaymentScreenshot: false,
        message: "Image analyzed: Not recognized as a payment receipt."
      };
    }

    // 3. Find active PENDING payment link for this conversation
    const pendingLink = await prisma.whatsAppPaymentLink.findFirst({
      where: {
        conversationId,
        status: "PENDING"
      },
      orderBy: { createdAt: "desc" },
      include: {
        conversation: { include: { customer: true } }
      }
    });

    const ocrPayload = {
      ...analysis,
      mediaId,
      mediaUrl: mediaId ? `/api/whatsapp/media/${mediaId}` : null,
      analyzedAt: new Date().toISOString()
    };

    if (pendingLink) {
      // Attach extracted UTR and KEEP status PENDING for agent review
      await prisma.whatsAppPaymentLink.update({
        where: { id: pendingLink.id },
        data: {
          transactionId: analysis.utrNumber || pendingLink.transactionId
        }
      });
    }

    // 4. Emit instant inbox & payment event for live UI update
    emitInboxEvent({
      type: "PAYMENT_OCR_DETECTED",
      conversationId,
      clientId: pendingLink?.clientId || null,
      paymentLinkId: pendingLink?.id || null,
      ocrData: ocrPayload
    });

    return {
      success: true,
      isPaymentScreenshot: true,
      analysis: ocrPayload,
      paymentLinkId: pendingLink?.id || null,
      message: `UPI payment screenshot detected (${analysis.paymentApp || 'UPI'}). UTR: ${analysis.utrNumber || 'Pending'}. Prefilled for verification.`
    };
  } catch (err: any) {
    console.error("[UPI Vision Action Error]:", err);
    return {
      success: false,
      error: err.message || "Failed to process payment screenshot."
    };
  }
}
