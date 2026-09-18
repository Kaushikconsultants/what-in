"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import TemplatePickerModal from "./TemplatePickerModal";
import FlowPickerModal from "./FlowPickerModal";
import ProductCatalogPanel from "./ProductCatalogPanel";
import {
  Search,
  Filter,
  MessageSquare,
  UserCheck,
  UserX,
  Users,
  Star,
  CheckCheck,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  ChevronRight,
  ChevronLeft,
  Tag,
  Clock,
  DollarSign,
  FileText,
  ShoppingBag,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Bot,
  Zap,
  MoreVertical,
  Plus,
  PlusCircle,
  FileCode,
  CreditCard,
  Edit3,
  Check,
  ArrowRight,
  Building,
  MapPin,
  Mail,
  User,
  Sparkles,
  RefreshCw,
  X,
  BookOpen,
  Maximize2,
  Minimize2,
  ExternalLink,
  ImageIcon,
  PlayCircle,
  Volume2,
  VideoIcon,
  Mic,
  Download,
  Terminal,
  Activity,
  XCircle,
  CheckCircle2,
  Pause,
  Settings,
  CheckCircle,
  Copy,
  Lock,
  ArrowLeft,
  CornerDownLeft,
  Globe,
  Compass,
  Eye,
  Monitor
} from "lucide-react";
import {
  getWhatsAppConversations,
  getWhatsAppConversationById,
  sendWhatsAppMessageAction,
  updateCRMProfileFromWhatsApp,

  generateWhatsAppPaymentLinkAction,
  assignWhatsAppLeadAction,
  getAllEmployeesAndTeams,
  toggleConversationAIAction,
  toggleConversationStatusAction,
  unassignWhatsAppConversationAction,

  uploadMediaToMetaAction,
  getWhatsAppCannedResponsesAction,
  createWhatsAppCannedResponseAction,
  updateWhatsAppCannedResponseAction,
  deleteWhatsAppCannedResponseAction,
  sendWhatsAppTemplateAction,
  sendProductCardAction,
  sendWhatsAppFlowMessageAction,
  getWhatsAppSettingsAction,
  retryFailedWhatsAppMessageAction,
  getWhatsAppTemplates,
  getProductsAction
} from "@/app/actions/whatsAppPlatformActions";
import { getWhatsAppIntegrationsAction, pushLeadToIntegrationAction } from "@/app/actions/whatsAppIntegrationActions";
import { getPaymentGatewaySettings } from "@/app/actions/paymentGatewayActions";
import { useWhatsAppStore } from "@/store/whatsappStore";
import { formatWhatsAppPhone, getCustomerDisplayName, getCustomerAvatarInitials, getCustomerSubtitle, getCountryInfo } from "@/lib/phoneUtils";
import "./WhatsAppInbox.css";

// WhatsApp Text Formatter Helper (Handles *bold*, _italic_, ~strike~, `code`, newlines and links)
const parseInlineWhatsAppTokens = (line: string): React.ReactNode[] => {
  if (!line) return [];
  const tokens: React.ReactNode[] = [];
  const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`|https?:\/\/[^\s]+)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(line.substring(lastIdx, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token}`;
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      tokens.push(<strong key={key} style={{ fontWeight: 700 }}>{token.slice(1, -1)}</strong>);
    } else if (token.startsWith('_') && token.endsWith('_') && token.length >= 2) {
      tokens.push(<em key={key} style={{ fontStyle: 'italic' }}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('~') && token.endsWith('~') && token.length >= 2) {
      tokens.push(<del key={key} style={{ textDecoration: 'line-through' }}>{token.slice(1, -1)}</del>);
    } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      tokens.push(<code key={key} style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em' }}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      tokens.push(
        <a 
          key={key} 
          href={token} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#38bdf8', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </a>
      );
    } else {
      tokens.push(token);
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < line.length) {
    tokens.push(line.substring(lastIdx));
  }

  return tokens.length > 0 ? tokens : [line];
};

export const renderWhatsAppFormattedText = (text: string) => {
  if (!text) return null;
  const lines = String(text).split('\n');
  return lines.map((line, lIdx) => (
    <React.Fragment key={lIdx}>
      {lIdx > 0 && <br />}
      {parseInlineWhatsAppTokens(line)}
    </React.Fragment>
  ));
};

export interface ParsedWhatsAppCtaButton {
  text: string;
  url: string;
}

export const extractWhatsAppCtaAndBody = (rawContent: string): { bodyText: string; ctaButtons: ParsedWhatsAppCtaButton[] } => {
  if (!rawContent) return { bodyText: "", ctaButtons: [] };
  const lines = String(rawContent).split("\n");
  const bodyLines: string[] = [];
  const ctaButtons: ParsedWhatsAppCtaButton[] = [];

  // Match CTA button patterns at the end of the message:
  // e.g. "🔗 *Visit store 🌐*: https://esponsports.com"
  // "🔗 Visit store: https://esponsports.com"
  // "👉 Visit Website: https://..."
  const ctaRegex = /^(?:🔗|👉|➡️|🌐)?\s*\*?([^*:\n]+)\*?\s*:\s*(https?:\/\/[^\s]+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(ctaRegex);
    if (match && (trimmed.startsWith("🔗") || trimmed.startsWith("👉") || trimmed.includes("Visit") || trimmed.includes("Store") || trimmed.includes("Catalog") || trimmed.includes("Website") || trimmed.includes("Link") || trimmed.includes("Shop") || trimmed.includes("View") || trimmed.includes("http"))) {
      let btnTitle = match[1].replace(/^[🔗👉➡️🌐\s*]+|[*\s:]+$/g, "").trim();
      // Remove any surrounding bold or emoji artifacts cleanly
      btnTitle = btnTitle.replace(/^\*+|\*+$/g, "").trim();
      const url = match[2].trim();
      ctaButtons.push({ text: btnTitle || "Visit Link", url });
    } else {
      bodyLines.push(line);
    }
  }

  // If no CTA lines were detected, return raw text as body
  if (ctaButtons.length === 0) {
    return { bodyText: rawContent, ctaButtons: [] };
  }

  return {
    bodyText: bodyLines.join("\n").trim(),
    ctaButtons
  };
};

// Helper to force download media instead of opening in a new tab
const forceDownloadMedia = async (url: string, e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!url) return;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = url.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Failed to download media:", err);
    window.open(url, "_blank");
  }
};

const EMOJI_LIST = ["👍", "🙏", "✅", "📦", "📄", "💰", "📞", "❤️", "🔥", "💯", "🏷️", "🚚"];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
  "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
  "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
];

