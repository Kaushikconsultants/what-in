import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";
import { generateApiKeyPair, validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";

async function resolveTenantClient(req: NextRequest) {
  // First check if user is logged into the dashboard via session cookie
  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return { client, user };
  } else if (user?.email) {
    const client = await prisma.whatsAppClient.findFirst({
      where: {
        OR: [{ contactEmail: user.email }, { adminEmail: user.email }],
      },
    });
    if (client) return { client, user };
  }

  // Fallback: Check if request has an existing API key
  const authRes = await validateApiKey(req);
  if (authRes.authenticated && authRes.client) {
    return { client: authRes.client, user: null, apiKey: authRes.apiKey };
  }

  // Last resort fallback for single-tenant / primary setup
  const primaryClient = await prisma.whatsAppClient.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (primaryClient) {
    return { client: primaryClient, user };
  }

  return { client: null, user: null };
}

/**
 * GET /api/v1/keys
 * List all API keys for the client (secrets are securely masked)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { client } = await resolveTenantClient(req);
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in or provide valid credentials." },
        { status: 401 }
      );
    }

    const keys = await prisma.whatsAppApiKey.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        status: true,
        expiresAt: true,
        gracePeriodEndsAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdByEmail: true,
        ipWhitelist: true,
        createdAt: true,
      },
    });

    const parsedKeys = keys.map((k) => {
      let scopesList: string[] = [];
      try {
        scopesList = JSON.parse(k.scopes);
      } catch {
        scopesList = [k.scopes];
      }
      return {
        ...k,
        scopes: scopesList,
      };
    });

    logApiRequest({
      clientId: client.id,
      endpoint: "/api/v1/keys",
      httpMethod: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, keys: parsedKeys });
  } catch (err: any) {
    console.error("[API v1 /keys GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch API keys." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/keys
 * Generate a new API key. Raw key is returned ONLY in this response.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { client, user } = await resolveTenantClient(req);
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in or provide valid credentials." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name || "Default API Key").trim();
    const scopes = Array.isArray(body.scopes) && body.scopes.length > 0
      ? body.scopes
      : ["messages:send", "leads:write", "contacts:read"];
    const expiresDays = typeof body.expiresDays === "number" && body.expiresDays > 0 ? body.expiresDays : null;
    const ipWhitelist = typeof body.ipWhitelist === "string" ? body.ipWhitelist.trim() : null;

    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86400000) : null;

    const { rawKey, keyPrefix, keyHash } = generateApiKeyPair();

    const createdKey = await prisma.whatsAppApiKey.create({
      data: {
        clientId: client.id,
        name,
        keyPrefix,
        keyHash,
        scopes: JSON.stringify(scopes),
        status: "ACTIVE",
        expiresAt,
        createdByEmail: user?.email || "System Admin",
        ipWhitelist: ipWhitelist || null,
      },
    });

    logApiRequest({
      clientId: client.id,
      apiKeyId: createdKey.id,
      endpoint: "/api/v1/keys",
      httpMethod: "POST",
      statusCode: 201,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Created API key "${name}" with scopes: ${scopes.join(", ")}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "API key created successfully. Store this secret key now as you will not be able to view it again.",
        key: {
          id: createdKey.id,
          name: createdKey.name,
          keyPrefix: createdKey.keyPrefix,
          rawKey, // Revealed ONLY once!
          scopes,
          status: createdKey.status,
          expiresAt: createdKey.expiresAt,
          createdAt: createdKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[API v1 /keys POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create API key." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/keys
 * Rotate an existing API key. Generates a replacement key with the same settings
 * and places the old key into a 24-hour grace period for zero-downtime transition.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { client, user } = await resolveTenantClient(req);
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const keyId = body.keyId;
    const graceHours = typeof body.graceHours === "number" ? body.graceHours : 24;

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: keyId" },
        { status: 400 }
      );
    }

    const existingKey = await prisma.whatsAppApiKey.findFirst({
      where: { id: keyId, clientId: client.id },
    });

    if (!existingKey) {
      return NextResponse.json(
        { success: false, error: "API key not found." },
        { status: 404 }
      );
    }

    // 1. Generate new replacement key
    const { rawKey, keyPrefix, keyHash } = generateApiKeyPair();
    const gracePeriodEndsAt = new Date(Date.now() + graceHours * 3600000);

    const [newKey, updatedOldKey] = await prisma.$transaction([
      prisma.whatsAppApiKey.create({
        data: {
          clientId: client.id,
          name: `${existingKey.name} (Rotated)`,
          keyPrefix,
          keyHash,
          scopes: existingKey.scopes,
          status: "ACTIVE",
          expiresAt: existingKey.expiresAt,
          createdByEmail: user?.email || existingKey.createdByEmail,
          ipWhitelist: existingKey.ipWhitelist,
        },
      }),
      prisma.whatsAppApiKey.update({
        where: { id: existingKey.id },
        data: {
          status: "ROTATED",
          gracePeriodEndsAt,
        },
      }),
    ]);

    logApiRequest({
      clientId: client.id,
      apiKeyId: newKey.id,
      endpoint: "/api/v1/keys",
      httpMethod: "PUT",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Rotated key ${existingKey.keyPrefix} -> new key ${keyPrefix}. Grace period ends at ${gracePeriodEndsAt.toISOString()}`,
    });

    let scopesList: string[] = [];
    try {
      scopesList = JSON.parse(newKey.scopes);
    } catch {
      scopesList = [newKey.scopes];
    }

    return NextResponse.json({
      success: true,
      message: `API Key rotated. Old key remains functional for ${graceHours} hours during grace period.`,
      newKey: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        rawKey, // Shown once
        scopes: scopesList,
        status: newKey.status,
        createdAt: newKey.createdAt,
      },
      oldKey: {
        id: updatedOldKey.id,
        status: updatedOldKey.status,
        gracePeriodEndsAt: updatedOldKey.gracePeriodEndsAt,
      },
    });
  } catch (err: any) {
    console.error("[API v1 /keys PUT] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to rotate API key." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/keys
 * Instantly revokes an API key.
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { client } = await resolveTenantClient(req);
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let keyId = searchParams.get("keyId");
    if (!keyId) {
      const body = await req.json().catch(() => ({}));
      keyId = body.keyId;
    }

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: keyId" },
        { status: 400 }
      );
    }

    const existingKey = await prisma.whatsAppApiKey.findFirst({
      where: { id: keyId, clientId: client.id },
    });

    if (!existingKey) {
      return NextResponse.json(
        { success: false, error: "API key not found." },
        { status: 404 }
      );
    }

    await prisma.whatsAppApiKey.update({
      where: { id: keyId },
      data: { status: "REVOKED" },
    });

    logApiRequest({
      clientId: client.id,
      apiKeyId: keyId,
      endpoint: "/api/v1/keys",
      httpMethod: "DELETE",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Revoked key ID ${keyId} (${existingKey.keyPrefix})`,
    });

    return NextResponse.json({
      success: true,
      message: `API Key ${existingKey.keyPrefix} revoked successfully.`,
    });
  } catch (err: any) {
    console.error("[API v1 /keys DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to revoke API key." },
      { status: 500 }
    );
  }
}
