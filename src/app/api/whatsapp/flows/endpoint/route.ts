import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { lookupPincode } from "@/lib/pincodeLookup";
import { prisma } from "@/lib/prisma";
import { getRecoveryAgentSettings } from "@/lib/paymentRecoveryAgent";

// GET handler for healthcheck / webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: "active",
    service: "Meta WhatsApp Flows Data Exchange Endpoint",
    version: "3.1",
    timestamp: new Date().toISOString()
  });
}

// Helper: Decrypt Meta Flows encrypted payload if encryption is used
function decryptFlowRequest(body: any, privateKeyPem?: string) {
  if (!body.encrypted_flow_data || !body.encrypted_aes_key || !body.initial_vector) {
    // Unencrypted / direct JSON payload (e.g. during dev/testing)
    return { decrypted: body, aesKey: null, iv: null };
  }

  if (!privateKeyPem) {
    throw new Error("Private key is required to decrypt Meta Flow request");
  }

  const encryptedAesKey = Buffer.from(body.encrypted_aes_key, "base64");
  const iv = Buffer.from(body.initial_vector, "base64");
  const encryptedFlowData = Buffer.from(body.encrypted_flow_data, "base64");

  // Decrypt AES Key using RSA-OAEP with SHA-256
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    encryptedAesKey
  );

  // Decrypt flow data using AES-128-GCM
  const tagLength = 16;
  const ciphertext = encryptedFlowData.subarray(0, encryptedFlowData.length - tagLength);
  const authTag = encryptedFlowData.subarray(encryptedFlowData.length - tagLength);

  const decipher = crypto.createDecipheriv("aes-128-gcm", decryptedAesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const parsedData = JSON.parse(decrypted.toString("utf-8"));

  return { decrypted: parsedData, aesKey: decryptedAesKey, iv };
}

