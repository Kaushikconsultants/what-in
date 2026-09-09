"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, TrendingUp, Zap, Activity, Box, Search, Bell } from "lucide-react";
import Link from "next/link";
import {
  getWhatsAppDashboardMetrics,
  refreshWhatsAppAccountSyncAction,
  checkIntegrationHealthAction
} from "@/app/actions/whatsAppPlatformActions";

export default function WhatInDashboard() {
  const [data, setData] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const fetchMetricsAndHealth = async () => {
    setLoading(true);
    const [metricsRes, healthRes] = await Promise.all([
      getWhatsAppDashboardMetrics(),
      checkIntegrationHealthAction()
    ]);
    if (metricsRes.success) setData(metricsRes);
    if (healthRes.success) setHealth(healthRes);
    setLoading(false);
  };

  useEffect(() => {
    fetchMetricsAndHealth();
  }, []);

  const handleRefreshSync = async () => {
    setRefreshing(true);
    setSyncToast(null);
    const res = await refreshWhatsAppAccountSyncAction();
    if (res.success) {
      setSyncToast(`Account synchronized! Webhook: ${res.health?.webhookStatus || "Active"}`);
      await fetchMetricsAndHealth();
    }
    setRefreshing(false);
  };

  const isConnected = data?.isConnected || false;
  const metrics = data?.metrics || {};
  const totalRevenue = metrics.totalRevenue || 0;
  const productsCount = metrics.productsCount || 0;
  const automatedReplies = metrics.aiRepliesCount || metrics.totalMessages || 0;
  const sentToday = metrics.sentToday || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full">
      {/* Header Area */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome to What-In. Your unified commerce and automation hub.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input type="text" placeholder="Search products, contacts..." className="pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-full bg-gray-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all" />
          </div>
          <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <Bell size={18} />
          </button>
        </div>
      </div>

      {syncToast && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2"><CheckCircle2 size={18} /> {syncToast}</div>
          <button onClick={() => setSyncToast(null)} className="opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-5 rounded-2xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-full"><AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" /></div>
            <div>
              <h4 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-0.5">WhatsApp API Not Connected</h4>
              <p className="text-sm text-amber-700 dark:text-amber-500/80 m-0">Please configure your Meta App credentials to activate automation.</p>
            </div>
          </div>
          <Link href="/whatsapp/api-settings" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-md transition-all">Configure API →</Link>
        </div>
      )}

      {/* Hero Stats (All dynamic from database) */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-between">Total Revenue <TrendingUp size={16} className="text-green-500"/></div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {loading ? "..." : `₹${totalRevenue.toLocaleString()}`}
          </div>
          <div className="text-xs text-gray-400 font-medium mt-2 flex items-center gap-1">
            {totalRevenue > 0 ? "From Store & CRM Orders" : "No orders recorded yet"}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-between">Active Products <Box size={16} className="text-indigo-500"/></div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {loading ? "..." : productsCount}
          </div>
          <div className="text-xs text-indigo-500 font-medium mt-2 flex items-center gap-1">
            {productsCount > 0 ? "Synced with Store Catalog" : "No catalog products yet"}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-between">Automated Replies <Zap size={16} className="text-amber-500"/></div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {loading ? "..." : automatedReplies.toLocaleString()}
          </div>
          <div className="text-xs text-amber-500 font-medium mt-2 flex items-center gap-1">
            {automatedReplies > 0 ? "AI & Chatbot interactions" : "Automated interactions"}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="text-sm font-medium text-indigo-100 mb-3 flex items-center justify-between">API Status <Activity size={16}/></div>
          <div className="text-xl font-bold flex items-center gap-2 mb-1">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span> 
            {isConnected ? 'Operational' : 'Disconnected'}
          </div>
          <div className="text-xs text-indigo-200 mt-3 font-medium">
            {isConnected ? (health?.metaApi?.status || "Live Meta Cloud API") : "Setup required in Settings"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Connection Box */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white m-0">Meta Integration Health</h3>
            <p className="text-sm text-gray-500 m-0 mt-1">Real-time status of your WhatsApp Cloud API connection.</p>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
             <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Webhook</div>
                {isConnected ? (
                  <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500"/> Verified
                  </div>
                ) : (
                  <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500"/> Pending Setup
                  </div>
                )}
             </div>
             <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Message Delivery</div>
                {isConnected ? (
                  <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500"/> {health?.delivery?.rate || "100% Rate"}
                  </div>
                ) : (
                  <div className="font-semibold text-gray-400 flex items-center gap-2">
                    <Activity size={16} className="text-gray-400"/> No Traffic
                  </div>
                )}
             </div>
             <div className="col-span-2 mt-2">
                <button onClick={handleRefreshSync} disabled={refreshing} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer">
                  <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Syncing with Meta..." : "Force Sync Integration"}
                </button>
             </div>
          </div>
        </div>

        {/* Messaging Capacity */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white m-0">Messaging Tier Capacity</h3>
          <p className="text-sm text-gray-500 m-0 mt-1 mb-6">
            {isConnected ? "Meta WhatsApp Business limits (24hr rolling window)." : "Configure Meta API to activate messaging tier limits."}
          </p>
          
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Usage Today</span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {sentToday.toLocaleString()} <span className="text-sm text-gray-400 font-medium">/ {isConnected ? (data?.account?.dailyLimit || "10,000") : "--"}</span>
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: isConnected ? `${Math.min(100, (sentToday / 10000) * 100)}%` : "0%" }}></div>
          </div>
          <div className="mt-6 flex justify-between">
             <div className="text-center">
               <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Quality Rating</div>
               {isConnected ? (
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {data?.account?.qualityRating || "High"}
                 </div>
               ) : (
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 rounded-full text-xs font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Not Configured
                 </div>
               )}
             </div>
             <div className="text-center">
               <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Status</div>
               {isConnected ? (
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Connected
                 </div>
               ) : (
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Disconnected
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
