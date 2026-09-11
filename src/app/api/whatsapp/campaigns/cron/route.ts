import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCampaignQueueAction } from "@/app/actions/whatsAppPlatformActions";
import { isOwnerAuthenticated, getAuthenticatedUser } from "@/lib/authSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isCronBearerValid = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    if (!isCronBearerValid) {
      const isOwner = isOwnerAuthenticated(req);
      const user = await getAuthenticatedUser(req);
      if (!isOwner && !user) {
        return NextResponse.json({ error: "Unauthorized cron execution. Valid CRON_SECRET or authenticated session required." }, { status: 401 });
      }
    }
    const now = new Date();
    const pendingCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now }
      }
    });

    if (pendingCampaigns.length === 0) {
      return NextResponse.json({ success: true, message: "No scheduled campaigns ready to process." });
    }

    const processed = [];
    for (const campaign of pendingCampaigns) {
      console.log(`[Campaign Cron] Dispatching scheduled campaign: ${campaign.name} (${campaign.id})`);
      
      await prisma.whatsAppCampaign.update({
        where: { id: campaign.id },
        data: { status: "PROCESSING" }
      });

      // Asynchronously process the message queue
      processCampaignQueueAction(campaign.id).catch(e => {
        console.error(`[Campaign Cron] Failed to process campaign ${campaign.id}:`, e);
      });

      processed.push(campaign.name);
    }

    return NextResponse.json({ success: true, triggered: processed });
  } catch (error: any) {
    console.error("[Campaign Cron] Fatal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}