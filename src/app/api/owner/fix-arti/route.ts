import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: "arti", mode: 'insensitive' } },
          { email: { contains: "esponclothing", mode: 'insensitive' } },
          { name: { contains: "arti", mode: 'insensitive' } }
        ]
      },
      include: { employee: true }
    });

    const result: any[] = [];
    for (const u of allUsers) {
      if (u.employee) {
        const count = await prisma.whatsAppConversation.count({
          where: { assignedEmployeeId: u.employee.id }
        });
        result.push({
          id: u.id,
          name: u.name,
          email: u.email,
          employeeId: u.employee.id,
          chatCount: count
        });
      } else {
        result.push({
          id: u.id,
          name: u.name,
          email: u.email,
          employeeId: null,
          chatCount: 0
        });
      }
    }

    return NextResponse.json({ success: true, users: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
