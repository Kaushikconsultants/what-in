import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";
import { subscribeInboxEvents, InboxEvent } from "@/lib/inboxEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!authUser && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = authUser?.role || "SALES";
    const isAdmin = isOwner || userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "OWNER";
    const userClientId = authUser?.clientId || null;

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // 1. Initial connection ack
        try {
          const initMsg = JSON.stringify({ type: "CONNECTED", timestamp: Date.now() });
          controller.enqueue(encoder.encode(`data: ${initMsg}\n\n`));
        } catch (_) {}

        // 2. Subscribe to internal event bus
        unsubscribe = subscribeInboxEvents((event: InboxEvent) => {
          // Multi-tenant check: if agent belongs to a specific client, don't leak other tenants' chats
          if (!isAdmin && userClientId && event.clientId && event.clientId !== userClientId) {
            return;
          }

          try {
            const chunk = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          } catch (_) {}
        });

        // 3. Heartbeat ping every 15s to keep connections alive through proxies / Cloudflare
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keepalive\n\n`));
          } catch (_) {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
          }
        }, 15000);
      },
      cancel() {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error: any) {
    console.error("[SSE Stream Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
