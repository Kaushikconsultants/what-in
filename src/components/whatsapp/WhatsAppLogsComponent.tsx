"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  Bot,
  Zap,
  RefreshCw,
  Search,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Activity,
  CheckCheck
} from "lucide-react";
import {
  getWhatsAppAILogsAction,
  getWhatsAppWebhookLogsAction
} from "@/app/actions/whatsAppPlatformActions";
import { useWhatsAppStore } from "@/store/whatsappStore";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";
import "./WhatsAppInbox.css"; // Reuse the same CSS file for .logs-panel styles

export default function WhatsAppLogsComponent() {
  const [logsSubTab, setLogsSubTab] = useState<'ai' | 'webhook'>('ai');

  // AI Logs State
  const { 
    aiLogs, setAiLogs, aiLogStats, setAiLogStats,
    webhookEvents, setWebhookEvents, webhookPayloads, setWebhookPayloads, webhookStats, setWebhookStats 
  } = useWhatsAppStore();
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatusFilter, setLogsStatusFilter] = useState('ALL');

  // Webhook Logs State
  const [webhookSearch, setWebhookSearch] = useState('');
  const [loadingWebhook, setLoadingWebhook] = useState(false);

  // Fetch AI Execution Logs
  const fetchAILogs = async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
      // Use Shopify Price Editor-style inbox API
      const res = await fetch('/api/whatsapp/inbox?action=executions');
      const data = await res.json();
      if (data.success) {
        const logs = (data.executions || []).map((e: any) => ({
          id: e.id,
          phone: e.phone,
          userMessage: e.user_message || e.userMessage,
          aiReply: e.ai_reply || e.aiReply,
          toolsCalled: e.tools_called || e.toolsCalled || 'ai_reply',
          status: e.status,
          errorMessage: e.error_message || e.errorMessage,
          durationMs: e.duration_ms ?? e.durationMs ?? 0,
          createdAt: e.created_at || e.createdAt,
          // UI-expected fields (aliases)
          timestamp: e.created_at || e.createdAt,
          customerPhone: e.phone,
          inboundMessage: e.user_message || e.userMessage,
          actionTaken: e.tools_called || e.toolsCalled || 'ai_reply',
          processingTimeMs: e.duration_ms ?? e.durationMs ?? 0,
        }));
        setAiLogs(logs);
        setAiLogStats({
          total: data.stats?.total_count || 0,
          success: data.stats?.success_count || 0,
          error: data.stats?.error_count || 0,
          manual: 0,
          avgDuration: data.stats?.avg_duration || 0,
        });
      } else {
        // Fallback to server action
        const fallback = await getWhatsAppAILogsAction(logsSearch, logsStatusFilter);
        if (fallback.success) {
          const mappedFallback = (fallback.logs || []).map((e: any) => ({
            ...e,
            // UI aliases
            timestamp: e.createdAt,
            customerPhone: e.phone,
            inboundMessage: e.userMessage,
            actionTaken: e.toolsCalled || 'ai_reply',
            processingTimeMs: e.durationMs ?? 0,
          }));
          setAiLogs(mappedFallback);
          setAiLogStats(fallback.stats || { total: 0, success: 0, error: 0, manual: 0, avgDuration: 0 });
        }
      }
    } catch (err) {
      console.error('Failed to load AI logs', err);
    }
    if (!silent) setLoadingLogs(false);
  };

  useEffect(() => {
    if (logsSubTab === 'ai') {
      fetchAILogs(aiLogs.length > 0);
    }
  }, [logsSubTab, logsSearch, logsStatusFilter]);

  // Fetch Meta Webhook Logs
  const fetchWebhookLogs = async (silent = false) => {
    if (!silent) setLoadingWebhook(true);
    try {
      const res = await getWhatsAppWebhookLogsAction(webhookSearch);
      if (res.success) {
        setWebhookEvents(res.events || []);
        setWebhookPayloads(res.payloadDumps || []);
        setWebhookStats(res.stats || { totalReceived: 0, totalRead: 0, totalText: 0, totalMedia: 0 });
      }
    } catch (err) {
      console.error('Failed to load webhook logs', err);
    }
    setLoadingWebhook(false);
  };

  useEffect(() => {
    if (logsSubTab === 'webhook') {
      fetchWebhookLogs(webhookEvents.length > 0);
    }
  }, [logsSubTab, webhookSearch]);

  const formatTime = (ts: any) => {
    if (!ts) return '';
    try {
      let date = ts instanceof Date ? ts : new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 145px)', minHeight: '580px', padding: '16px' }}>
      <div className="logs-panel" style={{ borderRadius: '12px', border: '1px solid #eaecf0' }}>
        {/* Page Header */}
        <div className="logs-panel-header">
          <div className="logs-panel-title-row">
            <Terminal size={18} className="logs-icon" />
            <h2 className="logs-title">WhatsApp Logs</h2>
            <span className="logs-number-badge">Live Monitoring</span>
          </div>
          <div className="logs-subtab-pills">
            <button
              className={`logs-subtab-btn ${logsSubTab === 'ai' ? 'active-ai' : ''}`}
              onClick={() => setLogsSubTab('ai')}
            >
              <Bot size={13} /> AI Logs
            </button>
            <button
              className={`logs-subtab-btn ${logsSubTab === 'webhook' ? 'active-webhook' : ''}`}
              onClick={() => setLogsSubTab('webhook')}
            >
              <Zap size={13} /> Webhook Logs
            </button>
          </div>
          <button
            className="logs-refresh-btn"
            onClick={() => logsSubTab === 'ai' ? fetchAILogs() : fetchWebhookLogs()}
          >
            <RefreshCw size={13} className={(logsSubTab === 'ai' ? loadingLogs : loadingWebhook) ? 'spin-icon' : ''} />
            Refresh
          </button>
        </div>

        {/* ---- AI LOGS ---- */}
        {logsSubTab === 'ai' && (
          <div className="logs-content">
            {/* Stats Row */}
            <div className="logs-stats-grid">
              {[
                { label: 'Total Executions', value: aiLogStats.total, cls: 'stat-neutral' },
                { label: 'Successful', value: aiLogStats.success, cls: 'stat-success' },
                { label: 'Errors', value: aiLogStats.error, cls: 'stat-error' },
                { label: 'Manual Mode', value: aiLogStats.manual, cls: 'stat-warn' },
                { label: 'Avg Response', value: `${aiLogStats.avgDuration}ms`, cls: 'stat-info' },
              ].map((s, i) => (
                <div key={i} className="logs-stat-card">
                  <span className="logs-stat-label">{s.label}</span>
                  <span className={`logs-stat-value ${s.cls}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Search + Filter Bar */}
            <div className="logs-toolbar">
              <div className="inbox-search-box logs-search">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search phone, message, AI reply..."
                  value={logsSearch}
                  onChange={e => setLogsSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={logsStatusFilter}
                onChange={e => setLogsStatusFilter(e.target.value)}
                style={{ height: '36px', minWidth: '130px' }}
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="ERROR">Error</option>
                <option value="SKIPPED">Skipped</option>
              </select>
            </div>

            {/* AI Logs Table */}
            <div className="logs-table-card">
              <div className="logs-table-header">
                <Bot size={15} />
                <span>AI Message Executions</span>
                <span className="logs-table-count">{aiLogs.length} events found</span>
              </div>
              {loadingLogs && aiLogs.length === 0 ? (
                <div className="inbox-loading-skeleton">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton-line long" style={{ height: '30px', borderRadius: '4px' }}></div>)}
                </div>
              ) : aiLogs.length > 0 ? (
                <div className="logs-table-wrap">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Customer</th>
                        <th>Inbound Message</th>
                        <th>AI Action</th>
                        <th>AI Reply / Note</th>
                        <th>Status</th>
                        <th>Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="log-time">{formatTime(log.timestamp)}</td>
                          <td className="log-phone">{log.customerPhone}</td>
                          <td>
                            <div className="log-truncate" title={log.inboundMessage}>{log.inboundMessage}</div>
                          </td>
                          <td>
                            <span className="log-code">{log.actionTaken}</span>
                          </td>
                          <td>
                            <div className="log-truncate log-ai-reply" title={log.aiReply}>{log.aiReply || <span className="log-muted">-</span>}</div>
                          </td>
                          <td>
                            {log.status === 'SUCCESS' ? <span className="log-badge badge-success"><CheckCircle2 size={12} /> SUCCESS</span> :
                             log.status === 'ERROR' ? <span className="log-badge badge-error"><XCircle size={12} /> ERROR</span> :
                             <span className="log-badge badge-warn">SKIPPED</span>}
                          </td>
                          <td className="log-time">{log.processingTimeMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="logs-empty-cell">
                  <Bot size={32} className="logs-empty-icon" />
                  <div className="logs-empty-title">No AI Logs Found</div>
                  <div className="logs-empty-sub">We couldn't find any AI execution records matching your criteria.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- WEBHOOK LOGS ---- */}
        {logsSubTab === 'webhook' && (
          <div className="logs-content" style={{ flexDirection: 'row' }}>
            <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="logs-stats-grid cols-4">
                <div className="logs-stat-card"><span className="logs-stat-label">Total Received</span><span className="logs-stat-value stat-neutral">{webhookStats.totalReceived}</span></div>
                <div className="logs-stat-card"><span className="logs-stat-label"><CheckCheck size={12} color="#16a34a" /> READ</span><span className="logs-stat-value stat-success">{webhookStats.totalRead}</span></div>
                <div className="logs-stat-card"><span className="logs-stat-label"><MessageSquare size={12} color="#2563eb" /> TEXT</span><span className="logs-stat-value stat-info">{webhookStats.totalText}</span></div>
                <div className="logs-stat-card"><span className="logs-stat-label">MEDIA</span><span className="logs-stat-value stat-warn">{webhookStats.totalMedia}</span></div>
              </div>

              <div className="logs-toolbar">
                <div className="inbox-search-box logs-search">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search phone, content, or Meta message ID..."
                    value={webhookSearch}
                    onChange={e => setWebhookSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="logs-table-card">
                <div className="logs-table-header">
                  <Activity size={15} />
                  <span>Incoming Meta Webhook Events</span>
                  <span className="logs-table-count">{webhookEvents.length} events</span>
                </div>
                {loadingWebhook && webhookEvents.length === 0 ? (
                  <div className="inbox-loading-skeleton">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton-line long" style={{ height: '30px', borderRadius: '4px' }}></div>)}
                  </div>
                ) : webhookEvents.length > 0 ? (
                  <div className="logs-table-wrap">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>From</th>
                          <th>Customer</th>
                          <th>Type</th>
                          <th>Message</th>
                          <th>Meta Msg ID</th>
                          <th>Status</th>
                          <th>Received At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webhookEvents.map((evt: any, i) => (
                          <tr key={i}>
                            <td className="log-phone">{formatWhatsAppPhone(evt.conversation?.customer?.whatsappNumber || evt.conversation?.customer?.mobile) || evt.senderName || '-'}</td>
                            <td>{evt.conversation?.customer?.contactPerson || <span className="log-muted">-</span>}</td>
                            <td><span className="log-code">{evt.messageType || 'TEXT'}</span></td>
                            <td><div className="log-truncate" title={evt.content}>{evt.content}</div></td>
                            <td><div className="log-truncate log-muted" style={{ maxWidth: '100px' }} title={evt.metaMessageId}>{evt.metaMessageId || '-'}</div></td>
                            <td><span className="log-badge badge-info">{evt.status}</span></td>
                            <td className="log-time">{formatTime(evt.sentAt || evt.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="logs-empty-cell">
                    <Zap size={32} className="logs-empty-icon" />
                    <div className="logs-empty-title">No Webhooks</div>
                  </div>
                )}
              </div>
            </div>

            <div className="logs-payload-box" style={{ flex: '1' }}>
              <div className="logs-payload-header">Raw Webhook Payloads</div>
              <div className="logs-payload-scroll">
                {webhookPayloads.map((pl, i) => (
                  <div key={i} className="logs-payload-item">
                    <div className="logs-payload-ts">{formatTime(pl.timestamp)}</div>
                    <pre className="logs-payload-pre">
                      {JSON.stringify(pl.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




