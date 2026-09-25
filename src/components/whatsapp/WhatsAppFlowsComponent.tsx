"use client";

import React, { useState, useEffect } from "react";
import {
  GitBranch, Plus, Search, RefreshCw, CheckCircle2, Clock, AlertCircle,
  X, Send, Trash2, Eye, Info, HelpCircle, MessageSquare, Edit, Link, ImagePlus
} from "lucide-react";
import { 
  getWhatsAppMetaFlows, 
  saveWhatsAppMetaFlowAction, 
  deleteWhatsAppMetaFlowAction, 
  sendWhatsAppFlowMessageAction,
  getWhatsAppCannedResponsesAction,
  createWhatsAppCannedResponseAction,
  updateWhatsAppCannedResponseAction,
  deleteWhatsAppCannedResponseAction,
  uploadMediaToMetaAction
} from "@/app/actions/whatsAppPlatformActions";

const PREBUILT_TEMPLATES = [
  {
    name: "Jersey Size Finder",
    flowId: "jersey_size_finder_flow",
    description: "Get the perfect jersey fit by answering 3 simple questions.",
    screenName: "SIZE_SCREEN",
    ctaText: "Find Your Size",
    formSchema: JSON.stringify([
      { label: "What is your chest size (in inches)?", type: "select", options: ["36 - Small", "38 - Medium", "40 - Large", "42 - XL", "44 - XXL"] },
      { label: "What is your height (in cm)?", type: "number", placeholder: "e.g. 175" },
      { label: "Preferred Fit Style", type: "radio", options: ["Slim Fit", "Regular Fit", "Loose / Baggy Fit"] }
    ])
  },
  {
    name: "Customer Feedback Survey",
    flowId: "customer_feedback_survey_flow",
    description: "Tell us about your shopping experience with Espon Sports.",
    screenName: "FEEDBACK_SCREEN",
    ctaText: "Share Feedback",
    formSchema: JSON.stringify([
      { label: "Overall Satisfaction Rating", type: "radio", options: ["⭐⭐⭐⭐⭐ Excellent", "⭐⭐⭐⭐ Good", "⭐⭐⭐ Average", "⭐⭐ Fair / Poor"] },
      { label: "Would you recommend Espon to others?", type: "radio", options: ["Definitely Yes", "Maybe", "No"] },
      { label: "What can we improve?", type: "textarea", placeholder: "Any comments or suggestions..." }
    ])
  },
  {
    name: "Custom Booking / Appointment",
    flowId: "custom_booking_flow",
    description: "Book an appointment for a personalized sizing & apparel consultation.",
    screenName: "BOOKING_SCREEN",
    ctaText: "Book Appointment",
    formSchema: JSON.stringify([
      { label: "Preferred Date", type: "date" },
      { label: "Select Service Type", type: "select", options: ["Wholesale Catalog Review", "Bulk Sports Uniform Order", "Sizing Trial Consultation"] },
      { label: "Preferred Time Slot", type: "radio", options: ["Morning (10 AM - 1 PM)", "Afternoon (1 PM - 5 PM)", "Evening (5 PM - 8 PM)"] }
    ])
  }
];

