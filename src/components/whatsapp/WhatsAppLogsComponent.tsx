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
  CheckCheck,
  ShieldCheck,
  Lock,
  UserCheck,
  ShieldAlert,
  FileText,
  Download,
  Eye,
  X
} from "lucide-react";
import {
  getWhatsAppAILogsAction,
  getWhatsAppWebhookLogsAction,
  getWhatsAppAuditLogsAction
} from "@/app/actions/whatsAppPlatformActions";
import { useWhatsAppStore } from "@/store/whatsappStore";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";
import "./WhatsAppInbox.css"; // Reuse the same CSS file for .logs-panel styles

export default function WhatsAppLogsComponent() {
  const [logsSubTab, setLogsSubTab] = useState<'ai' | 'webhook' | 'audit'>('ai');

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

  // Security Audit Trail State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditStats, setAuditStats] = useState<any>({ total: 0, exports: 0, roles: 0, flows: 0 });
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // Fetch AI Execution Logs
  const fetchAILogs = async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
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
        const fallback = await getWhatsAppAILogsAction(logsSearch, logsStatusFilter);
        if (fallback.success) {
          const mappedFallback = (fallback.logs || []).map((e: any) => ({
            ...e,
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

  // Fetch Security Audit Logs
  const fetchAuditLogs = async (silent = false) => {
    if (!silent) setLoadingAudit(true);
    try {
      const res = await getWhatsAppAuditLogsAction({
        search: auditSearch,
        actionType: auditActionFilter !== 'ALL' ? auditActionFilter : undefined,
        limit: 100
      });
      if (res.success && res.logs) {
        setAuditLogs(res.logs);
        const exportsCount = res.logs.filter((l: any) => l.actionType?.includes('EXPORT')).length;
        const rolesCount = res.logs.filter((l: any) => l.actionType?.includes('ROLE') || l.actionType?.includes('AUTH')).length;
        const flowsCount = res.logs.filter((l: any) => l.actionType?.includes('FLOW') || l.actionType?.includes('CHATBOT')).length;
        setAuditStats({
          total: res.total || res.logs.length,
          exports: exportsCount,
          roles: rolesCount,
          flows: flowsCount
        });
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    }
    setLoadingAudit(false);
  };

  useEffect(() => {
    if (logsSubTab === 'ai') {
      fetchAILogs(aiLogs.length > 0);
    } else if (logsSubTab === 'webhook') {
      fetchWebhookLogs(webhookEvents.length > 0);
    } else if (logsSubTab === 'audit') {
      fetchAuditLogs(auditLogs.length > 0);
    }
  }, [logsSubTab, logsSearch, logsStatusFilter, webhookSearch, auditSearch, auditActionFilter]);

  const handleExportAuditCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Actor Role', 'Action Type', 'IP Address', 'Details'];
    const rows = auditLogs.map(l => [
      new Date(l.createdAt).toISOString(),
      `"${l.actorName || ''}"`,
      `"${l.actorEmail || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${l.actionType || ''}"`,
      `"${l.ipAddress || ''}"`,
      `"${(l.detailsJson || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `whatsapp_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <h2 className="logs-title">WhatsApp Logs & Audit Trail</h2>
            <span className="logs-number-badge">Live Enterprise Monitoring</span>
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
            <button
              className={`logs-subtab-btn ${logsSubTab === 'audit' ? 'active-ai' : ''}`}
              onClick={() => setLogsSubTab('audit')}
              style={{ background: logsSubTab === 'audit' ? '#6366f1' : undefined, color: logsSubTab === 'audit' ? '#fff' : undefined }}
            >
              <ShieldCheck size={13} /> 🛡️ RBAC & Audit Trail
            </button>
          </div>
          <button
            className="logs-refresh-btn"
            onClick={() => {
              if (logsSubTab === 'ai') fetchAILogs();
              else if (logsSubTab === 'webhook') fetchWebhookLogs();
              else fetchAuditLogs();
            }}
          >
            <RefreshCw size={13} className={(logsSubTab === 'ai' ? loadingLogs : logsSubTab === 'webhook' ? loadingWebhook : loadingAudit) ? 'spin-icon' : ''} />
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

        {/* ---- 🛡️ RBAC & SECURITY AUDIT TRAIL ---- */}
        {logsSubTab === 'audit' && (
          <div className="logs-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {/* Stats Row */}
            <div className="logs-stats-grid">
              {[
                { label: 'Total Security Events', value: auditStats.total, cls: 'stat-neutral' },
                { label: 'Customer Data Exports', value: auditStats.exports, cls: 'stat-warn' },
                { label: 'Role & Auth Changes', value: auditStats.roles, cls: 'stat-error' },
                { label: 'Chatbot Mutations', value: auditStats.flows, cls: 'stat-info' },
              ].map((s, i) => (
                <div key={i} className="logs-stat-card">
                  <span className="logs-stat-label">{s.label}</span>
                  <span className={`logs-stat-value ${s.cls}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="logs-toolbar" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '600px' }}>
                <div className="inbox-search-box logs-search" style={{ flex: 1 }}>
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search actor email, name, IP address, or action..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                  />
                </div>
                <select
                  className="filter-select"
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                  style={{ height: '36px', minWidth: '160px' }}
                >
                  <option value="ALL">All Event Types</option>
                  <option value="EXPORT_CUSTOMERS_CSV">Customer Data Export</option>
                  <option value="EMPLOYEE_ROLE_UPDATED">Employee Role Change</option>
                  <option value="CHATBOT_FLOW_SAVED">Chatbot Saved</option>
                  <option value="CHATBOT_FLOW_DELETED">Chatbot Deleted</option>
                  <option value="CSAT_SURVEY_SENT">CSAT Survey Sent</option>
                  <option value="CSAT_RATING_RECEIVED">CSAT Rating Received</option>
                  <option value="INTEGRATION_CONFIG_UPDATED">Integration Config</option>
                </select>
              </div>

              <button
                onClick={handleExportAuditCSV}
                disabled={auditLogs.length === 0}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} /> Export Audit Log (CSV)
              </button>
            </div>

            {/* Audit Logs Table Card */}
            <div className="logs-table-card">
              <div className="logs-table-header">
                <ShieldCheck size={16} className="text-indigo-600" />
                <span>Security Audit Trail & Actor Accountability</span>
                <span className="logs-table-count">{auditLogs.length} logged actions</span>
              </div>

              {loadingAudit && auditLogs.length === 0 ? (
                <div className="inbox-loading-skeleton">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton-line long" style={{ height: '30px', borderRadius: '4px' }}></div>)}
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="logs-table-wrap">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Actor</th>
                        <th>Role</th>
                        <th>Action Type</th>
                        <th>Details Summary</th>
                        <th>IP Address</th>
                        <th>Timestamp</th>
                        <th style={{ textAlign: 'right' }}>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: any) => {
                        const isHighSeverity = log.actionType?.includes('EXPORT') || log.actionType?.includes('DELETE') || log.actionType?.includes('ROLE');
                        let parsedDetails: any = null;
                        try {
                          parsedDetails = log.detailsJson ? JSON.parse(log.detailsJson) : null;
                        } catch (e) {}

                        return (
                          <tr key={log.id}>
                            {/* Actor */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ede9fe', color: '#6d28d9', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {log.actorName?.charAt(0) || log.actorEmail?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{log.actorName || 'System / Admin'}</strong>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>{log.actorEmail || 'system@espon.in'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: log.actorRole === 'OWNER' ? '#fef3c7' : log.actorRole === 'ADMIN' ? '#eff6ff' : '#f1f5f9',
                                color: log.actorRole === 'OWNER' ? '#b45309' : log.actorRole === 'ADMIN' ? '#1d4ed8' : '#475569'
                              }}>
                                {log.actorRole || 'OWNER'}
                              </span>
                            </td>

                            {/* Action Type */}
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                background: isHighSeverity ? '#fee2e2' : '#f0fdf4',
                                color: isHighSeverity ? '#b91c1c' : '#15803d',
                                border: isHighSeverity ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {isHighSeverity ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
                                {log.actionType}
                              </span>
                            </td>

                            {/* Details Summary */}
                            <td>
                              <div className="log-truncate" style={{ maxWidth: '280px', color: '#334155', fontSize: '12px' }} title={log.detailsJson}>
                                {parsedDetails ? Object.entries(parsedDetails).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : (log.detailsJson || '—')}
                              </div>
                            </td>

                            {/* IP Address */}
                            <td>
                              <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#64748b', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                {log.ipAddress || '127.0.0.1'}
                              </span>
                            </td>

                            {/* Timestamp */}
                            <td className="log-time">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>

                            {/* Inspect Action */}
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => setSelectedAuditLog(log)}
                                style={{ background: '#f1f5f9', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', color: '#334155', fontSize: '11.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="logs-empty-cell">
                  <ShieldCheck size={36} className="logs-empty-icon text-indigo-500" />
                  <div className="logs-empty-title">Audit Trail Ready</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Security events like customer exports, role changes, and flow saves will log here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Detail Modal */}
        {selectedAuditLog && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedAuditLog(null)}>
            <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} className="text-indigo-600" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Security Event Inspection</h3>
                </div>
                <button onClick={() => setSelectedAuditLog(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Actor Name & Role</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{selectedAuditLog.actorName || 'Admin'} ({selectedAuditLog.actorRole || 'OWNER'})</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Actor Email</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{selectedAuditLog.actorEmail || 'system@espon.in'}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Action Type</span>
                    <strong style={{ fontSize: '12.5px', color: '#4f46e5', fontFamily: 'monospace' }}>{selectedAuditLog.actionType}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Source IP Address</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a', fontFamily: 'monospace' }}>{selectedAuditLog.ipAddress || '127.0.0.1'}</strong>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Raw Event Metadata JSON:
                  </span>
                  <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '14px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', margin: 0, maxHeight: '200px' }}>
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedAuditLog.detailsJson), null, 2);
                      } catch (e) {
                        return selectedAuditLog.detailsJson || '{}';
                      }
                    })()}
                  </pre>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginTop: '16px' }}>
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




