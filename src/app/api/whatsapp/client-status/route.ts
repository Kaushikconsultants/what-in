import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const client = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
    if (!client) return NextResponse.json({ pastDue: false, blocked: false, daysLeft: 0 });
    const now = new Date();
    const isPastDue = client.subscriptionStatus === "PAST_DUE" || (client.subscriptionStatus === "ACTIVE" && client.currentPeriodEnd < now);
    const isBlocked = client.subscriptionStatus === "BLOCKED" || (isPastDue && (now.getTime() - client.currentPeriodEnd.getTime()) > client.gracePeriodDays * 24 * 60 * 60 * 1000);
    const daysLeft = isPastDue && !isBlocked ? Math.max(0, client.gracePeriodDays - Math.floor((now.getTime() - client.currentPeriodEnd.getTime()) / (24 * 60 * 60 * 1000))) : 0;
    return NextResponse.json({ 
      pastDue: isPastDue && !isBlocked, 
      blocked: isBlocked, 
      daysLeft, 
      ownerWhatsApp: client.ownerWhatsApp, 
      subscriptionStatus: client.subscriptionStatus,
      maxAgents: client.maxAgents || 3,
      clientId: client.id,
      webhookClientId: client.webhookClientId,
      businessName: client.businessName
    });
  } catch {
    return NextResponse.json({ pastDue: false, blocked: false, daysLeft: 0, maxAgents: 3 });
  }
}
