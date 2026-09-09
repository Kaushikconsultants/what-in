import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.whatsAppSettings.findFirst();
    if (!settings) {
      settings = await prisma.whatsAppSettings.create({ data: {} });
    }
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
