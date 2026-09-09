"use client";

import React, { useState, useEffect } from "react";
import { Bot, Users, MessageSquare, CheckCircle2, TrendingUp, Clock, BarChart2, RefreshCw } from "lucide-react";
import { getWhatsAppRealAnalytics } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await getWhatsAppRealAnalytics();
    if (res.success && res.analytics) setAnalytics(res.analytics);
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const kpis = analytics ? [
    { label: "Total Conversations", value: analytics.totalConversations.toLocaleString(), sub: `${analytics.openConversations} currently open`, color: "#3b82f6", icon: MessageSquare },
    { label: "AI Resolution Rate", value: `${analytics.aiResolutionRate}%`, sub: `${analytics.aiHandledCount} handled by AI`, color: "#8b5cf6", icon: Bot },
    { label: "Message Read Rate", value: analytics.readRate > 0 ? `${analytics.readRate}%` : "—", sub: `${analytics.readMessages.toLocaleString()} messages read`, color: "#10b981", icon: CheckCircle2 },
    { label: "Total Customers", value: analytics.totalCustomers.toLocaleString(), sub: `+${analytics.newCustomers30d} new in 30 days`, color: "#f59e0b", icon: Users }
  ] : [];

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp CRM Analytics</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Real-time insights from your live database — AI resolution rates, message reach, and customer growth.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Quarter to Date</option>
          </select>
          <button onClick={fetchAnalytics} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px", minHeight: "80px", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
          ))
        ) : kpis.map((kpi) => (
          <div key={kpi.label} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <kpi.icon size={16} color={kpi.color} />
              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>{kpi.label}</span>
            </div>
            <h3 style={{ fontSize: "26px", fontWeight: 800, color: kpi.color, margin: "0 0 4px 0" }}>{kpi.value}</h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* AI vs Human Breakdown */}
      {analytics && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px 0" }}>AI vs Human Agent Conversation Breakdown</h3>
          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ flex: 1, background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "16px", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6d28d9", fontWeight: 700, marginBottom: "8px" }}>
                <Bot size={18} /> AI Agent Handled ({analytics.aiResolutionRate}%)
              </div>
              <div style={{ background: "#ddd6fe", borderRadius: "4px", height: "8px", marginBottom: "8px" }}>
                <div style={{ background: "#7c3aed", height: "8px", borderRadius: "4px", width: `${analytics.aiResolutionRate}%`, transition: "width 0.8s ease" }} />
              </div>
              <p style={{ fontSize: "13px", color: "#4c1d95", margin: 0 }}>
                {analytics.aiHandledCount.toLocaleString()} conversations handled automatically by AI without human intervention.
              </p>
            </div>
            <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#15803d", fontWeight: 700, marginBottom: "8px" }}>
                <Users size={18} /> Human Agent Handled ({100 - analytics.aiResolutionRate}%)
              </div>
              <div style={{ background: "#bbf7d0", borderRadius: "4px", height: "8px", marginBottom: "8px" }}>
                <div style={{ background: "#16a34a", height: "8px", borderRadius: "4px", width: `${100 - analytics.aiResolutionRate}%`, transition: "width 0.8s ease" }} />
              </div>
              <p style={{ fontSize: "13px", color: "#166534", margin: 0 }}>
                {analytics.humanHandledCount.toLocaleString()} conversations required human sales rep intervention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message Delivery Stats */}
      {analytics && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px 0" }}>Message Delivery & Read Statistics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { label: "Total Messages", value: analytics.totalMessages, color: "#374151" },
              { label: "Sent (Outbound)", value: analytics.sentMessages, color: "#3b82f6" },
              { label: "Delivered", value: analytics.deliveredMessages, color: "#10b981" },
              { label: "Read", value: analytics.readMessages, color: "#6d28d9" }
            ].map((s) => (
              <div key={s.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "6px" }}>{s.label}</span>
                <strong style={{ fontSize: "22px", color: s.color }}>{s.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
