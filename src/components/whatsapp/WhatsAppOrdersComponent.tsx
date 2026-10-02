"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Eye,
  Sliders,
  DollarSign,
  Percent,
  MapPin,
  Send,
  X,
  Copy,
  Check,
  Code2,
  Sparkles,
  Zap,
  ChevronDown,
  ArrowUpRight,
  Package,
  FileText,
  User,
  CreditCard,
  Download,
  Printer,
  Edit3,
  Plus,
  Trash2,
  Save,
  Tag
} from "lucide-react";
import {
  getUnifiedOrdersAction,
  updateOrderStatusAction,
  sendOrderWhatsAppMessageAction,
  updateUnifiedOrderAction,
  getStoreDetailsAction,
  UnifiedOrder,
  UnifiedOrderItem
} from "@/app/actions/whatsAppOrderActions";
import {
  getPaymentRecoverySettingsAction,
  savePaymentRecoverySettingsAction,
  createOrPublishMetaCheckoutFlowAction,
  getCheckoutFlowDetailsAction
} from "@/app/actions/paymentRecoveryActions";
import { generateMetaCheckoutFlowJson } from "@/lib/paymentRecoveryAgent";
import MobilePushAlertBanner from "@/components/whatsapp/MobilePushAlertBanner";
import OrderInvoiceModal from "@/components/whatsapp/OrderInvoiceModal";