export const getAvatarGradient = (str?: string | null): string => {
  if (!str) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

export default function WhatsAppInboxComponent() {
  const { conversations, setConversations, activeConvDetail, setActiveConvDetail } = useWhatsAppStore();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loadingConvs, setLoadingConvs] = useState<boolean>(conversations.length === 0);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);


  // Full Screen & Sidebar Collapse States
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Voice Note Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const lastScrollConvIdRef = useRef<string | null>(null);

  // Attachment File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cannedPopupRef = useRef<HTMLDivElement>(null);
  const cannedPopupSearchRef = useRef<HTMLInputElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quickRepliesBtnRef = useRef<HTMLButtonElement>(null);
  const quickRepliesBarBtnRef = useRef<HTMLButtonElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [aiToggleLoading, setAiToggleLoading] = useState<boolean>(false);
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [showCannedResponses, setShowCannedResponses] = useState<boolean>(false);
  const [cannedPopupSearch, setCannedPopupSearch] = useState<string>("");
  const [cannedPopupHighlight, setCannedPopupHighlight] = useState<number>(0);
  const [showTemplatePicker, setShowTemplatePicker] = useState<boolean>(false);
  const [showProductPanel, setShowProductPanel] = useState<boolean>(false);
  const [showFlowPicker, setShowFlowPicker] = useState<boolean>(false);
  const [retryingMsgId, setRetryingMsgId] = useState<string | null>(null);
  const [approvedTemplates, setApprovedTemplates] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [expandedJourneyMsgIds, setExpandedJourneyMsgIds] = useState<Record<string, boolean>>({});
  const [expandedCrmJourney, setExpandedCrmJourney] = useState<boolean>(false);

  // Website Tracking & Live Activity States
  const [showWebsiteTrackingDrawer, setShowWebsiteTrackingDrawer] = useState<boolean>(false);
  const [liveCustomerActivityMap, setLiveCustomerActivityMap] = useState<Record<string, any>>({});
  const [customerWebSessions, setCustomerWebSessions] = useState<any[]>([]);
  const [loadingWebSessions, setLoadingWebSessions] = useState<boolean>(false);

  // Active customer normalized phone number
  const activeCustomerPhone = useMemo(() => {
    if (!activeConvDetail) return "";
    const p = (activeConvDetail.customer?.mobile || 
               activeConvDetail.customer?.whatsappNumber || 
               activeConvDetail.senderPhone || 
               activeConvDetail.phone || "");
    return String(p).replace(/\D/g, "");
  }, [activeConvDetail]);

  const fetchCustomerWebSessions = async (phoneToFetch?: string) => {
    const targetPhone = phoneToFetch || activeCustomerPhone;
    if (!targetPhone || targetPhone.length < 6) return;
    setLoadingWebSessions(true);
    try {
      const res = await fetch(`/api/widget/leads?phone=${targetPhone}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setCustomerWebSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch customer web sessions:", err);
    } finally {
      setLoadingWebSessions(false);
    }
  };

  useEffect(() => {
    if (activeCustomerPhone) {
      fetchCustomerWebSessions(activeCustomerPhone);
    } else {
      setCustomerWebSessions([]);
    }
  }, [activeCustomerPhone]);



  // Preload approved templates, product catalog & CRM integrations for accurate previews and actions
  useEffect(() => {
    getWhatsAppTemplates()
      .then(res => {
        if (res?.templates) setApprovedTemplates(res.templates);
      })
      .catch(() => {});

    getProductsAction()
      .then(res => {
        if (res?.products) setProductsList(res.products);
      })
      .catch(() => {});

    getWhatsAppIntegrationsAction()
      .then(res => {
        if (res?.integrations) setIntegrations(res.integrations);
      })
      .catch(() => {});
  }, []);
  
  // Check 24-hour window status
  const checkSessionExpired = () => {
    if (!activeConvDetail) return { expired: false, hoursLeft: 24, neverMessaged: false, reason: "" };
    
    const msgs = activeConvDetail.messages || [];
    const customerMsgs = msgs.filter((m: any) => 
      (m.senderType === "CUSTOMER" || m.senderType === "USER" || m.role === "user") && !m.isInternalNote
    );

    let latestTimestamp = 0;
    if (customerMsgs.length > 0) {
      customerMsgs.forEach((m: any) => {
        const time = new Date(m.sentAt || m.created_at).getTime();
        if (!isNaN(time) && time > latestTimestamp) {
          latestTimestamp = time;
        }
      });
    } else if (activeConvDetail.lastMessageAt) {
      const time = new Date(activeConvDetail.lastMessageAt).getTime();
      if (!isNaN(time)) latestTimestamp = time;
    }

    if (!latestTimestamp) {
      return { 
        expired: true, 
        hoursLeft: 0, 
        neverMessaged: true, 
        reason: "Customer has not initiated a conversation yet. Start with a pre-approved template." 
      };
    }

    const diffMs = Date.now() - latestTimestamp;
    const isExpired = diffMs > 24 * 60 * 60 * 1000;
    const hoursLeft = Math.max(0, 24 - (diffMs / (3600 * 1000)));

    return { 
      expired: isExpired, 
      hoursLeft, 
      neverMessaged: false,
      reason: isExpired ? "24-Hour Session Window Expired" : `${hoursLeft.toFixed(1)} hours remaining in 24h window` 
    };
  };
  const sessionStatus = checkSessionExpired();

  // Name Inline Editing State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempCustomerName, setTempCustomerName] = useState<string>("");
  const [savingName, setSavingName] = useState<boolean>(false);

  // Canned Responses Management State
  const [isManagingReplies, setIsManagingReplies] = useState<boolean>(false);
  const [editingReply, setEditingReply] = useState<any | null>(null);
  const [replySearchTerm, setReplySearchTerm] = useState("");
  const [newReplyTitle, setNewReplyTitle] = useState("");
  const [newReplyShortcut, setNewReplyShortcut] = useState("");
  const [newReplyContent, setNewReplyContent] = useState("");
  const [savingCanned, setSavingCanned] = useState(false);

  // Filtered canned responses list computed with useMemo
  const filteredCanned = useMemo(() => {
    if (!cannedPopupSearch || !cannedPopupSearch.trim()) return cannedResponses;
    const q = cannedPopupSearch.toLowerCase().trim();
    return cannedResponses.filter(cr =>
      cr.title?.toLowerCase().includes(q) ||
      (cr.shortcut || "").toLowerCase().includes(q) ||
      cr.content?.toLowerCase().includes(q)
    );
  }, [cannedResponses, cannedPopupSearch]);

  const safeHighlight = Math.min(cannedPopupHighlight, Math.max(0, filteredCanned.length - 1));

  // Close canned popup when clicking outside
  useEffect(() => {
    if (!showCannedResponses) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        cannedPopupRef.current && !cannedPopupRef.current.contains(target) &&
        chatTextareaRef.current && !chatTextareaRef.current.contains(target) &&
        quickRepliesBtnRef.current && !quickRepliesBtnRef.current.contains(target) &&
        quickRepliesBarBtnRef.current && !quickRepliesBarBtnRef.current.contains(target)
      ) {
        setShowCannedResponses(false);
        setCannedPopupSearch("");
        setCannedPopupHighlight(0);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCannedResponses]);
  
  // Mentions Autocomplete State
  const [showMentionsMenu, setShowMentionsMenu] = useState<boolean>(false);
  const [mentionSearch, setMentionSearch] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("ALL");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // CRM Integrations
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [pushingToCrm, setPushingToCrm] = useState(false);
  const [showIntegrationsMenu, setShowIntegrationsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Toggle Full Screen Mode (Overlay + Native Fullscreen API)
  const toggleFullScreenMode = () => {
    if (!isFullScreen) {
      setIsFullScreen(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullScreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullScreen]);

  // Filtering & Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeNavTab, setActiveNavTab] = useState<string>("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Messaging Input State
  const [messageInput, setMessageInput] = useState<string>("");
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [aiSuggesting, setAiSuggesting] = useState<boolean>(false);

  // Modals
  const [showReplyLibraryModal, setShowReplyLibraryModal] = useState<boolean>(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState<boolean>(false);
  const [showQuoteModal, setShowQuoteModal] = useState<boolean>(false);
  const [followUpDays, setFollowUpDays] = useState<number>(3);
  const [followUpNotes, setFollowUpNotes] = useState<string>("");

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [sendingPayment, setSendingPayment] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assigningLead, setAssigningLead] = useState<boolean>(false);
  const [statusToggleLoading, setStatusToggleLoading] = useState<boolean>(false);

  // Tags State
  const [showTagsModal, setShowTagsModal] = useState<boolean>(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#e2e8f0");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Determine if active lead is already synced to CRM
  const isLeadPushed = useMemo(() => {
    if (!activeConvDetail) return false;
    const stage = (activeConvDetail.leadStatus || activeConvDetail.customer?.leadStage || "").toLowerCase();
    const notes = (activeConvDetail.customer?.notes || "").toLowerCase();
    return (
      stage.includes("crm") ||
      stage.includes("synced") ||
      stage.includes("won") ||
      notes.includes("pushed_to_crm") ||
      notes.includes("crm") ||
      notes.includes("erp")
    );
  }, [activeConvDetail?.leadStatus, activeConvDetail?.customer?.leadStage, activeConvDetail?.customer?.notes]);

  // Unified active tags (merged between conversation and customer, excluding legacy auto-tags)
  const handlePushToCrm = async (integrationId?: string) => {
    if (!activeConvDetail) return;
    setPushingToCrm(true);
    setShowIntegrationsMenu(false);
    setShowMoreMenu(false);
    try {
      const res = await pushLeadToIntegrationAction(activeConvDetail.id, integrationId);
      if (res.success) {
        setToastMsg(`✓ Lead pushed to ${res.targetName || 'Espon CRM & ERP'} successfully!`);
        if (res.customer) {
          setActiveConvDetail((prev: any) => ({
            ...prev,
            leadStatus: "CRM Synced",
            customer: {
              ...prev?.customer,
              ...res.customer,
              leadStage: "CRM Synced"
            }
          }));
        }
      } else {
        setToastMsg("CRM push error: " + (res.error || "Unknown failure"));
      }
    } catch (err: any) {
      setToastMsg("CRM push error: " + err.message);
    } finally {
      setPushingToCrm(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const [firingMetaLead, setFiringMetaLead] = useState(false);

  const handleMarkLeadInterested = async () => {
    if (!activeConvDetail) return;
    setFiringMetaLead(true);
    try {
      const res = await fetch("/api/whatsapp/mark-lead-interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activeConvDetail.customer?.whatsappNumber || activeConvDetail.customer?.mobile || activeConvDetail.phone,
          conversationId: activeConvDetail.id,
          // eventValue is now fetched from DB backend automatically
          customEventName: "Lead"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMsg(`Meta Lead Conversion fired successfully (₹10,000)! Trace ID: ${data.fbtrace_id}`);
      } else {
        setToastMsg(`Meta CAPI: ${data.error || "Failed to send conversion"}`);
      }
    } catch (err: any) {
      setToastMsg("Error firing Meta Lead conversion: " + err.message);
    } finally {
      setFiringMetaLead(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const activeTagsList = useMemo(() => {
    const isAuto = (t: string) => {
      const l = t.toLowerCase().trim();
      return l === 'whatsapp lead' || l === 'auto created';
    };
    const t1 = (activeConvDetail?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    const t2 = (activeConvDetail?.customer?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    return Array.from(new Set([...t1, ...t2])).filter(t => !isAuto(t));
  }, [activeConvDetail?.tags, activeConvDetail?.customer?.tags]);

  // Sort messages so that META_CTWA_AD messages are placed immediately before the customer message that triggered them
  const sortedMessages = useMemo(() => {
    if (!activeConvDetail?.messages) return [];
    const msgs = [...activeConvDetail.messages];

    msgs.sort((a: any, b: any) => {
      const isAAd = a.senderName === "META_CTWA_AD" || a.messageType === "META_CTWA_AD" || a.senderName === "WEBSITE_VISITOR_CONTEXT" || a.messageType === "WEBSITE_VISITOR_CONTEXT";
      const isBAd = b.senderName === "META_CTWA_AD" || b.messageType === "META_CTWA_AD" || b.senderName === "WEBSITE_VISITOR_CONTEXT" || b.messageType === "WEBSITE_VISITOR_CONTEXT";
      let timeA = new Date(a.sentAt).getTime();
      let timeB = new Date(b.sentAt).getTime();

      // If one is Ad/Website referral and the other is Customer incoming message within 30s, force referral before customer message
      if (isAAd && b.senderType === "CUSTOMER" && Math.abs(timeA - timeB) <= 30000) {
        return -1;
      }
      if (isBAd && a.senderType === "CUSTOMER" && Math.abs(timeA - timeB) <= 30000) {
        return 1;
      }
      if (timeA !== timeB) return timeA - timeB;
      if (isAAd) return -1;
      if (isBAd) return 1;
      return 0;
    });

    return msgs;
  }, [activeConvDetail?.messages]);

  // Extract latest Website Visitor Context & Cart Context for CRM 360 profile panel
  const latestWebsiteContext = useMemo(() => {
    if (!activeConvDetail?.messages) return null;
    const ctxMsg = [...activeConvDetail.messages].reverse().find(
      (m: any) => m.senderName === "WEBSITE_VISITOR_CONTEXT" || m.messageType === "WEBSITE_VISITOR_CONTEXT"
    );
    if (!ctxMsg) return null;
    try {
      return typeof ctxMsg.metadata === "string" ? JSON.parse(ctxMsg.metadata) : ctxMsg.metadata;
    } catch (_) {
      return null;
    }
  }, [activeConvDetail?.messages]);

  // Consolidated Website Tracking Data
  const activeWebsiteTrackingData = useMemo(() => {
    const live = activeCustomerPhone ? liveCustomerActivityMap[activeCustomerPhone] : null;
    const latestDbSession = customerWebSessions[0] || null;
    const msgCtx = latestWebsiteContext;

    const pageTitle = live?.pageTitle || latestDbSession?.pageTitle || msgCtx?.pageTitle || "Online Store";
    const pageUrl = live?.pageUrl || latestDbSession?.pageUrl || msgCtx?.pageUrl || "";
    const platform = live?.platform || latestDbSession?.platform || msgCtx?.platform || "Website";
    const categoryInsights = live?.categoryInsights || latestDbSession?.categoryInsights || msgCtx?.categoryInsights || null;

    const allSearches = Array.from(new Set([
      ...(Array.isArray(live?.searches) ? live.searches : []),
      ...(Array.isArray(latestDbSession?.searches) ? latestDbSession.searches : []),
      ...(Array.isArray(msgCtx?.searches) ? msgCtx.searches : []),
      ...(live?.searchQuery ? [live.searchQuery] : []),
    ])).filter(Boolean) as string[];

    const rawJourney = [
      ...(Array.isArray(live?.pageJourney) ? live.pageJourney : []),
      ...(Array.isArray(latestDbSession?.pageJourney) ? latestDbSession.pageJourney : []),
      ...(Array.isArray(msgCtx?.pageJourney) ? msgCtx.pageJourney : []),
    ];

    const seenPaths = new Set<string>();
    const pageJourney: any[] = [];
    for (const step of rawJourney) {
      const key = (step.path || step.url || "") + "_" + (step.timestamp || step.time || "");
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        pageJourney.push(step);
      }
    }

    const cart = live?.cart || latestDbSession?.cart || msgCtx?.cart || null;
    const detectedProduct = live?.detectedProduct || latestDbSession?.detectedProduct || msgCtx?.detectedProduct || null;
    const lastActivityTime = live?.timestamp || live?.lastActivityAt || latestDbSession?.createdAt || msgCtx?.timestamp || null;

    // Presence state calculation:
    // When visitor leaves/closes tab, script sends TAB_CLOSED beacon => presenceState: "OFFLINE", isOnline: false
    // When visitor switches tab, script sends TAB_AWAY => presenceState: "AWAY", isOnline: false
    // When visitor returns, script sends TAB_ACTIVE => presenceState: "ONLINE", isOnline: true
    // Heartbeats are sent every 25s while active.
    let presenceStatus: "ONLINE" | "AWAY" | "OFFLINE" = "OFFLINE";
    const now = Date.now();
    const lastActivityMs = lastActivityTime ? new Date(lastActivityTime).getTime() : 0;
    const diffMs = lastActivityMs ? (now - lastActivityMs) : Infinity;

    if (live) {
      if (live.presenceState === "OFFLINE" || live.isOnline === false || live.eventType === "TAB_CLOSED") {
        presenceStatus = "OFFLINE";
      } else if (live.presenceState === "AWAY" || live.eventType === "TAB_AWAY") {
        presenceStatus = diffMs < 3 * 60 * 1000 ? "AWAY" : "OFFLINE";
      } else if (live.presenceState === "ONLINE" || live.isOnline === true || live.isLiveNow) {
        // Active tab heartbeat is sent every 25s.
        // If ping received within 45s: ONLINE
        // If between 45s and 90s: AWAY
        // If older than 90s: OFFLINE
        if (diffMs < 45 * 1000) {
          presenceStatus = "ONLINE";
        } else if (diffMs < 90 * 1000) {
          presenceStatus = "AWAY";
        } else {
          presenceStatus = "OFFLINE";
        }
      }
    } else if (diffMs < 45 * 1000) {
      presenceStatus = "ONLINE";
    } else if (diffMs < 90 * 1000) {
      presenceStatus = "AWAY";
    } else {
      presenceStatus = "OFFLINE";
    }

    const isOnlineNow = presenceStatus === "ONLINE";
    const scrollDepth = typeof live?.scrollDepth === "number" ? live.scrollDepth : null;
    const viewport = live?.viewport || null;
    const lastInteraction = live?.lastInteraction || null;

    const hasAnyData = Boolean(
      live ||
      latestDbSession ||
      msgCtx ||
      pageJourney.length > 0 ||
      allSearches.length > 0 ||
      categoryInsights
    );

    return {
      hasAnyData,
      isOnlineNow,
      presenceStatus,
      scrollDepth,
      viewport,
      lastInteraction,
      lastActivityTime,
      pageTitle,
      pageUrl,
      platform,
      categoryInsights,
      searches: allSearches,
      pageJourney,
      cart,
      detectedProduct,
      liveEventLog: Array.isArray(live?.eventLog) ? live.eventLog : [],
    };
  }, [activeCustomerPhone, liveCustomerActivityMap, customerWebSessions, latestWebsiteContext]);

  // Quote Form State
  const [quoteItems, setQuoteItems] = useState([
    { name: "Cotton Polo T-Shirt (ESP-902)", quantity: 200, rate: 290 },
    { name: "Slim Fit Chino Pants (ESP-404)", quantity: 100, rate: 450 }
  ]);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(45000);
  const [paymentDesc, setPaymentDesc] = useState<string>("Advance Payment for Order #ORD-1092");
  const [paymentDeliveryMethod, setPaymentDeliveryMethod] = useState<'both'|'link'|'qr'>('both');
  const [paymentConfigured, setPaymentConfigured] = useState<boolean>(false);
  const [hasMetaCapi, setHasMetaCapi] = useState<boolean>(false);

  useEffect(() => {
    const checkPaymentSettings = async () => {
      try {
        const pg = await getPaymentGatewaySettings();
        const gw = (pg?.activeGateway || '').toUpperCase();
        let isConfigured = false;
        if (gw === 'RAZORPAY' && pg.razorpayKeyId && pg.razorpayKeyId.trim().length > 3) {
          isConfigured = true;
        } else if (gw === 'CASHFREE' && pg.cashfreeAppId && pg.cashfreeAppId.trim().length > 3) {
          isConfigured = true;
        } else if (gw === 'UPI' && pg.merchantUpiId && pg.merchantUpiId.trim().length > 3) {
          isConfigured = true;
        }
        setPaymentConfigured(isConfigured);
      } catch {
        setPaymentConfigured(false);
      }
    };
    checkPaymentSettings();
  }, []);

  // CRM Inline Edit States
  const [isEditingCRM, setIsEditingCRM] = useState<boolean>(false);
  const [crmEditData, setCrmEditData] = useState<any>({});

  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("Agent");
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("");
  const [rawAllChats, setRawAllChats] = useState<any[]>([]);

  // Real-time folder counts for All, Assigned, Unassigned, Closed
  const folderCounts = useMemo(() => {
    const list = rawAllChats.length > 0 ? rawAllChats : conversations;
    const isAgent = currentUserRole === 'AGENT' || currentUserRole === 'SALES';
    const all = list.filter((c: any) => c.status === 'OPEN').length;
    const assigned = list.filter((c: any) => {
      const empId = c._raw?.assignedEmployeeId;
      if (isAgent && currentEmployeeId) {
        return empId === currentEmployeeId && c.status === 'OPEN';
      }
      return Boolean(empId) && c.status === 'OPEN';
    }).length;
    const unassigned = list.filter((c: any) => {
      const empId = c._raw?.assignedEmployeeId;
      return (!empId || empId === "") && c.status === 'OPEN';
    }).length;
    const closed = list.filter((c: any) => c.status === 'CLOSED').length;
    return { all, assigned, unassigned, closed };
  }, [rawAllChats, conversations, currentUserRole, currentEmployeeId]);

  useEffect(() => {
    try {
      const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
      if (u) {
        const v = decodeURIComponent(u.split("=")[1]);
        const parsed = JSON.parse(v);
        const role = parsed.role || "";
        setCurrentUserRole(role);
        setCurrentEmployeeId(parsed.employeeId || "");
        if (role === 'AGENT' || role === 'SALES') {
          setActiveNavTab("assigned_to_me");
        }
      }
    } catch {}
  }, []);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  // WhatsApp Date & Media Helpers
  const formatConversationTime = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays >= 0) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  const formatChatDividerDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    
    const formattedDate = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });

    if (d.toDateString() === now.toDateString()) {
      return `Today • ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday • ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    }

    return formattedDate;
  };

  const formatMessageBubbleTime = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    if (d.toDateString() === now.toDateString()) {
      return `Today, ${timeStr}`;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return `${dateStr}, ${timeStr}`;
  };

  const resolveSafeMediaUrl = (url?: string | null) => {
    if (!url) return "";
    const clean = url.trim();
    if (clean.startsWith("data:") || clean.startsWith("blob:")) return clean;
    if (clean.includes("/api/whatsapp/media/")) {
      const idx = clean.indexOf("/api/whatsapp/media/");
      return clean.slice(idx);
    }
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    }
    return `/api/whatsapp/media/${clean}`;
  };

  // Fetch Employees List for Filtering & Assignment
  useEffect(() => {
    const fetchEmps = async () => {
      const res = await getAllEmployeesAndTeams();
      if (res.success && res.employees) {
        setEmployeesList(res.employees);
      }
    };
    fetchEmps();
    
    // Fetch Tags
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/whatsapp/tags');
        const data = await res.json();
        if (data.success && data.tags) {
          setAvailableTags(data.tags);
        }
      } catch (err) {
        console.error("Failed to fetch tags", err);
      }
    };
    fetchTags();

    // Fetch Canned Responses
    const fetchCanned = async () => {
      const res = await getWhatsAppCannedResponsesAction();
      if (res.success && res.responses) {
        setCannedResponses(res.responses);
      }
    };
    fetchCanned();
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    const res = await getWhatsAppIntegrationsAction();
    if (res.success && res.integrations) {
      // Exclude Meta CAPI / Pixel integrations so only CRM / ERP webhook integrations appear
      const crmOnly = res.integrations.filter((i: any) => {
        if (!i.isActive) return false;
        if (!i.url || !i.url.trim()) return false;
        const typeUpper = (i.type || '').toUpperCase();
        const nameLower = (i.name || '').toLowerCase();
        if (typeUpper === 'META_CAPI' || typeUpper === 'PIXEL' || typeUpper.includes('CAPI')) return false;
        if (nameLower.includes('pixel') && !nameLower.includes('crm') && !nameLower.includes('erp')) return false;
        return true;
      });
      setIntegrations(crmOnly);

      // Check for active Meta CAPI integration with valid Pixel ID & Access Token
      const capiActive = res.integrations.some((i: any) => {
        if (!i.isActive) return false;
        const typeUpper = (i.type || '').toUpperCase();
        const nameLower = (i.name || '').toLowerCase();
        const isCapi = typeUpper === 'META_CAPI' || typeUpper === 'PIXEL' || typeUpper.includes('CAPI') || nameLower.includes('pixel') || nameLower.includes('capi');
        return isCapi && Boolean(i.url?.trim()) && Boolean(i.token?.trim());
      });
      setHasMetaCapi(capiActive);
    } else {
      setIntegrations([]);
      setHasMetaCapi(false);
    }
  };

  // Fetch Conversations List — uses /api/whatsapp/inbox
  const fetchConversationsList = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const params = new URLSearchParams({ action: 'chats' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch('/api/whatsapp/inbox?' + params.toString(), { cache: 'no-store', credentials: 'include' });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();

      if (data.success && data.chats) {
        const mapped = data.chats.map((c: any) => ({
          id: c.id,
          status: (c.chat_status === 'open' ? 'OPEN' : 'CLOSED') as 'OPEN' | 'CLOSED',
          unreadCount: c.unreadCount || 0,
          lastMessageText: c.last_message,
          lastMessageAt: c.created_at,
          aiHandled: !c.ai_paused,
          tags: Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || ''),
          customer: {
            id: c.customerId,
            contactPerson: c.customer_name,
            businessName: c.customer_name,
            mobile: c.phone,
            whatsappNumber: c.phone,
            totalOrders: c.order_count || 0,
            leadStage: '',
            temperature: '',
          },
          _raw: c
        }));

        setRawAllChats(mapped);

        // Read user details from cookie for filtering to avoid stale state in closures
        let activeRole = currentUserRole;
        let activeEmpId = currentEmployeeId;
        try {
          const u = document.cookie.split(";").find((c: any) => c.trim().startsWith("wm_user="));
          if (u) {
            const v = decodeURIComponent(u.split("=")[1]);
            const parsed = JSON.parse(v);
            if (parsed.role) {
              activeRole = parsed.role;
              setCurrentUserRole(parsed.role);
            }
            if (parsed.name) setCurrentUserName(parsed.name);
            if (parsed.employeeId) {
              activeEmpId = parsed.employeeId;
              setCurrentEmployeeId(parsed.employeeId);
            }
          }
        } catch (e) {
          console.error("Error reading wm_user cookie", e);
        }

        // Apply Tab Filter (All, Assigned, Unassigned, Closed)
        let filtered = mapped;
        const isAgent = activeRole === 'AGENT' || activeRole === 'SALES';
        
        if (isAgent) {
          // Strict Agent Scoping: Agents can ONLY see chats assigned to them
          filtered = mapped.filter((c: any) => {
            const matchesEmp = activeEmpId ? c._raw.assignedEmployeeId === activeEmpId : true;
            return matchesEmp && (activeNavTab === 'closed' ? c.status === 'CLOSED' : c.status === 'OPEN');
          });
        } else {
          // Admin / Manager tab filtering
          if (activeNavTab === 'assigned_to_me') {
            filtered = mapped.filter((c: any) => 
              activeEmpId 
                ? c._raw.assignedEmployeeId === activeEmpId && c.status === 'OPEN'
                : c._raw.assignedEmployeeId !== null && c.status === 'OPEN'
            );
          } else if (activeNavTab === 'assigned') {
            filtered = mapped.filter((c: any) => c._raw.assignedEmployeeId !== null && c.status === 'OPEN');
          } else if (activeNavTab === 'unassigned') {
            filtered = mapped.filter((c: any) => c._raw.assignedEmployeeId === null && c.status === 'OPEN');
          } else if (activeNavTab === 'closed') {
            filtered = mapped.filter((c: any) => c.status === 'CLOSED');
          } else {
            filtered = mapped.filter((c: any) => c.status === 'OPEN'); // 'all'
          }
        }
        // Apply Lead Status Filter
        if (leadStatusFilter) {
          filtered = filtered.filter((c: any) => c.leadStatus === leadStatusFilter);
        }

        // Apply Unread Only Filter
        if (unreadOnly) {
          filtered = filtered.filter((c: any) => c.unreadCount > 0);
        }

        // Apply Employee Filter (Dropdown)
        if (filterEmployeeId) {
          filtered = filtered.filter((c: any) => c._raw.assignedEmployeeId === filterEmployeeId);
        }

        setConversations(filtered);
        
        if (!silent) {
          if (filtered.length > 0) {
            let matchedConv: any = null;
            if (typeof window !== "undefined") {
              const sp = new URLSearchParams(window.location.search);
              const paramConvId = sp.get("convId");
              const paramPhone = sp.get("phone") || sp.get("search");
              if (paramConvId) {
                matchedConv = filtered.find((c: any) => c.id === paramConvId);
              }
              if (!matchedConv && paramPhone) {
                const clean = paramPhone.replace(/\D/g, '').slice(-10);
                matchedConv = filtered.find((c: any) => 
                  (c.customer?.mobile && c.customer.mobile.includes(clean)) ||
                  (c.customer?.whatsappNumber && c.customer.whatsappNumber.includes(clean)) ||
                  (c.customer?.contactPerson && c.customer.contactPerson.toLowerCase().includes(paramPhone.toLowerCase()))
                );
              }
            }

            if (matchedConv) {
              setSelectedConvId(matchedConv.id);
            } else {
              const isCurrentInList = filtered.some((c: any) => c.id === selectedConvId);
              if (!selectedConvId || !isCurrentInList) {
                setSelectedConvId(filtered[0].id);
              }
            }
          } else {
            if (!selectedConvId) {
              setSelectedConvId(null);
              setActiveConvDetail(null);
            }
          }
        }
      } else {
        if (!silent) {
          setConversations([]);
          if (!selectedConvId) {
            setSelectedConvId(null);
            setActiveConvDetail(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
      if (!silent) setConversations([]);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  };

  // Read URL query params on mount for direct chat opening
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const paramConvId = sp.get("convId");
      const paramPhone = sp.get("phone") || sp.get("search");
      if (paramConvId) {
        setSelectedConvId(paramConvId);
        fetchConversationDetail(paramConvId, false);
      }
      if (paramPhone) {
        setSearchQuery(paramPhone);
      }
    }
  }, []);

  useEffect(() => {
    fetchConversationsList(conversations.length > 0);
  }, [searchQuery, activeNavTab, unreadOnly, leadStatusFilter, filterEmployeeId]);

  // Ref to hold current selected conversation ID for silent background polling
  const selectedConvIdRef = useRef(selectedConvId);
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  // Fetch Selected Conversation Detail
  const fetchConversationDetail = async (id: string, silent = false) => {
    if (!silent) setLoadingDetail(true);
    try {
      const params = new URLSearchParams({ action: 'detail', convId: id });
      const apiRes = await fetch('/api/whatsapp/inbox?' + params.toString(), { cache: 'no-store', credentials: 'include' });
      if (!apiRes.ok) throw new Error('API error ' + apiRes.status);
      const res = await apiRes.json();
      if (res.success && res.conversation) {
        if (!silent) {
          setActiveConvDetail(res.conversation);
          setCrmEditData({
            businessName: res.conversation.customer?.businessName || "",
            contactPerson: res.conversation.customer?.contactPerson || "",
            mobile: res.conversation.customer?.mobile || "",
            email: (res.conversation.customer as any)?.email || "",
            city: (res.conversation.customer as any)?.city || "",
            state: (res.conversation.customer as any)?.state || "",
            customerType: res.conversation.customer?.customerType || "Wholesaler",
            leadStage: res.conversation.leadStatus || "New Lead",
            tags: res.conversation.tags || ""
          });
        } else {
          // Silent Background Merge — only update state if content or status actually changed
          setActiveConvDetail((prev: any) => {
            if (!prev) return res.conversation;
            if (prev.id !== res.conversation.id) return res.conversation;

            const prevMsgs = prev.messages || [];
            const newMsgs = res.conversation.messages || [];

            const isSame = 
              prevMsgs.length === newMsgs.length &&
              prevMsgs.every((m: any, i: number) => m.id === newMsgs[i]?.id && m.status === newMsgs[i]?.status);

            if (isSame && prev.leadStatus === res.conversation.leadStatus && prev.tags === res.conversation.tags) {
              return prev; // Retain exact reference -> ZERO UI re-render/flicker!
            }

            const sendingMsgs = prevMsgs.filter((m: any) => m.status === 'SENDING');
            const combined = [...newMsgs];
            sendingMsgs.forEach((sm: any) => {
              if (!combined.some((m: any) => m.id === sm.id || (m.content === sm.content && m.senderType === 'AGENT'))) {
                combined.push(sm);
              }
            });

            return {
              ...res.conversation,
              messages: combined
            };
          });
        }
      } else {
        if (!silent) {
          console.error("Failed to fetch conversation details", res.error);
          setToastMsg(`Error opening chat: ${res.error || "Unknown Error"}`);
          setTimeout(() => setToastMsg(null), 5000);
          setActiveConvDetail(null);
        }
      }
    } catch (err: any) {
      if (!silent) {
        console.error("Failed to fetch conversation details", err);
        setToastMsg(`Error: ${err?.message || "Failed to load chat"}`);
        setTimeout(() => setToastMsg(null), 5000);
        setActiveConvDetail(null);
      }
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchConversationDetail(selectedConvId, false);
    }
  }, [selectedConvId]);

  // ⚡ Real-time SSE Stream Listener (Instant < 100ms Inbound & Outbound Delivery)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/whatsapp/inbox/stream");

        eventSource.onmessage = (event) => {
          try {
            if (!event.data) return;
            const parsed = JSON.parse(event.data);
            if (parsed.type === "CONNECTED" || parsed.type === "PING") return;

            // Silent real-time website tracking telemetry (does NOT pollute chatbox messages)
            if (parsed.type === "CUSTOMER_LIVE_ACTIVITY" && parsed.data) {
              const incoming = parsed.data;
              const incomingPhone = String(incoming.phone || "").replace(/\D/g, "");
              if (incomingPhone) {
                setLiveCustomerActivityMap((prev) => {
                  const existing = prev[incomingPhone] || {};
                  const existingJourney = Array.isArray(existing.pageJourney) ? existing.pageJourney : [];
                  const incomingJourney = Array.isArray(incoming.pageJourney) ? incoming.pageJourney : [];
                  const combinedJourney = [...incomingJourney, ...existingJourney];
                  const seen = new Set();
                  const uniqueJourney = [];
                  for (const step of combinedJourney) {
                    const key = (step.path || step.url || "") + (step.timestamp || "");
                    if (!seen.has(key)) {
                      seen.add(key);
                      uniqueJourney.push(step);
                    }
                  }

                  const mergedSearches = Array.from(
                    new Set([
                      ...(Array.isArray(incoming.searches) ? incoming.searches : []),
                      ...(Array.isArray(existing.searches) ? existing.searches : []),
                      ...(incoming.searchQuery ? [incoming.searchQuery] : []),
                    ])
                  ).filter(Boolean);

                  const existingLogs = Array.isArray(existing.eventLog) ? existing.eventLog : [];
                  const newLogEntry = {
                    id: Date.now() + Math.random().toString(),
                    eventType: incoming.eventType || "PAGE_VIEW",
                    pageTitle: incoming.pageTitle,
                    pageUrl: incoming.pageUrl,
                    searchQuery: incoming.searchQuery,
                    timestamp: incoming.timestamp || new Date().toISOString(),
                  };

                  const isNowOffline = incoming.presenceState === "OFFLINE" || incoming.eventType === "TAB_CLOSED" || incoming.isOnline === false;
                  const isNowAway = !isNowOffline && (incoming.presenceState === "AWAY" || incoming.eventType === "TAB_AWAY");
                  const presenceState = isNowOffline ? "OFFLINE" : (isNowAway ? "AWAY" : "ONLINE");
                  const isLiveNow = presenceState === "ONLINE";

                  return {
                    ...prev,
                    [incomingPhone]: {
                      ...existing,
                      ...incoming,
                      searches: mergedSearches,
                      pageJourney: uniqueJourney.slice(0, 25),
                      categoryInsights: incoming.categoryInsights || existing.categoryInsights || null,
                      lastActivityAt: incoming.timestamp || new Date().toISOString(),
                      isLiveNow,
                      presenceState,
                      isOnline: !isNowOffline,
                      scrollDepth: incoming.scrollDepth !== undefined ? incoming.scrollDepth : (existing.scrollDepth ?? null),
                      viewport: incoming.viewport || existing.viewport || null,
                      lastInteraction: incoming.lastInteraction || existing.lastInteraction || null,
                      eventLog: [newLogEntry, ...existingLogs].slice(0, 30),
                    },
                  };
                });
                fetchCustomerWebSessions(incomingPhone);
              }
              return;
            }

            // Trigger instant silent refresh on real-time event
            fetchConversationsList(true);
            if (selectedConvIdRef.current) {
              fetchConversationDetail(selectedConvIdRef.current, true);
            }
          } catch (_) {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Graceful exponential reconnect fallback
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 5000);
          }
        };
      } catch (_) {}
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Background Safety Net Polling (Relaxed to 30s as silent fallback if SSE is interrupted)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchConversationsList(true);
      if (selectedConvIdRef.current) {
        fetchConversationDetail(selectedConvIdRef.current, true);
      }
    }, 30000);
    return () => clearInterval(intervalId);
  }, [searchQuery, activeNavTab, unreadOnly, leadStatusFilter, filterEmployeeId, selectedConvId]);


  useEffect(() => {
    if (!activeConvDetail?.messages) return;
    const container = chatMessagesContainerRef.current;
    if (!container) return;

    const isNewConv = lastScrollConvIdRef.current !== selectedConvId;
    if (isNewConv) {
      container.scrollTop = container.scrollHeight;
    } else {
      const threshold = 150; // pixels from the bottom
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
    lastScrollConvIdRef.current = selectedConvId;
  }, [activeConvDetail?.messages, selectedConvId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [selectedConvId]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedConvId) return;

    setSendingMsg(true);
    const textToSend = messageInput;
    const isInternal = isInternalNote;
    setMessageInput("");

    // --- Optimistic UI Update ---
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: textToSend,
      senderType: "AGENT",
      senderName: currentUserName,
      messageType: "TEXT",
      isInternalNote: isInternal,
      sentAt: new Date().toISOString(),
      status: "SENDING"
    };

    setActiveConvDetail((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), optimisticMessage],
        lastMessageText: textToSend,
        lastMessageAt: optimisticMessage.sentAt
      };
    });

    setConversations((prev: any[]) => {
      return prev.map(c => {
        if (c.id === selectedConvId) {
          return { ...c, lastMessageText: textToSend, lastMessageAt: optimisticMessage.sentAt };
        }
        return c;
      }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    });
    // ---------------------------

    const res = await sendWhatsAppMessageAction({
      conversationId: selectedConvId,
      content: textToSend,
      isInternalNote: isInternal,
      senderType: "AGENT",
      senderName: currentUserName
    });

    if (res.success) {
      await fetchConversationDetail(selectedConvId, true);
      await fetchConversationsList(true);
    } else {
      setToastMsg(`Failed to send: ${res.error || "Unknown Error"}`);
      setTimeout(() => setToastMsg(null), 3000);
      await fetchConversationDetail(selectedConvId, true);
    }
    setSendingMsg(false);
  };

  // Retry Failed WhatsApp Message Handler
  const handleRetryMessage = async (msg: any) => {
    if (!selectedConvId) return;
    setRetryingMsgId(msg.id);
    try {
      const res = await retryFailedWhatsAppMessageAction(msg.id);
      if (res.success) {
        setToastMsg("Message delivered successfully via WhatsApp!");
        await fetchConversationDetail(selectedConvId, true);
        await fetchConversationsList(true);
      } else {
        setToastMsg(`Retry failed: ${res.error || "Delivery failed"}`);
        await fetchConversationDetail(selectedConvId, true);
      }
    } catch (err: any) {
      setToastMsg(`Error retrying message: ${err.message}`);
    } finally {
      setRetryingMsgId(null);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Record in browser native webm format - the server will transcode it to MP3 automatically
      let selectedMime = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'audio/mp4';
        }
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'audio/aac';
        }
      }
      
      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMime });
        
        // Convert Blob to base64 Data URL to feed to upload-media
        const reader = new FileReader();
        reader.onloadend = async () => {
          const fileDataUrl = reader.result as string;
          setSendingMsg(true);
          
          // Determine extension and clean mimeType
          const ext = selectedMime.includes('mp4') ? 'm4a' : selectedMime.includes('aac') ? 'aac' : 'webm';
          const cleanMime = selectedMime.split(';')[0];
          
          try {
            const apiRes = await fetch('/api/whatsapp/upload-media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileDataUrl, filename: `voice-note.${ext}`, mimeType: cleanMime })
            });
            const uploadRes = await apiRes.json();
            
            if (uploadRes.success && uploadRes.mediaId) {
              const res = await sendWhatsAppMessageAction({
                conversationId: selectedConvId!,
                content: '[AUDIO]',
                mediaUrl: uploadRes.mediaId,
                mediaFilename: `voice-note.${ext}`,
                messageType: 'AUDIO',
                senderType: 'AGENT',
                senderName: currentUserName
              });
              
              if (res.success) {
                setToastMsg('Voice note sent to customer!');
                setTimeout(() => setToastMsg(null), 3000);
                await fetchConversationDetail(selectedConvId!, true);
                await fetchConversationsList(true);
              }
            } else {
              setToastMsg(`Failed to upload voice note: ${uploadRes.error}`);
              setTimeout(() => setToastMsg(null), 4000);
            }
          } catch (err: any) {
            console.error('Failed to send voice note:', err);
          } finally {
            setSendingMsg(false);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Turn off microphone streams
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access denied or error starting recorder!");
      console.error(err);
    }
  };

  // Stop and send voice note
  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Cancel/Discard voice recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Discard recorded chunks
      mediaRecorderRef.current.onstop = () => {
        // Discard hook implementation - stop tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      setToastMsg('Voice note discarded');
      setTimeout(() => setToastMsg(null), 2000);
    }
  };


  // Direct File Attachment Upload Handler
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedConvId) return;

    setSendingMsg(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const fileDataUrl = evt.target?.result as string;
            const fileType = file.type.startsWith("image/")
              ? "IMAGE"
              : file.type.startsWith("video/")
              ? "VIDEO"
              : file.type.startsWith("audio/")
              ? "AUDIO"
              : "DOCUMENT";

            const apiRes = await fetch('/api/whatsapp/upload-media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileDataUrl, filename: file.name, mimeType: file.type })
            });
            if (!apiRes.ok) throw new Error('Upload API error ' + apiRes.status);
            const uploadRes = await apiRes.json();
            if (!uploadRes.success || !uploadRes.mediaId) {
              setToastMsg(`Upload failed: ${uploadRes.error}`);
              setTimeout(() => setToastMsg(null), 4000);
              resolve();
              return;
            }

            const res = await sendWhatsAppMessageAction({
              conversationId: selectedConvId,
              content: fileType === "IMAGE" ? "[IMAGE]" : fileType === "DOCUMENT" ? "[DOCUMENT]" : fileType === "VIDEO" ? "[VIDEO]" : fileType === "AUDIO" ? "[AUDIO]" : `Attached file: ${file.name}`,
              mediaUrl: uploadRes.mediaId, // passing the ID to Meta API
              mediaFilename: file.name,
              messageType: fileType,
              senderType: "AGENT",
              senderName: currentUserName
            });

            if (res.success) {
              setToastMsg(`Direct attachment "${file.name}" sent to customer!`);
              setTimeout(() => setToastMsg(null), 3000);
            }
          } catch (err: any) {
            setToastMsg(`Failed to send ${file.name}: ${err.message}`);
            setTimeout(() => setToastMsg(null), 4000);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    await fetchConversationDetail(selectedConvId, true);
    await fetchConversationsList(true);
    setSendingMsg(false);
    
    // Reset file input so same file(s) can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  // Delete selected conversation handler
  const handleDeleteConversation = async () => {
    if (!selectedConvId) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this conversation and all its messages? This action cannot be undone.");
    if (!confirmDelete) return;
    
    try {
      const res = await fetch(`/api/whatsapp/inbox?convId=${selectedConvId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("Conversation deleted successfully");
        setTimeout(() => setToastMsg(null), 3000);
        setSelectedConvId(null);
        setActiveConvDetail(null);
        fetchConversationsList(false);
      } else {
        alert("Failed to delete conversation: " + data.error);
      }
    } catch (err: any) {
      alert("Error deleting conversation: " + err.message);
    }
  };


  // Quotation and Follow-Up Modal Handlers
  const handleCreateQuoteSubmit = async () => {
    setShowQuoteModal(false);
    setToastMsg("Quotation creation is currently disabled for this tenant.");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateFollowUpSubmit = async () => {
    setShowFollowUpModal(false);
    setToastMsg(`Follow-up scheduled for ${followUpDays} days from now.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Inline Name Save Handler
  const handleSaveCustomerName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !activeConvDetail?.customer?.id) return;
    if (!tempCustomerName.trim()) {
      alert("Name cannot be empty");
      return;
    }
    setSavingName(true);
    const res = await updateCRMProfileFromWhatsApp({
      conversationId: selectedConvId,
      customerId: activeConvDetail.customer.id,
      contactPerson: tempCustomerName.trim()
    });
    if (res.success) {
      setToastMsg("Customer name updated!");
      setIsEditingName(false);
      await fetchConversationDetail(selectedConvId, false);
      await fetchConversationsList(false);
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      alert("Error: " + (res.error || "Failed to update name"));
    }
    setSavingName(false);
  };

  // Canned Responses CRUD / Management Handlers
  const fetchCannedResponses = async () => {
    const res = await getWhatsAppCannedResponsesAction();
    if (res.success && res.responses) {
      setCannedResponses(res.responses);
    }
  };

  const handleCreateOrUpdateCannedResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyTitle.trim() || !newReplyShortcut.trim() || !newReplyContent.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    setSavingCanned(true);
    let res;
    if (editingReply) {
      res = await updateWhatsAppCannedResponseAction(editingReply.id, {
        title: newReplyTitle,
        shortcut: newReplyShortcut,
        content: newReplyContent
      });
    } else {
      res = await createWhatsAppCannedResponseAction({
        title: newReplyTitle,
        shortcut: newReplyShortcut,
        content: newReplyContent
      });
    }

    if (res.success) {
      setToastMsg(editingReply ? "Canned reply updated!" : "Canned reply created!");
      setNewReplyTitle("");
      setNewReplyShortcut("");
      setNewReplyContent("");
      setEditingReply(null);
      await fetchCannedResponses();
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      alert("Error: " + res.error);
    }
    setSavingCanned(false);
  };

  const handleDeleteCannedResponse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this canned response?")) return;
    const res = await deleteWhatsAppCannedResponseAction(id);
    if (res.success) {
      setToastMsg("Canned reply deleted.");
      await fetchCannedResponses();
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleEditClick = (reply: any) => {
    setEditingReply(reply);
    setNewReplyTitle(reply.title);
    setNewReplyShortcut(reply.shortcut);
    setNewReplyContent(reply.content);
  };

  const handleCancelEdit = () => {
    setEditingReply(null);
    setNewReplyTitle("");
    setNewReplyShortcut("");
    setNewReplyContent("");
  };

  // Handle Quick Command Shortcut Insert
  const applyQuickShortcut = async (r: any) => {
    // If it's a rich message with buttons or media or header/footer, send it immediately
    const hasRichElements = r.buttons || r.mediaUrl || r.headerText || r.footerText;
    
    if (hasRichElements) {
      if (!selectedConvId) {
        alert("Please select a conversation first.");
        return;
      }
      setSendingMsg(true);
      setShowReplyLibraryModal(false);
      setShowCannedResponses(false);
      setCannedPopupSearch("");
      setToastMsg("Sending rich quick reply...");
      
      try {
        let buttonsParsed = r.buttons;
        if (typeof buttonsParsed === 'string') {
          buttonsParsed = JSON.parse(buttonsParsed);
        }

        const payload: any = {
          conversationId: selectedConvId,
          senderType: 'AGENT',
          senderName: 'Sales Agent', // Handled properly on backend
          messageType: buttonsParsed && buttonsParsed.length > 0 ? 'INTERACTIVE' : (r.mediaUrl ? 'IMAGE' : 'TEXT'),
          content: r.content,
          mediaUrl: r.mediaUrl || undefined,
          metadata: JSON.stringify({
            headerText: r.headerText,
            footerText: r.footerText,
            buttons: buttonsParsed
          })
        };

        const res = await sendWhatsAppMessageAction(payload);
        if (res.success) {
          setToastMsg("Rich quick reply sent!");
        } else {
          alert("Failed to send rich quick reply: " + res.error);
        }
      } catch (error: any) {
        alert("Error sending rich reply: " + error.message);
      } finally {
        setSendingMsg(false);
        setTimeout(() => setToastMsg(null), 3000);
      }
    } else {
      // Just plain text, insert into input replacing any slash command
      const val = messageInput;
      const lastSlash = val.lastIndexOf("/");
      if (lastSlash !== -1 && (lastSlash === 0 || val[lastSlash - 1] === " " || val[lastSlash - 1] === "\n")) {
        const beforeSlash = val.slice(0, lastSlash);
        const newText = beforeSlash ? `${beforeSlash}${r.content} ` : `${r.content} `;
        setMessageInput(newText);
      } else {
        setMessageInput((prev) => (prev ? `${prev} ${r.content} ` : `${r.content} `));
      }
      setShowReplyLibraryModal(false);
      setShowCannedResponses(false);
      setCannedPopupSearch("");
      setTimeout(() => chatTextareaRef.current?.focus(), 50);
    }
  };

  const insertCannedResponse = async (r: any) => {
    await applyQuickShortcut(r);
  };

  const handleInsertEmoji = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Suggest AI Reply
  const handleSuggestReply = async () => {
    if (!selectedConvId) return;
    setAiSuggesting(true);
    setToastMsg("Generating AI reply based on Knowledge Base...");
    try {
      const res = await fetch('/api/whatsapp/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvId })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessageInput(data.reply);
        setToastMsg(`AI generated reply using ${data.modelUsed}. Review before sending!`);
      } else {
        setToastMsg(`AI Suggestion Failed: ${data.error}`);
      }
    } catch (error) {
      setToastMsg("Error generating AI reply.");
    } finally {
      setAiSuggesting(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const res = await fetch('/api/whatsapp/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, color: newTagColor, role: currentUserRole })
      });
      const data = await res.json();
      if (data.success) {
        setAvailableTags([data.tag, ...availableTags]);
        setNewTagName("");
      } else {
        alert(data.error || "Failed to create tag");
      }
    } catch (err) {
      alert("Error creating tag.");
    }
    setIsCreatingTag(false);
  };

  const handleToggleConversationTag = async (tagName: string) => {
    if (!selectedConvId) return;
    
    let currentTags = [...activeTagsList];
    const hasTag = currentTags.includes(tagName);
    const action = hasTag ? "remove" : "add";

    // Optimistic UI update
    if (hasTag) {
      currentTags = currentTags.filter((t: string) => t !== tagName);
    } else {
      currentTags.push(tagName);
    }
    
    // Temporarily update activeConvDetail
    const updatedConv = { 
      ...activeConvDetail, 
      tags: currentTags.join(", "),
      customer: activeConvDetail?.customer ? { ...activeConvDetail.customer, tags: currentTags.join(", ") } : activeConvDetail?.customer 
    };
    setActiveConvDetail(updatedConv);
    
    try {
      const res = await fetch('/api/whatsapp/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvId, tagName, action })
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversationDetail(selectedConvId, true);
        await fetchConversationsList(true); // refresh sidebar
      } else {
        alert(data.error || "Failed to update tags");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save CRM Inline Profile Edits
  const handleSaveCRMProfile = async () => {
    if (!selectedConvId || !activeConvDetail?.customer?.id) return;
    const res = await updateCRMProfileFromWhatsApp({
      conversationId: selectedConvId,
      customerId: activeConvDetail.customer.id,
      ...crmEditData
    });
    if (res.success) {
      setIsEditingCRM(false);
      await fetchConversationDetail(selectedConvId, true);
      await fetchConversationsList(true);
    }
  };



  // Handle Send Payment Link Submit
  const handleSendPaymentSubmit = async () => {
    if (!selectedConvId || !activeConvDetail?.customer?.id || sendingPayment) return;
    setSendingPayment(true);
    try {
      const res = await generateWhatsAppPaymentLinkAction({
        conversationId: selectedConvId,
        customerId: activeConvDetail.customer.id,
        amount: paymentAmount,
        description: paymentDesc,
        deliveryMethod: paymentDeliveryMethod
      });
      if (res.success) {
        setShowPaymentModal(false);
        setToastMsg(`Payment request sent successfully.`);
        setTimeout(() => setToastMsg(null), 3000);
        await fetchConversationDetail(selectedConvId, true);
        await fetchConversationsList(true);
      } else {
        setToastMsg(`Failed to send payment link: ${res.error || "Unknown error"}`);
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err: any) {
      setToastMsg(`Failed to send payment link: ${err.message || "Network error"}`);
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setSendingPayment(false);
    }
  };



  // Handle Lead Assignment (Manual or Round-Robin)
  const handleAssignLead = async (employeeId?: string, method: 'MANUAL' | 'ROUND_ROBIN' = 'MANUAL') => {
    if (!selectedConvId) return;
    setAssigningLead(true);
    const res = await assignWhatsAppLeadAction({
      conversationId: selectedConvId,
      employeeId,
      method
    });
    if (res.success) {
      setShowAssignModal(false);
      setToastMsg(`Lead assigned successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
      await fetchConversationDetail(selectedConvId, true);
      await fetchConversationsList(true);
    } else {
      setToastMsg(`Failed to assign lead: ${res.error || ""}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
    setAssigningLead(false);
  };

  // Handle Lead Unassignment (Moves back to Unassigned tab)
  const handleUnassignLead = async () => {
    if (!selectedConvId) return;
    setAssigningLead(true);
    const res = await unassignWhatsAppConversationAction(selectedConvId);
    if (res.success) {
      setShowAssignModal(false);
      setToastMsg("Chat unassigned and moved to Unassigned queue.");
      setTimeout(() => setToastMsg(null), 3000);
      await fetchConversationDetail(selectedConvId, true);
      await fetchConversationsList(true);
    } else {
      setToastMsg(`Failed to unassign: ${res.error || ""}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
    setAssigningLead(false);
  };

  const handleToggleConversationStatus = async (status: "OPEN" | "CLOSED") => {
    if (!selectedConvId) return;
    const res = await toggleConversationStatusAction(selectedConvId, status);
    if (res.success) {
      setToastMsg(`Chat status updated to ${status}.`);
      setTimeout(() => setToastMsg(null), 3000);
      await fetchConversationDetail(selectedConvId, true);
      await fetchConversationsList(true);
    } else {
      setToastMsg(`Failed to update status: ${res.error || ""}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveNavTab("all");
    setLeadStatusFilter("");
    setUnreadOnly(false);
    setFilterEmployeeId("");
  };

  return (
    <div className={`inbox-container ${isFullScreen ? "fullscreen-mode" : ""}`}>
      {toastMsg && (
        <div style={{ position: "absolute", top: "12px", right: "20px", background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "8px 16px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {toastMsg}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* LEFT COLUMN: INBOX NAVIGATION & CONVERSATION LIST */}
      {/* ----------------------------------------------------------------- */}
      <div className={`inbox-left-panel ${isLeftCollapsed ? "collapsed" : ""}`}>
        {/* Navigation Sidebar Header */}
        <div className="left-panel-header">
          <div className="left-panel-title-row">
            <span className="left-panel-title">WhatsApp Inbox</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>

              <button
                className="panel-toggle-btn"
                onClick={() => {
                  fetchConversationsList(true);
                }}
                title="Refresh Chats"
                style={{ color: "#64748b" }}
              >
                <RefreshCw size={16} />
              </button>
              <button
                className={`panel-toggle-btn ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                title={showFilters ? "Hide Filters" : "Toggle Filters"}
                style={{
                  color: showFilters || (unreadOnly || leadStatusFilter || filterEmployeeId) ? "#6d28d9" : "#64748b",
                  position: "relative"
                }}
              >
                <Filter size={15} />
                {(unreadOnly || leadStatusFilter || filterEmployeeId) && (
                  <span style={{
                    position: "absolute",
                    top: "3px",
                    right: "3px",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#8b5cf6"
                  }} />
                )}
              </button>


            </div>
          </div>

          {!isLeftCollapsed && (
            <>
              {/* Search Bar & Folder Tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: showFilters ? '8px' : '0px' }}>
                {/* Search Bar */}
                <div className="inbox-search-box" style={{ margin: 0 }}>
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search chats, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery("")}>×</button>
                  )}
                </div>

                {/* Folder Tabs */}
                {currentUserRole !== 'AGENT' && currentUserRole !== 'SALES' && (
                <div className="left-folder-tabs" style={{ margin: 0 }}>
                  <button
                    className={`folder-tab ${activeNavTab === "all" ? "active" : ""}`}
                    onClick={() => {
                      setActiveNavTab("all");
                      setFilterEmployeeId("");
                    }}
                  >
                    <span>All</span>
                    <span className="folder-count-badge">{folderCounts.all}</span>
                  </button>
                  <button
                    className={`folder-tab ${activeNavTab === "assigned_to_me" ? "active" : ""}`}
                    onClick={() => setActiveNavTab("assigned_to_me")}
                  >
                    <span>Assigned</span>
                    <span className="folder-count-badge">{folderCounts.assigned}</span>
                  </button>
                  <button
                    className={`folder-tab ${activeNavTab === "unassigned" ? "active" : ""}`}
                    onClick={() => {
                      setActiveNavTab("unassigned");
                      setFilterEmployeeId("");
                    }}
                  >
                    <span>Unassigned</span>
                    <span className="folder-count-badge">{folderCounts.unassigned}</span>
                  </button>
                  <button
                    className={`folder-tab ${activeNavTab === "closed" ? "active" : ""}`}
                    onClick={() => {
                      setActiveNavTab("closed");
                      setFilterEmployeeId("");
                    }}
                  >
                    <span>Closed</span>
                    <span className="folder-count-badge">{folderCounts.closed}</span>
                  </button>
                </div>
                )}
              </div>



              {/* Filter Pills */}
              {showFilters && (
        <div className="inbox-filters-row">
                <button
                  className={`filter-pill ${unreadOnly ? "active" : ""}`}
                  onClick={() => setUnreadOnly(!unreadOnly)}
                >
                  Unread Only
                </button>
                <select
                  className="filter-select"
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                >
                  <option value="">All Stages</option>
                  <option value="New Lead">New Lead</option>
                  <option value="Quotation Shared">Quotation Shared</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Order Confirmed">Order Confirmed</option>
                </select>
                {currentUserRole !== 'AGENT' && currentUserRole !== 'SALES' && (
                <select
                  className="filter-select"
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                >
                  <option value="">All Reps</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.name || emp.employeeId}
                    </option>
                  ))}
                </select>
                )}
              </div>
              )}
            </>
          )}
        </div>

        {/* Conversations List */}
        <div className="conversations-scroll-list">
          {loadingConvs && conversations.length === 0 ? (
            <div className="inbox-loading-skeleton">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-conv-card">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-line medium"></div>
                    <div className="skeleton-line long"></div>
                    <div className="skeleton-line short"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="inbox-empty-state modern-empty">
              <div className="modern-empty-icon-wrapper">
                <Search size={28} color="#8b5cf6" />
              </div>
              <p className="modern-empty-title">No conversations found</p>
              <p className="modern-empty-subtitle">Try adjusting your filters or search query to find what you're looking for.</p>
              <button
                className="modern-empty-btn"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const lastCustMsg = conv.messages?.[0];
              const isExpired = lastCustMsg ? (Date.now() - new Date(lastCustMsg.sentAt).getTime() > 24 * 60 * 60 * 1000) : false;
              const isSelected = conv.id === selectedConvId;
              const cust = conv.customer;
              const isUnread = conv.unreadCount > 0;

              return (
                <div
                  key={conv.id}
                  className={`conversation-card ${isSelected ? "selected" : ""} ${isUnread ? "unread" : ""}`}
                  onClick={() => { if(selectedConvId !== conv.id) { setActiveConvDetail(null); setSelectedConvId(conv.id); } }}
                >
                  <div className="conv-avatar" style={{ background: getAvatarGradient(cust?.contactPerson || cust?.businessName || cust?.whatsappNumber) }}>
                    <span style={{ color: "#ffffff", fontWeight: 700 }}>{getCustomerAvatarInitials(cust)}</span>
                    <span className="conv-wa-badge">
                      <MessageSquare size={10} color="#fff" />
                    </span>
                  </div>

                  {!isLeftCollapsed && (
                    <div className="conv-content-box">
                      <div className="conv-top-line">
                        <span className="conv-name">{getCustomerDisplayName(cust)}</span>
                        <span className="conv-time" title={new Date(conv.lastMessageAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}>
                          {formatConversationTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="conv-contact-sub">
                        <span>{getCustomerSubtitle(cust).text}</span>
                      </div>

                      <div className="conv-snippet-line">
                        <span className="conv-last-msg">
                          {conv.lastMessageText === "[Message]" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <ShoppingBag size={11} /> Catalog Order
                            </span>
                          ) : (
                            conv.lastMessageText || "No messages yet"
                          )}
                        </span>
                        {isUnread && <span className="unread-counter-badge">{conv.unreadCount}</span>}
                      </div>

                      <div className="conv-tags-line" style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                        <span className={`stage-tag ${conv.leadStatus?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {conv.leadStatus || "New Lead"}
                        </span>
                        {conv.tags && conv.tags.split(',').filter(Boolean).map((t: string) => {
                          const tagClean = t.trim();
                          if (!tagClean || tagClean === "Auto Created" || tagClean === "WhatsApp Lead") return null;
                          const assignedName = conv._raw?.assignedEmployee?.user?.name || conv.assignedEmployee?.user?.name;
                          if (assignedName && tagClean.toLowerCase() === assignedName.toLowerCase()) return null;
                          return (
                            <span key={tagClean} className="conv-custom-tag">
                              <Tag size={9} /> {tagClean}
                            </span>
                          );
                        })}
                        {conv._raw?.assignedEmployee && (
                          <span className="conv-assigned-badge">
                            <User size={10} /> {conv._raw.assignedEmployee.user?.name || "Assigned"}
                          </span>
                        )}
                        {conv.aiHandled ? (
                          <span className="badge-ai-pill">
                            <Bot size={10} /> AI
                          </span>
                        ) : (
                          <span className="badge-human-pill">Human</span>
                        )}

                        {conv.status === 'CLOSED' && (
                          <span className="conv-closed-badge">
                            <Check size={9} /> Closed
                          </span>
                        )}

                        {isExpired && (
                          <span className="conv-expired-badge">
                            <Clock size={9} /> Expired
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* ----------------------------------------------------------------- */}
      {/* CENTER COLUMN: LIVE CHAT WINDOW */}
      {/* ----------------------------------------------------------------- */}
      <div className="inbox-center-panel">
        {loadingDetail && !activeConvDetail ? (
          // Skeleton loader instead of a boring spinner
          <div className="chat-skeleton-loader">
            <div className="chat-skeleton-header">
              <div className="skeleton-avatar large"></div>
              <div className="skeleton-content">
                <div className="skeleton-line medium"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
            <div className="chat-skeleton-messages">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`skeleton-bubble ${i % 2 === 0 ? 'left' : 'right'}`}>
                  <div className="skeleton-line" style={{ width: `${45 + (i * 13) % 40}%`, height: '14px', borderRadius: '12px' }}></div>
                </div>
              ))}
            </div>
          </div>
        ) : !activeConvDetail ? (
          <div className="chat-empty-selection premium-empty">
            <div className="premium-empty-graphics">
              <div className="floating-bubble bubble-1"><MessageSquare size={20} color="#fff" /></div>
              <div className="floating-bubble bubble-2"><Sparkles size={20} color="#fff" /></div>
              <div className="floating-bubble bubble-3"><CheckCircle size={20} color="#fff" /></div>
              <div className="main-empty-icon">
                <MessageSquare size={54} strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="premium-empty-title">Select a Conversation</h3>
            <p className="premium-empty-desc">Choose a chat from the left sidebar to start messaging. Every conversation connects seamlessly to your CRM profiles, orders, and quotes.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-user-info">
                <div className="chat-avatar-large" style={{ background: getAvatarGradient(activeConvDetail.customer?.contactPerson || activeConvDetail.customer?.businessName || activeConvDetail.customer?.whatsappNumber) }}>
                  <span style={{ color: "#ffffff", fontWeight: 700 }}>{getCustomerAvatarInitials(activeConvDetail.customer)}</span>
                </div>
                <div>
                  <div className="chat-title-line" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {isEditingName ? (
                      <form onSubmit={handleSaveCustomerName} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="text"
                          value={tempCustomerName}
                          onChange={(e) => setTempCustomerName(e.target.value)}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#1e293b",
                            width: "200px"
                          }}
                          autoFocus
                          required
                          disabled={savingName}
                        />
                        <button
                          type="submit"
                          disabled={savingName}
                          style={{
                            background: "#10b981",
                            border: "none",
                            borderRadius: "4px",
                            color: "#fff",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {savingName ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(false)}
                          style={{
                            background: "#ef4444",
                            border: "none",
                            borderRadius: "4px",
                            color: "#fff",
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                          disabled={savingName}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <h2 className="chat-customer-name" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {getCustomerDisplayName(activeConvDetail.customer)}
                        </h2>
                        <button
                          onClick={() => {
                            setTempCustomerName(activeConvDetail.customer?.contactPerson || "");
                            setIsEditingName(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="Edit Customer Name"
                        >
                          <Edit3 size={13} color="#4f46e5" />
                        </button>
                      </>
                    )}
                    {!sessionStatus.neverMessaged && (
                      <span 
                        className={`chat-header-session-badge ${sessionStatus.expired ? "expired" : "active"}`}
                        title={sessionStatus.reason}
                      >
                        <Clock size={11} />
                        <span>{sessionStatus.expired ? "24h Window: Expired" : `24h Window: ${sessionStatus.hoursLeft?.toFixed(1)}h left`}</span>
                      </span>
                    )}
                  </div>
                  <div className="chat-sub-line">
                    <span 
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                      title="Click to copy phone number"
                      onClick={() => {
                        const p = activeConvDetail.customer?.whatsappNumber || activeConvDetail.customer?.mobile || "";
                        if (p) {
                          navigator.clipboard.writeText(p);
                          setToastMsg(`Copied ${formatWhatsAppPhone(p)} to clipboard!`);
                          setTimeout(() => setToastMsg(null), 2500);
                        }
                      }}
                    >
                      {(() => {
                        const p = activeConvDetail.customer?.whatsappNumber || activeConvDetail.customer?.mobile;
                        const country = getCountryInfo(p);
                        return (
                          <>
                            <span style={{ fontSize: "13px" }}>{country.flag}</span>
                            <span>{formatWhatsAppPhone(p)}</span>
                          </>
                        );
                      })()}
                      <Copy size={11} color="#6366f1" />
                    </span>
                  </div>

                  {/* Active Conversation Tags & Status Badges */}
                  <div className="chat-header-tags-row">
                    <span className={`stage-tag ${(activeConvDetail.leadStatus || activeConvDetail.customer?.leadStage || 'New Lead').toLowerCase().replace(/\s+/g, '-')}`}>
                      {activeConvDetail.leadStatus || activeConvDetail.customer?.leadStage || "New Lead"}
                    </span>
                    {activeTagsList.filter((t: string) => {
                      if (!t || t === "Auto Created" || t === "WhatsApp Lead") return false;
                      const assignedName = activeConvDetail.assignedEmployee?.user?.name;
                      if (assignedName && t.toLowerCase() === assignedName.toLowerCase()) return false;
                      return true;
                    }).map((tag: string) => (
                      <span key={tag} className="chat-header-tag-pill" title={`Tag: ${tag}`}>
                        <Tag size={10} />
                        <span>{tag}</span>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowTagsModal(true)}
                      className="chat-header-add-tag-btn"
                      title="Manage or add tags"
                    >
                      <Plus size={10} />
                      <span>Tag</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="chat-header-actions">
                <button className="chat-action-btn highlight-assign" onClick={() => setShowAssignModal(true)} title="Assign WhatsApp Lead">
                  <UserCheck size={13} />
                  <span>{activeConvDetail.assignedEmployee?.user?.name ? activeConvDetail.assignedEmployee.user.name : "Assign"}</span>
                </button>

                <button
                  className={`chat-action-btn ${activeConvDetail.aiHandled ? "ai-active" : "ai-manual"}`}
                  disabled={aiToggleLoading}
                  onClick={async () => {
                    if (!activeConvDetail?.id) return;
                    setAiToggleLoading(true);
                    const newVal = !activeConvDetail.aiHandled;
                    const res = await toggleConversationAIAction(activeConvDetail.id, newVal);
                    if (res.success) {
                      setActiveConvDetail((prev: any) => ({ ...prev, aiHandled: newVal }));
                      setToastMsg(newVal ? "AI Assistant enabled for this chat" : "Manual Mode — AI auto-replies paused");
                      setTimeout(() => setToastMsg(null), 3000);
                    }
                    setAiToggleLoading(false);
                  }}
                  title={activeConvDetail.aiHandled ? "AI is ON — Click to switch to Manual Mode" : "AI is OFF — Click to enable AI auto-replies"}
                >
                  <Bot size={13} />
                  <span>{aiToggleLoading ? "..." : activeConvDetail.aiHandled ? "AI: ON" : "Manual"}</span>
                </button>

                <button
                  className={`chat-action-btn ${activeConvDetail.status === 'CLOSED' ? "chat-closed" : ""}`}
                  disabled={statusToggleLoading}
                  onClick={async () => {
                    if (!activeConvDetail?.id) return;
                    setStatusToggleLoading(true);
                    const newStatus = activeConvDetail.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
                    const res = await toggleConversationStatusAction(activeConvDetail.id, newStatus);
                    if (res.success) {
                      setActiveConvDetail((prev: any) => ({ ...prev, status: newStatus }));
                      setToastMsg(newStatus === 'CLOSED' ? "Chat marked as Closed" : "Chat reopened");
                      setTimeout(() => setToastMsg(null), 3000);
                      fetchConversationsList(true);
                    }
                    setStatusToggleLoading(false);
                  }}
                  title={activeConvDetail.status === 'CLOSED' ? "Click to Reopen Chat" : "Click to Close Chat"}
                >
                  <CheckCircle2 size={13} />
                  <span>{statusToggleLoading ? "..." : activeConvDetail.status === 'CLOSED' ? "Reopen" : "Close"}</span>
                </button>

                <button
                  className={`chat-action-btn ${isLeadPushed ? "crm-synced-active" : "crm-push-action"}`}
                  disabled={pushingToCrm}
                  onClick={() => handlePushToCrm()}
                  title={isLeadPushed ? "Lead is synced with Espon CRM & ERP. Click to re-sync latest details." : "Push lead details directly to Espon CRM & ERP webhook"}
                >
                  <Activity size={13} className={pushingToCrm ? "spin-pulse" : ""} />
                  <span>{pushingToCrm ? "Pushing..." : isLeadPushed ? "CRM Synced" : "Push to CRM"}</span>
                </button>

                <button
                  className={`chat-action-btn ${!isRightCollapsed ? "active-profile" : ""}`}
                  onClick={() => setIsRightCollapsed(prev => !prev)}
                  title="Toggle Customer 360° Profile & CRM Data"
                >
                  <User size={13} />
                  <span>Profile</span>
                </button>

                 {/* More Actions Dropdown Menu */}
                <div style={{ position: "relative" }}>
                  <button
                    className={`chat-action-btn ${showMoreMenu ? "active-more" : ""}`}
                    onClick={() => setShowMoreMenu(prev => !prev)}
                    title="More Conversation Actions & Website Tracking"
                    style={{ padding: "6px 8px", position: "relative" }}
                  >
                    <MoreVertical size={14} />
                    {activeWebsiteTrackingData.isOnlineNow && (
                      <span
                        style={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          backgroundColor: "#10b981",
                          boxShadow: "0 0 0 1.5px #fff",
                          animation: "pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                        }}
                      />
                    )}
                  </button>

                  {showMoreMenu && (
                    <>
                      <div 
                        style={{ position: "fixed", inset: 0, zIndex: 998 }} 
                        onClick={() => setShowMoreMenu(false)} 
                      />
                      <div className="chat-header-dropdown-menu">
                        <button
                          className="dropdown-menu-item"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowWebsiteTrackingDrawer(true);
                            if (activeCustomerPhone) {
                              fetchCustomerWebSessions(activeCustomerPhone);
                            }
                          }}
                        >
                          <Globe size={14} color={activeWebsiteTrackingData.isOnlineNow ? "#059669" : "#4f46e5"} />
                          <span style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                            Website Tracking
                            {activeWebsiteTrackingData.isOnlineNow && (
                              <span
                                style={{
                                  fontSize: "9.5px",
                                  fontWeight: 700,
                                  backgroundColor: "#ecfdf5",
                                  color: "#047857",
                                  padding: "1px 6px",
                                  borderRadius: "10px",
                                  border: "1px solid #6ee7b7",
                                }}
                              >
                                Online Now
                              </span>
                            )}
                          </span>
                        </button>

                        <button
                          className="dropdown-menu-item"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowTagsModal(true);
                          }}
                        >
                          <Tag size={14} color="#6366f1" />
                          <span>Manage Tags ({activeTagsList.length})</span>
                        </button>

                        <button
                          className="dropdown-menu-item"
                          onClick={() => {
                            setShowMoreMenu(false);
                            if (activeConvDetail?.id) {
                              window.open(`/api/whatsapp/chat/export?conversationId=${activeConvDetail.id}&format=csv`, '_blank');
                            }
                          }}
                        >
                          <Download size={14} color="#059669" />
                          <span>Export Transcript (CSV)</span>
                        </button>

                        {paymentConfigured && (
                          <button
                            className="dropdown-menu-item"
                            onClick={() => {
                              setShowMoreMenu(false);
                              setShowPaymentModal(true);
                            }}
                          >
                            <CreditCard size={14} color="#d97706" />
                            <span>Send Payment Link</span>
                          </button>
                        )}

                        {hasMetaCapi && (
                          <button
                            className="dropdown-menu-item"
                            onClick={() => {
                              setShowMoreMenu(false);
                              handleMarkLeadInterested();
                            }}
                            disabled={firingMetaLead}
                          >
                            <Zap size={14} color="#eab308" />
                            <span>{firingMetaLead ? "Firing..." : "Mark Interested (Meta CAPI)"}</span>
                          </button>
                        )}



                        <button
                          className="dropdown-menu-item"
                          onClick={() => {
                            setShowMoreMenu(false);
                            toggleFullScreenMode();
                          }}
                        >
                          {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                          <span>{isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}</span>
                        </button>

                        {currentUserRole !== 'AGENT' && currentUserRole !== 'SALES' && (
                          <>
                            <div className="dropdown-menu-divider" />
                            <button
                              className="dropdown-menu-item destructive"
                              onClick={() => {
                                setShowMoreMenu(false);
                                handleDeleteConversation();
                              }}
                            >
                              <UserX size={14} color="#ef4444" />
                              <span>Delete Conversation</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="chat-messages-container" ref={chatMessagesContainerRef}>
              {sortedMessages?.map((msg: any, mIdx: number) => {
                const isAgent = msg.senderType === "AGENT" || msg.senderType === "BOT" || msg.senderType === "AI" || msg.senderType === "SYSTEM" || msg.senderType === "BUSINESS" || msg.senderType === "GATEWAY" || msg.role === "assistant" || msg.role === "system";
                const isInternal = msg.isInternalNote;

                const msgDate = new Date(msg.sentAt);
                const prevMsg = mIdx > 0 ? sortedMessages[mIdx - 1] : null;
                const prevDate = prevMsg ? new Date(prevMsg.sentAt) : null;
                const showDateDivider = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                const dateDividerNode = showDateDivider ? (
                  <div key={`date-div-${msg.id}`} className="chat-date-wrapper">
                    <span className="chat-date-pill">
                      <Calendar size={12} />
                      <span>{formatChatDividerDate(msg.sentAt)}</span>
                    </span>
                  </div>
                ) : null;

                // Render Meta CTWA Ad Referral Card inside the chat stream
                if (msg.senderName === "META_CTWA_AD" || msg.messageType === "META_CTWA_AD") {
                  let metaDataObj: any = {};
                  try {
                    metaDataObj = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : (msg.metadata || {});
                  } catch (_) {}

                  const headline = metaDataObj.headline || "Click-to-WhatsApp Ad";
                  const body = metaDataObj.body || "";
                  const sourceId = metaDataObj.source_id || "META_AD";
                  const sourceUrl = metaDataObj.source_url || "";
                  const mediaUrl = metaDataObj.image_url || metaDataObj.video_url || "";

                  return (
                    <React.Fragment key={msg.id}>
                      {dateDividerNode}
                      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
                        <div style={{
                          maxWidth: "92%",
                          width: "440px",
                          background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
                          border: "1px solid #c7d2fe",
                          borderRadius: "16px",
                          padding: "14px 16px",
                          boxShadow: "0 4px 12px rgba(79, 70, 229, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px"
                        }}>
                          {/* Header Badge */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "8px",
                                background: "#2563eb",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: "bold"
                              }}>
                                <Sparkles size={14} />
                              </div>
                              <div>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  META AD REFERRAL
                                </span>
                                <div style={{ fontSize: "10px", color: "#475569" }}>
                                  Customer clicked this ad on Meta
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }} title={new Date(msg.sentAt).toLocaleString([], { dateStyle: "full", timeStyle: "medium" })}>
                              {formatMessageBubbleTime(msg.sentAt)}
                            </span>
                          </div>

                          {/* Optional Ad Image / Media Thumbnail */}
                          {mediaUrl && (
                            <img
                              src={resolveSafeMediaUrl(mediaUrl)}
                              alt="Meta Ad Media"
                              referrerPolicy="no-referrer"
                              style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "10px", border: "1px solid #dbeafe" }}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          )}

                          {/* Ad Body Content */}
                          <div style={{ background: "white", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e0e7ff" }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                              "{headline}"
                            </div>
                            {body && (
                              <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                                {body}
                              </div>
                            )}
                            <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "6px" }}>
                              Ad ID: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>{sourceId}</code>
                            </div>
                          </div>

                          {/* Action Button */}
                          {sourceUrl && (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                textAlign: "center",
                                background: "#2563eb",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px"
                              }}
                            >
                              View Ad on Meta ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                // Render Smart Website Visitor & Browsing Activity Referral Card inside the chat stream
                if (msg.senderName === "WEBSITE_VISITOR_CONTEXT" || msg.messageType === "WEBSITE_VISITOR_CONTEXT") {
                  let contextObj: any = {};
                  try {
                    contextObj = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : (msg.metadata || {});
                  } catch (_) {}

                  const pageTitle = contextObj.pageTitle || "Website Storefront";
                  const pageUrl = contextObj.pageUrl || "";
                  const platform = contextObj.platform || "Website";
                  const product = contextObj.detectedProduct;
                  const cart = contextObj.cart;
                  const cartItems: any[] = cart && Array.isArray(cart.items) ? cart.items : [];
                  const hasCart = cartItems.length > 0 || (cart && cart.item_count > 0);
                  const cartItemCount = cart?.item_count || cartItems.length;
                  const cartTotal = cart?.total_price
                    ? (typeof cart.total_price === "number" ? cart.total_price.toLocaleString("en-IN") : cart.total_price)
                    : null;

                  // Multi-Category Context & Browsing Activity
                  const categoryInsights = contextObj.categoryInsights || null;
                  const pageJourney: any[] = Array.isArray(contextObj.pageJourney) ? contextObj.pageJourney : [];
                  const searches: string[] = Array.isArray(contextObj.searches) ? contextObj.searches : [];
                  const sessionStats = contextObj.sessionStats || null;

                  const isEducation = categoryInsights?.category === "EDUCATION" || (categoryInsights?.courses && categoryInsights.courses.length > 0);
                  const isRealEstate = categoryInsights?.category === "REAL_ESTATE" || (categoryInsights?.properties && categoryInsights.properties.length > 0);
                  const isHealthcare = categoryInsights?.category === "HEALTHCARE" || (categoryInsights?.specialties && categoryInsights.specialties.length > 0);

                  let cardTheme = {
                    badgeTitle: "WEBSITE STORE REFERRAL",
                    badgeSub: `Inquiry originated from your ${platform} storefront`,
                    badgeIcon: "🛍️",
                    accentColor: "#059669",
                    darkColor: "#065f46",
                    bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
                    borderColor: "#a7f3d0",
                    shadow: "0 8px 24px rgba(16, 185, 129, 0.10)",
                    pillBg: "#ecfdf5",
                    pillBorder: "#a7f3d0",
                    pillColor: "#047857"
                  };

                  if (isEducation) {
                    cardTheme = {
                      badgeTitle: "EDUCATION CONSULTANCY LEAD",
                      badgeSub: "Student browsing history & course intent captured",
                      badgeIcon: "🎓",
                      accentColor: "#6366f1",
                      darkColor: "#4338ca",
                      bgGradient: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0e7ff 100%)",
                      borderColor: "#c7d2fe",
                      shadow: "0 8px 24px rgba(99, 102, 241, 0.12)",
                      pillBg: "#eef2ff",
                      pillBorder: "#c7d2fe",
                      pillColor: "#3730a3"
                    };
                  } else if (isRealEstate) {
                    cardTheme = {
                      badgeTitle: "REAL ESTATE & PROPERTY LEAD",
                      badgeSub: "Buyer interest captured from property listings",
                      badgeIcon: "🏢",
                      accentColor: "#d97706",
                      darkColor: "#b45309",
                      bgGradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fef9c3 100%)",
                      borderColor: "#fde68a",
                      shadow: "0 8px 24px rgba(217, 119, 6, 0.10)",
                      pillBg: "#fef3c7",
                      pillBorder: "#fde68a",
                      pillColor: "#92400e"
                    };
                  } else if (isHealthcare) {
                    cardTheme = {
                      badgeTitle: "HEALTHCARE & CLINICAL INQUIRY",
                      badgeSub: "Patient consultation & specialty interest captured",
                      badgeIcon: "🏥",
                      accentColor: "#0d9488",
                      darkColor: "#0f766e",
                      bgGradient: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #e0f2fe 100%)",
                      borderColor: "#99f6e4",
                      shadow: "0 8px 24px rgba(13, 148, 136, 0.10)",
                      pillBg: "#ccfbf1",
                      pillBorder: "#99f6e4",
                      pillColor: "#115e59"
                    };
                  } else if (!hasCart) {
                    cardTheme = {
                      badgeTitle: "WEBSITE VISITOR INQUIRY",
                      badgeSub: `Visitor activity tracked from ${platform}`,
                      badgeIcon: "🌐",
                      accentColor: "#2563eb",
                      darkColor: "#1d4ed8",
                      bgGradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #f0fdf4 100%)",
                      borderColor: "#bfdbfe",
                      shadow: "0 8px 24px rgba(37, 99, 235, 0.10)",
                      pillBg: "#dbeafe",
                      pillBorder: "#bfdbfe",
                      pillColor: "#1e40af"
                    };
                  }

                  const isJourneyOpen = Boolean(expandedJourneyMsgIds[msg.id]);

                  return (
                    <React.Fragment key={msg.id}>
                      {dateDividerNode}
                      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                        <div style={{
                          maxWidth: "94%",
                          width: "480px",
                          background: cardTheme.bgGradient,
                          border: `1px solid ${cardTheme.borderColor}`,
                          borderRadius: "18px",
                          padding: "16px",
                          boxShadow: cardTheme.shadow,
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          transition: "all 0.2s ease"
                        }}>
                          {/* Header Badge */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                background: cardTheme.accentColor,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                fontWeight: "bold",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
                              }}>
                                {cardTheme.badgeIcon}
                              </div>
                              <div>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: cardTheme.darkColor, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                  {cardTheme.badgeTitle}
                                </span>
                                <div style={{ fontSize: "10px", color: "#475569", marginTop: "1px" }}>
                                  {cardTheme.badgeSub}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }} title={new Date(msg.sentAt).toLocaleString([], { dateStyle: "full", timeStyle: "medium" })}>
                              {formatMessageBubbleTime(msg.sentAt)}
                            </span>
                          </div>

                          {/* Active Visited Webpage Box */}
                          <div style={{ background: "white", padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  <Globe size={12} color={cardTheme.accentColor} />
                                  <span>Active Page Visited</span>
                                </div>
                                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", marginTop: "3px", lineHeight: "1.35", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {pageTitle}
                                </div>
                                {product && product.price && (
                                  <div style={{ fontSize: "11.5px", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
                                    Price: ₹{product.price}
                                  </div>
                                )}
                                {sessionStats && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>
                                    <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                      ⏱️ {Math.max(1, Math.round(sessionStats.totalDurationSec / 60))}m on site
                                    </span>
                                    <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                      📄 {sessionStats.pageViews || (pageJourney.length || 1)} pages visited
                                    </span>
                                  </div>
                                )}
                              </div>
                              {pageUrl && (
                                <a
                                  href={pageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: cardTheme.darkColor,
                                    background: cardTheme.pillBg,
                                    border: `1px solid ${cardTheme.pillBorder}`,
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    textDecoration: "none",
                                    whiteSpace: "nowrap",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    flexShrink: 0
                                  }}
                                >
                                  <span>Open Page</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Education Specific Intent Breakdown */}
                          {isEducation && categoryInsights && (
                            <div style={{ background: "white", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e0e7ff", display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#4338ca", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <span>🎓</span>
                                <span>Education Consultancy Intent</span>
                              </div>

                              {categoryInsights.courses && categoryInsights.courses.length > 0 && (
                                <div>
                                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Courses of Interest:</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {categoryInsights.courses.map((c: string, ci: number) => (
                                      <span key={ci} style={{ fontSize: "11px", fontWeight: 700, background: "#ede9fe", color: "#5b21b6", padding: "3px 8px", borderRadius: "6px", border: "1px solid #ddd6fe" }}>
                                        🎓 {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {categoryInsights.universities && categoryInsights.universities.length > 0 && (
                                <div>
                                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Target Universities / Colleges:</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {categoryInsights.universities.map((u: string, ui: number) => (
                                      <span key={ui} style={{ fontSize: "11px", fontWeight: 700, background: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: "6px", border: "1px solid #c7d2fe" }}>
                                        🏛️ {u}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {categoryInsights.destinations && categoryInsights.destinations.length > 0 && (
                                <div>
                                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Preferred Study Destinations:</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {categoryInsights.destinations.map((d: string, di: number) => (
                                      <span key={di} style={{ fontSize: "11px", fontWeight: 600, background: "#f1f5f9", color: "#1e293b", padding: "2px 7px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
                                        🌍 {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Real Estate Specific Intent Breakdown */}
                          {isRealEstate && categoryInsights && categoryInsights.properties && categoryInsights.properties.length > 0 && (
                            <div style={{ background: "white", padding: "12px 14px", borderRadius: "12px", border: "1px solid #fde68a", display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                🏢 Properties & Layouts Viewed
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {categoryInsights.properties.map((p: string, pi: number) => (
                                  <span key={pi} style={{ fontSize: "11px", fontWeight: 700, background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "6px", border: "1px solid #fde68a" }}>
                                    🏢 {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Healthcare Specific Intent Breakdown */}
                          {isHealthcare && categoryInsights && categoryInsights.specialties && categoryInsights.specialties.length > 0 && (
                            <div style={{ background: "white", padding: "12px 14px", borderRadius: "12px", border: "1px solid #99f6e4", display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                🏥 Specialties & Doctors Consulted
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {categoryInsights.specialties.map((sp: string, spi: number) => (
                                  <span key={spi} style={{ fontSize: "11px", fontWeight: 700, background: "#ccfbf1", color: "#115e59", padding: "3px 8px", borderRadius: "6px", border: "1px solid #99f6e4" }}>
                                    🩺 {sp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Searched Queries on Site */}
                          {searches.length > 0 && (
                            <div style={{ background: "white", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.06)" }}>
                              <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#475569", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                🔍 Searched on Website ({searches.length})
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                {searches.map((sq: string, sqi: number) => (
                                  <span key={sqi} style={{ fontSize: "11px", fontWeight: 600, background: "#f8fafc", color: "#0f172a", padding: "3px 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                                    "{sq}"
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Active Cart Items Section */}
                          {hasCart && (
                            <div style={{ background: "white", padding: "12px 14px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "#065f46" }}>
                                  <span>🛒</span> Cart Context ({cartItemCount} item{cartItemCount > 1 ? "s" : ""})
                                </div>
                                {cartTotal && (
                                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                                    Total: ₹{cartTotal}
                                  </div>
                                )}
                              </div>

                              {cartItems.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {cartItems.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "6px 8px",
                                        background: "#f8fafc",
                                        borderRadius: "8px",
                                        fontSize: "11.5px"
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                                        {item.image && (
                                          <img
                                            src={item.image}
                                            alt={item.title}
                                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }}
                                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                                          />
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontWeight: 600, color: "#1e293b", lineHeight: "1.2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {item.title}
                                          </div>
                                          {item.variant_title && (
                                            <div style={{ fontSize: "10px", color: "#64748b" }}>
                                              {item.variant_title}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: "right", whiteSpace: "nowrap", marginLeft: "8px" }}>
                                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                          Qty: {item.quantity}
                                        </div>
                                        {item.price && (
                                          <div style={{ fontSize: "10.5px", color: "#059669", fontWeight: 600 }}>
                                            ₹{item.price}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                  {cartItemCount} items in cart {cartTotal ? `totaling ₹${cartTotal}` : ""}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Visitor Browsing Journey (Step-by-Step Collapsible Breadcrumb Trail) */}
                          {pageJourney.length > 0 && (
                            <div style={{ background: "white", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                              <button
                                type="button"
                                onClick={() => setExpandedJourneyMsgIds((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                style={{
                                  width: "100%",
                                  padding: "10px 14px",
                                  background: "none",
                                  border: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  color: cardTheme.darkColor,
                                  outline: "none"
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span>🧭</span>
                                  <span>Visitor Browsing Trail ({pageJourney.length} page{pageJourney.length > 1 ? "s" : ""})</span>
                                </span>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
                                  {isJourneyOpen ? "Hide History ▲" : "View Trail ▼"}
                                </span>
                              </button>

                              {isJourneyOpen ? (
                                <div style={{ padding: "0 14px 12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {pageJourney.map((step: any, sIdx: number) => {
                                    const isLast = sIdx === pageJourney.length - 1;
                                    return (
                                      <div
                                        key={sIdx}
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          gap: "8px",
                                          padding: "6px 8px",
                                          background: isLast ? cardTheme.pillBg : "#f8fafc",
                                          borderRadius: "8px",
                                          border: `1px solid ${isLast ? cardTheme.pillBorder : "#e2e8f0"}`,
                                          fontSize: "11px"
                                        }}
                                      >
                                        <span style={{
                                          width: "18px",
                                          height: "18px",
                                          borderRadius: "50%",
                                          background: isLast ? cardTheme.accentColor : "#94a3b8",
                                          color: "white",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "9px",
                                          fontWeight: 800,
                                          flexShrink: 0
                                        }}>
                                          {sIdx + 1}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: isLast ? 700 : 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={step.title}>
                                            {step.title || step.path}
                                          </div>
                                          <div style={{ fontSize: "10px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "1px" }}>
                                            <span>{step.path}</span>
                                            {step.dwellSec > 0 && <span>• ⏱️ {step.dwellSec}s dwell</span>}
                                            {isLast && <span style={{ color: cardTheme.darkColor, fontWeight: 700 }}>• Active (WhatsApp CTA)</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ padding: "0 14px 10px 14px", fontSize: "10.5px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {pageJourney.map((p: any) => p.path).slice(-3).join(" ➔ ")}
                                  {pageJourney.length > 3 && " (more)"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                                if (isInternal) {
                  return (
                    <React.Fragment key={msg.id}>
                      {dateDividerNode}
                      <div className="internal-note-card">
                        <div className="internal-note-header">
                          <LockIcon size={12} />
                          <span>Internal Team Note by {msg.senderName}</span>
                          <span className="note-time" title={new Date(msg.sentAt).toLocaleString([], { dateStyle: "full", timeStyle: "medium" })}>
                            {formatMessageBubbleTime(msg.sentAt)}
                          </span>
                        </div>
                        <div className="internal-note-body">{msg.content}</div>
                      </div>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={msg.id}>
                    {dateDividerNode}
                    <div className={`message-row ${isAgent ? "outgoing" : "incoming"} ${msg.isInternalNote ? "internal-note-row" : ""}`}>
                      <div className={`message-bubble ${msg.isInternalNote ? "internal-note-bubble" : ""}`}>
                        <div className="message-sender-name">
                          {msg.isInternalNote ? (
                            <span className="sender-badge internal-note"><Lock size={11} /> Internal Note</span>
                          ) : (msg.senderType === "BOT" || msg.senderType === "AI" || msg.senderName === "AI Assistant") ? (
                            <span className="sender-badge ai-badge"><Bot size={11} /> AI Assistant</span>
                          ) : (msg.senderType === "SYSTEM" || msg.senderType === "GATEWAY" || msg.senderType === "BUSINESS") ? (
                            <span className="sender-badge agent-badge">
                              <ShieldCheck size={11} />
                              <span>{msg.senderName || "System / Billing"}</span>
                            </span>
                          ) : isAgent ? (
                            <span className="sender-badge agent-badge">
                              <UserCheck size={11} />
                              <span>
                                {(msg.senderName === "Sales Rep" || msg.senderName === "Agent") && activeConvDetail.assignedEmployee?.user?.name 
                                  ? `Sales Agent · ${activeConvDetail.assignedEmployee.user.name}` 
                                  : (msg.senderName || "Sales Agent")}
                              </span>
                            </span>
                          ) : (
                            <span className="sender-badge customer-badge">{getCustomerDisplayName(activeConvDetail.customer)}</span>
                          )}
                        </div>

                        {/* PDF Document Renderer */}
                        {msg.messageType === "DOCUMENT" && (
                          <div className="message-doc-box">
                            <FileText size={24} color="#ef4444" />
                            <div className="doc-info">
                              <span className="doc-filename">{msg.mediaFilename || "Document.pdf"}</span>
                              <span className="doc-filesize">Attachment Document</span>
                            </div>
                            {msg.mediaUrl && (
                              <a href={resolveSafeMediaUrl(msg.mediaUrl)} target="_blank" rel="noreferrer" className="doc-download-btn">
                                Download
                              </a>
                            )}
                          </div>
                        )}

                        {/* Image Message Renderer */}
                        {msg.messageType === "IMAGE" && (
                          <div style={{ marginTop: "4px", position: "relative" }}>
                            {msg.mediaUrl ? (
                              <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                                <img
                                  src={resolveSafeMediaUrl(msg.mediaUrl)}
                                  alt="Media Image"
                                  referrerPolicy="no-referrer"
                                  style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "8px", cursor: "pointer" }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                  onClick={() => window.open(resolveSafeMediaUrl(msg.mediaUrl), "_blank")}
                                />
                                <button onClick={(e) => forceDownloadMedia(resolveSafeMediaUrl(msg.mediaUrl), e)} style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Download Image">
                                  <Download size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="message-media-expired">
                                <ImageIcon size={14} />
                                <span>Image expired on WhatsApp servers (30-day limit)</span>
                              </div>
                            )}
                            {msg.content && msg.content !== "[IMAGE]" && !msg.content.startsWith("Attached file:") && <p className="message-text-content" style={{ marginTop: "4px" }}>{msg.content}</p>}
                          </div>
                        )}

                        {/* Video Message Renderer */}
                        {msg.messageType === "VIDEO" && (
                          <div style={{ marginTop: "4px", position: "relative" }}>
                            <video src={resolveSafeMediaUrl(msg.mediaUrl)} controls style={{ width: "100%", maxHeight: "220px", borderRadius: "8px" }} />
                            {msg.mediaUrl && (
                              <button onClick={(e) => forceDownloadMedia(resolveSafeMediaUrl(msg.mediaUrl), e)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }} title="Download Video">
                                <Download size={14} />
                              </button>
                            )}
                            {msg.content && msg.content !== "[IMAGE]" && !msg.content.startsWith("Attached file:") && <p className="message-text-content" style={{ marginTop: "4px" }}>{msg.content}</p>}
                          </div>
                        )}

                        {/* Audio Message Renderer */}
                        {msg.messageType === "AUDIO" && (
                          <div className="message-audio-box">
                            <div className="message-audio-header">
                              <span className="message-audio-title">Voice Message</span>
                              {msg.mediaUrl && (
                                <button onClick={(e) => forceDownloadMedia(resolveSafeMediaUrl(msg.mediaUrl), e)} className="message-audio-dl" title="Download Audio">
                                  <Download size={14} />
                                </button>
                              )}
                            </div>
                            {msg.mediaUrl ? (
                              <audio
                                src={resolveSafeMediaUrl(msg.mediaUrl)}
                                controls
                                style={{ width: "100%", height: "36px" }}
                                onError={(e) => {
                                  const parent = (e.currentTarget as HTMLElement).parentElement;
                                  if (parent) {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    const fallback = document.createElement("div");
                                    fallback.className = "message-media-expired";
                                    fallback.innerHTML = "<span>Voice note expired on WhatsApp servers</span>";
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <div className="message-media-expired">
                                <Mic size={14} />
                                <span>Voice note expired (Stored only for 30 days)</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Payment Link Card Renderer */}
                        {msg.messageType === "PAYMENT_LINK" && (() => {
                          let payMeta: any = {};
                          try {
                            if (msg.metadata) {
                              payMeta = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                            }
                          } catch (_) {}

                          const qrImg = payMeta.qrImageUrl || (msg.mediaUrl?.includes("create-qr-code") ? msg.mediaUrl : null);
                          const payUrl = payMeta.paymentUrl || (msg.mediaUrl?.startsWith("http") && !msg.mediaUrl.includes("create-qr-code") ? msg.mediaUrl : null);
                          const payAmt = payMeta.amount || (msg.content?.match(/₹\s*([0-9,]+)/)?.[1]);

                          // Look up real-time payment link status from conversation data
                          const matchingLink = payMeta.paymentLinkId 
                            ? activeConvDetail?.paymentLinks?.find((l: any) => l.id === payMeta.paymentLinkId)
                            : (payUrl 
                                ? activeConvDetail?.paymentLinks?.find((l: any) => l.paymentUrl === payUrl || (l.orderId && payUrl.includes(l.orderId)))
                                : (payAmt 
                                    ? activeConvDetail?.paymentLinks?.find((l: any) => Math.abs(Number(l.amount) - Number(String(payAmt).replace(/,/g, ""))) <= 1)
                                    : activeConvDetail?.paymentLinks?.[0]));

                          const isPaid = matchingLink?.status === "PAID";
                          const isExpired = matchingLink?.status === "EXPIRED";
                          const txnRef = matchingLink?.transactionId;

                          return (
                            <div className="msg-payment-card">
                              {/* Header */}
                              <div className="msg-payment-header">
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div className="msg-payment-icon-wrap">
                                    <CreditCard size={15} color="#ffffff" />
                                  </div>
                                  <div>
                                    <div className="msg-payment-title">
                                      Payment Request
                                    </div>
                                    {payAmt && (
                                      <div className="msg-payment-amount">
                                        ₹{typeof payAmt === "number" ? payAmt.toLocaleString("en-IN") : payAmt}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={`msg-payment-status-badge ${isPaid ? "paid" : isExpired ? "expired" : "pending"}`}>
                                  {isPaid ? "✓ PAID" : isExpired ? "EXPIRED" : "PENDING"}
                                </span>
                              </div>

                              {/* Scannable QR Code Image */}
                              {qrImg && !isPaid && (
                                <div className="msg-payment-qr-wrap">
                                  <div className="msg-payment-qr-box">
                                    <img
                                      src={qrImg}
                                      alt="UPI QR Code"
                                      referrerPolicy="no-referrer"
                                      style={{ width: "160px", height: "160px", display: "block" }}
                                    />
                                  </div>
                                  <div className="msg-payment-qr-caption">
                                    Scan with Google Pay, PhonePe, Paytm or UPI
                                  </div>
                                </div>
                              )}

                              {/* Body Text */}
                              <div className="msg-payment-body">
                                {msg.content}
                              </div>

                              {/* Verified Banner (if paid) */}
                              {isPaid ? (
                                <div style={{ padding: "0 12px 12px" }}>
                                  <div style={{
                                    background: "#f0fdf4",
                                    border: "1px solid #86efac",
                                    borderRadius: "10px",
                                    padding: "10px 12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px"
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <CheckCircle2 size={16} color="#16a34a" />
                                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#15803d" }}>Payment Verified & Received</span>
                                    </div>
                                    {txnRef && (
                                      <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#166534", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                                        {txnRef}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Pay Now Button Link (if pending) */
                                payUrl && (
                                  <div className="msg-payment-btn-wrap">
                                    <a
                                      href={payUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="msg-payment-btn"
                                    >
                                      <CreditCard size={13} /> Pay Now <ExternalLink size={12} />
                                    </a>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })()}

                        {/* Interactive Buttons / List Renderer */}
                        {(msg.messageType === "BUTTONS" || msg.messageType === "LIST") && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                            {/* Image Header Preview */}
                            {msg.mediaUrl && (
                              <img
                                src={resolveSafeMediaUrl(msg.mediaUrl)}
                                alt="Header Media"
                                referrerPolicy="no-referrer"
                                style={{ width: "100%", aspectRatio: "1.91 / 1", objectFit: "cover", borderRadius: "8px", cursor: "pointer", display: "block" }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                                onClick={() => window.open(resolveSafeMediaUrl(msg.mediaUrl), "_blank")}
                              />
                            )}
                            
                            {/* Text Body */}
                            <div className="message-text-content">
                              {renderWhatsAppFormattedText(msg.content)}
                            </div>

                            {/* Native WhatsApp Interactive Reply Buttons */}
                            {(() => {
                              let options: string[] = [];
                              try {
                                if (msg.metadata) {
                                  const parsed = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                                  if (Array.isArray(parsed)) {
                                    options = parsed;
                                  } else if (parsed && Array.isArray(parsed.options)) {
                                    options = parsed.options;
                                  }
                                }
                              } catch (_) {}
                              if (options.length === 0) return null;

                              return (
                                <div className="msg-template-buttons-container">
                                  {options.map((optText, oIdx) => (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      className="msg-template-btn"
                                      onClick={() => {
                                        setMessageInput(optText);
                                      }}
                                      title={`Reply with: ${optText}`}
                                    >
                                      <CornerDownLeft size={13} style={{ opacity: 0.8 }} />
                                      <span>{optText}</span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Meta Template Complete Card Renderer */}
                        {msg.messageType === "TEMPLATE" && (() => {
                          let parsedMeta: any = null;
                          try {
                            if (msg.metadata) {
                              parsedMeta = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                            }
                          } catch (_) {}

                          const tName = parsedMeta?.templateName || parsedMeta?.name || msg.templateId || "";
                          const matchedTemplate = approvedTemplates.find((t: any) => 
                            (tName && (t.name?.toLowerCase() === tName.toLowerCase() || t.id === tName)) ||
                            (parsedMeta?.templateId && t.id === parsedMeta.templateId)
                          ) || null;

                          // Extract body parameters
                          const bodyParams: any[] = parsedMeta?.components?.find((c: any) => c.type === 'body')?.parameters || [];
                          
                          // Hydrate body text:
                          let bodyText = msg.content || matchedTemplate?.bodyText || "";
                          if (bodyText.includes("{{") && matchedTemplate?.bodyText) {
                            let hydrated = matchedTemplate.bodyText;
                            bodyParams.forEach((param: any, pIdx: number) => {
                              const val = param.text || param.date_time?.fallback_value || "";
                              hydrated = hydrated.replace(new RegExp(`\\{\\{${pIdx + 1}\\}\\}`, 'g'), val);
                            });
                            // Fallback any remaining {{1}} with customer name
                            const custName = activeConvDetail?.customer?.contactPerson || activeConvDetail?.contactName || "Valued Customer";
                            hydrated = hydrated.replace(/\{\{\d+\}\}/g, custName);
                            bodyText = hydrated;
                          }

                          // Header resolution:
                          const headerType = matchedTemplate?.headerType || (msg.mediaUrl ? 'IMAGE' : (parsedMeta?.headerType || 'NONE'));
                          const headerParam = parsedMeta?.components?.find((c: any) => c.type === 'header')?.parameters?.[0];
                          const headerMediaUrl = msg.mediaUrl || headerParam?.image?.link || headerParam?.video?.link || headerParam?.document?.link || (headerType !== 'TEXT' ? matchedTemplate?.headerContent : null);
                          const headerTitle = headerType === 'TEXT' ? (headerParam?.text || matchedTemplate?.headerContent || parsedMeta?.headerText) : null;

                          // Footer resolution:
                          const footerText = matchedTemplate?.footerText || parsedMeta?.footerText || parsedMeta?.footer || "";

                          // Buttons resolution:
                          let templateButtons: any[] = [];
                          if (matchedTemplate?.buttons) {
                            try {
                              templateButtons = typeof matchedTemplate.buttons === 'string' ? JSON.parse(matchedTemplate.buttons) : matchedTemplate.buttons;
                            } catch (_) {}
                          }
                          if ((!templateButtons || templateButtons.length === 0) && parsedMeta?.buttons) {
                            templateButtons = Array.isArray(parsedMeta.buttons) ? parsedMeta.buttons : [];
                          }
                          if ((!templateButtons || templateButtons.length === 0) && parsedMeta?.components) {
                            const btnComps = parsedMeta.components.filter((c: any) => c.type === 'button');
                            if (btnComps.length > 0) {
                              templateButtons = btnComps.map((bc: any) => ({
                                type: bc.sub_type || 'URL',
                                text: bc.sub_type === 'CATALOG' ? 'View catalog' : (bc.text || 'Action'),
                                url: bc.parameters?.[0]?.text
                              }));
                            }
                          }

                          return (
                            <div className="msg-template-card">
                              {/* Template Badge Header */}
                              <div className="msg-type-badge msg-badge-template" style={{ marginBottom: "6px" }}>
                                <ShieldCheck size={11} /> Meta Approved Template: {matchedTemplate?.name || tName || 'Template'}
                              </div>

                              {/* Header Media / Title */}
                              {headerType === 'IMAGE' && headerMediaUrl && (
                                <div className="msg-template-header-media">
                                  <img 
                                    src={resolveSafeMediaUrl(headerMediaUrl)} 
                                    alt="Template Header" 
                                    referrerPolicy="no-referrer"
                                    style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", cursor: "pointer" }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                    onClick={() => window.open(resolveSafeMediaUrl(headerMediaUrl), "_blank")}
                                  />
                                </div>
                              )}

                              {headerType === 'VIDEO' && headerMediaUrl && (
                                <div className="msg-template-header-media">
                                  <video 
                                    src={resolveSafeMediaUrl(headerMediaUrl)} 
                                    controls 
                                    playsInline 
                                    style={{ width: "100%", borderRadius: "8px", maxHeight: "240px", objectFit: "cover" }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              )}

                              {headerType === 'DOCUMENT' && (
                                <div className="msg-doc-preview" style={{ marginBottom: "8px" }} onClick={() => headerMediaUrl && window.open(resolveSafeMediaUrl(headerMediaUrl), "_blank")}>
                                  <div className="msg-doc-icon">
                                    <FileText size={20} color="#3b82f6" />
                                  </div>
                                  <div className="msg-doc-info">
                                    <div className="msg-doc-name">{matchedTemplate?.name || 'Document'}.pdf</div>
                                    <div className="msg-doc-meta">WhatsApp Document Attachment</div>
                                  </div>
                                </div>
                              )}

                              {headerTitle && (
                                <div className="msg-template-header-title">
                                  {headerTitle}
                                </div>
                              )}

                              {/* Formatted Body Text */}
                              <div className="msg-template-body-text">
                                {renderWhatsAppFormattedText(bodyText)}
                              </div>

                              {/* Footer Text */}
                              {footerText && (
                                <div className="msg-template-footer-text">
                                  {footerText}
                                </div>
                              )}

                              {/* Action Buttons */}
                              {templateButtons.length > 0 && (
                                <div className="msg-template-buttons-container">
                                  {templateButtons.map((btn: any, bIdx: number) => {
                                    const isCatalog = btn.type === "CATALOG" || btn.type === "CATALOGUE";
                                    const isUrl = btn.type === "URL" || btn.type === "DYNAMIC_URL";
                                    const isPhone = btn.type === "PHONE_NUMBER" || btn.type === "VOICE_CALL";
                                    const isCopyCode = btn.type === "COPY_CODE" || btn.type === "OTP";
                                    const isQuickReply = btn.type === "QUICK_REPLY";

                                    return (
                                      <button
                                        key={bIdx}
                                        type="button"
                                        className={`msg-template-btn ${isCatalog ? 'msg-template-catalog-btn' : ''}`}
                                        onClick={() => {
                                          if (isCatalog) {
                                            setToastMsg("🛍️ WhatsApp Commerce Catalog link active on receiver's device");
                                            setTimeout(() => setToastMsg(null), 3000);
                                          } else if (isUrl && btn.url) {
                                            let targetUrl = btn.url;
                                            const btnParam = parsedMeta?.components?.find((c: any) => c.type === 'button' && c.index === String(bIdx))?.parameters?.[0]?.text;
                                            if (btnParam) {
                                              targetUrl = targetUrl.replace(/\{\{\d+\}\}/g, btnParam);
                                            }
                                            window.open(targetUrl, "_blank");
                                          } else if (isPhone && (btn.phoneNumber || btn.phone)) {
                                            window.location.href = `tel:${btn.phoneNumber || btn.phone}`;
                                          } else if (isCopyCode) {
                                            const codeVal = btn.code || bodyParams[0]?.text || "123456";
                                            navigator.clipboard.writeText(codeVal);
                                            setToastMsg(`Verification code (${codeVal}) copied!`);
                                            setTimeout(() => setToastMsg(null), 2500);
                                          } else if (isQuickReply) {
                                            setMessageInput(btn.text || "");
                                          }
                                        }}
                                      >
                                        {isCatalog && <ShoppingBag size={14} color="#10b981" />}
                                        {isUrl && <ExternalLink size={14} />}
                                        {isPhone && <Phone size={14} />}
                                        {isCopyCode && <Copy size={14} />}
                                        {isQuickReply && <Sparkles size={14} />}
                                        <span>{btn.text || (isCatalog ? 'View catalog' : (isCopyCode ? 'Copy Code' : 'Action'))}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Interactive Flow Badge */}
                        {msg.messageType === "FLOW" && (
                          <div className="msg-type-badge msg-badge-flow">
                            <Zap size={11} /> Interactive Flow Form
                          </div>
                        )}

                        {/* Product Card Badge */}
                        {msg.messageType === "PRODUCT_CARD" && (
                          <div className="msg-type-badge msg-badge-product">
                            <ShoppingBag size={11} /> Product Card
                          </div>
                        )}

                        {/* WhatsApp Catalog Order Card Renderer */}
                        {(msg.messageType === "ORDER" || (() => {
                          try {
                            if (msg.metadata) {
                              const p = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                              return Boolean(p.order || p.items);
                            }
                          } catch (_) {}
                          return false;
                        })()) && (() => {
                          let orderInfo: any = null;
                          try {
                            if (msg.metadata) {
                              const parsed = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                              orderInfo = parsed.order || parsed;
                            }
                          } catch (_) {}

                          const rawItems: any[] = Array.isArray(orderInfo?.items) ? orderInfo.items : [];
                          
                          // Resolve product titles and images against productsList
                          const items = rawItems.map((it: any) => {
                            const retailerKey = String(it.retailer_id || it.product_retailer_id || it.sku || it.id || it.retailerId || "").trim();
                            const matched = productsList.find((p: any) => {
                              if (!p) return false;
                              if (retailerKey) {
                                if (String(p.sku || "").trim() === retailerKey) return true;
                                if (String(p.id || "").trim() === retailerKey) return true;
                                if (String(p.subCategory || "").trim() === retailerKey) return true;
                                if (String(p.sku || "").includes(retailerKey)) return true;
                                if (retailerKey.includes(String(p.sku || ""))) return true;
                              }
                              if (it.name && typeof it.name === 'string' && !/^\d+$/.test(it.name.trim())) {
                                if (p.name && p.name.toLowerCase() === it.name.toLowerCase()) return true;
                              }
                              return false;
                            });

                            const isNumericTitle = !it.name || /^\d+$/.test(String(it.name).trim()) || it.name === it.retailer_id || it.name === it.sku;
                            const finalTitle = (!isNumericTitle && it.name) 
                              ? it.name 
                              : (matched?.name || (it.name && !isNumericTitle ? it.name : (matched?.name || `Product SKU: ${retailerKey}`)));

                            const finalImage = it.image || matched?.images?.[0] || matched?.image || null;
                            const finalPrice = Number(it.price || it.item_price || matched?.sellingPrice || matched?.price || 0);
                            const finalQty = Number(it.quantity || 1);
                            const finalSubtotal = Number(it.subtotal || (finalPrice * finalQty));

                            return {
                              ...it,
                              name: finalTitle,
                              image: finalImage,
                              price: finalPrice,
                              quantity: finalQty,
                              subtotal: finalSubtotal,
                              sku: retailerKey
                            };
                          });

                          const totalAmount = orderInfo?.totalAmount ?? (items.reduce((s: number, i: any) => s + (i.subtotal || 0), 0) || 0);
                          const totalQuantity = orderInfo?.totalQuantity ?? (items.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 1);
                          const currencySymbol = (orderInfo?.currency === 'INR' || !orderInfo?.currency) ? '₹' : '$';
                          const customerNote = orderInfo?.customerNote || orderInfo?.text || '';

                          return (
                            <div className="msg-order-card">
                              {/* Header */}
                              <div className="msg-order-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div className="msg-order-icon-wrap">
                                    <ShoppingBag size={15} color="#ffffff" />
                                  </div>
                                  <div>
                                    <div className="msg-order-header-title">
                                      WhatsApp Catalog Order
                                    </div>
                                    <div className="msg-order-header-subtitle">
                                      {totalQuantity} {totalQuantity === 1 ? 'Item' : 'Items'} Ordered
                                    </div>
                                  </div>
                                </div>

                                <span className="msg-order-badge">
                                  Cart Sent
                                </span>
                              </div>

                              {/* Items list */}
                              <div className="msg-order-items">
                                {items.length > 0 ? (
                                  items.map((it: any, idx: number) => (
                                    <div key={idx} className="msg-order-item">
                                      {/* Thumbnail */}
                                      <div className="msg-order-thumb">
                                        {it.image ? (
                                          <img
                                            src={resolveSafeMediaUrl(it.image)}
                                            alt={it.name || 'Product'}
                                            referrerPolicy="no-referrer"
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover'
                                            }}
                                            onError={(e) => {
                                              const target = e.currentTarget;
                                              target.style.display = 'none';
                                              const fallback = target.parentElement?.querySelector('.prod-fallback-icon') as HTMLElement;
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="prod-fallback-icon"
                                          style={{
                                            display: it.image ? 'none' : 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            height: '100%',
                                            color: '#10b981'
                                          }}
                                        >
                                          <ShoppingBag size={22} />
                                        </div>
                                      </div>

                                      {/* Title & Qty */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="msg-order-item-title">
                                          {it.name}
                                        </div>
                                        <div className="msg-order-item-qty-row">
                                          <span className="msg-order-qty-chip">
                                            Qty: {it.quantity || 1}
                                          </span>
                                          {it.price > 0 && (
                                            <span>× {currencySymbol}{Number(it.price).toLocaleString('en-IN')}</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Subtotal */}
                                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <span className="msg-order-price">
                                          {currencySymbol}{(Number(it.subtotal || (it.price * (it.quantity || 1)))).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="msg-order-fallback-content">
                                    {msg.content === '[Message]' ? 'Customer sent items from the WhatsApp Catalog.' : msg.content}
                                  </div>
                                )}

                                {/* Customer Note */}
                                {customerNote && String(customerNote).trim() && String(customerNote).trim() !== "null" && String(customerNote).trim() !== "undefined" ? (
                                  <div className="msg-order-customer-note">
                                    <MessageSquare size={13} style={{ flexShrink: 0, marginTop: "2px" }} />
                                    <div style={{ flex: 1 }}>
                                      <strong>Customer Note:</strong> {customerNote}
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              {/* Footer Total */}
                              {totalAmount > 0 && (
                                <div className="msg-order-footer-total">
                                  <span className="msg-order-total-label">Estimated Order Total:</span>
                                  <span className="msg-order-total-value">
                                    {currencySymbol}{Number(totalAmount).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="msg-order-actions">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessageInput(`Hello ${activeConvDetail?.customer?.contactPerson || ''}! We received your catalog order of ${totalQuantity} item(s) ${totalAmount > 0 ? `(Total: ${currencySymbol}${Number(totalAmount).toLocaleString('en-IN')})` : ''}. We are preparing your quotation / order confirmation now!`);
                                  }}
                                  className="msg-order-btn msg-order-btn-reply"
                                >
                                  <Sparkles size={12} color="#10b981" /> Reply Confirmation
                                </button>

                                {paymentConfigured && totalAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentAmount(totalAmount);
                                      setPaymentDesc(`Payment for WhatsApp Catalog Order (${totalQuantity} items)`);
                                      setShowPaymentModal(true);
                                    }}
                                    className="msg-order-btn msg-order-btn-pay"
                                    title="Generate Payment Link"
                                  >
                                    <CreditCard size={12} /> Payment Link
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const summary = `WhatsApp Catalog Order:\n` +
                                      (items.length > 0
                                        ? items.map((i: any) => `• ${i.quantity}x ${i.name} - ${currencySymbol}${i.subtotal}`).join('\n')
                                        : msg.content) +
                                      (totalAmount > 0 ? `\nTotal: ${currencySymbol}${totalAmount}` : '');
                                    navigator.clipboard.writeText(summary);
                                    setToastMsg('Order summary copied to clipboard!');
                                    setTimeout(() => setToastMsg(null), 2500);
                                  }}
                                  className="msg-order-btn msg-order-btn-copy"
                                  title="Copy order details"
                                >
                                  <FileText size={12} /> Copy
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Standard Text & Unsupported Format Renderer */}
                        {msg.messageType !== "DOCUMENT" && msg.messageType !== "IMAGE" && msg.messageType !== "VIDEO" && msg.messageType !== "AUDIO" && msg.messageType !== "PAYMENT_LINK" && msg.messageType !== "BUTTONS" && msg.messageType !== "LIST" && msg.messageType !== "ORDER" && msg.messageType !== "TEMPLATE" && (() => {
                          const { bodyText, ctaButtons } = extractWhatsAppCtaAndBody(msg.content || "");
                          return (
                            <div className="message-text-content">
                              {msg.messageType === "UNSUPPORTED" ? (
                                bodyText && bodyText !== "[Message]" ? (
                                  <div>{renderWhatsAppFormattedText(bodyText)}</div>
                                ) : (
                                  <span style={{ color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                                    <ShoppingBag size={14} />
                                    <span>WhatsApp Catalog Order Received</span>
                                  </span>
                                )
                              ) : (
                                <div>{renderWhatsAppFormattedText(bodyText)}</div>
                              )}

                              {/* Native WhatsApp CTA Action Buttons (as seen on receiver's WhatsApp) */}
                              {ctaButtons.length > 0 && (
                                <div className="msg-template-buttons-container" style={{ marginTop: "8px" }}>
                                  {ctaButtons.map((btn, bIdx) => (
                                    <a
                                      key={bIdx}
                                      href={btn.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="msg-template-btn"
                                      style={{ textDecoration: "none" }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink size={13} />
                                      <span>{btn.text}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {msg.status === "FAILED" && (() => {
                          let errorObj: any = null;
                          try {
                            if (msg.metadata) {
                              const parsed = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                              errorObj = parsed.error || null;
                            }
                          } catch {}

                          // A message is ONLY considered 24h expired if Meta explicitly returned error 131047 / is24hExpired,
                          // OR if sessionStatus.expired is truly true and not neverMessaged
                          const isReal24hExpired = errorObj?.is24hExpired === true || 
                            (sessionStatus.expired && !sessionStatus.neverMessaged);

                          const displayReason = isReal24hExpired
                            ? "24-Hour WhatsApp Session Window has expired"
                            : errorObj?.details || errorObj?.message || "Delivery Failed (Check recipient number or Meta API)";

                          const isRetrying = retryingMsgId === msg.id;

                          return (
                            <div 
                              className={`msg-status-banner ${isReal24hExpired ? "expired" : "failed"}`}
                              title={errorObj?.details || errorObj?.message || displayReason}
                            >
                              <span className="msg-status-banner-text">
                                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                                <span>{displayReason}</span>
                              </span>
                              
                              {isReal24hExpired ? (
                                <button
                                  type="button"
                                  onClick={() => setShowTemplatePicker(true)}
                                  className="msg-status-banner-btn expired"
                                >
                                  Send Template
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isRetrying}
                                  onClick={() => handleRetryMessage(msg)}
                                  className="msg-status-banner-btn failed"
                                >
                                  <RefreshCw size={11} className={isRetrying ? "animate-spin" : ""} />
                                  {isRetrying ? "Retrying..." : "Retry Send"}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        <div className="message-meta-line">
                          <span 
                            className="message-timestamp"
                            title={new Date(msg.sentAt).toLocaleString([], { dateStyle: "full", timeStyle: "medium" })}
                          >
                            {formatMessageBubbleTime(msg.sentAt)}
                          </span>
                          {isAgent && !msg.isInternalNote && (
                            <span className="msg-status-tick" style={{ display: "inline-flex", alignItems: "center" }}>
                              {msg.status?.toUpperCase() === "READ" ? (
                                <span title="Read" style={{ display: "inline-flex" }}><CheckCheck size={14} style={{ color: "#3b82f6", marginLeft: "4px" }} /></span>
                              ) : msg.status?.toUpperCase() === "DELIVERED" ? (
                                <span title="Delivered" style={{ display: "inline-flex" }}><CheckCheck size={14} style={{ color: "#94a3b8", marginLeft: "4px" }} /></span>
                              ) : msg.status?.toUpperCase() === "FAILED" ? (
                                <span style={{ color: "#ef4444", display: "inline-flex", marginLeft: "4px" }} title="Failed to send"><AlertCircle size={13} /></span>
                              ) : (
                                <span title="Sent" style={{ display: "inline-flex" }}><Check size={14} style={{ color: "#94a3b8", marginLeft: "4px" }} /></span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );

              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input & Action Bar */}
            <div className="chat-input-wrapper">
              {/* Quick Action Shortcut Buttons */}
              <div className="chat-quick-actions-bar">
                <button
                  ref={quickRepliesBtnRef}
                  type="button"
                  className={`quick-chip highlight ${showCannedResponses ? "active" : ""}`}
                  onClick={() => {
                    setShowCannedResponses(prev => !prev);
                    if (!showCannedResponses) {
                      setCannedPopupSearch("");
                      setCannedPopupHighlight(0);
                    }
                  }}
                  title="Toggle Quick Replies & Slash Commands (/)"
                >
                  <Zap size={13} className="text-amber-500 fill-amber-500" />
                  <span>Quick Replies</span>
                  <span style={{ fontSize: "10.5px", opacity: 0.75, fontFamily: "monospace", marginLeft: "2px", fontWeight: 700 }}>/</span>
                </button>

                <button type="button" className="quick-chip" onClick={() => setShowReplyLibraryModal(true)} title="Manage Reply Library">
                  <MessageSquare size={12} /> Reply Library
                </button>
                <button type="button" className="quick-chip ai-suggest" onClick={handleSuggestReply} disabled={aiSuggesting}>
                  <Sparkles size={12} /> {aiSuggesting ? "Generating..." : "Suggest Reply AI"}
                </button>
                <button
                  type="button"
                  className={`quick-chip internal-toggle ${isInternalNote ? "active" : ""}`}
                  onClick={() => setIsInternalNote(!isInternalNote)}
                >
                  <LockIcon size={12} /> {isInternalNote ? "Internal Note ON" : "Internal Note"}
                </button>
              </div>

              {/* Hidden Direct File Upload Input */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleDirectFileUpload}
              />

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="emoji-picker-popup">
                  {EMOJI_LIST.map((emoji) => (
                    <span
                      key={emoji}
                      onClick={() => handleInsertEmoji(emoji)}
                      className="emoji-picker-item"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Canned Responses / Slash Commands Floating Popup Menu */}
              {showCannedResponses && (
                <div className="canned-responses-popup" ref={cannedPopupRef}>
                  <div className="canned-responses-header">
                    <div className="canned-header-title">
                      <Zap size={14} className="text-amber-500 fill-amber-500" />
                      <span>Quick Replies ({filteredCanned.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowCannedResponses(false); setCannedPopupSearch(""); }}
                      className="popup-close-btn"
                      title="Close (Esc)"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {/* Search filter input inside popup */}
                  <div className="canned-popup-search-wrap">
                    <Search size={13} className="canned-search-icon" />
                    <input
                      ref={cannedPopupSearchRef}
                      type="text"
                      className="canned-popup-search"
                      placeholder="Search replies or type /shortcut..."
                      value={cannedPopupSearch}
                      onChange={e => {
                        setCannedPopupSearch(e.target.value);
                        setCannedPopupHighlight(0);
                      }}
                      onKeyDown={e => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setCannedPopupHighlight(h => Math.min(h + 1, filteredCanned.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setCannedPopupHighlight(h => Math.max(h - 1, 0));
                        } else if ((e.key === "Enter" || e.key === "Tab") && filteredCanned.length > 0) {
                          e.preventDefault();
                          const selected = filteredCanned[safeHighlight];
                          if (selected) insertCannedResponse(selected);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setShowCannedResponses(false);
                          setCannedPopupSearch("");
                          chatTextareaRef.current?.focus();
                        }
                      }}
                    />
                  </div>
                  <div className="canned-responses-list">
                    {filteredCanned.length > 0 ? (
                      filteredCanned.map((cr, idx) => {
                        const isRich = !!(cr.buttons || cr.mediaUrl || cr.headerText || cr.footerText);
                        const isSelected = idx === safeHighlight;
                        return (
                          <button
                            key={cr.id}
                            type="button"
                            onClick={() => insertCannedResponse(cr)}
                            className={`canned-response-item${isSelected ? " canned-response-item--active" : ""}`}
                            onMouseEnter={() => setCannedPopupHighlight(idx)}
                          >
                            <div className="canned-response-item-row">
                              <strong className="canned-response-title">{cr.title}</strong>
                              <span className="canned-response-meta">
                                {isRich && <span className="canned-rich-badge">⚡ Rich</span>}
                                {cr.shortcut && <span className="canned-response-shortcut">{cr.shortcut}</span>}
                              </span>
                            </div>
                            <span className="canned-response-snippet">{cr.content}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="canned-response-empty">
                        {cannedPopupSearch ? (
                          <>No replies match "<strong>{cannedPopupSearch}</strong>"</>
                        ) : (
                          <>No quick replies yet. Create one in the Reply Library.</>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="canned-popup-footer">
                    <button
                      type="button"
                      className="canned-popup-manage-btn"
                      onClick={() => {
                        setShowCannedResponses(false);
                        setShowReplyLibraryModal(true);
                        setIsManagingReplies(true);
                      }}
                    >
                      ＋ Manage Reply Library
                    </button>
                    {filteredCanned.length > 0 && (
                      <span className="canned-popup-hint">↑↓ navigate · Enter to select</span>
                    )}
                  </div>
                </div>
              )}

              {/* Text Area Form */}
              {isRecording ? (
                <div className="voice-recorder-bar">
                  <span className="record-dot-blink" />
                  <span className="voice-recorder-text">
                    Recording Voice Note... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="voice-recorder-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    className="voice-recorder-send-btn"
                  >
                    Send Voice Note
                  </button>
                </div>
              ) : (
                <>
                {sessionStatus.expired && !isInternalNote && (
                  <div className="session-expired-banner">
                    <div className="session-expired-content">
                      <Clock size={15} className="session-expired-icon" />
                      <span><strong>24h Window Closed</strong> · Pre-approved Meta templates required to start conversations after 24h.</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowTemplatePicker(true)} 
                      className="session-template-btn"
                    >
                      <Zap size={13} />
                      <span>Send Template</span>
                    </button>
                  </div>
                )}
                <form className={`chat-input-form ${isInternalNote ? "internal-mode" : ""}`} onSubmit={handleSendMessage}>
                  
                  <div className="composer-attachments-bar">
                    <button
                      type="button"
                      className="input-attachment-btn"
                      title="Attach File / Image / Document"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={18} />
                    </button>
                    
                    <button
                      type="button"
                      className="input-attachment-btn btn-record"
                      title="Record Voice Note"
                      onClick={startRecording}
                    >
                      <Mic size={18} />
                    </button>

                    {/* Template Picker Button */}
                    <button
                      type="button"
                      className={`input-attachment-btn ${showTemplatePicker ? "btn-active-template" : ""}`}
                      title="Send Template Message"
                      onClick={() => setShowTemplatePicker(true)}
                    >
                      <FileCode size={18} />
                    </button>

                    {/* Product Catalog Button */}
                    <button
                      type="button"
                      className={`input-attachment-btn ${showProductPanel ? "btn-active-product" : ""}`}
                      title="Send Product from Catalog"
                      onClick={() => setShowProductPanel(v => !v)}
                    >
                      <ShoppingBag size={18} />
                    </button>

                    {/* Flow Picker Button */}
                    <button
                      type="button"
                      className={`input-attachment-btn ${showFlowPicker ? "btn-active-flow" : ""}`}
                      title="Send Interactive Flow Form"
                      onClick={() => setShowFlowPicker(true)}
                    >
                      <Zap size={18} />
                    </button>

                    {/* Quick Replies Button */}
                    <button
                      ref={quickRepliesBarBtnRef}
                      type="button"
                      className={`input-attachment-btn ${showCannedResponses ? "btn-active-quick" : ""}`}
                      title="Quick Replies & Slash Commands (/)"
                      onClick={() => {
                        setShowCannedResponses(prev => !prev);
                        if (!showCannedResponses) {
                          setCannedPopupSearch("");
                          setCannedPopupHighlight(0);
                        }
                      }}
                    >
                      <Zap size={18} className={showCannedResponses ? "text-amber-500 fill-amber-500" : ""} />
                    </button>

                    <button
                      type="button"
                      className={`input-attachment-btn ${showEmojiPicker ? "btn-active-emoji" : ""}`}
                      title="Quick Emojis"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={18} />
                    </button>
                  </div>

                {/* Team Mentions Popup Menu */}
                {showMentionsMenu && (
                  <div className="mentions-popup-menu">
                    <div className="mentions-popup-header">
                      Mention Teammate
                    </div>
                    <div className="mentions-popup-list">
                      {employeesList.filter(emp => emp.firstName?.toLowerCase().includes(mentionSearch) || emp.name?.toLowerCase().includes(mentionSearch)).length > 0 ? (
                        employeesList.filter(emp => emp.firstName?.toLowerCase().includes(mentionSearch) || emp.name?.toLowerCase().includes(mentionSearch)).map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              const lastAtSymbol = messageInput.lastIndexOf("@");
                              const newText = messageInput.slice(0, lastAtSymbol) + `@${emp.firstName || emp.name} `;
                              setMessageInput(newText);
                              setShowMentionsMenu(false);
                            }}
                            className="mention-item-btn"
                          >
                            <User size={14} color="#3b82f6" />
                            <strong className="mention-item-name">{emp.firstName || emp.name}</strong>
                          </button>
                        ))
                      ) : (
                        <div className="mention-empty">No team members found.</div>
                      )}
                    </div>
                  </div>
                )}

                <textarea
                  ref={chatTextareaRef}
                  rows={2}
                  className="chat-textarea"
                  disabled={sessionStatus.expired && !isInternalNote}
                  placeholder={
                    isInternalNote
                      ? "Add an internal note visible only to your team..."
                      : sessionStatus.expired
                        ? "24-Hour session window expired. Send a pre-approved template or Flow above to resume..."
                        : "Type a WhatsApp message or use shortcuts like /return, /shipping, /discount..."
                  }
                  value={messageInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMessageInput(val);
                    
                    // Mention Autocomplete logic
                    if (isInternalNote) {
                      const lastAtSymbol = val.lastIndexOf("@");
                      if (lastAtSymbol !== -1 && (lastAtSymbol === 0 || val[lastAtSymbol - 1] === " ")) {
                        const searchText = val.slice(lastAtSymbol + 1);
                        if (!searchText.includes(" ")) {
                          setShowMentionsMenu(true);
                          setMentionSearch(searchText.toLowerCase());
                        } else {
                          setShowMentionsMenu(false);
                        }
                      } else {
                        setShowMentionsMenu(false);
                      }
                    } else {
                      setShowMentionsMenu(false);

                      // Quick Replies Slash Command Trigger (e.g. "/" or "/return")
                      const lastSlash = val.lastIndexOf("/");
                      if (lastSlash !== -1 && (lastSlash === 0 || val[lastSlash - 1] === " " || val[lastSlash - 1] === "\n")) {
                        const query = val.slice(lastSlash + 1);
                        if (!query.includes(" ")) {
                          setShowCannedResponses(true);
                          setCannedPopupSearch(query);
                          setCannedPopupHighlight(0);
                        } else {
                          setShowCannedResponses(false);
                        }
                      } else {
                        // If user erased the slash, close popup
                        if (showCannedResponses && (!cannedPopupSearch || !val.includes("/"))) {
                          setShowCannedResponses(false);
                        }
                      }
                    }

                    // Check if they typed a shortcut followed by space (e.g. "/return ")
                    const match = cannedResponses.find(cr => cr.shortcut && val.endsWith(cr.shortcut + " "));
                    if (match) {
                      const idx = val.lastIndexOf(match.shortcut + " ");
                      if (idx !== -1) {
                        const replaced = val.slice(0, idx) + match.content + " ";
                        setMessageInput(replaced);
                        setShowCannedResponses(false);
                        setCannedPopupSearch("");
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (showCannedResponses && filteredCanned.length > 0) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setCannedPopupHighlight(h => Math.min(h + 1, filteredCanned.length - 1));
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setCannedPopupHighlight(h => Math.max(h - 1, 0));
                        return;
                      }
                      if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
                        e.preventDefault();
                        const selected = filteredCanned[safeHighlight];
                        if (selected) {
                          insertCannedResponse(selected);
                        }
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShowCannedResponses(false);
                        setCannedPopupSearch("");
                        return;
                      }
                    }

                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />

                <button type="submit" className="send-msg-btn" disabled={sendingMsg || (!messageInput.trim() && !isInternalNote) || (sessionStatus.expired && !isInternalNote)}>
                  {sendingMsg ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
                  <span>{isInternalNote ? "Save Note" : "Send"}</span>
                </button>
              </form>
              </>)}
            </div>
          </>
        )}
      </div>

      {/* Product Catalog Panel */}
      {showProductPanel && activeConvDetail && (
        <ProductCatalogPanel
          onClose={() => setShowProductPanel(false)}
          recipientName={activeConvDetail.contactName || activeConvDetail.customerPhone}
          onSendProduct={async (product) => {
            const phone = (activeConvDetail.customer?.whatsappNumber || activeConvDetail.customer?.mobile || "").replace(/\D/g,"");
            const res = await sendProductCardAction(phone, product, selectedConvId || undefined);
            if (res.success) { 
              setToastMsg("Product card sent successfully!");
              setTimeout(() => setToastMsg(null), 3000);
              await fetchConversationDetail(selectedConvId!, true); 
            } else { 
              setToastMsg("Product send failed: " + (res.error||"")); 
              setTimeout(() => setToastMsg(null), 4000); 
            }
          }}
        />
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onClose={() => setShowTemplatePicker(false)}
          activeConvDetail={activeConvDetail}
          onSendTemplate={async (templateName, language, components) => {
            const phone = (activeConvDetail?.customer?.whatsappNumber || activeConvDetail?.customer?.mobile || "").replace(/\D/g,"");
            if (!phone) return;
            const res = await sendWhatsAppTemplateAction(phone, templateName, language, components, selectedConvId || undefined);
            if (res.success) { 
              setToastMsg("Template sent successfully!");
              setTimeout(() => setToastMsg(null), 3000);
              await fetchConversationDetail(selectedConvId!, true); 
            } else { 
              setToastMsg("Template failed: " + (res.error||"")); 
              setTimeout(() => setToastMsg(null), 4000); 
            }
          }}
        />
      )}

      {/* Flow Picker Modal */}
      {showFlowPicker && (
        <FlowPickerModal
          onClose={() => setShowFlowPicker(false)}
          onSendFlow={async (flowId) => {
            const phone = (activeConvDetail?.customer?.whatsappNumber || activeConvDetail?.customer?.mobile || "").replace(/\D/g,"");
            if (!phone) return;
            const res = await sendWhatsAppFlowMessageAction(phone, flowId, selectedConvId || undefined);
            if (res.success) { 
              setToastMsg("Flow form sent successfully!");
              setTimeout(() => setToastMsg(null), 3000);
              await fetchConversationDetail(selectedConvId!, true); 
            } else { 
              setToastMsg("Flow send failed: " + (res.error||"")); 
              setTimeout(() => setToastMsg(null), 4000); 
            }
          }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* RIGHT COLUMN: CRM 360° CUSTOMER PROFILE PANEL */}
      {/* ----------------------------------------------------------------- */}
      <div className={`inbox-right-panel ${isRightCollapsed ? "collapsed" : ""}`}>
        {!isRightCollapsed && activeConvDetail && (
          <div className="crm-panel-container">
            {/* Panel Header */}
            <div className="crm-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3>CRM 360° Profile</h3>
              </div>
              <div className="crm-header-btns" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isEditingCRM ? (
                  <button className="crm-save-btn" onClick={handleSaveCRMProfile}>
                    <Check size={14} /> Save
                  </button>
                ) : (
                  <button className="crm-edit-btn" onClick={() => setIsEditingCRM(true)}>
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                <button 
                  className="panel-toggle-btn"
                  onClick={() => setIsRightCollapsed(true)} 
                  title="Close Profile Panel"
                  style={{ color: "#64748b", padding: "4px" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Profile Overview Card */}
            <div className="crm-profile-card">
              <div className="crm-card-avatar">
                <span>{(activeConvDetail.customer?.contactPerson || "C").slice(0, 2).toUpperCase()}</span>
              </div>

              {isEditingCRM ? (
                <div className="crm-edit-form">
                  <label>Business Name</label>
                  <input
                    type="text"
                    value={crmEditData.businessName}
                    onChange={(e) => setCrmEditData({ ...crmEditData, businessName: e.target.value })}
                  />

                  <label>Contact Person</label>
                  <input
                    type="text"
                    value={crmEditData.contactPerson}
                    onChange={(e) => setCrmEditData({ ...crmEditData, contactPerson: e.target.value })}
                  />

                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={crmEditData.mobile}
                    onChange={(e) => setCrmEditData({ ...crmEditData, mobile: e.target.value })}
                  />

                  <label>Customer Type</label>
                  <select
                    value={crmEditData.customerType}
                    onChange={(e) => setCrmEditData({ ...crmEditData, customerType: e.target.value })}
                  >
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Distributor">Distributor</option>
                  </select>

                  <label>Pipeline Stage</label>
                  <select
                    value={crmEditData.leadStage}
                    onChange={(e) => setCrmEditData({ ...crmEditData, leadStage: e.target.value })}
                  >
                    <option value="New Lead">New Lead</option>
                    <option value="Quotation Shared">Quotation Shared</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Order Confirmed">Order Confirmed</option>
                    <option value="Won">Won</option>
                  </select>
                </div>
              ) : (
                <>
                  <h4 className="crm-business-title">
                    {activeConvDetail.customer?.businessName || "Unnamed Customer"}
                  </h4>
                  <p className="crm-contact-name">{activeConvDetail.customer?.contactPerson}</p>

                  <div className="crm-badges-row">
                    <span className="crm-type-badge">{activeConvDetail.customerType || "Wholesaler"}</span>
                    <span className="crm-stage-badge">{activeConvDetail.leadStatus || activeConvDetail.customer?.leadStage || "New Lead"}</span>
                    <span className={`crm-status-sync-badge ${isLeadPushed ? "synced" : "pending"}`}>
                      {isLeadPushed ? "✓ CRM Synced" : "CRM: Pending"}
                    </span>
                  </div>

                  {activeConvDetail.customer?.id && (
                    <div style={{ marginTop: "10px", textAlign: "center" }}>
                      <Link
                        href={`/customers/${activeConvDetail.customer.id}`}
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#10b981",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        View Full CRM Profile <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Financial Metrics Cards */}
            <div className="crm-metrics-grid">
              <div className="crm-metric-box">
                <span className="metric-label">Total Purchases</span>
                <span className="metric-value">
                  ₹{(activeConvDetail.customer?.totalPurchaseValue || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="crm-metric-box">
                <span className="metric-label">Total Orders</span>
                <span className="metric-value">{activeConvDetail.customer?.totalOrders || 0} Orders</span>
              </div>
            </div>

            {/* Live Store Browsing & Active Activity Card in CRM Panel */}
            {latestWebsiteContext && (
              <div className="crm-section-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px" }}>
                <h5 className="crm-section-title" style={{ color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🌐</span> Website Activity & Intent
                  </span>
                  <span style={{ fontSize: "10px", background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "6px", fontWeight: 700 }}>
                    {latestWebsiteContext.categoryInsights?.category || latestWebsiteContext.platform || "Storefront"}
                  </span>
                </h5>
                <div style={{ fontSize: "11.5px", color: "#1e293b" }}>
                  <div style={{ fontWeight: 600, color: "#64748b" }}>Active Webpage:</div>
                  <div style={{ fontWeight: 700, marginTop: "2px", lineHeight: "1.3" }}>{latestWebsiteContext.pageTitle || "Online Store"}</div>
                  {latestWebsiteContext.pageUrl && (
                    <a
                      href={latestWebsiteContext.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "11px", color: "#4f46e5", textDecoration: "underline", display: "inline-block", marginTop: "4px" }}
                    >
                      Open Live Page ↗
                    </a>
                  )}
                </div>

                {/* Education Intent in CRM Panel */}
                {latestWebsiteContext.categoryInsights && latestWebsiteContext.categoryInsights.category === "EDUCATION" && (
                  <div style={{ marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {latestWebsiteContext.categoryInsights.courses?.length > 0 && (
                      <div style={{ fontSize: "11px" }}>
                        <span style={{ fontWeight: 600, color: "#4338ca" }}>Courses: </span>
                        <span style={{ color: "#334155" }}>{latestWebsiteContext.categoryInsights.courses.join(", ")}</span>
                      </div>
                    )}
                    {latestWebsiteContext.categoryInsights.universities?.length > 0 && (
                      <div style={{ fontSize: "11px" }}>
                        <span style={{ fontWeight: 600, color: "#4338ca" }}>Target: </span>
                        <span style={{ color: "#334155" }}>{latestWebsiteContext.categoryInsights.universities.join(", ")}</span>
                      </div>
                    )}
                    {latestWebsiteContext.categoryInsights.destinations?.length > 0 && (
                      <div style={{ fontSize: "11px" }}>
                        <span style={{ fontWeight: 600, color: "#4338ca" }}>Countries: </span>
                        <span style={{ color: "#334155" }}>{latestWebsiteContext.categoryInsights.destinations.join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Searches in CRM Panel */}
                {latestWebsiteContext.searches && latestWebsiteContext.searches.length > 0 && (
                  <div style={{ marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#475569", marginBottom: "3px" }}>
                      🔍 Searched on Website:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {latestWebsiteContext.searches.map((sq: string, sqi: number) => (
                        <span key={sqi} style={{ fontSize: "10px", background: "white", padding: "2px 6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                          "{sq}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Browsing Trail in CRM Panel */}
                {latestWebsiteContext.pageJourney && latestWebsiteContext.pageJourney.length > 0 && (
                  <div style={{ marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setExpandedCrmJourney(!expandedCrmJourney)}
                      style={{ background: "none", border: "none", padding: 0, fontSize: "11px", fontWeight: 700, color: "#4f46e5", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <span>🧭 Browsing Trail ({latestWebsiteContext.pageJourney.length} pages)</span>
                      <span>{expandedCrmJourney ? "▲" : "▼"}</span>
                    </button>
                    {expandedCrmJourney ? (
                      <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {latestWebsiteContext.pageJourney.map((step: any, sIdx: number) => (
                          <div key={sIdx} style={{ fontSize: "10.5px", color: "#334155", background: "white", padding: "4px 6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontWeight: 700, color: "#64748b" }}>{sIdx + 1}. </span>
                            <span style={{ fontWeight: 600 }}>{step.title || step.path}</span>
                            {step.dwellSec > 0 && <span style={{ color: "#94a3b8" }}> ({step.dwellSec}s)</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {latestWebsiteContext.pageJourney.map((p: any) => p.path).slice(-2).join(" ➔ ")}
                      </div>
                    )}
                  </div>
                )}

                {latestWebsiteContext.cart && (latestWebsiteContext.cart.items?.length > 0 || latestWebsiteContext.cart.item_count > 0) && (
                  <div style={{ marginTop: "10px", borderTop: "1px solid #bbf7d0", paddingTop: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 700, color: "#065f46" }}>
                      <span>🛒 Active Cart:</span>
                      <span>
                        {latestWebsiteContext.cart.item_count || latestWebsiteContext.cart.items?.length} items
                        {latestWebsiteContext.cart.total_price ? ` (₹${latestWebsiteContext.cart.total_price})` : ""}
                      </span>
                    </div>
                    {latestWebsiteContext.cart.items && latestWebsiteContext.cart.items.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                        {latestWebsiteContext.cart.items.slice(0, 3).map((it: any, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#334155", background: "white", padding: "4px 6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                              {it.quantity}x {it.title}
                            </span>
                            {it.price && <span style={{ fontWeight: 600, color: "#047857" }}>₹{it.price}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Quick Actions Panel */}
            <div className="crm-section-box">
              <h5 className="crm-section-title">Quick Actions</h5>
              <div className="crm-quick-btns">
                <button
                  className={`crm-action-tile ${isLeadPushed ? "synced" : ""}`}
                  disabled={pushingToCrm}
                  onClick={() => handlePushToCrm()}
                  title="Push lead directly to Espon CRM & ERP webhook"
                >
                  <Activity size={14} className={pushingToCrm ? "spin-pulse" : ""} color="#2563eb" />
                  <span>{pushingToCrm ? "Pushing to CRM..." : isLeadPushed ? "Re-sync to CRM & ERP" : "Push Lead to CRM & ERP"}</span>
                </button>

                {paymentConfigured && (
                  <button className="crm-action-tile" onClick={() => setShowPaymentModal(true)}>
                    <CreditCard size={14} color="#d97706" /> Send Payment Link
                  </button>
                )}
              </div>
            </div>

            {/* CRM Contact Information */}
            <div className="crm-section-box">
              <h5 className="crm-section-title">Contact Information</h5>
              <div className="crm-info-list">
                <div className="info-item">
                  <Phone size={14} />
                  <span>{formatWhatsAppPhone(activeConvDetail.customer?.whatsappNumber || activeConvDetail.customer?.mobile)}</span>
                </div>
                <div className="info-item">
                  <Mail size={14} />
                  <span>{(activeConvDetail.customer as any)?.email || "No email added"}</span>
                </div>
                <div className="info-item">
                  <MapPin size={14} />
                  <span>
                    {(activeConvDetail.customer as any)?.city || "Surat"},{" "}
                    {(activeConvDetail.customer as any)?.state || "Gujarat"}
                  </span>
                </div>
                <div className="info-item">
                  <UserCheck size={14} />
                  <span>Assigned Rep: {activeConvDetail.assignedEmployee?.user?.name || "Ikra (Sales)"}</span>
                </div>
              </div>
            </div>

            {/* Orders & Quotes History */}
            <div className="crm-section-box">
              <h5 className="crm-section-title">Recent Quotations</h5>
              {activeConvDetail.customer?.quotations?.length === 0 ? (
                <p className="no-records-text">No quotations created yet</p>
              ) : (
                <div className="records-mini-list">
                  {activeConvDetail.customer?.quotations?.map((q: any) => (
                    <div key={q.id} className="record-mini-card">
                      <div>
                        <span className="record-title">{q.quotationNumber}</span>
                        <span className="record-date">{new Date(q.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="record-amount">₹{(q.totalValue || 0).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="crm-section-box">
              <h5 className="crm-section-title">WhatsApp & CRM Timeline</h5>
              <div className="timeline-list">
                {activeConvDetail.messages && activeConvDetail.messages.length > 0 ? (
                  <div className="timeline-item">
                    <div className="timeline-dot green" />
                    <div className="timeline-content">
                      <span className="timeline-time" title={new Date(activeConvDetail.messages[activeConvDetail.messages.length - 1].sentAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}>
                        {formatMessageBubbleTime(activeConvDetail.messages[activeConvDetail.messages.length - 1].sentAt)}
                      </span>
                      <p className="timeline-text">Last interaction with customer</p>
                    </div>
                  </div>
                ) : (
                  <p className="no-records-text" style={{ paddingLeft: '20px' }}>No recent activity</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODALS 1, 2, 3, 4 */}
      {/* ----------------------------------------------------------------- */}
      {showReplyLibraryModal && (
        <div className="inbox-modal-backdrop" onClick={() => { setShowReplyLibraryModal(false); setIsManagingReplies(false); handleCancelEdit(); }}>
          <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: "650px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-header-row" style={{ paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                {isManagingReplies ? (
                  <>
                    <Settings size={16} /> Manage Quick Replies
                  </>
                ) : (
                  <>
                    <BookOpen size={16} /> WhatsApp Reply Library & Shortcuts
                  </>
                )}
              </h3>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsManagingReplies(!isManagingReplies);
                    handleCancelEdit();
                  }}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  {isManagingReplies ? (
                    <>
                      <ArrowLeft size={13} /> Back to List
                    </>
                  ) : (
                    <>
                      <Settings size={13} /> Manage Replies
                    </>
                  )}
                </button>
                <button onClick={() => { setShowReplyLibraryModal(false); setIsManagingReplies(false); handleCancelEdit(); }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}>×</button>
              </div>
            </div>

            <div style={{ padding: "16px 0", flex: 1, overflowY: "auto" }}>
              {!isManagingReplies ? (
                <>
                  <input
                    type="text"
                    placeholder="Search canned replies (by title, shortcut, or content)..."
                    value={replySearchTerm}
                    onChange={(e) => setReplySearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", marginBottom: "14px" }}
                  />

                  <div className="reply-shortcuts-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {cannedResponses
                      .filter(r => 
                        r.title.toLowerCase().includes(replySearchTerm.toLowerCase()) ||
                        (r.shortcut || "").toLowerCase().includes(replySearchTerm.toLowerCase()) ||
                        r.content.toLowerCase().includes(replySearchTerm.toLowerCase())
                      )
                      .map((r) => (
                        <div
                          key={r.id}
                          className="shortcut-item-card"
                          onClick={() => {
                            applyQuickShortcut(r);
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            padding: "12px 16px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            background: "#ffffff"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#cbd5e1";
                            e.currentTarget.style.background = "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.background = "#ffffff";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>{r.title}</span>
                            <span className="shortcut-badge" style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                              {r.shortcut}
                            </span>
                          </div>
                          <p style={{ fontSize: "12.5px", color: "#475569", margin: 0, lineHeight: 1.4 }}>{r.content}</p>
                        </div>
                      ))}

                    {cannedResponses.filter(r => 
                      r.title.toLowerCase().includes(replySearchTerm.toLowerCase()) ||
                      (r.shortcut || "").toLowerCase().includes(replySearchTerm.toLowerCase()) ||
                      r.content.toLowerCase().includes(replySearchTerm.toLowerCase())
                    ).length === 0 && (
                      <p style={{ textAlign: "center", fontSize: "13px", color: "#64748b", padding: "20px" }}>No canned replies found.</p>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Create / Edit Form */}
                  <form onSubmit={handleCreateOrUpdateCannedResponse} style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "#334155", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                      {editingReply ? (
                        <>
                          <Edit3 size={14} /> Edit Canned Response
                        </>
                      ) : (
                        <>
                          <PlusCircle size={14} /> Create New Canned Response
                        </>
                      )}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TITLE</label>
                        <input
                          type="text"
                          placeholder="e.g. Greeting"
                          value={newReplyTitle}
                          onChange={(e) => setNewReplyTitle(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>SHORTCUT CODE</label>
                        <input
                          type="text"
                          placeholder="e.g. /hi"
                          value={newReplyShortcut}
                          onChange={(e) => setNewReplyShortcut(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>REPLY BODY CONTENT</label>
                      <textarea
                        rows={3}
                        placeholder="Type the message to send when shortcut is typed..."
                        value={newReplyContent}
                        onChange={(e) => setNewReplyContent(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", resize: "vertical" }}
                        required
                      />
                    </div>
                    <div style={{ display: "flex", justifySelf: "end", gap: "8px", marginTop: "4px" }}>
                      {editingReply && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          style={{ background: "#e2e8f0", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={savingCanned}
                        style={{ background: "#4f46e5", border: "none", borderRadius: "6px", padding: "8px 20px", fontSize: "12px", fontWeight: 700, color: "#ffffff", cursor: "pointer" }}
                      >
                        {savingCanned ? "Saving..." : editingReply ? "Save Changes" : "Create Reply"}
                      </button>
                    </div>
                  </form>

                  {/* List with Controls */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", margin: "10px 0 4px 0" }}>Canned Responses List ({cannedResponses.length})</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                      {cannedResponses.map((cr) => (
                        <div
                          key={cr.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            padding: "10px 14px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            background: "#ffffff"
                          }}
                        >
                          <div style={{ flex: 1, paddingRight: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{cr.title}</strong>
                              <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>
                                {cr.shortcut}
                              </span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0", lineBreak: "anywhere" }}>{cr.content}</p>
                          </div>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => handleEditClick(cr)}
                              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCannedResponse(cr.id)}
                              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}

                      {cannedResponses.length === 0 && (
                        <p style={{ textAlign: "center", fontSize: "12.5px", color: "#64748b", padding: "10px" }}>No canned replies created yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showQuoteModal && (
        <div className="inbox-modal-backdrop" onClick={() => setShowQuoteModal(false)}>
          <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Create & Send WhatsApp Quotation</h3>
              <button onClick={() => setShowQuoteModal(false)}>×</button>
            </div>
            <div className="modal-form-body">
              {quoteItems.map((item, idx) => (
                <div key={idx} className="item-row-edit">
                  <input
                    type="text"
                    value={item.name}
                    placeholder="Product Item Name"
                    onChange={(e) => {
                      const updated = [...quoteItems];
                      updated[idx].name = e.target.value;
                      setQuoteItems(updated);
                    }}
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    placeholder="Qty"
                    onChange={(e) => {
                      const updated = [...quoteItems];
                      updated[idx].quantity = parseInt(e.target.value) || 0;
                      setQuoteItems(updated);
                    }}
                  />
                  <input
                    type="number"
                    value={item.rate}
                    placeholder="Rate"
                    onChange={(e) => {
                      const updated = [...quoteItems];
                      updated[idx].rate = parseFloat(e.target.value) || 0;
                      setQuoteItems(updated);
                    }}
                  />
                </div>
              ))}
              <div className="modal-total-summary">
                <span>Total Quotation Value (incl 12% GST):</span>
                <strong>
                  ₹
                  {quoteItems
                    .reduce((s, i) => s + i.quantity * i.rate * 1.12, 0)
                    .toLocaleString("en-IN")}
                </strong>
              </div>
              <button className="modal-submit-btn" onClick={handleCreateQuoteSubmit}>
                Generate & Send PDF Quotation in Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="inbox-modal-backdrop" onClick={() => setShowPaymentModal(false)} style={{ backdropFilter: "blur(4px)", background: "rgba(15,23,42,0.4)" }}>
          <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", padding: 0, borderRadius: "16px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div className="modal-header-row" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)", color: "white", padding: "20px 24px", borderBottom: "none" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <CreditCard size={20} /> Generate Payment Link
              </h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ color: "white", opacity: 0.8 }}>×</button>
            </div>
            <div className="modal-form-body" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", background: "#fff" }}>
              
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 600, fontSize: "15px" }}>₹</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    style={{ width: "100%", padding: "12px 14px 12px 32px", fontSize: "16px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontWeight: 600, color: "#1e293b", transition: "all 0.2s" }}
                    onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
                    onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Payment Description</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", fontSize: "14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", color: "#334155", transition: "all 0.2s" }}
                  onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Delivery Method</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "10px", border: paymentDeliveryMethod === 'both' ? "2px solid #4f46e5" : "1px solid #e2e8f0", background: paymentDeliveryMethod === 'both' ? "#eff6ff" : "#fff", cursor: "pointer", transition: "all 0.2s" }}>
                    <input type="radio" name="deliveryMethod" value="both" checked={paymentDeliveryMethod === 'both'} onChange={() => setPaymentDeliveryMethod('both')} style={{ accentColor: "#4f46e5", marginTop: "4px", transform: "scale(1.2)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <strong style={{ fontSize: "14px", color: paymentDeliveryMethod === 'both' ? "#1e40af" : "#334155" }}>Both Options</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Send a scannable QR Image and an interactive "Pay Now" button link.</span>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "10px", border: paymentDeliveryMethod === 'link' ? "2px solid #4f46e5" : "1px solid #e2e8f0", background: paymentDeliveryMethod === 'link' ? "#eff6ff" : "#fff", cursor: "pointer", transition: "all 0.2s" }}>
                    <input type="radio" name="deliveryMethod" value="link" checked={paymentDeliveryMethod === 'link'} onChange={() => setPaymentDeliveryMethod('link')} style={{ accentColor: "#4f46e5", marginTop: "4px", transform: "scale(1.2)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <strong style={{ fontSize: "14px", color: paymentDeliveryMethod === 'link' ? "#1e40af" : "#334155" }}>Link Button Only</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Send only the interactive WhatsApp CTA button for seamless checkout.</span>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "10px", border: paymentDeliveryMethod === 'qr' ? "2px solid #4f46e5" : "1px solid #e2e8f0", background: paymentDeliveryMethod === 'qr' ? "#eff6ff" : "#fff", cursor: "pointer", transition: "all 0.2s" }}>
                    <input type="radio" name="deliveryMethod" value="qr" checked={paymentDeliveryMethod === 'qr'} onChange={() => setPaymentDeliveryMethod('qr')} style={{ accentColor: "#4f46e5", marginTop: "4px", transform: "scale(1.2)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <strong style={{ fontSize: "14px", color: paymentDeliveryMethod === 'qr' ? "#1e40af" : "#334155" }}>QR Code Only</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Send only the generated UPI QR image with scan instructions.</span>
                    </div>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleSendPaymentSubmit}
                disabled={sendingPayment || paymentAmount <= 0}
                style={{
                  marginTop: "8px",
                  padding: "14px",
                  background: sendingPayment ? "#94a3b8" : "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: sendingPayment ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)",
                  opacity: sendingPayment ? 0.85 : 1,
                  transition: "all 0.2s"
                }}
              >
                {sendingPayment ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Sending Payment Request...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Request in Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagsModal && (
        <div className="inbox-modal-backdrop" onClick={() => setShowTagsModal(false)}>
          <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Manage Conversation Tags</h3>
              <button onClick={() => setShowTagsModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-form-body">
              
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                  Current Tags
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                  {activeTagsList.map((t: string) => (
                    <span key={t} className="tag-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {t}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleToggleConversationTag(t)} />
                    </span>
                  ))}
                  {!activeTagsList.length && (
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>No tags assigned yet.</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "12px", marginTop: "24px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                  Available Tags
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {availableTags.filter(tag => {
                    const l = (tag.name || '').toLowerCase().trim();
                    return l !== 'whatsapp lead' && l !== 'auto created';
                  }).map((tag) => {
                    const isAssigned = activeTagsList.includes(tag.name);
                    return (
                      <div key={tag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>{tag.name}</span>
                        </div>
                        <button
                          onClick={() => handleToggleConversationTag(tag.name)}
                          style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: isAssigned ? '#fecaca' : '#dcfce7', color: isAssigned ? '#991b1b' : '#166534', fontWeight: 600 }}
                        >
                          {isAssigned ? "Remove" : "Assign"}
                        </button>
                      </div>
                    );
                  })}
                  {availableTags.length === 0 && <span style={{ fontSize: "12px", color: "#94a3b8" }}>No tags created in this workspace.</span>}
                </div>
              </div>

              {currentUserRole !== 'AGENT' && currentUserRole !== 'SALES' && (
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", display: 'block', marginBottom: '8px' }}>
                    Create New Tag (Admin)
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Tag Name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px' }}
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <button
                      onClick={handleCreateTag}
                      disabled={isCreatingTag || !newTagName.trim()}
                      style={{ padding: '0 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', opacity: (isCreatingTag || !newTagName.trim()) ? 0.6 : 1 }}
                    >
                      {isCreatingTag ? "Saving..." : "Create"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="inbox-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Assign WhatsApp Lead</h3>
              <button onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="modal-form-body">
              {activeConvDetail?.assignedEmployee && (
                <div style={{ marginBottom: "14px", padding: "10px 12px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#991b1b", fontWeight: 700, display: "block" }}>
                      Assigned to: {activeConvDetail.assignedEmployee.user?.name || "Agent"}
                    </span>
                    <span style={{ fontSize: "11px", color: "#b91c1c" }}>
                      Return this conversation to the Unassigned queue.
                    </span>
                  </div>
                  <button
                    disabled={assigningLead}
                    onClick={handleUnassignLead}
                    style={{
                      background: "#ef4444",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "5px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Unassign Chat
                  </button>
                </div>
              )}

              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                  Select Agent to Assign
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px", maxHeight: "250px", overflowY: "auto" }}>
                {employeesList.map((emp) => (
                  <div
                    key={emp.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      background: "#ffffff"
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "13px", color: "#111827", display: "block" }}>
                        {emp.user?.name || emp.employeeId}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>
                        Open Chats: {emp.assignedWhatsAppConversations?.length || 0}
                      </span>
                    </div>

                    <button
                      disabled={assigningLead || emp.id === activeConvDetail?.assignedEmployee?.id}
                      onClick={() => handleAssignLead(emp.id, "MANUAL")}
                      style={{
                        background: emp.id === activeConvDetail?.assignedEmployee?.id ? "#e5e7eb" : "#f3f4f6",
                        border: "1px solid #d1d5db",
                        color: emp.id === activeConvDetail?.assignedEmployee?.id ? "#9ca3af" : "#374151",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: emp.id === activeConvDetail?.assignedEmployee?.id ? "not-allowed" : "pointer"
                      }}
                    >
                      {emp.id === activeConvDetail?.assignedEmployee?.id ? "Assigned" : "Assign Rep"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFollowUpModal && (
        <div className="inbox-modal-backdrop" onClick={() => setShowFollowUpModal(false)} style={{ backdropFilter: "blur(4px)", background: "rgba(15,23,42,0.4)" }}>
          <div className="inbox-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px", padding: 0, borderRadius: "16px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div className="modal-header-row" style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)", color: "white", padding: "20px 24px", borderBottom: "none" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={20} /> Schedule Follow-Up
              </h3>
              <button onClick={() => setShowFollowUpModal(false)} style={{ color: "white", opacity: 0.8 }}>×</button>
            </div>
            <div className="modal-form-body" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", background: "#fff" }}>
              
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Follow-Up In (Days)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Days</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(parseInt(e.target.value) || 3)}
                    style={{ width: "100%", padding: "12px 50px 12px 14px", fontSize: "16px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontWeight: 600, color: "#1e293b", transition: "all 0.2s" }}
                    onFocus={(e) => e.target.style.borderColor = "#8b5cf6"}
                    onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Follow-Up Notes / Context</label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="E.g. Check if they liked the sample shirts..."
                  style={{ width: "100%", padding: "12px 14px", fontSize: "14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", color: "#334155", transition: "all 0.2s", resize: "none" }}
                  onFocus={(e) => e.target.style.borderColor = "#8b5cf6"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>

              <button 
                onClick={handleCreateFollowUpSubmit}
                style={{
                  marginTop: "8px",
                  padding: "14px",
                  background: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(139, 92, 246, 0.2), 0 2px 4px -1px rgba(139, 92, 246, 0.1)"
                }}
              >
                <Check size={16} /> Schedule Task
              </button>
            </div>
          </div>
        </div>
      )}
            {/* ================================================================= */}
      {/* DEDICATED WEBSITE TRACKING & LIVE ACTIVITY DRAWER */}
      {/* ================================================================= */}
      {showWebsiteTrackingDrawer && activeConvDetail && (
        <div 
          className="website-tracking-overlay"
          onClick={() => setShowWebsiteTrackingDrawer(false)}
        >
          <div 
            className="website-tracking-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="website-tracking-header">
              <div className="website-tracking-title-wrap">
                <div className="website-tracking-title">
                  <Globe size={18} color="#4f46e5" />
                  <h3>Website Tracking & Live Activity</h3>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{activeConvDetail.customer?.contactPerson || activeConvDetail.customer?.businessName || activeCustomerPhone || "Visitor"}</span>
                  {activeCustomerPhone && <span>• +{activeCustomerPhone}</span>}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {activeWebsiteTrackingData.presenceStatus === "ONLINE" ? (
                  <span className="tracking-live-pill live" title="Visitor is actively browsing your website right now">
                    <span className="live-dot" />
                    <span>Online Now</span>
                  </span>
                ) : activeWebsiteTrackingData.presenceStatus === "AWAY" ? (
                  <span className="tracking-live-pill away" title="Visitor has switched tabs or minimized browser">
                    <span className="away-dot" />
                    <span>Away (Tab Inactive)</span>
                  </span>
                ) : (
                  <span className="tracking-live-pill offline" title="Website closed or session ended">
                    <Clock size={11} />
                    <span>
                      {activeWebsiteTrackingData.lastActivityTime 
                        ? `Left ${new Date(activeWebsiteTrackingData.lastActivityTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : "Offline"}
                    </span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => fetchCustomerWebSessions(activeCustomerPhone)}
                  title="Refresh website tracking data"
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    borderRadius: "6px",
                    padding: "5px 7px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  <RefreshCw size={13} className={loadingWebSessions ? "spin-pulse" : ""} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowWebsiteTrackingDrawer(false)}
                  title="Close Drawer"
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#64748b",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="website-tracking-body">
              {/* Live Telemetry Notice */}
              {activeWebsiteTrackingData.isOnlineNow && (
                <div style={{
                  background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                  border: "1px solid #a7f3d0",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "11.5px",
                  color: "#065f46",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 1px 2px rgba(16, 185, 129, 0.05)"
                }}>
                  <span className="live-dot" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Live Activity Connected:</strong> Website actions update here automatically in real time without sending messages into WhatsApp.
                  </div>
                </div>
              )}

              {/* Live Screen & Visual Co-Browsing (Clarity Replay) */}
              <div className="tracking-section-card" style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "14px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.03)"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>
                    <Monitor size={16} color="#4f46e5" />
                    <span>Live Screen Co-Browsing</span>
                  </div>
                  <span style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: activeWebsiteTrackingData.presenceStatus === "ONLINE" ? "#dcfce7" : activeWebsiteTrackingData.presenceStatus === "AWAY" ? "#fef9c3" : "#f1f5f9",
                    color: activeWebsiteTrackingData.presenceStatus === "ONLINE" ? "#166534" : activeWebsiteTrackingData.presenceStatus === "AWAY" ? "#854d0e" : "#64748b",
                    border: `1px solid ${activeWebsiteTrackingData.presenceStatus === "ONLINE" ? "#bbf7d0" : activeWebsiteTrackingData.presenceStatus === "AWAY" ? "#fde047" : "#e2e8f0"}`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}>
                    {activeWebsiteTrackingData.presenceStatus === "ONLINE" ? (
                      <>
                        <span className="live-dot" style={{ width: 6, height: 6 }} />
                        <span>Live Sync</span>
                      </>
                    ) : activeWebsiteTrackingData.presenceStatus === "AWAY" ? (
                      <>
                        <span className="away-dot" style={{ width: 6, height: 6 }} />
                        <span>Tab Paused</span>
                      </>
                    ) : (
                      <>
                        <Clock size={10} />
                        <span>Session Ended</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Live Scroll Depth Meter */}
                <div style={{ marginBottom: "12px", background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: "6px" }}>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
                      <Eye size={13} color="#6366f1" />
                      <span>Live Screen Scroll Depth</span>
                    </span>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11.5px" }}>
                      {activeWebsiteTrackingData.scrollDepth !== null ? `${activeWebsiteTrackingData.scrollDepth}% of page` : "Top of Page (0%)"}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      width: `${activeWebsiteTrackingData.scrollDepth ?? 0}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #6366f1 0%, #10b981 100%)",
                      borderRadius: "4px",
                      transition: "width 0.35s ease"
                    }} />
                  </div>
                </div>

                {/* Viewport & Device + Last Interaction */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Device / Screen</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#1e293b", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {activeWebsiteTrackingData.viewport 
                        ? `${activeWebsiteTrackingData.viewport.device || 'Desktop'} (${activeWebsiteTrackingData.viewport.width}x${activeWebsiteTrackingData.viewport.height})`
                        : "Detecting..."}
                    </div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Last User Action</div>
                    <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#1e293b", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={activeWebsiteTrackingData.lastInteraction || "Browsing"}>
                      {activeWebsiteTrackingData.lastInteraction || "Viewing page"}
                    </div>
                  </div>
                </div>

                {/* Clarity Screen Recording Replay Action Button */}
                <a
                  href="https://clarity.microsoft.com/projects"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                    color: "#ffffff",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                    transition: "all 0.2s ease",
                    cursor: "pointer"
                  }}
                >
                  <Video size={14} color="#38bdf8" />
                  <span>Watch Video Screen Replay (Clarity)</span>
                  <ExternalLink size={12} color="#94a3b8" />
                </a>
              </div>

              {/* Active Webpage Card */}
              <div className="tracking-section-card highlight">
                <div className="tracking-card-header">
                  <h4>
                    <Globe size={14} color="#059669" />
                    <span>{activeWebsiteTrackingData.isOnlineNow ? "Current Active Page" : "Last Visited Page"}</span>
                  </h4>
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: "4px" }}>
                    {activeWebsiteTrackingData.platform || "Website"}
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  {activeWebsiteTrackingData.pageTitle || "Online Store"}
                </div>
                {activeWebsiteTrackingData.pageUrl ? (
                  <a
                    href={activeWebsiteTrackingData.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "11.5px",
                      color: "#2563eb",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      textDecoration: "none",
                      wordBreak: "break-all",
                    }}
                  >
                    <span>{activeWebsiteTrackingData.pageUrl}</span>
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Direct / Widget Interaction</span>
                )}
              </div>

              {/* Multi-Category Intent Card */}
              {activeWebsiteTrackingData.categoryInsights && (
                <div className={`tracking-section-card ${
                  activeWebsiteTrackingData.categoryInsights.category === "EDUCATION" ? "education" :
                  activeWebsiteTrackingData.categoryInsights.category === "REAL_ESTATE" ? "realestate" :
                  activeWebsiteTrackingData.categoryInsights.category === "HEALTHCARE" ? "healthcare" : ""
                }`}>
                  <div className="tracking-card-header">
                    <h4>
                      {activeWebsiteTrackingData.categoryInsights.category === "EDUCATION" && <span>🎓 Education & Study Abroad Intent</span>}
                      {activeWebsiteTrackingData.categoryInsights.category === "REAL_ESTATE" && <span>🏢 Real Estate Property Intent</span>}
                      {activeWebsiteTrackingData.categoryInsights.category === "HEALTHCARE" && <span>🩺 Medical & Specialty Intent</span>}
                      {activeWebsiteTrackingData.categoryInsights.category === "STOREFRONT" && <span>🛍️ Storefront Shopping Intent</span>}
                    </h4>
                    <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px" }}>
                      {activeWebsiteTrackingData.categoryInsights.category}
                    </span>
                  </div>

                  {/* Education Intent Details */}
                  {activeWebsiteTrackingData.categoryInsights.category === "EDUCATION" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                      {activeWebsiteTrackingData.categoryInsights.courses?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#4338ca", display: "block", marginBottom: "4px" }}>
                            Target Degrees & Courses:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.courses.map((c: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill">🎓 {c}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeWebsiteTrackingData.categoryInsights.universities?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#4338ca", display: "block", marginBottom: "4px" }}>
                            Universities Explored:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.universities.map((u: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#fdf4ff", color: "#86198f", borderColor: "#f0abfc" }}>
                                🏛️ {u}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeWebsiteTrackingData.categoryInsights.destinations?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#4338ca", display: "block", marginBottom: "4px" }}>
                            Study Destinations:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.destinations.map((d: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }}>
                                🌍 {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeWebsiteTrackingData.categoryInsights.testPreps?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#4338ca", display: "block", marginBottom: "4px" }}>
                            Exams & Test Preps:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.testPreps.map((tp: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" }}>
                                📝 {tp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Real Estate Intent Details */}
                  {activeWebsiteTrackingData.categoryInsights.category === "REAL_ESTATE" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                      {activeWebsiteTrackingData.categoryInsights.properties?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#c2410c", display: "block", marginBottom: "4px" }}>
                            Properties Viewed:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.properties.map((p: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#fff7ed", color: "#c2410c", borderColor: "#fed7aa" }}>
                                🏢 {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeWebsiteTrackingData.categoryInsights.locations?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#c2410c", display: "block", marginBottom: "4px" }}>
                            Preferred Locations:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.locations.map((loc: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>
                                📍 {loc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Healthcare Intent Details */}
                  {activeWebsiteTrackingData.categoryInsights.category === "HEALTHCARE" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                      {activeWebsiteTrackingData.categoryInsights.specialties?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#0369a1", display: "block", marginBottom: "4px" }}>
                            Medical Specialties:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.specialties.map((s: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#f0f9ff", color: "#0369a1", borderColor: "#bae6fd" }}>
                                🩺 {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeWebsiteTrackingData.categoryInsights.doctors?.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#0369a1", display: "block", marginBottom: "4px" }}>
                            Consulted Doctors:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {activeWebsiteTrackingData.categoryInsights.doctors.map((doc: string, idx: number) => (
                              <span key={idx} className="tracking-badge-pill" style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }}>
                                👨‍⚕️ {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cart Details if Present */}
              {activeWebsiteTrackingData.cart && (activeWebsiteTrackingData.cart.items?.length > 0 || activeWebsiteTrackingData.cart.item_count > 0) && (
                <div className="tracking-section-card" style={{ borderColor: "#fed7aa", background: "#fffaf5" }}>
                  <div className="tracking-card-header">
                    <h4>
                      <ShoppingBag size={14} color="#ea580c" />
                      <span>Active Shopping Cart</span>
                    </h4>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#ea580c" }}>
                      {activeWebsiteTrackingData.cart.item_count || activeWebsiteTrackingData.cart.items?.length} items
                      {activeWebsiteTrackingData.cart.total_price ? ` • ₹${activeWebsiteTrackingData.cart.total_price}` : ""}
                    </span>
                  </div>
                  {activeWebsiteTrackingData.cart.items && activeWebsiteTrackingData.cart.items.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {activeWebsiteTrackingData.cart.items.map((it: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", background: "white", padding: "6px 8px", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>{it.title || it.name}</span>
                          <span style={{ color: "#ea580c", fontWeight: 700 }}>
                            {it.quantity}x {it.price ? `₹${it.price}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Website Search Queries */}
              {activeWebsiteTrackingData.searches && activeWebsiteTrackingData.searches.length > 0 && (
                <div className="tracking-section-card">
                  <div className="tracking-card-header">
                    <h4>
                      <Search size={14} color="#6366f1" />
                      <span>On-Site Search Queries ({activeWebsiteTrackingData.searches.length})</span>
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {activeWebsiteTrackingData.searches.map((sq: string, sqi: number) => (
                      <span key={sqi} className="tracking-search-chip">
                        <Search size={10} color="#94a3b8" />
                        <span>"{sq}"</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-Step Chronological Journey Trail */}
              {activeWebsiteTrackingData.pageJourney && activeWebsiteTrackingData.pageJourney.length > 0 && (
                <div className="tracking-section-card">
                  <div className="tracking-card-header">
                    <h4>
                      <Compass size={14} color="#4f46e5" />
                      <span>Browsing Journey Trail ({activeWebsiteTrackingData.pageJourney.length} pages)</span>
                    </h4>
                  </div>
                  <div className="tracking-timeline">
                    {activeWebsiteTrackingData.pageJourney.map((step: any, sIdx: number) => {
                      const isLast = sIdx === activeWebsiteTrackingData.pageJourney.length - 1;
                      return (
                        <div key={sIdx} className="tracking-timeline-step">
                          <div className={`tracking-timeline-node ${isLast ? "active" : ""}`}>
                            {sIdx + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "12px" }}>
                              {step.title || step.path || "Page"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                                {step.path || "/"}
                              </span>
                              {step.dwellSeconds && (
                                <span className="tracking-dwell-badge">
                                  <Clock size={9} />
                                  <span>{step.dwellSeconds}s</span>
                                </span>
                              )}
                              {step.time && (
                                <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                                  {step.time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real-Time Live Activity Event Log */}
              {activeWebsiteTrackingData.liveEventLog && activeWebsiteTrackingData.liveEventLog.length > 0 && (
                <div className="tracking-section-card">
                  <div className="tracking-card-header">
                    <h4>
                      <Activity size={14} color="#10b981" />
                      <span>Live Event Log ({activeWebsiteTrackingData.liveEventLog.length})</span>
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {activeWebsiteTrackingData.liveEventLog.map((logItem: any, lIdx: number) => (
                      <div key={lIdx} style={{ fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                        <span style={{ color: "#334155" }}>
                          {logItem.eventType === "SEARCH" ? `🔍 Searched: "${logItem.searchQuery}"` : `📄 Viewed: ${logItem.pageTitle || logItem.pageUrl}`}
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {new Date(logItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!activeWebsiteTrackingData.hasAnyData && (
                <div style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                  margin: "auto 0"
                }}>
                  <Globe size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto", display: "block" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    No Website Activity Recorded Yet
                  </h4>
                  <p style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5", maxWidth: "340px", margin: "0 auto" }}>
                    When this customer visits your website with the WhatIn script installed, their visited pages, search queries, and intent will automatically stream here in real time without sending messages into WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LockIcon({ size }: { size: number }) {
  return <ShieldCheck size={size} color="#f59e0b" />;
}








