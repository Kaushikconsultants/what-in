'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, GitBranch, Play, Square, Activity, Search, Trash2, Edit3, Save, Check, X, Pencil, Sparkles, Download, Layers, ShieldCheck, ArrowRight, BookOpen, Stethoscope, GraduationCap, Building2, Car, Utensils, Briefcase, ShoppingCart, Wrench } from 'lucide-react';
import { getWhatsAppChatbotFlows, toggleWhatsAppChatbotFlowStatusAction, deleteWhatsAppChatbotFlowAction, getWhatsAppChatbotLogsAction, renameWhatsAppChatbotFlowAction, installIndustryChatbotPresetAction } from '@/app/actions/whatsAppPlatformActions';
import { INDUSTRY_CHATBOT_PRESETS, IndustryChatbotPreset } from '@/lib/industryChatbotPresets';

export default function WhatsAppChatbotsComponent() {
  const router = useRouter();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  // Tabs state: bots, templates, logs
  const [activeTab, setActiveTab] = useState<'bots' | 'templates' | 'logs'>('bots');
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>('ALL');
  const [previewPreset, setPreviewPreset] = useState<IndustryChatbotPreset | null>(null);
  const [installingPresetId, setInstallingPresetId] = useState<string | null>(null);

  // Logs state
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

  const handleInstallPreset = async (presetId: string) => {
    setInstallingPresetId(presetId);
    const res = await installIndustryChatbotPresetAction(presetId);
    if (res.success && res.flow) {
      router.push(`/whatsapp/chatbot-builder?flowId=${res.flow.id}`);
    } else {
      alert(`Failed to install preset: ${res.error || 'Unknown error'}`);
      setInstallingPresetId(null);
    }
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

  const filteredPresets = selectedIndustryFilter === 'ALL'
    ? INDUSTRY_CHATBOT_PRESETS
    : INDUSTRY_CHATBOT_PRESETS.filter(p => p.industry.toLowerCase().includes(selectedIndustryFilter.toLowerCase()) || p.category.toLowerCase().includes(selectedIndustryFilter.toLowerCase()));

  const getPresetIcon = (id: string) => {
    switch (id) {
      case 'healthcare-clinic-booking': return <Stethoscope size={20} className="text-rose-500" />;
      case 'edtech-course-counselor': return <GraduationCap size={20} className="text-blue-500" />;
      case 'realestate-sitevisit-bot': return <Building2 size={20} className="text-amber-500" />;
      case 'auto-testdrive-service': return <Car size={20} className="text-indigo-500" />;
      case 'restaurant-table-booking': return <Utensils size={20} className="text-orange-500" />;
      case 'b2b-lead-qualification': return <Briefcase size={20} className="text-purple-500" />;
      case 'ecommerce-catalog-order': return <ShoppingCart size={20} className="text-emerald-500" />;
      case 'home-field-service': return <Wrench size={20} className="text-cyan-500" />;
      default: return <Bot size={20} className="text-indigo-500" />;
    }
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
          <p className="text-gray-500 text-sm">Manage your automated WhatsApp flows, keyword triggers, 8 multi-industry playbooks, and live debug sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('templates')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <Sparkles size={16} />
            Industry Templates ({INDUSTRY_CHATBOT_PRESETS.length})
          </button>
          <button 
            onClick={() => router.push('/whatsapp/chatbot-builder')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <GitBranch size={16} />
            Create Blank Flow
          </button>
        </div>
      </div>

      {/* Sub-tabs: Bots vs Templates vs Logs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
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
          onClick={() => setActiveTab('templates')}
          style={{ 
            background: activeTab === 'templates' ? '#f5f3ff' : 'transparent', 
            color: activeTab === 'templates' ? '#7c3aed' : '#64748b', 
            border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Sparkles size={16} /> 📚 Industry Playbooks & Templates ({INDUSTRY_CHATBOT_PRESETS.length})
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

      {activeTab === 'templates' && (
        <div className="flex flex-col gap-6">
          {/* Industry Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-slate-800">
            {[
              { id: 'ALL', label: '🌟 All Industries (8)' },
              { id: 'Healthcare', label: '🏥 Healthcare & Clinics' },
              { id: 'EdTech', label: '🏫 EdTech & Coaching' },
              { id: 'Real Estate', label: '🏡 Real Estate & Builders' },
              { id: 'Automotive', label: '🚗 Auto Showrooms & Service' },
              { id: 'Hospitality', label: '🍽️ Restaurants & Dining' },
              { id: 'B2B', label: '💼 B2B Agencies & SaaS' },
              { id: 'E-Commerce', label: '🛍️ D2C & Retail Brands' },
              { id: 'Services', label: '🔧 Home & Field Services' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setSelectedIndustryFilter(pill.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: selectedIndustryFilter === pill.id ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  background: selectedIndustryFilter === pill.id ? '#ede9fe' : '#ffffff',
                  color: selectedIndustryFilter === pill.id ? '#4f46e5' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {filteredPresets.map(preset => {
              const parsed = JSON.parse(preset.nodesJson);
              const nodeCount = parsed.nodes ? parsed.nodes.length : 0;

              return (
                <div
                  key={preset.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative'
                  }}
                  className="hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header: Icon + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                          {getPresetIcon(preset.id)}
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {preset.industry}
                          </span>
                          <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {preset.name}
                          </h4>
                        </div>
                      </div>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}>
                        {preset.badge}
                      </span>
                    </div>

                    {/* Description */}
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                      {preset.description}
                    </p>

                    {/* Keywords Tag */}
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '8px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        🎯 Keyword Triggers:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {preset.triggerKeyword.split(',').map((kw, i) => (
                          <span key={i} style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Flow Steps Preview */}
                    <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={14} className="text-indigo-500" />
                      <span><strong>{nodeCount} Nodes</strong> in visual flowchart</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setPreviewPreset(preset)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        color: '#334155',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <BookOpen size={14} /> Preview Flow
                    </button>
                    <button
                      onClick={() => handleInstallPreset(preset.id)}
                      disabled={installingPresetId === preset.id}
                      style={{
                        flex: 1.2,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: installingPresetId === preset.id ? 0.7 : 1
                      }}
                    >
                      {installingPresetId === preset.id ? (
                        <span>Installing...</span>
                      ) : (
                        <>
                          <Download size={14} /> Install & Launch <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset Preview Modal */}
      {previewPreset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPreviewPreset(null)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div style={{ padding: '10px', borderRadius: '10px', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                  {getPresetIcon(previewPreset.id)}
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>{previewPreset.industry}</span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{previewPreset.name}</h3>
                </div>
              </div>
              <button onClick={() => setPreviewPreset(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 py-4">
              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>Playbook Description</h5>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{previewPreset.description}</p>
              </div>

              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>Recommended AI System Prompt</h5>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '12.5px', color: '#334155', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{previewPreset.recommendedAiSystemPrompt}"
                </div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>Flowchart Node Hierarchy</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {(() => {
                    try {
                      const parsed = JSON.parse(previewPreset.nodesJson);
                      return (parsed.nodes || []).map((node: any, idx: number) => (
                        <div key={node.id || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {idx + 1}
                            </span>
                            <div>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{node.title || node.type}</strong>
                              {node.data?.text && (
                                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {node.data.text}
                                </p>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#ede9fe', color: '#6d28d9' }}>
                            {node.type}
                          </span>
                        </div>
                      ));
                    } catch (e) {
                      return <span style={{ color: '#94a3b8' }}>Could not parse flow preview.</span>;
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setPreviewPreset(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
              <button
                onClick={() => {
                  const id = previewPreset.id;
                  setPreviewPreset(null);
                  handleInstallPreset(id);
                }}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} /> Install Playbook to Database
              </button>
            </div>
          </div>
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
