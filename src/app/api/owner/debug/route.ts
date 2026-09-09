import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const agents = await prisma.whatsAppAgentUser.findMany();
    const users = await prisma.user.findMany();
    const employees = await prisma.employee.findMany();
    const convs = await prisma.whatsAppConversation.findMany({ select: { id: true, assignedEmployeeId: true } });

    return NextResponse.json({ agents, users, employees, convs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
