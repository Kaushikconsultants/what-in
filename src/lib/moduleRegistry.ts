/**
 * WhatMore SaaS — Modular Feature Gating & Module Registry
 * Defines all core WhatsApp marketing, commerce, intelligence modules & official integrations.
 */

export type ModuleKey =
  | "INBOX"
  | "CHATBOT"
  | "AI_AGENT"
  | "BROADCASTS"
  | "WIDGET"
  | "COBROWSE"
  | "DEVELOPER_API"
  | "SHOPIFY_INTEGRATION"
  | "META_CATALOG"
  | "META_PIXEL_CAPI"
  | "PAYMENT_GATEWAY";

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  category: "CORE" | "COMMERCE" | "INTELLIGENCE" | "ENGAGEMENT" | "INTEGRATIONS" | "DEVELOPER";
  icon: string;
  badgeColor: string;
  tagline: string;
  description: string;
  routes: string[];
  industryFit: string[];
}

export const MASTER_MODULES: Record<ModuleKey, ModuleDefinition> = {
  // 1. Core Live Chat
  INBOX: {
    key: "INBOX",
    name: "Live Team Inbox",
    category: "CORE",
    icon: "💬",
    badgeColor: "#10b981",
    tagline: "Multi-agent live chat, notes & quick replies",
    description: "Real-time WhatsApp team inbox with assignment, internal notes, canned responses, and agent collision avoidance.",
    routes: ["/whatsapp/inbox", "/whatsapp/direct-messages", "/whatsapp/team-inbox", "/whatsapp/reply-library"],
    industryFit: ["All Industries", "E-Commerce", "Customer Support", "Services"]
  },

  // 2. Chatbot Builder
  CHATBOT: {
    key: "CHATBOT",
    name: "Visual Bot & Meta Flows",
    category: "CORE",
    icon: "🤖",
    badgeColor: "#6366f1",
    tagline: "Visual flowchart bot & native WhatsApp Flows",
    description: "Drag-and-drop chatbot automation, keyword triggers, and interactive native Meta WhatsApp Flows forms.",
    routes: ["/whatsapp/chatbot-builder", "/whatsapp/chatbots", "/whatsapp/flows", "/whatsapp/forms"],
    industryFit: ["All Industries", "Lead Generation", "E-Commerce", "Real Estate"]
  },

  // 3. AI Agent
  AI_AGENT: {
    key: "AI_AGENT",
    name: "AI Auto-Pilot & Knowledge Base",
    category: "INTELLIGENCE",
    icon: "🧠",
    badgeColor: "#8b5cf6",
    tagline: "Autonomous Gemini / OpenAI customer agent",
    description: "Smart 24/7 AI agent trained on store catalog, PDFs, business FAQs, and intent-aware contextual conversation.",
    routes: ["/whatsapp/ai-automation"],
    industryFit: ["D2C Brands", "Real Estate", "Consultancies", "Healthcare"]
  },

  // 4. Broadcasts
  BROADCASTS: {
    key: "BROADCASTS",
    name: "Bulk Broadcasts & Drip Campaigns",
    category: "ENGAGEMENT",
    icon: "📢",
    badgeColor: "#3b82f6",
    tagline: "Template messaging & scheduled sequences",
    description: "Meta-approved template marketing campaigns, dynamic CSV customer import, segment filters, and multi-day drip sequences.",
    routes: ["/whatsapp/broadcasts", "/whatsapp/campaigns", "/whatsapp/templates", "/whatsapp/contacts", "/whatsapp/tags"],
    industryFit: ["Marketing", "D2C Brands", "EdTech", "Events"]
  },

  // 5. Website Widget
  WIDGET: {
    key: "WIDGET",
    name: "Website Widget & Lead Radar",
    category: "ENGAGEMENT",
    icon: "🌐",
    badgeColor: "#14b8a6",
    tagline: "Zero-dependency web chat & lead forms",
    description: "Embeddable website widget script, proactive exit-intent speech bubble nudges, and instant visitor lead capture.",
    routes: ["/whatsapp/integrations"],
    industryFit: ["Websites", "Service Businesses", "Clinics", "Real Estate"]
  },

  // 6. Co-Browsing
  COBROWSE: {
    key: "COBROWSE",
    name: "Live Co-Browsing Screen Assist",
    category: "ENGAGEMENT",
    icon: "👁️",
    badgeColor: "#06b6d4",
    tagline: "Real-time visitor screen proxy & guidance",
    description: "Agent sees live visitor website view, dynamic island controls, cursor highlights, and guides high-ticket form fills.",
    routes: ["/whatsapp/inbox"],
    industryFit: ["Real Estate", "EdTech Admissions", "Luxury Brands", "B2B SaaS"]
  },

  // 7. Developer APIs
  DEVELOPER_API: {
    key: "DEVELOPER_API",
    name: "Developer APIs & Outbound Webhooks",
    category: "DEVELOPER",
    icon: "⚡",
    badgeColor: "#64748b",
    tagline: "REST API keys & live webhook events",
    description: "Generate client API keys, register custom outbound webhook endpoints (Zapier / Make / custom CRM), and inspect raw logs.",
    routes: ["/whatsapp/api-settings", "/whatsapp/logs"],
    industryFit: ["Tech Enterprises", "SaaS Integrators", "Custom In-House Apps"]
  },

  // 8. Shopify Integration
  SHOPIFY_INTEGRATION: {
    key: "SHOPIFY_INTEGRATION",
    name: "Shopify Store & Webhook Sync",
    category: "INTEGRATIONS",
    icon: "🛍️",
    badgeColor: "#95bf47",
    tagline: "Live catalog sync, stock & order webhooks",
    description: "Automatic Shopify store integration, real-time product/variant inventory sync, abandoned cart recovery, and order status tracking.",
    routes: ["/whatsapp/shopify", "/whatsapp/commerce"],
    industryFit: ["Shopify Stores", "D2C Brands", "Fashion & Retail", "Dropshipping"]
  },

  // 9. Meta WhatsApp Catalog
  META_CATALOG: {
    key: "META_CATALOG",
    name: "Meta WhatsApp Catalog Engine",
    category: "INTEGRATIONS",
    icon: "📦",
    badgeColor: "#0084ff",
    tagline: "Native catalog browsing & cart checkout",
    description: "Display native WhatsApp Commerce product cards, collection sets, and process in-chat catalog orders with pincode auto-fill.",
    routes: ["/whatsapp/commerce", "/whatsapp/orders"],
    industryFit: ["D2C Brands", "Restaurants", "Grocery", "Wholesalers"]
  },

  // 10. Meta Pixel & CAPI Ad Tracking
  META_PIXEL_CAPI: {
    key: "META_PIXEL_CAPI",
    name: "Meta Pixel & CAPI Ad Tracking",
    category: "INTEGRATIONS",
    icon: "🎯",
    badgeColor: "#8b5cf6",
    tagline: "Conversions API, Pixel & Custom Audiences",
    description: "Server-side Meta Conversions API (CAPI), Purchase & Lead event tracking, and automated Custom Audience syncing for maximum Ad ROAS.",
    routes: ["/whatsapp/chatbots", "/whatsapp/chatbot-builder", "/whatsapp/campaigns"],
    industryFit: ["Performance Marketers", "Media Buyers", "E-Commerce", "Lead Gen"]
  },

  // 11. Payment Gateways
  PAYMENT_GATEWAY: {
    key: "PAYMENT_GATEWAY",
    name: "Payment Gateways & COD Recovery",
    category: "INTEGRATIONS",
    icon: "💳",
    badgeColor: "#f59e0b",
    tagline: "Razorpay, Cashfree, UPI QR & Partial COD",
    description: "Automated payment recovery links, dynamic UPI QR generation, token advance partial COD (₹ or %), and prepaid discount rules.",
    routes: ["/whatsapp/payments", "/whatsapp/orders"],
    industryFit: ["D2C Brands", "Online Stores", "Services", "Clinics"]
  }
};

