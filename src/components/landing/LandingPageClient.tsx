"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  MessageSquare,
  Bot,
  Package,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Cpu,
  Layers,
  Send,
  Phone,
  Mail,
  Building2,
  Users,
  Clock,
  ChevronDown,
  Globe,
  Radio,
  Sliders,
  Check,
  Percent,
  Star,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { getActiveBrand, BrandConfig } from "@/lib/brandConfig";
import { submitPlatformLeadAction } from "@/app/actions/leadActions";

export default function LandingPageClient({ brandOverride }: { brandOverride?: BrandConfig }) {
  const brand = brandOverride || getActiveBrand();
  const isWhatIn = brand.code === "WHATIN";

  // Billing toggle (Monthly vs Annual with 20% discount)
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUALLY">("MONTHLY");

  // Interactive 3D Simulator Tab
  const [simulatorTab, setSimulatorTab] = useState<"AI_ORDER" | "PINCODE_FETCH" | "CATALOG_FLOW" | "PAYMENT_UPI">("AI_ORDER");

  // Lead Capture Form State
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    mobile: "",
    email: "",
    selectedPlan: "GROWTH",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<{ id: string; name: string } | null>(null);
  const [formError, setFormError] = useState("");

  const handleSelectPlan = (planId: string) => {
    setForm(prev => ({ ...prev, selectedPlan: planId }));
    const element = document.getElementById("lead-capture-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const res = await submitPlatformLeadAction({
      name: form.name,
      businessName: form.businessName,
      mobile: form.mobile,
      email: form.email,
      platform: brand.code,
      selectedPlan: form.selectedPlan,
      message: form.message
    });

    setSubmitting(false);

    if (res.success && res.leadId) {
      setSubmittedLead({ id: res.leadId, name: res.name || form.name });
    } else {
      setFormError(res.error || "Failed to submit inquiry. Please try again.");
    }
  };

  const pricingTiers = [
    {
      id: "STARTER",
      name: "Starter",
      badge: "Getting Started",
      monthlyPrice: 999,
      annualPrice: 799,
      description: "Ideal for growing direct-to-consumer stores launching WhatsApp automations.",
      messages: "5,000",
      aiReplies: "500",
      agents: "3 Agents",
      features: [
        "Official Meta Cloud API v21.0 WABA",
        "Multi-Agent Unified Inbox",
        "Pincode & Delivery Address Auto-Fetch",
        "Basic WhatsApp Interactive Catalog",
        "Automated Order Confirmation & Tracking",
        "Canned Responses & Quick Replies"
      ],
      popular: false
    },
    {
      id: "GROWTH",
      name: "Growth",
      badge: "Most Popular 🔥",
      monthlyPrice: 2499,
      annualPrice: 1999,
      description: "Comprehensive AI sales agent, catalog checkout, and Shopify sync for scaling brands.",
      messages: "25,000",
      aiReplies: "2,500",
      agents: "10 Agents",
      features: [
        "Everything in Starter, plus:",
        "Gemini 3.8 AI Autonomous Sales Copilot",
        "Real-Time Shopify Bi-Directional Sync",
        "Automated WhatsApp Abandoned Cart Recovery",
        "Native WhatsApp Flows for COD Verification",
        "Cashfree & Razorpay In-Chat UPI Links",
        "Hyper-Targeted Broadcast Campaigns"
      ],
      popular: true
    },
    {
      id: "BUSINESS",
      name: "Business",
      badge: "High Velocity",
      monthlyPrice: 4999,
      annualPrice: 3999,
      description: "High-volume D2C brands requiring advanced CTWA ad attribution and custom rules.",
      messages: "75,000",
      aiReplies: "7,500",
      agents: "25 Agents",
      features: [
        "Everything in Growth, plus:",
        "Meta Click-to-WhatsApp (CTWA) Pixel CAPI",
        "Partial COD Advance Payment Engine",
        "Multi-Branch & Warehouse Routing",
        "Custom Automated Drip Sequences",
        "Dedicated Account Sentinel & Webhook Healing",
        "Priority 24/7 SLA Support"
      ],
      popular: false
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      badge: "Wholesale & Custom",
      monthlyPrice: 9999,
      annualPrice: 7999,
      description: "Custom message throughput, custom ERP integrations, and dedicated account manager.",
      messages: "250,000+",
      aiReplies: "Unlimited",
      agents: "Unlimited",
      features: [
        "Everything in Business, plus:",
        "Custom System Prompts & Dedicated Fine-Tuning",
        "Custom ERP / Tally / Unicommerce Sync",
        "Dedicated Meta Direct Tier Management",
        "Custom Multi-Tenant White-Label Options",
        "Custom SLA & Dedicated Solutions Architect"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white antialiased overflow-x-hidden font-sans">
      
      {/* 🧭 Sticky Glassmorphic Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Pill */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${isWhatIn ? "from-emerald-600 via-teal-500 to-cyan-600" : "from-indigo-600 via-purple-600 to-indigo-500"} flex items-center justify-center text-white shadow-lg ${isWhatIn ? "shadow-emerald-500/25" : "shadow-indigo-500/25"} group-hover:scale-105 transition-transform`}>
              <Sparkles size={20} className="text-amber-300 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">
                  {brand.name}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isWhatIn ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"}`}>
                  AI Commerce
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                WhatsApp Business Cloud OS
              </p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Platform Features</a>
            <a href="#pincode-address" className="hover:text-white transition-colors">Pincode & Address AI</a>
            <a href="#shopify-catalog" className="hover:text-white transition-colors">Catalog & Shopify</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
            >
              Client Login
            </Link>

            <a
              href="#lead-capture-section"
              className={`px-4.5 py-2.2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${isWhatIn ? "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20" : "from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/20"} shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5`}
            >
              <span>Get Started</span>
              <ArrowRight size={13} />
            </a>
          </div>

        </div>
      </header>

      {/* 🌟 3D HERO SECTION */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 px-4 sm:px-6 lg:px-10 overflow-hidden">
        {/* Ambient 3D Glow Backdrops */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] ${brand.themeColor.heroGlow} rounded-full blur-[140px] pointer-events-none -z-10`} />
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-sky-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto">
          
          {/* Top Badge */}
          <div className="text-center mb-6">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold backdrop-blur-md ${brand.themeColor.accentBadge}`}>
              <Zap size={14} className="animate-pulse" />
              <span>{brand.heroBadge}</span>
            </span>
          </div>

          {/* Main Headline */}
          <div className="text-center max-w-4xl mx-auto space-y-4 mb-10">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              Turn WhatsApp Into Your Highest-Converting{" "}
              <span className={`bg-gradient-to-r ${isWhatIn ? "from-emerald-400 via-teal-300 to-cyan-400" : "from-indigo-400 via-purple-300 to-pink-400"} bg-clip-text text-transparent`}>
                Autonomous Sales Machine
              </span>
            </h1>
            <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              {brand.subheadline}
            </p>
          </div>

          {/* Hero CTAs & Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href="#lead-capture-section"
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-black text-white bg-gradient-to-r ${isWhatIn ? "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30" : "from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/30"} shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-white/10`}
            >
              <Sparkles size={16} className="text-amber-300" />
              <span>Start 7-Day Free Trial</span>
              <ArrowRight size={15} />
            </a>

            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Radio size={15} className="text-sky-400 animate-pulse" />
              <span>Explore Interactive 3D Demo</span>
            </a>
          </div>

          {/* Telemetry Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto font-mono text-center mb-16">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <div className="text-xl sm:text-2xl font-black text-white">4.2M+</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Messages Delivered</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">1.1s Avg</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Gemini AI Speed</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <div className="text-xl sm:text-2xl font-black text-sky-400">99.98%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Meta Graph SLA</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <div className="text-xl sm:text-2xl font-black text-purple-400">35% Less</div>
              <div className="text-[11px] text-slate-400 mt-0.5">COD RTO Rate</div>
            </div>
          </div>

          {/* 📱 3D ISOMETRIC INTERACTIVE CHAT SIMULATOR MOCKUP */}
          <div id="interactive-demo" className="relative max-w-5xl mx-auto">
            {/* 3D Container with perspective */}
            <div className="p-4 sm:p-8 rounded-3xl bg-slate-900/90 border border-indigo-500/20 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-700 hover:shadow-indigo-500/10">
              
              {/* Header Simulator Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Live Autonomous Interaction
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    Simulate WhatsApp AI Customer Journey
                  </h3>
                </div>

                {/* Tab Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto scrollbar-none">
                  {[
                    { id: "AI_ORDER", label: "🤖 AI Order & Sizing", desc: "Natural chat" },
                    { id: "PINCODE_FETCH", label: "📍 Pincode & Address AI", desc: "Auto-fetch" },
                    { id: "CATALOG_FLOW", label: "📦 Catalog Checkout", desc: "Native Flow" },
                    { id: "PAYMENT_UPI", label: "💳 UPI Payment Link", desc: "1-Click" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSimulatorTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        simulatorTab === tab.id
                          ? `${isWhatIn ? "bg-emerald-600" : "bg-indigo-600"} text-white shadow-md`
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Simulation Area */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Left: WhatsApp Mockup Screen (7 cols) */}
                <div className="lg:col-span-7 bg-slate-950/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-inner space-y-3 font-sans">
                  
                  {/* WhatsApp Chat Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {brand.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{brand.name} Official Verified</span>
                          <CheckCircle2 size={13} className="text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          ● Online • AI Auto-Pilot Active
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Meta Cloud API v21.0
                    </span>
                  </div>

                  {/* Dynamic Simulation Messages */}
                  {simulatorTab === "AI_ORDER" && (
                    <div className="space-y-3 text-xs animate-fade-in">
                      {/* Customer Msg */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-xs bg-emerald-700/80 text-white shadow-xs">
                          Bhaiya, L size me 3 Round Neck T-shirts aur 2 Bermudas ka Cash on Delivery order confirm kardo please. Best colors pack karna.
                          <div className="text-[10px] text-emerald-200 text-right mt-1">13:42 ✓✓</div>
                        </div>
                      </div>

                      {/* AI Agent Reply */}
                      <div className="flex justify-start">
                        <div className="max-w-[88%] p-3 rounded-2xl rounded-tl-xs bg-slate-900 border border-slate-800 text-slate-200 shadow-xs space-y-2">
                          <p>
                            सुरेश जी, आपका 5-पीस सैंपल ऑर्डर नोट कर लिया गया है! 📦
                          </p>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] space-y-1">
                            <div className="font-bold text-white">🛍️ Order Summary:</div>
                            <div>• 3x Round Neck Combed Cotton T-Shirt (Size: L)</div>
                            <div>• 2x Heavy GSM Sports Bermudas (Size: L)</div>
                            <div className="font-bold text-emerald-400 pt-1">Total COD Amount: ₹1,499 (Pay on Delivery)</div>
                          </div>
                          <p>
                            कृपया अपना पूरा डिलीवरी पता और पिनकोड शेयर कर दीजिए ताकि पार्सल आज ही छिंदवाड़ा के लिए डिस्पैच हो सके! 📍
                          </p>
                          <div className="text-[10px] text-slate-500 text-right mt-1 font-mono">13:42 • AI Latency: 1.1s</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {simulatorTab === "PINCODE_FETCH" && (
                    <div className="space-y-3 text-xs animate-fade-in">
                      {/* Customer Msg with unstructured address */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-xs bg-emerald-700/80 text-white shadow-xs">
                          सुरेश साहू, कुमकुम ब्यूटी पार्लर के पास, पुराना पंजाब भवन, नरसिंहपुर रोड, छिंदवाड़ा म.प्र. पिन कोड 480001. फोन 7987132429
                          <div className="text-[10px] text-emerald-200 text-right mt-1">13:43 ✓✓</div>
                        </div>
                      </div>

                      {/* AI Pincode & Address Parser Card */}
                      <div className="flex justify-start">
                        <div className="max-w-[88%] p-3 rounded-2xl rounded-tl-xs bg-slate-900 border border-indigo-500/40 text-slate-200 shadow-xs space-y-2">
                          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                            <MapPin size={14} />
                            <span>Pincode & Delivery Address Verified</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] space-y-1 text-slate-300">
                            <div><b>Customer:</b> Suresh Sahu (+91 7987132429)</div>
                            <div><b>Address:</b> Near Kumkum Beauty Parlour, Old Punjab Bhawan, Narsinghpur Road</div>
                            <div><b>City & State:</b> Chhindwara, Madhya Pradesh</div>
                            <div className="font-mono text-emerald-400 font-bold">📍 Pincode: 480001 [Serviceable • BlueDart / Delhivery]</div>
                          </div>

                          <p className="text-[11px]">
                            सुरेश जी, आपका डिलीवरी पता सत्यापित हो गया है! पार्सल आज शाम 5 बजे डिस्पैच कर दिया जाएगा।
                          </p>
                          <div className="text-[10px] text-slate-500 text-right mt-1 font-mono">13:43 • Auto-Parsed in 0.8s</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {simulatorTab === "CATALOG_FLOW" && (
                    <div className="space-y-3 text-xs animate-fade-in">
                      <div className="flex justify-start">
                        <div className="max-w-[90%] p-3 rounded-2xl rounded-tl-xs bg-slate-900 border border-purple-500/30 text-slate-200 shadow-xs space-y-2.5">
                          <div className="font-bold text-white flex items-center justify-between">
                            <span>Catalog Collection 2026</span>
                            <span className="text-[10px] text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">Shopify Synced</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-indigo-900/60 flex items-center justify-center text-lg">👕</div>
                            <div>
                              <div className="font-extrabold text-white">Classic Combed Round-Neck Tee</div>
                              <div className="text-[11px] text-slate-400">₹499 • 100% Cotton • 220 GSM</div>
                            </div>
                          </div>

                          <div className="w-full py-2 rounded-xl text-center font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                            <ShoppingBag size={13} />
                            <span>Confirm Delivery & Address Flow 📍</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {simulatorTab === "PAYMENT_UPI" && (
                    <div className="space-y-3 text-xs animate-fade-in">
                      <div className="flex justify-start">
                        <div className="max-w-[90%] p-3 rounded-2xl rounded-tl-xs bg-slate-900 border border-emerald-500/30 text-slate-200 shadow-xs space-y-2.5">
                          <div className="font-bold text-white flex items-center justify-between">
                            <span>Smart Prepayment Link</span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Cashfree / Razorpay</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                            <div className="text-slate-400">Order #WM-88219 (₹1,499)</div>
                            <div className="text-emerald-400 font-bold">✨ Pay Online & Save ₹75 (5% Instant Discount)</div>
                          </div>

                          <div className="w-full py-2 rounded-xl text-center font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                            <CreditCard size={13} />
                            <span>1-Click UPI / Card Payment (₹1,424)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right: Technical Architecture Highlights (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                      <Cpu size={16} />
                      <span>Zero-Latency AI Agent Engine</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Autonomous Natural Language Ordering</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Powered by Gemini 3.8 Flash, trained on your exact brand knowledge base, inventory quantities, sizing tables, and Hindi/Hinglish Indian dialect nuances.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <MapPin size={16} />
                      <span>Smart Pincode & Postal Lookup</span>
                    </div>
                    <h4 className="text-sm font-black text-white">100% Automated Address Extraction</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Customers send messy, voice-to-text Hindi addresses. Our NLP instantly isolates Name, Phone, Street, City, and 6-Digit Pincode to prevent RTO courier rejections.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                      <ShieldCheck size={16} />
                      <span>Verified Meta Cloud Infrastructure</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Official WhatsApp Business API v21.0</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Multi-tenant isolated credentials with background sentinel token testers and 1-click webhook auto-healers.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 🚀 COMPREHENSIVE PLATFORM FEATURES SHOWCASE */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-t border-slate-900 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className={`text-xs font-black uppercase tracking-widest ${isWhatIn ? "text-emerald-400" : "text-indigo-400"}`}>
              Full-Stack Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Engineered For Modern E-Commerce & High-Volume WhatsApp Sales
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every feature you need to automate conversations, recover lost checkouts, verify COD orders, and empower human support teams.
            </p>
          </div>

          {/* 6-Card Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1: Pincode & Address Auto-Fetch */}
            <div id="pincode-address" className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all space-y-3 group hover:shadow-xl hover:shadow-indigo-500/5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin size={22} />
              </div>
              <h3 className="text-base font-black text-white">Indian Pincode & Address Auto-Fetch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically extracts complete delivery addresses, landmarks, and 6-digit Indian postal codes from unstructured Hindi or English chat text. Validates courier serviceability before booking.
              </p>
              <div className="pt-2 text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                <span>Prevents 85% of COD address failures</span>
                <Check size={13} />
              </div>
            </div>

            {/* Feature 2: WhatsApp Catalog & Order Automation */}
            <div id="shopify-catalog" className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-3 group hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package size={22} />
              </div>
              <h3 className="text-base font-black text-white">WhatsApp Catalog Order Automation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sync your complete product catalog into WhatsApp. Customers can browse multi-item carousels, pick colors and sizes, add to cart, and checkout in a single tap inside WhatsApp.
              </p>
              <div className="pt-2 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <span>Native Meta Catalog API Sync</span>
                <Check size={13} />
              </div>
            </div>

            {/* Feature 3: AI Auto-Pilot Sales Rep */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all space-y-3 group hover:shadow-xl hover:shadow-purple-500/5">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bot size={22} />
              </div>
              <h3 className="text-base font-black text-white">Gemini 3.8 AI Auto-Pilot Copilot</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                An intelligent autonomous sales rep that understands inventory availability, sizing recommendations, wash care, return policies, and negotiates sample bundles 24/7.
              </p>
              <div className="pt-2 text-[11px] font-bold text-purple-400 flex items-center gap-1">
                <span>Sub-1.2s instant customer replies</span>
                <Check size={13} />
              </div>
            </div>

            {/* Feature 4: Shopify Bi-Directional Sync */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 transition-all space-y-3 group hover:shadow-xl hover:shadow-sky-500/5">
              <div className="w-12 h-12 rounded-2xl bg-sky-950 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag size={22} />
              </div>
              <h3 className="text-base font-black text-white">Real-Time Shopify Commerce Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bi-directional live integration. When an order is placed on WhatsApp, it instantly creates an unfulfilled order in Shopify. Abandoned Shopify checkouts automatically trigger recovery sequences.
              </p>
              <div className="pt-2 text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <span>Auto-syncs stock, prices & variants</span>
                <Check size={13} />
              </div>
            </div>

            {/* Feature 5: Native Meta WhatsApp Flows */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 transition-all space-y-3 group hover:shadow-xl hover:shadow-amber-500/5">
              <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sliders size={22} />
              </div>
              <h3 className="text-base font-black text-white">Native Meta Flows (In-Chat Forms)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero external browser redirects. Customers open sleek native forms inside WhatsApp to confirm their delivery address, select prepaid discounts, or submit KYC details seamlessly.
              </p>
              <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>High-converting in-app experience</span>
                <Check size={13} />
              </div>
            </div>

            {/* Feature 6: In-Chat UPI & Payment Links */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/50 transition-all space-y-3 group hover:shadow-xl hover:shadow-rose-500/5">
              <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard size={22} />
              </div>
              <h3 className="text-base font-black text-white">Instant UPI & Partial COD Recovery</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collect prepaid payments via Cashfree and Razorpay UPI intents. Offer a 5% instant discount to convert COD buyers, or collect ₹100 advance deposit to eliminate fake courier returns.
              </p>
              <div className="pt-2 text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <span>Razorpay, Cashfree & UPI QR support</span>
                <Check size={13} />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 🏷️ TRANSPARENT PRICING & PLANS */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-t border-slate-900 bg-slate-900/40 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className={`text-xs font-black uppercase tracking-widest ${isWhatIn ? "text-emerald-400" : "text-indigo-400"}`}>
              Transparent Subscription Tiers
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Predictable Pricing Built For Every Stage
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              No hidden fees. All plans include official Meta Cloud API v21.0 integration and dedicated onboarding.
            </p>

            {/* Monthly / Annual Billing Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingCycle === "MONTHLY" ? "text-white" : "text-slate-400"}`}>
                Monthly Billing
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === "MONTHLY" ? "ANNUALLY" : "MONTHLY")}
                className="w-14 h-7 rounded-full bg-slate-800 border border-slate-700 p-0.5 transition-colors relative cursor-pointer"
              >
                <div className={`w-6 h-6 rounded-full bg-indigo-500 transition-transform ${billingCycle === "ANNUALLY" ? "translate-x-7" : "translate-x-0"}`} />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === "ANNUALLY" ? "text-white" : "text-slate-400"}`}>
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => {
              const price = billingCycle === "ANNUALLY" ? tier.annualPrice : tier.monthlyPrice;
              return (
                <div
                  key={tier.id}
                  className={`p-6 rounded-3xl bg-slate-900 border flex flex-col justify-between transition-all relative ${
                    tier.popular
                      ? `${isWhatIn ? "border-emerald-500/80 shadow-emerald-500/10" : "border-indigo-500/80 shadow-indigo-500/10"} shadow-2xl scale-[1.02]`
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md">
                      {tier.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-black text-white">{tier.name}</h3>
                      <span className="text-[11px] font-bold text-slate-400 font-mono">{tier.agents}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-4 min-h-[34px] leading-relaxed">
                      {tier.description}
                    </p>

                    <div className="mb-6 pb-4 border-b border-slate-800">
                      <div className="text-3xl sm:text-4xl font-black text-white">
                        ₹{price.toLocaleString()}
                        <span className="text-xs font-normal text-slate-400">/month</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Includes <b>{tier.messages}</b> messages & <b>{tier.aiReplies}</b> AI tokens
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-300 mb-6">
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(tier.id)}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tier.popular
                        ? `${isWhatIn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white shadow-md`
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    }`}
                  >
                    <span>Choose {tier.name}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 🎯 LEAD CAPTURE & CONTACT FORM */}
      <section id="lead-capture-section" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-t border-slate-900 bg-slate-950 relative">
        <div className="max-w-4xl mx-auto">
          
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
              <span className={`text-xs font-black uppercase tracking-widest ${isWhatIn ? "text-emerald-400" : "text-indigo-400"}`}>
                Quick Onboarding & Free Consultation
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Launch Your Autonomous WhatsApp Store
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Enter your details below. Our onboarding team will configure your Meta WABA credentials and AI knowledge base within 2 business hours.
              </p>
            </div>

            {submittedLead ? (
              <div className="p-8 text-center bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-black text-white">
                  Inquiry Received, {submittedLead.name}!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your lead profile has been registered in our Super-Admin queue. Our solutions architect is reviewing your business requirements.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/${brand.supportWhatsApp.replace(/[^0-9]/g, "")}?text=Hi%20${brand.name}%2C%20I%20just%20submitted%20an%20inquiry%20for%20my%20business.`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Connect Instantly on WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setSubmittedLead(null)}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Submit another response
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitLead} className="space-y-4">
                
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Suresh Sahu"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Company / Brand Name *
                    </label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Espon Clothing Pvt Ltd"
                        value={form.businessName}
                        onChange={e => setForm({ ...form, businessName: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* WhatsApp / Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      WhatsApp / Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 9896507407"
                        value={form.mobile}
                        onChange={e => setForm({ ...form, mobile: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Work Email *
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@yourbrand.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                </div>

                {/* Selected Plan */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Interested Subscription Plan
                  </label>
                  <select
                    value={form.selectedPlan}
                    onChange={e => setForm({ ...form, selectedPlan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="STARTER">Starter Plan (₹999/mo • 5,000 Messages)</option>
                    <option value="GROWTH">Growth Plan (₹2,499/mo • 25,000 Messages • Most Popular)</option>
                    <option value="BUSINESS">Business Plan (₹4,999/mo • 75,000 Messages • Full Modules)</option>
                    <option value="ENTERPRISE">Enterprise Plan (₹9,999/mo • Custom Throughput)</option>
                    <option value="CUSTOM">Custom High-Volume Consultation</option>
                  </select>
                </div>

                {/* Message / Requirements */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    What specific features are you looking for? (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. We get 1,000 WhatsApp chats daily from Facebook ads. We want AI order confirmation and address auto-validation for our Shopify store..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r ${isWhatIn ? "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25" : "from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25"} shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]`}
                  >
                    {submitting ? (
                      <RefreshCw size={16} className="animate-spin text-white" />
                    ) : (
                      <Send size={15} />
                    )}
                    <span>{submitting ? "Registering Lead..." : "Submit Inquiry & Get Free Onboarding"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 text-center pt-1 font-mono">
                  🔒 Zero spam guarantee • Official Meta BSP Cloud Architecture
                </p>

              </form>
            )}

          </div>

        </div>
      </section>

      {/* ❓ FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-10 border-t border-slate-900 bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-400">Everything you need to know about setting up your WhatsApp store.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Do I need Meta Embedded Signup or can I use my existing WhatsApp Business Account?",
                a: "You do NOT need Meta Embedded Signup. Our platform connects directly to your Meta Cloud API credentials (WABA ID, Phone ID, and System User Token) in 2 minutes. We isolate your tenant credentials safely."
              },
              {
                q: "How does the Indian Pincode & Delivery Address Auto-Fetch work?",
                a: "When customers text their address in messy formats (e.g. in Hindi or English without clear line breaks), our Gemini AI extracts the person name, phone, street, landmark, city, state, and 6-digit postal code. It automatically verifies serviceability to prevent COD courier return rejections."
              },
              {
                q: "Can I connect my Shopify product catalog and inventory?",
                a: "Yes! We provide full bi-directional Shopify sync. Products, stock quantities, and prices sync into WhatsApp. Orders placed on WhatsApp are automatically created in your Shopify admin panel."
              },
              {
                q: "How does the Partial COD Advance Payment work?",
                a: "You can automatically prompt customers to pay a small advance (e.g. ₹100 or 10%) via UPI or Razorpay link before dispatching COD. If paid, it deducts from the total bill and drastically reduces RTO returns."
              },
              {
                q: "Can multiple team members manage the inbox at once?",
                a: "Yes! All plans include multi-agent team inbox access. You can assign conversations to specific sales reps, add internal private notes, and view real-time chat histories."
              }
            ].map((faq, idx) => (
              <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 💼 FOOTER */}
      <footer className="py-12 px-4 sm:px-6 lg:px-10 border-t border-slate-900 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${isWhatIn ? "from-emerald-600 to-teal-500" : "from-indigo-600 to-purple-600"} flex items-center justify-center text-white font-bold text-xs`}>
              {brand.name.charAt(0)}
            </div>
            <div>
              <div className="font-black text-white text-sm">{brand.name} Cloud Platform</div>
              <div className="text-[11px] text-slate-500">© 2026 {brand.name} Inc. All rights reserved.</div>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Client Portal</Link>
            <Link href="/owner/login" className="hover:text-white transition-colors text-indigo-400">Super-Admin Console</Link>
          </div>

        </div>
      </footer>

    </div>
  );
}
