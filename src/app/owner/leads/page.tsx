"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Copy,
  Plus,
  Zap,
  Globe
} from "lucide-react";
import {
  getPlatformLeadsAction,
  updatePlatformLeadStatusAction,
  deletePlatformLeadAction
} from "@/app/actions/leadActions";

export default function OwnerLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    newCount: 0,
    contactedCount: 0,
    convertedCount: 0,
    lostCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [copiedMobile, setCopiedMobile] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authed = sessionStorage.getItem("owner_authed");
    if (authed === "1") {
      loadLeads();
    } else {
      fetch("/api/owner/verify").then(r => {
        if (!r.ok) router.push("/owner/login");
        else { sessionStorage.setItem("owner_authed", "1"); loadLeads(); }
      }).catch(() => router.push("/owner/login"));
    }
  }, [statusFilter, platformFilter]);

  const loadLeads = async () => {
    setLoading(true);
    const res = await getPlatformLeadsAction({
      status: statusFilter,
      platform: platformFilter,
      search
    });

    if (res.success && res.leads) {
      setLeads(res.leads);
      if (res.counts) setCounts(res.counts);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    setUpdatingId(id);
    const res = await updatePlatformLeadStatusAction(id, nextStatus);
    setUpdatingId(null);
    if (res.success) {
      loadLeads();
    } else {
      alert("Error updating status: " + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this lead?")) return;
    const res = await deletePlatformLeadAction(id);
    if (res.success) {
      loadLeads();
    } else {
      alert("Error deleting lead: " + res.error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMobile(id);
    setTimeout(() => setCopiedMobile(null), 2000);
  };

  const filteredLeads = leads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.businessName.toLowerCase().includes(q) ||
      l.mobile.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    );
  });

  return (
    <main className="w-full px-4 sm:px-6 lg:px-10 py-7 space-y-7">
      
      {/* 🌟 Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md">
              <Sparkles size={13} className="text-amber-400 animate-pulse" /> Inbound Lead Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Landing Page Inquiries & Leads
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Real-time prospective customers captured from 3D landing pages across WhatMore and What-In.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={loadLeads}
            disabled={loading}
            title="Refresh Inbound Leads"
            className="p-3 rounded-2xl text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw size={17} className={loading ? "animate-spin text-indigo-400" : ""} />
          </button>

          <Link
            href="/owner/clients"
            className="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/30"
          >
            <Plus size={16} />
            <span>Onboard Tenant</span>
          </Link>
        </div>
      </div>

      {/* 📊 KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">Total Inquiries</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {counts.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Platform-wide leads</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
            <span>New Leads</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {counts.newCount}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Requires follow-up</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-sky-800/60 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
          <div className="text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400 mb-1">Contacted</div>
          <div className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">
            {counts.contactedCount}
          </div>
          <div className="text-[10px] text-sky-600/80 dark:text-sky-400/80 mt-1">Pitch in progress</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-800/60 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400 mb-1">Converted</div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
            {counts.convertedCount}
          </div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-1">Active SaaS tenants</div>
        </div>
      </div>

      {/* 🔍 Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {["ALL", "NEW", "CONTACTED", "CONVERTED", "LOST"].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Platform Source & Search Input */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Platforms</option>
            <option value="WHATMORE">WhatMore</option>
            <option value="WHATIN">What-In</option>
          </select>

          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, business, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

      </div>

      {/* 📋 Leads Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-visible">
        <div className="overflow-x-auto min-h-[400px] rounded-3xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-6 w-[28%] min-w-[220px]">Lead & Contact</th>
                <th className="py-4 px-5 w-[20%] min-w-[170px]">Business & Plan</th>
                <th className="py-4 px-5 w-[15%] min-w-[130px]">Platform Brand</th>
                <th className="py-4 px-5 w-[15%] min-w-[140px]">Date Received</th>
                <th className="py-4 px-5 w-[10%] min-w-[120px]">Status</th>
                <th className="py-4 px-6 text-right w-[12%] min-w-[160px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Loading inquiries from database...</span>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-400">
                    <Users size={32} className="text-slate-400 mx-auto mb-2" />
                    <div className="font-bold text-slate-700 dark:text-slate-300">No Inbound Leads Found</div>
                    <div className="text-xs text-slate-500 mt-0.5">Inquiries submitted on the 3D landing page will appear here instantly.</div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const cleanPhone = lead.mobile.replace(/[^0-9]/g, "");
                  const waLink = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(lead.name)}%2C%20thank%20you%20for%20contacting%20${lead.platform === "WHATIN" ? "What-In" : "WhatMore"}%20regarding%20your%20business%20${encodeURIComponent(lead.businessName)}.`;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* 1. Lead & Contact */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {lead.name}
                          </div>
                          
                          {/* Mobile with Copy */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                            <Phone size={11} className="text-emerald-500" />
                            <span>+{cleanPhone}</span>
                            <button
                              onClick={() => copyToClipboard(cleanPhone, lead.id)}
                              title="Copy mobile number"
                              className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
                            >
                              {copiedMobile === lead.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>

                          {/* Email */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Mail size={11} className="text-slate-400" />
                            <a href={`mailto:${lead.email}`} className="hover:underline truncate max-w-[200px]" title={lead.email}>
                              {lead.email}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* 2. Business & Plan */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 size={13} className="text-indigo-500" />
                            <span>{lead.businessName}</span>
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Plan: {lead.selectedPlan || "GROWTH"}
                          </span>
                          {lead.message && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={lead.message}>
                              "{lead.message}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Platform Brand */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                          lead.platform === "WHATIN"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        }`}>
                          <Globe size={12} />
                          <span>{lead.platform === "WHATIN" ? "What-In" : "WhatMore"}</span>
                        </span>
                      </td>

                      {/* 4. Date Received */}
                      <td className="py-4 px-5 text-slate-500 font-mono text-[11px]">
                        <div>{new Date(lead.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* 5. Status Dropdown */}
                      <td className="py-4 px-5">
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={e => handleUpdateStatus(lead.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-xs font-black uppercase border cursor-pointer ${
                            lead.status === "NEW"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : lead.status === "CONTACTED"
                              ? "bg-sky-50 text-sky-700 border-sky-300"
                              : lead.status === "CONVERTED"
                              ? "bg-purple-50 text-purple-700 border-purple-300"
                              : "bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="CONVERTED">CONVERTED</option>
                          <option value="LOST">LOST</option>
                        </select>
                      </td>

                      {/* 6. Quick Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* 1-Click WhatsApp Quick Chat */}
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            title="Chat on WhatsApp"
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare size={12} />
                            <span>Chat</span>
                          </a>

                          {/* Delete Lead */}
                          <button
                            onClick={() => handleDelete(lead.id)}
                            title="Delete Lead"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}
