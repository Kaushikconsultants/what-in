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

async function getAppBaseUrl(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {}
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://what-in.tinkal.in";
}

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

    const appBaseUrl = await getAppBaseUrl();
    const customer = link.conversation?.customer;
    const customerName = customer?.contactPerson || customer?.businessName || "Customer";
    const amount = Number(link.amount) || 0;
    const paymentUrl = link.paymentUrl || `${appBaseUrl}/pay?id=${link.id}`;
    const desc = link.orderId ? `Order #${link.orderId}` : (link.invoiceId ? `Invoice #${link.invoiceId}` : "your order");

    const { replyText, offeredDiscount, finalAmount } = await generateRecoveryReply({
      customerName,
      orderDescription: desc,
      amount,
      paymentUrl,
      customerObjectionType: params.objectionType || "GENERAL_CHECKIN",
      clientId: link.clientId || undefined
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
 * Server Action: Generate official Meta Flow JSON (v7.3) with Pincode auto-fill
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
    const appBaseUrl = await getAppBaseUrl();
    const endpointUrl = `${appBaseUrl}/api/whatsapp/flows/endpoint`;

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

    const appBaseUrl = await getAppBaseUrl();
    const endpointUrl = `${appBaseUrl}/api/whatsapp/flows/endpoint`;
    const flowJson = generateMetaCheckoutFlowJsonLib(settings);

    // Auto-configure 2048-bit RSA Business Encryption for client phoneId if not already set
    const phoneId = client?.phoneId;
    if (phoneId && accessToken) {
      try {
        let kb: any = {};
        try { kb = JSON.parse(client.customLimitsJson || "{}"); } catch (_) {}

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
              data: { customLimitsJson: JSON.stringify(kb) }
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
        endpoint_uri: endpointUrl
      })
    });

    const createData = await createRes.json();
    let flowId = createData.id;

    if (!flowId) {
      const errMsg = createData.error?.message || "Failed to create Flow on Meta Graph API";
      if (errMsg.includes("API access blocked") || createData.error?.code === 200) {
        return {
          success: false,
          error: "Meta API Access Blocked: Your Meta System User token does not have 'whatsapp_business_management' permission, or Flow creation is restricted in this Meta WABA. Please copy the Flow JSON via 'View Flow JSON' and paste it directly into Meta Business Suite > WhatsApp Manager > Flows > JSON Editor."
        };
      }
      return { success: false, error: errMsg };
    }

    // 2. Upload Flow Asset (flow.json)
    const formData = new FormData();
    const jsonStr = JSON.stringify(flowJson);
    const blob = new Blob([Buffer.from(jsonStr, "utf-8")], { type: "application/json" });
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

    // 3. Publish Flow (or keep in Draft mode if integrity review is pending)
    let isPublished = false;
    let publishNotice = "";
    try {
      const pubRes = await fetch(`https://graph.facebook.com/v21.0/${flowId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      const pubData = await pubRes.json();
      if (pubData.success) {
        isPublished = true;
      } else if (pubData.error?.error_subcode === 4233020 || pubData.error?.message?.includes("Integrity")) {
        publishNotice = "(Flow is active in Draft/Testing mode; Meta requires WABA integrity completion for broadcast publication).";
      } else if (pubData.error) {
        publishNotice = `(${pubData.error.message || pubData.error.error_user_msg || "Draft mode active"})`;
      }
    } catch {
      publishNotice = "(Draft mode active)";
    }

    // 4. Save to Database & Settings
    const targetClientId = client.id;
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
        clientId: targetClientId,
        flowId: String(flowId),
        name: "Catalog Delivery Address & Payment",
        description: "Official Meta Checkout Flow for address collection, pincode auto-fill, and payment preference.",
        screenName: "PINCODE_SCREEN",
        ctaText: settings.flowCtaText || "Enter Delivery Address 📍",
        formSchema: JSON.stringify(flowJson)
      }
    }).catch(() => null);

    // Save numeric metaFlowId to Recovery Agent Settings for this specific client
    await savePaymentRecoverySettingsAction({
      ...settings,
      metaFlowId: String(flowId)
    }, targetClientId);

    return {
      success: true,
      flowId: String(flowId),
      flowJson: JSON.stringify(flowJson, null, 2),
      message: isPublished 
        ? `Meta WhatsApp Flow published successfully! Flow ID: ${flowId}`
        : `Meta Flow created & validated successfully (Flow ID: ${flowId}) ${publishNotice}`
    };
  } catch (err: any) {
    console.error("[Create/Publish Meta Flow Error]:", err);
    return {
      success: false,
      error: err.message || "Failed to publish Flow on Meta"
    };
  }
}

// ---------------------------------------------------------
// DIRECT PUBLISH META FLOW TO LIVE (CALLS POST /{flow-id}/publish)
// ---------------------------------------------------------
export async function publishMetaFlowDirectAction(flowIdToPublish?: string, explicitClientId?: string) {
  try {
    const user = await getAuthenticatedUser().catch(() => null);
    let client: any = null;
    if (explicitClientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: explicitClientId } });
    } else if (user?.clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    } else if (user?.email) {
      client = await prisma.whatsAppClient.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { adminEmail: user.email },
            { agents: { some: { email: user.email } } }
          ]
        }
      });
    }

    if (!client || !client.metaAccessToken) {
      return { success: false, error: "Meta Access Token not found. Please connect your API credentials in API Settings first." };
    }

    const accessToken = client.metaAccessToken;
    let targetFlowId = flowIdToPublish;
    if (!targetFlowId) {
      let customLimits: any = {};
      try {
        if (client.customLimitsJson) customLimits = JSON.parse(client.customLimitsJson);
      } catch {}
      targetFlowId = customLimits?.recoverySettings?.metaFlowId;
    }

    if (!targetFlowId || isNaN(Number(targetFlowId))) {
      return { success: false, error: "No valid numeric Meta Flow ID provided to publish." };
    }

    // Call Meta's Publish Endpoint
    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${targetFlowId}/publish`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const pubData = await pubRes.json();

    // Query Real-Time Status on Meta
    const statusRes = await fetch(`https://graph.facebook.com/v21.0/${targetFlowId}?fields=id,name,status,categories,validation_errors`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${accessToken}` }
    }).catch(() => null);
    const statusData = statusRes ? await statusRes.json().catch(() => ({})) : {};

    const liveStatus = statusData?.status || (pubData?.success ? "PUBLISHED" : "DRAFT");

    if (pubData.success || liveStatus === "PUBLISHED") {
      await prisma.whatsAppMetaFlow.updateMany({
        where: { flowId: String(targetFlowId) },
        data: { name: statusData?.name || "Catalog Delivery Address & Payment" }
      }).catch(() => null);

      return {
        success: true,
        isPublished: true,
        status: "PUBLISHED",
        flowId: String(targetFlowId),
        message: `🎉 Meta Flow (ID: ${targetFlowId}) is now LIVE and PUBLISHED on Meta!`
      };
    }

    const errMsg = pubData.error?.message || pubData.error?.error_user_msg || "Meta rejected publish request";
    const subcode = pubData.error?.error_subcode;

    if (subcode === 4233020 || errMsg.includes("Integrity")) {
      return {
        success: false,
        isPublished: false,
        status: "DRAFT",
        flowId: String(targetFlowId),
        error: `Meta Integrity Hold: Meta requires WABA verification or messaging tier maturity before public broadcast of Flow ${targetFlowId}. The Flow is currently in active DRAFT / Testing mode.`
      };
    }

    return {
      success: false,
      isPublished: false,
      status: liveStatus,
      flowId: String(targetFlowId),
      error: `Meta Publish Error: ${errMsg}`
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to publish Flow on Meta"
    };
  }
}