// Helper: Encrypt response if request was encrypted
function encryptFlowResponse(responseJson: any, aesKey: Buffer | null, originalIv: Buffer | null) {
  if (!aesKey || !originalIv) {
    return responseJson;
  }

  // Invert IV for response as specified in Meta WhatsApp Flows protocol
  const flippedIv = Buffer.from(originalIv);
  for (let i = 0; i < flippedIv.length; i++) {
    flippedIv[i] = ~flippedIv[i];
  }

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedIv);
  const plaintext = Buffer.from(JSON.stringify(responseJson), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedData = Buffer.concat([ciphertext, authTag]);
  return encryptedData.toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // Check if private key exists in DB or environment
    let privateKeyPem = process.env.META_FLOWS_PRIVATE_KEY;
    if (!privateKeyPem) {
      const clientWithKey = await prisma.whatsAppClient.findFirst({
        where: { aiKnowledgeBase: { contains: "metaFlowPrivateKey" } }
      }).catch(() => null);
      if (clientWithKey?.aiKnowledgeBase) {
        try {
          const parsed = JSON.parse(clientWithKey.aiKnowledgeBase);
          if (parsed.metaFlowPrivateKey) privateKeyPem = parsed.metaFlowPrivateKey;
        } catch (_) {}
      }
    }

    let decryptedPayload: any;
    let aesKey: Buffer | null = null;
    let iv: Buffer | null = null;

    try {
      const res = decryptFlowRequest(rawBody, privateKeyPem);
      decryptedPayload = res.decrypted;
      aesKey = res.aesKey;
      iv = res.iv;
    } catch (decryptErr: any) {
      console.warn("[Flows Endpoint] Decryption fallback/error:", decryptErr.message);
      decryptedPayload = rawBody;
    }

    const { action, screen, data, flow_token } = decryptedPayload;

    console.log(`[WhatsApp Flows Endpoint] Received action: "${action}", screen: "${screen}"`);

    // 1. Meta Health Check / Ping
    if (action === "ping") {
      const response = {
        data: {
          status: "active"
        }
      };
      return aesKey
        ? new NextResponse(encryptFlowResponse(response, aesKey, iv), { status: 200 })
        : NextResponse.json(response);
    }

    // Resolve client recovery settings for dynamic payment amounts
    const targetClient = (await prisma.whatsAppClient.findFirst().catch(() => null));
    const settings = await getRecoveryAgentSettings(targetClient?.id).catch(() => ({
      allowedPaymentModes: ['PREPAID', 'PARTIAL_COD', 'FULL_COD'],
      partialCodMode: 'FIXED',
      partialCodValue: 200,
      prepaidDiscountPercent: 5,
      minOrderValueForCod: 0
    } as any));

    // Extract order total from flow_token (format: order_convId_AMOUNT_timestamp) or request data
    let orderTotal = 0;
    if (flow_token) {
      const tokenMatch = flow_token.match(/_(\d+(?:\.\d+)?)_/);
      if (tokenMatch) {
        orderTotal = Math.round(Number(tokenMatch[1]));
      }
    }
    if (!orderTotal && data?.order_total) {
      orderTotal = Math.round(Number(data.order_total));
    }

    const modes = settings.allowedPaymentModes || ['PREPAID', 'PARTIAL_COD', 'FULL_COD'];
    const dynamicPaymentOptions: Array<{ id: string; title: string }> = [];

    if (modes.includes('PREPAID')) {
      let finalPrepaid = orderTotal;
      let discountText = "";
      if (settings.prepaidDiscountPercent > 0 && orderTotal > 0) {
        const disc = Math.round((orderTotal * settings.prepaidDiscountPercent) / 100);
        finalPrepaid = Math.max(1, orderTotal - disc);
        discountText = ` (Saved ₹${disc.toLocaleString('en-IN')} - ${settings.prepaidDiscountPercent}% OFF)`;
      }
      dynamicPaymentOptions.push({
        id: "PREPAID",
        title: orderTotal > 0
          ? `100% Online: ₹${finalPrepaid.toLocaleString('en-IN')}${discountText}`
          : `100% Online Payment${settings.prepaidDiscountPercent ? ` (${settings.prepaidDiscountPercent}% OFF)` : ''}`
      });
    }

    if (modes.includes('PARTIAL_COD')) {
      let advanceAmount = 0;
      if (settings.partialCodMode === 'FIXED') {
        advanceAmount = Math.min(orderTotal || 200, settings.partialCodValue || 200);
      } else {
        advanceAmount = Math.round(((orderTotal || 1000) * (settings.partialCodValue || 10)) / 100);
      }
      const codBalance = Math.max(0, (orderTotal || 1000) - advanceAmount);
      dynamicPaymentOptions.push({
        id: "PARTIAL_COD",
        title: orderTotal > 0
          ? `Partial COD: ₹${advanceAmount.toLocaleString('en-IN')} Advance (₹${codBalance.toLocaleString('en-IN')} on Delivery)`
          : `Partial COD (${settings.partialCodMode === 'FIXED' ? `₹${settings.partialCodValue || 200}` : `${settings.partialCodValue || 10}%`} Advance Now)`
      });
    }

    if (modes.includes('FULL_COD')) {
      dynamicPaymentOptions.push({
        id: "FULL_COD",
        title: orderTotal > 0
          ? `Full Cash on Delivery: Pay ₹${orderTotal.toLocaleString('en-IN')} on Delivery`
          : "Full Cash on Delivery (100% COD)"
      });
    }

    if (dynamicPaymentOptions.length === 0) {
      dynamicPaymentOptions.push({ id: "PREPAID", title: "100% Online Payment" });
    }

    const orderTotalText = orderTotal > 0
      ? `🛍️ Total Order Amount: ₹${orderTotal.toLocaleString('en-IN')}`
      : "🛍️ Select Delivery Payment Preference";

    // 2. Initial Flow Ping / Screen INIT
    if (action === "INIT" || action === "ping") {
      const response = {
        version: "7.3",
        screen: "PINCODE_SCREEN",
        data: {
          full_name: data?.full_name || "",
          phone: data?.phone || "",
          pincode: data?.pincode || "",
          pincode_error: ""
        }
      };
      return aesKey
        ? new NextResponse(encryptFlowResponse(response, aesKey, iv), { status: 200 })
        : NextResponse.json(response);
    }

    // 3. Dynamic Data Exchange (User entered Pincode or changed fields)
    if (action === "data_exchange") {
      const rawPincode = data?.pincode || data?.pin_code || data?.postal_code || "";
      const pincode = String(rawPincode).replace(/\D/g, "").slice(0, 6);
      const targetScreen = screen === "CHECKOUT_SCREEN" ? "CHECKOUT_SCREEN" : "ADDRESS_PAYMENT_SCREEN";

      if (pincode.length === 6) {
        const pinLookup = await lookupPincode(pincode);

        if (pinLookup.valid) {
          const rawCities = (pinLookup.cities || []).slice(0, 30);
          const citiesList = rawCities.length > 0
            ? rawCities
            : [{ id: pinLookup.city || pinLookup.district || "LOCAL", title: pinLookup.city || pinLookup.district || "Local Area" }];

          const response = {
            version: "7.3",
            screen: targetScreen,
            data: {
              full_name: data?.full_name || "",
              phone: data?.phone || "",
              pincode: pincode,
              state: pinLookup.state || "",
              district: pinLookup.district || pinLookup.city || "",
              region_summary: `📍 ${pinLookup.district}, ${pinLookup.state} (PIN: ${pincode})`,
              order_total_text: orderTotalText,
              city: citiesList[0]?.id || "",
              cities: citiesList,
              payment_options: dynamicPaymentOptions,
              is_cities_available: true,
              pincode_status: `✅ ${pinLookup.district}, ${pinLookup.state}`
            }
          };

          return aesKey
            ? new NextResponse(encryptFlowResponse(response, aesKey, iv), { status: 200 })
            : NextResponse.json(response);
        } else {
          const response = {
            version: "7.3",
            screen: targetScreen,
            data: {
              full_name: data?.full_name || "",
              phone: data?.phone || "",
              pincode: pincode,
              state: "",
              district: "",
              region_summary: "📍 Pincode not found",
              order_total_text: orderTotalText,
              city: "",
              cities: [{ id: "DEFAULT", title: "Pincode Not Found" }],
              payment_options: dynamicPaymentOptions,
              is_cities_available: false,
              pincode_status: "❌ Pincode not found. Please verify."
            }
          };
          return aesKey
            ? new NextResponse(encryptFlowResponse(response, aesKey, iv), { status: 200 })
            : NextResponse.json(response);
        }
      }

      // Default fallback if pincode not 6 digits yet
      const response = {
        version: "7.3",
        screen: targetScreen,
        data: {
          full_name: data?.full_name || "",
          phone: data?.phone || "",
          pincode: pincode,
          state: "",
          district: "",
          region_summary: "📍 Enter 6-digit postal pincode",
          order_total_text: orderTotalText,
          city: "",
          cities: [{ id: "DEFAULT", title: "Enter Pincode Above" }],
          payment_options: dynamicPaymentOptions,
          is_cities_available: false,
          pincode_status: "Enter 6-digit Pincode"
        }
      };
      return aesKey
        ? new NextResponse(encryptFlowResponse(response, aesKey, iv), { status: 200 })
        : NextResponse.json(response);
    }

    // Default catch-all response
    const defaultResponse = {
      version: "3.1",
      screen: screen || "CHECKOUT_SCREEN",
      data: {
        ...(data || {}),
        status: "ok"
      }
    };

    return aesKey
      ? new NextResponse(encryptFlowResponse(defaultResponse, aesKey, iv), { status: 200 })
      : NextResponse.json(defaultResponse);
  } catch (err: any) {
    console.error("[WhatsApp Flows Endpoint Error]:", err);
    return NextResponse.json(
      {
        version: "3.1",
        screen: "CHECKOUT_SCREEN",
        data: {
          error_message: err.message || "Failed to process flow request"
        }
      },
      { status: 500 }
    );
  }
}
