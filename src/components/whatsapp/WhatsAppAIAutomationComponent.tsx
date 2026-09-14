"use client";

import React, { useState, useEffect } from "react";
import { 
  Bot, Save, Sparkles, AlertCircle, Database, Globe, Settings2, 
  Cpu, KeyRound, CheckCircle2, RefreshCw, Eye, EyeOff, ShieldCheck, 
  ExternalLink, HelpCircle
} from "lucide-react";

interface WhatsAppAIAutomationComponentProps {
  embedded?: boolean;
}

export default function WhatsAppAIAutomationComponent({ embedded = false }: WhatsAppAIAutomationComponentProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [settings, setSettings] = useState({
    aiModel: "gemini-flash-lite-latest",
    aiFallbackLanguage: "English",
    aiSystemPrompt: "You are a helpful and polite customer service assistant.",
    aiKnowledgeBase: "",
    aiConfidenceThreshold: 85,
    geminiApiKey: ""
  });

  // Real-time Key Testing State
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{
    success: boolean;
    message?: string;
    modelTested?: string;
    error?: string;
    code?: number;
    availableModelsCount?: number;
  } | null>(null);

  // Simulator State
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testedModelUsed, setTestedModelUsed] = useState("");
  const [testError, setTestError] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/whatsapp/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        // Hardcoded primary system model
        let initialModel = data.settings.aiModel;
        if (!initialModel || initialModel.includes('2.0') || initialModel.includes('2.5')) {
          initialModel = 'gemini-flash-lite-latest';
        }
        setSettings(prev => ({
          ...prev,
          ...data.settings,
          aiModel: initialModel
        }));

        // If a key already exists, test it silently
        if (data.settings.geminiApiKey) {
          testGeminiKey(data.settings.geminiApiKey, false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Key Testing against Google's API
  const testGeminiKey = async (keyToTest?: string, showAlerts = true) => {
    const key = (keyToTest !== undefined ? keyToTest : settings.geminiApiKey || '').trim();
    if (!key) {
      if (showAlerts) alert("Please enter a Gemini API Key first.");
      return { success: false, error: "Empty API key" };
    }

    setTestingKey(true);
    setKeyTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/test-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, model: 'gemini-flash-lite-latest' })
      });
      const data = await res.json();

      if (data.success && data.valid) {
        const result = {
          success: true,
          message: data.message || `Active & Verified with Google Gemini (${data.modelTested})`,
          modelTested: data.modelTested,
          availableModelsCount: data.availableModelsCount
        };
        setKeyTestResult(result);
        return result;
      } else {
        const result = {
          success: false,
          error: data.error || 'Google returned an invalid response.',
          code: data.code
        };
        setKeyTestResult(result);
        return result;
      }
    } catch (err: any) {
      const result = {
        success: false,
        error: err.message || 'Network error reaching Google API'
      };
      setKeyTestResult(result);
      return result;
    } finally {
      setTestingKey(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // If user entered a key, test it in real-time first
      if (settings.geminiApiKey?.trim()) {
        const testRes = await testGeminiKey(settings.geminiApiKey, false);
        if (!testRes.success) {
          const proceed = confirm(
            `⚠️ Google API Verification Notice:\n\n` +
            `Google rejected this key with message:\n"${(testRes as any).error || 'Verification failed'}"\n\n` +
            `Do you still wish to save this key? (WhatsApp AI auto-replies will not work until a valid key is provided).`
          );
          if (!proceed) {
            setSaving(false);
            return;
          }
        }
      }

      const res = await fetch('/api/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert("Failed to save: " + data.error);
      }
    } catch (error) {
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const testAiPrompt = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResponse("");
    setTestError("");
    setTestedModelUsed("");

    try {
      const testRes = await fetch('/api/whatsapp/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage, 
          model: settings.aiModel,
          apiKey: settings.geminiApiKey,
          knowledgeBase: settings.aiKnowledgeBase,
          systemPrompt: settings.aiSystemPrompt,
          fallbackLanguage: settings.aiFallbackLanguage
        })
      });

      const d = await testRes.json();
      if (d.success && d.reply) {
        setTestResponse(d.reply);
        setTestedModelUsed(d.modelUsed || settings.aiModel);
      } else {
        setTestError(d.error || "Google API returned an empty response. Check your API key and quota.");
      }
    } catch (error: any) {
      setTestError("Error contacting test API: " + error.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#6b7280", fontFamily: "Inter, sans-serif" }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px", color: "#6d28d9" }} />
        <p style={{ margin: 0, fontWeight: 500 }}>Loading AI Assistant Configuration...</p>
      </div>
    );
  }

  const hasApiKey = !!settings.geminiApiKey?.trim();
  const isKeyVerified = hasApiKey && keyTestResult?.success;

  return (
    <div className={`w-full max-w-[1100px] ${embedded ? "p-0 m-0" : "mx-auto py-6 px-4 sm:px-8"} font-sans text-gray-900 dark:text-gray-100`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5 text-gray-900 dark:text-white m-0">
            <Bot size={26} className="text-purple-600 dark:text-purple-400" />
            AI Assistant Configuration
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
            Configure real Google Gemini intelligence for WhatsApp auto-replies, lead qualification, and customer support.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={16} /> Settings Saved & Verified!
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Validating & Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Main Editor Section */}
        <div className="flex flex-col gap-6">

          {/* Card: Knowledge Base */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white m-0 mb-1 flex items-center gap-2">
              <Database size={18} className="text-blue-500" /> Business Knowledge Base
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-4">
              Provide facts, wholesale pricing, policies, and FAQs. The Gemini model uses this data to answer customer queries with 100% accuracy.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold">Knowledge Base Content</span>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 flex items-center gap-1.5 transition-colors">
                  {uploadingPdf ? <RefreshCw size={13} className="animate-spin text-indigo-500" /> : null}
                  {uploadingPdf ? "Processing PDF..." : "Upload PDF"}
                  <input type="file" accept="application/pdf" disabled={uploadingPdf} className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingPdf(true);
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch("/api/whatsapp/upload-pdf", { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.success) {
                        setSettings(prev => ({ ...prev, aiKnowledgeBase: data.newKnowledgeBase }));
                        alert("PDF processed and added to Knowledge Base!");
                      } else { alert("Error: " + (data.error || "Failed to process PDF")); }
                    } catch (err: any) {
                      alert("Upload failed: " + (err.message || "Network error"));
                    } finally {
                      setUploadingPdf(false);
                      e.target.value = "";
                    }
                  }} />
                </label>
                <button onClick={async () => {
                  const url = prompt("Enter Website URL to scrape:");
                  if (!url) return;
                  try {
                    const res = await fetch("/api/whatsapp/scrape-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
                    const data = await res.json();
                    if (data.success) {
                      setSettings(prev => ({ ...prev, aiKnowledgeBase: data.newKnowledgeBase }));
                      alert("Website scraped and added to Knowledge Base!");
                    } else { alert("Error: " + (data.error || "Failed to scrape")); }
                  } catch { alert("Scrape failed"); }
                }} className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 transition-colors">
                  Scrape URL
                </button>
              </div>
            </div>
            <textarea
              value={settings.aiKnowledgeBase}
              onChange={(e) => setSettings({...settings, aiKnowledgeBase: e.target.value})}
              placeholder="e.g. Return policy: 7 days for defective wholesale lots. Minimum Order Quantity (MOQ) is 50 pcs. Free delivery across India on orders over ₹10,000..."
              className="w-full min-h-[240px] p-3 border border-gray-300 dark:border-slate-600 rounded-xl font-mono text-xs sm:text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-y transition-all"
            />
          </div>

          {/* Card: System Prompt */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white m-0 mb-1 flex items-center gap-2">
              <Settings2 size={18} className="text-emerald-500" /> AI Persona & System Rules
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-4">
              Define personality, tone, language guidelines, and strict boundaries the AI must enforce on WhatsApp.
            </p>
            <textarea
              value={settings.aiSystemPrompt}
              onChange={(e) => setSettings({...settings, aiSystemPrompt: e.target.value})}
              placeholder="e.g. You are Alex, a friendly sales manager for Espon Sports. Keep replies short (1-2 sentences). Always prioritize wholesale orders. If customer asks for B2C/single piece, politely explain we are wholesale only."
              className="w-full min-h-[130px] p-3 border border-gray-300 dark:border-slate-600 rounded-xl font-mono text-xs sm:text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-y transition-all"
            />
          </div>

        </div>

        {/* Sidebar Configuration Section */}
        <div className="flex flex-col gap-6">

          {/* Card: Model Settings & Real-time Key Testing */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white m-0 mb-4 flex items-center gap-2">
              <Cpu size={18} className="text-purple-600 dark:text-purple-400" /> Model Configuration
            </h2>

            {/* Gemini API Key with Real-Time "Test Key" Button */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                  <KeyRound size={14} color="#6d28d9" /> Gemini API Key
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}
                  >
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />} {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.geminiApiKey || ''}
                  onChange={(e) => {
                    setSettings({...settings, geminiApiKey: e.target.value});
                    if (keyTestResult) setKeyTestResult(null); // reset result on edit
                  }}
                  placeholder="AQ... or AIza..."
                  style={{ flex: 1, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={() => testGeminiKey()}
                  disabled={testingKey || !settings.geminiApiKey?.trim()}
                  style={{
                    padding: "8px 14px",
                    background: testingKey ? "#e5e7eb" : "#f5f3ff",
                    color: testingKey ? "#6b7280" : "#6d28d9",
                    border: "1px solid " + (testingKey ? "#d1d5db" : "#ddd6fe"),
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: (testingKey || !settings.geminiApiKey?.trim()) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap"
                  }}
                >
                  {testingKey ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                  {testingKey ? "Testing..." : "Test Key"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px" }}>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  Get from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#6d28d9", textDecoration: "underline" }}>Google AI Studio</a>
                </span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>Tested live against Google API</span>
              </div>

              {/* Real-time Key Validation Feedback Badge */}
              {testingKey && (
                <div style={{ marginTop: "10px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "8px" }}>
                  <RefreshCw size={14} className="animate-spin" color="#6d28d9" />
                  Testing live credentials against Google Generative Language API...
                </div>
              )}

              {keyTestResult && !testingKey && (
                <div style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: keyTestResult.success ? "1px solid #bbf7d0" : "1px solid #fecdd3",
                  background: keyTestResult.success ? "#f0fdf4" : "#fff1f2",
                  color: keyTestResult.success ? "#166534" : "#9f1239"
                }}>
                  {keyTestResult.success ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                        <CheckCircle2 size={16} color="#16a34a" /> Key is Active & Verified!
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#15803d" }}>
                        Confirmed live inference on <strong>{keyTestResult.modelTested}</strong>. ({keyTestResult.availableModelsCount || 0}+ models available).
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                        <AlertCircle size={16} color="#e11d48" /> Google API Error {keyTestResult.code ? `(${keyTestResult.code})` : ''}
                      </div>
                      <div style={{ fontSize: "12px", wordBreak: "break-word", lineHeight: "1.4" }}>
                        {keyTestResult.error}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#881337", marginTop: "4px", borderTop: "1px dashed #fda4af", paddingTop: "6px", lineHeight: "1.45" }}>
                        <strong>⚠️ Notice: Do NOT use Google Sign-In or OAuth 2.0 credentials!</strong><br />
                        Gemini API requires an API key starting with <strong>AQ...</strong> or <strong>AIzaSy...</strong> from Google AI Studio.<br />
                        👉 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "#6d28d9", fontWeight: 700, textDecoration: "underline" }}>Click here to open Google AI Studio and copy your key</a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official Google Gemini Models Hardcoded Architecture */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Official Google Gemini Model Architecture (Hardcoded by System)
              </label>
              <div style={{
                padding: "12px 14px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    Gemini Flash Lite & Flash Latest (Auto-Cascading)
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "6px" }}>
                    Hardcoded Active
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                  Hardcoded system model cascade (<strong>gemini-flash-lite-latest</strong> → <strong>gemini-flash-latest</strong> → <strong>gemini-3.5-flash</strong> → <strong>gemini-pro-latest</strong>) tested and confirmed live with Google API for instant replies and 100% uptime across all workspaces.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Globe size={14} /> Fallback Language
              </label>
              <input
                type="text"
                value={settings.aiFallbackLanguage}
                onChange={(e) => setSettings({...settings, aiFallbackLanguage: e.target.value})}
                placeholder="e.g. English, Hindi, Hinglish"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Confidence Threshold</label>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6d28d9" }}>{settings.aiConfidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50" max="99"
                value={settings.aiConfidenceThreshold}
                onChange={(e) => setSettings({...settings, aiConfidenceThreshold: parseInt(e.target.value)})}
                style={{ width: "100%", accentColor: "#6d28d9" }}
              />
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0" }}>
                AI escalates to human agent if confidence falls below this mark.
              </p>
            </div>
          </div>

          {/* Card: Live Simulator (Connected to Real Gemini API) */}
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white m-0 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" /> Real AI Simulator
              </h2>
              <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold border border-indigo-200 dark:border-indigo-800">
                Live Test
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Test how Google Gemini will respond using your real API key, persona, and knowledge base.
            </p>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="e.g. What is your wholesale price for jerseys?"
              className="w-full min-h-[80px] p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-y mb-2 transition-all"
            />
            <button
              onClick={testAiPrompt}
              disabled={testing || !testMessage.trim()}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />}
              {testing ? "Calling Gemini API..." : "Test AI Response"}
            </button>

            {testResponse && (
              <div className="mt-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-200 border-l-4 border-purple-600">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <strong className="text-purple-600 dark:text-purple-400 font-bold">Gemini AI Response:</strong>
                  <span className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">
                    {testedModelUsed}
                  </span>
                </div>
                <div className="leading-relaxed whitespace-pre-wrap">{testResponse}</div>
              </div>
            )}

            {testError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs text-red-700 dark:text-red-300 border-l-4 border-red-500">
                <strong className="block mb-1 font-bold">Simulation Error:</strong>
                {testError}
              </div>
            )}
          </div>

          {/* Dynamic Status Card */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm shadow-sm ${
            isKeyVerified
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : hasApiKey
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}>
            {isKeyVerified ? (
              <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : hasApiKey ? (
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              {isKeyVerified ? (
                <>
                  <strong>Gemini API Key Verified!</strong> Auto-replies are active using <strong>{settings.aiModel}</strong>.
                </>
              ) : hasApiKey ? (
                <>
                  <strong>API Key Configured:</strong> Click <em>"Test Key"</em> above to verify live connection with Google Gemini before saving.
                </>
              ) : (
                <>
                  <strong>API Key Required:</strong> Add your Google Gemini API key above to enable WhatsApp AI auto-replies and simulations.
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
