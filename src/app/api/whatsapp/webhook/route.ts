import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { handleIncomingAILogic } from "@/lib/whatsappAI";
import { executeFlowEngine } from "@/lib/whatsappFlowEngine";
import { 
  assignWhatsAppLeadAction, 
  generateWhatsAppPaymentLinkAction, 
  sendWhatsAppFlowMessageAction, 
  sendWhatsAppMessageAction 
} from "@/app/actions/whatsAppPlatformActions";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";
import { notifyAdminsOfTemplateStatusChange } from "@/lib/pushNotifications";
import { emitInboxEvent } from "@/lib/inboxEvents";
import { processUpiScreenshotAction } from "@/app/actions/upiScreenshotActions";
import { getRecoveryAgentSettings } from "@/lib/paymentRecoveryAgent";
import { dispatchOutboundWebhook } from "@/lib/outboundWebhookDispatcher";
import { lookupPincode } from "@/lib/pincodeLookup";

const MAX_DEDUP_SIZE = 2000;
const dedupQueue: string[] = [];
const dedupSet = new Set<string>();

function isDuplicateMessageId(msgId: string): boolean {
  if (!msgId) return false;
  if (dedupSet.has(msgId)) return true;
  
  if (dedupQueue.length >= MAX_DEDUP_SIZE) {
    const oldest = dedupQueue.shift();
    if (oldest) dedupSet.delete(oldest);
  }
  dedupQueue.push(msgId);
  dedupSet.add(msgId);
  return false;
}

// GET Endpoint - Webhook Verification Challenge from Meta WhatsApp API (Global)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token")?.trim();
  const challenge = searchParams.get("hub.challenge");

  const staticTokens = [
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim(),
    "whatin_whatsapp_secure_webhook_token_2026",
    "espon_whatsapp_secure_webhook_token_2026"
  ].filter(Boolean) as string[];

  if (mode === "subscribe" && token) {
    // 1. Check static tokens
    if (staticTokens.some(t => t.toLowerCase() === token.toLowerCase())) {
      console.log(`[WhatsApp Global Webhook] Verification successful via static token "${token}"!`);
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // 2. Check if this token matches ANY client in the database
    try {
      const allClients = await prisma.whatsAppClient.findMany({
        select: { id: true, businessName: true, webhookClientId: true, webhookVerifyToken: true }
      });

      for (const cl of allClients) {
        const brandSlug = (cl.businessName || "client").toLowerCase().replace(/[^a-z0-9]/g, '_');
        const allowed = [
          cl.webhookVerifyToken?.trim(),
          `wm_${cl.webhookClientId.slice(0, 8)}`,
          `wm_${cl.webhookClientId}`,
          cl.webhookClientId?.trim(),
          cl.id,
          `${brandSlug}_whatsapp_secure_webhook_token_2026`,
          `wm_${brandSlug}_token_2026`
        ].filter(Boolean) as string[];

        if (allowed.some(t => t.toLowerCase() === token.toLowerCase())) {
          console.log(`[WhatsApp Global Webhook] Verification successful for tenant "${cl.businessName}"!`);
          return new NextResponse(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" }
          });
        }
      }
    } catch (err) {
      console.error("[WhatsApp Global Webhook] Error querying clients for token:", err);
    }
  }

  console.warn(`[WhatsApp Global Webhook] Verification FAILED for token: "${token}"`);
  return NextResponse.json({ error: "Forbidden - Invalid verify token" }, { status: 403 });
}

