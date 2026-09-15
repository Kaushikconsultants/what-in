"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, CheckCircle2, Clock, Plus, RefreshCw, Link as LinkIcon, 
  Copy, Check, ShieldCheck, QrCode, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, FileText, Send, X, Save, Eye, EyeOff, Zap,
  TrendingUp, Smartphone, Webhook, AlertCircle
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
  const [activeSubTab, setActiveSubTab] = useState<"TRANSACTIONS" | "GATEWAYS">("TRANSACTIONS");
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
            Real-time webhook synchronization for Razorpay & Cashfree + Manual verification menu for UPI & QR payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

      {/* Sub-tab Navigation (Clean 2-Tab Suite) */}
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

                      return (
                        <tr key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {cust?.businessName || cust?.contactPerson || "Customer"}
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
                            {link.status === "PENDING" ? (
                              <button
                                onClick={() => {
                                  setVerifyingLink(link);
                                  setVerifyUtr("");
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <ShieldCheck size={13} />
                                <span>Verify Payment</span>
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

      {/* Subtab 2: Gateway Credentials & Integrated Webhooks */}
      {activeSubTab === "GATEWAYS" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                  Payment Gateway Configuration & Webhooks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  Configure API credentials and register dedicated webhook URLs directly into your payment provider dashboards.
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
        </div>
      )}

      {/* Modal 1: Verify & Mark as Paid */}
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
    </div>
  );
}