export const ALL_MODULE_KEYS: ModuleKey[] = Object.keys(MASTER_MODULES) as ModuleKey[];

/**
 * Standard Plan Tier Defaults
 */
export interface PlanTierConfig {
  id: string;
  name: string;
  monthlyFee: number;
  badge: string;
  color: string;
  bg: string;
  border: string;
  monthlyMessageQuota: number;
  monthlyAiQuota: number;
  maxAgents: number;
  modules: ModuleKey[];
  tagline: string;
}

export const DEFAULT_PLAN_TIERS: PlanTierConfig[] = [
  {
    id: "STARTER",
    name: "Starter",
    monthlyFee: 999,
    badge: "ESSENTIAL",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    monthlyMessageQuota: 5000,
    monthlyAiQuota: 500,
    maxAgents: 3,
    modules: ["INBOX", "CHATBOT", "WIDGET", "PAYMENT_GATEWAY"],
    tagline: "Perfect for local businesses starting with WhatsApp support & payments"
  },
  {
    id: "GROWTH",
    name: "Growth",
    monthlyFee: 2499,
    badge: "POPULAR",
    color: "#4f46e5",
    bg: "#eef2ff",
    border: "#c7d2fe",
    monthlyMessageQuota: 25000,
    monthlyAiQuota: 2500,
    maxAgents: 8,
    modules: [
      "INBOX",
      "CHATBOT",
      "AI_AGENT",
      "BROADCASTS",
      "WIDGET",
      "SHOPIFY_INTEGRATION",
      "META_CATALOG",
      "PAYMENT_GATEWAY"
    ],
    tagline: "Built for scaling Shopify & D2C brands with catalog sales & AI auto-pilot"
  },
  {
    id: "BUSINESS",
    name: "Business Pro",
    monthlyFee: 4999,
    badge: "POWER",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    monthlyMessageQuota: 75000,
    monthlyAiQuota: 10000,
    maxAgents: 20,
    modules: [
      "INBOX",
      "CHATBOT",
      "AI_AGENT",
      "BROADCASTS",
      "WIDGET",
      "COBROWSE",
      "DEVELOPER_API",
      "SHOPIFY_INTEGRATION",
      "META_CATALOG",
      "META_PIXEL_CAPI",
      "PAYMENT_GATEWAY"
    ],
    tagline: "Full powerhouse with Meta CAPI ad tracking, Co-Browsing & developer APIs"
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise VIP",
    monthlyFee: 9999,
    badge: "UNLIMITED",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    monthlyMessageQuota: 250000,
    monthlyAiQuota: 50000,
    maxAgents: 100,
    modules: ALL_MODULE_KEYS,
    tagline: "All 11 modules & integrations with maximum quotas and VIP dedicated support"
  }
];

