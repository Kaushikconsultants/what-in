"use client";
import React, { useState, useEffect } from "react";
import { getClientStatusAction } from "@/app/actions/ownerPortalActions";

export default function PaymentWarningBanner() {
  const [status, setStatus] = useState<{ pastDue: boolean; daysLeft: number; ownerWhatsApp?: string } | null>(null);

  useEffect(() => {
    // Check if first WhatsApp client exists and is past due
    fetch("/api/whatsapp/client-status")
      .then(r => r.json())
      .then(data => {
        if (data.pastDue || data.blocked) setStatus(data);
      })
      .catch(() => {});
  }, []);

  if (!status?.pastDue) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 9999,
      background: "linear-gradient(90deg, #92400e, #b45309, #92400e)",
      backgroundSize: "200% 100%",
      animation: "bannerPulse 3s ease infinite",
      color: "white",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "13px",
      fontFamily: "Inter, sans-serif",
      fontWeight: 600,
      boxShadow: "0 2px 20px rgba(180, 83, 9, 0.5)"
    }}>
      <style>{"`@keyframes bannerPulse { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`"}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "18px" }}>⚠️</span>
        <div>
          <strong>Payment Pending — Subscription Renewal Required</strong>
          <span style={{ marginLeft: "10px", opacity: 0.85, fontWeight: 400 }}>
            {status.daysLeft > 0 ? `${status.daysLeft} day${status.daysLeft !== 1 ? "s" : ""} remaining before access is blocked.` : "Access will be blocked soon."}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {status.ownerWhatsApp && (
          <a
            href={`https://wa.me/${status.ownerWhatsApp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            style={{ padding: "6px 14px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
          >
            💬 Recharge Now
          </a>
        )}
      </div>
    </div>
  );
}
