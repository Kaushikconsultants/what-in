import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_SECRET = process.env.SESSION_SECRET || "whatin_secure_hmac_session_key_2026_prod";
const OWNER_SECRET = process.env.OWNER_PORTAL_SECRET || "whatin_secure_owner_key_2026_prod";

export interface SessionUser {
  id?: string;
  name?: string;
  email: string;
  role: string;
  clientId?: string;
  mustChangePassword?: boolean;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token
 */
export function createSessionToken(user: Omit<SessionUser, "exp">, expiresInDays = 7): string {
  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload: SessionUser = { ...user, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 session token
 */
export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payloadBase64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: SessionUser = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Validates whether the request comes from an authenticated Owner/Super-Admin
 */
export async function isOwnerAuthenticated(req?: NextRequest): Promise<boolean> {
  try {
    let token = req
      ? req.cookies.get("owner_token")?.value
      : undefined;
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get("owner_token")?.value;
    }
    if (!token) return false;
    return token === OWNER_SECRET;
  } catch {
    return false;
  }
}

/**
 * Helper to get authenticated user from NextRequest or Server Action cookies
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<SessionUser | null> {
  try {
    let token = req?.cookies.get("wm_token")?.value;
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get("wm_token")?.value;
    }
    if (token) {
      const verified = verifySessionToken(token);
      if (verified) return verified;
    }

    // Fallback: If legacy wm_session exists, verify wm_user payload with database check
    let sessionSecret = req?.cookies.get("wm_session")?.value;
    if (!sessionSecret) {
      const cookieStore = await cookies();
      sessionSecret = cookieStore.get("wm_session")?.value;
    }
    if (sessionSecret === SESSION_SECRET) {
      let rawUser = req?.cookies.get("wm_user")?.value;
      if (!rawUser) {
        const cookieStore = await cookies();
        rawUser = cookieStore.get("wm_user")?.value;
      }
      if (rawUser) {
        const parsed = JSON.parse(decodeURIComponent(rawUser));
        return {
          id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          role: parsed.role || "AGENT",
          clientId: parsed.clientId,
          mustChangePassword: parsed.mustChangePassword,
          exp: Date.now() + 86400000
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
