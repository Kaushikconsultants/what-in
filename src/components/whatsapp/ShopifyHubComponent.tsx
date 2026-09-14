"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ShoppingCart,
  Zap,
  Settings,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Percent,
  Truck,
  CreditCard,
  Send,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ShieldCheck,
  Package,
  Gift,
  PhoneCall,
  Flame,
  ArrowUpRight,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2
} from "lucide-react";
import {
  getShopifySummaryMetricsAction,
  getShopifyOrdersAction,
  getShopifyAbandonedCheckoutsAction,
  sendShopifyWhatsAppNudgeAction,
  sendShopifyOrderWhatsAppAction,
  getShopifyAutomationFlowsAction,
  toggleShopifyAutomationFlowAction,
  updateShopifyAutomationFlowAction,
  registerShopifyWebhooksAction
} from "@/app/actions/shopifyPlatformActions";
import {
  getShopifyCredentialsAction,
  saveShopifyCredentialsAction
} from "@/app/actions/whatsAppPlatformActions";

export default function ShopifyHubComponent() {
  const [activeTab, setActiveTab] = useState<"orders" | "abandoned" | "flows" | "settings">("orders");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Metrics State
  const [metrics, setMetrics] = useState<any>({
    totalAbandonedCount: 0,
    totalAbandonedValue: 0,
    recoveredCount: 0,
    recoveredValue: 0,
    recoveryRate: 0,
    nudgedCount: 0,
    activeFlowsCount: 6
  });
  const [storeDomain, setStoreDomain] = useState<string>("esponsports.com");
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [financialFilter, setFinancialFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");

  // Abandoned Checkouts State
  const [abandonedCheckouts, setAbandonedCheckouts] = useState<any[]>([]);

  // Automation Flows State
  const [flows, setFlows] = useState<any[]>([]);

  // Modals State
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<any | null>(null);
  const [orderActionType, setOrderActionType] = useState<"CONFIRMATION" | "COD_TO_PREPAID" | "DISPATCH_TRACKING" | "DELIVERED">("CONFIRMATION");
  const [sendingOrderAction, setSendingOrderAction] = useState<boolean>(false);
  const [codDiscountPct, setCodDiscountPct] = useState<number>(5);
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [courierName, setCourierName] = useState<string>("Delhivery");
  const [trackingUrl, setTrackingUrl] = useState<string>("");

  const [selectedCheckoutForNudge, setSelectedCheckoutForNudge] = useState<any | null>(null);
  const [nudgeDiscountCode, setNudgeDiscountCode] = useState<string>("SAVE10");
  const [sendingNudge, setSendingNudge] = useState<boolean>(false);

  // Settings Form State
  const [settingsDomain, setSettingsDomain] = useState<string>("");
  const [settingsToken, setSettingsToken] = useState<string>("");
  const [showToken, setShowToken] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [registeringWebhooks, setRegisteringWebhooks] = useState<boolean>(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // URL Tab handling
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "settings" || tabParam === "connection" || tabParam === "shopify") {
        setActiveTab("settings");
      } else if (tabParam === "abandoned") {
        setActiveTab("abandoned");
      } else if (tabParam === "flows") {
        setActiveTab("flows");
      } else if (tabParam === "orders") {
        setActiveTab("orders");
      }
    }
  }, []);

  // Initial Load
  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Metrics & Store Domain
      const mRes = await getShopifySummaryMetricsAction();
      if (mRes.success) {
        setMetrics(mRes.metrics);
        setStoreDomain(mRes.domain || "esponsports.com");
        setIsConfigured(Boolean(mRes.isConfigured));
        if (mRes.domain) setSettingsDomain(mRes.domain);
      }

      // 2. Fetch specific credentials for the settings inputs
      const credsRes = await getShopifyCredentialsAction();
      if (credsRes.success && credsRes.credentials) {
        if (credsRes.credentials.shopifyStoreDomain) {
          setSettingsDomain(credsRes.credentials.shopifyStoreDomain);
          setStoreDomain(credsRes.credentials.shopifyStoreDomain);
        }
        if (credsRes.credentials.shopifyAccessToken) {
          setSettingsToken(credsRes.credentials.shopifyAccessToken);
        }
      }

      // 3. Flows
      const fRes = await getShopifyAutomationFlowsAction();
      if (fRes.success && fRes.flows) {
        setFlows(fRes.flows);
      }

      // 4. Orders
      const oRes = await getShopifyOrdersAction({
        financialStatus: financialFilter !== "all" ? financialFilter : undefined,
        fulfillmentStatus: fulfillmentFilter !== "all" ? fulfillmentFilter : undefined,
        search: orderSearch || undefined
      });
      if (oRes.success && oRes.orders) {
        setOrders(oRes.orders);
      }

      // 5. Abandoned Checkouts
      const aRes = await getShopifyAbandonedCheckoutsAction();
      if (aRes.success && aRes.checkouts) {
        setAbandonedCheckouts(aRes.checkouts);
      }
    } catch (err: any) {
      console.error("Error loading Shopify data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [financialFilter, fulfillmentFilter]);

  // Handle Send Order WhatsApp Action
  const handleSendOrderWhatsApp = async () => {
    if (!selectedOrderForAction) return;
    setSendingOrderAction(true);
    try {
      const itemsSummary = selectedOrderForAction.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(", ");
      const res = await sendShopifyOrderWhatsAppAction({
        orderId: selectedOrderForAction.id,
        orderNumber: selectedOrderForAction.orderNumber,
        actionType: orderActionType,
        phone: selectedOrderForAction.customerPhone,
        customerName: selectedOrderForAction.customerName,
        totalAmount: selectedOrderForAction.totalPrice,
        itemsSummary,
        trackingNumber: trackingNumber || undefined,
        courierName: courierName || undefined,
        trackingUrl: trackingUrl || undefined,
        discountPercentage: codDiscountPct
      });

      if (res.success) {
        showToast("success", `WhatsApp ${orderActionType.replace(/_/g, " ")} sent to ${selectedOrderForAction.customerName}!`);
        setSelectedOrderForAction(null);
        loadAllData(true);
      } else {
        showToast("error", res.error || "Failed to send WhatsApp message");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error");
    } finally {
      setSendingOrderAction(false);
    }
  };

  // Handle Send Abandoned Cart Nudge
  const handleSendAbandonedNudge = async () => {
    if (!selectedCheckoutForNudge) return;
    setSendingNudge(true);
    try {
      const itemsSummary = selectedCheckoutForNudge.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(", ");
      const res = await sendShopifyWhatsAppNudgeAction({
        checkoutId: selectedCheckoutForNudge.checkoutId,
        phone: selectedCheckoutForNudge.customerPhone,
        customerName: selectedCheckoutForNudge.customerName,
        cartValue: selectedCheckoutForNudge.totalPrice,
        itemsSummary: itemsSummary || "Your selected items",
        checkoutUrl: selectedCheckoutForNudge.checkoutUrl,
        discountCode: nudgeDiscountCode || undefined
      });

      if (res.success) {
        showToast("success", `Cart recovery WhatsApp nudge sent to ${selectedCheckoutForNudge.customerName}!`);
        setSelectedCheckoutForNudge(null);
        loadAllData(true);
      } else {
        showToast("error", res.error || "Failed to send recovery nudge");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error");
    } finally {
      setSendingNudge(false);
    }
  };

  // Handle Toggle Flow
  const handleToggleFlow = async (flowId: string, currentActive: boolean) => {
    try {
      const res = await toggleShopifyAutomationFlowAction(flowId, !currentActive);
      if (res.success) {
        setFlows(prev => prev.map(f => f.id === flowId ? { ...f, isActive: !currentActive } : f));
        showToast("success", `Flow ${!currentActive ? "Activated" : "Paused"} successfully.`);
      } else {
        showToast("error", res.error || "Failed to toggle flow");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error");
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    if (!settingsDomain || !settingsToken) {
      showToast("error", "Store domain and Admin API Access Token are required.");
      return;
    }
    setSavingSettings(true);
    try {
      const res = await saveShopifyCredentialsAction({
        storeDomain: settingsDomain,
        accessToken: settingsToken
      });
      if (res.success) {
        showToast("success", "Shopify credentials verified & saved securely!");
        setIsConfigured(true);
        setStoreDomain(settingsDomain);
        loadAllData(true);
      } else {
        showToast("error", res.error || "Failed to verify Shopify credentials");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Register Webhooks
  const handleRegisterWebhooks = async () => {
    setRegisteringWebhooks(true);
    try {
      const res = await registerShopifyWebhooksAction();
      if (res.success) {
        showToast("success", "All Shopify automated webhooks registered successfully!");
      } else {
        showToast("error", res.error || "Failed to register webhooks");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error");
    } finally {
      setRegisteringWebhooks(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1550px] mx-auto text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 ${toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"} px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 font-semibold text-sm animate-in fade-in slide-in-from-bottom-5 duration-200`}>
          {toastMsg.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 text-white p-6 sm:p-7 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-4 mb-6 border border-emerald-700/50">
        <div className="flex items-center gap-4">
          <div className="bg-white/15 backdrop-blur-md rounded-xl w-13 h-13 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
            <ShoppingBag size={28} className="text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
                Shopify WhatsApp E-Commerce Hub
              </h1>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  isConfigured 
                    ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-400/30" 
                    : "bg-rose-400/20 text-rose-200 border border-rose-400/40 hover:bg-rose-400/30"
                }`}
                title="Click to manage store connection & credentials"
              >
                <span className={`w-2 h-2 rounded-full ${isConfigured ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                {isConfigured ? `Connected: ${storeDomain}` : "Store Disconnected (Click to Connect)"}
              </button>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 max-w-3xl">
              Automated Shopify order notifications, abandoned checkout recovery drips &amp; 1-click COD-to-Prepaid conversion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              activeTab === "settings"
                ? "bg-white text-emerald-900 shadow-md font-extrabold"
                : "bg-white/15 hover:bg-white/25 text-white border border-white/25"
            }`}
          >
            <Settings size={15} /> Store Settings
          </button>
          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white border border-white/25 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Syncing..." : "Sync Store"}
          </button>
          <Link
            href="/whatsapp/inbox"
            className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all shadow-sm"
          >
            <MessageSquare size={15} /> Open Inbox
          </Link>
        </div>
      </div>

      {/* Metrics Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>ABANDONED CARTS</span>
            <ShoppingCart size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.totalAbandonedCount}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">
            ₹{metrics.totalAbandonedValue.toLocaleString("en-IN")} at risk
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>RECOVERED REVENUE</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{metrics.recoveredValue.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {metrics.recoveredCount} carts recovered ({metrics.recoveryRate}% rate)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>ACTIVE AUTOMATION FLOWS</span>
            <Zap size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {flows.filter(f => f.isActive).length} / {flows.length || 6}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Ready-to-use plug &amp; play flows
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>RECOVERY NUDGES SENT</span>
            <Send size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.nudgedCount}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
            WhatsApp interactive recovery
          </div>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "orders"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Package size={17} /> Live Shopify Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab("abandoned")}
          className={`px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "abandoned"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShoppingCart size={17} /> Abandoned Checkouts ({abandonedCheckouts.length})
        </button>

        <button
          onClick={() => setActiveTab("flows")}
          className={`px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "flows"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Zap size={17} /> Pre-Generated Flows (6)
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-extrabold"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Settings size={17} /> Connection &amp; Webhooks
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: LIVE SHOPIFY ORDERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "orders" && (
        <div>
          {/* Filters Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search order #, customer name..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadAllData(true)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={financialFilter}
                onChange={(e) => setFinancialFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="all">Payment: All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending (COD)</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="all">Fulfillment: All</option>
                <option value="unfulfilled">Unfulfilled</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
              <div className="text-sm font-semibold">Fetching live orders from Shopify Store...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <Package size={44} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">No Shopify Orders Found</div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
                Orders placed on your connected Shopify store ({storeDomain}) will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                      <th className="p-3 sm:p-4">ORDER</th>
                      <th className="p-3 sm:p-4">CUSTOMER</th>
                      <th className="p-3 sm:p-4">ITEMS &amp; TOTAL</th>
                      <th className="p-3 sm:p-4">PAYMENT</th>
                      <th className="p-3 sm:p-4">FULFILLMENT</th>
                      <th className="p-3 sm:p-4 text-right">1-CLICK WHATSAPP ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 sm:p-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">{o.orderNumber}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {new Date(o.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{o.customerName}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                            +{o.customerPhone || "No Phone"}
                          </div>
                        </td>

                        <td className="p-3 sm:p-4">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                            ₹{o.totalPrice.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs truncate">
                            {o.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(", ")}
                          </div>
                        </td>

                        <td className="p-3 sm:p-4">
                          <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase inline-block ${
                            o.financialStatus === "paid" 
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300" 
                              : o.isCod 
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}>
                            {o.isCod ? "COD PENDING" : o.financialStatus}
                          </span>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
                            {o.paymentGateway}
                          </div>
                        </td>

                        <td className="p-3 sm:p-4">
                          <span className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize inline-block ${
                            o.fulfillmentStatus === "fulfilled" 
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}>
                            {o.fulfillmentStatus}
                          </span>
                          {o.trackingNumber && (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-mono">
                              AWB: {o.trackingNumber}
                            </div>
                          )}
                        </td>

                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Order Confirmation */}
                            <button
                              onClick={() => {
                                setSelectedOrderForAction(o);
                                setOrderActionType("CONFIRMATION");
                              }}
                              title="Send WhatsApp Order Confirmation"
                              className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Send size={12} /> Confirm
                            </button>

                            {/* COD to Prepaid */}
                            {o.isCod && (
                              <button
                                onClick={() => {
                                  setSelectedOrderForAction(o);
                                  setOrderActionType("COD_TO_PREPAID");
                                }}
                                title="Send 5-10% Discount Link to Convert COD to Prepaid"
                                className="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <CreditCard size={12} /> Convert COD
                              </button>
                            )}

                            {/* Dispatch Tracking */}
                            <button
                              onClick={() => {
                                setSelectedOrderForAction(o);
                                setOrderActionType("DISPATCH_TRACKING");
                                setTrackingNumber(o.trackingNumber || "");
                                setCourierName(o.trackingCompany || "Delhivery");
                                setTrackingUrl(o.trackingUrl || "");
                              }}
                              title="Send Tracking Link via WhatsApp"
                              className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Truck size={12} /> Track
                            </button>

                            {/* Open in Chatbox */}
                            <Link
                              href={`/whatsapp/inbox${o.conversationId ? `?convId=${o.conversationId}` : ""}`}
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold inline-flex items-center transition-colors"
                              title="Open in WhatsApp Inbox"
                            >
                              <MessageSquare size={12} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ABANDONED CHECKOUTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "abandoned" && (
        <div>
          {loading ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
              <div className="text-sm font-semibold">Fetching live abandoned checkouts...</div>
            </div>
          ) : abandonedCheckouts.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <CheckCircle size={44} className="text-emerald-500 mx-auto mb-3" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">Zero Abandoned Carts Right Now!</div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
                All recent customer checkouts have been completed or recovered.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs">
                      <th className="p-3 sm:p-4">ABANDONED AT</th>
                      <th className="p-3 sm:p-4">CUSTOMER</th>
                      <th className="p-3 sm:p-4">CART VALUE &amp; ITEMS</th>
                      <th className="p-3 sm:p-4">RECOVERY STATUS</th>
                      <th className="p-3 sm:p-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {abandonedCheckouts.map((c) => (
                      <tr key={c.id || c.checkoutId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {new Date(c.abandonedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            ID: {c.checkoutId.slice(-8)}
                          </div>
                        </td>

                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{c.customerName}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                            +{c.customerPhone || "No Mobile"}
                          </div>
                          {c.customerEmail && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.customerEmail}</div>
                          )}
                        </td>

                        <td className="p-3 sm:p-4">
                          <div className="font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                            ₹{c.totalPrice.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs truncate">
                            {c.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(", ") || "Cart items"}
                          </div>
                        </td>

                        <td className="p-3 sm:p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block ${
                            c.recoveryStatus === "RECOVERED"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : c.recoveryStatus === "NUDGED"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                          }`}>
                            {c.recoveryStatus === "NUDGED" ? `NUDGED (${c.nudgesSentCount}x)` : c.recoveryStatus}
                          </span>
                          {c.lastNudgeAt && (
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
                              Last nudge: {new Date(c.lastNudgeAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </td>

                        <td className="p-3 sm:p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedCheckoutForNudge(c);
                              setNudgeDiscountCode("SAVE10");
                            }}
                            disabled={c.recoveryStatus === "RECOVERED"}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              c.recoveryStatus === "RECOVERED"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
                                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm"
                            }`}
                          >
                            <Send size={13} /> Send WhatsApp Nudge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PRE-GENERATED AUTOMATION FLOWS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "flows" && (
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white m-0">
              ⚡ Plug-and-Play E-Commerce Automation Flows
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              These ready-to-use flows trigger automatically when events happen on your Shopify store via webhooks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs ${
                  flow.isActive 
                    ? "border-emerald-500 dark:border-emerald-500/80 shadow-emerald-500/5 ring-1 ring-emerald-500/20" 
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  {/* Flow Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white m-0">
                        {flow.name}
                      </h3>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10.5px] font-semibold mt-1.5 inline-block">
                        Trigger: <code className="font-mono">{flow.triggerEvent}</code>
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFlow(flow.id, flow.isActive)}
                      className="cursor-pointer bg-transparent border-0 p-0"
                      title={flow.isActive ? "Click to Pause Flow" : "Click to Activate Flow"}
                    >
                      {flow.isActive ? (
                        <ToggleRight size={34} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={34} className="text-slate-400 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Flow Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3.5">
                    {flow.description}
                  </p>

                  {/* Message Preview Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mb-3.5 font-sans">
                    {flow.messageCopy}
                  </div>
                </div>

                {/* Footer Stats & Status */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="text-slate-500 dark:text-slate-400">
                    Triggered: <strong className="text-slate-800 dark:text-slate-200">{flow.totalTriggered || 0} times</strong>
                  </div>

                  <span className={`font-bold flex items-center gap-1.5 ${flow.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    <span className={`w-2 h-2 rounded-full ${flow.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {flow.isActive ? "ACTIVE" : "PAUSED"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: CONNECTION & WEBHOOK SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="max-w-3xl space-y-6">
          {/* Shopify Credentials Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                  <ShoppingBag size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white m-0">
                    Shopify Store Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect your Shopify Custom App to sync live orders and cart events directly into Whatmore.
                  </p>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                isConfigured
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                {isConfigured ? "Active & Syncing" : "Setup Required"}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Shopify Store Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. store.myshopify.com or esponsports.myshopify.com"
                  value={settingsDomain}
                  onChange={(e) => setSettingsDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-emerald-500 font-mono transition-colors shadow-2xs"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Your primary myshopify.com subdomain or registered custom domain.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Admin API Access Token (shpat_...)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showToken ? "Hide Token" : "Show Token"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settingsToken}
                    onChange={(e) => setSettingsToken(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-emerald-500 font-mono transition-colors shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Permanent token generated from your Shopify Custom App under <em>Apps &gt; App Development</em>.
                </span>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer mt-2"
              >
                {savingSettings ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle size={15} />}
                {savingSettings ? "Testing & Saving..." : "Connect Shopify Store"}
              </button>
            </div>
          </div>

          {/* Webhook Auto-Registration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-50 dark:bg-blue-950/60 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80">
                <Zap size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white m-0">
                  Automated Shopify Webhooks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registers live event listeners on your Shopify store for orders/create, checkouts/update, and fulfillments.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Webhook Target URL:{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-800 dark:text-slate-200">
                https://whatsapp.esponsports.com/api/shopify/webhook
              </code>
            </p>

            <button
              onClick={handleRegisterWebhooks}
              disabled={registeringWebhooks || !isConfigured}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              {registeringWebhooks ? <RefreshCw className="animate-spin" size={15} /> : <Zap size={15} />}
              {registeringWebhooks ? "Registering Webhooks..." : "Register All Shopify Webhooks (1-Click)"}
            </button>
          </div>

          {/* Setup Guide Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 transition-colors">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-500" />
              How to Create Your Shopify Admin API Token
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Log in to your <strong>Shopify Admin</strong> &gt; go to <strong>Settings</strong> &gt; <strong>Apps and sales channels</strong>.</li>
              <li>Click <strong>Develop apps</strong> &gt; <strong>Create an app</strong> (Name it: <em>Whatmore WhatsApp Hub</em>).</li>
              <li>Under <strong>Configuration</strong> &gt; <strong>Admin API integration</strong>, enable scopes:
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">read_orders</span>
                  <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">write_orders</span>
                  <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">read_checkouts</span>
                  <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">write_checkouts</span>
                  <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">read_products</span>
                  <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">read_customers</span>
                </div>
              </li>
              <li>Click <strong>Install App</strong> and copy the <strong>Admin API access token</strong> starting with <code>shpat_</code>.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SEND 1-CLICK ORDER WHATSAPP MESSAGE */}
      {/* ------------------------------------------------------------- */}
      {selectedOrderForAction && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrderForAction(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                <Send size={18} /> Send WhatsApp to {selectedOrderForAction.customerName}
              </div>
              <button 
                onClick={() => setSelectedOrderForAction(null)}
                className="text-white/80 hover:text-white text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <div>Order: <strong className="text-slate-900 dark:text-white">{selectedOrderForAction.orderNumber}</strong></div>
                <div>Amount: <strong className="text-slate-900 dark:text-white">₹{selectedOrderForAction.totalPrice.toLocaleString("en-IN")}</strong></div>
                <div>Recipient: <strong className="text-slate-900 dark:text-white">+{selectedOrderForAction.customerPhone}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Action / Message Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderActionType("CONFIRMATION")}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      orderActionType === "CONFIRMATION"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    📦 Order Confirmation
                  </button>

                  <button
                    onClick={() => setOrderActionType("COD_TO_PREPAID")}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      orderActionType === "COD_TO_PREPAID"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    ⚡ COD to Prepaid
                  </button>

                  <button
                    onClick={() => setOrderActionType("DISPATCH_TRACKING")}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      orderActionType === "DISPATCH_TRACKING"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    🚚 Dispatch Tracking
                  </button>

                  <button
                    onClick={() => setOrderActionType("DELIVERED")}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      orderActionType === "DELIVERED"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    🎁 Delivered &amp; Review
                  </button>
                </div>
              </div>

              {/* Extra Inputs for COD to Prepaid */}
              {orderActionType === "COD_TO_PREPAID" && (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    Instant Prepaid Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={codDiscountPct}
                    onChange={(e) => setCodDiscountPct(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                    Customer pays: ₹{(selectedOrderForAction.totalPrice - Math.round((selectedOrderForAction.totalPrice * codDiscountPct) / 100)).toLocaleString("en-IN")} (Saves ₹{Math.round((selectedOrderForAction.totalPrice * codDiscountPct) / 100)})
                  </div>
                </div>
              )}

              {/* Extra Inputs for Tracking */}
              {orderActionType === "DISPATCH_TRACKING" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      AWB / Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14209384758"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhivery, Bluedart, Shiprocket"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSendOrderWhatsApp}
                disabled={sendingOrderAction}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {sendingOrderAction ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {sendingOrderAction ? "Sending via WhatsApp..." : "Send WhatsApp Message Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SEND ABANDONED CART NUDGE */}
      {/* ------------------------------------------------------------- */}
      {selectedCheckoutForNudge && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCheckoutForNudge(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                <ShoppingCart size={18} /> Recover Cart for {selectedCheckoutForNudge.customerName}
              </div>
              <button 
                onClick={() => setSelectedCheckoutForNudge(null)}
                className="text-white/80 hover:text-white text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="text-slate-500 dark:text-slate-400">Cart Value:</div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  ₹{selectedCheckoutForNudge.totalPrice.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Recipient: +{selectedCheckoutForNudge.customerPhone}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Incentive Coupon Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SAVE10 or FLAT15"
                  value={nudgeDiscountCode}
                  onChange={(e) => setNudgeDiscountCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                onClick={handleSendAbandonedNudge}
                disabled={sendingNudge}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {sendingNudge ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {sendingNudge ? "Sending Nudge via WhatsApp..." : "Send Recovery Nudge (1-Click)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
