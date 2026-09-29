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

    // If client tenant user, strictly isolate client-specific AI and gateway configurations
    if (user?.clientId) {
      const client = await prisma.whatsAppClient.findUnique({
        where: { id: user.clientId }
      });
      if (client) {
        settings = {
          ...settings,
          geminiApiKey: client.geminiApiKey || "",
          aiModel: "gemini-flash-lite-latest",
          aiSystemPrompt: client.aiSystemPrompt || `You are the helpful AI customer service assistant for ${client.businessName}.`,
          aiKnowledgeBase: client.aiKnowledgeBase || "",
          welcomeMessage: client.welcomeMessage || `Welcome to ${client.businessName}! How can we help you today?`,
          workingHoursStart: client.workingHoursStart || settings.workingHoursStart || "09:00",
          workingHoursEnd: client.workingHoursEnd || settings.workingHoursEnd || "19:00",
          activeGateway: client.activeGateway || null,
          razorpayKeyId: client.razorpayKeyId || "",
          razorpayKeySecret: client.razorpayKeySecret || "",
          cashfreeAppId: client.cashfreeAppId || "",
          cashfreeSecretKey: client.cashfreeSecretKey || "",
          merchantUpiId: client.merchantUpiId || "",
          merchantUpiName: client.merchantUpiName || client.businessName
        };
      }
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

    // If tenant client admin, persist directly to their WhatsAppClient record
    if (user?.clientId) {
      const clientData: any = {};
      if (body.geminiApiKey !== undefined) clientData.geminiApiKey = body.geminiApiKey;
      clientData.aiModel = "gemini-flash-lite-latest";
      if (body.aiSystemPrompt !== undefined) clientData.aiSystemPrompt = body.aiSystemPrompt;
      if (body.aiKnowledgeBase !== undefined) clientData.aiKnowledgeBase = body.aiKnowledgeBase;
      if (body.welcomeMessage !== undefined) clientData.welcomeMessage = body.welcomeMessage;
      if (body.workingHoursStart !== undefined) clientData.workingHoursStart = body.workingHoursStart;
      if (body.workingHoursEnd !== undefined) clientData.workingHoursEnd = body.workingHoursEnd;
      if (body.activeGateway !== undefined) clientData.activeGateway = body.activeGateway;
      if (body.razorpayKeyId !== undefined) clientData.razorpayKeyId = body.razorpayKeyId;
      if (body.razorpayKeySecret !== undefined) clientData.razorpayKeySecret = body.razorpayKeySecret;
      if (body.cashfreeAppId !== undefined) clientData.cashfreeAppId = body.cashfreeAppId;
      if (body.cashfreeSecretKey !== undefined) clientData.cashfreeSecretKey = body.cashfreeSecretKey;
      if (body.merchantUpiId !== undefined) clientData.merchantUpiId = body.merchantUpiId;
      if (body.merchantUpiName !== undefined) clientData.merchantUpiName = body.merchantUpiName;

      const updatedClient = await prisma.whatsAppClient.update({
        where: { id: user.clientId },
        data: clientData
      });

      if (!isOwner) {
        return NextResponse.json({ success: true, settings: updatedClient });
      }
    }

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
