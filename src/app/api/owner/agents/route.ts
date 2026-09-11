import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isOwnerAuthenticated, getAuthenticatedUser } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "OWNER"))) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const clientId = user?.clientId;
    const client = clientId
      ? await prisma.whatsAppClient.findUnique({ where: { id: clientId } })
      : await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });

    if (!client) return NextResponse.json({ agents: [] });

    const agents = await prisma.whatsAppAgentUser.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true
      }
    });

    return NextResponse.json({ agents, maxAgents: client.maxAgents });
  } catch (e: any) {
    return NextResponse.json({ agents: [], error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "OWNER"))) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const clientId = user?.clientId;
    const client = clientId
      ? await prisma.whatsAppClient.findUnique({ where: { id: clientId }, include: { agents: true } })
      : await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" }, include: { agents: true } });

    if (!client) return NextResponse.json({ error: "No client configured" }, { status: 400 });

    if (client.agents.length >= client.maxAgents) {
      return NextResponse.json({ error: `Seat limit reached. Max ${client.maxAgents} agents allowed.` }, { status: 400 });
    }

    // Hash password with Bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await prisma.whatsAppAgentUser.create({
      data: {
        clientId: client.id,
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: role || "AGENT",
        mustChangePassword: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true
      }
    });

    // Synchronization: Auto-provision corresponding User and Employee profiles
    try {
      let dbUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            name,
            email: cleanEmail,
            password: hashedPassword,
            role: (role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER") ? "ADMIN" : "SALES",
            isActive: true
          }
        });
      }

      let dbEmployee = await prisma.employee.findFirst({ where: { userId: dbUser.id } });
      if (!dbEmployee) {
        await prisma.employee.create({
          data: {
            userId: dbUser.id,
            employeeId: `EMP_${agent.id.slice(0, 8).toUpperCase()}`,
            mobile: "",
            employmentStatus: "Active"
          }
        });
      }
    } catch (syncErr) {
      console.error("[Agent Sync] Failed to auto-provision User/Employee:", syncErr);
    }

    return NextResponse.json({ success: true, agent });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: "An agent with this email already exists." }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