// Reusable Multi-Tenant Webhook Message Processor
export async function processWebhookPayload(body: any, clientIdOverride?: string | null) {
  // 1. Log Webhook Payload in DB for audit trail
  try {
    await prisma.whatsAppWebhookLog.create({
      data: {
        event: "WEBHOOK_RECEIVED",
        payload: body
      }
    });
  } catch (e) {
    console.error("Failed to log webhook", e);
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value) {
    return { status: "ignored" };
  }

  // ══════════════════════════════════════════════════════
  // RESOLVE TENANT / CLIENT CONTEXT
  // ══════════════════════════════════════════════════════
  let client: any = null;
  if (clientIdOverride) {
    client = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [
          { id: clientIdOverride },
          { webhookClientId: clientIdOverride }
        ]
      }
    }).catch(() => null);
  }

  if (!client) {
    const metaPhoneId = value.metadata?.phone_number_id;
    const metaDisplayPhone = value.metadata?.display_phone_number;
    const wabaId = entry?.id;

    if (metaPhoneId || metaDisplayPhone || wabaId) {
      client = await prisma.whatsAppClient.findFirst({
        where: {
          OR: [
            ...(metaPhoneId ? [{ phoneId: String(metaPhoneId) }] : []),
            ...(metaDisplayPhone ? [{ phoneNumber: String(metaDisplayPhone) }] : []),
            ...(wabaId ? [{ wabaId: String(wabaId) }] : [])
          ]
        }
      }).catch(() => null);
    }
  }

  const clientId = client?.id || null;

  // Blocked / Inactive Client Check
  if (client) {
    if (client.subscriptionStatus === "BLOCKED" || client.isActive === false) {
      console.warn(`[Webhook] Ignored message for BLOCKED/INACTIVE client: ${client.businessName} (${client.id})`);
      return { status: "ignored - client blocked" };
    }
  }

  // ══════════════════════════════════════════════════════
  // 0. PROCESS MESSAGE TEMPLATE STATUS UPDATES (APPROVED, REJECTED, PAUSED, DISABLED)
  // ══════════════════════════════════════════════════════
  const changeField = changes?.field;
  if (changeField === "message_template_status_update" || value.event || (value.message_template_name && value.event)) {
    const templateEvent = (value.event || "").toUpperCase();
    const templateId = value.message_template_id ? String(value.message_template_id) : undefined;
    const templateName = value.message_template_name;
    const templateLang = value.message_template_language || "en_US";
    const rejectionReason = value.reason || value.rejection_reason || value.rejected_reason || (value.disable_info?.disable_date ? "Disabled by Meta" : null);

    if (templateEvent && (templateId || templateName)) {
      console.log(`[Meta Webhook] Template Status Event: ${templateName || templateId} -> ${templateEvent} (Reason: ${rejectionReason})`);

      try {
        const existing = await prisma.whatsAppTemplate.findFirst({
          where: {
            ...(clientId ? { clientId } : {}),
            OR: [
              ...(templateId ? [{ id: templateId }] : []),
              ...(templateName ? [{ name: templateName }] : [])
            ]
          }
        });

        if (existing) {
          await prisma.whatsAppTemplate.update({
            where: { id: existing.id },
            data: {
              status: templateEvent,
              rejectionReason: rejectionReason ? String(rejectionReason) : null,
              language: templateLang || existing.language
            }
          });
        }

        await notifyAdminsOfTemplateStatusChange(
          templateName || existing?.name || "Template",
          templateEvent,
          rejectionReason,
          templateLang
        );
      } catch (templateWebhookErr) {
        console.error("[Meta Webhook] Error processing template status update:", templateWebhookErr);
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // 1. PROCESS MESSAGE STATUS UPDATES (SENT, DELIVERED, READ, FAILED)
  // ══════════════════════════════════════════════════════
  if (value.statuses && Array.isArray(value.statuses)) {
    for (const st of value.statuses) {
      try {
        const wamid = st.id;
        const status = (st.status || "").toLowerCase();
        const recipientId = st.recipient_id ? st.recipient_id.replace(/\D/g, "") : "";
        const last10 = recipientId.slice(-10);

        let targetStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null = null;
        if (status === 'delivered') targetStatus = 'DELIVERED';
        else if (status === 'read') targetStatus = 'READ';
        else if (status === 'failed') targetStatus = 'FAILED';
        else if (status === 'sent') targetStatus = 'SENT';

        if (!targetStatus) continue;

        const now = new Date();

        // 1. Update Campaign Queue tracking if applicable
        if (last10) {
          const queueItems = await prisma.whatsAppCampaignQueue.findMany({
            where: {
              toPhone: { endsWith: last10 },
              status: { notIn: targetStatus === 'READ' ? ['FAILED'] : ['READ', 'FAILED'] }
            },
            select: { id: true, campaignId: true, status: true }
          });

          if (queueItems.length > 0) {
            await prisma.whatsAppCampaignQueue.updateMany({
              where: { id: { in: queueItems.map((q) => q.id) } },
              data: {
                status: targetStatus,
                deliveredAt: targetStatus === 'DELIVERED' || targetStatus === 'READ' ? now : undefined,
                readAt: targetStatus === 'READ' ? now : undefined,
                errorMsg: targetStatus === 'FAILED' ? (st.errors?.[0]?.message || 'Delivery failed') : undefined
              }
            });

            for (const q of queueItems) {
              if (targetStatus === 'DELIVERED') {
                await prisma.whatsAppCampaign.update({
                  where: { id: q.campaignId },
                  data: { deliveredCount: { increment: 1 } }
                }).catch(() => {});
              } else if (targetStatus === 'READ') {
                if (q.status !== 'READ') {
                  await prisma.whatsAppCampaign.update({
                    where: { id: q.campaignId },
                    data: {
                      readCount: { increment: 1 },
                      deliveredCount: q.status !== 'DELIVERED' ? { increment: 1 } : undefined
                    }
                  }).catch(() => {});
                }
              } else if (targetStatus === 'FAILED') {
                await prisma.whatsAppCampaign.update({
                  where: { id: q.campaignId },
                  data: { failedCount: { increment: 1 } }
                }).catch(() => {});
              }
            }
          }
        }

        // 2. Update WhatsAppMessage record with strict status progression
        if (wamid) {
          const existingMsg = await prisma.whatsAppMessage.findFirst({
            where: { metaMessageId: wamid }
          });

          if (existingMsg) {
            // Never downgrade from READ to DELIVERED or SENT
            const shouldUpdate = 
              targetStatus === 'FAILED' ||
              (targetStatus === 'READ' && existingMsg.status !== 'READ') ||
              (targetStatus === 'DELIVERED' && existingMsg.status !== 'READ' && existingMsg.status !== 'DELIVERED') ||
              (targetStatus === 'SENT' && existingMsg.status !== 'READ' && existingMsg.status !== 'DELIVERED');

            if (shouldUpdate) {
              let updatedMetadata: string | undefined = undefined;
              if (targetStatus === 'FAILED' && st.errors?.[0]) {
                try {
                  const curr = typeof existingMsg.metadata === 'string' ? JSON.parse(existingMsg.metadata || '{}') : (existingMsg.metadata || {});
                  updatedMetadata = JSON.stringify({ ...curr, metaError: st.errors[0] });
                } catch (_) {}
              }

              await prisma.whatsAppMessage.update({
                where: { id: existingMsg.id },
                data: {
                  status: targetStatus,
                  deliveredAt: (targetStatus === 'DELIVERED' || targetStatus === 'READ') ? (existingMsg.deliveredAt || now) : undefined,
                  readAt: targetStatus === 'READ' ? (existingMsg.readAt || now) : undefined,
                  metadata: updatedMetadata
                }
              });
              emitInboxEvent({
                type: "MESSAGE_STATUS",
                conversationId: existingMsg.conversationId,
                clientId,
                messageId: existingMsg.id,
                status: targetStatus
              });
              if (clientId) {
                dispatchOutboundWebhook(clientId, "message.status_update", {
                  messageId: existingMsg.id,
                  wamid,
                  status: targetStatus,
                  timestamp: now.toISOString()
                });
              }
              console.log(`[Status Webhook] Updated message ${existingMsg.id} (${wamid}) to ${targetStatus}`);
            }
          } else if (last10) {
            // Safe fallback: match ONLY the latest outbound message for this customer still in SENT status
            const fallbackMsg = await prisma.whatsAppMessage.findFirst({
              where: {
                senderType: { in: ['AGENT', 'AI', 'BOT', 'SYSTEM'] },
                status: { notIn: ['READ', 'FAILED'] },
                conversation: {
                  ...(clientId ? { clientId } : {}),
                  customer: {
                    OR: [
                      { mobile: { endsWith: last10 } },
                      { whatsappNumber: { endsWith: last10 } }
                    ]
                  }
                }
              },
              orderBy: { sentAt: 'desc' }
            });

            if (fallbackMsg) {
              await prisma.whatsAppMessage.update({
                where: { id: fallbackMsg.id },
                data: {
                  metaMessageId: wamid,
                  status: targetStatus,
                  deliveredAt: (targetStatus === 'DELIVERED' || targetStatus === 'READ') ? (fallbackMsg.deliveredAt || now) : undefined,
                  readAt: targetStatus === 'READ' ? (fallbackMsg.readAt || now) : undefined
                }
              });
              emitInboxEvent({
                type: "MESSAGE_STATUS",
                conversationId: fallbackMsg.conversationId,
                clientId,
                messageId: fallbackMsg.id,
                status: targetStatus
              });
              if (clientId) {
                dispatchOutboundWebhook(clientId, "message.status_update", {
                  messageId: fallbackMsg.id,
                  wamid,
                  status: targetStatus,
                  timestamp: now.toISOString()
                });
              }
              console.log(`[Status Webhook] Fallback matched message ${fallbackMsg.id} to ${wamid} -> ${targetStatus}`);
            }
          }
        }
      } catch (err) {
        console.error("[Webhook Status Receipt Error]:", err);
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // 2. PROCESS INCOMING MESSAGES
  // ══════════════════════════════════════════════════════
  if (value.messages && value.messages.length > 0) {
    const msg = value.messages[0];

    // Deduplication Check
    if (msg.id && isDuplicateMessageId(msg.id)) {
      return { status: "ignored - duplicate" };
    }

    const fromPhone = msg.from;
    const fullPhone = fromPhone.replace(/\D/g, '');
    const last10 = fullPhone.slice(-10);
    const cleanPhone = fullPhone.length === 10 ? `91${fullPhone}` : fullPhone;

    const isMedia = ["image", "video", "audio", "document"].includes(msg.type);
    const mediaId = isMedia ? msg[msg.type]?.id : null;
    const mediaMimeType = isMedia ? msg[msg.type]?.mime_type : null;
    const proxyMediaUrl = mediaId ? `/api/whatsapp/media/${mediaId}` : null;
    
    let textContent = "[Message]";
    if (msg.text?.body) {
      textContent = msg.text.body;
    } else if (msg.button?.text) {
      textContent = msg.button.text;
    } else if (msg.interactive?.button_reply?.title) {
      textContent = msg.interactive.button_reply.title;
    } else if (msg.interactive?.list_reply?.title) {
      textContent = msg.interactive.list_reply.title;
    } else if (msg.reaction?.emoji) {
      textContent = `Reacted with: ${msg.reaction.emoji}`;
    } else if (isMedia) {
      textContent = `[${msg.type.toUpperCase()}]`;
    } else if (msg[msg.type]?.caption) {
      textContent = msg[msg.type].caption;
    } else if (msg.type === "template") {
      textContent = "[Template Message]";
    } else if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
      const flowReply = msg.interactive.nfm_reply;
      let summary = "📋 Form Submitted:\n";
      try {
        const answers = JSON.parse(flowReply.response_json || "{}");
        Object.entries(answers).forEach(([key, val]) => {
          const cleanKey = key.replace(/_/g, " ").toUpperCase();
          summary += `• ${cleanKey}: ${val}\n`;
        });
      } catch (_) {
        summary += `Raw response: ${flowReply.response_json}`;
      }
      textContent = summary.trim();
    }

    // Feature: Detect and extract Widget Visitor Tracking Reference Token [Ref: WXXXX]
    let widgetRefCode: string | null = null;
    const refMatch = textContent.match(/\[(?:Ref:?\s*)?([A-Za-z0-9]{4,10})\]/i);
    if (refMatch) {
      widgetRefCode = refMatch[1].toUpperCase();
      // Clean up textContent so the agent inbox and customer view shows ONLY clean natural text
      textContent = textContent.replace(/\s*\[(?:Ref:?\s*)?[A-Za-z0-9]{4,10}\]/gi, "").trim();
      if (!textContent) {
        textContent = "Hello! Can I get more info on this?";
      }
    }

    // WhatsApp Catalog Order Parsing with Intelligent Product Resolution
    let orderMetadata: any = null;
    if (msg.type === "order" && msg.order) {
      const rawItems = msg.order.product_items || [];
      const resolvedItems: any[] = [];

      for (const it of rawItems) {
        const retId = it.product_retailer_id ? String(it.product_retailer_id).trim() : "";
        let prodName = retId || "Catalog Item";
        let prodImage: string | null = null;
        let prodSku = retId;
        let prodArticle = null;

        if (retId) {
          try {
            const matchedProd = await prisma.product.findFirst({
              where: {
                OR: [
                  { sku: retId },
                  { sku: { contains: retId } },
                  { articleNumber: retId },
                  { id: retId }
                ]
              }
            });
            if (matchedProd) {
              prodName = matchedProd.name;
              prodImage = matchedProd.images?.[0] || null;
              prodSku = matchedProd.sku || retId;
              prodArticle = matchedProd.articleNumber || null;
            }
          } catch (_) {}
        }

        resolvedItems.push({
          name: prodName,
          retailer_id: retId,
          sku: prodSku,
          articleNumber: prodArticle,
          image: prodImage,
          quantity: Number(it.quantity) || 1,
          price: Number(it.item_price) || 0,
          currency: it.currency || "INR"
        });
      }

      const totalAmount = resolvedItems.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
      const totalQuantity = resolvedItems.reduce((sum: number, it: any) => sum + it.quantity, 0);

      orderMetadata = {
        order: {
          catalogId: msg.order.catalog_id,
          customerNote: msg.order.text || "",
          items: resolvedItems,
          totalAmount,
          totalQuantity,
          currency: resolvedItems[0]?.currency || "INR"
        }
      };

      let summary = `🛍️ Catalog Order (${totalQuantity} items - ₹${totalAmount.toLocaleString('en-IN')}):\n`;
      resolvedItems.forEach((it: any) => {
        summary += `• ${it.quantity}x ${it.name} (₹${it.price})\n`;
      });
      if (msg.order.text) {
        summary += `Note: ${msg.order.text}`;
      }
      textContent = summary.trim();
    }

    // Detect Button Clicks
    const isButtonClick = Boolean(
      msg.type === "button" ||
      msg.button ||
      (msg.type === "interactive" && msg.interactive?.type === "button_reply")
    );
    const clickedButtonTitle = msg.button?.text || msg.interactive?.button_reply?.title || null;

    // Automated Marketing Opt-Out (DND) & Resubscribe Detection
    const cleanUpperText = textContent.trim().toUpperCase();
    const isOptOutCommand = ["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT", "DO NOT DISTURB", "DND"].includes(cleanUpperText) ||
      (isButtonClick && clickedButtonTitle && ["STOP", "UNSUBSCRIBE", "OPT OUT", "STOP PROMOTIONS"].some(s => clickedButtonTitle.toUpperCase().includes(s)));
    const isResubscribeCommand = ["START", "RESUBSCRIBE", "UNSTOP"].includes(cleanUpperText);

    if (isOptOutCommand) {
      await prisma.customer.updateMany({
        where: {
          ...(clientId ? { clientId } : {}),
          OR: [
            { mobile: { contains: last10 } },
            { whatsappNumber: { contains: last10 } }
          ]
        },
        data: { marketingOptOut: true, optedOutAt: new Date() }
      }).catch(() => {});
    } else if (isResubscribeCommand) {
      await prisma.customer.updateMany({
        where: {
          ...(clientId ? { clientId } : {}),
          OR: [
            { mobile: { contains: last10 } },
            { whatsappNumber: { contains: last10 } }
          ]
        },
        data: { marketingOptOut: false, optedOutAt: null }
      }).catch(() => {});
    }

    // Campaign Attribution
    try {
      const recentQueueItem = await prisma.whatsAppCampaignQueue.findFirst({
        where: {
          toPhone: { endsWith: last10 },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          ...(clientId ? { campaign: { clientId } } : {})
        },
        orderBy: { createdAt: 'desc' }
      });

      if (recentQueueItem) {
        if (isOptOutCommand) {
          await prisma.whatsAppCampaign.update({
            where: { id: recentQueueItem.campaignId },
            data: { optOutCount: { increment: 1 } }
          }).catch(() => {});
        }

        if (isButtonClick) {
          await prisma.whatsAppCampaignQueue.update({
            where: { id: recentQueueItem.id },
            data: {
              status: 'CLICKED',
              buttonClicked: clickedButtonTitle || msg.interactive?.button_reply?.id || 'CTA Button Clicked',
              clickedAt: new Date()
            }
          });
          await prisma.whatsAppCampaign.update({
            where: { id: recentQueueItem.campaignId },
            data: { clicksCount: { increment: 1 } }
          }).catch(() => {});
        } else if (msg.type === "text" || msg.text?.body) {
          if (!recentQueueItem.repliedAt) {
            await prisma.whatsAppCampaignQueue.update({
              where: { id: recentQueueItem.id },
              data: {
                repliedAt: new Date(),
                replyText: textContent.slice(0, 500),
                status: recentQueueItem.status === 'CLICKED' ? 'CLICKED' : 'REPLIED'
              }
            });
            await prisma.whatsAppCampaign.update({
              where: { id: recentQueueItem.campaignId },
              data: { repliedCount: { increment: 1 } }
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('[WhatsApp Webhook Campaign Attribution Error]:', e);
    }

    const whatsappProfileName = value.contacts?.[0]?.profile?.name || null;

    // Step A: Search CRM Customer by Phone Number (Client Scoped)
    let customer = await prisma.customer.findFirst({
      where: {
        ...(clientId ? { clientId } : {}),
        OR: [
          { whatsappNumber: fullPhone },
          { mobile: fullPhone },
          { whatsappNumber: { contains: last10 } },
          { mobile: { contains: last10 } }
        ]
      }
    });

    // Step B: Auto-create Contact/Lead if customer does not exist
    if (!customer) {
      const defaultEmployee = await prisma.employee.findFirst();
      const formattedDisplayPhone = formatWhatsAppPhone(cleanPhone);
      const displayName = whatsappProfileName || formattedDisplayPhone;
      customer = await prisma.customer.create({
        data: {
          clientId: clientId,
          businessName: displayName,
          contactPerson: displayName,
          mobile: cleanPhone,
          whatsappNumber: cleanPhone,
          customerType: "Wholesaler",
          status: "New Lead",
          leadStage: "New Enquiry",
          temperature: "HOT",
          assignedSalespersonId: defaultEmployee?.id,
          tags: null
        }
      });
    } else {
      const updateData: any = {};
      if (cleanPhone !== customer.whatsappNumber) {
        updateData.whatsappNumber = cleanPhone;
        updateData.mobile = cleanPhone;
      }

      const isCurrentContactPhoneLike = !customer.contactPerson || 
        customer.contactPerson === "Unknown Lead" ||
        customer.contactPerson.startsWith("+") || 
        customer.contactPerson.startsWith("Contact ") || 
        /^\+?[\d\s\-()]+$/.test(customer.contactPerson);

      const isCurrentBusinessPhoneLike = !customer.businessName || 
        customer.businessName.startsWith("+") || 
        customer.businessName.startsWith("Contact ") || 
        /^\+?[\d\s\-()]+$/.test(customer.businessName);

      if (whatsappProfileName) {
        if (isCurrentContactPhoneLike) updateData.contactPerson = whatsappProfileName;
        if (isCurrentBusinessPhoneLike) updateData.businessName = whatsappProfileName;
      } else if (cleanPhone !== customer.whatsappNumber && isCurrentContactPhoneLike) {
        const formattedDisplayPhone = formatWhatsAppPhone(cleanPhone);
        updateData.contactPerson = formattedDisplayPhone;
        if (isCurrentBusinessPhoneLike) updateData.businessName = formattedDisplayPhone;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: updateData
        }).catch(() => {});
        customer = { ...customer, ...updateData };
      }
    }

    if (!customer) {
      console.error("[WhatsApp Inbound] Failed to find or create customer record");
      return { status: "ignored - customer record missing" };
    }

    // Step C: Link/Find Conversation (Client Scoped with adoption fallback)
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: {
        customerId: customer.id,
        ...(clientId ? { clientId } : {})
      }
    });

    if (!conversation) {
      // Fallback: Check if an existing conversation exists for this customer and adopt it
      const existingConv = await prisma.whatsAppConversation.findFirst({
        where: { customerId: customer.id }
      });
      if (existingConv) {
        conversation = await prisma.whatsAppConversation.update({
          where: { id: existingConv.id },
          data: { ...(clientId ? { clientId } : {}) }
        });
      }
    }

    const account = await prisma.whatsAppAccount.findFirst() || await prisma.whatsAppAccount.create({
      data: {
        name: client?.businessName || "Main WhatsApp",
        phoneNumber: client?.phoneNumber || "+91 7206066678",
        status: "CONNECTED"
      }
    });

    const messageTimestamp = new Date(parseInt(msg.timestamp) * 1000 || Date.now());
    
    // Log Meta Flow submissions & Process Checkout Delivery Address
    if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
      try {
        const flowReply = msg.interactive.nfm_reply;
        let formRecord = await prisma.whatsAppForm.findFirst({
          where: { title: "Meta Flow Form", ...(clientId ? { clientId } : {}) }
        });
        if (!formRecord) {
          formRecord = await prisma.whatsAppForm.create({
            data: {
              clientId: clientId,
              title: "Meta Flow Form",
              fieldsJson: "[]"
            }
          });
        }
        if (conversation) {
          await prisma.whatsAppFormSubmission.create({
            data: {
              formId: formRecord.id,
              conversationId: conversation.id,
              customerId: customer.id,
              dataJson: flowReply.response_json || "{}"
            }
          });

          // Intelligent Address & Partial COD Processing
          let answers: any = {};
          try { answers = JSON.parse(flowReply.response_json || "{}"); } catch (_) {}
          const rawPincode = answers.pincode || answers.pin_code || answers.postal_code;
          const hasAddressData = Boolean(rawPincode || answers.house_flat || answers.address);

          if (hasAddressData) {
            let city = answers.city || "";
            let state = answers.state || "";
            let pincode = String(rawPincode || "").replace(/\D/g, "");

            if (pincode.length === 6 && (!city || !state)) {
              const pinData = await lookupPincode(pincode);
              if (pinData.valid) {
                if (!city) city = pinData.city || "";
                if (!state) state = pinData.state || "";
              }
            }

            const housePart = answers.house_flat || answers.house || answers.flat || "";
            const streetPart = answers.street_landmark || answers.street || answers.landmark || answers.area || "";
            const fullAddress = [housePart, streetPart].filter(Boolean).join(", ") || answers.address || "";
            const formattedAddress = [fullAddress, city, state, pincode ? `PIN: ${pincode}` : ""].filter(Boolean).join(", ");

            // Update Customer record with verified delivery address
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                shippingAddress: formattedAddress || undefined,
                billingAddress: formattedAddress || undefined,
                contactPerson: answers.full_name || customer.contactPerson,
                landmark: streetPart || undefined,
                notes: pincode ? `Pincode: ${pincode}, City: ${city}, State: ${state}` : customer.notes
              }
            }).catch((e: any) => console.error("[Webhook Address Save Error]:", e.message));

            // Look up pending order from recent messages
            const recentOrderMsg = await prisma.whatsAppMessage.findFirst({
              where: { conversationId: conversation.id, messageType: "ORDER" },
              orderBy: { sentAt: "desc" }
            });

            let orderTotal = 0;
            let orderDesc = "Catalog Order";
            if (recentOrderMsg?.metadata) {
              try {
                const meta = JSON.parse(recentOrderMsg.metadata);
                if (meta?.order?.totalAmount) orderTotal = Number(meta.order.totalAmount);
                if (meta?.order?.items) {
                  const itemSummary = meta.order.items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ");
                  orderDesc = `Catalog Order (${meta.order.totalQuantity || meta.order.items.length} items: ${itemSummary})`;
                }
              } catch (_) {}
            }

            if (orderTotal > 0) {
              const recSettings = await getRecoveryAgentSettings(clientId || undefined);
              const chosenMode = String(answers.payment_mode || answers.payment_preference || "").toUpperCase();
              const isFullCod = (chosenMode.includes("COD") && !chosenMode.includes("PARTIAL") && !chosenMode.includes("TOKEN") && !chosenMode.includes("ADVANCE")) || chosenMode === "CASH ON DELIVERY (FULL COD)";
              const isPartialCod = chosenMode.includes("PARTIAL") || chosenMode.includes("TOKEN") || chosenMode.includes("ADVANCE");

              if (isFullCod) {
                // 1. Full COD: No advance required. Immediate Order Confirmation.
                const confirmText = `🎉 *Order Confirmed (Cash on Delivery)!*\n\n` +
                  `📦 *Items:* ${orderDesc}\n` +
                  `💵 *Total Payable on Delivery:* ₹${orderTotal.toLocaleString('en-IN')}\n\n` +
                  `📍 *Delivery Address:*\n${fullAddress}${city ? ', ' + city : ''}${state ? ', ' + state : ''} - ${pincode}\n` +
                  `📞 *Contact Phone:* ${customer.mobile || fromPhone}\n\n` +
                  `🚚 Our dispatch team is packaging your order. You will receive live courier tracking as soon as it ships!`;

                await sendWhatsAppMessageAction({
                  conversationId: conversation.id,
                  senderId: "system",
                  senderType: "SYSTEM",
                  messageType: "TEXT",
                  content: confirmText,
                  senderName: "Order System"
                });
              } else if (isPartialCod) {
                // 2. Partial COD: Calculate advance token based on tenant admin setting
                let advanceAmount = 0;
                if (recSettings.partialCodMode === 'FIXED') {
                  advanceAmount = Math.min(orderTotal, recSettings.partialCodValue || 200);
                } else {
                  advanceAmount = Math.max(1, Math.round((orderTotal * (recSettings.partialCodValue || 10)) / 100));
                }
                const codBalance = Math.max(0, orderTotal - advanceAmount);

                const summaryNotice = `✅ *Delivery Address Confirmed!*\n` +
                  `📍 ${fullAddress}${city ? ', ' + city : ''}${state ? ', ' + state : ''} - ${pincode}\n\n` +
                  `🪙 *Payment Preference: Partial COD*\n` +
                  `• Total Order Value: *₹${orderTotal.toLocaleString('en-IN')}*\n` +
                  `• Advance Token (to confirm dispatch): *₹${advanceAmount.toLocaleString('en-IN')}*\n` +
                  `• Balance COD (payable on delivery): *₹${codBalance.toLocaleString('en-IN')}*\n\n` +
                  `Kripya apna order dispatch confirm karne ke liye niche diye gaye UPI QR / payment link se ₹${advanceAmount} token advance pay karein:`;

                await sendWhatsAppMessageAction({
                  conversationId: conversation.id,
                  senderId: "system",
                  senderType: "SYSTEM",
                  messageType: "TEXT",
                  content: summaryNotice,
                  senderName: "Order System"
                });

                // Generate payment link for the advance token amount
                await generateWhatsAppPaymentLinkAction({
                  conversationId: conversation.id,
                  customerId: customer.id,
                  amount: advanceAmount,
                  description: `Token Advance (₹${advanceAmount}) for ${orderDesc}. Balance ₹${codBalance} on COD`,
                  deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both"
                });
              } else {
                // 3. Full Prepaid: Apply optional prepaid discount if configured
                let finalAmount = orderTotal;
                let discountNotice = "";
                if (recSettings.prepaidDiscountPercent > 0) {
                  const discount = Math.round((orderTotal * recSettings.prepaidDiscountPercent) / 100);
                  finalAmount = Math.max(1, orderTotal - discount);
                  discountNotice = `\n🎁 *Prepaid Privilege Offer:* Saved ₹${discount} (${recSettings.prepaidDiscountPercent}% OFF applied!)`;
                }

                const summaryNotice = `✅ *Delivery Address Confirmed!*\n` +
                  `📍 ${fullAddress}${city ? ', ' + city : ''}${state ? ', ' + state : ''} - ${pincode}${discountNotice}\n` +
                  `• Total Payable: *₹${finalAmount.toLocaleString('en-IN')}*\n\n` +
                  `Kripya niche diye gaye UPI QR / payment link se secure online payment complete karein:`;

                await sendWhatsAppMessageAction({
                  conversationId: conversation.id,
                  senderId: "system",
                  senderType: "SYSTEM",
                  messageType: "TEXT",
                  content: summaryNotice,
                  senderName: "Order System"
                });

                await generateWhatsAppPaymentLinkAction({
                  conversationId: conversation.id,
                  customerId: customer.id,
                  amount: finalAmount,
                  description: orderDesc,
                  deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both"
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to process form submission in webhook:", err);
      }
      return NextResponse.json({ status: "success", handled: "flow_nfm_reply" });
    }

    let wasClosed = false;

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          clientId: clientId || client?.id || "8c519684-5a75-45be-b74b-5f9553f7ea32",
          accountId: account.id,
          customerId: customer.id,
          status: "OPEN",
          leadStatus: customer.leadStage || "New Lead",
          lastMessageText: textContent,
          lastMessageAt: messageTimestamp,
          unreadCount: 1,
          tags: null
        }
      });
    } else {
      wasClosed = conversation.status === "CLOSED";

      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageText: textContent,
          lastMessageAt: messageTimestamp,
          unreadCount: conversation.unreadCount + 1,
          status: "OPEN",
          ...(clientId && !conversation.clientId ? { clientId } : {})
        }
      });
    }

    // Feature: Extract CTWA Ad Referral details
    const referral = msg.referral || (msg.context && msg.context.referral);
    let ctwaMetadata: any = null;
    if (referral) {
      ctwaMetadata = {
        source_id: referral.source_id || referral.ad_id || "META_AD",
        source_url: referral.source_url || "",
        source_type: referral.source_type || "ad",
        headline: referral.headline || "Click-to-WhatsApp Ad Referral",
        body: referral.body || "",
        media_type: referral.media_type || "image",
        image_url: referral.image_url || "",
        video_url: referral.video_url || "",
        ctwa_clid: referral.ctwa_clid || ""
      };
      console.log(`[CTWA Ad Attribution Webhook] Received referral from Meta Ad ${ctwaMetadata.source_id}: "${ctwaMetadata.headline}"`);
      
      try {
        const existingTags = (customer.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
        const newTags = Array.from(new Set([...existingTags, "Meta_CTWA_Ad"]));
        await prisma.customer.update({
          where: { id: customer.id },
          data: { 
            source: "Meta Click-to-WhatsApp Ad",
            tags: newTags.join(', ')
          }
        });
      } catch (_) {}
    }

    // Step D: Store Incoming Message
    const effectiveMetadata = orderMetadata
      ? JSON.stringify(orderMetadata)
      : ctwaMetadata
      ? JSON.stringify(ctwaMetadata)
      : null;

    const effectiveMessageType = msg.type === "order" ? "ORDER" : msg.type ? msg.type.toUpperCase() : "TEXT";

    const createdInboundMsg = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        senderType: "CUSTOMER",
        senderName: customer.contactPerson,
        messageType: effectiveMessageType,
        content: textContent,
        mediaUrl: proxyMediaUrl,
        mediaType: mediaMimeType,
        status: "RECEIVED",
        metaMessageId: msg.id,
        metadata: effectiveMetadata,
        sentAt: messageTimestamp
      }
    });

    // Real-time SSE dispatch for connected agent inboxes
    emitInboxEvent({
      type: "NEW_MESSAGE",
      conversationId: conversation.id,
      clientId,
      messageId: createdInboundMsg.id,
      data: {
        id: createdInboundMsg.id,
        conversationId: conversation.id,
        senderType: "CUSTOMER",
        senderName: customer.contactPerson,
        messageType: effectiveMessageType,
        content: textContent,
        mediaUrl: proxyMediaUrl,
        mediaType: mediaMimeType,
        status: "RECEIVED",
        metadata: effectiveMetadata,
        sentAt: messageTimestamp
      }
    });
    emitInboxEvent({
      type: "CONVERSATION_UPDATE",
      conversationId: conversation.id,
      clientId
    });

    if (clientId) {
      dispatchOutboundWebhook(clientId, "message.received", {
        messageId: createdInboundMsg.id,
        conversationId: conversation.id,
        customer: {
          id: customer.id,
          name: customer.contactPerson,
          mobile: customer.mobile,
          whatsappNumber: customer.whatsappNumber
        },
        message: {
          type: effectiveMessageType,
          content: textContent,
          mediaUrl: proxyMediaUrl || null,
          mediaType: mediaMimeType || null,
          metaMessageId: msg.id,
          timestamp: messageTimestamp.toISOString()
        }
      });
    }

    if (ctwaMetadata) {
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "SYSTEM",
          senderName: "META_CTWA_AD",
          messageType: "META_CTWA_AD",
          content: `🎯 Meta CTWA Ad Referral: "${ctwaMetadata.headline}" (Ad ID: ${ctwaMetadata.source_id})`,
          metadata: JSON.stringify(ctwaMetadata),
          status: "SENT",
          sentAt: new Date(messageTimestamp.getTime() - 1000)
        }
      }).catch(() => {});
    }

    // Feature: Extract and render Website Visitor & Cart Context Referral Card
    // Strict matching: Only link if widgetRefCode is explicitly present or session was logged with this exact customer phone.
    // Never match generic time-window sessions, and never match Meta CTWA Ad leads to random website sessions.
    try {
      let visitorSessionLog = null;
      const effectiveClientId = conversation?.clientId || clientId || client?.id;

      if (widgetRefCode) {
        visitorSessionLog = await prisma.whatsAppChatbotLog.findFirst({
          where: {
            ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
            nodeType: "WIDGET_SESSION_REF",
            nodeId: { equals: widgetRefCode, mode: "insensitive" }
          },
          orderBy: { createdAt: "desc" }
        });

        // Link customer phone to all session logs with this refId so future live activity & drawer immediately correlate
        if (cleanPhone && cleanPhone.length >= 10) {
          await prisma.whatsAppChatbotLog.updateMany({
            where: {
              nodeType: "WIDGET_SESSION_REF",
              nodeId: { equals: widgetRefCode, mode: "insensitive" }
            },
            data: { phone: cleanPhone }
          }).catch(() => {});
        }
      }

      // If not matched by ref code, check if a visitor session was logged with this customer's exact phone in the last 2 hours (only if NOT a Meta CTWA ad lead)
      if (!visitorSessionLog && !ctwaMetadata && effectiveClientId && cleanPhone && cleanPhone.length >= 10) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        visitorSessionLog = await prisma.whatsAppChatbotLog.findFirst({
          where: {
            clientId: effectiveClientId,
            nodeType: "WIDGET_SESSION_REF",
            phone: cleanPhone,
            createdAt: { gte: twoHoursAgo }
          },
          orderBy: { createdAt: "desc" }
        });
      }

      if (visitorSessionLog && visitorSessionLog.payload) {
        const payloadData = typeof visitorSessionLog.payload === "string"
          ? JSON.parse(visitorSessionLog.payload)
          : (visitorSessionLog.payload as any);

        const categoryInsights = payloadData.categoryInsights || null;
        const pageJourney = Array.isArray(payloadData.pageJourney) ? payloadData.pageJourney : [];
        const searches = Array.isArray(payloadData.searches) ? payloadData.searches : [];
        const sessionStats = payloadData.sessionStats || null;

        const websiteContextMeta = {
          type: "WEBSITE_VISITOR_CONTEXT",
          refId: widgetRefCode || payloadData.refId || "WIDGET",
          pageUrl: payloadData.pageUrl || "",
          pageTitle: payloadData.pageTitle || "Online Store",
          platform: payloadData.platform || "Website",
          detectedProduct: payloadData.detectedProduct || null,
          cart: payloadData.cart || null,
          pageJourney,
          searches,
          categoryInsights,
          sessionStats,
        };

        const cartItemCount = payloadData.cart?.item_count || payloadData.cart?.items?.length || 0;
        const cartTotal = payloadData.cart?.total_price ? ` (₹${payloadData.cart.total_price})` : "";
        const cartSummary = cartItemCount > 0 ? ` | Cart: ${cartItemCount} item(s)${cartTotal}` : "";

        let headlineContent = `🌐 Website Inquiry: "${websiteContextMeta.pageTitle}"${cartSummary}`;
        if (categoryInsights?.category === "EDUCATION" && categoryInsights.courses?.length) {
          headlineContent = `🎓 Education Inquiry: "${categoryInsights.courses[0]}"${categoryInsights.universities?.[0] ? ` at ${categoryInsights.universities[0]}` : ""}`;
        } else if (categoryInsights?.category === "REAL_ESTATE" && categoryInsights.properties?.length) {
          headlineContent = `🏢 Property Inquiry: "${categoryInsights.properties[0]}"`;
        } else if (categoryInsights?.category === "HEALTHCARE" && categoryInsights.specialties?.length) {
          headlineContent = `🏥 Medical Inquiry: "${categoryInsights.specialties[0]}"`;
        }

        const contextMsg = await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            senderType: "SYSTEM",
            senderName: "WEBSITE_VISITOR_CONTEXT",
            messageType: "WEBSITE_VISITOR_CONTEXT",
            content: headlineContent,
            metadata: JSON.stringify(websiteContextMeta),
            status: "SENT",
            sentAt: new Date(messageTimestamp.getTime() - 1000)
          }
        });

        // Real-time SSE dispatch so live inboxes render the referral card instantly
        emitInboxEvent({
          type: "NEW_MESSAGE",
          conversationId: conversation.id,
          clientId,
          messageId: contextMsg.id,
          data: {
            id: contextMsg.id,
            conversationId: conversation.id,
            senderType: "SYSTEM",
            senderName: "WEBSITE_VISITOR_CONTEXT",
            messageType: "WEBSITE_VISITOR_CONTEXT",
            content: contextMsg.content,
            metadata: JSON.stringify(websiteContextMeta),
            status: "SENT",
            sentAt: contextMsg.sentAt
          }
        });

        // Auto-tag customer
        const existingTags = (customer.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        let tagsChanged = false;
        if (!existingTags.includes("Website Lead")) {
          existingTags.push("Website Lead");
          tagsChanged = true;
        }
        if (!existingTags.includes("Website_Visitor")) {
          existingTags.push("Website_Visitor");
          tagsChanged = true;
        }
        if (cartItemCount > 0 && !existingTags.includes("Cart_Abandonment")) {
          existingTags.push("Cart_Abandonment");
          tagsChanged = true;
        }
        if (categoryInsights?.category === "EDUCATION") {
          if (!existingTags.includes("Education_Lead")) {
            existingTags.push("Education_Lead");
            tagsChanged = true;
          }
          if (categoryInsights.courses?.[0]) {
            const cTag = `Course_${categoryInsights.courses[0].slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}`;
            if (!existingTags.includes(cTag)) {
              existingTags.push(cTag);
              tagsChanged = true;
            }
          }
        } else if (categoryInsights?.category === "REAL_ESTATE") {
          if (!existingTags.includes("Real_Estate_Lead")) {
            existingTags.push("Real_Estate_Lead");
            tagsChanged = true;
          }
        } else if (categoryInsights?.category === "HEALTHCARE") {
          if (!existingTags.includes("Healthcare_Lead")) {
            existingTags.push("Healthcare_Lead");
            tagsChanged = true;
          }
        }
        if (tagsChanged) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { tags: existingTags.join(', ') }
          }).catch(() => {});
        }

        // Increment leads captured in website widget analytics
        if (clientId) {
          await prisma.whatsAppWebsiteWidget.updateMany({
            where: { clientId },
            data: { totalLeadsCaptured: { increment: 1 } }
          }).catch(() => {});
        }
      }
    } catch (e: any) {
      console.error("[WhatsApp Webhook] Visitor context resolution error:", e?.message);
    }

    console.log(`[WhatsApp Webhook] Incoming message from ${formatWhatsAppPhone(fullPhone)}: "${textContent.slice(0, 50)}" (Tenant: ${client?.businessName || 'Global'})`);

    // Increment tenant message usage count
    if (client) {
      await prisma.whatsAppClient.update({
        where: { id: client.id },
        data: { messagesUsedCount: { increment: 1 } }
      }).catch(() => {});
    }

    // Send Web Push Notification strictly to assigned agent or tenant admins
    sendPushNotificationToAgents(
      `New Message from ${customer.contactPerson || formatWhatsAppPhone(fullPhone)}`,
      textContent.slice(0, 100),
      `/whatsapp/inbox`,
      conversation.assignedEmployeeId,
      clientId
    ).catch((e) => console.error("[Push] Failed:", e.message));

    // AI Vision Auto-Verification of UPI Payment Screenshots
    if (msg.type === "image" && mediaId) {
      (async () => {
        try {
          const result = await processUpiScreenshotAction({
            conversationId: conversation.id,
            mediaId: mediaId,
            mimeType: mediaMimeType || "image/jpeg",
            caption: msg[msg.type]?.caption || ""
          });

          if (result.success && result.isPaymentScreenshot && result.analysis) {
            const { utrNumber, amount, paymentApp, isAuthentic } = result.analysis;
            const notifTitle = "UPI Screenshot Detected";
            const notifBody = `Customer sent ${paymentApp || "UPI"} screenshot: ₹${amount || "?"} | UTR: ${utrNumber || "Detected"}${!isAuthentic ? " (Review Authenticity)" : ""}`;
            
            await sendPushNotificationToAgents(
              notifTitle,
              notifBody,
              "/whatsapp/inbox",
              conversation.assignedEmployeeId,
              clientId
            );
          }
        } catch (visionErr) {
          console.error("[Webhook UPI Vision Error]:", visionErr);
        }
      })();
    }

    // ══════════════════════════════════════════════════════
    // IN-WHATSAPP FLOW CHECKOUT & ADDRESS COLLECTION ON CATALOG ORDERS
    // ══════════════════════════════════════════════════════
    if (msg.type === "order" && orderMetadata?.order && orderMetadata.order.totalAmount > 0) {
      (async () => {
        try {
          const recSettings = await getRecoveryAgentSettings(clientId || undefined);
          const orderInfo = orderMetadata.order;
          const itemSummary = (orderInfo.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join(", ");
          const desc = `Catalog Order (${orderInfo.totalQuantity} items: ${itemSummary})`.slice(0, 150);

          if (recSettings.flowCheckoutEnabled !== false) {
            // Send Interactive WhatsApp Flow for Address & Payment Preference
            const flowIdToUse = recSettings.metaFlowId || "flow_catalog_checkout_v1";
            const flowRes = await sendWhatsAppFlowMessageAction(
              fromPhone,
              flowIdToUse,
              conversation.id,
              "Order System",
              {
                flowId: recSettings.metaFlowId,
                headerTitle: recSettings.flowHeaderTitle || "Confirm Delivery & Payment",
                bodyText: `Thank you for your order! 🛍️\n• Total: ₹${orderInfo.totalAmount.toLocaleString('en-IN')} (${orderInfo.totalQuantity} items)\n\n📍 Please tap below to enter your delivery address & choose your payment preference (Prepaid, Partial COD, or Full COD):`,
                ctaText: recSettings.flowCtaText || "Enter Delivery Address 📍",
                flowToken: `order_${conversation.id}_${orderInfo.totalAmount}_${Date.now()}`,
                screenName: "PINCODE_SCREEN",
                clientId: clientId || undefined
              }
            );

            if (!flowRes.success) {
              console.warn("[WhatsApp Webhook] Flow delivery fallback to conversational chat:", flowRes.error);
              // Graceful Conversational Fallback with Pincode Prompt
              await sendWhatsAppMessageAction({
                conversationId: conversation.id,
                senderId: "system",
                senderType: "SYSTEM",
                messageType: "TEXT",
                content: `Shukriya aapke order ke liye! 🛍️ Total: ₹${orderInfo.totalAmount.toLocaleString('en-IN')}\n\n📍 Delivery address confirm karne ke liye, kripya apna **6-Digit Delivery Pincode** yahan reply karein:`,
                senderName: "Order System"
              });
            } else {
              console.log(`[WhatsApp Webhook] Sent checkout Flow to ${fromPhone} for Order Total: ₹${orderInfo.totalAmount}`);
            }
          } else if (recSettings.autoCatalogPaymentEnabled !== false) {
            // Direct Payment Link fallback if Flow checkout is toggled off by tenant admin
            await generateWhatsAppPaymentLinkAction({
              conversationId: conversation.id,
              customerId: customer.id,
              amount: orderInfo.totalAmount,
              description: desc,
              deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both"
            });
            console.log(`[WhatsApp Webhook] Auto-sent payment link + QR for catalog order to ${customer.contactPerson} (Amount: ₹${orderInfo.totalAmount})`);
          }
        } catch (catOrderErr) {
          console.error("[WhatsApp Webhook] Error in catalog order handling:", catOrderErr);
        }
      })();
    }

    // ══════════════════════════════════════════════════════
    // CONVERSATIONAL PINCODE AUTO-FILL & ADDRESS CONFIRMATION
    // ══════════════════════════════════════════════════════
    let addressStepHandled = false;
    const isTextMessage = msg.type === "text";
    const pinRegex = /\b\d{6}\b/;
    const pinMatch = textContent.match(pinRegex);

    if (isTextMessage && conversation) {
      try {
        const pendingCatalogOrder = await prisma.whatsAppMessage.findFirst({
          where: {
            conversationId: conversation.id,
            messageType: "ORDER",
            sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          orderBy: { sentAt: "desc" }
        });

        if (pendingCatalogOrder) {
          let pendingTotal = 0;
          let pendingDesc = "Catalog Order";
          try {
            const meta = JSON.parse(pendingCatalogOrder.metadata || "{}");
            if (meta?.order?.totalAmount) pendingTotal = Number(meta.order.totalAmount);
            if (meta?.order?.items) {
              const itemSummary = meta.order.items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ");
              pendingDesc = `Catalog Order (${meta.order.totalQuantity || meta.order.items.length} items: ${itemSummary})`;
            }
          } catch (_) {}

          // Case 1: Customer sent 6-digit Pincode
          if (pinMatch && (!customer.shippingAddress || !customer.notes?.includes("Verified Delivery Address"))) {
            const enteredPincode = pinMatch[0];
            const pinData = await lookupPincode(enteredPincode);

            if (pinData.valid) {
              addressStepHandled = true;
              const state = pinData.state || "";
              const district = pinData.district || pinData.city || "";
              const citiesList = (pinData.cities || []).slice(0, 5);

              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  landmark: district,
                  notes: `Pincode: ${enteredPincode}, District: ${district}, State: ${state}`
                }
              }).catch(() => {});

              const cityOptionsText = citiesList.length > 0
                ? `\n🏙️ *Selectable Areas/Post Offices on ${enteredPincode}:*\n` + citiesList.map((c: any) => `• ${c.title}`).join("\n") + "\n"
                : "";

              const replyMsg = `✅ *Pincode ${enteredPincode} Verified!*\n` +
                `📍 *State:* ${state}\n` +
                `🏙️ *District:* ${district}\n` +
                cityOptionsText +
                `\nKripya apna **House / Flat No., Colony / Street** aur payment preference (Prepaid ya Partial COD) yahan reply karein:`;

              await sendWhatsAppMessageAction({
                conversationId: conversation.id,
                senderId: "system",
                senderType: "SYSTEM",
                messageType: "TEXT",
                content: replyMsg,
                senderName: "Order System"
              });
            }
          } else if (customer.notes?.includes("Pincode:") && !customer.notes?.includes("Verified Delivery Address")) {
            // Case 2: Customer already provided pincode, now providing house/street details
            const houseStreet = textContent.trim();
            const upperInput = houseStreet.toUpperCase();
            if (houseStreet.length >= 5 && !upperInput.includes("HELP") && !upperInput.includes("CATALOG") && !upperInput.includes("PRICE")) {
              addressStepHandled = true;
              const existingNotes = customer.notes || "";
              const fullDeliveryAddress = `${houseStreet}, ${existingNotes.replace(/Pincode:\s*/, 'PIN: ')}`;

              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  shippingAddress: fullDeliveryAddress,
                  billingAddress: fullDeliveryAddress,
                  notes: `Verified Delivery Address: ${fullDeliveryAddress}`
                }
              }).catch(() => {});

              if (pendingTotal > 0) {
                const recSettings = await getRecoveryAgentSettings(clientId || undefined);
                const isFullCod = (upperInput.includes("COD") && !upperInput.includes("PARTIAL") && !upperInput.includes("TOKEN") && !upperInput.includes("ADVANCE"));
                const isPartialCod = upperInput.includes("PARTIAL") || upperInput.includes("TOKEN") || upperInput.includes("ADVANCE") || 
                  (recSettings.allowedPaymentModes || []).includes("PARTIAL_COD");

                if (isFullCod && (recSettings.allowedPaymentModes || []).includes("FULL_COD")) {
                  // Full COD
                  await sendWhatsAppMessageAction({
                    conversationId: conversation.id,
                    senderId: "system",
                    senderType: "SYSTEM",
                    messageType: "TEXT",
                    content: `🎉 *Order Confirmed (Cash on Delivery)!*\n\n📦 *Items:* ${pendingDesc}\n💵 *Total Payable on Delivery:* ₹${pendingTotal.toLocaleString('en-IN')}\n\n📍 *Delivery Address:*\n${fullDeliveryAddress}\n\n🚚 Our dispatch team is packaging your order. Live tracking will be shared upon courier pickup!`,
                    senderName: "Order System"
                  });
                } else if (isPartialCod && (recSettings.allowedPaymentModes || []).includes("PARTIAL_COD")) {
                  // Partial COD Advance Token
                  let advanceAmount = 0;
                  if (recSettings.partialCodMode === 'FIXED') {
                    advanceAmount = Math.min(pendingTotal, recSettings.partialCodValue || 200);
                  } else {
                    advanceAmount = Math.max(1, Math.round((pendingTotal * (recSettings.partialCodValue || 10)) / 100));
                  }
                  const codBalance = Math.max(0, pendingTotal - advanceAmount);

                  const summaryNotice = `✅ *Delivery Address Confirmed!*\n` +
                    `📍 ${fullDeliveryAddress}\n\n` +
                    `🪙 *Payment Preference: Partial COD*\n` +
                    `• Total Order Value: *₹${pendingTotal.toLocaleString('en-IN')}*\n` +
                    `• Advance Token (to confirm dispatch): *₹${advanceAmount.toLocaleString('en-IN')}*\n` +
                    `• Balance on Delivery: *₹${codBalance.toLocaleString('en-IN')}*\n\n` +
                    `Kripya apna order dispatch confirm karne ke liye niche diye gaye UPI QR / payment link se ₹${advanceAmount} token advance pay karein:`;

                  await sendWhatsAppMessageAction({
                    conversationId: conversation.id,
                    senderId: "system",
                    senderType: "SYSTEM",
                    messageType: "TEXT",
                    content: summaryNotice,
                    senderName: "Order System"
                  });

                  await generateWhatsAppPaymentLinkAction({
                    conversationId: conversation.id,
                    customerId: customer.id,
                    amount: advanceAmount,
                    description: `Token Advance (₹${advanceAmount}) for ${pendingDesc}. Balance ₹${codBalance} on COD`,
                    deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both"
                  });
                } else {
                  // Full Online Prepaid
                  let finalAmount = pendingTotal;
                  let discountNotice = "";
                  if (recSettings.prepaidDiscountPercent && recSettings.prepaidDiscountPercent > 0) {
                    const discount = Math.round((pendingTotal * recSettings.prepaidDiscountPercent) / 100);
                    finalAmount = Math.max(1, pendingTotal - discount);
                    discountNotice = `\n🎁 *Prepaid Discount Applied (${recSettings.prepaidDiscountPercent}%):* -₹${discount.toLocaleString('en-IN')}\n• Net Payable: *₹${finalAmount.toLocaleString('en-IN')}*`;
                  }

                  const summaryNotice = `✅ *Delivery Address Confirmed!*\n` +
                    `📍 ${fullDeliveryAddress}\n\n` +
                    `💳 *Payment Preference: Online Prepaid*` +
                    discountNotice +
                    `\n\nKripya niche diye gaye UPI QR / payment link se instant payment complete karein:`;

                  await sendWhatsAppMessageAction({
                    conversationId: conversation.id,
                    senderId: "system",
                    senderType: "SYSTEM",
                    messageType: "TEXT",
                    content: summaryNotice,
                    senderName: "Order System"
                  });

                  await generateWhatsAppPaymentLinkAction({
                    conversationId: conversation.id,
                    customerId: customer.id,
                    amount: finalAmount,
                    description: pendingDesc,
                    deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both"
                  });
                }
              }
            }
          }
        }
      } catch (e: any) {
        console.error("[Webhook Conversational Address Handler Error]:", e.message);
      }
    }

    // Chatbot Flow Engine Execution (Client Scoped)
    if (isTextMessage && !addressStepHandled) {
      const flowHandled = await executeFlowEngine(fromPhone, textContent, conversation.id, wasClosed, clientId);

      if (!flowHandled && conversation.aiHandled) {
        // AI Execution with Client Quota & Credentials
        const aiStart = Date.now();
        const recentMessages = await prisma.whatsAppMessage.findMany({
          where: { conversationId: conversation.id, senderType: { in: ["CUSTOMER", "AGENT", "AI"] } },
          orderBy: { sentAt: 'desc' },
          take: 6
        });
        const historyLines = recentMessages.reverse().map(m => `${m.senderType}: ${m.content}`);

        let aiResponse: string | null = null;
        let aiStatus = "SUCCESS";
        let aiError: string | undefined;
        let toolsCalled = "none";

        try {
          aiResponse = await handleIncomingAILogic(fromPhone, textContent, historyLines, conversation.id, clientId);
          if (!aiResponse) {
            aiStatus = "FAILED";
            aiError = "AI returned empty response";
          } else {
            const tools: string[] = [];
            if (textContent.match(/[12]\d{3}/)) tools.push("lookupOrder");
            if (/shirt|short|combo|pant|product/i.test(textContent)) tools.push("searchProducts");
            if (/size|weight|kg|cm|waist/i.test(textContent)) tools.push("recommendSize");
            toolsCalled = tools.length > 0 ? tools.join(", ") : "ai_reply";
            if (client) {
              await prisma.whatsAppClient.update({
                where: { id: client.id },
                data: { aiRepliesUsedCount: { increment: 1 } }
              }).catch(() => {});
            }
          }
        } catch (e: any) {
          aiStatus = "FAILED";
          aiError = e.message;
        }

        const aiDuration = Date.now() - aiStart;

        await prisma.whatsAppAILog.create({
          data: {
            clientId: clientId,
            phone: cleanPhone,
            userMessage: textContent.slice(0, 500),
            aiReply: aiResponse?.slice(0, 2000) || null,
            toolsCalled,
            status: aiStatus,
            errorMessage: aiError,
            durationMs: aiDuration
          }
        }).catch(() => {});
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // 3. PROCESS MESSAGE STATUS UPDATES
  // ══════════════════════════════════════════════════════
  if (value.statuses && value.statuses.length > 0) {
    const statusUpdate = value.statuses[0];
    const metaMessageId = statusUpdate.id;
    const status = statusUpdate.status.toUpperCase();

    console.log(`[WhatsApp Webhook] Status update: ${status} for msg ID: ${metaMessageId}`);

    const updateData: any = { status };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date(parseInt(statusUpdate.timestamp) * 1000 || Date.now());
    if (status === 'READ') updateData.readAt = new Date(parseInt(statusUpdate.timestamp) * 1000 || Date.now());

    try {
      await prisma.whatsAppMessage.updateMany({
        where: { metaMessageId },
        data: updateData
      });
    } catch (_) {
      console.warn(`[WhatsApp Webhook] Could not update status for message ID ${metaMessageId}`);
    }
  }

  return { status: "success" };
}

// Cryptographic signature verification helper for Meta WhatsApp Webhooks
export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret?: string | null): boolean {
  const secret = appSecret || process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    // If no App Secret is configured in environment, allow through so current operations are not affected
    return true;
  }
  if (!signatureHeader) {
    console.warn("[Meta Webhook Security] Missing X-Hub-Signature-256 header while APP_SECRET is configured.");
    return false;
  }
  try {
    const signature = signatureHeader.replace(/^sha256=/i, "").trim();
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch (err) {
    console.error("[Meta Webhook Security] Signature verification error:", err);
    return false;
  }
}

