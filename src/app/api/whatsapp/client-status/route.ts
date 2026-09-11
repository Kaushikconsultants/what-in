import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  try {
    let clientId: string | undefined;

    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);

    if (authUser?.clientId) {
      clientId = authUser.clientId;
    } else if (isOwner) {
      const urlClientId = req.nextUrl.searchParams.get("clientId");
      if (urlClientId) clientId = urlClientId;
    }

    let client = null;
    if (clientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    }

    if (!client) {
      // Fall back to most recently active or created client
      client = await prisma.whatsAppClient.findFirst({
        where: { subscriptionStatus: { not: "BLOCKED" } },
        orderBy: { createdAt: "desc" }
      });
      if (!client) {
        client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
      }
    }

    if (!client) return NextResponse.json({ pastDue: false, blocked: false, daysLeft: 0, maxAgents: 3 });

    const now = new Date();
    const periodEnd = new Date(client.currentPeriodEnd);
    const hasExpired = periodEnd.getTime() < now.getTime();

    // Client is only past due if explicit status is PAST_DUE or status is ACTIVE but date is strictly in the past
    const isPastDue = client.subscriptionStatus === "PAST_DUE" || (client.subscriptionStatus === "ACTIVE" && hasExpired);
    const isBlocked = client.subscriptionStatus === "BLOCKED" || (isPastDue && (now.getTime() - periodEnd.getTime()) > (client.gracePeriodDays || 7) * 24 * 60 * 60 * 1000);
    
    // Calculate days left in grace period if past due, or days left in active cycle
    const daysLeftInGrace = isPastDue && !isBlocked
      ? Math.max(0, (client.gracePeriodDays || 7) - Math.floor((now.getTime() - periodEnd.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    const daysLeftInCycle = !hasExpired
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return NextResponse.json({ 
      pastDue: isPastDue && !isBlocked, 
      blocked: isBlocked, 
      daysLeft: isPastDue ? daysLeftInGrace : daysLeftInCycle, 
      ownerWhatsApp: client.ownerWhatsApp, 
      subscriptionStatus: client.subscriptionStatus,
      maxAgents: client.maxAgents || 3,
      clientId: client.id,
      webhookClientId: client.webhookClientId,
      businessName: client.businessName,
      currentPeriodEnd: client.currentPeriodEnd,
      monthlyMessageQuota: client.monthlyMessageQuota || 5000,
      monthlyAiQuota: client.monthlyAiQuota || 500,
      messagesUsedCount: client.messagesUsedCount || 0,
      aiRepliesUsedCount: client.aiRepliesUsedCount || 0
    });
  } catch {
    return NextResponse.json({ pastDue: false, blocked: false, daysLeft: 0, maxAgents: 3 });
  }
}
