"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Sliders,
  CreditCard,
  Edit3,
  Trash2,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Key,
  Copy,
  FileText,
  Activity,
  ChevronRight,
  Sparkles,
  Smartphone,
  Mail,
  Calendar,
  Layers,
  MessageSquare,
  Bot,
  DollarSign,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Store,
  CheckCircle2,
  Clock,
  Printer
} from "lucide-react";
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

const PLANS = ["TRIAL", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE", "CUSTOM"];

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  ACTIVE:   { bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800/70", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", label: "Active" },
  TRIAL:    { bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200 dark:border-blue-800/70", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", label: "Trial" },
  PAST_DUE: { bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800/70", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", label: "Past Due" },
  BLOCKED:  { bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800/70", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", label: "Blocked" },
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

    if (res.success) {
      if (editDueDate) {
        await updateClientDueDateAction(editClient.id, new Date(editDueDate));
      }
      await updateClientQuotasAction(editClient.id, {
        monthlyMessageQuota: Number(editMsgQuota),
        monthlyAiQuota: Number(editAiQuota)
      });
      setEditClient(null);
      load();
    } else {
      alert("Error saving: " + res.error);
    }
  };

  const handleToggleBlock = async (client: any) => {
    const isCurrentlyBlocked = client.subscriptionStatus === "BLOCKED";
    const confirmMsg = isCurrentlyBlocked 
      ? `Unblock ${client.businessName}? They will regain dashboard and WhatsApp messaging access.`
      : `BLOCK ${client.businessName}? Their agents will be logged out and WhatsApp webhook processing will be halted.`;

    if (!confirm(confirmMsg)) return;

    const res = await toggleClientBlockAction(client.id, !isCurrentlyBlocked);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  const handleDelete = async (client: any) => {
    const prompt = window.prompt(`Type "${client.businessName}" to confirm PERMANENT deletion of this client and all their data:`);
    if (prompt !== client.businessName) {
      alert("Deletion cancelled. Name did not match.");
      return;
    }
    const res = await deleteClientAction(client.id);
    if (res.success) load();
    else alert("Error deleting: " + res.error);
  };

  const handleGhostLogin = async (client: any) => {
    setImpersonating(client.id);
    const res = await loginAsClientAction(client.id);
    if (res.success && res.user) {
      document.cookie = `wm_user=${encodeURIComponent(JSON.stringify(res.user))}; path=/; max-age=86400; SameSite=Lax`;
      window.open("/whatsapp/inbox", "_blank");
    } else {
      alert("Could not switch to client: " + (res.error || "No admin agent found"));
    }
    setImpersonating(null);
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return { text: "No Date", sub: "", color: "text-slate-400 dark:text-slate-500", bg: "bg-slate-100 dark:bg-slate-800/60", border: "border-slate-200 dark:border-slate-700" };
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateFormatted = due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (diffDays > 7) {
      return { text: dateFormatted, sub: `Due in ${diffDays} days`, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800/60" };
    } else if (diffDays > 0) {
      return { text: dateFormatted, sub: `Due in ${diffDays}d`, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800/60" };
    } else if (diffDays === 0) {
      return { text: dateFormatted, sub: `Due Today`, color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-950/50", border: "border-orange-200 dark:border-orange-800/60" };
    } else {
      return { text: dateFormatted, sub: `Overdue ${Math.abs(diffDays)}d`, color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800/60" };
    }
  };

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone?.includes(search) ||
      c.clientId?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    return c.subscriptionStatus === statusFilter;
  });

  const totalCount = clients.length;
  const activeCount = clients.filter(c => c.subscriptionStatus === "ACTIVE").length;
  const pastDueCount = clients.filter(c => c.subscriptionStatus === "PAST_DUE").length;
  const trialCount = clients.filter(c => c.subscriptionStatus === "TRIAL").length;
  const blockedCount = clients.filter(c => c.subscriptionStatus === "BLOCKED").length;
  const totalMRR = clients.filter(c => c.subscriptionStatus === "ACTIVE").reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <Building2 size={20} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              SaaS Tenant & Module Control Center
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Manage client credentials, toggle individual business modules ON/OFF, and monitor real-time quotas with strict multi-tenant isolation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            title="Refresh All Clients & Quotas"
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={17} />
            <span>Onboard New Client</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Total Tenants</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">Active Accounts</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">Active MRR</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{totalMRR.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">Past Due</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pastDueCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Free Trial</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{trialCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">Suspended</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{blockedCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {[
            { id: "ALL", label: "All Clients", count: totalCount },
            { id: "ACTIVE", label: "Active", count: activeCount, color: "text-emerald-600 dark:text-emerald-400" },
            { id: "PAST_DUE", label: "Past Due", count: pastDueCount, color: "text-amber-600 dark:text-amber-400" },
            { id: "TRIAL", label: "Trial", count: trialCount, color: "text-blue-600 dark:text-blue-400" },
            { id: "BLOCKED", label: "Blocked", count: blockedCount, color: "text-rose-600 dark:text-rose-400" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700/80 " + (tab.color || "text-slate-600 dark:text-slate-300")
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Loading client directory & module states...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Building2 size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No matching clients found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Try adjusting your search query or onboard a new SaaS tenant above.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Onboard Client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">Business & Contact</th>
                  <th className="py-3.5 px-4">Plan & Status</th>
                  <th className="py-3.5 px-4">Active Modules (Feature Gating)</th>
                  <th className="py-3.5 px-4">Renewal & Due</th>
                  <th className="py-3.5 px-4">Message & AI Quotas</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filtered.map((client) => {
                  const statusConf = STATUS_CONFIG[client.subscriptionStatus] || STATUS_CONFIG.ACTIVE;
                  const dueInfo = formatDueDate(client.currentPeriodEnd);
                  const enabledMods = parseEnabledModules(client.enabledModules);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Business & Contact */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                            {client.businessName?.charAt(0).toUpperCase() || "B"}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {client.businessName}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} className="text-slate-400" />
                              <span>{client.contactEmail}</span>
                            </div>
                            {client.contactPhone && (
                              <div className="text-slate-400 dark:text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                                <Smartphone size={11} />
                                <span>{client.contactPhone}</span>
                              </div>
                            )}
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-mono">ID: {client.id.slice(0, 8)}...</span>
                              <button
                                onClick={() => copyToClipboard(client.id, client.id)}
                                title="Copy Client ID"
                                className="text-slate-400 hover:text-indigo-600 p-0.5"
                              >
                                {copiedId === client.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Status */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${statusConf.bg} ${statusConf.border} ${statusConf.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} animate-pulse`} />
                            {statusConf.label}
                          </span>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {client.subscriptionPlan} • <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{client.monthlyFee?.toLocaleString()}/mo</span>
                          </div>
                        </div>
                      </td>

                      {/* Active Modules (Feature Gating) */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Layers size={13} /> {enabledMods.length} / {ALL_MODULE_KEYS.length} Modules
                            </span>
                            <button
                              onClick={() => handleOpenModules(client)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Sliders size={10} /> Edit
                            </button>
                          </div>
                          
                          {/* Module Icons Preview Strip */}
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {enabledMods.slice(0, 7).map(modKey => {
                              const m = MASTER_MODULES[modKey];
                              return (
                                <span
                                  key={modKey}
                                  title={m?.name || modKey}
                                  className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 flex items-center justify-center text-[10px] text-slate-700 dark:text-slate-300"
                                >
                                  {m?.icon || "📦"}
                                </span>
                              );
                            })}
                            {enabledMods.length > 7 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                                +{enabledMods.length - 7}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Renewal & Due Date */}
                      <td className="py-4 px-4">
                        <div>
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${dueInfo.bg} ${dueInfo.border} ${dueInfo.color}`}>
                            {dueInfo.text}
                          </span>
                          {dueInfo.sub && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                              {dueInfo.sub}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Message & AI Quotas */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MessageSquare size={11} className="text-sky-500" /> Msgs
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {client.messagesUsedCount || 0} <span className="text-slate-400 font-normal">/ {client.monthlyMessageQuota?.toLocaleString() || 5000}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Bot size={11} className="text-purple-500" /> AI
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {client.aiRepliesUsedCount || 0} <span className="text-slate-400 font-normal">/ {client.monthlyAiQuota?.toLocaleString() || 500}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate / Login As */}
                          <button
                            onClick={() => handleGhostLogin(client)}
                            disabled={impersonating === client.id}
                            title="1-Click Super-Admin Login to Client Portal"
                            className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            <span>{impersonating === client.id ? "Entering..." : "Login"}</span>
                          </button>

                          {/* Collect Payment */}
                          <button
                            onClick={() => handleOpenPayment(client)}
                            title="Record Payment & Generate Invoice"
                            className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CreditCard size={12} />
                            <span className="hidden sm:inline">Collect</span>
                          </button>

                          {/* Receipts / History */}
                          <button
                            onClick={() => handleOpenReceipts(client)}
                            title="Payment History & Tax Invoices"
                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                          >
                            <FileText size={14} />
                          </button>

                          {/* Edit Client */}
                          <button
                            onClick={() => handleOpenEdit(client)}
                            title="Edit Credentials & Settings"
                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Meta Health Check */}
                          <button
                            onClick={() => handleCheckMetaHealth(client)}
                            title="Verify WhatsApp Cloud API Health"
                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                          >
                            {checkingMetaId === client.id ? <RefreshCw size={14} className="animate-spin text-indigo-600" /> : <Activity size={14} />}
                          </button>

                          {/* Block / Unblock */}
                          <button
                            onClick={() => handleToggleBlock(client)}
                            title={client.subscriptionStatus === "BLOCKED" ? "Unblock Client" : "Suspend / Block Client"}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              client.subscriptionStatus === "BLOCKED"
                                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800"
                                : "text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800"
                            }`}
                          >
                            {client.subscriptionStatus === "BLOCKED" ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(client)}
                            title="Delete Client Permanently"
                            className="p-1.5 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Sliders size={18} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Manage Modules for {modulesClient.businessName}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Enable or disable individual business modules for this tenant. Disabled modules will be hidden or locked with upgrade gates.
                </p>
              </div>
              <button
                onClick={() => setModulesClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* 1-Click Industry Presets */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Sparkles size={13} /> 1-Click Industry Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_MODULE_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset.modules)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Count & Batch Select Bar */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Active Modules: <b className="text-indigo-600 dark:text-indigo-400">{activeClientModules.length}</b> / {ALL_MODULE_KEYS.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveClientModules(ALL_MODULE_KEYS)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  Select All (10)
                </button>
                <button
                  onClick={() => setActiveClientModules(["INBOX"])}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 cursor-pointer"
                >
                  Minimal Only
                </button>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {ALL_MODULE_KEYS.map(modKey => {
                const m = MASTER_MODULES[modKey];
                const isEnabled = activeClientModules.includes(modKey);

                return (
                  <div
                    key={modKey}
                    onClick={() => handleToggleModule(modKey)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isEnabled
                        ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{m?.icon || "📦"}</span>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">{m?.name || modKey}</span>
                        </div>
                        {/* Custom Switch Indicator */}
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}>
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isEnabled ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {m?.tagline || ""}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {m?.category || "FEATURE"}
                      </span>
                      <span className={`text-[10px] font-black ${isEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {isEnabled ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModulesClient(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModules}
                disabled={isSavingModules}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSavingModules ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{isSavingModules ? "Saving Modules..." : "Save & Update Permissions"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ➕ ONBOARD NEW CLIENT MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Plus size={18} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Onboard New SaaS Tenant
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Create isolated client credentials, set message quotas, and configure default subscription entitlements.
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-6">
              {/* Basic Business Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Business / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Fashion Corp"
                    value={form.businessName}
                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Admin Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@acme.com"
                    value={form.contactEmail}
                    onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Admin Master Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? "text" : "password"}
                      required
                      value={form.adminPassword}
                      onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAddPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={form.contactPhone}
                    onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Plan Selection Tier Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Subscription Package Plan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {DEFAULT_PLAN_TIERS.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => handlePlanSelectInAdd(plan.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        form.subscriptionPlan === plan.id
                          ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-white shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="font-black text-xs">{plan.name}</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{plan.monthlyFee}/mo</div>
                      <div className="text-[10px] text-slate-400 mt-1">{plan.monthlyMessageQuota.toLocaleString()} msgs • {plan.modules.length} mods</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quotas & Pricing Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Monthly Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={form.monthlyFee}
                    onChange={e => setForm({ ...form, monthlyFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Monthly Message Quota
                  </label>
                  <input
                    type="number"
                    value={form.monthlyMessageQuota}
                    onChange={e => setForm({ ...form, monthlyMessageQuota: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Monthly AI Replies Quota
                  </label>
                  <input
                    type="number"
                    value={form.monthlyAiQuota}
                    onChange={e => setForm({ ...form, monthlyAiQuota: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Optional Meta Cloud API Credentials Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMetaFields(!showMetaFields)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                >
                  <span>{showMetaFields ? "− Hide Meta Cloud API Fields" : "+ Configure Meta WhatsApp Cloud API Credentials Now (Optional)"}</span>
                </button>

                {showMetaFields && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">WhatsApp Business Account ID (WABA ID)</label>
                        <input
                          type="text"
                          placeholder="e.g. 1092837465..."
                          value={form.wabaId}
                          onChange={e => setForm({ ...form, wabaId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number ID</label>
                        <input
                          type="text"
                          placeholder="e.g. 1029384756..."
                          value={form.phoneId}
                          onChange={e => setForm({ ...form, phoneId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Meta Permanent System User Access Token</label>
                      <input
                        type="password"
                        placeholder="EAAB..."
                        value={form.metaAccessToken}
                        onChange={e => setForm({ ...form, metaAccessToken: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create & Launch Tenant</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 🎉 ONBOARD SUCCESS INFO MODAL */}
      {addSuccessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Client Successfully Onboarded!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Share these credentials with the client admin for their initial login.
              </p>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Business:</span>
                <span className="font-bold text-slate-900 dark:text-white">{addSuccessInfo.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admin Email:</span>
                <span className="font-bold text-slate-900 dark:text-white">{addSuccessInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{addSuccessInfo.password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-emerald-600">{addSuccessInfo.plan}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                <span className="text-slate-500">Webhook URL:</span>
                <span className="font-mono text-[10px] break-all bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  {addSuccessInfo.webhookUrl}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAddSuccessInfo(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* 💳 RECORD PAYMENT & INVOICE MODAL */}
      {paymentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <CreditCard size={18} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Record Payment for {paymentClient.businessName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record subscription collection and automatically extend the client's active billing cycle.
                </p>
              </div>
              <button
                onClick={() => setPaymentClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Amount Collected (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-emerald-600 text-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Extend Validity By (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={payCycleMonths}
                  onChange={e => setPayCycleMonths(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  UTR / Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-129384756192"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Internal Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via GPay business account"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentClient(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingPay ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirm & Activate Cycle</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 📄 PAYMENT RECEIPTS HISTORY MODAL */}
      {receiptsClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <FileText size={18} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Payment History for {receiptsClient.businessName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed ledger of recorded subscription transactions and printable tax receipts.
                </p>
              </div>
              <button
                onClick={() => setReceiptsClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {loadingPayments ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                <span>Loading payment ledger...</span>
              </div>
            ) : paymentsHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm">No payment records found for this client yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentsHistory.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{p.amount?.toLocaleString()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{p.paymentMethod}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Date: {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {p.transactionRef && ` • Ref: ${p.transactionRef}`}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedReceipt(p)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5"
                    >
                      <Printer size={13} /> View Receipt
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setReceiptsClient(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🧾 SINGLE PRINTABLE RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">OFFICIAL PAYMENT RECEIPT</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">WhatMore SaaS Platform</h3>
              <p className="text-[11px] text-slate-500">Invoice ID: {selectedReceipt.id.slice(0, 12)}</p>
            </div>

            <div className="space-y-2.5 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Client:</span>
                <span className="font-bold text-slate-900 dark:text-white">{receiptsClient?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-emerald-600 text-sm">₹{selectedReceipt.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedReceipt.transactionRef || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-700 dark:text-slate-300">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT CLIENT MODAL */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Edit3 size={18} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Edit Client: {editClient.businessName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update plan tier, message quotas, next due date, and Meta API integration tokens.
                </p>
              </div>
              <button
                onClick={() => setEditClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
                  <select
                    value={editClient.subscriptionPlan}
                    onChange={e => setEditClient({ ...editClient, subscriptionPlan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    {PLANS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={editClient.monthlyFee || 0}
                    onChange={e => setEditClient({ ...editClient, monthlyFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Quota</label>
                  <input
                    type="number"
                    value={editMsgQuota}
                    onChange={e => setEditMsgQuota(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">AI Replies Quota</label>
                  <input
                    type="number"
                    value={editAiQuota}
                    onChange={e => setEditAiQuota(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Next Renewal Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Password Override</label>
                  <input
                    type="text"
                    placeholder="Leave as-is or type new password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Meta Credentials Sub-section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditMeta(!showEditMeta)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showEditMeta ? "− Hide Meta WABA Credentials" : "+ Edit Meta WABA Credentials & Tokens"}
                </button>

                {showEditMeta && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">WABA ID</label>
                        <input
                          type="text"
                          value={editClient.wabaId || ""}
                          onChange={e => setEditClient({ ...editClient, wabaId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number ID</label>
                        <input
                          type="text"
                          value={editClient.phoneId || ""}
                          onChange={e => setEditClient({ ...editClient, phoneId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Meta Permanent Access Token</label>
                      <input
                        type="password"
                        value={editClient.metaAccessToken || ""}
                        onChange={e => setEditClient({ ...editClient, metaAccessToken: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditClient(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 📡 META HEALTH RESULT MODAL */}
      {metaHealthResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Activity size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Meta Cloud API Health Check
              </h3>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">WABA Token Status:</span>
                <span className={`font-bold ${metaHealthResult.tokenValid ? "text-emerald-600" : "text-rose-600"}`}>
                  {metaHealthResult.tokenValid ? "Valid & Active ✅" : "Invalid / Expired ❌"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Status:</span>
                <span className="font-bold text-slate-900 dark:text-white">{metaHealthResult.phoneStatus || "CONNECTED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quality Rating:</span>
                <span className="font-bold text-emerald-600">{metaHealthResult.qualityRating || "GREEN (High)"}</span>
              </div>
            </div>

            <button
              onClick={() => setMetaHealthResult(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
