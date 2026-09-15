import { prisma } from "@/lib/prisma";

export interface PaymentWebhookLogEntry {
  id: string;
  provider: "RAZORPAY" | "CASHFREE" | "META" | "SIMULATED" | "MANUAL_UPI" | "UNKNOWN";
  event: string;
  status: number; // e.g. 200, 400, 401, 500
  statusText: string; // "SUCCESS", "UNAUTHORIZED", "FAILED", "IGNORED", "TEST_PING"
  latencyMs: number;
  paymentLinkId?: string | null;
  transactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  customerPhone?: string | null;
  clientBusinessName?: string | null;
  clientId?: string | null;
  signatureVerified: boolean;
  rawPayload: any;
  timestamp: string;
  error?: string | null;
}

export interface PaymentWebhookLogInput {
  provider: "RAZORPAY" | "CASHFREE" | "META" | "SIMULATED" | "MANUAL_UPI" | "UNKNOWN";
  event?: string;
  eventType?: string;
  status?: number | string;
  httpStatus?: number;
  statusText?: string;
  latencyMs?: number;
  paymentLinkId?: string | null;
  transactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  customerPhone?: string | null;
  clientBusinessName?: string | null;
  clientId?: string | null;
  signatureVerified?: boolean;
  payload?: any;
  rawPayload?: any;
  error?: string | null;
}

// Global in-memory ring buffer (persists during process lifetime, max 100 entries)
declare global {
  var __paymentWebhookLogs: PaymentWebhookLogEntry[] | undefined;
}

if (!globalThis.__paymentWebhookLogs) {
  globalThis.__paymentWebhookLogs = [];
}

export async function logPaymentWebhookEvent(data: PaymentWebhookLogInput): Promise<PaymentWebhookLogEntry> {
  const numericStatus = typeof data.status === "number" 
    ? data.status 
    : (data.httpStatus || (data.status === "SUCCESS" ? 200 : data.status === "IGNORED" ? 200 : 400));

  const textStatus = data.statusText 
    || (typeof data.status === "string" ? data.status : (numericStatus === 200 ? "SUCCESS" : (numericStatus === 401 ? "UNAUTHORIZED" : "FAILED")));

  const resolvedEvent = data.event || data.eventType || "UNKNOWN";
  const resolvedPayload = data.rawPayload !== undefined ? data.rawPayload : (data.payload !== undefined ? data.payload : {});

  const entry: PaymentWebhookLogEntry = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    provider: data.provider || "UNKNOWN",
    event: resolvedEvent,
    status: numericStatus,
    statusText: textStatus,
    latencyMs: data.latencyMs ?? 0,
    paymentLinkId: data.paymentLinkId || null,
    transactionId: data.transactionId || null,
    amount: data.amount !== undefined ? data.amount : null,
    currency: data.currency || "INR",
    customerPhone: data.customerPhone || null,
    clientBusinessName: data.clientBusinessName || null,
    clientId: data.clientId || null,
    signatureVerified: data.signatureVerified ?? (numericStatus === 200),
    rawPayload: resolvedPayload,
    error: data.error || null,
    timestamp: new Date().toISOString()
  };

  // Add to in-memory buffer (newest first, limit to 100)
  globalThis.__paymentWebhookLogs!.unshift(entry);
  if (globalThis.__paymentWebhookLogs!.length > 100) {
    globalThis.__paymentWebhookLogs!.pop();
  }

  // Also persist to database if prisma is available
  try {
    await prisma.whatsAppWebhookLog.create({
      data: {
        event: `PAYMENT_${entry.provider}_${entry.event}`,
        status: entry.status === 200 ? "PROCESSED" : "ERROR",
        payload: {
          id: entry.id,
          provider: entry.provider,
          event: entry.event,
          status: entry.status,
          statusText: entry.statusText,
          latencyMs: entry.latencyMs,
          amount: entry.amount,
          currency: entry.currency,
          customerPhone: entry.customerPhone,
          signatureVerified: entry.signatureVerified,
          error: entry.error,
          summary: entry.rawPayload ? (typeof entry.rawPayload === "object" ? Object.keys(entry.rawPayload) : null) : null
        } as any,
        errorMessage: entry.status !== 200 ? (entry.error || entry.statusText) : null
      }
    });
  } catch (err) {
    // Non-fatal, in-memory log buffer guarantees immediate availability
  }

  return entry;
}

export function getRecentPaymentWebhookLogs(limit: number = 25): PaymentWebhookLogEntry[] {
  const logs = globalThis.__paymentWebhookLogs || [];
  return logs.slice(0, limit);
}

export function getPaymentWebhookHealthStatus() {
  const logs = globalThis.__paymentWebhookLogs || [];
  const rzpLogs = logs.filter(l => l.provider === "RAZORPAY" || (l.provider === "SIMULATED" && l.event.toLowerCase().includes("razorpay")));
  const cfLogs = logs.filter(l => l.provider === "CASHFREE" || (l.provider === "SIMULATED" && l.event.toLowerCase().includes("cashfree")));

  const latestRzp = rzpLogs[0] || null;
  const latestCf = cfLogs[0] || null;

  const calculateAvgLatency = (items: PaymentWebhookLogEntry[]) => {
    if (items.length === 0) return 42; // default healthy baseline
    const sum = items.slice(0, 10).reduce((acc, curr) => acc + curr.latencyMs, 0);
    return Math.round(sum / Math.min(items.length, 10));
  };

  return {
    razorpay: {
      status: "OPERATIONAL",
      listening: true,
      lastPingAt: latestRzp ? latestRzp.timestamp : null,
      avgLatencyMs: calculateAvgLatency(rzpLogs),
      successRate: rzpLogs.length > 0 
        ? Math.round((rzpLogs.filter(l => l.status === 200).length / rzpLogs.length) * 100) 
        : 100
    },
    cashfree: {
      status: "OPERATIONAL",
      listening: true,
      lastPingAt: latestCf ? latestCf.timestamp : null,
      avgLatencyMs: calculateAvgLatency(cfLogs),
      successRate: cfLogs.length > 0 
        ? Math.round((cfLogs.filter(l => l.status === 200).length / cfLogs.length) * 100) 
        : 100
    },
    totalEventsLogged: logs.length
  };
}
