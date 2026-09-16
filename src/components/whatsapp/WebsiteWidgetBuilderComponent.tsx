"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Save,
  RefreshCw,
  Eye,
  Smartphone,
  CheckCircle2,
  MousePointerClick,
  Users,
  Percent,
  ShoppingBag,
  Globe,
  Code2,
  Tag,
  Cpu,
  Layers,
  ExternalLink,
  HelpCircle,
  Info,
  ShieldCheck,
  Terminal,
  Clock,
  Bell,
  PhoneCall,
  Building2,
  Stethoscope,
  Shirt,
  Factory,
  Laptop,
  Plus,
  Trash2,
  Sliders,
  ChevronRight,
  GraduationCap,
  BookOpen,
  CalendarDays,
  UserCheck,
  BadgePercent,
  BusFront,
  Home,
  Trophy,
  ClipboardList,
} from "lucide-react";


const COLOR_PRESETS = [
  { name: "WhatsApp Green", hex: "#25D366" },
  { name: "Indigo Modern", hex: "#4F46E5" },
  { name: "Ocean Sky", hex: "#0EA5E9" },
  { name: "Coral Rose", hex: "#E11D48" },
  { name: "Pitch Charcoal", hex: "#0F172A" },
];

interface Department {
  id: string;
  title: string;
  description: string;
  phone: string;
}

const CATEGORY_PRESETS = [
  {
    id: "GENERAL",
    name: "General Store",
    icon: Globe,
    heading: "Chat with us on WhatsApp",
    subheading: "Typically replies in a few minutes",
    welcome: "Hi! I have an inquiry from your website.",
    nudge: "👋 Need quick help? Chat with our team on WhatsApp!",
  },
  {
    id: "APPAREL",
    name: "Apparel & Fashion",
    icon: Shirt,
    heading: "Fashion & Sizing Assistance",
    subheading: "Chat with a stylist • Live video tour",
    welcome: "Hi! Inquiring about sizing, fabric quality, and video call catalog tour.",
    nudge: "👗 Need help with sizing or custom fitting? Chat with our stylist!",
  },
  {
    id: "WHOLESALE",
    name: "B2B & Wholesale",
    icon: Factory,
    heading: "Wholesale & Bulk Orders",
    subheading: "Direct factory pricing & MOQ terms",
    welcome: "Hi! Requesting bulk price sheet, MOQ details, and distributor terms.",
    nudge: "📦 Looking for wholesale rates or bulk volume discount? Inquire now!",
  },
  {
    id: "ELECTRONICS",
    name: "Electronics & Tech",
    icon: Laptop,
    heading: "Tech Support & Orders",
    subheading: "Check warranty & live inventory",
    welcome: "Hi! Checking stock availability, official warranty, and delivery turnaround.",
    nudge: "⚡ Have questions on warranty or specs? Chat with our product experts!",
  },
  {
    id: "HEALTHCARE",
    name: "Healthcare & Clinic",
    icon: Stethoscope,
    heading: "Clinic & Patient Care",
    subheading: "Appointment booking & inquiries",
    welcome: "Hi! Looking to book an appointment or inquire about treatments.",
    nudge: "🩺 Have a question about appointments or treatments? Message our clinic!",
  },
  {
    id: "REAL_ESTATE",
    name: "Real Estate & Homes",
    icon: Building2,
    heading: "Property & Site Visits",
    subheading: "Brochures, floor plans & visits",
    welcome: "Hi! Requesting brochure, floor plans, and site visit scheduling.",
    nudge: "🏡 Interested in pricing, floor plans, or site visits? Let's connect!",
  },
  {
    id: "EDUCATION",
    name: "Education & Academy",
    icon: GraduationCap,
    heading: "Admissions & Student Help",
    subheading: "Instant replies • Mon–Sat 8am–6pm",
    welcome: "Hi! I'm interested in learning more about admissions, courses, and fee structure.",
    nudge: "🎓 Admissions open! Chat with our counsellor for eligibility & scholarship details.",
  },
];

