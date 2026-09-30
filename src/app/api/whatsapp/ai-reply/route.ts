import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { conversationId, customPrompt } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    // 1. Fetch settings & company profile
    const [settings, company, account] = await Promise.all([
      prisma.whatsAppSettings.findFirst().catch(() => null),
      prisma.companySettings.findFirst().catch(() => null),
      prisma.whatsAppAccount.findFirst().catch(() => null)
    ]);

    let clientRecord: any = null;
    if (user?.clientId) {
      clientRecord = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } }).catch(() => null);
    }

    const cleanDomain = (d?: string | null) => {
      if (!d) return "";
      return d.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    };

    const isClient = Boolean(clientRecord);

    let brandName = isClient ? (clientRecord.businessName || "Our Company") : (company?.companyName || account?.name || "Our Company");
    let brandDomain = isClient ? cleanDomain(clientRecord.shopifyDomain) : (cleanDomain(company?.website) || cleanDomain(company?.shopifyStoreDomain));
    let brandPhone = isClient ? (clientRecord.contactPhone || clientRecord.phoneNumber || "") : (company?.mobile || account?.phoneNumber || "");
    let brandEmail = isClient ? (clientRecord.contactEmail || clientRecord.adminEmail || "") : (company?.email || "");

    const aiKnowledgeBase = isClient ? (clientRecord.aiKnowledgeBase || "") : (settings?.aiKnowledgeBase || "");
    const aiSystemPrompt = isClient 
      ? (clientRecord.aiSystemPrompt || `You are a helpful customer service assistant for ${brandName}.`)
      : (settings?.aiSystemPrompt || "You are a helpful customer service assistant for our business.");
    const fallbackLanguage = settings?.aiFallbackLanguage || "English";
    const aiModel = clientRecord?.aiModel || settings?.aiModel || "gemini-flash-lite-latest";

    // 2. Fetch the conversation and its messages
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
          take: 50 // last 50 messages for context
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // 3. Format chat history for Gemini
    let chatHistory = "";
    conversation.messages.forEach((msg: any) => {
      const sender = msg.senderType === 'CUSTOMER' ? 'Customer' : 'Agent';
      chatHistory += `${sender}: ${msg.content || '[Media Message]'}\n`;
    });

    // 4. Construct the prompt
    let fullPrompt = `System Persona & Instructions:
${aiSystemPrompt}

Brand Identity & Contact Details:
- Brand Name: ${brandName}
${brandDomain ? `- Official Website: https://${brandDomain}` : ''}
${brandPhone ? `- Support Phone: ${brandPhone}` : ''}
${brandEmail ? `- Support Email: ${brandEmail}` : ''}

Knowledge Base:
${aiKnowledgeBase || `Welcome to ${brandName}. Provide polite and helpful customer assistance.`}

Rules:
- Start the conversation in ${fallbackLanguage}. If the customer speaks another language (like Hindi/Hinglish), smoothly adapt and respond in their language.
- Provide friendly, accurate, and concise assistance representing ${brandName}.
- Base your response on the knowledge base and brand details provided. If you don't know, politely state that you will connect them to a human agent.
- Keep the response concise and friendly, suitable for WhatsApp (1-3 short sentences max).
- CRITICAL: Output ONLY the exact, raw text message to be sent to the customer. Do NOT include any prefixes (like 'Agent:', 'Reply:'), internal thoughts, quotes, or markdown bullet points.
`;

    if (customPrompt) {
      fullPrompt += `\nAdditional Instructions for this specific reply: ${customPrompt}\n`;
    }

    fullPrompt += `\n--- Chat History ---\n${chatHistory}\n\nAgent (Your suggested reply):`;

    // 5. Call Gemini API - STRICT TENANT ISOLATION
    const apiKey = isClient ? clientRecord?.geminiApiKey?.trim() : (settings?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim());
    if (!apiKey) {
      return NextResponse.json({ 
        error: isClient 
          ? "Gemini API Key is not configured for this client. Please enter your Gemini API Key in Settings -> AI Automation." 
          : "Gemini API Key is not configured in platform settings." 
      }, { status: 400 });
    }

    const { callGeminiRest, GEMINI_MODEL_CASCADE, HARDCODED_PRIMARY_MODEL } = await import('@/lib/whatsappAI');

    const preferredModel = (aiModel && GEMINI_MODEL_CASCADE.includes(aiModel)) ? aiModel : HARDCODED_PRIMARY_MODEL;
    const cascade = [
      preferredModel,
      ...GEMINI_MODEL_CASCADE.filter(m => m !== preferredModel)
    ];

    let responseText = "";
    let finalModelUsed = preferredModel;
    let lastError = "";

    for (const model of cascade) {
      try {
        responseText = await callGeminiRest(apiKey, model, fullPrompt, aiSystemPrompt, 400);
        finalModelUsed = model;
        break;
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[AI Reply] Model ${model} failed:`, err.message);
      }
    }

    if (!responseText) {
      throw new Error(`All AI models failed in cascade. Last error: ${lastError}`);
    }

    return NextResponse.json({
      success: true,
      reply: responseText,
      modelUsed: finalModelUsed
    });

  } catch (error: any) {
    console.error("AI Reply Generation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
