"use client";

import React, { useState } from "react";
import { Send, UserCheck, MessageSquare, CheckCircle } from "lucide-react";
import { sendDirectWhatsAppDispatchAction } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppDirectMessagesPage() {
  const [phone, setPhone] = useState("9812034567");
  const [message, setMessage] = useState("Hello! Sending a direct WhatsApp message from Espon CRM.");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) return;

    setLoading(true);
    setStatus(null);
    setError(null);

    const res = await sendDirectWhatsAppDispatchAction(phone, message);
    
    if (res.success) {
      setStatus(`Direct WhatsApp Message successfully dispatched to +91 ${phone}! Saved to CRM Activity Timeline.`);
    } else {
      setError(`Failed to send message: ${res.error}`);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "650px" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" }}>Direct WhatsApp Dispatch</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>Send an immediate 1-on-1 WhatsApp message to any customer number. Automatically syncs with CRM profile.</p>

        {status && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} />
            <span>{status}</span>
          </div>
        )}

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendDirect} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Recipient Mobile / WhatsApp Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9812034567"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Message Body</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message content..."
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", resize: "none" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#10b981", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            <Send size={16} />
            <span>{loading ? "Dispatching..." : "Send Direct Message"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
