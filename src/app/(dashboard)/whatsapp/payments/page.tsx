"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, CheckCircle2, Clock, Plus, RefreshCw, Link as LinkIcon, 
  Copy, Check, ShieldCheck, QrCode, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, FileText, Send, X
} from "lucide-react";
import { 
  getWhatsAppPaymentLinks, 
  verifyManualPaymentAction, 
  recordManualUpiPaymentAction,
  getCRMCustomersAction 
} from "@/app/actions/whatsAppPlatformActions";
import { getPaymentGatewaySettings } from "@/app/actions/paymentGatewayActions";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";

export default function WhatsAppPaymentsPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "PAID" | "MANUAL_UPI" | "GATEWAY">("ALL");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  // Settings & Tenant Webhook Info
  const [gatewaySettings, setGatewaySettings] = useState<{
    activeGateway: string | null;
    webhookClientId?: string;
    clientBusinessName?: string;
    merchantUpiId?: string;
  }>({ activeGateway: null });

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
      if (gwRes) setGatewaySettings(gwRes);
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
    if (activeTab === "PENDING") return link.status === "PENDING";
    if (activeTab === "PAID") return link.status === "PAID";
    if (activeTab === "MANUAL_UPI") return isManual;
    if (activeTab === "GATEWAY") return !isManual;
    return true;
  });

  // Client Webhook URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://whatsapp.esponsports.com";
  const clientWebhookUrl = `${origin}/api/whatsapp/payments/webhook/${gatewaySettings.webhookClientId || "default"}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(clientWebhookUrl);
    setCopiedWebhook(true);
    showToast("Client Payment Webhook URL copied to clipboard!", "success");
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

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          background: toast.type === "success" ? "#065f46" : "#991b1b",
          color: "#fff",
          padding: "12px 18px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#111827", display: "flex", alignItems: "center", gap: "10px" }}>
            <CreditCard size={24} style={{ color: "#2563eb" }} /> WhatsApp Payments & UPI Verification
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}>
            Real-time webhook synchronization for Razorpay & Cashfree + Manual verification menu for UPI & QR payments.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            onClick={() => setShowRecordModal(true)}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
            }}
          >
            <Plus size={15} /> Record Manual Payment
          </button>
          <button 
            onClick={() => setShowWebhookGuide(!showWebhookGuide)}
            style={{
              background: showWebhookGuide ? "#eff6ff" : "#fff",
              border: "1px solid #d1d5db",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151"
            }}
          >
            <LinkIcon size={14} style={{ color: "#2563eb" }} /> Client Webhook URL
            {showWebhookGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button 
            onClick={fetchLinksAndSettings} 
            style={{
              background: "#fff",
              border: "1px solid #d1d5db",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151"
            }}
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Tenant-Specific Webhook Guide Banner */}
      {showWebhookGuide && (
        <div style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={18} style={{ color: "#2563eb" }} /> Dedicated Payment Webhook for {gatewaySettings.clientBusinessName || "Your Business"}
              </h3>
              <p style={{ fontSize: "12px", color: "#475569", margin: "4px 0 0 0" }}>
                Register this client-specific URL in your Razorpay or Cashfree dashboard to automatically receive instant payment receipts on WhatsApp.
              </p>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 700, background: "#dbeafe", color: "#1d4ed8", padding: "3px 8px", borderRadius: "6px" }}>
              Client ID: {gatewaySettings.webhookClientId?.slice(0, 8) || "default"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 12px" }}>
            <span style={{ fontSize: "13px", fontFamily: "monospace", color: "#0f172a", flex: 1, wordBreak: "break-all" }}>
              {clientWebhookUrl}
            </span>
            <button
              onClick={handleCopyWebhook}
              style={{
                background: copiedWebhook ? "#16a34a" : "#2563eb",
                color: "#fff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0
              }}
            >
              {copiedWebhook ? <Check size={14} /> : <Copy size={14} />} {copiedWebhook ? "Copied!" : "Copy URL"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>🔹 Razorpay Webhook Setup:</div>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#475569", lineHeight: "1.5" }}>
                <li>Paste the URL above in <b>Razorpay Dashboard &rarr; Settings &rarr; Webhooks</b></li>
                <li>Select active events: <code>payment_link.paid</code> and <code>payment.captured</code></li>
                <li>Webhook Secret: Uses your <code>Razorpay Key Secret</code></li>
              </ul>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>🔹 Cashfree Webhook Setup:</div>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#475569", lineHeight: "1.5" }}>
                <li>Paste the URL above in <b>Cashfree Merchant Dashboard &rarr; Developers &rarr; Webhooks</b></li>
                <li>Select active events: <code>PAYMENT_SUCCESS_WEBHOOK</code> and <code>ORDER_PAID</code></li>
                <li>Webhook Secret: Uses your <code>Cashfree Secret Key</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            💰 Total Received
          </span>
          <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#15803d", margin: "6px 0 0 0" }}>
            ₹{totalReceived.toLocaleString("en-IN")}
          </h3>
          <span style={{ fontSize: "11px", color: "#166534", marginTop: "4px", display: "block" }}>
            {links.filter(l => l.status === "PAID").length} verified payments
          </span>
        </div>

        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "12px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#92400e", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            ⏳ Pending Verification
          </span>
          <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#b45309", margin: "6px 0 0 0" }}>
            ₹{totalPending.toLocaleString("en-IN")}
          </h3>
          <span style={{ fontSize: "11px", color: "#92400e", marginTop: "4px", display: "block" }}>
            {pendingCount} links awaiting payment / UTR
          </span>
        </div>

        <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "12px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b21a8", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            📲 Manual UPI & QR
          </span>
          <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#7e22ce", margin: "6px 0 0 0" }}>
            {manualCount}
          </h3>
          <span style={{ fontSize: "11px", color: "#6b21a8", marginTop: "4px", display: "block" }}>
            Direct offline / QR transactions
          </span>
        </div>

        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            🔗 Active Gateway
          </span>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1d4ed8", margin: "10px 0 0 0" }}>
            {gatewaySettings.activeGateway || "UPI / Manual"}
          </h3>
          <span style={{ fontSize: "11px", color: "#1e40af", marginTop: "4px", display: "block" }}>
            UPI ID: {gatewaySettings.merchantUpiId || "Configured"}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
        {[
          { key: "ALL", label: "All Payments", count: links.length },
          { key: "PENDING", label: "Pending Verification", count: pendingCount, highlight: pendingCount > 0 },
          { key: "PAID", label: "Paid / Verified", count: links.filter(l => l.status === "PAID").length },
          { key: "MANUAL_UPI", label: "Manual UPI / QR", count: manualCount },
          { key: "GATEWAY", label: "Gateway Links", count: links.length - manualCount }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: activeTab === tab.key ? "1px solid #2563eb" : "1px solid #e5e7eb",
              background: activeTab === tab.key ? "#eff6ff" : "#fff",
              color: activeTab === tab.key ? "#1d4ed8" : "#4b5563",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {tab.label}
            <span style={{
              fontSize: "11px",
              padding: "1px 6px",
              borderRadius: "10px",
              background: tab.highlight ? "#fef3c7" : (activeTab === tab.key ? "#dbeafe" : "#f3f4f6"),
              color: tab.highlight ? "#92400e" : (activeTab === tab.key ? "#1e40af" : "#6b7280")
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
            <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
            <p style={{ fontWeight: 600, fontSize: "14px" }}>Synchronizing payment records & webhooks...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
            <LinkIcon size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No payment records found in this view</p>
            <p style={{ fontSize: "13px", maxWidth: "400px", margin: "4px auto 0 auto" }}>
              Payment links generated in chats or manual payments recorded will display here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                  <th style={{ padding: "14px 16px" }}>Customer</th>
                  <th style={{ padding: "14px 16px" }}>Method / Gateway</th>
                  <th style={{ padding: "14px 16px" }}>Description</th>
                  <th style={{ padding: "14px 16px" }}>Amount</th>
                  <th style={{ padding: "14px 16px" }}>UTR / Reference</th>
                  <th style={{ padding: "14px 16px" }}>Date</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => {
                  const cust = link.conversation?.customer || link.customer;
                  const isManual = link.paymentUrl?.includes("manual") || link.transactionId?.startsWith("MANUAL");
                  const isRazorpay = link.paymentUrl?.includes("rzp") || link.transactionId?.startsWith("pay_");
                  const isCashfree = link.paymentUrl?.includes("cashfree") || link.transactionId?.startsWith("CF_");

                  return (
                    <tr key={link.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {cust?.businessName || cust?.contactPerson || "Customer"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#059669", fontFamily: "monospace" }}>
                          {formatWhatsAppPhone(cust?.whatsappNumber || cust?.mobile) || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {isManual ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "3px 8px", borderRadius: "6px" }}>
                            📱 UPI / QR
                          </span>
                        ) : isRazorpay ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "6px" }}>
                            ⚡ Razorpay
                          </span>
                        ) : isCashfree ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc", padding: "3px 8px", borderRadius: "6px" }}>
                            🛡️ Cashfree
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "6px" }}>
                            🔗 Payment Link
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155", maxWidth: "200px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {link.orderId || link.description || "Payment Request"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                        ₹{(link.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", fontFamily: "monospace", fontSize: "12px" }}>
                        {link.transactionId ? (
                          <span style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                            {link.transactionId}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>
                        {new Date(link.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {link.status === "PAID" ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={12} /> PAID
                          </span>
                        ) : link.status === "EXPIRED" ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#fee2e2", color: "#b91c1c", padding: "3px 8px", borderRadius: "6px" }}>
                            ● EXPIRED
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={12} /> PENDING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {link.status === "PENDING" ? (
                          <button
                            onClick={() => {
                              setVerifyingLink(link);
                              setVerifyUtr("");
                            }}
                            style={{
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <ShieldCheck size={13} /> Verify Payment
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Verified</span>
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

      {/* Modal 1: Verify & Mark as Paid */}
      {verifyingLink && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={20} style={{ color: "#16a34a" }} /> Verify Customer Payment
              </h3>
              <button onClick={() => setVerifyingLink(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>CUSTOMER</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                  {verifyingLink.conversation?.customer?.contactPerson || verifyingLink.customer?.contactPerson || "Customer"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px" }}>
                  <span style={{ color: "#64748b" }}>Amount:</span>
                  <span style={{ fontWeight: 800, color: "#15803d" }}>₹{(verifyingLink.amount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Bank UTR / UPI Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423910283741 or CASH-01"
                  value={verifyUtr}
                  onChange={(e) => setVerifyUtr(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="sendReceipt"
                  checked={verifySendReceipt}
                  onChange={(e) => setVerifySendReceipt(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="sendReceipt" style={{ fontSize: "12px", color: "#334155", cursor: "pointer", fontWeight: 600 }}>
                  Automatically send official WhatsApp payment receipt to customer
                </label>
              </div>
            </div>

            <div style={{ padding: "14px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setVerifyingLink(null)}
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerify}
                disabled={verifyingLoading}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {verifyingLoading ? "Verifying..." : "Confirm & Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Record Offline UPI Payment */}
      {showRecordModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "520px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}>
            <form onSubmit={handleConfirmRecordPayment}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={18} style={{ color: "#16a34a" }} /> Record Offline UPI / Bank Payment
                </h3>
                <button type="button" onClick={() => setShowRecordModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Select Customer <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={recordCustomerId}
                    onChange={(e) => setRecordCustomerId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contactPerson || c.businessName} ({c.whatsappNumber || c.mobile || "No Phone"})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Amount (₹) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2500"
                      min="1"
                      step="any"
                      required
                      value={recordAmount}
                      onChange={(e) => setRecordAmount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Bank UTR / Ref Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423910283741"
                      value={recordUtr}
                      onChange={(e) => setRecordUtr(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Direct GPay / PhonePe Advance for Order #1042"
                    value={recordDescription}
                    onChange={(e) => setRecordDescription(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    id="recordSendReceipt"
                    checked={recordSendReceipt}
                    onChange={(e) => setRecordSendReceipt(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <label htmlFor="recordSendReceipt" style={{ fontSize: "12px", color: "#334155", cursor: "pointer", fontWeight: 600 }}>
                    Automatically dispatch official WhatsApp payment receipt to customer
                  </label>
                </div>
              </div>

              <div style={{ padding: "14px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  style={{
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingLoading}
                  style={{
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {recordingLoading ? "Recording..." : "Record & Send Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
