import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";

/**
 * GET /api/v1/contacts
 * Query CRM customer directory.
 * Required Scope: "contacts:read"
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const auth = await validateApiKey(req, "contacts:read");

  if (!auth.authenticated || !auth.client) {
    logApiRequest({
      endpoint: "/api/v1/contacts",
      httpMethod: "GET",
      statusCode: auth.statusCode || 401,
      responseTimeMs: Date.now() - startTime,
      errorMessage: auth.error,
    });
    return NextResponse.json(
      { success: false, error: auth.error || "Unauthorized." },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();
    const stage = (searchParams.get("stage") || "").trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 250);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { contactPerson: { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { whatsappNumber: { contains: search } },
        { billingAddress: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = { contains: tag, mode: "insensitive" };
    }

    if (stage) {
      where.leadStage = { equals: stage, mode: "insensitive" };
    }

    const [total, contacts] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          contactPerson: true,
          businessName: true,
          mobile: true,
          whatsappNumber: true,
          billingAddress: true,
          shippingAddress: true,
          leadStage: true,
          customerType: true,
          tags: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/contacts",
      httpMethod: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      contacts,
    });
  } catch (err: any) {
    console.error("[API v1 /contacts GET] Error:", err);
    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/contacts",
      httpMethod: "GET",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch contacts." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/contacts
 * Create or update a customer contact.
 * Required Scope: "contacts:write"
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await validateApiKey(req, "contacts:write");

  if (!auth.authenticated || !auth.client) {
    logApiRequest({
      endpoint: "/api/v1/contacts",
      httpMethod: "POST",
      statusCode: auth.statusCode || 401,
      responseTimeMs: Date.now() - startTime,
      errorMessage: auth.error,
    });
    return NextResponse.json(
      { success: false, error: auth.error || "Unauthorized." },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { name, phone, email, businessName, address, city, state, tags, leadStage = "Contacted", notes } = body;

    if (!phone || !phone.toString().trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'phone'." },
        { status: 400 }
      );
    }

    let cleanPhone = phone.toString().replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    // Upsert customer by phone match
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { whatsappNumber: cleanPhone },
          { mobile: cleanPhone },
          { mobile: cleanPhone.slice(-10) },
        ],
      },
    });

    const fullAddress = [address, city, state, email ? `Email: ${email}` : ""].filter(Boolean).join(", ");

    if (customer) {
      let combinedTags = customer.tags || "";
      if (tags) {
        const existingTags = combinedTags.split(",").map((t) => t.trim()).filter(Boolean);
        const newTags = (Array.isArray(tags) ? tags : tags.split(",")).map((t: string) => t.trim()).filter(Boolean);
        const merged = Array.from(new Set([...existingTags, ...newTags]));
        combinedTags = merged.join(", ");
      }

      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          contactPerson: name ? name.trim() : customer.contactPerson,
          businessName: businessName !== undefined ? businessName : customer.businessName,
          billingAddress: fullAddress || customer.billingAddress,
          leadStage: leadStage || customer.leadStage,
          tags: combinedTags || customer.tags,
          notes: notes !== undefined ? notes : customer.notes,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          businessName: businessName || name || `Contact ${cleanPhone}`,
          contactPerson: name ? name.trim() : `Contact +${cleanPhone.slice(-4)}`,
          mobile: cleanPhone,
          whatsappNumber: cleanPhone,
          billingAddress: fullAddress || null,
          customerType: "Wholesale",
          leadStage: leadStage || "Contacted",
          tags: Array.isArray(tags) ? tags.join(", ") : tags || null,
          notes: notes || null,
        },
      });
    }

    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/contacts",
      httpMethod: "POST",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Upserted contact ${customer.contactPerson} (${cleanPhone})`,
    });

    return NextResponse.json({
      success: true,
      message: "Contact saved successfully.",
      contact: customer,
    });
  } catch (err: any) {
    console.error("[API v1 /contacts POST] Error:", err);
    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/contacts",
      httpMethod: "POST",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save contact." },
      { status: 500 }
    );
  }
}
