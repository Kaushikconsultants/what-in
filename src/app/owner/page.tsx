"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  Building2,
  DollarSign,
  TrendingUp,
  Clock,
  FlaskConical,
  ShieldAlert,
  Plus,
  Megaphone,
  Layers,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Activity,
  Bot,
  MessageSquare,
  AlertTriangle,
  Zap,
  Wrench,
  ShieldCheck,
  Check,
  X,
  Gauge,
  Sliders,
  Smartphone
} from "lucide-react";
import {
  getOwnerDashboardStatsAction,
  syncSubscriptionStatusesAction,
  getOwnerTelemetryStatsAction,
  checkAllClientsMetaHealthAction,
  repairClientMetaWebhookAction,
  repairAllWebhooksAction,
  topUpClientQuotaAction
} from "@/app/actions/ownerPortalActions";
import { MASTER_MODULES, ALL_MODULE_KEYS, parseEnabledModules } from "@/lib/moduleRegistry";
import PlatformMissionControl from "@/components/owner/PlatformMissionControl";

export default function OwnerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [metaHealthResults, setMetaHealthResults] = useState<any[]>([]);
  const [scanningMeta, setScanningMeta] = useState(false);
  const [healingWebhooks, setHealingWebhooks] = useState(false);
  const [repairingClientId, setRepairingClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Top-Up Quota Modal
  const [topUpClient, setTopUpClient] = useState<any | null>(null);
  const [topUpForm, setTopUpForm] = useState({
    addMessages: 5000,
    addAiReplies: 500,
    resetCounter: false
  });
  const [submittingTopUp, setSubmittingTopUp] = useState(false);

  useEffect(() => {
    const authed = sessionStorage.getItem("owner_authed");
    if (authed === "1") {
      loadStats();
    } else {
      fetch("/api/owner/verify").then(r => {
        if (!r.ok) router.push("/owner/login");
        else { sessionStorage.setItem("owner_authed", "1"); loadStats(); }
      }).catch(() => router.push("/owner/login"));
    }
  }, []);

  const loadStats = async () => {
    setLoading(true);
    await syncSubscriptionStatusesAction();
    const [statsRes, telemetryRes] = await Promise.all([
      getOwnerDashboardStatsAction(),
      getOwnerTelemetryStatsAction()
    ]);

    if (statsRes.success) setData(statsRes);
    if (telemetryRes.success && telemetryRes.telemetry) setTelemetry(telemetryRes.telemetry);
    setLoading(false);
  };

  const handleScanMetaHealth = async () => {
    setScanningMeta(true);
    const res = await checkAllClientsMetaHealthAction();
    if (res.success && res.results) {
      setMetaHealthResults(res.results);
    } else {
      alert("Error scanning Meta health: " + (res.error || "Unknown error"));
    }
    setScanningMeta(false);
  };

  const handleHealAllWebhooks = async () => {
    setHealingWebhooks(true);
    const res = await repairAllWebhooksAction();
    if (res.success) {
      alert(`Auto-Healer finished: ${res.successCount} of ${res.total} tenant webhooks re-subscribed successfully.`);
      handleScanMetaHealth();
    } else {
      alert("Error healing webhooks: " + res.error);
    }
    setHealingWebhooks(false);
  };

  const handleRepairSingleWebhook = async (clientId: string) => {
    setRepairingClientId(clientId);
    const res = await repairClientMetaWebhookAction(clientId);
    if (res.success) {
      alert(res.message);
      handleScanMetaHealth();
    } else {
      alert("Error: " + res.error);
    }
    setRepairingClientId(null);
  };

  const handleOpenTopUp = (client: any) => {
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
    const res = await topUpClientQuotaAction(topUpClient.id || topUpClient.clientId, topUpForm);
    setSubmittingTopUp(false);
    if (res.success) {
      setTopUpClient(null);
      loadStats();
    } else {
      alert("Error adding top-up: " + res.error);
    }
  };

  const stats = data?.stats;
  const clients = data?.clients || [];

  const mrrValue = stats?.mrr || 0;
  const arrValue = mrrValue * 12;

  const statCards = [
    {
      label: "Monthly Recurring (MRR)",
      value: "₹" + mrrValue.toLocaleString(),
      sub: "ARR: ₹" + arrValue.toLocaleString(),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      border: "border-emerald-200/80 dark:border-emerald-800/60"
    },
    {
      label: "Total SaaS Tenants",
      value: stats?.total ?? "—",
      sub: `${stats?.active || 0} active subscriptions`,
      icon: Building2,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/50",
      border: "border-indigo-200/80 dark:border-indigo-800/60"
    },
    {
      label: "Active Subscriptions",
      value: stats?.active ?? "—",
      sub: "Paying monthly",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      border: "border-emerald-200/80 dark:border-emerald-800/60"
    },
    {
      label: "Renewals & Past Due",
      value: stats?.pastDue ?? "—",
      sub: "Action required",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
      border: "border-amber-200/80 dark:border-amber-800/60"
    },
    {
      label: "Free Trial Accounts",
      value: stats?.trial ?? "—",
      sub: "Evaluating platform",
      icon: FlaskConical,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
      border: "border-blue-200/80 dark:border-blue-800/60"
    },
    {
      label: "Suspended / Blocked",
      value: stats?.blocked ?? "—",
      sub: "Access restricted",
      icon: ShieldAlert,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/50",
      border: "border-rose-200/80 dark:border-rose-800/60"
    },
  ];

  // Module adoption telemetry
  const moduleAdoption = ALL_MODULE_KEYS.map(modKey => {
    const m = MASTER_MODULES[modKey];
    const count = clients.filter((c: any) => {
      const mods = parseEnabledModules(c.enabledModules);
      return mods.includes(modKey);
    }).length;
    const pct = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;
    return { modKey, name: m?.name || modKey, icon: m?.icon || "📦", count, pct, category: m?.category || "FEATURE" };
  });

  const now = new Date();
  const upcomingRenewals = clients.filter((c: any) => {
    if (!c.currentPeriodEnd) return false;
    const due = new Date(c.currentPeriodEnd);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 || c.subscriptionStatus === "PAST_DUE" || c.subscriptionStatus === "BLOCKED";
  });

  const exhaustionAlerts = telemetry?.exhaustionAlerts || [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 🌟 Top Hero Title & Executive Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md">
              <Crown size={14} className="text-amber-400" /> Super-Admin Telemetry & Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Executive Overview & Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Real-time multi-tenant traffic heatmap, quota exhaustion alerts, Meta API health sentinels, and billing renewal queues.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={loadStats}
            disabled={loading}
            title="Refresh All Metrics"
            className="p-3 rounded-2xl text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw size={17} className={loading ? "animate-spin text-indigo-400" : ""} />
          </button>

          <Link
            href="/owner/announcements"
            className="px-4 py-3 rounded-2xl font-bold text-xs text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center gap-1.5"
          >
            <Megaphone size={15} />
            <span>Broadcasts</span>
          </Link>

          <Link
            href="/owner/clients"
            className="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] border border-indigo-400/30"
          >
            <Plus size={16} />
            <span>Onboard Client</span>
          </Link>
        </div>
      </div>

      {/* 🔴 REAL-TIME QUOTA EXHAUSTION ALERTS (If any tenant >75% or >90%) */}
      {exhaustionAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white animate-pulse">
                <AlertTriangle size={16} />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-900 dark:text-amber-100">
                  Quota Exhaustion Alerts ({exhaustionAlerts.length} Tenant{exhaustionAlerts.length > 1 ? "s" : ""})
                </h3>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  The following tenants are approaching or have exceeded their monthly WhatsApp message or AI reply quotas.
                </p>
              </div>
            </div>
            <Link
              href="/owner/clients"
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              <span>Manage All</span> <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exhaustionAlerts.map((alert: any) => (
              <div
                key={alert.clientId}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs text-slate-900 dark:text-white truncate max-w-[160px]" title={alert.businessName}>
                      {alert.businessName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      alert.severity === "CRITICAL"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300"
                    }`}>
                      {alert.maxPct}% Used
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 mb-3">
                    <div className="flex justify-between">
                      <span>Messages:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {alert.messagesUsed.toLocaleString()} / {alert.messagesQuota.toLocaleString()} ({alert.msgPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Auto-Pilot:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {alert.aiUsed.toLocaleString()} / {alert.aiQuota.toLocaleString()} ({alert.aiPct}%)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenTopUp(alert)}
                  className="w-full py-1.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Zap size={12} className="text-amber-300" />
                  <span>1-Click Top-Up Quota</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🌐 "MISSION CONTROL" LIVE EVENT STREAM / PLATFORM PULSE */}
      <PlatformMissionControl />

      {/* 📊 GLOBAL TELEMETRY HEATMAP & TRAFFIC GAUGES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Global SaaS Message & AI Telemetry Heatmap
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated platform throughput and cloud quota utilization across all active client organizations.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            Real-Time Engine
          </span>
        </div>

        {/* Global Gauges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Total Messages Throughput */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-sky-500" /> WhatsApp Messages
              </span>
              <span className="text-xs font-extrabold text-sky-600">
                {telemetry?.messageUtilizationPct || 0}% Allotted
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {(telemetry?.totalMessagesUsed || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-semibold mt-0.5">
                Total processed of {(telemetry?.totalMessagesAllotted || 0).toLocaleString()} capacity
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${telemetry?.messageUtilizationPct || 0}%` }}
              />
            </div>
          </div>

          {/* Total AI Replies Throughput */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Bot size={14} className="text-purple-500" /> AI Auto-Pilot Replies
              </span>
              <span className="text-xs font-extrabold text-purple-600">
                {telemetry?.aiUtilizationPct || 0}% Allotted
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {(telemetry?.totalAiRepliesUsed || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-semibold mt-0.5">
                Total AI tokens of {(telemetry?.totalAiAllotted || 0).toLocaleString()} capacity
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${telemetry?.aiUtilizationPct || 0}%` }}
              />
            </div>
          </div>

          {/* High Consumers Breakdown */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-black uppercase text-slate-500 block">
              Top Traffic Consumers
            </span>
            <div className="space-y-2 text-xs">
              {(telemetry?.topConsumers || []).slice(0, 3).map((tc: any) => (
                <div key={tc.id} className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={tc.businessName}>
                    {tc.businessName}
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {(tc.messagesUsedCount || 0).toLocaleString()} msgs
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/owner/clients"
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline block pt-1"
            >
              Inspect all tenant quotas →
            </Link>
          </div>

        </div>
      </div>

      {/* 🛡️ META CLOUD API SENTINEL & WEBHOOK AUTO-HEALER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Meta Cloud API Sentinel & Webhook Auto-Healer
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifies WhatsApp Business System Tokens, phone quality ratings, and auto-subscribes webhooks to Meta Graph.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanMetaHealth}
              disabled={scanningMeta}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={scanningMeta ? "animate-spin text-indigo-600" : ""} />
              <span>{scanningMeta ? "Scanning Sentinels..." : "Run Sentinel Scan"}</span>
            </button>

            <button
              onClick={handleHealAllWebhooks}
              disabled={healingWebhooks}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench size={13} />
              <span>{healingWebhooks ? "Healing Webhooks..." : "Auto-Heal All Webhooks"}</span>
            </button>
          </div>
        </div>

        {metaHealthResults.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <ShieldCheck size={28} className="text-emerald-500 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Meta Sentinel Standing By</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto mb-3">
              Click "Run Sentinel Scan" to perform a live Graph API test across all tenant tokens and phone lines.
            </p>
            <button
              onClick={handleScanMetaHealth}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              Scan All Meta Credentials Now
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {metaHealthResults.map(res => (
              <div
                key={res.clientId}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                    res.status === "HEALTHY"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : res.status === "WEBHOOK_DEGRADED"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}>
                    {res.status === "HEALTHY" ? <Check size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{res.businessName}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                        res.status === "HEALTHY"
                          ? "bg-emerald-100 text-emerald-700"
                          : res.status === "WEBHOOK_DEGRADED"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {res.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {res.message} {res.displayPhone && `• Line: ${res.displayPhone}`} {res.qualityRating !== "UNKNOWN" && `• Quality: ${res.qualityRating}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleRepairSingleWebhook(res.clientId)}
                    disabled={repairingClientId === res.clientId}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
                  >
                    <Wrench size={12} />
                    <span>{repairingClientId === res.clientId ? "Repairing..." : "Repair Webhook"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 💼 KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border ${card.border} shadow-xs transition-all hover:shadow-md flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <div className={`text-3xl font-black ${card.color} tracking-tight mb-1`}>
                  {loading ? "..." : card.value}
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-Column Section: Renewals Queue + Module Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Renewals & Invoices Queue (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Clock size={16} className="text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Renewal & Payment Queues</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tenants due in the next 7 days or currently past due.</p>
            </div>
            <Link
              href="/owner/clients"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span> <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Checking renewals...</div>
          ) : upcomingRenewals.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> All clients are currently active and up to date!
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingRenewals.map((c: any) => {
                const due = new Date(c.currentPeriodEnd);
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between flex-wrap gap-2 ${
                      isOverdue
                        ? "bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60"
                        : "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{c.businessName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {c.contactEmail} • Fee: <b className="text-emerald-600 font-bold">₹{c.monthlyFee?.toLocaleString()}/mo</b>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        isOverdue ? "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300" : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                      }`}>
                        {isOverdue ? `Overdue ${Math.abs(diffDays)}d` : diffDays === 0 ? "Due Today" : `Due in ${diffDays}d`}
                      </span>
                      <Link
                        href="/owner/clients"
                        className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1"
                      >
                        <CreditCard size={12} /> Collect
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Module Platform Penetration (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Module Adoption</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active tenant penetration across features.</p>
            </div>
            <Link
              href="/owner/plans"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Matrix</span> <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {moduleAdoption.map((m) => (
              <div
                key={m.modKey}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800"
              >
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-sm">{m.icon}</span>
                    <span>{m.name}</span>
                  </div>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {m.count} Tenants ({m.pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ⚡ 1-CLICK TOP-UP QUOTA MODAL */}
      {topUpClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    <Zap size={18} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Add Quota Top-Up
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Top-up monthly quotas for <b>{topUpClient.businessName}</b>.
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
                  <span>Reset used counter to 0 immediately</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTopUpClient(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
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
