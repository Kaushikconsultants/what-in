"use client";

import React, { useState, useEffect } from "react";
import { getActiveAnnouncementsAction } from "@/app/actions/ownerPortalActions";
import { Wrench, AlertTriangle, Sparkles, Megaphone, X, Clock } from "lucide-react";

const TYPE_CONFIG: Record<string, {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  icon: any;
  label: string;
}> = {
  MAINTENANCE: {
    bg: "bg-rose-50 dark:bg-rose-950/90",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-900 dark:text-rose-100",
    badgeBg: "bg-rose-100 dark:bg-rose-900/80",
    badgeText: "text-rose-700 dark:text-rose-200",
    icon: Wrench,
    label: "Maintenance Notice"
  },
  WARNING: {
    bg: "bg-amber-50 dark:bg-amber-950/90",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    badgeBg: "bg-amber-100 dark:bg-amber-900/80",
    badgeText: "text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
    label: "Important Alert"
  },
  SUCCESS: {
    bg: "bg-emerald-50 dark:bg-emerald-950/90",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-100",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/80",
    badgeText: "text-emerald-800 dark:text-emerald-200",
    icon: Sparkles,
    label: "System Update"
  },
  INFO: {
    bg: "bg-indigo-50 dark:bg-indigo-950/90",
    border: "border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-900 dark:text-indigo-100",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/80",
    badgeText: "text-indigo-800 dark:text-indigo-200",
    icon: Megaphone,
    label: "Announcement"
  },
};

export default function GlobalAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const fetchAnnouncements = async () => {
    try {
      const res = await getActiveAnnouncementsAction();
      if (res.success && res.announcements) {
        setAnnouncements(res.announcements);
      }
    } catch (e) {
      console.error("Failed to fetch active announcements:", e);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wm_dismissed_announcements");
      if (stored) setDismissed(JSON.parse(stored));
    } catch {}

    fetchAnnouncements();

    // Re-check periodically every 60s so scheduled broadcasts automatically pop up without reload
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
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
    <aside aria-label="System announcements" className="w-full z-40 flex flex-col shrink-0 shadow-xs">
      {visible.map(item => {
        const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO;
        const Icon = conf.icon;

        return (
          <div
            key={item.id}
            className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 border-b ${conf.bg} ${conf.border} ${conf.text} flex items-center justify-between gap-3 transition-colors`}
          >
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className={`p-1.5 rounded-lg ${conf.badgeBg} ${conf.badgeText} shrink-0`}>
                <Icon size={14} className="animate-pulse" />
              </span>

              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${conf.badgeBg} ${conf.badgeText} shrink-0`}>
                {conf.label}
              </span>

              <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
                <span className="font-extrabold">{item.title}</span>
                <span className="opacity-75 hidden sm:inline">—</span>
                <span className="font-medium opacity-90">{item.message}</span>
              </div>

              {item.expiresAt && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold opacity-75 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md shrink-0">
                  <Clock size={10} />
                  <span>Until {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(item.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </span>
              )}
            </div>

            <button
              onClick={() => handleDismiss(item.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-current opacity-70 hover:opacity-100 transition-all shrink-0 cursor-pointer"
              title="Dismiss announcement"
              aria-label="Dismiss announcement"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
