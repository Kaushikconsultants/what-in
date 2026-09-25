"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Plus,
  Info,
  AlertTriangle,
  Wrench,
  Sparkles,
  Trash2,
  Play,
  Pause,
  X,
  Send,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Edit3,
  RefreshCw,
  Eye,
  Check,
  Zap,
  Timer,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  updateAnnouncementAction,
  toggleAnnouncementAction,
  deleteAnnouncementAction
} from "@/app/actions/ownerPortalActions";

const TYPE_CONFIG: Record<string, {
  label: string;
  icon: any;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
}> = {
  MAINTENANCE: {
    label: "Maintenance Notice",
    icon: Wrench,
    bg: "bg-rose-50 dark:bg-rose-950/60",
    border: "border-rose-200 dark:border-rose-800/80",
    text: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-100 dark:bg-rose-900/80",
    badgeText: "text-rose-700 dark:text-rose-200"
  },
  WARNING: {
    label: "Important Alert",
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/60",
    border: "border-amber-200 dark:border-amber-800/80",
    text: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-100 dark:bg-amber-900/80",
    badgeText: "text-amber-800 dark:text-amber-200"
  },
  SUCCESS: {
    label: "Feature Update",
    icon: Sparkles,
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    border: "border-emerald-200 dark:border-emerald-800/80",
    text: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/80",
    badgeText: "text-emerald-800 dark:text-emerald-200"
  },
  INFO: {
    label: "General Info",
    icon: Megaphone,
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    border: "border-indigo-200 dark:border-indigo-800/80",
    text: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/80",
    badgeText: "text-indigo-800 dark:text-indigo-200"
  },
};