// POST Endpoint - Global Webhook Handler
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");

    if (!verifyMetaWebhookSignature(rawBody, signatureHeader)) {
      console.warn("[WhatsApp Webhook] Forbidden: Invalid or missing X-Hub-Signature-256");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const clientIdHeader = req.headers.get("x-client-id");
    const result = await processWebhookPayload(body, clientIdHeader);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Web Push to tenant-specific agents
async function sendPushNotificationToAgents(
  title: string,
  body: string,
  url: string,
  assignedEmployeeId?: string | null,
  clientId?: string | null
) {
  let targetEmails: string[] = [];

  if (assignedEmployeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedEmployeeId },
      include: { user: true }
    });
    if (emp && emp.user) {
      targetEmails.push(emp.user.email);
    }
  } else if (clientId) {
    // Tenant unassigned: notify only agents of this client
    const clientAgents = await prisma.whatsAppAgentUser.findMany({
      where: { clientId: clientId, isActive: true },
      select: { email: true }
    });
    targetEmails = clientAgents.map(a => a.email);
  } else {
    // Global unassigned chat: only notify Super ADMINs
    const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
    targetEmails = adminUsers.map((u) => u.email);
  }

  const subs = await prisma.whatsAppPushSubscription.findMany();
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, data: { url } });

  for (const sub of subs) {
    if (!targetEmails.includes(sub.userId)) {
      continue; 
    }

    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET || 'crm_internal_2026' },
        body: JSON.stringify({ subscription, payload })
      });
    } catch (_) {}
  }
}
