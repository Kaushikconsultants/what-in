"use client";
import React, { useState, useEffect } from "react";
import { X, Search, GitBranch, Send } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/whatsapp/flows")
      .then(r => r.json())
      .then(data => {
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

  const filtered = flows.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "680px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: "16px", color: "#111827", margin: 0 }}>⚡ Send Interactive Flow Form</h3>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Choose a registered Flow to open inside the chat</p>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px" }}><X size={16} color="#6b7280" /></button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left List */}
          <div style={{ width: "50%", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flows..."
                  style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>Loading flows...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                  No Meta Flows found.<br />
                  <span style={{ fontSize: "12px" }}>Register them in the Meta Flows page first.</span>
                </div>
              ) : (
                filtered.map(f => (
                  <div key={f.id} onClick={() => setSelected(f)}
                    style={{
                      padding: "12px 16px", borderBottom: "1px solid #f9fafb", cursor: "pointer",
                      background: selected?.id === f.id ? "#f0f0ff" : "white",
                      borderLeft: selected?.id === f.id ? "3px solid #4f46e5" : "3px solid transparent",
                      display: "flex", flexDirection: "column", gap: "2px"
                    }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827" }}>{f.name}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.description || "No description"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selected ? (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8fafc" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase" }}>Preview inside Chat</div>
                  
                  <div style={{ background: "#e5ddd5", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ background: "white", borderRadius: "6px", padding: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827", borderBottom: "1px solid #f3f4f6", paddingBottom: "4px", marginBottom: "4px" }}>{selected.name}</div>
                      <div style={{ fontSize: "12px", color: "#374151" }}>{selected.description}</div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px", textAlign: "right" }}>Powered by What-In</div>
                    </div>
                    {/* CTA button mock */}
                    <div style={{ background: "white", borderRadius: "6px", padding: "8px", textAlign: "center", fontSize: "12.5px", fontWeight: 700, color: "#00a5f4", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                      {selected.ctaText}
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", fontSize: "12px", color: "#4b5563" }}>
                    <strong>Screen ID:</strong> {selected.screenName}<br />
                    <strong>Meta Flow ID:</strong> {selected.flowId}
                  </div>
                </div>
                <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6" }}>
                  <button onClick={handleSend} disabled={sending}
                    style={{ width: "100%", padding: "12px", background: sending ? "#9ca3af" : "#4f46e5", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "14px", cursor: sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <Send size={15} />
                    {sending ? "Sending Flow..." : "Send Interactive Flow"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "13px", padding: "24px", textAlign: "center" }}>
                ← Select a Flow to preview and send
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
