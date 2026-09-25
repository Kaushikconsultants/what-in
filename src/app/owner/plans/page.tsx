"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Gem,
  Package,
  Layers,
  Sparkles,
  Check,
  X,
  Users,
  MessageSquare,
  Bot,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import {
  DEFAULT_PLAN_TIERS,
  MASTER_MODULES,
  INDUSTRY_MODULE_PRESETS,
  ALL_MODULE_KEYS,
  ModuleKey
} from "@/lib/moduleRegistry";

export default function OwnerPlansPage() {
  const [selectedTab, setSelectedTab] = useState<"TIERS" | "MATRIX" | "PRESETS">("TIERS");

  return (
    <main className="w-full px-4 sm:px-6 lg:px-10 py-7 space-y-7">
      
      {/* Top Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <Gem size={20} className="text-indigo-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Plan Tiers & Modular Entitlements
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Configure standard subscription packages, inspect the 10-module feature matrix, and explore industry presets.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {[
            { id: "TIERS", label: "Plan Cards", icon: Package },
            { id: "MATRIX", label: "Feature Matrix (10 Modules)", icon: Layers },
            { id: "PRESETS", label: "Industry Presets", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: Standard Plan Cards */}
      {selectedTab === "TIERS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEFAULT_PLAN_TIERS.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {plan.badge || plan.name}
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Users size={13} /> {plan.maxAgents} Agents
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    ₹{plan.monthlyFee.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  {plan.tagline}
                </p>

                {/* Quota metric cards */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Msgs</span>
                    <span className="text-sm font-black text-sky-600 dark:text-sky-400">{plan.monthlyMessageQuota.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Replies</span>
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400">{plan.monthlyAiQuota.toLocaleString()}</span>
                  </div>
                </div>

                {/* Module badges */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                    <span>Included Modules</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{plan.modules.length} / {ALL_MODULE_KEYS.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.modules.map((modKey) => {
                      const m = MASTER_MODULES[modKey];
                      return (
                        <span
                          key={modKey}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        >
                          <span>{m?.icon || "📦"}</span>
                          <span>{m?.name || modKey}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Link
                href={`/owner/clients`}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-center text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Apply to Client</span> <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: Complete 10-Module Feature Matrix */}
      {selectedTab === "MATRIX" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6 min-w-[220px]">Platform Module / Integration</th>
                  {DEFAULT_PLAN_TIERS.map(p => (
                    <th key={p.id} className="py-4 px-4 text-center min-w-[120px]">
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">{p.name}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">₹{p.monthlyFee}/mo</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {ALL_MODULE_KEYS.map((modKey) => {
                  const m = MASTER_MODULES[modKey];
                  return (
                    <tr key={modKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{m?.icon || "📦"}</span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{m?.name || modKey}</div>
                            <div className="text-[11px] text-slate-400">{m?.tagline || ""}</div>
                          </div>
                        </div>
                      </td>
                      {DEFAULT_PLAN_TIERS.map(p => {
                        const hasModule = p.modules.includes(modKey);
                        return (
                          <td key={p.id} className="py-4 px-4 text-center">
                            {hasModule ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                                <Check size={14} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                                <X size={13} />
                              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INDUSTRY_MODULE_PRESETS.map((preset) => (
            <div
              key={preset.name}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800">{preset.icon}</span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{preset.name}</h3>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{preset.modules.length} Modules Included</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Tailored default stack for clients in the {preset.name.toLowerCase()} sector.
                </p>

                <div className="space-y-1.5 mb-6">
                  {preset.modules.map(modKey => {
                    const m = MASTER_MODULES[modKey];
                    return (
                      <div key={modKey} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>{m?.name || modKey}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                href="/owner/clients"
                className="w-full py-2.5 rounded-xl font-bold text-xs text-center text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Apply in Client Manager</span> <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      )}

    </main>
  );
}
