import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    if (!client) return NextResponse.json({ agents: [] });
    const agents = await prisma.whatsAppAgentUser.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
    return NextResponse.json({ agents, maxAgents: client.maxAgents });
  } catch (e: any) {
    return NextResponse.json({ agents: [], error: e.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;
    const client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" }, include: { agents: true } });
    if (!client) return NextResponse.json({ error: "No client configured" }, { status: 400 });
    if (client.agents.length >= client.maxAgents) {
      return NextResponse.json({ error: `Seat limit reached. Max ${client.maxAgents} agents allowed.` }, { status: 400 });
    }
    const agent = await prisma.whatsAppAgentUser.create({ data: { clientId: client.id, name, email, password, role: role || "AGENT" } });

    // Synchronization: Auto-provision corresponding User and Employee profiles
    try {
      let dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            name,
            email,
            password,
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