// Education department quick-fill presets
const EDU_DEPT_PRESETS = [
  {
    id: "admissions",
    title: "🎓 Admissions & Counselling",
    description: "Eligibility, seat availability, merit cutoffs, scholarship",
  },
  {
    id: "fees",
    title: "💳 Fee & Finance",
    description: "Fee structure, installment plans, scholarship payment",
  },
  {
    id: "academics",
    title: "📚 Academics & Curriculum",
    description: "Course syllabus, faculty, timetable, academic calendar",
  },
  {
    id: "exams",
    title: "📝 Exams & Results",
    description: "Exam schedule, hall tickets, result declaration, re-checking",
  },
  {
    id: "transport",
    title: "🚌 Transport & Hostel",
    description: "Bus routes, hostel availability, mess timings",
  },
  {
    id: "placement",
    title: "💼 Placement & Internship",
    description: "Campus recruiters, internship tie-ups, placement stats",
  },
];

const EDU_NUDGE_PRESETS = [
  "🎓 Admissions closing soon! Chat now for eligibility & scholarship info.",
  "📅 Last date to apply is approaching! Talk to our counsellor today.",
  "💡 Confused about which course to pick? We'll help you decide!",
  "📋 Results declared! Check your scorecard or request re-evaluation.",
  "🏆 Merit scholarships available! Chat to check if you qualify.",
  "📞 Fee installment plans available. Talk to our finance desk now!",
];


export default function WebsiteWidgetBuilderComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"shopify" | "wordpress" | "html" | "gtm">("shopify");

  // Basic Settings
  const [themeColor, setThemeColor] = useState("#25D366");
  const [position, setPosition] = useState("bottom-right");
  const [heading, setHeading] = useState("Chat with us on WhatsApp");
  const [subheading, setSubheading] = useState("Typically replies in a few minutes");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! I have an inquiry from your website.");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [requireLeadForm, setRequireLeadForm] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+91 74043 88242");
  const [embedSnippet, setEmbedSnippet] = useState("");
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);

  // Enterprise Superpowers
  const [clientCategory, setClientCategory] = useState("GENERAL");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [proactiveNudge, setProactiveNudge] = useState(false);
  const [nudgeDelaySeconds, setNudgeDelaySeconds] = useState(5);
  const [nudgeText, setNudgeText] = useState("👋 Need quick help or custom pricing? Chat with us!");
  const [enableCartRecovery, setEnableCartRecovery] = useState(false);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessHoursStart, setBusinessHoursStart] = useState("09:00");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [offlineNotice, setOfflineNotice] = useState("We are currently offline. Leave a message and we will get back to you during business hours!");

  // Education-Specific Settings
  const [instituteType, setInstituteType] = useState<"school" | "college" | "coaching" | "university" | "academy">("college");
  const [admissionModeEnabled, setAdmissionModeEnabled] = useState(false);
  const [admissionDeadline, setAdmissionDeadline] = useState("");
  const [admissionWelcome, setAdmissionWelcome] = useState("🎓 Admissions are OPEN! Chat with us for eligibility, seat availability & scholarship details.");
  const [feeReminderEnabled, setFeeReminderEnabled] = useState(false);
  const [feeReminderText, setFeeReminderText] = useState("💳 Fee payment due soon! Chat to know your balance, due date, or apply for an installment plan.");
  const [examNotifyEnabled, setExamNotifyEnabled] = useState(false);
  const [examNotifyText, setExamNotifyText] = useState("📝 Exam schedule released! Click to get your hall ticket, timetable, and exam prep resources.");
  const [attendanceAlertEnabled, setAttendanceAlertEnabled] = useState(false);
  const [attendanceAlertText, setAttendanceAlertText] = useState("⚠️ Low attendance detected! Chat with your class coordinator to avoid shortfall issues.");
  const [placementNotifyEnabled, setPlacementNotifyEnabled] = useState(false);
  const [placementNotifyText, setPlacementNotifyText] = useState("💼 Campus placements starting! Register on WhatsApp to get recruiter visit alerts.");
  const [scholarshipBannerEnabled, setScholarshipBannerEnabled] = useState(false);
  const [scholarshipText, setScholarshipText] = useState("🏆 Merit scholarships up to 100% available! Check your eligibility now.");

  // Simulator State
  const [simulatorOpen, setSimulatorOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"design" | "departments" | "nudge_hours" | "education">("design");

  // Fetch current config
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/widget/config");
      const data = await res.json();
      if (data.success && data.widget) {
        const w = data.widget;
        setThemeColor(w.themeColor || "#25D366");
        setPosition(w.position || "bottom-right");
        setHeading(w.heading || "Chat with us on WhatsApp");
        setSubheading(w.subheading || "Typically replies in a few minutes");
        setWelcomeMessage(w.welcomeMessage || "Hi! I have an inquiry from your website.");
        setAvatarUrl(w.avatarUrl || "");
        setRequireLeadForm(Boolean(w.requireLeadForm));
        setShowOnMobile(w.showOnMobile !== false);
        setAllowedDomains(w.allowedDomains || "");
        setPhoneNumber(w.phoneNumber || "+91 74043 88242");
        setEmbedSnippet(w.embedSnippet || "");
        setTotalClicks(w.totalClicks || 0);
        setTotalLeads(w.totalLeadsCaptured || 0);

        // Enterprise Superpowers
        setClientCategory(w.clientCategory || "GENERAL");
        setDepartments(Array.isArray(w.departments) ? w.departments : []);
        setProactiveNudge(Boolean(w.proactiveNudge));
        setNudgeDelaySeconds(w.nudgeDelaySeconds || 5);
        setNudgeText(w.nudgeText || "👋 Need quick help or custom pricing? Chat with us!");
        setEnableCartRecovery(Boolean(w.enableCartRecovery));
        setBusinessHoursEnabled(Boolean(w.businessHoursEnabled));
        setBusinessHoursStart(w.businessHoursStart || "09:00");
        setBusinessHoursEnd(w.businessHoursEnd || "18:00");
        setTimezone(w.timezone || "Asia/Kolkata");
        setOfflineNotice(w.offlineNotice || "We are currently offline. Leave a message and we will get back to you during business hours!");

        // Education Settings
        const edu = w.educationConfig || {};
        setInstituteType(edu.instituteType || "college");
        setAdmissionModeEnabled(Boolean(edu.admissionModeEnabled));
        setAdmissionDeadline(edu.admissionDeadline || "");
        setAdmissionWelcome(edu.admissionWelcome || "🎓 Admissions are OPEN! Chat with us for eligibility, seat availability & scholarship details.");
        setFeeReminderEnabled(Boolean(edu.feeReminderEnabled));
        setFeeReminderText(edu.feeReminderText || "💳 Fee payment due soon! Chat to know your balance, due date, or apply for an installment plan.");
        setExamNotifyEnabled(Boolean(edu.examNotifyEnabled));
        setExamNotifyText(edu.examNotifyText || "📝 Exam schedule released! Click to get your hall ticket, timetable, and exam prep resources.");
        setAttendanceAlertEnabled(Boolean(edu.attendanceAlertEnabled));
        setAttendanceAlertText(edu.attendanceAlertText || "⚠️ Low attendance detected! Chat with your class coordinator to avoid shortfall issues.");
        setPlacementNotifyEnabled(Boolean(edu.placementNotifyEnabled));
        setPlacementNotifyText(edu.placementNotifyText || "💼 Campus placements starting! Register on WhatsApp to get recruiter visit alerts.");
        setScholarshipBannerEnabled(Boolean(edu.scholarshipBannerEnabled));
        setScholarshipText(edu.scholarshipText || "🏆 Merit scholarships up to 100% available! Check your eligibility now.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleApplyCategoryPreset = (preset: typeof CATEGORY_PRESETS[0]) => {
    setClientCategory(preset.id);
    setHeading(preset.heading);
    setSubheading(preset.subheading);
    setWelcomeMessage(preset.welcome);
    setNudgeText(preset.nudge);
    // If switching to education, auto-add education departments and switch to education tab
    if (preset.id === "EDUCATION") {
      setThemeColor("#4F46E5");
      const eduDepts: Department[] = EDU_DEPT_PRESETS.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        phone: phoneNumber,
      }));
      setDepartments(eduDepts);
      setActiveTab("education");
    } else {
      // Clear any lingering education departments when switching to other presets
      setDepartments([]);
      // Switch back to design tab if currently on education tab
      setActiveTab((prev) => prev === "education" ? "design" : prev);
    }
  };

  const handleAddDepartment = () => {
    const newDept: Department = {
      id: "dept_" + Date.now(),
      title: "New Department",
      description: "Fast responses & specialized assistance",
      phone: phoneNumber,
    };
    setDepartments([...departments, newDept]);
  };

  const handleUpdateDepartment = (index: number, field: keyof Department, value: string) => {
    const updated = [...departments];
    updated[index] = { ...updated[index], [field]: value };
    setDepartments(updated);
  };

  const handleRemoveDepartment = (index: number) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/widget/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeColor,
          position,
          heading,
          subheading,
          welcomeMessage,
          avatarUrl,
          requireLeadForm,
          showOnMobile,
          allowedDomains,
          clientCategory,
          departments,
          proactiveNudge,
          nudgeDelaySeconds: Number(nudgeDelaySeconds),
          nudgeText,
          enableCartRecovery,
          businessHoursEnabled,
          businessHoursStart,
          businessHoursEnd,
          timezone,
          offlineNotice,
          educationConfig: clientCategory === "EDUCATION" ? {
            instituteType,
            admissionModeEnabled,
            admissionDeadline,
            admissionWelcome,
            feeReminderEnabled,
            feeReminderText,
            examNotifyEnabled,
            examNotifyText,
            attendanceAlertEnabled,
            attendanceAlertText,
            placementNotifyEnabled,
            placementNotifyText,
            scholarshipBannerEnabled,
            scholarshipText,
          } : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Widget configuration saved successfully!");
      } else {
        alert(data.error || "Failed to save widget settings.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const conversionRate = totalClicks > 0 ? ((totalLeads / totalClicks) * 100).toFixed(1) : "0.0";

  // Helper to format platform-specific snippet
  const getPlatformSnippet = (platform: "shopify" | "wordpress" | "html" | "gtm") => {
    const rawTag = embedSnippet || `<script src="https://whatsapp.esponsports.com/api/widget/script.js" async></script>`;
    switch (platform) {
      case "shopify":
        return `<!-- Whatmore WhatsApp Widget for Shopify -->\n<!-- Paste into Layout/theme.liquid right above </body> -->\n${rawTag}`;
      case "wordpress":
        return `<!-- Whatmore WhatsApp Widget for WordPress & WooCommerce -->\n<!-- Paste into WPCode > Header & Footer > Footer -->\n${rawTag}`;
      case "gtm":
        return `<!-- Whatmore WhatsApp Widget (GTM Custom HTML Tag) -->\n<!-- Set Trigger: All Pages (DOM Ready) -->\n${rawTag}`;
      case "html":
      default:
        return `<!-- Whatmore WhatsApp Widget (HTML, Webflow, Wix, Squarespace) -->\n<!-- Paste just before the closing </body> tag -->\n${rawTag}`;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl">
      {/* Top Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <MousePointerClick size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Widget Clicks</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalClicks.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Leads Captured</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalLeads.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
            <Percent size={22} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Capture Conversion</div>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{conversionRate}%</div>
          </div>
        </div>
      </div>

      {/* Multi-Category Industry Preset Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Sparkles size={16} />
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">
                Multi-Category Industry Presets
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 m-0 mt-0.5">
              Instantly adapt copy, greetings, and high-conversion behavior tailored to your specific vertical.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {CATEGORY_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = clientCategory === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyCategoryPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                  isSelected
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500"
                    : "bg-gray-50/60 dark:bg-slate-900/60 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`p-1.5 rounded-lg ${isSelected ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300"}`}>
                    <Icon size={16} />
                  </span>
                  {isSelected && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">{preset.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">{preset.heading}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform Setup Guide & Embed Snippet Suite */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Code2 size={18} />
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">
                Installation & Setup Guide
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 m-0 mt-1">
              Select your website platform below for step-by-step integration instructions and optimized code snippets.
            </p>
          </div>

          {/* Platform Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedPlatform("shopify")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "shopify"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <ShoppingBag size={14} /> Shopify
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform("wordpress")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "wordpress"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <Globe size={14} /> WordPress
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform("html")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "html"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <Code2 size={14} /> Custom HTML
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform("gtm")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedPlatform === "gtm"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
              }`}
            >
              <Tag size={14} /> GTM
            </button>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
              {selectedPlatform === "shopify" && "Shopify Liquid Snippet"}
              {selectedPlatform === "wordpress" && "WordPress / WooCommerce Header & Footer Snippet"}
              {selectedPlatform === "html" && "HTML Embed Snippet (Webflow, Wix, Static)"}
              {selectedPlatform === "gtm" && "Google Tag Manager Custom HTML Tag"}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getPlatformSnippet(selectedPlatform));
                setCopiedScript(true);
                setTimeout(() => setCopiedScript(false), 2000);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
            >
              {copiedScript ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedScript ? "Copied to Clipboard!" : "Copy Code"}</span>
            </button>
          </div>

          <pre className="p-4 bg-gray-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto m-0 border border-gray-800 leading-relaxed shadow-inner">
            {getPlatformSnippet(selectedPlatform)}
          </pre>
        </div>
      </div>

      {/* Main Grid: Customizer Controls + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Settings Tabs */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-xs flex flex-col gap-5">
          {/* Customizer Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white m-0">Widget Customizer</h3>
              <p className="text-xs text-gray-500 m-0 mt-0.5">Customize appearance, departments, and behavioral triggers.</p>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-700 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("design")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "design"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-slate-400"
                }`}
              >
                Design & Copy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("departments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "departments"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-slate-400"
                }`}
              >
                Departments ({departments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("nudge_hours")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "nudge_hours"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-slate-400"
                }`}
              >
                Nudges & Hours
              </button>
              {clientCategory === "EDUCATION" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("education")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTab === "education"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                  }`}
                >
                  <GraduationCap size={13} /> Education
                </button>
              )}
            </div>

          </div>

          {/* TAB 1: DESIGN & COPY */}
          {activeTab === "design" && (
            <div className="flex flex-col gap-4">
              {/* Theme Color */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-2">Theme Color</label>
                <div className="flex items-center gap-2 mb-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setThemeColor(preset.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        themeColor.toLowerCase() === preset.hex.toLowerCase()
                          ? "scale-110 border-indigo-600 shadow-sm"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    title="Custom Color"
                  />
                  <span className="text-xs font-mono font-bold text-gray-600 dark:text-slate-400 ml-2">{themeColor}</span>
                </div>
              </div>

              {/* Position Selector */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">Floating Position</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPosition("bottom-right")}
                    className={`p-2.5 text-xs font-bold rounded-xl border transition-all ${
                      position === "bottom-right"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                        : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    Bottom Right (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition("bottom-left")}
                    className={`p-2.5 text-xs font-bold rounded-xl border transition-all ${
                      position === "bottom-left"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                        : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    Bottom Left
                  </button>
                </div>
              </div>

              {/* Text Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Popup Heading</label>
                  <input
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Subheading</label>
                  <input
                    type="text"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1">Welcome Greeting Bubble</label>
                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>

              {/* Lead Capture Toggle */}
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">Require Name & Phone (Lead Capture Mode)</div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                    Collects visitor's name and mobile before redirecting to WhatsApp.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLeadForm}
                    onChange={(e) => setRequireLeadForm(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Shopify / WooCommerce Cart Recovery */}
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-emerald-600" />
                    Automated Cart Recovery Inspection
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                    Inspects Shopify / WooCommerce cart (<code>/cart.js</code>) and prompts visitor with a 1-click WhatsApp checkout assist.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCartRecovery}
                    onChange={(e) => setEnableCartRecovery(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-DEPARTMENT ROUTING */}
          {activeTab === "departments" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">Multi-Department Chat Routing</div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                    Route customer questions directly to specialized team members or branch numbers.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add Department
                </button>
              </div>

              {departments.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-500 text-xs">
                  No departments added yet. The widget will route all chats to the primary business WhatsApp number ({phoneNumber}).
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {departments.map((dept, index) => (
                    <div
                      key={dept.id || index}
                      className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          Department #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(index)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-0.5">Title</label>
                          <input
                            type="text"
                            value={dept.title}
                            onChange={(e) => handleUpdateDepartment(index, "title", e.target.value)}
                            placeholder="e.g. Sales & Bulk Pricing"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-0.5">WhatsApp Phone</label>
                          <input
                            type="text"
                            value={dept.phone}
                            onChange={(e) => handleUpdateDepartment(index, "phone", e.target.value)}
                            placeholder="e.g. 919876543210"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-0.5">Sub-description</label>
                        <input
                          type="text"
                          value={dept.description}
                          onChange={(e) => handleUpdateDepartment(index, "description", e.target.value)}
                          placeholder="e.g. Custom quotes, order status, and volume MOQ"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROACTIVE NUDGES & BUSINESS HOURS */}
          {activeTab === "nudge_hours" && (
            <div className="flex flex-col gap-4">
              {/* Proactive Nudge Settings */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Bell size={14} className="text-indigo-600 dark:text-indigo-400" />
                      Proactive Timed & Exit-Intent Nudge
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Pops up a friendly speech bubble beside the WhatsApp button to prompt visitors before they leave.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proactiveNudge}
                      onChange={(e) => setProactiveNudge(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {proactiveNudge && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200 dark:border-slate-800">
                    <div>
                      <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">
                        Delay (Seconds)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={nudgeDelaySeconds}
                        onChange={(e) => setNudgeDelaySeconds(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">
                        Speech Bubble Message
                      </label>
                      <input
                        type="text"
                        value={nudgeText}
                        onChange={(e) => setNudgeText(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Business Hours Schedule */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
                      Business Hours & Live Online Status
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Shows pulsating green dot badge when team is online; shows friendly offline notice after hours.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessHoursEnabled}
                      onChange={(e) => setBusinessHoursEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {businessHoursEnabled && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-gray-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">
                          Start Time (HH:mm)
                        </label>
                        <input
                          type="time"
                          value={businessHoursStart}
                          onChange={(e) => setBusinessHoursStart(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">
                          End Time (HH:mm)
                        </label>
                        <input
                          type="time"
                          value={businessHoursEnd}
                          onChange={(e) => setBusinessHoursEnd(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">
                        Offline Notice Banner
                      </label>
                      <textarea
                        rows={2}
                        value={offlineNotice}
                        onChange={(e) => setOfflineNotice(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* TAB 4: EDUCATION-SPECIFIC FEATURES */}
          {activeTab === "education" && clientCategory === "EDUCATION" && (
            <div className="flex flex-col gap-4">
              {/* Institute Type */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-indigo-600" /> Institute Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(["school", "college", "coaching", "university", "academy"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInstituteType(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                        instituteType === t
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-indigo-300"
                      }`}
                    >
                      {t === "school" && "🏫 "}{t === "college" && "🎓 "}{t === "coaching" && "📚 "}{t === "university" && "🏛️ "}{t === "academy" && "🥇 "}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admission Season Mode */}
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-indigo-600" /> Admission Season Mode
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Enables a banner showing seat availability, closing date, and an urgent CTA for prospective students.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={admissionModeEnabled} onChange={(e) => setAdmissionModeEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {admissionModeEnabled && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">Last Date to Apply</label>
                        <input type="date" value={admissionDeadline} onChange={(e) => setAdmissionDeadline(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block">Nudge Presets</label>
                        {EDU_NUDGE_PRESETS.slice(0, 2).map((n) => (
                          <button key={n} type="button" onClick={() => setAdmissionWelcome(n)}
                            className="px-2 py-1 text-[9.5px] text-left rounded-md border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all line-clamp-1">
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-gray-600 dark:text-slate-400 block mb-1">Admission Banner Message</label>
                      <textarea rows={2} value={admissionWelcome} onChange={(e) => setAdmissionWelcome(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Scholarship Banner */}
              <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-600" /> Scholarship & Merit Banner
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Highlights merit/need-based scholarships on the widget popup to attract quality applicants.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={scholarshipBannerEnabled} onChange={(e) => setScholarshipBannerEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {scholarshipBannerEnabled && (
                  <input type="text" value={scholarshipText} onChange={(e) => setScholarshipText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                )}
              </div>

              {/* Fee Reminder */}
              <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <BadgePercent size={14} className="text-rose-600" /> Fee Payment Reminder
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Proactively alerts students about upcoming payment due dates via the widget.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={feeReminderEnabled} onChange={(e) => setFeeReminderEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
                {feeReminderEnabled && (
                  <input type="text" value={feeReminderText} onChange={(e) => setFeeReminderText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                )}
              </div>

              {/* Exam Notification */}
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-emerald-600" /> Exam Schedule & Result Notifications
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Shows an exam/result banner with hall ticket download and schedule details on the widget.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={examNotifyEnabled} onChange={(e) => setExamNotifyEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {examNotifyEnabled && (
                  <input type="text" value={examNotifyText} onChange={(e) => setExamNotifyText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                )}
              </div>

              {/* Attendance Alert */}
              <div className="p-4 rounded-xl border border-orange-100 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck size={14} className="text-orange-600" /> Attendance Alert Banner
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Warns students with low attendance to take action via a WhatsApp chat with the coordinator.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={attendanceAlertEnabled} onChange={(e) => setAttendanceAlertEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                {attendanceAlertEnabled && (
                  <input type="text" value={attendanceAlertText} onChange={(e) => setAttendanceAlertText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                )}
              </div>

              {/* Placement Notifications */}
              <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Trophy size={14} className="text-purple-600" /> Placement & Campus Recruitment Alerts
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Push recruiter visit alerts, internship drives, and mock interview schedules via the widget.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={placementNotifyEnabled} onChange={(e) => setPlacementNotifyEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {placementNotifyEnabled && (
                  <input type="text" value={placementNotifyText} onChange={(e) => setPlacementNotifyText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                )}
              </div>

              {/* Education Nudge Presets Quick-Apply */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 flex flex-col gap-2">
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" /> Education Nudge Quick-Apply
                </div>
                <div className="text-[11px] text-gray-500 dark:text-slate-400 mb-1">Click any nudge to apply it to your proactive bubble message:</div>
                <div className="flex flex-col gap-1.5">
                  {EDU_NUDGE_PRESETS.map((n) => (
                    <button key={n} type="button" onClick={() => { setNudgeText(n); setProactiveNudge(true); }}
                      className="px-3 py-2 text-xs text-left rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all">
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Smartphone Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <Smartphone size={15} /> Live Interactive Simulator
          </div>

          {/* Phone Frame */}
          <div className="w-[320px] h-[600px] bg-slate-900 rounded-[38px] p-3 border-4 border-slate-700 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Phone Speaker & Camera Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full z-30" />

            {/* Simulated Webpage Content */}
            <div className="bg-slate-100 dark:bg-slate-950 w-full h-full rounded-[26px] overflow-hidden relative p-4 flex flex-col justify-between text-left">
              {/* Dummy Website Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
                  <div className="font-extrabold text-xs text-gray-800 dark:text-white">STOREFRONT</div>
                  <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-slate-700" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 bg-gray-300 dark:bg-slate-800 rounded-full w-3/4" />
                  <div className="h-2 bg-gray-200 dark:bg-slate-850 rounded-full w-full" />
                  <div className="h-2 bg-gray-200 dark:bg-slate-850 rounded-full w-5/6" />
                </div>

                {/* Simulated Category Badge */}
                <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                  <Tag size={10} /> {clientCategory} PRESET
                </div>
              </div>

              {/* Floating Widget In Simulator */}
              <div
                className={`absolute bottom-3 ${
                  position === "bottom-right" ? "right-3" : "left-3"
                } flex flex-col items-${position === "bottom-right" ? "end" : "start"} gap-2 z-20`}
              >
                {/* Proactive Nudge Bubble Preview (when card is closed) */}
                {proactiveNudge && !simulatorOpen && (
                  <div
                    onClick={() => setSimulatorOpen(true)}
                    className="w-[200px] p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 cursor-pointer animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-start gap-1.5 text-[10px] text-gray-800 dark:text-slate-200 font-semibold leading-tight">
                      <span>💬</span>
                      <span className="line-clamp-2">{nudgeText}</span>
                    </div>
                  </div>
                )}

                {/* Popup Card */}
                {simulatorOpen && (
                  <div className="w-[255px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[440px]">
                    {/* Header */}
                    <div
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: themeColor }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">💬</div>
                        <div>
                          <div className="text-[11px] font-bold leading-tight truncate">{heading}</div>
                          <div className="text-[9px] opacity-90 leading-tight flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block animate-pulse" />
                            {subheading}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSimulatorOpen(false)}
                        className="text-white text-sm font-bold opacity-80 hover:opacity-100"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2 overflow-y-auto">
                      {/* Admission Season Banner Preview */}
                      {clientCategory === "EDUCATION" && admissionModeEnabled && (
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[9.5px] text-indigo-800 dark:text-indigo-300">
                          <strong>🎓 {admissionWelcome.slice(0, 60)}{admissionWelcome.length > 60 ? "..." : ""}</strong>
                          {admissionDeadline && <div className="text-[8.5px] text-indigo-600 mt-0.5">📅 Last date: {admissionDeadline}</div>}
                        </div>
                      )}
                      {clientCategory === "EDUCATION" && scholarshipBannerEnabled && (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[9.5px] text-amber-800 dark:text-amber-300">
                          <strong>{scholarshipText.slice(0, 70)}{scholarshipText.length > 70 ? "..." : ""}</strong>
                        </div>
                      )}
                      {clientCategory === "EDUCATION" && feeReminderEnabled && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-[9.5px] text-rose-800 dark:text-rose-300">
                          <strong>{feeReminderText.slice(0, 60)}{feeReminderText.length > 60 ? "..." : ""}</strong>
                        </div>
                      )}

                      {/* Cart Recovery Banner Preview (non-education) */}
                      {clientCategory !== "EDUCATION" && enableCartRecovery && (

                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[9.5px] text-emerald-800 dark:text-emerald-300">
                          <strong>🛒 2 items in cart (₹2,499)</strong>
                          <div className="text-[8.5px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Need help or a discount code?
                          </div>
                        </div>
                      )}

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 text-[10.5px] text-gray-800 dark:text-slate-200 shadow-2xs border border-gray-100 dark:border-slate-800">
                        {welcomeMessage}
                      </div>

                      {/* Department List Preview */}
                      {departments.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Select Department:</span>
                          {departments.map((dept, i) => (
                            <div
                              key={i}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-center justify-between text-[10px] hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white leading-tight">{dept.title}</div>
                                <div className="text-[8.5px] text-gray-500 line-clamp-1">{dept.description}</div>
                              </div>
                              <ChevronRight size={12} className="text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}

                      {requireLeadForm ? (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <input
                            type="text"
                            placeholder="Your Name"
                            disabled
                            className="p-1.5 text-[10px] rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="tel"
                            placeholder="Mobile Number"
                            disabled
                            className="p-1.5 text-[10px] rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            className="p-2 text-[10px] font-bold rounded-md text-white shadow-xs text-center"
                            style={{ backgroundColor: themeColor }}
                          >
                            Start Chat ➔
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="p-2 text-[10.5px] font-bold rounded-lg text-white shadow-xs text-center mt-1"
                          style={{ backgroundColor: themeColor }}
                        >
                          Start WhatsApp Chat ➔
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Button with Live Status Badge */}
                <button
                  type="button"
                  onClick={() => setSimulatorOpen((prev) => !prev)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95 relative"
                  style={{ backgroundColor: themeColor }}
                >
                  <MessageSquare size={22} fill="white" />
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-ping" />
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
