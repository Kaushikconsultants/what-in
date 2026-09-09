"use client";

import React, { useState, useEffect } from "react";
import { BarChart2, TrendingUp, DollarSign, Users, ShoppingBag, Radio } from "lucide-react";
import { getWhatsAppCampaigns } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    getWhatsAppCampaigns().then((res) => {
      if (res.success && res.campaigns) setCampaigns(res.campaigns);
    });
  }, []);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Campaign ROI & Conversion Analytics</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Track broadcast delivery rates, customer replies, orders created & total revenue generated.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Total Revenue Generated</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#10b981", margin: "4px 0 0 0" }}>₹18,40,000</h3>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Orders Generated</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", margin: "4px 0 0 0" }}>28 Orders</h3>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Avg Conversion Rate</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#3b82f6", margin: "4px 0 0 0" }}>22.4%</h3>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Total Read Rate</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#8b5cf6", margin: "4px 0 0 0" }}>92.6%</h3>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 700 }}>
              <th style={{ padding: "12px 16px" }}>Campaign Name</th>
              <th style={{ padding: "12px 16px" }}>Sent</th>
              <th style={{ padding: "12px 16px" }}>Delivered</th>
              <th style={{ padding: "12px 16px" }}>Read</th>
              <th style={{ padding: "12px 16px" }}>Replies</th>
              <th style={{ padding: "12px 16px" }}>Orders</th>
              <th style={{ padding: "12px 16px" }}>Revenue (₹)</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827" }}>{c.name}</td>
                <td style={{ padding: "12px 16px" }}>{c.sentCount}</td>
                <td style={{ padding: "12px 16px" }}>{c.deliveredCount} ({Math.round((c.deliveredCount/c.sentCount)*100)}%)</td>
                <td style={{ padding: "12px 16px" }}>{c.readCount} ({Math.round((c.readCount/c.sentCount)*100)}%)</td>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#2563eb" }}>{c.repliedCount}</td>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827" }}>{c.ordersGenerated}</td>
                <td style={{ padding: "12px 16px", fontWeight: 800, color: "#059669" }}>₹{c.revenueGenerated.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
