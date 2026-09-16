"use client";
import React, { useState, useEffect } from "react";
import { X, Search, GitBranch, Send, Zap } from "lucide-react";

interface Flow {
  id: string;
  name: string;
  flowId: string;
  description?: string;
  ctaText: string;
  screenName: string;
}

interface Props {
  onClose: () => void;
  onSendFlow: (flowId: string) => Promise<void>;
}

export default function FlowPickerModal({ onClose, onSendFlow }: Props) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Flow | null>(null);
  const [sending, setSending] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Dynamic Theme Detection
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
    fetch("/api/whatsapp/flows")
      .then((r) => r.json())
      .then((data) => {
        setFlows(data.flows || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    await onSendFlow(selected.flowId);
    setSending(false);
    onClose();
  };

  const filtered = flows.filter(
    (f) =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase())
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
        padding: "20px",
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
          maxWidth: "680px",
          maxHeight: "82vh",
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
            transition: "background 0.2s ease"
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
              <Zap size={17} color={isDark ? "#818cf8" : "#4f46e5"} />
              <span>Send Interactive Flow Form</span>
            </h3>
            <p style={{ fontSize: "12px", color: isDark ? "#94a3b8" : "#64748b", margin: "2px 0 0 0" }}>
              Choose a registered Meta Flow to open inside WhatsApp chat
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
              color: isDark ? "#94a3b8" : "#475569"
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left List */}
          <div
            style={{
              width: "50%",
              borderRight: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
              display: "flex",
              flexDirection: "column",
              background: isDark ? "#0c1322" : "#ffffff"
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
                background: isDark ? "#0f172a" : "#ffffff"
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={13}
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
                  placeholder="Search flows..."
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 30px",
                    background: isDark ? "#151f32" : "#ffffff",
                    color: isDark ? "#f8fafc" : "#0f172a",
                    border: `1px solid ${isDark ? "#334155" : "#e5e7eb"}`,
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "24px", textAlign: "center", color: isDark ? "#64748b" : "#9ca3af", fontSize: "13px" }}>
                  Loading flows...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: isDark ? "#64748b" : "#9ca3af", fontSize: "13px" }}>
                  No Meta Flows found.
                  <br />
                  <span style={{ fontSize: "12px", display: "block", marginTop: "4px" }}>
                    Register flows in the Meta Flows page first.
                  </span>
                </div>
              ) : (
                filtered.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelected(f)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${isDark ? "#1e293b" : "#f9fafb"}`,
                      cursor: "pointer",
                      background:
                        selected?.id === f.id
                          ? isDark
                            ? "rgba(79, 70, 229, 0.2)"
                            : "#eef2ff"
                          : isDark
                          ? "transparent"
                          : "#ffffff",
                      borderLeft:
                        selected?.id === f.id
                          ? `4px solid ${isDark ? "#6366f1" : "#4f46e5"}`
                          : "4px solid transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      transition: "background 0.15s ease"
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        color:
                          selected?.id === f.id
                            ? isDark
                              ? "#a5b4fc"
                              : "#3730a3"
                            : isDark
                            ? "#f1f5f9"
                            : "#111827"
                      }}
                    >
                      {f.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: isDark ? "#94a3b8" : "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {f.description || "No description"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: isDark ? "#070b14" : "#f8fafc"
            }}
          >
            {selected ? (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: isDark ? "#94a3b8" : "#6b7280",
                      marginBottom: "8px",
                      textTransform: "uppercase"
                    }}
                  >
                    Preview inside WhatsApp Chat
                  </div>

                  <div
                    style={{
                      background: isDark ? "#1f2c34" : "#e5ddd5",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}
                  >
                    <div
                      style={{
                        background: isDark ? "#0b141a" : "#ffffff",
                        borderRadius: "8px",
                        padding: "10px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        border: `1px solid ${isDark ? "#2a3942" : "#e2e8f0"}`
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: isDark ? "#e9edef" : "#111827",
                          borderBottom: `1px solid ${isDark ? "#222e35" : "#f3f4f6"}`,
                          paddingBottom: "4px",
                          marginBottom: "4px"
                        }}
                      >
                        {selected.name}
                      </div>
                      <div style={{ fontSize: "12px", color: isDark ? "#8696a0" : "#374151" }}>
                        {selected.description}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: isDark ? "#8696a0" : "#9ca3af",
                          marginTop: "6px",
                          textAlign: "right"
                        }}
                      >
                        Powered by Espon
                      </div>
                    </div>

                    {/* CTA button mock */}
                    <div
                      style={{
                        background: isDark ? "#0b141a" : "#ffffff",
                        borderRadius: "8px",
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: isDark ? "#53bdeb" : "#00a5f4",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        border: `1px solid ${isDark ? "#2a3942" : "#e2e8f0"}`
                      }}
                    >
                      {selected.ctaText}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      fontSize: "12px",
                      color: isDark ? "#94a3b8" : "#4b5563",
                      background: isDark ? "#111927" : "#ffffff",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`
                    }}
                  >
                    <strong>Screen ID:</strong> {selected.screenName}
                    <br />
                    <strong>Meta Flow ID:</strong> {selected.flowId}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: `1px solid ${isDark ? "#1e293b" : "#f3f4f6"}`,
                    background: isDark ? "#151e2e" : "#ffffff"
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
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: sending ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)"
                    }}
                  >
                    <Send size={15} />
                    {sending ? "Sending Flow..." : "Send Interactive Flow"}
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDark ? "#64748b" : "#9ca3af",
                  fontSize: "13px",
                  padding: "24px",
                  textAlign: "center"
                }}
              >
                ← Select a Flow to preview and send
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
