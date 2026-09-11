import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!user && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
