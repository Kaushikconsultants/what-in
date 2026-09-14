'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bot, 
  GitBranch, 
  Play, 
  Square, 
  Activity, 
  Search, 
  Trash2, 
  Edit3, 
  Save, 
  Check, 
  X, 
  Pencil, 
  Sparkles, 
  Download, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  BookOpen, 
  Stethoscope, 
  GraduationCap, 
  Building2, 
  Car, 
  Utensils, 
  Briefcase, 
  ShoppingCart, 
  Wrench 
} from 'lucide-react';
import { 
  getWhatsAppChatbotFlows, 
  toggleWhatsAppChatbotFlowStatusAction, 
  deleteWhatsAppChatbotFlowAction, 
  getWhatsAppChatbotLogsAction, 
  renameWhatsAppChatbotFlowAction, 
  installIndustryChatbotPresetAction 
} from '@/app/actions/whatsAppPlatformActions';
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
    <div className="w-full flex flex-col gap-6 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot size={22} className="text-indigo-600 dark:text-indigo-400" />
            Chatbot Automation Hub
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Manage your automated WhatsApp flows, keyword triggers, 8 multi-industry playbooks, and live debug sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('templates')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Sparkles size={16} />
            Industry Templates ({INDUSTRY_CHATBOT_PRESETS.length})
          </button>
          <button 
            onClick={() => router.push('/whatsapp/chatbot-builder')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <GitBranch size={16} />
            Create Blank Flow
          </button>
        </div>
      </div>

      {/* Sub-tabs: Bots vs Templates vs Logs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        <button 
          onClick={() => setActiveTab('bots')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'bots' 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Bot size={16} /> All Chatbots ({flows.length})
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates' 
              ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Sparkles size={16} /> 📚 Industry Playbooks &amp; Templates ({INDUSTRY_CHATBOT_PRESETS.length})
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs' 
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Activity size={16} /> Session Logs (Debug)
        </button>
      </div>

      {/* TAB 1: ALL CHATBOTS TABLE */}
      {activeTab === 'bots' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 text-slate-600 dark:text-slate-400 font-bold text-xs">Chatbot Name</th>
                  <th className="p-4 text-slate-600 dark:text-slate-400 font-bold text-xs">Trigger Keyword</th>
                  <th className="p-4 text-slate-600 dark:text-slate-400 font-bold text-xs">Status</th>
                  <th className="p-4 text-slate-600 dark:text-slate-400 font-bold text-xs">Last Updated</th>
                  <th className="p-4 text-slate-600 dark:text-slate-400 font-bold text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">Loading bots...</td></tr>
                ) : flows.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400">No chatbots found. Click &quot;Create Blank Flow&quot; or select an Industry Template to start.</td></tr>
                ) : (
                  flows.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {editingId === f.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(f.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="px-2.5 py-1.5 rounded-lg border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                            />
                            <button
                              onClick={() => handleSaveRename(f.id)}
                              disabled={isSavingName}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg cursor-pointer transition-colors"
                              title="Save Name"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 p-1.5 rounded-lg cursor-pointer transition-colors"
                              title="Cancel"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{f.name}</span>
                            <button
                              onClick={() => handleStartRename(f)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors inline-flex"
                              title="Rename Chatbot"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md text-xs font-mono border border-slate-200/80 dark:border-slate-700/80">
                          {f.triggerKeyword || 'None'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleStatus(f.id, f.isActive)}
                          className={`border-0 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            f.isActive 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {f.isActive ? <Play size={12} /> : <Square size={12} />}
                          {f.isActive ? 'ACTIVE' : 'DRAFT'}
                        </button>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{new Date(f.updatedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleStartRename(f)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 p-1.5 rounded-lg cursor-pointer transition-colors" title="Rename Bot"><Pencil size={15} /></button>
                          <button onClick={() => handleEdit(f.id)} className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border-0 p-1.5 rounded-lg cursor-pointer transition-colors" title="Edit Flow"><Edit3 size={16} /></button>
                          <button onClick={() => handleDelete(f.id)} className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-0 p-1.5 rounded-lg cursor-pointer transition-colors" title="Delete Flow"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRY TEMPLATES */}
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                  selectedIndustryFilter === pill.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPresets.map(preset => {
              const parsed = JSON.parse(preset.nodesJson);
              const nodeCount = parsed.nodes ? parsed.nodes.length : 0;

              return (
                <div
                  key={preset.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header: Icon + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                          {getPresetIcon(preset.id)}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                            {preset.industry}
                          </span>
                          <h4 className="m-0 text-sm font-bold text-slate-900 dark:text-white">
                            {preset.name}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 whitespace-nowrap">
                        {preset.badge}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="m-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Keywords Tag */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 rounded-lg p-2.5">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        🎯 Keyword Triggers:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preset.triggerKeyword.split(',').map((kw, i) => (
                          <span key={i} className="bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Flow Steps Preview */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Layers size={14} className="text-indigo-500" />
                      <span><strong>{nodeCount} Nodes</strong> in visual flowchart</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setPreviewPreset(preset)}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-0 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <BookOpen size={14} /> Preview Flow
                    </button>
                    <button
                      onClick={() => handleInstallPreset(preset.id)}
                      disabled={installingPresetId === preset.id}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white border-0 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      {installingPresetId === preset.id ? (
                        <span>Installing...</span>
                      ) : (
                        <>
                          <Download size={14} /> Install &amp; Launch <ArrowRight size={14} />
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setPreviewPreset(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                  {getPresetIcon(previewPreset.id)}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{previewPreset.industry}</span>
                  <h3 className="m-0 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">{previewPreset.name}</h3>
                </div>
              </div>
              <button onClick={() => setPreviewPreset(null)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 rounded-lg p-1.5 cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 py-4">
              <div>
                <h5 className="m-0 mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">Playbook Description</h5>
                <p className="m-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{previewPreset.description}</p>
              </div>

              <div>
                <h5 className="m-0 mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">Recommended AI System Prompt</h5>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  &quot;{previewPreset.recommendedAiSystemPrompt}&quot;
                </div>
              </div>

              <div>
                <h5 className="m-0 mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Flowchart Node Hierarchy</h5>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {(() => {
                    try {
                      const parsed = JSON.parse(previewPreset.nodesJson);
                      return (parsed.nodes || []).map((node: any, idx: number) => (
                        <div key={node.id || idx} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <strong className="text-xs text-slate-900 dark:text-white">{node.title || node.type}</strong>
                              {node.data?.text && (
                                <p className="m-0 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 max-w-sm truncate">
                                  {node.data.text}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                            {node.type}
                          </span>
                        </div>
                      ));
                    } catch (e) {
                      return <span className="text-slate-400 text-xs">Could not parse flow preview.</span>;
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setPreviewPreset(null)} className="py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Close
              </button>
              <button
                onClick={() => {
                  const id = previewPreset.id;
                  setPreviewPreset(null);
                  handleInstallPreset(id);
                }}
                className="py-2 px-4 rounded-lg border-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download size={15} /> Install Playbook to Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit shadow-xs transition-colors">
            <h3 className="m-0 mb-3 text-base font-bold text-slate-900 dark:text-white">Search Logs</h3>
            <p className="m-0 mb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Enter a customer&apos;s mobile number to trace their chatbot session and exact webhook errors.</p>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Number</label>
              <input 
                type="text" 
                placeholder="e.g. 9999999999" 
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchLogs()}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors"
              />
              <button 
                onClick={() => handleSearchLogs()}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white border-0 p-2.5 rounded-lg cursor-pointer font-bold text-xs flex items-center justify-center gap-2 mt-2 transition-colors shadow-2xs"
              >
                <Search size={15} /> Search Sessions
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
              <h3 className="m-0 text-sm font-bold text-slate-900 dark:text-white">Session Execution Timeline</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{logs.length} events</span>
            </div>
            
            <div className="p-5 flex flex-col gap-4 max-h-[600px] overflow-y-auto">
              {loadingLogs ? (
                <div className="text-slate-500 dark:text-slate-400 text-center p-10 text-xs">Loading session data...</div>
              ) : logs.length === 0 ? (
                <div className="text-slate-400 text-center p-10 text-xs flex flex-col items-center">
                  <Activity size={36} className="opacity-25 mb-3" />
                  <div>No logs available yet.</div>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} style={{ borderLeft: `3px solid ${log.responseStatus === 200 || log.responseStatus === 201 ? '#22c55e' : log.responseStatus ? '#ef4444' : '#3b82f6'}` }} className="pl-3.5 relative">
                    <div className="text-[11px] text-slate-400 mb-1">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      {log.nodeType}: {log.actionDesc}
                      {log.responseStatus && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                          log.responseStatus === 200 || log.responseStatus === 201
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          Status {log.responseStatus}
                        </span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-2.5 rounded-lg text-xs mt-2 border border-rose-200 dark:border-rose-800/60">
                        <strong>Error/Response:</strong> {log.errorMessage}
                      </div>
                    )}
                    {log.payload && (
                      <div className="mt-2">
                        <div className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">PAYLOAD SENT</div>
                        <pre className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto border border-slate-200 dark:border-slate-700 m-0 text-slate-900 dark:text-slate-100">
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
