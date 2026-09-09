import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleIncomingAILogic } from "@/lib/whatsappAI";
import { executeFlowEngine } from "@/lib/whatsappFlowEngine";
import { assignWhatsAppLeadAction } from "@/app/actions/whatsAppPlatformActions";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";
import { notifyAdminsOfTemplateStatusChange } from "@/lib/pushNotifications";

const PROCESSED_WEBHOOK_IDS = new Set<string>();

// GET Endpoint - Webhook Verification Challenge from Meta WhatsApp API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "whatin_whatsapp_secure_webhook_token_2026";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] Verification successful!");
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Forbidden - Invalid verify token" }, { status: 403 });
}

// POST Endpoint - Incoming Messages & Delivery Receipts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log Webhook Payload
    try {
      await prisma.whatsAppWebhookLog.create({
        data: {
          event: "WEBHOOK_RECEIVED",
          payload: body
        }
      });
    } catch (e) { console.error("Failed to log webhook", e); }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: "ignored" });
    }

    // ══════════════════════════════════════════════════════
    // 0. PROCESS MESSAGE TEMPLATE STATUS UPDATES (APPROVED, REJECTED, PAUSED, DISABLED)
    // ══════════════════════════════════════════════════════
    const changeField = changes?.field;
    if (changeField === "message_template_status_update" || value.event || (value.message_template_name && value.event)) {
      const templateEvent = (value.event || "").toUpperCase(); // APPROVED, REJECTED, PAUSED, DISABLED, PENDING_DELETION
      const templateId = value.message_template_id ? String(value.message_template_id) : undefined;
      const templateName = value.message_template_name;
      const templateLang = value.message_template_language || "en_US";
      const rejectionReason = value.reason || value.rejection_reason || value.rejected_reason || (value.disable_info?.disable_date ? "Disabled by Meta" : null);

      if (templateEvent && (templateId || templateName)) {
        console.log(`[Meta Webhook] Template Status Event: ${templateName || templateId} -> ${templateEvent} (Reason: ${rejectionReason})`);

        try {
          // 1. Update database record
          const existing = await prisma.whatsAppTemplate.findFirst({
            where: {
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

          // 2. Dispatch Push Notification to all Admins
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
    // 0. EMERGENCY DEBUG LOGGING (Raw Payload Dump)
    // ══════════════════════════════════════════════════════
    /* 
    try {
      const dbAccount = await prisma.whatsAppAccount.findFirst() || await prisma.whatsAppAccount.create({ data: { name: "Debug", phoneNumber: "000", status: "CONNECTED" } });
      let debugCustomer = await prisma.customer.findFirst({ where: { mobile: "0000000000" } });
      if (!debugCustomer) debugCustomer = await prisma.customer.create({ data: { businessName: "Debug", contactPerson: "Debug", mobile: "0000000000" } });
      let debugConv = await prisma.whatsAppConversation.findFirst({ where: { customerId: debugCustomer.id } });
      if (!debugConv) debugConv = await prisma.whatsAppConversation.create({ data: { accountId: dbAccount.id, customerId: debugCustomer.id, status: "OPEN" } });
      
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: debugConv.id,
          senderType: "SYSTEM",
          senderName: "WEBHOOK_PAYLOAD_DUMP",
          messageType: "TEXT",
          content: JSON.stringify(body).slice(0, 4000),
          status: "SENT",
          sentAt: new Date()
        }
      });
    } catch (e) {
      console.error("Failed to dump raw payload", e);
    }
    */

    // ══════════════════════════════════════════════════════
    // 0. PROCESS MESSAGE STATUS UPDATES (SENT, DELIVERED, READ, FAILED)
    // ══════════════════════════════════════════════════════
    if (value.statuses && Array.isArray(value.statuses)) {
      for (const st of value.statuses) {
        try {
          const wamid = st.id;
          const status = (st.status || "").toLowerCase(); // "sent", "delivered", "read", "failed"
          const recipientId = st.recipient_id ? st.recipient_id.replace(/\D/g, "") : "";
          const last10 = recipientId.slice(-10);

          let targetStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null = null;
          if (status === 'delivered') targetStatus = 'DELIVERED';
          else if (status === 'read') targetStatus = 'READ';
          else if (status === 'failed') targetStatus = 'FAILED';
          else if (status === 'sent') targetStatus = 'SENT';

          if (targetStatus && last10) {
            // Update Campaign Queue Item status
            const queueItems = await prisma.whatsAppCampaignQueue.findMany({
              where: {
                toPhone: { endsWith: last10 },
                status: { notIn: targetStatus === 'READ' ? ['FAILED'] : ['READ', 'FAILED'] }
              },
              select: { id: true, campaignId: true, status: true }
            });

            if (queueItems.length > 0) {
              const now = new Date();
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

            // Update matching WhatsAppMessage record
            await prisma.whatsAppMessage.updateMany({
              where: {
                OR: [
                  { whatsappMessageId: wamid },
                  { conversation: { customer: { mobile: { endsWith: last10 } } } }
                ]
              },
              data: {
                status: targetStatus,
                deliveredAt: targetStatus === 'DELIVERED' ? new Date() : undefined,
                readAt: targetStatus === 'READ' ? new Date() : undefined
              }
            });
          }
        } catch (err) {
          console.error("[Webhook Status Receipt Error]:", err);
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // 1. PROCESS INCOMING MESSAGES
    // ══════════════════════════════════════════════════════
    if (value.messages && value.messages.length > 0) {
      const metadata = value.metadata;
      
      // Ensure we only process messages for our specific CRM phone number (7404388242)
      // because Meta Webhook sends events for ALL numbers attached to the Meta App.
      // Phone filter removed

      const msg = value.messages[0];

      // Deduplication Check
      if (msg.id && PROCESSED_WEBHOOK_IDS.has(msg.id)) {
        return NextResponse.json({ status: "ignored - duplicate" });
      }
      if (msg.id) {
        PROCESSED_WEBHOOK_IDS.add(msg.id);
        if (PROCESSED_WEBHOOK_IDS.size > 1000) PROCESSED_WEBHOOK_IDS.clear();
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

      // Detect Button Clicks
      const isButtonClick = Boolean(
        msg.type === "button" ||
        msg.button ||
        (msg.type === "interactive" && msg.interactive?.type === "button_reply")
      );
      const clickedButtonTitle = msg.button?.text || msg.interactive?.button_reply?.title || null;

      // Feature: Intercept `buy_` buttons
      if (msg.interactive?.button_reply?.id?.startsWith("buy_")) {
         console.log(`[WhatsApp Webhook] Buy button clicked for ${msg.interactive.button_reply.id}`);
      }

      // Automated Marketing Opt-Out (DND) & Resubscribe Detection
      const cleanUpperText = textContent.trim().toUpperCase();
      const isOptOutCommand = ["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT", "DO NOT DISTURB", "DND"].includes(cleanUpperText) ||
        (isButtonClick && clickedButtonTitle && ["STOP", "UNSUBSCRIBE", "OPT OUT", "STOP PROMOTIONS"].some(s => clickedButtonTitle.toUpperCase().includes(s)));
      const isResubscribeCommand = ["START", "RESUBSCRIBE", "UNSTOP"].includes(cleanUpperText);

      if (isOptOutCommand) {
        await prisma.customer.updateMany({
          where: {
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
            OR: [
              { mobile: { contains: last10 } },
              { whatsappNumber: { contains: last10 } }
            ]
          },
          data: { marketingOptOut: false, optedOutAt: null }
        }).catch(() => {});
      }

      try {
        const recentQueueItem = await prisma.whatsAppCampaignQueue.findFirst({
          where: {
            toPhone: { endsWith: last10 },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
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

      // Feature 5: Extract WhatsApp Profile Name from Meta payload
      const whatsappProfileName = value.contacts?.[0]?.profile?.name || null;

      // Step A: Search CRM by Phone Number
      let customer = await prisma.customer.findFirst({
        where: {
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
        // If customer was previously saved with a truncated number, update to full international phone
        if (cleanPhone.length > (customer.whatsappNumber?.length || 0)) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { whatsappNumber: cleanPhone, mobile: cleanPhone }
          }).catch(() => {});
          customer = { ...customer, whatsappNumber: cleanPhone, mobile: cleanPhone };
        }

        if (whatsappProfileName && (customer.contactPerson?.startsWith("Contact +") || customer.contactPerson?.startsWith("Contact 91") || customer.contactPerson?.startsWith("+") || customer.contactPerson === "Unknown Lead" || !customer.contactPerson)) {
          // Feature 5: Update contact name if it was an auto-placeholder or Unknown
          await prisma.customer.update({
            where: { id: customer.id },
            data: { contactPerson: whatsappProfileName }
          });
          customer = { ...customer, contactPerson: whatsappProfileName };
        }
      }

      // Step C: Link/Find Conversation
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: { customerId: customer.id }
      });

      const account = await prisma.whatsAppAccount.findFirst() || await prisma.whatsAppAccount.create({
        data: {
          name: "Main WhatsApp",
          phoneNumber: "+91 7206066678",
          status: "CONNECTED"
        }
      });

      const messageTimestamp = new Date(parseInt(msg.timestamp) * 1000 || Date.now());
      
      // Log Meta Flow submissions in database
      if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
        try {
          const flowReply = msg.interactive.nfm_reply;
          let formRecord = await prisma.whatsAppForm.findFirst({ where: { name: "Meta Flow Form" } });
          if (!formRecord) {
            formRecord = await prisma.whatsAppForm.create({
              data: { name: "Meta Flow Form", fields: "[]" }
            });
          }
          await prisma.whatsAppFormSubmission.create({
            data: {
              formId: formRecord.id,
              conversationId: conversation.id,
              customerId: customer.id,
              dataJson: flowReply.response_json || "{}"
            }
          });
        } catch (err) {
          console.error("Failed to log form submission in webhook:", err);
        }
      }

      let wasClosed = false;

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
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
          }
        });

        if (wasClosed && conversation.assignedEmployeeId) {
          console.log(`[Webhook Reopen] Reopened closed chat ${conversation.id} and retained assigned agent ${conversation.assignedEmployeeId}`);
        }
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
        
        // Update customer leadSource & tag
        try {
          const existingTags = (customer.tags || '')
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
          const newTags = Array.from(new Set([...existingTags, "Meta_CTWA_Ad"]));
          await prisma.customer.update({
            where: { id: customer.id },
            data: { 
              leadSource: "Meta Click-to-WhatsApp Ad",
              tags: newTags.join(', ')
            }
          });
        } catch (_) {}
      }

      // Step D: Store Incoming Message
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "CUSTOMER",
          senderName: customer.contactPerson,
          messageType: msg.type ? msg.type.toUpperCase() : "TEXT",
          content: textContent,
          mediaUrl: proxyMediaUrl,
          mediaType: mediaMimeType,
          status: "RECEIVED",
          metaMessageId: msg.id,
          metadata: ctwaMetadata ? JSON.stringify(ctwaMetadata) : null,
          sentAt: messageTimestamp
        }
      });

      // If CTWA Ad Referral is present, log a system referral banner message in chat timeline
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

      console.log(`[WhatsApp Webhook] Incoming message from ${formatWhatsAppPhone(fullPhone)}: "${textContent.slice(0, 50)}"`);

      // Removed old global auto-assignment logic to rely purely on Chatbot Engine routing.
        // Feature 1: Send Web Push Notification to assigned agent or all if unassigned
        sendPushNotificationToAgents(
          `New Message from ${customer.contactPerson || formatWhatsAppPhone(fullPhone)}`,
          textContent.slice(0, 100),
          `/whatsapp/inbox`,
          conversation.assignedEmployeeId
        ).catch((e) => console.error("[Push] Failed:", e.message));

      // Feature 2: Chatbot Flow Engine — check if a flow should intercept
      const isTextMessage = msg.type === "text" || msg.type === "interactive";
      if (isTextMessage) {
        const flowHandled = await executeFlowEngine(fromPhone, textContent, conversation.id, wasClosed);

        if (!flowHandled && conversation.aiHandled) {
          // Feature 7: AI + Logging
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
            aiResponse = await handleIncomingAILogic(fromPhone, textContent, historyLines, conversation.id);
            if (!aiResponse) {
              aiStatus = "FAILED";
              aiError = "AI returned empty response";
            } else {
              // Detect which tools were called from the response content
              const tools: string[] = [];
              if (textContent.match(/[12]\d{3}/)) tools.push("lookupOrder");
              if (/shirt|short|combo|pant|product/i.test(textContent)) tools.push("searchProducts");
              if (/size|weight|kg|cm|waist/i.test(textContent)) tools.push("recommendSize");
              toolsCalled = tools.length > 0 ? tools.join(", ") : "ai_reply";
            }
          } catch (e: any) {
            aiStatus = "FAILED";
            aiError = e.message;
          }

          const aiDuration = Date.now() - aiStart;

          // Feature 7: Log AI execution to DB
          await prisma.whatsAppAILog.create({
            data: {
              phone: cleanPhone,
              userMessage: textContent.slice(0, 500),
              aiReply: aiResponse?.slice(0, 2000) || null,
              toolsCalled,
              status: aiStatus,
              errorMessage: aiError,
              durationMs: aiDuration
            }
          }).catch(() => {}); // Non-critical, don't fail webhook on log error

          // Message sent and saved inside handleIncomingAILogic via sendWhatsAppMessageAction
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // 2. PROCESS MESSAGE STATUS UPDATES (Delivered, Read, Failed)
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

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Fire-and-forget Web Push to agents (respects assignment)
async function sendPushNotificationToAgents(title: string, body: string, url: string, assignedEmployeeId?: string | null) {
  let targetEmails: string[] = [];

  if (assignedEmployeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedEmployeeId },
      include: { user: true }
    });
    if (emp && emp.user) {
      targetEmails.push(emp.user.email);
    }
  } else {
    // Unassigned chat: only notify ADMINs
    const [adminUsers, adminAgents] = await Promise.all([
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } }),
      prisma.whatsAppAgentUser.findMany({ where: { role: "ADMIN" }, select: { email: true } })
    ]);
    targetEmails = [
      ...adminUsers.map((u) => u.email),
      ...adminAgents.map((a) => a.email)
    ];
  }

  const subs = await prisma.whatsAppPushSubscription.findMany();
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, data: { url } });

  for (const sub of subs) {
    // If chat is assigned to someone, only notify them. If unassigned, only notify admins.
    if (!targetEmails.includes(sub.userId)) {
      continue; 
    }

    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      // Call our own internal push endpoint (avoids importing web-push in Edge Runtime)
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET || 'crm_internal_2026' },
        body: JSON.stringify({ subscription, payload })
      });
    } catch (_) {}
  }
}
