import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";
import crypto from "crypto";

async function resolveClient(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return client;
  }
  return await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
}

/**
 * GET /api/v1/integrations/google-sheets
 * Fetch Google Sheets configuration, sync statistics, and Apps Script template code.
 */
export async function GET(req: NextRequest) {
  try {
    const client = await resolveClient(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    let config = await prisma.whatsAppGoogleSheetSync.findUnique({
      where: { clientId: client.id },
    });

    if (!config) {
      config = await prisma.whatsAppGoogleSheetSync.create({
        data: {
          clientId: client.id,
          sheetName: "Leads",
          syncLeads: true,
          syncOrders: true,
          syncStatus: true,
          webhookSecret: `wgs_${crypto.randomBytes(16).toString("hex")}`,
        },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://whatsapp.esponsports.com";
    const inboundWebhookUrl = `${appUrl}/api/v1/leads/ingest?apiKey=YOUR_API_KEY`;

    // Google Apps Script sample code
    const appsScriptTemplate = `
/**
 * WhatIn / WhatMore Google Sheets 2-Way Automation Script
 * Paste this into Google Spreadsheets: Extensions -> Apps Script
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheetName || "Leads");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(data.sheetName || "Leads");
      sheet.appendRow(["Timestamp", "Customer Name", "Phone", "Email", "Source", "Lead Stage", "Tags", "City", "State", "Notes"]);
      sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#e2e8f0");
    }

    if (data.action === "APPEND_LEAD" && data.lead) {
      var l = data.lead;
      sheet.appendRow([l.timestamp, l.name, l.phone, l.email, l.source, l.stage, l.tags, l.city, l.state, l.notes]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Ping received" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`.trim();

    return NextResponse.json({
      success: true,
      config,
      inboundWebhookUrl,
      appsScriptTemplate,
    });
  } catch (err: any) {
    console.error("[Google Sheets Config GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/integrations/google-sheets
 * Update Google Sheets sync settings and Google Apps Script Webhook URL.
 */
export async function POST(req: NextRequest) {
  try {
    const client = await resolveClient(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { spreadsheetId, sheetName, googleScriptUrl, syncLeads, syncOrders, syncStatus } = body;

    const updated = await prisma.whatsAppGoogleSheetSync.upsert({
      where: { clientId: client.id },
      create: {
        clientId: client.id,
        spreadsheetId: spreadsheetId || null,
        sheetName: sheetName || "Leads",
        googleScriptUrl: googleScriptUrl ? googleScriptUrl.trim() : null,
        syncLeads: syncLeads !== false,
        syncOrders: syncOrders !== false,
        syncStatus: syncStatus !== false,
        webhookSecret: `wgs_${crypto.randomBytes(16).toString("hex")}`,
      },
      update: {
        spreadsheetId: spreadsheetId !== undefined ? spreadsheetId : undefined,
        sheetName: sheetName !== undefined ? sheetName : undefined,
        googleScriptUrl: googleScriptUrl !== undefined ? googleScriptUrl.trim() : undefined,
        syncLeads: syncLeads !== undefined ? Boolean(syncLeads) : undefined,
        syncOrders: syncOrders !== undefined ? Boolean(syncOrders) : undefined,
        syncStatus: syncStatus !== undefined ? Boolean(syncStatus) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google Sheets configuration saved successfully.",
      config: updated,
    });
  } catch (err: any) {
    console.error("[Google Sheets Config POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/v1/integrations/google-sheets
 * Test connection to the Google Apps Script webhook URL.
 */
export async function PUT(req: NextRequest) {
  try {
    const client = await resolveClient(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const testUrl = (body.googleScriptUrl || "").trim();

    if (!testUrl || !testUrl.startsWith("http")) {
      return NextResponse.json({ success: false, error: "Please enter a valid Google Apps Script Webhook URL." }, { status: 400 });
    }

    const testPayload = {
      action: "TEST_CONNECTION",
      message: "Testing connection from WhatsApp Hub",
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(testUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "Google Apps Script webhook verified successfully! Ready for live 2-way lead sync.",
      });
    } else {
      const errText = await response.text().catch(() => "HTTP error");
      return NextResponse.json(
        { success: false, error: `Google Apps Script returned HTTP ${response.status}: ${errText}` },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("[Google Sheets Test PUT] Error:", err);
    return NextResponse.json({ success: false, error: `Connection failed: ${err.message}` }, { status: 500 });
  }
}
