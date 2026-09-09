"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOwnerClientsAction,
  createClientAction,
  recordClientPaymentAction,
  getClientPaymentsAction,
  updateClientPlanAction,
  updateClientDueDateAction,
  updateClientQuotasAction,
  checkClientMetaHealthAction,
  toggleClientBlockAction,
  deleteClientAction,
  syncSubscriptionStatusesAction,
  registerWebhookForClientAction,
  loginAsClientAction
} from "@/app/actions/ownerPortalActions";
import { useRouter } from "next/navigation";

const PLANS = ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE", "CUSTOM"];

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string; label: string }> = {
  ACTIVE:   { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", label: "Active" },
  TRIAL:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", label: "Trial" },
  PAST_DUE: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", label: "Past Due" },
  BLOCKED:  { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", label: "Blocked" },
};

const PAYMENT_METHODS = [
  "UPI (GPay / PhonePe / Paytm)",
  "Bank Transfer (NEFT / IMPS / RTGS)",
  "Cash",
  "Cheque",
  "Card / Payment Gateway",
  "Other"
];

export default function OwnerClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Modals state
  const [showAdd, setShowAdd] = useState(false);
  const [addSuccessInfo, setAddSuccessInfo] = useState<any | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit modal
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editMsgQuota, setEditMsgQuota] = useState(5000);
  const [editAiQuota, setEditAiQuota] = useState(500);
  const [showEditMeta, setShowEditMeta] = useState(false);

  // Payment Recording Modal
  const [paymentClient, setPaymentClient] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("UPI (GPay / PhonePe / Paytm)");
  const [payRef, setPayRef] = useState<string>("");
  const [payCycleMonths, setPayCycleMonths] = useState<number>(1);
  const [payCustomDueDate, setPayCustomDueDate] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Receipts / Payment History Modal
  const [receiptsClient, setReceiptsClient] = useState<any | null>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Single Printable Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Meta Health Modal
  const [metaHealthResult, setMetaHealthResult] = useState<any | null>(null);
  const [checkingMetaId, setCheckingMetaId] = useState<string | null>(null);

  // Quick action loaders
  const [registeringWebhook, setRegisteringWebhook] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Add Form state
  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    adminPassword: "",
    contactPhone: "",
    subscriptionPlan: "STARTER",
    monthlyFee: 999,
    maxAgents: 3,
    monthlyMessageQuota: 5000,
    monthlyAiQuota: 500,
    initialStatus: "ACTIVE",
    notes: "",
    ownerWhatsApp: "",
    wabaId: "",
    phoneId: "",
    metaAccessToken: "",
    webhookVerifyToken: "",
    phoneNumber: "",
    shopifyDomain: "",
    shopifyToken: ""
  });
  const [showMetaFields, setShowMetaFields] = useState(false);

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

  const generateRandomPassword = () => {
    const pass = "WhatIn@" + Math.floor(100000 + Math.random() * 900000);
    setForm(p => ({ ...p, adminPassword: pass }));
  };

  const handleOpenAdd = () => {
    const defaultPass = "WhatIn@" + Math.floor(100000 + Math.random() * 900000);
    setForm({
      businessName: "",
      contactEmail: "",
      adminPassword: defaultPass,
      contactPhone: "",
      subscriptionPlan: "STARTER",
      monthlyFee: 999,
      maxAgents: 3,
      monthlyMessageQuota: 5000,
      monthlyAiQuota: 500,
      initialStatus: "ACTIVE",
      notes: "",
      ownerWhatsApp: "",
      wabaId: "",
      phoneId: "",
      metaAccessToken: "",
      webhookVerifyToken: "",
      phoneNumber: "",
      shopifyDomain: "",
      shopifyToken: ""
    });
    setShowAdd(true);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createClientAction(form);
    if (res.success) {
      setShowAdd(false);
      setAddSuccessInfo({
        businessName: form.businessName,
        email: form.contactEmail,
        password: form.adminPassword || res.defaultPassword,
        loginUrl: "https://what-in.tinkal.in/login"
      });
      load();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleOpenPayment = (client: any) => {
    setPaymentClient(client);
    setPayAmount(client.monthlyFee || 999);
    setPayMethod("UPI (GPay / PhonePe / Paytm)");
    setPayRef("");
    setPayCycleMonths(1);
    setPayNotes("");

    const base = client.currentPeriodEnd && new Date(client.currentPeriodEnd) > new Date()
      ? new Date(client.currentPeriodEnd)
      : new Date();
    const nextDate = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    setPayCustomDueDate(nextDate.toISOString().split("T")[0]);
  };

  const handleCycleChange = (months: number) => {
    setPayCycleMonths(months);
    if (paymentClient) {
      setPayAmount((paymentClient.monthlyFee || 0) * months);
      const base = paymentClient.currentPeriodEnd && new Date(paymentClient.currentPeriodEnd) > new Date()
        ? new Date(paymentClient.currentPeriodEnd)
        : new Date();
      const nextDate = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);
      setPayCustomDueDate(nextDate.toISOString().split("T")[0]);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentClient) return;
    setIsSubmittingPay(true);

    const targetDueDate = payCustomDueDate ? new Date(payCustomDueDate) : new Date(Date.now() + payCycleMonths * 30 * 24 * 60 * 60 * 1000);

    const res = await recordClientPaymentAction({
      clientId: paymentClient.id,
      amount: payAmount,
      paymentMethod: payMethod,
      transactionRef: payRef,
      periodEnd: targetDueDate,
      notes: payNotes || `Renewed for ${payCycleMonths} month(s)`
    });

    setIsSubmittingPay(false);
    if (res.success) {
      setPaymentClient(null);
      load();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleOpenReceipts = async (client: any) => {
    setReceiptsClient(client);
    setLoadingPayments(true);
    const res = await getClientPaymentsAction(client.id);
    if (res.success) {
      setPaymentsHistory(res.payments);
    } else {
      alert("Error loading payments: " + res.error);
    }
    setLoadingPayments(false);
  };

  const handleCheckMetaHealth = async (client: any) => {
    setCheckingMetaId(client.id);
    const res = await checkClientMetaHealthAction(client.id);
    setCheckingMetaId(null);
    if (res.success) {
      setMetaHealthResult(res);
    } else {
      alert("Error checking Meta health: " + res.error);
    }
  };

  const handleOpenEdit = (client: any) => {
    setEditClient({ ...client });
    setEditPassword(client.adminPassword || "");
    setEditMsgQuota(client.monthlyMessageQuota || 5000);
    setEditAiQuota(client.monthlyAiQuota || 500);
    if (client.currentPeriodEnd) {
      try {
        setEditDueDate(new Date(client.currentPeriodEnd).toISOString().split("T")[0]);
      } catch {
        setEditDueDate("");
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;
    
    const res = await updateClientPlanAction(editClient.id, {
      subscriptionPlan: editClient.subscriptionPlan,
      monthlyFee: Number(editClient.monthlyFee),
      maxAgents: Number(editClient.maxAgents),
      notes: editClient.notes,
      ownerWhatsApp: editClient.ownerWhatsApp,
      adminPassword: editPassword,
      wabaId: editClient.wabaId,
      phoneId: editClient.phoneId,
      metaAccessToken: editClient.metaAccessToken,
      webhookVerifyToken: editClient.webhookVerifyToken,
      phoneNumber: editClient.phoneNumber,
      shopifyDomain: editClient.shopifyDomain,
      shopifyToken: editClient.shopifyToken,
    });

    await updateClientQuotasAction(editClient.id, {
      monthlyMessageQuota: editMsgQuota,
      monthlyAiQuota: editAiQuota
    });

    if (editDueDate) {
      await updateClientDueDateAction(editClient.id, editDueDate);
    }

    if (res.success) {
      setEditClient(null);
      load();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleResetQuotas = async (clientId: string) => {
    if (!confirm("Reset this month's message & AI usage counters back to 0 for this client?")) return;
    const res = await updateClientQuotasAction(clientId, { resetCounts: true });
    if (res.success) {
      alert("✅ Quota counters reset to 0.");
      load();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleToggleBlock = async (client: any) => {
    if (!confirm(`Are you sure you want to ${client.subscriptionStatus === "BLOCKED" ? "unblock" : "block"} ${client.businessName}?`)) return;
    const res = await toggleClientBlockAction(client.id, client.subscriptionStatus !== "BLOCKED");
    if (res.success) load(); else alert("Error: " + res.error);
  };

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

  const handleGhostLogin = async (client: any) => {
    setImpersonating(client.id);
    const res = await loginAsClientAction(client.id);
    if (res.success && res.user) {
      document.cookie = `wm_session=whatin-session-2026; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `wm_user=${encodeURIComponent(JSON.stringify(res.user))}; path=/; max-age=86400; SameSite=Lax`;
      window.open("/whatsapp/dashboard", "_blank");
    } else {
      alert("Could not switch to client: " + (res.error || "No admin agent found"));
    }
    setImpersonating(null);
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return { text: "No Date", sub: "", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const dateFormatted = due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (diffDays > 7) {
      return { text: dateFormatted, sub: `Due in ${diffDays} days`, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" };
    } else if (diffDays > 0) {
      return { text: dateFormatted, sub: `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`, color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    } else if (diffDays === 0) {
      return { text: dateFormatted, sub: `Due Today`, color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" };
    } else {
      return { text: dateFormatted, sub: `Overdue by ${Math.abs(diffDays)} days`, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
    }
  };

  const filtered = clients.filter(c =>
    c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    c.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPhone?.includes(search)
  );

  const webhookBase = "https://what-in.tinkal.in";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "white", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Owner Console</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>What-In SaaS Management</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients", href: "/owner/clients", icon: "🏢" },
            { label: "Announcements", href: "/owner/announcements", icon: "📢" },
            { label: "Plans", href: "/owner/plans", icon: "💎" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ padding: "8px 14px", borderRadius: "10px", background: item.href === "/owner/clients" ? "#eef2ff" : "transparent", border: item.href === "/owner/clients" ? "1px solid #c7d2fe" : "1px solid transparent", color: item.href === "/owner/clients" ? "#4f46e5" : "#64748b", textDecoration: "none", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{ padding: "32px", maxWidth: "1560px", margin: "0 auto" }}>
        {/* Top Action Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Client & Subscription Management</h2>
            <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Onboard clients, record recurring monthly payments, track Meta health & quotas, and manage access.</p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search business, email, phone..." style={{ padding: "10px 16px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", width: "260px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} />
            <button onClick={handleOpenAdd} style={{ padding: "10px 22px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}>
              ➕ Onboard New Client
            </button>
          </div>
        </div>

        {/* Clients Table */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  {["Client & Credentials", "Plan", "Status", "Monthly Fee", "Quotas & Usage", "Next Due Date", "Meta & Webhook", "Actions"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>Loading clients & subscriptions...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>No clients found. Click <b>Onboard New Client</b> above to get started! 🚀</td></tr>
                ) : filtered.map(client => {
                  const s = STATUS_COLORS[client.subscriptionStatus] || STATUS_COLORS.TRIAL;
                  const due = formatDueDate(client.currentPeriodEnd);
                  const webhookUrl = client.customWebhookUrl || `${webhookBase}/api/whatsapp/webhook/${client.webhookClientId}`;

                  const msgQuota = client.monthlyMessageQuota || 5000;
                  const msgUsed = client.messagesUsedCount || 0;
                  const msgPercent = Math.min(100, Math.round((msgUsed / msgQuota) * 100));

                  const aiQuota = client.monthlyAiQuota || 500;
                  const aiUsed = client.aiRepliesUsedCount || 0;
                  const aiPercent = Math.min(100, Math.round((aiUsed / aiQuota) * 100));

                  return (
                    <tr key={client.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }}>
                      {/* Client info & Login Pass */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px", marginBottom: "2px" }}>{client.businessName}</div>
                        <div style={{ color: "#64748b", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>📧 {client.contactEmail}</span>
                        </div>
                        {client.adminPassword && (
                          <div style={{ marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "11px", color: "#4f46e5", fontWeight: 700 }}>🔑 {client.adminPassword}</span>
                            <button onClick={() => navigator.clipboard.writeText(client.adminPassword)} title="Copy password" style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "10px", padding: 0 }}>📋</button>
                          </div>
                        )}
                      </td>

                      {/* Plan */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 10px", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "6px", color: "#4f46e5", fontSize: "12px", fontWeight: 800 }}>
                          {client.subscriptionPlan}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 10px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "6px", color: s.color, fontSize: "12px", fontWeight: 800, display: "inline-block" }}>
                          {s.label}
                        </span>
                      </td>

                      {/* Fee */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#16a34a", fontWeight: 800, fontSize: "15px" }}>₹{client.monthlyFee?.toLocaleString()}</div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>per month</span>
                      </td>

                      {/* Quotas & Limits */}
                      <td style={{ padding: "14px 16px", minWidth: "180px" }}>
                        {/* Messages Progress */}
                        <div style={{ marginBottom: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "2px" }}>
                            <span>💬 Msgs: {msgUsed.toLocaleString()} / {msgQuota.toLocaleString()}</span>
                            <span>{msgPercent}%</span>
                          </div>
                          <div style={{ height: "5px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${msgPercent}%`, background: msgPercent > 90 ? "#ef4444" : "#4f46e5", borderRadius: "999px" }} />
                          </div>
                        </div>
                        {/* AI Replies Progress */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "2px" }}>
                            <span>🤖 AI: {aiUsed.toLocaleString()} / {aiQuota.toLocaleString()}</span>
                            <span>{aiPercent}%</span>
                          </div>
                          <div style={{ height: "5px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${aiPercent}%`, background: aiPercent > 90 ? "#ef4444" : "#10b981", borderRadius: "999px" }} />
                          </div>
                        </div>
                      </td>

                      {/* Next Due Date & Countdown */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-block", padding: "5px 10px", background: due.bg, borderRadius: "8px", border: `1px solid ${due.border}` }}>
                          <div style={{ fontSize: "12px", fontWeight: 800, color: due.color }}>{due.text}</div>
                          <div style={{ fontSize: "10px", color: due.color, opacity: 0.9, marginTop: "1px", fontWeight: 600 }}>{due.sub}</div>
                        </div>
                      </td>

                      {/* Webhook & Meta Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <code style={{ fontSize: "10px", color: "#475569", background: "#f1f5f9", padding: "3px 6px", borderRadius: "4px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{webhookUrl}</code>
                          <button onClick={() => navigator.clipboard.writeText(webhookUrl)} style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "5px", color: "#4f46e5", cursor: "pointer", fontSize: "11px", padding: "3px 7px" }} title="Copy Webhook URL">📋</button>
                        </div>
                        {client.phoneId && client.metaAccessToken ? (
                          <button onClick={() => handleCheckMetaHealth(client)} disabled={checkingMetaId === client.id} style={{ marginTop: "4px", padding: "2px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", fontSize: "10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            {checkingMetaId === client.id ? "Checking..." : "🩺 Live Meta Check"}
                          </button>
                        ) : (
                          <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", marginTop: "3px" }}>⚠️ Missing API Keys</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", minWidth: "260px" }}>
                          {/* Receive / Mark Payment */}
                          <button onClick={() => handleOpenPayment(client)} style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            💳 Receive Payment
                          </button>

                          {/* Receipts & Invoices */}
                          <button onClick={() => handleOpenReceipts(client)} style={{ padding: "6px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e40af", fontSize: "11px", fontWeight: 700, cursor: "pointer" }} title="View Payment Receipts & History">
                            🧾 Receipts
                          </button>

                          {/* Ghost Login */}
                          <button onClick={() => handleGhostLogin(client)} disabled={impersonating === client.id} style={{ padding: "6px 10px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", color: "#6d28d9", fontSize: "11px", fontWeight: 700, cursor: "pointer" }} title="Login directly into client dashboard">
                            {impersonating === client.id ? "..." : "👻 Login"}
                          </button>

                          {/* Edit / Password Reset / Quota */}
                          <button onClick={() => handleOpenEdit(client)} style={{ padding: "6px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#334155", fontSize: "11px", fontWeight: 700, cursor: "pointer" }} title="Edit Client, Quotas & Reset Password">
                            ✏️ Edit
                          </button>

                          {/* Block / Unblock */}
                          <button onClick={() => handleToggleBlock(client)} style={{ padding: "6px 10px", background: client.subscriptionStatus === "BLOCKED" ? "#f0fdf4" : "#fffbeb", border: client.subscriptionStatus === "BLOCKED" ? "1px solid #bbf7d0" : "1px solid #fde68a", borderRadius: "8px", color: client.subscriptionStatus === "BLOCKED" ? "#166534" : "#92400e", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                            {client.subscriptionStatus === "BLOCKED" ? "🔓 Unblock" : "🔒 Block"}
                          </button>

                          {/* Register Meta Webhook */}
                          <button onClick={() => handleRegisterWebhook(client)} disabled={registeringWebhook === client.id} title="Auto-register Meta webhook" style={{ padding: "6px 8px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", color: "#6d28d9", fontSize: "11px", fontWeight: 700, cursor: registeringWebhook === client.id ? "not-allowed" : "pointer" }}>
                            {registeringWebhook === client.id ? "⏳" : "🔗"}
                          </button>

                          {/* Delete */}
                          <button onClick={() => handleDelete(client)} style={{ padding: "6px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "11px", fontWeight: 700, cursor: "pointer" }} title="Delete Client">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ======================= MODAL: META HEALTH DIAGNOSTICS ======================= */}
      {metaHealthResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>🩺</span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0 }}>Meta WABA Health Diagnostics</h3>
              </div>
              <button onClick={() => setMetaHealthResult(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            {metaHealthResult.status === "HEALTHY" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", color: "#166534", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✅</span> Live Meta Connection Active & Operational ({metaHealthResult.latencyMs}ms)
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Phone Number</span>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{metaHealthResult.displayPhoneNumber}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Verified Name</span>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{metaHealthResult.verifiedName}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Quality Rating</span>
                    <div style={{ fontWeight: 800, color: metaHealthResult.qualityRating === "GREEN" ? "#16a34a" : "#d97706" }}>
                      🟢 {metaHealthResult.qualityRating}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Messaging Limit</span>
                    <div style={{ fontWeight: 800, color: "#4f46e5" }}>{metaHealthResult.messagingLimitTier}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>WABA Account</span>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{metaHealthResult.wabaName || "Connected"}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Webhook Verify Token</span>
                    <div style={{ fontWeight: 700, color: "#16a34a" }}>✅ Synchronized</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b" }}>
                <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "6px" }}>⚠️ Meta Token Issue Detected</div>
                <div style={{ fontSize: "13px", lineHeight: 1.5 }}>{metaHealthResult.error || metaHealthResult.message}</div>
                <div style={{ fontSize: "12px", marginTop: "10px", color: "#64748b" }}>
                  Please ask the client to generate a new Permanent Access Token in Meta Developer Portal or update credentials in Edit Client.
                </div>
              </div>
            )}

            <button onClick={() => setMetaHealthResult(null)} style={{ marginTop: "20px", width: "100%", padding: "12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#475569", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
              Close Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* ======================= MODAL: ONBOARD NEW CLIENT ======================= */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: "20px", margin: 0 }}>🏢 Onboard New Client</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Set up business info, admin login credentials, quotas and plan.</p>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleAddClient} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Business Name *</label>
                <input type="text" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="e.g. Acme Clothing Pvt Ltd" required style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Admin Email (Login) *</label>
                  <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="admin@acme.com" required style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Admin Password *</label>
                    <button type="button" onClick={generateRandomPassword} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "11px", fontWeight: 800, cursor: "pointer", padding: 0 }}>🎲 Generate</button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showAddPassword ? "text" : "password"} value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} placeholder="Password" required style={{ width: "100%", padding: "11px 36px 11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                    <button type="button" onClick={() => setShowAddPassword(!showAddPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "14px" }}>
                      {showAddPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Contact Phone</label>
                  <input type="tel" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+91 99999 00000" style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Owner WhatsApp (For Dues)</label>
                  <input type="tel" value={form.ownerWhatsApp} onChange={e => setForm({ ...form, ownerWhatsApp: e.target.value })} placeholder="+91 98765 43210" style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Plan</label>
                  <select value={form.subscriptionPlan} onChange={e => setForm({ ...form, subscriptionPlan: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none" }}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Monthly Fee (₹)</label>
                  <input type="number" value={form.monthlyFee} onChange={e => setForm({ ...form, monthlyFee: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#16a34a", fontWeight: 800, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Max Agents</label>
                  <input type="number" min="1" max="100" value={form.maxAgents} onChange={e => setForm({ ...form, maxAgents: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Quotas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Monthly Msgs Quota</label>
                  <input type="number" value={form.monthlyMessageQuota} onChange={e => setForm({ ...form, monthlyMessageQuota: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Monthly AI Replies Quota</label>
                  <input type="number" value={form.monthlyAiQuota} onChange={e => setForm({ ...form, monthlyAiQuota: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Initial State</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button type="button" onClick={() => setForm({ ...form, initialStatus: "ACTIVE" })} style={{ padding: "10px", background: form.initialStatus === "ACTIVE" ? "#f0fdf4" : "#f8fafc", border: form.initialStatus === "ACTIVE" ? "2px solid #16a34a" : "1px solid #cbd5e1", borderRadius: "8px", color: form.initialStatus === "ACTIVE" ? "#166534" : "#64748b", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                    ✅ Active (Paid for 1 Month)
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, initialStatus: "TRIAL" })} style={{ padding: "10px", background: form.initialStatus === "TRIAL" ? "#eff6ff" : "#f8fafc", border: form.initialStatus === "TRIAL" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "8px", color: form.initialStatus === "TRIAL" ? "#1e40af" : "#64748b", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                    🧪 Free Trial (30 Days)
                  </button>
                </div>
              </div>

              {/* Meta & Shopify Credentials Accordion */}
              <div>
                <button type="button" onClick={() => setShowMetaFields(p => !p)} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569", padding: "10px 14px", cursor: "pointer", fontSize: "12px", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{showMetaFields ? "▲ Hide" : "▼ Show"} Meta / Shopify API Keys (Optional)</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Can be set later</span>
                </button>
                {showMetaFields && (
                  <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    {[
                      { label: "WABA ID", key: "wabaId", placeholder: "WhatsApp Business Account ID" },
                      { label: "Phone Number ID", key: "phoneId", placeholder: "Meta Phone Number ID" },
                      { label: "Phone Number", key: "phoneNumber", placeholder: "+91 99999 00000" },
                      { label: "Meta Access Token", key: "metaAccessToken", placeholder: "EAAB..." },
                      { label: "Shopify Domain", key: "shopifyDomain", placeholder: "store.myshopify.com" },
                      { label: "Shopify Token", key: "shopifyToken", placeholder: "shpat_..." },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>{f.label}</label>
                        <input type={f.key.toLowerCase().includes("token") ? "password" : "text"} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "8px 10px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any onboarding notes, custom requirements..." style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", minHeight: "60px", resize: "vertical", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="submit" style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}>
                  Create & Activate Client
                </button>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "13px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#64748b", cursor: "pointer", fontSize: "14px" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: ONBOARD SUCCESS (COPY CREDENTIALS) ======================= */}
      {addSuccessInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "480px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
            <h3 style={{ color: "#15803d", fontSize: "22px", fontWeight: 800, margin: "0 0 6px 0" }}>Client Onboarded!</h3>
            <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 20px 0" }}>Share these login credentials with your client. They will be prompted to set their own permanent password upon login.</p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", textAlign: "left", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Login URL</span>
                <div style={{ fontSize: "13px", color: "#4f46e5", fontWeight: 700 }}>{addSuccessInfo.loginUrl}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Admin Email</span>
                <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 800 }}>{addSuccessInfo.email}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Initial Password</span>
                <div style={{ fontSize: "15px", color: "#4f46e5", fontWeight: 800 }}>{addSuccessInfo.password}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => {
                const text = `🎉 *Welcome to What-In Platform!*\n\nHere are your admin login credentials:\n🌐 *Login URL:* ${addSuccessInfo.loginUrl}\n📧 *Email:* ${addSuccessInfo.email}\n🔑 *Initial Password:* ${addSuccessInfo.password}\n\nPlease login and connect your WhatsApp Business Account.`;
                navigator.clipboard.writeText(text);
                alert("✅ Credentials message copied to clipboard! You can now paste it into WhatsApp.");
              }} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                📋 Copy for WhatsApp
              </button>
              <button onClick={() => setAddSuccessInfo(null)} style={{ padding: "12px 24px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#475569", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: RECEIVE PAYMENT & EXTEND DUE DATE ======================= */}
      {paymentClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ color: "#16a34a", fontWeight: 800, fontSize: "20px", margin: 0 }}>💳 Receive Payment & Renew</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Client: <b>{paymentClient.businessName}</b> (Fee: ₹{paymentClient.monthlyFee}/mo)</p>
              </div>
              <button onClick={() => setPaymentClient(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>Extend Billing Cycle</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {[
                    { label: "+1 Month", months: 1 },
                    { label: "+3 Months", months: 3 },
                    { label: "+6 Months", months: 6 },
                    { label: "+1 Year", months: 12 },
                  ].map(c => (
                    <button key={c.months} type="button" onClick={() => handleCycleChange(c.months)} style={{ padding: "10px 4px", background: payCycleMonths === c.months ? "#f0fdf4" : "#f8fafc", border: payCycleMonths === c.months ? "2px solid #16a34a" : "1px solid #cbd5e1", borderRadius: "8px", color: payCycleMonths === c.months ? "#15803d" : "#64748b", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Amount Received (₹) *</label>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} required style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#16a34a", fontWeight: 800, fontSize: "16px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Payment Mode</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none" }}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>New Next Due Date *</label>
                <input type="date" value={payCustomDueDate} onChange={e => setPayCustomDueDate(e.target.value)} required style={{ width: "100%", padding: "11px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>Plan will stay ACTIVE and unlocked until this date.</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>UTR / Reference Number (Optional)</label>
                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. UPI/582910283912 or Bank Ref" style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Receipt Notes (Optional)</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="e.g. Paid via PhonePe by client manager" style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="submit" disabled={isSubmittingPay} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: isSubmittingPay ? "not-allowed" : "pointer", fontSize: "14px", boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}>
                  {isSubmittingPay ? "Recording..." : "💾 Record Payment & Activate"}
                </button>
                <button type="button" onClick={() => setPaymentClient(null)} style={{ padding: "13px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#64748b", cursor: "pointer", fontSize: "14px" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: PAYMENT HISTORY & RECEIPTS ======================= */}
      {receiptsClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "700px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: "20px", margin: 0 }}>🧾 Payment History & Invoices</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>{receiptsClient.businessName} — {receiptsClient.contactEmail}</p>
              </div>
              <button onClick={() => setReceiptsClient(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            {loadingPayments ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading payment ledger...</div>
            ) : paymentsHistory.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No recorded payments yet for this client.
                <div style={{ marginTop: "12px" }}>
                  <button onClick={() => { setReceiptsClient(null); handleOpenPayment(receiptsClient); }} style={{ padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                    💳 Record First Payment
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {paymentsHistory.map((p) => (
                  <div key={p.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "#16a34a" }}>₹{p.amount?.toLocaleString()}</span>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "#dcfce7", color: "#15803d", borderRadius: "4px", fontWeight: 800 }}>PAID</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                        📅 Paid: {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        🗓️ Access Valid: {new Date(p.periodStart).toLocaleDateString("en-IN")} → {new Date(p.periodEnd).toLocaleDateString("en-IN")}
                      </div>
                      {p.notes && (
                        <div style={{ fontSize: "11px", color: "#4f46e5", marginTop: "4px", fontWeight: 600 }}>
                          📝 {p.notes}
                        </div>
                      )}
                    </div>
                    <div>
                      <button onClick={() => setSelectedReceipt({ payment: p, client: receiptsClient })} style={{ padding: "8px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e40af", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        🖨️ View / Print Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= MODAL: SINGLE PRINTABLE SAAS RECEIPT ======================= */}
      {selectedReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", color: "#0f172a", borderRadius: "16px", padding: "36px", width: "100%", maxWidth: "560px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#4338ca", letterSpacing: "-0.5px" }}>WHAT-IN SAAS</h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>Developed by tinkal.in • Cloud WhatsApp SaaS</p>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>https://what-in.tinkal.in</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 800 }}>
                  PAID RECEIPT
                </span>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                  Receipt #{selectedReceipt.payment.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  Date: {new Date(selectedReceipt.payment.createdAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>BILLED TO:</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>{selectedReceipt.client.businessName}</div>
              <div style={{ fontSize: "13px", color: "#475569" }}>{selectedReceipt.client.contactEmail}</div>
              {selectedReceipt.client.contactPhone && <div style={{ fontSize: "13px", color: "#475569" }}>{selectedReceipt.client.contactPhone}</div>}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", color: "#475569" }}>Description</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "12px", color: "#475569" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                      What-In {selectedReceipt.client.subscriptionPlan || "Standard"} Plan Subscription
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Access: {new Date(selectedReceipt.payment.periodStart).toLocaleDateString("en-IN")} to {new Date(selectedReceipt.payment.periodEnd).toLocaleDateString("en-IN")}
                    </div>
                    {selectedReceipt.payment.notes && (
                      <div style={{ fontSize: "11px", color: "#4338ca", marginTop: "2px" }}>
                        {selectedReceipt.payment.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                    ₹{selectedReceipt.payment.amount?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>Total Paid:</td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 900, fontSize: "16px", color: "#15803d" }}>
                    ₹{selectedReceipt.payment.amount?.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: "12px", background: "#4338ca", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                🖨️ Print / Save as PDF
              </button>
              <button onClick={() => setSelectedReceipt(null)} style={{ padding: "12px 20px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: EDIT CLIENT & RESET PASSWORD & QUOTAS ======================= */}
      {editClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", padding: "20px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: "20px", margin: 0 }}>✏️ Edit Client — {editClient.businessName}</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Update plan, reset admin password, adjust quotas, and update Meta keys.</p>
              </div>
              <button onClick={() => setEditClient(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Reset Admin Password */}
              <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "#4338ca", textTransform: "uppercase" }}>🔑 Client Admin Login Password</label>
                  <button type="button" onClick={() => setEditPassword("WhatIn@" + Math.floor(100000 + Math.random() * 900000))} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "11px", fontWeight: 800, cursor: "pointer", padding: 0 }}>🎲 Generate New</button>
                </div>
                <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Enter new password for client admin" style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #c7d2fe", borderRadius: "8px", color: "#0f172a", fontSize: "14px", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                <span style={{ fontSize: "11px", color: "#475569", marginTop: "4px", display: "block" }}>Client can log into <code>/login</code> with email <b>{editClient.contactEmail}</b> and this password.</span>
              </div>

              {/* Adjust Due Date */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Next Due Date (Subscription Expiry)</label>
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Quotas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>Monthly Msgs Quota</label>
                  <input type="number" value={editMsgQuota} onChange={e => setEditMsgQuota(Number(e.target.value))} style={{ width: "100%", padding: "8px 10px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>Monthly AI Quota</label>
                  <input type="number" value={editAiQuota} onChange={e => setEditAiQuota(Number(e.target.value))} style={{ width: "100%", padding: "8px 10px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ gridColumn: "span 2", marginTop: "4px" }}>
                  <button type="button" onClick={() => handleResetQuotas(editClient.id)} style={{ padding: "6px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                    🔄 Reset Month Usage Counters to 0
                  </button>
                </div>
              </div>

              {/* Plan, Fee, Agents */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Plan</label>
                  <select value={editClient.subscriptionPlan} onChange={e => setEditClient({ ...editClient, subscriptionPlan: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none" }}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Fee/mo (₹)</label>
                  <input type="number" value={editClient.monthlyFee} onChange={e => setEditClient({ ...editClient, monthlyFee: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#16a34a", fontWeight: 800, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Max Agents</label>
                  <input type="number" min="1" max="100" value={editClient.maxAgents} onChange={e => setEditClient({ ...editClient, maxAgents: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Owner WhatsApp */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Owner WhatsApp (for blocked screen)</label>
                <input type="tel" value={editClient.ownerWhatsApp || ""} onChange={e => setEditClient({ ...editClient, ownerWhatsApp: e.target.value })} placeholder="+91 98765 43210" style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Meta Credentials in Edit */}
              <div>
                <button type="button" onClick={() => setShowEditMeta(p => !p)} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569", padding: "10px 14px", cursor: "pointer", fontSize: "12px", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                  <span>{showEditMeta ? "▲ Hide" : "▼ Show"} Meta / Shopify API Keys</span>
                </button>
                {showEditMeta && (
                  <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
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
                        <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>{f.label}</label>
                        <input type={f.key.toLowerCase().includes("token") ? "password" : "text"} value={editClient[f.key] || ""} onChange={e => setEditClient({ ...editClient, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: "100%", padding: "8px 10px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Notes</label>
                <textarea value={editClient.notes || ""} onChange={e => setEditClient({ ...editClient, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px", outline: "none", minHeight: "60px", resize: "vertical", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditClient(null)} style={{ padding: "12px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#64748b", cursor: "pointer", fontSize: "14px" }}>
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
