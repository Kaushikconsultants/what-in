import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { conversationId, customPrompt } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    // 1. Fetch active client & global fallback
    let client: any = null;
    let userCookie: string | undefined;
    try {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const u = cookieHeader.split(';').find(c => c.trim().startsWith('wm_user='));
        if (u) {
          const parsed = JSON.parse(decodeURIComponent(u.split('=')[1]));
          if (parsed?.clientId) {
            client = await prisma.whatsAppClient.findUnique({ where: { id: parsed.clientId } });
          }
        }
      }
    } catch {}

    if (!client) {
      client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    const [settings, company, account] = await Promise.all([
      prisma.whatsAppSettings.findFirst().catch(() => null),
      prisma.companySettings.findFirst().catch(() => null),
      prisma.whatsAppAccount.findFirst().catch(() => null)
    ]);

    const brandName = client?.businessName || company?.companyName || account?.name || "Business";
    const brandDomain = client?.shopifyDomain 
      ? client.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '') 
      : (company?.website ? company.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : "what-in.tinkal.in");
    const brandPhone = client?.phoneNumber || company?.mobile || account?.phoneNumber || "";
    const brandEmail = client?.contactEmail || company?.email || "";

    const aiKnowledgeBase = client?.aiKnowledgeBase || settings?.aiKnowledgeBase || "";
    const aiSystemPrompt = client?.aiSystemPrompt || settings?.aiSystemPrompt || "You are a helpful customer service assistant for our business.";
    const fallbackLanguage = settings?.aiFallbackLanguage || "English";
    const aiModel = client?.aiModel || settings?.aiModel || "gemini-3.8-flash";

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
- Official Website: https://${brandDomain}
- Support Phone: ${brandPhone}
- Support Email: ${brandEmail}

Knowledge Base (Company Information & FAQs):
${aiKnowledgeBase || "We offer premium services with quick delivery and dedicated support."}

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

    // 5. Call Gemini API
    const apiKey = client?.geminiApiKey?.trim() || settings?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is not configured for this account." }, { status: 500 });
    }

    const { callGeminiRest, GEMINI_MODEL_CASCADE } = await import('@/lib/whatsappAI');

    const preferredModel = aiModel || 'gemini-3.8-flash';
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
