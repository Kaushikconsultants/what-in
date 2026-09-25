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
  RefreshCw
} from "lucide-react";
import { getOwnerDashboardStatsAction, syncSubscriptionStatusesAction } from "@/app/actions/ownerPortalActions";
import { MASTER_MODULES, ALL_MODULE_KEYS, parseEnabledModules } from "@/lib/moduleRegistry";

export default function OwnerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    const res = await getOwnerDashboardStatsAction();
    if (res.success) setData(res);
    setLoading(false);
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Hero Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <Crown size={20} className="text-amber-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Executive SaaS Overview & Telemetry
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            High-level financial KPIs, tenant module adoption matrix, and upcoming renewal billing queues.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadStats}
            disabled={loading}
            title="Refresh Metrics"
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>

          <Link
            href="/owner/announcements"
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5"
          >
            <Megaphone size={14} />
            <span>Broadcast Marquee</span>
          </Link>

          <Link
            href="/owner/clients"
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus size={15} />
            <span>Onboard Client</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

        {/* 10-Module Platform Penetration (5 cols) */}
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
                {/* Progress bar */}
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

    </main>
  );
}
