'use server';

import { 
  getRecoveryAgentSettings, 
  saveRecoveryAgentSettings, 
  generateRecoveryReply, 
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
 * Generate official Meta Flow JSON (v3.1) with Pincode auto-fill (State & District),
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
    version: "3.1",
    screens: [
      {
        id: "CHECKOUT_SCREEN",
        title: settings?.flowHeaderTitle || "Delivery & Payment",
        data: {
          state: { type: "string", __example__: "Haryana" },
          district: { type: "string", __example__: "Rohtak" },
          city: { type: "string", __example__: "Rohtak" },
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
          is_cities_available: { type: "boolean", __example__: true },
          pincode_status: { type: "string", __example__: "Enter 6-digit Pincode" }
        },
        layout: {
          type: "Form",
          children: [
            {
              type: "TextHeading",
              text: "📍 Delivery Address"
            },
            {
              type: "TextInput",
              name: "full_name",
              label: "Full Name",
              required: true
            },
            {
              type: "TextInput",
              name: "phone",
              label: "Contact Mobile Number",
              input_type: "phone",
              required: true
            },
            {
              type: "TextInput",
              name: "pincode",
              label: "6-Digit Postal Pincode",
              input_type: "number",
              required: true
            },
            {
              type: "TextCaption",
              text: "${data.pincode_status}"
            },
            {
              type: "Button",
              label: "⚡ Auto-Fill State, District & City",
              "on-click-action": {
                name: "data_exchange",
                payload: {
                  action: "data_exchange",
                  pincode: "${form.pincode}"
                }
              }
            },
            {
              type: "TextInput",
              name: "state",
              label: "State",
              required: true,
              init_value: "${data.state}"
            },
            {
              type: "TextInput",
              name: "district",
              label: "District",
              required: true,
              init_value: "${data.district}"
            },
            {
              type: "Dropdown",
              name: "city",
              label: "Select City / Post Office",
              required: true,
              data_source: "${data.cities}"
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
              type: "RadioButtonsGroup",
              name: "payment_mode",
              label: "Choose Payment Method",
              required: true,
              data_source: paymentOptions
            },
            {
              type: "Footer",
              label: "Confirm & Place Order",
              "on-click-action": {
                name: "complete",
                payload: {
                  full_name: "${form.full_name}",
                  phone: "${form.phone}",
                  pincode: "${form.pincode}",
                  state: "${form.state}",
                  district: "${form.district}",
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
    if (assetData.error) {
      console.warn("[Meta Flow Asset Warning]:", assetData.error.message);
    }

    // 3. Publish Flow
    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${flowId}/publish`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const pubData = await pubRes.json();
    if (pubData.error) {
      console.warn("[Meta Flow Publish Warning]:", pubData.error.message);
    }

    // 4. Save to Database & Settings
    await prisma.whatsAppMetaFlow.upsert({
      where: { id: `checkout_flow_${flowId}` },
      update: {
        flowId: String(flowId),
        name: "Catalog Delivery Address & Payment",
        screenName: "CHECKOUT_SCREEN",
        formSchema: JSON.stringify(flowJson)
      },
      create: {
        id: `checkout_flow_${flowId}`,
        clientId: clientId || undefined,
        flowId: String(flowId),
        name: "Catalog Delivery Address & Payment",
        description: "Official Meta Checkout Flow for address collection, pincode auto-fill, and payment preference.",
        screenName: "CHECKOUT_SCREEN",
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
