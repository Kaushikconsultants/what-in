import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && !user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    let settings = await prisma.whatsAppSettings.findFirst();
    if (!settings) {
      settings = await prisma.whatsAppSettings.create({ data: {} });
    }
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);

    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "OWNER"))) {
      return NextResponse.json({ success: false, error: "Unauthorized access. Admin privilege required." }, { status: 401 });
    }

    const body = await req.json();
    let settings = await prisma.whatsAppSettings.findFirst();
    
    if (settings) {
      settings = await prisma.whatsAppSettings.update({
        where: { id: settings.id },
        data: body
      });
    } else {
      settings = await prisma.whatsAppSettings.create({
        data: body
      });
    }
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
