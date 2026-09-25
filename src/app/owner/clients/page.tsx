"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  ChevronUp,
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
  Printer,
  LayoutGrid,
  List,
  Table as TableIcon,
  MoreVertical,
  ArrowUpDown,
  Filter,
  Zap,
  ShoppingBag,
  Info,
  Globe,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  ChevronRight as ArrowRight,
  Wrench
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
  updateClientPlanTierAction,
  topUpClientQuotaAction,
  repairClientMetaWebhookAction
} from "@/app/actions/ownerPortalActions";
import {
  MASTER_MODULES,
  DEFAULT_PLAN_TIERS,
  INDUSTRY_MODULE_PRESETS,
  ALL_MODULE_KEYS,
  ModuleKey,
  parseEnabledModules
} from "@/lib/moduleRegistry";

const PLANS = ["ALL", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE", "CUSTOM"];

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  ACTIVE:   { bg: "bg-emerald-50 dark:bg-emerald-950/60", border: "border-emerald-200 dark:border-emerald-800/80", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", label: "Active" },
  TRIAL:    { bg: "bg-blue-50 dark:bg-blue-950/60", border: "border-blue-200 dark:border-blue-800/80", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", label: "Trial" },
  PAST_DUE: { bg: "bg-amber-50 dark:bg-amber-950/60", border: "border-amber-200 dark:border-amber-800/80", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", label: "Past Due" },
  BLOCKED:  { bg: "bg-rose-50 dark:bg-rose-950/60", border: "border-rose-200 dark:border-rose-800/80", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", label: "Blocked" },
};

const PLAN_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  STARTER:    { bg: "bg-emerald-50 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/80" },
  GROWTH:     { bg: "bg-indigo-50 dark:bg-indigo-950/60", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/80" },
  BUSINESS:   { bg: "bg-amber-50 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/80" },
  ENTERPRISE: { bg: "bg-purple-50 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800/80" },
  TRIAL:      { bg: "bg-sky-50 dark:bg-sky-950/60", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-800/80" },
  CUSTOM:     { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700" },
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
  const [planFilter, setPlanFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "NAME" | "MRR" | "DUE_DATE" | "USAGE">("NEWEST");
  const [viewMode, setViewMode] = useState<"TABLE" | "CARDS" | "COMPACT">("TABLE");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
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
  const [repairingClientId, setRepairingClientId] = useState<string | null>(null);

  // Top-Up Quota Modal
  const [topUpClient, setTopUpClient] = useState<any | null>(null);
  const [topUpForm, setTopUpForm] = useState({
    addMessages: 5000,
    addAiReplies: 500,
    resetCounter: false
  });
  const [submittingTopUp, setSubmittingTopUp] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = 0;
    }
  }, [viewMode, clients]);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".action-menu-container")) {
        setActiveActionDropdown(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Restore saved view mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem("wm_clients_view_mode") as any;
    if (savedMode && ["TABLE", "CARDS", "COMPACT"].includes(savedMode)) {
      setViewMode(savedMode);
    }
  }, []);

  const handleSetViewMode = (mode: "TABLE" | "CARDS" | "COMPACT") => {
    setViewMode(mode);
    localStorage.setItem("wm_clients_view_mode", mode);
  };

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

  const toggleExpandClient = (id: string) => {
    setExpandedClients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    const defaultPassword = "WhatIn@" + Math.floor(100000 + Math.random() * 900000);
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
    setActiveActionDropdown(null);
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

  const handleOpenTopUp = (client: any) => {
    setActiveActionDropdown(null);
    setTopUpClient(client);
    setTopUpForm({
      addMessages: 5000,
      addAiReplies: 500,
      resetCounter: false
    });
  };

  const handleSubmitTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpClient) return;
    setSubmittingTopUp(true);
    const res = await topUpClientQuotaAction(topUpClient.id, topUpForm);
    setSubmittingTopUp(false);
    if (res.success) {
      setTopUpClient(null);
      load();
    } else {
      alert("Error adding top-up: " + res.error);
    }
  };

  const handleRepairWebhook = async (client: any) => {
    setActiveActionDropdown(null);
    setRepairingClientId(client.id);
    const res = await repairClientMetaWebhookAction(client.id);
    setRepairingClientId(null);
    if (res.success) {
      alert(res.message);
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleOpenPayment = (client: any) => {
    setActiveActionDropdown(null);
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
    setActiveActionDropdown(null);
    setReceiptsClient(client);
    setLoadingPayments(true);
    const res = await getClientPaymentsAction(client.id);
    if (res.success && res.payments) {
      setPaymentsHistory(res.payments);
    }
    setLoadingPayments(false);
  };

  const handleCheckMetaHealth = async (client: any) => {
    setActiveActionDropdown(null);
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
    setActiveActionDropdown(null);
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
    setActiveActionDropdown(null);
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
    setActiveActionDropdown(null);
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
    setActiveActionDropdown(null);
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
    if (!dateStr) return { text: "No Expiry", sub: "Lifetime", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700" };
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateFormatted = due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (diffDays > 7) {
      return { text: dateFormatted, sub: `Due in ${diffDays}d`, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800/60" };
    } else if (diffDays > 0) {
      return { text: dateFormatted, sub: `Due in ${diffDays}d`, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800/60" };
    } else if (diffDays === 0) {
      return { text: dateFormatted, sub: `Due Today`, color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-950/50", border: "border-orange-200 dark:border-orange-800/60" };
    } else {
      return { text: dateFormatted, sub: `Overdue ${Math.abs(diffDays)}d`, color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800/60" };
    }
  };

  const getQuotaProgress = (used: number = 0, total: number = 5000) => {
    if (!total || total <= 0) return { pct: 0, barColor: "bg-emerald-500", textColor: "text-emerald-600" };
    const pct = Math.min(100, Math.round((used / total) * 100));
    let barColor = "bg-emerald-500";
    let textColor = "text-emerald-600 dark:text-emerald-400";
    if (pct >= 90) {
      barColor = "bg-rose-500";
      textColor = "text-rose-600 dark:text-rose-400";
    } else if (pct >= 75) {
      barColor = "bg-amber-500";
      textColor = "text-amber-600 dark:text-amber-400";
    }
    return { pct, barColor, textColor };
  };

  // Filter & Sort Clients
  const filtered = clients.filter(c => {
    const matchesSearch =
      c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone?.includes(search) ||
      c.id?.toLowerCase().includes(search.toLowerCase()) ||
      c.clientId?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && c.subscriptionStatus !== statusFilter) return false;
    if (planFilter !== "ALL" && c.subscriptionPlan !== planFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "NAME") return (a.businessName || "").localeCompare(b.businessName || "");
    if (sortBy === "MRR") return (b.monthlyFee || 0) - (a.monthlyFee || 0);
    if (sortBy === "DUE_DATE") {
      const dateA = a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : Infinity;
      const dateB = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : Infinity;
      return dateA - dateB;
    }
    if (sortBy === "USAGE") return (b.messagesUsedCount || 0) - (a.messagesUsedCount || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const totalCount = clients.length;
  const activeCount = clients.filter(c => c.subscriptionStatus === "ACTIVE").length;
  const pastDueCount = clients.filter(c => c.subscriptionStatus === "PAST_DUE").length;
  const trialCount = clients.filter(c => c.subscriptionStatus === "TRIAL").length;
  const blockedCount = clients.filter(c => c.subscriptionStatus === "BLOCKED").length;
  const totalMRR = clients.filter(c => c.subscriptionStatus === "ACTIVE").reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  return (
    <main className="w-full px-4 sm:px-6 lg:px-10 py-7 space-y-7">
      
      {/* 🌟 Top Page Header & Executive Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md">
              <Zap size={13} className="text-amber-400 animate-pulse" /> Super-Admin Control Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            SaaS Tenant & Module Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Manage multi-tenant credentials, 1-click feature gating, payment reconciliation, and real-time usage quotas.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            title="Refresh All Clients & Quotas"
            className="p-3 rounded-2xl text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw size={17} className={loading ? "animate-spin text-indigo-400" : ""} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-600/30 flex items-center gap-2.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-indigo-400/30"
          >
            <Plus size={18} />
            <span>Onboard New Tenant</span>
          </button>
        </div>
      </div>

      {/* 📊 Executive KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Tenants */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Tenants</span>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalCount}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-1">Managed accounts</div>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {activeCount}
          </div>
          <div className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            {totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}% Healthy
          </div>
        </div>

        {/* Active MRR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active MRR</span>
            <TrendingUp size={16} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            ₹{totalMRR.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-indigo-600/80 dark:text-indigo-400/80 mt-1">Monthly recurring</div>
        </div>

        {/* Past Due */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/60 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Past Due</span>
            <Clock size={16} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {pastDueCount}
          </div>
          <div className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 mt-1">Payment pending</div>
        </div>

        {/* Free Trial */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/60 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Free Trial</span>
            <Sparkles size={16} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
            {trialCount}
          </div>
          <div className="text-[10px] font-bold text-blue-600/80 dark:text-blue-400/80 mt-1">Evaluating</div>
        </div>

        {/* Suspended */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/60 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Suspended</span>
            <ShieldAlert size={16} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {blockedCount}
          </div>
          <div className="text-[10px] font-bold text-rose-600/80 dark:text-rose-400/80 mt-1">Blocked / Inactive</div>
        </div>

      </div>

      {/* 🎛️ Master Layout Toolbar & Filter Suite */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Top Controls Row: Status Filters + View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/70">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {[
              { id: "ALL", label: "All Tenants", count: totalCount },
              { id: "ACTIVE", label: "Active", count: activeCount, color: "text-emerald-600 dark:text-emerald-400" },
              { id: "PAST_DUE", label: "Past Due", count: pastDueCount, color: "text-amber-600 dark:text-amber-400" },
              { id: "TRIAL", label: "Trial", count: trialCount, color: "text-blue-600 dark:text-blue-400" },
              { id: "BLOCKED", label: "Blocked", count: blockedCount, color: "text-rose-600 dark:text-rose-400" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700 " + (tab.color || "text-slate-600 dark:text-slate-300")
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 self-end lg:self-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              onClick={() => handleSetViewMode("TABLE")}
              title="Table View (Data Grid)"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>

            <button
              onClick={() => handleSetViewMode("CARDS")}
              title="Card Grid View"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "CARDS"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>

            <button
              onClick={() => handleSetViewMode("COMPACT")}
              title="Compact Operational View"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "COMPACT"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List size={14} />
              <span>Compact</span>
            </button>
          </div>

        </div>

        {/* Bottom Controls Row: Search + Plan Filter + Sorting */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by business name, email, phone, tenant ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Plan Filter & Sort Dropdowns */}
          <div className="flex items-center gap-2">
            
            {/* Plan Tier Dropdown */}
            <div className="relative">
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="px-3 py-2.5 pr-8 rounded-2xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                <option value="ALL">All Plans</option>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="BUSINESS">Business</option>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="CUSTOM">Custom</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 pr-8 rounded-2xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                <option value="NEWEST">Sort: Newest First</option>
                <option value="NAME">Sort: Name (A-Z)</option>
                <option value="MRR">Sort: Highest MRR</option>
                <option value="DUE_DATE">Sort: Renewal Due</option>
                <option value="USAGE">Sort: Message Usage</option>
              </select>
              <ArrowUpDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {(search || statusFilter !== "ALL" || planFilter !== "ALL") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("ALL"); setPlanFilter("ALL"); }}
                className="px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 transition-all cursor-pointer whitespace-nowrap"
              >
                Clear
              </button>
            )}

          </div>

        </div>

      </div>

      {/* 📋 Client Views (Table / Cards / Compact) */}
      {loading ? (
        <div className="p-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
          <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Syncing Client Records & Quotas...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Validating multi-tenant isolation states.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">No matching SaaS tenants found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Try adjusting your search criteria, reset active filters, or onboard a new client business.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Onboard New Tenant
          </button>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. TABLE VIEW (Modern Professional Data Grid)             */}
          {/* ========================================================= */}
          {viewMode === "TABLE" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-visible">
              <div ref={tableContainerRef} className="overflow-x-auto min-h-[380px] rounded-3xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-4 px-6 w-[27%] min-w-[220px]">Business & Contact</th>
                      <th className="py-4 px-5 w-[15%] min-w-[140px]">Plan & Status</th>
                      <th className="py-4 px-5 w-[18%] min-w-[170px]">Active Modules</th>
                      <th className="py-4 px-5 w-[13%] min-w-[130px]">Renewal & Due</th>
                      <th className="py-4 px-5 w-[15%] min-w-[150px]">Usage & Quotas</th>
                      <th className="py-4 px-6 text-right w-[12%] min-w-[160px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {filtered.map((client) => {
                      const statusConf = STATUS_CONFIG[client.subscriptionStatus] || STATUS_CONFIG.ACTIVE;
                      const planBadge = PLAN_BADGES[client.subscriptionPlan] || PLAN_BADGES.CUSTOM;
                      const dueInfo = formatDueDate(client.currentPeriodEnd);
                      const enabledMods = parseEnabledModules(client.enabledModules);
                      const msgQuota = getQuotaProgress(client.messagesUsedCount || 0, client.monthlyMessageQuota || 5000);
                      const aiQuota = getQuotaProgress(client.aiRepliesUsedCount || 0, client.monthlyAiQuota || 500);
                      const isExpanded = !!expandedClients[client.id];

                      return (
                        <React.Fragment key={client.id}>
                          <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isExpanded ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""}`}>
                            
                            {/* 1. Business & Contact */}
                            <td className="py-4 px-6">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                  {client.businessName?.charAt(0).toUpperCase() || "B"}
                                </div>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-900 dark:text-white text-sm" title={client.businessName}>
                                      {client.businessName}
                                    </span>
                                    <button
                                      onClick={() => toggleExpandClient(client.id)}
                                      title="Toggle deep tenant details"
                                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                    >
                                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                  </div>
                                  <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1" title={client.contactEmail}>
                                    <Mail size={11} className="shrink-0 text-slate-400" />
                                    <span>{client.contactEmail}</span>
                                  </div>
                                  {client.contactPhone && (
                                    <div className="text-slate-400 dark:text-slate-500 text-[11px] flex items-center gap-1">
                                      <Smartphone size={11} className="shrink-0" />
                                      <span>{client.contactPhone}</span>
                                    </div>
                                  )}
                                  <div className="pt-0.5 flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {client.id.slice(0, 8)}...</span>
                                    <button
                                      onClick={() => copyToClipboard(client.id, client.id)}
                                      title="Copy full tenant ID"
                                      className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                                    >
                                      {copiedId === client.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Plan & Status */}
                            <td className="py-4 px-5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusConf.bg} ${statusConf.border} ${statusConf.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} animate-pulse`} />
                                    {statusConf.label}
                                  </span>
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${planBadge.bg} ${planBadge.border} ${planBadge.text}`}>
                                    {client.subscriptionPlan}
                                  </span>
                                </div>
                                <div className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                  ₹{client.monthlyFee?.toLocaleString()}<span className="text-slate-400 font-normal text-[11px]">/mo</span>
                                </div>
                              </div>
                            </td>

                            {/* 3. Active Modules */}
                            <td className="py-4 px-5">
                              <div className="space-y-1.5">
                                <button
                                  onClick={() => handleOpenModules(client)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer shadow-2xs group"
                                >
                                  <Layers size={13} className="text-indigo-500 group-hover:rotate-12 transition-transform" />
                                  <span>{enabledMods.length} / {ALL_MODULE_KEYS.length} Modules</span>
                                  <Sliders size={11} className="text-indigo-400 ml-0.5" />
                                </button>
                                <div className="flex items-center gap-1">
                                  {enabledMods.slice(0, 5).map(k => (
                                    <span key={k} title={MASTER_MODULES[k]?.name || k} className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px]">
                                      {MASTER_MODULES[k]?.icon || "📦"}
                                    </span>
                                  ))}
                                  {enabledMods.length > 5 && (
                                    <span className="text-[10px] font-bold text-slate-400 px-1">
                                      +{enabledMods.length - 5}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 4. Renewal & Due */}
                            <td className="py-4 px-5">
                              <div className="space-y-1">
                                <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${dueInfo.bg} ${dueInfo.border} ${dueInfo.color}`}>
                                  {dueInfo.text}
                                </span>
                                {dueInfo.sub && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold pl-1">
                                    {dueInfo.sub}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 5. Usage & Quotas (Visual Progress Bars) */}
                            <td className="py-4 px-5">
                              <div className="space-y-2 min-w-[150px]">
                                {/* Messages Quota */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                                      <MessageSquare size={11} className="text-sky-500" /> Messages
                                    </span>
                                    <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[10px]">
                                      {client.messagesUsedCount || 0} <span className="text-slate-400 font-normal">/ {(client.monthlyMessageQuota || 5000).toLocaleString()}</span>
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div className={`h-full rounded-full ${msgQuota.barColor} transition-all duration-500`} style={{ width: `${msgQuota.pct}%` }} />
                                  </div>
                                </div>

                                {/* AI Quota */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                                      <Bot size={11} className="text-purple-500" /> AI Replies
                                    </span>
                                    <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[10px]">
                                      {client.aiRepliesUsedCount || 0} <span className="text-slate-400 font-normal">/ {(client.monthlyAiQuota || 500).toLocaleString()}</span>
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div className={`h-full rounded-full ${aiQuota.barColor} transition-all duration-500`} style={{ width: `${aiQuota.pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 6. Clean Actions Suite */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2 action-menu-container relative">
                                
                                {/* 1-Click Login / Impersonate */}
                                <button
                                  onClick={() => handleGhostLogin(client)}
                                  disabled={impersonating === client.id}
                                  title="1-Click Super-Admin Impersonation into Client Dashboard"
                                  className="px-3 py-1.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                                >
                                  {impersonating === client.id ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Zap size={12} className="text-amber-300" />
                                  )}
                                  <span>{impersonating === client.id ? "Entering..." : "Login"}</span>
                                </button>

                                {/* Record Payment */}
                                <button
                                  onClick={() => handleOpenPayment(client)}
                                  title="Record Payment & Extend Cycle"
                                  className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                >
                                  <CreditCard size={12} />
                                  <span>Collect</span>
                                </button>

                                {/* More Actions Dropdown Menu */}
                                <div className="relative">
                                  <button
                                    onClick={() => setActiveActionDropdown(activeActionDropdown === client.id ? null : client.id)}
                                    title="More Options"
                                    className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                  >
                                    <MoreVertical size={14} />
                                  </button>

                                  {activeActionDropdown === client.id && (
                                    <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 text-left animate-fade-in">
                                      <button
                                        onClick={() => handleOpenModules(client)}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Sliders size={14} className="text-indigo-500" />
                                        <span>Feature Gating & Modules</span>
                                      </button>
                                      
                                      <button
                                        onClick={() => handleOpenEdit(client)}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Edit3 size={14} className="text-slate-400" />
                                        <span>Edit Plan & Credentials</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenReceipts(client)}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <FileText size={14} className="text-slate-400" />
                                        <span>Payment Ledger & Receipts</span>
                                      </button>

                                      <button
                                        onClick={() => handleCheckMetaHealth(client)}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Activity size={14} className="text-slate-400" />
                                        <span>Check Meta API Health</span>
                                      </button>

                                      <button
                                        onClick={() => handleOpenTopUp(client)}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Zap size={14} className="text-amber-500" />
                                        <span>Add Quota Top-Up</span>
                                      </button>

                                      <button
                                        onClick={() => handleRepairWebhook(client)}
                                        disabled={repairingClientId === client.id}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Wrench size={14} className="text-emerald-500" />
                                        <span>{repairingClientId === client.id ? "Repairing..." : "Repair Meta Webhook"}</span>
                                      </button>

                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                      <button
                                        onClick={() => handleToggleBlock(client)}
                                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                                          client.subscriptionStatus === "BLOCKED"
                                            ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                                            : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60"
                                        }`}
                                      >
                                        {client.subscriptionStatus === "BLOCKED" ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                        <span>{client.subscriptionStatus === "BLOCKED" ? "Unblock Tenant" : "Suspend Tenant"}</span>
                                      </button>

                                      <button
                                        onClick={() => handleDelete(client)}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Trash2 size={14} />
                                        <span>Delete Permanently</span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>

                          </tr>

                          {/* Expandable Tenant Quick-View Accordion */}
                          {isExpanded && (
                            <tr className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                              <td colSpan={6} className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                  
                                  {/* Meta Credentials Summary */}
                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                                    <div className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                      <Activity size={13} /> Meta WhatsApp API
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">WABA ID:</span>{" "}
                                      <span className="font-mono text-[11px]">{client.wabaId ? `${client.wabaId.slice(0, 10)}...` : "Not Configured"}</span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Phone ID:</span>{" "}
                                      <span className="font-mono text-[11px]">{client.phoneId || "Not Configured"}</span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Token Status:</span>{" "}
                                      <span className={client.metaAccessToken ? "text-emerald-600 font-bold" : "text-amber-500"}>
                                        {client.metaAccessToken ? "Installed" : "Pending"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Shopify / Commerce Info */}
                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                                    <div className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <ShoppingBag size={13} /> Commerce Sync
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Shopify Domain:</span>{" "}
                                      <span className="font-mono text-[11px]">{client.shopifyDomain || "None"}</span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Max Agents:</span>{" "}
                                      <span>{client.maxAgents || 3} Team Seats</span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Registered Agents:</span>{" "}
                                      <span className="font-bold text-slate-900 dark:text-white">{client.agents?.length || 0} active</span>
                                    </div>
                                  </div>

                                  {/* Webhook Endpoints */}
                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                                    <div className="text-[11px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                      <Globe size={13} /> Dedicated Webhook
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Verify Token:</span>{" "}
                                      <span className="font-mono text-[11px]">{client.webhookVerifyToken || "Auto"}</span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 truncate" title={client.webhookClientId ? `/api/whatsapp/webhook/${client.webhookClientId}` : ""}>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Endpoint:</span>{" "}
                                      <span className="font-mono text-[10px]">{client.webhookClientId ? `.../${client.webhookClientId.slice(0, 10)}` : "None"}</span>
                                    </div>
                                  </div>

                                  {/* Quick Operations */}
                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                                    <div>
                                      <div className="text-[11px] font-black uppercase text-slate-500 mb-1">Fast Quick-Links</div>
                                      <p className="text-[11px] text-slate-400">Launch client tools directly</p>
                                                          <div className="grid grid-cols-2 gap-1.5 pt-2">
                                      <button
                                        onClick={() => handleOpenTopUp(client)}
                                        className="py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] text-center hover:bg-amber-100 flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Zap size={11} className="text-amber-500" />
                                        <span>+ Top-Up</span>
                                      </button>
                                      <button
                                        onClick={() => handleRepairWebhook(client)}
                                        disabled={repairingClientId === client.id}
                                        className="py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] text-center hover:bg-emerald-100 flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Wrench size={11} />
                                        <span>{repairingClientId === client.id ? "Repairing..." : "Heal Webhook"}</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenModules(client)}
                                        className="py-1.5 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] text-center hover:bg-indigo-100 cursor-pointer"
                                      >
                                        Modules
                                      </button>
                                      <button
                                        onClick={() => handleOpenEdit(client)}
                                        className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] text-center hover:bg-slate-200 cursor-pointer"
                                      >
                                        Settings
                                      </button>
                                    </div>               </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. CARD GRID VIEW (Visual Modern Tenant Cards)           */}
          {/* ========================================================= */}
          {viewMode === "CARDS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((client) => {
                const statusConf = STATUS_CONFIG[client.subscriptionStatus] || STATUS_CONFIG.ACTIVE;
                const planBadge = PLAN_BADGES[client.subscriptionPlan] || PLAN_BADGES.CUSTOM;
                const dueInfo = formatDueDate(client.currentPeriodEnd);
                const enabledMods = parseEnabledModules(client.enabledModules);
                const msgQuota = getQuotaProgress(client.messagesUsedCount || 0, client.monthlyMessageQuota || 5000);
                const aiQuota = getQuotaProgress(client.aiRepliesUsedCount || 0, client.monthlyAiQuota || 500);

                return (
                  <div
                    key={client.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between relative group"
                  >
                    <div>
                      
                      {/* Card Header: Avatar + Title + Status Badges */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                            {client.businessName?.charAt(0).toUpperCase() || "B"}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate max-w-[170px]" title={client.businessName}>
                              {client.businessName}
                            </h3>
                            <div className="text-slate-400 text-xs truncate max-w-[170px] mt-0.5" title={client.contactEmail}>
                              {client.contactEmail}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusConf.bg} ${statusConf.border} ${statusConf.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                            {statusConf.label}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${planBadge.bg} ${planBadge.border} ${planBadge.text}`}>
                            {client.subscriptionPlan}
                          </span>
                        </div>
                      </div>

                      {/* Twin Metrics: MRR + Renewal */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly MRR</span>
                          <span className="text-base font-black text-slate-900 dark:text-white">₹{client.monthlyFee?.toLocaleString()}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next Renewal</span>
                          <span className={`text-xs font-black ${dueInfo.color}`}>{dueInfo.text}</span>
                        </div>
                      </div>

                      {/* Quotas Progress Bars */}
                      <div className="space-y-2.5 mb-4 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                        {/* Messages */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                              <MessageSquare size={11} className="text-sky-500" /> Messages
                            </span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[10px]">
                              {client.messagesUsedCount || 0} / {(client.monthlyMessageQuota || 5000).toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className={`h-full rounded-full ${msgQuota.barColor}`} style={{ width: `${msgQuota.pct}%` }} />
                          </div>
                        </div>

                        {/* AI */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                              <Bot size={11} className="text-purple-500" /> AI Auto-Pilot
                            </span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[10px]">
                              {client.aiRepliesUsedCount || 0} / {(client.monthlyAiQuota || 500).toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className={`h-full rounded-full ${aiQuota.barColor}`} style={{ width: `${aiQuota.pct}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Modules Preview Bar */}
                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Layers size={13} className="text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {enabledMods.length} of {ALL_MODULE_KEYS.length} Modules
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenModules(client)}
                          className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Configure →
                        </button>
                      </div>

                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => handleGhostLogin(client)}
                        disabled={impersonating === client.id}
                        className="flex-1 py-2 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Zap size={13} className="text-amber-300" />
                        <span>{impersonating === client.id ? "Entering..." : "Login to Portal"}</span>
                      </button>

                      <button
                        onClick={() => handleOpenPayment(client)}
                        title="Record Payment"
                        className="p-2 rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 transition-all cursor-pointer"
                      >
                        <CreditCard size={15} />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(client)}
                        title="Edit Settings"
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. COMPACT VIEW (High-Density Operations Row)             */}
          {/* ========================================================= */}
          {viewMode === "COMPACT" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/70">
              {filtered.map((client) => {
                const statusConf = STATUS_CONFIG[client.subscriptionStatus] || STATUS_CONFIG.ACTIVE;
                const dueInfo = formatDueDate(client.currentPeriodEnd);
                const enabledMods = parseEnabledModules(client.enabledModules);

                return (
                  <div
                    key={client.id}
                    className="p-3 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {client.businessName?.charAt(0).toUpperCase() || "B"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                            {client.businessName}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black border ${statusConf.bg} ${statusConf.border} ${statusConf.text}`}>
                            {statusConf.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {client.contactEmail} • {client.subscriptionPlan} • ₹{client.monthlyFee?.toLocaleString()}/mo
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden lg:block text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {client.messagesUsedCount || 0} / {(client.monthlyMessageQuota || 5000).toLocaleString()} msgs
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {enabledMods.length} modules active
                        </div>
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className={`text-xs font-bold ${dueInfo.color}`}>{dueInfo.text}</span>
                        <div className="text-[10px] text-slate-400">{dueInfo.sub}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleGhostLogin(client)}
                          disabled={impersonating === client.id}
                          className="px-3 py-1.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
                        >
                          <Zap size={11} />
                          <span>Login</span>
                        </button>
                        <button
                          onClick={() => handleOpenPayment(client)}
                          className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </>
      )}

      {/* ========================================================= */}
      {/* 🎛️ MODAL 1: MODULAR FEATURE GATING (Interactive Config)    */}
      {/* ========================================================= */}
      {modulesClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Sliders size={20} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Feature Gating for {modulesClient.businessName}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Toggle individual business modules. Disabled modules will be hidden or locked with upgrade gates for this tenant.
                </p>
              </div>
              <button
                onClick={() => setModulesClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={20} />
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
                  Select All ({ALL_MODULE_KEYS.length})
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
                        ? "bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{m?.icon || "📦"}</span>
                          <span className="font-black text-xs text-slate-900 dark:text-white">{m?.name || modKey}</span>
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
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSavingModules ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{isSavingModules ? "Saving Modules..." : "Save & Update Permissions"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ➕ MODAL 2: ONBOARD NEW TENANT                            */}
      {/* ========================================================= */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Plus size={20} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Onboard New SaaS Tenant
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Provision isolated tenant credentials, set quotas, and configure default subscription tier.
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={20} />
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
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={form.contactPhone}
                    onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Plan Selection Tier Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Select Subscription Plan Tier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DEFAULT_PLAN_TIERS.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => handlePlanSelectInAdd(plan.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        form.subscriptionPlan === plan.id
                          ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-white shadow-xs ring-2 ring-indigo-500/20"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-black text-xs">{plan.name}</div>
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{plan.monthlyFee}/mo</div>
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
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Monthly Messages Quota
                  </label>
                  <input
                    type="number"
                    value={form.monthlyMessageQuota}
                    onChange={e => setForm({ ...form, monthlyMessageQuota: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Optional Meta Cloud API Credentials Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMetaFields(!showMetaFields)}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
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
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>Create & Launch Tenant</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎉 MODAL 3: ONBOARD SUCCESS DIALOG                        */}
      {/* ========================================================= */}
      {addSuccessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} />
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
                <span className="font-black text-slate-900 dark:text-white">{addSuccessInfo.businessName}</span>
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
                <span className="font-black text-emerald-600">{addSuccessInfo.plan}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                <span className="text-slate-500">Webhook URL:</span>
                <span className="font-mono text-[10px] break-all bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {addSuccessInfo.webhookUrl}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAddSuccessInfo(null)}
              className="w-full py-3 rounded-2xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 💳 MODAL 4: RECORD PAYMENT & INVOICE                      */}
      {/* ========================================================= */}
      {paymentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Record Payment
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record collection for <b>{paymentClient.businessName}</b> and auto-extend active validity cycle.
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
                  className="w-full px-3.5 py-2.5 rounded-2xl text-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
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
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
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
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
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
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingPay ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirm & Extend Cycle</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📄 MODAL 5: PAYMENT RECEIPTS HISTORY                      */}
      {/* ========================================================= */}
      {receiptsClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Payment Ledger: {receiptsClient.businessName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full transaction history and printable tax invoices.
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
                <span>Loading transaction history...</span>
              </div>
            ) : paymentsHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold">No recorded payments found for this tenant yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentsHistory.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 text-base font-black">₹{p.amount?.toLocaleString()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">{p.paymentMethod}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Date: {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {p.transactionRef && ` • Ref: ${p.transactionRef}`}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedReceipt(p)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
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
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🧾 MODAL 6: SINGLE PRINTABLE RECEIPT                      */}
      {/* ========================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">OFFICIAL PAYMENT RECEIPT</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">What-In SaaS Platform</h3>
              <p className="text-[11px] text-slate-500 font-mono">Invoice ID: {selectedReceipt.id.slice(0, 12)}</p>
            </div>

            <div className="space-y-2.5 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Client:</span>
                <span className="font-black text-slate-900 dark:text-white">{receiptsClient?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-600 text-base">₹{selectedReceipt.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedReceipt.paymentMethod}</span>
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
                className="flex-1 py-2.5 rounded-2xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ✏️ MODAL 7: EDIT CLIENT & CREDENTIALS                     */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Edit3 size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Edit Tenant: {editClient.businessName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update plan tier, message quotas, next renewal date, and Meta API integration tokens.
                </p>
              </div>
              <button
                onClick={() => setEditClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    {PLANS.filter(p => p !== "ALL").map(p => (
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
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Quota</label>
                  <input
                    type="number"
                    value={editMsgQuota}
                    onChange={e => setEditMsgQuota(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">AI Replies Quota</label>
                  <input
                    type="number"
                    value={editAiQuota}
                    onChange={e => setEditAiQuota(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Next Renewal Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Password Override</label>
                  <input
                    type="text"
                    placeholder="Leave as-is or enter new password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Meta Credentials Sub-section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditMeta(!showEditMeta)}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📡 MODAL 8: META HEALTH STATUS                            */}
      {/* ========================================================= */}
      {metaHealthResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-3">
                <Activity size={30} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Meta Cloud API Health
              </h3>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">WABA Token:</span>
                <span className={`font-black ${metaHealthResult.tokenValid ? "text-emerald-600" : "text-rose-600"}`}>
                  {metaHealthResult.tokenValid ? "Valid & Active ✅" : "Invalid / Expired ❌"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Status:</span>
                <span className="font-bold text-slate-900 dark:text-white">{metaHealthResult.phoneStatus || "CONNECTED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quality Rating:</span>
                <span className="font-black text-emerald-600">{metaHealthResult.qualityRating || "GREEN (High)"}</span>
              </div>
            </div>

            <button
              onClick={() => setMetaHealthResult(null)}
              className="w-full py-3 rounded-2xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ⚡ MODAL 9: TOP-UP QUOTA MODAL                             */}
      {/* ========================================================= */}
      {topUpClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                    <Zap size={18} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Add Quota Top-Up
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Provision additional message and AI reply capacity for <b>{topUpClient.businessName}</b>.
                </p>
              </div>
              <button
                onClick={() => setTopUpClient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitTopUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Add Messages Quota (+Msgs)
                </label>
                <div className="flex gap-1.5 mb-2">
                  {[1000, 5000, 10000, 25000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpForm({ ...topUpForm, addMessages: amt })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer ${
                        topUpForm.addMessages === amt
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={topUpForm.addMessages}
                  onChange={e => setTopUpForm({ ...topUpForm, addMessages: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Add AI Replies Quota (+AI)
                </label>
                <div className="flex gap-1.5 mb-2">
                  {[250, 500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpForm({ ...topUpForm, addAiReplies: amt })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer ${
                        topUpForm.addAiReplies === amt
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={topUpForm.addAiReplies}
                  onChange={e => setTopUpForm({ ...topUpForm, addAiReplies: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={topUpForm.resetCounter}
                    onChange={e => setTopUpForm({ ...topUpForm, resetCounter: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Reset current month's usage counter to 0</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTopUpClient(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTopUp}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingTopUp ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  <span>Apply Top-Up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
