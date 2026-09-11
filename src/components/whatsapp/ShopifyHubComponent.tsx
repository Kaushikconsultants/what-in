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
  ArrowUpRight
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
import { saveShopifyCredentialsAction } from "@/app/actions/whatsAppPlatformActions";

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
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [registeringWebhooks, setRegisteringWebhooks] = useState<boolean>(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Initial Load
  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Metrics
      const mRes = await getShopifySummaryMetricsAction();
      if (mRes.success) {
        setMetrics(mRes.metrics);
        setStoreDomain(mRes.domain || "esponsports.com");
        setIsConfigured(mRes.isConfigured);
        setSettingsDomain(mRes.domain || "");
      }

      // 2. Flows
      const fRes = await getShopifyAutomationFlowsAction();
      if (fRes.success && fRes.flows) {
        setFlows(fRes.flows);
      }

      // 3. Orders
      const oRes = await getShopifyOrdersAction({
        financialStatus: financialFilter !== "all" ? financialFilter : undefined,
        fulfillmentStatus: fulfillmentFilter !== "all" ? fulfillmentFilter : undefined,
        search: orderSearch || undefined
      });
      if (oRes.success && oRes.orders) {
        setOrders(oRes.orders);
      }

      // 4. Abandoned Checkouts
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
      showToast("error", "Domain and Access Token are required.");
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
    <div style={{ padding: "24px", maxWidth: "1500px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: toastMsg.type === "success" ? "#10b981" : "#ef4444",
          color: "white",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: 600,
          fontSize: "13.5px"
        }}>
          {toastMsg.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toastMsg.text}
        </div>
      )}

      {/* Top Banner & Header */}
      <div style={{
        background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
        color: "white",
        padding: "24px 28px",
        borderRadius: "18px",
        boxShadow: "0 8px 24px rgba(6, 78, 59, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: "14px",
            width: "52px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ShoppingBag size={28} color="#6ee7b7" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>
                Shopify WhatsApp E-Commerce Hub
              </h1>
              <span style={{
                background: isConfigured ? "rgba(110, 231, 183, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: isConfigured ? "#6ee7b7" : "#fca5a5",
                border: isConfigured ? "1px solid #10b981" : "1px solid #ef4444",
                padding: "3px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isConfigured ? "#6ee7b7" : "#ef4444" }} />
                {isConfigured ? `Connected: ${storeDomain}` : "Store Disconnected"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.85, color: "#d1fae5" }}>
              Automated Shopify order notifications, abandoned checkout recovery drips & 1-click COD-to-Prepaid conversion.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "9px 15px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Syncing..." : "Sync Store"}
          </button>
          <Link
            href="/whatsapp/inbox"
            style={{
              background: "#10b981",
              color: "#064e3b",
              padding: "9px 16px",
              borderRadius: "10px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <MessageSquare size={14} /> Open Inbox
          </Link>
        </div>
      </div>

      {/* Metrics Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "white", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
            <span>ABANDONED CARTS</span>
            <ShoppingCart size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "8px" }}>
            {metrics.totalAbandonedCount}
          </div>
          <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 600, marginTop: "4px" }}>
            ₹{metrics.totalAbandonedValue.toLocaleString("en-IN")} at risk
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
            <span>RECOVERED REVENUE</span>
            <TrendingUp size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#10b981", marginTop: "8px" }}>
            ₹{metrics.recoveredValue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
            {metrics.recoveredCount} carts recovered ({metrics.recoveryRate}% rate)
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
            <span>ACTIVE AUTOMATION FLOWS</span>
            <Zap size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#4f46e5", marginTop: "8px" }}>
            {flows.filter(f => f.isActive).length} / {flows.length || 6}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
            Ready-to-use plug & play flows
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
            <span>RECOVERY NUDGES SENT</span>
            <Send size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "8px" }}>
            {metrics.nudgedCount}
          </div>
          <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, marginTop: "4px" }}>
            WhatsApp interactive recovery
          </div>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        borderBottom: "1.5px solid #e2e8f0",
        marginBottom: "20px"
      }}>
        <button
          onClick={() => setActiveTab("orders")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: activeTab === "orders" ? "#047857" : "#64748b",
            borderBottom: activeTab === "orders" ? "3px solid #047857" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Package size={17} /> Live Shopify Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab("abandoned")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: activeTab === "abandoned" ? "#047857" : "#64748b",
            borderBottom: activeTab === "abandoned" ? "3px solid #047857" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <ShoppingCart size={17} /> Abandoned Checkouts ({abandonedCheckouts.length})
        </button>

        <button
          onClick={() => setActiveTab("flows")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: activeTab === "flows" ? "#047857" : "#64748b",
            borderBottom: activeTab === "flows" ? "3px solid #047857" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Zap size={17} /> Pre-Generated Flows (6)
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: activeTab === "settings" ? "#047857" : "#64748b",
            borderBottom: activeTab === "settings" ? "3px solid #047857" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Settings size={17} /> Connection & Webhooks
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: LIVE SHOPIFY ORDERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "orders" && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
                <Search size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search order #, customer name..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadAllData(true)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={financialFilter}
                onChange={(e) => setFinancialFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "white", color: "#334155" }}
              >
                <option value="all">Payment: All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending (COD)</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "white", color: "#334155" }}
              >
                <option value="all">Fulfillment: All</option>
                <option value="unfulfilled">Unfulfilled</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: "0 auto 12px" }} />
              <div>Fetching live orders from Shopify Store...</div>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", background: "white", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <Package size={40} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#334155" }}>No Shopify Orders Found</div>
              <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "400px", margin: "6px auto 0" }}>
                Orders placed on your connected Shopify store ({storeDomain}) will appear here automatically.
              </p>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: "12px" }}>
                    <th style={{ padding: "12px 16px" }}>ORDER</th>
                    <th style={{ padding: "12px 16px" }}>CUSTOMER</th>
                    <th style={{ padding: "12px 16px" }}>ITEMS & TOTAL</th>
                    <th style={{ padding: "12px 16px" }}>PAYMENT</th>
                    <th style={{ padding: "12px 16px" }}>FULFILLMENT</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>1-CLICK WHATSAPP ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{o.orderNumber}</div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                          {new Date(o.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{o.customerName}</div>
                        <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
                          +{o.customerPhone || "No Phone"}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                          ₹{o.totalPrice.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px", maxWidth: "240px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {o.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(", ")}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          background: o.financialStatus === "paid" ? "#dcfce7" : o.isCod ? "#fef3c7" : "#f1f5f9",
                          color: o.financialStatus === "paid" ? "#15803d" : o.isCod ? "#b45309" : "#475569",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase"
                        }}>
                          {o.isCod ? "COD PENDING" : o.financialStatus}
                        </span>
                        <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                          {o.paymentGateway}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          background: o.fulfillmentStatus === "fulfilled" ? "#dbeafe" : "#f1f5f9",
                          color: o.fulfillmentStatus === "fulfilled" ? "#1d4ed8" : "#475569",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "capitalize"
                        }}>
                          {o.fulfillmentStatus}
                        </span>
                        {o.trackingNumber && (
                          <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "4px" }}>
                            AWB: {o.trackingNumber}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          {/* Order Confirmation */}
                          <button
                            onClick={() => {
                              setSelectedOrderForAction(o);
                              setOrderActionType("CONFIRMATION");
                            }}
                            title="Send WhatsApp Order Confirmation"
                            style={{
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                              padding: "6px 10px",
                              borderRadius: "7px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
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
                              style={{
                                background: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                padding: "6px 10px",
                                borderRadius: "7px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
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
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              padding: "6px 10px",
                              borderRadius: "7px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Truck size={12} /> Track
                          </button>

                          {/* Open in Chatbox */}
                          <Link
                            href={`/whatsapp/inbox${o.conversationId ? `?convId=${o.conversationId}` : ""}`}
                            style={{
                              background: "#f8fafc",
                              color: "#475569",
                              border: "1px solid #cbd5e1",
                              padding: "6px 9px",
                              borderRadius: "7px",
                              textDecoration: "none",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
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
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ABANDONED CHECKOUTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "abandoned" && (
        <div>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: "0 auto 12px" }} />
              <div>Fetching live abandoned checkouts...</div>
            </div>
          ) : abandonedCheckouts.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", background: "white", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <CheckCircle size={40} color="#10b981" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#334155" }}>Zero Abandoned Carts Right Now!</div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "6px 0 0" }}>
                All recent customer checkouts have been completed or recovered.
              </p>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: "12px" }}>
                    <th style={{ padding: "12px 16px" }}>ABANDONED AT</th>
                    <th style={{ padding: "12px 16px" }}>CUSTOMER</th>
                    <th style={{ padding: "12px 16px" }}>CART VALUE & ITEMS</th>
                    <th style={{ padding: "12px 16px" }}>RECOVERY STATUS</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {abandonedCheckouts.map((c) => (
                    <tr key={c.id || c.checkoutId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {new Date(c.abandonedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          ID: {c.checkoutId.slice(-8)}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{c.customerName}</div>
                        <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
                          +{c.customerPhone || "No Mobile"}
                        </div>
                        {c.customerEmail && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{c.customerEmail}</div>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: "15px" }}>
                          ₹{c.totalPrice.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "2px", maxWidth: "260px" }}>
                          {c.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(", ") || "Cart items"}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          background: c.recoveryStatus === "RECOVERED" ? "#dcfce7" : c.recoveryStatus === "NUDGED" ? "#dbeafe" : "#fee2e2",
                          color: c.recoveryStatus === "RECOVERED" ? "#15803d" : c.recoveryStatus === "NUDGED" ? "#1d4ed8" : "#b91c1c",
                          padding: "4px 9px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          {c.recoveryStatus === "NUDGED" ? `NUDGED (${c.nudgesSentCount}x)` : c.recoveryStatus}
                        </span>
                        {c.lastNudgeAt && (
                          <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                            Last nudge: {new Date(c.lastNudgeAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            setSelectedCheckoutForNudge(c);
                            setNudgeDiscountCode("SAVE10");
                          }}
                          disabled={c.recoveryStatus === "RECOVERED"}
                          style={{
                            background: c.recoveryStatus === "RECOVERED" ? "#f1f5f9" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                            color: c.recoveryStatus === "RECOVERED" ? "#94a3b8" : "white",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: c.recoveryStatus === "RECOVERED" ? "default" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: c.recoveryStatus === "RECOVERED" ? "none" : "0 2px 8px rgba(79, 70, 229, 0.25)"
                          }}
                        >
                          <Send size={13} /> Send WhatsApp Nudge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PRE-GENERATED AUTOMATION FLOWS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "flows" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
              ⚡ Plug-and-Play E-Commerce Automation Flows
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              These ready-to-use flows trigger automatically when events happen on your Shopify store via webhooks.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "18px" }}>
            {flows.map((flow) => (
              <div
                key={flow.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "20px",
                  border: flow.isActive ? "1.5px solid #10b981" : "1.5px solid #e2e8f0",
                  boxShadow: flow.isActive ? "0 4px 14px rgba(16, 185, 129, 0.08)" : "0 2px 6px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div>
                  {/* Flow Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                        {flow.name}
                      </h3>
                      <span style={{
                        background: "#f1f5f9",
                        color: "#475569",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "10.5px",
                        fontWeight: 600,
                        marginTop: "6px",
                        display: "inline-block"
                      }}>
                        Trigger: <code>{flow.triggerEvent}</code>
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFlow(flow.id, flow.isActive)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0
                      }}
                      title={flow.isActive ? "Click to Pause Flow" : "Click to Activate Flow"}
                    >
                      {flow.isActive ? (
                        <ToggleRight size={36} color="#10b981" />
                      ) : (
                        <ToggleLeft size={36} color="#94a3b8" />
                      )}
                    </button>
                  </div>

                  {/* Flow Description */}
                  <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.5", margin: "0 0 14px" }}>
                    {flow.description}
                  </p>

                  {/* Message Preview Box */}
                  <div style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px dashed #cbd5e1",
                    fontSize: "12px",
                    color: "#334155",
                    lineHeight: "1.45",
                    whiteSpace: "pre-wrap",
                    marginBottom: "14px"
                  }}>
                    {flow.messageCopy}
                  </div>
                </div>

                {/* Footer Stats & Status */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "1px solid #f1f5f9",
                  fontSize: "12px"
                }}>
                  <div style={{ color: "#64748b" }}>
                    Triggered: <strong style={{ color: "#0f172a" }}>{flow.totalTriggered || 0} times</strong>
                  </div>

                  <span style={{
                    color: flow.isActive ? "#059669" : "#64748b",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: flow.isActive ? "#10b981" : "#94a3b8" }} />
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
        <div style={{ maxWidth: "700px" }}>
          {/* Shopify Credentials Card */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#ecfdf5", padding: "8px", borderRadius: "10px" }}>
                <ShoppingBag size={20} color="#059669" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Shopify Store Credentials
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  Connect your Shopify Custom App to sync live orders and cart events.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                  Shopify Store Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. store.myshopify.com or esponsports.com"
                  value={settingsDomain}
                  onChange={(e) => setSettingsDomain(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                  Admin API Access Token (shpat_...)
                </label>
                <input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settingsToken}
                  onChange={(e) => setSettingsToken(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                style={{
                  background: "#059669",
                  color: "white",
                  border: "none",
                  padding: "11px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: savingSettings ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  marginTop: "6px"
                }}
              >
                {savingSettings ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle size={15} />}
                {savingSettings ? "Testing & Saving..." : "Save & Verify Connection"}
              </button>
            </div>
          </div>

          {/* Webhook Auto-Registration Card */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "10px" }}>
                <Zap size={20} color="#2563eb" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Automated Shopify Webhooks
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  Registers live listeners on your Shopify store for instant WhatsApp triggers.
                </p>
              </div>
            </div>

            <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.5", margin: "0 0 16px" }}>
              Webhook Endpoint: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>https://whatsapp.esponsports.com/api/shopify/webhook</code>
            </p>

            <button
              onClick={handleRegisterWebhooks}
              disabled={registeringWebhooks}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "11px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: registeringWebhooks ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px"
              }}
            >
              {registeringWebhooks ? <RefreshCw className="animate-spin" size={15} /> : <Zap size={15} />}
              {registeringWebhooks ? "Registering Webhooks..." : "Register All Shopify Webhooks (1-Click)"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SEND 1-CLICK ORDER WHATSAPP MESSAGE */}
      {/* ------------------------------------------------------------- */}
      {selectedOrderForAction && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }} onClick={() => setSelectedOrderForAction(null)}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            maxWidth: "520px",
            width: "100%",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
              color: "white",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px" }}>
                <Send size={18} /> Send WhatsApp to {selectedOrderForAction.customerName}
              </div>
              <button onClick={() => setSelectedOrderForAction(null)} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Action Template
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    onClick={() => setOrderActionType("CONFIRMATION")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: orderActionType === "CONFIRMATION" ? "2px solid #047857" : "1px solid #cbd5e1",
                      background: orderActionType === "CONFIRMATION" ? "#ecfdf5" : "white",
                      color: orderActionType === "CONFIRMATION" ? "#047857" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    📦 Order Confirmation
                  </button>

                  <button
                    onClick={() => setOrderActionType("COD_TO_PREPAID")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: orderActionType === "COD_TO_PREPAID" ? "2px solid #047857" : "1px solid #cbd5e1",
                      background: orderActionType === "COD_TO_PREPAID" ? "#ecfdf5" : "white",
                      color: orderActionType === "COD_TO_PREPAID" ? "#047857" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    ⚡ COD to Prepaid
                  </button>

                  <button
                    onClick={() => setOrderActionType("DISPATCH_TRACKING")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: orderActionType === "DISPATCH_TRACKING" ? "2px solid #047857" : "1px solid #cbd5e1",
                      background: orderActionType === "DISPATCH_TRACKING" ? "#ecfdf5" : "white",
                      color: orderActionType === "DISPATCH_TRACKING" ? "#047857" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    🚚 Dispatch Tracking
                  </button>

                  <button
                    onClick={() => setOrderActionType("DELIVERED")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: orderActionType === "DELIVERED" ? "2px solid #047857" : "1px solid #cbd5e1",
                      background: orderActionType === "DELIVERED" ? "#ecfdf5" : "white",
                      color: orderActionType === "DELIVERED" ? "#047857" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    🎁 Delivered & Review
                  </button>
                </div>
              </div>

              {/* Extra Inputs for COD to Prepaid */}
              {orderActionType === "COD_TO_PREPAID" && (
                <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "10px", border: "1px solid #fde68a", marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>
                    Instant Prepaid Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={codDiscountPct}
                    onChange={(e) => setCodDiscountPct(parseInt(e.target.value) || 0)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                  <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px" }}>
                    Customer pays: ₹{(selectedOrderForAction.totalPrice - Math.round((selectedOrderForAction.totalPrice * codDiscountPct) / 100)).toLocaleString("en-IN")} (Saves ₹{Math.round((selectedOrderForAction.totalPrice * codDiscountPct) / 100)})
                  </div>
                </div>
              )}

              {/* Extra Inputs for Tracking */}
              {orderActionType === "DISPATCH_TRACKING" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      AWB / Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14209384758"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhivery, Bluedart, Shiprocket"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSendOrderWhatsApp}
                disabled={sendingOrderAction}
                style={{
                  width: "100%",
                  background: sendingOrderAction ? "#94a3b8" : "#047857",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: sendingOrderAction ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
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
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }} onClick={() => setSelectedCheckoutForNudge(null)}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            maxWidth: "480px",
            width: "100%",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "white",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px" }}>
                <ShoppingCart size={18} /> Recover Cart for {selectedCheckoutForNudge.customerName}
              </div>
              <button onClick={() => setSelectedCheckoutForNudge(null)} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "14px" }}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Cart Value:</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  ₹{selectedCheckoutForNudge.totalPrice.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "4px" }}>
                  Recipient: +{selectedCheckoutForNudge.customerPhone}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#475569", marginBottom: "5px" }}>
                  Incentive Coupon Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SAVE10 or FLAT15"
                  value={nudgeDiscountCode}
                  onChange={(e) => setNudgeDiscountCode(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <button
                onClick={handleSendAbandonedNudge}
                disabled={sendingNudge}
                style={{
                  width: "100%",
                  background: sendingNudge ? "#94a3b8" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: sendingNudge ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
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
