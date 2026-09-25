"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PLAN_TIERS,
  MASTER_MODULES,
  INDUSTRY_MODULE_PRESETS,
  ALL_MODULE_KEYS,
  ModuleKey
} from "@/lib/moduleRegistry";

export default function OwnerPlansPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<"TIERS" | "MATRIX" | "PRESETS">("TIERS");

  const handleLogout = async () => {
    sessionStorage.removeItem("owner_authed");
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Sticky Header */}
      <header style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "white", boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.2px" }}>WhatMore Super-Admin Console</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Plan Tiers & 13-Module Architecture</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients & Modules", href: "/owner/clients", icon: "🏢" },
            { label: "Announcements", href: "/owner/announcements", icon: "📢" },
            { label: "Plans & Matrix", href: "/owner/plans", icon: "💎" },
          ].map(item => {
            const active = item.href === "/owner/plans";
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
        {/* Title & View Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>💎 Plan Tiers & Modular Entitlements</h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Configure standard subscription packages, view the 13-module feature matrix, and explore industry presets</p>
          </div>

          <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "4px", gap: "4px" }}>
            {[
              { id: "TIERS", label: "💎 Plan Cards", icon: "📦" },
              { id: "MATRIX", label: "📊 Feature Matrix (13 Modules)", icon: "🎛️" },
              { id: "PRESETS", label: "🏭 Industry Presets", icon: "✨" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: selectedTab === tab.id ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
                  color: selectedTab === tab.id ? "#ffffff" : "#94a3b8",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: selectedTab === tab.id ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* VIEW 1: Standard Plan Cards */}
        {selectedTab === "TIERS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "22px" }}>
            {DEFAULT_PLAN_TIERS.map(plan => (
              <div
                key={plan.id}
                style={{
                  background: "rgba(15, 23, 42, 0.65)",
                  border: `1px solid ${plan.border || "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "20px",
                  padding: "26px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backdropFilter: "blur(12px)",
                  position: "relative",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span style={{ padding: "4px 12px", background: plan.bg, border: `1px solid ${plan.border}`, borderRadius: "999px", color: plan.color, fontSize: "11px", fontWeight: 900, letterSpacing: "0.05em" }}>
                      {plan.badge}
                    </span>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700 }}>
                      👥 {plan.maxAgents} Agents
                    </span>
                  </div>

                  <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", margin: "0 0 6px 0" }}>{plan.name}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "32px", fontWeight: 900, color: "#ffffff", letterSpacing: "-1px" }}>₹{plan.monthlyFee.toLocaleString()}</span>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>/ month</span>
                  </div>

                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                    {plan.tagline}
                  </p>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "12px 14px", marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Monthly Msgs</div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#38bdf8" }}>{plan.monthlyMessageQuota.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>AI Replies</div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#a855f7" }}>{plan.monthlyAiQuota.toLocaleString()}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                      <span>Included Modules</span>
                      <span style={{ color: "#818cf8" }}>{plan.modules.length} / 13 Active</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {plan.modules.map(modKey => {
                        const m = MASTER_MODULES[modKey];
                        return (
                          <span
                            key={modKey}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#e2e8f0",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>{m.icon}</span> {m.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Link
                    href="/owner/clients"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "10px",
                      background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
                      border: "1px solid rgba(99, 102, 241, 0.4)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 800,
                      transition: "all 0.15s ease"
                    }}
                  >
                    Assign to Clients in Matrix →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: 13-Module Matrix Table */}
        {selectedTab === "MATRIX" && (
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "20px", overflow: "hidden", backdropFilter: "blur(12px)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "#ffffff" }}>Master 13-Module Feature Matrix</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>Granular breakdown of which business modules are bundled into each plan tier</p>
              </div>
              <span style={{ fontSize: "12px", color: "#818cf8", fontWeight: 700 }}>13 Total Modules</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <th style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Module</th>
                    <th style={{ padding: "14px 16px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Category</th>
                    <th style={{ padding: "14px 16px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Target Industry</th>
                    {DEFAULT_PLAN_TIERS.map(p => (
                      <th key={p.id} style={{ padding: "14px 16px", fontSize: "12px", color: "#ffffff", fontWeight: 900, textAlign: "center" }}>
                        <div>{p.name}</div>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>₹{p.monthlyFee}/mo</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULE_KEYS.map((modKey, idx) => {
                    const m = MASTER_MODULES[modKey];
                    return (
                      <tr key={modKey} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)" }}>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "20px" }}>{m.icon}</span>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "13px", color: "#ffffff" }}>{m.name}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{m.tagline}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px", fontSize: "10px", fontWeight: 800, color: "#94a3b8" }}>
                            {m.category}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "11px", color: "#94a3b8" }}>
                          {m.industryFit.slice(0, 2).join(", ")}
                        </td>
                        {DEFAULT_PLAN_TIERS.map(p => {
                          const hasModule = p.modules.includes(modKey);
                          return (
                            <td key={p.id} style={{ padding: "14px 16px", textAlign: "center" }}>
                              {hasModule ? (
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "14px", fontWeight: 900 }}>
                                  ✓
                                </span>
                              ) : (
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.03)", color: "#475569", fontSize: "12px" }}>
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: Industry Presets */}
        {selectedTab === "PRESETS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {INDUSTRY_MODULE_PRESETS.map(preset => (
              <div key={preset.name} style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "20px", padding: "24px", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "28px", width: "48px", height: "48px", borderRadius: "14px", background: "rgba(99, 102, 241, 0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {preset.icon}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff" }}>{preset.name}</h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#818cf8" }}>{preset.modules.length} Modules Bundled</p>
                  </div>
                </div>

                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px 0", lineHeight: 1.5 }}>
                  {preset.description}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                  {preset.modules.map(modKey => {
                    const m = MASTER_MODULES[modKey];
                    return (
                      <span key={modKey} style={{ padding: "3px 8px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", fontSize: "11px", color: "#cbd5e1", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>{m.icon}</span> {m.name}
                      </span>
                    );
                  })}
                </div>

                <Link href="/owner/clients" style={{ display: "block", textAlign: "center", padding: "9px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", color: "#ffffff", textDecoration: "none", fontSize: "12px", fontWeight: 800 }}>
                  Apply Preset in Clients Tab →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
