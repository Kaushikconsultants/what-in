"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Terminal,
  Activity,
  Send,
  Zap,
  ExternalLink,
  Code2,
  Search,
  Filter,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  expiresAt: string | null;
  gracePeriodEndsAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdByEmail: string | null;
  createdAt: string;
}

interface RequestLogItem {
  id: string;
  endpoint: string;
  httpMethod: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  requestPayloadPreview: string | null;
  errorMessage: string | null;
  createdAt: string;
  apiKey?: {
    name: string;
    keyPrefix: string;
  } | null;
}

const ALL_SCOPES = [
  { id: "messages:send", label: "Send Messages", desc: "Dispatch WhatsApp pre-approved templates and live session texts" },
  { id: "leads:write", label: "Ingest Leads", desc: "Submit inbound leads from Meta Lead Ads, Zapier, Webflow, WordPress" },
  { id: "contacts:read", label: "Read Contacts", desc: "Query customer profiles, lead stages, tags, and conversation history" },
  { id: "contacts:write", label: "Write Contacts", desc: "Create or update CRM customer profiles and tags" },
];

export default function DeveloperApiPortalComponent() {
  const [activeSubTab, setActiveSubTab] = useState<"keys" | "docs" | "logs" | "webhooks">("keys");

  // Keys State
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["messages:send", "leads:write", "contacts:read"]);
  const [expiresDays, setExpiresDays] = useState<number | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Rotation State
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [graceHours, setGraceHours] = useState(24);
  const [rotating, setRotating] = useState(false);

  // Playground & Docs State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("send-template");
  const [selectedLang, setSelectedLang] = useState<"curl" | "node" | "python" | "php">("curl");
  const [copiedCode, setCopiedCode] = useState(false);
  const [playgroundBody, setPlaygroundBody] = useState<string>("");
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [runningPlayground, setRunningPlayground] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<RequestLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState<string>("");
  const [logStats, setLogStats] = useState<{ totalRequests: number; avgResponseTimeMs: number }>({
    totalRequests: 0,
    avgResponseTimeMs: 0,
  });

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://whatsapp.esponsports.com";

  // Fetch API Keys
  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch("/api/v1/keys");
      const data = await res.json();
      if (data.success && data.keys) {
        setKeys(data.keys);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async (statusFilter = "") => {
    setLoadingLogs(true);
    try {
      const url = `/api/v1/logs?limit=50${statusFilter ? `&status=${statusFilter}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.metrics) setLogStats(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  useEffect(() => {
    if (activeSubTab === "logs") {
      fetchLogs(logStatusFilter);
    }
  }, [activeSubTab, logStatusFilter]);

  // Handle Key Creation
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: selectedScopes,
          expiresDays: expiresDays || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.key?.rawKey) {
        setRevealedKey(data.key.rawKey);
        setShowCreateModal(false);
        setNewKeyName("");
        await fetchKeys();
      } else {
        alert(data.error || "Failed to create API key.");
      }
    } catch (e: any) {
      alert("Network error: " + e.message);
    } finally {
      setCreatingKey(false);
    }
  };

  // Handle Key Rotation
  const handleRotateKey = async () => {
    if (!rotatingKeyId) return;
    setRotating(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: rotatingKeyId,
          graceHours,
        }),
      });
      const data = await res.json();
      if (data.success && data.newKey?.rawKey) {
        setRevealedKey(data.newKey.rawKey);
        setRotatingKeyId(null);
        await fetchKeys();
      } else {
        alert(data.error || "Failed to rotate API key.");
      }
    } catch (e: any) {
      alert("Rotation error: " + e.message);
    } finally {
      setRotating(false);
    }
  };

  // Handle Key Revocation
  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key immediately? Any systems using it will stop working.")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/keys?keyId=${keyId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchKeys();
      } else {
        alert(data.error || "Failed to revoke key.");
      }
    } catch (e: any) {
      alert("Error revoking key: " + e.message);
    }
  };

  // Sample payloads for documentation & playground
  const endpointSamples: Record<string, { method: string; path: string; title: string; body: any }> = {
    "send-template": {
      method: "POST",
      path: "/api/v1/messages/send-template",
      title: "Send Pre-Approved WhatsApp Template",
      body: {
        to: "919876543210",
        templateName: "welcome_greeting",
        languageCode: "en_US",
        components: [],
      },
    },
    "send-text": {
      method: "POST",
      path: "/api/v1/messages/send-text",
      title: "Send Session Text Message (24h Window)",
      body: {
        to: "919876543210",
        text: "Hello, your order has been processed!",
        senderName: "Sales Agent",
      },
    },
    "lead-ingest": {
      method: "POST",
      path: "/api/v1/leads/ingest",
      title: "Universal Inbound Lead Ingestion",
      body: {
        name: "Aman Sharma",
        phone: "+91 98765 43210",
        email: "aman@example.com",
        source: "Facebook Lead Ads",
        city: "Mumbai",
        state: "Maharashtra",
        tags: ["High Value", "Inquiry"],
        notes: "Interested in bulk catalog order",
        sendWelcomeTemplate: true,
      },
    },
    "get-contacts": {
      method: "GET",
      path: "/api/v1/contacts?limit=20&search=Aman",
      title: "Query Customer Contacts",
      body: null,
    },
  };

  // Update playground body on endpoint switch
  useEffect(() => {
    const sample = endpointSamples[selectedEndpoint];
    if (sample && sample.body) {
      setPlaygroundBody(JSON.stringify(sample.body, null, 2));
    } else {
      setPlaygroundBody("");
    }
    setPlaygroundResponse(null);
  }, [selectedEndpoint]);

  // Run Test Playground Call
  const handleExecutePlayground = async () => {
    const sample = endpointSamples[selectedEndpoint];
    if (!sample) return;
    setRunningPlayground(true);
    setPlaygroundResponse(null);
    try {
      const activeKey = keys.find((k) => k.status === "ACTIVE")?.keyPrefix || "YOUR_API_KEY";
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${revealedKey || "wapi_live_YOUR_ACTUAL_SECRET_KEY"}`,
        "Content-Type": "application/json",
      };

      const options: RequestInit = {
        method: sample.method,
        headers,
      };

      if (sample.method !== "GET" && playgroundBody) {
        options.body = playgroundBody;
      }

      const res = await fetch(sample.path, options);
      const data = await res.json();
      setPlaygroundResponse({
        status: res.status,
        statusText: res.statusText,
        data,
      });
    } catch (e: any) {
      setPlaygroundResponse({
        status: 500,
        error: e.message || "Network request failed",
      });
    } finally {
      setRunningPlayground(false);
    }
  };

  // Code Snippet Generator
  const generateSnippet = (lang: string) => {
    const sample = endpointSamples[selectedEndpoint];
    if (!sample) return "";
    const fullUrl = `${appBaseUrl}${sample.path}`;
    const keyPlaceholder = revealedKey || "wapi_live_your_secret_api_key";

    if (lang === "curl") {
      if (sample.method === "GET") {
        return `curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`;
      }
      return `curl -X POST "${fullUrl}" \\
  -H "Authorization: Bearer ${keyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '${playgroundBody || JSON.stringify(sample.body)}'`;
    }

    if (lang === "node") {
      return `const axios = require('axios');

async function callWhatsAppApi() {
  try {
    const response = await axios({
      method: '${sample.method}',
      url: '${fullUrl}',
      headers: {
        'Authorization': 'Bearer ${keyPlaceholder}',
        'Content-Type': 'application/json'
      },${sample.body ? `\n      data: ${playgroundBody || JSON.stringify(sample.body, null, 6)}` : ""}
    });

    console.log("Response:", response.data);
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
  }
}

callWhatsAppApi();`;
    }

    if (lang === "python") {
      return `import requests
import json

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${keyPlaceholder}",
    "Content-Type": "application/json"
}
${sample.body ? `payload = ${playgroundBody || JSON.stringify(sample.body, null, 4)}

response = requests.${sample.method.toLowerCase()}(url, headers=headers, json=payload)` : `response = requests.get(url, headers=headers)`}

print("Status Code:", response.status_code)
print("Response:", response.json())`;
    }

    if (lang === "php") {
      return `<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => '${fullUrl}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => '${sample.method}',
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer ${keyPlaceholder}',
    'Content-Type: application/json'
  ),${sample.body ? `\n  CURLOPT_POSTFIELDS => '${playgroundBody || JSON.stringify(sample.body)}',` : ""}
));

$response = curl_exec($curl);
curl_close($curl);

echo $response;
?>`;
    }

    return "";
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Code2 size={20} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white m-0">
              Universal Developer REST API & Webhooks
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              v1.0 Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 m-0 max-w-2xl">
            Integrate WhatsApp messaging, instant lead ingestion, CRM contacts, and automated workflows directly into your ERP, mobile apps, Zapier, or marketing funnels.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
        >
          <Plus size={16} /> Generate New API Key
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("keys")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === "keys"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Key size={15} /> API Keys ({keys.length})
        </button>
        <button
          onClick={() => setActiveSubTab("docs")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === "docs"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Terminal size={15} /> Documentation & Playground
        </button>
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === "logs"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Activity size={15} /> Request & Audit Logs
        </button>
        <button
          onClick={() => setActiveSubTab("webhooks")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === "webhooks"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Zap size={15} /> Inbound Lead Webhook
        </button>
      </div>

      {/* REVEALED KEY MODAL (SHOWN ONCE) */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Save Your API Secret Key</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 m-0">
                  This key is shown ONLY once and cannot be retrieved later!
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
              <code className="text-xs font-mono text-emerald-400 break-all select-all">
                {revealedKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(revealedKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2500);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedKey ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Store this token safely in your environment variables (e.g. <code>.env</code>) or password manager. For security, our database only stores a cryptographic SHA-256 hash.
            </div>

            <button
              onClick={() => setRevealedKey(null)}
              className="w-full py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all"
            >
              I have safely copied my key
            </button>
          </div>
        </div>
      )}

      {/* ROTATE KEY MODAL */}
      {rotatingKeyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">
                <RefreshCw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Rotate API Key</h3>
                <p className="text-xs text-gray-500 m-0">Zero-downtime key replacement with grace period</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300 m-0">
              A new API key will be generated immediately. The old key will remain valid during the grace period so you can update your external servers without downtime.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">
                Old Key Grace Period
              </label>
              <select
                value={graceHours}
                onChange={(e) => setGraceHours(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value={1}>1 Hour</option>
                <option value={24}>24 Hours (Recommended)</option>
                <option value={72}>72 Hours</option>
                <option value={0}>Instant Revocation (0 Hours)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRotatingKeyId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateKey}
                disabled={rotating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                {rotating ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>{rotating ? "Rotating..." : "Confirm Rotation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE KEY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateKey}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Generate New API Key</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Key Name / Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Production ERP, Zapier Lead Form, Website Webhook"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">
                Granted Permissions & Scopes
              </label>
              <div className="flex flex-col gap-2">
                {ALL_SCOPES.map((s) => {
                  const checked = selectedScopes.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? "border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/30"
                          : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedScopes(selectedScopes.filter((id) => id !== s.id));
                          } else {
                            setSelectedScopes([...selectedScopes, s.id]);
                          }
                        }}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">{s.label}</div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">{s.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Key Expiration</label>
              <select
                value={expiresDays || ""}
                onChange={(e) => setExpiresDays(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="">Never Expires (Recommended for Server Integrations)</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingKey || selectedScopes.length === 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                {creatingKey ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                <span>{creatingKey ? "Generating..." : "Generate Key"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: API KEYS TABLE */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "keys" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Active API Keys</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 m-0 mt-0.5">
                Pass keys using <code>Authorization: Bearer wapi_live_...</code> or <code>x-api-key</code>
              </p>
            </div>
            <button
              onClick={fetchKeys}
              disabled={loadingKeys}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg"
              title="Refresh Keys"
            >
              <RefreshCw size={16} className={loadingKeys ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingKeys ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading API keys...</div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-full text-indigo-500">
                <Key size={24} />
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">No API Keys Generated</div>
              <p className="text-xs text-gray-500 max-w-sm m-0">
                Create an API key to securely connect external webhooks, apps, and automations.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-500"
              >
                Create First API Key
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Key Prefix</th>
                    <th className="py-3 px-4">Scopes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requests</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-700 dark:text-slate-200">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                        {k.name}
                        {k.createdByEmail && (
                          <div className="text-[10.5px] font-normal text-gray-400">by {k.createdByEmail}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <code className="px-2 py-1 bg-gray-100 dark:bg-slate-900 rounded-md font-mono text-[11px] text-gray-800 dark:text-slate-300">
                          {k.keyPrefix}
                        </code>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            k.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : k.status === "ROTATED"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800"
                          }`}
                        >
                          {k.status}
                        </span>
                        {k.status === "ROTATED" && k.gracePeriodEndsAt && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            Grace ends: {new Date(k.gracePeriodEndsAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">{k.usageCount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-gray-500 dark:text-slate-400">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {k.status === "ACTIVE" && (
                            <button
                              onClick={() => setRotatingKeyId(k.id)}
                              title="Rotate Key with Grace Period"
                              className="px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-1 transition-all"
                            >
                              <RefreshCw size={12} /> Rotate
                            </button>
                          )}
                          {k.status !== "REVOKED" && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              title="Revoke Key Immediately"
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DOCUMENTATION & PLAYGROUND */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "docs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Endpoints selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 shadow-xs flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 px-2">API Endpoints</h4>
            {Object.entries(endpointSamples).map(([key, sample]) => {
              const isSel = selectedEndpoint === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedEndpoint(key)}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    isSel
                      ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500/50 text-indigo-900 dark:text-white font-bold"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        sample.method === "POST" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {sample.method}
                    </span>
                    <span className="text-xs font-bold truncate">{sample.title}</span>
                  </div>
                  <code className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">{sample.path}</code>
                </button>
              );
            })}
          </div>

          {/* Right Column: Code Generator & Playground */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Code Generator Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-md">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-1">
                  {(["curl", "node", "python", "php"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        selectedLang === lang
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {lang === "node" ? "Node.js" : lang}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateSnippet(selectedLang));
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed m-0 whitespace-pre">
                  {generateSnippet(selectedLang)}
                </pre>
              </div>
            </div>

            {/* Live Interactive Test Console */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white m-0">Live Test Console</h4>
                  <p className="text-xs text-gray-500 m-0">Execute request directly against live API</p>
                </div>

                <button
                  onClick={handleExecutePlayground}
                  disabled={runningPlayground}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  {runningPlayground ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>{runningPlayground ? "Sending..." : "Send Request"}</span>
                </button>
              </div>

              {endpointSamples[selectedEndpoint]?.body && (
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">
                    JSON Request Payload
                  </label>
                  <textarea
                    rows={7}
                    value={playgroundBody}
                    onChange={(e) => setPlaygroundBody(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-emerald-400 focus:outline-indigo-500"
                  />
                </div>
              )}

              {playgroundResponse && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Response:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-black ${
                        playgroundResponse.status < 400
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      HTTP {playgroundResponse.status}
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-60 m-0">
                    {JSON.stringify(playgroundResponse.data || playgroundResponse.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REQUEST & AUDIT LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "logs" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col">
          {/* Header & Metrics */}
          <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">API Request & Audit Logs</h3>
              <p className="text-xs text-gray-500 m-0">Real-time latency, HTTP status codes, and payload tracking</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-slate-900 rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-300">
                Avg Latency: <span className="font-mono font-bold text-indigo-600">{logStats.avgResponseTimeMs}ms</span>
              </div>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="p-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-bold"
              >
                <option value="">All Status Codes</option>
                <option value="200">200 OK Only</option>
                <option value="ERROR">Errors (4xx, 5xx)</option>
              </select>

              <button
                onClick={() => fetchLogs(logStatusFilter)}
                disabled={loadingLogs}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg"
              >
                <RefreshCw size={15} className={loadingLogs ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-500">No requests recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Method & Endpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Key / Caller</th>
                    <th className="py-3 px-4">Payload / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-700 dark:text-slate-300">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-3 px-4 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              log.httpMethod === "POST" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {log.httpMethod}
                          </span>
                          <code className="font-mono text-[11px] text-gray-800 dark:text-slate-200">{log.endpoint}</code>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-black ${
                            log.statusCode < 400
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                          }`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">{log.responseTimeMs}ms</td>
                      <td className="py-3 px-4 text-gray-500">
                        {log.apiKey ? log.apiKey.name : "Session User / Internal"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={log.requestPayloadPreview || log.errorMessage || ""}>
                        {log.errorMessage ? (
                          <span className="text-red-600 font-medium">{log.errorMessage}</span>
                        ) : (
                          log.requestPayloadPreview || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: UNIVERSAL INBOUND LEAD WEBHOOK */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "webhooks" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Universal Inbound Lead Webhook</h3>
            <p className="text-xs text-gray-500 m-0 mt-1">
              Connect external ad leads or form builders directly. Any POST request creates a CRM contact, triggers a WhatsApp greeting, and logs to Google Sheets.
            </p>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Webhook Endpoint URL</div>
              <code className="text-xs font-mono text-emerald-400 break-all">
                {`${appBaseUrl}/api/v1/leads/ingest?apiKey=wapi_live_YOUR_KEY`}
              </code>
            </div>
            <button
              onClick={() => {
                const sampleKey = keys.find((k) => k.status === "ACTIVE")?.keyPrefix || "YOUR_KEY";
                navigator.clipboard.writeText(`${appBaseUrl}/api/v1/leads/ingest?apiKey=${revealedKey || sampleKey}`);
                alert("Webhook URL copied to clipboard!");
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <Copy size={14} /> Copy Webhook URL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> Supported Providers
              </h4>
              <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1.5 pl-4 list-disc">
                <li><strong>Meta Lead Ads:</strong> Webhook listener pushes instant WhatsApp brochure.</li>
                <li><strong>Google Ads / Zapier:</strong> Connect Google Forms, Typeform, Calendly.</li>
                <li><strong>WordPress / Elementor:</strong> Set webhook action in form settings.</li>
                <li><strong>Webflow / Shopify:</strong> Send lead on form submit or checkout drop.</li>
                <li><strong>IndiaMART / JustDial:</strong> Forward inbound B2B trade inquiries.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" /> Automated Triggers
              </h4>
              <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1.5 pl-4 list-disc">
                <li><strong>Instant Contact Upsert:</strong> Automatic E.164 phone normalization.</li>
                <li><strong>Welcome Message:</strong> Dispatches pre-approved greeting template within 3 seconds.</li>
                <li><strong>Google Sheets Sync:</strong> Automatically logs timestamp, name, and notes.</li>
                <li><strong>Agent Notifications:</strong> Real-time inbox push to sales agents.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
