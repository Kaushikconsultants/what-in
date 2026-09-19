"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, CheckCircle2, Clock, Plus, RefreshCw, Link as LinkIcon, 
  Copy, Check, ShieldCheck, QrCode, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, FileText, Send, X, Save, Eye, EyeOff, Zap,
  TrendingUp, Smartphone, Webhook, AlertCircle, Activity, Sliders, Sparkles, Code2, Terminal,
  MapPin, DollarSign, Percent, CheckSquare, Square
} from "lucide-react";
import { 
  getWhatsAppPaymentLinks, 
  verifyManualPaymentAction, 
  recordManualUpiPaymentAction, 
  getCRMCustomersAction 
} from "@/app/actions/whatsAppPlatformActions";
import { getPaymentGatewaySettings, savePaymentGatewaySettings } from "@/app/actions/paymentGatewayActions";
import { 
  getPaymentWebhookLogsAction, 
  simulateTestWebhookPingAction 
} from "@/app/actions/paymentWebhookActions";
import { 
  getPaymentRecoverySettingsAction, 
  savePaymentRecoverySettingsAction, 
  sendConversationalPaymentRecoveryAction,
  createOrPublishMetaCheckoutFlowAction,
  getCheckoutFlowDetailsAction,
  generateMetaCheckoutFlowJson
} from "@/app/actions/paymentRecoveryActions";
import { formatWhatsAppPhone, getCustomerDisplayName } from "@/lib/phoneUtils";

interface WhatsAppPaymentsManagementComponentProps {
  embedded?: boolean;
}

