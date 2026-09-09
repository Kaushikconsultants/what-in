"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileCode, Plus, Search, RefreshCw, CheckCircle2, Clock, AlertCircle,
  X, Send, Trash2, Eye, Info, Calendar, Zap, TrendingUp, Filter, Sparkles,
  ArrowUpDown, CheckCheck, Radio, Check, ArrowLeft, Layers, ShoppingBag,
  Tag, ChevronLeft, ChevronRight, ChevronDown, Image as ImageIcon, Link as LinkIcon,
  Phone, Copy, Smartphone, Upload, Clipboard, CheckSquare, PackageCheck,
  Truck, CreditCard, BellRing, FileText, Video, FileCheck, ExternalLink
} from "lucide-react";
import {
  getWhatsAppTemplates,
  saveWhatsAppTemplateAction,
  deleteWhatsAppTemplateAction,
  sendWhatsAppTemplateAction,
  getWhatsAppBrandDetailsAction,
  generateAITemplateAction,
  getWhatsAppInventoryCatalogAction,
  refreshTemplateStatusAction,
  resubmitCarouselTemplateAction
} from "@/app/actions/whatsAppPlatformActions";

// Meta API Constraints
const META_LIMITS = {
  NAME_MAX: 512,
  HEADER_MAX: 60,
  BODY_MAX: 1024,
  FOOTER_MAX: 60,
  BUTTON_TEXT_MAX: 25,
  BUTTON_URL_MAX: 2000,
  MAX_QUICK_REPLIES: 3,
  MAX_CTA_BUTTONS: 2,
  TOTAL_BUTTONS_MAX: 3,
  MAX_CAROUSEL_CARDS: 10,
};

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en", label: "English" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi (हिंदी)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "gu", label: "Gujarati (ગુજરાતી)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "ur", label: "Urdu (اردو)" },
  { code: "ar", label: "Arabic (عربي)" },
];

const CATEGORIES = [
  { value: "MARKETING", label: "📢 Marketing", desc: "Promotions, product showcases, seasonal offers, and re-engagement" },
  { value: "UTILITY", label: "⚙️ Utility", desc: "Order confirmation, shipping status, payment receipts, and critical account alerts" },
  { value: "AUTHENTICATION", label: "🔐 Authentication", desc: "One-time passwords (OTP) and login account verification codes" },
];

const getUtilityPresetsList = (brand: string, domain: string) => [
  {
    id: "ORDER_CONFIRMATION",
    label: "📦 Order Confirmation",
    desc: "Post-purchase customer transactional receipts",
    type: "STANDARD",
    category: "UTILITY",
    headerType: "NONE",
    body: `Hello {{1}}, your order #{{2}} for {{3}} has been confirmed! Total: ₹{{4}}. Track live: https://${domain}/orders/{{2}}`,
    footer: `${brand} Official Store`,
    variables: [
      { param: "{{1}}", name: "Customer Name", example: "Rohit", description: "Customer's first name" },
      { param: "{{2}}", name: "Order ID", example: "ESP-9482", description: "Store order reference" },
      { param: "{{3}}", name: "Items Summary", example: "2x Dry-Fit Tees", description: "Ordered product summary" },
      { param: "{{4}}", name: "Order Amount", example: "1,499", description: "Total paid amount" }
    ],
    buttons: [
      { type: "URL", text: "Track Order", url: `https://${domain}/track/{{1}}`, urlType: "DYNAMIC", urlExample: `https://${domain}/track/ESP-9482` },
      { type: "PHONE_NUMBER", text: "Customer Support", phone_number: "+917404388242" }
    ]
  },
  {
    id: "SHIPPING_UPDATE",
    header: "Payment Received",
    body: `Hi {{1}}, we have received your payment of ₹{{2}} for invoice #{{3}}. Thank you for choosing ${brand}!`,
    footer: `${brand} Accounts`
  },
  {
    id: "ACCOUNT_ALERT",
    label: "🔔 Account Alert",
    header: "Security Notice",
    body: `Hi {{1}}, this is an important update regarding your ${brand} account: {{2}}. If this was not you, please reply immediately.`,
    footer: `${brand} Security Desk`
  },
  {
    id: "CUSTOM_UTILITY",
    label: "📝 Custom Utility",
    header: "",
    body: "",
    footer: ""
  }
];

interface CarouselCardItem {
  id: string;
  mediaUrl: string;
  headerType: "IMAGE" | "VIDEO";
  title: string;
  bodyText: string;
  buttons: {
    type: "URL" | "QUICK_REPLY" | "PHONE_NUMBER";
    text: string;
    url?: string;
    urlType?: "STATIC" | "DYNAMIC";
    urlExample?: string;
    phone_number?: string;
  }[];
}

