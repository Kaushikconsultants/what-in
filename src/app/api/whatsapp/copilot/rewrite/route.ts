import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { draft, tone } = await req.json();
    if (!draft) return NextResponse.json({ error: "No draft provided" }, { status: 400 });

    let systemPrompt = `Rewrite the following message to sound ${tone || 'professional but friendly'}. Keep it concise for WhatsApp.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: draft }],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content?.trim() || draft;
    
    // Remove think tags if any
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return NextResponse.json({ rewritten: text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
