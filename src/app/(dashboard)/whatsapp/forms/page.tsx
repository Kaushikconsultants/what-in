"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, CheckCircle, Database } from "lucide-react";
import { getWhatsAppForms } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppFormsPage() {
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => {
    getWhatsAppForms().then((res) => {
      if (res.success && res.forms) setForms(res.forms);
    });
  }, []);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Dynamic Interactive Forms</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Collect structured customer details in-chat & automatically create/update CRM contacts & leads.</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          <Plus size={16} /> Create Form
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
        {forms.map((f) => {
          const fields = JSON.parse(f.fieldsJson || "[]");
          return (
            <div key={f.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>Active Form</span>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>{fields.length} Fields</span>
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>{f.title}</h4>
              <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 12px 0" }}>{f.description}</p>

              <div style={{ background: "#fafafa", padding: "10px", borderRadius: "6px", border: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>CRM Field Mapping</span>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "#374151" }}>
                  {fields.map((field: any, idx: number) => (
                    <li key={idx}><strong>{field.label}</strong> → CRM Field: <code>{field.name}</code></li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
