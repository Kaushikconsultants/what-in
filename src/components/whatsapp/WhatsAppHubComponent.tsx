"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileCode, Radio, Zap, Bot, Users, CheckCircle2, ShieldAlert, Activity, PhoneCall, RefreshCw, Filter, Settings } from "lucide-react";
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
    qualityRating: "NOT_CONFIGURED",
    dailyLimitTier: "--",
    throughput: 0,
    optedOutCount: 0,
    verifiedName: "WhatsApp Account",
    displayPhoneNumber: "Not Configured",
    isConnected: false
  });
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await getMetaPhoneHealthAndLimitsAction();
      if (res && res.success) {
        setMetaHealth({
          qualityRating: res.qualityRating || "NOT_CONFIGURED",
          dailyLimitTier: res.dailyLimitTier || "--",
          throughput: res.throughput || 0,
          optedOutCount: res.optedOutCount || 0,
          verifiedName: res.verifiedName || (res.isConnected ? "WhatsApp Business Account" : "Not Configured"),
          displayPhoneNumber: res.displayPhoneNumber || (res.isConnected ? "Connected" : "Not Configured"),
          isConnected: Boolean(res.isConnected)
        });
      }
    } catch (e) {
      console.error("fetchHealth error:", e);
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
      {/* Header title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1 flex items-center gap-2.5">
            WhatsApp Hub
            {metaHealth.isConnected ? (
              <span className="px-2.5 py-0.5 text-xs font-black uppercase bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Meta Connected
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                API Disconnected
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage Meta-approved templates, broadcast campaigns, interactive flows, automated chatbots, and CRM contacts.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loadingHealth}
          className="self-start md:self-auto px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs transition flex items-center gap-2"
        >
          <RefreshCw size={13} className={loadingHealth ? "animate-spin text-indigo-600" : "text-gray-400"} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Global Meta Phone Number Health & Messaging Limit Bar */}
      <div className="w-full bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Phone Number & Name */}
          <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-slate-700">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              metaHealth.isConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-100 dark:bg-slate-800 text-gray-400"
            }`}>
              <PhoneCall size={17} />
            </div>
            <div>
              <div className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                {metaHealth.verifiedName}
                {metaHealth.isConnected ? (
                  <CheckCircle2 size={13} className="text-emerald-500 fill-emerald-500 text-white" />
                ) : (
                  <Link href="/whatsapp/api-settings" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                    (Setup API)
                  </Link>
                )}
              </div>
              <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                {metaHealth.displayPhoneNumber}
              </div>
            </div>
          </div>

          {/* Quality Rating */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Quality:</span>
            {metaHealth.isConnected ? (
              <span className={`px-2.5 py-1 rounded-full font-black text-xs flex items-center gap-1.5 border ${
                metaHealth.qualityRating === "GREEN"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : metaHealth.qualityRating === "YELLOW"
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  metaHealth.qualityRating === "GREEN" ? "bg-emerald-500 animate-pulse" : metaHealth.qualityRating === "YELLOW" ? "bg-amber-500" : "bg-red-500"
                }`} />
                {metaHealth.qualityRating === "GREEN" ? "High Quality (Green)" : metaHealth.qualityRating === "YELLOW" ? "Medium Warning (Yellow)" : "Low Quality (Red)"}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Not Configured
              </span>
            )}
          </div>

          {/* Daily Limit Tier */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Daily Limit:</span>
            <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Zap size={12} className="text-indigo-500" />
              {metaHealth.isConnected ? metaHealth.dailyLimitTier : "--"}
            </span>
          </div>

          {/* Throughput */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Throughput:</span>
            <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
              <Activity size={12} className="text-sky-500" />
              {metaHealth.isConnected ? `${metaHealth.throughput} msgs/sec` : "--"}
            </span>
          </div>
        </div>

        {/* DND Suppression Count / Settings button */}
        <div className="flex items-center gap-2">
          {metaHealth.isConnected ? (
            <span className="px-3 py-1.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 flex items-center gap-1.5" title="Opted-out customer contacts automatically excluded to protect your Meta phone quality rating">
              <Filter size={13} className="text-indigo-500" />
              <span className="font-black text-indigo-600 dark:text-indigo-400">{metaHealth.optedOutCount}</span> Unsubscribed (DND)
            </span>
          ) : (
            <Link
              href="/whatsapp/api-settings"
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-1.5"
            >
              <Settings size={13} />
              <span>Connect Meta API</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs list bar */}
      <nav className="-mb-px flex space-x-8 overflow-x-auto border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => handleTabChange("templates")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "templates"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FileCode size={16} /> Templates
        </button>

        <button
          onClick={() => handleTabChange("broadcasts")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "broadcasts"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Radio size={16} /> Broadcasts
        </button>

        <button
          onClick={() => handleTabChange("flows")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "flows"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Zap size={16} /> Meta Flows
        </button>

        <button
          onClick={() => handleTabChange("chatbots")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "chatbots"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Bot size={16} /> Chatbots
        </button>

        <button
          onClick={() => handleTabChange("contacts")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "contacts"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Users size={16} /> Contacts
        </button>
      </nav>

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
