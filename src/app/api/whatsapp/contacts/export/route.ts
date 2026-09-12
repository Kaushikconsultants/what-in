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
    const search = (searchParams.get("search") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();
    const temperature = (searchParams.get("temperature") || "").trim().toUpperCase();
    const leadStage = (searchParams.get("leadStage") || "").trim();
    const minOrderValue = parseFloat(searchParams.get("minOrderValue") || "0");
    const maxOrderValue = parseFloat(searchParams.get("maxOrderValue") || "0");
    const includeTranscript = searchParams.get("includeTranscript") === "true";
    const format = (searchParams.get("format") || "csv").toLowerCase();

    // Tenant scoping
    let effectiveClientId = authUser?.clientId;
    if (isOwner && searchParams.get("clientId")) {
      effectiveClientId = searchParams.get("clientId") || undefined;
    }

    // Build database where clause
    const where: any = {};
    if (effectiveClientId) {
      where.OR = [
        { clientId: effectiveClientId },
        { clientId: null }
      ];
    }

    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { contactPerson: { contains: search, mode: "insensitive" } },
          { businessName: { contains: search, mode: "insensitive" } },
          { mobile: { contains: search } },
          { whatsappNumber: { contains: search } }
        ]
      });
    }

    if (tag && tag !== "ALL") {
      where.tags = { contains: tag, mode: "insensitive" };
    }

    if (temperature && temperature !== "ALL") {
      where.temperature = temperature;
    }

    if (leadStage && leadStage !== "ALL") {
      where.leadStage = { contains: leadStage, mode: "insensitive" };
    }

    // Build dynamic include clause
    const includeClause: any = {
      assignedSalesperson: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      },
      orders: {
        select: {
          id: true,
          orderNumber: true,
          totalValue: true,
          orderDate: true
        }
      }
    };

    if (includeTranscript) {
      includeClause.conversations = {
        take: 1,
        orderBy: { lastMessageAt: "desc" },
        include: {
          messages: {
            take: 20,
            orderBy: { sentAt: "asc" },
            select: {
              senderType: true,
              senderName: true,
              content: true,
              sentAt: true,
              messageType: true
            }
          }
        }
      };
    }

    // Fetch matching customers with orders, conversations, and assigned agent
    const customers: any[] = await prisma.customer.findMany({
      where,
      include: includeClause,
      orderBy: { createdAt: "desc" },
      take: 5000
    });

    // Apply Order Value filter in memory
    const filteredCustomers = customers.filter((c: any) => {
      const totalSpend = (c.orders || []).reduce((sum: number, o: any) => sum + (o.totalValue || 0), 0);
      if (minOrderValue > 0 && totalSpend < minOrderValue) return false;
      if (maxOrderValue > 0 && totalSpend > maxOrderValue) return false;
      return true;
    });

    if (format === "json") {
      return NextResponse.json({
        success: true,
        count: filteredCustomers.length,
        contacts: filteredCustomers.map((c: any) => {
          const totalSpend = (c.orders || []).reduce((sum: number, o: any) => sum + (o.totalValue || 0), 0);
          return {
            id: c.id,
            name: c.contactPerson || c.businessName || "Unknown",
            businessName: c.businessName || "",
            mobile: c.mobile,
            whatsapp: c.whatsappNumber || c.mobile,
            leadStage: c.leadStage || "Contacted",
            temperature: c.temperature || "WARM",
            totalOrders: c.orders?.length || 0,
            totalSpend,
            tags: c.tags || "",
            assignedAgent: c.assignedSalesperson?.user?.name || "Unassigned",
            address: c.billingAddress || c.shippingAddress || "",
            createdAt: c.createdAt
          };
        })
      });
    }

    // Generate CSV (RFC4180 with UTF-8 BOM for Microsoft Excel compatibility)
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = [
      "Customer Name",
      "Phone Number",
      "WhatsApp Number",
      "Business / Store Name",
      "Lead Stage",
      "Temperature",
      "Total Orders",
      "Total Spend (INR)",
      "Tags",
      "Assigned Agent",
      "Billing Address / City",
      "Created Date",
      "Last Contact Date"
    ];

    if (includeTranscript) {
      headers.push("Latest Chat Transcript");
    }

    const rows = filteredCustomers.map((c: any) => {
      const totalSpend = (c.orders || []).reduce((sum: number, o: any) => sum + (o.totalValue || 0), 0);
      const row = [
        escapeCsv(c.contactPerson || c.businessName || "Customer"),
        escapeCsv(c.mobile || ""),
        escapeCsv(c.whatsappNumber || c.mobile || ""),
        escapeCsv(c.businessName || ""),
        escapeCsv(c.leadStage || "New Lead"),
        escapeCsv(c.temperature || "WARM"),
        escapeCsv(c.orders?.length || 0),
        escapeCsv(totalSpend ? `₹${totalSpend.toLocaleString('en-IN')}` : "₹0"),
        escapeCsv(c.tags || ""),
        escapeCsv(c.assignedSalesperson?.user?.name || "Unassigned"),
        escapeCsv(c.billingAddress || c.shippingAddress || ""),
        escapeCsv(c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : ""),
        escapeCsv(c.lastContactDate ? new Date(c.lastContactDate).toLocaleDateString("en-IN") : "")
      ];

      if (includeTranscript) {
        const latestConv = (c.conversations && c.conversations[0]) ? c.conversations[0] : null;
        if (latestConv && latestConv.messages && latestConv.messages.length > 0) {
          const transcriptLines = latestConv.messages.map((m: any) => {
            const time = new Date(m.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            const sender = m.senderType === "CUSTOMER" ? "Customer" : (m.senderName || m.senderType);
            return `[${time}] ${sender}: ${m.content.replace(/\n+/g, " ")}`;
          }).join(" | ");
          row.push(escapeCsv(transcriptLines));
        } else {
          row.push(escapeCsv("No messages recorded"));
        }
      }

      return row.join(",");
    });

    // UTF-8 Byte Order Mark (BOM) prevents corrupted characters in Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const dateStamp = new Date().toISOString().split("T")[0];
    const filename = `whatsapp_leads_export_${temperature ? temperature + '_' : ''}${dateStamp}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error("[Contacts Export API Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
