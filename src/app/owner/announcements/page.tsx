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
  CheckCircle2
} from "lucide-react";
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  toggleAnnouncementAction,
  deleteAnnouncementAction
} from "@/app/actions/ownerPortalActions";

const TYPE_CONFIG: Record<string, { label: string; icon: any; bg: string; border: string; text: string }> = {
  INFO:        { label: "General Info", icon: Info, bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200 dark:border-blue-800/60", text: "text-blue-700 dark:text-blue-300" },
  WARNING:     { label: "Warning Alert", icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800/60", text: "text-amber-700 dark:text-amber-300" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800/60", text: "text-rose-700 dark:text-rose-300" },
  SUCCESS:     { label: "Feature Update", icon: Sparkles, bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800/60", text: "text-emerald-700 dark:text-emerald-300" },
};

export default function OwnerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "INFO",
    targetPlan: "ALL",
    expiresAt: ""
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (res.success) setAnnouncements(res.announcements);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSubmitting(true);
    const res = await createAnnouncementAction(form);
    setSubmitting(false);
    if (res.success) {
      setShowAdd(false);
      setForm({ title: "", message: "", type: "INFO", targetPlan: "ALL", expiresAt: "" });
      load();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleToggle = async (a: any) => {
    const res = await toggleAnnouncementAction(a.id, !a.isActive);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    const res = await deleteAnnouncementAction(id);
    if (res.success) load();
    else alert("Error: " + res.error);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <Megaphone size={20} className="text-indigo-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tenant In-App Broadcasts
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Publish alerts, feature update notes, and maintenance marquee notices across all client dashboards.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
        >
          <Plus size={15} />
          <span>Create New Broadcast</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs font-bold">
            Loading broadcasts...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Megaphone size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No broadcasts published yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Click Create New Broadcast above to post your first system notification to client dashboards.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {announcements.map((a) => {
              const conf = TYPE_CONFIG[a.type] || TYPE_CONFIG.INFO;
              const Icon = conf.icon;

              return (
                <div key={a.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${conf.bg} ${conf.border} ${conf.text}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-slate-900 dark:text-white text-base">{a.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${conf.bg} ${conf.border} ${conf.text}`}>
                          {conf.label}
                        </span>
                        <span className={`text-xs font-bold ${a.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                          {a.isActive ? "● LIVE" : "○ PAUSED"}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        {a.message}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Target: <b className="text-slate-700 dark:text-slate-300 font-bold">{a.targetPlan}</b></span>
                        <span>•</span>
                        <span>Created {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => handleToggle(a)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                    >
                      {a.isActive ? <Pause size={13} /> : <Play size={13} />}
                      <span>{a.isActive ? "Pause" : "Resume"}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all"
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

      {/* Create Broadcast Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Megaphone size={18} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Publish Tenant Broadcast
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Broadcast notification will appear at top of client dashboard.
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Meta WhatsApp API Maintenance"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Message Content *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the announcement details for all client admins..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Alert Type
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="INFO">General Info</option>
                    <option value="WARNING">Warning Alert</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SUCCESS">Feature Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Target Audience
                  </label>
                  <select
                    value={form.targetPlan}
                    onChange={e => setForm({ ...form, targetPlan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="ALL">All Clients (Universal)</option>
                    <option value="STARTER">Starter Tier Only</option>
                    <option value="GROWTH">Growth Tier Only</option>
                    <option value="ENTERPRISE">Enterprise Tier Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{submitting ? "Publishing..." : "Publish Broadcast"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </main>
  );
}