export default function OwnerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<"ALL" | "LIVE" | "SCHEDULED" | "EXPIRED" | "PAUSED">("ALL");
  const router = useRouter();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "MAINTENANCE",
    targetPlan: "ALL",
    startMode: "NOW", // "NOW" | "SCHEDULED"
    startsAt: "",
    expiryPreset: "NEVER", // "1H" | "6H" | "24H" | "3D" | "7D" | "CUSTOM" | "NEVER"
    expiresAt: ""
  });

  useEffect(() => {
    const authed = sessionStorage.getItem("owner_authed");
    if (authed === "1") {
      load();
    } else {
      fetch("/api/owner/verify").then(r => {
        if (!r.ok) router.push("/owner/login");
        else { sessionStorage.setItem("owner_authed", "1"); load(); }
      }).catch(() => router.push("/owner/login"));
    }
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await getAnnouncementsAction();
    if (res.success && res.announcements) {
      setAnnouncements(res.announcements);
    }
    setLoading(false);
  };

  const getAnnouncementStatus = (a: any) => {
    if (!a.isActive) return { status: "PAUSED", label: "Paused", color: "text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700", dot: "bg-slate-400" };
    const now = new Date();
    if (a.startsAt && new Date(a.startsAt) > now) {
      return { status: "SCHEDULED", label: "Scheduled", color: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800", dot: "bg-blue-500 animate-pulse" };
    }
    if (a.expiresAt && new Date(a.expiresAt) < now) {
      return { status: "EXPIRED", label: "Expired", color: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800", dot: "bg-rose-500" };
    }
    return { status: "LIVE", label: "Live Now", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500 animate-ping" };
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      message: "",
      type: "MAINTENANCE",
      targetPlan: "ALL",
      startMode: "NOW",
      startsAt: "",
      expiryPreset: "24H",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    });
    setShowModal(true);
  };

  const handleOpenEdit = (a: any) => {
    setEditingId(a.id);
    const hasScheduledStart = a.startsAt && new Date(a.startsAt) > new Date();
    setForm({
      title: a.title,
      message: a.message,
      type: a.type || "INFO",
      targetPlan: a.targetPlan || "ALL",
      startMode: hasScheduledStart ? "SCHEDULED" : "NOW",
      startsAt: a.startsAt ? new Date(a.startsAt).toISOString().slice(0, 16) : "",
      expiryPreset: a.expiresAt ? "CUSTOM" : "NEVER",
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : ""
    });
    setShowModal(true);
  };

  const handleApplyExpiryPreset = (preset: string) => {
    const now = new Date();
    let targetExpiry: Date | null = null;

    if (preset === "1H") targetExpiry = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    else if (preset === "6H") targetExpiry = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    else if (preset === "24H") targetExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    else if (preset === "3D") targetExpiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    else if (preset === "7D") targetExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    else if (preset === "NEVER") targetExpiry = null;

    setForm(prev => ({
      ...prev,
      expiryPreset: preset,
      expiresAt: targetExpiry ? targetExpiry.toISOString().slice(0, 16) : ""
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      alert("Please provide both Title and Message content.");
      return;
    }

    setSubmitting(true);
    const payload = {
      title: form.title,
      message: form.message,
      type: form.type,
      targetPlan: form.targetPlan,
      startsAt: form.startMode === "SCHEDULED" && form.startsAt ? form.startsAt : undefined,
      expiresAt: form.expiresAt ? form.expiresAt : undefined
    };

    let res: any;
    if (editingId) {
      res = await updateAnnouncementAction(editingId, {
        ...payload,
        startsAt: payload.startsAt || null,
        expiresAt: payload.expiresAt || null
      });
    } else {
      res = await createAnnouncementAction(payload);
    }

    setSubmitting(false);
    if (res.success) {
      setShowModal(false);
      load();
    } else {
      alert("Error: " + (res.error || "Failed to save announcement"));
    }
  };

  const handleToggle = async (a: any) => {
    const res = await toggleAnnouncementAction(a.id, !a.isActive);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this broadcast notification?")) return;
    const res = await deleteAnnouncementAction(id);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  const filtered = announcements.filter(a => {
    if (statusTab === "ALL") return true;
    const { status } = getAnnouncementStatus(a);
    return status === statusTab;
  });

  const liveCount = announcements.filter(a => getAnnouncementStatus(a).status === "LIVE").length;
  const scheduledCount = announcements.filter(a => getAnnouncementStatus(a).status === "SCHEDULED").length;
  const expiredCount = announcements.filter(a => getAnnouncementStatus(a).status === "EXPIRED").length;
  const pausedCount = announcements.filter(a => getAnnouncementStatus(a).status === "PAUSED").length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      
      {/* 🌟 Top Header Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md">
              <Megaphone size={13} className="text-amber-400" /> Multi-Tenant System Broadcasts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            In-App Broadcasts & Scheduling Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Publish maintenance banners, important system alerts, and feature updates across all client dashboards with exact time windows.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            title="Refresh Broadcasts"
            className="p-3 rounded-2xl text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw size={17} className={loading ? "animate-spin text-indigo-400" : ""} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-600/30 flex items-center gap-2.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-indigo-400/30"
          >
            <Plus size={18} />
            <span>Create New Broadcast</span>
          </button>
        </div>
      </div>

      {/* 📊 KPI & Status Tabs Suite */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: "ALL", label: "All Broadcasts", count: announcements.length },
            { id: "LIVE", label: "Live Now", count: liveCount, color: "text-emerald-600 dark:text-emerald-400" },
            { id: "SCHEDULED", label: "Scheduled", count: scheduledCount, color: "text-blue-600 dark:text-blue-400" },
            { id: "EXPIRED", label: "Expired", count: expiredCount, color: "text-rose-600 dark:text-rose-400" },
            { id: "PAUSED", label: "Paused", count: pausedCount, color: "text-slate-500 dark:text-slate-400" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                statusTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                statusTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700 " + (tab.color || "text-slate-600 dark:text-slate-300")
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-bold">
          <Zap size={13} className="text-amber-500" />
          <span>Broadcasts automatically appear at the top of client inboxes & dashboards</span>
        </div>

      </div>

      {/* 📋 Broadcasts List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs font-bold">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p>Loading scheduled broadcasts & announcements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
              <Megaphone size={30} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">No matching broadcasts</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Click Create New Broadcast above to schedule or publish a maintenance or feature alert.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              + Create Broadcast
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {filtered.map((a) => {
              const conf = TYPE_CONFIG[a.type] || TYPE_CONFIG.INFO;
              const Icon = conf.icon;
              const status = getAnnouncementStatus(a);

              return (
                <div
                  key={a.id}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${conf.bg} ${conf.border} ${conf.text} shadow-xs`}>
                      <Icon size={22} className="animate-pulse" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      
                      {/* Title & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          {a.title}
                        </span>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${conf.bg} ${conf.border} ${conf.text}`}>
                          {conf.label}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>

                      {/* Message body */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {a.message}
                      </p>

                      {/* Schedule Timing Chips */}
                      <div className="pt-1.5 flex items-center gap-3 flex-wrap text-[11px] text-slate-400">
                        <span>Target: <b className="text-slate-700 dark:text-slate-300 font-bold">{a.targetPlan}</b></span>
                        <span>•</span>

                        {a.startsAt && (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Clock size={11} className="text-blue-500" />
                            <span>Starts: <b>{new Date(a.startsAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</b></span>
                          </span>
                        )}

                        {a.expiresAt ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Timer size={11} className="text-amber-500" />
                            <span>Expires: <b>{new Date(a.expiresAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</b></span>
                          </span>
                        ) : (
                          <span className="text-slate-400">No Expiry (Permanent)</span>
                        )}

                        <span>•</span>
                        <span>Created {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>

                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleToggle(a)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                        a.isActive
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border-slate-200 dark:border-slate-700"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {a.isActive ? <Pause size={13} /> : <Play size={13} />}
                      <span>{a.isActive ? "Pause" : "Resume"}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(a)}
                      title="Edit Broadcast & Schedule"
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(a.id)}
                      title="Delete Permanently"
                      className="p-2 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 📢 MODAL: CREATE / EDIT BROADCAST WITH TIME SCHEDULING     */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Megaphone size={20} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {editingId ? "Edit Tenant Broadcast" : "Publish & Schedule Tenant Broadcast"}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Configure announcement banner content, alert type, and active start/expiry schedule.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Alert Type Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Broadcast Alert Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([typeKey, conf]) => {
                    const Icon = conf.icon;
                    const isSelected = form.type === typeKey;
                    return (
                      <div
                        key={typeKey}
                        onClick={() => setForm({ ...form, type: typeKey })}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 ${
                          isSelected
                            ? `${conf.bg} ${conf.border} ring-2 ring-indigo-500/30 font-black`
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Icon size={18} className={conf.text} />
                        <span className={`text-xs font-black ${isSelected ? conf.text : "text-slate-700 dark:text-slate-300"}`}>
                          {conf.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title & Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Headline Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Maintenance: Meta API Upgrades"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Detailed Message Content *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the update or maintenance window clearly..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Target Audience
                </label>
                <select
                  value={form.targetPlan}
                  onChange={e => setForm({ ...form, targetPlan: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="ALL">All Clients (Universal Broadcast)</option>
                  <option value="STARTER">Starter Tier Only</option>
                  <option value="GROWTH">Growth Tier Only</option>
                  <option value="BUSINESS">Business Pro Only</option>
                  <option value="ENTERPRISE">Enterprise VIP Only</option>
                </select>
              </div>

              {/* ⏰ TIME SCHEDULING SECTION (From When to When) */}
              <div className="p-4 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 space-y-4">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-wider">
                  <Clock size={15} />
                  <span>Time Scheduling & Visibility Window</span>
                </div>

                {/* 1. Start Time Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    1. When should this broadcast START showing?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, startMode: "NOW", startsAt: "" })}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                        form.startMode === "NOW"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>Show Immediately (Live Now)</span>
                      {form.startMode === "NOW" && <Check size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, startMode: "SCHEDULED" })}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                        form.startMode === "SCHEDULED"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>Schedule for Specific Date/Time</span>
                      {form.startMode === "SCHEDULED" && <Check size={14} />}
                    </button>
                  </div>

                  {form.startMode === "SCHEDULED" && (
                    <div className="mt-2">
                      <input
                        type="datetime-local"
                        required={form.startMode === "SCHEDULED"}
                        value={form.startsAt}
                        onChange={e => setForm({ ...form, startsAt: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}
                </div>

                {/* 2. End Time / Expiration Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    2. When should this broadcast EXPIRE / Stop showing?
                  </label>
                  
                  {/* Duration Presets */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { id: "1H", label: "1 Hour" },
                      { id: "6H", label: "6 Hours" },
                      { id: "24H", label: "24 Hours" },
                      { id: "3D", label: "3 Days" },
                      { id: "7D", label: "7 Days" },
                      { id: "NEVER", label: "Permanent (No Expiry)" },
                      { id: "CUSTOM", label: "Custom Date/Time" },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyExpiryPreset(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          form.expiryPreset === p.id
                            ? "bg-indigo-600 text-white border-indigo-600 font-black shadow-2xs"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {form.expiryPreset !== "NEVER" && (
                    <div>
                      <input
                        type="datetime-local"
                        value={form.expiresAt}
                        onChange={e => setForm({ ...form, expiryPreset: "CUSTOM", expiresAt: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* 👁️ LIVE IN-APP PREVIEW CARD */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Eye size={13} /> Live In-App Preview (Client View)
                </label>
                {(() => {
                  const conf = TYPE_CONFIG[form.type] || TYPE_CONFIG.INFO;
                  const Icon = conf.icon;
                  return (
                    <div className={`p-3.5 rounded-2xl border ${conf.bg} ${conf.border} ${conf.text} flex items-center justify-between gap-3`}>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`p-1 rounded-md ${conf.badgeBg} ${conf.badgeText}`}>
                          <Icon size={14} className="animate-pulse" />
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${conf.badgeBg} ${conf.badgeText}`}>
                          {conf.label}
                        </span>
                        <span className="font-extrabold">{form.title || "Your Broadcast Title"}</span>
                        <span>—</span>
                        <span className="font-medium opacity-90">{form.message || "Your message details will appear here..."}</span>
                      </div>
                      <span className="text-xs opacity-60">✕</span>
                    </div>
                  );
                })()}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send size={15} />
                  <span>{submitting ? "Saving..." : editingId ? "Update Broadcast" : "Publish Broadcast"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}