export default function WhatsAppOrdersComponent() {
  const [activeTab, setActiveTab] = useState<"orders" | "settings" | "shipments">("orders");
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState("ALL");

  // Selected Order for Shopify-style Slide-over / Modal
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [awbNumber, setAwbNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [sendWhatsAppOnUpdate, setSendWhatsAppOnUpdate] = useState(true);

  // Quick WhatsApp Message from Drawer
  const [quickMsg, setQuickMsg] = useState("");
  const [sendingQuickMsg, setSendingQuickMsg] = useState(false);

  // Editing Order State (Shopify style)
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editItems, setEditItems] = useState<UnifiedOrderItem[]>([]);
  const [editCustomer, setEditCustomer] = useState<{
    name: string;
    phone: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
  }>({ name: "", phone: "", fullAddress: "", city: "", state: "", pincode: "" });
  const [editDiscountType, setEditDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  const [editDiscountCode, setEditDiscountCode] = useState<string>("");
  const [editShippingFee, setEditShippingFee] = useState<number>(0);
  const [editPaymentMode, setEditPaymentMode] = useState<"PREPAID" | "PARTIAL_COD" | "FULL_COD" | "ONLINE">("PREPAID");
  const [editAdvanceAmount, setEditAdvanceAmount] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);

  // Invoice / Packing Slip Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalTab, setInvoiceModalTab] = useState<"invoice" | "packingslip">("invoice");
  const [storeDetails, setStoreDetails] = useState<any>({
    name: "Espon Clothing",
    tradeName: "Espon Clothing Pvt Ltd",
    gstin: "07AAACE1234F1Z5",
    pan: "AAACE1234F",
    phone: "+91 98765 43210",
    email: "support@esponclothing.com",
    website: "www.esponclothing.com",
    address: "Plot No 42, Garment Hub, Industrial Area",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110020",
    country: "India"
  });

  // Dynamic calculations for Edit Mode
  const editSubtotal = editItems.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0);
  const editDiscountAmount = editDiscountType === "PERCENT"
    ? Math.round((editSubtotal * (Number(editDiscountValue) || 0)) / 100)
    : (Number(editDiscountValue) || 0);
  const editTotalAmount = Math.max(0, editSubtotal - editDiscountAmount + (Number(editShippingFee) || 0));
  const editCodDue = editPaymentMode === "PREPAID" ? 0 : Math.max(0, editTotalAmount - (Number(editAdvanceAmount) || 0));

  const handleStartEdit = () => {
    if (!selectedOrder) return;
    setEditItems(JSON.parse(JSON.stringify(selectedOrder.items)));
    setEditCustomer({
      name: selectedOrder.customer.name || "",
      phone: selectedOrder.customer.phone || "",
      fullAddress: selectedOrder.customer.fullAddress || "",
      city: selectedOrder.customer.city || "",
      state: selectedOrder.customer.state || "",
      pincode: selectedOrder.customer.pincode || ""
    });
    setEditDiscountType(selectedOrder.financials.discountPercent > 0 ? "PERCENT" : "FIXED");
    setEditDiscountValue(selectedOrder.financials.discountPercent > 0 ? selectedOrder.financials.discountPercent : selectedOrder.financials.discountAmount);
    setEditDiscountCode(selectedOrder.financials.discountCode || "");
    setEditShippingFee(selectedOrder.financials.shippingFee || 0);
    setEditPaymentMode(selectedOrder.financials.paymentMode || "PREPAID");
    setEditAdvanceAmount(selectedOrder.financials.advanceAmountPaid || 0);
    setIsEditingOrder(true);
  };

  const handleUpdateItem = (idx: number, field: keyof UnifiedOrderItem, val: any) => {
    setEditItems(prev => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: val };
      if (field === "quantity" || field === "price") {
        item.total = (Number(item.quantity) || 1) * (Number(item.price) || 0);
      }
      copy[idx] = item;
      return copy;
    });
  };

  const handleAddItem = () => {
    setEditItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "New Product Item",
        quantity: 1,
        price: 999,
        total: 999,
        sku: `ITEM-${Math.floor(100 + Math.random() * 900)}`
      }
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (editItems.length <= 1) {
      showToast("Order must contain at least 1 item", "error");
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveOrderEdits = async () => {
    if (!selectedOrder) return;
    if (editItems.length === 0) {
      showToast("Order must have at least one product item", "error");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await updateUnifiedOrderAction({
        orderId: selectedOrder.id,
        source: selectedOrder.source,
        items: editItems,
        customer: editCustomer,
        financials: {
          subtotal: editSubtotal,
          discountPercent: editDiscountType === "PERCENT" ? editDiscountValue : 0,
          discountAmount: editDiscountAmount,
          discountCode: editDiscountCode.trim() || undefined,
          shippingFee: editShippingFee,
          totalAmount: editTotalAmount,
          paymentMode: editPaymentMode,
          advanceAmountPaid: editAdvanceAmount,
          codBalanceDue: editCodDue,
          paymentStatus: editPaymentMode === "PREPAID" ? "PAID" : (editAdvanceAmount > 0 ? "PARTIALLY_PAID" : "PENDING")
        },
        notes: selectedOrder.notes
      });

      if (res.success) {
        showToast("Order updated successfully!", "success");
        const updatedOrd: UnifiedOrder = {
          ...selectedOrder,
          customer: {
            ...selectedOrder.customer,
            name: editCustomer.name,
            phone: editCustomer.phone,
            whatsappPhone: editCustomer.phone,
            fullAddress: editCustomer.fullAddress,
            city: editCustomer.city,
            state: editCustomer.state,
            pincode: editCustomer.pincode
          },
          items: editItems,
          financials: {
            ...selectedOrder.financials,
            subtotal: editSubtotal,
            discountPercent: editDiscountType === "PERCENT" ? editDiscountValue : 0,
            discountAmount: editDiscountAmount,
            discountCode: editDiscountCode.trim() || undefined,
            shippingFee: editShippingFee,
            totalAmount: editTotalAmount,
            paymentMode: editPaymentMode,
            advanceAmountPaid: editAdvanceAmount,
            codBalanceDue: editCodDue,
            paymentStatus: editPaymentMode === "PREPAID" ? "PAID" : (editAdvanceAmount > 0 ? "PARTIALLY_PAID" : "PENDING")
          }
        };

        setSelectedOrder(updatedOrd);
        setOrders(prev => prev.map(o => o.id === updatedOrd.id ? updatedOrd : o));
        setIsEditingOrder(false);
      } else {
        showToast(res.error || "Failed to update order", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Flow & Checkout Settings State (Moved here per user request!)
  const [recoverySettings, setRecoverySettings] = useState<any>({
    flowCheckoutEnabled: true,
    metaFlowId: "",
    allowedPaymentModes: ["PREPAID", "PARTIAL_COD", "FULL_COD"],
    partialCodMode: "PERCENTAGE",
    partialCodValue: 10,
    minOrderValueForCod: 0,
    prepaidDiscountPercent: 5,
    flowCtaText: "Enter Delivery Address 📍",
    flowHeaderTitle: "Confirm Delivery & Payment",
    autoCatalogPaymentEnabled: true,
    autoCatalogDeliveryMethod: "both"
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingMetaFlow, setSyncingMetaFlow] = useState(false);
  const [metaFlowSyncMsg, setMetaFlowSyncMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [showFlowJsonModal, setShowFlowJsonModal] = useState(false);
  const [flowJsonContent, setFlowJsonContent] = useState("");
  const [copiedFlowJson, setCopiedFlowJson] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadOrders = async () => {
    setRefreshing(true);
    try {
      const res = await getUnifiedOrdersAction({
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        paymentMode: paymentModeFilter,
        search: searchQuery
      });
      if (res.success) {
        setOrders(res.orders);
        setMetrics(res.metrics);
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await getPaymentRecoverySettingsAction();
      if (res.success && res.settings) {
        setRecoverySettings(res.settings);
      }
      const storeRes = await getStoreDetailsAction();
      if (storeRes.success && storeRes.store) {
        setStoreDetails(storeRes.store);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadOrders();
    loadSettings();
  }, [statusFilter, paymentStatusFilter, paymentModeFilter]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  // Order Details Selection
  const handleSelectOrder = (ord: UnifiedOrder) => {
    setSelectedOrder(ord);
    setIsEditingOrder(false);
    setCourierName(ord.fulfillment.courierName || "");
    setAwbNumber(ord.fulfillment.awbNumber || "");
    setTrackingUrl(ord.fulfillment.trackingUrl || "");
    setQuickMsg("");
  };

  // Update Status & Fulfillment
  const handleUpdateFulfillment = async (newStatus: "PROCESSING" | "PACKED" | "DISPATCHED" | "DELIVERED" | "CANCELLED") => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      const res = await updateOrderStatusAction({
        orderId: selectedOrder.id,
        status: newStatus,
        courierName,
        awbNumber,
        trackingUrl,
        sendWhatsAppNotification: sendWhatsAppOnUpdate
      });
      if (res.success) {
        showToast(`Order updated to ${newStatus}`, "success");
        setSelectedOrder(prev => prev ? {
          ...prev,
          fulfillment: {
            ...prev.fulfillment,
            status: newStatus,
            courierName,
            awbNumber,
            trackingUrl
          }
        } : null);
        await loadOrders();
      } else {
        showToast(res.error || "Failed to update order", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Send Quick WhatsApp Message
  const handleSendQuickMsg = async () => {
    if (!selectedOrder?.customer.conversationId || !quickMsg.trim()) {
      showToast("No active WhatsApp conversation found or message is empty", "error");
      return;
    }
    setSendingQuickMsg(true);
    try {
      const res = await sendOrderWhatsAppMessageAction({
        conversationId: selectedOrder.customer.conversationId,
        content: quickMsg.trim()
      });
      if (res.success) {
        showToast("WhatsApp message sent to customer!", "success");
        setQuickMsg("");
      } else {
        showToast(res.error || "Failed to send message", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSendingQuickMsg(false);
    }
  };

  // Save Flow & Checkout Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await savePaymentRecoverySettingsAction(recoverySettings);
      if (res.success) {
        showToast("Checkout Flow & Payment settings saved successfully!", "success");
      } else {
        showToast(res.error || "Failed to save settings", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // 1-Click Sync Meta Flow
  const handleSyncMetaFlow = async () => {
    setSyncingMetaFlow(true);
    setMetaFlowSyncMsg(null);
    try {
      const res = await createOrPublishMetaCheckoutFlowAction();
      if (res.success && res.flowId) {
        setRecoverySettings((prev: any) => ({ ...prev, metaFlowId: res.flowId }));
        setMetaFlowSyncMsg({ success: true, text: res.message || `Meta Flow deployed! Flow ID: ${res.flowId}` });
        showToast(`Meta Flow published! ID: ${res.flowId}`, "success");
      } else {
        setMetaFlowSyncMsg({ success: false, text: res.error || "Failed to deploy on Meta." });
        showToast(res.error || "Failed to publish Flow on Meta.", "error");
      }
    } catch (e: any) {
      setMetaFlowSyncMsg({ success: false, text: e.message });
      showToast(e.message, "error");
    } finally {
      setSyncingMetaFlow(false);
    }
  };

  // Open Flow JSON Modal
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
          toast.type === "success"
            ? "bg-emerald-600 text-white shadow-emerald-500/20"
            : "bg-rose-600 text-white shadow-rose-500/20"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Orders & Fulfillment Panel
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Shopify & WhatsApp
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage live catalog orders, customer delivery addresses, payment preferences, and discounts in one unified Shopify-style hub.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadOrders}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Syncing..." : "Sync Orders"}</span>
          </button>

          {/* Quick link to Payments Management */}
          <Link
            href="/whatsapp/payments"
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <CreditCard size={13} />
            <span>Payments Gateway</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "orders"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <ShoppingBag size={14} />
          <span>All Orders</span>
          {metrics && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}>
              {metrics.totalOrders}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sliders size={14} />
          <span>Checkout & Flow Settings</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shipments")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "shipments"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Truck size={14} />
          <span>Shipments & Tracking</span>
        </button>
      </div>

      {/* TAB 1: ALL ORDERS (SHOPIFY STYLE) */}
      {activeTab === "orders" && (
        <div className="flex flex-col gap-6">
          {/* Mobile Push Alert & PWA Banner */}
          <MobilePushAlertBanner context="orders" />

          {/* Top Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Orders</span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {metrics.totalOrders}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold mt-0.5 block">Shopify + WhatsApp</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Gross Revenue</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  ₹{metrics.totalRevenue.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Total merchandise value</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Discounts Given</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  ₹{metrics.totalDiscounts.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-amber-600/80 font-bold mt-0.5 block">Prepaid & Coupon Savings</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Prepaid Online</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {metrics.prepaidCount}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">100% Advance Received</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Partial COD Orders</span>
                <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block">
                  {metrics.partialCodCount}
                </span>
                <span className="text-[10px] text-cyan-600 font-bold mt-0.5 block">Token Paid / Balance COD</span>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Full COD Orders</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {metrics.fullCodCount}
                </span>
                <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">Cash on Delivery</span>
              </div>
            </div>
          )}

          {/* Search & Filter Bar (Shopify Style) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer, city, phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Order Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">Fulfillment: All</option>
                <option value="PROCESSING">Processing</option>
                <option value="PACKED">Packed</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Payment Status */}
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">Payment: All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PENDING">Pending / Unpaid</option>
              </select>

              {/* Payment Mode */}
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">Mode: All</option>
                <option value="PREPAID">Prepaid (100%)</option>
                <option value="PARTIAL_COD">Partial COD</option>
                <option value="FULL_COD">Full COD</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs font-medium">Loading orders from WhatsApp Catalog and Store...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No orders found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  When customers place catalog orders on WhatsApp or your Shopify store, they will automatically appear here with verified addresses and payment breakdown.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-4">Customer &amp; Address</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Total &amp; Discount</th>
                      <th className="py-3 px-4">Fulfillment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {orders.map((ord) => {
                      const totalItemsCount = ord.items.reduce((s, it) => s + it.quantity, 0);

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => handleSelectOrder(ord)}
                        >
                          {/* Order ID & Source */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {ord.orderNumber}
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                                  ord.source === "WHATSAPP_CATALOG"
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                }`}>
                                  {ord.source === "WHATSAPP_CATALOG" ? "WhatsApp" : "Shopify"}
                                </span>
                              </span>
                              <span className="text-[10.5px] text-slate-400 mt-0.5">
                                {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Customer & Address */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {ord.customer.name}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {ord.customer.phone}
                              </span>
                              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="text-slate-400 shrink-0" />
                                {ord.customer.city ? `${ord.customer.city}, ${ord.customer.state}` : ord.customer.fullAddress.slice(0, 40)}
                                {ord.customer.pincode && ` (${ord.customer.pincode})`}
                              </span>
                            </div>
                          </td>

                          {/* Items Summary */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {ord.items[0]?.name || "Catalog Items"}
                                {ord.items.length > 1 && ` +${ord.items.length - 1} more`}
                              </span>
                              <span className="text-[10.5px] text-slate-400">
                                {totalItemsCount} {totalItemsCount === 1 ? "unit" : "units"}
                              </span>
                            </div>
                          </td>

                          {/* Payment Mode & Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              {/* Payment Mode Badge */}
                              <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                ord.financials.paymentMode === "PREPAID"
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : ord.financials.paymentMode === "PARTIAL_COD"
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              }`}>
                                {ord.financials.paymentMode === "PREPAID"
                                  ? "100% Online Prepaid"
                                  : ord.financials.paymentMode === "PARTIAL_COD"
                                  ? `Partial COD (₹${ord.financials.advanceAmountPaid} Adv)`
                                  : "Full COD"}
                              </span>

                              {/* Status Sub-badge */}
                              <span className="text-[10.5px] text-slate-500 flex items-center gap-1 font-medium">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  ord.financials.paymentStatus === "PAID"
                                    ? "bg-emerald-500"
                                    : ord.financials.paymentStatus === "PARTIALLY_PAID"
                                    ? "bg-indigo-500"
                                    : "bg-amber-500"
                                }`}></span>
                                {ord.financials.paymentStatus === "PAID"
                                  ? "Paid Online"
                                  : ord.financials.paymentStatus === "PARTIALLY_PAID"
                                  ? `Balance ₹${ord.financials.codBalanceDue} on Delivery`
                                  : "Payment Pending"}
                              </span>
                            </div>
                          </td>

                          {/* Total & Discount */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white">
                                ₹{ord.financials.totalAmount.toLocaleString("en-IN")}
                              </span>
                              {ord.financials.discountAmount > 0 ? (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <Percent size={9} /> Saved ₹{ord.financials.discountAmount}
                                  {ord.financials.discountPercent > 0 && ` (${ord.financials.discountPercent}% OFF)`}
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-slate-400">No discount</span>
                              )}
                            </div>
                          </td>

                          {/* Fulfillment Status */}
                          <td className="py-3.5 px-4">
                            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                              ord.fulfillment.status === "DELIVERED"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                : ord.fulfillment.status === "DISPATCHED"
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                                : ord.fulfillment.status === "PACKED"
                                ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                                : ord.fulfillment.status === "CANCELLED"
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                            }`}>
                              {ord.fulfillment.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSelectOrder(ord)}
                                title="View Details"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setInvoiceModalTab("invoice");
                                  setIsInvoiceModalOpen(true);
                                }}
                                title="Print Tax Invoice"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectOrder(ord);
                                  setEditItems(JSON.parse(JSON.stringify(ord.items)));
                                  setEditCustomer({
                                    name: ord.customer.name || "",
                                    phone: ord.customer.phone || "",
                                    fullAddress: ord.customer.fullAddress || "",
                                    city: ord.customer.city || "",
                                    state: ord.customer.state || "",
                                    pincode: ord.customer.pincode || ""
                                  });
                                  setEditDiscountType(ord.financials.discountPercent > 0 ? "PERCENT" : "FIXED");
                                  setEditDiscountValue(ord.financials.discountPercent > 0 ? ord.financials.discountPercent : ord.financials.discountAmount);
                                  setEditDiscountCode(ord.financials.discountCode || "");
                                  setEditShippingFee(ord.financials.shippingFee || 0);
                                  setEditPaymentMode(ord.financials.paymentMode || "PREPAID");
                                  setEditAdvanceAmount(ord.financials.advanceAmountPaid || 0);
                                  setIsEditingOrder(true);
                                }}
                                title="Edit Order (Shopify Mode)"
                                className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>

                              {ord.customer.whatsappPhone && (
                                <a
                                  href={`https://wa.me/${ord.customer.whatsappPhone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat on WhatsApp"
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  <MessageSquare size={14} />
                                </a>
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

      {/* TAB 2: CHECKOUT & FLOW SETTINGS (MOVED HERE PER USER REQUEST!) */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-6 max-w-4xl">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders size={18} className="text-indigo-600 dark:text-indigo-400" />
                WhatsApp Catalog Flow Checkout &amp; Address Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure how delivery addresses are collected via Meta WhatsApp Flow, auto-fill State &amp; City by 6-digit Pincode, and control payment policies (Prepaid discount, Partial COD advance token %, or Full COD).
              </p>
            </div>

            {/* 1. Toggle Flow Checkout */}
            <div className={`p-4 rounded-xl border transition-all ${
              recoverySettings.flowCheckoutEnabled !== false
                ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60"
                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin size={14} className="text-indigo-600 dark:text-indigo-400" />
                    Interactive WhatsApp Flow Address Collection
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    When customer sends catalog order, WhatsApp automatically opens an interactive Flow form to collect address with Pincode auto-fill before payment.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={recoverySettings.flowCheckoutEnabled !== false}
                  onChange={(e) => setRecoverySettings({ ...recoverySettings, flowCheckoutEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* 2. Allowed Payment Modes */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Allowed Payment Options in WhatsApp Checkout
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Prepaid */}
                <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  (recoverySettings.allowedPaymentModes || []).includes("PREPAID")
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600"
                }`}>
                  <input
                    type="checkbox"
                    checked={(recoverySettings.allowedPaymentModes || []).includes("PREPAID")}
                    onChange={(e) => {
                      const current = recoverySettings.allowedPaymentModes || [];
                      const updated = e.target.checked ? [...current, "PREPAID"] : current.filter((m: string) => m !== "PREPAID");
                      setRecoverySettings({ ...recoverySettings, allowedPaymentModes: updated });
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>100% Online Prepaid</span>
                </label>

                {/* Partial COD */}
                <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  (recoverySettings.allowedPaymentModes || []).includes("PARTIAL_COD")
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600"
                }`}>
                  <input
                    type="checkbox"
                    checked={(recoverySettings.allowedPaymentModes || []).includes("PARTIAL_COD")}
                    onChange={(e) => {
                      const current = recoverySettings.allowedPaymentModes || [];
                      const updated = e.target.checked ? [...current, "PARTIAL_COD"] : current.filter((m: string) => m !== "PARTIAL_COD");
                      setRecoverySettings({ ...recoverySettings, allowedPaymentModes: updated });
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Partial Advance COD</span>
                </label>

                {/* Full COD */}
                <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  (recoverySettings.allowedPaymentModes || []).includes("FULL_COD")
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600"
                }`}>
                  <input
                    type="checkbox"
                    checked={(recoverySettings.allowedPaymentModes || []).includes("FULL_COD")}
                    onChange={(e) => {
                      const current = recoverySettings.allowedPaymentModes || [];
                      const updated = e.target.checked ? [...current, "FULL_COD"] : current.filter((m: string) => m !== "FULL_COD");
                      setRecoverySettings({ ...recoverySettings, allowedPaymentModes: updated });
                    }}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>Full Cash on Delivery</span>
                </label>
              </div>
            </div>

            {/* 3. Partial COD Advance Rule */}
            {(recoverySettings.allowedPaymentModes || []).includes("PARTIAL_COD") && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Zap size={13} className="text-indigo-600 dark:text-indigo-400" />
                    Partial COD Token Advance Policy
                  </span>
                  <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRecoverySettings({ ...recoverySettings, partialCodMode: "PERCENTAGE" })}
                      className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                        (recoverySettings.partialCodMode || "PERCENTAGE") === "PERCENTAGE"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-slate-500"
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecoverySettings({ ...recoverySettings, partialCodMode: "FIXED" })}
                      className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                        recoverySettings.partialCodMode === "FIXED"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-slate-500"
                      }`}
                    >
                      Fixed Token (₹)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      {recoverySettings.partialCodMode === "FIXED" ? "Fixed Advance Token (₹)" : "Advance Token (%)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={recoverySettings.partialCodValue !== undefined ? recoverySettings.partialCodValue : 10}
                      onChange={(e) => setRecoverySettings({ ...recoverySettings, partialCodValue: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    <strong>Live Calculation:</strong> For a <strong>₹1,500</strong> order, customer pays{" "}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      ₹{recoverySettings.partialCodMode === "FIXED"
                        ? (recoverySettings.partialCodValue || 200)
                        : Math.round((1500 * (recoverySettings.partialCodValue || 10)) / 100)}
                    </strong>{" "}
                    token advance online, and remaining{" "}
                    <strong>
                      ₹{1500 - (recoverySettings.partialCodMode === "FIXED"
                        ? (recoverySettings.partialCodValue || 200)
                        : Math.round((1500 * (recoverySettings.partialCodValue || 10)) / 100))}
                    </strong>{" "}
                    as COD upon delivery.
                  </span>
                </div>
              </div>
            )}

            {/* 4. Meta Flow ID & 1-Click Sync */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Code2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                    Meta Flow ID (Required for In-WhatsApp Form)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Numeric Flow ID generated in Meta Business Suite.
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

              {/* Endpoint card */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Zap size={12} className="text-amber-500" />
                    Pincode Dynamic Auto-Fill Data Exchange Endpoint:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const origin = typeof window !== "undefined" ? window.location.origin : "https://what-in.tinkal.in";
                      navigator.clipboard.writeText(`${origin}/api/whatsapp/flows/endpoint`);
                      setCopiedEndpoint(true);
                      setTimeout(() => setCopiedEndpoint(false), 2000);
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedEndpoint ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedEndpoint ? "Copied!" : "Copy Endpoint"}</span>
                  </button>
                </div>
                <code className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 font-mono text-[10.5px] text-slate-800 dark:text-slate-300 select-all overflow-x-auto">
                  {typeof window !== "undefined" ? window.location.origin : "https://what-in.tinkal.in"}/api/whatsapp/flows/endpoint
                </code>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{savingSettings ? "Saving Settings..." : "Save Checkout & Flow Settings"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SHIPMENTS & TRACKING */}
      {activeTab === "shipments" && (
        <div className="flex flex-col gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck size={18} className="text-indigo-600 dark:text-indigo-400" />
              Live Shipments &amp; Tracking
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Monitor shipments across Delhivery, BlueDart, Shadowfax, and Shiprocket. Dispatch alerts are automatically sent to customers on WhatsApp.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {orders.filter(o => o.fulfillment.status === "DISPATCHED" || o.fulfillment.awbNumber).length === 0 ? (
                <div className="col-span-3 p-8 text-center text-slate-400 text-xs">
                  No orders currently in transit. Click on any order in the "All Orders" tab to mark as Dispatched and assign an AWB number!
                </div>
              ) : (
                orders.filter(o => o.fulfillment.status === "DISPATCHED" || o.fulfillment.awbNumber).map(ord => (
                  <div key={ord.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{ord.orderNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        In Transit
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-bold m-0">{ord.customer.name}</p>
                      <p className="text-[11px] text-slate-400 m-0">{ord.customer.city}, {ord.customer.pincode}</p>
                    </div>
                    {ord.fulfillment.awbNumber && (
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono flex items-center justify-between">
                        <span>AWB: {ord.fulfillment.awbNumber}</span>
                        {ord.fulfillment.trackingUrl && (
                          <a href={ord.fulfillment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5">
                            Track <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHOPIFY-STYLE ORDER DETAIL SLIDE-OVER / MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2 m-0">
                    Order {selectedOrder.orderNumber}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {selectedOrder.source}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {!isEditingOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    >
                      <Edit3 size={13} />
                      <span>Edit Order</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceModalTab("invoice");
                        setIsInvoiceModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <Printer size={13} />
                      <span>Print Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceModalTab("packingslip");
                        setIsInvoiceModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 shadow-2xs hidden sm:flex"
                    >
                      <FileText size={13} />
                      <span>Packing Slip</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingOrder(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Cancel Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    setIsEditingOrder(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body - If isEditingOrder is true: Render Edit Form; Else: Render Overview */}
            {isEditingOrder ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
                {/* Edit Mode Alert Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
                  <Edit3 size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                      Shopify Order Edit Mode
                    </span>
                    <span className="text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
                      Modify products, rates, quantities, discounts, shipping fees, or shipping address. All calculations update dynamically.
                    </span>
                  </div>
                </div>

                {/* 1. Line Items Editor */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Package size={13} className="text-indigo-600 dark:text-indigo-400" />
                      Order Line Items ({editItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {editItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Product Title</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                              placeholder="Product Title"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">SKU</label>
                            <input
                              type="text"
                              value={item.sku || ""}
                              onChange={(e) => handleUpdateItem(idx, "sku", e.target.value)}
                              placeholder="SKU"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div>
                            <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Rate (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(idx, "price", Math.max(0, Number(e.target.value) || 0))}
                              className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block font-semibold mb-0.5 text-center">Qty</label>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(idx, "quantity", Math.max(1, item.quantity - 1))}
                                className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-xs">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(idx, "quantity", item.quantity + 1)}
                                className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Total</label>
                            <span className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                              ₹{(item.quantity * item.price).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remove Item"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors mt-3 sm:mt-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Discounts & Shipping Charges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Discounts */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Tag size={13} className="text-emerald-600 dark:text-emerald-400" />
                        Discounts
                      </span>
                      <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setEditDiscountType("FIXED")}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            editDiscountType === "FIXED" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Fixed (₹)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDiscountType("PERCENT")}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            editDiscountType === "PERCENT" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Percent (%)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">
                          {editDiscountType === "PERCENT" ? "Rate (%)" : "Amount (₹)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={editDiscountType === "PERCENT" ? 100 : editSubtotal}
                          value={editDiscountValue}
                          onChange={(e) => setEditDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Reason / Code</label>
                        <input
                          type="text"
                          value={editDiscountCode}
                          onChange={(e) => setEditDiscountCode(e.target.value.toUpperCase())}
                          placeholder="e.g. VIP_SPECIAL"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                        />
                      </div>
                    </div>

                    {editDiscountAmount > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Deducting ₹{editDiscountAmount.toLocaleString("en-IN")} from total
                      </span>
                    )}
                  </div>

                  {/* Shipping Fee */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Truck size={13} className="text-indigo-600 dark:text-indigo-400" />
                      Shipping &amp; Delivery Fee
                    </span>

                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Shipping Charges (₹)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editShippingFee}
                          onChange={(e) => setEditShippingFee(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setEditShippingFee(0)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                        >
                          Free
                        </button>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-slate-400">
                      {editShippingFee === 0 ? "Free Shipping applied" : `₹${editShippingFee} shipping will be added`}
                    </span>
                  </div>
                </div>

                {/* 3. Customer & Shipping Address */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User size={13} className="text-indigo-600 dark:text-indigo-400" />
                    Customer Details &amp; Delivery Address
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Customer Name</label>
                      <input
                        type="text"
                        value={editCustomer.name}
                        onChange={(e) => setEditCustomer(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Phone / WhatsApp</label>
                      <input
                        type="text"
                        value={editCustomer.phone}
                        onChange={(e) => setEditCustomer(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Street Address</label>
                    <input
                      type="text"
                      value={editCustomer.fullAddress}
                      onChange={(e) => setEditCustomer(prev => ({ ...prev, fullAddress: e.target.value }))}
                      placeholder="Street, locality, area..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">City</label>
                      <input
                        type="text"
                        value={editCustomer.city}
                        onChange={(e) => setEditCustomer(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">State</label>
                      <input
                        type="text"
                        value={editCustomer.state}
                        onChange={(e) => setEditCustomer(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Pincode</label>
                      <input
                        type="text"
                        value={editCustomer.pincode}
                        onChange={(e) => setEditCustomer(prev => ({ ...prev, pincode: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Payment Terms & Split */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CreditCard size={13} className="text-indigo-600 dark:text-indigo-400" />
                    Payment Mode &amp; Cash on Delivery Split
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Payment Mode</label>
                      <select
                        value={editPaymentMode}
                        onChange={(e) => setEditPaymentMode(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
                      >
                        <option value="PREPAID">100% Prepaid Online</option>
                        <option value="PARTIAL_COD">Partial COD (Advance + COD)</option>
                        <option value="FULL_COD">Full Cash on Delivery (100% COD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Advance Received (₹)</label>
                      <input
                        type="number"
                        min="0"
                        max={editTotalAmount}
                        value={editAdvanceAmount}
                        onChange={(e) => setEditAdvanceAmount(Math.max(0, Number(e.target.value) || 0))}
                        disabled={editPaymentMode === "FULL_COD"}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Balance on Delivery (COD)</label>
                      <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                        ₹{editCodDue.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Overview View Mode (Original cards) */
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
                {/* 1. Customer Card & Delivery Address */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User size={13} className="text-indigo-600 dark:text-indigo-400" />
                      Customer Details &amp; Shipping Address
                    </span>
                    {selectedOrder.customer.whatsappPhone && (
                      <a
                        href={`https://wa.me/${selectedOrder.customer.whatsappPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                      >
                        <MessageSquare size={12} /> Chat on WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Mobile Phone</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{selectedOrder.customer.phone}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Verified Delivery Address</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 m-0">
                      {selectedOrder.customer.fullAddress}
                    </p>
                    {selectedOrder.customer.pincode && (
                      <span className="inline-block mt-1 text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        Pincode: {selectedOrder.customer.pincode}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Line Items Table */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Package size={13} className="text-indigo-600 dark:text-indigo-400" />
                      Order Items ({selectedOrder.items.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={11} /> Edit Items
                    </button>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10.5px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3">Rate</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedOrder.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {it.name}
                              {it.sku && <span className="block text-[10px] font-mono text-slate-400">SKU: {it.sku}</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono">₹{it.price.toLocaleString("en-IN")}</td>
                            <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono">₹{it.total.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Financial & Discount Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CreditCard size={13} className="text-indigo-600 dark:text-indigo-400" />
                      Payment &amp; Discount Breakdown
                    </span>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={11} /> Adjust Amounts
                    </button>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{selectedOrder.financials.subtotal.toLocaleString("en-IN")}</span>
                  </div>

                  {selectedOrder.financials.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>
                        Discount Applied {selectedOrder.financials.discountCode && `(${selectedOrder.financials.discountCode})`}
                      </span>
                      <span className="font-mono">-₹{selectedOrder.financials.discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Shipping &amp; Packaging</span>
                    <span className="font-mono font-semibold">
                      {selectedOrder.financials.shippingFee > 0
                        ? `₹${selectedOrder.financials.shippingFee.toLocaleString("en-IN")}`
                        : "FREE"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                    <span>Total Order Amount</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{selectedOrder.financials.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Advance & COD Split */}
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-[11.5px]">
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Advance Received Online:</span>
                      <span className="font-mono">₹{selectedOrder.financials.advanceAmountPaid.toLocaleString("en-IN")}</span>
                    </div>
                    {selectedOrder.financials.codBalanceDue > 0 && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                        <span>Cash on Delivery (Payable on Arrival):</span>
                        <span className="font-mono">₹{selectedOrder.financials.codBalanceDue.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {selectedOrder.financials.transactionId && (
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Transaction / UTR: {selectedOrder.financials.transactionId}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Fulfillment & Courier Dispatch */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Truck size={13} className="text-indigo-600 dark:text-indigo-400" />
                    Courier Tracking &amp; Status Update
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Courier Partner</label>
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. Delhivery / BlueDart / Shiprocket"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Tracking / AWB Number</label>
                      <input
                        type="text"
                        value={awbNumber}
                        onChange={(e) => setAwbNumber(e.target.value)}
                        placeholder="e.g. 14920491823"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendWhatsappCheckbox"
                      checked={sendWhatsAppOnUpdate}
                      onChange={(e) => setSendWhatsAppOnUpdate(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="sendWhatsappCheckbox" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                      Automatically send live tracking message to customer on WhatsApp
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateFulfillment("PACKED")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 cursor-pointer transition-all"
                    >
                      Mark as Packed
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateFulfillment("DISPATCHED")}
                      disabled={updatingStatus}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Truck size={12} />
                      <span>Mark as Dispatched</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateFulfillment("DELIVERED")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer transition-all"
                    >
                      Mark as Delivered
                    </button>
                  </div>
                </div>

                {/* 5. Quick WhatsApp Message Box */}
                {selectedOrder.customer.conversationId && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col gap-2.5 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-emerald-600" />
                      Quick WhatsApp Update to Customer
                    </span>

                    <textarea
                      rows={2}
                      value={quickMsg}
                      onChange={(e) => setQuickMsg(e.target.value)}
                      placeholder="Type a message to send directly to this customer on WhatsApp..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSendQuickMsg}
                        disabled={sendingQuickMsg || !quickMsg.trim()}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send size={12} />
                        <span>{sendingQuickMsg ? "Sending..." : "Send WhatsApp"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If in edit mode, render the sticky bottom save action bar */}
            {isEditingOrder && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div>Subtotal: <span className="font-mono font-bold">₹{editSubtotal.toLocaleString("en-IN")}</span></div>
                  {editDiscountAmount > 0 && (
                    <div className="text-emerald-600 font-semibold">
                      Discount: <span className="font-mono">-₹{editDiscountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {editShippingFee > 0 && (
                    <div>Ship: <span className="font-mono font-bold">+₹{editShippingFee.toLocaleString("en-IN")}</span></div>
                  )}
                  <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    Grand Total: <span className="font-mono">₹{editTotalAmount.toLocaleString("en-IN")}</span>
                  </div>
                  {editCodDue > 0 && (
                    <div className="text-amber-700 dark:text-amber-400 font-semibold text-[11.5px]">
                      (COD Due: ₹{editCodDue.toLocaleString("en-IN")})
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingOrder(false)}
                    disabled={savingEdit}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOrderEdits}
                    disabled={savingEdit}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>{savingEdit ? "Saving..." : "Save Order Changes"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Tax Invoice & Packing Slip Print Modal */}
      <OrderInvoiceModal
        order={selectedOrder}
        storeDetails={storeDetails}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        initialTab={invoiceModalTab}
      />

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
                  Endpoint: {typeof window !== "undefined" ? window.location.origin : "https://what-in.tinkal.in"}/api/whatsapp/flows/endpoint
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
