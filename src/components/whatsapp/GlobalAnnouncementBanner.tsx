"use client";
import React, { useState, useEffect } from "react";
import { getActiveAnnouncementsAction } from "@/app/actions/ownerPortalActions";

const TYPE_STYLES: Record<string, { bg: string; border: string; color: string; icon: string; badge: string; badgeBg: string }> = {
  MAINTENANCE: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "🛠️", badge: "Maintenance Notice", badgeBg: "#fee2e2" },
  WARNING:     { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠️", badge: "Important Alert", badgeBg: "#fef3c7" },
  SUCCESS:     { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "🎉", badge: "System Update", badgeBg: "#dcfce7" },
  INFO:        { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "📢", badge: "Announcement", badgeBg: "#dbeafe" },
};

export default function GlobalAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_dismissed_announcements");
      if (stored) setDismissed(JSON.parse(stored));
    } catch {}

    getActiveAnnouncementsAction().then(res => {
      if (res.success && res.announcements) {
        setAnnouncements(res.announcements);
      }
    });
  }, []);

  const handleDismiss = (id: string) => {
    const updated = { ...dismissed, [id]: true };
    setDismissed(updated);
    try {
      localStorage.setItem("wm_dismissed_announcements", JSON.stringify(updated));
    } catch {}
  };

  const visible = announcements.filter(a => !dismissed[a.id]);
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", zIndex: 90 }}>
      {visible.map(item => {
        const style = TYPE_STYLES[item.type] || TYPE_STYLES.INFO;
        return (
          <div
            key={item.id}
            style={{
              background: style.bg,
              borderBottom: `1px solid ${style.border}`,
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              fontSize: "13px",
              color: style.color,
              fontFamily: "system-ui, -apple-system, sans-serif"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "16px" }}>{style.icon}</span>
              <span style={{ padding: "2px 8px", background: style.badgeBg, borderRadius: "6px", fontWeight: 800, fontSize: "11px", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                {style.badge}
              </span>
              <span style={{ fontWeight: 700 }}>{item.title}</span>
              <span style={{ opacity: 0.9 }}>— {item.message}</span>
            </div>
            <button
              onClick={() => handleDismiss(item.id)}
              style={{
                background: "none",
                border: "none",
                color: style.color,
                fontSize: "16px",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                opacity: 0.7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
