import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to resolve current tenant session from cookie or agent user
async function resolveInboxSession() {
  const cookieStore = require("next/headers").cookies;
  const wmUser = (await cookieStore()).get("wm_user")?.value;
  let userRole = "SALES";
  let userEmail = "";
  let userName = "Agent";
  let clientId: string | null = null;

  if (wmUser) {
    try {
      const parsed = JSON.parse(decodeURIComponent(wmUser));
      userRole = parsed.role || "SALES";
      userEmail = parsed.email || "";
      userName = parsed.name || "Agent";
      if (parsed.clientId) {
        clientId = parsed.clientId;
      }
    } catch (e) {}
  }

  if (!clientId && userEmail) {
    const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: userEmail } }).catch(() => null);
    if (agent?.clientId) {
      clientId = agent.clientId;
      if (agent.name) userName = agent.name;
    } else {
      const client = await prisma.whatsAppClient.findFirst({
        where: { OR: [{ contactEmail: userEmail }, { adminEmail: userEmail }] }
      }).catch(() => null);
      if (client) {
        clientId = client.id;
        userName = client.businessName + " Admin";
      }
    }
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';
  return { userRole, userEmail, userName, clientId, isAdmin };
}

// Helper to get Meta credentials prioritizing tenant's own API tokens
async function getAccountCredentials(clientId?: string | null) {
  if (clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } }).catch(() => null);
    if (client?.metaAccessToken && client?.phoneId) {
      return {
        token: client.metaAccessToken,
        phoneId: client.phoneId,
        businessName: client.businessName
      };
    }
  }
  const account = await prisma.whatsAppAccount.findFirst({ orderBy: { createdAt: "desc" } }).catch(() => null);
  return {
    token: account?.accessToken || process.env.META_WHATSAPP_TOKEN || "",
    phoneId: account?.phoneId || process.env.META_PHONE_NUMBER_ID || "",
    businessName: account?.name || "What-In"
  };
}

