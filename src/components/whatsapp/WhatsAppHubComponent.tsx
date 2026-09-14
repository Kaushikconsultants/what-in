"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileCode, Radio, Zap, Bot, Users, CheckCircle2, ShieldCheck, Activity, PhoneCall, RefreshCw, Filter } from "lucide-react";
import WhatsAppTemplatesComponent from "@/components/whatsapp/WhatsAppTemplatesComponent";
import WhatsAppBroadcastsComponent from "@/components/whatsapp/WhatsAppBroadcastsComponent";
import WhatsAppFlowsComponent from "@/components/whatsapp/WhatsAppFlowsComponent";
import WhatsAppChatbotsComponent from "@/components/whatsapp/WhatsAppChatbotsComponent";
import WhatsAppContactsComponent from "@/components/whatsapp/WhatsAppContactsComponent";
import { getMetaPhoneHealthAndLimitsAction } from "@/app/actions/whatsAppPlatformActions";

interface WhatsAppHubProps {
  initialTab?: "templates" | "broadcasts" | "flows" | "chatbots" | "contacts";
}

function WhatsAppHubContent({ initialTab = "templates" }: WhatsAppHubProps) {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab") as "templates" | "broadcasts" | "flows" | "chatbots" | "contacts" | null;

  const validTabs = ["templates", "broadcasts", "flows", "chatbots", "contacts"];

  const [activeTab, setActiveTab] = useState<"templates" | "broadcasts" | "flows" | "chatbots" | "contacts">(
    tabFromQuery && validTabs.includes(tabFromQuery)
      ? tabFromQuery
      : initialTab
  );

  const [metaHealth, setMetaHealth] = useState<{
    qualityRating: string;
    dailyLimitTier: string;
    throughput: number;
    optedOutCount: number;
    verifiedName: string;
    displayPhoneNumber?: string;
    isConnected: boolean;
  }>({
    qualityRating: "GREEN",
    dailyLimitTier: "10,000 / 24h",
    throughput: 80,
    optedOutCount: 0,
    verifiedName: "WhatsApp Account",
    displayPhoneNumber: "+91 74043 88242",
    isConnected: true
  });
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await getMetaPhoneHealthAndLimitsAction();
      if (res && res.success) {
        setMetaHealth({
          qualityRating: res.qualityRating || "GREEN",
          dailyLimitTier: res.dailyLimitTier || "10,000 / 24h",
          throughput: res.throughput || 80,
          optedOutCount: res.optedOutCount || 0,
          verifiedName: res.verifiedName || "WhatsApp Account",
          displayPhoneNumber: res.displayPhoneNumber || "+91 74043 88242",
          isConnected: res.isConnected ?? true
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (tabFromQuery && validTabs.includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (tab: "templates" | "broadcasts" | "flows" | "chatbots" | "contacts") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-none flex flex-col gap-6">
      {/* Header Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              WhatsApp Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Meta Connected
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
            Manage Meta-approved templates, broadcast campaigns, interactive flows, automated chatbots, and CRM contacts.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loadingHealth}
          className="self-start md:self-auto px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <RefreshCw size={13} className={loadingHealth ? "animate-spin text-indigo-600" : "text-slate-400"} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Meta Phone Number Health & Messaging Limit Bar */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Phone Number & Verified Badge */}
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20">
              <PhoneCall size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{metaHealth.verifiedName}</span>
                <CheckCircle2 size={13} className="text-emerald-500 fill-emerald-500 text-white" />
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                {metaHealth.displayPhoneNumber}
              </div>
            </div>
          </div>

          {/* Quality Rating */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quality:</span>
            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 border ${
              metaHealth.qualityRating === "GREEN"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                : metaHealth.qualityRating === "YELLOW"
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                metaHealth.qualityRating === "GREEN" ? "bg-emerald-500 animate-pulse" : metaHealth.qualityRating === "YELLOW" ? "bg-amber-500" : "bg-rose-500"
              }`} />
              {metaHealth.qualityRating === "GREEN" ? "High Quality (Green)" : metaHealth.qualityRating === "YELLOW" ? "Medium Warning (Yellow)" : "Low Quality (Red)"}
            </span>
          </div>

          {/* Daily Limit Tier */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Daily Limit:</span>
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1.5">
              <Zap size={12} className="text-indigo-500" />
              {metaHealth.dailyLimitTier}
            </span>
          </div>

          {/* Throughput */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Throughput:</span>
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1.5">
              <Activity size={12} className="text-sky-500" />
              {metaHealth.throughput} msgs/sec
            </span>
          </div>
        </div>

        {/* DND Suppression Count */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5" title="Opted-out customer contacts automatically excluded to protect your Meta phone quality rating">
            <Filter size={13} className="text-indigo-500" />
            <span className="font-black text-indigo-600 dark:text-indigo-400">{metaHealth.optedOutCount}</span> Unsubscribed (DND)
          </span>
        </div>
      </div>

      {/* Segmented Pill Navigation Tabs */}
      <div className="w-fit p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => handleTabChange("templates")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "templates"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileCode size={14} />
          <span>Templates</span>
        </button>

        <button
          onClick={() => handleTabChange("broadcasts")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "broadcasts"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Radio size={14} />
          <span>Broadcasts</span>
        </button>

        <button
          onClick={() => handleTabChange("flows")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "flows"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Zap size={14} />
          <span>Meta Flows</span>
        </button>

        <button
          onClick={() => handleTabChange("chatbots")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "chatbots"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Bot size={14} />
          <span>Chatbots</span>
        </button>

        <button
          onClick={() => handleTabChange("contacts")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "contacts"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users size={14} />
          <span>Contacts</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="w-full">
        {activeTab === "templates" && <WhatsAppTemplatesComponent />}
        {activeTab === "broadcasts" && <WhatsAppBroadcastsComponent />}
        {activeTab === "flows" && <WhatsAppFlowsComponent />}
        {activeTab === "chatbots" && <WhatsAppChatbotsComponent />}
        {activeTab === "contacts" && <WhatsAppContactsComponent />}
      </div>
    </div>
  );
}

export default function WhatsAppHubComponent(props: WhatsAppHubProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading WhatsApp Hub...</div>}>
      <WhatsAppHubContent {...props} />
    </Suspense>
  );
}
