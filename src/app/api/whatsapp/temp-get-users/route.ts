import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        password: true, // hashed password to see if it matches seeded ones
        employeeId: true,
        employee: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}