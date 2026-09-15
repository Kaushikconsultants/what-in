import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCampaignQueueAction, processDripCampaignStepAction } from "@/app/actions/whatsAppPlatformActions";
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

    // 1. Process One-time Scheduled Broadcasts
    const pendingCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now }
      }
    });

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

    // 2. Evaluate and Dispatch Automated Multi-Day Drip Campaigns
    const parentDripCampaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        dripStepsJson: { not: null },
        status: { in: ["COMPLETED", "ACTIVE", "PROCESSING"] }
      }
    });

    const triggeredDrips: Array<{ campaign: string; stepNumber: number; count: number }> = [];

    for (const parent of parentDripCampaigns) {
      try {
        const steps: any[] = JSON.parse(parent.dripStepsJson || "[]");
        const launchTime = parent.scheduledAt || parent.createdAt;

        for (const step of steps) {
          const delayHours = Number(step.delayHours) || 24;
          const stepNumber = Number(step.stepNumber) || 2;
          const targetTime = new Date(launchTime.getTime() + delayHours * 3600 * 1000);

          if (now >= targetTime) {
            // Check if this drip step was already executed for this parent campaign
            const existingChild = await prisma.whatsAppCampaign.findFirst({
              where: {
                parentCampaignId: parent.id,
                dripStepNumber: stepNumber
              }
            });

            if (!existingChild) {
              console.log(`[Drip Cron] Triggering Drip Step #${stepNumber} for "${parent.name}" (${parent.id})`);
              const dripRes = await processDripCampaignStepAction(parent.id, stepNumber);
              if (dripRes.success && (dripRes as any).dispatchedCount > 0) {
                triggeredDrips.push({
                  campaign: parent.name,
                  stepNumber,
                  count: (dripRes as any).dispatchedCount
                });
              }
            }
          }
        }
      } catch (dripErr) {
        console.error(`[Drip Cron] Error evaluating drip campaign ${parent.id}:`, dripErr);
      }
    }

    if (processed.length === 0 && triggeredDrips.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No scheduled broadcasts or drip follow-up steps ready to process." 
      });
    }

    return NextResponse.json({ 
      success: true, 
      triggeredScheduled: processed,
      triggeredDrips 
    });
  } catch (error: any) {
    console.error("[Campaign Cron] Fatal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}