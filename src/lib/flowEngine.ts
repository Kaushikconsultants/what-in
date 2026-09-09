import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Temporary axios replacement using fetch
async function fetchApi(url: string, options: any = {}) {
  const res = await fetch(url, options);
  const data = await res.text();
  try {
    return { data: JSON.parse(data), status: res.status };
  } catch (e) {
    return { data, status: res.status };
  }
}

export async function dispatchFlowMessage(toPhone: string, node: any, variables: any) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1189183190949431';
  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  
  let token = process.env.WHATSAPP_TOKEN || '';
  const settings = await prisma.whatsAppLegacySetting.findFirst();
  if (settings?.whatsapp_token) token = settings.whatsapp_token;

  if (!token) {
    console.log('[DRY RUN] Would send flow node:', node.type, 'to', toPhone);
    return;
  }

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone };

  const inter = (str: string) => {
    if (!str) return '';
    let s = str;
    for (const [k, v] of Object.entries(variables || {})) {
      s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), (v as string) || '');
    }
    return s;
  };

  try {
    if (node.type === 'text' || node.type === 'input_capture') {
      payload.type = 'text';
      payload.text = { body: inter(node.type === 'text' ? node.data?.text : node.data?.question) };
    } else if (node.type === 'image') {
      payload.type = 'image';
      payload.image = { link: inter(node.data?.url) };
      if (node.data?.caption) payload.image.caption = inter(node.data.caption);
    } else if (node.type === 'video') {
      payload.type = 'video';
      payload.video = { link: inter(node.data?.url) };
      if (node.data?.caption) payload.video.caption = inter(node.data.caption);
    } else if (node.type === 'document') {
      payload.type = 'document';
      payload.document = { link: inter(node.data?.url), filename: (node.data?.filename || 'Document') };
      if (node.data?.caption) payload.document.caption = inter(node.data.caption);
    } else if (node.type === 'quick_reply') {
      payload.type = 'interactive';
      const btns = [node.data?.button1, node.data?.button2, node.data?.button3].filter(Boolean).slice(0,3);
      payload.interactive = {
        type: 'button',
        body: { text: inter(node.data?.text || 'Please select:') },
        action: {
          buttons: btns.map((b, i) => ({ type: 'reply', reply: { id: `qr_${node.id}_${i}`, title: String(b).slice(0,20) } }))
        }
      };
    } else if (node.type === 'url_button' || node.type === 'call_button') {
       payload.type = 'interactive';
       payload.interactive = {
         type: 'cta_url',
         body: { text: inter(node.data?.text || 'Click below') },
         action: {
           name: 'cta_url',
           parameters: {
             display_text: String(node.data?.btnText || 'Click Here').slice(0,20),
             url: node.type === 'call_button' ? `tel:${node.data?.phone || ''}` : inter(node.data?.url || 'https://11fit.in')
           }
         }
       };
    } else if (node.type === 'list_message') {
      payload.type = 'interactive';
      const items = [node.data?.item1, node.data?.item2, node.data?.item3, node.data?.item4, node.data?.item5].filter(Boolean).slice(0,10);
      payload.interactive = {
        type: 'list',
        header: { type: 'text', text: String(node.data?.title || 'Options').slice(0,60) },
        body: { text: inter(node.data?.text || 'Please choose an option:') },
        action: {
          button: String(node.data?.btnText || 'Menu').slice(0,20),
          sections: [{ title: 'Options', rows: items.map((t, i) => ({ id: `list_${node.id}_${i}`, title: String(t).slice(0,24) })) }]
        }
      };
    } else if (node.type === 'delay') {
      const ms = (parseInt(node.data?.seconds) || 1) * 1000;
      await new Promise(r => setTimeout(r, Math.min(ms, 3000))); 
      return;
    } else {
      return; 
    }

    await fetchApi(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (e: any) {
    console.error(`Flow Engine Dispatch Error for node ${node.id}:`, e.message);
  }
}

export async function executeFlowEngine(senderPhone: string, userText: string): Promise<boolean> {
  try {
    const userState = await prisma.whatsAppLegacyFlowState.findUnique({
      where: { phone: senderPhone },
      include: { flow: true }
    });

    const runNodes = async (flow: any, startNodeId: string, variables: any) => {
      let nextNodeId = startNodeId;
      let ended = false;
      while (nextNodeId) {
        let node = flow.nodes.find((n: any) => n.id === nextNodeId);
        if (!node) { ended = true; break; }

        try {
          const inter = (str: string) => {
            if (!str) return ''; let s = str;
            for (const [k, v] of Object.entries(variables || {})) { s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), (v as string) || ''); }
            return s;
          };

          if (node.type === 'api_webhook') {
            const method = node.data.method || 'POST';
            const url = inter(node.data.url);
            let payload = {};
            try { payload = JSON.parse(inter(node.data.payload || '{}')); } catch(e) {}
            if (url) {
              const res = await fetchApi(url, { method, body: method === 'GET' ? undefined : JSON.stringify(payload) });
              if (node.data.outputVariable) variables[node.data.outputVariable] = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data || '');
            }
          } else if (node.type === 'delay') {
            const delayVal = parseInt(inter(node.data.amount)) || 1;
            const unit = node.data.unit || 'minutes';
            let ms = delayVal * 1000;
            if (unit === 'minutes') ms *= 60;
            if (unit === 'hours') ms *= 3600;
            if (unit === 'days') ms *= 86400;

            if (ms > 5000) {
               await prisma.whatsAppLegacyScheduledMessage.create({
                 data: {
                   phone: senderPhone,
                   flow_json: flow,
                   current_node_id: node.id,
                   variables,
                   send_after: new Date(Date.now() + ms)
                 }
               });
               return { status: 'paused', node };
            } else {
               await new Promise(r => setTimeout(r, ms));
            }
          }
        } catch (e) { console.error('Advanced Node Error:', e); }

        await dispatchFlowMessage(senderPhone, node, variables);

        if (node.type === 'quick_reply' || node.type === 'input_capture' || node.type === 'list_message') {
          await prisma.whatsAppLegacyFlowState.update({
            where: { phone: senderPhone },
            data: { current_node_id: node.id, variables, updatedAt: new Date() }
          });
          return { status: 'paused', node };
        }
        
        let nextE = flow.edges.find((e: any) => e.source === node.id);
        if (nextE) {
          nextNodeId = nextE.target;
        } else {
          ended = true;
          break;
        }
      }
      return { status: 'ended' };
    };

    if (userState) {
      const flow = userState.flow.flow_json as any;
      if (!flow) {
        await prisma.whatsAppLegacyFlowState.delete({ where: { phone: senderPhone } });
        return false;
      }

      let currentNode = flow.nodes.find((n: any) => n.id === userState.current_node_id);
      let variables = (userState.variables as any) || {};

      if (currentNode && currentNode.type === 'input_capture' && currentNode.data?.variable) {
        variables[currentNode.data.variable] = userText;
      }

      let nextEdge = null;
      if (currentNode && (currentNode.type === 'quick_reply' || currentNode.type === 'list_message')) {
        let items = [];
        if (currentNode.type === 'quick_reply') {
          items = [currentNode.data.button1, currentNode.data.button2, currentNode.data.button3];
        } else {
          items = [currentNode.data.item1, currentNode.data.item2, currentNode.data.item3, currentNode.data.item4, currentNode.data.item5];
        }
        
        const btnIndex = items.findIndex((b: string) => b && (userText.toLowerCase().includes(b.toLowerCase()) || userText === b));
        if (btnIndex !== -1) {
          nextEdge = flow.edges.find((e: any) => e.source === currentNode.id && e.sourceHandle === `btn-${btnIndex+1}`);
        }
      }
      
      if (!nextEdge) {
        nextEdge = flow.edges.find((e: any) => e.source === currentNode.id);
      }

      if (!nextEdge) {
        await prisma.whatsAppLegacyFlowState.delete({ where: { phone: senderPhone } });
        return true; 
      } else {
        const result = await runNodes(flow, nextEdge.target, variables);
        if (result.status === 'ended') {
          await prisma.whatsAppLegacyFlowState.delete({ where: { phone: senderPhone } });
        }
        return true; 
      }
    } else {
      const activeFlows = await prisma.whatsAppLegacyFlow.findMany({ where: { is_active: true } });

      for (const f of activeFlows) {
        const flow = f.flow_json as any;
        if (!flow || !flow.nodes) continue;
        
        const triggers = flow.nodes.filter((n: any) => n.type === 'trigger');
        for (const t of triggers) {
           if (t.data?.keyword && userText.toLowerCase().trim() === t.data.keyword.toLowerCase().trim()) {
             await prisma.whatsAppLegacyFlowState.create({
                data: {
                  phone: senderPhone,
                  flow_id: f.id,
                  current_node_id: t.id,
                  variables: {}
                }
             });

             let nextEdge = flow.edges.find((e: any) => e.source === t.id);
             if (nextEdge) {
                const result = await runNodes(flow, nextEdge.target, {});
                if (result.status === 'ended') {
                  await prisma.whatsAppLegacyFlowState.delete({ where: { phone: senderPhone } });
                }
             } else {
                await prisma.whatsAppLegacyFlowState.delete({ where: { phone: senderPhone } });
             }
             return true; 
           }
        }
      }
    }
  } catch (err) {
    console.error('Flow Engine Error:', err);
  }
  return false;
}
