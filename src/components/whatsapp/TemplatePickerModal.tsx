"use client";
import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  ChevronRight,
  Sparkles,
  Check,
  Tag,
  User,
  Phone,
  MapPin,
  Building,
  FileCode,
  Zap,
  ExternalLink,
  ShoppingBag
} from "lucide-react";

interface Template {
  id?: string;
  name: string;
  category: string;
  status: string;
  bodyText: string;
  headerContent?: string;
  footerText?: string;
  buttons?: string;
  language?: string;
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
  const [isDark, setIsDark] = useState(false);

  // Dynamic Dark Mode Detection
  useEffect(() => {
    const checkTheme = () => {
      const doc = document.documentElement;
      const isDarkMode =
        doc.classList.contains("dark") ||
        doc.getAttribute("data-theme") === "dark" ||
        (!localStorage.getItem("wm_theme") && window.matchMedia("(prefers-color-scheme: dark)").matches) ||
        localStorage.getItem("wm_theme") === "dark";
      setIsDark(isDarkMode);
    };

    checkTheme();

    const observer = new MutationObserver(() => checkTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const handleThemeChange = () => checkTheme();
    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
      mql.removeEventListener("change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    fetch("/api/whatsapp/templates")
      .then((r) => r.json())
      .then((data) => {
        const approved = (data.templates || []).filter((t: Template) => t.status === "APPROVED");
        setTemplates(approved);
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
    .filter(
      (b) =>
        (b.type === "URL" && (b.urlType === "DYNAMIC" || b.url?.includes("{{1}}"))) ||
        (b.type === "COPY_CODE" && (b.code === "{{1}}" || b.isDynamicCode))
    );

  // Extract contextual customer, agent, brand, and tag variables from active conversation
  const customerName =
    activeConvDetail?.customer?.contactPerson ||
    activeConvDetail?.contactName ||
    activeConvDetail?.customer?.businessName ||
    "";
  const businessName = activeConvDetail?.customer?.businessName || "";
  const phone = activeConvDetail?.customer?.whatsappNumber || activeConvDetail?.customer?.mobile || "";
  const agentName = activeConvDetail?.assignedEmployee?.user?.name || "Sales Rep";
  const brandName = "Espon";
  const city = (activeConvDetail?.customer as any)?.city || "";
  const state = (activeConvDetail?.customer as any)?.state || "";

  // Extract clean tags
  const tagsList = (() => {
    const t1 = (activeConvDetail?.tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    const t2 = (activeConvDetail?.customer?.tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    return Array.from(new Set([...t1, ...t2])).filter((t) => {
      const l = t.toLowerCase();
      return l !== "whatsapp lead" && l !== "auto created";
    });
  })();

  const suggestions: { label: string; value: string; icon: React.ReactNode; category: string }[] = [
    ...(customerName ? [{ label: "Customer Name", value: customerName, icon: <User size={12} />, category: "Customer" }] : []),
    ...(businessName && businessName !== customerName
      ? [{ label: "Business Name", value: businessName, icon: <Building size={12} />, category: "Customer" }]
      : []),
    ...(agentName ? [{ label: "Agent Name", value: agentName, icon: <User size={12} />, category: "Agent" }] : []),
    { label: "Brand Name", value: brandName, icon: <Building size={12} />, category: "Company" },
    ...(phone ? [{ label: "Customer Phone", value: phone, icon: <Phone size={12} />, category: "Contact" }] : []),
    ...(city ? [{ label: "City", value: city, icon: <MapPin size={12} />, category: "Location" }] : []),
    ...(state ? [{ label: "State", value: state, icon: <MapPin size={12} />, category: "Location" }] : []),
    ...tagsList.map((tag) => ({ label: `Tag: ${tag}`, value: tag, icon: <Tag size={12} />, category: "Tag" }))
  ];

  // Auto-fill variables helper
  const handleAutoFill = () => {
    const newVars: Record<string, string> = { ...variables };
    if (bodyVars[0]) {
      newVars[bodyVars[0]] = customerName || "Customer";
    }
    if (bodyVars[1]) {
      newVars[bodyVars[1]] = agentName || brandName || "Espon";
    }
    if (bodyVars[2]) {
      newVars[bodyVars[2]] = brandName || "Espon";
    }
    setVariables(newVars);

    const newBtnVars: Record<string, string> = { ...buttonVariables };
    dynamicButtons.forEach((btn) => {
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
    if (vars[0]) {
      initialVars[vars[0]] = customerName || "Customer";
    }
    if (vars[1]) {
      initialVars[vars[1]] = agentName || brandName || "Espon";
    }
    if (vars[2]) {
      initialVars[vars[2]] = brandName || "Espon";
    }
    setVariables(initialVars);

    let parsed: any[] = [];
    try {
      if (typeof t.buttons === "string") parsed = JSON.parse(t.buttons);
      else if (Array.isArray(t.buttons)) parsed = t.buttons;
    } catch (e) {}

    const initBtnVars: Record<string, string> = {};
    parsed.forEach((b, idx) => {
      if (
        (b.type === "URL" && (b.urlType === "DYNAMIC" || b.url?.includes("{{1}}"))) ||
        (b.type === "COPY_CODE" && (b.code === "{{1}}" || b.isDynamicCode))
      ) {
        initBtnVars[`btn_${idx}`] = phone ? phone.slice(-6) : b.urlExample || "ESP-10029";
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
        parameters: bodyVars.map((v, idx) => {
          let textVal = (variables[v] || "").trim();
          if (!textVal || textVal === v) {
            textVal =
              idx === 0
                ? customerName || "Customer"
                : idx === 1
                ? agentName || brandName || "Espon"
                : brandName || "Espon";
          }
          return { type: "text", text: textVal };
        })
      });
    }

    // Dynamic Button components
    dynamicButtons.forEach((btn) => {
      const key = `btn_${btn.originalIndex}`;
      const val = (buttonVariables[key] || "").trim() || btn.urlExample || (phone ? phone.slice(-6) : "ESP-10029");
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

    const effectiveLang = selected.language || "en_US";
    await onSendTemplate(selected.name, effectiveLang, components);
    setSending(false);
    onClose();
  };

  const statusBadge = (status: string) => {
    const isAppr = status === "APPROVED";
    const isRej = status === "REJECTED";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          padding: "2px 7px",
          background: isDark
            ? isAppr
              ? "rgba(16,185,129,0.18)"
              : isRej
              ? "rgba(239,68,68,0.18)"
              : "rgba(245,158,11,0.18)"
            : isAppr
            ? "rgba(16,185,129,0.1)"
            : isRej
            ? "rgba(239,68,68,0.1)"
            : "rgba(245,158,11,0.1)",
          color: isDark
            ? isAppr
              ? "#34d399"
              : isRej
              ? "#f87171"
              : "#fbbf24"
            : isAppr
            ? "#059669"
            : isRej
            ? "#dc2626"
            : "#d97706",
          border: `1px solid ${
            isDark
              ? isAppr
                ? "rgba(16,185,129,0.3)"
                : isRej
                ? "rgba(239,68,68,0.3)"
                : "rgba(245,158,11,0.3)"
              : isAppr
              ? "rgba(16,185,129,0.2)"
              : isRej
              ? "rgba(239,68,68,0.2)"
              : "rgba(245,158,11,0.2)"
          }`,
          borderRadius: "4px",
          fontSize: "10px",
          fontWeight: 700
        }}
      >
        {status}
      </span>
    );
  };

  const filtered = templates.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.bodyText?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: isDark ? "rgba(0,0,0,0.75)" : "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        transition: "background 0.2s ease"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isDark ? "#0f172a" : "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "840px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: isDark ? "0 25px 60px rgba(0,0,0,0.7)" : "0 20px 50px rgba(0,0,0,0.15)",
          border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
          overflow: "hidden",
          transition: "background 0.2s ease, border-color 0.2s ease"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isDark ? "#151e2e" : "#f8fafc",
            transition: "background 0.2s ease, border-color 0.2s ease"
          }}
        >
          <div>
            <h3
              style={{
                fontWeight: 800,
                fontSize: "16px",
                color: isDark ? "#f8fafc" : "#0f172a",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <FileCode size={17} color={isDark ? "#818cf8" : "#4f46e5"} />
              <span>Send Template Message</span>
              {customerName && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isDark ? "#a5b4fc" : "#4338ca",
                    background: isDark ? "rgba(99, 102, 241, 0.2)" : "#eef2ff",
                    border: `1px solid ${isDark ? "rgba(99, 102, 241, 0.35)" : "#c7d2fe"}`,
                    padding: "2px 8px",
                    borderRadius: "12px"
                  }}
                >
                  To: {customerName}
                </span>
              )}
            </h3>
            <p style={{ fontSize: "12px", color: isDark ? "#94a3b8" : "#64748b", margin: "3px 0 0 0" }}>
              Choose an approved template & customize dynamic variables
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: isDark ? "#1e293b" : "#e2e8f0",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "#94a3b8" : "#475569",
              transition: "background 0.15s ease"
            }}
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Template List */}
          <div
            style={{
              width: "48%",
              minWidth: "300px",
              borderRight: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
              display: "flex",
              flexDirection: "column",
              background: isDark ? "#0c1322" : "#ffffff",
              transition: "background 0.2s ease, border-color 0.2s ease"
            }}
          >
            {/* Search Input Bar */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
                background: isDark ? "#0f172a" : "#ffffff"
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: isDark ? "#64748b" : "#9ca3af"
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 32px",
                    background: isDark ? "#151f32" : "#ffffff",
                    color: isDark ? "#f8fafc" : "#0f172a",
                    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s ease"
                  }}
                />
              </div>
            </div>

            {/* Scrollable Templates List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    color: isDark ? "#64748b" : "#9ca3af",
                    fontSize: "13px"
                  }}
                >
                  Loading approved templates...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: "30px 20px",
                    textAlign: "center",
                    color: isDark ? "#64748b" : "#9ca3af",
                    fontSize: "13px"
                  }}
                >
                  No approved templates found.
                  <br />
                  <span style={{ fontSize: "11.5px", display: "block", marginTop: "4px" }}>
                    Create templates in WhatsApp Templates Studio.
                  </span>
                </div>
              ) : (
                filtered.map((t) => {
                  const isSelected = selected?.name === t.name;
                  return (
                    <div
                      key={t.name}
                      onClick={() => handleSelectTemplate(t)}
                      style={{
                        padding: "12px 14px",
                        borderBottom: `1px solid ${isDark ? "#1e293b" : "#f8fafc"}`,
                        cursor: "pointer",
                        background: isSelected
                          ? isDark
                            ? "rgba(79, 70, 229, 0.2)"
                            : "#eef2ff"
                          : isDark
                          ? "transparent"
                          : "#ffffff",
                        borderLeft: isSelected
                          ? `4px solid ${isDark ? "#6366f1" : "#4f46e5"}`
                          : "4px solid transparent",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "8px",
                        transition: "background 0.15s ease"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            color: isSelected
                              ? isDark
                                ? "#a5b4fc"
                                : "#3730a3"
                              : isDark
                              ? "#f1f5f9"
                              : "#1e293b",
                            marginBottom: "3px",
                            wordBreak: "break-word"
                          }}
                        >
                          {t.name}
                        </div>
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: isDark ? "#94a3b8" : "#64748b",
                            marginBottom: "6px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {t.bodyText?.slice(0, 60)}...
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {statusBadge(t.status)}
                          <span
                            style={{
                              fontSize: "10px",
                              color: isDark ? "#94a3b8" : "#64748b",
                              fontWeight: 600,
                              textTransform: "uppercase"
                            }}
                          >
                            {t.category}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        color={isSelected ? (isDark ? "#818cf8" : "#4f46e5") : isDark ? "#475569" : "#cbd5e1"}
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Preview + Selectable Variables */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: isDark ? "#070b14" : "#f8fafc",
              transition: "background 0.2s ease"
            }}
          >
            {selected ? (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  {/* WhatsApp Bubble Preview */}
                  <div style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isDark ? "#94a3b8" : "#64748b",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}
                    >
                      Message Preview
                    </div>
                    <div
                      style={{
                        background: isDark ? "#005c4b" : "#dcf8c6",
                        borderRadius: "12px 12px 3px 12px",
                        padding: "12px 14px",
                        boxShadow: isDark
                          ? "0 2px 6px rgba(0,0,0,0.3)"
                          : "0 1px 3px rgba(0,0,0,0.08)",
                        border: `1px solid ${isDark ? "#02735e" : "#cbe9b2"}`
                      }}
                    >
                      {selected.headerContent && (
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "14px",
                            color: isDark ? "#ffffff" : "#0f172a",
                            marginBottom: "6px"
                          }}
                        >
                          {selected.headerContent}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "13px",
                          color: isDark ? "#e9edef" : "#1e293b",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {previewBody(selected.bodyText)}
                      </div>
                      {selected.footerText && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: isDark ? "#a7f3d0" : "#64748b",
                            marginTop: "6px"
                          }}
                        >
                          {selected.footerText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variable Inputs & Selectable Chips */}
                  {bodyVars.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "10px"
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: isDark ? "#cbd5e1" : "#475569",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}
                        >
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
                              background: isDark ? "rgba(99, 102, 241, 0.2)" : "#e0e7ff",
                              color: isDark ? "#a5b4fc" : "#4338ca",
                              border: `1px solid ${isDark ? "rgba(99, 102, 241, 0.4)" : "#c7d2fe"}`,
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

                      {bodyVars.map((v) => (
                        <div
                          key={v}
                          style={{
                            marginBottom: "12px",
                            background: isDark ? "#111927" : "#ffffff",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                            boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.03)"
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "6px"
                            }}
                          >
                            <label
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: isDark ? "#f1f5f9" : "#1e293b"
                              }}
                            >
                              Variable {v}
                            </label>
                            {variables[v] && (
                              <button
                                type="button"
                                onClick={() => setVariables((prev) => ({ ...prev, [v]: "" }))}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: isDark ? "#64748b" : "#94a3b8",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  padding: "0 4px"
                                }}
                                title="Clear value"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <input
                            value={variables[v] || ""}
                            onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                            placeholder={`Type or select a variable chip below...`}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                              borderRadius: "8px",
                              fontSize: "13px",
                              outline: "none",
                              boxSizing: "border-box",
                              background: isDark ? "#0c1322" : "#f8fafc",
                              color: isDark ? "#f8fafc" : "#0f172a",
                              marginBottom: "8px"
                            }}
                          />

                          {/* Quick Selectable Chips */}
                          <div>
                            <div
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 600,
                                color: isDark ? "#94a3b8" : "#64748b",
                                marginBottom: "5px"
                              }}
                            >
                              Click to select value:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                              {suggestions.map((s, sIdx) => {
                                const isSelected = variables[v] === s.value;
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => setVariables((prev) => ({ ...prev, [v]: s.value }))}
                                    title={`Use "${s.value}" for ${v}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "3px 8px",
                                      borderRadius: "14px",
                                      fontSize: "11px",
                                      fontWeight: isSelected ? 700 : 500,
                                      background: isSelected
                                        ? "#4f46e5"
                                        : isDark
                                        ? "#1e293b"
                                        : "#f1f5f9",
                                      color: isSelected
                                        ? "#ffffff"
                                        : isDark
                                        ? "#cbd5e1"
                                        : "#334155",
                                      border: `1px solid ${
                                        isSelected
                                          ? "#4f46e5"
                                          : isDark
                                          ? "#334155"
                                          : "#cbd5e1"
                                      }`,
                                      cursor: "pointer",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    <span>{s.icon}</span>
                                    <span>
                                      {s.label}: <strong>{s.value}</strong>
                                    </span>
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
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: isDark ? "#cbd5e1" : "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Zap size={13} color={isDark ? "#818cf8" : "#6366f1"} />
                        <span>Dynamic Button Parameters ({dynamicButtons.length})</span>
                      </div>
                      {dynamicButtons.map((btn) => {
                        const key = `btn_${btn.originalIndex}`;
                        return (
                          <div
                            key={key}
                            style={{
                              marginBottom: "12px",
                              background: isDark ? "#111927" : "#ffffff",
                              padding: "10px 12px",
                              borderRadius: "10px",
                              border: `1px solid ${isDark ? "rgba(99, 102, 241, 0.35)" : "#c7d2fe"}`,
                              boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.03)"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "4px"
                              }}
                            >
                              <label
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: isDark ? "#a5b4fc" : "#3730a3",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px"
                                }}
                              >
                                <ExternalLink size={12} color={isDark ? "#818cf8" : "#6366f1"} />
                                <span>{btn.text || "Dynamic Button"} (Suffix / Value)</span>
                              </label>
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: isDark ? "#818cf8" : "#6366f1",
                                  fontWeight: 600
                                }}
                              >
                                {btn.url || btn.code}
                              </span>
                            </div>
                            <input
                              value={buttonVariables[key] || ""}
                              onChange={(e) => setButtonVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="e.g. Order ID, Tracking Code, or Promo Code"
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                                borderRadius: "8px",
                                fontSize: "13px",
                                outline: "none",
                                boxSizing: "border-box",
                                background: isDark ? "#0c1322" : "#f8fafc",
                                color: isDark ? "#f8fafc" : "#0f172a",
                                marginBottom: "6px"
                              }}
                            />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                              {phone && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setButtonVariables((prev) => ({ ...prev, [key]: phone.slice(-10) }))
                                  }
                                  style={{
                                    padding: "3px 8px",
                                    background: isDark ? "#1e293b" : "#f1f5f9",
                                    border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    color: isDark ? "#cbd5e1" : "#475569"
                                  }}
                                >
                                  <Phone size={11} color={isDark ? "#94a3b8" : "#64748b"} />
                                  <span>Phone: {phone.slice(-10)}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setButtonVariables((prev) => ({
                                    ...prev,
                                    [key]: `ESP-${Date.now().toString().slice(-5)}`
                                  }))
                                }
                                style={{
                                  padding: "3px 8px",
                                  background: isDark ? "#1e293b" : "#f1f5f9",
                                  border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  color: isDark ? "#cbd5e1" : "#475569"
                                }}
                              >
                                <ShoppingBag size={11} color={isDark ? "#94a3b8" : "#64748b"} />
                                <span>Random Order ID</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {bodyVars.length === 0 && dynamicButtons.length === 0 && (
                    <div
                      style={{
                        padding: "12px 14px",
                        background: isDark ? "rgba(16, 185, 129, 0.15)" : "#f0fdf4",
                        border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.3)" : "#bbf7d0"}`,
                        borderRadius: "10px",
                        color: isDark ? "#34d399" : "#166534",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <CheckCircle2 size={16} color={isDark ? "#34d399" : "#16a34a"} />
                      <span>This template is ready to send as-is!</span>
                    </div>
                  )}
                </div>

                {/* Footer Send Action */}
                <div
                  style={{
                    padding: "14px 18px",
                    borderTop: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                    background: isDark ? "#151e2e" : "#ffffff",
                    transition: "background 0.2s ease, border-color 0.2s ease"
                  }}
                >
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: sending
                        ? isDark
                          ? "#334155"
                          : "#9ca3af"
                        : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: sending ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                      transition: "transform 0.1s ease, box-shadow 0.15s ease"
                    }}
                  >
                    <Send size={15} />
                    {sending ? "Sending..." : "Send Template"}
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDark ? "#64748b" : "#9ca3af",
                  fontSize: "13px",
                  padding: "30px",
                  textAlign: "center",
                  gap: "10px"
                }}
              >
                <FileCode size={36} color={isDark ? "#334155" : "#cbd5e1"} />
                <span>Select a template from the left to preview and customize</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
