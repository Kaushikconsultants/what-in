"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { ModuleKey, MASTER_MODULES } from "@/lib/moduleRegistry";

interface ModuleGatedViewProps {
  moduleKey: ModuleKey | ModuleKey[];
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDesc?: string;
}

export default function ModuleGatedView({
  moduleKey,
  children,
  fallbackTitle,
  fallbackDesc
}: ModuleGatedViewProps) {
  const [loading, setLoading] = useState(true);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/whatsapp/client-status")
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.enabledModules && Array.isArray(data.enabledModules)) {
          setEnabledModules(data.enabledModules);
        } else {
          // If unconfigured, default to empty or allow fallback
          setEnabledModules([]);
        }
        if (data.businessName) {
          setClientName(data.businessName);
        }
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Verifying module entitlements...</span>
      </div>
    );
  }

  const keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
  const isAllowed = keys.some(k => enabledModules.includes(k));

  if (!isAllowed) {
    const primaryKey = keys[0];
    const moduleDef = MASTER_MODULES[primaryKey];
    const title = fallbackTitle || moduleDef?.name || "Module Locked";
    const desc =
      fallbackDesc ||
      moduleDef?.description ||
      "This module is currently deactivated for your organization. Please contact your account administrator or upgrade your subscription plan to unlock access.";

    return (
      <div className="w-full py-12 px-4 sm:px-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-amber-500/10">
            {moduleDef?.icon || "🔒"}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 mb-3">
            <Lock size={12} /> Module Disabled
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            {title}
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {desc}
          </p>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-normal">
              <strong>Tenant Status:</strong> <span className="text-indigo-300 font-bold">{clientName || "This Workspace"}</span> does not have active permissions for the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">{primaryKey}</code> module.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/whatsapp/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
            >
              ← Back to Dashboard
            </Link>
            <a
              href="mailto:support@esponsports.com?subject=Unlock%20Module%20Request"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>Contact Super-Admin</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
