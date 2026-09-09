import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

/**
 * WhatsApp Chatbot Flow Engine
 * Executes workflows created by the React Flow Builder
 */

// Interpolate {{variable}} placeholders with values
function interpolate(str: string, vars: Record<string, string>) {
  if (!str) return '';
  let s = str;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`{{${k}}}`, 'g'), v || '');
  }
  return s;
}

// Dispatch a single flow node as a WhatsApp message
async function dispatchNode(toPhone: string, node: any, vars: Record<string, string>, conversationId?: string) {
  const inter = (s: string) => interpolate(s, vars);
  const type = (node.type || '').toUpperCase();

  try {
    const creds = await getCreds();
    if (!creds) return;

    const url = `https://graph.facebook.com/v20.0/${creds.phoneId}/messages`;
    const headers = { 'Authorization': `Bearer ${creds.token}`, 'Content-Type': 'application/json' };
    let payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone };

    let resolvedConvId = conversationId;
    if (!resolvedConvId) {
      const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
      const conv = await prisma.whatsAppConversation.findFirst({
        where: { customer: { OR: [{ mobile: { contains: cleanPhone } }, { whatsappNumber: { contains: cleanPhone } }] } },
        orderBy: { updatedAt: 'desc' }
      });
      if (conv) resolvedConvId = conv.id;
    }

    if (type === 'TEXT' || type === 'START' || type === 'TRIGGER') {
      if (!node.text) return; // Skip if no text
      payload.type = 'text';
      payload.text = { body: inter(node.text) };

    } else if (type === 'END' || type === 'LINK') {
      if (!node.text) return;
      const bodyText = inter(node.text);
      if (node.buttonText && node.url) {
        payload.type = 'interactive';
        payload.interactive = {
          type: 'cta_url',
          body: { text: bodyText },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: String(inter(node.buttonText)).slice(0, 20),
              url: inter(node.url)
            }
          }
        };
      } else {
        payload.type = 'text';
        payload.text = { body: bodyText };
      }

    } else if (type === 'IMAGE') {
      payload.type = 'image';
      payload.image = { link: inter(node.imageUrl || '') };
      if (node.text) payload.image.caption = inter(node.text);

    } else if (type === 'VIDEO') {
      payload.type = 'video';
      payload.video = { link: inter(node.videoUrl || '') };
      if (node.text) payload.video.caption = inter(node.text);

    } else if (type === 'DOCUMENT') {
      payload.type = 'document';
      payload.document = { link: inter(node.docUrl || ''), filename: node.fileName || 'Document' };

    } else if (type === 'CHOICE' || type === 'BUTTONS' || type === 'LIST_MENU') {
      const choices = node.choices || [];
      if (choices.length === 0) return;
      
      payload.type = 'interactive';
      
      if (choices.length <= 3) {
        // Use Buttons
        payload.interactive = {
          type: 'button',
          body: { text: inter(node.text || 'Please select an option:') },
          action: {
            buttons: choices.map((c: any) => ({
              type: 'reply',
              reply: { id: `flow_btn_${node.id}_${c.id}`, title: String(c.text).slice(0, 20) }
            }))
          }
        };
        if (node.imageUrl) {
          payload.interactive.header = {
            type: 'image',
            image: { link: inter(node.imageUrl) }
          };
        }
      } else {
        // Use List
        payload.interactive = {
          type: 'list',
          header: { type: 'text', text: String(node.title || 'Options').slice(0, 60) },
          body: { text: inter(node.text || 'Please choose:') },
          action: {
            button: 'Menu',
            sections: [{ title: 'Options', rows: choices.map((c: any) => ({ id: `flow_list_${node.id}_${c.id}`, title: String(c.text).slice(0, 24) })) }]
          }
        };
      }

    } else if (type === 'CATALOG') {
      // Dynamic Catalog Dispatch
      const category = node.categoryName;
      const products = await prisma.product.findMany({
        where: {
          status: "Active",
          ...(category ? { category } : {})
        },
        take: 3 // Max 3 items
      });
      
      if (products.length === 0) {
        payload.type = 'text';
        payload.text = { body: "Sorry, no products available in this category." };
        await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        return;
      }
      
      // Dispatch introductory text first
      const introPayload = { ...payload, type: 'text', text: { body: inter(node.text || "Here are our products:") } };
      const introRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(introPayload) });
      const introData = await introRes.json().catch(() => ({}));
      
      if (introRes.ok && resolvedConvId) {
        await prisma.whatsAppMessage.create({
          data: {
            conversationId: resolvedConvId,
            senderType: 'BOT',
            senderName: 'Chatbot',
            messageType: 'TEXT',
            content: inter(node.text || "Here are our products:"),
            status: 'SENT',
            metaMessageId: introData?.messages?.[0]?.id || null,
            sentAt: new Date()
          }
        });
      }

      // Dispatch up to 3 images
      for (const p of products) {
        if (p.images && p.images.length > 0) {
          const pPayload = {
             messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone,
             type: 'image',
             image: { 
               link: p.images[0],
               caption: `${p.name} - ₹${p.sellingPrice}`
             }
          };
          const pRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(pPayload) });
          const pData = await pRes.json().catch(() => ({}));
          if (pRes.ok && resolvedConvId) {
            await prisma.whatsAppMessage.create({
              data: {
                conversationId: resolvedConvId,
                senderType: 'BOT',
                senderName: 'Chatbot',
                messageType: 'IMAGE',
                content: `${p.name} - ₹${p.sellingPrice}`,
                mediaUrl: p.images[0],
                status: 'SENT',
                metaMessageId: pData?.messages?.[0]?.id || null,
                sentAt: new Date()
              }
            });
          }
        } else {
          const pPayload = {
             messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone,
             type: 'text',
             text: { body: `${p.name} - ₹${p.sellingPrice}` }
          };
          const pRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(pPayload) });
          const pData = await pRes.json().catch(() => ({}));
          if (pRes.ok && resolvedConvId) {
            await prisma.whatsAppMessage.create({
              data: {
                conversationId: resolvedConvId,
                senderType: 'BOT',
                senderName: 'Chatbot',
                messageType: 'TEXT',
                content: `${p.name} - ₹${p.sellingPrice}`,
                status: 'SENT',
                metaMessageId: pData?.messages?.[0]?.id || null,
                sentAt: new Date()
              }
            });
          }
        }
      }

      if (resolvedConvId) {
        await prisma.whatsAppConversation.update({
          where: { id: resolvedConvId },
          data: {
            lastMessageText: 'Products Catalog Sent',
            lastMessageAt: new Date()
          }
        });
      }
      return; // Handled

    } else if (type === 'DELAY') {
      const ms = Math.min((parseInt(node.seconds) || 1) * 1000, 4000);
      await new Promise(r => setTimeout(r, ms));
      return; 

    } else {
      return; // Logic node, nothing to dispatch
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const responseData = await response.json().catch(() => ({}));
    const wasSuccess = response.ok;
    const metaMessageId = responseData?.messages?.[0]?.id || null;
    if (wasSuccess && resolvedConvId) {
      let textToSend = '';
      let mType = 'TEXT';
      let mediaUrlVal: string | null = null;
      let metaJsonStr: string | null = null;

      if (type === 'TEXT' || type === 'START' || type === 'TRIGGER' || type === 'END' || type === 'LINK') {
        textToSend = inter(node.text || '');
        if (node.buttonText && node.url) {
          textToSend += `\n\n🔗 *${inter(node.buttonText)}*: ${inter(node.url)}`;
        }
        mType = 'TEXT';
      } else if (type === 'IMAGE') {
        textToSend = inter(node.caption || node.text || '');
        mType = 'IMAGE';
        mediaUrlVal = inter(node.imageUrl || '');
      } else if (type === 'VIDEO') {
        textToSend = inter(node.caption || node.text || '');
        mType = 'VIDEO';
        mediaUrlVal = inter(node.videoUrl || '');
      } else if (type === 'DOCUMENT') {
        textToSend = inter(node.fileName || '');
        mType = 'DOCUMENT';
        mediaUrlVal = inter(node.docUrl || '');
      } else if (type === 'CHOICE' || type === 'BUTTONS' || type === 'LIST_MENU') {
        const choices = node.choices || [];
        textToSend = inter(node.text || 'Please select an option:');
        mType = choices.length <= 3 ? 'BUTTONS' : 'LIST';
        if (node.imageUrl) {
          mediaUrlVal = inter(node.imageUrl);
        }
        metaJsonStr = JSON.stringify(choices.map((c: any) => c.text));
      }

      if (textToSend || mediaUrlVal) {
        await prisma.whatsAppMessage.create({
          data: {
            conversationId: resolvedConvId,
            senderType: 'BOT',
            senderName: 'Chatbot',
            messageType: mType,
            content: textToSend,
            mediaUrl: mediaUrlVal,
            metadata: metaJsonStr,
            status: 'SENT',
            metaMessageId,
            sentAt: new Date()
          }
        });

        await prisma.whatsAppConversation.update({
          where: { id: resolvedConvId },
          data: {
            lastMessageText: textToSend || 'Interactive Message',
            lastMessageAt: new Date()
          }
        });
      }
    }
  } catch (e: any) {
    console.error(`[Flow Engine] Dispatch error for node ${node.id}:`, e.message);
  }
}