export default function WhatsAppFlowsComponent() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [flowId, setFlowId] = useState("");
  const [description, setDescription] = useState("");
  const [screenName, setScreenName] = useState("SCREEN_NAME");
  const [ctaText, setCtaText] = useState("Open Form");
  const [formFields, setFormFields] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Test state
  const [testPhone, setTestPhone] = useState("");
  const [testingFlow, setTestingFlow] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"flows" | "replies">("flows");
  
  // Canned Responses State
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [loadingCanned, setLoadingCanned] = useState(true);
  const [newReplyTitle, setNewReplyTitle] = useState("");
  const [newReplyShortcut, setNewReplyShortcut] = useState("");
  const [newReplyContent, setNewReplyContent] = useState("");
  const [newReplyHeader, setNewReplyHeader] = useState("");
  const [newReplyFooter, setNewReplyFooter] = useState("");
  const [newReplyMediaUrl, setNewReplyMediaUrl] = useState("");
  const [newReplyButtons, setNewReplyButtons] = useState<any[]>([]);
  const [editingReply, setEditingReply] = useState<any>(null);
  const [savingCanned, setSavingCanned] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchFlows = async () => {
    setLoading(true);
    const res = await getWhatsAppMetaFlows();
    if (res.success) setFlows(res.flows || []);
    setLoading(false);
  };

  const fetchCanned = async () => {
    setLoadingCanned(true);
    const res = await getWhatsAppCannedResponsesAction();
    if (res.success && res.responses) setCannedResponses(res.responses);
    setLoadingCanned(false);
  };

  useEffect(() => {
    fetchFlows();
    fetchCanned();
  }, []);

  const handleCreateOrUpdateCannedResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyTitle.trim() || !newReplyShortcut.trim() || !newReplyContent.trim()) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    setSavingCanned(true);
    const payload = {
      title: newReplyTitle,
      shortcut: newReplyShortcut,
      content: newReplyContent,
      headerText: newReplyHeader,
      footerText: newReplyFooter,
      mediaUrl: newReplyMediaUrl,
      buttons: newReplyButtons
    };

    let res;
    if (editingReply) {
      res = await updateWhatsAppCannedResponseAction(editingReply.id, payload);
    } else {
      res = await createWhatsAppCannedResponseAction(payload);
    }

    if (res.success) {
      showToast(editingReply ? "Canned reply updated!" : "Canned reply created!");
      handleCancelEdit();
      await fetchCanned();
    } else {
      showToast(res.error || "Failed to save canned reply.", "error");
    }
    setSavingCanned(false);
  };

  const handleDeleteCannedResponse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this canned response?")) return;
    const res = await deleteWhatsAppCannedResponseAction(id);
    if (res.success) {
      showToast("Canned reply deleted.");
      await fetchCanned();
    } else {
      showToast(res.error || "Failed to delete.", "error");
    }
  };

  const handleEditClick = (reply: any) => {
    setEditingReply(reply);
    setNewReplyTitle(reply.title);
    setNewReplyShortcut(reply.shortcut || "");
    setNewReplyContent(reply.content);
    setNewReplyHeader(reply.headerText || "");
    setNewReplyFooter(reply.footerText || "");
    setNewReplyMediaUrl(reply.mediaUrl || "");
    try {
      setNewReplyButtons(reply.buttons ? (typeof reply.buttons === 'string' ? JSON.parse(reply.buttons) : reply.buttons) : []);
    } catch(e) {
      setNewReplyButtons([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingReply(null);
    setNewReplyTitle("");
    setNewReplyShortcut("");
    setNewReplyContent("");
    setNewReplyHeader("");
    setNewReplyFooter("");
    setNewReplyMediaUrl("");
    setNewReplyButtons([]);
  };

  const addReplyButton = () => {
    if (newReplyButtons.length >= 3) return;
    setNewReplyButtons([...newReplyButtons, { type: "reply", text: "New Button" }]);
  };

  const updateReplyButton = (index: number, field: string, value: string) => {
    const arr = [...newReplyButtons];
    arr[index] = { ...arr[index], [field]: value };
    setNewReplyButtons(arr);
  };

  const removeReplyButton = (index: number) => {
    const arr = [...newReplyButtons];
    arr.splice(index, 1);
    setNewReplyButtons(arr);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await uploadMediaToMetaAction(formData);
      if (res.success) {
        setNewReplyMediaUrl(res.mediaId);
        showToast("Image uploaded successfully!");
      } else {
        showToast(res.error || "Failed to upload image", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) handleImageUpload(file);
        e.preventDefault();
        break;
      }
    }
  };

  const selectPrebuiltTemplate = (tpl: typeof PREBUILT_TEMPLATES[0]) => {
    setName(tpl.name);
    setFlowId(tpl.flowId);
    setDescription(tpl.description);
    setScreenName(tpl.screenName);
    setCtaText(tpl.ctaText);
    setFormFields(JSON.parse(tpl.formSchema));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !flowId || !ctaText) {
      showToast("Flow name, ID, and Button CTA text are required.", "error");
      return;
    }

    setSaving(true);
    const res = await saveWhatsAppMetaFlowAction({
      name,
      flowId,
      description,
      screenName,
      ctaText,
      formSchema: JSON.stringify(formFields)
    });
    setSaving(false);

    if (res.success) {
      showToast("Meta Flow registered successfully!", "success");
      setShowCreateModal(false);
      fetchFlows();
      resetForm();
    } else {
      showToast(res.error || "Failed to register Flow.", "error");
    }
  };

  const handleDelete = async (id: string, flowName: string) => {
    if (!confirm(`Are you sure you want to delete Flow "${flowName}"?`)) return;
    setDeleting(id);
    const res = await deleteWhatsAppMetaFlowAction(id);
    setDeleting(null);
    if (res.success) {
      showToast("Flow deleted.");
      fetchFlows();
    } else {
      showToast(res.error || "Delete failed.", "error");
    }
  };

  const handleTestSend = async (flowIdVal: string) => {
    if (!testPhone) {
      showToast("Enter a test phone number first (including country code, e.g., 91XXXXXXXXXX).", "error");
      return;
    }
    setTestingFlow(flowIdVal);
    const res = await sendWhatsAppFlowMessageAction(testPhone, flowIdVal);
    setTestingFlow(null);
    if (res.success) {
      showToast("Test Flow sent successfully!");
    } else {
      showToast(res.error || "Failed to send Flow message.", "error");
    }
  };

  const resetForm = () => {
    setName("");
    setFlowId("");
    setDescription("");
    setScreenName("SCREEN_NAME");
    setCtaText("Open Form");
    setFormFields([]);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          padding: "12px 18px", borderRadius: "10px",
          background: toastMsg.type === "error" ? "#ef4444" : "#10b981",
          color: "white", fontWeight: 700, fontSize: "13px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: "8px"
        }}>
          {toastMsg.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toastMsg.text}
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch size={22} className="text-indigo-600" />
            Meta Interactive Flows & Quick Replies
          </h2>
          <p className="text-gray-500 text-sm">Manage interactive WhatsApp native forms, surveys, questionnaires, and agent quick responses.</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("flows")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "flows"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <GitBranch size={15} />
          <span>Interactive Meta Flows ({flows.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("replies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "replies"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <MessageSquare size={15} />
          <span>Quick Replies / Canned ({cannedResponses.length})</span>
        </button>
      </div>

      {activeTab === "flows" && (
        <>
          <div className="flex flex-wrap justify-end gap-2.5 items-center">
            <input
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="Test Phone (91XXXXXXXXXX)"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs w-48 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={fetchFlows}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Flow</span>
            </button>
          </div>

          {/* List of Flows */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-indigo-500" />
              <span className="text-sm font-medium">Loading Flows...</span>
            </div>
          ) : flows.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <GitBranch size={44} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 mb-1">No Flows registered yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">Add your Meta Flow configuration to enable in-chat custom surveys, bookings, and size finders.</p>
              <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">+ Register Flow</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map(f => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{f.name}</h3>
                      <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mt-1 inline-block">ID: {f.flowId}</code>
                    </div>
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      disabled={deleting === f.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      {deleting === f.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 min-h-[32px]">
                    {f.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>CTA: <strong className="text-slate-700 dark:text-slate-200">{f.ctaText}</strong></span>
                    <span>•</span>
                    <span>Screen: <strong className="text-slate-700 dark:text-slate-200">{f.screenName}</strong></span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <button
                      onClick={() => handleTestSend(f.flowId)}
                      disabled={testingFlow === f.flowId}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {testingFlow === f.flowId ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>Send Test Message</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "replies" && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Create / Edit Form */}
          <form
            onSubmit={handleCreateOrUpdateCannedResponse}
            className="w-full lg:w-[350px] shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4 sticky top-6 text-slate-900 dark:text-white"
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {editingReply ? "📝 Edit Canned Response" : "+ Create New Canned Response"}
            </h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">TITLE *</label>
              <input
                type="text"
                placeholder="e.g. Greeting"
                value={newReplyTitle}
                onChange={(e) => setNewReplyTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">SHORTCUT CODE *</label>
              <input
                type="text"
                placeholder="e.g. /hi"
                value={newReplyShortcut}
                onChange={(e) => setNewReplyShortcut(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>

            {/* Rich Fields */}
            <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rich Media & Interactive (Optional)</div>
              
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Image URL or Paste Image here..."
                    value={uploadingImage ? "Uploading..." : newReplyMediaUrl}
                    onChange={(e) => setNewReplyMediaUrl(e.target.value)}
                    onPaste={handlePasteImage}
                    disabled={uploadingImage}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <label className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <ImagePlus size={16} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Header Text (max 60 chars)"
                  value={newReplyHeader}
                  onChange={(e) => setNewReplyHeader(e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">REPLY BODY CONTENT *</label>
                <textarea
                  rows={4}
                  placeholder="Type the message body..."
                  value={newReplyContent}
                  onChange={(e) => setNewReplyContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs resize-y outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Footer Text (max 60 chars)"
                  value={newReplyFooter}
                  onChange={(e) => setNewReplyFooter(e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Buttons Builder */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">INTERACTIVE BUTTONS ({newReplyButtons.length}/3)</label>
                  {newReplyButtons.length < 3 && (
                    <button type="button" onClick={addReplyButton} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs font-bold cursor-pointer flex items-center gap-1">
                      <Plus size={12} /> Add Button
                    </button>
                  )}
                </div>
                
                {newReplyButtons.map((btn, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-2 relative">
                    <button type="button" onClick={() => removeReplyButton(i)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 cursor-pointer"><X size={14} /></button>
                    
                    <div className="flex gap-2 mb-2 pr-6">
                      <select 
                        value={btn.type} 
                        onChange={(e) => updateReplyButton(i, "type", e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                      >
                        <option value="reply">Quick Reply</option>
                        <option value="url">URL Link</option>
                      </select>
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          placeholder="Button Text" 
                          value={btn.text} 
                          onChange={(e) => updateReplyButton(i, "text", e.target.value)}
                          maxLength={20}
                          className="w-full px-2.5 py-1.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                        />
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${btn.text?.length >= 20 ? 'text-red-500' : 'text-slate-400'}`}>
                          {(btn.text?.length || 0)}/20
                        </span>
                      </div>
                    </div>
                    {btn.type === "url" && (
                      <input 
                        type="text" 
                        placeholder="https://example.com" 
                        value={btn.url || ""} 
                        onChange={(e) => updateReplyButton(i, "url", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              {editingReply && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={savingCanned}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {savingCanned ? "Saving..." : editingReply ? "Save Changes" : "Create Reply"}
              </button>
            </div>
          </form>

          {/* Live Preview Side Panel */}
          <div className="w-full lg:w-[300px] shrink-0 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sticky top-6 backdrop-blur-sm flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 py-1.5 rounded-lg uppercase tracking-wider">
              Live Preview
            </h4>
            <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-sm p-3.5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col gap-2 max-w-[95%]">
              {newReplyMediaUrl && (
                <img src={newReplyMediaUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" onError={(e) => e.currentTarget.style.display = 'none'} />
              )}
              {newReplyHeader && <strong className="text-xs font-bold text-slate-800 dark:text-emerald-400">{newReplyHeader}</strong>}
              <div className="text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                {newReplyContent || "Type a message body..."}
              </div>
              {newReplyFooter && <span className="text-[10px] text-slate-400 dark:text-slate-400">{newReplyFooter}</span>}
            </div>
            {newReplyButtons.length > 0 && (
              <div className="flex flex-col gap-1.5 max-w-[95%]">
                {newReplyButtons.map((btn, i) => (
                  <div key={i} className="bg-white dark:bg-[#202c33] hover:bg-slate-50 dark:hover:bg-[#2a3942] border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-semibold text-xs py-2 px-3 rounded-lg text-center shadow-xs flex items-center justify-center gap-1.5">
                    {btn.type === "url" ? <><Link size={14} />{btn.text || "URL Link"}</> : btn.text || "Quick Reply"}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 w-full">
            {loadingCanned ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
            ) : cannedResponses.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <MessageSquare size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600 opacity-40" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">No Quick Replies</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create your first canned response using the form on the left.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cannedResponses.map((cr) => (
                  <div
                    key={cr.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{cr.title}</strong>
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md text-xs font-mono font-semibold self-start">
                          {cr.shortcut}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(cr)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCannedResponse(cr.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {cr.mediaUrl && (
                      <img src={cr.mediaUrl} alt="Media" referrerPolicy="no-referrer" className="w-full h-28 object-cover rounded-lg" />
                    )}
                    
                    <div className="flex flex-col gap-1.5">
                      {cr.headerText && <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">{cr.headerText}</strong>}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap m-0">
                        {cr.content}
                      </p>
                      {cr.footerText && <span className="text-[11px] text-slate-400 dark:text-slate-500">{cr.footerText}</span>}
                    </div>

                    {cr.buttons && (() => {
                      const btns = typeof cr.buttons === 'string' ? JSON.parse(cr.buttons) : cr.buttons;
                      if (!btns || btns.length === 0) return null;
                      return (
                        <div className="flex flex-col gap-1 mt-1">
                          {btns.map((btn: any, i: number) => (
                            <div key={i} className="py-1.5 px-3 rounded-lg text-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              {btn.type === "url" ? `🔗 ${btn.text}` : btn.text}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Flow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚡</span> Create Interactive WhatsApp Flow
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Register a Meta Flow ID or configure one using a pre-built template.</p>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Left Column: Form config */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                
                {/* Prebuilt Quick selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Quick Start Templates</label>
                  <div className="flex gap-2 flex-wrap">
                    {PREBUILT_TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => selectPrebuiltTemplate(t)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">FLOW NAME *</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="e.g. Size Calculator"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">META FLOW ID *</label>
                      <input
                        value={flowId}
                        onChange={e => setFlowId(e.target.value)}
                        required
                        placeholder="e.g. 9876543210123"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">BODY DESCRIPTION TEXT (Sent in WhatsApp message)</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Please answer these quick fit questions so we can get your custom sizing perfect."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">STARTING SCREEN NAME *</label>
                      <input
                        value={screenName}
                        onChange={e => setScreenName(e.target.value)}
                        required
                        placeholder="e.g. SIZE_SCREEN"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CTA BUTTON TEXT *</label>
                      <input
                        value={ctaText}
                        onChange={e => setCtaText(e.target.value)}
                        required
                        placeholder="e.g. Open Size Finder"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Visual Fields Builder */}
                  <div className="border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Form Questionnaire Fields</label>
                    
                    {/* Render current fields */}
                    {formFields.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">No fields added yet. Add custom fields below or choose a template above.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 mb-3">
                        {formFields.map((f, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{f.label}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">Type: {f.type} {f.options ? `(${f.options.join(", ")})` : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new field form row */}
                    <div className="flex flex-col gap-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">ADD NEW QUESTION FIELD</span>
                      <input
                        type="text"
                        placeholder="e.g. Enter your jersey size"
                        id="new-field-label"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          id="new-field-type"
                          defaultValue="text"
                          onChange={e => {
                            const optEl = document.getElementById("new-field-options-row");
                            if (optEl) {
                              optEl.style.display = (e.target.value === 'select' || e.target.value === 'radio') ? 'block' : 'none';
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                        >
                          <option value="text">Text Input</option>
                          <option value="number">Number Input</option>
                          <option value="select">Dropdown Select</option>
                          <option value="radio">Radio Options</option>
                          <option value="date">Date Selector</option>
                          <option value="textarea">Multi-line Text</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const labelEl = document.getElementById("new-field-label") as HTMLInputElement;
                            const typeEl = document.getElementById("new-field-type") as HTMLSelectElement;
                            const optionsEl = document.getElementById("new-field-options") as HTMLInputElement;
                            
                            if (labelEl && labelEl.value.trim()) {
                              const newField: any = {
                                label: labelEl.value.trim(),
                                type: typeEl.value
                              };
                              if ((typeEl.value === 'select' || typeEl.value === 'radio') && optionsEl && optionsEl.value.trim()) {
                                newField.options = optionsEl.value.split(",").map(s => s.trim()).filter(Boolean);
                              }
                              setFormFields([...formFields, newField]);
                              labelEl.value = "";
                              if (optionsEl) optionsEl.value = "";
                            } else {
                              alert("Please enter a field label first.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Add Field
                        </button>
                      </div>
                      <div id="new-field-options-row" style={{ display: "none" }}>
                        <label className="block text-[10.5px] text-slate-500 dark:text-slate-400 mb-1">OPTIONS (separated by commas)</label>
                        <input
                          type="text"
                          id="new-field-options"
                          placeholder="e.g. Small, Medium, Large"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer mt-2"
                  >
                    {saving ? "Registering..." : "⚡ Register Meta Flow Configuration"}
                  </button>
                </form>
              </div>

              {/* Right Column: Visual Mockup Render */}
              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-950/40 overflow-y-auto flex flex-col gap-3 shrink-0">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Flow Preview inside Chat</div>
                
                {/* Chat Bubble Message */}
                <div className="bg-[#e5ddd5] dark:bg-slate-900 rounded-2xl rounded-tl-sm p-3 border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 shadow-sm">
                  <div className="bg-white dark:bg-[#1f2c34] rounded-xl p-3 shadow-xs">
                    <div className="font-bold text-xs text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1 mb-1">{name || "Flow Header"}</div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{description || "Please tap the button to open the form."}</div>
                    <div className="text-[10px] text-slate-400 mt-1 text-right">Powered by What-In</div>
                  </div>
                  {/* CTA button mock */}
                  <div className="bg-white dark:bg-[#202c33] hover:bg-slate-50 dark:hover:bg-[#2a3942] rounded-xl py-2 px-3 text-center text-xs font-bold text-[#00a5f4] dark:text-[#53bdeb] shadow-xs cursor-pointer">
                    {ctaText || "Open Form"}
                  </div>
                </div>

                {/* Form fields mockup render */}
                {formFields.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Form Fields Mockup</div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                      {formFields.map((f, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{f.label}</label>
                          {f.type === "textarea" ? (
                            <textarea readOnly placeholder={f.placeholder} className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none resize-none" rows={2} />
                          ) : f.type === "select" ? (
                            <select disabled className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none">
                              <option>{f.options?.[0] || "Select option..."}</option>
                            </select>
                          ) : f.type === "radio" ? (
                            <div className="flex flex-col gap-1">
                              {f.options?.slice(0, 2).map((opt: string) => (
                                <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                  <input type="radio" disabled checked={opt === f.options[0]} /> {opt}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input readOnly type={f.type} placeholder={f.placeholder} className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
