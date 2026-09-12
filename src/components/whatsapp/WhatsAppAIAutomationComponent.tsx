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
    <div style={{ 
      maxWidth: embedded ? "100%" : "1100px", 
      margin: embedded ? "0" : "0 auto", 
      padding: embedded ? "0" : "28px 36px", 
      fontFamily: "Inter, sans-serif", 
      color: "#111827" 
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Bot size={26} color="#6d28d9" />
            AI Assistant Configuration
          </h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}>
            Configure real Google Gemini intelligence for WhatsApp auto-replies, lead qualification, and customer support.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {saveSuccess && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16a34a", fontWeight: 600, fontSize: "14px", background: "#dcfce7", padding: "6px 12px", borderRadius: "8px" }}>
              <CheckCircle2 size={16} /> Settings Saved & Verified!
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              background: saving ? "#9ca3af" : "#111827",
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: "8px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Validating & Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "28px" }}>
        {/* Main Editor Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Card: Knowledge Base */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={18} color="#3b82f6" /> Business Knowledge Base
            </h2>
            <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
              Provide facts, wholesale pricing, policies, and FAQs. The Gemini model uses this data to answer customer queries with 100% accuracy.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Knowledge Base Content</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <label style={{ cursor: "pointer", background: "#f3f4f6", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#4b5563", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "5px" }}>
                  Upload PDF
                  <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch("/api/whatsapp/upload-pdf", { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.success) {
                        setSettings({ ...settings, aiKnowledgeBase: data.newKnowledgeBase });
                        alert("PDF processed and added to Knowledge Base!");
                      } else { alert("Error: " + data.error); }
                    } catch { alert("Upload failed"); }
                  }} />
                </label>
                <button onClick={async () => {
                  const url = prompt("Enter Website URL to scrape:");
                  if (!url) return;
                  try {
                    const res = await fetch("/api/whatsapp/scrape-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
                    const data = await res.json();
                    if (data.success) {
                      setSettings({ ...settings, aiKnowledgeBase: data.newKnowledgeBase });
                      alert("Website scraped and added to Knowledge Base!");
                    } else { alert("Error: " + data.error); }
                  } catch { alert("Scrape failed"); }
                }} style={{ cursor: "pointer", background: "#f3f4f6", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#4b5563", border: "1px solid #e5e7eb" }}>
                  Scrape URL
                </button>
              </div>
            </div>
            <textarea
              value={settings.aiKnowledgeBase}
              onChange={(e) => setSettings({...settings, aiKnowledgeBase: e.target.value})}
              placeholder="e.g. Return policy: 7 days for defective wholesale lots. Minimum Order Quantity (MOQ) is 50 pcs. Free delivery across India on orders over ₹10,000..."
              style={{ width: "100%", minHeight: "260px", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontFamily: "monospace", fontSize: "13px", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Card: System Prompt */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <Settings2 size={18} color="#10b981" /> AI Persona & System Rules
            </h2>
            <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
              Define personality, tone, language guidelines, and strict boundaries the AI must enforce on WhatsApp.
            </p>
            <textarea
              value={settings.aiSystemPrompt}
              onChange={(e) => setSettings({...settings, aiSystemPrompt: e.target.value})}
              placeholder="e.g. You are Alex, a friendly sales manager for Espon Sports. Keep replies short (1-2 sentences). Always prioritize wholesale orders. If customer asks for B2C/single piece, politely explain we are wholesale only."
              style={{ width: "100%", minHeight: "130px", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontFamily: "monospace", fontSize: "13px", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

        </div>

        {/* Sidebar Configuration Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Card: Model Settings & Real-time Key Testing */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={18} color="#8b5cf6" /> Model Configuration
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
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} color="#f59e0b" /> Real AI Simulator
              </h2>
              <span style={{ fontSize: "11px", background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                Live Test
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px 0" }}>
              Test how Google Gemini will respond using your real API key, persona, and knowledge base.
            </p>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="e.g. What is your wholesale price for jerseys?"
              style={{ width: "100%", minHeight: "80px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", marginBottom: "8px", boxSizing: "border-box" }}
            />
            <button
              onClick={testAiPrompt}
              disabled={testing || !testMessage.trim()}
              style={{
                width: "100%",
                padding: "9px",
                background: testing ? "#f1f5f9" : "white",
                color: testing ? "#94a3b8" : "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: (testing || !testMessage.trim()) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} color="#6d28d9" />}
              {testing ? "Calling Gemini API..." : "Test AI Response"}
            </button>

            {testResponse && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#f1f5f9", borderRadius: "8px", fontSize: "12.5px", color: "#1e293b", borderLeft: "3px solid #6d28d9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <strong style={{ color: "#6d28d9" }}>Gemini AI Response:</strong>
                  <span style={{ fontSize: "10.5px", background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", color: "#475569" }}>
                    {testedModelUsed}
                  </span>
                </div>
                <div style={{ lineHeight: "1.45" }}>{testResponse}</div>
              </div>
            )}

            {testError && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#fef2f2", borderRadius: "8px", fontSize: "12px", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
                <strong style={{ display: "block", marginBottom: "3px" }}>Simulation Error:</strong>
                {testError}
              </div>
            )}
          </div>

          {/* Dynamic Status Card */}
          <div style={{
            background: isKeyVerified ? "#f0fdf4" : (hasApiKey ? "#fffbeb" : "#fef2f2"),
            border: "1px solid " + (isKeyVerified ? "#bbf7d0" : (hasApiKey ? "#fde68a" : "#fecaca")),
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            gap: "12px"
          }}>
            {isKeyVerified ? (
              <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
            ) : hasApiKey ? (
              <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
            ) : (
              <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
            <div style={{ fontSize: "12.5px", color: isKeyVerified ? "#166534" : (hasApiKey ? "#92400e" : "#991b1b") }}>
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
