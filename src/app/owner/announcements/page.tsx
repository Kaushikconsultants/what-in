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
  INFO:        { label: "General Info", icon: "📢", bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  WARNING:     { label: "Warning Alert", icon: "⚠️", bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  MAINTENANCE: { label: "Maintenance", icon: "🛠️", bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  SUCCESS:     { label: "Update / Feature", icon: "🎉", bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
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
            const active = item.href === "/owner/announcements";
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

      <main style={{ padding: "28px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 2px 0", letterSpacing: "-0.4px" }}>📢 Global In-App Announcements</h2>
            <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Broadcast maintenance alerts, system notices, and new feature updates live across all client dashboards.</p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}>
            <span>➕</span> Broadcast Announcement
          </button>
        </div>

        {/* Announcements List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "48px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📢</div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0" }}>No Active Announcements</h3>
              <p style={{ fontSize: "13px", margin: 0 }}>Click <b>Broadcast Announcement</b> to publish a notice across all client accounts.</p>
            </div>
          ) : (
            announcements.map(a => {
              const typeCfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.INFO;
              return (
                <div key={a.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: "300px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: typeCfg.bg, border: `1px solid ${typeCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                      {typeCfg.icon}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{a.title}</span>
                        <span style={{ padding: "2px 8px", background: typeCfg.bg, border: `1px solid ${typeCfg.border}`, color: typeCfg.text, borderRadius: "6px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>
                          {typeCfg.label}
                        </span>
                        <span style={{ padding: "2px 8px", background: a.isActive ? "#dcfce7" : "#f1f5f9", color: a.isActive ? "#15803d" : "#64748b", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                          {a.isActive ? "● LIVE ACTIVE" : "○ INACTIVE"}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 6px 0", lineHeight: 1.5 }}>{a.message}</p>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        📅 Created: {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={() => handleToggle(a)} style={{ padding: "7px 12px", background: a.isActive ? "#fffbeb" : "#f0fdf4", border: a.isActive ? "1px solid #fde68a" : "1px solid #bbf7d0", borderRadius: "8px", color: a.isActive ? "#92400e" : "#166534", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                      {a.isActive ? "Pause Notice" : "Activate Notice"}
                    </button>
                    <button onClick={() => handleDelete(a.id)} style={{ padding: "7px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modal: Add Announcement */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: "20px", margin: 0 }}>📢 Broadcast In-App Notice</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>This message will display at the top of all client dashboards.</p>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Notice Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {[
                    { type: "INFO", label: "General Update", icon: "📢" },
                    { type: "MAINTENANCE", label: "Maintenance Notice", icon: "🛠️" },
                    { type: "WARNING", label: "Urgent Warning", icon: "⚠️" },
                    { type: "SUCCESS", label: "New Feature / Launch", icon: "🎉" },
                  ].map(t => (
                    <button key={t.type} type="button" onClick={() => setForm({ ...form, type: t.type })} style={{ padding: "10px 12px", background: form.type === t.type ? "#eef2ff" : "#f8fafc", border: form.type === t.type ? "1px solid #6366f1" : "1px solid #e2e8f0", borderRadius: "8px", color: form.type === t.type ? "#4f46e5" : "#475569", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Notice Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Scheduled System Upgrade Tonight" required style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Message Body *</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="e.g. What-In will undergo scheduled server optimization at 11:30 PM IST for ~15 minutes. WhatsApp automated webhooks will continue processing uninterrupted." required style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", minHeight: "80px", resize: "vertical", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontSize: "14px" }}>
                  {submitting ? "Broadcasting..." : "🚀 Publish Announcement Live"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "13px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#64748b", cursor: "pointer", fontSize: "14px" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