// --- GET --------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "chats";
  const session = await resolveInboxSession();

  // -- 1. GET ALL CHATS (CLIENT SCOPED) -------------------------------------
  if (action === "chats") {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      prisma.whatsAppMessage.updateMany({
        where: {
          sentAt: { lt: thirtyDaysAgo },
          mediaUrl: { not: null }
        },
        data: {
          mediaUrl: null
        }
      }).catch(err => console.error("[Auto-Delete Media Old 30 Days Error]:", err));

      const where: any = {};

      if (session.clientId) {
        where.clientId = session.clientId;
      }

      if (!session.isAdmin) {
        if (session.userEmail) {
          const emp = await prisma.employee.findFirst({ where: { user: { email: session.userEmail } } });
          if (emp) {
            where.assignedEmployeeId = emp.id;
          } else {
            where.assignedEmployeeId = "00000000-0000-0000-0000-000000000000";
          }
        } else {
          where.assignedEmployeeId = "00000000-0000-0000-0000-000000000000";
        }
      }

      const search = searchParams.get("search");
      if (search) {
        where.customer = {
          OR: [
            { whatsappNumber: { contains: search } },
            { mobile: { contains: search } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { businessName: { contains: search, mode: 'insensitive' } }
          ]
        };
      }

      const conversations = await prisma.whatsAppConversation.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              contactPerson: true,
              businessName: true,
              mobile: true,
              whatsappNumber: true,
              tags: true,
              leadStage: true,
              temperature: true,
              totalOrders: true,
            },
          },
          messages: {
            orderBy: { sentAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              senderType: true,
              sentAt: true,
              messageType: true,
            },
          },
          assignedEmployee: {
            select: {
              id: true,
              user: { select: { name: true, email: true } }
            }
          }
        },
        orderBy: { lastMessageAt: "desc" },
        take: 100,
      });

      const chats = conversations.map((conv) => {
        const lastMsg = conv.messages[0];
        const rawPhone = conv.customer?.whatsappNumber || conv.customer?.mobile || "";
        const cleanDigits = rawPhone.replace(/\D/g, "");
        const resolvedPhone = (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits))
          ? `91${cleanDigits}`
          : cleanDigits;
        const hoursElapsed = conv.lastMessageAt
          ? (Date.now() - new Date(conv.lastMessageAt).getTime()) / (1000 * 3600)
          : 999;

        return {
          id: conv.id,
          phone: resolvedPhone,
          customer_name: conv.customer?.contactPerson || conv.customer?.businessName || resolvedPhone,
          last_message: lastMsg?.content || "",
          last_role: lastMsg?.senderType === "CUSTOMER" ? "user" : "assistant",
          created_at: conv.lastMessageAt?.toISOString() || new Date().toISOString(),
          is_within_24h: hoursElapsed <= 24,
          hours_elapsed: Math.round(hoursElapsed * 10) / 10,
          ai_paused: !conv.aiHandled,
          tags: Array.from(new Set([
            ...(conv.tags || '').split(','),
            ...(conv.customer?.tags || '').split(',')
          ])).map((t: string) => t.trim()).filter(Boolean).filter(t => {
            const l = t.toLowerCase().trim();
            return l !== 'whatsapp lead' && l !== 'auto created';
          }),
          order_count: conv.customer?.totalOrders || 0,
          order_status: "unknown",
          message_count: conv.unreadCount || 0,
          unreadCount: conv.unreadCount,
          chat_status: (conv.status || 'OPEN').toLowerCase(),
          customerId: conv.customerId,
          assignedEmployeeId: conv.assignedEmployeeId,
          assignedEmployee: conv.assignedEmployee,
        };
      });

      return NextResponse.json({ success: true, chats });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // -- 2. GET MESSAGES FOR A CONVERSATION (CLIENT SCOPED) ---------------------
  if (action === "messages") {
    const phone = searchParams.get("phone");
    const convId = searchParams.get("convId");
    if (!phone && !convId)
      return NextResponse.json({ error: "phone or convId required" }, { status: 400 });

    try {
      let conversation: any = null;

      if (convId) {
        conversation = await prisma.whatsAppConversation.findFirst({
          where: {
            id: convId,
            ...(session.clientId ? { clientId: session.clientId } : {})
          }
        });
      } else {
        const rawDigits = String(phone).replace(/\D/g, "");
        const last10 = rawDigits.slice(-10);
        const customer = await prisma.customer.findFirst({
          where: {
            ...(session.clientId ? { clientId: session.clientId } : {}),
            OR: [
              { mobile: rawDigits },
              { whatsappNumber: rawDigits },
              { mobile: { contains: last10 } },
              { whatsappNumber: { contains: last10 } },
            ],
          },
        });
        if (customer) {
          conversation = await prisma.whatsAppConversation.findFirst({
            where: {
              customerId: customer.id,
              ...(session.clientId ? { clientId: session.clientId } : {})
            },
          });
        }
      }

      if (!conversation) {
        return NextResponse.json({ success: true, messages: [] });
      }

      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      });

      const rawMessages = await prisma.whatsAppMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { sentAt: "asc" },
      });

      const messages = rawMessages.map((m) => ({
        id: m.id,
        phone: phone || "",
        role: m.senderType === "CUSTOMER" ? "user" : m.senderType === "AGENT" ? "assistant" : m.senderType === "AI" ? "assistant" : "internal_note",
        content: m.content || "",
        created_at: m.sentAt?.toISOString() || new Date().toISOString(),
        message_type: m.messageType,
        media_url: m.mediaUrl || null,
        media_type: m.mediaType || null,
        status: m.status,
        meta_message_id: m.metaMessageId,
        sender_name: m.senderName,
        conversationId: conversation.id,
      }));

      return NextResponse.json({ success: true, messages });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // -- 4. GET CONVERSATION DETAIL BY ID (CLIENT SCOPED) ---------------------
  if (action === "detail") {
    const convId = searchParams.get("convId");
    if (!convId) return NextResponse.json({ error: "convId required" }, { status: 400 });
    
    try {
      const conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          id: convId,
          ...(session.clientId ? { clientId: session.clientId } : {})
        },
        include: {
          account: true,
          customer: {
            include: {
              orders: { orderBy: { createdAt: 'desc' }, take: 5 },
              quotations: { orderBy: { createdAt: 'desc' }, take: 5 },
              invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
              tasks: { orderBy: { createdAt: 'desc' }, take: 5 },
              followUps: { orderBy: { createdAt: 'desc' }, take: 5 }
            }
          },
          assignedEmployee: { include: { user: true } },
          messages: { orderBy: { sentAt: 'asc' } },
          paymentLinks: { orderBy: { createdAt: 'desc' }, take: 3 }
        }
      });
      
      if (!conversation) {
        return NextResponse.json({ success: false, error: "Conversation not found or unauthorized" }, { status: 404 });
      }

      if (conversation.unreadCount > 0) {
        await prisma.whatsAppConversation.update({
          where: { id: convId },
          data: { unreadCount: 0 }
        });
      }

      const mergedTagsList = Array.from(new Set([
        ...(conversation.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        ...(conversation.customer?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
      ])).filter(t => t.toLowerCase() !== 'whatsapp lead' && t.toLowerCase() !== 'auto created');
      const mergedTagsStr = mergedTagsList.join(', ');

      const formatted = {
        ...conversation,
        tags: mergedTagsStr,
        slaStatus: conversation.slaStatus || 'GREEN'
      };

      return NextResponse.json({ success: true, conversation: formatted });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // -- 3. GET AI EXECUTION LOGS (CLIENT SCOPED) -----------------------------
  if (action === "executions") {
    try {
      const executions = await prisma.whatsAppAILog.findMany({
        where: session.clientId ? { clientId: session.clientId } : {},
        orderBy: { createdAt: "desc" },
        take: 150,
      });

      const total_count = executions.length;
      const success_count = executions.filter((e) => e.status === "SUCCESS").length;
      const error_count = executions.filter((e) => e.status === "FAILED").length;
      const ignored_count = executions.filter((e) => e.status === "IGNORED").length;
      const validDurations = executions.filter((e) => (e.durationMs || 0) > 0).map((e) => e.durationMs || 0);
      const avg_duration = validDurations.length
        ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
        : 0;

      return NextResponse.json({
        success: true,
        executions: executions.map((e) => ({
          id: e.id,
          phone: e.phone,
          status: e.status,
          user_message: e.userMessage,
          ai_reply: e.aiReply,
          tools_called: e.toolsCalled,
          error_message: e.errorMessage,
          duration_ms: e.durationMs,
          created_at: e.createdAt?.toISOString(),
        })),
        stats: { total_count, success_count, error_count, ignored_count, avg_duration },
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// --- POST --------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await resolveInboxSession();
    const body = await req.json();
    const { action: postAction, phone, ai_paused, text, media_url, template_name, template_params, type, chat_status, convId } = body;

    if (!phone && !convId) {
      return NextResponse.json({ error: "phone or convId required" }, { status: 400 });
    }

    const rawDigits = String(phone || "").replace(/\D/g, "");
    const last10 = rawDigits.slice(-10);
    const phoneFilter = [
      { mobile: rawDigits },
      { whatsappNumber: rawDigits },
      { mobile: { contains: last10 } },
      { whatsappNumber: { contains: last10 } }
    ];

    // -- A. Toggle AI ---------------------------------------------------------
    if (postAction === "toggle_ai") {
      let conversation: any = null;
      if (convId) {
        conversation = await prisma.whatsAppConversation.findFirst({
          where: { id: convId, ...(session.clientId ? { clientId: session.clientId } : {}) }
        });
      } else {
        const customer = await prisma.customer.findFirst({
          where: { ...(session.clientId ? { clientId: session.clientId } : {}), OR: phoneFilter },
        });
        if (customer) {
          conversation = await prisma.whatsAppConversation.findFirst({
            where: { customerId: customer.id, ...(session.clientId ? { clientId: session.clientId } : {}) }
          });
        }
      }
      if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { aiHandled: !ai_paused },
      });
      return NextResponse.json({ success: true, phone, ai_paused: !!ai_paused });
    }

    // -- B. Set Chat Status ---------------------------------------------------
    if (postAction === "set_status") {
      let conversation: any = null;
      if (convId) {
        conversation = await prisma.whatsAppConversation.findFirst({
          where: { id: convId, ...(session.clientId ? { clientId: session.clientId } : {}) }
        });
      } else {
        const customer = await prisma.customer.findFirst({
          where: { ...(session.clientId ? { clientId: session.clientId } : {}), OR: phoneFilter },
        });
        if (customer) {
          conversation = await prisma.whatsAppConversation.findFirst({
            where: { customerId: customer.id, ...(session.clientId ? { clientId: session.clientId } : {}) }
          });
        }
      }
      if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { status: chat_status === "closed" ? "CLOSED" : "OPEN" },
      });
      return NextResponse.json({ success: true, phone, chat_status });
    }

    // -- C. Send Message / Template -------------------------------------------
    if (postAction === "send_message" || postAction === "send_template") {
      let customer = await prisma.customer.findFirst({
        where: { ...(session.clientId ? { clientId: session.clientId } : {}), OR: phoneFilter },
      });

      let conversation: any = null;
      if (customer) {
        conversation = await prisma.whatsAppConversation.findFirst({
          where: { customerId: customer.id, ...(session.clientId ? { clientId: session.clientId } : {}) }
        });
      }

      const creds = await getAccountCredentials(session.clientId || conversation?.clientId);
      const token = creds.token;
      const phoneId = creds.phoneId;

      if (!token || !phoneId) {
        return NextResponse.json({ error: "WhatsApp API credentials not configured for this organization." }, { status: 500 });
      }

      // Handle internal note
      if (type === "internal_note") {
        if (conversation) {
          await prisma.whatsAppMessage.create({
            data: {
              conversationId: conversation.id,
              senderType: "AGENT",
              senderName: session.userName,
              messageType: "TEXT",
              content: text || "",
              status: "DELIVERED",
              sentAt: new Date(),
            },
          });
        }
        return NextResponse.json({ success: true, message_id: "internal", content: text });
      }

      const toPhone = String(phone).replace(/\D/g, "");
      const metaUrl = `https://graph.facebook.com/v20.0/${phoneId}/messages`;

      let payload: any = { messaging_product: "whatsapp", to: toPhone };

      if (type === "image" && media_url) {
        payload.type = "image";
        payload.image = { link: media_url, caption: text || "" };
      } else if (type === "audio" && media_url) {
        payload.type = "audio";
        payload.audio = { link: media_url };
      } else if ((type === "template" || postAction === "send_template") && template_name) {
        payload.type = "template";
        const components: any[] = [];
        if (Array.isArray(template_params) && template_params.length > 0) {
          components.push({
            type: "body",
            parameters: template_params.map((p: any) => ({ type: "text", text: String(p || "") })),
          });
        }
        payload.template = {
          name: template_name,
          language: { code: "en_US" },
          ...(components.length > 0 && { components }),
        };
      } else {
        payload.type = "text";
        payload.text = { body: text || "" };
      }

      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        const errMsg = metaData?.error?.message || "Meta API Error";
        return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
      }

      const displayContent =
        type === "template" || postAction === "send_template"
          ? `[TEMPLATE SENT: ${template_name}]`
          : type === "image"
          ? `[IMAGE] ${text || media_url}`
          : type === "audio"
          ? `[AUDIO] ${media_url}`
          : text || "";

      if (conversation) {
        await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            senderType: "AGENT",
            senderName: session.userName,
            messageType: type?.toUpperCase() || "TEXT",
            content: displayContent,
            mediaUrl: media_url || null,
            status: "SENT",
            metaMessageId: metaData?.messages?.[0]?.id || null,
            sentAt: new Date(),
          },
        });
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { lastMessageText: displayContent, lastMessageAt: new Date(), status: "OPEN" },
        });
      }

      return NextResponse.json({
        success: true,
        message_id: metaData?.messages?.[0]?.id || "sent",
        content: displayContent,
      });
    }

    return NextResponse.json({ error: "Unknown postAction" }, { status: 400 });
  } catch (err: any) {
    console.error("[inbox POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// --- DELETE CONVERSATION (CLIENT SCOPED) ------------------------------------
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const convId = searchParams.get("convId");
  if (!convId) return NextResponse.json({ error: "convId required" }, { status: 400 });
  
  try {
    const session = await resolveInboxSession();
    await prisma.whatsAppConversation.deleteMany({
      where: {
        id: convId,
        ...(session.clientId ? { clientId: session.clientId } : {})
      }
    });
    return NextResponse.json({ success: true, message: "Conversation deleted successfully" });
  } catch (err: any) {
    console.error("[inbox DELETE] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