/**
 * Industry-Specific Presets for 1-Click Setup in Owner Portal
 */
export const INDUSTRY_MODULE_PRESETS: { name: string; icon: string; description: string; modules: ModuleKey[] }[] = [
  {
    name: "E-Commerce & D2C Brands",
    icon: "🛍️",
    description: "Shopify sync, Meta Catalog checkouts, Pincode auto-fill & Payment Gateway COD recovery",
    modules: [
      "INBOX",
      "CHATBOT",
      "AI_AGENT",
      "BROADCASTS",
      "WIDGET",
      "SHOPIFY_INTEGRATION",
      "META_CATALOG",
      "META_PIXEL_CAPI",
      "PAYMENT_GATEWAY"
    ]
  },
  {
    name: "Performance Marketers & Meta Ads",
    icon: "🎯",
    description: "Meta Pixel & CAPI conversion tracking, Custom Audiences, Meta Catalog & Broadcasts",
    modules: [
      "INBOX",
      "CHATBOT",
      "BROADCASTS",
      "META_PIXEL_CAPI",
      "META_CATALOG",
      "PAYMENT_GATEWAY",
      "WIDGET"
    ]
  },
  {
    name: "Real Estate & High-Ticket Leads",
    icon: "🏢",
    description: "Co-Browsing screen assist, AI FAQ agent, Meta CAPI lead tracking & Broadcasts",
    modules: [
      "INBOX",
      "CHATBOT",
      "AI_AGENT",
      "COBROWSE",
      "META_PIXEL_CAPI",
      "BROADCASTS",
      "WIDGET"
    ]
  },
  {
    name: "Clinics & Service Bookings",
    icon: "🏥",
    description: "Appointment booking, Website chat widget, AI auto-replies & Payment Gateway QR links",
    modules: [
      "INBOX",
      "CHATBOT",
      "AI_AGENT",
      "WIDGET",
      "BROADCASTS",
      "PAYMENT_GATEWAY"
    ]
  },
  {
    name: "API & SaaS Integrators",
    icon: "⚡",
    description: "Developer REST APIs, Outbound Webhooks, Team Inbox, Payment Gateway & Broadcasts",
    modules: [
      "INBOX",
      "CHATBOT",
      "DEVELOPER_API",
      "PAYMENT_GATEWAY",
      "WIDGET",
      "BROADCASTS"
    ]
  },
  {
    name: "Full Enterprise Suite (All 11 Modules)",
    icon: "👑",
    description: "Complete access to all 11 modules and official integrations",
    modules: ALL_MODULE_KEYS
  }
];

/**
 * Parses client enabledModules safely
 */
export function parseEnabledModules(raw: string | null | undefined): ModuleKey[] {
  if (!raw) return ALL_MODULE_KEYS;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const filtered = parsed.filter((k: any) => Object.prototype.hasOwnProperty.call(MASTER_MODULES, k));
      return filtered.length > 0 ? filtered : ALL_MODULE_KEYS;
    }
  } catch {
    // fallback
  }
  return ALL_MODULE_KEYS;
}

/**
 * Checks if a specific route is allowed for a client
 */
export function isRouteAllowed(route: string, enabledModules: ModuleKey[]): boolean {
  if (route === "/whatsapp" || route === "/whatsapp/dashboard") return true;

  for (const [modKey, def] of Object.entries(MASTER_MODULES)) {
    if (def.routes.some(r => route.startsWith(r))) {
      return enabledModules.includes(modKey as ModuleKey);
    }
  }
  return true;
}