export default function WhatsAppTemplatesComponent() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeRangeFilter, setTimeRangeFilter] = useState<"ALL" | "TODAY" | "7D" | "30D">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most_used" | "highest_read" | "alphabetical">("newest");
  
  // Dynamic Brand Details & Intelligence from Database
  const [brandName, setBrandName] = useState("Espon Clothing");
  const [brandDomain, setBrandDomain] = useState("www.espon.in");
  const [brandPhone, setBrandPhone] = useState("+91 7206066678");
  const [brandEmail, setBrandEmail] = useState("clothingespon@gmail.com");
  const [hasAiKnowledge, setHasAiKnowledge] = useState(true);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [combosCount, setCombosCount] = useState<number>(0);

  // Page View Mode: 'LIST' or 'CREATE'
  const [viewMode, setViewMode] = useState<"LIST" | "CREATE">("LIST");

  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Live Clock
  const [liveCurrentTime, setLiveCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveCurrentTime(
        now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch brand details & AI intelligence on component mount
  useEffect(() => {
    getWhatsAppBrandDetailsAction().then((res) => {
      if (res && res.brandName) {
        setBrandName(res.brandName);
        if (res.brandDomain) setBrandDomain(res.brandDomain);
        if (res.phoneNumber || res.brandPhone) setBrandPhone(res.phoneNumber || res.brandPhone);
        if (res.brandEmail) setBrandEmail(res.brandEmail);
        if (res.hasAiKnowledge !== undefined) setHasAiKnowledge(res.hasAiKnowledge);
        if (res.productsCount) setProductsCount(res.productsCount);
        if (res.combosCount) setCombosCount(res.combosCount);

        // Also update initial carousel cards with real brand name & domain
        setCarouselCards([
          {
            id: "card_1",
            mediaUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80",
            headerType: "IMAGE",
            title: `${res.brandName} Performance Tee`,
            bodyText: "₹899 • Breathable 4-way stretch fabric",
            buttons: [
              { type: "URL", text: "Buy Now", url: `https://${res.brandDomain || "what-inn.tikal.in"}/products/tee`, urlType: "STATIC" },
              { type: "URL", text: "Explore More", url: `https://${res.brandDomain || "what-inn.tikal.in"}/collections/all`, urlType: "STATIC" }
            ]
          },
          {
            id: "card_2",
            mediaUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80",
            headerType: "IMAGE",
            title: `${res.brandName} Pro Shorts`,
            bodyText: "₹1,199 • Zipper pockets & sweat-wicking",
            buttons: [
              { type: "URL", text: "Buy Now", url: `https://${res.brandDomain || "what-inn.tikal.in"}/products/shorts`, urlType: "STATIC" },
              { type: "PHONE_NUMBER", text: "Call Us", phone_number: res.phoneNumber || res.brandPhone || "+917206066878" }
            ]
          }
        ]);
      }
    });
  }, []);

  // -------------------------------------------------------------
  // Full-Page Template Studio State
  // -------------------------------------------------------------
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [templateType, setTemplateType] = useState<
    "STANDARD" | "CAROUSEL" | "CATALOGUE" | "FLOWS" | "ORDER_DETAILS" | "ORDER_STATUS" | "CALL_PERMISSIONS" | "LTO_COUPON" | "AUTHENTICATION"
  >("STANDARD");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [utilityPreset, setUtilityPreset] = useState<string>("ORDER_CONFIRMATION");
  
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("en_US");
  
  // Header configuration
  const [headerType, setHeaderType] = useState<"NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT">("NONE");
  const [headerContent, setHeaderContent] = useState("");
  const [headerMediaPreview, setHeaderMediaPreview] = useState<string | null>(null);
  
  // Body & Footer
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<any[]>([]);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState("FLAT30");

  // Meta Official Extension States
  const [catalogueFormat, setCatalogueFormat] = useState<"CATALOGUE_MESSAGE" | "MULTI_PRODUCT">("CATALOGUE_MESSAGE");
  const [flowButtonText, setFlowButtonText] = useState("View Flow");
  const [authCodeDelivery, setAuthCodeDelivery] = useState<"COPY_CODE" | "ONE_TAP" | "ZERO_TAP">("COPY_CODE");
  const [authSecurityRecommendation, setAuthSecurityRecommendation] = useState(true);
  const [authExpiryTime, setAuthExpiryTime] = useState(false);
  const [authExpiryMinutes, setAuthExpiryMinutes] = useState(10);
  const [authPackageName, setAuthPackageName] = useState("com.whatin.app");
  const [authAppSignatureHash, setAuthAppSignatureHash] = useState("K4w8v9N2q1P");
  const [enableValidityPeriod, setEnableValidityPeriod] = useState(false);
  const [messageValidityPeriod, setMessageValidityPeriod] = useState(10);

  // Carousel Cards State (up to 10 product cards)
  const [carouselCards, setCarouselCards] = useState<CarouselCardItem[]>([
    {
      id: "card_1",
      mediaUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80",
      headerType: "IMAGE",
      title: "Espon Performance Tee",
      bodyText: "₹899 • Breathable 4-way stretch fabric",
      buttons: [
        { type: "URL", text: "Buy Now", url: "https://what-inn.tikal.in/products/tee", urlType: "STATIC" },
        { type: "URL", text: "Explore More", url: "https://what-inn.tikal.in/collections/all", urlType: "STATIC" }
      ]
    },
    {
      id: "card_2",
      mediaUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80",
      headerType: "IMAGE",
      title: "Espon Pro Shorts",
      bodyText: "₹1,199 • Zipper pockets & sweat-wicking",
      buttons: [
        { type: "URL", text: "Buy Now", url: "https://what-inn.tikal.in/products/shorts", urlType: "STATIC" },
        { type: "URL", text: "Explore More", url: "https://what-inn.tikal.in/collections/all", urlType: "STATIC" }
      ]
    }
  ]);
  const [activeCarouselCardIndex, setActiveCarouselCardIndex] = useState(0);

  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [refreshingTemplate, setRefreshingTemplate] = useState<string | null>(null);
  const [resubmittingTemplate, setResubmittingTemplate] = useState<string | null>(null);
  const [fastTrackModalTmpl, setFastTrackModalTmpl] = useState<any | null>(null);

  // -------------------------------------------------------------
  // AI Template Studio Co-Pilot State & Handlers
  // -------------------------------------------------------------
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<any | null>(null);
  const [aiIsOpen, setAiIsOpen] = useState(true);
  const [aiRefineInput, setAiRefineInput] = useState("");
  const [aiSelectedProducts, setAiSelectedProducts] = useState<any[]>([]);
  const [aiProductDropdownOpen, setAiProductDropdownOpen] = useState(false);
  const [aiProductSearch, setAiProductSearch] = useState("");
  const [aiTone, setAiTone] = useState<"Professional" | "Casual" | "Festive" | "Urgent" | "Luxury">("Professional");
  const [aiTranslating, setAiTranslating] = useState(false);
  // Compliance Modal State
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  // A/B Variants State
  const [aiVariants, setAiVariants] = useState<any[]>([]);
  const [aiVariantsLoading, setAiVariantsLoading] = useState(false);
  const [aiVariantIndex, setAiVariantIndex] = useState(0);

  const toggleSelectProductForAI = (p: any) => {
    setAiSelectedProducts((prev) => {
      const exists = prev.some((item) => item.id === p.id || item.handle === p.handle);
      if (exists) {
        return prev.filter((item) => item.id !== p.id && item.handle !== p.handle);
      } else {
        if (prev.length >= 10) {
          showToast("Maximum 10 products can be selected for a Carousel.", "error");
          return prev;
        }
        return [...prev, p];
      }
    });
  };

  const handleBuildCarouselFromAiSelected = () => {
    if (aiSelectedProducts.length === 0) {
      showToast("Please select at least 1 or 2 products from the dropdown first.", "error");
      return;
    }
    setTemplateType("CAROUSEL");
    const cards: CarouselCardItem[] = aiSelectedProducts.map((p, idx) => ({
      id: `card_${idx + 1}_${Date.now()}`,
      mediaUrl: p.primaryImage || (p.images && p.images[0]) || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      headerType: "IMAGE",
      title: p.name,
      bodyText: `₹${p.sellingPrice} (MRP ₹${p.mrp}) • ${p.category || 'Apparel'}`,
      buttons: [
        {
          type: "URL",
          text: "Buy Now",
          url: p.productUrl || `https://${brandDomain}/products/${p.handle || p.sku || 'item'}`,
          urlType: "STATIC"
        },
        idx % 2 === 0
          ? {
              type: "URL",
              text: "Explore More",
              url: `https://${brandDomain}/collections/all`,
              urlType: "STATIC"
            }
          : {
              type: "PHONE_NUMBER",
              text: "Call Us",
              phone_number: brandPhone
            }
      ]
    }));

    setCarouselCards(cards);
    const cleanNames = aiSelectedProducts.map(p => p.name).join(", ");
    setTemplateName(`carousel_${Date.now().toString().slice(-4)}`);
    setNameError("");
    setBodyText(`Hi {{1}}, explore our featured collection at ${brandName} including ${cleanNames.slice(0, 80)}! Swipe through the carousel below and use code *${couponCode || 'FLAT30'}* at checkout:`);
    setFooterText(`${brandName} Store | Official Online Shop`);
    setButtons([
      { type: "URL", text: "Shop Full Store", url: `https://${brandDomain}`, urlType: "STATIC" },
      { type: "COPY_CODE", text: "Copy Coupon", code: couponCode || "FLAT30" }
    ]);
    showToast(`✨ Generated ${cards.length} carousel cards from your selected products!`, "success");
  };

  const handleGenerateWithAI = async (customPrompt?: string) => {
    let promptToUse = (customPrompt || aiPrompt).trim();
    if (!promptToUse && aiSelectedProducts.length > 0) {
      promptToUse = `Create a high-converting product carousel template for ${brandName} featuring: ${aiSelectedProducts.map(p => p.name).join(", ")}.`;
      setAiPrompt(promptToUse);
    }
    // Prepend tone instruction unless it's already a refine/composite prompt
    if (promptToUse && !customPrompt && aiTone !== "Professional") {
      promptToUse = `[Tone: ${aiTone}] ${promptToUse}`;
    }
    if (!promptToUse) {
      showToast("Please describe the template or select products to include.", "error");
      return;
    }
    setAiGenerating(true);
    try {
      // Smart intent resolution for requested templateType
      let requestedTemplateType = templateType;
      if (aiSelectedProducts.length > 0) {
        requestedTemplateType = "CAROUSEL";
      } else if (/\b(carousel|carusel|swipeable\s*cards?|product\s*cards?|multi\s*cards?)\b/i.test(promptToUse)) {
        requestedTemplateType = "CAROUSEL";
      } else if (/review|feedback|rating|rate\s*(our|the|your)?\s*(order|experience)|testimonial/i.test(promptToUse)) {
        requestedTemplateType = "STANDARD";
      } else if (/track|order\s*(status|dispatch|update)|awb/i.test(promptToUse)) {
        requestedTemplateType = "ORDER_STATUS";
      } else if (/cart|checkout|abandon/i.test(promptToUse)) {
        requestedTemplateType = "STANDARD";
      } else if (templateType === "CAROUSEL" && aiSelectedProducts.length === 0) {
        requestedTemplateType = "STANDARD";
      }

      const res = await generateAITemplateAction(promptToUse, {
        category,
        templateType: requestedTemplateType,
        brandName,
        brandDomain,
        selectedProducts: aiSelectedProducts,
        currentDraft: {
          templateName,
          bodyText,
          headerType,
          headerContent
        }
      });
      if (res.success && res.template) {
        setAiDraft(res);
        // Auto-apply directly into the Studio Form and Live Smartphone Preview
        handleApplyAIDraft(res);
        showToast("✨ AI generated & loaded template into studio and live simulator!", "success");
      } else {
        showToast(res.error || "Failed to generate AI template.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "AI generation failed.", "error");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAIDraft = (draftData = aiDraft) => {
    if (!draftData || !draftData.template) return;
    const t = draftData.template;

    if (t.name) {
      const cleanName = t.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      setTemplateName(cleanName);
      setNameError("");
    }
    if (t.category) setCategory(t.category);
    if (t.language) setLanguage(t.language);

    // Force CAROUSEL type only whenever valid carousel cards are present
    const hasCards = t.carouselCards && Array.isArray(t.carouselCards) && t.carouselCards.length > 0;
    const resolvedType = hasCards ? "CAROUSEL" : (t.templateType || "STANDARD");
    setTemplateType(resolvedType);

    // For carousel, Meta requires headerType NONE at the template level
    if (resolvedType === "CAROUSEL") {
      setHeaderType("NONE");
      if (hasCards) {
        setCarouselCards(t.carouselCards);
        setActiveCarouselCardIndex(0);
      }
    } else {
      // Clear carousel cards when switching to standard / utility / non-carousel template
      setCarouselCards([]);
      setHeaderType(t.headerType || "NONE");
      setHeaderContent(t.headerContent || "");
      setHeaderMediaPreview(t.headerMediaUrl || null);
    }

    if (t.bodyText) setBodyText(t.bodyText);
    if (t.footerText) setFooterText(t.footerText);

    if (t.buttons && Array.isArray(t.buttons)) {
      setButtons(t.buttons);
    }
    if (t.couponCode) setCouponCode(t.couponCode);

    showToast(`🎉 AI Template ${hasCards ? `(${t.carouselCards.length}-card Carousel)` : ''} loaded into Studio & phone simulator!`, "success");
  };

  const handleRefineAIDraft = async () => {
    if (!aiRefineInput.trim()) return;
    const compositePrompt = `Previous Draft: "${aiDraft?.template?.bodyText}". User revision: "${aiRefineInput}". Brand: ${brandName}. Ensure Meta compliance.`;
    setAiRefineInput("");
    await handleGenerateWithAI(compositePrompt);
  };

  // Translate current template body into another language via AI
  const handleTranslateTemplate = async (targetLang: string) => {
    if (!bodyText.trim()) { showToast("Write the body text first before translating.", "error"); return; }
    setAiTranslating(true);
    try {
      const prompt = `Translate the following WhatsApp template body text into ${targetLang} while keeping ALL variable placeholders ({{1}}, {{2}}, etc.) intact, keeping the brand name "${brandName}" unchanged, and keeping it Meta-compliant and high-converting. Return ONLY the translated body text, no extra explanation.\n\nOriginal:\n${bodyText}`;
      const res = await generateAITemplateAction(prompt, { category, templateType, brandName, brandDomain });
      if (res.success && res.template?.bodyText) {
        setBodyText(res.template.bodyText);
        if (res.template.footerText) setFooterText(res.template.footerText);
        showToast(`✅ Template translated to ${targetLang}!`, "success");
      }
    } catch (e: any) {
      showToast(e.message || "Translation failed.", "error");
    } finally {
      setAiTranslating(false);
    }
  };

  // Generate 3 A/B Variants of the same prompt
  const handleGenerateVariants = async () => {
    if (!aiPrompt.trim() && aiSelectedProducts.length === 0) {
      showToast("Enter a prompt or select products first.", "error"); return;
    }
    setAiVariantsLoading(true);
    setAiVariants([]);
    try {
      const basePrompt = aiPrompt.trim() || `Create a high-converting product carousel for ${brandName}`;
      const variantPrompts = [
        `${basePrompt} — Tone: ${aiTone}. Variant 1: concise and punchy.`,
        `${basePrompt} — Tone: ${aiTone}. Variant 2: detailed with key features highlighted.`,
        `${basePrompt} — Tone: ${aiTone}. Variant 3: urgency-driven with limited-time offer framing.`
      ];
      const results = await Promise.all(
        variantPrompts.map(p => {
          let vType = templateType;
          if (aiSelectedProducts.length > 0 || /\b(carousel|carusel|swipeable\s*cards?|product\s*cards?)\b/i.test(p)) {
            vType = "CAROUSEL";
          } else if (/review|feedback|rating|track|order|cart/i.test(p) || (templateType === "CAROUSEL" && aiSelectedProducts.length === 0)) {
            vType = "STANDARD";
          }
          return generateAITemplateAction(p, { category, templateType: vType, brandName, brandDomain, selectedProducts: aiSelectedProducts });
        })
      );
      const valid = results.filter(r => r.success && r.template);
      if (valid.length > 0) {
        setAiVariants(valid);
        setAiVariantIndex(0);
        showToast(`✨ Generated ${valid.length} variants — pick your favorite!`, "success");
      } else {
        showToast("Failed to generate variants. Try a more specific prompt.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Variant generation failed.", "error");
    } finally {
      setAiVariantsLoading(false);
    }
  };

  // Clone a saved template into the studio editor
  const handleCloneTemplate = (t: any) => {
    const clonedName = `${(t.name || 'template').replace(/_v\d+$/, '')}_v${Date.now().toString().slice(-4)}`;
    setTemplateName(clonedName);
    setNameError("");
    setCategory(t.category || "MARKETING");
    setTemplateType(t.templateType || "STANDARD");
    setLanguage(t.language || "en_US");
    setHeaderType(t.headerType || "NONE");
    setHeaderContent(t.headerContent || "");
    setBodyText(t.bodyText || "");
    setFooterText(t.footerText || "");
    try { const btns = JSON.parse(t.buttons || "[]"); setButtons(Array.isArray(btns) ? btns : []); } catch { setButtons([]); }
    if (t.templateType === "CAROUSEL" && t.carouselCards) {
      try { const cards = JSON.parse(t.carouselCards); if (Array.isArray(cards)) setCarouselCards(cards); } catch {}
    }
    setViewMode("CREATE");
    showToast(`📋 Cloned "${t.name}" — edit and save as "${clonedName}"`, "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Compliance checks before saving
  const runComplianceChecks = () => {
    const issues: { label: string; pass: boolean; message: string }[] = [];
    issues.push({ label: "Template Name", pass: /^[a-z0-9_]+$/.test(templateName) && templateName.length >= 3, message: "Must be lowercase letters, numbers, underscores. Min 3 chars." });
    issues.push({ label: "Body Text", pass: bodyText.trim().length >= 10, message: "Body text must be at least 10 characters." });
    issues.push({ label: "Body Length", pass: bodyText.length <= 1024, message: `Body is ${bodyText.length}/1024 chars.` });
    issues.push({ label: "Footer Length", pass: !footerText || footerText.length <= 60, message: `Footer is ${footerText.length}/60 chars.` });
    issues.push({ label: "Button Count", pass: buttons.length <= 3, message: `Max 3 buttons. Currently ${buttons.length}.` });
    issues.push({ label: "Button Text Length", pass: buttons.every(b => (b.text || "").length <= 25), message: "All button labels must be ≤25 chars." });
    if (templateType === "CAROUSEL") {
      issues.push({ label: "Carousel Cards", pass: carouselCards.length >= 2 && carouselCards.length <= 10, message: `Need 2–10 cards. Currently ${carouselCards.length}.` });
      issues.push({ label: "Card Images", pass: carouselCards.every(c => !!c.mediaUrl), message: "All carousel cards must have an image." });
    }
    const varRegex = /\{\{(\d+)\}\}/g;
    const nums: number[] = []; let m;
    while ((m = varRegex.exec(bodyText)) !== null) nums.push(parseInt(m[1]));
    const sorted = [...nums].sort((a,b) => a-b);
    const sequential = sorted.every((v, i) => v === i + 1);
    issues.push({ label: "Variable Numbering", pass: nums.length === 0 || sequential, message: "Variables must be sequential: {{1}}, {{2}}, {{3}}..." });
    const prohibitedWords = /\b(100% free|guaranteed|click here|limited time only)\b/i;
    issues.push({ label: "Prohibited Phrases", pass: !prohibitedWords.test(bodyText), message: "Avoid phrases like '100% free', 'Guaranteed', 'Click here'." });
    return issues;
  };

  // -------------------------------------------------------------
  // Live Store Inventory & Product Injector State
  // -------------------------------------------------------------
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<string[]>([]);
  const [inventoryCombos, setInventoryCombos] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("ALL");
  const [inventoryInStockOnly, setInventoryInStockOnly] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({ totalProducts: 0, inStockProducts: 0, categoriesCount: 0 });
  const [inventoryDrawerOpen, setInventoryDrawerOpen] = useState(true);

  const fetchInventory = async (search = inventorySearch, cat = inventoryCategoryFilter, inStock = inventoryInStockOnly) => {
    setInventoryLoading(true);
    try {
      const res = await getWhatsAppInventoryCatalogAction({
        search,
        category: cat,
        inStockOnly: inStock,
        limit: 60
      });
      if (res.success) {
        setInventoryProducts(res.products || []);
        setInventoryCategories(res.categories || []);
        setInventoryCombos(res.combos || []);
        if (res.stats) setInventoryStats(res.stats);
      }
    } catch (e) {
      console.error("Failed to fetch inventory catalog:", e);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [inventoryCategoryFilter, inventoryInStockOnly]);

  // Product Direct Injection Handlers
  const handleInjectProductAsHeader = (p: any) => {
    setHeaderType("IMAGE");
    setHeaderMediaPreview(p.primaryImage || (p.images && p.images[0]) || null);
    setHeaderContent("");

    if (!templateName || templateName.startsWith("custom_") || templateName.startsWith("promo_")) {
      const slug = (p.name || "product").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30);
      setTemplateName(`promo_${slug}`);
      setNameError("");
    }

    if (!bodyText || bodyText.length < 10) {
      setBodyText(
        `Hi {{1}}, check out our bestseller *${p.name}* at ${brandName}! 🔥\n\nGrab yours today for only *₹${p.sellingPrice}* (MRP ₹${p.mrp || p.sellingPrice} • ${p.discountPercent}% OFF). Crafted with ${p.fabric || 'premium fabric'} for ultimate comfort.\n\nUse code *${couponCode || 'FLAT30'}* at checkout for extra savings!`
      );
    }

    if (!footerText) {
      setFooterText(`${brandName} | Limited Stock Available`);
    }

    setButtons([
      {
        type: "URL",
        text: "Buy Now",
        url: p.productUrl || `https://${brandDomain}/products/${p.sku || 'item'}`,
        urlType: "STATIC"
      },
      {
        type: "COPY_CODE",
        text: "Copy Coupon",
        code: couponCode || "FLAT30"
      },
      {
        type: "PHONE_NUMBER",
        text: "Order on Call",
        phone_number: brandPhone
      }
    ]);

    showToast(`🖼️ Injected "${p.name}" photo, price & Buy Now link into Header!`, "success");
  };

  const handleInjectProductAsCarouselCard = (p: any) => {
    setTemplateType("CAROUSEL");
    const newCard: CarouselCardItem = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      mediaUrl: p.primaryImage || (p.images && p.images[0]) || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      headerType: "IMAGE",
      title: p.name,
      bodyText: `₹${p.sellingPrice} (MRP ₹${p.mrp}) • ${p.category || 'Apparel'}`,
      buttons: [
        {
          type: "URL",
          text: "Buy Now",
          url: p.productUrl || `https://${brandDomain}/products/${p.handle || p.sku || 'item'}`,
          urlType: "STATIC"
        },
        {
          type: "URL",
          text: "Explore More",
          url: `https://${brandDomain}/collections/all`,
          urlType: "STATIC"
        }
      ]
    };

    if (!bodyText) {
      setBodyText(`Hi {{1}}, explore top trending styles from ${brandName}! Swipe through our curated collection below:`);
    }

    setCarouselCards(prev => [...prev, newCard]);
    showToast(`➕ Added "${p.name}" with photo & Buy Now link to Carousel Cards!`, "success");
  };

  const handleAutoFillCarouselWithTopProducts = () => {
    setTemplateType("CAROUSEL");
    const inStockList = inventoryProducts.filter(p => p.inStock);
    const itemsToUse = inStockList.length >= 2 ? inStockList.slice(0, 4) : inventoryProducts.slice(0, 3);

    if (itemsToUse.length === 0) {
      showToast("No products found in inventory to populate carousel.", "error");
      return;
    }

    const generatedCards: CarouselCardItem[] = itemsToUse.map((p, idx) => ({
      id: `card_${idx + 1}_${Date.now()}`,
      mediaUrl: p.primaryImage || (p.images && p.images[0]) || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      headerType: "IMAGE",
      title: p.name,
      bodyText: `₹${p.sellingPrice} (MRP ₹${p.mrp}) • ${p.category || 'Apparel'}`,
      buttons: [
        {
          type: "URL",
          text: "Buy Now",
          url: p.productUrl || `https://${brandDomain}/products/${p.handle || p.sku || 'item'}`,
          urlType: "STATIC"
        },
        idx % 2 === 0
          ? {
              type: "URL",
              text: "Explore More",
              url: `https://${brandDomain}/collections/all`,
              urlType: "STATIC"
            }
          : {
              type: "PHONE_NUMBER",
              text: "Call Us",
              phone_number: brandPhone
            }
      ]
    }));

    setCarouselCards(generatedCards);
    setTemplateName(`carousel_collection_${Date.now().toString().slice(-4)}`);
    setNameError("");
    setBodyText(`Hi {{1}}, check out the top trending collections at ${brandName}! Swipe through the carousel below and use code *${couponCode || 'FLAT30'}* at checkout:`);
    setFooterText(`${brandName} Store | Official Online Shop`);
    setButtons([
      { type: "URL", text: "Shop Full Store", url: `https://${brandDomain}`, urlType: "STATIC" },
      { type: "COPY_CODE", text: "Copy Coupon", code: couponCode || "FLAT30" }
    ]);

    showToast(`✨ Successfully auto-populated ${generatedCards.length} product cards with live inventory photos & links!`, "success");
  };

  const handleInjectProductIntoBody = (p: any) => {
    const snippet = `\n• *${p.name}* — ₹${p.sellingPrice} (MRP ₹${p.mrp} • ${p.discountPercent}% OFF)`;
    setBodyText(prev => (prev ? `${prev}${snippet}` : `Hi {{1}}, check out *${p.name}* at ₹${p.sellingPrice}! Link: ${p.productUrl}`));
    showToast(`📝 Injected "${p.name}" details into body message!`, "success");
  };

  const handlePromptAIForProduct = (p: any) => {
    const promptText = `Create a high-converting promotional template for ${p.name} (Selling Price: ₹${p.sellingPrice}, MRP: ₹${p.mrp}, Category: ${p.category}) with image header, urgency discount code ${couponCode || 'FLAT30'}, and direct shop now CTA button.`;
    setAiPrompt(promptText);
    setAiIsOpen(true);
    handleGenerateWithAI(promptText);
  };

  // Test send state
  const [testPhone, setTestPhone] = useState("");
  const [testingTemplate, setTestingTemplate] = useState<string | null>(null);

  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await getWhatsAppTemplates();
    if (res.success) setTemplates(res.templates || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Utility Preset Handler
  const applyUtilityPreset = (presetId: string, activeBrand = brandName, activeDomain = brandDomain) => {
    setUtilityPreset(presetId);
    const presets = getUtilityPresetsList(activeBrand, activeDomain);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      if (preset.header) {
        setHeaderType("TEXT");
        setHeaderContent(preset.header);
      } else {
        setHeaderType("NONE");
        setHeaderContent("");
      }
      setBodyText(preset.body);
      setFooterText(preset.footer);
      if (presetId === "ORDER_CONFIRMATION" || presetId === "SHIPPING_UPDATE") {
        setButtons([
          {
            type: "URL",
            text: "Track Order",
            url: `https://${activeDomain}/track/{{1}}`,
            urlType: "DYNAMIC",
            urlExample: "ESP-88294"
          }
        ]);
      } else {
        setButtons([]);
      }
    }
  };

  // Template Type Switch Handler with Meta Presets
  const handleTemplateTypeSelect = (type: typeof templateType) => {
    setTemplateType(type);
    if (type === "CAROUSEL") {
      if (!bodyText) setBodyText(`Check out our top ${brandName} collections this season:`);
    } else if (type === "CATALOGUE") {
      setBodyText(`Hello {{1}}, explore our full ${brandName} catalogue directly on WhatsApp!`);
      setFooterText(`${brandName} Store`);
      setHeaderType("NONE");
      setButtons([{ type: "CATALOG", text: "View catalog" }]);
    } else if (type === "FLOWS") {
      setBodyText(`Hello {{1}}, please fill out this quick form so our ${brandName} team can assist you:`);
      setFooterText(`${brandName} Support`);
      setButtons([{ type: "FLOW", text: flowButtonText || "View Flow" }]);
    } else if (type === "ORDER_DETAILS") {
      setBodyText(`Hello {{1}}, your order details are ready. Tap below to review and pay securely:`);
      setFooterText(`${brandName} Pay`);
      setButtons([{ type: "ORDER_DETAILS", text: "Review and Pay" }]);
    } else if (type === "ORDER_STATUS") {
      setBodyText(`Good news! Your order #{{1}} from ${brandName} has been dispatched! Track your shipment below:`);
      setFooterText(`${brandName} Logistics`);
      setButtons([
        {
          type: "URL",
          text: "Track shipment",
          url: `https://${brandDomain}/track/{{1}}`,
          urlType: "DYNAMIC",
          urlExample: "ESP-88294"
        }
      ]);
    } else if (type === "CALL_PERMISSIONS") {
      setBodyText(`Hello {{1}}`);
      setFooterText(`${brandName} Support`);
      setButtons([{ type: "CALL_PERMISSION", text: "Choose preference" }]);
    } else if (type === "LTO_COUPON") {
      setBodyText(`Special offer! Get FLAT 30% OFF on all ${brandName} gear. Use coupon code below at checkout:`);
      setFooterText(`Limited time only | Valid this week`);
      setButtons([{ type: "COPY_CODE", text: "Copy Code", code: couponCode || "FLAT30", isDynamicCode: false, exampleCode: couponCode || "FLAT30" }]);
    } else if (type === "AUTHENTICATION") {
      setBodyText(`{{1}} is your ${brandName} verification code. For your security, do not share this code.`);
      setFooterText("Code expires in 10 minutes");
      setButtons([{ type: "COPY_CODE", text: "Copy Code", code: "{{1}}", isDynamicCode: true, exampleCode: "583920" }]);
    }
  };

  // Category Switch Handler
  const handleCategorySelect = (selectedCat: "MARKETING" | "UTILITY" | "AUTHENTICATION") => {
    setCategory(selectedCat);
    if (selectedCat === "UTILITY") {
      setTemplateType("STANDARD");
      applyUtilityPreset("ORDER_CONFIRMATION", brandName, brandDomain);
    } else if (selectedCat === "AUTHENTICATION") {
      setTemplateType("AUTHENTICATION");
      setHeaderType("NONE");
      setHeaderContent("");
      setHeaderMediaPreview(null);
      setBodyText(`{{1}} is your ${brandName} verification code. For your security, do not share this code.`);
      setFooterText("Code expires in 10 minutes");
      setButtons([{ type: "COPY_CODE", text: "Copy Code", code: "{{1}}", isDynamicCode: true, exampleCode: "583920" }]);
    } else {
      // Marketing
      setTemplateType("STANDARD");
      setBodyText("");
      setFooterText(`${brandName} | Reply STOP to unsubscribe`);
    }
  };

  // Image Upload and Paste Handlers
  const handleFileProcess = (file: File, target: "HEADER" | "CAROUSEL_CARD", cardIdx?: number) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("application/pdf")) {
      showToast("Please upload a valid image, video, or PDF file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (target === "HEADER") {
        setHeaderMediaPreview(result);
        if (file.type.startsWith("video/")) setHeaderType("VIDEO");
        else if (file.type.startsWith("application/pdf")) setHeaderType("DOCUMENT");
        else setHeaderType("IMAGE");
      } else if (target === "CAROUSEL_CARD" && typeof cardIdx === "number") {
        setCarouselCards((prev) =>
          prev.map((c, i) => (i === cardIdx ? { ...c, mediaUrl: result } : c))
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteEvent = (e: React.ClipboardEvent, target: "HEADER" | "CAROUSEL_CARD", cardIdx?: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) handleFileProcess(file, target, cardIdx);
        break;
      }
    }
  };

  const validateName = (name: string) => {
    if (!name) return "Template name is required.";
    if (!/^[a-z0-9_]+$/.test(name)) return "Name must be lowercase letters, numbers, and underscores only. No spaces or special chars.";
    if (name.length > META_LIMITS.NAME_MAX) return `Name too long (max ${META_LIMITS.NAME_MAX} chars).`;
    return "";
  };

  const handleNameChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setTemplateName(sanitized);
    setNameError(validateName(sanitized));
  };

  const addCarouselCard = () => {
    if (carouselCards.length >= META_LIMITS.MAX_CAROUSEL_CARDS) {
      showToast("Meta Carousel supports max 10 cards.", "error");
      return;
    }
    const newCard: CarouselCardItem = {
      id: `card_${Date.now()}`,
      mediaUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80",
      headerType: "IMAGE",
      title: `${brandName} Collection ${carouselCards.length + 1}`,
      bodyText: "₹999 • Premium quality",
      buttons: [
        { type: "URL", text: "Buy Now", url: `https://${brandDomain}/products/item`, urlType: "STATIC" },
        { type: "URL", text: "Explore More", url: `https://${brandDomain}/collections/all`, urlType: "STATIC" }
      ]
    };
    setCarouselCards((prev) => [...prev, newCard]);
    setActiveCarouselCardIndex(carouselCards.length);
  };

  const removeCarouselCard = (idx: number) => {
    if (carouselCards.length <= 2) {
      showToast("Meta Image Carousel requires at least 2 cards.", "error");
      return;
    }
    setCarouselCards((prev) => prev.filter((_, i) => i !== idx));
    if (activeCarouselCardIndex >= idx && activeCarouselCardIndex > 0) {
      setActiveCarouselCardIndex((prev) => prev - 1);
    }
  };

  const updateActiveCard = (field: keyof CarouselCardItem, val: any) => {
    setCarouselCards((prev) =>
      prev.map((c, i) => (i === activeCarouselCardIndex ? { ...c, [field]: val } : c))
    );
  };

  const addCardButton = () => {
    const card = carouselCards[activeCarouselCardIndex];
    if (!card) return;
    if (card.buttons.length >= 2) {
      showToast("Meta Carousel cards support up to 2 CTA buttons per card.", "error");
      return;
    }
    const isSecondBtn = card.buttons.length === 1;
    const defaultBtn = isSecondBtn
      ? {
          type: "URL" as const,
          text: "Explore More",
          url: `https://${brandDomain}/collections/all`,
          urlType: "STATIC" as const
        }
      : {
          type: "URL" as const,
          text: "Buy Now",
          url: `https://${brandDomain}/products/item`,
          urlType: "STATIC" as const
        };
    const updatedButtons = [
      ...card.buttons,
      defaultBtn
    ];
    updateActiveCard("buttons", updatedButtons);
  };

  const removeCardButton = (btnIdx: number) => {
    const card = carouselCards[activeCarouselCardIndex];
    if (!card) return;
    const updatedButtons = card.buttons.filter((_, i) => i !== btnIdx);
    updateActiveCard("buttons", updatedButtons);
  };

  const updateCardButton = (btnIdx: number, field: string, val: any) => {
    const card = carouselCards[activeCarouselCardIndex];
    if (!card) return;
    const updatedButtons = card.buttons.map((b, i) => (i === btnIdx ? { ...b, [field]: val } : b));
    updateActiveCard("buttons", updatedButtons);
  };

  // Standard Buttons
  const addButton = (type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE") => {
    if (buttons.length >= META_LIMITS.TOTAL_BUTTONS_MAX) {
      showToast("Max 3 buttons allowed.", "error");
      return;
    }
    setButtons((prev) => [
      ...prev,
      {
        type,
        text: type === "COPY_CODE" ? "Copy Code" : type === "URL" ? "Track Order" : type === "PHONE_NUMBER" ? "Call Us" : "Explore More",
        url: type === "URL" ? `https://${brandDomain}/track/{{1}}` : "",
        urlType: type === "URL" ? "DYNAMIC" : "STATIC",
        urlExample: type === "URL" ? "ESP-88294" : "",
        phone_number: type === "PHONE_NUMBER" ? "+917404388242" : "",
        code: couponCode || "FLAT30",
        isDynamicCode: false,
        exampleCode: "FLAT30"
      }
    ]);
  };

  const updateButton = (idx: number, field: string, val: any) => {
    setButtons((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: val } : b)));
  };

  const removeButton = (idx: number) => setButtons((prev) => prev.filter((_, i) => i !== idx));

  const insertVariable = () => {
    const nextVar = (bodyText.match(/\{\{(\d+)\}\}/g)?.length || 0) + 1;
    setBodyText((prev) => prev + `{{${nextVar}}}`);
  };

  const resetForm = () => {
    setCategory("MARKETING");
    setTemplateType("STANDARD");
    setTemplateName("");
    setLanguage("en_US");
    setHeaderType("NONE");
    setHeaderContent("");
    setHeaderMediaPreview(null);
    setBodyText("");
    setFooterText(`${brandName} | Reply STOP to unsubscribe`);
    setButtons([]);
    setNameError("");
    setCouponCode("FLAT30");
    setCatalogueFormat("CATALOGUE_MESSAGE");
    setFlowButtonText("View Flow");
    setAuthCodeDelivery("COPY_CODE");
    setAuthSecurityRecommendation(true);
    setAuthExpiryTime(false);
    setAuthExpiryMinutes(10);
    setEnableValidityPeriod(false);
    setMessageValidityPeriod(10);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateName(templateName);
    if (err) {
      setNameError(err);
      showToast(err, "error");
      return;
    }

    if (!bodyText.trim() && templateType !== "CAROUSEL") {
      showToast("Body text is required for the message template.", "error");
      return;
    }

    if (templateType === "CAROUSEL" && carouselCards.length < 2) {
      showToast("Meta Image Carousel requires at least 2 cards.", "error");
      return;
    }

    setSaving(true);
    const payload = {
      name: templateName,
      category,
      language,
      templateType,
      headerType: templateType === "CATALOGUE" ? "NONE" : headerType,
      headerContent: templateType === "CATALOGUE" ? null : headerContent,
      bodyText,
      footerText,
      buttons: templateType === "LTO_COUPON" 
        ? [{ type: "COPY_CODE", text: couponCode || "FLAT30", code: couponCode || "FLAT30" }]
        : templateType === "CATALOGUE"
        ? [{ type: "CATALOG", text: "View catalog" }]
        : templateType === "FLOWS"
        ? [{ type: "FLOW", text: flowButtonText || "View Flow" }]
        : templateType === "ORDER_DETAILS"
        ? [{ type: "ORDER_DETAILS", text: "Review and Pay" }]
        : templateType === "ORDER_STATUS"
        ? [{ type: "URL", text: "Track shipment", url: `https://${brandDomain}/account/orders` }]
        : templateType === "CALL_PERMISSIONS"
        ? [{ type: "CALL_PERMISSION", text: "Choose preference" }]
        : templateType === "AUTHENTICATION"
        ? [{ type: "COPY_CODE", text: "Copy code", code: "{{1}}" }]
        : buttons,
      carouselCards: templateType === "CAROUSEL" ? carouselCards : null
    };

    const res = await saveWhatsAppTemplateAction(payload);
    setSaving(false);
    if (res.success) {
      const isApproved = res.template?.status === "APPROVED";
      const statusLabel = res.template?.status || (res.submitted ? "PENDING" : "PENDING");
      showToast(
        isApproved
          ? "🎉 Template approved directly by Meta!"
          : res.submitted
          ? `🎉 Template submitted to Meta Cloud API! Status: ${statusLabel} (Under Review)`
          : `✅ Template saved locally! Status: ${statusLabel}`,
        "success"
      );
      resetForm();
      setViewMode("LIST");
      fetchTemplates();
    } else {
      showToast(res.error || "Failed to create template.", "error");
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete template "${name}"? This will also remove it from Meta.`)) return;
    setDeleting(name);
    const res = await deleteWhatsAppTemplateAction(name);
    setDeleting(null);
    if (res.success) {
      showToast("Template deleted.");
      fetchTemplates();
    } else {
      showToast(res.error || "Delete failed.", "error");
    }
  };

  const handleRefreshStatus = async (name: string) => {
    setRefreshingTemplate(name);
    const res = await refreshTemplateStatusAction(name);
    setRefreshingTemplate(null);
    if (res.success) {
      if (res.status === "APPROVED") {
        showToast(`🎉 Meta Approved template "${name}"!`, "success");
      } else if (res.status === "REJECTED") {
        showToast(`⚠️ Meta Rejected "${name}": ${res.rejectionReason || "Policy Issue"}`, "error");
      } else {
        showToast(`⏳ Template "${name}" status from Meta: ${res.status}`);
      }
      fetchTemplates();
    } else {
      showToast(res.error || "Failed to check status from Meta.", "error");
    }
  };

  const handleFastApproveResubmit = async (templateName: string) => {
    setResubmittingTemplate(templateName);
    const res = await resubmitCarouselTemplateAction(templateName);
    setResubmittingTemplate(null);
    if (res.success) {
      showToast(res.message || `✓ 100% compliant version submitted to Meta for 1-5 minute approval!`, "success");
      setFastTrackModalTmpl(null);
      fetchTemplates();
    } else {
      showToast(res.error || "Fast-track submission failed.", "error");
    }
  };

  const handleTest = async (t: any) => {
    if (!testPhone) {
      showToast("Enter a test phone number first.", "error");
      return;
    }
    setTestingTemplate(t.name);
    const res = await sendWhatsAppTemplateAction(testPhone, t.name, t.language || "en_US", []);
    setTestingTemplate(null);
    if (res.success) {
      showToast("Test template sent successfully!");
      fetchTemplates();
    } else {
      showToast(res.error || "Send failed.", "error");
    }
  };

  // Filter & Sort
  const filtered = templates
    .filter((t) => {
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
      if (statusFilter !== "ALL") {
        const s = (t.status || "").toUpperCase();
        if (statusFilter === "PENDING") {
          if (s !== "PENDING" && s !== "IN_REVIEW" && s !== "IN_APPEAL") return false;
        } else if (statusFilter === "APPROVED") {
          if (s !== "APPROVED") return false;
        } else if (statusFilter === "REJECTED") {
          if (s !== "REJECTED") return false;
        } else if (statusFilter === "PAUSED") {
          if (s !== "PAUSED" && s !== "DISABLED") return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }
      if (
        searchQuery &&
        !t.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.bodyText?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (timeRangeFilter !== "ALL") {
        const now = Date.now();
        const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : now;
        if (timeRangeFilter === "TODAY") {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          if (createdTime < startOfDay.getTime()) return false;
        } else if (timeRangeFilter === "7D") {
          if (now - createdTime > 7 * 24 * 3600 * 1000) return false;
        } else if (timeRangeFilter === "30D") {
          if (now - createdTime > 30 * 24 * 3600 * 1000) return false;
        }
      }
      if (typeFilter !== "ALL") {
        const tType = t.templateType || "STANDARD";
        if (typeFilter === "CAROUSEL" && tType !== "CAROUSEL" && tType !== "IMAGE_CAROUSEL") return false;
        if (typeFilter === "CATALOGUE" && tType !== "CATALOGUE" && tType !== "CATALOG") return false;
        if (typeFilter !== "CAROUSEL" && typeFilter !== "CATALOGUE" && tType !== typeFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "most_used") return (b.totalSent || 0) - (a.totalSent || 0);
      if (sortBy === "highest_read") return (b.readRate || 0) - (a.readRate || 0);
      if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
      return 0;
    });

  const statusBadge = (status: string) => {
    const norm = (status || "").toUpperCase();
    const isApproved = norm === "APPROVED";
    const isPending = norm === "PENDING" || norm === "IN_REVIEW" || norm === "IN_APPEAL";
    const isRejected = norm === "REJECTED";
    const isPaused = norm === "PAUSED" || norm === "DISABLED";
    const isDeleting = norm === "PENDING_DELETION";

    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={11} /> APPROVED
        </span>
      );
    }
    if (isPending) {
      const label = norm === "IN_REVIEW" ? "IN REVIEW" : norm === "IN_APPEAL" ? "IN APPEAL" : "PENDING";
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock size={11} className="animate-spin" /> {label}
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <AlertCircle size={11} /> REJECTED
        </span>
      );
    }
    if (isPaused || isDeleting) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
          <Clock size={11} /> {norm}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock size={11} /> {status || "PENDING"}
      </span>
    );
  };

  const formatBadge = (tType?: string) => {
    if (tType === "CAROUSEL" || tType === "IMAGE_CAROUSEL") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase flex items-center gap-1">
          <Layers size={11} /> Image Carousel
        </span>
      );
    }
    if (tType === "CATALOGUE" || tType === "CATALOG") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 text-[10px] font-black uppercase flex items-center gap-1">
          <ShoppingBag size={11} /> Catalogue
        </span>
      );
    }
    if (tType === "FLOWS") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
          <CheckSquare size={11} /> Flows
        </span>
      );
    }
    if (tType === "ORDER_DETAILS") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
          <CreditCard size={11} /> Order Details
        </span>
      );
    }
    if (tType === "ORDER_STATUS") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase flex items-center gap-1">
          <Truck size={11} /> Order Status
        </span>
      );
    }
    if (tType === "CALL_PERMISSIONS") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase flex items-center gap-1">
          <Phone size={11} /> Call Permissions
        </span>
      );
    }
    if (tType === "LTO_COUPON") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
          <Tag size={11} /> LTO Coupon
        </span>
      );
    }
    if (tType === "AUTHENTICATION") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 text-[10px] font-black uppercase flex items-center gap-1">
          <Copy size={11} /> Authentication
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-extrabold uppercase">
        Default
      </span>
    );
  };

  const getRenderedPreviewText = (rawText: string) => {
    if (!rawText) return "";
    return rawText
      .replace(/\{\{1\}\}/g, "Alex")
      .replace(/\{\{2\}\}/g, "ORD-8921")
      .replace(/\{\{3\}\}/g, "₹1,499")
      .replace(/\{\{4\}\}/g, `https://${brandDomain}/track`)
      .replace(/\{\{(\d+)\}\}/g, "[Var $1]");
  };

  // Utility Presets List for active brand
  const utilityPresets = getUtilityPresetsList(brandName, brandDomain);

  // -------------------------------------------------------------
  // RENDER: FULL-PAGE CREATE STUDIO
  // -------------------------------------------------------------
  if (viewMode === "CREATE") {
    return (
      <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={headerFileInputRef}
          accept="image/*,video/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileProcess(file, "HEADER");
          }}
          className="hidden"
        />
        <input
          type="file"
          ref={cardFileInputRef}
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileProcess(file, "CAROUSEL_CARD");
          }}
          className="hidden"
        />

        {/* Toast */}
        {toastMsg && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 9999,
              padding: "12px 18px",
              borderRadius: "10px",
              background: toastMsg.type === "error" ? "#ef4444" : "#10b981",
              color: "white",
              fontWeight: 700,
              fontSize: "13px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              maxWidth: "400px"
            }}
          >
            {toastMsg.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toastMsg.text}
          </div>
        )}

        {/* Studio Top Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetForm();
                setViewMode("LIST");
              }}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-2xl transition shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Templates</span>
            </button>

            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FileCode size={22} className="text-indigo-600" />
                WhatsApp Template Creation Studio
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Brand Account: <span className="font-bold text-indigo-600 dark:text-indigo-400">{brandName}</span> ({brandDomain}) • Drag-and-drop media & live smartphone preview.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition cursor-pointer"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={() => setShowComplianceModal(true)}
              disabled={saving || !!nameError || !templateName}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-amber-50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckSquare size={14} />
              <span>Check Compliance</span>
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !!nameError || !templateName}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{saving ? "Submitting to Meta..." : "Submit Template to Meta →"}</span>
            </button>
          </div>
        </div>

        {/* ===== META COMPLIANCE CHECK MODAL ===== */}
        {showComplianceModal && (() => {
          const checks = runComplianceChecks();
          const allPass = checks.every(c => c.pass);
          return (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${allPass ? "bg-emerald-100 dark:bg-emerald-900/60" : "bg-amber-100 dark:bg-amber-900/60"}`}>
                      {allPass ? <CheckCircle2 size={22} className="text-emerald-600" /> : <AlertCircle size={22} className="text-amber-600" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">Meta Compliance Report</h3>
                      <p className="text-[11px] text-gray-500">{checks.filter(c => c.pass).length}/{checks.length} checks passed</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowComplianceModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {checks.map((check, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${check.pass ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60"}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${check.pass ? "bg-emerald-500" : "bg-rose-500"}`}>
                        {check.pass ? <Check size={11} className="text-white" /> : <X size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11px] font-black ${check.pass ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>{check.label}</div>
                        <div className={`text-[10px] mt-0.5 ${check.pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{check.message}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-3 rounded-xl border text-[11px] font-semibold text-center ${allPass ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"}`}>
                  {allPass ? "✅ All compliance checks passed! Your template is ready to submit to Meta." : "⚠️ Fix the issues above before submitting to improve approval chances."}
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowComplianceModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer">
                    {allPass ? "Review Again" : "Fix Issues"}
                  </button>
                  <button
                    onClick={(e) => { setShowComplianceModal(false); handleCreate(e as any); }}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    {allPass ? "Submit to Meta →" : "Submit Anyway →"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2-Column Full-Page Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editor Controls (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* ========================================================= */}
            {/* EMBEDDED AI TEMPLATE STUDIO CO-PILOT (Prompt-to-Template) */}
            {/* ========================================================= */}
            <div className="bg-white dark:bg-slate-800 border-2 border-indigo-200/80 dark:border-indigo-900/60 rounded-3xl p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/20">
              {/* Header Badge & Brand Guide Notice */}
              <div className="flex items-center justify-between gap-4 mb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25 text-white">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
                        AI Template Architect & Co-Pilot
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black uppercase tracking-wider">
                        Meta 100% Compliant
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Explain your campaign need in plain English — the AI will draft, validate, and load the template in front of you.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiIsOpen(!aiIsOpen)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition flex items-center gap-1 cursor-pointer"
                >
                  {aiIsOpen ? "Hide Co-Pilot" : "Open Co-Pilot"}
                </button>
              </div>

              {/* Dynamic Brand Intelligence Badge */}
              <div className="mb-4 px-3.5 py-2.5 bg-indigo-50/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-slate-700/80 rounded-2xl flex flex-wrap items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 relative z-10">
                <span className="flex items-center gap-1 font-black text-indigo-700 dark:text-indigo-300">
                  🧠 Dynamic Brand Guidance:
                </span>
                <span className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1 shadow-2xs">
                  🏢 {brandName}
                </span>
                <span className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1 shadow-2xs">
                  🌐 {brandDomain}
                </span>
                <span className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1 shadow-2xs">
                  📞 {brandPhone}
                </span>
                {inventoryStats.totalProducts > 0 && (
                  <span className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-lg font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    🛍️ {inventoryStats.inStockProducts || inventoryProducts.length} In-Stock Products Connected
                  </span>
                )}
                <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                  ✓ {hasAiKnowledge ? "AI Knowledge Base Connected" : "Standard Rules Active"}
                </span>
              </div>

              {aiIsOpen && (
                <div className="flex flex-col gap-3.5 relative z-10 animate-in fade-in duration-150">
                  {/* Quick Starter Inspiration Chips */}
                  <div>
                    <div className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Zap size={12} className="text-amber-500" />
                      Quick Campaign Inspiration:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "🎁 Festive 30% OFF Flash Sale", prompt: `Create a festive mega flash sale template for ${brandName} with a 30% coupon code FLAT30, image header, limited-time urgency, shop now dynamic button, and call support button.` },
                        { label: "📦 Order Dispatched & Tracking", prompt: `Create a transactional order dispatched utility template for ${brandName} with order number, tracking ID, and dynamic track order button.` },
                        { label: "🛒 Abandoned Cart Recovery", prompt: `Create an abandoned cart recovery template for ${brandName} with a 15% discount coupon SAVE15, urgency reminder, and 1-click checkout button.` },
                        { label: "🛍️ Bestsellers Product Carousel", prompt: `Create a 3-card product carousel template showcasing top trending apparel styles at ${brandName} with Buy Now buttons.` },
                        { label: "⭐️ VIP Review & Feedback", prompt: `Create a customer review & feedback template for ${brandName} thanking the customer and providing a quick link to rate their order.` }
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAiPrompt(chip.prompt);
                            handleGenerateWithAI(chip.prompt);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 hover:border-indigo-300 rounded-lg text-[11px] text-gray-700 dark:text-gray-200 hover:text-indigo-600 font-semibold transition active:scale-95 cursor-pointer text-left shadow-2xs"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SPECIFIC PRODUCTS MULTI-SELECT PICKER FOR AI TEMPLATE / CAROUSEL */}
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-900/60 rounded-2xl border border-indigo-100 dark:border-slate-700/80 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                          <ShoppingBag size={13} className="text-indigo-600" />
                          Select Products to Feature in AI Template / Carousel ({aiSelectedProducts.length} selected):
                        </span>
                        {aiSelectedProducts.length > 0 && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-bold">
                            {aiSelectedProducts.length} items attached
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {aiSelectedProducts.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={handleBuildCarouselFromAiSelected}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                            >
                              <Layers size={11} />
                              <span>⚡ 1-Click Build Carousel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiSelectedProducts([])}
                              className="text-[10px] text-gray-500 hover:text-red-500 font-semibold cursor-pointer underline"
                            >
                              Clear
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const opening = !aiProductDropdownOpen;
                            setAiProductDropdownOpen(opening);
                            // Auto-fetch inventory if not yet loaded when dropdown opens
                            if (opening && inventoryProducts.length === 0 && !inventoryLoading) {
                              fetchInventory("", "ALL", false);
                            }
                          }}
                          className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 border border-indigo-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>{aiProductDropdownOpen ? "Close Products List" : "Browse & Select Products"}</span>
                          <ChevronDown size={12} className={`transition-transform duration-200 ${aiProductDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Selected Products Chips Bar */}
                    {aiSelectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {aiSelectedProducts.map((p) => (
                          <div
                            key={p.id || p.handle}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl flex items-center gap-2 text-xs shadow-2xs animate-in zoom-in-95 duration-150"
                          >
                            <div className="w-5 h-5 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                              <img src={p.primaryImage || p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-gray-800 dark:text-gray-100 truncate max-w-[140px]">{p.name}</span>
                            <span className="text-[10px] font-bold text-emerald-600">₹{p.sellingPrice}</span>
                            <button
                              type="button"
                              onClick={() => toggleSelectProductForAI(p)}
                              className="text-gray-400 hover:text-red-500 cursor-pointer ml-0.5"
                              title="Remove from selection"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Searchable Products Dropdown Modal / Drawer */}
                    {aiProductDropdownOpen && (
                      <div className="mt-1 p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-2xl shadow-lg flex flex-col gap-2.5 max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                          <Search size={14} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={aiProductSearch}
                            onChange={(e) => setAiProductSearch(e.target.value)}
                            placeholder="Search by product name, category (e.g. Lycra, Shorts, Trackpant)..."
                            className="w-full text-xs bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 font-medium"
                            autoFocus
                          />
                          {aiProductSearch && (
                            <button type="button" onClick={() => setAiProductSearch("")} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Loading state */}
                        {inventoryLoading && (
                          <div className="flex items-center justify-center gap-2 py-6 text-indigo-500 text-xs font-semibold">
                            <RefreshCw size={14} className="animate-spin" />
                            Loading your product catalog...
                          </div>
                        )}

                        {/* Empty state */}
                        {!inventoryLoading && inventoryProducts.length === 0 && (
                          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                            <ShoppingBag size={28} className="text-gray-300" />
                            <p className="text-xs font-bold text-gray-500">No products found in inventory.</p>
                            <p className="text-[10px] text-gray-400">Add products to your catalog first.</p>
                          </div>
                        )}

                        {/* Products grid */}
                        {!inventoryLoading && inventoryProducts.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {inventoryProducts
                              .filter((p) => {
                                if (!aiProductSearch) return true;
                                const s = aiProductSearch.toLowerCase();
                                return (
                                  p.name?.toLowerCase().includes(s) ||
                                  p.category?.toLowerCase().includes(s) ||
                                  p.fabric?.toLowerCase().includes(s) ||
                                  p.handle?.toLowerCase().includes(s)
                                );
                              })
                              .map((p) => {
                                const isSelected = aiSelectedProducts.some((item) => item.id === p.id || item.handle === p.handle);
                                return (
                                  <div
                                    key={p.id || p.handle}
                                    onClick={() => toggleSelectProductForAI(p)}
                                    className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                                      isSelected
                                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-2xs"
                                        : "bg-gray-50/70 dark:bg-slate-900/60 border-gray-200 dark:border-slate-700 hover:border-indigo-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none flex-shrink-0"
                                    />
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 flex-shrink-0">
                                      <img src={p.primaryImage || p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{p.name}</div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-wrap">
                                        <span className="font-bold text-emerald-600">₹{p.sellingPrice}</span>
                                        {p.mrp > p.sellingPrice && <span className="line-through text-gray-400">₹{p.mrp}</span>}
                                        {p.discountPercent > 0 && <span className="text-rose-500 font-bold">{p.discountPercent}% OFF</span>}
                                        {p.stockQuantity > 0 ? (
                                          <span className="text-emerald-600 font-bold">🟢 {p.stockQuantity}</span>
                                        ) : (
                                          <span className="text-amber-500 font-medium">Ready</span>
                                        )}
                                        {p.variantsCount > 1 && <span className="text-indigo-500">{p.variantsCount} variants</span>}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <span className="ml-auto flex-shrink-0 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                        <Check size={10} className="text-white" />
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Prompt Input Bar */}
                  <div className="flex flex-col gap-2.5">
                    {/* Tone Selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        🎨 Tone / Style:
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {(["Professional", "Casual", "Festive", "Urgent", "Luxury"] as const).map(tone => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => setAiTone(tone)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              aiTone === tone
                                ? tone === "Professional" ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : tone === "Casual" ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                                : tone === "Festive" ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                : tone === "Urgent" ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                : "bg-amber-500 text-white border-amber-500 shadow-sm"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {tone === "Professional" ? "💼" : tone === "Casual" ? "😊" : tone === "Festive" ? "🎉" : tone === "Urgent" ? "⚡" : "✨"} {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt Textarea */}
                    <div className="relative">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={`Explain what you want to create (e.g., "Create a ${aiTone.toLowerCase()} Diwali sale template for ${brandName} with a coupon code, image header, shop now button and phone support")...`}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50/90 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
                      />
                      <span className={`absolute bottom-2.5 right-3 text-[9px] font-bold ${aiPrompt.length > 400 ? "text-amber-500" : "text-gray-300"}`}>
                        {aiPrompt.length}/500
                      </span>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Multi-Language Translate Dropdown */}
                        <div className="relative group">
                          <button
                            type="button"
                            disabled={aiTranslating}
                            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-sky-50 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            {aiTranslating ? <RefreshCw size={12} className="animate-spin" /> : <span>🌐</span>}
                            <span>{aiTranslating ? "Translating..." : "Translate"}</span>
                            <ChevronDown size={11} />
                          </button>
                          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 min-w-[140px]">
                            {["Hindi", "Hinglish", "Gujarati", "Marathi", "Tamil", "Bengali"].map(lang => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => handleTranslateTemplate(lang)}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                {lang === "Hindi" ? "🇮🇳" : lang === "Hinglish" ? "🤝" : lang === "Gujarati" ? "🌾" : lang === "Marathi" ? "🏔️" : lang === "Tamil" ? "🌺" : "📚"} {lang}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Generate 3 Variants */}
                        <button
                          type="button"
                          onClick={handleGenerateVariants}
                          disabled={aiVariantsLoading || aiGenerating}
                          className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-purple-50 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {aiVariantsLoading ? <RefreshCw size={12} className="animate-spin" /> : <span>⚡</span>}
                          <span>{aiVariantsLoading ? "Generating..." : "3 Variants"}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {aiGenerating ? (
                            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                              <RefreshCw size={12} className="animate-spin" />
                              AI is drafting your template...
                            </span>
                          ) : (
                            <span className="hidden sm:block">💡 Be specific for best results.</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGenerateWithAI()}
                          disabled={aiGenerating || (!aiPrompt.trim() && aiSelectedProducts.length === 0)}
                          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {aiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          <span>{aiGenerating ? "Generating..." : "Generate with AI ✨"}</span>
                        </button>
                      </div>
                    </div>

                    {/* A/B Variants Viewer */}
                    {aiVariants.length > 0 && (
                      <div className="mt-1 p-4 bg-purple-50/60 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-800/80 rounded-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            A/B Variant Picker ({aiVariantIndex + 1}/{aiVariants.length})
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => setAiVariantIndex(i => Math.max(0, i - 1))} disabled={aiVariantIndex === 0} className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 disabled:opacity-30 cursor-pointer hover:bg-gray-50 transition">
                              <ChevronLeft size={13} />
                            </button>
                            <button type="button" onClick={() => setAiVariantIndex(i => Math.min(aiVariants.length - 1, i + 1))} disabled={aiVariantIndex === aiVariants.length - 1} className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 disabled:opacity-30 cursor-pointer hover:bg-gray-50 transition">
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {aiVariants.map((_, i) => (
                            <button key={i} type="button" onClick={() => setAiVariantIndex(i)} className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${i === aiVariantIndex ? "bg-purple-600 text-white border-purple-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:border-purple-400"}`}>
                              Variant {i + 1}
                            </button>
                          ))}
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-800 dark:text-gray-100 leading-relaxed">
                          {aiVariants[aiVariantIndex]?.template?.bodyText}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { handleApplyAIDraft(aiVariants[aiVariantIndex]); setAiVariants([]); }}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Check size={13} /> Apply This Variant
                          </button>
                          <button type="button" onClick={() => setAiVariants([])} className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-50 transition">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PROPOSED AI DRAFT CARD & INTERACTIVE APPROVAL */}
                  {aiDraft && aiDraft.template && (
                    <div className="mt-2 p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800/80 rounded-2xl flex flex-col gap-3 text-gray-900 dark:text-white shadow-md animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80 dark:border-emerald-800/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                            AI Proposed Template Draft
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                            {aiDraft.template.category} • {aiDraft.template.templateType}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-slate-700 shadow-2xs">
                          {aiDraft.template.name}
                        </span>
                      </div>

                      {/* Header Preview */}
                      {aiDraft.template.headerType !== "NONE" && (
                        <div className="text-[11px] bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">Header ({aiDraft.template.headerType}):</span>
                          {aiDraft.template.headerType === "TEXT" ? (
                            <span className="font-semibold">{aiDraft.template.headerContent}</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {aiDraft.template.headerMediaUrl && (
                                <img
                                  src={aiDraft.template.headerMediaUrl}
                                  alt="Header preview"
                                  className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                  onError={(e: any) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span className="text-gray-600 dark:text-gray-300 font-semibold">Image Header Attached ✓</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Body Copy Preview with Variable Highlights */}
                      <div className="text-xs bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap shadow-2xs">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1 text-[11px]">Body Message:</span>
                        {aiDraft.template.bodyText}
                      </div>

                      {/* Footer Preview */}
                      {aiDraft.template.footerText && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 px-1">
                          <span className="font-bold text-gray-700 dark:text-gray-300">Footer:</span> {aiDraft.template.footerText}
                        </div>
                      )}

                      {/* Carousel Cards Preview */}
                      {aiDraft.template.carouselCards && Array.isArray(aiDraft.template.carouselCards) && aiDraft.template.carouselCards.length > 0 && (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-slate-700 flex flex-col gap-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-1.5">
                              <Layers size={13} />
                              Swipeable Carousel Cards ({aiDraft.template.carouselCards.length} products attached):
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              ✓ Live in Phone Simulator
                            </span>
                          </div>

                          <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-1">
                            {aiDraft.template.carouselCards.map((card: any, cIdx: number) => (
                              <div
                                key={card.id || cIdx}
                                className="min-w-[190px] max-w-[210px] bg-gray-50/80 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 flex flex-col gap-1.5 flex-shrink-0"
                              >
                                <div className="w-full h-24 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 flex-shrink-0">
                                  <img src={card.mediaUrl} alt={card.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="font-bold text-xs text-gray-900 dark:text-white truncate" title={card.title}>
                                  #{cIdx + 1} {card.title}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{card.bodyText}</div>
                                <div className="flex flex-col gap-1 mt-auto pt-1">
                                  {card.buttons?.map((cb: any, cbIdx: number) => (
                                    <span
                                      key={cbIdx}
                                      className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400 text-center truncate"
                                    >
                                      {cb.text}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dynamic Buttons Preview */}
                      {aiDraft.template.buttons && aiDraft.template.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {aiDraft.template.buttons.map((b: any, bIdx: number) => (
                            <span
                              key={bIdx}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[11px] text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1.5 shadow-2xs"
                            >
                              {b.type === "URL" ? <LinkIcon size={11} className="text-indigo-600" /> : b.type === "COPY_CODE" ? <Copy size={11} className="text-emerald-600" /> : <Phone size={11} className="text-purple-600" />}
                              {b.text} {b.type === "COPY_CODE" && `[${b.code || aiDraft.template.couponCode}]`}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Meta Variables Breakdown */}
                      {aiDraft.template.variables && aiDraft.template.variables.length > 0 && (
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] shadow-2xs">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">Dynamic Variables Mapping:</span>
                          <div className="flex flex-wrap gap-2">
                            {aiDraft.template.variables.map((v: any, vIdx: number) => (
                              <span key={vIdx} className="bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-200">
                                <strong className="text-indigo-600 dark:text-indigo-400">{v.param}</strong>: {v.name || v.description} (e.g. <em>{v.example}</em>)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compliance Guarantee */}
                      {aiDraft.complianceChecks && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          {aiDraft.complianceChecks.map((chk: string, cIdx: number) => (
                            <span key={cIdx}>{chk}</span>
                          ))}
                        </div>
                      )}

                      {/* AI Explanation */}
                      {aiDraft.explanation && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 bg-indigo-50/50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                          💡 <strong>AI Architect Rationale:</strong> {aiDraft.explanation}
                        </div>
                      )}

                      {/* Refinement Bar & 1-Click Approval */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={aiRefineInput}
                            onChange={(e) => setAiRefineInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRefineAIDraft(); }}
                            placeholder="Need tweaks? (e.g. 'Make it punchier', 'Add copy coupon', 'Change language')..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleRefineAIDraft}
                            disabled={!aiRefineInput.trim() || aiGenerating}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            Refine
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyAIDraft()}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 size={15} />
                          <span>Approve & Load into Studio Form ✨</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* LIVE STORE INVENTORY & PRODUCT INJECTOR PANEL */}
            {/* ========================================================= */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-5 shadow-2xs flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        Store Inventory & Product Injector
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-black">
                        {inventoryStats.inStockProducts || inventoryProducts.length} In-Stock
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Click any product to instantly inject its real photo, price, and store link into this template.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFillCarouselWithTopProducts}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 cursor-pointer"
                  >
                    <Layers size={13} />
                    <span>Auto-Fill Carousel (Top 3 Items) ✨</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventoryDrawerOpen(!inventoryDrawerOpen)}
                    className="p-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 transition cursor-pointer"
                  >
                    {inventoryDrawerOpen ? <X size={14} /> : <Plus size={14} />}
                  </button>
                </div>
              </div>

              {inventoryDrawerOpen && (
                <div className="flex flex-col gap-3">
                  {/* Search & Category Filter Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => {
                          setInventorySearch(e.target.value);
                          fetchInventory(e.target.value, inventoryCategoryFilter, inventoryInStockOnly);
                        }}
                        placeholder="Search product name, SKU, or category..."
                        className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                      <select
                        value={inventoryCategoryFilter}
                        onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                      >
                        <option value="ALL">All Categories</option>
                        {inventoryCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-bold whitespace-nowrap cursor-pointer px-2">
                        <input
                          type="checkbox"
                          checked={inventoryInStockOnly}
                          onChange={(e) => setInventoryInStockOnly(e.target.checked)}
                          className="w-3.5 h-3.5 accent-indigo-600 rounded"
                        />
                        <span>In Stock Only</span>
                      </label>
                    </div>
                  </div>

                  {/* Products Horizontal Card List */}
                  {inventoryLoading ? (
                    <div className="p-6 flex items-center justify-center gap-2 text-xs text-gray-500 font-bold">
                      <RefreshCw size={14} className="animate-spin text-indigo-600" />
                      <span>Loading store inventory catalog...</span>
                    </div>
                  ) : inventoryProducts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                      No matching products found in inventory. Try clearing the search filter.
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {inventoryProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="min-w-[220px] max-w-[220px] p-3 bg-gray-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border border-gray-200 dark:border-slate-700/80 hover:border-indigo-400 rounded-2xl flex flex-col justify-between gap-2.5 transition shadow-2xs group"
                        >
                          {/* Image & Stock Badge */}
                          <div className="relative w-full h-28 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 flex items-center justify-center">
                            <img
                              src={prod.primaryImage}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              onError={(e: any) => {
                                e.target.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-black rounded-md uppercase">
                              {prod.category || 'Apparel'}
                            </div>
                            <div className={`absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-black backdrop-blur-xs ${prod.inStock ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
                              {prod.inStock ? `${prod.stockQuantity} In Stock` : 'Out of Stock'}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div>
                            <h5 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition" title={prod.name}>
                              {prod.name}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                              <span className="font-black text-gray-900 dark:text-white">₹{prod.sellingPrice}</span>
                              {prod.mrp > prod.sellingPrice && (
                                <>
                                  <span className="text-[10px] text-gray-400 line-through">₹{prod.mrp}</span>
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded">
                                    {prod.discountPercent}% OFF
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Inject Action Buttons */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-200 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleInjectProductAsHeader(prod)}
                              className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-slate-700 hover:border-indigo-400 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                              title="Set as Header Image and attach product store URL to CTA button"
                            >
                              <ImageIcon size={11} />
                              <span>Set Header</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInjectProductAsCarouselCard(prod)}
                              className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-gray-200 dark:border-slate-700 hover:border-purple-400 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                              title="Add as Carousel Card with image, title, price, and store link"
                            >
                              <Plus size={11} />
                              <span>+ Carousel</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInjectProductIntoBody(prod)}
                              className="px-2 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                              title="Insert product title & price into message body text"
                            >
                              <FileText size={10} />
                              <span>In Body</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePromptAIForProduct(prod)}
                              className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-[9px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                              title="Ask AI to write a high-converting promotional template for this product"
                            >
                              <Sparkles size={10} />
                              <span>AI Promo</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 1: CATEGORY SELECTION (MARKETING vs UTILITY vs AUTHENTICATION) */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs">
              <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
                1. Select Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleCategorySelect(c.value as any)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between h-28 cursor-pointer ${
                      category === c.value
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/30"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300"
                    }`}
                  >
                    <div className="font-black text-sm">{c.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      {c.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 2: AVAILABLE MESSAGE TYPES FOR SELECTED CATEGORY (Official Meta WhatsApp Manager layout) */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider">
                  2. Choose Template Type ({category})
                </label>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {category === "MARKETING"
                    ? "Official Meta Formats"
                    : category === "UTILITY"
                    ? "Transactional & Customer Lifecycle"
                    : "Secure One-Time Passcode"}
                </span>
              </div>

              {/* A) When MARKETING is selected */}
              {category === "MARKETING" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Default */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("STANDARD")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                      templateType === "STANDARD"
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode size={18} className={templateType === "STANDARD" ? "text-indigo-600" : "text-gray-400"} />
                      <div className="font-black text-xs">Default</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Send messages with media and customised buttons to engage your customers.
                    </div>
                  </button>

                  {/* Image Carousel (Named exactly as requested: "name it image carsule") */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("CAROUSEL")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] relative overflow-hidden cursor-pointer ${
                      templateType === "CAROUSEL"
                        ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/50 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-purple-300"
                    }`}
                  >
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-purple-500 text-white text-[9px] font-black uppercase">
                      Swipeable
                    </span>
                    <div className="flex items-center gap-2">
                      <Layers size={18} className={templateType === "CAROUSEL" ? "text-purple-600" : "text-gray-400"} />
                      <div className="font-black text-xs">Image Carousel</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Send up to 10 swipeable cards with images, body text, and interactive buttons.
                    </div>
                  </button>

                  {/* Catalogue */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("CATALOGUE")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                      templateType === "CATALOGUE"
                        ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 text-sky-950 dark:text-sky-200 ring-2 ring-sky-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={18} className={templateType === "CATALOGUE" ? "text-sky-600" : "text-gray-400"} />
                      <div className="font-black text-xs">Catalogue</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Send messages that drive sales by connecting your product catalogue.
                    </div>
                  </button>

                  {/* Flows */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("FLOWS")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                      templateType === "FLOWS"
                        ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare size={18} className={templateType === "FLOWS" ? "text-emerald-600" : "text-gray-400"} />
                      <div className="font-black text-xs">Flows</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Send a form to collect customer interests, appointment requests or run surveys.
                    </div>
                  </button>

                  {/* Order details */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("ORDER_DETAILS")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                      templateType === "ORDER_DETAILS"
                        ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className={templateType === "ORDER_DETAILS" ? "text-amber-600" : "text-gray-400"} />
                      <div className="font-black text-xs">Order details</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Send messages through which customers can pay you.
                    </div>
                  </button>

                  {/* Calling permissions request */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("CALL_PERMISSIONS")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                      templateType === "CALL_PERMISSIONS"
                        ? "border-rose-600 bg-rose-50/70 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Phone size={18} className={templateType === "CALL_PERMISSIONS" ? "text-rose-600" : "text-gray-400"} />
                      <div className="font-black text-xs">Calling permissions request</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Ask customers if you can call them on WhatsApp.
                    </div>
                  </button>

                  {/* LTO / Discount Coupon */}
                  <button
                    type="button"
                    onClick={() => handleTemplateTypeSelect("LTO_COUPON")}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer sm:col-span-2 ${
                      templateType === "LTO_COUPON"
                        ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-2xs"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={18} className={templateType === "LTO_COUPON" ? "text-emerald-600" : "text-gray-400"} />
                      <div className="font-black text-xs">LTO / Discount Coupon</div>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                      Special promotional offer with 1-tap Copy Coupon Code banner.
                    </div>
                  </button>
                </div>
              )}

              {/* B) When UTILITY is selected */}
              {category === "UTILITY" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Default */}
                    <button
                      type="button"
                      onClick={() => handleTemplateTypeSelect("STANDARD")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                        templateType === "STANDARD"
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/30 shadow-2xs"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PackageCheck size={18} className={templateType === "STANDARD" ? "text-indigo-600" : "text-gray-400"} />
                        <div className="font-black text-xs">Default</div>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                        Send messages about an existing order or account.
                      </div>
                    </button>

                    {/* Order status */}
                    <button
                      type="button"
                      onClick={() => handleTemplateTypeSelect("ORDER_STATUS")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                        templateType === "ORDER_STATUS"
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-2xs"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck size={18} className={templateType === "ORDER_STATUS" ? "text-blue-600" : "text-gray-400"} />
                        <div className="font-black text-xs">Order status</div>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                        Send messages to tell customers about the progress of their orders.
                      </div>
                    </button>

                    {/* Order details */}
                    <button
                      type="button"
                      onClick={() => handleTemplateTypeSelect("ORDER_DETAILS")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                        templateType === "ORDER_DETAILS"
                          ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-2xs"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className={templateType === "ORDER_DETAILS" ? "text-amber-600" : "text-gray-400"} />
                        <div className="font-black text-xs">Order details</div>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                        Send messages through which customers can pay you.
                      </div>
                    </button>

                    {/* Flows */}
                    <button
                      type="button"
                      onClick={() => handleTemplateTypeSelect("FLOWS")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer ${
                        templateType === "FLOWS"
                          ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-2xs"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare size={18} className={templateType === "FLOWS" ? "text-emerald-600" : "text-gray-400"} />
                        <div className="font-black text-xs">Flows</div>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                        Send a form to collect feedback, send reminders or manage orders.
                      </div>
                    </button>

                    {/* Calling permissions request */}
                    <button
                      type="button"
                      onClick={() => handleTemplateTypeSelect("CALL_PERMISSIONS")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between min-h-[92px] cursor-pointer sm:col-span-2 ${
                        templateType === "CALL_PERMISSIONS"
                          ? "border-rose-600 bg-rose-50/70 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30 shadow-2xs"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-rose-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Phone size={18} className={templateType === "CALL_PERMISSIONS" ? "text-rose-600" : "text-gray-400"} />
                        <div className="font-black text-xs">Calling permissions request</div>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                        Ask customers if you can call them on WhatsApp.
                      </div>
                    </button>
                  </div>

                  {/* Pre-approved Library when Default is selected */}
                  {templateType === "STANDARD" && (
                    <div className="p-3.5 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        ⚡ Apply Instant Pre-approved Notification Template:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {utilityPresets.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyUtilityPreset(p.id, brandName, brandDomain)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer text-xs ${
                              utilityPreset === p.id
                                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-black shadow-2xs"
                                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-medium hover:border-indigo-300"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* C) When AUTHENTICATION is selected */}
              {category === "AUTHENTICATION" && (
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-gray-600 dark:text-gray-300 font-bold">
                    Code delivery setup:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Copy code */}
                    <button
                      type="button"
                      onClick={() => setAuthCodeDelivery("COPY_CODE")}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        authCodeDelivery === "COPY_CODE"
                          ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/30 font-bold"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-orange-300"
                      }`}
                    >
                      <div className="font-black text-xs">Copy code</div>
                      <div className="text-[10px] text-gray-500 mt-1 leading-tight">
                        Basic authentication with quick setup. Customers copy and paste the code into your app.
                      </div>
                    </button>

                    {/* One-tap auto-fill */}
                    <button
                      type="button"
                      onClick={() => setAuthCodeDelivery("ONE_TAP")}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        authCodeDelivery === "ONE_TAP"
                          ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/30 font-bold"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-orange-300"
                      }`}
                    >
                      <div className="font-black text-xs">One-tap auto-fill</div>
                      <div className="text-[10px] text-gray-500 mt-1 leading-tight">
                        Code sends to your app when customers tap the button. Fallback to copy code if not supported.
                      </div>
                    </button>

                    {/* Zero-tap auto-fill */}
                    <button
                      type="button"
                      onClick={() => setAuthCodeDelivery("ZERO_TAP")}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                        authCodeDelivery === "ZERO_TAP"
                          ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/30 font-bold"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-orange-300"
                      }`}
                    >
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-black uppercase">
                        Recommended
                      </span>
                      <div className="font-black text-xs">Zero-tap auto-fill</div>
                      <div className="text-[10px] text-gray-500 mt-1 leading-tight">
                        Easiest option for customers. Zero-tap automatically sends code without requiring any tap.
                      </div>
                    </button>
                  </div>

                  {/* App Setup */}
                  <div className="p-4 bg-orange-50/50 dark:bg-orange-950/30 rounded-2xl border border-orange-200/80 dark:border-orange-900/40 flex flex-col gap-3">
                    <div className="text-xs font-black text-orange-900 dark:text-orange-200">
                      App Setup & Signature
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          Package Name
                        </label>
                        <input
                          value={authPackageName}
                          onChange={(e) => setAuthPackageName(e.target.value)}
                          placeholder="com.example.myapplication"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          App Signature Hash (11 chars)
                        </label>
                        <input
                          value={authAppSignatureHash}
                          onChange={(e) => setAuthAppSignatureHash(e.target.value)}
                          maxLength={11}
                          placeholder="e.g. K4w8v9N2q1P"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* Content Options */}
                    <div className="pt-2 border-t border-orange-200/60 dark:border-orange-900/40 flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={authSecurityRecommendation}
                          onChange={(e) => setAuthSecurityRecommendation(e.target.checked)}
                          className="rounded text-orange-600 cursor-pointer"
                        />
                        <span>Add security recommendation ("For your security, do not share this code.")</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={authExpiryTime}
                          onChange={(e) => setAuthExpiryTime(e.target.checked)}
                          className="rounded text-orange-600 cursor-pointer"
                        />
                        <span>Add expiry time for the code (e.g. "Code expires in 10 minutes.")</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: TEMPLATE NAME & LANGUAGE */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
              <label className="block text-xs font-black uppercase text-gray-500 tracking-wider">
                3. Template Identity
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                    Template Name <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 lowercase ml-1">(lowercase + underscores)</span>
                  </label>
                  <input
                    value={templateName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder={`e.g. ${brandName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_order_dispatch`}
                    className={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border ${
                      nameError ? "border-red-500" : "border-gray-200 dark:border-slate-700"
                    } rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {nameError && <p className="text-red-500 text-[11px] mt-1">{nameError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                    Language <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* STEP 4: PROMINENT HEADER SECTION (AVAILABLE ACROSS ALL TEMPLATE TYPES!) */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-gray-700 dark:text-gray-200 tracking-wider">
                  4. Header (Optional)
                </label>
                <span className="text-[11px] text-gray-400">
                  Select header type: Text or Direct Image/Media Upload
                </span>
              </div>

              {/* Header Type Selector Buttons */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { type: "NONE", label: "None" },
                  { type: "TEXT", label: "📝 Text" },
                  { type: "IMAGE", label: "🖼️ Image (Upload / Paste)" },
                  { type: "VIDEO", label: "🎥 Video" },
                  { type: "DOCUMENT", label: "📄 Document / PDF" }
                ].map((ht) => (
                  <button
                    key={ht.type}
                    type="button"
                    onClick={() => {
                      setHeaderType(ht.type as any);
                      if (ht.type === "NONE") {
                        setHeaderContent("");
                        setHeaderMediaPreview(null);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                      headerType === ht.type
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    {ht.label}
                  </button>
                ))}
              </div>

              {/* If Header is TEXT */}
              {headerType === "TEXT" && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                    Header Text (Max 60 chars)
                  </label>
                  <input
                    value={headerContent}
                    onChange={(e) => setHeaderContent(e.target.value)}
                    placeholder={`e.g. ${brandName} Exclusive Sale!`}
                    maxLength={60}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* If Header is IMAGE / VIDEO / DOCUMENT - DIRECT DRAG & DROP / CLICK UPLOAD / PASTE DIRECTLY */}
              {(headerType === "IMAGE" || headerType === "VIDEO" || headerType === "DOCUMENT") && (
                <div
                  onPaste={(e) => handlePasteEvent(e, "HEADER")}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileProcess(file, "HEADER");
                  }}
                  className="p-5 border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-center transition hover:border-indigo-500 cursor-pointer relative"
                  onClick={() => headerFileInputRef.current?.click()}
                >
                  {headerMediaPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={headerMediaPreview}
                        alt="Header preview"
                        className="max-h-40 rounded-xl object-contain shadow-md border border-gray-200 dark:border-slate-700"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Media Ready
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeaderContent("");
                            setHeaderMediaPreview(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 text-xs font-bold hover:bg-red-200 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Upload size={24} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-800 dark:text-white">
                          Click to Upload, Drag & Drop, or Paste Directly (Ctrl+V)
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Supports PNG, JPG, WEBP, MP4, and PDF
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        Choose File
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* STEP 5: MESSAGE BODY CONTENT */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">
                  5. {templateType === "CAROUSEL" ? "Carousel Introductory Message" : "Message Body Text"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={insertVariable}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={12} />
                  <span>Insert Variable {"{{n}}"}</span>
                </button>
              </div>

              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                maxLength={META_LIMITS.BODY_MAX}
                placeholder={
                  category === "UTILITY"
                    ? `Hi {{1}}, thank you for shopping with ${brandName}! Your order #{{2}} of ₹{{3}} is confirmed and packed.`
                    : `Hi {{1}}, get FLAT 30% OFF on all ${brandName} collections today only! Use code: {{2}}`
                }
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-sans outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
              <p className="text-[10px] text-gray-400 text-right">
                {bodyText.length}/{META_LIMITS.BODY_MAX}
              </p>

              {/* Coupon Code Input for LTO */}
              {templateType === "LTO_COUPON" && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col gap-2">
                  <label className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                    <Tag size={13} />
                    Offer Discount / Coupon Code
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      placeholder="e.g. FLAT30"
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 outline-none w-48 uppercase"
                    />
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Recipients get a 1-tap "Copy Code" button in WhatsApp!
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 6: CAROUSEL CARDS STUDIO (Only when Carousel is selected) */}
            {templateType === "CAROUSEL" && (
              <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs flex flex-col gap-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Layers size={14} />
                      6. Carousel Product Cards ({carouselCards.length}/10)
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Upload or paste product images directly for each card with custom titles and buttons.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addCarouselCard}
                    disabled={carouselCards.length >= META_LIMITS.MAX_CAROUSEL_CARDS}
                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Card</span>
                  </button>
                </div>

                {/* Card Selector Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-slate-700">
                  {carouselCards.map((c, idx) => (
                    <button
                      key={c.id || idx}
                      type="button"
                      onClick={() => setActiveCarouselCardIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        activeCarouselCardIndex === idx
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      <span>Card {idx + 1}</span>
                      {carouselCards.length > 2 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCarouselCard(idx);
                          }}
                          className="hover:text-red-300"
                        >
                          <X size={12} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Active Card Configuration */}
                {carouselCards[activeCarouselCardIndex] && (
                  <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/50 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                        Editing Card #{activeCarouselCardIndex + 1}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Meta allows 2-10 cards per carousel
                      </span>
                    </div>

                    {/* DIRECT DRAG & DROP / CLICK UPLOAD / PASTE FOR CAROUSEL CARD IMAGE */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Card Product Image (Upload or Paste Directly)
                      </label>
                      <div
                        onPaste={(e) => handlePasteEvent(e, "CAROUSEL_CARD", activeCarouselCardIndex)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileProcess(file, "CAROUSEL_CARD", activeCarouselCardIndex);
                        }}
                        onClick={() => cardFileInputRef.current?.click()}
                        className="p-4 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-2xl bg-white dark:bg-slate-800 flex items-center gap-4 cursor-pointer hover:border-purple-500 transition"
                      >
                        {carouselCards[activeCarouselCardIndex].mediaUrl ? (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700">
                            <img
                              src={carouselCards[activeCarouselCardIndex].mediaUrl}
                              alt="Card media"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center flex-shrink-0">
                            <ImageIcon size={24} />
                          </div>
                        )}

                        <div className="flex-1 text-left">
                          <div className="text-xs font-black text-gray-800 dark:text-white">
                            Click to Upload or Paste Image (Ctrl+V)
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Auto-fit to 1:1 square for WhatsApp carousels
                          </div>
                          <span className="inline-block mt-2 px-2.5 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                            Change Image
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Product Title / Header */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Product Title / Card Header
                      </label>
                      <input
                        value={carouselCards[activeCarouselCardIndex].title}
                        onChange={(e) => updateActiveCard("title", e.target.value)}
                        placeholder={`e.g. ${brandName} Performance Tee`}
                        maxLength={80}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    {/* Product Description / Price */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Card Body / Price / Description
                      </label>
                      <textarea
                        value={carouselCards[activeCarouselCardIndex].bodyText}
                        onChange={(e) => updateActiveCard("bodyText", e.target.value)}
                        rows={2}
                        placeholder="₹899 • Breathable 4-way stretch fabric"
                        maxLength={160}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Card CTA Buttons */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                          Card Action Buttons (Max 2)
                        </label>
                        <button
                          type="button"
                          onClick={addCardButton}
                          disabled={carouselCards[activeCarouselCardIndex].buttons.length >= 2}
                          className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          + Add Button
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {carouselCards[activeCarouselCardIndex].buttons.map((b, bIdx) => (
                          <div key={bIdx} className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={b.type}
                                  onChange={(e) => {
                                    const nextType = e.target.value;
                                    updateCardButton(bIdx, "type", nextType);
                                    if (nextType === "PHONE_NUMBER" && !b.phone_number) {
                                      updateCardButton(bIdx, "phone_number", brandPhone || "+917206066878");
                                      if (!b.text || b.text === "Buy Now" || b.text === "Explore More") {
                                        updateCardButton(bIdx, "text", "Call Us");
                                      }
                                    } else if (nextType === "URL" && (!b.url || !b.url.startsWith("http"))) {
                                      updateCardButton(bIdx, "url", `https://${brandDomain}/collections/all`);
                                      if (!b.text || b.text === "Call Us") {
                                        updateCardButton(bIdx, "text", "Explore More");
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  <option value="URL">🔗 URL (Website Link)</option>
                                  <option value="PHONE_NUMBER">📞 Phone (Call Us)</option>
                                  <option value="QUICK_REPLY">↩️ Quick Reply</option>
                                </select>
                                <span className="text-[10px] font-bold text-gray-400">Button #{bIdx + 1}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCardButton(bIdx)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <input
                              value={b.text}
                              onChange={(e) => updateCardButton(bIdx, "text", e.target.value)}
                              placeholder="Button Label (e.g. Buy Now or Explore More)"
                              maxLength={25}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                            />

                            {b.type === "PHONE_NUMBER" && (
                              <div className="flex flex-col gap-1 pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                  Phone Number (with country code):
                                </span>
                                <input
                                  value={b.phone_number || ""}
                                  onChange={(e) => updateCardButton(bIdx, "phone_number", e.target.value)}
                                  placeholder="e.g. +917206066878"
                                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                                />
                              </div>
                            )}

                            {b.type === "URL" && (
                              <div className="flex flex-col gap-2 pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase">URL Type:</span>
                                  <div className="inline-flex p-0.5 bg-gray-200/80 dark:bg-slate-800 rounded-lg text-[10px] font-bold">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateCardButton(bIdx, "urlType", "STATIC");
                                        if (b.url?.includes("{{1}}")) {
                                          updateCardButton(bIdx, "url", b.url.replace("/{{1}}", "").replace("{{1}}", ""));
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                        b.urlType !== "DYNAMIC" ? "bg-white dark:bg-slate-700 text-purple-600 font-bold shadow-2xs" : "text-gray-500"
                                      }`}
                                    >
                                      Static
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateCardButton(bIdx, "urlType", "DYNAMIC");
                                        if (!b.url?.includes("{{1}}")) {
                                          const base = b.url ? b.url.replace(/\/+$/, "") : `https://${brandDomain}/products`;
                                          updateCardButton(bIdx, "url", `${base}/{{1}}`);
                                        }
                                        if (!b.urlExample) updateCardButton(bIdx, "urlExample", "product-id");
                                      }}
                                      className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                                        b.urlType === "DYNAMIC" ? "bg-purple-600 text-white font-bold shadow-2xs" : "text-gray-500"
                                      }`}
                                    >
                                      <Zap size={9} /> Dynamic (&#123;&#123;1&#125;&#125;)
                                    </button>
                                  </div>
                                </div>

                                <input
                                  value={b.url || ""}
                                  onChange={(e) => updateCardButton(bIdx, "url", e.target.value)}
                                  placeholder={b.urlType === "DYNAMIC" ? `https://${brandDomain}/products/{{1}}` : `https://${brandDomain}/products`}
                                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                                />

                                {b.urlType === "DYNAMIC" && (
                                  <div className="p-2 bg-purple-50/60 dark:bg-purple-950/40 rounded-lg border border-purple-100 dark:border-purple-900/60 flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-purple-900 dark:text-purple-200">
                                      Sample Value for Meta Approval:
                                    </span>
                                    <input
                                      value={b.urlExample || ""}
                                      onChange={(e) => updateCardButton(bIdx, "urlExample", e.target.value)}
                                      placeholder="e.g. tee-black or 10294"
                                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded text-xs font-mono"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 7: PROMINENT FOOTER SECTION (AVAILABLE ACROSS ALL TEMPLATE TYPES!) */}
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-gray-700 dark:text-gray-300">
                  7. Footer (Optional)
                </label>
                <span className="text-[10px] text-gray-400">
                  {footerText.length}/{META_LIMITS.FOOTER_MAX} chars
                </span>
              </div>
              <input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder={`e.g. ${brandName} | Reply STOP to opt out`}
                maxLength={META_LIMITS.FOOTER_MAX}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* STEP 8: INTERACTIVE BUTTONS (FOR STANDARD & UTILITY TEMPLATES) */}
            {templateType !== "CAROUSEL" && (
              <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black uppercase text-gray-700 dark:text-gray-200 tracking-wider flex items-center gap-1.5">
                      <span>8. Interactive Action Buttons</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                        {buttons.length}/3
                      </span>
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Add Call-To-Action URLs (Static or Dynamic variable), Call buttons, or Quick Replies.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => addButton("URL")}
                      disabled={buttons.length >= META_LIMITS.TOTAL_BUTTONS_MAX}
                      className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1 hover:bg-emerald-100 transition-colors shadow-2xs"
                    >
                      <Zap size={12} className="text-emerald-600 dark:text-emerald-400" />
                      + URL
                    </button>
                    <button
                      type="button"
                      onClick={() => addButton("QUICK_REPLY")}
                      disabled={buttons.length >= META_LIMITS.TOTAL_BUTTONS_MAX}
                      className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1 hover:bg-indigo-100 transition-colors shadow-2xs"
                    >
                      + Quick Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => addButton("PHONE_NUMBER")}
                      disabled={buttons.length >= META_LIMITS.TOTAL_BUTTONS_MAX}
                      className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1 hover:bg-amber-100 transition-colors shadow-2xs"
                    >
                      + Call
                    </button>
                  </div>
                </div>

                {buttons.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl text-center flex flex-col items-center justify-center gap-1 text-gray-400">
                    <Zap size={20} className="text-gray-300 dark:text-gray-600" />
                    <span className="text-xs font-bold">No buttons added yet</span>
                    <span className="text-[11px] text-gray-400">Click &quot;+ URL&quot; above to add a Dynamic or Static CTA button.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="p-4 bg-gray-50/90 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col gap-3">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 shadow-2xs">
                              {btn.type === "QUICK_REPLY" ? "↩️ Quick Reply" : btn.type === "URL" ? "🔗 Website CTA" : btn.type === "COPY_CODE" ? "🏷️ Coupon Code" : "📞 Phone Call"}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400">Button #{idx + 1}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeButton(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                            title="Delete Button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Button Label Input */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Button Text / Label (Max 25 chars)
                          </label>
                          <input
                            value={btn.text}
                            onChange={(e) => updateButton(idx, "text", e.target.value)}
                            placeholder={btn.type === "URL" ? "e.g. Track Order" : btn.type === "PHONE_NUMBER" ? "e.g. Call Support" : "e.g. Yes, I'm interested"}
                            maxLength={META_LIMITS.BUTTON_TEXT_MAX}
                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* If URL Button: Show Static vs Dynamic Mode Selector */}
                        {btn.type === "URL" && (
                          <div className="flex flex-col gap-2.5 pt-2 border-t border-gray-200/70 dark:border-slate-700/70">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                                URL Type & Destination
                              </label>
                              {/* Segmented Mode Selector */}
                              <div className="inline-flex p-0.5 bg-gray-200/80 dark:bg-slate-800 rounded-xl border border-gray-300/60 dark:border-slate-700 text-[11px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateButton(idx, "urlType", "STATIC");
                                    if (btn.url?.includes("{{1}}")) {
                                      updateButton(idx, "url", btn.url.replace("/{{1}}", "").replace("{{1}}", ""));
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                    btn.urlType !== "DYNAMIC"
                                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-black"
                                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                  }`}
                                >
                                  🌐 Static URL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateButton(idx, "urlType", "DYNAMIC");
                                    if (!btn.url?.includes("{{1}}")) {
                                      const base = btn.url ? btn.url.replace(/\/+$/, "") : `https://${brandDomain}/track`;
                                      updateButton(idx, "url", `${base}/{{1}}`);
                                    }
                                    if (!btn.urlExample) {
                                      updateButton(idx, "urlExample", "ESP-88294");
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                    btn.urlType === "DYNAMIC"
                                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-2xs font-black"
                                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                  }`}
                                >
                                  <Zap size={11} className="fill-current" />
                                  <span>Dynamic URL (&#123;&#123;1&#125;&#125;)</span>
                                </button>
                              </div>
                            </div>

                            {/* Static URL Input */}
                            {btn.urlType !== "DYNAMIC" ? (
                              <div>
                                <input
                                  value={btn.url || ""}
                                  onChange={(e) => updateButton(idx, "url", e.target.value)}
                                  placeholder={`https://${brandDomain}/shop`}
                                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] text-gray-400 mt-1 block">
                                  Direct web address opened when recipient taps the button.
                                </span>
                              </div>
                            ) : (
                              /* Dynamic URL Configuration */
                              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                    <Zap size={13} className="text-indigo-600 dark:text-indigo-400" />
                                    Dynamic Website URL
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!btn.url?.includes("{{1}}")) {
                                        const base = btn.url ? btn.url.replace(/\/+$/, "") : `https://${brandDomain}/track`;
                                        updateButton(idx, "url", `${base}/{{1}}`);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-[10px] font-bold hover:bg-indigo-200 cursor-pointer"
                                  >
                                    + Insert &#123;&#123;1&#125;&#125; Suffix
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                                    Base URL with Variable Suffix
                                  </label>
                                  <input
                                    value={btn.url || ""}
                                    onChange={(e) => updateButton(idx, "url", e.target.value)}
                                    placeholder={`https://${brandDomain}/track/{{1}}`}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                                      Sample / Example Variable (Required by Meta)
                                    </label>
                                    <span className="text-[9px] text-indigo-500 font-semibold">e.g. Order ID, Tracking Code</span>
                                  </div>
                                  <input
                                    value={btn.urlExample || ""}
                                    onChange={(e) => updateButton(idx, "urlExample", e.target.value)}
                                    placeholder="e.g. ESP-88294 or 10029"
                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                {/* Quick Dynamic Presets */}
                                <div>
                                  <span className="text-[10px] font-bold text-gray-500 block mb-1">Quick Dynamic Presets:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateButton(idx, "text", "Track Order");
                                        updateButton(idx, "url", `https://${brandDomain}/track/{{1}}`);
                                        updateButton(idx, "urlExample", "ESP-88294");
                                      }}
                                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:border-indigo-400 cursor-pointer shadow-2xs"
                                    >
                                      📦 Track Order
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateButton(idx, "text", "Complete Order");
                                        updateButton(idx, "url", `https://${brandDomain}/checkout?token={{1}}`);
                                        updateButton(idx, "urlExample", "cart_tok_9912");
                                      }}
                                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:border-indigo-400 cursor-pointer shadow-2xs"
                                    >
                                      🛒 Shopify Checkout
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateButton(idx, "text", "View Invoice");
                                        updateButton(idx, "url", `https://${brandDomain}/invoices/{{1}}`);
                                        updateButton(idx, "urlExample", "INV-2026-091");
                                      }}
                                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:border-indigo-400 cursor-pointer shadow-2xs"
                                    >
                                      🧾 View Invoice
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateButton(idx, "text", "Claim Offer");
                                        updateButton(idx, "url", `https://${brandDomain}/deals?promo={{1}}`);
                                        updateButton(idx, "urlExample", "SAVE30");
                                      }}
                                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:border-indigo-400 cursor-pointer shadow-2xs"
                                    >
                                      🎁 Promo Link
                                    </button>
                                  </div>
                                </div>

                                {/* Simulated URL Review Preview */}
                                <div className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg border border-indigo-100 dark:border-indigo-900 text-[10.5px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 font-mono">
                                  <span className="font-sans font-bold text-indigo-600">Simulated Review Link:</span>
                                  <span className="truncate text-gray-900 dark:text-white font-black">
                                    {btn.url ? (btn.url.includes("{{1}}") ? btn.url.replace("{{1}}", btn.urlExample || "ESP-88294") : `${btn.url}/${btn.urlExample || "ESP-88294"}`) : `https://${brandDomain}/track/ESP-88294`}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Phone Number Input */}
                        {btn.type === "PHONE_NUMBER" && (
                          <div className="flex flex-col gap-1 pt-2 border-t border-gray-200/70 dark:border-slate-700/70">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">
                              Phone Number (with Country Code)
                            </label>
                            <input
                              value={btn.phone_number || ""}
                              onChange={(e) => updateButton(idx, "phone_number", e.target.value)}
                              placeholder="+917404388242"
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        {/* Copy Code / Coupon Input */}
                        {btn.type === "COPY_CODE" && (
                          <div className="flex flex-col gap-2.5 pt-2 border-t border-gray-200/70 dark:border-slate-700/70">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                                Coupon Code Type
                              </label>
                              <div className="inline-flex p-0.5 bg-gray-200/80 dark:bg-slate-800 rounded-xl border border-gray-300/60 dark:border-slate-700 text-[11px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateButton(idx, "isDynamicCode", false);
                                    updateButton(idx, "code", couponCode || "FLAT30");
                                  }}
                                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                    !btn.isDynamicCode && btn.code !== "{{1}}"
                                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-black"
                                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                  }`}
                                >
                                  🏷️ Static Code
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateButton(idx, "isDynamicCode", true);
                                    updateButton(idx, "code", "{{1}}");
                                    if (!btn.exampleCode) updateButton(idx, "exampleCode", "FLAT30");
                                  }}
                                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                    btn.isDynamicCode || btn.code === "{{1}}"
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xs font-black"
                                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                  }`}
                                >
                                  <Zap size={11} className="fill-current" />
                                  <span>Dynamic (&#123;&#123;1&#125;&#125;)</span>
                                </button>
                              </div>
                            </div>

                            {btn.isDynamicCode || btn.code === "{{1}}" ? (
                              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black text-emerald-900 dark:text-emerald-200">
                                    Sample Coupon Code (For Meta Approval)
                                  </span>
                                  <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
                                    Code: &#123;&#123;1&#125;&#125;
                                  </span>
                                </div>
                                <input
                                  value={btn.exampleCode || "FLAT30"}
                                  onChange={(e) => updateButton(idx, "exampleCode", e.target.value)}
                                  placeholder="e.g. FLAT30 or SUMMER20"
                                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            ) : (
                              <div>
                                <input
                                  value={btn.code || couponCode}
                                  onChange={(e) => updateButton(idx, "code", e.target.value)}
                                  placeholder="FLAT30"
                                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Smartphone Simulator (5 Cols) */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-600" />
                  <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-200">
                    Live WhatsApp Simulator
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
                  {category} • Meta View
                </span>
              </div>

              {/* Realistic Phone Frame */}
              <div className="w-full max-w-[340px] mx-auto bg-[#efeae2] dark:bg-slate-950 rounded-3xl border-4 border-gray-800 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
                {/* WhatsApp Chat Header with Dynamic Brand Name & Avatar */}
                <div className="bg-[#075e54] text-white p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center uppercase">
                      {brandName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center gap-1">
                        {brandName} Official
                        <CheckCircle2 size={11} className="text-emerald-300 fill-emerald-300 text-[#075e54]" />
                      </div>
                      <div className="text-[9px] text-emerald-200">Verified Business Account</div>
                    </div>
                  </div>
                  <div className="text-[10px] opacity-80">{liveCurrentTime}</div>
                </div>

                {/* WhatsApp Chat Area */}
                <div className="p-3 flex flex-col gap-3 min-h-[380px] max-h-[500px] overflow-y-auto">
                  {/* Chat Message Bubble */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tr-xs p-3 shadow-sm text-xs text-gray-900 dark:text-gray-100 max-w-[95%] flex flex-col gap-2 self-start">
                    
                    {/* Header Display */}
                    {headerType === "TEXT" && headerContent && (
                      <div className="font-black text-xs pb-1.5 border-b border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white">
                        {headerContent}
                      </div>
                    )}

                    {headerType === "IMAGE" && headerMediaPreview && (
                      <div className="rounded-xl overflow-hidden max-h-40 bg-gray-100 dark:bg-slate-700">
                        <img
                          src={headerMediaPreview}
                          alt="Header media preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {headerType === "VIDEO" && (
                      <div className="h-32 rounded-xl bg-gray-900 text-white flex items-center justify-center gap-2 text-xs font-bold">
                        <Video size={20} />
                        <span>Video Header</span>
                      </div>
                    )}

                    {headerType === "DOCUMENT" && (
                      <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center gap-2 text-xs font-bold">
                        <FileCheck size={18} className="text-indigo-600" />
                        <span>Attached Document / PDF</span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="whitespace-pre-wrap leading-relaxed text-xs">
                      {getRenderedPreviewText(bodyText) || (
                        <span className="text-gray-400 italic">Enter message body...</span>
                      )}
                    </div>

                    {/* Footer */}
                    {footerText && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 italic">
                        {footerText}
                      </div>
                    )}

                    {/* Catalogue Action Preview */}
                    {templateType === "CATALOGUE" && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 text-[11px] text-sky-900 dark:text-sky-200 flex items-center gap-2">
                          <ShoppingBag size={14} className="text-sky-600 flex-shrink-0" />
                          <span className="font-bold">Catalog items connected from Meta Commerce</span>
                        </div>
                        <div className="bg-[#00a884] text-white rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                          <ShoppingBag size={13} />
                          <span>View catalog</span>
                        </div>
                      </div>
                    )}

                    {/* Flows Action Preview */}
                    {templateType === "FLOWS" && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                          <CheckSquare size={14} className="text-emerald-600 flex-shrink-0" />
                          <span className="font-bold">Interactive Meta Flow Form</span>
                        </div>
                        <div className="bg-emerald-600 text-white rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                          <FileCode size={13} />
                          <span>{flowButtonText || "View Flow"}</span>
                        </div>
                      </div>
                    )}

                    {/* Order Details Preview */}
                    {templateType === "ORDER_DETAILS" && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-col gap-1 text-[11px]">
                          <div className="flex justify-between font-bold text-amber-950 dark:text-amber-200">
                            <span>Order #ESP-8834</span>
                            <span className="text-emerald-600 dark:text-emerald-400">Total: ₹1,499</span>
                          </div>
                          <div className="text-[10px] text-gray-500">1x Pro Dry-Fit Performance Tee</div>
                        </div>
                        <div className="bg-[#00a884] text-white rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                          <CreditCard size={13} />
                          <span>Review and Pay</span>
                        </div>
                      </div>
                    )}

                    {/* Order Status Preview */}
                    {templateType === "ORDER_STATUS" && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                            <Truck size={14} className="text-blue-600" />
                            <span>Shipped via Bluedart</span>
                          </div>
                          <span className="text-[10px] text-blue-600 font-black">Out for delivery</span>
                        </div>
                        <div className="bg-blue-600 text-white rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                          <ExternalLink size={13} />
                          <span>Track shipment</span>
                        </div>
                      </div>
                    )}

                    {/* Calling Permissions Preview */}
                    {templateType === "CALL_PERMISSIONS" && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px] text-rose-950 dark:text-rose-200">
                          {brandName} would like to call you on WhatsApp regarding your order inquiry.
                        </div>
                        <div className="bg-rose-600 text-white rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                          <Phone size={13} />
                          <span>Choose preference</span>
                        </div>
                      </div>
                    )}

                    {/* Authentication Preview */}
                    {category === "AUTHENTICATION" && (
                      <div className="mt-2 pt-2 border-t border-orange-100 dark:border-orange-950 flex flex-col gap-2">
                        {authSecurityRecommendation && (
                          <div className="text-[10px] text-gray-500 italic">
                            For your security, do not share this code.
                          </div>
                        )}
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/50 rounded-xl border border-dashed border-orange-300 text-center flex flex-col gap-1.5">
                          <div className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase">
                            Verification Code:
                          </div>
                          <div className="py-1 px-4 bg-white dark:bg-slate-800 rounded-lg font-mono font-black text-lg text-orange-600 tracking-widest self-center shadow-2xs">
                            583 920
                          </div>
                          {authExpiryTime && (
                            <div className="text-[9px] text-orange-700 dark:text-orange-400">
                              ⏱️ Code expires in {authExpiryMinutes} minutes
                            </div>
                          )}
                        </div>
                        <div className="bg-orange-600 text-white rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                          <Copy size={13} />
                          <span>{authCodeDelivery === "ZERO_TAP" ? "Auto-filling in App..." : authCodeDelivery === "ONE_TAP" ? "One-Tap Verify" : "Copy code"}</span>
                        </div>
                      </div>
                    )}

                    {/* Standard CTA Buttons inside bubble */}
                    {templateType !== "CAROUSEL" && templateType !== "CATALOGUE" && templateType !== "FLOWS" && templateType !== "ORDER_DETAILS" && templateType !== "ORDER_STATUS" && templateType !== "CALL_PERMISSIONS" && category !== "AUTHENTICATION" && buttons.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                        {buttons.map((b, i) => {
                          const isDynamicUrl = b.type === "URL" && (b.urlType === "DYNAMIC" || b.url?.includes("{{1}}"));
                          const isDynamicCode = b.type === "COPY_CODE" && (b.isDynamicCode || b.code === "{{1}}");
                          const dynamicVal = b.urlExample || "ESP-88294";
                          const resolvedLink = b.url ? (b.url.includes("{{1}}") ? b.url.replace("{{1}}", dynamicVal) : `${b.url}/${dynamicVal}`) : "";

                          return (
                            <div
                              key={i}
                              title={isDynamicUrl ? `Dynamic Link: ${resolvedLink}` : undefined}
                              className="bg-gray-50 dark:bg-slate-700 rounded-xl py-2 px-3 text-center text-xs font-bold text-sky-600 dark:text-sky-400 border border-gray-200 dark:border-slate-600 flex items-center justify-center gap-1.5 shadow-2xs hover:bg-sky-50 dark:hover:bg-slate-600 transition-colors"
                            >
                              {b.type === "URL" ? (
                                isDynamicUrl ? <Zap size={12} className="text-amber-500 fill-amber-500" /> : <ExternalLink size={12} />
                              ) : b.type === "PHONE_NUMBER" ? (
                                <Phone size={12} />
                              ) : b.type === "COPY_CODE" ? (
                                <Copy size={12} />
                              ) : (
                                <span>↩️</span>
                              )}
                              <span>{b.text || "Action"}</span>
                              {isDynamicUrl && (
                                <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-mono font-normal">
                                  &#123;&#123;1&#125;&#125;
                                </span>
                              )}
                              {isDynamicCode && (
                                <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono font-normal">
                                  Dynamic
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* LTO Coupon Button */}
                    {templateType === "LTO_COUPON" && (
                      <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-dashed border-emerald-300 text-center flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                          COUPON DISCOUNT CODE:
                        </div>
                        <div className="py-1.5 px-3 bg-white dark:bg-slate-800 rounded-lg font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                          <Copy size={12} />
                          <span>{couponCode || "FLAT30"}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 text-[9px] text-gray-400 mt-1">
                      <span>{liveCurrentTime}</span>
                      <CheckCheck size={12} className="text-sky-500 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* CAROUSEL SWIPEABLE PREVIEW */}
                  {templateType === "CAROUSEL" && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-purple-700 dark:text-purple-300">
                        <span>Swipeable Cards Preview ({carouselCards.length}):</span>
                        <span>← Scroll Horizontally →</span>
                      </div>

                      {/* Scroll container */}
                      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                        {carouselCards.map((card, cIdx) => (
                          <div
                            key={cIdx}
                            className="w-[200px] flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col justify-between"
                          >
                            <div>
                              {/* Media */}
                              <div className="h-28 bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
                                {card.mediaUrl ? (
                                  <img
                                    src={card.mediaUrl}
                                    alt={card.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon size={24} />
                                  </div>
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                                  #{cIdx + 1}
                                </span>
                              </div>

                              {/* Card Content */}
                              <div className="p-2.5 flex flex-col gap-1">
                                <div className="font-black text-xs text-gray-900 dark:text-white leading-snug">
                                  {card.title || "Product Title"}
                                </div>
                                <div className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight">
                                  {card.bodyText || "Price and description"}
                                </div>
                              </div>
                            </div>

                            {/* Card Buttons */}
                            <div className="p-2 pt-0 flex flex-col gap-1 border-t border-gray-100 dark:border-slate-700 mt-2">
                              {card.buttons.map((b, bi) => {
                                const isDynamic = b.type === "URL" && (b.urlType === "DYNAMIC" || b.url?.includes("{{1}}"));
                                return (
                                  <div
                                    key={bi}
                                    className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg py-1 px-2 text-center text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1"
                                  >
                                    {b.type === "URL" ? (
                                      isDynamic ? <Zap size={10} className="text-amber-500 fill-amber-500" /> : <ExternalLink size={10} />
                                    ) : (
                                      "↩️ "
                                    )}
                                    <span>{b.text || "Action"}</span>
                                    {isDynamic && (
                                      <span className="text-[8px] font-mono text-amber-600 dark:text-amber-300">&#123;&#123;1&#125;&#125;</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta Approval SLA Box */}
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <strong>Meta Approval Rules:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[10px]">
                  <li>Utility messages must NOT contain marketing or promotional content.</li>
                  <li>Carousel cards must have between 2 and 10 cards.</li>
                  <li>Images are verified automatically by Meta AI within 2-15 minutes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: TEMPLATES LIST PAGE
  // -------------------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: "10px",
            background: toastMsg.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            fontWeight: 700,
            fontSize: "13px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            maxWidth: "400px"
          }}
        >
          {toastMsg.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toastMsg.text}
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileCode size={22} className="text-indigo-600" />
            Meta Message Templates & Live Preview
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Connected Brand: <span className="font-bold text-indigo-600 dark:text-indigo-400">{brandName}</span> • Standard, Product Carousel (Swipeable), and Coupon templates.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="Test phone (91XXXXXXXXXX)"
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 shadow-2xs"
          />
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
            <span>Sync Meta</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setViewMode("CREATE");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>New Template Studio</span>
          </button>
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates or body text..."
              className="pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Type / Format Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer text-purple-600 dark:text-purple-400"
          >
            <option value="ALL">All Message Types</option>
            <option value="STANDARD">📄 Default</option>
            <option value="CAROUSEL">🖼️ Image Carousel</option>
            <option value="CATALOGUE">🛍️ Catalogue</option>
            <option value="FLOWS">📋 Flows</option>
            <option value="ORDER_DETAILS">💳 Order details</option>
            <option value="ORDER_STATUS">🚚 Order status</option>
            <option value="CALL_PERMISSIONS">📞 Call permissions</option>
            <option value="LTO_COUPON">🏷️ LTO Coupon</option>
            <option value="AUTHENTICATION">🔐 Authentication</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">✅ Approved</option>
            <option value="PENDING">⏳ Pending / In Review</option>
            <option value="REJECTED">❌ Rejected</option>
            <option value="PAUSED">⏸️ Paused</option>
          </select>

          {/* Time Range Filter */}
          <select
            value={timeRangeFilter}
            onChange={(e) => setTimeRangeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer text-indigo-600 dark:text-indigo-400"
          >
            <option value="ALL">🕒 All Time</option>
            <option value="TODAY">📅 Created Today</option>
            <option value="7D">⚡ Last 7 Days</option>
            <option value="30D">📊 Last 30 Days</option>
          </select>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <ArrowUpDown size={12} /> Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-black outline-none cursor-pointer"
          >
            <option value="newest">🕒 Newest Created</option>
            <option value="oldest">⏳ Oldest First</option>
            <option value="most_used">🚀 Most Sent / Dispatched</option>
            <option value="highest_read">👁️ Highest Read Rate</option>
            <option value="alphabetical">🔤 Name (A-Z)</option>
          </select>

          <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-gray-600 dark:text-gray-300">
            {filtered.length} {filtered.length === 1 ? "Template" : "Templates"}
          </span>
        </div>
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-indigo-500" />
          <div className="font-bold text-xs">Syncing templates from Meta Cloud API...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
          <FileCode size={44} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-black text-gray-800 dark:text-white text-base mb-1">No message templates found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Create your first Meta WhatsApp template using the dedicated Template Studio.
          </p>
          <button
            onClick={() => {
              resetForm();
              setViewMode("CREATE");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            + Open Template Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const createdFormatted = t.createdAt
              ? new Date(t.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true
                })
              : "Synchronized";

            const previewTime = t.createdAt
              ? new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
              : liveCurrentTime;

            let parsedCards: CarouselCardItem[] = [];
            if (t.carouselCards) {
              try {
                parsedCards = JSON.parse(t.carouselCards);
              } catch {}
            }

            return (
              <div
                key={t.id || t.name}
                className="bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-3xl p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-3.5"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-black text-sm text-gray-900 dark:text-white tracking-tight break-all">
                        {t.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {statusBadge(t.status)}
                        {formatBadge(t.templateType)}
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          {t.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500">
                          {t.language || "en_US"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCloneTemplate(t)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition cursor-pointer"
                        title="Clone / Duplicate this template"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.name)}
                        disabled={deleting === t.name}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                        title="Delete Template from Meta"
                      >
                        {deleting === t.name ? <RefreshCw size={14} className="animate-spin text-red-500" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Creation Timestamp Badge */}
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1 mb-2.5">
                    <Calendar size={11} className="text-gray-400" />
                    <span>Created: {createdFormatted}</span>
                  </div>

                  {/* WhatsApp Chat Preview Bubble */}
                  <div className="bg-[#e2ffc7] dark:bg-emerald-950/40 border border-[#c6f0a4] dark:border-emerald-800/50 rounded-2xl rounded-tr-xs p-3.5 text-xs text-gray-900 dark:text-gray-100 shadow-2xs">
                    {t.headerContent && (
                      <div className="font-black text-xs text-gray-900 dark:text-white mb-1.5 pb-1 border-b border-emerald-300/40 dark:border-emerald-700/40">
                        {t.headerContent}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                      {t.bodyText?.slice(0, 200)}
                      {t.bodyText?.length > 200 ? "..." : ""}
                    </div>
                    {t.footerText && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">
                        {t.footerText}
                      </div>
                    )}

                    {/* Carousel indicator snippet */}
                    {t.templateType === "CAROUSEL" && parsedCards.length > 0 && (
                      <div className="mt-2.5 p-2 bg-purple-100/70 dark:bg-purple-950/60 rounded-xl border border-purple-200 dark:border-purple-800 text-[10px] text-purple-900 dark:text-purple-200 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Layers size={12} />
                          {parsedCards.length} Product Cards
                        </span>
                        <span className="text-[9px] uppercase font-black">Swipeable</span>
                      </div>
                    )}

                    {/* Dynamic Message Time with Blue Double Ticks */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                      <span>{previewTime}</span>
                      <CheckCheck size={13} className="text-sky-500 inline stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Buttons preview */}
                  {t.buttons && t.buttons !== "[]" && (() => {
                    try {
                      const btns = JSON.parse(t.buttons);
                      if (btns.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {btns.map((b: any, i: number) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-[10px] font-bold flex items-center gap-1"
                              >
                                {b.type === "URL" ? "🔗" : b.type === "PHONE_NUMBER" ? "📞" : b.type === "COPY_CODE" ? "🏷️" : "↩️"} {b.text}
                              </span>
                            ))}
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </div>

                {/* Bottom Analytics & Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2.5">
                  {/* Performance stats mini-strip */}
                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-gray-50/80 dark:bg-slate-900/60 rounded-xl text-center border border-gray-100 dark:border-slate-800">
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Broadcasts</div>
                      <div className="text-xs font-black text-gray-800 dark:text-white mt-0.5">{t.campaignsCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Sent</div>
                      <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{t.totalSent || 0}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">Read Rate</div>
                      <div className="text-xs font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{t.readRate || 0}%</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase">CTR</div>
                      <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-0.5">{t.clickRate || 0}%</div>
                    </div>
                  </div>

                  {/* Test Send Button / Review Status Badge */}
                  {t.status === "APPROVED" ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleTest(t)}
                        disabled={testingTemplate === t.name}
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        {testingTemplate === t.name ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>{testingTemplate === t.name ? "Sending Test..." : "Send Test to Phone"}</span>
                      </button>
                      <a
                        href={`/whatsapp/broadcasts?template=${t.name}`}
                        className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <BellRing size={13} />
                        <span>📣 Launch Broadcast</span>
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="w-full py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border border-amber-200 dark:border-amber-800/60">
                        <Clock size={13} className="animate-pulse text-amber-600 dark:text-amber-400" />
                        <span>{t.status === "REJECTED" ? "Template Rejected by Meta" : "Under Review by Meta (1-5 Min Pipeline)"}</span>
                      </div>

                      {/* Action buttons for Pending / In Review templates */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRefreshStatus(t.name)}
                          disabled={refreshingTemplate === t.name}
                          className="py-2 px-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Query Meta Graph API directly for real-time approval status"
                        >
                          <RefreshCw size={12} className={refreshingTemplate === t.name ? "animate-spin text-indigo-500" : "text-gray-400"} />
                          <span>{refreshingTemplate === t.name ? "Checking..." : "Sync Status"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFastTrackModalTmpl(t)}
                          className="py-2 px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          title="Fix compliance issues and submit for guaranteed 1-5 minute automated approval"
                        >
                          <Zap size={12} className="fill-white" />
                          <span>⚡ Fast-Track (5 Min)</span>
                        </button>
                      </div>

                      {t.rejectionReason && t.rejectionReason !== "NONE" && (
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-[10px] text-rose-700 dark:text-rose-300">
                          <strong>Meta Rejection Reason:</strong> {t.rejectionReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 5-MINUTE FAST-TRACK META APPROVAL MODAL ===== */}
      {fastTrackModalTmpl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                  <Zap size={20} className="fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">5-Minute Meta Fast-Track Approval</h3>
                  <p className="text-[11px] text-gray-500">Fix & resubmit "{fastTrackModalTmpl.name}" for instant approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFastTrackModalTmpl(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Why it was in review */}
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col gap-1.5">
              <div className="text-[11px] font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Why is Meta taking longer than 5 minutes?</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Meta automatically approves message templates within <strong>1 to 5 minutes</strong> unless flagged for manual compliance review. Common blockers:
              </p>
              <ul className="text-[10px] text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5 mt-0.5">
                <li><strong>Mixed Button Types:</strong> Carousel cards cannot mix Quick Reply with Website Links.</li>
                <li><strong>Generic Test Name:</strong> Names like "testing" get diverted to Meta's 24-48 hr human review queue.</li>
                <li><strong>Media Sample Handles:</strong> Meta requires fresh 1:1 image upload handles with high-res dimensions.</li>
              </ul>
            </div>

            {/* Automatic Fixes Applied */}
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col gap-1.5">
              <div className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Automated Fixes for Instant 1-5 Min Approval:</span>
              </div>
              <div className="grid grid-cols-1 gap-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Converts all buttons to uniform, high-converting CTAs (<strong>Buy Now</strong> + <strong>Explore More</strong>).</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Assigns a clean, production-grade template name (e.g. <code>{fastTrackModalTmpl.name}_v2</code>).</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Uploads fresh high-resolution media handles directly via Meta Resumable Upload API.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>Strictly caps card bodies to 160 characters and button labels to 25 characters.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setFastTrackModalTmpl(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleFastApproveResubmit(fastTrackModalTmpl.name)}
                disabled={resubmittingTemplate === fastTrackModalTmpl.name}
                className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {resubmittingTemplate === fastTrackModalTmpl.name ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Uploading Handles & Submitting to Meta...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} className="fill-white" />
                    <span>🚀 Submit Clean Version (1-5 Min Approval)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