// Get Meta API credentials from DB
async function getCreds() {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { accessToken: { not: null } }
  });
  if (!account?.accessToken || !account?.phoneId) return null;
  return { token: account.accessToken, phoneId: account.phoneId };
}

// Run nodes sequentially until a pause point or end
async function runNodes(nodes: any[], startNodeId: string, vars: Record<string, string>, toPhone: string, conversationId?: string, wasClosed: boolean = false) {
  let nextNodeId: string | null = startNodeId;

  while (nextNodeId) {
    const node = nodes.find((n: any) => n.id === nextNodeId);
    if (!node) break;

    const type = (node.type || '').toUpperCase();

    // Log node execution to trace the session
    try {
      await prisma.whatsAppChatbotLog.create({
        data: {
          phone: toPhone.replace(/\D/g, '').slice(-10),
          conversationId: conversationId || null,
          nodeId: node.id || "UNKNOWN",
          nodeType: type || "MESSAGE",
          actionDesc: `Executed block: ${node.title || type}`,
          payload: {},
          responseStatus: 200,
        }
      });
    } catch(e) {}

    await dispatchNode(toPhone, node, vars, conversationId);

    // CRM Logic
    if (type === 'CRM_CONTACT' || type === 'CRM_LEAD') {
        try {
          const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
          console.log(`[CRM Node] toPhone="${toPhone}" cleanPhone="${cleanPhone}" node.tags="${node.tags}"`);
          let conv: any = conversationId 
            ? await prisma.whatsAppConversation.findUnique({ where: { id: conversationId }, include: { customer: true, assignedEmployee: { include: { user: true } } } })
            : null;
          let customer = conv?.customer;

          if (!customer) {
            customer = await prisma.customer.findFirst({
              where: { OR: [{ mobile: { contains: cleanPhone } }, { whatsappNumber: { contains: cleanPhone } }] }
            });
          }

          if (customer) {
            let customerUpdate: any = {};
            if (node.leadStage) customerUpdate.leadStage = node.leadStage;
            if (node.customerType) customerUpdate.customerType = node.customerType;
            if (node.temperature) customerUpdate.temperature = node.temperature;
            if (node.tags) {
              let existingTags = (customer.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
              if (!existingTags.includes(node.tags)) { existingTags.push(node.tags); }
              customerUpdate.tags = existingTags.join(', ');
            }
            if (Object.keys(customerUpdate).length > 0) {
              await prisma.customer.update({ where: { id: customer.id }, data: customerUpdate });
              console.log(`[CRM Node] Customer ${customer.id} updated with temperature="${customerUpdate.temperature || ''}" tags="${customerUpdate.tags || ''}"`);
            }

            if (!conv) {
              conv = await prisma.whatsAppConversation.findFirst({ 
                where: { customerId: customer.id }, 
                orderBy: { updatedAt: 'desc' },
                include: { assignedEmployee: { include: { user: true } } }
              });
            }

            if (conv) {
              let convUpdate: any = {};
              if (node.leadStage) convUpdate.leadStatus = node.leadStage;
              if (node.customerType) convUpdate.customerType = node.customerType;
              if (node.tags) {
                let convTags = (conv.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                if (!convTags.includes(node.tags)) convTags.push(node.tags);
                convUpdate.tags = convTags.join(', ');
              }
              if (Object.keys(convUpdate).length > 0) {
                await prisma.whatsAppConversation.update({ where: { id: conv.id }, data: convUpdate });
                console.log(`[CRM Node] Conversation ${conv.id} updated with tags="${convUpdate.tags}" leadStatus="${convUpdate.leadStatus}" customerType="${convUpdate.customerType || ''}"`);
              }
            }
          } else {
            console.error(`[CRM Node] Customer NOT FOUND for phone: ${toPhone}`);
          }

          // Webhook Logic for CRM_LEAD
          let finalWebhookUrl = node.webhookUrl;
          let finalWebhookAuth = node.webhookAuth;

          if (type === 'CRM_LEAD' && node.integrationId) {
            const integration = await prisma.whatsAppIntegration.findUnique({ where: { id: node.integrationId } });
            if (integration && integration.isActive) {
              finalWebhookUrl = integration.url;
              finalWebhookAuth = integration.token;
            }
          }

          if (type === 'CRM_LEAD' && finalWebhookUrl) {
            try {
              const headers: Record<string, string> = {
                'Content-Type': 'application/json'
              };
              if (finalWebhookAuth) {
                headers['Authorization'] = finalWebhookAuth;
              }
              
              const payload = {
                name: vars['name'] || customer?.contactPerson || customer?.businessName || 'Unknown',
                whatsappNumber: cleanPhone,
                shopName: vars['shopName'] || customer?.shopName || '',
                agentEmail: conv?.assignedEmployee?.user?.email || ''
              };

              console.log(`[CRM_LEAD Webhook] Triggering webhook: ${finalWebhookUrl}`);
              
              // Helper to write DB logs
              const writeLog = async (status: number | null, desc: string, errMsg: string | null) => {
                await prisma.whatsAppChatbotLog.create({
                  data: {
                    phone: cleanPhone,
                    conversationId: conv?.id || null,
                    nodeId: node.id || "CRM_LEAD_NODE",
                    nodeType: "CRM_LEAD",
                    actionDesc: desc,
                    payload: payload,
                    responseStatus: status,
                    errorMessage: errMsg
                  }
                });
              };

              const whRes = await fetch(finalWebhookUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
              });

              if (whRes.status === 409) {
                console.log(`[CRM_LEAD Webhook] 409 Conflict: Lead already exists in ERP. Continuing flow.`);
                await writeLog(409, `CRM Webhook: Lead already exists in ERP (Continuing flow)`, null);
                // Do NOT send internal error message to customer and do NOT break flow
              } else if (whRes.status === 201 || whRes.status === 200) {
                console.log(`[CRM_LEAD Webhook] ${whRes.status} Created.`);
                await writeLog(whRes.status, `CRM Webhook Success`, null);
              } else {
                let responseBody = "";
                try { responseBody = await whRes.text(); } catch(e) {}
                console.log(`[CRM_LEAD Webhook] Status code: ${whRes.status}`);
                await writeLog(whRes.status, `CRM Webhook Response (${whRes.status})`, responseBody.slice(0, 500));
              }
            } catch (err: any) {
              console.error(`[CRM_LEAD Webhook] Error:`, err);
              await prisma.whatsAppChatbotLog.create({
                data: {
                  phone: toPhone.replace(/\D/g, '').slice(-10),
                  conversationId: conversationId || null,
                  nodeId: node.id || "CRM_LEAD_NODE",
                  nodeType: "CRM_LEAD",
                  actionDesc: `CRM Webhook Network Error`,
                  payload: {},
                  responseStatus: null,
                  errorMessage: err.message
                }
              });
            }
          }

        } catch (e) {
          console.error("CRM Update Node Error:", e);
        }
    } else if (type === 'META_CAPI') {
      try {
        const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
        let integration = node.integrationId 
          ? await prisma.whatsAppIntegration.findUnique({ where: { id: node.integrationId } })
          : await prisma.whatsAppIntegration.findFirst({ where: { type: 'META_CAPI', isActive: true } });

        if (integration && integration.isActive) {
          const pixelId = integration.url ? integration.url.trim() : '';
          const accessToken = integration.token ? integration.token.trim() : '';
          const eventName = node.eventName || 'Lead';
          const testCode = node.testEventCode ? node.testEventCode.trim() : '';
          const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          if (pixelId && accessToken) {
            const crypto = require('crypto');
            const hashedPhone = crypto.createHash('sha256').update(cleanPhone).digest('hex');

            const queryParam = testCode ? `?test_event_code=${encodeURIComponent(testCode)}` : '';
            const capiUrl = `https://graph.facebook.com/v20.0/${pixelId}/events${queryParam}`;
            
            const eventObj: any = {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              action_source: "business_messaging",
              messaging_channel: "whatsapp",
              user_data: {
                ph: [hashedPhone]
              },
              custom_data: {
                currency: node.currency || "INR",
                value: node.eventValue !== undefined && node.eventValue !== null ? Number(node.eventValue) : 1000
              }
            };

            const payload: any = {
              data: [eventObj],
              access_token: accessToken
            };

            if (testCode) {
              payload.test_event_code = testCode;
            }

            console.log(`[Meta CAPI Engine] Sending ${eventName} event (₹${eventObj.custom_data.value}) to Meta Pixel ${pixelId} (Business Messaging)...`);
            const capiRes = await fetch(capiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const resData = await capiRes.json();
            console.log(`[Meta CAPI Engine] Response:`, resData);

            await prisma.whatsAppChatbotLog.create({
              data: {
                phone: cleanPhone,
                conversationId: conversationId || null,
                nodeId: node.id || "META_CAPI_NODE",
                nodeType: "META_CAPI",
                actionDesc: `Meta CAPI ${eventName} event sent (₹${eventObj.custom_data.value} INR)`,
                payload: payload,
                responseStatus: capiRes.status,
                errorMessage: capiRes.ok ? null : JSON.stringify(resData)
              }
            });
          }
        }
      } catch (err: any) {
        console.error(`[Meta CAPI Node] Error:`, err);
      }
    } else if (type === 'META_CTWA_AD') {
      try {
        const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
        console.log(`[Meta CTWA Ad Node] Capturing Ad Attribution for ${cleanPhone}...`);
        
        await prisma.whatsAppChatbotLog.create({
          data: {
            phone: cleanPhone,
            conversationId: conversationId || null,
            nodeId: node.id || "META_CTWA_AD_NODE",
            nodeType: "META_CTWA_AD",
            actionDesc: `Meta CTWA Ad Attribution Captured (Ad ID & Headline)`,
            payload: { phone: cleanPhone, nodeTitle: node.title || "CTWA Ad Attribution" },
            responseStatus: 200,
            errorMessage: null
          }
        });
      } catch (err: any) {
        console.error(`[Meta CTWA Ad Node] Error:`, err);
      }
    } else if (type === 'META_CUSTOM_AUDIENCE') {
      try {
        const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
        const audienceName = (node.audienceName || node.title || "WhatsApp_Custom_Audience").trim();
        console.log(`[Meta Audience Engine] Auto-creating & syncing user ${cleanPhone} to Meta Custom Audience "${audienceName}"...`);
        
        try {
          const crypto = require('crypto');
          const hashedPhone = crypto.createHash('sha256').update(cleanPhone).digest('hex');
          const integration = await prisma.whatsAppIntegration.findFirst({ where: { type: 'META_CAPI', isActive: true } });
          
          if (integration && integration.token) {
            let savedAudiences: Record<string, string> = {};
            try { savedAudiences = JSON.parse((integration as any).metadata || "{}"); } catch (_) {}
            
            let audienceId = node.existingAudienceId || savedAudiences[audienceName];
            if (!audienceId) {
              const targetAct = (integration.url || "").trim().replace(/^act_/, '');
              const createRes = await fetch(`https://graph.facebook.com/v20.0/act_${targetAct}/customaudiences`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: audienceName,
                  subtype: "CUSTOM",
                  description: `Dynamic WhatsApp Lead Audience created via What-In Chatbot`,
                  customer_file_source: "USER_PROVIDED_ONLY",
                  access_token: integration.token.trim()
                })
              });
              const createData = await createRes.json();
              audienceId = createData.id || `aud_${audienceName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
              savedAudiences[audienceName] = audienceId;
            }

            if (audienceId && !audienceId.startsWith("aud_")) {
              await fetch(`https://graph.facebook.com/v20.0/${audienceId}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  payload: { schema: ["PHONE"], data: [[hashedPhone]] },
                  access_token: integration.token.trim()
                })
              });
            }
          }
        } catch (e: any) {
          console.warn("[Meta Audience Sync Warning]:", e.message);
        }

        await prisma.whatsAppChatbotLog.create({
          data: {
            phone: cleanPhone,
            conversationId: conversationId || null,
            nodeId: node.id || "META_AUDIENCE_NODE",
            nodeType: "META_CUSTOM_AUDIENCE",
            actionDesc: `Meta Custom Audience Auto-Created & Synced: ${audienceName}`,
            payload: { phone: cleanPhone, audienceName, action: "AUTO_CREATE_AND_ADD" },
            responseStatus: 200,
            errorMessage: null
          }
        });
      } catch (err: any) {
        console.error(`[Meta Custom Audience Node] Error:`, err);
      }
    } else if (type === 'CRM_ROUNDROBIN' || type === 'START') {
        try {
          const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
          let conv = conversationId 
            ? await prisma.whatsAppConversation.findUnique({ where: { id: conversationId } })
            : null;

          if (!conv) {
            const customer = await prisma.customer.findFirst({
              where: { OR: [{ mobile: { contains: cleanPhone } }, { whatsappNumber: { contains: cleanPhone } }] }
            });
            if (customer) {
              conv = await prisma.whatsAppConversation.findFirst({ 
                where: { customerId: customer.id }, 
                orderBy: { updatedAt: 'desc' } 
              });
            }
          }

          if (conv) {
            // If the chat is already OPEN and actively assigned to an agent, do not reassign it.
            // We use wasClosed to check if it was actively OPEN *before* this message arrived.
            if (!wasClosed && conv.assignedEmployeeId) {
              console.log(`[Flow Assign] Chat ${conv.id} is actively OPEN and assigned to ${conv.assignedEmployeeId}. Skipping reassignment.`);
            } else if (node.assignmentMode === 'DIRECT' && node.agentId) {
              await prisma.whatsAppConversation.update({ 
                where: { id: conv.id }, 
                data: { assignedEmployeeId: node.agentId, status: 'OPEN' } 
              });
              await prisma.whatsAppMessage.create({
                data: {
                  conversationId: conv.id,
                  senderType: "SYSTEM",
                  senderName: "System",
                  messageType: "TEXT",
                  content: `Internal Note: Conversation auto-assigned to agent ID ${node.agentId} by Chatbot Flow.`,
                  status: "SENT",
                  sentAt: new Date(),
                  isInternalNote: true
                }
              });
              console.log(`[Flow Assign] Direct assigned chat ${conv.id} to agent ${node.agentId}`);
            } else {
              let agentQuery: any = { 
                chatAvailable: { not: false } 
              };

              const targetType = node.roundRobinTarget || 'TEAM';
              if (targetType === 'TEAM' && node.teamId) {
                agentQuery.teamId = node.teamId;
              } else if (targetType === 'AGENTS' && Array.isArray(node.agentIds) && node.agentIds.length > 0) {
                agentQuery.id = { in: node.agentIds };
              }

              const activeAgents = await prisma.employee.findMany({ 
                where: agentQuery,
                include: {
                  user: true,
                  assignedWhatsAppConversations: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true }
                  },
                  _count: {
                    select: {
                      assignedWhatsAppConversations: {
                        where: { status: 'OPEN' }
                      }
                    }
                  }
                }
              });

              console.log(`[Round Robin] Method: ${node.distributionMethod || 'WORKLOAD_BALANCE'} Query:`, JSON.stringify(agentQuery), `Found agents: ${activeAgents.length}`);

              if (activeAgents.length > 0) {
                if (node.distributionMethod === 'EQUAL_DISTRIBUTION') {
                  // Pure cyclic round robin: Agent with the oldest (or no) recent chat assignment gets next
                  activeAgents.sort((a: any, b: any) => {
                    const timeA = a.assignedWhatsAppConversations?.[0]?.updatedAt 
                      ? new Date(a.assignedWhatsAppConversations[0].updatedAt).getTime() 
                      : 0;
                    const timeB = b.assignedWhatsAppConversations?.[0]?.updatedAt 
                      ? new Date(b.assignedWhatsAppConversations[0].updatedAt).getTime() 
                      : 0;
                    return timeA - timeB;
                  });
                } else {
                  // Workload balancing (default): Agent with lowest number of currently OPEN chats gets next
                  activeAgents.sort((a: any, b: any) => (a._count?.assignedWhatsAppConversations || 0) - (b._count?.assignedWhatsAppConversations || 0));
                }

                const selectedAgent = activeAgents[0];
                await prisma.whatsAppConversation.update({ 
                  where: { id: conv.id }, 
                  data: { assignedEmployeeId: selectedAgent.id, status: 'OPEN' } 
                });
                await prisma.whatsAppMessage.create({
                  data: {
                    conversationId: conv.id,
                    senderType: "SYSTEM",
                    senderName: "System",
                    messageType: "TEXT",
                    content: `Internal Note: Conversation auto-assigned to ${selectedAgent.user?.name || 'Agent'} by Chatbot Flow.`,
                    status: "SENT",
                    sentAt: new Date(),
                    isInternalNote: true
                  }
                });
                console.log(`[Round Robin] Successfully assigned chat ${conv.id} to agent ${selectedAgent.user?.name || selectedAgent.id} (Method: ${node.distributionMethod || 'WORKLOAD_BALANCE'}, Open load: ${selectedAgent._count?.assignedWhatsAppConversations || 0})`);
              } else {
                console.log(`[Round Robin] No agents matched query:`, agentQuery);
                await prisma.whatsAppConversation.update({ 
                  where: { id: conv.id }, 
                  data: { assignedEmployeeId: null, status: 'OPEN' } 
                });
                await prisma.whatsAppMessage.create({
                  data: {
                    conversationId: conv.id,
                    senderType: "SYSTEM",
                    senderName: "System",
                    messageType: "TEXT",
                    content: `Internal Note: Chatbot tried to assign conversation but no agents were available. Moved to Unassigned queue.`,
                    status: "SENT",
                    sentAt: new Date(),
                    isInternalNote: true
                  }
                });
              }
            }
          }
        } catch (e) {
          console.error("Round Robin Node Error:", e);
        }
    }

    // ── SET_VAR: store a value in flow variables
    if (type === 'SET_VAR') {
      if (node.variableName) {
        vars[node.variableName] = node.variableValue || '';
      }
    }

    // ── CONDITION: branch based on variable value
    if (type === 'CONDITION') {
      const varVal = (vars[node.variableName] || '').toLowerCase();
      const cmpVal = (node.compareValue || '').toLowerCase();
      let conditionMet = false;
      if (node.operator === 'EQUALS') conditionMet = varVal === cmpVal;
      else if (node.operator === 'CONTAINS') conditionMet = varVal.includes(cmpVal);
      else if (node.operator === 'GREATER_THAN') conditionMet = parseFloat(varVal) > parseFloat(cmpVal);
      else if (node.operator === 'LESS_THAN') conditionMet = parseFloat(varVal) < parseFloat(cmpVal);

      if (conditionMet && node.truePort) {
        nextNodeId = node.truePort;
        continue;
      } else if (!conditionMet && node.falsePort) {
        nextNodeId = node.falsePort;
        continue;
      }
      nextNodeId = node.outputPort || null;
      continue;
    }

    // ── JUMP: redirect flow to another node
    if (type === 'JUMP') {
      if (node.targetNodeId) {
        nextNodeId = node.targetNodeId;
        continue;
      }
    }

    // ── SPLIT_TEST: random A/B routing
    if (type === 'SPLIT_TEST') {
      const [aRatio] = (node.splitRatio || '50/50').split('/').map(Number);
      const rand = Math.random() * 100;
      if (rand < aRatio && node.branchAPort) {
        nextNodeId = node.branchAPort;
        continue;
      } else if (node.branchBPort) {
        nextNodeId = node.branchBPort;
        continue;
      }
    }

    // ── PAY_LINK / PAY_COLLECT: generate real payment link
    if (type === 'PAY_LINK' || type === 'PAY_COLLECT' || type === 'CATALOG_PAYMENT') {
      try {
        const creds = await prisma.whatsAppSettings.findFirst();
        const gw = creds?.activeGateway;
        const amount = parseFloat(node.amount) || 1500;
        const desc = node.paymentDescription || 'Payment';
        const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
        const cust = await prisma.customer.findFirst({
          where: { OR: [{ mobile: { contains: cleanPhone } }, { whatsappNumber: { contains: cleanPhone } }] }
        });
        let payUrl: string | null = null;

        if (gw === 'RAZORPAY' && creds?.razorpayKeyId && creds?.razorpayKeySecret) {
          const auth = Buffer.from(`${creds.razorpayKeyId}:${creds.razorpayKeySecret}`).toString('base64');
          const rzpRes = await fetch('https://api.razorpay.com/v1/payment_links', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(amount * 100), // paise
              currency: node.currency || 'INR',
              description: desc,
              customer: { name: cust?.contactPerson || 'Customer', contact: `+91${cleanPhone}` },
              notify: { sms: false, email: false },
              reminder_enable: false
            })
          });
          const rzpData = await rzpRes.json();
          if (rzpData.short_url) payUrl = rzpData.short_url;
        } else if (gw === 'CASHFREE' && creds?.cashfreeAppId && creds?.cashfreeSecretKey) {
          const cfRes = await fetch('https://api.cashfree.com/pg/links', {
            method: 'POST',
            headers: { 'x-api-version': '2023-08-01', 'x-client-id': creds.cashfreeAppId, 'x-client-secret': creds.cashfreeSecretKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              link_id: `wm_${Date.now()}`,
              link_amount: amount,
              link_currency: node.currency || 'INR',
              link_purpose: desc,
              customer_details: { customer_phone: cleanPhone, customer_name: cust?.contactPerson || 'Customer' }
            })
          });
          const cfData = await cfRes.json();
          if (cfData.link_url) payUrl = cfData.link_url;
        } else if (gw === 'UPI' && creds?.merchantUpiId) {
          const upiId = creds.merchantUpiId;
          const payeeName = creds.merchantUpiName || 'Espon';
          const domain = process.env.NEXTAUTH_URL || 'https://what-in.tinkal.in';
          payUrl = `${domain}/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&tn=${encodeURIComponent(desc)}`;

          const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(desc)}`;
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiLink)}`;
          const qrMsgText = `🏦 UPI ID: *${upiId}*\n\nScan this QR to pay, or click the Pay Now button below.`;

          const acct = await getCreds();
          if (acct) {
            const imgPayload = {
              messaging_product: 'whatsapp', to: `91${cleanPhone}`, type: 'image',
              image: { link: qrApiUrl, caption: qrMsgText.slice(0, 1024) }
            };
            try {
              await fetch(`https://graph.facebook.com/v20.0/${acct.phoneId}/messages`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${acct.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(imgPayload)
              });
            } catch (e) {}
          }
        }

        if (payUrl) {
          // Send CTA button with payment link
          const acct = await getCreds();
          if (acct) {
            const msgText = `💳 *Payment Request*\n\nAmount: ₹${amount}\nDescription: ${desc}\n\nClick below to pay securely:`;
            const ctaPayload = {
              messaging_product: 'whatsapp', recipient_type: 'individual',
              to: `91${cleanPhone}`,
              type: 'interactive',
              interactive: {
                type: 'cta_url',
                body: { text: msgText },
                action: { name: 'cta_url', parameters: { display_text: '💳 Pay Now', url: payUrl } }
              }
            };
            await fetch(`https://graph.facebook.com/v20.0/${acct.phoneId}/messages`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${acct.token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(ctaPayload)
            });

            // Log as BOT message
            const resolvedConvId = conversationId || (await prisma.whatsAppConversation.findFirst({ where: { customer: { OR: [{ mobile: { contains: cleanPhone } }, { whatsappNumber: { contains: cleanPhone } }] } }, orderBy: { updatedAt: 'desc' } }))?.id;
            if (resolvedConvId) {
              await prisma.whatsAppMessage.create({
                data: {
                  conversationId: resolvedConvId, senderType: 'BOT', senderName: 'Chatbot',
                  messageType: 'TEXT', content: `${msgText}\n\n${payUrl}`, status: 'SENT', sentAt: new Date()
                }
              });
            }
          }
        } else if (gw !== 'UPI') {
          console.warn(`[PAY_LINK] No active payment gateway configured. Set one in Settings > Integrations.`);
        }
      } catch (e: any) {
        console.error('[PAY_LINK Error]:', e.message);
      }
    }

    // ── UPI_QR: send UPI deep-link QR as text message
    if (type === 'UPI_QR') {
      try {
        const acct = await getCreds();
        const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
        const upiId = node.upiId || '';
        const amount = node.amount || '';
        const payeeName = node.payeeName || 'Espon';
        const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiLink)}`;
        const msgText = `${node.text || 'Scan to pay via UPI'}\n\n🏦 UPI ID: *${upiId}*\n💰 Amount: ₹${amount}\n\nOr open GPay/PhonePe/Paytm and pay to:\n*${upiId}*`;

        if (acct) {
          const imgPayload = {
            messaging_product: 'whatsapp', to: `91${cleanPhone}`, type: 'image',
            image: { link: qrApiUrl, caption: msgText.slice(0, 1024) }
          };
          await fetch(`https://graph.facebook.com/v20.0/${acct.phoneId}/messages`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${acct.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(imgPayload)
          });
        }
      } catch (e: any) {
        console.error('[UPI_QR Error]:', e.message);
      }
    }

    // Pause at interactive nodes
    const isPause = ['CHOICE', 'INPUT_PHONE', 'INPUT_NAME', 'INPUT_EMAIL', 'INPUT_DATE'].includes(type);
    if (isPause) {
      return { status: 'paused', nodeId: node.id };
    }

    // Routing Logic for Next Node
    nextNodeId = node.outputPort || null; 
  }

  return { status: 'ended' };
}

