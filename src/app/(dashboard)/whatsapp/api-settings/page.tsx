"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, Send, Save, ArrowRight, Store, MessageSquare, Users, Bot, Layers, BookOpen, Edit3, X, Plus, Trash2, UserCheck, UserX, Shield } from "lucide-react";
import { 
  getWhatsAppApiCredentialsAction, 
  saveWhatsAppApiCredentialsAction, 
  getShopifyCredentialsAction, 
  saveShopifyCredentialsAction, 
  sendWhatsAppHelloWorldAction, 
  registerWhatsAppPhoneNumberAction,
  getWhatsAppSettingsAction,
  saveWhatsAppSettingsAction,
  getTeamMembersAction,
  getTeamsWithMembersAction,
  createTeamAction,
  deleteTeamAction,
  addAgentToTeamAction,
  removeAgentFromTeamAction,
  toggleAgentChatAvailabilityAction,
  getAllAgentsAction
} from "@/app/actions/whatsAppPlatformActions";
import { getPaymentGatewaySettings, savePaymentGatewaySettings } from "@/app/actions/paymentGatewayActions";

export default function WhatsAppAPISettingsPage() {
  const [activeTab, setActiveTab] = useState("gemini-ai");

  // Payment Gateway State
  const [pgActiveGateway, setPgActiveGateway] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [cashfreeAppId, setCashfreeAppId] = useState("");
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState("");
  const [merchantUpiId, setMerchantUpiId] = useState("");
  const [merchantUpiName, setMerchantUpiName] = useState("");
  const [savingPg, setSavingPg] = useState(false);
  const [pgMsg, setPgMsg] = useState<string | null>(null);
  const [showRzpSecret, setShowRzpSecret] = useState(false);
  const [showCfSecret, setShowCfSecret] = useState(false);

  // Integrations states
  const [wabaId, setWabaId] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [token, setToken] = useState("");
  const [webhookToken, setWebhookToken] = useState("espon_whatsapp_secure_webhook_token_2026");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Shopify State
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [showShopifyToken, setShowShopifyToken] = useState(false);
  const [savingShopify, setSavingShopify] = useState(false);
  const [shopifyResultMsg, setShopifyResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Test Message State
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Gemini AI Tab States
  const [geminiKey, setGeminiKey] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [activeModel, setActiveModel] = useState("gemini-3.8-flash");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingAI, setSavingAI] = useState(false);
  const [aiResultMsg, setAiResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamMsg, setTeamMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Agent Management States
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("AGENT");
  const [savingAgent, setSavingAgent] = useState(false);
  const [agentResultMsg, setAgentResultMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editAgentData, setEditAgentData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Facebook Register state
  const [registering, setRegistering] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    try {
      const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
      if (u) {
        const parsed = JSON.parse(decodeURIComponent(u.split("=")[1]));
        setCurrentUserRole(parsed.role || "");
        setCurrentUserEmail(parsed.email || "");
      }
    } catch {}
    loadAllSettings();
  }, []);

  const loadAllSettings = () => {
    Promise.all([
      getWhatsAppApiCredentialsAction(),
      getShopifyCredentialsAction(),
      getWhatsAppSettingsAction(),
      getTeamsWithMembersAction(),
      getAllAgentsAction()
    ]).then(([resWA, resShopify, resSettings, resTeams, resAgents]) => {
      if (resWA.success && resWA.credentials) {
        setWabaId(resWA.credentials.businessAccountId || "");
        setPhoneId(resWA.credentials.phoneId || "");
        setManagerId(resWA.credentials.businessManagerId || "");
        setPhoneNumber(resWA.credentials.phoneNumber || "");
        setToken(resWA.credentials.accessToken || "");
        setWebhookToken(resWA.credentials.webhookVerifyToken || "espon_whatsapp_secure_webhook_token_2026");
        setIsConnected(resWA.isConnected || false);
      }
      if (resShopify.success && resShopify.credentials) {
        setShopifyDomain(resShopify.credentials.shopifyStoreDomain || "");
        setShopifyToken(resShopify.credentials.shopifyAccessToken || "");
      }
      if (resSettings.success && resSettings.settings) {
        setGeminiKey(resSettings.settings.geminiApiKey || "");
        setWelcomeMsg(resSettings.settings.welcomeMessage || "Welcome! How can we help you today?");
        setActiveModel(resSettings.settings.aiModel || "gemini-3.8-flash");
        setSystemPrompt(resSettings.settings.aiSystemPrompt || "");
      }
      if (resTeams.success && resTeams.teams) setTeams(resTeams.teams);
      if (resAgents.success && resAgents.employees) setAllAgents(resAgents.employees);
      
      // Load client status & SaaS agents
      fetch('/api/whatsapp/client-status').then(r => r.json()).then(d => setClientInfo(d)).catch(() => {});
      fetch('/api/owner/agents').then(r => r.json()).then(d => { if (d.agents) setAgents(d.agents); }).catch(() => {});

      setLoading(false);
    });

    // Load payment gateway settings separately
    getPaymentGatewaySettings().then(pg => {
      setPgActiveGateway(pg.activeGateway);
      setRazorpayKeyId(pg.razorpayKeyId);
      setRazorpayKeySecret(pg.razorpayKeySecret);
      setCashfreeAppId(pg.cashfreeAppId);
      setCashfreeSecretKey(pg.cashfreeSecretKey);
      setMerchantUpiId(pg.merchantUpiId);
      setMerchantUpiName(pg.merchantUpiName);
    }).catch(() => {});
  };

  const reloadTeams = async () => {
    const [resTeams, resAgents] = await Promise.all([getTeamsWithMembersAction(), getAllAgentsAction()]);
    if (resTeams.success && resTeams.teams) setTeams(resTeams.teams);
    if (resAgents.success && resAgents.employees) setAllAgents(resAgents.employees);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const res = await createTeamAction(newTeamName.trim(), newTeamDesc.trim() || undefined);
    if (res.success) {
      setNewTeamName(""); setNewTeamDesc("");
      setTeamMsg({ success: true, text: `✓ Team "${res.team?.name}" created!` });
      await reloadTeams();
    } else {
      setTeamMsg({ success: false, text: res.error || "Failed to create team" });
    }
    setCreatingTeam(false);
    setTimeout(() => setTeamMsg(null), 3000);
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Delete team "${teamName}"? All agents will be unassigned.`)) return;
    const res = await deleteTeamAction(teamId);
    if (res.success) { setTeamMsg({ success: true, text: "Team deleted." }); await reloadTeams(); }
    else setTeamMsg({ success: false, text: res.error || "Failed" });
    setTimeout(() => setTeamMsg(null), 3000);
  };

  const handleToggleAgentInTeam = async (employeeId: string, currentTeamId: string | null, targetTeamId: string) => {
    if (currentTeamId === targetTeamId) {
      await removeAgentFromTeamAction(employeeId);
    } else {
      await addAgentToTeamAction(employeeId, targetTeamId);
    }
    await reloadTeams();
  };

  const handleToggleChatAvailable = async (employeeId: string, current: boolean) => {
    await toggleAgentChatAvailabilityAction(employeeId, !current);
    await reloadTeams();
  };


  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResultMsg(null);
    const res = await saveWhatsAppApiCredentialsAction({
      wabaId, phoneId, managerId, accessToken: token, phoneNumber, webhookVerifyToken: webhookToken
    });
    if (res.success) {
      setIsConnected(Boolean(res.isConnected));
      setResultMsg({ success: Boolean(res.isConnected), text: res.message || "Credentials updated." });
    } else {
      setResultMsg({ success: false, text: res.error || "Failed to save API credentials." });
    }
    setSaving(false);
  };

  const handleSaveShopifyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShopify(true);
    setShopifyResultMsg(null);
    let cleanDomain = shopifyDomain.replace('https://', '').replace('http://', '').trim();
    if (cleanDomain && !cleanDomain.includes('.myshopify.com')) {
       cleanDomain = `${cleanDomain}.myshopify.com`;
    }
    setShopifyDomain(cleanDomain);

    const res = await saveShopifyCredentialsAction({
      storeDomain: cleanDomain,
      accessToken: shopifyToken
    });
    if (res.success) {
      setShopifyResultMsg({ success: true, text: res.message || "Shopify credentials saved." });
    } else {
      setShopifyResultMsg({ success: false, text: res.error || "Failed to save Shopify credentials." });
    }
    setSavingShopify(false);
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;
    sendingTest || setSendingTest(true);
    setTestResultMsg(null);
    const res = await sendWhatsAppHelloWorldAction(testPhone);
    if (res.success) {
      setTestResultMsg({ success: true, text: "Test message sent successfully!" });
    } else {
      setTestResultMsg({ success: false, text: res.error || "Failed to send test message." });
    }
    setSendingTest(false);
  };

  const handleFacebookLogin = async () => {
    const pin = window.prompt("Enter the 6-digit Registration PIN to register this phone number with Meta Cloud API:");
    if (!pin) return;
    if (pin.length !== 6) {
      alert("PIN must be exactly 6 digits.");
      return;
    }
    setRegistering(true);
    const res = await registerWhatsAppPhoneNumberAction(pin);
    setRegistering(false);
    if (res.success) {
      alert(res.message);
    } else {
      alert("Registration Error: " + res.error);
    }
  };

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAI(true);
    setAiResultMsg(null);
    const res = await saveWhatsAppSettingsAction({
      geminiApiKey: geminiKey,
      welcomeMessage: welcomeMsg,
      aiModel: activeModel,
      aiSystemPrompt: systemPrompt
    });
    setSavingAI(false);
    if (res.success) {
      setAiResultMsg({ success: true, text: "✓ Gemini AI parameters configured successfully!" });
    } else {
      setAiResultMsg({ success: false, text: "Error: " + res.error });
    }
  };

  const handleSaveSLASettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSLA(true);
    setSlaResultMsg(null);
    const res = await saveWhatsAppSettingsAction({
      workingHoursStart,
      workingHoursEnd,
      slaWarningMinutes: slaMinutes,
      autoAssignStrategy
    });
    setSavingSLA(false);
    if (res.success) {
      setSlaResultMsg({ success: true, text: "✓ SLA and Work hours targets configured!" });
    } else {
      setSlaResultMsg({ success: false, text: "Error: " + res.error });
    }
  };

  const handleCreateCRMContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCRM(true);
    setCrmResultMsg(null);
    const res = await createCRMCustomerAction({
      contactPerson: newContactName,
      mobile: newContactPhone,
      customerType: newContactType
    });
    setSavingCRM(false);
    if (res.success) {
      setCrmResultMsg({ success: true, text: `✓ Customer "${newContactName}" registered successfully!` });
      setNewContactName("");
      setNewContactPhone("");
      // reload contacts
      const resCRM = await getCRMCustomersAction();
      if (resCRM.success && resCRM.customers) {
        setCrmContacts(resCRM.customers);
      }
    } else {
      setCrmResultMsg({ success: false, text: "Error: " + res.error });
    }
  };

  const handleSaveEditAgent = async (agentId: string) => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/owner/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAgentData)
      });
      const data = await res.json();
      if (data.success) {
        setEditingAgentId(null);
        fetch('/api/owner/agents').then(r => r.json()).then(d => { if (d.agents) setAgents(d.agents); });
      } else {
        alert(data.error || "Failed to update agent");
      }
    } catch (e) {
      alert("Connection error");
    }
    setSavingEdit(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings directory...</div>;
  }

  if (currentUserRole === "AGENT") {
    const myAgentInfo = agents.find(a => a.email === currentUserEmail);
    const onAgentProfileSave = async () => {
      if (!myAgentInfo) return;
      setSavingEdit(true);
      const payload = { ...myAgentInfo, ...editAgentData };
      try {
        const res = await fetch(`/api/owner/agents/${myAgentInfo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) alert("Profile updated successfully!");
        else alert(data.error || "Failed to update profile");
      } catch (e) {
        alert("Connection error");
      }
      setSavingEdit(false);
    };

    return (
      <div className="p-8 w-full max-w-none flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">My Profile</h1>
          <p className="text-gray-500 dark:text-gray-400">Update your personal details and password.</p>
        </div>
        
        {myAgentInfo ? (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 max-w-md">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Name</label>
                <input 
                  type="text" 
                  value={editAgentData.name !== undefined ? editAgentData.name : myAgentInfo.name} 
                  onChange={(e) => setEditAgentData({...editAgentData, name: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Email (Read Only)</label>
                <input 
                  type="email" 
                  value={myAgentInfo.email} 
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">New Password (optional)</label>
                <input 
                  type="password" 
                  value={editAgentData.password || ""} 
                  onChange={(e) => setEditAgentData({...editAgentData, password: e.target.value})} 
                  placeholder="Enter to change password"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" 
                />
              </div>
              <div className="pt-2">
                <button 
                  onClick={onAgentProfileSave} 
                  disabled={savingEdit} 
                  className="w-full px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  {savingEdit ? <RefreshCw size={16} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading profile data...</div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-none flex flex-col gap-8">
      {/* Header title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">Settings & Directory</h1>
        <p className="text-gray-500 dark:text-gray-400">Configure core external APIs, Gemini LLM cascades, team members auto-routing and CRM contact list.</p>
      </div>

      {/* Tabs list bar */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 gap-1">
        



        <button
          onClick={() => setActiveTab("team-sla")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "team-sla" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300"
          }`}
        >
          <Users size={16} />
          <span>👥 Teams</span>
        </button>

        <button
          onClick={() => setActiveTab("agents")}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "agents" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300"
          }`}
        >
          <Users size={16} />
          <span>👥 Team Agents</span>
        </button>
      </div>



      {/* 3. Teams Tab */}
      {activeTab === "team-sla" && (
        <div className="flex flex-col gap-6 w-full max-w-4xl">

          {/* Notification bar */}
          {teamMsg && (
            <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${teamMsg.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <CheckCircle2 size={16} /><span>{teamMsg.text}</span>
            </div>
          )}

          {/* Create New Team */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Plus size={18} className="text-indigo-500" /> Create New Team
            </h2>
            <p className="text-sm text-gray-500 mb-5">Teams group agents for Round Robin chat assignment in the chatbot builder.</p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Team name (e.g. Sales, Support)"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newTeamDesc}
                onChange={e => setNewTeamDesc(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                {creatingTeam ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                Create Team
              </button>
            </div>
          </div>

          {/* Teams List */}
          {teams.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-12 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No teams yet. Create your first team above.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  {/* Team Header */}
                  <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors" onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                        <Shield size={16} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{team.name}</h3>
                        {team.description && <p className="text-xs text-gray-400">{team.description}</p>}
                      </div>
                      <span className="ml-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold">{team.members?.length || 0} agents</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id, team.name); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="text-gray-400 text-xs">{expandedTeam === team.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded: Agent List */}
                  {expandedTeam === team.id && (
                    <div className="border-t border-gray-100 dark:border-slate-700 px-6 py-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select agents for this team</p>
                      <div className="flex flex-col gap-2">
                        {allAgents.map(agent => {
                          const isInThisTeam = agent.teamId === team.id;
                          return (
                            <div key={agent.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${isInThisTeam ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5' : 'border-gray-100 dark:border-slate-700 hover:border-gray-200'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isInThisTeam ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300'}`}>
                                  {(agent.user?.name || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{agent.user?.name || 'Agent'}</p>
                                  <p className="text-xs text-gray-400">{agent.user?.email}</p>
                                </div>
                                {agent.teamId && agent.teamId !== team.id && (
                                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">In: {teams.find(t => t.id === agent.teamId)?.name}</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleToggleAgentInTeam(agent.id, agent.teamId, team.id)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isInThisTeam ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                              >
                                {isInThisTeam ? 'Remove' : 'Add to Team'}
                              </button>
                            </div>
                          );
                        })}
                        {allAgents.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No agents found. Add agents in the Team Agents tab first.</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agent Chat Availability */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <UserCheck size={18} className="text-green-500" /> Agent Chat Availability
            </h2>
            <p className="text-sm text-gray-500 mb-5">Temporarily mark agents as unavailable for chat assignment without changing their employment status.</p>
            <div className="flex flex-col gap-3">
              {allAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${agent.chatAvailable !== false ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{agent.user?.name || 'Agent'}</p>
                      <p className="text-xs text-gray-400">{agent.team ? `Team: ${agent.team.name}` : 'No team assigned'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleChatAvailable(agent.id, agent.chatAvailable !== false)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${agent.chatAvailable !== false ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${agent.chatAvailable !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
              {allAgents.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No agents found.</p>}
            </div>
          </div>

        </div>
      )}


      {/* 4. Team Agents Tab */}
      {activeTab === "agents" && (
        <div className="flex flex-col gap-6 w-full max-w-4xl">
          {/* Client status & seat limit indicator */}
          {clientInfo && (
            <div className={`p-5 rounded-2xl border flex items-center gap-4 shadow-sm ${
              clientInfo.blocked ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' :
              clientInfo.pastDue ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' :
              'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/15'
            }`}>
              <div className="text-2xl">{clientInfo.blocked ? "🔒" : clientInfo.pastDue ? "⚠️" : "✅"}</div>
              <div className="flex-1">
                <h4 className={`text-base font-bold mb-0.5 ${
                  clientInfo.blocked ? 'text-red-900 dark:text-red-300' :
                  clientInfo.pastDue ? 'text-amber-900 dark:text-amber-300' :
                  'text-indigo-900 dark:text-indigo-300'
                }`}>
                  Subscription: {clientInfo.subscriptionStatus || "ACTIVE"}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                  {clientInfo.pastDue && `Renewal overdue. ${clientInfo.daysLeft} days remaining in grace period before access is suspended.`}
                  {clientInfo.blocked && `Access is suspended. Please contact your app owner to renew your plan.`}
                  {!clientInfo.pastDue && !clientInfo.blocked && `Plan is active. Next renewal date: ${clientInfo.currentPeriodEnd ? new Date(clientInfo.currentPeriodEnd).toLocaleDateString('en-IN') : 'Unlimited'}`}
                </p>
              </div>
            </div>
          )}

          {/* Seat limit progress indicator */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">👥 Agent Seat Usage</h3>
            <p className="text-sm text-gray-500 mb-4">You can add team agents up to your subscription seat limit.</p>
            
            {clientInfo && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <span>Seats Occupied</span>
                  <span>{agents.length} / {clientInfo.maxAgents || 3} Agents</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (agents.length / (clientInfo.maxAgents || 3)) * 100)}%` }}
                  />
                </div>
                {agents.length >= (clientInfo.maxAgents || 3) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium m-0 mt-1">
                    ⚠️ Seat limit reached. Contact your app provider to upgrade your plan for more seats.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Add Agent Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">📝 Add Team Agent</h2>
            <p className="text-sm text-gray-500 mb-6">Create login credentials for agents to join the workspace and handle chats.</p>

            {agentResultMsg && (
              <div className={`mb-4 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${agentResultMsg.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <CheckCircle2 size={18} />
                <span>{agentResultMsg.text}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newAgentName || !newAgentEmail || !newAgentPassword) { setAgentResultMsg({ success: false, text: "All fields are required." }); return; }
              setSavingAgent(true);
              try {
                const res = await fetch('/api/owner/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newAgentName, email: newAgentEmail, password: newAgentPassword, role: newAgentRole }) });
                const data = await res.json();
                if (data.success) {
                  setAgentResultMsg({ success: true, text: 'Agent added successfully!' });
                  setNewAgentName(""); setNewAgentEmail(""); setNewAgentPassword(""); setNewAgentRole("AGENT");
                  fetch('/api/owner/agents').then(r => r.json()).then(d => { if (d.agents) setAgents(d.agents); });
                } else { setAgentResultMsg({ success: false, text: data.error || 'Failed to add agent.' }); }
              } catch { setAgentResultMsg({ success: false, text: 'Connection error.' }); }
              setSavingAgent(false);
            }} className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Agent Name</label>
                <input type="text" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} required placeholder="e.g. John Doe" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Email Address</label>
                <input type="email" value={newAgentEmail} onChange={(e) => setNewAgentEmail(e.target.value)} required placeholder="e.g. agent@esponsports.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Password</label>
                <input type="password" value={newAgentPassword} onChange={(e) => setNewAgentPassword(e.target.value)} required placeholder="Set password" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Workspace Role</label>
                <select value={newAgentRole} onChange={(e) => setNewAgentRole(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="AGENT">Agent (Chats only)</option>
                  <option value="ADMIN">Admin (Settings & API)</option>
                </select>
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={savingAgent || (clientInfo && agents.length >= clientInfo.maxAgents)} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-bold shadow-md transition-all">
                  {savingAgent ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Add Team Agent
                </button>
              </div>
            </form>
          </div>

          {/* Agents List Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">📒 Active Team Agents</h2>
            <p className="text-sm text-gray-500 mb-6">List of users who can sign in and manage conversations in this workspace.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 font-semibold">
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {agents.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{a.name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{a.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          a.role === "ADMIN" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                        }`}>
                          {a.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          a.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                        }`}>
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => { setEditingAgentId(a.id); setEditAgentData({...a, password: ""}); }} className="text-gray-400 hover:text-indigo-600 transition-colors">
                          <Edit3 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {agents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">No agents found in this workspace.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {editingAgentId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Edit Team Agent</h3>
              <button onClick={() => setEditingAgentId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Name</label>
                <input type="text" value={editAgentData.name || ''} onChange={(e) => setEditAgentData({...editAgentData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Email</label>
                <input type="email" value={editAgentData.email || ''} onChange={(e) => setEditAgentData({...editAgentData, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">New Password (optional)</label>
                <input type="password" value={editAgentData.password || ''} onChange={(e) => setEditAgentData({...editAgentData, password: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Role</label>
                  <select value={editAgentData.role || 'AGENT'} onChange={(e) => setEditAgentData({...editAgentData, role: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                    <option value="AGENT">AGENT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Status</label>
                  <select value={editAgentData.isActive ? "true" : "false"} onChange={(e) => setEditAgentData({...editAgentData, isActive: e.target.value === "true"})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setEditingAgentId(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={() => handleSaveEditAgent(editingAgentId)} disabled={savingEdit} className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                {savingEdit ? <RefreshCw size={16} className="animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
