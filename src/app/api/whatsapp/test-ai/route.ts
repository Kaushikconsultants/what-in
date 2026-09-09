import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callGeminiRest, GEMINI_MODEL_CASCADE } from '@/lib/whatsappAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
    }

    // Load settings from DB for fallbacks
    let dbSettings: any = null;
    try {
      dbSettings = await prisma.whatsAppSettings.findFirst();
    } catch (_) {}

    const apiKey = (body.apiKey?.trim() || dbSettings?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '');
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API Key is missing. Please enter your Gemini API key and test again.'
      }, { status: 400 });
    }

    const preferredModel = body.model || dbSettings?.aiModel || 'gemini-3.8-flash';
    const systemRules = body.systemPrompt !== undefined ? body.systemPrompt : (dbSettings?.aiSystemPrompt || 'You are a helpful customer service assistant.');
    const knowledgeBase = body.knowledgeBase !== undefined ? body.knowledgeBase : (dbSettings?.aiKnowledgeBase || '');
    const fallbackLang = body.fallbackLanguage || dbSettings?.aiFallbackLanguage || 'English';

    const fullSystemInstruction = `
System Persona & Rules:
${systemRules}

Business Knowledge Base:
${knowledgeBase || 'No special knowledge base provided.'}

Instructions:
- Default language is ${fallbackLang}. If the user speaks another language (e.g. Hindi, Hinglish), reply in that language.
- Strictly adhere to facts in the knowledge base.
- Keep the reply concise, polite, and helpful (under 3 sentences).
`.trim();

    const cascade = [
      preferredModel,
      ...GEMINI_MODEL_CASCADE.filter(m => m !== preferredModel)
    ];

    let lastError = '';
    for (const model of cascade) {
      try {
        const reply = await callGeminiRest(apiKey, model, message, fullSystemInstruction, 350);
        return NextResponse.json({
          success: true,
          reply,
          modelUsed: model
        });
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[Simulator] Model ${model} failed:`, err.message);
      }
    }

    return NextResponse.json({
      success: false,
      error: `All Gemini models in cascade failed. Last error from Google: ${lastError}`
    }, { status: 502 });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error while simulating AI response.'
    }, { status: 500 });
  }
}
