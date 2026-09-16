import { prisma } from "@/lib/prisma";

export interface LeadSyncPayload {
  name: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  leadStage?: string | null;
  tags?: string | null;
  notes?: string | null;
  city?: string | null;
  state?: string | null;
}

/**
 * Synchronizes an inbound lead to the client's configured Google Sheet
 * via Google Apps Script Webhook or direct spreadsheet webhook URL.
 */
export async function syncLeadToGoogleSheet(
  clientId: string,
  lead: LeadSyncPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await prisma.whatsAppGoogleSheetSync.findUnique({
      where: { clientId },
    });

    if (!config || !config.googleScriptUrl || !config.syncLeads) {
      return { success: false, error: "Google Sheets sync is not active or URL is missing." };
    }

    const payload = {
      action: "APPEND_LEAD",
      sheetName: config.sheetName || "Leads",
      secret: config.webhookSecret,
      timestamp: new Date().toISOString(),
      lead: {
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        name: lead.name || "Anonymous Lead",
        phone: lead.phone,
        email: lead.email || "",
        source: lead.source || "Website / API",
        stage: lead.leadStage || "INQUIRY",
        tags: lead.tags || "",
        city: lead.city || "",
        state: lead.state || "",
        notes: lead.notes || "",
      },
    };

    // Asynchronously dispatch to Google Apps Script
    const response = await fetch(config.googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await prisma.whatsAppGoogleSheetSync.update({
        where: { id: config.id },
        data: {
          lastSyncedAt: new Date(),
          totalRowsSynced: { increment: 1 },
        },
      });
      return { success: true };
    } else {
      const errText = await response.text().catch(() => "HTTP error");
      return { success: false, error: `Google Sheets endpoint returned HTTP ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    console.warn("[GoogleSheetsSync] Failed to sync lead row:", err.message);
    return { success: false, error: err.message };
  }
}
