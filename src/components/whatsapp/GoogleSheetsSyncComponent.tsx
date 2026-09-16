"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Save,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  ExternalLink,
  Code2,
} from "lucide-react";

export default function GoogleSheetsSyncComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Config State
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Leads");
  const [googleScriptUrl, setGoogleScriptUrl] = useState("");
  const [syncLeads, setSyncLeads] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncStatus, setSyncStatus] = useState(true);
  const [totalRowsSynced, setTotalRowsSynced] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [scriptTemplate, setScriptTemplate] = useState("");

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/google-sheets");
      const data = await res.json();
      if (data.success && data.config) {
        setSpreadsheetId(data.config.spreadsheetId || "");
        setSheetName(data.config.sheetName || "Leads");
        setGoogleScriptUrl(data.config.googleScriptUrl || "");
        setSyncLeads(data.config.syncLeads !== false);
        setSyncOrders(data.config.syncOrders !== false);
        setSyncStatus(data.config.syncStatus !== false);
        setTotalRowsSynced(data.config.totalRowsSynced || 0);
        setLastSyncedAt(data.config.lastSyncedAt);
        if (data.appsScriptTemplate) {
          setScriptTemplate(data.appsScriptTemplate);
        }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/integrations/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          googleScriptUrl,
          syncLeads,
          syncOrders,
          syncStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Google Sheets configuration saved!");
      } else {
        alert(data.error || "Failed to save configuration.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!googleScriptUrl.trim()) {
      alert("Please enter a Google Apps Script Webhook URL first.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/integrations/google-sheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleScriptUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, text: data.message });
      } else {
        setTestResult({ success: false, text: data.error || "Failed to connect to Google Apps Script." });
      }
    } catch (e: any) {
      setTestResult({ success: false, text: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <h2 className="text-xl font-black text-white m-0">Native 2-Way Google Sheets Automation</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Active Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 m-0 max-w-2xl">
            Stream incoming WhatsApp leads, orders, and customer details directly into your Google Spreadsheets in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Rows Synced</div>
            <div className="text-xl font-black text-emerald-400">{totalRowsSynced.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Form & Code Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-4"
        >
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Connection Settings</h3>
            <p className="text-xs text-gray-500 m-0 mt-0.5">Configure your destination Google Spreadsheet.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">
              Google Apps Script Webhook URL
            </label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={googleScriptUrl}
              onChange={(e) => setGoogleScriptUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-indigo-500"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Deploy your Apps Script as Web App (Execute as: Me, Access: Anyone)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Spreadsheet ID (Optional)</label>
              <input
                type="text"
                placeholder="1BxiMVs0XRA5nFMd..."
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Sheet Tab Name</label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Sync Switches */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white">Sync Inbound Leads</div>
                <div className="text-[11px] text-gray-500">Append every new lead captured via WhatsApp or Webhook.</div>
              </div>
              <input
                type="checkbox"
                checked={syncLeads}
                onChange={(e) => setSyncLeads(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white">Sync Order Confirmations</div>
                <div className="text-[11px] text-gray-500">Append order ID, items, and total amount when confirmed.</div>
              </div>
              <input
                type="checkbox"
                checked={syncOrders}
                onChange={(e) => setSyncOrders(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
            </label>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                  : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-800"
              }`}
            >
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{testResult.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !googleScriptUrl.trim()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {testing ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
              <span>{testing ? "Testing..." : "Test Connection"}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Apps Script Code Template */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-700 p-5 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Code2 size={18} className="text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 m-0">
                Google Apps Script Setup (Code.gs)
              </h4>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(scriptTemplate);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedCode ? "Copied" : "Copy Code"}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl overflow-x-auto max-h-[380px]">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed m-0 whitespace-pre">
              {scriptTemplate || `// Open your Google Sheet -> Extensions -> Apps Script -> Paste code`}
            </pre>
          </div>

          <div className="text-[11px] text-slate-400 leading-normal pl-1">
            <strong>3-Step Instructions:</strong>
            <ol className="list-decimal pl-4 mt-1 space-y-1">
              <li>Open your Google Sheet, click <strong>Extensions ➔ Apps Script</strong>.</li>
              <li>Paste the code above, click <strong>Save</strong>.</li>
              <li>Click <strong>Deploy ➔ New Deployment ➔ Web App</strong> (Execute as: Me, Access: Anyone) and paste the URL here.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
