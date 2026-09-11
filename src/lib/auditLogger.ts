import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface LogAuditOptions {
  actorEmail: string;
  actorName?: string;
  actorRole?: string;
  actionType: 
    | "LOGIN" 
    | "LOGOUT" 
    | "EXPORT_CONTACTS" 
    | "SETTINGS_UPDATE" 
    | "INTEGRATION_UPDATE" 
    | "AGENT_CREATED" 
    | "AGENT_ROLE_CHANGE" 
    | "AGENT_DELETED" 
    | "FLOW_SAVED" 
    | "FLOW_DELETED" 
    | "CONVERSATION_CLOSED" 
    | "CSAT_RECORDED" 
    | "BROADCAST_SENT" 
    | "PAYMENT_GATEWAY_UPDATE" 
    | "SECURITY_EVENT";
  details?: any;
  clientId?: string;
  req?: NextRequest | Request;
}

export async function logAuditEvent(options: LogAuditOptions) {
  try {
    let ipAddress: string | null = null;

    if (options.req) {
      const headers = options.req.headers;
      ipAddress = 
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
        headers.get("x-real-ip") || 
        "127.0.0.1";
    }

    const detailsStr = options.details ? (typeof options.details === "string" ? options.details : JSON.stringify(options.details)) : null;

    await (prisma as any).whatsAppAuditLog.create({
      data: {
        clientId: options.clientId || null,
        actorEmail: options.actorEmail || "unknown@system.local",
        actorName: options.actorName || options.actorEmail?.split("@")[0] || "System User",
        actorRole: options.actorRole || "AGENT",
        actionType: options.actionType,
        detailsJson: detailsStr,
        ipAddress: ipAddress
      }
    });
  } catch (err) {
    // Non-fatal logging failure
    console.error("[AuditLogger Error]:", err);
  }
}
