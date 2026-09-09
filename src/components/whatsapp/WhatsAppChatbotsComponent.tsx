'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, GitBranch, Play, Square, Activity, Search, Trash2, Edit3, Save, Check, X, Pencil } from 'lucide-react';
import { getWhatsAppChatbotFlows, toggleWhatsAppChatbotFlowStatusAction, deleteWhatsAppChatbotFlowAction, getWhatsAppChatbotLogsAction, renameWhatsAppChatbotFlowAction } from '@/app/actions/whatsAppPlatformActions';

export default function WhatsAppChatbotsComponent() {
  const router = useRouter();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  // Logs state
  const [activeTab, setActiveTab] = useState<'bots' | 'logs'>('bots');
  const [searchPhone, setSearchPhone] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchBots();
    // Also fetch recent logs by default
    handleSearchLogs('');
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    const res = await getWhatsAppChatbotFlows();
    if (res.success && res.flows) {
      setFlows(res.flows);
    }
    setLoading(false);
  };

  const handleStartRename = (flow: any) => {
    setEditingId(flow.id);
    setEditingName(flow.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingName.trim()) return;
    setIsSavingName(true);
    const res = await renameWhatsAppChatbotFlowAction(id, editingName.trim());
    if (res.success) {
      setFlows(prev => prev.map(f => f.id === id ? { ...f, name: editingName.trim() } : f));
      setEditingId(null);
    } else {
      alert(`Failed to rename chatbot: ${res.error}`);
    }
    setIsSavingName(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await toggleWhatsAppChatbotFlowStatusAction(id, !currentStatus);
    if (res.success) {
      fetchBots();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chatbot?')) return;
    const res = await deleteWhatsAppChatbotFlowAction(id);
    if (res.success) {
      fetchBots();
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/whatsapp/chatbot-builder?flowId=${id}`);
  };

  const handleSearchLogs = async (overridePhone?: string) => {
    const phoneToSearch = typeof overridePhone === 'string' ? overridePhone : searchPhone;
    setLoadingLogs(true);
    const cleaned = phoneToSearch ? phoneToSearch.replace(/\D/g, '').slice(-10) : '';
    const res = await getWhatsAppChatbotLogsAction(cleaned);
    if (res.success && res.logs) {
      setLogs(res.logs);
    } else {
      setLogs([]);
    }
    setLoadingLogs(false);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot size={22} className="text-indigo-600" />
            Chatbot Automation Hub
          </h2>
          <p className="text-gray-500 text-sm">Manage your automated WhatsApp flows, keyword triggers, and live debug sessions.</p>
        </div>
        <button 
          onClick={() => router.push('/whatsapp/chatbot-builder')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
        >
          <GitBranch size={16} />
          Create New Chatbot
        </button>
      </div>

      {/* Sub-tabs: Bots vs Logs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('bots')}
          style={{ 
            background: activeTab === 'bots' ? '#eff6ff' : 'transparent', 
            color: activeTab === 'bots' ? '#2563eb' : '#64748b', 
            border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Bot size={16} /> All Chatbots ({flows.length})
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{ 
            background: activeTab === 'logs' ? '#fef2f2' : 'transparent', 
            color: activeTab === 'logs' ? '#dc2626' : '#64748b', 
            border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Activity size={16} /> Session Logs (Debug)
        </button>
      </div>

      {activeTab === 'bots' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>Chatbot Name</th>
                <th style={{ padding: '16px', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>Trigger Keyword</th>
                <th style={{ padding: '16px', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>Status</th>
                <th style={{ padding: '16px', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>Last Updated</th>
                <th style={{ padding: '16px', color: '#64748b', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading bots...</td></tr>
              ) : flows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No chatbots found. Click "Create New Chatbot" to start.</td></tr>
              ) : (
                flows.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: 500, color: '#0f172a' }}>
                      {editingId === f.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(f.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1.5px solid #2563eb',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              outline: 'none',
                              color: '#0f172a'
                            }}
                          />
                          <button
                            onClick={() => handleSaveRename(f.id)}
                            disabled={isSavingName}
                            style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Save Name"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ background: '#cbd5e1', color: '#334155', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Cancel"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{f.name}</span>
                          <button
                            onClick={() => handleStartRename(f)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'inline-flex' }}
                            title="Rename Chatbot"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: '#475569' }}>
                      <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                        {f.triggerKeyword || 'None'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button 
                        onClick={() => handleToggleStatus(f.id, f.isActive)}
                        style={{ 
                          background: f.isActive ? '#dcfce7' : '#f1f5f9', 
                          color: f.isActive ? '#16a34a' : '#64748b', 
                          border: 'none', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                        }}
                      >
                        {f.isActive ? <Play size={12} /> : <Square size={12} />}
                        {f.isActive ? 'ACTIVE' : 'DRAFT'}
                      </button>
                    </td>
                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>{new Date(f.updatedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleStartRename(f)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Rename Bot"><Pencil size={15} /></button>
                      <button onClick={() => handleEdit(f.id)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Edit Flow"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(f.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Delete Flow"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Search Logs</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>Enter a customer's mobile number to trace their chatbot session and exact webhook errors.</p>
            
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Mobile Number</label>
              <input 
                type="text" 
                placeholder="e.g. 9999999999" 
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchLogs()}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <button 
                onClick={handleSearchLogs}
                style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
              >
                <Search size={16} /> Search Sessions
              </button>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Session Execution Timeline</h3>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{logs.length} events</span>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
              {loadingLogs ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading session data...</div>
              ) : logs.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                  <Activity size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <div>No logs available yet.</div>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} style={{ borderLeft: `3px solid ${log.responseStatus === 200 || log.responseStatus === 201 ? '#22c55e' : log.responseStatus ? '#ef4444' : '#3b82f6'}`, paddingLeft: '16px', position: 'relative' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                      {log.nodeType}: {log.actionDesc}
                      {log.responseStatus && (
                        <span style={{ marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: log.responseStatus === 200 || log.responseStatus === 201 ? '#dcfce7' : '#fee2e2', color: log.responseStatus === 200 || log.responseStatus === 201 ? '#16a34a' : '#dc2626' }}>
                          Status {log.responseStatus}
                        </span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', marginTop: '8px', border: '1px solid #fecaca' }}>
                        <strong>Error/Response:</strong> {log.errorMessage}
                      </div>
                    )}
                    {log.payload && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>PAYLOAD SENT</div>
                        <pre style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', border: '1px solid #e2e8f0', margin: 0, color: '#0f172a' }}>
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
