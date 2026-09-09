import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const agents = await prisma.whatsAppAgentUser.findMany();
    let synced = 0;

    for (const agent of agents) {
      // Find or create User
      let dbUser = await prisma.user.findFirst({ where: { email: agent.email } });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            name: agent.name,
            email: agent.email,
            password: agent.password || "defaultPassword123!",
            role: (agent.role === "ADMIN" || agent.role === "SUPER_ADMIN" || agent.role === "MANAGER") ? "ADMIN" : "SALES",
            isActive: agent.isActive
          }
        });
      }

      // Find or create Employee
      let dbEmployee = await prisma.employee.findFirst({ where: { userId: dbUser.id } });
      if (!dbEmployee) {
        await prisma.employee.create({
          data: {
            userId: dbUser.id,
            employeeId: `EMP_${agent.id.slice(0, 8).toUpperCase()}`,
            mobile: "",
            employmentStatus: agent.isActive ? "Active" : "Inactive"
          }
        });
        synced++;
      } else {
        await prisma.employee.update({
          where: { id: dbEmployee.id },
          data: { employmentStatus: agent.isActive ? "Active" : "Inactive" }
        });
        synced++;
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${synced} agents to Employee records.` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
