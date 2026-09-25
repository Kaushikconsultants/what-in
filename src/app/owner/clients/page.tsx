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
  loginAsClientAction,
  updateClientModulesAction,
  updateClientPlanTierAction
} from "@/app/actions/ownerPortalActions";
import {
  MASTER_MODULES,
  DEFAULT_PLAN_TIERS,
  INDUSTRY_MODULE_PRESETS,
  ALL_MODULE_KEYS,
  ModuleKey,
  parseEnabledModules
} from "@/lib/moduleRegistry";
import { useRouter } from "next/navigation";

const PLANS = ["TRIAL", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE", "CUSTOM"];

const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string; dot: string; label: string }> = {
  ACTIVE:   { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)", color: "#34d399", dot: "#10b981", label: "Active" },
  TRIAL:    { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", color: "#60a5fa", dot: "#3b82f6", label: "Trial" },
  PAST_DUE: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", color: "#fbbf24", dot: "#f59e0b", label: "Past Due" },
  BLOCKED:  { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", color: "#f87171", dot: "#ef4444", label: "Blocked" },
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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const router = useRouter();

  // Active dropdown menu for row actions
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

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

  // MODULES MANAGEMENT MODAL (Feature Gating)
  const [modulesClient, setModulesClient] = useState<any | null>(null);
  const [activeClientModules, setActiveClientModules] = useState<ModuleKey[]>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);

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
    shopifyToken: "",
    enabledModules: DEFAULT_PLAN_TIERS[0].modules as ModuleKey[]
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
    if (res.success && res.clients) {
      setClients(res.clients);
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    const defaultPassword = "WhatMore@" + Math.floor(100000 + Math.random() * 900000);
    const starterPlan = DEFAULT_PLAN_TIERS[0];
    setForm({
      businessName: "",
      contactEmail: "",
      adminPassword: defaultPassword,
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
      shopifyToken: "",
      enabledModules: starterPlan.modules
    });
    setShowMetaFields(false);
    setShowAdd(true);
  };

  const handlePlanSelectInAdd = (planId: string) => {
    const plan = DEFAULT_PLAN_TIERS.find(p => p.id === planId);
    if (plan) {
      setForm(prev => ({
        ...prev,
        subscriptionPlan: plan.id,
        monthlyFee: plan.monthlyFee,
        maxAgents: plan.maxAgents,
        monthlyMessageQuota: plan.monthlyMessageQuota,
        monthlyAiQuota: plan.monthlyAiQuota,
        enabledModules: plan.modules
      }));
    } else {
      setForm(prev => ({ ...prev, subscriptionPlan: planId }));
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.contactEmail) {
      alert("Business Name and Admin Contact Email are required.");
      return;
    }

    const res = await createClientAction({
      ...form,
      monthlyFee: Number(form.monthlyFee),
      maxAgents: Number(form.maxAgents),
      monthlyMessageQuota: Number(form.monthlyMessageQuota),
      monthlyAiQuota: Number(form.monthlyAiQuota),
    } as any);

    if (res.success && res.client) {
      setShowAdd(false);
      setAddSuccessInfo({
        businessName: form.businessName,
        email: form.contactEmail,
        password: form.adminPassword,
        plan: form.subscriptionPlan,
        loginUrl: `${window.location.origin}/login`,
        webhookClientId: res.client.webhookClientId,
        webhookUrl: `${window.location.origin}/api/whatsapp/webhook/${res.client.webhookClientId}`,
        verifyToken: res.client.webhookVerifyToken
      });
      load();
    } else {
      alert("Error creating client: " + (res.error || "Unknown error"));
    }
  };

  // MODULES MANAGEMENT MODAL HANDLERS
  const handleOpenModules = (client: any) => {
    setModulesClient(client);
    const parsed = parseEnabledModules(client.enabledModules);
    setActiveClientModules(parsed);
  };

  const handleToggleModule = (modKey: ModuleKey) => {
    setActiveClientModules(prev =>
      prev.includes(modKey) ? prev.filter(k => k !== modKey) : [...prev, modKey]
    );
  };

  const handleApplyPreset = (presetModules: ModuleKey[]) => {
    setActiveClientModules(presetModules);
  };

  const handleSaveModules = async () => {
    if (!modulesClient) return;
    setIsSavingModules(true);
    const res = await updateClientModulesAction(modulesClient.id, activeClientModules);
    setIsSavingModules(false);
    if (res.success) {
      // Optimistic update local state
      setClients(prev =>
        prev.map(c => (c.id === modulesClient.id ? { ...c, enabledModules: JSON.stringify(activeClientModules) } : c))
      );
      setModulesClient(null);
    } else {
      alert("Error updating modules: " + res.error);
    }
  };

  const handleOpenPayment = (client: any) => {
    setPaymentClient(client);
    setPayAmount(client.monthlyFee || 999);
    setPayMethod("UPI (GPay / PhonePe / Paytm)");
    setPayRef("");
    setPayCycleMonths(1);
    setPayCustomDueDate("");
    setPayNotes("");
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentClient) return;
    setIsSubmittingPay(true);
    const now = new Date();
    const targetPeriodEnd = payCustomDueDate 
      ? new Date(payCustomDueDate) 
      : new Date(now.getTime() + (Number(payCycleMonths) || 1) * 30 * 24 * 60 * 60 * 1000);

    const res = await recordClientPaymentAction({
      clientId: paymentClient.id,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      transactionRef: payRef,
      periodEnd: targetPeriodEnd,
      notes: payNotes,
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
    if (res.success && res.payments) {
      setPaymentsHistory(res.payments);
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
    const res: any = await registerWebhookForClientAction(client.id);
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
      document.cookie = `wm_session=whatmore-session-2026; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `wm_user=${encodeURIComponent(JSON.stringify(res.user))}; path=/; max-age=86400; SameSite=Lax`;
      window.open("/whatsapp/dashboard", "_blank");
    } else {
      alert("Could not switch to client: " + (res.error || "No admin agent found"));
    }
    setImpersonating(null);
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return { text: "No Date", sub: "", color: "#94a3b8", bg: "rgba(255, 255, 255, 0.05)", border: "rgba(255, 255, 255, 0.1)" };
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateFormatted = due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (diffDays > 7) {
      return { text: dateFormatted, sub: `Due in ${diffDays} days`, color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" };
    } else if (diffDays > 0) {
      return { text: dateFormatted, sub: `Due in ${diffDays}d`, color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)" };
    } else if (diffDays === 0) {
      return { text: dateFormatted, sub: `Due Today`, color: "#fb923c", bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.3)" };
    } else {
      return { text: dateFormatted, sub: `Overdue ${Math.abs(diffDays)}d`, color: "#f87171", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)" };
    }
  };

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone?.includes(search);

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    return c.subscriptionStatus === statusFilter;
  });

  const totalCount = clients.length;
  const activeCount = clients.filter(c => c.subscriptionStatus === "ACTIVE").length;
  const pastDueCount = clients.filter(c => c.subscriptionStatus === "PAST_DUE").length;
  const trialCount = clients.filter(c => c.subscriptionStatus === "TRIAL").length;
  const blockedCount = clients.filter(c => c.subscriptionStatus === "BLOCKED").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Header */}
      <header style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "white", boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}>👑</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.2px" }}>WhatMore Super-Admin Console</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Client Directory & Feature Gating System</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { label: "Dashboard", href: "/owner", icon: "📊" },
            { label: "Clients & Modules", href: "/owner/clients", icon: "🏢" },
            { label: "Announcements", href: "/owner/announcements", icon: "📢" },
            { label: "Plans & Matrix", href: "/owner/plans", icon: "💎" },
          ].map(item => {
            const active = item.href === "/owner/clients";
            return (
              <Link key={item.href} href={item.href} style={{ padding: "8px 14px", borderRadius: "10px", background: active ? "rgba(99, 102, 241, 0.2)" : "transparent", border: active ? "1px solid #6366f1" : "1px solid transparent", color: active ? "#818cf8" : "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
          <button onClick={() => { sessionStorage.removeItem("owner_authed"); fetch("/api/owner/auth", { method: "DELETE" }).then(() => router.push("/owner/login")); }} style={{ marginLeft: "12px", padding: "8px 14px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Top Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>🏢 SaaS Tenant & Module Control Center</h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Manage client credentials, toggle individual business modules ON/OFF, and monitor real-time quotas.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleOpenAdd} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none", borderRadius: "12px", color: "white", fontWeight: 800, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 20px rgba(99, 102, 241, 0.35)" }}>
              <span>➕</span> Onboard New Client
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: "All Clients", count: totalCount },
              { id: "ACTIVE", label: "Active", count: activeCount, color: "#34d399" },
              { id: "PAST_DUE", label: "Past Due", count: pastDueCount, color: "#fbbf24" },
              { id: "TRIAL", label: "Trial", count: trialCount, color: "#60a5fa" },
              { id: "BLOCKED", label: "Blocked", count: blockedCount, color: "#f87171" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  background: statusFilter === tab.id ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: statusFilter === tab.id ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.06)",
                  color: statusFilter === tab.id ? "#818cf8" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{tab.label}</span>
                <span style={{ padding: "2px 6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "999px", fontSize: "10px", color: tab.color || "#ffffff" }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div style={{ position: "relative", minWidth: "280px" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "14px" }}>🔍</span>
            <input
              type="text"
              placeholder="Search by business, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {/* Client Table */}
        <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", overflow: "hidden", backdropFilter: "blur(12px)" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              ⏳ Loading client directory & module states...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏢</div>
              <h3 style={{ fontSize: "16px", color: "#ffffff", margin: "0 0 6px 0" }}>No matching clients found</h3>
              <p style={{ fontSize: "13px", margin: 0 }}>Try clearing your search query or onboard a new client above.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Business & Contact</th>
                    <th style={{ padding: "16px 14px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Plan & Status</th>
                    <th style={{ padding: "16px 14px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Active Modules (Feature Gating)</th>
                    <th style={{ padding: "16px 14px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Renewal & Due</th>
                    <th style={{ padding: "16px 14px", fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Message & AI Quotas</th>
                    <th style={{ padding: "16px 20px", fontSize: "12px", color: "#94a3b8", fontWeight: 800, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client, idx) => {
                    const statusConf = STATUS_CONFIG[client.subscriptionStatus] || STATUS_CONFIG.ACTIVE;
                    const dueInfo = formatDueDate(client.currentPeriodEnd);
                    const enabledMods = parseEnabledModules(client.enabledModules);

                    return (
                      <tr key={client.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)" }}>
                        {/* Business Info */}
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))", border: "1px solid rgba(99, 102, 241, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "16px", color: "#818cf8" }}>
                              {client.businessName?.charAt(0).toUpperCase() || "B"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff" }}>{client.businessName}</div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{client.contactEmail}</div>
                              {client.contactPhone && <div style={{ fontSize: "11px", color: "#64748b" }}>📱 {client.contactPhone}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Plan & Status */}
                        <td style={{ padding: "16px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                            <span style={{ padding: "3px 8px", background: statusConf.bg, border: `1px solid ${statusConf.border}`, borderRadius: "6px", fontSize: "11px", fontWeight: 800, color: statusConf.color, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusConf.dot }} />
                              {statusConf.label}
                            </span>
                            <div style={{ fontSize: "12px", color: "#ffffff", fontWeight: 800 }}>
                              {client.subscriptionPlan} • <span style={{ color: "#34d399" }}>₹{client.monthlyFee?.toLocaleString()}/mo</span>
                            </div>
                          </div>
                        </td>

                        {/* Active Modules Pill */}
                        <td style={{ padding: "16px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 800, color: "#818cf8" }}>
                                🎛️ {enabledMods.length} / 13 Modules
                              </span>
                              <button
                                onClick={() => handleOpenModules(client)}
                                style={{
                                  padding: "3px 8px",
                                  background: "rgba(99, 102, 241, 0.2)",
                                  border: "1px solid rgba(99, 102, 241, 0.4)",
                                  borderRadius: "6px",
                                  color: "#a5b4fc",
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  cursor: "pointer"
                                }}
                              >
                                Edit ⚙️
                              </button>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", maxWidth: "260px" }}>
                              {enabledMods.slice(0, 6).map(modKey => {
                                const m = MASTER_MODULES[modKey];
                                return (
                                  <span key={modKey} title={m.name} style={{ padding: "2px 5px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", fontSize: "10px", color: "#cbd5e1" }}>
                                    {m.icon}
                                  </span>
                                );
                              })}
                              {enabledMods.length > 6 && (
                                <span style={{ padding: "2px 5px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", fontSize: "10px", color: "#94a3b8" }}>
                                  +{enabledMods.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Renewal Due */}
                        <td style={{ padding: "16px 14px" }}>
                          <span style={{ padding: "4px 8px", background: dueInfo.bg, border: `1px solid ${dueInfo.border}`, borderRadius: "6px", fontSize: "11px", fontWeight: 800, color: dueInfo.color, display: "inline-block" }}>
                            {dueInfo.text}
                          </span>
                          {dueInfo.sub && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>{dueInfo.sub}</div>}
                        </td>

                        {/* Usage Quotas */}
                        <td style={{ padding: "16px 14px" }}>
                          <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div>💬 Msgs: <b style={{ color: "#38bdf8" }}>{client.messagesUsedCount || 0}</b> / {client.monthlyMessageQuota?.toLocaleString() || 5000}</div>
                            <div>🧠 AI: <b style={{ color: "#a855f7" }}>{client.aiRepliesUsedCount || 0}</b> / {client.monthlyAiQuota?.toLocaleString() || 500}</div>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            {/* Ghost Login Button */}
                            <button
                              onClick={() => handleGhostLogin(client)}
                              disabled={impersonating === client.id}
                              title="1-Click Super-Admin Login to this Client"
                              style={{
                                padding: "6px 10px",
                                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
                                border: "1px solid rgba(99, 102, 241, 0.4)",
                                borderRadius: "8px",
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <span>👻</span> {impersonating === client.id ? "Entering..." : "Login"}
                            </button>

                            {/* Collect Payment */}
                            <button
                              onClick={() => handleOpenPayment(client)}
                              style={{
                                padding: "6px 10px",
                                background: "rgba(16, 185, 129, 0.2)",
                                border: "1px solid rgba(16, 185, 129, 0.4)",
                                borderRadius: "8px",
                                color: "#34d399",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: "pointer"
                              }}
                            >
                              💳 Collect
                            </button>

                            {/* Edit Client */}
                            <button
                              onClick={() => handleOpenEdit(client)}
                              style={{
                                padding: "6px 10px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "8px",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              ✏️
                            </button>

                            {/* Receipts */}
                            <button
                              onClick={() => handleOpenReceipts(client)}
                              title="Payment History & Receipts"
                              style={{
                                padding: "6px 10px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "8px",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              📄
                            </button>

                            {/* Meta Health */}
                            <button
                              onClick={() => handleCheckMetaHealth(client)}
                              title="Check Meta Graph API Health"
                              style={{
                                padding: "6px 10px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "8px",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              {checkingMetaId === client.id ? "⏳" : "📡"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 🎛️ MODULAR FEATURE GATING MODAL */}
        {modulesClient && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(10px)" }}>
            <div style={{ background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "24px", padding: "30px", width: "100%", maxWidth: "840px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "24px" }}>🎛️</span>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#ffffff" }}>
                      Manage Modules for {modulesClient.businessName}
                    </h3>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
                    Enable or disable individual business modules for this tenant. Disabled modules are locked in their dashboard.
                  </p>
                </div>
                <button onClick={() => setModulesClient(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>

              {/* 1-Click Industry Presets Bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  ✨ 1-Click Industry Presets
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {INDUSTRY_MODULE_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset.modules)}
                      style={{
                        padding: "5px 10px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <span>{preset.icon}</span> {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Active: <b style={{ color: "#34d399" }}>{activeClientModules.length}</b> / {ALL_MODULE_KEYS.length} Modules
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setActiveClientModules(ALL_MODULE_KEYS)} style={{ padding: "4px 10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", color: "#34d399", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}>
                    Select All
                  </button>
                  <button onClick={() => setActiveClientModules(["INBOX"])} style={{ padding: "4px 10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#f87171", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}>
                    Minimal Only
                  </button>
                </div>
              </div>

              {/* 13 Modules Interactive Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", marginBottom: "26px" }}>
                {ALL_MODULE_KEYS.map(modKey => {
                  const m = MASTER_MODULES[modKey];
                  const isEnabled = activeClientModules.includes(modKey);

                  return (
                    <div
                      key={modKey}
                      onClick={() => handleToggleModule(modKey)}
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        background: isEnabled ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        border: isEnabled ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.06)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                        boxShadow: isEnabled ? "0 4px 14px rgba(99, 102, 241, 0.15)" : "none"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "20px" }}>{m.icon}</span>
                            <span style={{ fontWeight: 800, fontSize: "13px", color: isEnabled ? "#ffffff" : "#94a3b8" }}>{m.name}</span>
                          </div>
                          {/* Toggle Switch */}
                          <div style={{ width: "36px", height: "20px", borderRadius: "999px", background: isEnabled ? "#6366f1" : "rgba(255,255,255,0.1)", position: "relative", transition: "background 0.2s" }}>
                            <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ffffff", position: "absolute", top: "2px", left: isEnabled ? "18px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>
                          {m.tagline}
                        </p>
                      </div>

                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", color: "#94a3b8", fontWeight: 700 }}>
                          {m.category}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: isEnabled ? "#34d399" : "#64748b" }}>
                          {isEnabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModulesClient(null)}
                  style={{ padding: "10px 18px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModules}
                  disabled={isSavingModules}
                  style={{ padding: "10px 24px", background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)" }}
                >
                  {isSavingModules ? "Saving Module States..." : "💾 Save Module Access"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ONBOARD NEW CLIENT MODAL */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(10px)" }}>
            <div style={{ background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "24px", padding: "30px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>➕ Onboard New WhatsApp SaaS Client</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>Set credentials, choose subscription tier, and configure initial modules.</p>
                </div>
                <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleCreateClient} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Business Name & Email */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Business / Brand Name *</label>
                    <input type="text" required placeholder="e.g. Apex Sports Club" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Admin Email (Login ID) *</label>
                    <input type="email" required placeholder="admin@brand.com" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>

                {/* Password Generator */}
                <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "12px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 800, color: "#818cf8", textTransform: "uppercase" }}>🔑 Auto-Generated Initial Password</label>
                    <button type="button" onClick={() => setForm({ ...form, adminPassword: "WhatMore@" + Math.floor(100000 + Math.random() * 900000) })} style={{ background: "none", border: "none", color: "#a5b4fc", fontSize: "11px", fontWeight: 800, cursor: "pointer", padding: 0 }}>🎲 Generate New</button>
                  </div>
                  <input type="text" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                </div>

                {/* Plan Tier Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "8px" }}>Select Subscription Plan Tier</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {DEFAULT_PLAN_TIERS.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handlePlanSelectInAdd(p.id)}
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          background: form.subscriptionPlan === p.id ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.03)",
                          border: form.subscriptionPlan === p.id ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                          cursor: "pointer",
                          textAlign: "center"
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: "12px", color: "#ffffff" }}>{p.name}</div>
                        <div style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>₹{p.monthlyFee}/mo</div>
                        <div style={{ fontSize: "10px", color: "#818cf8", marginTop: "2px" }}>{p.modules.length} Modules</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fees and Limits */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Monthly Fee (₹)</label>
                    <input type="number" value={form.monthlyFee} onChange={e => setForm({ ...form, monthlyFee: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Monthly Msgs</label>
                    <input type="number" value={form.monthlyMessageQuota} onChange={e => setForm({ ...form, monthlyMessageQuota: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>AI Replies</label>
                    <input type="number" value={form.monthlyAiQuota} onChange={e => setForm({ ...form, monthlyAiQuota: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "10px 18px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ padding: "10px 24px", background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                    🚀 Onboard & Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ONBOARD SUCCESS MODAL */}
        {addSuccessInfo && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(10px)" }}>
            <div style={{ background: "#0f172a", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "24px", padding: "30px", width: "100%", maxWidth: "560px", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "8px" }}>🎉</div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#34d399" }}>Client Successfully Onboarded!</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>Share these login credentials with the client admin.</p>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "18px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Login Portal URL</div>
                  <div style={{ fontSize: "13px", color: "#38bdf8", fontWeight: 700 }}>{addSuccessInfo.loginUrl}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Admin Email</div>
                  <div style={{ fontSize: "13px", color: "#ffffff", fontWeight: 700 }}>{addSuccessInfo.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Generated Password</div>
                  <div style={{ fontSize: "15px", color: "#34d399", fontWeight: 900, fontFamily: "monospace" }}>{addSuccessInfo.password}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    const text = `🎉 Welcome to WhatMore WhatsApp Platform!\n\nHere are your dashboard access credentials:\n\n📱 Login URL: ${addSuccessInfo.loginUrl}\n📧 Email: ${addSuccessInfo.email}\n🔑 Password: ${addSuccessInfo.password}\n\nUpon your first login, you will be prompted to set your permanent private password.`;
                    navigator.clipboard.writeText(text);
                    alert("✅ Credentials message copied to clipboard! You can now paste it into WhatsApp.");
                  }}
                  style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "10px", color: "white", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}
                >
                  📋 Copy for WhatsApp
                </button>
                <button onClick={() => setAddSuccessInfo(null)} style={{ padding: "12px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#ffffff", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECORD PAYMENT MODAL */}
        {paymentClient && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(10px)" }}>
            <div style={{ background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "24px", padding: "30px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>💳 Record Monthly SaaS Renewal</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>Client: {paymentClient.businessName}</p>
                </div>
                <button onClick={() => setPaymentClient(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleSavePayment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Amount Received (₹) *</label>
                  <input type="number" required value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "14px", fontWeight: 800, outline: "none", boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>Payment Method</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginBottom: "6px" }}>UPI UTR / Reference No. (Optional)</label>
                  <input type="text" placeholder="e.g. UPI 432876129847" value={payRef} onChange={e => setPayRef(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setPaymentClient(null)} style={{ padding: "10px 18px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingPay} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                    {isSubmittingPay ? "Recording..." : "✅ Confirm Payment"}
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
