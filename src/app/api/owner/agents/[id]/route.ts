import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isOwnerAuthenticated, getAuthenticatedUser } from "@/lib/authSession";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "OWNER"))) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { name, email, password, role, isActive } = body;

    const existingAgent = await prisma.whatsAppAgentUser.findUnique({ where: { id } });
    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Tenant boundary check: Admin can only modify agents belonging to their own clientId
    if (!isOwner && user?.clientId && existingAgent.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden: Cannot modify agents outside your organization" }, { status: 403 });
    }

    const updateData: any = { name, email, role, isActive };
    let hashedPassword = "";
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const agent = await prisma.whatsAppAgentUser.update({
      where: { id },
      data: updateData,
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

    // Sync to User and Employee
    try {
      let dbUser = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { email: existingAgent.email },
            { email: email }
          ]
        } 
      });

      if (!dbUser) {
        dbUser = await prisma.user.findFirst({ where: { name: existingAgent.name } });
      }
      
      if (dbUser) {
        const userUpdate: any = { name, email, role: (role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER") ? "ADMIN" : "SALES", isActive };
        if (hashedPassword) {
          userUpdate.password = hashedPassword;
        }
        await prisma.user.update({
          where: { id: dbUser.id },
          data: userUpdate
        });
      } else {
        dbUser = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword || existingAgent.password || "defaultPassword123!",
            role: (role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER") ? "ADMIN" : "SALES",
            isActive: isActive ?? true
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
            employmentStatus: isActive ? "Active" : "Inactive"
          }
        });
      } else {
        await prisma.employee.update({
          where: { id: dbEmployee.id },
          data: { employmentStatus: isActive ? "Active" : "Inactive" }
        });
      }
    } catch (syncErr) {
      console.error("[Agent Sync] Failed to update User/Employee:", syncErr);
    }

    const { revalidatePath } = require("next/cache");
    revalidatePath('/whatsapp/inbox');
    revalidatePath('/whatsapp/team-inbox');
    revalidatePath('/whatsapp/api-settings');

    return NextResponse.json({ success: true, agent });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: "An agent with this email already exists." }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
