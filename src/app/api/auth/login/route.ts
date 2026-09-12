import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/authSession";

const SESSION_SECRET = process.env.SESSION_SECRET || "whatin_secure_hmac_session_key_2026_prod";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Check WhatsAppAgentUser table (Multi-Tenant SaaS agents & admins)
    const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: cleanEmail } });
    if (agent && agent.isActive) {
      let isMatch = false;

      // Check Bcrypt hash first
      if (agent.password.startsWith("$2a$") || agent.password.startsWith("$2b$") || agent.password.startsWith("$2y$")) {
        isMatch = await bcrypt.compare(password, agent.password);
      } else {
        // Fallback for unmigrated legacy plaintext password
        isMatch = agent.password === password;
        if (isMatch) {
          // Auto-migrate legacy password to secure Bcrypt hash
          const hashedPassword = await bcrypt.hash(password, 10);
          await prisma.whatsAppAgentUser.update({
            where: { id: agent.id },
            data: { password: hashedPassword }
          }).catch(err => console.error("Non-fatal password migration error:", err));
        }
      }

      if (isMatch) {
        const mustChange = agent.mustChangePassword ?? false;
        const emp = await prisma.employee.findFirst({ where: { user: { email: cleanEmail } } });

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

        // Set secure signed token
        res.cookies.set("wm_token", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
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

    // 2. Check legacy User table
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user && user.isActive) {
      let isMatch = false;
      if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = user.password === password;
        if (isMatch) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
          }).catch(err => console.error("Non-fatal password migration error:", err));
        }
      }

      if (isMatch) {
        const emp = await prisma.employee.findFirst({ where: { user: { email: cleanEmail } } });
        const agentRecord = await prisma.whatsAppAgentUser.findUnique({ where: { email: cleanEmail } });
        let clientId = agentRecord?.clientId;
        if (!clientId) {
          const matchedClient = await prisma.whatsAppClient.findFirst({
            where: {
              OR: [
                { adminEmail: cleanEmail },
                { contactEmail: cleanEmail }
              ]
            },
            select: { id: true }
          });
          clientId = matchedClient?.id;
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
