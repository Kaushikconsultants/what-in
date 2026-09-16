import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export interface ApiKeyAuthResult {
  authenticated: boolean;
  error?: string;
  statusCode?: number;
  apiKey?: any;
  client?: any;
}

/**
 * Standard Available API Scopes
 */
export const AVAILABLE_SCOPES = [
  { id: "messages:send", label: "Send Messages", desc: "Allows sending WhatsApp templates and session messages" },
  { id: "leads:write", label: "Ingest Leads", desc: "Allows submitting new inbound leads and inquiries" },
  { id: "contacts:read", label: "Read Contacts", desc: "Allows reading CRM customer profile and message history" },
  { id: "contacts:write", label: "Create / Update Contacts", desc: "Allows creating or updating CRM customer details" },
  { id: "templates:read", label: "Read Templates", desc: "Allows fetching pre-approved Meta WhatsApp templates" },
] as const;

/**
 * Generates a cryptographically secure API key pair:
 * - rawKey: Given to the user once (e.g. wapi_live_8f31b...)
 * - keyPrefix: Short preview stored for identification (e.g. wapi_live_8f31...)
 * - keyHash: Cryptographic SHA-256 hash stored in DB
 */
export function generateApiKeyPair(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const rawKey = `wapi_live_${randomBytes}`;
  const keyPrefix = `wapi_live_${randomBytes.slice(0, 8)}...`;
  const keyHash = hashApiKey(rawKey);

  return { rawKey, keyPrefix, keyHash };
}

/**
 * Deterministic SHA-256 hash for secure DB lookup
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

/**
 * Validates an incoming API request against active API keys.
 * Supports:
 * - Authorization: Bearer wapi_live_...
 * - x-api-key: wapi_live_...
 */
export async function validateApiKey(
  req: NextRequest,
  requiredScope?: string
): Promise<ApiKeyAuthResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
  let rawKey = "";

  if (authHeader.startsWith("Bearer ")) {
    rawKey = authHeader.substring(7).trim();
  } else {
    rawKey = authHeader.trim();
  }

  if (!rawKey || !rawKey.startsWith("wapi_live_")) {
    return {
      authenticated: false,
      statusCode: 401,
      error: "Missing or invalid API key. Please provide 'Authorization: Bearer wapi_live_...' or 'x-api-key'.",
    };
  }

  const computedHash = hashApiKey(rawKey);

  try {
    // 1. Look up key by hash
    const apiKey = await prisma.whatsAppApiKey.findFirst({
      where: {
        keyHash: computedHash,
      },
      include: {
        client: true,
      },
    });

    if (!apiKey) {
      return {
        authenticated: false,
        statusCode: 401,
        error: "Invalid API key provided. The key was not found or has been deleted.",
      };
    }

    // 2. Check Client Active Status
    if (!apiKey.client || !apiKey.client.isActive) {
      return {
        authenticated: false,
        statusCode: 403,
        error: "The account associated with this API key is inactive or blocked.",
      };
    }

    const now = new Date();

    // 3. Check Key Status & Rotation Grace Period
    if (apiKey.status === "REVOKED") {
      return {
        authenticated: false,
        statusCode: 401,
        error: "This API key has been revoked and cannot be used.",
      };
    }

    if (apiKey.status === "EXPIRED") {
      return {
        authenticated: false,
        statusCode: 401,
        error: "This API key has expired.",
      };
    }

    if (apiKey.status === "ROTATED") {
      if (!apiKey.gracePeriodEndsAt || apiKey.gracePeriodEndsAt < now) {
        return {
          authenticated: false,
          statusCode: 401,
          error: "This API key was rotated and its grace period has ended. Please use your new API key.",
        };
      }
    }

    // 4. Check Key Expiration Date
    if (apiKey.expiresAt && apiKey.expiresAt < now) {
      // Mark as EXPIRED asynchronously
      prisma.whatsAppApiKey.update({
        where: { id: apiKey.id },
        data: { status: "EXPIRED" },
      }).catch(() => {});

      return {
        authenticated: false,
        statusCode: 401,
        error: "This API key expired on " + apiKey.expiresAt.toISOString(),
      };
    }

    // 5. Check Scopes
    if (requiredScope) {
      let allowedScopes: string[] = [];
      try {
        allowedScopes = JSON.parse(apiKey.scopes);
      } catch {
        allowedScopes = ["messages:send", "leads:write", "contacts:read"];
      }

      if (!allowedScopes.includes(requiredScope) && !allowedScopes.includes("*")) {
        return {
          authenticated: false,
          statusCode: 403,
          error: `Forbidden: API key lacks required scope '${requiredScope}'. Granted scopes: [${allowedScopes.join(", ")}]`,
        };
      }
    }

    // 6. Check IP Whitelist (if configured)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "";

    if (apiKey.ipWhitelist && apiKey.ipWhitelist.trim()) {
      const allowedIps = apiKey.ipWhitelist.split(",").map((ip: string) => ip.trim());
      if (clientIp && !allowedIps.includes(clientIp)) {
        return {
          authenticated: false,
          statusCode: 403,
          error: `Forbidden: IP address ${clientIp} is not authorized for this API key.`,
        };
      }
    }

    // 7. Update usage stats asynchronously
    prisma.whatsAppApiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: now,
        usageCount: { increment: 1 },
      },
    }).catch(() => {});

    return {
      authenticated: true,
      apiKey,
      client: apiKey.client,
    };
  } catch (err: any) {
    console.error("[ApiKeyAuth] Error validating key:", err);
    return {
      authenticated: false,
      statusCode: 500,
      error: "Internal server error during API key authentication.",
    };
  }
}

/**
 * Asynchronously logs every API request to WhatsAppApiRequestLog for auditing
 */
export function logApiRequest(params: {
  clientId?: string | null;
  apiKeyId?: string | null;
  endpoint: string;
  httpMethod: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestPayloadPreview?: string | null;
  errorMessage?: string | null;
}) {
  prisma.whatsAppApiRequestLog
    .create({
      data: {
        clientId: params.clientId || null,
        apiKeyId: params.apiKeyId || null,
        endpoint: params.endpoint,
        httpMethod: params.httpMethod,
        statusCode: params.statusCode,
        responseTimeMs: params.responseTimeMs,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent ? params.userAgent.slice(0, 255) : null,
        requestPayloadPreview: params.requestPayloadPreview
          ? params.requestPayloadPreview.slice(0, 1000)
          : null,
        errorMessage: params.errorMessage ? params.errorMessage.slice(0, 500) : null,
      },
    })
    .catch((err: any) => {
      console.warn("[logApiRequest] Could not save API audit log:", err?.message);
    });
}
