import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/authSession";

const SESSION_SECRET = process.env.SESSION_SECRET || "whatin_secure_hmac_session_key_2026_prod";

async function comparePassword(provided: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !provided) return false;
  const provTrim = provided.trim();

  // Try standard Bcrypt comparison
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    try {
      if (await bcrypt.compare(provided, stored)) return true;
      if (provTrim !== provided && (await bcrypt.compare(provTrim, stored))) return true;
    } catch {
      // ignore
    }
  }

  // Plaintext match fallback
  if (stored === provided || stored === provTrim || stored.trim() === provTrim) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawEmail = String(email).trim();

    // -----------------------------------------------------------------
    // 1. Check WhatsAppAgentUser table (Multi-Tenant SaaS agents & admins)
    // -----------------------------------------------------------------
    const agent = await prisma.whatsAppAgentUser.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: "insensitive" } },
          { email: { equals: rawEmail, mode: "insensitive" } },
          { email: cleanEmail },
          { email: rawEmail }
        ]
      },
      include: {
        client: true
      }
    });

    if (agent && agent.isActive) {
      const isMatch = await comparePassword(password, agent.password);

      if (isMatch) {
        // Auto-migrate plaintext password to Bcrypt hash if needed
        if (!agent.password.startsWith("$2")) {
          const hashed = await bcrypt.hash(password.trim(), 10);
          await prisma.whatsAppAgentUser.update({
            where: { id: agent.id },
            data: { password: hashed }
          }).catch(err => console.error("Non-fatal password migration error:", err));
        }

        const mustChange = agent.mustChangePassword ?? false;
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { user: { email: { equals: cleanEmail, mode: "insensitive" } } },
              { user: { email: cleanEmail } }
            ]
          }
        }).catch(() => null);

        const sessionToken = createSessionToken({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          clientId: agent.clientId,
          employeeId: emp?.id,
          mustChangePassword: mustChange
        });

        const res = NextResponse.json({
          success: true,
          name: agent.name,
          role: agent.role,
          clientId: agent.clientId,
          employeeId: emp?.id,
          mustChangePassword: mustChange
        });

        res.cookies.set("wm_token", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        res.cookies.set("wm_session", SESSION_SECRET, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        res.cookies.set("wm_user", JSON.stringify({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          clientId: agent.clientId,
          employeeId: emp?.id,
          mustChangePassword: mustChange
        }), {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        return res;
      }
    }

    // -----------------------------------------------------------------
    // 2. Check WhatsAppClient table directly (Client Onboarding Admin)
    // -----------------------------------------------------------------
    const matchedClient = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [
          { adminEmail: { equals: cleanEmail, mode: "insensitive" } },
          { contactEmail: { equals: cleanEmail, mode: "insensitive" } },
          { adminEmail: cleanEmail },
          { contactEmail: cleanEmail },
          { adminEmail: rawEmail },
          { contactEmail: rawEmail }
        ]
      }
    });

    if (matchedClient && matchedClient.isActive && matchedClient.subscriptionStatus !== "BLOCKED") {
      const isClientMatch = await comparePassword(password, matchedClient.adminPassword);

      if (isClientMatch) {
        // Securely hash if unhashed
        let hashedPassword = matchedClient.adminPassword || "";
        if (!hashedPassword.startsWith("$2")) {
          hashedPassword = await bcrypt.hash(password.trim(), 10);
          await prisma.whatsAppClient.update({
            where: { id: matchedClient.id },
            data: { adminPassword: hashedPassword }
          }).catch(() => null);
        }

        // Auto-heal or link the primary ADMIN agent in whatsAppAgentUser
        const adminAgent = await prisma.whatsAppAgentUser.upsert({
          where: { email: cleanEmail },
          update: {
            clientId: matchedClient.id,
            name: matchedClient.businessName + " Admin",
            password: hashedPassword,
            role: "ADMIN",
            isActive: true
          },
          create: {
            clientId: matchedClient.id,
            name: matchedClient.businessName + " Admin",
            email: cleanEmail,
            password: hashedPassword,
            role: "ADMIN",
            isActive: true
          }
        });

        const sessionToken = createSessionToken({
          id: adminAgent.id,
          name: adminAgent.name,
          email: adminAgent.email,
          role: "ADMIN",
          clientId: matchedClient.id
        });

        const res = NextResponse.json({
          success: true,
          name: adminAgent.name,
          role: "ADMIN",
          clientId: matchedClient.id
        });

        res.cookies.set("wm_token", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        res.cookies.set("wm_session", SESSION_SECRET, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        res.cookies.set("wm_user", JSON.stringify({
          id: adminAgent.id,
          name: adminAgent.name,
          email: adminAgent.email,
          role: "ADMIN",
          clientId: matchedClient.id
        }), {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        return res;
      }
    }

    // -----------------------------------------------------------------
    // 3. Check legacy User table (ERP & CRM Platform Users)
    // -----------------------------------------------------------------
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: "insensitive" } },
          { email: { equals: rawEmail, mode: "insensitive" } },
          { email: cleanEmail },
          { email: rawEmail }
        ]
      }
    });

    if (user && user.isActive) {
      const isMatch = await comparePassword(password, user.password);

      if (isMatch) {
        if (!user.password.startsWith("$2")) {
          const hashedPassword = await bcrypt.hash(password.trim(), 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
          }).catch(err => console.error("Non-fatal password migration error:", err));
        }

        const emp = await prisma.employee.findFirst({
          where: { userId: user.id }
        }).catch(() => null);

        const agentRecord = await prisma.whatsAppAgentUser.findFirst({
          where: {
            OR: [
              { email: { equals: cleanEmail, mode: "insensitive" } },
              { email: cleanEmail }
            ]
          }
        }).catch(() => null);

        let clientId = agentRecord?.clientId;
        if (!clientId) {
          const matchedClientForUser = await prisma.whatsAppClient.findFirst({
            where: {
              OR: [
                { adminEmail: { equals: cleanEmail, mode: "insensitive" } },
                { contactEmail: { equals: cleanEmail, mode: "insensitive" } },
                { adminEmail: cleanEmail },
                { contactEmail: cleanEmail }
              ]
            },
            select: { id: true }
          });
          clientId = matchedClientForUser?.id;
        }
        if (!clientId) {
          const firstClient = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
          clientId = firstClient?.id || "8c519684-5a75-45be-b74b-5f9553f7ea32";
        }
        const effectiveRole = agentRecord?.role || user.role;

        const sessionToken = createSessionToken({
          id: user.id,
          name: user.name,
          email: user.email,
          role: effectiveRole,
          clientId: clientId,
          employeeId: emp?.id
        });

        const res = NextResponse.json({
          success: true,
          name: user.name,
          role: effectiveRole,
          clientId: clientId,
          employeeId: emp?.id
        });

        res.cookies.set("wm_token", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        res.cookies.set("wm_session", SESSION_SECRET, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        res.cookies.set("wm_user", JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: effectiveRole,
          clientId: clientId,
          employeeId: emp?.id
        }), {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });

        return res;
      }
    }

    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  } catch (e: any) {
    console.error("[Login Route Error]:", e);
    return NextResponse.json({ error: e.message || "Authentication failed" }, { status: 500 });
  }
}

