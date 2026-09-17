"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Tag,
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Flame,
  MessageSquare,
  Check,
  X,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Download,
  UserPlus,
  Phone,
  Building,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
  AlertCircle,
  Copy,
  Layers,
  ArrowUpDown
} from "lucide-react";
import {
  getAllWhatsAppTagsWithCountsAction,
  createWhatsAppTagAction,
  updateWhatsAppTagAction,
  deleteWhatsAppTagAction,
  getTagCustomersAction,
  addTagToCustomersAction,
  removeTagFromCustomerAction,
  searchAvailableCustomersForTagAction
} from "@/app/actions/whatsAppPlatformActions";

const COLOR_PALETTE = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Slate", hex: "#64748b" },
  { name: "Lime", hex: "#84cc16" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Crimson", hex: "#e11d48" }
];

export interface TagWithMetrics {
  id: string;
  name: string;
  color: string;
  createdAt: string | Date;
  customerCount: number;
  conversationCount: number;
  totalRevenue: number;
  totalOrders: number;
  hotLeadsCount: number;
}

export default function WhatsAppTagManagerComponent() {
  const router = useRouter();

  // State
  const [tags, setTags] = useState<TagWithMetrics[]>([]);
  const [stats, setStats] = useState({
    totalTags: 0,
    totalCustomers: 0,
    totalTaggedCustomers: 0,
    untaggedCustomersCount: 0,
    tagCoveragePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"customers" | "revenue" | "name" | "newest">("customers");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Create / Edit Tag Modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithMetrics | null>(null);
  const [tagNameInput, setTagNameInput] = useState("");
  const [tagColorInput, setTagColorInput] = useState("#6366f1");
  const [savingTag, setSavingTag] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete Confirmation Modal
  const [tagToDelete, setTagToDelete] = useState<TagWithMetrics | null>(null);
  const [untagCustomersOnDelete, setUntagCustomersOnDelete] = useState(true);
  const [deletingTag, setDeletingTag] = useState(false);

  // Customer Cohort Drawer ("See its customers and all")
  const [activeDrawerTag, setActiveDrawerTag] = useState<TagWithMetrics | null>(null);
  const [drawerCustomers, setDrawerCustomers] = useState<any[]>([]);
  const [drawerSummary, setDrawerSummary] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportingDrawer, setExportingDrawer] = useState(false);

  // Add Customer to Active Tag Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [candidateCustomers, setCandidateCustomers] = useState<any[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [assigningCandidates, setAssigningCandidates] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Fetch tags with metrics
  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await getAllWhatsAppTagsWithCountsAction();
      if (res.success && res.tags) {
        setTags(res.tags as any);
        if (res.stats) setStats(res.stats);
      } else {
        showToast(res.error || "Failed to load tags", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error loading tags", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // 2. Fetch customers for active drawer tag
  const fetchDrawerCustomers = async (tagName: string, search = "") => {
    setDrawerLoading(true);
    try {
      const res = await getTagCustomersAction({ tagName, search, limit: 150 });
      if (res.success) {
        setDrawerCustomers(res.customers || []);
        if (res.summary) setDrawerSummary(res.summary);
      } else {
        showToast(res.error || "Failed to load tag customers", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load tag customers", "error");
    }
    setDrawerLoading(false);
  };

  useEffect(() => {
    if (activeDrawerTag) {
      fetchDrawerCustomers(activeDrawerTag.name, drawerSearch);
    }
  }, [activeDrawerTag, drawerSearch]);

  // 3. Search untagged candidates for the active tag
  const fetchCandidates = async (search = "") => {
    if (!activeDrawerTag) return;
    setCandidateLoading(true);
    try {
      const res = await searchAvailableCustomersForTagAction({
        tagName: activeDrawerTag.name,
        search
      });
      if (res.success) {
        setCandidateCustomers(res.customers || []);
      }
    } catch (e) {}
    setCandidateLoading(false);
  };

  useEffect(() => {
    if (showAddCustomerModal) {
      fetchCandidates(candidateSearch);
    }
  }, [showAddCustomerModal, candidateSearch]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTag(null);
    setTagNameInput("");
    setTagColorInput(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].hex);
    setModalError("");
    setShowTagModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tag: TagWithMetrics) => {
    setEditingTag(tag);
    setTagNameInput(tag.name);
    setTagColorInput(tag.color || "#6366f1");
    setModalError("");
    setShowTagModal(true);
  };

  // Save Tag (Create or Edit)
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tagNameInput.trim();
    if (!cleanName || cleanName.length < 2) {
      setModalError("Tag name must be at least 2 characters.");
      return;
    }

    setSavingTag(true);
    setModalError("");

    try {
      if (editingTag) {
        // Edit mode
        const res = await updateWhatsAppTagAction({
          id: editingTag.id,
          oldName: editingTag.name,
          newName: cleanName,
          color: tagColorInput
        });

        if (res.success) {
          showToast(`Tag "${cleanName}" updated successfully!`);
          setShowTagModal(false);
          fetchTags();
          if (activeDrawerTag?.id === editingTag.id) {
            setActiveDrawerTag({
              ...activeDrawerTag,
              name: cleanName,
              color: tagColorInput
            });
          }
        } else {
          setModalError(res.error || "Failed to update tag");
        }
      } else {
        // Create mode
        const res = await createWhatsAppTagAction({
          name: cleanName,
          color: tagColorInput
        });

        if (res.success) {
          showToast(`Tag "${cleanName}" created successfully!`);
          setShowTagModal(false);
          fetchTags();
        } else {
          setModalError(res.error || "Failed to create tag");
        }
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to save tag");
    }
    setSavingTag(false);
  };

  // Delete Tag
  const handleDeleteTag = async () => {
    if (!tagToDelete) return;
    setDeletingTag(true);
    try {
      const res = await deleteWhatsAppTagAction({
        id: tagToDelete.id,
        name: tagToDelete.name,
        untagCustomers: untagCustomersOnDelete
      });

      if (res.success) {
        showToast(`Tag "${tagToDelete.name}" deleted.`);
        setTagToDelete(null);
        if (activeDrawerTag?.id === tagToDelete.id) {
          setActiveDrawerTag(null);
        }
        fetchTags();
      } else {
        showToast(res.error || "Failed to delete tag", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete tag", "error");
    }
    setDeletingTag(false);
  };

  // Remove tag from single customer inside drawer
  const handleRemoveTagFromCustomer = async (customerId: string, customerName: string) => {
    if (!activeDrawerTag) return;
    try {
      const res = await removeTagFromCustomerAction({
        tagName: activeDrawerTag.name,
        customerId
      });
      if (res.success) {
        showToast(`Removed tag from ${customerName}`);
        fetchDrawerCustomers(activeDrawerTag.name, drawerSearch);
        fetchTags();
      } else {
        showToast(res.error || "Failed to untag customer", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to untag customer", "error");
    }
  };

  // Add selected candidate customers to active tag
  const handleAssignCandidates = async () => {
    if (!activeDrawerTag || selectedCandidateIds.length === 0) return;
    setAssigningCandidates(true);
    try {
      const res = await addTagToCustomersAction({
        tagName: activeDrawerTag.name,
        customerIds: selectedCandidateIds
      });
      if (res.success) {
        showToast(`Tagged ${res.count} customers as "${activeDrawerTag.name}"`);
        setShowAddCustomerModal(false);
        setSelectedCandidateIds([]);
        fetchDrawerCustomers(activeDrawerTag.name, drawerSearch);
        fetchTags();
      } else {
        showToast(res.error || "Failed to assign tag", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to assign tag", "error");
    }
    setAssigningCandidates(false);
  };

  // Export drawer customer cohort to Excel
  const handleExportCohort = () => {
    if (!activeDrawerTag || drawerCustomers.length === 0) return;
    setExportingDrawer(true);
    try {
      const rows = drawerCustomers.map((c) => ({
        "Customer Name": c.name,
        "Business Name": c.businessName || "",
        "Mobile Number": c.mobile,
        "WhatsApp Number": c.whatsappNumber || c.mobile,
        "Customer Type": c.customerType,
        "Lead Stage": c.leadStage,
        "Temperature": c.temperature,
        "Total Orders": c.totalOrders,
        "Total Spend (INR)": c.totalPurchaseValue,
        "All Tags": (c.tags || []).join(", "),
        "Last Contact Date": c.lastContactDate ? new Date(c.lastContactDate).toLocaleString("en-IN") : ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tagged Customers");
      XLSX.writeFile(
        workbook,
        `tag_${activeDrawerTag.name.toLowerCase().replace(/\s+/g, "_")}_customers.xlsx`
      );
      showToast(`Exported ${rows.length} customers to Excel.`);
    } catch (e: any) {
      showToast("Failed to export Excel file", "error");
    }
    setExportingDrawer(false);
  };

  // Filtered & Sorted Tags
  const filteredTags = useMemo(() => {
    let list = [...tags];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "customers") return b.customerCount - a.customerCount;
      if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return list;
  }, [tags, searchQuery, sortBy]);

  // Top metric highlights
  const topTagByRevenue = useMemo(() => {
    if (tags.length === 0) return null;
    return [...tags].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  }, [tags]);

  const topTagByReach = useMemo(() => {
    if (tags.length === 0) return null;
    return [...tags].sort((a, b) => b.customerCount - a.customerCount)[0];
  }, [tags]);

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold border transition-all transform duration-300 ${
            toastMsg.type === "success"
              ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
              : "bg-red-500 text-white border-red-600 shadow-red-500/20"
          }`}
        >
          {toastMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <Tag size={14} />
            <span>Audience Segments & Taxonomy</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Tag Manager</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {stats.totalTags} Active
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Create and color-code smart customer tags. Click any tag to view its assigned customer cohort, lead stages, and revenue metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push("/whatsapp/contacts")}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/60 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Users size={14} />
            <span>View All Contacts</span>
          </button>
          <button
            type="button"
            onClick={fetchTags}
            disabled={loading}
            className="p-2.5 rounded-2xl text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/60 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition cursor-pointer"
            title="Refresh tags"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Create New Tag</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Tags */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Tags</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Tag size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalTags}</span>
            <span className="text-xs font-medium text-gray-400">active categories</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500" />
            <span>Used for broadcasts & CRM routing</span>
          </div>
        </div>

        {/* Metric 2: Tagged Coverage */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs relative overflow-hidden group hover:border-emerald-200 dark:hover:border-emerald-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tagged Audience</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.totalTaggedCustomers}
            </span>
            <span className="text-xs font-semibold text-gray-500">
              ({stats.tagCoveragePercentage}% of {stats.totalCustomers})
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.tagCoveragePercentage)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Highest Reach Tag */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs relative overflow-hidden group hover:border-amber-200 dark:hover:border-amber-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Largest Cohort</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            {topTagByReach ? (
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 truncate max-w-[150px]"
                  style={{
                    backgroundColor: `${topTagByReach.color}15`,
                    color: topTagByReach.color,
                    border: `1px solid ${topTagByReach.color}40`
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topTagByReach.color }} />
                  {topTagByReach.name}
                </span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {topTagByReach.customerCount} leads
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-gray-400">No tags yet</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Most frequent segment in customer base
          </p>
        </div>

        {/* Metric 4: Highest Value Tag */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs relative overflow-hidden group hover:border-purple-200 dark:hover:border-purple-800 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Revenue Segment</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white truncate">
              {topTagByRevenue ? `₹${topTagByRevenue.totalRevenue.toLocaleString("en-IN")}` : "₹0"}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
            {topTagByRevenue ? (
              <span className="font-semibold text-purple-600 dark:text-purple-400 truncate">
                from &quot;{topTagByRevenue.name}&quot; ({topTagByRevenue.totalOrders} orders)
              </span>
            ) : (
              <span>Calculated from customer order totals</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tags by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-900 p-1 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs font-medium">
            <span className="text-gray-400 px-2 flex items-center gap-1">
              <ArrowUpDown size={12} />
              <span>Sort:</span>
            </span>
            <button
              onClick={() => setSortBy("customers")}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                sortBy === "customers"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setSortBy("revenue")}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                sortBy === "revenue"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                sortBy === "name"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              A–Z
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-900 p-1 rounded-2xl border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tag Content */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700">
          <RefreshCw className="animate-spin text-indigo-600 w-8 h-8 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Loading tags and customer segments...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 p-8">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mb-4">
            <Tag size={28} />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
            {searchQuery ? `No tags matching "${searchQuery}"` : "No tags created yet"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
            {searchQuery
              ? "Try searching for a different keyword or create a new tag with this name."
              : "Organize contacts into high-converting segments like VIP, Wholesale, Lead, or Inquiry."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Your First Tag</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTags.map((tag) => {
            const isSelected = activeDrawerTag?.id === tag.id;
            return (
              <div
                key={tag.id}
                className={`bg-white dark:bg-slate-800 rounded-3xl border p-5 transition-all relative flex flex-col justify-between group hover:shadow-lg ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                    : "border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Tag Pill & Actions */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="px-3 py-1.5 rounded-2xl text-xs font-extrabold tracking-wide flex items-center gap-2 shadow-xs transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                        border: `1.5px solid ${tag.color}40`
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate max-w-[150px]">{tag.name}</span>
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(tag)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition cursor-pointer"
                        title="Edit Tag Name & Color"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setTagToDelete(tag);
                          setUntagCustomersOnDelete(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition cursor-pointer"
                        title="Delete Tag"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Customer Metrics */}
                  <div className="mt-5 grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Customers</span>
                      <div className="text-base font-black text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                        <Users size={14} className="text-indigo-500" />
                        <span>{tag.customerCount}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Spend Volume</span>
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate mt-1">
                        ₹{tag.totalRevenue.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Meta Indicators */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Flame size={12} className={tag.hotLeadsCount > 0 ? "text-amber-500" : "text-gray-300"} />
                      <span>{tag.hotLeadsCount} Hot Leads</span>
                    </span>
                    <span>{tag.totalOrders} Orders</span>
                  </div>
                </div>

                {/* Card Footer: See Customers CTA */}
                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-700/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawerTag(tag);
                      setDrawerSearch("");
                    }}
                    className="flex-1 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Users size={13} />
                    <span>View Customers ({tag.customerCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/whatsapp/contacts?tag=${encodeURIComponent(tag.name)}`)}
                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition cursor-pointer"
                    title="Filter in Contacts table"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Tag Name & Color</th>
                  <th className="py-3.5 px-4">Assigned Customers</th>
                  <th className="py-3.5 px-4">Total Revenue</th>
                  <th className="py-3.5 px-4">Orders</th>
                  <th className="py-3.5 px-4">Lead Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 font-medium text-gray-700 dark:text-gray-300">
                {filteredTags.map((tag) => (
                  <tr
                    key={tag.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition cursor-pointer"
                    onClick={() => {
                      setActiveDrawerTag(tag);
                      setDrawerSearch("");
                    }}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${tag.color}15`,
                            color: tag.color,
                            border: `1px solid ${tag.color}40`
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {tag.color.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-indigo-500" />
                        {tag.customerCount} customers
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{tag.totalRevenue.toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 px-4">{tag.totalOrders}</td>
                    <td className="py-4 px-4">
                      <span className="flex items-center gap-1 text-xs">
                        <Flame size={12} className={tag.hotLeadsCount > 0 ? "text-amber-500" : "text-gray-300"} />
                        <span>{tag.hotLeadsCount} Hot</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrawerTag(tag);
                            setDrawerSearch("");
                          }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Users size={12} />
                          <span>View Customers</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tag)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Edit Tag"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTagToDelete(tag);
                            setUntagCustomersOnDelete(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Delete Tag"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CUSTOMER DRAWER ("See its customers and all") */}
      {/* ------------------------------------------------------------- */}
      {activeDrawerTag && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col border-l border-gray-100 dark:border-slate-700 animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-start justify-between gap-4 bg-gray-50/50 dark:bg-slate-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
                    style={{
                      backgroundColor: `${activeDrawerTag.color}20`,
                      color: activeDrawerTag.color,
                      border: `1.5px solid ${activeDrawerTag.color}50`
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeDrawerTag.color }} />
                    {activeDrawerTag.name}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    Cohort Details & Customer List
                  </span>
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1.5">
                  Customers with &quot;{activeDrawerTag.name}&quot; Tag
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  View, filter, message, or remove customers from this tag.
                </p>
              </div>

              <button
                onClick={() => setActiveDrawerTag(null)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Summary Ribbon */}
            <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100/60 dark:border-indigo-900/30 text-center">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Customers</span>
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  {drawerSummary?.totalCustomers ?? drawerCustomers.length}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Total Revenue</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(drawerSummary?.totalRevenue ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Orders</span>
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  {drawerSummary?.totalOrders ?? 0}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Hot Leads</span>
                <p className="text-sm font-black text-amber-500 flex items-center justify-center gap-0.5">
                  <Flame size={13} />
                  <span>{drawerSummary?.hotCount ?? 0}</span>
                </p>
              </div>
            </div>

            {/* Drawer Filter & Action Bar */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search customer, business, phone..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                />
                {drawerSearch && (
                  <button
                    onClick={() => setDrawerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(true);
                    setSelectedCandidateIds([]);
                    setCandidateSearch("");
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={13} />
                  <span>+ Add Customer to Tag</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCohort}
                  disabled={exportingDrawer || drawerCustomers.length === 0}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                  title="Export this cohort to Excel"
                >
                  <Download size={14} className={exportingDrawer ? "animate-bounce" : ""} />
                </button>
              </div>
            </div>

            {/* Customer List Container */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {drawerLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <RefreshCw className="animate-spin text-indigo-600 w-6 h-6 mb-2" />
                  <p className="text-xs text-gray-500 font-semibold">Loading cohort members...</p>
                </div>
              ) : drawerCustomers.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <Users size={32} className="text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No customers found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    {drawerSearch
                      ? `No customers in "${activeDrawerTag.name}" match "${drawerSearch}".`
                      : `No customers are assigned to "${activeDrawerTag.name}" yet.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    + Tag Customers Now
                  </button>
                </div>
              ) : (
                drawerCustomers.map((cust) => {
                  const initials = cust.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={cust.id}
                      className="p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-all shadow-2xs flex flex-col gap-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs shadow-2xs text-white"
                            style={{ backgroundColor: activeDrawerTag.color }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                {cust.name}
                              </h4>
                              {cust.temperature === "HOT" && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-600 border border-red-200 dark:border-red-900 flex items-center gap-0.5">
                                  <Flame size={10} /> HOT
                                </span>
                              )}
                            </div>
                            {cust.businessName && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                <Building size={11} />
                                <span>{cust.businessName}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <Phone size={11} className="text-gray-400" />
                                {cust.mobile}
                              </span>
                              <button
                                onClick={() => copyToClipboard(cust.mobile, cust.id)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Copy Phone Number"
                              >
                                {copiedId === cust.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action: Chat & Untag */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/whatsapp/inbox?phone=${encodeURIComponent(cust.mobile)}`)}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                            title="Open in WhatsApp Inbox"
                          >
                            <MessageSquare size={12} />
                            <span>Chat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTagFromCustomer(cust.id, cust.name)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                            title={`Remove "${activeDrawerTag.name}" tag from this contact`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Orders & All Tags preview */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span>
                            Orders: <strong className="text-gray-800 dark:text-gray-200">{cust.totalOrders}</strong>
                          </span>
                          <span>
                            Spend:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              ₹{Number(cust.totalPurchaseValue).toLocaleString("en-IN")}
                            </strong>
                          </span>
                        </div>

                        {/* Other tags */}
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px]">
                          {cust.tags
                            .filter((t: string) => t.toLowerCase() !== activeDrawerTag.name.toLowerCase())
                            .slice(0, 3)
                            .map((ot: string) => (
                              <span
                                key={ot}
                                className="px-1.5 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 whitespace-nowrap"
                              >
                                {ot}
                              </span>
                            ))}
                          {cust.tags.length > 4 && (
                            <span className="text-[10px] text-gray-400">+{cust.tags.length - 4}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Showing {drawerCustomers.length} tagged contacts
              </span>
              <button
                type="button"
                onClick={() => setActiveDrawerTag(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD CUSTOMERS TO TAG MODAL */}
      {/* ------------------------------------------------------------- */}
      {showAddCustomerModal && activeDrawerTag && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus size={16} className="text-indigo-600" />
                  <span>Assign Tag to Customers</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select contacts to tag as &quot;<strong>{activeDrawerTag.name}</strong>&quot;
                </p>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search contacts by name or phone..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-[220px]">
              {candidateLoading ? (
                <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center">
                  <RefreshCw className="animate-spin text-indigo-600 w-5 h-5 mb-2" />
                  Searching available contacts...
                </div>
              ) : candidateCustomers.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  No matching untagged contacts found.
                </div>
              ) : (
                candidateCustomers.map((cand) => {
                  const isChecked = selectedCandidateIds.includes(cand.id);
                  return (
                    <label
                      key={cand.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                        isChecked
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800"
                          : "bg-gray-50/50 dark:bg-slate-900/40 border-gray-100 dark:border-slate-800 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidateIds([...selectedCandidateIds, cand.id]);
                            } else {
                              setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== cand.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded-md border-gray-300 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{cand.name}</p>
                          <p className="text-[11px] text-gray-400">{cand.phone} • {cand.customerType}</p>
                        </div>
                      </div>
                      {cand.tags.length > 0 && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {cand.tags.slice(0, 2).join(", ")}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                {selectedCandidateIds.length} contacts selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignCandidates}
                  disabled={assigningCandidates || selectedCandidateIds.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {assigningCandidates ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Apply Tag</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE / EDIT TAG MODAL */}
      {/* ------------------------------------------------------------- */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: tagColorInput }}
                >
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    {editingTag ? "Edit Tag & Color" : "Create New Tag"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {editingTag ? "Rename or customize color of this tag" : "Add a custom classification tag"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTagModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="p-6 flex flex-col gap-5">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Tag Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Client, Wholesale Buyer, Inquiry..."
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                />
                {editingTag && editingTag.name.toLowerCase() !== tagNameInput.trim().toLowerCase() && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>Renaming will update all {editingTag.customerCount} assigned customers automatically.</span>
                  </p>
                )}
              </div>

              {/* Tag Color Picker Palette */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Tag Color
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-500 uppercase">
                      {tagColorInput}
                    </span>
                    <input
                      type="color"
                      value={tagColorInput}
                      onChange={(e) => setTagColorInput(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent"
                      title="Pick custom hex color"
                    />
                  </div>
                </div>

                {/* 14 Presets Swatches */}
                <div className="grid grid-cols-7 gap-2.5">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = tagColorInput.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setTagColorInput(c.hex)}
                        className={`h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-indigo-500 scale-105 shadow-md"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700/80 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Live Tag Badge Preview
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1.5 rounded-2xl text-xs font-extrabold tracking-wide flex items-center gap-2 shadow-2xs"
                    style={{
                      backgroundColor: `${tagColorInput}18`,
                      color: tagColorInput,
                      border: `1.5px solid ${tagColorInput}50`
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tagColorInput }} />
                    {tagNameInput.trim() || "Tag Preview"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Appears in Contacts table, chat threads, and broadcasts.
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTag}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  {savingTag ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingTag ? "Save Changes" : "Create Tag"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {tagToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-700 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Delete &quot;{tagToDelete.name}&quot; Tag?
                </h3>
                <p className="text-xs text-gray-400">
                  This tag is assigned to {tagToDelete.customerCount} customers.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to permanently delete this tag? You can choose whether to remove it from existing customers or keep customer profiles intact.
            </p>

            <label className="p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 flex items-center gap-3 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={untagCustomersOnDelete}
                onChange={(e) => setUntagCustomersOnDelete(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded-md border-gray-300 focus:ring-red-500"
              />
              <span>Remove this tag from all {tagToDelete.customerCount} contacts (Recommended)</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTagToDelete(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-2xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTag}
                disabled={deletingTag}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {deletingTag ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Delete Tag</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
