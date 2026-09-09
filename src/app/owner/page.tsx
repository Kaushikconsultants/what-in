"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOwnerDashboardStatsAction, syncSubscriptionStatusesAction } from "@/app/actions/ownerPortalActions";
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

  const statCards = [
    { label: "Total Clients", value: stats?.total ?? "—", icon: "🏢", color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
    { label: "Active Subscriptions", value: stats?.active ?? "—", icon: "✅", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Past Due / Expiring", value: stats?.pastDue ?? "—", icon: "⏰", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    { label: "Blocked Access", value: stats?.blocked ?? "—", icon: "🔒", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    { label: "Free Trial", value: stats?.trial ?? "—", icon: "🧪", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Monthly Recurring (MRR)", value: stats?.mrr != null ? "₹" + stats.mrr.toLocaleString() : "—", icon: "💰", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  ];

  // Find clients due in next 7 days or past due
  const now = new Date();
  const upcomingRenewals = clients.filter((c: any) => {
    if (!c.currentPeriodEnd) return false;
    const due = new Date(c.currentPeriodEnd);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 || c.subscriptionStatus === "PAST_DUE" || c.subscriptionStatus === "BLOCKED";
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Sticky Header */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "white", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.2px" }}>Owner Console</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>What-In SaaS Management</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients", href: "/owner/clients", icon: "🏢" },
            { label: "Announcements", href: "/owner/announcements", icon: "📢" },
            { label: "Plans", href: "/owner/plans", icon: "💎" },
          ].map(item => {
            const active = item.href === "/owner";
            return (
              <Link key={item.href} href={item.href} style={{ padding: "7px 12px", borderRadius: "8px", background: active ? "#eef2ff" : "transparent", border: active ? "1px solid #c7d2fe" : "1px solid transparent", color: active ? "#4f46e5" : "#64748b", textDecoration: "none", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
          <button onClick={handleLogout} style={{ marginLeft: "8px", padding: "7px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: "28px", maxWidth: "1600px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 2px 0", letterSpacing: "-0.4px" }}>Executive Dashboard Overview</h2>
            <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Monitor all client accounts, recurring revenues, and upcoming renewals</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/owner/clients" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: "9px", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "13px", boxShadow: "0 3px 10px rgba(79,70,229,0.25)" }}>
              <span>➕</span> Onboard New Client
            </Link>
            <Link href="/owner/announcements" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "9px", color: "#334155", textDecoration: "none", fontWeight: 700, fontSize: "13px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
              <span>📢</span> Broadcast Notice
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "14px", marginBottom: "28px" }}>
          {statCards.map(card => (
            <div key={card.label} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px 20px", position: "relative", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>{card.label}</span>
                <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: card.bg, border: `1px solid ${card.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                  {card.icon}
                </span>
              </div>
              <div style={{ fontSize: "26px", fontWeight: 900, color: card.color, letterSpacing: "-0.5px" }}>{loading ? "..." : card.value}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Renewals & Action Widget */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          {/* Renewals Alert */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>⏰ Renewals & Invoices Due</h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Clients needing payment renewal or currently past due</p>
              </div>
              <Link href="/owner/clients" style={{ fontSize: "12px", color: "#4f46e5", textDecoration: "none", fontWeight: 700 }}>
                View All Clients →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Checking renewals...</div>
            ) : upcomingRenewals.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#16a34a", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0", fontSize: "13px", fontWeight: 600 }}>
                ✨ All clients are currently active and up to date! No immediate dues.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcomingRenewals.map((c: any) => {
                  const due = new Date(c.currentPeriodEnd);
                  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diffDays < 0;

                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: isOverdue ? "#fef2f2" : "#fffbeb", border: `1px solid ${isOverdue ? "#fecaca" : "#fde68a"}`, borderRadius: "10px", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>{c.businessName}</div>
                        <div style={{ fontSize: "12px", color: "#475569" }}>{c.contactEmail} • Fee: <b style={{ color: "#16a34a" }}>₹{c.monthlyFee?.toLocaleString()}/mo</b></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: isOverdue ? "#dc2626" : "#d97706", padding: "3px 8px", background: "#ffffff", border: `1px solid ${isOverdue ? "#fecaca" : "#fde68a"}`, borderRadius: "6px" }}>
                          {isOverdue ? `Overdue by ${Math.abs(diffDays)}d` : diffDays === 0 ? "Due Today" : `Due in ${diffDays}d`}
                        </span>
                        <Link href="/owner/clients" style={{ padding: "6px 12px", background: "#16a34a", borderRadius: "7px", color: "white", textDecoration: "none", fontSize: "12px", fontWeight: 700, boxShadow: "0 1px 2px rgba(22,163,74,0.2)" }}>
                          💳 Collect
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick SaaS Health & Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }}>🚀 Quick Portal Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <a href="/login" target="_blank" style={{ padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#4f46e5", textDecoration: "none", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>📱 Client Login Portal</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>/login ↗</span>
                </a>
                <Link href="/owner/clients" style={{ padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#0f172a", textDecoration: "none", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>🏢 Manage Client Credentials & Quotas</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>→</span>
                </Link>
                <Link href="/owner/announcements" style={{ padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#0f172a", textDecoration: "none", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>📢 Broadcast In-App Notice</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>→</span>
                </Link>
                <Link href="/owner/plans" style={{ padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#0f172a", textDecoration: "none", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>💎 Configure Tier Pricing</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>→</span>
                </Link>
              </div>
            </div>

            <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "14px", padding: "18px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 800, color: "#4338ca", margin: "0 0 4px 0" }}>💡 WhatsApp SaaS Tip</h4>
              <p style={{ fontSize: "12px", color: "#475569", margin: 0, lineHeight: 1.5 }}>
                When you onboard a new client, they will be prompted to set their own secure password upon their first login. You can monitor their Meta WABA token health and message quotas directly from the Clients tab.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
