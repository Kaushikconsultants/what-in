import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCampaignQueueAction } from "@/app/actions/whatsAppPlatformActions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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