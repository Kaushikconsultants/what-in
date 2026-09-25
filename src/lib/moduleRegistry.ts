/**
 * WhatMore SaaS — Modular Feature Gating & Module Registry
 * Defines all 13 core business modules, plan tier defaults, industry presets, and route mappings.
 */

export type ModuleKey =
  | "INBOX"
  | "CHATBOT"
  | "AI_AGENT"
  | "COMMERCE"
  | "PAYMENTS"
  | "BROADCASTS"
  | "WIDGET"
  | "COBROWSE"
  | "INVOICING"
  | "HRMS"
  | "RECRUITMENT"
  | "CRM"
  | "DEVELOPER_API";

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  category: "CORE" | "COMMERCE" | "OPERATIONS" | "INTELLIGENCE" | "ENTERPRISE";
  icon: string;
  badgeColor: string;
  tagline: string;
  description: string;
  routes: string[]; // Dashboard routes gated by this module
  industryFit: string[];
}

export const MASTER_MODULES: Record<ModuleKey, ModuleDefinition> = {
  INBOX: {
    key: "INBOX",
    name: "Live Team Inbox",
    category: "CORE",
    icon: "💬",
    badgeColor: "#10b981",
    tagline: "Multi-agent live chat, notes & quick replies",
    description: "Real-time WhatsApp team inbox with assignment, internal notes, canned responses, and collision avoidance.",
    routes: ["/whatsapp/inbox", "/whatsapp/direct-messages", "/whatsapp/team-inbox", "/whatsapp/reply-library"],
    industryFit: ["All Industries", "E-Commerce", "Support", "Services"]
  },
  CHATBOT: {
    key: "CHATBOT",
    name: "Visual Bot & Meta Flows",
    category: "CORE",
    icon: "🤖",
    badgeColor: "#6366f1",
    tagline: "Visual flowchart bot & native WhatsApp Flows",
    description: "Canvas-based chatbot automation, keyword triggers, and interactive native Meta WhatsApp Flows forms.",
    routes: ["/whatsapp/chatbot-builder", "/whatsapp/chatbots", "/whatsapp/flows", "/whatsapp/forms"],
    industryFit: ["All Industries", "Lead Generation", "E-Commerce", "Real Estate"]
  },
  AI_AGENT: {
    key: "AI_AGENT",
    name: "AI Auto-Pilot & Knowledge Base",
    category: "INTELLIGENCE",
    icon: "🧠",
    badgeColor: "#8b5cf6",
    tagline: "Autonomous Gemini / OpenAI customer agent",
    description: "Smart 24/7 AI agent trained on client documents, catalog FAQs, and intent-aware contextual conversation.",
    routes: ["/whatsapp/ai-automation"],
    industryFit: ["D2C", "Real Estate", "Consultancies", "Healthcare"]
  },
  COMMERCE: {
    key: "COMMERCE",
    name: "E-Commerce & Catalog Checkout",
    category: "COMMERCE",
    icon: "🛍️",
    badgeColor: "#ec4899",
    tagline: "Shopify sync & In-WhatsApp catalog order",
    description: "Real-time Shopify product sync, in-WhatsApp catalog ordering, automated pincode city/state auto-fill.",
    routes: ["/whatsapp/commerce", "/whatsapp/orders", "/whatsapp/shopify"],
    industryFit: ["D2C Brands", "Fashion & Apparel", "Retail", "Wholesale"]
  },
  PAYMENTS: {
    key: "PAYMENTS",
    name: "Payments & COD Advance Recovery",
    category: "COMMERCE",
    icon: "💳",
    badgeColor: "#f59e0b",
    tagline: "Razorpay, Cashfree, UPI & Partial COD",
    description: "Automated payment recovery links, dynamic UPI QR generation, token advance partial COD, and prepaid discounts.",
    routes: ["/whatsapp/payments"],
    industryFit: ["D2C Brands", "Services", "Clinics", "Agencies"]
  },
  BROADCASTS: {
    key: "BROADCASTS",
    name: "Bulk Broadcasts & Drip Campaigns",
    category: "CORE",
    icon: "📢",
    badgeColor: "#3b82f6",
    tagline: "Template messaging & scheduled sequences",
    description: "Meta-approved template campaigns, dynamic CSV customer import, segment filters, and multi-day drip sequences.",
    routes: ["/whatsapp/broadcasts", "/whatsapp/campaigns", "/whatsapp/templates", "/whatsapp/contacts", "/whatsapp/tags"],
    industryFit: ["Marketing", "EdTech", "Events", "Coaching"]
  },
  WIDGET: {
    key: "WIDGET",
    name: "Website Widget & Lead Radar",
    category: "OPERATIONS",
    icon: "🌐",
    badgeColor: "#14b8a6",
    tagline: "Zero-dependency web chat & lead forms",
    description: "Embeddable website widget script, proactive exit-intent speech bubble nudges, and visitor lead capture.",
    routes: ["/whatsapp/integrations"],
    industryFit: ["Websites", "Service Businesses", "Clinics", "Real Estate"]
  },
  COBROWSE: {
    key: "COBROWSE",
    name: "Live Co-Browsing Screen Assist",
    category: "ENTERPRISE",
    icon: "👁️",
    badgeColor: "#06b6d4",
    tagline: "Real-time visitor screen proxy & guidance",
    description: "Agent sees live visitor website view, dynamic island controls, cursor highlights, and guides high-ticket form fills.",
    routes: ["/whatsapp/inbox"],
    industryFit: ["Real Estate", "EdTech Admissions", "Luxury Services", "B2B SaaS"]
  },
  INVOICING: {
    key: "INVOICING",
    name: "GST Invoicing & Quotations",
    category: "OPERATIONS",
    icon: "📄",
    badgeColor: "#f97316",
    tagline: "Instant B2B GST quotes & invoice PDFs",
    description: "Generate branded GST Quotations and Tax Invoices with HSN codes, UPI QR payment codes, and send directly via WhatsApp.",
    routes: ["/whatsapp/commerce"],
    industryFit: ["B2B Wholesalers", "Manufacturers", "Agencies", "CA / Tax"]
  },
  HRMS: {
    key: "HRMS",
    name: "Staff Attendance & Leave HRMS",
    category: "OPERATIONS",
    icon: "👥",
    badgeColor: "#84cc16",
    tagline: "GPS punch-in, leave approval & salary slips",
    description: "Field staff WhatsApp GPS attendance, 1-tap interactive leave approval for managers, and monthly salary slip delivery.",
    routes: ["/whatsapp/contacts"],
    industryFit: ["Factories", "Hospitals & Clinics", "Schools", "Offices"]
  },
  RECRUITMENT: {
    key: "RECRUITMENT",
    name: "Candidate Screening & Hiring Bot",
    category: "OPERATIONS",
    icon: "📝",
    badgeColor: "#a855f7",
    tagline: "Resume intake, pre-screening & interview slots",
    description: "Automated candidate pre-screening via WhatsApp Flows, scoring applicant responses, and booking HR interview slots.",
    routes: ["/whatsapp/forms"],
    industryFit: ["Recruitment Agencies", "Corporate HR", "BPOs", "Delivery Teams"]
  },
  CRM: {
    key: "CRM",
    name: "Telecaller CRM & Sales Pipeline",
    category: "OPERATIONS",
    icon: "🎯",
    badgeColor: "#e11d48",
    tagline: "Call scripts, objections & follow-up queues",
    description: "Lead territory routing, agent call script cheatsheets, objection rebuttals, and automated follow-up reminder sequences.",
    routes: ["/whatsapp/contacts", "/whatsapp/analytics"],
    industryFit: ["Real Estate", "Visa Consultants", "Automotive", "Financial Services"]
  },
  DEVELOPER_API: {
    key: "DEVELOPER_API",
    name: "Developer APIs & Outbound Webhooks",
    category: "ENTERPRISE",
    icon: "⚡",
    badgeColor: "#64748b",
    tagline: "REST API keys & live webhook events",
    description: "Generate client API keys, register custom outbound webhook endpoints (Zapier / Make / custom CRM), and inspect raw logs.",
    routes: ["/whatsapp/api-settings", "/whatsapp/logs"],
    industryFit: ["Tech Enterprises", "SaaS Integrators", "Custom In-House Apps"]
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
    modules: ["INBOX", "CHATBOT", "WIDGET", "PAYMENTS"],
    tagline: "Perfect for small local businesses starting with WhatsApp support"
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
    modules: ["INBOX", "CHATBOT", "AI_AGENT", "COMMERCE", "PAYMENTS", "BROADCASTS", "WIDGET", "CRM"],
    tagline: "Built for scaling D2C brands, retail stores, and sales teams"
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
      "COMMERCE",
      "PAYMENTS",
      "BROADCASTS",
      "WIDGET",
      "COBROWSE",
      "INVOICING",
      "CRM",
      "DEVELOPER_API"
    ],
    tagline: "For B2B wholesalers, high-ticket agencies, and omni-channel commerce"
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
    tagline: "All 13 modules including HRMS, Recruitment, Co-Browsing & Custom APIs"
  }
];

