"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Save,
  RefreshCw,
  Eye,
  Smartphone,
  CheckCircle2,
  MousePointerClick,
  Users,
  Percent,
} from "lucide-react";

const COLOR_PRESETS = [
  { name: "WhatsApp Green", hex: "#25D366" },
  { name: "Indigo Modern", hex: "#4F46E5" },
  { name: "Ocean Sky", hex: "#0EA5E9" },
  { name: "Coral Rose", hex: "#E11D48" },
  { name: "Pitch Charcoal", hex: "#0F172A" },
];

export default function WebsiteWidgetBuilderComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Widget Settings
  const [themeColor, setThemeColor] = useState("#25D366");
  const [position, setPosition] = useState("bottom-right");
  const [heading, setHeading] = useState("Chat with us on WhatsApp");
  const [subheading, setSubheading] = useState("Typically replies in a few minutes");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! I have an inquiry from your website.");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [requireLeadForm, setRequireLeadForm] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+91 74043 88242");
  const [embedSnippet, setEmbedSnippet] = useState("");
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);

  // Simulator State
  const [simulatorOpen, setSimulatorOpen] = useState(true);

  // Fetch current config
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/widget/config");
      const data = await res.json();
      if (data.success && data.widget) {
        const w = data.widget;
        setThemeColor(w.themeColor || "#25D366");
        setPosition(w.position || "bottom-right");
        setHeading(w.heading || "Chat with us on WhatsApp");
        setSubheading(w.subheading || "Typically replies in a few minutes");
        setWelcomeMessage(w.welcomeMessage || "Hi! I have an inquiry from your website.");
        setAvatarUrl(w.avatarUrl || "");
        setRequireLeadForm(Boolean(w.requireLeadForm));
        setShowOnMobile(w.showOnMobile !== false);
        setAllowedDomains(w.allowedDomains || "");
        setPhoneNumber(w.phoneNumber || "+91 74043 88242");
        setEmbedSnippet(w.embedSnippet || "");
        setTotalClicks(w.totalClicks || 0);
        setTotalLeads(w.totalLeadsCaptured || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/widget/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeColor,
          position,
          heading,
          subheading,
          welcomeMessage,
          avatarUrl,
          requireLeadForm,
          showOnMobile,
          allowedDomains,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Widget configuration saved successfully!");
      } else {
        alert(data.error || "Failed to save widget settings.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const conversionRate = totalClicks > 0 ? ((totalLeads / totalClicks) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl">
      {/* Top Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <MousePointerClick size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Widget Clicks</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalClicks.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Leads Captured</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalLeads.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
            <Percent size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Capture Conversion</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{conversionRate}%</div>
          </div>
        </div>
      </div>

      {/* Embed Code Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="text-sm font-bold text-white m-0 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" /> 1-Click Embed Snippet
          </h3>
          <p className="text-xs text-slate-400 m-0 mt-0.5">
            Paste this 1-line HTML tag just before the closing <code>&lt;/body&gt;</code> tag on your website.
          </p>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(embedSnippet);
            setCopiedScript(true);
            setTimeout(() => setCopiedScript(false), 2500);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs"
        >
          {copiedScript ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copiedScript ? "Snippet Copied!" : "Copy Embed Code"}</span>
        </button>
      </div>

      {/* Main Grid: Customizer Controls + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Settings */}
        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-5"
        >
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Widget Customizer</h3>
            <p className="text-xs text-gray-500 m-0 mt-0.5">Customize appearance, messaging, and lead capture mode.</p>
          </div>

          {/* Theme Color */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-2">Theme Color</label>
            <div className="flex items-center gap-2 mb-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setThemeColor(preset.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    themeColor.toLowerCase() === preset.hex.toLowerCase()
                      ? "scale-110 border-indigo-600 shadow-sm"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                />
              ))}
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                title="Custom Color"
              />
              <span className="text-xs font-mono font-bold text-gray-600 dark:text-slate-400 ml-2">{themeColor}</span>
            </div>
          </div>

          {/* Position Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">Floating Position</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPosition("bottom-right")}
                className={`p-2.5 text-xs font-bold rounded-xl border transition-all ${
                  position === "bottom-right"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                    : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-700 dark:text-slate-300"
                }`}
              >
                Bottom Right (Standard)
              </button>
              <button
                type="button"
                onClick={() => setPosition("bottom-left")}
                className={`p-2.5 text-xs font-bold rounded-xl border transition-all ${
                  position === "bottom-left"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                    : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-700 dark:text-slate-300"
                }`}
              >
                Bottom Left
              </button>
            </div>
          </div>

          {/* Text Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Popup Heading</label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Subheading</label>
              <input
                type="text"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Welcome Greeting Bubble</label>
            <textarea
              rows={2}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
          </div>

          {/* Lead Capture Toggle */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">Require Name & Phone (Lead Capture Mode)</div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">
                Collects visitor's name and mobile before redirecting to WhatsApp.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requireLeadForm}
                onChange={(e) => setRequireLeadForm(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live Interactive Smartphone Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <Smartphone size={15} /> Live Interactive Simulator
          </div>

          {/* Phone Frame */}
          <div className="w-[310px] h-[570px] bg-slate-900 rounded-[36px] p-3 border-4 border-slate-700 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Phone Speaker & Camera Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full z-30" />

            {/* Simulated Webpage Content */}
            <div className="bg-slate-100 dark:bg-slate-950 w-full h-full rounded-[24px] overflow-hidden relative p-4 flex flex-col justify-between text-left">
              {/* Dummy Website Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
                  <div className="font-extrabold text-xs text-gray-800 dark:text-white">STOREFRONT</div>
                  <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-slate-700" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 bg-gray-300 dark:bg-slate-800 rounded-full w-3/4" />
                  <div className="h-2 bg-gray-200 dark:bg-slate-850 rounded-full w-full" />
                  <div className="h-2 bg-gray-200 dark:bg-slate-850 rounded-full w-5/6" />
                </div>
              </div>

              {/* Floating Widget In Simulator */}
              <div
                className={`absolute bottom-3 ${
                  position === "bottom-right" ? "right-3" : "left-3"
                } flex flex-col items-${position === "bottom-right" ? "end" : "start"} gap-2 z-20`}
              >
                {/* Popup Card */}
                {simulatorOpen && (
                  <div className="w-[240px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
                    {/* Header */}
                    <div
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: themeColor }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">💬</div>
                        <div>
                          <div className="text-[11px] font-bold leading-tight truncate">{heading}</div>
                          <div className="text-[9px] opacity-90 leading-tight">{subheading}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSimulatorOpen(false)}
                        className="text-white text-sm font-bold opacity-80 hover:opacity-100"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 text-[10.5px] text-gray-800 dark:text-slate-200 shadow-2xs border border-gray-100 dark:border-slate-800">
                        {welcomeMessage}
                      </div>

                      {requireLeadForm ? (
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="text"
                            placeholder="Your Name"
                            disabled
                            className="p-1.5 text-[10px] rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="tel"
                            placeholder="Mobile Number"
                            disabled
                            className="p-1.5 text-[10px] rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            className="p-2 text-[10px] font-bold rounded-md text-white shadow-xs text-center"
                            style={{ backgroundColor: themeColor }}
                          >
                            Start Chat ➔
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="p-2 text-[10.5px] font-bold rounded-lg text-white shadow-xs text-center"
                          style={{ backgroundColor: themeColor }}
                        >
                          Start WhatsApp Chat ➔
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Button */}
                <button
                  type="button"
                  onClick={() => setSimulatorOpen((prev) => !prev)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: themeColor }}
                >
                  <MessageSquare size={22} fill="white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
