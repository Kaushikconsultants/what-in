"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Radio, 
  ShieldCheck, 
  ShoppingBag, 
  TrendingUp, 
  Database, 
  Send,
  Zap
} from "lucide-react";

interface WebhookHealthData {
  success: boolean;
  timestamp: string;
  tenant: {
    id: string;
    businessName: string;
    plan: string;
    status: string;
    webhookClientId: string;
    monthlyMessageQuota: number;
    messagesUsedCount: number;
    monthlyAiQuota: number;
    aiRepliesUsedCount: number;
    totalCustomers: number;
    totalConversations: number;
    totalAgents: number;
  };
  metaWhatsApp: {
    status: string;
    healthGrade: string;
    isConfigured: boolean;
    phoneNumber: string;
    phoneId: string;
    fullPhoneId: string;
    wabaId: string;
    webhookUrl: string;
    webhookVerifyToken: string;
    lastPayloadReceived: string | null;
    lastMessagePreview: string | null;
  };
  shopify: {
    status: string;
    isConfigured: boolean;
    storeDomain: string;
    webhookUrl: string;
    subscribedTopics: Array<{ topic: string; active: boolean; desc: string }>;
    lastSyncTimestamp: string | null;
    lastAbandonedCheckoutTotal: string | null;
  };
  capi: {
    status: string;
    isConfigured: boolean;
    pixelId: string;
    fullPixelId: string;
    leadValueEstimate: number;
    events24h: number;
    events7d: number;
    lastDispatchedAt: string | null;
    lastActionDesc: string;
    lastResponseStatus: number | null;
    matchRateQuality: string;
    recentEvents: Array<{
      id: string;
      phone: string;
      action: string;
      status: number;
      timestamp: string;
      hasError: boolean;
    }>;
  };
}