/**
 * Industry-Specific Presets for 1-Click Setup in Owner Portal
 */
export const INDUSTRY_MODULE_PRESETS: { name: string; icon: string; description: string; modules: ModuleKey[] }[] = [
  {
    name: "E-Commerce & D2C Brands",
    icon: "🛍️",
    description: "Shopify sync, Catalog checkouts, Pincode auto-fill & COD advance recovery",
    modules: ["INBOX", "CHATBOT", "AI_AGENT", "COMMERCE", "PAYMENTS", "BROADCASTS", "WIDGET"]
  },
  {
    name: "Real Estate & High-Ticket",
    icon: "🏢",
    description: "Co-Browsing screen assist, CRM telecaller pipeline & interactive lead forms",
    modules: ["INBOX", "CHATBOT", "AI_AGENT", "COBROWSE", "CRM", "BROADCASTS", "WIDGET"]
  },
  {
    name: "B2B Wholesale & Manufacturing",
    icon: "🏭",
    description: "Instant GST Invoices, Quotation PDFs, Staff HRMS & Developer APIs",
    modules: ["INBOX", "CHATBOT", "INVOICING", "HRMS", "PAYMENTS", "DEVELOPER_API"]
  },
  {
    name: "Clinics, Hospitals & Healthcare",
    icon: "🏥",
    description: "Doctor appointment booking, staff attendance, website widget & AI FAQs",
    modules: ["INBOX", "CHATBOT", "AI_AGENT", "WIDGET", "HRMS", "BROADCASTS"]
  },
  {
    name: "Recruitment & Staffing Agencies",
    icon: "💼",
    description: "Candidate screening bot, resume intake, interview scheduling & CRM",
    modules: ["INBOX", "CHATBOT", "RECRUITMENT", "CRM", "BROADCASTS", "DEVELOPER_API"]
  },
  {
    name: "Full Enterprise OS (All Modules)",
    icon: "👑",
    description: "Complete unconstrained access to all 13 business automation modules",
    modules: ALL_MODULE_KEYS
  }
];

/**
 * Parses client enabledModules safely
 */
export function parseEnabledModules(raw: string | null | undefined): ModuleKey[] {
  if (!raw) return ALL_MODULE_KEYS; // Default: grant all if unset
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((k: any) => Object.prototype.hasOwnProperty.call(MASTER_MODULES, k));
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
  // Always permit core routes
  if (route === "/whatsapp" || route === "/whatsapp/dashboard") return true;

  // Find if route matches any module
  for (const [modKey, def] of Object.entries(MASTER_MODULES)) {
    if (def.routes.some(r => route.startsWith(r))) {
      return enabledModules.includes(modKey as ModuleKey);
    }
  }
  return true;
}
