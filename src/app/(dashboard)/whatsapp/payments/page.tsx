"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, Clock, Plus, RefreshCw, Link as LinkIcon } from "lucide-react";
import { getWhatsAppPaymentLinks } from "@/app/actions/whatsAppPlatformActions";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";

export default function WhatsAppPaymentsPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = async () => {
    setLoading(true);
    const res = await getWhatsAppPaymentLinks();
    if (res.success && res.links) setLinks(res.links);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const totalPending = links.filter(l => l.status === "PENDING").reduce((s, l) => s + (l.amount || 0), 0);
  const totalReceived = links.filter(l => l.status === "PAID").reduce((s, l) => s + (l.amount || 0), 0);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Payment Links</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Generate & track UPI / payment links sent directly inside WhatsApp chats.</p>
        </div>
        <button onClick={fetchLinks} style={{ background: "#fff", border: "1px solid #d1d5db", padding: "7px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151" }}>
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700 }}>💰 Total Received</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#15803d", margin: "4px 0 0 0" }}>₹{totalReceived.toLocaleString("en-IN")}</h3>
        </div>
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#92400e", fontWeight: 700 }}>⏳ Total Pending</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#b45309", margin: "4px 0 0 0" }}>₹{totalPending.toLocaleString("en-IN")}</h3>
        </div>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 700 }}>🔗 Total Links</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#1d4ed8", margin: "4px 0 0 0" }}>{links.length}</h3>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
            <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <p>Loading payment links...</p>
          </div>
        ) : links.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
            <LinkIcon size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: "14px", fontWeight: 600 }}>No payment links yet</p>
            <p style={{ fontSize: "13px" }}>Payment links sent inside WhatsApp chats will appear here.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 700 }}>
                <th style={{ padding: "12px 16px" }}>Customer</th>
                <th style={{ padding: "12px 16px" }}>WhatsApp #</th>
                <th style={{ padding: "12px 16px" }}>Description</th>
                <th style={{ padding: "12px 16px" }}>Amount (₹)</th>
                <th style={{ padding: "12px 16px" }}>Created</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827" }}>
                    {link.conversation?.customer?.businessName || link.conversation?.customer?.contactPerson || "Unknown"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#059669" }}>
                    {formatWhatsAppPhone(link.conversation?.customer?.whatsappNumber || link.conversation?.customer?.mobile) || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151" }}>{link.description || "—"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 800, color: "#111827" }}>
                    ₹{(link.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>
                    {new Date(link.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {link.status === "PAID" ? (
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px" }}>● PAID</span>
                    ) : link.status === "EXPIRED" ? (
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "4px" }}>● EXPIRED</span>
                    ) : (
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px" }}>● PENDING</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
