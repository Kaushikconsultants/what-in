"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileCode, Radio, Zap, Bot, Users, Tag, CheckCircle2, ShieldCheck, Activity, PhoneCall, RefreshCw, Filter } from "lucide-react";
import WhatsAppTemplatesComponent from "@/components/whatsapp/WhatsAppTemplatesComponent";
import WhatsAppBroadcastsComponent from "@/components/whatsapp/WhatsAppBroadcastsComponent";
import WhatsAppFlowsComponent from "@/components/whatsapp/WhatsAppFlowsComponent";
import WhatsAppChatbotsComponent from "@/components/whatsapp/WhatsAppChatbotsComponent";
import WhatsAppContactsComponent from "@/components/whatsapp/WhatsAppContactsComponent";
import WhatsAppTagManagerComponent from "@/components/whatsapp/WhatsAppTagManagerComponent";
import { getMetaPhoneHealthAndLimitsAction } from "@/app/actions/whatsAppPlatformActions";

interface WhatsAppHubProps {
  initialTab?: "templates" | "broadcasts" | "flows" | "chatbots" | "contacts" | "tags";
}

function WhatsAppHubContent({ initialTab = "templates" }: WhatsAppHubProps) {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab") as "templates" | "broadcasts" | "flows" | "chatbots" | "contacts" | "tags" | null;

  const validTabs = ["templates", "broadcasts", "flows", "chatbots", "contacts", "tags"];

  const [activeTab, setActiveTab] = useState<"templates" | "broadcasts" | "flows" | "chatbots" | "contacts" | "tags">(
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

  const refreshHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await getMetaPhoneHealthAndLimitsAction();
      if (res && res.success) {
        setMetaHealth({
          qualityRating: res.qualityRating || "GREEN",
          dailyLimitTier: res.dailyLimitTier || "10,000 / 24h",
          throughput: typeof res.throughput === "number" ? res.throughput : 80,
          optedOutCount: res.optedOutCount || 0,
          verifiedName: res.verifiedName || "WhatsApp Account",
          displayPhoneNumber: res.displayPhoneNumber || "+91 74043 88242",
          isConnected: res.isConnected ?? true
        });
      }
    } catch (err) {
      console.error("Error refreshing Meta health:", err);
    }
    setLoadingHealth(false);
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  useEffect(() => {
    if (tabFromQuery && validTabs.includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (tab: "templates" | "broadcasts" | "flows" | "chatbots" | "contacts" | "tags") => {
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
              WhatsApp Control Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Cloud API v20.0
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage Meta-approved templates, broadcast campaigns, interactive flows, automated chatbots, CRM contacts, and customer tags.
          </p>
        </div>

        {/* Live Meta Account Health Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quality Rating */}
          <span
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border shadow-2xs ${
              metaHealth.qualityRating === "GREEN"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : metaHealth.qualityRating === "YELLOW"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
            }`}
            title="Meta Phone Number Quality Rating"
          >
            <ShieldCheck size={14} />
            <span>Quality: {metaHealth.qualityRating}</span>
          </span>

          {/* Daily Limit Tier */}
          <span
            className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
            title="Meta 24-Hour Unique Business-Initiated Messaging Limit"
          >
            <Activity size={14} />
            <span>Tier: {metaHealth.dailyLimitTier}</span>
          </span>

          {/* Phone Number Indicator */}
          {metaHealth.displayPhoneNumber && (
            <span
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 hidden sm:flex"
              title="Verified Meta Phone Number"
            >
              <PhoneCall size={14} className="text-emerald-500" />
              <span>{metaHealth.displayPhoneNumber}</span>
            </span>
          )}

          {/* Opted-Out Suppressions Count */}
          <span
            className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            title="Opted-out customer contacts automatically excluded to protect your Meta phone quality rating"
          >
            <Filter size={14} className="text-slate-400" />
            <span>{metaHealth.optedOutCount} Blocked</span>
          </span>

          {/* Refresh Button */}
          <button
            onClick={refreshHealth}
            disabled={loadingHealth}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Refresh Meta account quality metrics"
          >
            <RefreshCw size={14} className={loadingHealth ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Modern Tabs Navigation Bar */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-700 overflow-x-auto max-w-full">
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

        <button
          onClick={() => handleTabChange("tags")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "tags"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Tag size={14} />
          <span>Tag Manager</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="w-full">
        {activeTab === "templates" && <WhatsAppTemplatesComponent />}
        {activeTab === "broadcasts" && <WhatsAppBroadcastsComponent />}
        {activeTab === "flows" && <WhatsAppFlowsComponent />}
        {activeTab === "chatbots" && <WhatsAppChatbotsComponent />}
        {activeTab === "contacts" && <WhatsAppContactsComponent />}
        {activeTab === "tags" && <WhatsAppTagManagerComponent />}
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