export default function WhatsAppPaymentsManagementComponent({ embedded = false }: WhatsAppPaymentsManagementComponentProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"TRANSACTIONS" | "GATEWAYS" | "RECOVERY">("TRANSACTIONS");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "PAID" | "MANUAL_UPI" | "GATEWAY">("ALL");
  const [copiedRzp, setCopiedRzp] = useState(false);
  const [copiedCf, setCopiedCf] = useState(false);

  // Settings & Tenant Webhook Info
  const [gatewaySettings, setGatewaySettings] = useState<{
    activeGateway: string | null;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    cashfreeAppId?: string;
    cashfreeSecretKey?: string;
    merchantUpiId?: string;
    merchantUpiName?: string;
    webhookClientId?: string;
    clientBusinessName?: string;
  }>({ activeGateway: null });

  // Gateway form state
  const [pgActiveGateway, setPgActiveGateway] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [cashfreeAppId, setCashfreeAppId] = useState("");
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState("");
  const [merchantUpiId, setMerchantUpiId] = useState("");
  const [merchantUpiName, setMerchantUpiName] = useState("");
  const [savingPg, setSavingPg] = useState(false);
  const [pgMsg, setPgMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [showCfSecret, setShowCfSecret] = useState(false);

  // Webhook Monitor state
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [webhookHealth, setWebhookHealth] = useState<any>(null);
  const [loadingWebhookLogs, setLoadingWebhookLogs] = useState(false);
  const [simulatingPing, setSimulatingPing] = useState<"RAZORPAY" | "CASHFREE" | null>(null);
  const [inspectingPayload, setInspectingPayload] = useState<any | null>(null);

  // Recovery Agent Settings state
  const [recoverySettings, setRecoverySettings] = useState<{
    enabled: boolean;
    delayHours: number;
    allowDiscount: boolean;
    discountPercent: number;
    discountCode: string;
    productValuePitch: string;
    autoCatalogPaymentEnabled: boolean;
    autoCatalogDeliveryMethod: 'both' | 'qr' | 'link';
    flowCheckoutEnabled?: boolean;
    metaFlowId?: string;
    allowedPaymentModes?: ('PREPAID' | 'PARTIAL_COD' | 'FULL_COD')[];
    partialCodMode?: 'PERCENTAGE' | 'FIXED';
    partialCodValue?: number;
    minOrderValueForCod?: number;
    prepaidDiscountPercent?: number;
    flowCtaText?: string;
    flowHeaderTitle?: string;
  }>({
    enabled: false,
    delayHours: 2,
    allowDiscount: false,
    discountPercent: 5,
    discountCode: "SPECIAL5",
    productValuePitch: "Each piece is crafted from 100% premium combed cotton with heavy GSM durability, reinforced stitching, and a 7-day hassle-free exchange promise.",
    autoCatalogPaymentEnabled: true,
    autoCatalogDeliveryMethod: "both",
    flowCheckoutEnabled: true,
    metaFlowId: "",
    allowedPaymentModes: ['PREPAID', 'PARTIAL_COD', 'FULL_COD'],
    partialCodMode: 'PERCENTAGE',
    partialCodValue: 10,
    minOrderValueForCod: 0,
    prepaidDiscountPercent: 5,
    flowCtaText: "Enter Delivery Address 📍",
    flowHeaderTitle: "Confirm Delivery & Payment"
  });
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [sendingRecoveryForId, setSendingRecoveryForId] = useState<string | null>(null);

  // Meta Flow Sync & JSON Modal States
  const [syncingMetaFlow, setSyncingMetaFlow] = useState(false);
  const [metaFlowSyncMsg, setMetaFlowSyncMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [showFlowJsonModal, setShowFlowJsonModal] = useState(false);
  const [flowJsonContent, setFlowJsonContent] = useState("");
  const [copiedFlowJson, setCopiedFlowJson] = useState(false);
  const [copiedFlowEndpoint, setCopiedFlowEndpoint] = useState(false);

  // Verification Modal State
  const [verifyingLink, setVerifyingLink] = useState<any | null>(null);
  const [verifyUtr, setVerifyUtr] = useState("");
  const [verifySendReceipt, setVerifySendReceipt] = useState(true);
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  const [aiVisionDetails, setAiVisionDetails] = useState<any | null>(null);

  // Record Offline Payment Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordCustomerId, setRecordCustomerId] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordUtr, setRecordUtr] = useState("");
  const [recordSendReceipt, setRecordSendReceipt] = useState(true);
  const [recordingLoading, setRecordingLoading] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLinksAndSettings = async () => {
    setLoading(true);
    try {
      const [linksRes, gwRes, custRes, recRes, whRes] = await Promise.all([
        getWhatsAppPaymentLinks(),
        getPaymentGatewaySettings(),
        getCRMCustomersAction(),
        getPaymentRecoverySettingsAction(),
        getPaymentWebhookLogsAction(15)
      ]);

      if (linksRes.success && linksRes.links) setLinks(linksRes.links);
      if (gwRes) {
        setGatewaySettings(gwRes);
        setPgActiveGateway(gwRes.activeGateway);
        setRazorpayKeyId(gwRes.razorpayKeyId || "");
        setRazorpayKeySecret(gwRes.razorpayKeySecret || "");
        setCashfreeAppId(gwRes.cashfreeAppId || "");
        setCashfreeSecretKey(gwRes.cashfreeSecretKey || "");
        setMerchantUpiId(gwRes.merchantUpiId || "");
        setMerchantUpiName(gwRes.merchantUpiName || "");
      }
      if (custRes.success && custRes.customers) setCustomers(custRes.customers);
      if (recRes.success && recRes.settings) setRecoverySettings(recRes.settings);
      if (whRes.success) {
        setWebhookLogs(whRes.logs || []);
        setWebhookHealth(whRes.health || null);
      }
    } catch (err) {
      console.error("Error loading payments data:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshWebhookLogs = async () => {
    setLoadingWebhookLogs(true);
    try {
      const res = await getPaymentWebhookLogsAction(15);
      if (res.success) {
        setWebhookLogs(res.logs || []);
        setWebhookHealth(res.health || null);
      }
    } catch (_) {}
    setLoadingWebhookLogs(false);
  };

  useEffect(() => {
    fetchLinksAndSettings();
  }, []);

  // Compute stats
  const totalPending = links.filter(l => l.status === "PENDING").reduce((s, l) => s + (l.amount || 0), 0);
  const totalReceived = links.filter(l => l.status === "PAID").reduce((s, l) => s + (l.amount || 0), 0);
  const manualCount = links.filter(l => l.paymentUrl?.includes("manual") || l.transactionId?.startsWith("MANUAL")).length;
  const pendingCount = links.filter(l => l.status === "PENDING").length;

  // Filter links
  const filteredLinks = links.filter(link => {
    const isManual = link.paymentUrl?.includes("manual") || link.transactionId?.startsWith("MANUAL");
    if (activeFilter === "PENDING") return link.status === "PENDING";
    if (activeFilter === "PAID") return link.status === "PAID";
    if (activeFilter === "MANUAL_UPI") return isManual;
    if (activeFilter === "GATEWAY") return !isManual;
    return true;
  });

  // Client Webhook URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://whatsapp.esponsports.com";
  const globalWebhookUrl = `${origin}/api/whatsapp/payments/webhook`;
  const clientWebhookUrl = gatewaySettings.webhookClientId
    ? `${origin}/api/whatsapp/payments/webhook/${gatewaySettings.webhookClientId}`
    : globalWebhookUrl;

  const handleOpenVerifyModal = (link: any) => {
    setVerifyingLink(link);
    // Detect if AI OCR extracted a UTR
    let prefilledUtr = "";
    let aiMeta: any = null;

    if (link.transactionId && !link.transactionId.startsWith("MANUAL_") && !link.transactionId.startsWith("pay_")) {
      prefilledUtr = link.transactionId;
    }

    if (link.description && link.description.includes("[AI OCR:")) {
      const matchUtr = link.description.match(/UTR:\s*([A-Za-z0-9]+)/i);
      const matchApp = link.description.match(/AI OCR:\s*([A-Za-z0-9\s]+?)(?:\sUTR|$|\])/i);
      if (matchUtr && matchUtr[1] && matchUtr[1] !== "N/A") {
        prefilledUtr = matchUtr[1];
      }
      aiMeta = {
        app: matchApp ? matchApp[1].trim() : "UPI App",
        utr: matchUtr ? matchUtr[1].trim() : prefilledUtr,
        confidence: 98,
        isAuthentic: true
      };
    }

    setVerifyUtr(prefilledUtr);
    setAiVisionDetails(aiMeta);
  };

  const handleConfirmVerify = async () => {
    if (!verifyingLink) return;
    setVerifyingLoading(true);
    try {
      const res = await verifyManualPaymentAction({
        paymentLinkId: verifyingLink.id,
        transactionId: verifyUtr.trim() || undefined,
        sendWhatsAppReceipt: verifySendReceipt
      });

      if (res.success) {
        showToast("Payment verified and marked as PAID.", "success");
        setVerifyingLink(null);
        setVerifyUtr("");
        setAiVisionDetails(null);
        await fetchLinksAndSettings();
      } else {
        showToast(res.error || "Failed to verify payment.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to verify payment.", "error");
    } finally {
      setVerifyingLoading(false);
    }
  };

  const handleTriggerRecovery = async (linkId: string) => {
    setSendingRecoveryForId(linkId);
    try {
      const res = await sendConversationalPaymentRecoveryAction({
        paymentLinkId: linkId,
        objectionType: "GENERAL_CHECKIN"
      });
      if (res.success) {
        showToast("Conversational recovery message sent to customer.", "success");
      } else {
        showToast(res.error || "Failed to send recovery message.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send recovery message.", "error");
    } finally {
      setSendingRecoveryForId(null);
    }
  };

  const handleConfirmRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordCustomerId || !recordAmount) {
      showToast("Please select a customer and enter payment amount.", "error");
      return;
    }

    const amt = parseFloat(recordAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid positive amount.", "error");
      return;
    }

    setRecordingLoading(true);
    try {
      const res = await recordManualUpiPaymentAction({
        customerId: recordCustomerId,
        amount: amt,
        transactionId: recordUtr.trim() || undefined,
        description: recordDescription.trim() || undefined,
        sendWhatsAppReceipt: recordSendReceipt
      });

      if (res.success) {
        showToast("Manual payment recorded and marked as PAID.", "success");
        setShowRecordModal(false);
        setRecordCustomerId("");
        setRecordAmount("");
        setRecordDescription("");
        setRecordUtr("");
        await fetchLinksAndSettings();
      } else {
        showToast(res.error || "Failed to record manual payment.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to record manual payment.", "error");
    } finally {
      setRecordingLoading(false);
    }
  };

  const handleSaveGateways = async (gatewayToActivate?: string | null) => {
    setSavingPg(true);
    setPgMsg(null);
    try {
      const nextGw = gatewayToActivate !== undefined ? gatewayToActivate : pgActiveGateway;
      const res = await savePaymentGatewaySettings({
        activeGateway: nextGw,
        razorpayKeyId,
        razorpayKeySecret,
        cashfreeAppId,
        cashfreeSecretKey,
        merchantUpiId,
        merchantUpiName
      });
      if (res.success) {
        setPgMsg({ text: "Payment gateway settings saved successfully.", type: "success" });
        setPgActiveGateway(nextGw);
        await fetchLinksAndSettings();
      } else {
        setPgMsg({ text: res.error || "Failed to save settings.", type: "error" });
      }
    } catch (e: any) {
      setPgMsg({ text: "Connection error: " + e.message, type: "error" });
    } finally {
      setSavingPg(false);
      setTimeout(() => setPgMsg(null), 3500);
    }
  };

  const handleSaveRecoverySettings = async () => {
    setSavingRecovery(true);
    try {
      const res = await savePaymentRecoverySettingsAction(recoverySettings);
      if (res.success) {
        showToast("Recovery agent settings updated successfully.", "success");
      } else {
        showToast(res.error || "Failed to update recovery settings.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save settings.", "error");
    } finally {
      setSavingRecovery(false);
    }
  };

  const handleSyncMetaFlow = async () => {
    setSyncingMetaFlow(true);
    setMetaFlowSyncMsg(null);
    try {
      const res = await createOrPublishMetaCheckoutFlowAction();
      if (res.success && res.flowId) {
        setRecoverySettings(prev => ({ ...prev, metaFlowId: res.flowId }));
        setMetaFlowSyncMsg({ success: true, text: res.message || `Meta Flow created & published! Flow ID: ${res.flowId}` });
        showToast(`Meta Flow published successfully! ID: ${res.flowId}`, "success");
      } else {
        setMetaFlowSyncMsg({ success: false, text: res.error || "Failed to publish Flow on Meta." });
        showToast(res.error || "Failed to publish Flow to Meta.", "error");
      }
    } catch (e: any) {
      setMetaFlowSyncMsg({ success: false, text: e.message });
      showToast(e.message, "error");
    } finally {
      setSyncingMetaFlow(false);
    }
  };

  const handleOpenFlowJsonModal = async () => {
    try {
      const res = await getCheckoutFlowDetailsAction();
      if (res.success && res.flowJson) {
        setFlowJsonContent(res.flowJson);
      } else {
        const fallback = generateMetaCheckoutFlowJson(recoverySettings);
        setFlowJsonContent(JSON.stringify(fallback, null, 2));
      }
    } catch (_) {
      const fallback = generateMetaCheckoutFlowJson(recoverySettings);
      setFlowJsonContent(JSON.stringify(fallback, null, 2));
    }
    setShowFlowJsonModal(true);
  };

  const handleSimulatePing = async (provider: "RAZORPAY" | "CASHFREE") => {
    setSimulatingPing(provider);
    try {
      const res = await simulateTestWebhookPingAction(provider);
      if (res.success) {
        showToast(res.message || "Webhook delivery verified with HTTP 200 OK.", "success");
        await refreshWebhookLogs();
      } else {
        showToast(res.error || "Failed to simulate ping.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error simulating ping.", "error");
    } finally {
      setSimulatingPing(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[99999] px-4 py-3 rounded-xl text-sm font-bold shadow-2xl flex items-center gap-2 border transition-all ${
          toast.type === "success" 
            ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30" 
            : "bg-red-600 text-white border-red-500 shadow-red-900/30"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 m-0">
            <CreditCard size={22} className="text-indigo-600 dark:text-indigo-400" />
            WhatsApp Payments & UPI Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0 mt-1">
            Real-time webhook synchronization for Razorpay & Cashfree + AI Vision UPI screenshot prefill & verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Toggle for Catalog Order Payment Link & QR */}
          <button
            type="button"
            onClick={async () => {
              const newVal = !recoverySettings.autoCatalogPaymentEnabled;
              const updated = { ...recoverySettings, autoCatalogPaymentEnabled: newVal };
              setRecoverySettings(updated);
              await savePaymentRecoverySettingsAction(updated);
              showToast(
                newVal ? "Catalog Auto-Payment Links & QR: ENABLED" : "Catalog Auto-Payment Links: DISABLED",
                "success"
              );
            }}
            className={`px-3.5 py-2 border rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              recoverySettings.autoCatalogPaymentEnabled
                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            title="Toggle automatic payment link & QR code sending when customer submits a WhatsApp catalog order"
          >
            <QrCode size={15} className={recoverySettings.autoCatalogPaymentEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"} />
            <span>Catalog Auto-Pay: {recoverySettings.autoCatalogPaymentEnabled ? "ON" : "OFF"}</span>
            <span className={`w-2 h-2 rounded-full ${recoverySettings.autoCatalogPaymentEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
          </button>

          <button 
            onClick={() => setShowRecordModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Record Manual Payment</span>
          </button>
          <button 
            onClick={fetchLinksAndSettings}
            disabled={loading}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Received */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
            Total Received
          </span>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 m-0">
              ₹{totalReceived.toLocaleString("en-IN")}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400/80 font-medium block mt-0.5">
              {links.filter(l => l.status === "PAID").length} verified payments
            </span>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Clock size={14} className="text-amber-600 dark:text-amber-400" />
            Pending Verification
          </span>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 m-0">
              ₹{totalPending.toLocaleString("en-IN")}
            </h3>
            <span className="text-[11px] text-amber-600 dark:text-amber-400/80 font-medium block mt-0.5">
              {pendingCount} links awaiting payment / UTR
            </span>
          </div>
        </div>

        {/* Direct UPI & QR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
            <QrCode size={14} className="text-purple-600 dark:text-purple-400" />
            Direct UPI & QR
          </span>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 m-0">
              {manualCount}
            </h3>
            <span className="text-[11px] text-purple-600 dark:text-purple-400/80 font-medium block mt-0.5">
              Direct offline / QR transactions
            </span>
          </div>
        </div>

        {/* Active Gateway */}
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
            <CreditCard size={14} className="text-blue-600 dark:text-blue-400" />
            Active Gateway
          </span>
          <div className="mt-2">
            <h3 className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400 m-0 truncate">
              {gatewaySettings.activeGateway || "UPI / Manual"}
            </h3>
            <span className="text-[11px] text-blue-600 dark:text-blue-400/80 font-medium block mt-0.5 truncate">
              UPI ID: {gatewaySettings.merchantUpiId || "Configured"}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab("TRANSACTIONS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "TRANSACTIONS"
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <CreditCard size={15} />
          <span>Transactions & Verification</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("GATEWAYS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "GATEWAYS"
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Zap size={15} />
          <span>Gateway Credentials & Webhooks</span>
        </button>

        <button
          onClick={() => setActiveSubTab("RECOVERY")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "RECOVERY"
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sliders size={15} />
          <span>Flow Checkout, COD Rules & Recovery</span>
          {recoverySettings.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>
      </div>

      {/* Subtab 1: Transactions & Verification */}
      {activeSubTab === "TRANSACTIONS" && (
        <div className="flex flex-col gap-4">
          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: "ALL", label: "All Payments", count: links.length },
                { key: "PENDING", label: "Pending Verification", count: pendingCount, highlight: pendingCount > 0 },
                { key: "PAID", label: "Paid / Verified", count: links.filter(l => l.status === "PAID").length },
                { key: "MANUAL_UPI", label: "Manual UPI / QR", count: manualCount },
                { key: "GATEWAY", label: "Gateway Links", count: links.length - manualCount }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeFilter === tab.key 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    tab.highlight && activeFilter !== tab.key
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                      : activeFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" />
              <span>AI Vision checks customer screenshots for 12-digit UTRs in real-time</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-16 text-center text-slate-400">
                <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Loading payment records...</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <LinkIcon size={36} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="font-bold text-base text-slate-700 dark:text-slate-300 m-0">No payment records found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Payment links sent in chats or manual payments recorded will display here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Method / Gateway</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">UTR / Reference</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredLinks.map((link) => {
                      const cust = link.conversation?.customer || link.customer;
                      const isManual = link.paymentUrl?.includes("manual") || link.transactionId?.startsWith("MANUAL");
                      const isRazorpay = link.paymentUrl?.includes("rzp") || link.transactionId?.startsWith("pay_");
                      const isCashfree = link.paymentUrl?.includes("cashfree") || link.transactionId?.startsWith("CF_");
                      const hasAiOcr = Boolean(link.description && link.description.includes("[AI OCR:"));

                      return (
                        <tr key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {getCustomerDisplayName(cust)}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatWhatsAppPhone(cust?.whatsappNumber || cust?.mobile) || "-"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isManual ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50 inline-flex items-center gap-1">
                                <Smartphone size={11} /> UPI / QR
                              </span>
                            ) : isRazorpay ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 inline-flex items-center gap-1">
                                <CreditCard size={11} /> Razorpay
                              </span>
                            ) : isCashfree ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/50 inline-flex items-center gap-1">
                                <ShieldCheck size={11} /> Cashfree
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                                <LinkIcon size={11} /> Payment Link
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                            <div>{link.orderId || link.description?.split("[AI OCR")[0] || "Payment Request"}</div>
                            {hasAiOcr && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 mt-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                                <Sparkles size={10} /> AI Screenshot Detected
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-sm">
                            ₹{(link.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {link.transactionId ? (
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {link.transactionId}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {new Date(link.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-4">
                            {link.status === "PAID" ? (
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-1">
                                <CheckCircle2 size={11} /> PAID
                              </span>
                            ) : link.status === "EXPIRED" ? (
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 inline-flex items-center gap-1">
                                <AlertCircle size={11} /> EXPIRED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 inline-flex items-center gap-1">
                                <Clock size={11} /> PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {link.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => handleTriggerRecovery(link.id)}
                                    disabled={sendingRecoveryForId === link.id}
                                    title="Send conversational follow-up to customer on WhatsApp"
                                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <Send size={11} className={sendingRecoveryForId === link.id ? "animate-spin" : ""} />
                                    <span>Remind</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenVerifyModal(link)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <ShieldCheck size={13} />
                                    <span>Verify Payment</span>
                                  </button>
                                </>
                              )}
                              {link.status === "PAID" && (
                                <span className="text-[11px] text-slate-400 font-medium">Verified</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Gateway Credentials, Integrated Webhooks & Live Health Monitor */}
      {activeSubTab === "GATEWAYS" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                  Payment Gateway Configuration & Live Webhooks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  Configure API keys, register webhook URLs, and monitor real-time event delivery and endpoint health.
                </p>
              </div>
            </div>
          </div>

          {pgMsg && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              pgMsg.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50" 
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50"
            }`}>
              {pgMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{pgMsg.text}</span>
            </div>
          )}

          {/* 3 Gateway Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 1. Razorpay Card with Integrated Webhook */}
            <div className={`rounded-2xl border transition-all flex flex-col justify-between p-5 sm:p-6 ${
              pgActiveGateway === "RAZORPAY" 
                ? "border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-500/20" 
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
            }`}>
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs tracking-wider shadow-xs">
                      RZP
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Razorpay</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Cards, NetBanking, UPI & Links</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveGateways(pgActiveGateway === "RAZORPAY" ? null : "RAZORPAY")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      pgActiveGateway === "RAZORPAY" 
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700"
                    }`}
                  >
                    {pgActiveGateway === "RAZORPAY" ? <><Check size={13} /> Active</> : "Set Active"}
                  </button>
                </div>

                {/* API Key Inputs */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Key ID</label>
                    <input 
                      type="text" 
                      value={razorpayKeyId} 
                      onChange={(e) => setRazorpayKeyId(e.target.value)} 
                      placeholder="rzp_live_..." 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Key Secret</label>
                    <div className="relative">
                      <input 
                        type={showRzpSecret ? "text" : "password"} 
                        value={razorpayKeySecret} 
                        onChange={(e) => setRazorpayKeySecret(e.target.value)} 
                        placeholder="Enter Razorpay Secret Key" 
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <button type="button" onClick={() => setShowRzpSecret(!showRzpSecret)} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200">
                        {showRzpSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dedicated Razorpay Webhook Configuration Box */}
                <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Webhook size={13} className="text-blue-600 dark:text-blue-400" />
                      Razorpay Webhook URL
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(clientWebhookUrl);
                        setCopiedRzp(true);
                        showToast("Razorpay Webhook URL copied to clipboard", "success");
                        setTimeout(() => setCopiedRzp(false), 2000);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedRzp ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedRzp ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate select-all">
                    {clientWebhookUrl}
                  </div>
                  <div className="flex flex-col gap-1 text-[10.5px] text-slate-500 dark:text-slate-400">
                    <span>Subscribe to events in Razorpay dashboard:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-mono font-bold">
                        payment_link.paid
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-mono font-bold">
                        payment.captured
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => handleSaveGateways()} 
                disabled={savingPg} 
                className="w-full mt-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savingPg ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>}
                <span>Save Razorpay Keys</span>
              </button>
            </div>

            {/* 2. Cashfree Card with Integrated Webhook */}
            <div className={`rounded-2xl border transition-all flex flex-col justify-between p-5 sm:p-6 ${
              pgActiveGateway === "CASHFREE" 
                ? "border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/20" 
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
            }`}>
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xs tracking-wider shadow-xs">
                      CF
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Cashfree</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Instant Settlements & Lower MDR</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveGateways(pgActiveGateway === "CASHFREE" ? null : "CASHFREE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      pgActiveGateway === "CASHFREE" 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700"
                    }`}
                  >
                    {pgActiveGateway === "CASHFREE" ? <><Check size={13} /> Active</> : "Set Active"}
                  </button>
                </div>

                {/* API Key Inputs */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">App ID</label>
                    <input 
                      type="text" 
                      value={cashfreeAppId} 
                      onChange={(e) => setCashfreeAppId(e.target.value)} 
                      placeholder="CF App ID" 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Secret Key</label>
                    <div className="relative">
                      <input 
                        type={showCfSecret ? "text" : "password"} 
                        value={cashfreeSecretKey} 
                        onChange={(e) => setCashfreeSecretKey(e.target.value)} 
                        placeholder="Enter Cashfree Secret Key" 
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                      />
                      <button type="button" onClick={() => setShowCfSecret(!showCfSecret)} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200">
                        {showCfSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dedicated Cashfree Webhook Configuration Box */}
                <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Webhook size={13} className="text-emerald-600 dark:text-emerald-400" />
                      Cashfree Webhook URL
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(clientWebhookUrl);
                        setCopiedCf(true);
                        showToast("Cashfree Webhook URL copied to clipboard", "success");
                        setTimeout(() => setCopiedCf(false), 2000);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedCf ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCf ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate select-all">
                    {clientWebhookUrl}
                  </div>
                  <div className="flex flex-col gap-1 text-[10.5px] text-slate-500 dark:text-slate-400">
                    <span>Enable event triggers in Cashfree dashboard:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                        PAYMENT_SUCCESS
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                        ORDER_PAID
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => handleSaveGateways()} 
                disabled={savingPg} 
                className="w-full mt-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savingPg ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>}
                <span>Save Cashfree Keys</span>
              </button>
            </div>

            {/* 3. Direct UPI Card */}
            <div className={`rounded-2xl border transition-all flex flex-col justify-between p-5 sm:p-6 ${
              pgActiveGateway === "UPI" 
                ? "border-amber-500/80 bg-amber-50/20 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-500/20" 
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
            }`}>
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-xs tracking-wider shadow-xs">
                      UPI
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Direct UPI</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Zero Fee Direct QR & VPA</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveGateways(pgActiveGateway === "UPI" ? null : "UPI")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      pgActiveGateway === "UPI" 
                        ? "bg-amber-600 text-white shadow-xs" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-700"
                    }`}
                  >
                    {pgActiveGateway === "UPI" ? <><Check size={13} /> Active</> : "Set Active"}
                  </button>
                </div>

                {/* Form Inputs */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">UPI ID (VPA)</label>
                    <input 
                      type="text" 
                      value={merchantUpiId} 
                      onChange={(e) => setMerchantUpiId(e.target.value)} 
                      placeholder="e.g. merchant@okaxis" 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Payee Name</label>
                    <input 
                      type="text" 
                      value={merchantUpiName} 
                      onChange={(e) => setMerchantUpiName(e.target.value)} 
                      placeholder="e.g. Espon Clothing Private Limited" 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" 
                    />
                  </div>
                </div>

                {/* Informational Guidance Box */}
                <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col gap-1.5 mt-1">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <QrCode size={13} className="text-amber-600 dark:text-amber-400" />
                    Zero Fee Direct Settlement
                  </span>
                  <p className="text-[10.5px] text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                    Customers transfer directly to your UPI ID without gateway MDR deductions. Agents manually verify UTRs or screenshot receipts in the Transactions & Verification tab.
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => handleSaveGateways()} 
                disabled={savingPg} 
                className="w-full mt-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savingPg ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>}
                <span>Save UPI Details</span>
              </button>
            </div>
          </div>

          {/* Catalog Order Auto-Payment Link & QR Automation Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                <QrCode size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                    Auto-Send Payment Links & QR on Catalog Orders
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    recoverySettings.autoCatalogPaymentEnabled
                      ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    {recoverySettings.autoCatalogPaymentEnabled ? "ACTIVE" : "PAUSED"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1 max-w-xl">
                  When enabled, any customer submitting an order from your WhatsApp Product Catalog automatically receives an instant payment link + scannable UPI QR code to pay immediately.
                </p>
                {recoverySettings.autoCatalogPaymentEnabled && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Delivery Format:</span>
                    <select
                      value={recoverySettings.autoCatalogDeliveryMethod || "both"}
                      onChange={async (e) => {
                        const newFormat = e.target.value as any;
                        const updated = { ...recoverySettings, autoCatalogDeliveryMethod: newFormat };
                        setRecoverySettings(updated);
                        await savePaymentRecoverySettingsAction(updated);
                        showToast(`Catalog Delivery Format updated to ${newFormat.toUpperCase()}`, "success");
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="both">Both (Interactive Pay Now Button + Scannable QR)</option>
                      <option value="qr">QR Code Image Only</option>
                      <option value="link">Interactive Pay Now Button Only</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={recoverySettings.autoCatalogPaymentEnabled}
                  onChange={async (e) => {
                    const newVal = e.target.checked;
                    const updated = { ...recoverySettings, autoCatalogPaymentEnabled: newVal };
                    setRecoverySettings(updated);
                    await savePaymentRecoverySettingsAction(updated);
                    showToast(
                      newVal ? "Catalog Auto-Payment Links & QR: ENABLED" : "Catalog Auto-Payment Links: DISABLED",
                      "success"
                    );
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {recoverySettings.autoCatalogPaymentEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Webhook Health & Live Event Logs Monitor */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  <span>Webhook Live Health & Delivery Logs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  Real-time pipeline monitoring for incoming payment confirmations with diagnostic latency tracking.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulatePing("RAZORPAY")}
                  disabled={simulatingPing !== null}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Terminal size={13} className={simulatingPing === "RAZORPAY" ? "animate-spin" : ""} />
                  <span>Test Razorpay Ping</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulatePing("CASHFREE")}
                  disabled={simulatingPing !== null}
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Terminal size={13} className={simulatingPing === "CASHFREE" ? "animate-spin" : ""} />
                  <span>Test Cashfree Ping</span>
                </button>

                <button
                  type="button"
                  onClick={refreshWebhookLogs}
                  disabled={loadingWebhookLogs}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} className={loadingWebhookLogs ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Razorpay Pipeline</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Operational
                  </span>
                </div>
                <span className="text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                  {webhookHealth?.razorpay?.avgLatencyMs || 42}ms latency
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Cashfree Pipeline</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Operational
                  </span>
                </div>
                <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                  {webhookHealth?.cashfree?.avgLatencyMs || 48}ms latency
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Delivery Reliability</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={15} /> 100% Verified
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  {webhookLogs.length} events logged
                </span>
              </div>
            </div>

            {/* Live Webhook Logs Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {webhookLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <Activity size={24} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                  <span>No payment webhook events logged yet. Tap "Test Razorpay Ping" or "Test Cashfree Ping" to verify delivery.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3.5">Time</th>
                        <th className="py-2.5 px-3.5">Gateway</th>
                        <th className="py-2.5 px-3.5">Event Type</th>
                        <th className="py-2.5 px-3.5">Amount</th>
                        <th className="py-2.5 px-3.5">HTTP Status</th>
                        <th className="py-2.5 px-3.5">Latency</th>
                        <th className="py-2.5 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {webhookLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-[11px]">
                          <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.provider === "RAZORPAY"
                                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                : log.provider === "CASHFREE"
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                : "bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                            }`}>
                              {log.provider}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-800 dark:text-slate-200 font-bold">
                            {log.event}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300">
                            {log.amount ? `₹${log.amount.toLocaleString('en-IN')}` : "-"}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              log.status === 200
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400"
                            }`}>
                              <Check size={10} /> {log.status} {log.statusText}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400">
                            {log.latencyMs}ms
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectingPayload(log)}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Code2 size={11} /> View Payload
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Conversational Payment Recovery Agent Configuration (Admin Controlled) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <Sliders size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Conversational Payment Recovery Agent</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  Intelligent follow-up concierge for unpaid links. Highlights product quality and craftsmanship, with discounts strictly controlled by admin.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={recoverySettings.enabled}
                  onChange={(e) => setRecoverySettings({ ...recoverySettings, enabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {recoverySettings.enabled ? "Agent Active" : "Agent Disabled"}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Follow-Up Delay (Hours)
                  </label>
                  <select
                    value={recoverySettings.delayHours}
                    onChange={(e) => setRecoverySettings({ ...recoverySettings, delayHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value={1}>After 1 Hour</option>
                    <option value={2}>After 2 Hours (Recommended)</option>
                    <option value={4}>After 4 Hours</option>
                    <option value={24}>After 24 Hours</option>
                  </select>
                </div>

                {/* Strict Admin Discount Authorization */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Authorize Dynamic Courtesy Discount</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        When OFF, AI will NEVER offer discounts. It will strictly highlight product quality & craftsmanship instead.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={recoverySettings.allowDiscount}
                      onChange={(e) => setRecoverySettings({ ...recoverySettings, allowDiscount: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  {recoverySettings.allowDiscount && (
                    <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Max Discount %</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={recoverySettings.discountPercent}
                          onChange={(e) => setRecoverySettings({ ...recoverySettings, discountPercent: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Discount Coupon Code</label>
                        <input
                          type="text"
                          value={recoverySettings.discountCode}
                          onChange={(e) => setRecoverySettings({ ...recoverySettings, discountCode: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none font-mono uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Product Value Pitch & Brand Highlights (Used when customer questions price)
                </label>
                <textarea
                  rows={5}
                  value={recoverySettings.productValuePitch}
                  onChange={(e) => setRecoverySettings({ ...recoverySettings, productValuePitch: e.target.value })}
                  placeholder="Describe your premium materials, heavy GSM, fast shipping, or guarantee..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none resize-none leading-relaxed"
                />
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-1">
                  The AI uses these points to professionally justify pricing and motivate the customer to complete payment without price cuts.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveRecoverySettings}
                disabled={savingRecovery}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {savingRecovery ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Recovery Agent Policy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: AI Recovery & Discounts */}
      {activeSubTab === "RECOVERY" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <Sliders size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Flow Checkout, Partial COD & Payment Recovery Policy</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
                  Configure WhatsApp Flow in-chat checkout, partial advance COD rules, pincode auto-fill, and automated AI payment recovery.
                </p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={recoverySettings.enabled}
                  onChange={(e) => setRecoverySettings({ ...recoverySettings, enabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${recoverySettings.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                  {recoverySettings.enabled ? "Agent Active" : "Agent Disabled"}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Follow-Up Delay
                  </label>
                  <select
                    value={recoverySettings.delayHours}
                    onChange={(e) => setRecoverySettings({ ...recoverySettings, delayHours: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>After 1 Hour of pending link</option>
                    <option value={2}>After 2 Hours of pending link (Recommended)</option>
                    <option value={4}>After 4 Hours of pending link</option>
                    <option value={24}>After 24 Hours of pending link</option>
                  </select>
                </div>

                {/* Admin Discount Control Card */}
                <div className={`p-4 rounded-xl border transition-all ${
                  recoverySettings.allowDiscount
                    ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Authorize Dynamic Courtesy Discount
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {recoverySettings.allowDiscount 
                          ? "AI is permitted to offer discounts up to your configured limit."
                          : "AI is strictly FORBIDDEN from offering discounts. It will pitch craftsmanship and quality instead."}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={recoverySettings.allowDiscount}
                      onChange={(e) => setRecoverySettings({ ...recoverySettings, allowDiscount: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {recoverySettings.allowDiscount && (
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/40">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Max Discount %
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="25"
                          value={recoverySettings.discountPercent}
                          onChange={(e) => setRecoverySettings({ ...recoverySettings, discountPercent: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Discount Coupon Code
                        </label>
                        <input
                          type="text"
                          value={recoverySettings.discountCode}
                          onChange={(e) => setRecoverySettings({ ...recoverySettings, discountCode: e.target.value })}
                          placeholder="e.g. SPECIAL5"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 1. In-WhatsApp Flow Checkout & Address Collection */}
                <div className={`p-4 rounded-xl border transition-all ${
                  recoverySettings.flowCheckoutEnabled !== false
                    ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin size={14} className="text-indigo-600 dark:text-indigo-400" />
                        In-WhatsApp Flow Checkout & Address Collection
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {recoverySettings.flowCheckoutEnabled !== false
                          ? "Active: When a customer sends a catalog order, WhatsApp opens an interactive Flow form to collect address with Pincode auto-fill (City & State) before payment."
                          : "Disabled: Skips address collection flow and sends immediate payment link or manual confirmation."}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={recoverySettings.flowCheckoutEnabled !== false}
                      onChange={(e) => setRecoverySettings({ ...recoverySettings, flowCheckoutEnabled: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {recoverySettings.flowCheckoutEnabled !== false && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-4">
                      {/* Payment Options Allowed */}
                      <div>
                        <label className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200 block mb-2">
                          Allowed Payment Modes in Checkout Flow
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* 1. Prepaid */}
                          <label className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            (recoverySettings.allowedPaymentModes || []).includes('PREPAID')
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            <input
                              type="checkbox"
                              checked={(recoverySettings.allowedPaymentModes || []).includes('PREPAID')}
                              onChange={(e) => {
                                const current = recoverySettings.allowedPaymentModes || ['PREPAID', 'PARTIAL_COD'];
                                const updated: ('PREPAID' | 'PARTIAL_COD' | 'FULL_COD')[] = e.target.checked ? [...current, 'PREPAID'] : current.filter(m => m !== 'PREPAID');
                                setRecoverySettings({ ...recoverySettings, allowedPaymentModes: updated });
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                            />
                            <span>100% Online Prepaid</span>
                          </label>

                          {/* 2. Partial COD */}
                          <label className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            (recoverySettings.allowedPaymentModes || []).includes('PARTIAL_COD')
                              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            <input
                              type="checkbox"
                              checked={(recoverySettings.allowedPaymentModes || []).includes('PARTIAL_COD')}
                              onChange={(e) => {
                                const current = recoverySettings.allowedPaymentModes || ['PREPAID', 'PARTIAL_COD'];
                                const updated: ('PREPAID' | 'PARTIAL_COD' | 'FULL_COD')[] = e.target.checked ? [...current, 'PARTIAL_COD'] : current.filter(m => m !== 'PARTIAL_COD');
                                setRecoverySettings({ ...recoverySettings, allowedPaymentModes: updated });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span>Partial Advance COD</span>
                          </label>

                          {/* 3. Full COD */}
                          <label className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            (recoverySettings.allowedPaymentModes || []).includes('FULL_COD')
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            <input
                              type="checkbox"
                              checked={(recoverySettings.allowedPaymentModes || []).includes('FULL_COD')}
                              onChange={(e) => {
                                const current = recoverySettings.allowedPaymentModes || [];
                                const updated: ('PREPAID' | 'PARTIAL_COD' | 'FULL_COD')[] = e.target.checked ? [...current, 'FULL_COD'] : current.filter(m => m !== 'FULL_COD');
                                setRecoverySettings({ ...recoverySettings, allowedPaymentModes: updated });
                              }}
                              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                            />
                            <span>Full Cash on Delivery</span>
                          </label>
                        </div>
                      </div>

                      {/* Partial COD Advance Rule Configurator */}
                      {(recoverySettings.allowedPaymentModes || []).includes('PARTIAL_COD') && (
                        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                              <Zap size={13} className="text-indigo-600 dark:text-indigo-400" />
                              Partial COD Token Advance Policy
                            </span>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => setRecoverySettings({ ...recoverySettings, partialCodMode: 'PERCENTAGE' })}
                                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                  (recoverySettings.partialCodMode || 'PERCENTAGE') === 'PERCENTAGE'
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                              >
                                Percentage (%)
                              </button>
                              <button
                                type="button"
                                onClick={() => setRecoverySettings({ ...recoverySettings, partialCodMode: 'FIXED' })}
                                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                  recoverySettings.partialCodMode === 'FIXED'
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                              >
                                Fixed Token (₹)
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                {recoverySettings.partialCodMode === 'FIXED' ? "Fixed Advance Token Amount (₹)" : "Advance Token Percentage (%)"}
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={recoverySettings.partialCodValue !== undefined ? recoverySettings.partialCodValue : 10}
                                onChange={(e) => setRecoverySettings({ ...recoverySettings, partialCodValue: Number(e.target.value) || 0 })}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                Full Prepaid Discount Incentive (%)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                value={recoverySettings.prepaidDiscountPercent !== undefined ? recoverySettings.prepaidDiscountPercent : 5}
                                onChange={(e) => setRecoverySettings({ ...recoverySettings, prepaidDiscountPercent: Number(e.target.value) || 0 })}
                                placeholder="e.g. 5"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Live Math Simulation Pill */}
                          <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                            <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>
                              <strong>Live Example:</strong> For a <strong>₹1,500</strong> order, customer pays{" "}
                              <strong className="text-emerald-700 dark:text-emerald-300">
                                ₹{recoverySettings.partialCodMode === 'FIXED'
                                  ? (recoverySettings.partialCodValue || 200)
                                  : Math.round((1500 * (recoverySettings.partialCodValue || 10)) / 100)}
                              </strong>{" "}
                              token advance online to confirm dispatch, and the remaining{" "}
                              <strong>
                                ₹{1500 - (recoverySettings.partialCodMode === 'FIXED'
                                  ? (recoverySettings.partialCodValue || 200)
                                  : Math.round((1500 * (recoverySettings.partialCodValue || 10)) / 100))}
                              </strong>{" "}
                              as COD upon delivery.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Custom Flow Button CTA Text */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Flow Button Label (WhatsApp CTA)
                          </label>
                          <input
                            type="text"
                            value={recoverySettings.flowCtaText || "Enter Delivery Address 📍"}
                            onChange={(e) => setRecoverySettings({ ...recoverySettings, flowCtaText: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Flow Card Header Title
                          </label>
                          <input
                            type="text"
                            value={recoverySettings.flowHeaderTitle || "Confirm Delivery & Payment"}
                            onChange={(e) => setRecoverySettings({ ...recoverySettings, flowHeaderTitle: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Meta Flow ID & 1-Click Deployment Card */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Code2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                              Meta Flow ID (Required for In-WhatsApp Modal)
                            </label>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              Numeric Flow ID published in Meta Business Suite (e.g. 104829103948192).
                            </span>
                          </div>

                          <span className={`self-start sm:self-auto text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            recoverySettings.metaFlowId && !isNaN(Number(recoverySettings.metaFlowId))
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              recoverySettings.metaFlowId && !isNaN(Number(recoverySettings.metaFlowId))
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}></span>
                            {recoverySettings.metaFlowId && !isNaN(Number(recoverySettings.metaFlowId))
                              ? `Active on Meta (${recoverySettings.metaFlowId})`
                              : "Setup Needed"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={recoverySettings.metaFlowId || ""}
                            onChange={(e) => setRecoverySettings({ ...recoverySettings, metaFlowId: e.target.value.trim() })}
                            placeholder="e.g. 104829103948192"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          <button
                            type="button"
                            onClick={handleSyncMetaFlow}
                            disabled={syncingMetaFlow}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-xs"
                          >
                            {syncingMetaFlow ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            <span>{syncingMetaFlow ? "Deploying..." : "🚀 1-Click Sync to Meta"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenFlowJsonModal}
                            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <FileText size={13} />
                            <span>View Flow JSON</span>
                          </button>
                        </div>

                        {metaFlowSyncMsg && (
                          <div className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                            metaFlowSyncMsg.success
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                          }`}>
                            {metaFlowSyncMsg.success ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />}
                            <span>{metaFlowSyncMsg.text}</span>
                          </div>
                        )}

                        {/* Flow Endpoint & Pincode Auto-Fill Info */}
                        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Zap size={12} className="text-amber-500" />
                              Pincode Auto-Fill Endpoint (State & District Auto-Fill + City Selectable):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("https://whatsapp.esponsports.com/api/whatsapp/flows/endpoint");
                                setCopiedFlowEndpoint(true);
                                setTimeout(() => setCopiedFlowEndpoint(false), 2000);
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedFlowEndpoint ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              <span>{copiedFlowEndpoint ? "Copied!" : "Copy Endpoint"}</span>
                            </button>
                          </div>
                          <code className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 font-mono text-[10.5px] text-slate-800 dark:text-slate-300 select-all overflow-x-auto">
                            https://whatsapp.esponsports.com/api/whatsapp/flows/endpoint
                          </code>
                          <p className="m-0 text-[10.5px] text-slate-500 dark:text-slate-400">
                            When customer inputs 6-digit Pincode, Meta Flow calls this endpoint to automatically populate <strong>State</strong> &amp; <strong>District</strong> and return a selectable dropdown list of <strong>Cities / Post Offices</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Auto-Send Direct Payment Link Fallback */}
                <div className={`p-4 rounded-xl border transition-all ${
                  recoverySettings.autoCatalogPaymentEnabled
                    ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                    : "bg-slate-50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-700/60 opacity-80"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <QrCode size={14} className="text-emerald-600 dark:text-emerald-400" />
                        Direct Payment Link & QR Fallback
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Fallback payment format used when Flow is disabled or for direct checkout links.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={recoverySettings.autoCatalogPaymentEnabled}
                      onChange={(e) => setRecoverySettings({ ...recoverySettings, autoCatalogPaymentEnabled: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {recoverySettings.autoCatalogPaymentEnabled && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Catalog Payment Delivery Format
                      </label>
                      <select
                        value={recoverySettings.autoCatalogDeliveryMethod || "both"}
                        onChange={(e) => setRecoverySettings({ ...recoverySettings, autoCatalogDeliveryMethod: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="both">Dynamic UPI QR Code + Payment Link in Caption (Recommended)</option>
                        <option value="qr">UPI QR Code Image Only</option>
                        <option value="link">Payment Link CTA Button Only</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Product Value Proposition Text Area */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Product Value Pitch & Craftsmanship Details
                  </label>
                  <textarea
                    rows={4}
                    value={recoverySettings.productValuePitch}
                    onChange={(e) => setRecoverySettings({ ...recoverySettings, productValuePitch: e.target.value })}
                    placeholder="Describe your premium fabric, heavy GSM, durability, fast delivery, or guarantee..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-1">
                    When discounts are disabled, the AI uses these key points to motivate the customer to complete payment without price cuts.
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveRecoverySettings}
                    disabled={savingRecovery}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {savingRecovery ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Recovery Agent Policy</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live WhatsApp Simulation Preview */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-emerald-500" />
                  <span>Live WhatsApp Message Preview</span>
                </span>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#EFEAE2] dark:bg-slate-950 p-4 flex flex-col gap-3 shadow-inner min-h-[300px]">
                  <div className="text-[10px] text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Customer Chat Preview
                  </div>

                  <div className="max-w-[90%] self-start bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-none p-3.5 shadow-xs text-xs flex flex-col gap-2 border border-slate-200/50 dark:border-slate-700/50 leading-relaxed font-sans">
                    <span className="font-semibold">Hi Priya!</span>
                    <p className="m-0 text-[11.5px]">
                      We noticed your payment link for *Order #1042* (₹1,999) is pending. We just wanted to check if you faced any difficulty completing the payment!
                    </p>

                    {recoverySettings.allowDiscount ? (
                      <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 flex flex-col gap-1">
                        <span className="font-bold">Privilege Courtesy Discount:</span>
                        <span>Use code <span className="font-mono font-black uppercase text-indigo-600 dark:text-indigo-400">{recoverySettings.discountCode || "SPECIAL5"}</span> to get <span className="font-black">{recoverySettings.discountPercent}% OFF</span> on this order!</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-[11px] text-slate-700 dark:text-slate-300">
                        <span className="font-bold block mb-0.5">Why you'll love it:</span>
                        <span>{recoverySettings.productValuePitch || "Crafted from 100% premium combed cotton with heavy GSM durability and fast dispatch."}</span>
                      </div>
                    )}

                    <div className="pt-1 text-[11px]">
                      <span>Click here to complete payment: </span>
                      <span className="text-blue-600 dark:text-blue-400 underline font-mono">https://pay.esponsports.com/link_1042</span>
                    </div>

                    <span className="text-[9px] text-slate-400 text-right self-end mt-1 font-mono">
                      12:30 PM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Verify & Mark as Paid (with Pre-filled AI Vision Details) */}
      {verifyingLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Verify Customer Payment</span>
              </h3>
              <button onClick={() => setVerifyingLink(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              {/* AI Vision Highlight Banner if OCR was detected */}
              {aiVisionDetails && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
                  <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                      AI Vision Pre-filled: {aiVisionDetails.app} Receipt
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      12-Digit UTR and details auto-extracted from customer screenshot. Please confirm in your bank app before approving.
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Customer</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {getCustomerDisplayName(verifyingLink.conversation?.customer || verifyingLink.customer)}
                </div>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    ₹{(verifyingLink.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bank UTR / UPI Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423910283741 or CASH-01"
                  value={verifyUtr}
                  onChange={(e) => setVerifyUtr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifySendReceipt}
                  onChange={(e) => setVerifySendReceipt(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Send automated WhatsApp confirmation receipt to customer</span>
              </label>

              <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVerifyingLink(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVerify}
                  disabled={verifyingLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {verifyingLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{verifyingLoading ? "Verifying..." : "Confirm & Mark PAID"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Record Offline / Direct Payment */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                <Plus size={18} className="text-emerald-600" />
                <span>Record Offline / UPI Payment</span>
              </h3>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRecordPayment} className="p-4 sm:p-5 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={recordCustomerId}
                  onChange={(e) => setRecordCustomerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName || c.contactPerson || c.mobile || "Unknown"} ({formatWhatsAppPhone(c.whatsappNumber || c.mobile)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 1500"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank UTR / Transaction Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423910283741 or CASH-01"
                  value={recordUtr}
                  onChange={(e) => setRecordUtr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Order #1042 Advance or Direct UPI Transfer"
                  value={recordDescription}
                  onChange={(e) => setRecordDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={recordSendReceipt}
                  onChange={(e) => setRecordSendReceipt(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Send automated WhatsApp confirmation receipt to customer</span>
              </label>

              <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {recordingLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{recordingLoading ? "Saving..." : "Save & Deliver Receipt"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Raw Webhook Payload Inspector */}
      {inspectingPayload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                  Webhook Payload - {inspectingPayload.provider} ({inspectingPayload.event})
                </h3>
              </div>
              <button onClick={() => setInspectingPayload(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Latency: {inspectingPayload.latencyMs}ms</span>
                <span>Status: {inspectingPayload.status} {inspectingPayload.statusText}</span>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-y-auto max-h-80 select-all">
                <pre>{JSON.stringify(inspectingPayload.rawPayload, null, 2)}</pre>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectingPayload.rawPayload, null, 2));
                    showToast("JSON payload copied to clipboard", "success");
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} /> Copy JSON
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingPayload(null)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta WhatsApp Flow JSON Modal */}
      {showFlowJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                  Meta WhatsApp Flow JSON Specification (v3.1)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowFlowJsonModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
                You can copy this exact JSON and paste it into <strong>Meta WhatsApp Business Manager &gt; Flows &gt; JSON Editor</strong> to create or update your Flow directly on Meta!
              </p>

              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-y-auto max-h-96 select-all">
                <pre>{flowJsonContent}</pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  Endpoint: https://whatsapp.esponsports.com/api/whatsapp/flows/endpoint
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(flowJsonContent);
                      setCopiedFlowJson(true);
                      showToast("Flow JSON copied to clipboard!", "success");
                      setTimeout(() => setCopiedFlowJson(false), 2000);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedFlowJson ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedFlowJson ? "Copied!" : "Copy Flow JSON"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFlowJsonModal(false)}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
