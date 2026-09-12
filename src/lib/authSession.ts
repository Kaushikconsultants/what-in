import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET = process.env.SESSION_SECRET || "whatin_secure_hmac_session_key_2026_prod";
const OWNER_SECRET = process.env.OWNER_PORTAL_SECRET || "whatin_secure_owner_key_2026_prod";
const DEFAULT_ESPON_CLIENT_ID = "8c519684-5a75-45be-b74b-5f9553f7ea32";

export interface SessionUser {
  id?: string;
  name?: string;
  email: string;
  role: string;
  clientId?: string;
  employeeId?: string;
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
 * Validates whether the request comes from an authenticated Owner/Super-Admin.
 * Returns boolean synchronously when NextRequest is provided.
 * Returns Promise<boolean> when called without NextRequest (Server Actions).
 */
export function isOwnerAuthenticated(req: NextRequest): boolean;
export function isOwnerAuthenticated(req?: undefined): Promise<boolean>;
export function isOwnerAuthenticated(req?: NextRequest): boolean | Promise<boolean> {
  try {
    if (req) {
      const token = req.cookies.get("owner_token")?.value;
      return token === OWNER_SECRET;
    }
    return (async () => {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get("owner_token")?.value;
        return token === OWNER_SECRET;
      } catch {
        return false;
      }
    })();
  } catch {
    return false;
  }
}

/**
 * Helper to get authenticated user from NextRequest or Server Action cookies
 * Automatically enriches missing employeeId and clientId from database.
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<SessionUser | null> {
  try {
    let resolvedUser: SessionUser | null = null;

    let token = req?.cookies.get("wm_token")?.value;
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get("wm_token")?.value;
    }
    if (token) {
      resolvedUser = verifySessionToken(token);
    }

    // Fallback: Check wm_user cookie and verify active user in database
    if (!resolvedUser) {
      let rawUser = req?.cookies.get("wm_user")?.value;
      if (!rawUser) {
        try {
          const cookieStore = await cookies();
          rawUser = cookieStore.get("wm_user")?.value;
        } catch {}
      }

      if (rawUser) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(decodeURIComponent(rawUser));
        } catch {
          try {
            parsed = JSON.parse(rawUser);
          } catch {}
        }

        if (parsed && parsed.email) {
          const cleanEmail = String(parsed.email).trim().toLowerCase();

          try {
            const agentUser = await prisma.whatsAppAgentUser.findUnique({
              where: { email: cleanEmail },
              select: { id: true, name: true, email: true, role: true, clientId: true, isActive: true }
            });
            const dbUser = !agentUser ? await prisma.user.findUnique({
              where: { email: cleanEmail },
              select: { id: true, name: true, email: true, role: true, isActive: true }
            }) : null;

            if ((agentUser && agentUser.isActive !== false) || (dbUser && dbUser.isActive !== false)) {
              const matchedObj = agentUser || dbUser;
              resolvedUser = {
                id: matchedObj?.id || parsed.id,
                name: matchedObj?.name || parsed.name,
                email: cleanEmail,
                role: (agentUser?.role || dbUser?.role || parsed.role || "AGENT").toUpperCase(),
                clientId: agentUser?.clientId || parsed.clientId,
                employeeId: parsed.employeeId,
                mustChangePassword: parsed.mustChangePassword,
                exp: Date.now() + 86400000 * 30
              };
            }
          } catch (dbErr) {
            console.error("[getAuthenticatedUser DB lookup error]:", dbErr);
            resolvedUser = {
              id: parsed.id,
              name: parsed.name,
              email: cleanEmail,
              role: (parsed.role || "AGENT").toUpperCase(),
              clientId: parsed.clientId,
              employeeId: parsed.employeeId,
              mustChangePassword: parsed.mustChangePassword,
              exp: Date.now() + 86400000
            };
          }
        }
      }
    }

    if (!resolvedUser || !resolvedUser.email) return null;

    // Auto-enrich latest role, employeeId, and clientId from database
    try {
      const agentUser = await prisma.whatsAppAgentUser.findUnique({
        where: { email: resolvedUser.email },
        select: { id: true, clientId: true, role: true }
      });

      if (agentUser) {
        if (agentUser.role) resolvedUser.role = agentUser.role;
        if (agentUser.clientId) resolvedUser.clientId = agentUser.clientId;
      }

      if (!resolvedUser.clientId) {
        const matchedClient = await prisma.whatsAppClient.findFirst({
          where: {
            OR: [
              { adminEmail: resolvedUser.email },
              { contactEmail: resolvedUser.email }
            ]
          },
          select: { id: true }
        });
        if (matchedClient) {
          resolvedUser.clientId = matchedClient.id;
        } else {
          const firstClient = await prisma.whatsAppClient.findFirst({
            orderBy: { createdAt: "asc" },
            select: { id: true }
          });
          resolvedUser.clientId = firstClient?.id || DEFAULT_ESPON_CLIENT_ID;
        }
      }

      if (!resolvedUser.employeeId) {
        const emp = await prisma.employee.findFirst({
          where: { user: { email: resolvedUser.email } },
          select: { id: true }
        });
        if (emp) {
          resolvedUser.employeeId = emp.id;
        }
      }
    } catch (dbErr) {
      console.error("[getAuthenticatedUser DB enrich error]:", dbErr);
    }

    return resolvedUser;
  } catch {
    return null;
  }
}

