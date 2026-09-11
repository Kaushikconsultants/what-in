import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!user && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const account = await prisma.whatsAppAccount.findFirst();
    
    if (!account || !account.accessToken || !account.phoneId) {
      return NextResponse.json({ error: 'WhatsApp account not configured correctly in DB' }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v20.0/${account.phoneId}?fields=health_status`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`
      }
    });

    const data = await response.json();
    return NextResponse.json({
      success: true,
      phoneId: account.phoneId,
      metaResponse: data
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
