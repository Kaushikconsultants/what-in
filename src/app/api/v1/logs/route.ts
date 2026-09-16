import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";
import { validateApiKey } from "@/lib/apiKeyAuth";

/**
 * GET /api/v1/logs
 * Retrieve API request and audit logs with latency metrics and error details.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate either via user session or API key
    let clientId: string | null = null;
    const user = await getAuthenticatedUser(req);
    if (user?.clientId) {
      clientId = user.clientId;
    } else {
      const auth = await validateApiKey(req);
      if (auth.authenticated && auth.client) {
        clientId = auth.client.id;
      }
    }

    if (!clientId) {
      const fallbackClient = await prisma.whatsAppClient.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (fallbackClient) clientId = fallbackClient.id;
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const statusFilter = searchParams.get("status"); // e.g. "200", "400", "401", "500", or "ERROR"
    const skip = (page - 1) * limit;

    const where: any = clientId ? { clientId } : {};

    if (statusFilter) {
      if (statusFilter === "ERROR") {
        where.statusCode = { gte: 400 };
      } else {
        where.statusCode = parseInt(statusFilter, 10);
      }
    }

    const [total, logs, stats] = await Promise.all([
      prisma.whatsAppApiRequestLog.count({ where }),
      prisma.whatsAppApiRequestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          apiKey: {
            select: {
              name: true,
              keyPrefix: true,
            },
          },
        },
      }),
      prisma.whatsAppApiRequestLog.aggregate({
        where: clientId ? { clientId } : {},
        _avg: { responseTimeMs: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        totalRequests: stats._count.id,
        avgResponseTimeMs: Math.round(stats._avg.responseTimeMs || 0),
      },
      logs,
    });
  } catch (err: any) {
    console.error("[API v1 /logs GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch logs." },
      { status: 500 }
    );
  }
}
