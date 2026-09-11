"use client";

import React, { useState } from "react";

export default function PresentationPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<"ai" | "catalog" | "payment" | "team">("ai");
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "bot" | "agent"; text?: string; type?: string; time: string; data?: any }>>([
    {
      sender: "user",
      text: "Hi, do you have the Emerald Silk Kurti in size L? And how fast can you ship?",
      time: "10:30 AM",
    },
    {
      sender: "bot",
      text: "Namaste! Yes, the Emerald Silk Kurti (Size L) is in stock at ₹1,499 ✨\n\nFabric: 100% Pure Mulberry Silk\nDispatch: Dispatches today by 4 PM (Est. delivery: 2-3 business days).\n\nWould you like me to reserve it for you?",
      time: "10:30 AM",
    },
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [phoneTilt, setPhoneTilt] = useState({ x: 0, y: 0 });

  // Handle phone 3D tilt effect on mouse move
  const handlePhoneMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPhoneTilt({
      x: -(y / rect.height) * 16,
      y: (x / rect.width) * 16,
    });
  };

  const handlePhoneMouseLeave = () => {
    setPhoneTilt({ x: 0, y: 0 });
  };

  // Trigger simulator actions
  const runSimulatorScenario = (type: "ai" | "catalog" | "payment" | "team") => {
    setActiveSimulatorTab(type);
    setIsAiTyping(true);

    if (type === "ai") {
      setSimMessages([
        { sender: "user", text: "What is your return policy and sizing guide?", time: "10:32 AM" },
      ]);
      setTimeout(() => {
        setIsAiTyping(false);
        setSimMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "Here is our 7-Day Easy Exchange Policy 🛡️:\n\n• Free size replacements within 7 days of delivery\n• Size L fits Chest 40\", Length 44\"\n\nShall I send our complete Spring 2026 Collection catalog?",
            time: "10:32 AM",
          },
        ]);
      }, 600);
    } else if (type === "catalog") {
      setSimMessages([
        { sender: "user", text: "Show me trending oversized t-shirts", time: "10:34 AM" },
      ]);
      setTimeout(() => {
        setIsAiTyping(false);
        setSimMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            type: "spm",
            text: "Here is our #1 Best Seller synchronized directly from Shopify:",
            time: "10:34 AM",
            data: {
              title: "Heavyweight Graphic Drop-Shoulder Tee",
              price: "₹899",
              originalPrice: "₹1,299",
              tag: "In Stock (32 left)",
            },
          },
        ]);
      }, 600);
    } else if (type === "payment") {
      setSimMessages([
        { sender: "user", text: "I'll take 2 pieces. Send me the UPI payment QR please.", time: "10:35 AM" },
      ]);
      setTimeout(() => {
        setIsAiTyping(false);
        setSimMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            type: "payment",
            text: "Order #WH-8842 Summary:\n• 2x Premium Apparel (₹1,798)\n• Free Express Shipping Applied 🎉",
            time: "10:35 AM",
            data: {
              amount: "₹1,798",
            },
          },
        ]);
      }, 600);
    } else if (type === "team") {
      setSimMessages([
        { sender: "user", text: "Can I get a custom wholesale quote for 100 units?", time: "10:36 AM" },
      ]);
      setTimeout(() => {
        setIsAiTyping(false);
        setSimMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "Routing you to our B2B Wholesale Specialist right away...",
            time: "10:36 AM",
          },
          {
            sender: "agent",
            text: "Hello! This is Amit from Wholesale. I have approved a 35% bulk discount for 100 units (₹480/pc). I can send the proforma invoice right here.",
            time: "10:37 AM",
          },
        ]);
      }, 700);
    }
  };

  const whatsappBaseUrl = "https://wa.me/918221058716?text=";
  const demoWhatsAppUrl = `${whatsappBaseUrl}${encodeURIComponent("Hi Tinkal.in, I want to book a 7-day free demo of What-In WhatsApp Automation!")}`;
  const starterWhatsAppUrl = `${whatsappBaseUrl}${encodeURIComponent("Hi Tinkal.in, I want to start the 7-Day Free Demo for the STARTER Plan (₹999/mo) of What-In.")}`;
  const growthWhatsAppUrl = `${whatsappBaseUrl}${encodeURIComponent("Hi Tinkal.in, I want to start the 7-Day Free Demo for the GROWTH Plan (₹2,499/mo) of What-In with Gemini AI!")}`;
  const customWhatsAppUrl = `${whatsappBaseUrl}${encodeURIComponent("Hi Tinkal.in, I want to discuss a Custom / Enterprise Plan for our business on What-In.")}`;
  const phoneCallUrl = "tel:+919306817689";

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Dynamic 3D Glowing Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[15%] w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-[35%] right-[10%] w-[650px] h-[650px] bg-indigo-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[5%] left-[20%] w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* TOP SLEEK STICKY NAVIGATION BAR */}
      <header className="sticky top-0 left-0 right-0 bg-[#090d16]/85 backdrop-blur-xl border-b border-slate-800/80 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo & Developer Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/25">
              ⚡
            </div>
            <div>
              <div className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>WHAT-IN</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  CLOUD OS
                </span>
              </div>
              <div className="text-xs text-slate-400">
                developed by{" "}
                <a
                  href="https://tinkal.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-bold hover:text-emerald-300 underline underline-offset-2 transition-colors"
                >
                  tinkal.in
                </a>
              </div>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#simulator" className="hover:text-emerald-400 transition-colors">
              3D Simulator
            </a>
            <a href="#matrix" className="hover:text-emerald-400 transition-colors">
              Comparison
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href={phoneCallUrl}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border border-slate-700 transition-all transform hover:-translate-y-0.5 shadow-md"
            >
              <span>📞</span>
              <span>Call Now</span>
            </a>
            <a
              href={demoWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>💬</span>
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        {/* HERO SECTION WITH 3D INTERACTIVE SMARTPHONE SIMULATOR */}
        <div id="simulator" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24 pt-4">
          {/* Left Column: Headline & Value Prop */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="animate-pulse">✨</span> 7-Day Free Live Demo • Official WhatsApp Cloud OS
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Scale WhatsApp into your <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                #1 24/7 Revenue Channel
              </span>
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl font-normal max-w-2xl leading-relaxed">
              Automate customer inquiries with <strong>Gemini AI</strong>, synchronize <strong>Shopify & Meta Catalogs</strong>, collect <strong>0% fee UPI QR payments</strong>, and supercharge ROAS with <strong>Meta CAPI Server Tracking</strong>. Engineered by{" "}
              <a
                href="https://tinkal.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 font-bold hover:underline"
              >
                tinkal.in
              </a>
              .
            </p>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={demoWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transform hover:-translate-y-1 transition-all"
              >
                <span className="text-xl">💬</span>
                <div className="text-left">
                  <div className="leading-tight">Chat on WhatsApp</div>
                  <div className="text-[11px] font-semibold text-slate-900/80">Book 7-Day Free Demo</div>
                </div>
              </a>
              <a
                href={phoneCallUrl}
                className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-base px-7 py-4 rounded-2xl border border-slate-700 shadow-xl transform hover:-translate-y-1 transition-all"
              >
                <span className="text-xl">📞</span>
                <div className="text-left">
                  <div className="leading-tight">Direct Call</div>
                  <div className="text-[11px] font-normal text-slate-400">Instant Engineering Setup</div>
                </div>
              </a>
            </div>

            {/* Micro Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-2xl font-black text-emerald-400">0%</div>
                <div className="text-xs text-slate-400 font-medium">Meta Cloud Markup</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-2xl font-black text-indigo-400">24/7</div>
                <div className="text-xs text-slate-400 font-medium">Gemini AI Auto-Reply</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-2xl font-black text-teal-400">Instant</div>
                <div className="text-xs text-slate-400 font-medium">In-Chat UPI QR</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-2xl font-black text-amber-400">100%</div>
                <div className="text-xs text-slate-400 font-medium">Lead Routing Sync</div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Phone Simulator */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {/* Interactive Scenario Switcher Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg">
              <button
                onClick={() => runSimulatorScenario("ai")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                  activeSimulatorTab === "ai"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🤖 AI Copilot
              </button>
              <button
                onClick={() => runSimulatorScenario("catalog")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                  activeSimulatorTab === "catalog"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📦 Catalog SPM
              </button>
              <button
                onClick={() => runSimulatorScenario("payment")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                  activeSimulatorTab === "payment"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                💳 UPI QR Pay
              </button>
              <button
                onClick={() => runSimulatorScenario("team")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                  activeSimulatorTab === "team"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                👥 Multi-Agent
              </button>
            </div>

            {/* 3D Smartphone Container with Mouse Parallax */}
            <div
              className="perspective-[1200px] w-full max-w-[360px] cursor-grab"
              onMouseMove={handlePhoneMouseMove}
              onMouseLeave={handlePhoneMouseLeave}
            >
              <div
                style={{
                  transform: `rotateX(${phoneTilt.x}deg) rotateY(${phoneTilt.y}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="relative bg-slate-950 border-[6px] border-slate-800 rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.2)] overflow-hidden"
              >
                {/* Smartphone Dynamic Island / Speaker Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-slate-950 rounded-full mr-2" />
                  <div className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Smartphone Screen Header */}
                <div className="bg-[#121b22] px-4 pt-8 pb-3 border-b border-slate-800 flex items-center justify-between relative z-20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 font-bold text-xs flex items-center justify-center text-white">
                      WI
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        What-In Official <span className="text-emerald-400 text-[10px]">✓</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online • Auto-Assisted
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs flex items-center gap-2">
                    <span>📞</span>
                    <span>⋮</span>
                  </div>
                </div>

                {/* Smartphone Screen Chat Canvas */}
                <div className="bg-[#0b141a] p-4 h-[380px] overflow-y-auto space-y-3 font-sans text-xs relative">
                  {/* Subtle WhatsApp chat wallpaper pattern */}
                  <div className="absolute inset-0 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                  {simMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col relative z-10 ${
                        msg.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {msg.sender === "agent" && (
                        <span className="text-[9px] text-amber-400 font-bold mb-1 flex items-center gap-1">
                          👤 Team Specialist (Amit - Sales)
                        </span>
                      )}

                      {/* Standard Text Bubble */}
                      {!msg.type && (
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-slate-100 whitespace-pre-line leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-[#005c4b] rounded-tr-none text-emerald-50"
                              : "bg-[#202c33] rounded-tl-none border border-slate-700/50"
                          }`}
                        >
                          {msg.text}
                          <div className="text-[9px] text-slate-400 text-right mt-1">{msg.time}</div>
                        </div>
                      )}

                      {/* Interactive Single Product Message (SPM) */}
                      {msg.type === "spm" && (
                        <div className="max-w-[90%] bg-[#202c33] border border-slate-700 rounded-2xl overflow-hidden shadow-md rounded-tl-none">
                          <div className="p-3">
                            <div className="text-[11px] text-slate-300 mb-2">{msg.text}</div>
                            <div className="bg-[#111b21] p-2.5 rounded-xl border border-slate-800">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                                  {msg.data?.tag}
                                </span>
                                <span className="text-[10px] line-through text-slate-500">{msg.data?.originalPrice}</span>
                              </div>
                              <div className="font-bold text-white text-xs mt-1">{msg.data?.title}</div>
                              <div className="text-emerald-400 font-bold text-sm mt-0.5">{msg.data?.price}</div>
                            </div>
                          </div>
                          <div className="bg-[#2a3942] py-2 text-center text-emerald-400 font-bold text-[11px] border-t border-slate-700/80 flex items-center justify-center gap-1.5">
                            <span>🛒</span> View Catalog & Order
                          </div>
                        </div>
                      )}

                      {/* Interactive UPI QR Payment Message */}
                      {msg.type === "payment" && (
                        <div className="max-w-[90%] bg-[#202c33] border border-emerald-500/50 rounded-2xl p-3 shadow-lg rounded-tl-none">
                          <div className="text-[11px] text-slate-200 whitespace-pre-line mb-2">{msg.text}</div>
                          <div className="bg-white p-2 rounded-xl text-center shadow-inner my-2">
                            <div className="text-[10px] font-bold text-slate-900 mb-1">Scan to Pay via UPI (0% Fee)</div>
                            <div className="w-24 h-24 bg-slate-900 mx-auto rounded-lg flex items-center justify-center text-white text-2xl font-black">
                              QR
                            </div>
                            <div className="text-[9px] text-slate-600 mt-1 font-mono">BHIM • GPay • PhonePe • Paytm</div>
                          </div>
                          <div className="bg-emerald-500 text-slate-950 font-black py-2 rounded-xl text-center text-xs shadow-md">
                            💳 Pay {msg.data?.amount} via UPI
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* AI Typing Animation Indicator */}
                  {isAiTyping && (
                    <div className="flex items-center gap-1.5 bg-[#202c33] px-3 py-2 rounded-2xl w-20 rounded-tl-none border border-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>

                {/* Smartphone Input Bar */}
                <div className="bg-[#202c33] p-2.5 border-t border-slate-800 flex items-center gap-2">
                  <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-slate-400">
                    Type a message...
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow">
                    🎤
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-3">✨ Hover mouse to interact with 3D tilt</div>
          </div>
        </div>

        {/* THE 7 SUPERPOWER PILLARS */}
        <div id="features" className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full">
              Enterprise Feature Matrix
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              7 Reasons Why High-Growth Brands Switch to WHAT-IN
            </h2>
            <p className="text-slate-400 text-sm">
              Engineered by{" "}
              <a
                href="https://tinkal.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 font-bold hover:underline"
              >
                tinkal.in
              </a>{" "}
              for Shopify merchants, D2C brands, B2B wholesalers, and performance marketing teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/30 flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🤖
                </div>
                <h3 className="text-lg font-bold text-white">Gemini AI Product Copilot</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Ingests your PDF catalogs, size charts, and website URLs. Automatically answers customer queries in Hindi, English, or Hinglish with 1-click live agent suggestion drafts.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span> Zero hallucination knowledge base
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/30 flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📦
                </div>
                <h3 className="text-lg font-bold text-white">Shopify & Meta Catalog 2-Way Sync</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Live inventory and variant sync. Send Single Product Messages (SPM) or Multi-Product Catalogs (MPM) directly in chat with in-app cart completion.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                <span>✓</span> Live stock depletion protection
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-teal-500/50 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-teal-950/30 flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <h3 className="text-lg font-bold text-white">Meta Ads (CAPI) & Audience Sync</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Server-side Conversions API (CAPI) tracking for WhatsApp clicks. Automatically sync high-intent leads into Meta Custom Retargeting Audiences.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-teal-400 font-semibold flex items-center gap-1">
                <span>✓</span> 30%+ ROAS lift on Click-to-WhatsApp ads
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-amber-950/30 flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  💳
                </div>
                <h3 className="text-lg font-bold text-white">0% Fee Direct UPI QR Payments</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Generate instant unified payment cards with scannable UPI QR codes (GPay, PhonePe, Paytm) directly to merchant VPA without gateway deductions.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <span>✓</span> Instant verification & Razorpay fallback
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/30 flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👥
                </div>
                <h3 className="text-lg font-bold text-white">Multi-Agent Shared Team Inbox</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Assign leads to sales reps automatically via Round-Robin. Internal private @notes, customer tags, and live desktop push notifications.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span> Indian 10-digit number auto-healing
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-pink-500/50 p-6 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-pink-950/30 flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📢
                </div>
                <h3 className="text-lg font-bold text-white">Smart Drip Campaigns & Broadcasts</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Broadcast Meta-approved templates with dynamic variable insertion. Schedule automated multi-stage drip sequences (Day 1, Day 3, Day 7).
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-pink-400 font-semibold flex items-center gap-1">
                <span>✓</span> High delivery rate & spam protection
              </div>
            </div>
          </div>
        </div>

        {/* COMPARISON MATRIX VS TRADITIONAL TOOLS */}
        <div id="matrix" className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-white mb-2">Why Settle for Legacy WhatsApp Tools?</h2>
            <p className="text-slate-400 text-sm">
              Compare WHAT-IN against traditional providers like Wati or Interakt.
            </p>
          </div>

          <div className="overflow-x-auto bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-4 px-4 font-bold">Key Capability</th>
                  <th className="py-4 px-4 font-bold text-rose-400">Traditional Market Tools</th>
                  <th className="py-4 px-4 font-black text-emerald-400 bg-emerald-950/40 rounded-t-xl">
                    ⚡ WHAT-IN (by tinkal.in)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Meta Cloud API Markup</td>
                  <td className="py-4 px-4 text-rose-300">20% to 40% added margin per message</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">0% Markup (Official Base Rates)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">AI Product Intelligence</td>
                  <td className="py-4 px-4 text-slate-400">Rigid keyword-based matchers</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Gemini AI trained on your PDFs & URLs</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Meta Conversions API (CAPI)</td>
                  <td className="py-4 px-4 text-slate-400">Not supported or expensive add-on</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Built-in server-side CAPI tracking</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Direct UPI QR In-Chat Payments</td>
                  <td className="py-4 px-4 text-slate-400">External redirect browser links only</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Unified QR Card + 0% Gateway Fees</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Shopify Catalog 2-Way Sync</td>
                  <td className="py-4 px-4 text-slate-400">Basic contact sync only</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Native SPM & MPM In-Chat Shopping</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Phone SLA & Onboarding</td>
                  <td className="py-4 px-4 text-slate-400">Slow email ticketing queues</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">
                    Direct On-Call Phone SLA with{" "}
                    <a
                      href="https://tinkal.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-300 underline font-bold"
                    >
                      tinkal.in
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PRICING PLANS SECTION */}
        <div id="pricing" className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
              Transparent Pricing • Zero Conversation Limits
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Choose the Plan Built for Your Scale
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Unlimited customer contacts and chats across all plans. No hidden conversation surcharges.
            </p>

            {/* Monthly / Annual Billing Switcher */}
            <div className="inline-flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl mt-4">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`text-xs font-bold px-5 py-2 rounded-xl transition-all ${
                  billingCycle === "monthly"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`text-xs font-bold px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-emerald-400/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black border border-emerald-400/30">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1: STARTER */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between transition-all hover:border-slate-700 hover:shadow-xl backdrop-blur-sm">
              <div>
                <div className="text-lg font-bold text-white mb-1">STARTER</div>
                <div className="text-xs text-slate-400 mb-6">
                  Perfect for small shops, boutiques & emerging D2C brands.
                </div>

                <div className="mb-6">
                  <div className="text-4xl font-black text-white font-mono">
                    {billingCycle === "monthly" ? "₹999" : "₹799"}
                    <span className="text-sm text-slate-400 font-sans font-medium"> / month</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-bold mt-1">
                    {billingCycle === "monthly" ? "₹999 billed monthly" : "₹9,599 billed annually (Save 20%)"}
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  What's Included:
                </div>
                <ul className="space-y-3 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> 1 WhatsApp Business Number
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Up to 3 Agent Logins
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Unlimited Customer Contacts & Chats
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Shared Team Inbox & Internal Mentions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Shopify & Meta Catalog Sync
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Direct UPI QR In-Chat Payments
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Standard Email & WhatsApp Support
                  </li>
                </ul>
              </div>

              <a
                href={starterWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow"
              >
                <span>💬</span> Start Free Demo on WhatsApp
              </a>
            </div>

            {/* Plan 2: GROWTH (MOST POPULAR) */}
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500 rounded-3xl p-8 flex flex-col justify-between shadow-[0_15px_50px_-10px_rgba(16,185,129,0.3)] transform lg:-translate-y-3">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                ★ MOST POPULAR
              </div>

              <div>
                <div className="text-lg font-bold text-emerald-400 mb-1">GROWTH</div>
                <div className="text-xs text-slate-400 mb-6">
                  For scaling e-commerce brands, active sales reps & wholesale businesses.
                </div>

                <div className="mb-6">
                  <div className="text-4xl font-black text-white font-mono">
                    {billingCycle === "monthly" ? "₹2,499" : "₹1,999"}
                    <span className="text-sm text-slate-400 font-sans font-medium"> / month</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-bold mt-1">
                    {billingCycle === "monthly" ? "₹2,499 billed monthly" : "₹23,999 billed annually (Save 20%)"}
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Everything in Starter, plus:
                </div>
                <ul className="space-y-3 text-xs text-slate-200 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> 1 WhatsApp Business Number
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Up to 10 Agent Logins
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Unlimited Active Customer Chats
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Full Gemini AI Product Recommender & Co-Pilot
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> PDF & Website Knowledge Scraper
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Meta Conversions API (CAPI) Server Sync
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Multi-Stage Automated Drip Sequences
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Smart Round-Robin Lead Routing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Priority On-Call Phone Support SLA
                  </li>
                </ul>
              </div>

              <a
                href={growthWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                <span>💬</span> Start Growth Demo with AI
              </a>
            </div>

            {/* Plan 3: ENTERPRISE / CUSTOM */}
            <div className="bg-slate-900/70 border-2 border-indigo-500/50 rounded-3xl p-8 flex flex-col justify-between transition-all hover:border-indigo-400 hover:shadow-xl backdrop-blur-sm">
              <div>
                <div className="text-lg font-bold text-indigo-400 mb-1">ENTERPRISE / CUSTOM</div>
                <div className="text-xs text-slate-400 mb-6">
                  Bespoke architecture for large enterprises, multi-store brands & agencies.
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-black text-white">Custom Plan</div>
                  <div className="text-xs text-indigo-400 font-bold mt-1">
                    Discuss with our Engineering Team
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Tailored Capabilities:
                </div>
                <ul className="space-y-3 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> Multiple WhatsApp Business Numbers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> Unlimited Agent & Team Logins
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> Dedicated Gemini AI Fine-Tuning & Custom Prompts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> Custom ERP, CRM & Webhook Integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> High-Volume Broadcast & Drip Infrastructure
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> White-Label & Dedicated Custom Domain Options
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">✓</span> Dedicated Account Manager & Direct Phone SLA
                  </li>
                </ul>
              </div>

              <a
                href={customWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <span>💬</span> Discuss Custom Plan
              </a>
            </div>
          </div>
        </div>

        {/* BOTTOM CALL TO ACTION & FOOTER */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Ready to automate your WhatsApp sales?
            </h2>
            <p className="text-slate-300 text-base">
              Get set up in under 10 minutes. Test live AI responses, catalog sync, and UPI payments on your actual business WhatsApp number with our 7-day risk-free trial.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <a
                href={demoWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transform hover:-translate-y-1 transition-all"
              >
                <span>💬</span> Chat on WhatsApp
              </a>
              <a
                href={phoneCallUrl}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base px-6 py-4 rounded-2xl border border-slate-700 transition-all"
              >
                <span>📞</span> Call Now
              </a>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-slate-800/80">
              <span>⚡ Platform: <strong className="text-slate-200">what-in.tinkal.in</strong></span>
              <span>
                🏢 Developed by:{" "}
                <a
                  href="https://tinkal.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-bold hover:underline"
                >
                  tinkal.in
                </a>
              </span>
              <span>
                💬 WhatsApp:{" "}
                <a
                  href={demoWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-200 hover:text-emerald-400 font-semibold"
                >
                  Direct Chat
                </a>
              </span>
              <span>
                📞 On-Call Support:{" "}
                <a
                  href={phoneCallUrl}
                  className="text-slate-200 hover:text-emerald-400 font-semibold"
                >
                  Direct Line
                </a>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
