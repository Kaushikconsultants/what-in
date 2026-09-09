import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { phone, conversationId, eventValue, customEventName = "Lead" } = body;

    // Fetch dynamic metaCapiLeadValue if not provided
    if (!eventValue) {
      const settings = await prisma.whatsAppSettings.findFirst();
      eventValue = settings?.metaCapiLeadValue || 10000;
    }

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Fetch active Meta CAPI integration
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { type: "META_CAPI", isActive: true }
    });

    if (!integration || !integration.url || !integration.token) {
      return NextResponse.json({ 
        error: "Meta CAPI integration is not active or missing Pixel ID / Token in Integrations settings." 
      }, { status: 400 });
    }

    const pixelId = integration.url.trim();
    const accessToken = integration.token.trim();
    const eventId = `evt_interested_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const hashedPhone = crypto.createHash('sha256').update(cleanPhone).digest('hex');

    const eventObj = {
      event_name: customEventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: {
        ph: [hashedPhone]
      },
      custom_data: {
        currency: "INR",
        value: Number(eventValue),
        lead_stage: "Interested",
        lead_quality: "HIGH_VALUE_CONVERSION"
      }
    };

    const payload = {
      data: [eventObj],
      access_token: accessToken
    };

    console.log(`[Inbox CAPI] Firing ${customEventName} (₹${eventValue}) for phone ${cleanPhone} to Pixel ${pixelId}...`);
    
    const capiRes = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resData = await capiRes.json();
    console.log(`[Inbox CAPI] Meta Response:`, resData);

    if (!capiRes.ok) {
      return NextResponse.json({ 
        error: resData?.error?.message || "Failed to fire Meta CAPI conversion event",
        details: resData 
      }, { status: 400 });
    }

    // Update Customer / Conversation CRM Stage to Interested
    let updatedCustomer = null;
    try {
      const customer = await prisma.customer.findFirst({
        where: { OR: [{ mobile: { contains: cleanPhone } }, { whatsappNumber: { contains: cleanPhone } }] }
      });

      if (customer) {
        const existingTags = (customer.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
        const newTags = Array.from(new Set([...existingTags, "Interested_Lead", `Meta_Conversion_₹${eventValue}`]));

        updatedCustomer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            leadStage: "Lead Interested",
            tags: newTags.join(', ')
          }
        });
      }
    } catch (tagErr) {
      console.warn("[Mark Lead Interested] Could not update customer tags/stage:", tagErr);
    }

    // Log in Chatbot Logs table for auditing
    await prisma.whatsAppChatbotLog.create({
      data: {
        phone: cleanPhone,
        conversationId: conversationId || null,
        nodeId: "INBOX_INTERESTED_BTN",
        nodeType: "META_CAPI_INBOX",
        actionDesc: `Inbox Agent fired Meta CAPI ${customEventName} event (₹${eventValue} INR)`,
        payload: payload,
        responseStatus: capiRes.status,
        errorMessage: null
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully marked Lead Interested and fired ₹${eventValue} INR ${customEventName} conversion to Meta!`,
      fbtrace_id: resData.fbtrace_id || eventId,
      events_received: resData.events_received || 1,
      customer: updatedCustomer
    });

  } catch (err: any) {
    console.error("[Mark Lead Interested API Error]:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
