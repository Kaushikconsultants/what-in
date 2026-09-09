import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: "arti@espon.in" },
          { email: "esponclothing105@gmail.com" },
          { name: { contains: "arti", mode: 'insensitive' } }
        ]
      },
      include: {
        Employee: true
      }
    });

    const agents = await prisma.whatsAppAgentUser.findMany({
      where: {
        OR: [
          { email: "arti@espon.in" },
          { email: "esponclothing105@gmail.com" },
          { name: { contains: "arti", mode: 'insensitive' } }
        ]
      }
    });

    return NextResponse.json({ users, agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
