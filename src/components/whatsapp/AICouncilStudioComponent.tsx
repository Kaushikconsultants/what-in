"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Zap,
  Sparkles,
  Bot,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  HelpCircle,
  Sliders,
  Scale,
  Users,
  Flame,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { AICouncilConfig, CouncilAgent, AgentDebateThought, INDUSTRY_PRESETS } from "@/lib/aiCouncilEngine";

interface AICouncilStudioComponentProps {
  embedded?: boolean;
}

const AVATAR_OPTIONS = ["⚡", "🛡️", "👑", "🎨", "📦", "💰", "⚙️", "🩺", "📊", "📅", "🌟", "🏖️", "🕵️‍♂️", "🧠", "🔥"];
const COLOR_OPTIONS = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

const SAMPLE_QUERIES = [
  "Bhaiya 100 piece chahiye, ₹500 me doge kya with cash on delivery?",
  "Mujhe kal subah tak urgently delivery chahiye Mumbai me.",
  "Pehle free sample swatch booklet bhej do fir 200 pcs ka order dunga.",
  "Competitor ₹420 me de raha hai same fabric, aapka rate bahut high hai.",
  "What is your return policy if sizes don't fit our team?",
];

export default function AICouncilStudioComponent({ embedded = false }: AICouncilStudioComponentProps) {
  const [config, setConfig] = useState<AICouncilConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulation State
  const [simQuery, setSimQuery] = useState(SAMPLE_QUERIES[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    thoughts: AgentDebateThought[];
    finalAnswer: string;
    bossReasoning: string;
    overallConfidence: number;
    hasVeto: boolean;
    vetoDetails?: string;
  } | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  // Editing / Add Agent Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState<Partial<CouncilAgent>>({
    name: "",
    role: "Specialist",
    avatar: "⚡",
    color: "#6366f1",
    personality: "",
    rules: "",
    priority: 8,
    isEnabled: true,
  });

  useEffect(() => {
    fetchCouncilConfig();
  }, []);

  const fetchCouncilConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/whatsapp/ai-council");
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Failed to load AI Council config", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await fetch("/api/whatsapp/ai-council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        alert("Failed to save: " + data.error);
      }
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = INDUSTRY_PRESETS[presetKey];
    if (!preset) return;
    if (confirm(`Load "${preset.name}" preset? This will configure your council agents for ${preset.name}.`)) {
      setConfig({
        ...preset.config,
      });
    }
  };

  const handleAgentToggle = (agentId: string) => {
    if (!config) return;
    setConfig({
      ...config,
      agents: config.agents.map((a) => (a.id === agentId ? { ...a, isEnabled: !a.isEnabled } : a)),
    });
  };

  const handleAgentUpdate = (agentId: string, field: keyof CouncilAgent, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      agents: config.agents.map((a) => (a.id === agentId ? { ...a, [field]: value } : a)),
    });
  };

  const handleDeleteAgent = (agentId: string) => {
    if (!config) return;
    if (config.agents.length <= 1) {
      alert("Council must have at least 1 agent.");
      return;
    }
    setConfig({
      ...config,
      agents: config.agents.filter((a) => a.id !== agentId),
    });
  };

  const handleAddAgent = () => {
    if (!config || !newAgent.name?.trim()) return;
    const agentToAdd: CouncilAgent = {
      id: "agent-" + Date.now(),
      name: newAgent.name.trim(),
      role: newAgent.role || "Specialist",
      avatar: newAgent.avatar || "⚡",
      color: newAgent.color || "#6366f1",
      personality: newAgent.personality || "Diligent and helpful assistant.",
      rules: newAgent.rules || "Follow company standards.",
      priority: newAgent.priority || 8,
      isEnabled: true,
    };

    setConfig({
      ...config,
      agents: [...config.agents, agentToAdd],
    });
    setShowAddModal(false);
    setNewAgent({
      name: "",
      role: "Specialist",
      avatar: "⚡",
      color: "#6366f1",
      personality: "",
      rules: "",
      priority: 8,
      isEnabled: true,
    });
  };

  const handleRunSimulation = async () => {
    if (!simQuery.trim() || !config) return;
    setIsSimulating(true);
    setSimResult(null);

    try {
      const res = await fetch("/api/whatsapp/ai-council/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerQuery: simQuery,
          config,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult({
          thoughts: data.thoughts || [],
          finalAnswer: data.finalAnswer || "",
          bossReasoning: data.bossReasoning || "",
          overallConfidence: data.overallConfidence || 85,
          hasVeto: !!data.hasVeto,
          vetoDetails: data.vetoDetails,
        });
      } else {
        alert("⚠️ " + (data.error || data.bossReasoning || "Simulation failed. Please verify your Gemini API key in the AI Settings tab."));
      }
    } catch (err: any) {
      alert("Simulation failed: " + (err.message || "Network error"));
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  if (loading || !config) {
    return (
      <div className="p-12 text-center text-gray-500 font-sans">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-600" />
        <p>Loading Autonomous AI Council Studio...</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${embedded ? "p-0" : "max-w-[1200px] mx-auto py-6 px-4"} font-sans text-gray-900 dark:text-gray-100`}>
      {/* Top Banner & Master Actions */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-300 mb-3 tracking-wide uppercase">
              <Sparkles size={14} /> Autonomous Multi-Agent Swarm
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0 flex items-center gap-3">
              🏛️ The AI Council Studio
            </h1>
            <p className="text-gray-300 text-sm mt-2 max-w-2xl leading-relaxed">
              Instead of 1 generic bot, deploy a specialized squad of AI agents (Sales Closer, Margin Guardian, Stylist, Logistics) who debate in milliseconds to craft the perfect deal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-950/60 border border-emerald-500/40 px-3 py-2 rounded-xl animate-fade-in">
                <CheckCircle2 size={16} /> Council Saved Live!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving Squad..." : "Save Council Squad"}
            </button>
          </div>
        </div>

        {/* Preset Quick Switcher */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Industry Presets:</span>
          {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handleApplyPreset(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                config.industryPreset === key
                  ? "bg-white text-indigo-950 shadow-md scale-105"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
              }`}
            >
              <span>{preset.icon}</span> {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Squad Manager (Left) + Battle Arena (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        {/* LEFT: Council Squad Configuration */}
        <div className="flex flex-col gap-6">
          {/* Header Card: Master Controls */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white m-0 flex items-center gap-2">
                <Users size={20} className="text-indigo-600 dark:text-indigo-400" /> Council Squad Configuration
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
              >
                <Plus size={15} /> Add Custom Agent
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Council Name</label>
                <input
                  type="text"
                  value={config.councilName}
                  onChange={(e) => setConfig({ ...config, councilName: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Council Boss (Synthesizer)</label>
                <input
                  type="text"
                  value={config.bossAgentName}
                  onChange={(e) => setConfig({ ...config, bossAgentName: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Consensus Model</label>
                <select
                  value={config.consensusModel}
                  onChange={(e) => setConfig({ ...config, consensusModel: e.target.value as any })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="BOSS_SYNTHESIS">👑 Boss Synthesis (Recommended)</option>
                  <option value="WEIGHTED_MAJORITY">⚖️ Weighted Priority Majority</option>
                  <option value="UNANIMOUS">🔒 Strict Unanimous Approval</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Min Confidence Score: {config.minConsensusConfidence}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={config.minConsensusConfidence}
                  onChange={(e) => setConfig({ ...config, minConsensusConfidence: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 mt-2"
                />
              </div>
            </div>
          </div>

          {/* Active Agents Cards List */}
          <div className="flex flex-col gap-4">
            {config.agents.map((agent, index) => (
              <div
                key={agent.id}
                className={`bg-white dark:bg-slate-800 border rounded-2xl p-5 shadow-sm transition-all ${
                  agent.isEnabled
                    ? "border-gray-200 dark:border-slate-700"
                    : "border-dashed border-gray-300 dark:border-slate-700 opacity-60 bg-gray-50/50 dark:bg-slate-900/50"
                }`}
                style={{ borderLeft: `5px solid ${agent.color}` }}
              >
                {/* Agent Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center shadow-inner">
                      {agent.avatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={agent.name}
                          onChange={(e) => handleAgentUpdate(agent.id, "name", e.target.value)}
                          className="font-bold text-base text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none px-1"
                        />
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: agent.color + "20", color: agent.color }}
                        >
                          {agent.role}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Priority {agent.priority}/10 · Agent #{index + 1}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agent.isEnabled}
                        onChange={() => handleAgentToggle(agent.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Personality & Rules Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Personality &amp; Directives
                    </label>
                    <textarea
                      rows={2}
                      value={agent.personality}
                      onChange={(e) => handleAgentUpdate(agent.id, "personality", e.target.value)}
                      placeholder="e.g. Energetic closer, focuses on locking orders with urgency..."
                      className="w-full p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                      <ShieldAlert size={12} /> Strict Guardrails &amp; Floor Limits
                    </label>
                    <textarea
                      rows={2}
                      value={agent.rules}
                      onChange={(e) => handleAgentUpdate(agent.id, "rules", e.target.value)}
                      placeholder="e.g. NEVER give >10% discount. Minimum order is 20 pcs..."
                      className="w-full p-2 border border-red-200 dark:border-red-900/40 rounded-lg bg-red-50/40 dark:bg-red-950/20 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Live Battle Arena (Simulator) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white m-0 flex items-center gap-2">
                <Flame size={20} className="text-amber-500" /> Council Battle Arena (Live Simulator)
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <Sparkles size={12} /> Real-time Debate
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Test tricky customer inquiries and watch your Council Agents debate, veto unprofitable requests, and generate the ultimate deal.
            </p>

            {/* Sample Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setSimQuery(q)}
                  className="text-[11px] bg-gray-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-left"
                >
                  &ldquo;{q.slice(0, 38)}...&rdquo;
                </button>
              ))}
            </div>

            {/* Input & Run Button */}
            <div className="flex flex-col gap-3 mb-6">
              <textarea
                rows={2}
                value={simQuery}
                onChange={(e) => setSimQuery(e.target.value)}
                placeholder="Type customer question or bargaining query..."
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating || !simQuery.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSimulating ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {isSimulating ? "Council is Debating..." : "⚔️ Run Multi-Agent Debate"}
              </button>
            </div>

            {/* Debate Results Stream */}
            {isSimulating && (
              <div className="p-8 text-center bg-gray-50 dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Agents are deliberating...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sales Closer proposing deal · Margin Guardian auditing floor prices · Synthesizing response
                </p>
              </div>
            )}

            {simResult && !isSimulating && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Agent Thoughts Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider m-0">
                    🧠 Internal Council Debate Log ({simResult.thoughts.length} Agents)
                  </h3>
                  {simResult.thoughts.map((thought, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border text-xs bg-gray-50 dark:bg-slate-900/80 shadow-xs"
                      style={{ borderLeft: `4px solid ${thought.color}` }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                          <span>{thought.avatar}</span>
                          <span>{thought.agentName}</span>
                          <span className="text-[10px] text-gray-500 font-normal">({thought.role})</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            thought.verdict === "VETOED"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300"
                              : thought.verdict === "PITCH"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {thought.verdict}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 m-0 leading-relaxed font-medium">
                        &ldquo;{thought.thought}&rdquo;
                      </p>
                      {thought.proposedAction && (
                        <div className="mt-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          💡 Action: {thought.proposedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Boss Synthesis Resolution */}
                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs">
                  <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 mb-1">
                    <span>👑</span> {config.bossAgentName} Resolution
                  </div>
                  <p className="text-purple-950 dark:text-purple-200 m-0 leading-relaxed">
                    {simResult.bossReasoning}
                  </p>
                </div>

                {/* Final Synthesized WhatsApp Message */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} /> Final WhatsApp Response (Ready to Send)
                    </span>
                    <button
                      onClick={() => copyToClipboard(simResult.finalAnswer)}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-white/70 dark:bg-slate-800 px-2.5 py-1 rounded-lg shadow-xs"
                    >
                      {copiedAnswer ? <Check size={13} /> : <Copy size={13} />}
                      {copiedAnswer ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                    {simResult.finalAnswer}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-indigo-600" /> Add New Council Agent
            </h3>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold mb-1">Agent Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus (Margin Guard)"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Margin & Policy Guardian"
                  value={newAgent.role}
                  onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Avatar Emoji</label>
                  <select
                    value={newAgent.avatar}
                    onChange={(e) => setNewAgent({ ...newAgent, avatar: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900"
                  >
                    {AVATAR_OPTIONS.map((av) => (
                      <option key={av} value={av}>
                        {av}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Theme Color</label>
                  <select
                    value={newAgent.color}
                    onChange={(e) => setNewAgent({ ...newAgent, color: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Personality &amp; Directives</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Always prioritizes high order value and fast turnaround..."
                  value={newAgent.personality}
                  onChange={(e) => setNewAgent({ ...newAgent, personality: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-red-600 mb-1">Strict Rules / Floor Limits</label>
                <textarea
                  rows={2}
                  placeholder="e.g. NEVER allow discount > 10% under any circumstance..."
                  value={newAgent.rules}
                  onChange={(e) => setNewAgent({ ...newAgent, rules: e.target.value })}
                  className="w-full p-2.5 border border-red-200 dark:border-red-900/40 rounded-xl bg-red-50/30 dark:bg-red-950/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgent}
                disabled={!newAgent.name?.trim()}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
