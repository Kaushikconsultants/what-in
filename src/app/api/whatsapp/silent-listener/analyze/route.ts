import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';
import { callGeminiRest, HARDCODED_PRIMARY_MODEL } from '@/lib/whatsappAI';

// How many recent conversations to scan per run (increase if needed)
const SCAN_LIMIT = 200;
// Only capture pairs with overall score >= this threshold (0.65 allows casual real conversations)
const MIN_QUALITY_THRESHOLD = 0.65;

export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = user?.clientId ?? (await req.json().catch(() => ({}))).clientId;
    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    // Resolve API key for this tenant
    const clientRecord = await prisma.whatsAppClient.findUnique({
      where: { id: clientId },
      select: { geminiApiKey: true, aiModel: true },
    });
    const apiKey = clientRecord?.geminiApiKey?.trim();
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key is not configured for this client. Please configure your API key in Settings -> AI Automation.' }, { status: 400 });

    // For CLOSED conversations: skip ones already fully scanned
    // For OPEN conversations: always re-scan (new messages may have arrived)
    const closedScannedIds = await prisma.silentListenerEntry.findMany({
      where: { clientId },
      select: { conversationId: true },
      distinct: ['conversationId'],
    }).catch(() => []);
    const excludeClosedIds = closedScannedIds.map((e) => e.conversationId);

    // Track already-captured Q&A pairs to avoid duplicates in OPEN convos
    const existingPairs = await prisma.silentListenerEntry.findMany({
      where: { clientId },
      select: { conversationId: true, customerQuestion: true },
    });
    const capturedSet = new Set(
      existingPairs.map((e) => `${e.conversationId}|||${e.customerQuestion.slice(0, 80)}`)
    );

    const conversations = await prisma.whatsAppConversation.findMany({
      where: {
        clientId,
        // OPEN: always scan. CLOSED: skip if already scanned.
        OR: [
          { status: { in: ['OPEN', 'SNOOZED', 'PENDING'] } },
          { status: 'CLOSED', id: { notIn: excludeClosedIds } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: SCAN_LIMIT,
      include: {
        messages: {
          where: {
            isInternalNote: false,
            // Include ALL non-system sender types to allow lookahead matching
            senderType: { in: ['CUSTOMER', 'AGENT', 'AI'] },
          },
          orderBy: { sentAt: 'asc' },
          select: {
            senderType: true,
            content: true,
            senderName: true,
            senderId: true,
          },
        },
      },
    });

    if (conversations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new conversations to analyze',
        entriesCreated: 0,
      });
    }

    let totalCreated = 0;
    const errors: string[] = [];

    for (const convo of conversations) {
      try {
        // Build Q-A pairs using lookahead — handles BOT/AI/SYSTEM messages in between
        // For each CUSTOMER message, find the NEXT AGENT/AI reply (not necessarily immediately next)
        const pairs: { question: string; answer: string; agentName: string; agentId: string }[] = [];
        const msgs = convo.messages;

        for (let i = 0; i < msgs.length; i++) {
          if (msgs[i].senderType !== 'CUSTOMER') continue;

          const question = msgs[i].content?.trim();
          if (!question || question.length < 3) continue;

          // Lookahead: find next AGENT or AI message
          let agentMsg = null;
          for (let j = i + 1; j < msgs.length; j++) {
            if (msgs[j].senderType === 'CUSTOMER') break; // New customer message = no reply found
            if (msgs[j].senderType === 'AGENT' || msgs[j].senderType === 'AI') {
              agentMsg = msgs[j];
              break;
            }
          }

          if (!agentMsg) continue;

          const answer = agentMsg.content?.trim();
          if (!answer || answer.length < 5) continue;

          // Skip already-captured pairs (for OPEN conversation re-scans)
          const pairKey = `${convo.id}|||${question.slice(0, 80)}`;
          if (capturedSet.has(pairKey)) continue;

          pairs.push({
            question,
            answer,
            agentName: agentMsg.senderName || 'Agent',
            agentId: agentMsg.senderId || '',
          });
        }

        if (pairs.length === 0) continue;

        // Build the Gemini prompt to score ALL pairs from this conversation at once
        const pairsJson = JSON.stringify(
          pairs.map((p, idx) => ({ index: idx, question: p.question, answer: p.answer }))
        );

        const scoringPrompt = `You are an expert customer service quality analyst.

Analyze the following customer-agent Q&A pairs from a WhatsApp business conversation.
For each pair, score them and identify which ones are genuinely excellent — clear, accurate, professional, and would make a perfect FAQ entry.

Q&A Pairs (JSON):
${pairsJson}

For each pair, respond with a JSON array where each item has:
- index: (same as input)
- qualityScore: float 0.0-1.0 (accuracy/usefulness)
- toneScore: float 0.0-1.0 (professionalism/friendliness)
- resolutionScore: float 0.0-1.0 (did it fully resolve the question?)
- overallScore: weighted average (quality*0.5 + tone*0.2 + resolution*0.3)
- category: one of [FAQ, Pricing, Returns, Shipping, Product, Order, Payment, General]
- aiReasoning: one sentence on why you rated it this way
- kbEntry: A clean formatted string "Q: {question}\\nA: {answer}" suitable for a knowledge base

Only return the JSON array, no markdown, no explanation.`;

        let rawResponse = '';
        try {
          rawResponse = await callGeminiRest(apiKey, HARDCODED_PRIMARY_MODEL, scoringPrompt, '', 2000);
        } catch {
          errors.push(`Convo ${convo.id}: Gemini call failed`);
          continue;
        }

        // Parse response
        let scores: any[] = [];
        try {
          const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) scores = JSON.parse(jsonMatch[0]);
        } catch {
          errors.push(`Convo ${convo.id}: JSON parse failed`);
          continue;
        }

        // Save high-quality entries
        for (const scored of scores) {
          if (!scored || typeof scored.overallScore !== 'number') continue;
          if (scored.overallScore < MIN_QUALITY_THRESHOLD) continue;

          const pair = pairs[scored.index];
          if (!pair) continue;

          await prisma.silentListenerEntry.create({
            data: {
              clientId,
              conversationId: convo.id,
              customerQuestion: pair.question,
              agentAnswer: pair.answer,
              qualityScore: Math.min(1, Math.max(0, scored.qualityScore ?? 0.8)),
              toneScore: Math.min(1, Math.max(0, scored.toneScore ?? 0.8)),
              resolutionScore: Math.min(1, Math.max(0, scored.resolutionScore ?? 0.8)),
              overallScore: Math.min(1, Math.max(0, scored.overallScore)),
              aiReasoning: scored.aiReasoning ?? null,
              category: scored.category ?? 'General',
              agentName: pair.agentName,
              agentId: pair.agentId || null,
              kbEntry: scored.kbEntry ?? `Q: ${pair.question}\nA: ${pair.answer}`,
              status: 'PENDING',
            },
          });
          totalCreated++;
        }
      } catch (convoErr: any) {
        errors.push(`Convo ${convo.id}: ${convoErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      conversationsScanned: conversations.length,
      entriesCreated: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[SilentListener] Analyze error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
