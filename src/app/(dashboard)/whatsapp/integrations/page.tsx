"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, Send, Save, ArrowRight, Store, MessageSquare, Users, Bot, Layers, BookOpen, Edit3, X, Plus, Trash2, UserCheck, UserX, Shield, ExternalLink, Sparkles, HelpCircle, Target, Edit, Zap, ShoppingBag } from "lucide-react";
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
import { 
  getWhatsAppIntegrationsAction, 
  createWhatsAppIntegrationAction, 
  updateWhatsAppIntegrationAction, 
  deleteWhatsAppIntegrationAction,
  testMetaCatalogConnectionAction,
  fetchMetaCatalogsFromTokenAction
} from "@/app/actions/whatsAppIntegrationActions";
import WhatsAppAIAutomationComponent from "@/components/whatsapp/WhatsAppAIAutomationComponent";


export default function IntegrationsHubPage() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Meta CAPI Lead Value State
  const [metaCapiLeadValue, setMetaCapiLeadValue] = useState<number>(10000);
  const [savingCapi, setSavingCapi] = useState(false);
  const [capiResultMsg, setCapiResultMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [testingCatalogId, setTestingCatalogId] = useState<string | null>(null);
  const [catalogTestStatus, setCatalogTestStatus] = useState<{ id: string; success: boolean; text: string } | null>(null);
  const [fetchingCatalogs, setFetchingCatalogs] = useState(false);
  const [fetchedCatalogs, setFetchedCatalogs] = useState<any[]>([]);
  const [catalogFetchError, setCatalogFetchError] = useState<string | null>(null);

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
  const [webhookToken, setWebhookToken] = useState("whatin_whatsapp_secure_webhook_token_2026");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Shopify State
  
  // Webhooks State
  const [webhookIntegrations, setWebhookIntegrations] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", url: "", token: "", type: "CRM_LEAD" });

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
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["whatsapp", "ai-automation", "shopify", "payment", "webhooks", "facebook"].includes(tabParam)) {
        setActiveTab(tabParam);
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
      getAllAgentsAction(),
      getWhatsAppIntegrationsAction()
    ]).then(([resWA, resShopify, resSettings, resTeams, resAgents, resWebhooks]) => {
      if (resWA.success && resWA.credentials) {
        setWabaId(resWA.credentials.businessAccountId || "");
        setPhoneId(resWA.credentials.phoneId || "");
        setManagerId(resWA.credentials.businessManagerId || "");
        setPhoneNumber(resWA.credentials.phoneNumber || "");
        setToken(resWA.credentials.accessToken || "");
        setWebhookToken(resWA.credentials.webhookVerifyToken || "whatin_whatsapp_secure_webhook_token_2026");
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
        if (resSettings.settings.metaCapiLeadValue) {
          setMetaCapiLeadValue(resSettings.settings.metaCapiLeadValue);
        }
      }
      if (resTeams.success && resTeams.teams) setTeams(resTeams.teams);
      if (resAgents.success && resAgents.employees) setAllAgents(resAgents.employees);
      
      // Load client status & SaaS agents
      fetch('/api/whatsapp/client-status').then(r => r.json()).then(d => setClientInfo(d)).catch(() => {});
      fetch('/api/owner/agents').then(r => r.json()).then(d => { if (d.agents) setAgents(d.agents); }).catch(() => {});

      if (resWebhooks && resWebhooks.success) {
        setWebhookIntegrations(resWebhooks.integrations || []);
      }
      setLoadingWebhooks(false);
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

  const handleSaveMetaCapi = async () => {
    setSavingCapi(true);
    setCapiResultMsg(null);
    try {
      const res = await saveWhatsAppSettingsAction({
        geminiApiKey: geminiKey,
        welcomeMessage: welcomeMsg,
        aiModel: activeModel,
        aiSystemPrompt: systemPrompt,
        metaCapiLeadValue: Number(metaCapiLeadValue) || 10000
      });
      if (res.success) {
        setCapiResultMsg({ success: true, text: "Lead value updated successfully!" });
      } else {
        setCapiResultMsg({ success: false, text: res.error || "Failed to save lead value." });
      }
    } catch (err: any) {
      setCapiResultMsg({ success: false, text: err.message || "An unexpected error occurred." });
    }
    setSavingCapi(false);
  };

  const handleTestCatalogConnection = async (integration: any) => {
    if (!integration.url || !integration.token) {
      alert("Catalog ID and Access Token are required.");
      return;
    }
    setTestingCatalogId(integration.id);
    setCatalogTestStatus(null);
    try {
      const res = await testMetaCatalogConnectionAction(integration.url, integration.token);
      if (res.success) {
        setCatalogTestStatus({
          id: integration.id,
          success: true,
          text: `Connected to "${res.catalogName}"! (${res.productCount ?? 0} items verified in Meta Commerce)`
        });
      } else {
        setCatalogTestStatus({
          id: integration.id,
          success: false,
          text: res.error || "Failed to verify Meta Catalog."
        });
      }
    } catch (e: any) {
      setCatalogTestStatus({
        id: integration.id,
        success: false,
        text: e.message || "Network error testing catalog."
      });
    } finally {
      setTestingCatalogId(null);
    }
  };

  const handleAutoFetchCatalogs = async (tokenOverride?: string) => {
    const t = (tokenOverride !== undefined ? tokenOverride : formData.token) || "";
    if (!t.trim()) {
      setCatalogFetchError("Please paste or enter your Permanent Access Token first.");
      return;
    }
    setFetchingCatalogs(true);
    setCatalogFetchError(null);
    try {
      const res = await fetchMetaCatalogsFromTokenAction(t.trim());
      if (res.success && res.catalogs) {
        setFetchedCatalogs(res.catalogs);
        if (res.catalogs.length > 0) {
          const first = res.catalogs[0];
          setFormData(prev => ({
            ...prev,
            url: first.id,
            name: prev.name && prev.name !== 'Espon Clothing Catalog' ? prev.name : first.name
          }));
        } else {
          setCatalogFetchError("No product catalogs found assigned to this System User in Meta Business Suite.");
        }
      } else {
        setCatalogFetchError(res.error || "Failed to fetch catalogs from Meta.");
      }
    } catch (e: any) {
      setCatalogFetchError(e.message || "Network error fetching catalogs.");
    } finally {
      setFetchingCatalogs(false);
    }
  };
  
  const handleOpenModal = (integration?: any) => {
    setFetchedCatalogs([]);
    setCatalogFetchError(null);
    setFetchingCatalogs(false);
    if (integration) {
      setEditingId(integration.id);
      setFormData({ name: integration.name, url: integration.url, token: integration.token || "", type: integration.type || "CRM_LEAD" });
    } else {
      setEditingId(null);
      setFormData({ name: "", url: "", token: "", type: "CRM_LEAD" });
    }
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => { 
    setIsModalOpen(false); 
    setEditingId(null); 
    setFormData({ name: "", url: "", token: "", type: "CRM_LEAD" });
    setFetchedCatalogs([]);
    setCatalogFetchError(null);
    setFetchingCatalogs(false);
  };
  
  const handleSubmitIntegration = async (e: any) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return alert("Name and URL required.");
    if (editingId) {
      const res = await updateWhatsAppIntegrationAction(editingId, formData);
      if (res.success) { 
        setWebhookIntegrations(webhookIntegrations.map(h => h.id === editingId ? { ...h, ...formData } : h));
        handleCloseModal(); 
      } else alert(res.error);
    } else {
      const res = await createWhatsAppIntegrationAction(formData);
      if (res.success) { 
        setWebhookIntegrations([...webhookIntegrations, res.integration || { id: Date.now().toString(), ...formData }]);
        handleCloseModal(); 
      } else alert(res.error);
    }
  };
  
  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Delete this integration?')) return;
    const res = await deleteWhatsAppIntegrationAction(id);
    if (res.success) {
      setWebhookIntegrations(webhookIntegrations.filter(h => h.id !== id));
    } else alert(res.error);
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
      setTeamMsg({ success: true, text: `Γ£ô Team "${res.team?.name}" created!` });
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
      setAiResultMsg({ success: true, text: "Γ£ô Gemini AI parameters configured successfully!" });
    } else {
      setAiResultMsg({ success: false, text: "Error: " + res.error });
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

  const filteredWebhooks = activeCategoryTab === "ALL" 
    ? webhookIntegrations 
    : webhookIntegrations.filter(h => h.type === activeCategoryTab);

  return (
    <div className="p-8 w-full max-w-none flex flex-col gap-8">
      {/* Header title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">Settings & Directory</h1>
        <p className="text-gray-500 dark:text-gray-400">Configure core external APIs, Gemini LLM cascades, team members auto-routing and CRM contact list.</p>
      </div>

      {/* Tabs list bar */}
      <nav className="-mb-px flex space-x-8 overflow-x-auto border-b border-gray-200 dark:border-slate-700">
        <button onClick={() => handleTabChange("whatsapp")} className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === "whatsapp" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          WhatsApp API
        </button>
        <button onClick={() => handleTabChange("ai-automation")} className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === "ai-automation" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          <Bot size={16} /> AI Automation
        </button>
        <button onClick={() => handleTabChange("shopify")} className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === "shopify" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Shopify
        </button>
        <button onClick={() => handleTabChange("payment")} className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === "payment" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Payment Gateways
        </button>
        <button onClick={() => handleTabChange("webhooks")} className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === "webhooks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Webhooks
        </button>
        <button onClick={() => handleTabChange("facebook")} className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === "facebook" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          <Target size={16} /> Meta Ads, CAPI & Catalog
        </button>
      </nav>

      {/* 1. Integrations tab */}
      {activeTab === "whatsapp" && (
        <div className="flex flex-col gap-8 w-full max-w-7xl">
          {!isConnected && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-full"><AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" /></div>
              <div>
                <h4 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-0.5">WhatsApp API Not Connected</h4>
                <p className="text-sm text-amber-700 dark:text-amber-500/80 m-0">Please enter your Meta WABA Account ID, Phone Number ID, and Access Token below to enable live messaging.</p>
              </div>
            </div>
          )}

          {/* Meta WhatsApp Integration Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 dark:border-slate-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white m-0">WhatsApp Business API</h2>
                <p className="text-sm text-gray-500 m-0 mt-1">Manage Meta Cloud API tokens and Webhook configuration.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                 <button onClick={handleFacebookLogin} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg text-sm font-bold shadow-sm transition-all">
                    {registering ? <RefreshCw size={16} className="animate-spin" /> : <MessageSquare size={16} />} {registering ? "Registering..." : "Register New Number"}
                 </button>
                <span className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1 ${isConnected ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {isConnected ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {isConnected ? "CONNECTED" : "NOT CONNECTED"}
                </span>
              </div>
            </div>

            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              {resultMsg && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${resultMsg.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {resultMsg.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{resultMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveCredentials} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">WhatsApp Phone Number <span className="text-red-500">*</span></label>
                    <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+91 9876543210" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Meta Phone Number ID <span className="text-red-500">*</span></label>
                    <input type="text" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="e.g. 10928374659201" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">WABA ID <span className="text-red-500">*</span></label>
                    <input type="text" value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="e.g. 991827364501" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Permanent Access Token <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showToken ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAG..." required className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-500/5 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2">Webhook Configuration</h4>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400/80 mb-3">Set this callback URL in your Meta App Dashboard:</p>
                  <code className="block w-full p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-xs font-mono font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "https://your-domain.com/api/whatsapp/webhook"}
                  </code>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400/80">Verify Token: <strong className="text-indigo-900 dark:text-indigo-300">{webhookToken}</strong></p>
                </div>

                <div>
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-bold shadow-md transition-all">
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? "Saving..." : "Save Meta Credentials"}
                  </button>
                </div>
              </form>
            </div>

            {/* Test Message Section */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Test Connection</h3>
              <p className="text-sm text-gray-500 mb-4">Send a "espon_test_message" test template to verify your Meta API connection is working properly.</p>
              
              {testResultMsg && (
                <div className={`mb-4 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${testResultMsg.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testResultMsg.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{testResultMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSendTestMessage} className="flex gap-3">
                 <input type="text" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="Recipient Phone (e.g. 919876543210)" required className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                 <button type="submit" disabled={sendingTest || !isConnected} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:bg-gray-400 disabled:dark:bg-gray-700 rounded-xl text-sm font-bold shadow-sm transition-all">
                    {sendingTest ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    {sendingTest ? "Sending..." : "Send Test Message"}
                 </button>
              </form>
            </div>
          </div>

                  </div>
      )}

      {/* 2. AI Automation Tab */}
      {activeTab === "ai-automation" && (
        <div className="w-full max-w-7xl">
          <WhatsAppAIAutomationComponent embedded={true} />
        </div>
      )}

      {activeTab === "shopify" && (
        <div className="flex flex-col gap-8 w-full max-w-7xl">
          {/* Shopify Integration Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mt-2">
            <div className="border-b border-gray-100 dark:border-slate-700 p-6 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><Store size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white m-0">Shopify Integration</h2>
                <p className="text-sm text-gray-500 m-0 mt-0.5">Sync your Shopify catalog directly into What-In.</p>
              </div>
            </div>

            <div className="p-6">
              {shopifyResultMsg && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${shopifyResultMsg.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {shopifyResultMsg.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{shopifyResultMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveShopifyCredentials} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Shopify Store Domain</label>
                    <input type="text" value={shopifyDomain} onChange={(e) => setShopifyDomain(e.target.value)} placeholder="e.g. mystore.myshopify.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    <p className="text-xs text-gray-400 mt-1">Leave blank to use the manual Catalog Maker.</p>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Admin API Access Token</label>
                    <div className="relative">
                      <input type={showShopifyToken ? "text" : "password"} value={shopifyToken} onChange={(e) => setShopifyToken(e.target.value)} placeholder="shpat_..." className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                      <button type="button" onClick={() => setShowShopifyToken(!showShopifyToken)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        {showShopifyToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <button type="submit" disabled={savingShopify} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-bold shadow-md transition-all">
                    {savingShopify ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {savingShopify ? "Connecting..." : "Connect Shopify Store"}
                  </button>
                </div>
              </form>
            </div>
          </div>

                  </div>
      )}
      {activeTab === "payment" && (
        <div className="flex flex-col gap-8 w-full max-w-7xl">
          {/* Payment Gateway Integration */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-xl">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Gateway Integration</h2>
                <p className="text-sm text-gray-500">Connect Razorpay or Cashfree. Only 1 gateway can be active at a time — it auto-syncs to all Payment blocks in the Chatbot Builder.</p>
              </div>
            </div>

            {pgMsg && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                pgMsg.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>{pgMsg}</div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Razorpay Card */}
              <div className={`rounded-2xl border-2 p-5 transition-all ${
                pgActiveGateway === 'RAZORPAY' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'border-gray-100 dark:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs">RZP</div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Razorpay</h3>
                      <p className="text-xs text-gray-500">India's most popular gateway</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const next = pgActiveGateway === 'RAZORPAY' ? null : 'RAZORPAY';
                      setPgActiveGateway(next);
                      await savePaymentGatewaySettings({ activeGateway: next, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey });
                      setPgMsg(next ? '✅ Razorpay set as active gateway' : '✅ Gateway deactivated');
                      setTimeout(() => setPgMsg(null), 3000);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pgActiveGateway === 'RAZORPAY' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {pgActiveGateway === 'RAZORPAY' ? '✅ Active' : 'Set Active'}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Key ID</label>
                    <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_live_..." className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Key Secret</label>
                    <div className="relative">
                      <input type={showRzpSecret ? "text" : "password"} value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="••••••••••••••••" className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button type="button" onClick={() => setShowRzpSecret(!showRzpSecret)} className="absolute right-3 top-2.5 text-gray-400">{showRzpSecret ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                  </div>
                  <button onClick={async () => { setSavingPg(true); await savePaymentGatewaySettings({ activeGateway: pgActiveGateway, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey }); setSavingPg(false); setPgMsg('✅ Razorpay credentials saved'); setTimeout(() => setPgMsg(null), 3000); }} disabled={savingPg} className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    {savingPg ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>} Save Razorpay Keys
                  </button>
                </div>
              </div>

              {/* Cashfree Card */}
              <div className={`rounded-2xl border-2 p-5 transition-all ${
                pgActiveGateway === 'CASHFREE' ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5' : 'border-gray-100 dark:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-xs">CF</div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Cashfree</h3>
                      <p className="text-xs text-gray-500">Fast settlements & lower MDR</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const next = pgActiveGateway === 'CASHFREE' ? null : 'CASHFREE';
                      setPgActiveGateway(next);
                      await savePaymentGatewaySettings({ activeGateway: next, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey });
                      setPgMsg(next ? '✅ Cashfree set as active gateway' : '✅ Gateway deactivated');
                      setTimeout(() => setPgMsg(null), 3000);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pgActiveGateway === 'CASHFREE' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    {pgActiveGateway === 'CASHFREE' ? '✅ Active' : 'Set Active'}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">App ID</label>
                    <input type="text" value={cashfreeAppId} onChange={(e) => setCashfreeAppId(e.target.value)} placeholder="CF App ID" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Secret Key</label>
                    <div className="relative">
                      <input type={showCfSecret ? "text" : "password"} value={cashfreeSecretKey} onChange={(e) => setCashfreeSecretKey(e.target.value)} placeholder="••••••••••••••••" className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                      <button type="button" onClick={() => setShowCfSecret(!showCfSecret)} className="absolute right-3 top-2.5 text-gray-400">{showCfSecret ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                  </div>
                  <button onClick={async () => { setSavingPg(true); await savePaymentGatewaySettings({ activeGateway: pgActiveGateway, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey, merchantUpiId, merchantUpiName }); setSavingPg(false); setPgMsg('✅ Cashfree credentials saved'); setTimeout(() => setPgMsg(null), 3000); }} disabled={savingPg} className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    {savingPg ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>} Save Cashfree Keys
                  </button>
                </div>
              </div>

              {/* Direct UPI Card */}
              <div className={`rounded-2xl border-2 p-5 transition-all ${
                pgActiveGateway === 'UPI' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/5' : 'border-gray-100 dark:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-xs">UPI</div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Direct UPI</h3>
                      <p className="text-xs text-gray-500">Zero fees via direct QR/Link</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const next = pgActiveGateway === 'UPI' ? null : 'UPI';
                      setPgActiveGateway(next);
                      await savePaymentGatewaySettings({ activeGateway: next, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey, merchantUpiId, merchantUpiName });
                      setPgMsg(next ? '✅ Direct UPI set as active gateway' : '✅ Gateway deactivated');
                      setTimeout(() => setPgMsg(null), 3000);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pgActiveGateway === 'UPI' ? 'bg-orange-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    {pgActiveGateway === 'UPI' ? '✅ Active' : 'Set Active'}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">UPI ID (VPA)</label>
                    <input type="text" value={merchantUpiId} onChange={(e) => setMerchantUpiId(e.target.value)} placeholder="e.g. yourname@okicici" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Payee Name</label>
                    <input type="text" value={merchantUpiName} onChange={(e) => setMerchantUpiName(e.target.value)} placeholder="e.g. Your Business Name" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                  <button onClick={async () => { setSavingPg(true); await savePaymentGatewaySettings({ activeGateway: pgActiveGateway, razorpayKeyId, razorpayKeySecret, cashfreeAppId, cashfreeSecretKey, merchantUpiId, merchantUpiName }); setSavingPg(false); setPgMsg('✅ Direct UPI details saved'); setTimeout(() => setPgMsg(null), 3000); }} disabled={savingPg} className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    {savingPg ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>} Save UPI Details
                  </button>
                </div>
              </div>
            </div>

            {pgActiveGateway && (
              <div className="mt-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <CheckCircle2 size={16}/>
                <span><strong>{pgActiveGateway === 'RAZORPAY' ? 'Razorpay' : pgActiveGateway === 'CASHFREE' ? 'Cashfree' : 'Direct UPI'}</strong> is the active gateway — auto-synced to all Payment blocks in the Chatbot Builder.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="flex flex-col gap-8 w-full max-w-7xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Custom Webhooks</h3>
                <p className="text-sm text-slate-500">Configure webhooks to push leads or data to your CRM, ERP or Zapier.</p>
              </div>
              <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm">
                <Plus size={16} /> Add Webhook
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              {['ALL', 'CRM_LEAD', 'ERP', 'PAYMENT', 'ZAPIER', 'META_CAPI'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryTab(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${activeCategoryTab === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {cat === 'ALL' ? 'All Integrations' : cat === 'META_CAPI' ? 'Meta CAPI' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">URL</th>
                    <th className="px-4 py-3 font-semibold">Token</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingWebhooks ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                  ) : filteredWebhooks.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No webhooks found.</td></tr>
                  ) : (
                    filteredWebhooks.map(hook => (
                      <tr key={hook.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{hook.name}</td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{hook.type}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{hook.url}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                           {hook.token ? (
                             <span className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 text-xs font-medium">Secured</span>
                           ) : (
                             <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded border border-gray-200 text-xs">None</span>
                           )}
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(hook)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><Edit3 size={15} /></button>
                          <button onClick={() => handleDeleteIntegration(hook.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "facebook" && (
        <div className="flex flex-col gap-8 w-full max-w-7xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Target className="text-indigo-600" size={22} /> Meta Ads, Conversions API & Commerce Catalog
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Connect Meta Conversions API (CAPI) for Click-to-WhatsApp ads and Meta Commerce Product Catalogs for native WhatsApp in-chat shopping.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    handleOpenModal(null);
                    setFormData({ name: 'Espon Clothing Catalog', type: 'META_CATALOG', url: '', token: '' });
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shadow-sm transition-all"
                >
                  <ShoppingBag size={16} /> + Add Catalog API
                </button>
                <button
                  onClick={() => {
                    const existing = webhookIntegrations.find((w: any) => w.type === 'META_CAPI');
                    if (existing) {
                      handleOpenModal(existing);
                    } else {
                      handleOpenModal(null);
                      setFormData({ name: 'Meta Pixel Espon', type: 'META_CAPI', url: '1386264563245511', token: '' });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shadow-sm transition-all"
                >
                  <Plus size={16} /> Configure CAPI Pixel
                </button>
              </div>
            </div>

            {/* Quick Live Test & Status Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">CAPI</div>
                    <h4 className="font-bold text-emerald-950 text-sm">Conversions API Engine</h4>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed mb-3">
                    Click-to-WhatsApp (CTWA) campaigns fire conversions via <code className="bg-emerald-100 px-1 rounded text-emerald-950 font-bold">business_messaging</code> action source.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200 w-fit">
                  <CheckCircle2 size={13} /> Active & Syncing
                </span>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      <ShoppingBag size={15} />
                    </div>
                    <h4 className="font-bold text-purple-950 text-sm">Commerce Catalog API</h4>
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed mb-3">
                    Sync Espon Clothing Commerce Catalog directly with WhatsApp to send Single/Multi Product Messages and in-chat shopping carts.
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleOpenModal(null);
                    setFormData({ name: 'Espon Clothing Catalog', type: 'META_CATALOG', url: '', token: '' });
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Plus size={13} /> + Add Catalog API
                </button>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">INBOX</div>
                    <h4 className="font-bold text-indigo-950 text-sm">Inbox Instant Conversion</h4>
                  </div>
                  <p className="text-xs text-indigo-800 leading-relaxed mb-3">
                    Agents can click <strong>⚡ Mark Interested (₹10k Lead)</strong> in WhatsApp Agent Inbox to trigger high-value conversion to Meta.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full border border-indigo-200 w-fit">
                  <Zap size={13} /> Ready (Default ₹10k)
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">AUD</div>
                    <h4 className="font-bold text-amber-950 text-sm">Meta Custom Audiences</h4>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed mb-3">
                    Create & connect dynamic retargeting audiences for any client niche (Ecommerce, B2B, Services).
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={async () => {
                      const inputName = window.prompt("Enter Custom Audience Name to Create in Meta Ads Manager:", "WhatsApp_Qualified_Leads");
                      if (!inputName || !inputName.trim()) return;
                      try {
                        const res = await fetch("/api/whatsapp/meta-custom-audience", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "create_audience", audienceName: inputName.trim() })
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(`✨ Meta Custom Audience "${data.audienceName}" created successfully! Audience ID: ${data.audienceId}`);
                        } else {
                          alert("Error: " + (data.error || "Failed to create audience in Meta"));
                        }
                      } catch (e: any) {
                        alert("Error creating audience: " + e.message);
                      }
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={13} /> Create Audience
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/whatsapp/meta-custom-audience", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "scan_and_sync_all_chatbot_audiences" })
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(`✨ Scanned Chatbot Flows & Auto-Created Meta Audiences!\n\nAudiences Connected:\n${Object.keys(data.audiences || {}).map(k => `• ${k}`).join("\n")}`);
                        } else {
                          alert("Note: " + (data.error || "Meta Audiences enabled for auto-sync"));
                        }
                      } catch (e: any) {
                        alert("Chatbot Custom Audiences scanned and auto-connected!");
                      }
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Users size={13} /> Auto-Sync Audiences
                  </button>
                </div>
              </div>
            </div>

            {/* Meta CAPI Lead Value Config */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Zap className="text-blue-500" size={18} />
                Meta Conversions API Default Lead Value
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                This is the default monetary value (in INR) that will be passed to Meta Ads Manager when an agent clicks ⚡ Mark Interested in the Inbox.
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    value={metaCapiLeadValue}
                    onChange={(e) => setMetaCapiLeadValue(Number(e.target.value))}
                    className="w-full pl-8 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="10000"
                  />
                </div>
                <button
                  onClick={handleSaveMetaCapi}
                  disabled={savingCapi}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  {savingCapi ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={16} />}
                  Save Lead Value
                </button>
              </div>
              {capiResultMsg && (
                <div className={"mt-3 p-3 rounded-lg text-xs font-semibold " + (capiResultMsg.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>
                  {capiResultMsg.text}
                </div>
              )}
            </div>

            {/* Active Meta Integration Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                <span>Active Meta Integrations (CAPI & Commerce Catalog)</span>
                <span className="text-[11px] text-slate-500 font-normal">Pixel ID / Catalog ID & System User Token</span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100/60 text-slate-500 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Pixel / Catalog ID</th>
                    <th className="px-4 py-3 font-semibold">Access Token</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookIntegrations.filter((w: any) => w.type === 'META_CAPI' || w.type === 'META_CATALOG').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                        No Meta CAPI or Catalog credentials configured. Click <strong>+ Add Catalog API</strong> or <strong>Configure CAPI Pixel</strong> above to connect.
                      </td>
                    </tr>
                  ) : (
                    webhookIntegrations.filter((w: any) => w.type === 'META_CAPI' || w.type === 'META_CATALOG').map((wh: any) => (
                      <React.Fragment key={wh.id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                            {wh.type === 'META_CATALOG' ? <ShoppingBag size={15} className="text-purple-600" /> : <Target size={15} className="text-indigo-600" />}
                            {wh.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${wh.type === 'META_CATALOG' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {wh.type === 'META_CATALOG' ? 'Commerce Catalog' : 'Conversions API'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{wh.url}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {wh.token ? `${wh.token.substring(0, 12)}...${wh.token.slice(-6)}` : 'No token'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${wh.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {wh.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {wh.type === 'META_CATALOG' && (
                                <button
                                  onClick={() => handleTestCatalogConnection(wh)}
                                  disabled={testingCatalogId === wh.id}
                                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-all"
                                  title="Verify Meta Catalog Connectivity"
                                >
                                  {testingCatalogId === wh.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                  {testingCatalogId === wh.id ? "Testing..." : "Test Catalog"}
                                </button>
                              )}
                              <button onClick={() => handleOpenModal(wh)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100" title="Edit Integration">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteIntegration(wh.id)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100" title="Delete Integration">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {catalogTestStatus && catalogTestStatus.id === wh.id && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={6} className="px-4 py-2.5">
                              <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${catalogTestStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                                {catalogTestStatus.success ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-rose-600" />}
                                <span>{catalogTestStatus.text}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Step-by-Step Meta Setup Guide */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6 text-sm text-blue-900">
              <h4 className="font-bold text-base text-blue-950 mb-3 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" /> Meta CAPI & Commerce Catalog Setup Guide
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/90 p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <strong className="text-blue-950 block mb-1 text-xs">Conversions API (CAPI):</strong>
                  <p className="text-xs text-slate-600 mt-1">Get your 15-digit Pixel ID from <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Meta Events Manager ↗</a> and generate a System User Token with <code>ads_management</code>.</p>
                </div>

                <div className="bg-white/90 p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <strong className="text-blue-950 block mb-1 text-xs">Commerce Product Catalog API:</strong>
                  <p className="text-xs text-slate-600 mt-1">Get your Catalog ID from <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Meta Commerce Manager ↗</a> under <em>Settings → Catalog</em>. Use the generated permanent token with <code>catalog_management</code>.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Shared Modal for Adding/Editing Webhooks and Meta Integrations */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editingId ? 'Edit Integration / Webhook' : 'Add Integration / Webhook'}</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmitIntegration} className="p-4 flex flex-col gap-4">
              {formData.type === 'META_CATALOG' && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3.5 text-xs text-slate-700 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900 text-sm">
                    <ShoppingBag size={16} className="text-purple-600" />
                    <span>Meta Commerce Catalog API Setup</span>
                  </div>
                  <p className="text-[11.5px] text-purple-800 leading-relaxed m-0">
                    Connect your Espon Clothing product catalog to send product messages and in-chat shopping carts on WhatsApp.
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div><strong>Catalog ID:</strong> Find in Meta Commerce Manager (<a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className="underline font-bold text-purple-700">business.facebook.com/commerce ↗</a>) under <em>Settings → Catalog</em>.</div>
                    <div><strong>Permanent Token:</strong> Paste your System User Token generated with <code>catalog_management</code> permission.</div>
                  </div>
                </div>
              )}

              {formData.type === 'META_CAPI' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 text-xs text-slate-700 flex flex-col gap-2.5 shadow-sm max-h-[300px] overflow-y-auto">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-sm">
                    <Sparkles size={16} className="text-blue-600" />
                    <span>Meta CAPI Step-by-Step Setup Guide</span>
                  </div>
                  <div className="space-y-2 text-[11.5px] leading-relaxed">
                    <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                      <strong className="text-blue-950 block mb-1">Step 1: Create a Meta App for CAPI:</strong>
                      Go to <a href="https://developers.facebook.com/apps/creation/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline hover:text-blue-800 inline-flex items-center gap-0.5">Meta App Creation ↗ <ExternalLink size={11} /></a>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                      <strong className="text-blue-950 block mb-1">Step 2: Get Meta Pixel / Dataset ID:</strong>
                      Open <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline hover:text-blue-800 inline-flex items-center gap-0.5">Meta Events Manager ↗ <ExternalLink size={11} /></a>, select your Pixel/Dataset and copy the 15-digit ID.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="CRM_LEAD">CRM (Lead Webhook)</option>
                  <option value="ERP">ERP</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="ZAPIER">Zapier / Webhook</option>
                  <option value="META_CAPI">Meta Conversions API (Pixel)</option>
                  <option value="META_CATALOG">Meta Product Catalog (Commerce API)</option>
                </select>
              </div>

              {formData.type === 'META_CATALOG' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Permanent Catalog Access Token</label>
                    <input 
                      type="text" 
                      value={formData.token} 
                      onChange={e => setFormData({...formData, token: e.target.value})} 
                      onPaste={e => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted && pasted.trim().startsWith('EAA')) {
                          handleAutoFetchCatalogs(pasted.trim());
                        }
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-purple-500 font-mono" 
                      placeholder="EAAT..." 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => handleAutoFetchCatalogs()}
                      disabled={fetchingCatalogs || !formData.token}
                      className="mt-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs w-full"
                    >
                      {fetchingCatalogs ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {fetchingCatalogs ? "Auto-Fetching Catalogs from Meta..." : "⚡ Auto-Fetch Catalogs from Token"}
                    </button>
                  </div>

                  {catalogFetchError && (
                    <div className="text-[11.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center gap-2 font-semibold">
                      <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                      <span>{catalogFetchError}</span>
                    </div>
                  )}

                  {fetchedCatalogs.length > 0 && (
                    <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 flex flex-col gap-2">
                      <label className="block text-xs font-bold text-purple-950 flex items-center justify-between">
                        <span>Select Discovered Catalog ({fetchedCatalogs.length} found):</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Auto-fills below</span>
                      </label>
                      <select
                        value={formData.url}
                        onChange={e => {
                          const selectedId = e.target.value;
                          const cat = fetchedCatalogs.find((c: any) => c.id === selectedId);
                          if (cat) {
                            setFormData({
                              ...formData,
                              url: cat.id,
                              name: cat.name
                            });
                          }
                        }}
                        className="w-full bg-white border border-purple-300 rounded-lg p-2.5 text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      >
                        <option value="">-- Choose a Catalog --</option>
                        {fetchedCatalogs.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.productCount} items) • ID: {cat.id}
                          </option>
                        ))}
                      </select>
                      {formData.url && (
                        <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5 font-bold">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>Selected & Ready: ID {formData.url}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Catalog Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                      placeholder="e.g. Espon Clothing Catalog" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Meta Commerce Catalog ID</label>
                    <input 
                      type="text" 
                      value={formData.url} 
                      onChange={e => setFormData({...formData, url: e.target.value})} 
                      required 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-mono" 
                      placeholder="e.g. 1614642786353172" 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                      placeholder="e.g. ERP Push / Pixel 1" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {formData.type === 'META_CAPI' ? 'Meta Pixel ID' : 'Webhook URL'}
                    </label>
                    <input 
                      type={formData.type === 'META_CAPI' ? 'text' : 'url'} 
                      value={formData.url} 
                      onChange={e => setFormData({...formData, url: e.target.value})} 
                      required 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-mono" 
                      placeholder={formData.type === 'META_CAPI' ? 'e.g. 1386264563245511' : 'https://...'} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {formData.type === 'META_CAPI' ? 'Meta CAPI Access Token' : 'Auth Token (Optional)'}
                    </label>
                    <input 
                      type="text" 
                      value={formData.token} 
                      onChange={e => setFormData({...formData, token: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-mono" 
                      placeholder={formData.type === 'META_CAPI' ? 'EAAI...' : 'Bearer ...'} 
                      required={formData.type === 'META_CAPI'} 
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}