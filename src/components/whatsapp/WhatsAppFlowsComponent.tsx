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
      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("flows")}
          style={{
            background: activeTab === "flows" ? "#eff6ff" : "transparent",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 700,
            color: activeTab === "flows" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <GitBranch size={16} /> Interactive Meta Flows ({flows.length})
        </button>
        <button
          onClick={() => setActiveTab("replies")}
          style={{
            background: activeTab === "replies" ? "#eff6ff" : "transparent",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 700,
            color: activeTab === "replies" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <MessageSquare size={16} /> Quick Replies / Canned ({cannedResponses.length})
        </button>
      </div>

      {activeTab === "flows" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", alignItems: "center" }}>
            <input
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="Test Phone (91XXXXXXXXXX)"
              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", width: "200px", outline: "none" }}
            />
            <button onClick={fetchFlows} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => { resetForm(); setShowCreateModal(true); }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#4f46e5", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.2)" }}>
              <Plus size={16} /> Create Flow
            </button>
          </div>

          {/* List of Flows */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
              <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} /><br />
              Loading Flows...
            </div>
          ) : flows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#9ca3af" }}>
              <GitBranch size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
              <h3 style={{ fontWeight: 700, marginBottom: "8px", color: "#374151" }}>No Flows registered yet</h3>
              <p style={{ fontSize: "14px", maxWidth: "420px", margin: "0 auto 16px" }}>Add your Meta Flow configuration to enable in-chat custom surveys, bookings, and size finders.</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">+ Register Flow</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
              {flows.map(f => (
                <div key={f.id} style={{
                  background: "white", border: "1px solid #e5e7eb", borderRadius: "16px",
                  padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex", flexDirection: "column", gap: "12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontWeight: 800, fontSize: "15px", color: "#111827", margin: 0 }}>{f.name}</h3>
                      <code style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", marginTop: "4px", display: "inline-block" }}>ID: {f.flowId}</code>
                    </div>
                    <button onClick={() => handleDelete(f.id, f.name)} disabled={deleting === f.id} style={{ background: "rgba(239,68,68,0.08)", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer", color: "#ef4444" }}>
                      {deleting === f.id ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                    </button>
                  </div>

                  <p style={{ fontSize: "12.5px", color: "#4b5563", margin: 0, minHeight: "36px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {f.description || "No description provided."}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280" }}>
                    <span>CTA: <strong>{f.ctaText}</strong></span>
                    <span>•</span>
                    <span>Screen: <strong>{f.screenName}</strong></span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      onClick={() => handleTestSend(f.flowId)}
                      disabled={testingFlow === f.flowId}
                      style={{
                        flex: 1, padding: "8px 12px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        color: "white", border: "none", borderRadius: "8px", fontSize: "12px",
                        fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                      }}
                    >
                      {testingFlow === f.flowId ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
                      Send Test Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "replies" && (
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
          
          {/* Create / Edit Form */}
          <form onSubmit={handleCreateOrUpdateCannedResponse} style={{ flex: "0 0 350px", background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "sticky", top: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0" }}>
              {editingReply ? "📝 Edit Canned Response" : "＋ Create New Canned Response"}
            </h4>
            
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>TITLE *</label>
              <input
                type="text"
                placeholder="e.g. Greeting"
                value={newReplyTitle}
                onChange={(e) => setNewReplyTitle(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", outline: "none" }}
                required
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>SHORTCUT CODE *</label>
              <input
                type="text"
                placeholder="e.g. /hi"
                value={newReplyShortcut}
                onChange={(e) => setNewReplyShortcut(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", outline: "none" }}
                required
              />
            </div>

            {/* Rich Fields */}
            <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Rich Media & Interactive (Optional)</div>
              
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <input
                    type="text"
                    placeholder="Image URL or Paste Image here..."
                    value={uploadingImage ? "Uploading..." : newReplyMediaUrl}
                    onChange={(e) => setNewReplyMediaUrl(e.target.value)}
                    onPaste={handlePasteImage}
                    disabled={uploadingImage}
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", color: "#475569" }}>
                    <ImagePlus size={16} />
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} />
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
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", marginBottom: "8px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>REPLY BODY CONTENT *</label>
                <textarea
                  rows={4}
                  placeholder="Type the message body..."
                  value={newReplyContent}
                  onChange={(e) => setNewReplyContent(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", resize: "vertical", outline: "none" }}
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
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", marginBottom: "8px" }}
                />
              </div>

              {/* Buttons Builder */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>INTERACTIVE BUTTONS ({newReplyButtons.length}/3)</label>
                  {newReplyButtons.length < 3 && (
                    <button type="button" onClick={addReplyButton} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Plus size={12} /> Add Button
                    </button>
                  )}
                </div>
                
                {newReplyButtons.map((btn, i) => (
                  <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", marginBottom: "8px", position: "relative" }}>
                    <button type="button" onClick={() => removeReplyButton(i)} style={{ position: "absolute", top: "6px", right: "6px", background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><X size={14} /></button>
                    
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px", position: "relative" }}>
                      <select 
                        value={btn.type} 
                        onChange={(e) => updateReplyButton(i, "type", e.target.value)}
                        style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                      >
                        <option value="reply">Quick Reply</option>
                        <option value="url">URL Link</option>
                      </select>
                      <div style={{ flex: 1, position: "relative" }}>
                        <input 
                          type="text" 
                          placeholder="Button Text" 
                          value={btn.text} 
                          onChange={(e) => updateReplyButton(i, "text", e.target.value)}
                          maxLength={20}
                          style={{ width: "100%", padding: "6px", paddingRight: "40px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                        />
                        <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: (btn.text?.length || 0) >= 20 ? "#ef4444" : "#94a3b8" }}>
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
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              {editingReply && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13.5px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={savingCanned}
                style={{ flex: 2, background: "#4f46e5", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13.5px", fontWeight: 700, color: "#ffffff", cursor: "pointer", boxShadow: "0 4px 12px rgba(79,70,229,0.2)" }}
              >
                {savingCanned ? "Saving..." : editingReply ? "Save Changes" : "Create Reply"}
              </button>
            </div>
          </form>

          {/* Live Preview Side Panel */}
          <div style={{ flex: "0 0 300px", backgroundColor: "#e5ddd5", padding: "16px", borderRadius: "16px", position: "sticky", top: "20px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "10px", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 8px", textAlign: "center", background: "rgba(255,255,255,0.9)", padding: "6px", borderRadius: "8px" }}>
              Live Preview
            </h4>
            <div style={{ background: "white", borderRadius: "0 8px 8px 8px", padding: "8px", maxWidth: "90%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "6px" }}>
              {newReplyMediaUrl && (
                <img src={newReplyMediaUrl} alt="Preview" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "6px" }} onError={(e) => e.currentTarget.style.display = 'none'} />
              )}
              {newReplyHeader && <strong style={{ fontSize: "12px", color: "#334155" }}>{newReplyHeader}</strong>}
              <div style={{ fontSize: "13.5px", color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                {newReplyContent || "Type a message body..."}
              </div>
              {newReplyFooter && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{newReplyFooter}</span>}
            </div>
            {newReplyButtons.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "90%" }}>
                {newReplyButtons.map((btn, i) => (
                  <div key={i} style={{ background: "white", padding: "8px", borderRadius: "8px", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#00a884", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", cursor: "default", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                    {btn.type === "url" ? <><Link size={14} />{btn.text || "URL Link"}</> : btn.text || "Quick Reply"}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1 }}>
            {loadingCanned ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Loading...</div>
            ) : cannedResponses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <MessageSquare size={40} style={{ marginBottom: "16px", opacity: 0.3 }} />
                <h3 style={{ fontWeight: 700, marginBottom: "8px", color: "#374151" }}>No Quick Replies</h3>
                <p style={{ fontSize: "13px" }}>Create your first canned response using the form on the left.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {cannedResponses.map((cr) => (
                  <div
                    key={cr.id}
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{cr.title}</strong>
                        <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#3b82f6", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, alignSelf: "flex-start" }}>
                          {cr.shortcut}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleEditClick(cr)}
                          style={{ background: "#eff6ff", border: "none", color: "#3b82f6", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCannedResponse(cr.id)}
                          style={{ background: "#fef2f2", border: "none", color: "#ef4444", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {cr.mediaUrl && (
                      <img src={cr.mediaUrl} alt="Media" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "6px" }} />
                    )}
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {cr.headerText && <strong style={{ fontSize: "12px", color: "#334155" }}>{cr.headerText}</strong>}
                      <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {cr.content}
                      </p>
                      {cr.footerText && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{cr.footerText}</span>}
                    </div>

                    {cr.buttons && (() => {
                      const btns = typeof cr.buttons === 'string' ? JSON.parse(cr.buttons) : cr.buttons;
                      if (btns.length === 0) return null;
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                          {btns.map((btn: any, i: number) => (
                            <div key={i} style={{ padding: "6px", textAlign: "center", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#3b82f6" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontWeight: 900, fontSize: "18px", color: "#111827", margin: 0 }}>⚡ Create Interactive WhatsApp Flow</h2>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>Register a Meta Flow ID or configure one using a pre-built template.</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer" }}><X size={18} color="#6b7280" /></button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Column: Form config */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Prebuilt Quick selector */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4b5563", marginBottom: "6px", textTransform: "uppercase" }}>Quick Start Templates</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {PREBUILT_TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => selectPrebuiltTemplate(t)}
                        style={{
                          padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0",
                          fontSize: "12px", background: "#f8fafc", cursor: "pointer", fontWeight: 600,
                          color: "#374151"
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#4f46e5"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>FLOW NAME *</label>
                      <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Size Calculator" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>META FLOW ID *</label>
                      <input value={flowId} onChange={e => setFlowId(e.target.value)} required placeholder="e.g. 9876543210123" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>BODY DESCRIPTION TEXT (Sent in WhatsApp message)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Please answer these quick fit questions so we can get your custom sizing perfect." style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>STARTING SCREEN NAME *</label>
                      <input value={screenName} onChange={e => setScreenName(e.target.value)} required placeholder="e.g. SIZE_SCREEN" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>CTA BUTTON TEXT *</label>
                      <input value={ctaText} onChange={e => setCtaText(e.target.value)} required placeholder="e.g. Open Size Finder" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  {/* Visual Fields Builder */}
                  <div style={{ border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", background: "#f8fafc", marginTop: "10px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#1e293b", marginBottom: "8px", textTransform: "uppercase" }}>Form Questionnaire Fields</label>
                    
                    {/* Render current fields */}
                    {formFields.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px 0" }}>No fields added yet. Add custom fields below or choose a template above.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                        {formFields.map((f, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{f.label}</span>
                              <span style={{ fontSize: "10px", color: "#64748b" }}>Type: {f.type} {f.options ? `(${f.options.join(", ")})` : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new field form row */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px dashed #cbd5e1", paddingTop: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>➕ ADD NEW QUESTION FIELD</span>
                      <input
                        type="text"
                        placeholder="e.g. Enter your jersey size"
                        id="new-field-label"
                        style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12.5px", outline: "none" }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <select
                          id="new-field-type"
                          defaultValue="text"
                          onChange={e => {
                            const optEl = document.getElementById("new-field-options-row");
                            if (optEl) {
                              optEl.style.display = (e.target.value === 'select' || e.target.value === 'radio') ? 'block' : 'none';
                            }
                          }}
                          style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12.5px" }}
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
                          style={{ padding: "6px", background: "#4f46e5", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Add Field
                        </button>
                      </div>
                      <div id="new-field-options-row" style={{ display: "none" }}>
                        <label style={{ display: "block", fontSize: "10.5px", color: "#64748b", marginBottom: "2px" }}>OPTIONS (separated by commas)</label>
                        <input
                          type="text"
                          id="new-field-options"
                          placeholder="e.g. Small, Medium, Large"
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={saving} style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer", marginTop: "8px" }}>
                    {saving ? "Registering..." : "⚡ Register Meta Flow Configuration"}
                  </button>
                </form>
              </div>

              {/* Right Column: Visual Mockup Render */}
              <div style={{ width: "300px", borderLeft: "1px solid #f3f4f6", padding: "20px", background: "#f8fafc", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Flow Preview inside Chat</div>
                
                {/* Chat Bubble Message */}
                <div style={{ background: "#e5ddd5", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ background: "white", borderRadius: "6px", padding: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827", borderBottom: "1px solid #f3f4f6", paddingBottom: "4px", marginBottom: "4px" }}>{name || "Flow Header"}</div>
                    <div style={{ fontSize: "12px", color: "#374151" }}>{description || "Please tap the button to open the form."}</div>
                    <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px", textAlign: "right" }}>Powered by What-In</div>
                  </div>
                  {/* CTA button mock */}
                  <div style={{ background: "white", borderRadius: "6px", padding: "8px", textAlign: "center", fontSize: "12.5px", fontWeight: 700, color: "#00a5f4", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                    {ctaText || "Open Form"}
                  </div>
                </div>

                {/* Form fields mockup render */}
                {formFields.length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>Form Fields Mockup</div>
                    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                      {formFields.map((f, i) => (
                        <div key={i} style={{ marginBottom: "10px" }}>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4b5563", marginBottom: "4px" }}>{f.label}</label>
                          {f.type === "textarea" ? (
                            <textarea readOnly placeholder={f.placeholder} style={{ width: "100%", padding: "6px", fontSize: "11.5px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
                          ) : f.type === "select" ? (
                            <select disabled style={{ width: "100%", padding: "6px", fontSize: "11.5px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none" }}>
                              <option>{f.options?.[0] || "Select option..."}</option>
                            </select>
                          ) : f.type === "radio" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {f.options?.slice(0, 2).map((opt: string) => (
                                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#374151" }}>
                                  <input type="radio" disabled checked={opt === f.options[0]} /> {opt}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input readOnly type={f.type} placeholder={f.placeholder} style={{ width: "100%", padding: "6px", fontSize: "11.5px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none", boxSizing: "border-box" }} />
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
