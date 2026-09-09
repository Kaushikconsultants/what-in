import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();
    if (!conversationId) return NextResponse.json({ error: "No conversationId provided" }, { status: 400 });

    const recentMessages = await prisma.whatsAppMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'desc' },
      take: 5
    });
    
    if (recentMessages.length === 0) return NextResponse.json({ suggestions: ["Hi! How can I help you today?", "Are you looking for any specific products?", "Can I help you track your order?"] });

    const history = recentMessages.reverse().map(m => `${m.senderType}: ${m.content}`).join('\n');

    let systemPrompt = `You are a helpful e-commerce AI assistant for the brand. Read the following WhatsApp conversation history and generate 3 short, natural, distinct quick reply suggestions that the customer support agent could tap to send next. Return ONLY a JSON array of strings, e.g. ["Hello, how can I help?", "Your order is shipped.", "Here is the payment link."].`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: history }],
        temperature: 0.7,
        max_tokens: 150,
        response_format: { type: "json_object" }
      }),
    });

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content?.trim();
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let suggestions = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) suggestions = parsed;
      else if (parsed.suggestions && Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions;
    } catch (e) {
      // fallback parsing
      suggestions = text.split('\n').map((l: string) => l.replace(/^[-*0-9.]+\s*/, '').replace(/["']/g, '')).filter((l: string) => l.length > 5).slice(0, 3);
    }

    if (suggestions.length === 0) suggestions = ["How can I assist you?", "Please provide your order number.", "Would you like to see our latest collection?"];

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
