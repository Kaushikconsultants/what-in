import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

// Helper to get the WhatsApp account and its token from DB
async function getAccount() {
  return prisma.whatsAppAccount.findFirst({ orderBy: { createdAt: "desc" } });
}

// --- GET --------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "chats";

  // -- 1. GET ALL CHATS -----------------------------------------------------
  if (action === "chats") {
    try {
      // Auto-delete media older than 30 days by clearing database mediaUrl field
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

      const authUser = await getAuthenticatedUser(req);
      const isOwner = isOwnerAuthenticated(req);
      const userRole = authUser?.role || "SALES";
      const userEmail = authUser?.email || "";
      const isAdmin = isOwner || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';
      const where: any = {};

      if (!isAdmin) {
        if (userEmail) {
          const emp = await prisma.employee.findFirst({ where: { user: { email: userEmail } } });
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

  // -- 2. GET MESSAGES FOR A PHONE -----------------------------------------
  if (action === "messages") {
    const phone = searchParams.get("phone");
    const convId = searchParams.get("convId");
    if (!phone && !convId)
      return NextResponse.json({ error: "phone or convId required" }, { status: 400 });

    try {
      let conversation: any = null;

      if (convId) {
        conversation = await prisma.whatsAppConversation.findUnique({ where: { id: convId } });
      } else {
        const rawDigits = String(phone).replace(/\D/g, "");
        const last10 = rawDigits.slice(-10);
        const customer = await prisma.customer.findFirst({
          where: {
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
            where: { customerId: customer.id },
          });
        }
      }

      if (!conversation) {
        return NextResponse.json({ success: true, messages: [] });
      }

      // Reset unread count
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

    // -- 4. GET CONVERSATION DETAIL BY ID --------------------------------------
  if (action === "detail") {
    const convId = searchParams.get("convId");
    if (!convId) return NextResponse.json({ error: "convId required" }, { status: 400 });
    
    try {
      const conversation = await prisma.whatsAppConversation.findUnique({
        where: { id: convId },
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
        return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
      }

      // Auto-heal customer phone numbers using verified Meta incoming message ID (wamid) or standard E.164
      if (conversation.customerId && conversation.customer) {
        let realPhone: string | null = null;

        // 1. Try to extract verified E.164 phone directly from incoming customer message metaMessageId (wamid)
        const incomingWithWamid = conversation.messages?.find(
          (m: any) => m.senderType === 'CUSTOMER' && m.metaMessageId && m.metaMessageId.startsWith('wamid.HBg')
        );
        if (incomingWithWamid?.metaMessageId) {
          const match = incomingWithWamid.metaMessageId.match(/^wamid\.HBg[A-Za-z]([A-Za-z0-9+/=]{8,30})/);
          if (match) {
            try {
              const buf = Buffer.from(match[1], 'base64');
              const str = buf.toString('latin1');
              const digitsMatch = str.match(/\d{10,15}/);
              if (digitsMatch) realPhone = digitsMatch[0];
            } catch {}
          }
        }

        const rawPhone = (conversation.customer.whatsappNumber || conversation.customer.mobile || '').replace(/\D/g, '');

        if (realPhone && realPhone !== rawPhone) {
          console.log(`[Auto-Heal Phone] Updating customer ${conversation.customerId} from ${rawPhone} to verified Meta phone ${realPhone}`);
          await prisma.customer.update({
            where: { id: conversation.customerId },
            data: {
              whatsappNumber: realPhone,
              mobile: realPhone
            }
          }).catch(() => {});
          conversation.customer.whatsappNumber = realPhone;
          conversation.customer.mobile = realPhone;
        } else if (rawPhone.length === 10 && /^[6-9]/.test(rawPhone)) {
          const fullIndianPhone = `91${rawPhone}`;
          await prisma.customer.update({
            where: { id: conversation.customerId },
            data: {
              whatsappNumber: fullIndianPhone,
              mobile: fullIndianPhone
            }
          }).catch(() => {});
          conversation.customer.whatsappNumber = fullIndianPhone;
          conversation.customer.mobile = fullIndianPhone;
        }
      }

      // Reset unread count when viewed
      if (conversation.unreadCount > 0) {
        await prisma.whatsAppConversation.update({
          where: { id: convId },
          data: { unreadCount: 0 }
        });
      }

      // Mark the last incoming customer message as SEEN/READ in Meta WhatsApp API
      const lastIncoming = conversation.messages
        .slice()
        .reverse()
        .find((m) => m.senderType === "CUSTOMER" && m.metaMessageId);

      if (lastIncoming && conversation.account?.accessToken && conversation.account?.phoneId) {
        const token = conversation.account.accessToken;
        const phoneId = conversation.account.phoneId;
        try {
          const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
          await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              status: "read",
              message_id: lastIncoming.metaMessageId
            })
          });
          console.log(`[Mark Read] Marked message ${lastIncoming.metaMessageId} as read`);
        } catch (e) {
          console.error("[Mark Read Error] Failed to mark read in Meta:", e);
        }
      }

      // Consolidate and sync tags between conversation and customer (filtering legacy auto-tags)
      const isAutoTag = (t: string) => {
        const l = t.toLowerCase().trim();
        return l === 'whatsapp lead' || l === 'auto created';
      };

      const mergedTagsList = Array.from(new Set([
        ...(conversation.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        ...(conversation.customer?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
      ])).filter(t => !isAutoTag(t));
      const mergedTagsStr = mergedTagsList.join(', ');

      // Clean up legacy auto-tags from database
      if (conversation.tags !== mergedTagsStr) {
        await prisma.whatsAppConversation.update({
          where: { id: convId },
          data: { tags: mergedTagsStr }
        }).catch(() => {});
      }

      if (conversation.customerId && conversation.customer?.tags !== mergedTagsStr) {
        await prisma.customer.update({
          where: { id: conversation.customerId },
          data: { tags: mergedTagsStr }
        }).catch(() => {});
      }

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


  // -- 3. GET AI EXECUTION LOGS ---------------------------------------------
  if (action === "executions") {
    try {
      const executions = await prisma.whatsAppAILog.findMany({
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
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!authUser && !isOwner) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    const userName = authUser?.name || (isOwner ? "Owner" : "Agent");

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
        conversation = await prisma.whatsAppConversation.findUnique({ where: { id: convId } });
      } else {
        const customer = await prisma.customer.findFirst({
          where: { OR: phoneFilter },
        });
        if (customer) {
          conversation = await prisma.whatsAppConversation.findFirst({ where: { customerId: customer.id } });
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
        conversation = await prisma.whatsAppConversation.findUnique({ where: { id: convId } });
      } else {
        const customer = await prisma.customer.findFirst({
          where: { OR: phoneFilter },
        });
        if (customer) {
          conversation = await prisma.whatsAppConversation.findFirst({ where: { customerId: customer.id } });
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
      // Find or create conversation
      const customer = await prisma.customer.findFirst({
        where: { OR: phoneFilter },
      });

      let conversation: any = null;
      if (customer) {
        conversation = await prisma.whatsAppConversation.findFirst({ where: { customerId: customer.id } });
      }

      // Get WhatsApp account for token
      const account = await getAccount();
      const token = account?.accessToken || process.env.META_WHATSAPP_TOKEN;
      const phoneId = account?.phoneId || process.env.META_PHONE_NUMBER_ID;

      if (!token || !phoneId) {
        return NextResponse.json({ error: "WhatsApp API Token not configured. Please set in Settings." }, { status: 500 });
      }

      // Handle internal note (no Meta API call)
      if (type === "internal_note") {
        if (conversation) {
          await prisma.whatsAppMessage.create({
            data: {
              conversationId: conversation.id,
              senderType: "AGENT",
              senderName: userName,
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

      // Save message to DB
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
            senderName: userName,
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

// --- DELETE CONVERSATION ----------------------------------------------------
export async function DELETE(req: NextRequest) {
  const isOwner = isOwnerAuthenticated(req);
  const authUser = await getAuthenticatedUser(req);
  const isAdmin = isOwner || (authUser && (authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN" || authUser.role === "MANAGER"));
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized access: Only administrators can delete conversations" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const convId = searchParams.get("convId");
  if (!convId) return NextResponse.json({ error: "convId required" }, { status: 400 });
  
  try {
    await prisma.whatsAppConversation.delete({
      where: { id: convId }
    });
    return NextResponse.json({ success: true, message: "Conversation deleted successfully" });
  } catch (err: any) {
    console.error("[inbox DELETE] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
