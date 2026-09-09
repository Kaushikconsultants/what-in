"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    name: "STARTER",
    price: "₹999",
    cycle: "per month",
    agents: "Up to 3 Agent Logins",
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
    desc: "For small businesses starting with automated WhatsApp messaging, inbox, and AI auto-reply.",
    features: ["3 Team Agent Accounts", "5,000 Messages / mo", "500 AI Auto-Replies / mo", "Standard Webhooks", "Community Support"]
  },
  {
    name: "GROWTH",
    price: "₹2,499",
    cycle: "per month",
    agents: "Up to 10 Agent Logins",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    desc: "Growing teams needing multi-agent collaboration, advanced chatbots, and Shopify commerce sync.",
    features: ["10 Team Agent Accounts", "25,000 Messages / mo", "2,500 AI Auto-Replies / mo", "Shopify E-Commerce Sync", "Flows & Interactive Bots"]
  },
  {
    name: "ENTERPRISE",
    price: "₹5,999",
    cycle: "per month",
    agents: "Unlimited Agents",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    desc: "High-volume commerce brands with custom webhook routing, dedicated throughput, and VIP SLA.",
    features: ["Unlimited Team Agents", "100,000 Messages / mo", "10,000 AI Auto-Replies / mo", "Priority Graph API Queue", "Custom CRM Webhook Endpoints"]
  },
  {
    name: "CUSTOM",
    price: "Custom",
    cycle: "tailored billing",
    agents: "Custom Agents & Quotas",
    color: "#10b981",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    desc: "Special corporate agreements with custom message limits, dedicated databases, or white-labeling.",
    features: ["Custom Agent Quota", "Custom Volume Limits", "White-Label Setup", "Dedicated Support Manager", "Custom Integrations"]
  },
];

export default function OwnerPlansPage() {
  const router = useRouter();

  const handleLogout = async () => {
    sessionStorage.removeItem("owner_authed");
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner/login");
  };

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
            const active = item.href === "/owner/plans";
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
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 2px 0", letterSpacing: "-0.4px" }}>💎 SaaS Subscription Tier Reference</h2>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Standard pricing tiers and feature allocations for What-In clients. Plans and custom monthly fees are assigned per client in the Clients tab.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", position: "relative", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ padding: "4px 10px", background: plan.bg, border: `1px solid ${plan.border}`, borderRadius: "999px", color: plan.color, fontSize: "11px", fontWeight: 800, letterSpacing: "0.05em" }}>
                    {plan.name}
                  </span>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: plan.color }} />
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.8px" }}>{plan.price}</span>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{plan.cycle}</span>
                </div>
                
                <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 700, marginBottom: "14px" }}>
                  👥 {plan.agents}
                </div>

                <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 16px 0", lineHeight: "1.5" }}>
                  {plan.desc}
                </p>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Plan Inclusions</div>
                  <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ fontSize: "12px", color: "#334155" }}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <Link href="/owner/clients" style={{ display: "block", textAlign: "center", padding: "9px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", textDecoration: "none", fontSize: "12px", fontWeight: 700, transition: "background 0.15s" }}>
                  Assign to Client →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "28px", padding: "18px 20px", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "14px", display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "24px" }}>💡</span>
          <div>
            <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", fontWeight: 800, color: "#4338ca" }}>Customizable Client Pricing</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
              You can override any client's monthly fee, agent seat limit, or message/AI quotas at any time. Go to <Link href="/owner/clients" style={{ color: "#4f46e5", fontWeight: 700 }}>Clients</Link> and click <b>✏️ Edit</b>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
