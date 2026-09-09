"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOwnerClientsAction,
  createClientAction,
  markClientPaidAction,
  updateClientPlanAction,
  toggleClientBlockAction,
  deleteClientAction,
  syncSubscriptionStatusesAction,
  registerWebhookForClientAction
} from "@/app/actions/ownerPortalActions";
import { useRouter } from "next/navigation";

const PLANS = ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE", "CUSTOM"];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:   { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Active" },
  TRIAL:    { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", label: "Trial" },
  PAST_DUE: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "Past Due" },
  BLOCKED:  { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", label: "Blocked" },
};

export default function OwnerClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({ businessName: "", contactEmail: "", contactPhone: "", subscriptionPlan: "STARTER", monthlyFee: 999, maxAgents: 3, notes: "", ownerWhatsApp: "", wabaId: "", phoneId: "", metaAccessToken: "", webhookVerifyToken: "", phoneNumber: "", shopifyDomain: "", shopifyToken: "" });
  const [showMetaFields, setShowMetaFields] = useState(false);
  const [showEditMeta, setShowEditMeta] = useState(false);

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
    await syncSubscriptionStatusesAction();
    const res = await getOwnerClientsAction();
    if (res.success) setClients(res.clients);
    setLoading(false);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createClientAction(form);
    if (res.success) { setShowAdd(false); setForm({ businessName: "", contactEmail: "", contactPhone: "", subscriptionPlan: "STARTER", monthlyFee: 999, maxAgents: 3, notes: "", ownerWhatsApp: "", wabaId: "", phoneId: "", metaAccessToken: "", webhookVerifyToken: "", phoneNumber: "", shopifyDomain: "", shopifyToken: "" }); load(); }
    else alert("Error: " + res.error);
  };

  const handleMarkPaid = async (clientId: string) => {
    setMarkingPaid(clientId);
    const res = await markClientPaidAction(clientId, "Manually marked paid by owner");
    if (res.success) load();
    else alert("Error: " + res.error);
    setMarkingPaid(null);
  };

  const handleToggleBlock = async (client: any) => {
    if (!confirm(`Are you sure you want to ${client.subscriptionStatus === "BLOCKED" ? "unblock" : "block"} ${client.businessName}?`)) return;
    const res = await toggleClientBlockAction(client.id, client.subscriptionStatus !== "BLOCKED");
    if (res.success) load(); else alert("Error: " + res.error);
  };

  const [registeringWebhook, setRegisteringWebhook] = useState<string | null>(null);
  const handleRegisterWebhook = async (client: any) => {
    setRegisteringWebhook(client.id);
    const res = await registerWebhookForClientAction(client.id);
    if (res.success) {
      alert(`✅ Webhook registered successfully!\n\nWebhook URL: ${res.webhookUrl}\nVerify Token: ${res.verifyToken}\n\nThis URL is now active on Meta.`);
    } else {
      alert(`⚠️ Webhook registration: ${res.error}\n\nYou can register manually at:\nhttps://developers.facebook.com\n\nWebhook URL to use: ${res.webhookUrl || "Set WABA ID + Token first"}`);
    }
    setRegisteringWebhook(null);
  };

  const handleDelete = async (client: any) => {
    if (!confirm(`PERMANENTLY delete ${client.businessName}? This cannot be undone.`)) return;
    const res = await deleteClientAction(client.id);
    if (res.success) load(); else alert("Error: " + res.error);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;
    const res = await updateClientPlanAction(editClient.id, {
      subscriptionPlan: editClient.subscriptionPlan,
      monthlyFee: editClient.monthlyFee,
      maxAgents: editClient.maxAgents,
      notes: editClient.notes,
      ownerWhatsApp: editClient.ownerWhatsApp,
      wabaId: editClient.wabaId,
      phoneId: editClient.phoneId,
      metaAccessToken: editClient.metaAccessToken,
      webhookVerifyToken: editClient.webhookVerifyToken,
      phoneNumber: editClient.phoneNumber,
      shopifyDomain: editClient.shopifyDomain,
      shopifyToken: editClient.shopifyToken,
    });
    if (res.success) { setEditClient(null); load(); } else alert("Error: " + res.error);
  };

  const filtered = clients.filter(c =>
    c.businessName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  const webhookBase = "https://what-in.tinkal.in";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#f8fafc" }}>Owner Console</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>What-In SaaS Management</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {[{ label: "Dashboard", href: "/owner", icon: "📊" }, { label: "Clients", href: "/owner/clients", icon: "🏢" }, { label: "Plans", href: "/owner/plans", icon: "💎" }].map(item => (
            <Link key={item.href} href={item.href} style={{ padding: "8px 14px", borderRadius: "10px", background: item.href === "/owner/clients" ? "rgba(124,58,237,0.2)" : "transparent", border: item.href === "/owner/clients" ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent", color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{ padding: "32px" }}>
        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f1f5f9", margin: "0 0 2px 0" }}>Client Management</h2>
            <p style={{ color: "#475569", fontSize: "13px", margin: 0 }}>{clients.length} clients onboarded</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." style={{ padding: "9px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#e2e8f0", fontSize: "13px", outline: "none", width: "220px" }} />
            <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
              ➕ Add Client
            </button>
          </div>
        </div>

        {/* Clients Table */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Business", "Plan", "Status", "Fee/mo", "Agents", "Period End", "Webhook URL", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#475569" }}>Loading clients...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#475569" }}>No clients yet. Add your first client! 🚀</td></tr>
              ) : filtered.map(client => {
                const s = STATUS_COLORS[client.subscriptionStatus] || STATUS_COLORS.TRIAL;
                const periodEnd = client.currentPeriodEnd ? new Date(client.currentPeriodEnd).toLocaleDateString("en-IN") : "—";
                const webhookUrl = client.customWebhookUrl || `${webhookBase}/api/whatsapp/webhook/${client.webhookClientId}`;
                return (
                  <tr key={client.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "14px" }}>{client.businessName}</div>
                      <div style={{ color: "#475569", fontSize: "12px" }}>{client.contactEmail}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "3px 10px", background: "rgba(124,58,237,0.15)", borderRadius: "6px", color: "#a78bfa", fontSize: "12px", fontWeight: 700 }}>{client.subscriptionPlan}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 10px", background: s.bg, borderRadius: "6px", color: s.color, fontSize: "12px", fontWeight: 700 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#10b981", fontWeight: 700, fontSize: "14px" }}>₹{client.monthlyFee?.toLocaleString()}</td>
                    <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "13px" }}>{client.agents?.length ?? 0} / {client.maxAgents}</td>
                    <td style={{ padding: "14px 16px", color: client.currentPeriodEnd && new Date(client.currentPeriodEnd) < new Date() ? "#ef4444" : "#94a3b8", fontSize: "13px" }}>{periodEnd}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div>
                          <code style={{ fontSize: "10px", color: "#64748b", background: "rgba(255,255,255,0.05)", padding: "3px 6px", borderRadius: "4px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{webhookUrl}</code>
                          {client.customWebhookUrl && (
                            <span style={{ fontSize: "9px", color: "#475569", marginTop: "2px", display: "block" }}>📌 Custom (Meta registered)</span>
                          )}
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(webhookUrl); }} style={{ background: "rgba(124,58,237,0.2)", border: "none", borderRadius: "5px", color: "#a78bfa", cursor: "pointer", fontSize: "11px", padding: "3px 7px" }} title="Copy">📋</button>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        <button onClick={() => handleMarkPaid(client.id)} disabled={markingPaid === client.id} style={{ padding: "5px 10px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "7px", color: "#10b981", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                          {markingPaid === client.id ? "..." : "✅ Mark Paid"}
                        </button>
                        <button onClick={() => setEditClient({...client})} style={{ padding: "5px 10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "7px", color: "#60a5fa", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>✏️ Edit</button>
                        <button onClick={() => handleToggleBlock(client)} style={{ padding: "5px 10px", background: client.subscriptionStatus === "BLOCKED" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", border: client.subscriptionStatus === "BLOCKED" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)", borderRadius: "7px", color: client.subscriptionStatus === "BLOCKED" ? "#10b981" : "#f59e0b", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                          {client.subscriptionStatus === "BLOCKED" ? "🔓 Unblock" : "🔒 Block"}
                        </button>
                        <button onClick={() => handleRegisterWebhook(client)} disabled={registeringWebhook === client.id} title="Auto-register Meta webhook" style={{ padding: "5px 10px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "7px", color: "#a78bfa", fontSize: "11px", fontWeight: 700, cursor: registeringWebhook === client.id ? "not-allowed" : "pointer" }}>
                          {registeringWebhook === client.id ? "⏳" : "🔗 Webhook"}
                        </button>
                        <button onClick={() => handleDelete(client)} style={{ padding: "5px 10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "7px", color: "#f87171", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Client Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: "18px", margin: "0 0 20px 0" }}>🏢 Onboard New Client</h3>
            <form onSubmit={handleAddClient} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "Business Name *", key: "businessName", type: "text", placeholder: "e.g. Acme Clothing Pvt Ltd" },
                { label: "Admin Email *", key: "contactEmail", type: "email", placeholder: "admin@acme.com" },
                { label: "Contact Phone", key: "contactPhone", type: "tel", placeholder: "+91 99999 00000" },
                { label: "Owner WhatsApp (for blocked screen)", key: "ownerWhatsApp", type: "tel", placeholder: "+91 98765 43210" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder} required={f.label.includes("*")} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Plan</label>
                  <select value={form.subscriptionPlan} onChange={e => setForm({...form, subscriptionPlan: e.target.value})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Fee/mo (₹)</label>
                  <input type="number" value={form.monthlyFee} onChange={e => setForm({...form, monthlyFee: Number(e.target.value)})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Max Agents</label>
                  <input type="number" min="1" max="100" value={form.maxAgents} onChange={e => setForm({...form, maxAgents: Number(e.target.value)})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              {/* Meta API credentials toggle */}
              <div>
                <button type="button" onClick={() => setShowMetaFields(p => !p)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#94a3b8", padding: "8px 14px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                  {showMetaFields ? "▲ Hide" : "▼ Show"} Meta / Shopify Credentials (optional — can be set later by client admin)
                </button>
                {showMetaFields && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {[
                      { label: "WABA ID", key: "wabaId", placeholder: "WhatsApp Business Account ID" },
                      { label: "Phone Number ID", key: "phoneId", placeholder: "Meta Phone Number ID" },
                      { label: "Phone Number", key: "phoneNumber", placeholder: "+91 99999 00000" },
                      { label: "Meta Access Token", key: "metaAccessToken", placeholder: "Permanent access token" },
                      { label: "Webhook Verify Token", key: "webhookVerifyToken", placeholder: "Custom verify token" },
                      { label: "Shopify Domain", key: "shopifyDomain", placeholder: "store.myshopify.com" },
                      { label: "Shopify Token", key: "shopifyToken", placeholder: "shpat_..." },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>{f.label}</label>
                        <input type={f.key.toLowerCase().includes("token") ? "password" : "text"} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder} style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Internal notes..." style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", minHeight: "70px", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>Create Client</button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "12px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "500px" }}>
            <h3 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: "18px", margin: "0 0 20px 0" }}>✏️ Edit Client — {editClient.businessName}</h3>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Plan</label>
                  <select value={editClient.subscriptionPlan} onChange={e => setEditClient({...editClient, subscriptionPlan: e.target.value})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Fee/mo (₹)</label>
                  <input type="number" value={editClient.monthlyFee} onChange={e => setEditClient({...editClient, monthlyFee: Number(e.target.value)})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Max Agents</label>
                  <input type="number" min="1" max="100" value={editClient.maxAgents} onChange={e => setEditClient({...editClient, maxAgents: Number(e.target.value)})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Owner WhatsApp (for blocked screen)</label>
                <input type="tel" value={editClient.ownerWhatsApp || ""} onChange={e => setEditClient({...editClient, ownerWhatsApp: e.target.value})} placeholder="+91 98765 43210" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* Meta credentials in Edit */}
              <div>
                <button type="button" onClick={() => setShowEditMeta(p => !p)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#94a3b8", padding: "8px 14px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                  {showEditMeta ? "▲ Hide" : "▼ Show"} Meta / Shopify Credentials
                </button>
                {showEditMeta && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {[
                      { label: "WABA ID", key: "wabaId", placeholder: "WhatsApp Business Account ID" },
                      { label: "Phone Number ID", key: "phoneId", placeholder: "Meta Phone Number ID" },
                      { label: "Phone Number", key: "phoneNumber", placeholder: "+91 99999 00000" },
                      { label: "Meta Access Token", key: "metaAccessToken", placeholder: "Permanent access token" },
                      { label: "Webhook Verify Token", key: "webhookVerifyToken", placeholder: "Custom verify token" },
                      { label: "Shopify Domain", key: "shopifyDomain", placeholder: "store.myshopify.com" },
                      { label: "Shopify Token", key: "shopifyToken", placeholder: "shpat_..." },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>{f.label}</label>
                        <input type={f.key.toLowerCase().includes("token") ? "password" : "text"} value={editClient[f.key] || ""} onChange={e => setEditClient({...editClient, [f.key]: e.target.value})} placeholder={f.placeholder} style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Notes</label>
                <textarea value={editClient.notes || ""} onChange={e => setEditClient({...editClient, notes: e.target.value})} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", minHeight: "70px", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>Save Changes</button>
                <button type="button" onClick={() => setEditClient(null)} style={{ padding: "12px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
