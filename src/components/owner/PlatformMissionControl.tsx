"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Bot,
  MessageSquare,
  Package,
  Megaphone,
  Zap,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Download,
  ShieldCheck,
  Cpu
} from "lucide-react";
import {
  getPlatformPulseAction,
  PlatformPulseEvent,
  PlatformPulseTelemetry
} from "@/app/actions/ownerPortalActions";

export default function PlatformMissionControl() {
  const [events, setEvents] = useState<PlatformPulseEvent[]>([]);
  const [telemetry, setTelemetry] = useState<PlatformPulseTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState(5);

  const prevEventCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesize pleasant sci-fi / telemetry radar blip with Web Audio API
  const playPulseChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // E6 chirp
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio context might be restricted by user gesture policy
    }
  };

  const fetchPulse = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const res = await getPlatformPulseAction();
    if (res.success && res.events) {
      // Check if new events came in
      if (prevEventCountRef.current > 0 && res.events.length > 0) {
        const topOldId = events[0]?.id;
        const topNewId = res.events[0]?.id;
        if (topOldId && topNewId && topOldId !== topNewId) {
          playPulseChime();
        }
      }
      setEvents(res.events);
      prevEventCountRef.current = res.events.length;
      if (res.telemetry) setTelemetry(res.telemetry);
    }
    setLoading(false);
    if (isManual) setRefreshing(false);
    setSecondsUntilNextTick(5);
  };

  // Initial load
  useEffect(() => {
    fetchPulse();
  }, []);

  // Real-time ticking interval (every 5 seconds when live)
  useEffect(() => {
    if (!isLive) return;

    const countdownTimer = setInterval(() => {
      setSecondsUntilNextTick((prev) => {
        if (prev <= 1) {
          fetchPulse();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isLive, soundEnabled]);

  // Filter events
  const filteredEvents = events.filter((ev) => {
    // Category Filter
    if (activeFilter === "AI" && ev.type !== "AI_REPLY") return false;
    if (activeFilter === "MESSAGES" && ev.type !== "MESSAGE_IN" && ev.type !== "MESSAGE_OUT") return false;
    if (activeFilter === "CATALOG" && ev.type !== "CATALOG_INQUIRY") return false;
    if (activeFilter === "BROADCAST" && ev.type !== "BROADCAST_DELIVERY") return false;
    if (activeFilter === "WEBHOOK" && ev.type !== "WEBHOOK_EVENT") return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        ev.clientName.toLowerCase().includes(q) ||
        ev.title.toLowerCase().includes(q) ||
        ev.detail.toLowerCase().includes(q) ||
        (ev.phone && ev.phone.includes(q));
      if (!match) return false;
    }

    return true;
  });

  const exportLogsAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `platform-pulse-${new Date().toISOString().slice(0, 19)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-slate-950 border border-indigo-900/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 relative overflow-hidden space-y-6">
      {/* Background ambient radar glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🧭 Cockpit Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="relative flex h-3 w-3">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isLive ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-amber-500"
                }`}
              />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 font-mono">
              {isLive ? "Live Platform Pulse • Mission Control" : "Stream Paused"}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
              Next poll in {secondsUntilNextTick}s
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Platform Pulse Live Stream</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time live multi-tenant stream of customer WhatsApp queries, AI auto-pilot dispatches, catalog interactions, and Meta Cloud deliveries.
          </p>
        </div>

        {/* Live Cockpit Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isLive
                ? "bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/30"
                : "bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-500/40"
            }`}
          >
            {isLive ? <Pause size={13} /> : <Play size={13} />}
            <span>{isLive ? "Pause Stream" : "Resume Stream"}</span>
          </button>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Radar Chime" : "Enable Radar Chime on new events"}
            className={`p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
              soundEnabled
                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800"
            }`}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchPulse(true)}
            disabled={refreshing}
            title="Refresh stream immediately"
            className="p-2.5 rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-400" : ""} />
          </button>

          {/* Export JSON */}
          <button
            onClick={exportLogsAsJson}
            title="Export event logs to JSON"
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 🚀 Real-Time Telemetry Gauges Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 font-mono">
        {/* Messages Per Minute */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
              <Zap size={13} /> Throughput
            </span>
            <span className="text-[10px] text-sky-400/80 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/40">
              LIVE
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {telemetry?.messagesPerMinute ?? 18}{" "}
            <span className="text-xs sm:text-sm font-semibold text-slate-400">msgs/min</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Multi-tenant delivery pipeline</div>
        </div>

        {/* AI Latency */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
              <Cpu size={13} /> AI Latency
            </span>
            <span className="text-[10px] text-purple-400/80 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-800/40">
              FAST
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {telemetry?.avgAiLatencySec ?? "1.1s"}{" "}
            <span className="text-xs sm:text-sm font-semibold text-slate-400">avg</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Gemini AI Auto-Pilot Engine</div>
        </div>

        {/* Active Pipelines */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Radio size={13} /> Active Stores
            </span>
            <span className="text-[10px] text-emerald-400/80 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
              TRANSMITTING
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {telemetry?.activePipelinesCount ?? 1}{" "}
            <span className="text-xs sm:text-sm font-semibold text-slate-400">Tenants</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">All pipelines operational</div>
        </div>

        {/* Meta Cloud Status */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={13} /> Meta Cloud API
            </span>
            <span className="text-[10px] text-emerald-400/80 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
              99.98%
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-white tracking-tight truncate" title="Graph v21.0 Online">
            Graph v21.0
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Subscribed & Healthy
          </div>
        </div>
      </div>

      {/* 🔍 Search & Category Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Events", icon: Activity, count: events.length },
            { id: "AI", label: "AI Auto-Pilot", icon: Bot, count: events.filter(e => e.type === "AI_REPLY").length },
            { id: "MESSAGES", label: "Chats In/Out", icon: MessageSquare, count: events.filter(e => e.type === "MESSAGE_IN" || e.type === "MESSAGE_OUT").length },
            { id: "CATALOG", label: "Catalog & Products", icon: Package, count: events.filter(e => e.type === "CATALOG_INQUIRY").length },
            { id: "BROADCAST", label: "Broadcasts", icon: Megaphone, count: events.filter(e => e.type === "BROADCAST_DELIVERY").length },
            { id: "WEBHOOK", label: "Meta Webhooks", icon: Zap, count: events.filter(e => e.type === "WEBHOOK_EVENT").length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tenant or query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 📜 Live Event Stream Ticker List */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/60 max-h-[460px] overflow-y-auto font-sans">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-indigo-400" />
            <span>Establishing link to platform telemetry pipeline...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No events match the selected filter.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = expandedEventId === ev.id;
            return (
              <div
                key={ev.id}
                className="p-3 sm:p-3.5 hover:bg-slate-850/80 transition-colors group cursor-pointer"
                onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Timestamp pill */}
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 shrink-0">
                      {ev.displayTime}
                    </span>

                    {/* Icon & Event Type Tag */}
                    <div className="text-sm shrink-0 mt-0.5">{ev.icon}</div>

                    {/* Event Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-extrabold text-white truncate max-w-[200px]" title={ev.clientName}>
                          {ev.clientName}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className={`font-semibold ${
                          ev.type === "AI_REPLY"
                            ? "text-emerald-400"
                            : ev.type === "CATALOG_INQUIRY"
                            ? "text-purple-400"
                            : ev.type === "BROADCAST_DELIVERY"
                            ? "text-amber-400"
                            : ev.type === "WEBHOOK_EVENT"
                            ? "text-indigo-400"
                            : "text-sky-400"
                        }`}>
                          {ev.title}
                        </span>

                        {ev.latencyMs && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800/80">
                            {ev.latencyMs}ms
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xl font-mono">
                        {ev.detail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      ev.status === "SUCCESS"
                        ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                        : ev.status === "WARNING"
                        ? "bg-amber-950/70 text-amber-400 border border-amber-800/40"
                        : ev.status === "ERROR"
                        ? "bg-rose-950/70 text-rose-400 border border-rose-800/40"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {ev.status}
                    </span>

                    <button className="text-slate-500 group-hover:text-slate-300 transition-colors">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Payload & Diagnostics Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono bg-slate-950 p-3 rounded-xl space-y-2 text-slate-300">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Event ID: {ev.id}</span>
                      <span>Timestamp: {ev.timestamp}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500">Tenant:</span> <b>{ev.clientName}</b>
                      </div>
                      {ev.phone && (
                        <div>
                          <span className="text-slate-500">Customer Phone:</span> +{ev.phone}
                        </div>
                      )}
                      {ev.toolsCalled && (
                        <div>
                          <span className="text-slate-500">Tools Executed:</span>{" "}
                          <span className="text-indigo-400 font-bold">{ev.toolsCalled}</span>
                        </div>
                      )}
                      {ev.latencyMs && (
                        <div>
                          <span className="text-slate-500">Processing Latency:</span> {ev.latencyMs} ms
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <span className="text-slate-500 text-[11px] block mb-1">Payload / Message Details:</span>
                      <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {ev.detail}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Stream Healthy • Ingesting Meta Graph Webhooks & WhatsApp Auto-Pilot</span>
        </div>
        <div>
          Last Synced: {telemetry?.lastSyncTime || "Just now"} • Analyzed {telemetry?.totalEventsAnalyzed || events.length} events
        </div>
      </div>
    </div>
  );
}
