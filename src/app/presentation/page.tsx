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

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden pb-24">
      {/* Dynamic 3D Glowing Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute top-[35%] right-[10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[5%] left-[20%] w-[550px] h-[550px] bg-teal-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      </div>

      {/* Sticky Bottom Quick Contact Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0c1222]/95 backdrop-blur-xl border-t border-slate-800/80 px-6 py-3.5 z-50 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>🚀 WHAT-IN</span>
              <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                developed by tinkal.in
              </span>
            </div>
            <div className="text-xs text-slate-400">7-Day Free Full-Access Live Demo Available</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20book%20a%207-day%20free%20demo%20of%20What-In%20WhatsApp%20Automation!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>💬</span>
            <span className="hidden sm:inline">WhatsApp Chat</span> (8221058716)
          </a>
          <a
            href="tel:+919306817689"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-full border border-slate-700 transition-all transform hover:-translate-y-0.5"
          >
            <span>📞</span>
            <span className="hidden sm:inline">Call</span> 9306817689
          </a>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Developer & Demo Header Banner */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-indigo-950/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 mb-10 flex flex-wrap items-center justify-between gap-4 shadow-xl shadow-emerald-950/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">
              ⚡ Public Product Page
            </span>
            <span className="text-sm font-semibold text-slate-200">
              Developed by <strong className="text-emerald-400">tinkal.in</strong> • No login needed
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <a
              href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20book%20a%207-day%20free%20demo%20of%20What-In%20WhatsApp%20Automation!"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5"
            >
              💬 WhatsApp: 8221058716
            </a>
            <a
              href="tel:+919306817689"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-white/10 transition-all flex items-center gap-1.5"
            >
              📞 Call: 9306817689
            </a>
          </div>
        </div>

        {/* HERO SECTION WITH 3D INTERACTIVE SMARTPHONE SIMULATOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          {/* Left Column: Headline & Value Prop */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span>✨</span> The Complete WhatsApp Business Operating System
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Scale WhatsApp into your <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                #1 24/7 Revenue Channel
              </span>
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl font-normal max-w-2xl leading-relaxed">
              Automate customer inquiries with <strong>Gemini AI</strong>, synchronize <strong>Shopify & Meta Catalogs</strong>, collect <strong>0% fee UPI QR payments</strong>, and supercharge ROAS with <strong>Meta CAPI Server Tracking</strong>.
            </p>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20book%20a%207-day%20free%20demo%20of%20What-In%20WhatsApp%20Automation!"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transform hover:-translate-y-1 transition-all"
              >
                <span>💬</span> WhatsApp Chat (8221058716)
              </a>
              <a
                href="tel:+919306817689"
                className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-base px-6 py-4 rounded-2xl border border-slate-700 shadow-xl transform hover:-translate-y-1 transition-all"
              >
                <span>📞</span> Direct Call (9306817689)
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
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            {/* Interactive Mode Switcher Pill */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-4 shadow-lg">
              <button
                onClick={() => runSimulatorScenario("ai")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSimulatorTab === "ai"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🤖 AI Copilot
              </button>
              <button
                onClick={() => runSimulatorScenario("catalog")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSimulatorTab === "catalog"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📦 Catalog SPM
              </button>
              <button
                onClick={() => runSimulatorScenario("payment")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSimulatorTab === "payment"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                💳 UPI QR Pay
              </button>
              <button
                onClick={() => runSimulatorScenario("team")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSimulatorTab === "team"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                👥 Multi-Agent
              </button>
            </div>

            {/* 3D Phone Shell with Mouse Tracking Tilt */}
            <div
              style={{
                perspective: 1200,
              }}
              className="w-full max-w-[340px]"
            >
              <div
                onMouseMove={handlePhoneMouseMove}
                onMouseLeave={handlePhoneMouseLeave}
                style={{
                  transform: `rotateX(${phoneTilt.x}deg) rotateY(${phoneTilt.y}deg)`,
                  transition: "transform 0.15s ease-out",
                  transformStyle: "preserve-3d",
                }}
                className="bg-slate-950 rounded-[40px] p-3 border-4 border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_50px_rgba(16,185,129,0.2)] relative"
              >
                {/* Phone Speaker Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800 mr-2" />
                  <div className="w-10 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* WhatsApp Chat Screen */}
                <div className="bg-[#0b141a] rounded-[32px] overflow-hidden pt-8 pb-4 flex flex-col h-[520px] text-slate-200 text-xs border border-slate-900 relative">
                  {/* WhatsApp Chat Header */}
                  <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow">
                        WI
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1">
                          What-In Official
                          <span className="text-[10px] text-emerald-400">✓</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium">
                          {isAiTyping ? "AI is typing..." : "Online • Auto-Assisted"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <span>📞</span>
                      <span>⋮</span>
                    </div>
                  </div>

                  {/* Chat Messages Body */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                    {simMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          msg.sender === "user" ? "items-end" : "items-start"
                        } animate-fade-in`}
                      >
                        {msg.sender === "agent" && (
                          <div className="text-[9px] text-indigo-400 font-bold mb-0.5 ml-1">
                            👤 Team Specialist (Amit - Sales)
                          </div>
                        )}
                        <div
                          className={`max-w-[86%] rounded-2xl px-3 py-2 text-xs shadow-md ${
                            msg.sender === "user"
                              ? "bg-[#005c4b] text-white rounded-tr-none"
                              : msg.sender === "agent"
                              ? "bg-[#202c33] text-indigo-100 border border-indigo-500/40 rounded-tl-none"
                              : "bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-800"
                          }`}
                        >
                          {/* Rich SPM Product Card */}
                          {msg.type === "spm" && msg.data && (
                            <div className="bg-[#111b21] rounded-xl p-2.5 mb-2 border border-slate-800">
                              <div className="h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-3xl mb-2">
                                👕
                              </div>
                              <div className="font-bold text-white text-xs">{msg.data.title}</div>
                              <div className="flex items-center justify-between mt-1">
                                <div>
                                  <span className="font-extrabold text-emerald-400 text-sm">{msg.data.price}</span>
                                  <span className="text-[10px] text-slate-500 line-through ml-1">{msg.data.originalPrice}</span>
                                </div>
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                                  {msg.data.tag}
                                </span>
                              </div>
                              <button className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 shadow">
                                🛍️ 1-Tap Buy Now
                              </button>
                            </div>
                          )}

                          {/* Rich Payment Card */}
                          {msg.type === "payment" && msg.data && (
                            <div className="bg-[#111b21] rounded-xl p-2.5 mb-2 border border-emerald-500/40 text-center">
                              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                                Direct UPI Instant Payment
                              </div>
                              <div className="text-xl font-black text-white my-1">{msg.data.amount}</div>
                              <div className="w-24 h-24 bg-white p-1 rounded-lg mx-auto my-1.5 flex items-center justify-center">
                                <div className="w-full h-full bg-slate-950 rounded flex flex-col items-center justify-center text-[8px] text-emerald-400 font-mono">
                                  <span>[ UPI QR ]</span>
                                  <span>GPay / Paytm</span>
                                </div>
                              </div>
                              <div className="text-[9px] text-slate-400 mb-2">0% Gateway Markup • Direct to Merchant</div>
                              <button className="w-full bg-emerald-500 text-slate-950 font-bold py-1 rounded text-xs">
                                ⚡ Pay via UPI App
                              </button>
                            </div>
                          )}

                          <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                          <div className="text-[9px] text-slate-400 text-right mt-1">{msg.time}</div>
                        </div>
                      </div>
                    ))}

                    {isAiTyping && (
                      <div className="flex items-center gap-1.5 bg-[#202c33] px-3 py-2 rounded-2xl rounded-tl-none w-16">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>

                  {/* Input Mock Bar */}
                  <div className="px-3 pt-2 flex items-center gap-2">
                    <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-slate-400 text-[11px] flex items-center justify-between">
                      <span>Type a message...</span>
                      <span>📎</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 text-xs">
                      🎤
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D CORE CAPABILITY CARDS WITH HOVER DEPTH */}
        <div className="mt-16 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full">
              Engineered for Explosive Growth
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              The 7 Core Superpowers of What-In
            </h2>
            <p className="text-slate-400 text-base mt-3">
              Built ground-up with cutting-edge Meta Cloud APIs and Google Gemini AI to automate sales and support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group relative bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col justify-between backdrop-blur-sm">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Gemini AI Product Recommender
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Autonomous AI model trained directly on your uploaded PDF catalogs, size charts, pricing sheets, and website links.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Answers size, fabric & pricing queries in Hindi, English & Hinglish
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Live Human Agent Co-Pilot with 1-click suggested response drafts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Instant seamless fallback to live human reps on complex inquiries
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col justify-between backdrop-blur-sm">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  👥
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Multi-Agent Shared Inbox & Routing
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  One centralized, real-time WhatsApp inbox for your entire sales and customer care team.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Round-robin and department-based automatic lead distribution
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Internal private @notes with desktop push notifications
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Auto-heals 10-digit numbers into verified Meta E.164 standard
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group relative bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col justify-between backdrop-blur-sm">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  📦
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Shopify & Meta Catalog 2-Way Sync
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Keep live inventory, prices, variants, and product collections perfectly in sync with WhatsApp.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Single Product Messages (SPM) with 1-tap "Buy Now" button
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Multi-Product Messages (MPM) with interactive in-chat carts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Real-time stock depletion prevention across active chat sessions
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 4 */}
            <div className="group relative bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col justify-between backdrop-blur-sm">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Meta Ads (CAPI) Server-Side Sync
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Direct Click-to-WhatsApp (CTWA) and Meta Pixel attribution for maximizing ad return on investment (ROAS).
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Server-side Meta Conversions API (Lead, AddToCart, Purchase)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Auto-captures Facebook & Instagram Lead Ad form leads
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Syncs high-intent WhatsApp contacts to Custom Retargeting Audiences
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 5 */}
            <div className="group relative bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col justify-between backdrop-blur-sm">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  💳
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Direct WhatsApp In-Chat Payments
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Collect payments inside WhatsApp without redirecting customers away to high-friction external pages.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Unified card with dynamic scannable UPI QR code (GPay / PhonePe / Paytm)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Direct merchant UPI integration with 0% gateway transaction markup
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Razorpay & Cashfree auto-verification with instant status badges
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 6 */}
            <div className="group relative bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col justify-between backdrop-blur-sm">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  📢
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                  Drip Campaigns & High-Volume Broadcasts
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Reach thousands of customers with targeted broadcasts and automated multi-stage follow-up drips.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Filter broadcast recipients by tags, purchase value, and city
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Official Meta WhatsApp approved template builder & variable mapper
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    Multi-stage automated follow-up sequences (Day 1, Day 3, Day 7)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* COMPARISON MATRIX SECTION */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full">
              Competitive Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-3">
              Why High-Growth Brands Switch to What-In
            </h2>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-x-auto backdrop-blur-md">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-4 px-4 font-bold text-slate-300">Feature & Architecture</th>
                  <th className="py-4 px-4 font-bold text-red-400 bg-red-950/20 rounded-t-xl">
                    ❌ Traditional Tools (Wati / Interakt)
                  </th>
                  <th className="py-4 px-4 font-bold text-emerald-400 bg-emerald-950/40 rounded-t-xl">
                    ✅ WHAT-IN (by tinkal.in)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Meta Cloud API Fee Markup</td>
                  <td className="py-4 px-4 text-red-300 bg-red-950/10">Heavy 20%–40% markup on every message</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">0% Markup (Official Meta Base Rates)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">AI Product Recommender</td>
                  <td className="py-4 px-4 text-red-300 bg-red-950/10">Rigid keyword-based matchers</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Gemini AI trained on your PDFs & URLs</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Meta Conversions API (CAPI)</td>
                  <td className="py-4 px-4 text-red-300 bg-red-950/10">Not available / expensive third-party</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Built-in server-side CAPI event sync</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">In-Chat UPI QR Payments</td>
                  <td className="py-4 px-4 text-red-300 bg-red-950/10">External browser redirect links only</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Unified card with instant scannable UPI QR</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Shopify & Meta Catalog Sync</td>
                  <td className="py-4 px-4 text-red-300 bg-red-950/10">Basic contact sync</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">2-Way SPM & MPM In-Chat Cart Sync</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Onboarding & Phone Support</td>
                  <td className="py-4 px-4 text-red-300 bg-red-950/10">Slow email ticketing bots</td>
                  <td className="py-4 px-4 text-emerald-300 font-bold bg-emerald-950/20">Direct on-call phone SLA (9306817689)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PRICING PLANS SECTION (UPDATED: NO CONVERSATION LIMITS, ENTERPRISE CUSTOM) */}
        <div id="pricing" className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full">
              Transparent & Scalable
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3">
              Invest in Growth, Not Markups
            </h2>
            <p className="text-slate-400 text-base mt-2">
              Every plan includes 7 days free trial and zero conversation caps.
            </p>

            {/* Monthly / Annual Billing Toggle */}
            <div className="inline-flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 mt-6 shadow-inner">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-emerald-500 text-slate-950 shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-emerald-500 text-slate-950 shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-800 font-black">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plan 1: STARTER */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between transition-all hover:border-slate-700 hover:shadow-xl backdrop-blur-sm">
              <div>
                <div className="text-lg font-bold text-white mb-1">STARTER</div>
                <div className="text-xs text-slate-400 mb-6">
                  For boutiques, emerging D2C brands & independent sales teams.
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
                href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20start%20the%207-Day%20Free%20Demo%20for%20the%20STARTER%20Plan%20(%E2%82%B9999%2Fmo)%20of%20What-In."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow"
              >
                <span>💬</span> Start Starter Demo on WhatsApp
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
                    <span className="text-emerald-400 font-bold">✓</span> Priority On-Call Phone Support (9306817689)
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20start%20the%207-Day%20Free%20Demo%20for%20the%20GROWTH%20Plan%20(%E2%82%B92%2C499%2Fmo)%20of%20What-In%20with%20Gemini%20AI!"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                <span>💬</span> Start Growth Demo on WhatsApp
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
                href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20discuss%20a%20Custom%20%2F%20Enterprise%20Plan%20for%20our%20business%20on%20What-In."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <span>💬</span> Discuss Custom Plan on WhatsApp
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
                href="https://wa.me/918221058716?text=Hi%20Tinkal.in%2C%20I%20want%20to%20book%20a%207-day%20free%20demo%20of%20What-In%20WhatsApp%20Automation!"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transform hover:-translate-y-1 transition-all"
              >
                <span>💬</span> Chat on WhatsApp (8221058716)
              </a>
              <a
                href="tel:+919306817689"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base px-6 py-4 rounded-2xl border border-slate-700 transition-all"
              >
                <span>📞</span> Call +91 93068 17689
              </a>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-slate-800/80">
              <span>⚡ Platform: <strong className="text-slate-200">what-in.tinkal.in</strong></span>
              <span>🏢 Developer: <strong className="text-emerald-400">tinkal.in</strong></span>
              <span>💬 WhatsApp: <strong className="text-slate-200">+91 8221058716</strong></span>
              <span>📞 On-Call Support: <strong className="text-slate-200">+91 93068 17689</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
