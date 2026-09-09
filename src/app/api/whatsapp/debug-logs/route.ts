import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.whatsAppChatbotLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
