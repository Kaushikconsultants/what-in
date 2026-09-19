'use server';

import { 
  getRecoveryAgentSettings, 
  saveRecoveryAgentSettings, 
  generateRecoveryReply, 
  generateMetaCheckoutFlowJson as generateMetaCheckoutFlowJsonLib,
  RecoveryAgentSettings 
} from "@/lib/paymentRecoveryAgent";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";
import { getAuthenticatedUser } from "@/lib/authSession";

export async function getPaymentRecoverySettingsAction(clientOverrideId?: string) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const clientId = clientOverrideId || user?.clientId;
    const settings = await getRecoveryAgentSettings(clientId);
    return { success: true, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function savePaymentRecoverySettingsAction(settings: Partial<RecoveryAgentSettings>, clientOverrideId?: string) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const clientId = clientOverrideId || user?.clientId;
    const updated = await saveRecoveryAgentSettings(settings, clientId);
    return { 
      success: true, 
      settings: updated,
      message: "Recovery agent & checkout flow settings saved successfully." 
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

/**
 * Server Action: Generate official Meta Flow JSON (v3.1) with Pincode auto-fill
 */
export async function generateMetaCheckoutFlowJson(settings?: any) {
  return generateMetaCheckoutFlowJsonLib(settings);
}

export async function getCheckoutFlowDetailsAction(clientOverrideId?: string) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const clientId = clientOverrideId || user?.clientId;
    const settings = await getRecoveryAgentSettings(clientId);
    const flowJsonObj = generateMetaCheckoutFlowJson(settings);
    const endpointUrl = "https://whatsapp.esponsports.com/api/whatsapp/flows/endpoint";

    return {
      success: true,
      metaFlowId: settings.metaFlowId || "",
      flowJson: JSON.stringify(flowJsonObj, null, 2),
      endpointUrl
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      metaFlowId: "",
      flowJson: "{}",
      endpointUrl: ""
    };
  }
}

export async function createOrPublishMetaCheckoutFlowAction(clientOverrideId?: string) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    const clientId = clientOverrideId || user?.clientId;
    const settings = await getRecoveryAgentSettings(clientId);

    // Get Meta API credentials for this client
    let client: any = null;
    if (clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    } else {
      client = await prisma.whatsAppClient.findFirst();
    }

    const accessToken = client?.metaAccessToken;
    const wabaId = client?.wabaId;

    if (!accessToken || !wabaId || accessToken.startsWith("EAAG...meta")) {
      return {
        success: false,
        error: "WhatsApp API is not connected with a valid Access Token and WABA ID. Please configure credentials in Settings > WhatsApp API first."
      };
    }

    const flowJson = generateMetaCheckoutFlowJson(settings);

    // Auto-configure 2048-bit RSA Business Encryption for client phoneId if not already set
    const phoneId = client?.phoneId;
    if (phoneId && accessToken) {
      try {
        let kb: any = {};
        try { kb = JSON.parse(client.aiKnowledgeBase || "{}"); } catch (_) {}

        if (!kb.metaFlowPrivateKey) {
          const crypto = await import("crypto");
          const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" }
          });

          const encRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_encryption`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ business_public_key: publicKey })
          });
          const encData = await encRes.json();
          if (encData.success) {
            kb.metaFlowPrivateKey = privateKey;
            await prisma.whatsAppClient.update({
              where: { id: client.id },
              data: { aiKnowledgeBase: JSON.stringify(kb) }
            });
          }
        }
      } catch (keyErr: any) {
        console.warn("[Auto Flow Key Pair Setup Notice]:", keyErr?.message);
      }
    }

    // 1. Create or query flow on Meta Graph API
    const createUrl = `https://graph.facebook.com/v21.0/${wabaId}/flows`;
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: `checkout_address_flow_${Date.now().toString().slice(-6)}`,
        categories: ["OTHER"],
        endpoint_uri: "https://whatsapp.esponsports.com/api/whatsapp/flows/endpoint"
      })
    });

    const createData = await createRes.json();
    let flowId = createData.id;

    if (!flowId) {
      throw new Error(createData.error?.message || "Failed to create Flow on Meta Graph API");
    }

    // 2. Upload Flow Asset (flow.json)
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(flowJson)], { type: "application/json" });
    formData.append("file", blob, "flow.json");
    formData.append("name", "flow.json");
    formData.append("asset_type", "FLOW_JSON");

    const assetRes = await fetch(`https://graph.facebook.com/v21.0/${flowId}/assets`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: formData
    });
    const assetData = await assetRes.json();
    if (assetData.error || (assetData.validation_errors && assetData.validation_errors.length > 0)) {
      const errDetail = assetData.validation_errors
        ? assetData.validation_errors.map((e: any) => `${e.error}: ${e.message}`).join(" | ")
        : assetData.error?.message;
      throw new Error(`Meta Flow JSON validation rejected: ${errDetail}`);
    }

    // 3. Publish Flow
    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${flowId}/publish`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const pubData = await pubRes.json();
    if (pubData.error) {
      throw new Error(`Meta Flow publish rejected: ${pubData.error.message || pubData.error.error_user_msg}`);
    }

    // 4. Save to Database & Settings
    await prisma.whatsAppMetaFlow.upsert({
      where: { id: `checkout_flow_${flowId}` },
      update: {
        flowId: String(flowId),
        name: "Catalog Delivery Address & Payment",
        screenName: "PINCODE_SCREEN",
        formSchema: JSON.stringify(flowJson)
      },
      create: {
        id: `checkout_flow_${flowId}`,
        clientId: clientId || undefined,
        flowId: String(flowId),
        name: "Catalog Delivery Address & Payment",
        description: "Official Meta Checkout Flow for address collection, pincode auto-fill, and payment preference.",
        screenName: "PINCODE_SCREEN",
        ctaText: settings.flowCtaText || "Enter Delivery Address 📍",
        formSchema: JSON.stringify(flowJson)
      }
    }).catch(() => null);

    // Save numeric metaFlowId to Recovery Agent Settings
    await savePaymentRecoverySettingsAction({
      ...settings,
      metaFlowId: String(flowId)
    }, clientId);

    return {
      success: true,
      flowId: String(flowId),
      flowJson: JSON.stringify(flowJson, null, 2),
      message: `Meta WhatsApp Flow published successfully! Flow ID: ${flowId}`
    };
  } catch (err: any) {
    console.error("[Create/Publish Meta Flow Error]:", err);
    return {
      success: false,
      error: err.message || "Failed to publish Flow on Meta"
    };
  }
}
