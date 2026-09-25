export interface BrandConfig {
  code: "WHATMORE" | "WHATIN";
  name: string;
  domain: string;
  tagline: string;
  subheadline: string;
  heroBadge: string;
  supportWhatsApp: string;
  salesEmail: string;
  themeColor: {
    primary: string;
    gradientFrom: string;
    gradientVia: string;
    gradientTo: string;
    accentBadge: string;
    heroGlow: string;
  };
}

export const BRAND_WHATMORE: BrandConfig = {
  code: "WHATMORE",
  name: "WhatMore",
  domain: "whatsapp.esponsports.com",
  tagline: "AI-Powered WhatsApp Commerce & Autonomous Sales Engine",
  subheadline: "Turn WhatsApp into your highest-converting sales pipeline. Automate orders, native Meta catalog checkouts, Indian pincode & address auto-fetching, AI auto-pilot support, and multi-agent inboxes in one unified cloud platform.",
  heroBadge: "🚀 Next-Gen WhatsApp Commerce Cloud",
  supportWhatsApp: "+919896507407",
  salesEmail: "sales@whatmore.tinkal.in",
  themeColor: {
    primary: "indigo",
    gradientFrom: "from-indigo-600",
    gradientVia: "via-purple-600",
    gradientTo: "to-slate-950",
    accentBadge: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    heroGlow: "bg-indigo-600/20"
  }
};

export const BRAND_WHATIN: BrandConfig = {
  code: "WHATIN",
  name: "What-In",
  domain: "what-in.tinkal.in",
  tagline: "Enterprise WhatsApp Business OS & AI Agent Platform",
  subheadline: "Empower your brand with official Meta Cloud API v21.0, autonomous AI sales reps, Indian pincode & address auto-parsing, omnichannel multi-agent inbox, and real-time Shopify commerce sync engineered for scale.",
  heroBadge: "⚡ Enterprise WhatsApp Business OS",
  supportWhatsApp: "+919896507407",
  salesEmail: "contact@what-in.tinkal.in",
  themeColor: {
    primary: "emerald",
    gradientFrom: "from-emerald-600",
    gradientVia: "via-teal-600",
    gradientTo: "to-slate-950",
    accentBadge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    heroGlow: "bg-emerald-600/20"
  }
};

// Default active brand for whatsapp-app (can be overridden by environment variable NEXT_PUBLIC_BRAND)
export function getActiveBrand(): BrandConfig {
  const brandEnv = process.env.NEXT_PUBLIC_BRAND || "WHATIN";
  return brandEnv.toUpperCase() === "WHATMORE" ? BRAND_WHATMORE : BRAND_WHATIN;
}
