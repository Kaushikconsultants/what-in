import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { handleIncomingAILogic } from "@/lib/whatsappAI";
import { executeFlowEngine } from "@/lib/whatsappFlowEngine";
import { assignWhatsAppLeadAction, generateWhatsAppPaymentLinkAction } from "@/app/actions/whatsAppPlatformActions";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";
import { notifyAdminsOfTemplateStatusChange } from "@/lib/pushNotifications";
import { emitInboxEvent } from "@/lib/inboxEvents";
import { processUpiScreenshotAction } from "@/app/actions/upiScreenshotActions";
import { getRecoveryAgentSettings } from "@/lib/paymentRecoveryAgent";

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
    
    // Log Meta Flow submissions in database
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
        }
      } catch (err) {
        console.error("Failed to log form submission in webhook:", err);
      }
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
    // AUTO-SEND PAYMENT LINK WITH QR ON CATALOG ORDERS
    // ══════════════════════════════════════════════════════
    if (msg.type === "order" && orderMetadata?.order && orderMetadata.order.totalAmount > 0) {
      (async () => {
        try {
          const recSettings = await getRecoveryAgentSettings();
          if (recSettings.autoCatalogPaymentEnabled !== false) {
            const orderInfo = orderMetadata.order;
            const itemSummary = (orderInfo.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join(", ");
            const desc = `Catalog Order (${orderInfo.totalQuantity} items: ${itemSummary})`.slice(0, 150);

            await generateWhatsAppPaymentLinkAction({
              conversationId: conversation.id,
              customerId: customer.id,
              amount: orderInfo.totalAmount,
              description: desc,
              deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both"
            });

            console.log(`[WhatsApp Webhook] Auto-sent payment link + QR for catalog order to ${customer.contactPerson} (Amount: ₹${orderInfo.totalAmount})`);
          } else {
            console.log(`[WhatsApp Webhook] Auto-send catalog payment link skipped (disabled by admin setting)`);
          }
        } catch (catOrderErr) {
          console.error("[WhatsApp Webhook] Error auto-sending payment link on catalog order:", catOrderErr);
        }
      })();
    }

    // Chatbot Flow Engine Execution (Client Scoped)
    const isTextMessage = msg.type === "text" || msg.type === "interactive";
    if (isTextMessage) {
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
