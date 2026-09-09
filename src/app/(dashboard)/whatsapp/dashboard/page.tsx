"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, TrendingUp, Zap, Activity, Box, Search, Bell } from "lucide-react";
import Link from "next/link";
import {
  getWhatsAppDashboardMetrics,
  refreshWhatsAppAccountSyncAction,
  checkIntegrationHealthAction
} from "@/app/actions/whatsAppPlatformActions";

export default function WhatInDashboard() {
  const [data, setData] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const fetchMetricsAndHealth = async () => {
    setLoading(true);
    const [metricsRes, healthRes] = await Promise.all([
      getWhatsAppDashboardMetrics(),
      checkIntegrationHealthAction()
    ]);
    if (metricsRes.success) setData(metricsRes);
    if (healthRes.success) setHealth(healthRes);
    setLoading(false);
  };

  useEffect(() => {
    fetchMetricsAndHealth();
  }, []);

  const handleRefreshSync = async () => {
    setRefreshing(true);
    setSyncToast(null);
    const res = await refreshWhatsAppAccountSyncAction();
    if (res.success) {
      setSyncToast(`Account synchronized! Webhook: ${res.health?.webhookStatus || "Active"}`);
      await fetchMetricsAndHealth();
    }
    setRefreshing(false);
  };

  const isConnected = data?.isConnected || false;
  const metrics = data?.metrics || {};
  const totalRevenue = metrics.totalRevenue || 0;
  const productsCount = metrics.productsCount || 0;
  const automatedReplies = metrics.aiRepliesCount || metrics.totalMessages || 0;
  const sentToday = metrics.sentToday || 0;

  return (
    <div style={{ padding: "32px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px", width: "100%", color: "#0f172a" }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", color: "#0f172a", margin: "0 0 4px 0" }}>Overview</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Welcome to What-In. Your unified commerce and automation hub.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search products, contacts..."
              style={{ padding: "9px 14px 9px 36px", border: "1px solid #cbd5e1", borderRadius: "999px", background: "#ffffff", fontSize: "13px", color: "#0f172a", outline: "none", width: "240px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            />
          </div>
          <button style={{ width: "38px", height: "38px", borderRadius: "50%", border: "1px solid #cbd5e1", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <Bell size={16} />
          </button>
        </div>
      </div>

      {syncToast && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "12px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} /> {syncToast}
          </div>
          <button onClick={() => setSyncToast(null)} style={{ background: "none", border: "none", color: "#166534", fontSize: "16px", cursor: "pointer" }}>×</button>
        </div>
      )}

      {!isConnected && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "20px 24px", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ padding: "10px", background: "#fef3c7", borderRadius: "50%", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#92400e", margin: "0 0 2px 0" }}>WhatsApp API Not Connected</h4>
              <p style={{ fontSize: "13px", color: "#b45309", margin: 0 }}>Please configure your Meta App credentials to activate automation.</p>
            </div>
          </div>
          <Link
            href="/whatsapp/api-settings"
            style={{ padding: "10px 18px", background: "#d97706", color: "white", borderRadius: "10px", fontSize: "13px", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(217,119,6,0.25)" }}
          >
            Configure API →
          </Link>
        </div>
      )}

      {/* Hero Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
        {/* 1. Total Revenue */}
        <div style={{ background: "#ffffff", padding: "22px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Total Revenue</span>
            <TrendingUp size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a" }}>
            {loading ? "..." : `₹${totalRevenue.toLocaleString()}`}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginTop: "8px" }}>
            {totalRevenue > 0 ? "From Store & CRM Orders" : "No orders recorded yet"}
          </div>
        </div>

        {/* 2. Active Products */}
        <div style={{ background: "#ffffff", padding: "22px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Active Products</span>
            <Box size={16} color="#4f46e5" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a" }}>
            {loading ? "..." : productsCount}
          </div>
          <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 600, marginTop: "8px" }}>
            {productsCount > 0 ? "Synced with Store Catalog" : "No catalog products yet"}
          </div>
        </div>

        {/* 3. Automated Replies */}
        <div style={{ background: "#ffffff", padding: "22px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Automated Replies</span>
            <Zap size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a" }}>
            {loading ? "..." : automatedReplies.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "#d97706", fontWeight: 600, marginTop: "8px" }}>
            {automatedReplies > 0 ? "AI & Chatbot interactions" : "Automated interactions"}
          </div>
        </div>

        {/* 4. API Status */}
        <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", padding: "22px", borderRadius: "16px", color: "white", boxShadow: "0 4px 14px rgba(79,70,229,0.25)" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#e0e7ff", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>API Status</span>
            <Activity size={16} color="#ffffff" />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: isConnected ? "#4ade80" : "#f87171", display: "inline-block" }}></span>
            {isConnected ? "Operational" : "Disconnected"}
          </div>
          <div style={{ fontSize: "12px", color: "#c7d2fe", fontWeight: 600, marginTop: "10px" }}>
            {isConnected ? (health?.metaApi?.status || "Live Meta Cloud API") : "Setup required in Settings"}
          </div>
        </div>
      </div>

      {/* Detail Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Meta Integration Health */}
        <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ borderBottom: "1px solid #f1f5f9", padding: "20px 24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 2px 0" }}>Meta Integration Health</h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Real-time status of your WhatsApp Cloud API connection.</p>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Webhook</div>
                {isConnected ? (
                  <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={15} /> Verified
                  </div>
                ) : (
                  <div style={{ fontWeight: 800, color: "#d97706", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={15} /> Pending Setup
                  </div>
                )}
              </div>
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Message Delivery</div>
                {isConnected ? (
                  <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={15} /> {health?.delivery?.rate || "100% Rate"}
                  </div>
                ) : (
                  <div style={{ fontWeight: 800, color: "#64748b", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={15} /> No Traffic
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleRefreshSync}
              disabled={refreshing}
              style={{ width: "100%", padding: "12px", background: "#0f172a", color: "white", borderRadius: "10px", border: "none", fontSize: "13px", fontWeight: 700, cursor: refreshing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Syncing with Meta..." : "Force Sync Integration"}
            </button>
          </div>
        </div>

        {/* Messaging Capacity */}
        <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 2px 0" }}>Messaging Tier Capacity</h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 20px 0" }}>
              {isConnected ? "Meta WhatsApp Business limits (24hr rolling window)." : "Configure Meta API to activate messaging tier limits."}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>Usage Today</span>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#4f46e5" }}>
                {sentToday.toLocaleString()} <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>/ {isConnected ? (data?.account?.dailyLimit || "10,000") : "--"}</span>
              </span>
            </div>

            <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                  borderRadius: "999px",
                  width: isConnected ? `${Math.min(100, (sentToday / 10000) * 100)}%` : "0%"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Quality Rating</div>
              {isConnected ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "999px", fontSize: "11px", fontWeight: 800 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                  {data?.account?.qualityRating || "High"}
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8" }} />
                  Not Configured
                </span>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Status</div>
              {isConnected ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "999px", fontSize: "11px", fontWeight: 800 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                  Connected
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "999px", fontSize: "11px", fontWeight: 800 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                  Disconnected
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
