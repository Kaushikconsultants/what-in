import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getClientFromReq(req: NextRequest) {
  let clientId: string | undefined;
  const userCookie = req.cookies.get('wm_user')?.value;
  if (userCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(userCookie));
      if (parsed?.clientId) clientId = parsed.clientId;
      else if (parsed?.email) {
        const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: parsed.email } });
        if (agent?.clientId) clientId = agent.clientId;
        else {
          const client = await prisma.whatsAppClient.findFirst({
            where: {
              OR: [
                { adminEmail: parsed.email },
                { contactEmail: parsed.email },
                { contactPhone: parsed.phone || parsed.email },
                { ownerWhatsApp: parsed.phone || parsed.email }
              ]
            }
          });
          if (client) clientId = client.id;
        }
      }
    } catch {}
  }
  if (!clientId) {
    clientId = req.nextUrl.searchParams.get('clientId') || undefined;
  }
  if (clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (client) return client;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromReq(req);
    const globalSettings = await prisma.whatsAppSettings.findFirst().catch(() => null);

    if (client) {
      const clientSettings = {
        id: client.id,
        workingHoursStart: client.workingHoursStart || '09:00',
        workingHoursEnd: client.workingHoursEnd || '19:00',
        outOfOfficeMessage: globalSettings?.outOfOfficeMessage || 'We are currently unavailable.',
        slaWarningMinutes: globalSettings?.slaWarningMinutes || 15,
        slaBreadMinutes: globalSettings?.slaBreadMinutes || 30,
        autoAssignStrategy: globalSettings?.autoAssignStrategy || 'ROUND_ROBIN',
        aiConfidenceThreshold: globalSettings?.aiConfidenceThreshold || 85,
        aiModel: client.aiModel || 'gemini-3.8-flash',
        welcomeMessage: client.welcomeMessage || '',
        aiKnowledgeBase: client.aiKnowledgeBase || '',
        aiSystemPrompt: client.aiSystemPrompt || '',
        aiFallbackLanguage: globalSettings?.aiFallbackLanguage || 'English',
        geminiApiKey: client.geminiApiKey || '',
        activeGateway: client.activeGateway || null,
        razorpayKeyId: client.razorpayKeyId || '',
        razorpayKeySecret: client.razorpayKeySecret || '',
        cashfreeAppId: client.cashfreeAppId || '',
        cashfreeSecretKey: client.cashfreeSecretKey || '',
        merchantUpiId: client.merchantUpiId || '',
        merchantUpiName: client.merchantUpiName || client.businessName || '',
        metaCapiLeadValue: globalSettings?.metaCapiLeadValue || 10000,
      };
      return NextResponse.json({ success: true, settings: clientSettings });
    }

    const fallbackSettings = {
      id: globalSettings?.id || 'default',
      workingHoursStart: globalSettings?.workingHoursStart || '09:00',
      workingHoursEnd: globalSettings?.workingHoursEnd || '19:00',
      outOfOfficeMessage: globalSettings?.outOfOfficeMessage || 'We are currently unavailable.',
      slaWarningMinutes: globalSettings?.slaWarningMinutes || 15,
      slaBreadMinutes: globalSettings?.slaBreadMinutes || 30,
      autoAssignStrategy: globalSettings?.autoAssignStrategy || 'ROUND_ROBIN',
      aiConfidenceThreshold: globalSettings?.aiConfidenceThreshold || 85,
      aiModel: globalSettings?.aiModel || 'gemini-3.8-flash',
      welcomeMessage: globalSettings?.welcomeMessage || '',
      aiKnowledgeBase: globalSettings?.aiKnowledgeBase || '',
      aiSystemPrompt: globalSettings?.aiSystemPrompt || '',
      aiFallbackLanguage: globalSettings?.aiFallbackLanguage || 'English',
      geminiApiKey: globalSettings?.geminiApiKey || '',
      activeGateway: globalSettings?.activeGateway || null,
      razorpayKeyId: globalSettings?.razorpayKeyId || '',
      razorpayKeySecret: globalSettings?.razorpayKeySecret || '',
      cashfreeAppId: globalSettings?.cashfreeAppId || '',
      cashfreeSecretKey: globalSettings?.cashfreeSecretKey || '',
      merchantUpiId: globalSettings?.merchantUpiId || '',
      merchantUpiName: globalSettings?.merchantUpiName || '',
      metaCapiLeadValue: globalSettings?.metaCapiLeadValue || 10000,
    };

    return NextResponse.json({ success: true, settings: fallbackSettings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = await getClientFromReq(req);

    if (client) {
      const clientUpdate: any = {};
      if (body.geminiApiKey !== undefined) clientUpdate.geminiApiKey = body.geminiApiKey;
      if (body.aiModel !== undefined) clientUpdate.aiModel = body.aiModel;
      if (body.aiSystemPrompt !== undefined) clientUpdate.aiSystemPrompt = body.aiSystemPrompt;
      if (body.aiKnowledgeBase !== undefined) clientUpdate.aiKnowledgeBase = body.aiKnowledgeBase;
      if (body.welcomeMessage !== undefined) clientUpdate.welcomeMessage = body.welcomeMessage;
      if (body.workingHoursStart !== undefined) clientUpdate.workingHoursStart = body.workingHoursStart;
      if (body.workingHoursEnd !== undefined) clientUpdate.workingHoursEnd = body.workingHoursEnd;
      if (body.activeGateway !== undefined) clientUpdate.activeGateway = body.activeGateway;
      if (body.razorpayKeyId !== undefined) clientUpdate.razorpayKeyId = body.razorpayKeyId;
      if (body.razorpayKeySecret !== undefined) clientUpdate.razorpayKeySecret = body.razorpayKeySecret;
      if (body.cashfreeAppId !== undefined) clientUpdate.cashfreeAppId = body.cashfreeAppId;
      if (body.cashfreeSecretKey !== undefined) clientUpdate.cashfreeSecretKey = body.cashfreeSecretKey;
      if (body.merchantUpiId !== undefined) clientUpdate.merchantUpiId = body.merchantUpiId;
      if (body.merchantUpiName !== undefined) clientUpdate.merchantUpiName = body.merchantUpiName;

      const updatedClient = await prisma.whatsAppClient.update({
        where: { id: client.id },
        data: clientUpdate
      });
      return NextResponse.json({ success: true, settings: updatedClient });
    }

    // Only update global settings row if super-admin (no client session)
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