/**
 * Main Flow Engine Entry Point
 */
export async function executeFlowEngine(senderPhone: string, userText: string, conversationId: string, wasClosed: boolean = false): Promise<boolean> {
  try {
    // 1. Check active flow triggers first to see if a flow matches the keyword!
    const activeFlows = await prisma.whatsAppChatbotFlow.findMany({
      where: { isActive: true }
    });

    let matchedFlow = null;
    let matchedTriggerNode = null;
    let matchedNextNodeId = null;

    for (const flowRecord of activeFlows) {
      if (!flowRecord.nodesJson) continue;

      let nodes: any[] = [];
      try { nodes = JSON.parse(flowRecord.nodesJson); } catch (_) { continue; }
      if (!Array.isArray(nodes)) continue;

      const triggerKeyword = flowRecord.triggerKeyword?.toLowerCase().trim();
      if (!triggerKeyword) continue;

      const keywords = triggerKeyword.split(',').map(k => k.trim());
      const isMatch = keywords.some(k => k && (userText.toLowerCase().trim() === k || userText.toLowerCase().includes(k)));

      if (isMatch) {
        const triggerNode = nodes.find((n: any) => (n.type || '').toUpperCase() === 'TRIGGER');
        if (triggerNode && triggerNode.outputPort) {
          matchedFlow = flowRecord;
          matchedTriggerNode = triggerNode;
          matchedNextNodeId = triggerNode.outputPort;
          break;
        }
      }
    }

    if (matchedFlow && matchedNextNodeId) {
      // Clear any existing/stuck flow states for this phone so it triggers fresh!
      await prisma.whatsAppFlowState.deleteMany({
        where: { phone: senderPhone }
      });

      // Insert new flow state
      await prisma.whatsAppFlowState.create({
        data: {
          phone: senderPhone,
          flowId: matchedFlow.id,
          currentNodeId: matchedNextNodeId,
          variables: '{}'
        }
      });

      const nodes = JSON.parse(matchedFlow.nodesJson);
      
      // Load customer profile variables for interpolation
      const cleanPhoneForVars = senderPhone.replace(/\D/g, '').slice(-10);
      const customerForVars = await prisma.customer.findFirst({
        where: { OR: [{ mobile: { contains: cleanPhoneForVars } }, { whatsappNumber: { contains: cleanPhoneForVars } }] }
      });
      const convForVars = customerForVars ? await prisma.whatsAppConversation.findFirst({
        where: { customerId: customerForVars.id }, orderBy: { updatedAt: 'desc' }
      }) : null;
      const profileVars: Record<string, string> = {
        name: customerForVars?.contactPerson || customerForVars?.businessName || '',
        businessName: customerForVars?.businessName || '',
        mobile: customerForVars?.mobile || senderPhone,
        email: (customerForVars as any)?.email || '',
        city: (customerForVars as any)?.city || '',
        state: (customerForVars as any)?.state || '',
        tags: customerForVars?.tags || '',
        leadStage: customerForVars?.leadStage || '',
        customerType: customerForVars?.customerType || '',
      };
      
      const result = await runNodes(nodes, matchedNextNodeId, profileVars, senderPhone, conversationId, wasClosed);

      if (result.status === 'ended') {
        await prisma.whatsAppFlowState.deleteMany({ where: { phone: senderPhone } });
      } else {
        await prisma.whatsAppFlowState.update({
          where: { phone: senderPhone },
          data: { currentNodeId: result.nodeId! }
        });
      }

      await prisma.whatsAppChatbotFlow.update({
        where: { id: matchedFlow.id },
        data: { executionCount: { increment: 1 } }
      });

      return true;
    }

    // 2. If it is NOT a trigger keyword, process existing flow state if present
    const userState = await prisma.whatsAppFlowState.findUnique({
      where: { phone: senderPhone }
    });

    if (userState) {
      const flowRecord = await prisma.whatsAppChatbotFlow.findUnique({
        where: { id: userState.flowId }
      });

      if (!flowRecord?.nodesJson) {
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
        return false;
      }

      let nodes: any[] = [];
      try { nodes = JSON.parse(flowRecord.nodesJson); } catch (_) { return false; }
      if (!Array.isArray(nodes)) return false;

      const vars: Record<string, string> = JSON.parse(userState.variables || '{}');
      const currentNode = nodes.find((n: any) => n.id === userState.currentNodeId);

      if (!currentNode) {
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
        return false;
      }

      const type = (currentNode.type || '').toUpperCase();

      // Save user input
      if (['INPUT_NAME', 'INPUT_EMAIL', 'INPUT_PHONE', 'INPUT_DATE'].includes(type)) {
        if (currentNode.variableName) {
          vars[currentNode.variableName] = userText;
        }
      }

      // Route based on interactive choice clicked
      let nextNodeId = null;
      if (type === 'CHOICE' || type === 'BUTTONS' || type === 'LIST_MENU') {
        const choices = currentNode.choices || [];
        const matchIndex = choices.findIndex((c: any) =>
          c.text &&
          (
            userText.toLowerCase().includes(String(c.text).toLowerCase()) ||
            String(c.text).toLowerCase().includes(userText.toLowerCase()) ||
            String(c.text).toLowerCase().slice(0, 20) === userText.toLowerCase()
          )
        );

        if (matchIndex !== -1) {
          nextNodeId = choices[matchIndex].targetNode;
        } else {
          // Unrecognized input on a CHOICE node — hand off to AI
          await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
          return false; // Let AI handle this
        }
      }

      // If no interactive match, follow default output port
      if (!nextNodeId) {
        nextNodeId = currentNode.outputPort || null;
      }

      if (!nextNodeId) {
        // Flow ended
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
        return true; 
      }

      const result = await runNodes(nodes, nextNodeId, vars, senderPhone, conversationId);

      if (result.status === 'ended') {
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
      } else {
        await prisma.whatsAppFlowState.update({
          where: { phone: senderPhone },
          data: { currentNodeId: result.nodeId!, variables: JSON.stringify(vars) }
        });
      }

      return true; 
    }

    return false;
  } catch (err: any) {
    console.error('[Flow Engine Error]:', err.message);
    return false;
  }
}
