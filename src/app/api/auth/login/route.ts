import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET = process.env.SESSION_SECRET || "whatin-session-2026";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check WhatsAppAgentUser table first (SaaS agents)
    const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email } });
    if (agent && agent.password === password && agent.isActive) {
      const res = NextResponse.json({ success: true, name: agent.name, role: agent.role });
      res.cookies.set("wm_session", SESSION_SECRET, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
        path: "/",
        sameSite: "lax"
      });
      res.cookies.set("wm_user", JSON.stringify({ name: agent.name, email: agent.email, role: agent.role }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
        path: "/",
        sameSite: "lax"
      });
      return res;
    }

    // Also check legacy User table (existing employees/admins)
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      // Simple password check (legacy users may use bcrypt or plain)
      const passwordMatch = user.password === password;
      if (passwordMatch) {
        const res = NextResponse.json({ success: true, name: user.name, role: user.role });
        res.cookies.set("wm_session", SESSION_SECRET, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
          path: "/",
          sameSite: "lax"
        });
        res.cookies.set("wm_user", JSON.stringify({ name: user.name, email: user.email, role: user.role }), {
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
