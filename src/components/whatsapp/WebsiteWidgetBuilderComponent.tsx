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
  ShoppingBag,
  Globe,
  Code2,
  Tag,
  Cpu,
  Layers,
  ExternalLink,
  HelpCircle,
  Info,
  ShieldCheck,
  Terminal,
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
  const [selectedPlatform, setSelectedPlatform] = useState<"shopify" | "wordpress" | "html" | "gtm">("shopify");

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

  // Helper to format platform-specific snippet
  const getPlatformSnippet = (platform: "shopify" | "wordpress" | "html" | "gtm") => {
    const rawTag = embedSnippet || `<script src="https://whatsapp.esponsports.com/api/widget/script.js" async></script>`;
    switch (platform) {
      case "shopify":
        return `<!-- Whatmore WhatsApp Widget for Shopify -->\n<!-- Paste into Layout/theme.liquid right above </body> -->\n${rawTag}`;
      case "wordpress":
        return `<!-- Whatmore WhatsApp Widget for WordPress & WooCommerce -->\n<!-- Paste into WPCode > Header & Footer > Footer -->\n${rawTag}`;
      case "gtm":
        return `<!-- Whatmore WhatsApp Widget (GTM Custom HTML Tag) -->\n<!-- Set Trigger: All Pages (DOM Ready) -->\n${rawTag}`;
      case "html":
      default:
        return `<!-- Whatmore WhatsApp Widget (HTML, Webflow, Wix, Squarespace) -->\n<!-- Paste just before the closing </body> tag -->\n${rawTag}`;
    }
  };

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

      {/* Interactive Platform Setup Guide & Embed Snippet Suite */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Code2 size={18} />
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">
                Installation & Setup Guide
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 m-0 mt-1">
              Select your website platform below for step-by-step integration instructions and optimized code snippets.
            </p>
          </div>

          {/* Platform Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedPlatform("shopify")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "shopify"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <ShoppingBag size={14} /> Shopify
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform("wordpress")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "wordpress"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <Globe size={14} /> WordPress / WooCommerce
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform("html")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "html"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <Code2 size={14} /> HTML / Webflow / Wix
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform("gtm")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "gtm"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <Tag size={14} /> Google Tag Manager
            </button>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/80 p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-mono font-bold text-gray-700 dark:text-slate-300">
                {selectedPlatform === "shopify" && "Shopify Liquid Snippet"}
                {selectedPlatform === "wordpress" && "WordPress Footer Snippet"}
                {selectedPlatform === "html" && "Universal HTML / Webflow Snippet"}
                {selectedPlatform === "gtm" && "GTM Custom HTML Snippet"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getPlatformSnippet(selectedPlatform));
                setCopiedScript(true);
                setTimeout(() => setCopiedScript(false), 2500);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              {copiedScript ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
              <span>{copiedScript ? "Copied to Clipboard!" : "Copy Snippet"}</span>
            </button>
          </div>

          <pre className="font-mono text-xs text-indigo-700 dark:text-indigo-200 bg-white dark:bg-slate-950 p-4 rounded-xl overflow-x-auto border border-gray-200 dark:border-slate-800 m-0">
            <code>{getPlatformSnippet(selectedPlatform)}</code>
          </pre>
        </div>

        {/* Platform Step-by-Step Instructions */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-gray-200/80 dark:border-slate-700/60">
          {selectedPlatform === "shopify" && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShoppingBag size={15} className="text-emerald-500" /> Shopify Installation Instructions (2 Minutes)
              </div>
              <ol className="text-xs text-gray-600 dark:text-slate-300 space-y-2 list-decimal list-inside m-0 pl-1 leading-relaxed">
                <li>Log in to your <strong>Shopify Admin</strong> dashboard.</li>
                <li>In the left menu, click <strong>Online Store</strong> &rarr; <strong>Themes</strong>.</li>
                <li>Next to your active live theme, click the <strong>Actions (•••)</strong> dropdown and select <strong>Edit code</strong>.</li>
                <li>In the left file navigator under <strong>Layout</strong>, click to open <strong><code>theme.liquid</code></strong>.</li>
                <li>Scroll to the bottom of <code>theme.liquid</code> to locate the closing <strong><code>&lt;/body&gt;</code></strong> tag.</li>
                <li>Paste the copied snippet immediately above the <code>&lt;/body&gt;</code> tag and click <strong>Save</strong>.</li>
              </ol>
              <div className="mt-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-[11.5px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>Shopify Auto-Detection Active:</strong> When customers view any product on your Shopify store, the widget automatically detects the product name and price so their WhatsApp inquiry is pre-filled with the exact item!
                </span>
              </div>
            </div>
          )}

          {selectedPlatform === "wordpress" && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Globe size={15} className="text-blue-500" /> WordPress & WooCommerce Installation Instructions
              </div>
              <ol className="text-xs text-gray-600 dark:text-slate-300 space-y-2 list-decimal list-inside m-0 pl-1 leading-relaxed">
                <li>Log in to your <strong>WordPress Admin</strong> dashboard.</li>
                <li>Go to <strong>Plugins</strong> &rarr; <strong>Add New Plugin</strong>.</li>
                <li>Search for <strong>WPCode (Insert Headers and Footers)</strong> and click <strong>Install Now</strong> &rarr; <strong>Activate</strong>.</li>
                <li>In the left sidebar, click <strong>Code Snippets</strong> &rarr; <strong>Header & Footer</strong>.</li>
                <li>Scroll down to the <strong>Footer</strong> box, paste the snippet, and click <strong>Save Changes</strong>.</li>
                <li><em>(Alternative for theme developers)</em>: Paste directly into your child theme's <code>footer.php</code> right above <code>&lt;?php wp_footer(); ?&gt;</code>.</li>
              </ol>
              <div className="mt-1 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-lg text-[11.5px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <span>
                  <strong>WooCommerce Context Aware:</strong> On WooCommerce single product pages, the widget detects <code>.product_title</code> and catalog links automatically without needing extra plugins.
                </span>
              </div>
            </div>
          )}

          {selectedPlatform === "html" && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Code2 size={15} className="text-indigo-500" /> Custom HTML, Webflow & Wix Instructions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-slate-300">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">Webflow</div>
                  <p className="m-0 leading-relaxed text-[11.5px]">
                    Go to <strong>Project Settings</strong> &rarr; <strong>Custom Code</strong> &rarr; paste the snippet into <strong>Footer Code</strong> &rarr; Save & Publish.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">Wix</div>
                  <p className="m-0 leading-relaxed text-[11.5px]">
                    Go to <strong>Settings</strong> &rarr; <strong>Custom Code</strong> &rarr; click <strong>+ Add Custom Code</strong> &rarr; paste snippet & select <strong>Body - End</strong>.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">Static HTML / React</div>
                  <p className="m-0 leading-relaxed text-[11.5px]">
                    Paste the <code>&lt;script&gt;</code> tag immediately before the closing <code>&lt;/body&gt;</code> tag in your <code>index.html</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedPlatform === "gtm" && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Tag size={15} className="text-amber-500" /> Google Tag Manager (GTM) Deployment
              </div>
              <ol className="text-xs text-gray-600 dark:text-slate-300 space-y-2 list-decimal list-inside m-0 pl-1 leading-relaxed">
                <li>Log in to your <strong>Google Tag Manager</strong> account and open your Container.</li>
                <li>Navigate to <strong>Tags</strong> and click <strong>New</strong>.</li>
                <li>Under <strong>Tag Configuration</strong>, choose <strong>Custom HTML</strong>.</li>
                <li>Paste the script snippet into the HTML editor.</li>
                <li>Under <strong>Triggering</strong>, select <strong>Initialization - All Pages</strong> (or <strong>All Pages / DOM Ready</strong>).</li>
                <li>Name the tag <code>Whatmore WhatsApp Widget</code>, save, and click <strong>Submit</strong> &rarr; <strong>Publish</strong>.</li>
              </ol>
            </div>
          )}
        </div>

        {/* How It Differentiates Across Platforms Deep-Dive Banner */}
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white m-0">
              How the Universal Snippet Automatically Differentiates Across Platforms
            </h4>
          </div>
          <p className="text-[11.5px] text-gray-600 dark:text-slate-300 m-0 leading-relaxed">
            You do <strong>not</strong> need different scripts or complicated plugins. The widget client has built-in smart runtime detection:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-950 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShoppingBag size={14} /> Shopify Runtime
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 m-0 mt-1">
                Detects <code>window.Shopify</code> & <code>ShopifyAnalytics</code>. On product pages, it extracts title, price, and variant URL to pre-fill the WhatsApp chat inquiry.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-950 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Globe size={14} /> WooCommerce Runtime
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 m-0 mt-1">
                Detects <code>.woocommerce</code> class and <code>.product_title</code> in the DOM, tagging the lead with <code>[WooCommerce Lead]</code> in your CRM.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-950 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Layers size={14} /> Marketing UTM Tracking
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 m-0 mt-1">
                Captures <code>utm_source</code>, <code>utm_campaign</code>, and current page URL universally on all platforms, streaming attribution into your CRM & Google Sheets.
              </p>
            </div>
          </div>
        </div>
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
