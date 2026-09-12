import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);

    if (!authUser && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const format = (searchParams.get("format") || "csv").toLowerCase();

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "Missing conversationId parameter" }, { status: 400 });
    }

    const conv = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        assignedEmployee: {
          include: { user: true }
        },
        messages: {
          orderBy: { sentAt: "asc" }
        }
      }
    });

    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
    }

    // Scoping check: Ensure user has access to this conversation's client
    if (authUser && authUser.clientId && conv.clientId && authUser.clientId !== conv.clientId && !isOwner) {
      return NextResponse.json({ success: false, error: "Forbidden: Cross-tenant access denied" }, { status: 403 });
    }

    const customerName = conv.customer?.contactPerson || conv.customer?.businessName || conv.customer?.mobile || "Customer";
    const phone = conv.customer?.whatsappNumber || conv.customer?.mobile || "";
    const cleanCustomerName = customerName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();

    if (format === "txt") {
      let transcriptText = `=======================================================\n`;
      transcriptText += `WHATSAPP BUSINESS CHAT TRANSCRIPT\n`;
      transcriptText += `=======================================================\n`;
      transcriptText += `Customer: ${customerName} (${phone})\n`;
      transcriptText += `Assigned Agent: ${conv.assignedEmployee?.user?.name || "Unassigned"}\n`;
      transcriptText += `Lead Status: ${conv.leadStatus} | Temperature: ${conv.customer?.temperature || "WARM"}\n`;
      transcriptText += `Export Date: ${new Date().toLocaleString("en-IN")}\n`;
      transcriptText += `Total Messages: ${conv.messages.length}\n`;
      transcriptText += `=======================================================\n\n`;

      conv.messages.forEach((m, idx) => {
        const time = new Date(m.sentAt).toLocaleString("en-IN");
        const sender = m.senderType === "CUSTOMER" 
          ? `[CUSTOMER: ${customerName}]` 
          : m.senderType === "AGENT" 
            ? `[AGENT: ${m.senderName || "Support"}]` 
            : `[${m.senderType}]`;
        
        transcriptText += `(${idx + 1}) ${time} - ${sender}\n`;
        transcriptText += `Status: ${m.status} | Type: ${m.messageType}\n`;
        transcriptText += `Message:\n${m.content}\n`;
        if (m.mediaUrl) {
          transcriptText += `Media Attachment: ${m.mediaUrl}\n`;
        }
        transcriptText += `-------------------------------------------------------\n`;
      });

      return new Response(transcriptText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="chat_transcript_${cleanCustomerName}_${phone}.txt"`
        }
      });
    }

    // Default: CSV format
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = [
      "Message Index",
      "Timestamp (IST)",
      "Sender Type",
      "Sender Name",
      "Message Type",
      "Message Content",
      "Status",
      "Media Attachment URL"
    ];

    const rows = conv.messages.map((m, idx) => [
      idx + 1,
      escapeCsv(new Date(m.sentAt).toLocaleString("en-IN")),
      escapeCsv(m.senderType),
      escapeCsv(m.senderType === "CUSTOMER" ? customerName : (m.senderName || "Agent")),
      escapeCsv(m.messageType),
      escapeCsv(m.content),
      escapeCsv(m.status),
      escapeCsv(m.mediaUrl || "")
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="chat_transcript_${cleanCustomerName}_${phone}.csv"`
      }
    });

  } catch (error: any) {
    console.error("[Chat Transcript Export API Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
