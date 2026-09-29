import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

// GET: Fetch pending/approved/rejected entries for review dashboard
export async function GET(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId') || user?.clientId || null;
    const status = searchParams.get('status') || 'PENDING';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Owner without clientId can see all entries across all clients
    const whereBase = clientId ? { clientId } : {};

    const [entries, total, stats] = await Promise.all([
      prisma.silentListenerEntry.findMany({
        where: { ...whereBase, status },
        orderBy: { overallScore: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.silentListenerEntry.count({ where: { ...whereBase, status } }),
      prisma.silentListenerEntry.groupBy({
        by: ['status'],
        where: whereBase,
        _count: { status: true },
      }),
    ]);

    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      INJECTED: 0,
    };
    stats.forEach((s) => {
      if (s.status in statusCounts) {
        statusCounts[s.status as keyof typeof statusCounts] = s._count.status;
      }
    });

    return NextResponse.json({
      success: true,
      entries,
      total,
      page,
      pages: Math.ceil(total / limit),
      statusCounts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Approve, Reject, or Inject an entry
export async function PATCH(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId, action, clientId: bodyClientId } = await req.json();
    // action: "APPROVE" | "REJECT" | "INJECT" | "APPROVE_ALL"
    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 });
    }
    // Single-entry actions require entryId
    const singleActions = ['APPROVE', 'REJECT', 'INJECT'];
    if (singleActions.includes(action) && !entryId) {
      return NextResponse.json({ error: 'entryId required for this action' }, { status: 400 });
    }

    const clientId = user?.clientId || bodyClientId || null;
    const reviewedBy = user?.email || (isOwner ? 'owner' : 'admin');

    // For single-entry actions, validate the entry exists
    let entry = null;
    if (entryId) {
      entry = await prisma.silentListenerEntry.findUnique({ where: { id: entryId } });
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      if (entry.clientId !== clientId && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (action === 'APPROVE') {
      await prisma.silentListenerEntry.update({
        where: { id: entryId },
        data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy },
      });
      return NextResponse.json({ success: true, message: 'Entry approved ✅' });
    }

    if (action === 'REJECT') {
      await prisma.silentListenerEntry.update({
        where: { id: entryId },
        data: { status: 'REJECTED', reviewedAt: new Date(), reviewedBy },
      });
      return NextResponse.json({ success: true, message: 'Entry rejected' });
    }

    if (action === 'INJECT') {
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      const kbText = entry.kbEntry || `Q: ${entry.customerQuestion}\nA: ${entry.agentAnswer}`;
      const targetClientId = entry.clientId;

      // Append to WhatsAppClient KB using Prisma update
      const clientRec = await prisma.whatsAppClient.findUnique({
        where: { id: targetClientId },
        select: { aiKnowledgeBase: true },
      });

      if (clientRec) {
        const existingKb = clientRec.aiKnowledgeBase ? clientRec.aiKnowledgeBase.trim() : '';
        const updatedKb = existingKb ? `${existingKb}\n\n---\n${kbText}` : kbText;
        await prisma.whatsAppClient.update({
          where: { id: targetClientId },
          data: { aiKnowledgeBase: updatedKb },
        });
      }

      // Also update default WhatsAppSettings KB if it exists
      try {
        const defaultSettings = await prisma.whatsAppSettings.findFirst();
        if (defaultSettings) {
          const curSettingsKb = defaultSettings.aiKnowledgeBase ? defaultSettings.aiKnowledgeBase.trim() : '';
          const updatedSettingsKb = curSettingsKb ? `${curSettingsKb}\n\n---\n${kbText}` : kbText;
          await prisma.whatsAppSettings.update({
            where: { id: defaultSettings.id },
            data: { aiKnowledgeBase: updatedSettingsKb },
          });
        }
      } catch (_) {}

      await prisma.silentListenerEntry.update({
        where: { id: entryId },
        data: { status: 'INJECTED', reviewedAt: new Date(), reviewedBy },
      });

      return NextResponse.json({ success: true, message: 'Injected into AI Knowledge Base 🧠✅' });
    }

    // Bulk approve and inject all PENDING
    if (action === 'APPROVE_ALL') {
      const whereClause = clientId ? { clientId, status: 'PENDING' } : { status: 'PENDING' };
      const pendingEntries = await prisma.silentListenerEntry.findMany({
        where: whereClause,
        select: { id: true, clientId: true, kbEntry: true, customerQuestion: true, agentAnswer: true },
      });

      if (pendingEntries.length === 0) {
        return NextResponse.json({ success: true, message: 'No pending entries to inject' });
      }

      // Group entries by clientId
      const byClient: Record<string, typeof pendingEntries> = {};
      for (const e of pendingEntries) {
        if (!byClient[e.clientId]) byClient[e.clientId] = [];
        byClient[e.clientId].push(e);
      }

      for (const [cId, cEntries] of Object.entries(byClient)) {
        const newKbSnippets = cEntries
          .map((e) => e.kbEntry || `Q: ${e.customerQuestion}\nA: ${e.agentAnswer}`)
          .join('\n\n---\n');

        const clientRec = await prisma.whatsAppClient.findUnique({
          where: { id: cId },
          select: { aiKnowledgeBase: true },
        });

        if (clientRec) {
          const existingKb = clientRec.aiKnowledgeBase ? clientRec.aiKnowledgeBase.trim() : '';
          const updatedKb = existingKb ? `${existingKb}\n\n---\n${newKbSnippets}` : newKbSnippets;
          await prisma.whatsAppClient.update({
            where: { id: cId },
            data: { aiKnowledgeBase: updatedKb },
          });
        }

        // Also update WhatsAppSettings
        try {
          const defaultSettings = await prisma.whatsAppSettings.findFirst();
          if (defaultSettings) {
            const curSettingsKb = defaultSettings.aiKnowledgeBase ? defaultSettings.aiKnowledgeBase.trim() : '';
            const updatedSettingsKb = curSettingsKb ? `${curSettingsKb}\n\n---\n${newKbSnippets}` : newKbSnippets;
            await prisma.whatsAppSettings.update({
              where: { id: defaultSettings.id },
              data: { aiKnowledgeBase: updatedSettingsKb },
            });
          }
        } catch (_) {}

        // Mark entries as INJECTED
        const ids = cEntries.map((e) => e.id);
        await prisma.silentListenerEntry.updateMany({
          where: { id: { in: ids } },
          data: { status: 'INJECTED', reviewedAt: new Date(), reviewedBy },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully injected ${pendingEntries.length} Q&A pairs into AI Knowledge Base! 🧠🎉`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[SilentListener] Review error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
