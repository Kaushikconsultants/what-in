"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, CheckCircle2, Clock, Plus, RefreshCw, Link as LinkIcon, 
  Copy, Check, ShieldCheck, QrCode, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, FileText, Send, X, Save, Eye, EyeOff, Zap
} from "lucide-react";
import { 
  getWhatsAppPaymentLinks, 
  verifyManualPaymentAction, 
  recordManualUpiPaymentAction, 
  getCRMCustomersAction 
} from "@/app/actions/whatsAppPlatformActions";
import { getPaymentGatewaySettings, savePaymentGatewaySettings } from "@/app/actions/paymentGatewayActions";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";

interface WhatsAppPaymentsManagementComponentProps {
  embedded?: boolean;
}

export default function WhatsAppPaymentsManagementComponent({ embedded = false }: WhatsAppPaymentsManagementComponentProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"TRANSACTIONS" | "GATEWAYS" | "WEBHOOKS">("TRANSACTIONS");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "PAID" | "MANUAL_UPI" | "GATEWAY">("ALL");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

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
  const [pgMsg, setPgMsg] = useState<string | null>(null);
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [showCfSecret, setShowCfSecret] = useState(false);

  // Verification Modal State
  const [verifyingLink, setVerifyingLink] = useState<any | null>(null);
  const [verifyUtr, setVerifyUtr] = useState("");
  const [verifySendReceipt, setVerifySendReceipt] = useState(true);
  const [verifyingLoading, setVerifyingLoading] = useState(false);

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
      const [linksRes, gwRes, custRes] = await Promise.all([
        getWhatsAppPaymentLinks(),
        getPaymentGatewaySettings(),
        getCRMCustomersAction()
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
    } catch (err) {
      console.error("Error loading payments data:", err);
    } finally {
      setLoading(false);
    }
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(clientWebhookUrl);
    setCopiedWebhook(true);
    showToast("Payment Webhook URL copied to clipboard!", "success");
    setTimeout(() => setCopiedWebhook(false), 2500);
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
        showToast("Payment verified successfully! WhatsApp receipt sent.", "success");
        setVerifyingLink(null);
        setVerifyUtr("");
        await fetchLinksAndSettings();
      } else {
        showToast(res.error || "Failed to verify payment", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setVerifyingLoading(false);
    }
  };

  const handleConfirmRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordCustomerId) {
      showToast("Please select a customer", "error");
      return;
    }
    const amt = parseFloat(recordAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid payment amount", "error");
      return;
    }

    setRecordingLoading(true);
    try {
      const res = await recordManualUpiPaymentAction({
        customerId: recordCustomerId,
        amount: amt,
        transactionId: recordUtr.trim() || undefined,
        description: recordDescription.trim() || "Offline UPI / Direct Transfer",
        sendWhatsAppReceipt: recordSendReceipt
      });

      if (res.success) {
        showToast("Manual payment recorded & WhatsApp receipt delivered!", "success");
        setShowRecordModal(false);
        setRecordCustomerId("");
        setRecordAmount("");
        setRecordDescription("");
        setRecordUtr("");
        await fetchLinksAndSettings();
      } else {
        showToast(res.error || "Failed to record payment", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to record payment", "error");
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
        setPgMsg("✅ Payment gateway settings saved successfully!");
        setPgActiveGateway(nextGw);
        await fetchLinksAndSettings();
      } else {
        setPgMsg("❌ " + (res.error || "Failed to save settings"));
      }
    } catch (e: any) {
      setPgMsg("❌ Connection error: " + e.message);
    } finally {
      setSavingPg(false);
      setTimeout(() => setPgMsg(null), 3500);
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
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 m-0">
            <CreditCard size={24} className="text-indigo-600 dark:text-indigo-400" />
            WhatsApp Payments & UPI Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0 mt-1">
            Real-time webhook synchronization for Razorpay & Cashfree + Manual verification menu for UPI & QR payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => setShowRecordModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> Record Manual Payment
          </button>
          <button 
            onClick={() => setShowWebhookGuide(!showWebhookGuide)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showWebhookGuide 
                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" 
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
            }`}
          >
            <LinkIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Webhook URL</span>
            {showWebhookGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button 
            onClick={fetchLinksAndSettings}
            disabled={loading}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Tenant-Specific Webhook Guide Banner (Collapsible) */}
      {showWebhookGuide && (
        <div className="bg-slate-50 dark:bg-slate-850 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 shadow-sm flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-300 flex items-center gap-2 m-0">
                <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                Dedicated Payment Webhook for {gatewaySettings.clientBusinessName || "Your Business"}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0 mt-0.5">
                Register this endpoint in Razorpay or Cashfree to automatically receive real-time webhook updates and send WhatsApp confirmation receipts.
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
              ID: {gatewaySettings.webhookClientId?.slice(0, 8) || "default"}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl p-2.5">
            <code className="text-xs font-mono text-slate-800 dark:text-slate-200 flex-1 truncate select-all">
              {clientWebhookUrl}
            </code>
            <button
              onClick={handleCopyWebhook}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copiedWebhook ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedWebhook ? "Copied!" : "Copy URL"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">Razorpay Events:</span>
              <span className="text-slate-600 dark:text-slate-400">
                Check <code>payment_link.paid</code> and <code>payment.captured</code> in Razorpay Webhooks.
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Cashfree Events:</span>
              <span className="text-slate-600 dark:text-slate-400">
                Enable <code>PAYMENT_SUCCESS</code> and <code>ORDER_PAID</code> in Cashfree Webhooks.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Received */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            💰 Total Received
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
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            ⏳ Pending Verification
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

        {/* Manual UPI & QR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
            📲 Manual UPI & QR
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
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
            🔗 Active Gateway
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
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-sm"
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
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Zap size={15} />
          <span>Gateway Credentials</span>
        </button>

        <button
          onClick={() => setActiveSubTab("WEBHOOKS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === "WEBHOOKS"
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <LinkIcon size={15} />
          <span>Webhook Setup</span>
        </button>
      </div>

      {/* Subtab 1: Transactions & Verification */}
      {activeSubTab === "TRANSACTIONS" && (
        <div className="flex flex-col gap-4">
          {/* Filter Pills */}
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
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
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

          {/* Main Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
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

                      return (
                        <tr key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {cust?.businessName || cust?.contactPerson || "Customer"}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatWhatsAppPhone(cust?.whatsappNumber || cust?.mobile) || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isManual ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
                                📱 UPI / QR
                              </span>
                            ) : isRazorpay ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                                ⚡ Razorpay
                              </span>
                            ) : isCashfree ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/50">
                                🛡️ Cashfree
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                🔗 Payment Link
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                            {link.orderId || link.description || "Payment Request"}
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-sm">
                            ₹{(link.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {link.transactionId ? (
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {link.transactionId}
                              </span>
                            ) : "—"}
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
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                                ● EXPIRED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 inline-flex items-center gap-1">
                                <Clock size={11} /> PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {link.status === "PENDING" ? (
                              <button
                                onClick={() => {
                                  setVerifyingLink(link);
                                  setVerifyUtr("");
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-sm"
                              >
                                <ShieldCheck size={13} /> Verify Payment
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Verified</span>
                            )}
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

      {/* Subtab 2: Gateway Credentials */}
      {activeSubTab === "GATEWAYS" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-100 dark:bg-violet-500/20 rounded-xl">
              <CreditCard size={22} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Payment Gateway Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Connect Razorpay or Cashfree. Only 1 gateway can be active at a time — it auto-syncs to all Payment blocks in the Chatbot Builder.
              </p>
            </div>
          </div>

          {pgMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              pgMsg.includes("✅") 
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50" 
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50"
            }`}>
              {pgMsg}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Razorpay Card */}
            <div className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
              pgActiveGateway === "RAZORPAY" 
                ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10" 
                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">RZP</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Razorpay</h4>
                      <p className="text-[11px] text-slate-500 m-0">India's most popular gateway</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveGateways(pgActiveGateway === "RAZORPAY" ? null : "RAZORPAY")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pgActiveGateway === "RAZORPAY" 
                        ? "bg-blue-600 text-white" 
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {pgActiveGateway === "RAZORPAY" ? "✅ Active" : "Set Active"}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Key ID</label>
                    <input 
                      type="text" 
                      value={razorpayKeyId} 
                      onChange={(e) => setRazorpayKeyId(e.target.value)} 
                      placeholder="rzp_live_..." 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Key Secret</label>
                    <div className="relative">
                      <input 
                        type={showRzpSecret ? "text" : "password"} 
                        value={razorpayKeySecret} 
                        onChange={(e) => setRazorpayKeySecret(e.target.value)} 
                        placeholder="••••••••••••••••" 
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <button type="button" onClick={() => setShowRzpSecret(!showRzpSecret)} className="absolute right-2.5 top-2 text-slate-400">
                        {showRzpSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleSaveGateways()} 
                disabled={savingPg} 
                className="w-full mt-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingPg ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>} Save Razorpay Keys
              </button>
            </div>

            {/* Cashfree Card */}
            <div className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
              pgActiveGateway === "CASHFREE" 
                ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10" 
                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">CF</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Cashfree</h4>
                      <p className="text-[11px] text-slate-500 m-0">Fast settlements & lower MDR</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveGateways(pgActiveGateway === "CASHFREE" ? null : "CASHFREE")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pgActiveGateway === "CASHFREE" 
                        ? "bg-emerald-600 text-white" 
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600"
                    }`}
                  >
                    {pgActiveGateway === "CASHFREE" ? "✅ Active" : "Set Active"}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">App ID</label>
                    <input 
                      type="text" 
                      value={cashfreeAppId} 
                      onChange={(e) => setCashfreeAppId(e.target.value)} 
                      placeholder="CF App ID" 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Secret Key</label>
                    <div className="relative">
                      <input 
                        type={showCfSecret ? "text" : "password"} 
                        value={cashfreeSecretKey} 
                        onChange={(e) => setCashfreeSecretKey(e.target.value)} 
                        placeholder="••••••••••••••••" 
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                      />
                      <button type="button" onClick={() => setShowCfSecret(!showCfSecret)} className="absolute right-2.5 top-2 text-slate-400">
                        {showCfSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleSaveGateways()} 
                disabled={savingPg} 
                className="w-full mt-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingPg ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>} Save Cashfree Keys
              </button>
            </div>

            {/* Direct UPI Card */}
            <div className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
              pgActiveGateway === "UPI" 
                ? "border-orange-500 bg-orange-50/40 dark:bg-orange-900/10" 
                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-xs">UPI</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Direct UPI</h4>
                      <p className="text-[11px] text-slate-500 m-0">Zero fees via direct QR/Link</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveGateways(pgActiveGateway === "UPI" ? null : "UPI")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pgActiveGateway === "UPI" 
                        ? "bg-orange-600 text-white" 
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    {pgActiveGateway === "UPI" ? "✅ Active" : "Set Active"}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">UPI ID (VPA)</label>
                    <input 
                      type="text" 
                      value={merchantUpiId} 
                      onChange={(e) => setMerchantUpiId(e.target.value)} 
                      placeholder="e.g. yourname@okicici" 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Payee Name</label>
                    <input 
                      type="text" 
                      value={merchantUpiName} 
                      onChange={(e) => setMerchantUpiName(e.target.value)} 
                      placeholder="e.g. Your Business Name" 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500" 
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleSaveGateways()} 
                disabled={savingPg} 
                className="w-full mt-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingPg ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>} Save UPI Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Webhook Setup */}
      {activeSubTab === "WEBHOOKS" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Register Webhooks in Payment Gateway Dashboards
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
                When a customer pays, Razorpay or Cashfree triggers this webhook to mark the order PAID and send an automated receipt.
              </p>
            </div>
            <button
              onClick={handleCopyWebhook}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
            >
              {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedWebhook ? "Copied!" : "Copy Webhook URL"}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="truncate">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Your Live Payment Webhook Endpoint:</span>
              <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all">{clientWebhookUrl}</code>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/60 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Listening for Events
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Razorpay Guide */}
            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h4 className="text-sm font-bold text-blue-950 dark:text-blue-300 m-0">Razorpay Dashboard Setup</h4>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside leading-relaxed m-0 p-0">
                <li>Log into your <strong>Razorpay Dashboard</strong> &rarr; <strong>Account & Settings</strong>.</li>
                <li>Click <strong>Webhooks</strong> &rarr; <strong>Add New Webhook</strong>.</li>
                <li>Paste the <strong>Webhook URL</strong> copied above into the URL box.</li>
                <li>Under <strong>Active Events</strong>, select:
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 rounded font-mono text-[11px] font-bold">payment_link.paid</span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 rounded font-mono text-[11px] font-bold">payment.captured</span>
                  </div>
                </li>
                <li>Click <strong>Create Webhook</strong>. Done!</li>
              </ol>
            </div>

            {/* Cashfree Guide */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-300 m-0">Cashfree Dashboard Setup</h4>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside leading-relaxed m-0 p-0">
                <li>Log into your <strong>Cashfree Merchant Dashboard</strong>.</li>
                <li>Go to <strong>Payment Gateway</strong> &rarr; <strong>Developers</strong> &rarr; <strong>Webhooks</strong>.</li>
                <li>Click <strong>Add Webhook</strong> and paste the <strong>Webhook URL</strong> copied above.</li>
                <li>Enable the following event triggers:
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 rounded font-mono text-[11px] font-bold">PAYMENT_SUCCESS</span>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 rounded font-mono text-[11px] font-bold">ORDER_PAID</span>
                  </div>
                </li>
                <li>Click <strong>Save & Test</strong>. Real-time receipts are now active!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Verify & Mark as Paid */}
      {verifyingLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                <ShieldCheck size={18} className="text-emerald-600" /> Verify Customer Payment
              </h3>
              <button onClick={() => setVerifyingLink(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Customer</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {verifyingLink.conversation?.customer?.contactPerson || verifyingLink.customer?.contactPerson || "Customer"}
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
                  Bank UTR / UPI Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423910283741 or CASH-01"
                  value={verifyUtr}
                  onChange={(e) => setVerifyUtr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
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
                <Plus size={18} className="text-emerald-600" /> Record Offline / UPI Payment
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
    </div>
  );
}
