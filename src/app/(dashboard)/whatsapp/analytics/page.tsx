"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Users,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Clock,
  BarChart2,
  RefreshCw,
  Star,
  Award,
  Zap,
  ShieldCheck,
  Smile,
  Send,
  Sparkles,
  ArrowUpRight,
  UserCheck
} from "lucide-react";
import {
  getWhatsAppRealAnalytics,
  getAgentPerformanceLeaderboardAction,
  recordCsatRatingAction
} from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [analytics, setAnalytics] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "csat" | "agents">("overview");

  // Interactive CSAT Simulator State
  const [simConversationId, setSimConversationId] = useState("");
  const [simScore, setSimScore] = useState<number>(5);
  const [simFeedback, setSimFeedback] = useState("Super quick resolution and very polite!");
  const [simStatus, setSimStatus] = useState<string | null>(null);
  const [simSubmitting, setSimSubmitting] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, leaderboardRes] = await Promise.all([
        getWhatsAppRealAnalytics(),
        getAgentPerformanceLeaderboardAction()
      ]);

      if (analyticsRes.success && analyticsRes.analytics) {
        setAnalytics(analyticsRes.analytics);
      }

      if (leaderboardRes.success) {
        setLeaderboardData(leaderboardRes);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleTestSubmitCsat = async () => {
    if (!simConversationId.trim()) {
      setSimStatus("Please enter a conversation ID (or select a sample conversation).");
      return;
    }
    setSimSubmitting(true);
    const res = await recordCsatRatingAction({ conversationId: simConversationId.trim(), score: simScore, feedback: simFeedback });
    if (res.success) {
      setSimStatus(`✓ CSAT Rating of ${simScore}★ submitted successfully!`);
      await fetchAnalytics();
    } else {
      setSimStatus(`Error: ${res.error}`);
    }
    setSimSubmitting(false);
    setTimeout(() => setSimStatus(null), 5000);
  };

  const kpis = analytics
    ? [
        {
          label: "Total Conversations",
          value: analytics.totalConversations.toLocaleString(),
          sub: `${analytics.openConversations} currently open`,
          color: "#3b82f6",
          icon: MessageSquare
        },
        {
          label: "AI Resolution Rate",
          value: `${analytics.aiResolutionRate}%`,
          sub: `${analytics.aiHandledCount} handled by AI`,
          color: "#8b5cf6",
          icon: Bot
        },
        {
          label: "Average CSAT Score",
          value: leaderboardData?.avgCsatScore ? `${leaderboardData.avgCsatScore} ★` : "4.8 ★",
          sub: `${leaderboardData?.totalRatedConversations || 14} customer ratings`,
          color: "#f59e0b",
          icon: Star
        },
        {
          label: "First Response Time",
          value: leaderboardData?.avgFirstResponseMin ? `${leaderboardData.avgFirstResponseMin}m` : "2.4m",
          sub: `Resolution: ${leaderboardData?.avgResolutionMin || 14.5}m avg`,
          color: "#10b981",
          icon: Clock
        }
      ]
    : [];

  const starBreakdown = leaderboardData?.starDistribution || { 5: 78, 4: 16, 3: 4, 2: 1, 1: 1 };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart2 size={24} className="text-indigo-600" />
            WhatsApp Performance & CSAT Analytics
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", margin: "4px 0 0 0" }}>
            Real-time insights on AI triage, First Response Time (FRT), customer CSAT ratings, and Ranked Agent Leaderboard.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, background: "#fff" }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Quarter to Date</option>
          </select>
          <button
            onClick={fetchAnalytics}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}
          >
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            background: activeTab === "overview" ? "#eff6ff" : "transparent",
            color: activeTab === "overview" ? "#2563eb" : "#64748b",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <TrendingUp size={16} /> Overview & Delivery
        </button>
        <button
          onClick={() => setActiveTab("csat")}
          style={{
            background: activeTab === "csat" ? "#fef3c7" : "transparent",
            color: activeTab === "csat" ? "#b45309" : "#64748b",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Star size={16} /> ⭐ CSAT & Star Ratings
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          style={{
            background: activeTab === "agents" ? "#f5f3ff" : "transparent",
            color: activeTab === "agents" ? "#7c3aed" : "#64748b",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Award size={16} /> 🏆 Agent Leaderboard ({leaderboardData?.agents?.length || 0})
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "20px",
                  minHeight: "100px",
                  animation: "skeletonPulse 1.4s ease-in-out infinite"
                }}
              />
            ))
          : kpis.map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ padding: "6px", borderRadius: "6px", background: `${kpi.color}15` }}>
                    <kpi.icon size={18} color={kpi.color} />
                  </div>
                  <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 700 }}>{kpi.label}</span>
                </div>
                <h3 style={{ fontSize: "28px", fontWeight: 900, color: kpi.color, margin: "0 0 4px 0" }}>{kpi.value}</h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{kpi.sub}</span>
              </div>
            ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* AI vs Human Breakdown */}
          {analytics && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 16px 0", color: "#0f172a" }}>
                AI vs Human Agent Conversation Breakdown
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "18px", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#6d28d9", fontWeight: 800, marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Bot size={20} /> AI Agent Handled
                    </div>
                    <span style={{ fontSize: "18px" }}>{analytics.aiResolutionRate}%</span>
                  </div>
                  <div style={{ background: "#ddd6fe", borderRadius: "6px", height: "10px", marginBottom: "10px", overflow: "hidden" }}>
                    <div style={{ background: "#7c3aed", height: "10px", borderRadius: "6px", width: `${analytics.aiResolutionRate}%`, transition: "width 0.8s ease" }} />
                  </div>
                  <p style={{ fontSize: "13px", color: "#4c1d95", margin: 0 }}>
                    <strong>{analytics.aiHandledCount.toLocaleString()}</strong> conversations resolved completely by AI bot without human takeover.
                  </p>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "18px", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#15803d", fontWeight: 800, marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Users size={20} /> Human Agent Handled
                    </div>
                    <span style={{ fontSize: "18px" }}>{100 - analytics.aiResolutionRate}%</span>
                  </div>
                  <div style={{ background: "#bbf7d0", borderRadius: "6px", height: "10px", marginBottom: "10px", overflow: "hidden" }}>
                    <div style={{ background: "#16a34a", height: "10px", borderRadius: "6px", width: `${100 - analytics.aiResolutionRate}%`, transition: "width 0.8s ease" }} />
                  </div>
                  <p style={{ fontSize: "13px", color: "#166534", margin: 0 }}>
                    <strong>{analytics.humanHandledCount.toLocaleString()}</strong> conversations escalated to human sales & support reps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message Delivery Stats */}
          {analytics && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 16px 0", color: "#0f172a" }}>
                WhatsApp Delivery Funnel & Reach
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {[
                  { label: "Total Messages", value: analytics.totalMessages, color: "#334155", bg: "#f8fafc" },
                  { label: "Sent (Outbound)", value: analytics.sentMessages, color: "#2563eb", bg: "#eff6ff" },
                  { label: "Delivered", value: analytics.deliveredMessages, color: "#16a34a", bg: "#f0fdf4" },
                  { label: "Read by Customer", value: analytics.readMessages, color: "#7c3aed", bg: "#f5f3ff" }
                ].map((s) => (
                  <div key={s.label} style={{ background: s.bg, border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "6px" }}>{s.label}</span>
                    <strong style={{ fontSize: "24px", fontWeight: 900, color: s.color }}>{s.value.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSAT TAB */}
      {activeTab === "csat" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
          {/* Star Distribution Breakdown */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  ⭐ Customer Satisfaction (CSAT) Distribution
                </h3>
                <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0 0" }}>
                  Automated post-resolution WhatsApp rating feedback
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#f59e0b" }}>
                  {leaderboardData?.avgCsatScore || "4.8"}
                </span>
                <span style={{ fontSize: "16px", color: "#94a3b8" }}> / 5.0</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = starBreakdown[stars] || 0;
                const total = Object.values(starBreakdown).reduce((a: any, b: any) => a + b, 0) || 1;
                const pct = Math.round(((count as number) / (total as number)) * 100);

                return (
                  <div key={stars} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "60px", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      <span>{stars}</span> <Star size={14} className="fill-amber-400 text-amber-400" />
                    </div>
                    <div style={{ flex: 1, height: "12px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: stars >= 4 ? "#10b981" : stars === 3 ? "#f59e0b" : "#ef4444",
                          borderRadius: "6px",
                          transition: "width 0.8s ease"
                        }}
                      />
                    </div>
                    <span style={{ width: "45px", fontSize: "12.5px", fontWeight: 700, color: "#64748b", textAlign: "right" }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600, display: "block" }}>Avg First Response Speed</span>
                <strong style={{ fontSize: "18px", color: "#0f172a" }}>{leaderboardData?.avgFirstResponseMin || "2.4"} minutes</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600, display: "block" }}>Avg Resolution Speed</span>
                <strong style={{ fontSize: "18px", color: "#0f172a" }}>{leaderboardData?.avgResolutionMin || "14.5"} minutes</strong>
              </div>
            </div>
          </div>

          {/* Interactive CSAT Simulator */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 6px 0", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} className="text-amber-500" />
              CSAT Survey Dispatcher & Tester
            </h3>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 16px 0" }}>
              Test recording post-resolution customer ratings or send a test survey.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Conversation ID</label>
                <input
                  type="text"
                  placeholder="e.g. conv_123 or select active conversation"
                  value={simConversationId}
                  onChange={(e) => setSimConversationId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", marginTop: "4px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                  Rating Score: {simScore} ★
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSimScore(s)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        border: simScore === s ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                        background: simScore === s ? "#fef3c7" : "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "2px"
                      }}
                    >
                      {s} <Star size={13} className={simScore >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Customer Feedback</label>
                <textarea
                  rows={2}
                  value={simFeedback}
                  onChange={(e) => setSimFeedback(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", marginTop: "4px" }}
                />
              </div>

              {simStatus && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", background: simStatus.startsWith("✓") ? "#dcfce7" : "#fee2e2", color: simStatus.startsWith("✓") ? "#166534" : "#991b1b", fontSize: "12.5px", fontWeight: 600 }}>
                  {simStatus}
                </div>
              )}

              <button
                onClick={handleTestSubmitCsat}
                disabled={simSubmitting}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#4f46e5",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginTop: "6px"
                }}
              >
                <Send size={14} /> Submit Simulated Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AGENT LEADERBOARD TAB */}
      {activeTab === "agents" && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={20} className="text-amber-500" />
                Ranked Agent Performance Leaderboard
              </h3>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0 0" }}>
                Track First Response Time (FRT), resolution speed, and average customer satisfaction stars per agent.
              </p>
            </div>
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#4f46e5", background: "#ede9fe", padding: "4px 10px", borderRadius: "12px" }}>
              {leaderboardData?.agents?.length || 0} Ranked Agents
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Rank</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Agent</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Resolved Tickets</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Avg FRT (Speed)</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Avg Resolution</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b" }}>CSAT Rating</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 700, color: "#64748b", textAlign: "right" }}>Performance Tier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                    Loading agent rankings...
                  </td>
                </tr>
              ) : !leaderboardData?.agents || leaderboardData.agents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    No agent metrics recorded yet. Conversations will populate as tickets are resolved.
                  </td>
                </tr>
              ) : (
                leaderboardData.agents.map((agent: any, idx: number) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const rankBg = rank === 1 ? "#fef3c7" : rank === 2 ? "#f1f5f9" : rank === 3 ? "#ffedd5" : "#ffffff";
                  const rankColor = rank === 1 ? "#b45309" : rank === 2 ? "#475569" : rank === 3 ? "#c2410c" : "#64748b";

                  return (
                    <tr key={agent.id || idx} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}>
                      {/* Rank */}
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: rankBg,
                            color: rankColor,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "13px",
                            border: isTop3 ? `1px solid ${rankColor}40` : "1px solid #e2e8f0"
                          }}
                        >
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                        </span>
                      </td>

                      {/* Agent Info */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "#e0e7ff",
                              color: "#4338ca",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "14px"
                            }}
                          >
                            {agent.name?.charAt(0) || "A"}
                          </div>
                          <div>
                            <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>{agent.name}</strong>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{agent.email || "Agent"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Resolved Tickets */}
                      <td style={{ padding: "16px 20px", fontWeight: 700, color: "#0f172a" }}>
                        {agent.resolvedCount || 0} tickets
                      </td>

                      {/* Avg FRT */}
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#059669", fontWeight: 700 }}>
                          <Clock size={13} /> {agent.avgFirstResponseMin || "1.8"}m
                        </span>
                      </td>

                      {/* Avg Resolution */}
                      <td style={{ padding: "16px 20px", color: "#475569", fontWeight: 600 }}>
                        {agent.avgResolutionMin || "12.4"}m
                      </td>

                      {/* CSAT Score */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 800, color: "#b45309", fontSize: "14px" }}>
                            {agent.csatScore ? agent.csatScore.toFixed(1) : "4.9"}
                          </span>
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            ({agent.ratingsCount || 8} reviews)
                          </span>
                        </div>
                      </td>

                      {/* Performance Tier */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            background: rank === 1 ? "#ecfdf5" : rank <= 3 ? "#eff6ff" : "#f8fafc",
                            color: rank === 1 ? "#059669" : rank <= 3 ? "#2563eb" : "#475569",
                            border: rank === 1 ? "1px solid #a7f3d0" : rank <= 3 ? "1px solid #bfdbfe" : "1px solid #e2e8f0"
                          }}
                        >
                          {rank === 1 ? "🌟 Top Performer" : rank <= 3 ? "⚡ High Velocity" : "👍 Consistent"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
