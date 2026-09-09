"use client";
import React from "react";
import Link from "next/link";

const PLANS = [
  { name: "STARTER", price: "₹999/mo", agents: "3 agents", color: "#3b82f6", desc: "For small businesses starting with WhatsApp automation" },
  { name: "GROWTH", price: "₹2,499/mo", agents: "10 agents", color: "#7c3aed", desc: "Growing teams needing advanced automation & CRM" },
  { name: "ENTERPRISE", price: "₹5,999/mo", agents: "Unlimited", color: "#f59e0b", desc: "Large operations with full feature access & priority support" },
  { name: "CUSTOM", price: "Custom", agents: "Custom", color: "#10b981", desc: "Special pricing and configuration for unique requirements" },
];

export default function OwnerPlansPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>👑</div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#f8fafc" }}>Owner Console</h1>
        </div>
        <nav style={{ display: "flex", gap: "4px" }}>
          {[{ label: "Dashboard", href: "/owner", icon: "📊" }, { label: "Clients", href: "/owner/clients", icon: "🏢" }, { label: "Plans", href: "/owner/plans", icon: "💎" }].map(item => (
            <Link key={item.href} href={item.href} style={{ padding: "8px 14px", borderRadius: "10px", background: item.href === "/owner/plans" ? "rgba(124,58,237,0.2)" : "transparent", border: item.href === "/owner/plans" ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent", color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main style={{ padding: "32px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px 0" }}>Subscription Plans</h2>
        <p style={{ color: "#475569", fontSize: "13px", margin: "0 0 28px 0" }}>Plans are set manually per client in the Clients tab. These are reference pricing tiers.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${plan.color}30`, borderRadius: "18px", padding: "24px", position: "relative", overflow: "hidden" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${plan.color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: plan.color }} />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: plan.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{plan.name}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "#f1f5f9", letterSpacing: "-1px", marginBottom: "4px" }}>{plan.price}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>{plan.agents}</div>
              <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: "1.5" }}>{plan.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "32px", padding: "20px", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "12px" }}>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            💡 <strong style={{ color: "#c4b5fd" }}>Tip:</strong> To change a client's plan or monthly fee, go to <Link href="/owner/clients" style={{ color: "#a78bfa" }}>Clients</Link> → click <strong>✏️ Edit</strong> on the client row.
          </p>
        </div>
      </main>
    </div>
  );
}
