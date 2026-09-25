"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOwnerDashboardStatsAction, syncSubscriptionStatusesAction } from "@/app/actions/ownerPortalActions";
import { MASTER_MODULES, ALL_MODULE_KEYS, parseEnabledModules } from "@/lib/moduleRegistry";
import Link from "next/link";

export default function OwnerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const authed = sessionStorage.getItem("owner_authed");
    if (authed === "1") {
      loadStats();
    } else {
      fetch("/api/owner/verify").then(r => {
        if (!r.ok) router.push("/owner/login");
        else { sessionStorage.setItem("owner_authed", "1"); loadStats(); }
      }).catch(() => router.push("/owner/login"));
    }
  }, []);

  const loadStats = async () => {
    await syncSubscriptionStatusesAction();
    const res = await getOwnerDashboardStatsAction();
    if (res.success) setData(res);
    setLoading(false);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("owner_authed");
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner/login");
  };

  const stats = data?.stats;
  const clients = data?.clients || [];

  const mrrValue = stats?.mrr || 0;
  const arrValue = mrrValue * 12;

  const statCards = [
    { label: "Monthly Recurring (MRR)", value: "₹" + mrrValue.toLocaleString(), sub: "ARR: ₹" + arrValue.toLocaleString(), icon: "💰", color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
    { label: "Total SaaS Tenants", value: stats?.total ?? "—", sub: `${stats?.active || 0} active subscriptions`, icon: "🏢", color: "#818cf8", bg: "rgba(99, 102, 241, 0.15)", border: "rgba(99, 102, 241, 0.3)" },
    { label: "Active Subscriptions", value: stats?.active ?? "—", sub: "Paying monthly", icon: "✅", color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
    { label: "Renewals & Past Due", value: stats?.pastDue ?? "—", sub: "Action required", icon: "⏰", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" },
    { label: "Free Trial Accounts", value: stats?.trial ?? "—", sub: "Evaluating platform", icon: "🧪", color: "#60a5fa", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)" },
    { label: "Blocked / Suspended", value: stats?.blocked ?? "—", sub: "Access restricted", icon: "🔒", color: "#f87171", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)" },
  ];

  // Module adoption telemetry
  const moduleAdoption = ALL_MODULE_KEYS.map(modKey => {
    const m = MASTER_MODULES[modKey];
    const count = clients.filter((c: any) => {
      const mods = parseEnabledModules(c.enabledModules);
      return mods.includes(modKey);
    }).length;
    const pct = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;
    return { modKey, name: m.name, icon: m.icon, count, pct, category: m.category };
  });

  const now = new Date();
  const upcomingRenewals = clients.filter((c: any) => {
    if (!c.currentPeriodEnd) return false;
    const due = new Date(c.currentPeriodEnd);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 || c.subscriptionStatus === "PAST_DUE" || c.subscriptionStatus === "BLOCKED";
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Header */}
      <header style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "white", boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.2px" }}>WhatMore Super-Admin Console</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Enterprise Telemetry & Operations Command</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients & Modules", href: "/owner/clients", icon: "🏢" },
            { label: "Announcements", href: "/owner/announcements", icon: "📢" },
            { label: "Plans & Matrix", href: "/owner/plans", icon: "💎" },
          ].map(item => {
            const active = item.href === "/owner";
            return (
              <Link key={item.href} href={item.href} style={{ padding: "8px 14px", borderRadius: "10px", background: active ? "rgba(99, 102, 241, 0.2)" : "transparent", border: active ? "1px solid #6366f1" : "1px solid transparent", color: active ? "#818cf8" : "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s ease" }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
          <button onClick={handleLogout} style={{ marginLeft: "12px", padding: "8px 14px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Top Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>👑 Executive SaaS Overview & Telemetry</h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>High-level financial KPIs, tenant module adoption matrix, and upcoming renewal billing queues</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/owner/clients" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "linear-gradient(135deg, #6366f1, #a855f7)", borderRadius: "12px", color: "white", textDecoration: "none", fontWeight: 800, fontSize: "13px", boxShadow: "0 4px 20px rgba(99, 102, 241, 0.35)" }}>
              <span>➕</span> Onboard New Client
            </Link>
            <Link href="/owner/announcements" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", color: "#ffffff", textDecoration: "none", fontWeight: 700, fontSize: "13px" }}>
              <span>📢</span> Broadcast Marquee
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          {statCards.map(card => (
            <div key={card.label} style={{ background: "rgba(15, 23, 42, 0.65)", border: `1px solid ${card.border || "rgba(255,255,255,0.08)"}`, borderRadius: "18px", padding: "20px", backdropFilter: "blur(12px)", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>{card.label}</span>
                <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: card.bg, border: `1px solid ${card.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                  {card.icon}
                </span>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: card.color, letterSpacing: "-0.5px", marginBottom: "4px" }}>
                {loading ? "..." : card.value}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* 2-Column Section: Renewals + Module Adoption Matrix */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
          {/* Renewals & Invoices Queue */}
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", margin: 0 }}>⏰ Renewal & Payment Queues</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>Tenants due in next 7 days or currently in past due cycle</p>
              </div>
              <Link href="/owner/clients" style={{ fontSize: "12px", color: "#818cf8", textDecoration: "none", fontWeight: 700 }}>
                View All Clients →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Checking renewals...</div>
            ) : upcomingRenewals.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#34d399", background: "rgba(16, 185, 129, 0.1)", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.25)", fontSize: "13px", fontWeight: 700 }}>
                ✨ All clients are currently active and up to date! No immediate dues.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcomingRenewals.map((c: any) => {
                  const due = new Date(c.currentPeriodEnd);
                  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diffDays < 0;

                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: isOverdue ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)", border: `1px solid ${isOverdue ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`, borderRadius: "12px", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "14px" }}>{c.businessName}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{c.contactEmail} • Fee: <b style={{ color: "#34d399" }}>₹{c.monthlyFee?.toLocaleString()}/mo</b></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: isOverdue ? "#f87171" : "#fbbf24", padding: "4px 10px", background: "rgba(0,0,0,0.3)", borderRadius: "6px" }}>
                          {isOverdue ? `Overdue by ${Math.abs(diffDays)}d` : diffDays === 0 ? "Due Today" : `Due in ${diffDays}d`}
                        </span>
                        <Link href="/owner/clients" style={{ padding: "6px 14px", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "12px", fontWeight: 800 }}>
                          💳 Collect
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 13-Module Platform Adoption Gauge */}
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", margin: 0 }}>🎛️ 13-Module Feature Adoption</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>Active tenant penetration across all modules</p>
              </div>
              <Link href="/owner/plans" style={{ fontSize: "12px", color: "#818cf8", textDecoration: "none", fontWeight: 700 }}>
                Plans & Matrix →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
              {moduleAdoption.map(m => (
                <div key={m.modKey} style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{m.icon}</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff" }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#818cf8" }}>
                      {m.count} Tenants ({m.pct}%)
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${m.pct}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #a855f7)", borderRadius: "999px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
