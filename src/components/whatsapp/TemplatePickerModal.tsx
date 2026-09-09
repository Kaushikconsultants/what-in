"use client";
import React, { useState, useEffect } from "react";
import { X, Search, CheckCircle2, Clock, AlertCircle, Send, ChevronRight, Sparkles, Check, Tag, User, Phone, MapPin, Building } from "lucide-react";

interface Template {
  id?: string; name: string; category: string; status: string;
  bodyText: string; headerContent?: string; footerText?: string;
  buttons?: string; language?: string;
}

interface Props {
  onClose: () => void;
  activeConvDetail?: any;
  onSendTemplate: (templateName: string, language: string, components: any[]) => Promise<void>;
}

export default function TemplatePickerModal({ onClose, activeConvDetail, onSendTemplate }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [buttonVariables, setButtonVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/templates")
      .then(r => r.json())
      .then(data => {
        setTemplates((data.templates || []).filter((t: Template) => t.status === "APPROVED"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Extract {{n}} variable placeholders from body text
  const extractVariables = (text: string): string[] => {
    const matches = text?.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].sort();
  };

  const bodyVars = selected ? extractVariables(selected.bodyText) : [];

  // Parse template buttons
  const templateButtons: any[] = (() => {
    if (!selected?.buttons) return [];
    try {
      if (typeof selected.buttons === "string") return JSON.parse(selected.buttons);
      if (Array.isArray(selected.buttons)) return selected.buttons;
    } catch (e) {}
    return [];
  })();

  const dynamicButtons = templateButtons
    .map((b, idx) => ({ ...b, originalIndex: idx }))
    .filter(b => (b.type === "URL" && (b.urlType === "DYNAMIC" || b.url?.includes("{{1}}"))) || (b.type === "COPY_CODE" && (b.code === "{{1}}" || b.isDynamicCode)));

  // Extract contextual customer, agent, brand, and tag variables from active conversation
  const customerName = activeConvDetail?.customer?.contactPerson || activeConvDetail?.contactName || activeConvDetail?.customer?.businessName || "";
  const businessName = activeConvDetail?.customer?.businessName || "";
  const phone = activeConvDetail?.customer?.whatsappNumber || activeConvDetail?.customer?.mobile || "";
  const agentName = activeConvDetail?.assignedEmployee?.user?.name || "Sales Rep";
  const brandName = "What-In";
  const city = (activeConvDetail?.customer as any)?.city || "";
  const state = (activeConvDetail?.customer as any)?.state || "";

  // Extract clean tags
  const tagsList = (() => {
    const t1 = (activeConvDetail?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    const t2 = (activeConvDetail?.customer?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    return Array.from(new Set([...t1, ...t2])).filter(t => {
      const l = t.toLowerCase();
      return l !== 'whatsapp lead' && l !== 'auto created';
    });
  })();

  const suggestions: { label: string; value: string; icon: string; category: string }[] = [
    ...(customerName ? [{ label: "Customer Name", value: customerName, icon: "👤", category: "Customer" }] : []),
    ...(businessName && businessName !== customerName ? [{ label: "Business Name", value: businessName, icon: "🏢", category: "Customer" }] : []),
    ...(agentName ? [{ label: "Agent Name", value: agentName, icon: "👨‍💼", category: "Agent" }] : []),
    { label: "Brand Name", value: brandName, icon: "🏬", category: "Company" },
    ...(phone ? [{ label: "Customer Phone", value: phone, icon: "📱", category: "Contact" }] : []),
    ...(city ? [{ label: "City", value: city, icon: "📍", category: "Location" }] : []),
    ...(state ? [{ label: "State", value: state, icon: "🗺️", category: "Location" }] : []),
    ...tagsList.map(tag => ({ label: `Tag: ${tag}`, value: tag, icon: "🏷️", category: "Tag" })),
  ];

  // Auto-fill variables helper
  const handleAutoFill = () => {
    const newVars: Record<string, string> = { ...variables };
    if (bodyVars[0] && !newVars[bodyVars[0]]) {
      newVars[bodyVars[0]] = customerName || "Customer";
    }
    if (bodyVars[1] && !newVars[bodyVars[1]]) {
      newVars[bodyVars[1]] = agentName || brandName;
    }
    if (bodyVars[2] && !newVars[bodyVars[2]]) {
      newVars[bodyVars[2]] = brandName;
    }
    setVariables(newVars);

    const newBtnVars: Record<string, string> = { ...buttonVariables };
    dynamicButtons.forEach(btn => {
      const key = `btn_${btn.originalIndex}`;
      if (!newBtnVars[key]) {
        newBtnVars[key] = phone ? phone.slice(-6) : "ESP-10029";
      }
    });
    setButtonVariables(newBtnVars);
  };

  const handleSelectTemplate = (t: Template) => {
    setSelected(t);
    const vars = extractVariables(t.bodyText);
    const initialVars: Record<string, string> = {};
    if (vars[0] && customerName) {
      initialVars[vars[0]] = customerName;
    }
    setVariables(initialVars);

    let parsed: any[] = [];
    try {
      if (typeof t.buttons === "string") parsed = JSON.parse(t.buttons);
      else if (Array.isArray(t.buttons)) parsed = t.buttons;
    } catch (e) {}

    const initBtnVars: Record<string, string> = {};
    parsed.forEach((b, idx) => {
      if ((b.type === "URL" && (b.urlType === "DYNAMIC" || b.url?.includes("{{1}}"))) || (b.type === "COPY_CODE" && (b.code === "{{1}}" || b.isDynamicCode))) {
        initBtnVars[`btn_${idx}`] = phone ? phone.slice(-6) : (b.urlExample || "ESP-10029");
      }
    });
    setButtonVariables(initBtnVars);
  };

  const previewBody = (text: string) => {
    if (!text) return "";
    return text.replace(/\{\{(\d+)\}\}/g, (match) => variables[match] || match);
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    const components: any[] = [];
    if (bodyVars.length > 0) {
      components.push({
        type: "body",
        parameters: bodyVars.map(v => ({ type: "text", text: variables[v] || v }))
      });
    }

    // Dynamic Button components
    dynamicButtons.forEach(btn => {
      const key = `btn_${btn.originalIndex}`;
      const val = buttonVariables[key] || btn.urlExample || "ESP-10029";
      if (btn.type === "URL") {
        components.push({
          type: "button",
          sub_type: "url",
          index: String(btn.originalIndex),
          parameters: [{ type: "text", text: val }]
        });
      } else if (btn.type === "COPY_CODE") {
        components.push({
          type: "button",
          sub_type: "copy_code",
          index: String(btn.originalIndex),
          parameters: [{ type: "coupon_code", coupon_code: val }]
        });
      }
    });

    await onSendTemplate(selected.name, selected.language || "en", components);
    setSending(false);
    onClose();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      APPROVED: { bg: "rgba(16,185,129,0.1)", color: "#10b981" },
      PENDING: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
      REJECTED: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
    };
    const c = colors[status] || colors.PENDING;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", background: c.bg, color: c.color, borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
        {status}
      </span>
    );
  };

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.bodyText?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "780px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📄 Send Template Message</span>
              {customerName && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", background: "#eef2ff", padding: "2px 8px", borderRadius: "12px" }}>
                  To: {customerName}
                </span>
              )}
            </h3>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0 0" }}>Choose an approved template & customize dynamic variables</p>
          </div>
          <button onClick={onClose} style={{ background: "#e2e8f0", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px" }}><X size={16} color="#475569" /></button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Template List */}
          <div style={{ width: "50%", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
                  style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>Loading templates...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                  No approved templates found.<br/>
                  <span style={{ fontSize: "12px" }}>Create templates in the Templates page.</span>
                </div>
              ) : (
                filtered.map(t => (
                  <div key={t.name} onClick={() => handleSelectTemplate(t)}
                    style={{ padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer",
                      background: selected?.name === t.name ? "#eef2ff" : "white",
                      borderLeft: selected?.name === t.name ? "4px solid #4f46e5" : "4px solid transparent",
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px",
                      transition: "background 0.15s" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: selected?.name === t.name ? "#3730a3" : "#1e293b", marginBottom: "3px" }}>{t.name}</div>
                      <div style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.bodyText?.slice(0, 60)}...
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {statusBadge(t.status)}
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>{t.category}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} color={selected?.name === t.name ? "#4f46e5" : "#94a3b8"} style={{ flexShrink: 0, marginTop: "2px" }} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Preview + Selectable Variables */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
            {selected ? (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  {/* WhatsApp Bubble Preview */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div>
                    <div style={{ background: "#dcf8c6", borderRadius: "12px 12px 3px 12px", padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #cbe9b2" }}>
                      {selected.headerContent && <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a", marginBottom: "6px" }}>{selected.headerContent}</div>}
                      <div style={{ fontSize: "13px", color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {previewBody(selected.bodyText)}
                      </div>
                      {selected.footerText && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>{selected.footerText}</div>}
                    </div>
                  </div>

                  {/* Variable Inputs & Selectable Chips */}
                  {bodyVars.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Fill Body Variables ({bodyVars.length})
                        </div>
                        {suggestions.length > 0 && (
                          <button
                            type="button"
                            onClick={handleAutoFill}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "#e0e7ff",
                              color: "#4338ca",
                              border: "1px solid #c7d2fe",
                              borderRadius: "6px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                            title="Auto-fill dynamic values from customer details"
                          >
                            <Sparkles size={12} /> Auto-Fill
                          </button>
                        )}
                      </div>

                      {bodyVars.map(v => (
                        <div key={v} style={{ marginBottom: "14px", background: "white", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{v}</label>
                            {variables[v] && (
                              <button
                                type="button"
                                onClick={() => setVariables(prev => ({ ...prev, [v]: "" }))}
                                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11px", cursor: "pointer", padding: "0 4px" }}
                                title="Clear value"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <input
                            value={variables[v] || ""}
                            onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                            placeholder={`Type or click a variable chip below...`}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "8px",
                              fontSize: "13px",
                              outline: "none",
                              boxSizing: "border-box",
                              background: "#f8fafc",
                              marginBottom: "8px"
                            }}
                          />

                          {/* Quick Selectable Chips */}
                          <div>
                            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Click to select value:</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                              {suggestions.map((s, sIdx) => {
                                const isSelected = variables[v] === s.value;
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => setVariables(prev => ({ ...prev, [v]: s.value }))}
                                    title={`Use "${s.value}" for ${v}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "3px 8px",
                                      borderRadius: "14px",
                                      fontSize: "11px",
                                      fontWeight: isSelected ? 700 : 500,
                                      background: isSelected ? "#4f46e5" : "#f1f5f9",
                                      color: isSelected ? "white" : "#334155",
                                      border: `1px solid ${isSelected ? "#4f46e5" : "#cbd5e1"}`,
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      boxShadow: isSelected ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none"
                                    }}
                                  >
                                    <span>{s.icon}</span>
                                    <span>{s.label}: <strong>{s.value}</strong></span>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Button Parameters */}
                  {dynamicButtons.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                        ⚡ Dynamic Button Parameters ({dynamicButtons.length})
                      </div>
                      {dynamicButtons.map(btn => {
                        const key = `btn_${btn.originalIndex}`;
                        return (
                          <div key={key} style={{ marginBottom: "12px", background: "white", padding: "10px 12px", borderRadius: "10px", border: "1px solid #c7d2fe", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <label style={{ fontSize: "12px", fontWeight: 700, color: "#3730a3" }}>
                                🔗 {btn.text || "Dynamic Button"} (Suffix / Value)
                              </label>
                              <span style={{ fontSize: "10px", color: "#6366f1", fontWeight: 600 }}>{btn.url || btn.code}</span>
                            </div>
                            <input
                              value={buttonVariables[key] || ""}
                              onChange={e => setButtonVariables(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder="e.g. Order ID, Tracking Code, or Promo Code"
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                fontSize: "13px",
                                outline: "none",
                                boxSizing: "border-box",
                                background: "#f8fafc",
                                marginBottom: "6px"
                              }}
                            />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                              {phone && (
                                <button
                                  type="button"
                                  onClick={() => setButtonVariables(prev => ({ ...prev, [key]: phone.slice(-10) }))}
                                  style={{ padding: "2px 8px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "11px", cursor: "pointer" }}
                                >
                                  📱 Phone: {phone.slice(-10)}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setButtonVariables(prev => ({ ...prev, [key]: `ESP-${Date.now().toString().slice(-5)}` }))}
                                style={{ padding: "2px 8px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "11px", cursor: "pointer" }}
                              >
                                📦 Random Order ID
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {bodyVars.length === 0 && dynamicButtons.length === 0 && (
                    <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", color: "#166534", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <span>This template is ready to send as-is!</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "white" }}>
                  <button onClick={handleSend} disabled={sending}
                    style={{ width: "100%", padding: "12px", background: sending ? "#9ca3af" : "#4f46e5", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "14px", cursor: sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)" }}>
                    <Send size={15} />
                    {sending ? "Sending..." : "Send Template"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "13px", padding: "24px", textAlign: "center" }}>
                ← Select a template from the left to preview and send
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