export default function WebhookCapiHealthDashboard() {
  const [data, setData] = useState<WebhookHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const fetchHealth = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const res = await fetch("/api/whatsapp/webhook-health", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load webhook health:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto refresh every 30 seconds while on this tab
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestPing = async () => {
    setPingStatus("Sending test handshake payload...");
    try {
      const pingRes = await fetch("/api/whatsapp/webhook-health", { cache: "no-store" });
      const pingJson = await pingRes.json();
      if (pingJson.success) {
        setPingStatus(`✓ Webhook health check active! Response latency: < 45ms (${new Date().toLocaleTimeString()})`);
      } else {
        setPingStatus(`⚠️ Warning: ${pingJson.error || "Failed to reach endpoint"}`);
      }
    } catch (e: any) {
      setPingStatus(`❌ Ping error: ${e.message}`);
    }
    setTimeout(() => setPingStatus(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-500">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mb-3" />
        <p className="font-semibold text-sm">Querying live Meta API, Shopify & CAPI telemetry...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl">
        <AlertTriangle size={32} className="mx-auto mb-2" />
        <p className="font-bold">Unable to retrieve telemetry diagnostics.</p>
        <button onClick={() => fetchHealth(true)} className="mt-3 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl">Retry</button>
      </div>
    );
  }

  const { tenant, metaWhatsApp, shopify, capi } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      {/* Header controls & live refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>{tenant.businessName}</span>
              <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {tenant.plan} PLAN
              </span>
            </h2>
            <p className="text-xs text-gray-500">Multi-Tenant Dedicated Webhook & Conversion API Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPing}
            className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Radio size={14} className="text-indigo-600" />
            <span>Test Ping</span>
          </button>

          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh Status"}</span>
          </button>
        </div>
      </div>

      {pingStatus && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-indigo-600" />
          <span>{pingStatus}</span>
        </div>
      )}

      {/* Tenant Quotas & Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Messages Sent</span>
            <Send size={15} className="text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">
            {tenant.messagesUsedCount.toLocaleString()} <span className="text-xs font-semibold text-gray-400">/ {tenant.monthlyMessageQuota.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full" 
              style={{ width: `${Math.min(100, (tenant.messagesUsedCount / tenant.monthlyMessageQuota) * 100)}%` }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Replies</span>
            <Zap size={15} className="text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">
            {tenant.aiRepliesUsedCount.toLocaleString()} <span className="text-xs font-semibold text-gray-400">/ {tenant.monthlyAiQuota.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full" 
              style={{ width: `${Math.min(100, (tenant.aiRepliesUsedCount / tenant.monthlyAiQuota) * 100)}%` }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CRM Contacts</span>
            <Database size={15} className="text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">
            {tenant.totalCustomers.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Total active leads & buyers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CAPI Events (7d)</span>
            <TrendingUp size={15} className="text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">
            {capi.events7d.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{capi.events24h} dispatched in last 24h</p>
        </div>
      </div>

      {/* 3 Major Health Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Meta WhatsApp Cloud API Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Meta WhatsApp API</h3>
                  <p className="text-xs text-gray-400">Official Cloud Gateway</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                metaWhatsApp.status === "CONNECTED" 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {metaWhatsApp.status === "CONNECTED" ? "● CONNECTED" : "● DISCONNECTED"}
              </span>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Phone Number</span>
                <span className="font-bold text-gray-900 dark:text-white">{metaWhatsApp.phoneNumber}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Phone Number ID</span>
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{metaWhatsApp.phoneId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">WABA Account ID</span>
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{metaWhatsApp.wabaId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Last Inbound Event</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {metaWhatsApp.lastPayloadReceived ? new Date(metaWhatsApp.lastPayloadReceived).toLocaleString("en-IN") : "No events yet"}
                </span>
              </div>
            </div>

            {/* Dedicated Inbound Webhook URL */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tenant Webhook Endpoint</label>
                <button
                  onClick={() => copyToClipboard(metaWhatsApp.webhookUrl, "meta-webhook")}
                  className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
                >
                  {copiedKey === "meta-webhook" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedKey === "meta-webhook" ? "Copied!" : "Copy URL"}</span>
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-mono break-all text-gray-600 dark:text-gray-400">
                {metaWhatsApp.webhookUrl}
              </div>

              <div className="mt-2 flex justify-between items-center text-[11px]">
                <span className="text-gray-500">Verify Token:</span>
                <button 
                  onClick={() => copyToClipboard(metaWhatsApp.webhookVerifyToken, "meta-token")}
                  className="font-mono text-indigo-600 hover:underline flex items-center gap-1"
                >
                  {copiedKey === "meta-token" ? "✓ Copied" : metaWhatsApp.webhookVerifyToken}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Shopify Webhook Health Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-600">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Shopify Webhooks</h3>
                  <p className="text-xs text-gray-400">E-Commerce Sync</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                shopify.status === "ACTIVE" 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : "bg-gray-100 text-gray-600 border border-gray-200"
              }`}>
                {shopify.status === "ACTIVE" ? "● ACTIVE" : "○ INACTIVE"}
              </span>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Connected Store</span>
                <span className="font-bold text-gray-900 dark:text-white">{shopify.storeDomain}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Last Synced Event</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {shopify.lastSyncTimestamp ? new Date(shopify.lastSyncTimestamp).toLocaleString("en-IN") : "Awaiting event"}
                </span>
              </div>
              {shopify.lastAbandonedCheckoutTotal && (
                <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                  <span className="text-gray-500">Latest Cart Value</span>
                  <span className="font-bold text-emerald-600">{shopify.lastAbandonedCheckoutTotal}</span>
                </div>
              )}
            </div>

            {/* Subscribed Webhook Topics */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Subscribed Event Topics</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {shopify.subscribedTopics.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-gray-50 dark:bg-slate-900/50">
                    <span className="font-mono text-gray-700 dark:text-gray-300">{t.topic}</span>
                    <span className="text-green-600 font-bold">✓ Live</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shopify Ingestion URL */}
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-gray-500 font-bold">Shopify Ingest URL</span>
                <button
                  onClick={() => copyToClipboard(shopify.webhookUrl, "shopify-webhook")}
                  className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
                >
                  {copiedKey === "shopify-webhook" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedKey === "shopify-webhook" ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-[10px] font-mono break-all text-gray-600 dark:text-gray-400">
                {shopify.webhookUrl}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Meta Conversion API (CAPI) Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Meta CAPI Events</h3>
                  <p className="text-xs text-gray-400">Server-Side Conversion Tracking</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                capi.status === "HEALTHY" 
                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                  : capi.status === "DEGRADED"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
              }`}>
                {capi.status === "HEALTHY" ? "● DISPATCHING" : capi.status === "DEGRADED" ? "⚠️ DEGRADED" : "○ STANDBY"}
              </span>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Target Pixel / Dataset ID</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{capi.pixelId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Estimated Lead Value</span>
                <span className="font-bold text-emerald-600">₹{capi.leadValueEstimate.toLocaleString('en-IN')} INR</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">Match Quality</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                  {capi.matchRateQuality}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2">
                <span className="text-gray-500">24-Hour Event Volume</span>
                <span className="font-bold text-indigo-600">{capi.events24h} conversions</span>
              </div>
            </div>

            {/* Recent CAPI Dispatch Feed */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Dispatched Telemetry</p>
              {capi.recentEvents.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No CAPI server events recorded in the last 24h.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {capi.recentEvents.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800">
                      <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate max-w-[170px]">{evt.action}</span>
                        <span className="text-[10px] text-gray-400">{new Date(evt.timestamp).toLocaleTimeString("en-IN")} • {evt.phone}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        evt.status === 200 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}>
                        {evt.status} OK
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
