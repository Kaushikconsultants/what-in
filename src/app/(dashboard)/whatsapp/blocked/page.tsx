"use client";
import React, { useEffect, useState } from "react";

export default function AccessBlockedPage() {
  const [ownerWA, setOwnerWA] = useState("");

  useEffect(() => {
    fetch("/api/whatsapp/client-status").then(r => r.json()).then(d => { if (d.ownerWhatsApp) setOwnerWA(d.ownerWhatsApp); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a0a 100%)", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: "500px", padding: "40px 24px" }}>
        <div style={{ fontSize: "80px", marginBottom: "24px", animation: "pulse 2s ease infinite" }}>🔒</div>
        <style>{"@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }"}</style>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#f1f5f9", margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>
          Access Temporarily Blocked
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: "1.6", margin: "0 0 32px 0" }}>
          Your subscription payment is overdue. All portal access has been suspended. Please clear your dues to restore full access immediately.
        </p>
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px", padding: "24px", marginBottom: "28px" }}>
          <div style={{ fontSize: "13px", color: "#f87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Action Required</div>
          <p style={{ color: "#fca5a5", fontSize: "14px", margin: 0, lineHeight: "1.5" }}>
            Contact your service provider to process payment and restore access.
          </p>
        </div>
        {ownerWA && (
          <a
            href={`https://wa.me/${ownerWA.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "14px 28px", background: "linear-gradient(135deg, #16a34a, #15803d)", borderRadius: "14px", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 20px rgba(22,163,74,0.3)", marginBottom: "20px" }}
          >
            💬 Contact on WhatsApp — Recharge Now
          </a>
        )}
        <div>
          <p style={{ color: "#334155", fontSize: "12px", margin: 0 }}>
            Already paid? Ask your admin to mark the payment and restore access.
          </p>
        </div>
      </div>
    </div>
  );
}
