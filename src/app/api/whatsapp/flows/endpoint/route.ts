import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { lookupPincode } from "@/lib/pincodeLookup";
import { prisma } from "@/lib/prisma";

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
      const storedKey = await prisma.companySettings.findFirst({
        select: { metaFlowPrivateKey: true } as any
      }).catch(() => null);
      if (storedKey && (storedKey as any).metaFlowPrivateKey) {
        privateKeyPem = (storedKey as any).metaFlowPrivateKey;
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

    // 2. Screen Initial Load (INIT)
    if (action === "INIT") {
      const response = {
        version: "3.1",
        screen: "CHECKOUT_SCREEN",
        data: {
          state: "",
          district: "",
          city: "",
          cities: [],
          is_cities_available: false,
          pincode_status: "Enter 6-digit Pincode to auto-fill State & District"
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

      if (pincode.length === 6) {
        const pinLookup = await lookupPincode(pincode);

        if (pinLookup.valid) {
          const citiesList = (pinLookup.cities || []).slice(0, 20);
          const response = {
            version: "3.1",
            screen: "CHECKOUT_SCREEN",
            data: {
              state: pinLookup.state || "",
              district: pinLookup.district || pinLookup.city || "",
              city: citiesList[0]?.id || pinLookup.city || "",
              cities: citiesList,
              is_cities_available: citiesList.length > 0,
              pincode_status: `✅ ${pinLookup.district}, ${pinLookup.state}`
            }
          };

          return aesKey
            ? new NextResponse(encryptFlowResponse(response, aesKey, iv), { status: 200 })
            : NextResponse.json(response);
        } else {
          const response = {
            version: "3.1",
            screen: "CHECKOUT_SCREEN",
            data: {
              state: "",
              district: "",
              city: "",
              cities: [],
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
        version: "3.1",
        screen: "CHECKOUT_SCREEN",
        data: {
          state: data?.state || "",
          district: data?.district || "",
          city: data?.city || "",
          cities: data?.cities || [],
          is_cities_available: Boolean(data?.cities?.length),
          pincode_status: "Please enter a valid 6-digit Pincode"
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
