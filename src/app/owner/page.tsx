"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOwnerDashboardStatsAction, syncSubscriptionStatusesAction } from "@/app/actions/ownerPortalActions";
import Link from "next/link";

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Client-side auth guard — check sessionStorage first (fast), then cookie
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
    if (res.success) setStats(res.stats);
    setLoading(false);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("owner_authed");
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner/login");
  };

  const statCards = [
    { label: "Total Clients", value: stats?.total ?? "—", icon: "🏢", color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
    { label: "Active", value: stats?.active ?? "—", icon: "✅", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    { label: "Past Due", value: stats?.pastDue ?? "—", icon: "⏰", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { label: "Blocked", value: stats?.blocked ?? "—", icon: "🔒", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    { label: "Trial", value: stats?.trial ?? "—", icon: "🧪", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { label: "MRR", value: stats?.mrr != null ? "₹" + stats.mrr.toLocaleString() : "—", icon: "💰", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)", padding: "0" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.3px" }}>Owner Console</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>What-In SaaS Management</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients", href: "/owner/clients", icon: "🏢" },
            { label: "Plans", href: "/owner/plans", icon: "💎" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ padding: "8px 14px", borderRadius: "10px", background: item.href === "/owner" ? "rgba(124,58,237,0.2)" : "transparent", border: item.href === "/owner" ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent", color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
              {item.icon} {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} style={{ marginLeft: "8px", padding: "8px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: "32px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Dashboard Overview</h2>
          <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>Monitor all client accounts and subscription health</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {statCards.map(card => (
            <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.color}30`, borderRadius: "16px", padding: "20px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{card.icon}</div>
              <div style={{ fontSize: "32px", fontWeight: 900, color: card.color, letterSpacing: "-1px" }}>{loading ? "..." : card.value}</div>
              <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginTop: "2px" }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "16px" }}>
          <Link href="/owner/clients" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 24px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", borderRadius: "12px", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "14px", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}>
            ➕ Onboard New Client
          </Link>
          <Link href="/owner/plans" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#94a3b8", textDecoration: "none", fontWeight: 600, fontSize: "14px" }}>
            💎 Manage Plans
          </Link>
        </div>
      </main>
    </div>
  );
}
