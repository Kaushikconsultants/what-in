"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  toggleAnnouncementAction,
  deleteAnnouncementAction
} from "@/app/actions/ownerPortalActions";

const TYPE_CONFIG: Record<string, { label: string; icon: string; bg: string; border: string; text: string }> = {
  INFO:        { label: "General Info", icon: "📢", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa" },
  WARNING:     { label: "Warning Alert", icon: "⚠️", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", text: "#fbbf24" },
  MAINTENANCE: { label: "Maintenance", icon: "🛠️", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", text: "#f87171" },
  SUCCESS:     { label: "Update / Feature", icon: "🎉", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)", text: "#34d399" },
};

export default function OwnerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "INFO",
    targetPlan: "ALL",
    expiresAt: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const authed = sessionStorage.getItem("owner_authed");
    if (authed === "1") {
      load();
    } else {
      fetch("/api/owner/verify").then(r => {
        if (!r.ok) router.push("/owner/login");
        else { sessionStorage.setItem("owner_authed", "1"); load(); }
      }).catch(() => router.push("/owner/login"));
    }
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await getAnnouncementsAction();
    if (res.success) setAnnouncements(res.announcements);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSubmitting(true);
    const res = await createAnnouncementAction(form);
    setSubmitting(false);
    if (res.success) {
      setShowAdd(false);
      setForm({ title: "", message: "", type: "INFO", targetPlan: "ALL", expiresAt: "" });
      load();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleToggle = async (a: any) => {
    const res = await toggleAnnouncementAction(a.id, !a.isActive);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    const res = await deleteAnnouncementAction(id);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("owner_authed");
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Header */}
      <header style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "white", boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.2px" }}>WhatMore Super-Admin Console</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>In-App Announcements & Broadcasts</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients & Modules", href: "/owner/clients", icon: "🏢" },
            { label: "Announcements", href: "/owner/announcements", icon: "📢" },
            { label: "Plans & Matrix", href: "/owner/plans", icon: "💎" },
          ].map(item => {
            const active = item.href === "/owner/announcements";
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

      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>📢 Tenant In-App Broadcasts</h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Publish alerts, feature update notes, and maintenance marquee notices across all client dashboards</p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none", borderRadius: "12px", color: "white", fontWeight: 800, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 20px rgba(99, 102, 241, 0.35)" }}>
            <span>➕</span> Create New Broadcast
          </button>
        </div>

        {/* Announcements List */}
        <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", overflow: "hidden", backdropFilter: "blur(12px)" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Loading broadcasts...</div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📢</div>
              <h3 style={{ fontSize: "16px", color: "#ffffff", margin: "0 0 6px 0" }}>No broadcasts published yet</h3>
              <p style={{ fontSize: "13px", margin: 0 }}>Click Create New Broadcast above to post your first system notification.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {announcements.map((a, idx) => {
                const conf = TYPE_CONFIG[a.type] || TYPE_CONFIG.INFO;
                return (
                  <div key={a.id} style={{ padding: "20px 24px", borderBottom: idx === announcements.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                    <div style={{ display: "flex", gap: "14px", flex: 1 }}>
                      <span style={{ fontSize: "24px", width: "42px", height: "42px", borderRadius: "12px", background: conf.bg, border: `1px solid ${conf.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {conf.icon}
                      </span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 800, fontSize: "15px", color: "#ffffff" }}>{a.title}</span>
                          <span style={{ padding: "2px 8px", background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: "6px", fontSize: "10px", fontWeight: 800, color: conf.text }}>
                            {conf.label}
                          </span>
                          <span style={{ fontSize: "11px", color: a.isActive ? "#34d399" : "#f87171", fontWeight: 700 }}>
                            {a.isActive ? "● LIVE" : "○ PAUSED"}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>{a.message}</p>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Target: <b style={{ color: "#cbd5e1" }}>{a.targetPlan}</b> • Created {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleToggle(a)} style={{ padding: "6px 12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: a.isActive ? "#fbbf24" : "#34d399", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        {a.isActive ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => handleDelete(a.id)} style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#f87171", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(10px)" }}>
            <div style={{ background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "24px", padding: "30px", width: "100%", maxWidth: "560px", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>📢 Post Tenant Broadcast</h3>
                <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Title *</label>
                  <input type="text" required placeholder="e.g. Scheduled Meta API Upgrade" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Message *</label>
                  <textarea rows={3} required placeholder="Describe the announcement or notice..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}>
                      <option value="INFO">General Info</option>
                      <option value="WARNING">Warning Alert</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="SUCCESS">Feature Update</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Target Plan</label>
                    <select value={form.targetPlan} onChange={e => setForm({ ...form, targetPlan: e.target.value })} style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}>
                      <option value="ALL">All Clients (Universal)</option>
                      <option value="STARTER">Starter Tier Only</option>
                      <option value="GROWTH">Growth Tier Only</option>
                      <option value="ENTERPRISE">Enterprise Tier Only</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "10px 18px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                    {submitting ? "Publishing..." : "🚀 Publish Broadcast"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
