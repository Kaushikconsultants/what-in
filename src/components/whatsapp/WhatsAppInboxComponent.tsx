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
  CheckCircle
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
  retryFailedWhatsAppMessageAction
} from "@/app/actions/whatsAppPlatformActions";
import { getWhatsAppIntegrationsAction, pushLeadToIntegrationAction } from "@/app/actions/whatsAppIntegrationActions";
import { useWhatsAppStore } from "@/store/whatsappStore";
import { formatWhatsAppPhone } from "@/lib/phoneUtils";
import "./WhatsAppInbox.css";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [aiToggleLoading, setAiToggleLoading] = useState<boolean>(false);
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [showCannedResponses, setShowCannedResponses] = useState<boolean>(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState<boolean>(false);
  const [showProductPanel, setShowProductPanel] = useState<boolean>(false);
  const [showFlowPicker, setShowFlowPicker] = useState<boolean>(false);
  const [retryingMsgId, setRetryingMsgId] = useState<string | null>(null);
  
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
  
  // Mentions Autocomplete State
  const [showMentionsMenu, setShowMentionsMenu] = useState<boolean>(false);
  const [mentionSearch, setMentionSearch] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("ALL");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // CRM Integrations
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [pushingToCrm, setPushingToCrm] = useState(false);
  const [showIntegrationsMenu, setShowIntegrationsMenu] = useState(false);

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

  const handleCreateQuoteSubmit = async () => {
    if (!selectedConvId) return;
    setShowQuoteModal(false);
    setToastMsg("PDF Quotation generated & sent to customer!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateFollowUpSubmit = async () => {
    if (!selectedConvId) return;
    setShowFollowUpModal(false);
    setToastMsg(`Follow-up scheduled in ${followUpDays} days.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assigningLead, setAssigningLead] = useState<boolean>(false);
  const [statusToggleLoading, setStatusToggleLoading] = useState<boolean>(false);

  // Tags State
  const [showTagsModal, setShowTagsModal] = useState<boolean>(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#e2e8f0");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Unified active tags (merged between conversation and customer, excluding legacy auto-tags)
  const handlePushToCrm = async (integrationId: string) => {
    if (!activeConvDetail) return;
    setPushingToCrm(true);
    setShowIntegrationsMenu(false);
    const target = integrations.find(i => i.id === integrationId);
    const res = await pushLeadToIntegrationAction(activeConvDetail.id, integrationId);
    if (res.success) {
      setToastMsg(`Lead pushed to ${target?.name || 'CRM'} successfully!`);
    } else {
      setToastMsg("Failed to push lead: " + res.error);
    }
    setPushingToCrm(false);
    setTimeout(() => setToastMsg(null), 3000);
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
        setToastMsg(`⚡ Fired Meta Lead Conversion (₹10,000)! Trace ID: ${data.fbtrace_id}`);
      } else {
        setToastMsg(`⚠️ Meta CAPI: ${data.error || "Failed to send conversion"}`);
      }
    } catch (err: any) {
      setToastMsg("⚠️ Error firing Meta Lead conversion: " + err.message);
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
      const isAAd = a.senderName === "META_CTWA_AD" || a.messageType === "META_CTWA_AD";
      const isBAd = b.senderName === "META_CTWA_AD" || b.messageType === "META_CTWA_AD";
      let timeA = new Date(a.sentAt).getTime();
      let timeB = new Date(b.sentAt).getTime();

      // If one is Ad referral and the other is Customer incoming message within 30s, force Ad referral before customer message
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

  useEffect(() => {
    const checkPaymentSettings = async () => {
      const res = await getWhatsAppSettingsAction();
      const gateway = res.success ? res.settings?.activeGateway : null;
      if (gateway && gateway !== "NONE" && gateway !== "false" && gateway !== "none") {
        setPaymentConfigured(true);
      } else {
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

  useEffect(() => {
    try {
      const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
      if (u) {
        const v = decodeURIComponent(u.split("=")[1]);
        const parsed = JSON.parse(v);
        setCurrentUserRole(parsed.role || "");
        setCurrentEmployeeId(parsed.employeeId || "");
      }
    } catch {}
  }, []);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

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
        const typeUpper = (i.type || '').toUpperCase();
        const nameLower = (i.name || '').toLowerCase();
        if (typeUpper === 'META_CAPI' || typeUpper === 'PIXEL' || typeUpper.includes('CAPI')) return false;
        if (nameLower.includes('pixel') && !nameLower.includes('crm') && !nameLower.includes('erp')) return false;
        return true;
      });
      setIntegrations(crmOnly);
    }
  };

  // Fetch Conversations List — uses /api/whatsapp/inbox
  const fetchConversationsList = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const params = new URLSearchParams({ action: 'chats' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch('/api/whatsapp/inbox?' + params.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();

      if (data.success && data.chats) {
        const mapped = data.chats.map((c: any) => ({
          id: c.id,
          status: c.chat_status === 'open' ? 'OPEN' : 'CLOSED',
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

        // Read user details from cookie for filtering to avoid stale state in closures
        try {
          const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
          if (u) {
            const v = decodeURIComponent(u.split("=")[1]);
            const parsed = JSON.parse(v);
            if (parsed.role) setCurrentUserRole(parsed.role);
            if (parsed.name) setCurrentUserName(parsed.name);
          }
        } catch (e) {
          console.error("Error reading wm_user cookie", e);
        }

        // Apply Tab Filter (All, Assigned, Unassigned, Closed)
        let filtered = mapped;
        
        if (activeNavTab === 'assigned_to_me' || activeNavTab === 'assigned') {
          filtered = mapped.filter((c: any) => c._raw.assignedEmployeeId !== null && c.status === 'OPEN');
        } else if (activeNavTab === 'unassigned') {
          filtered = mapped.filter((c: any) => c._raw.assignedEmployeeId === null && c.status === 'OPEN');
        } else if (activeNavTab === 'closed') {
          filtered = mapped.filter((c: any) => c.status === 'CLOSED');
        } else {
          filtered = mapped.filter((c: any) => c.status === 'OPEN'); // 'all'
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
      const apiRes = await fetch('/api/whatsapp/inbox?' + params.toString(), { cache: 'no-store' });
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

  // Real-time Auto Polling (Every 3 seconds) — Silent & Smooth Background Sync
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchConversationsList(true);
      if (selectedConvIdRef.current) {
        fetchConversationDetail(selectedConvIdRef.current, true);
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [searchQuery, activeNavTab, unreadOnly, leadStatusFilter, filterEmployeeId, selectedConvId]);


  useEffect(() => {
    if (!activeConvDetail?.messages) return;
    const container = chatMessagesContainerRef.current;
    if (!container) return;

    const isNewConv = lastScrollConvIdRef.current !== selectedConvId;
    if (isNewConv) {
      chatBottomRef.current?.scrollIntoView({ behavior: "auto" });
    } else {
      const threshold = 150; // pixels from the bottom
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      if (isNearBottom) {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    lastScrollConvIdRef.current = selectedConvId;
  }, [activeConvDetail?.messages, selectedConvId]);

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
        setToastMsg("✓ Message delivered successfully via WhatsApp!");
        await fetchConversationDetail(selectedConvId, true);
        await fetchConversationsList(true);
      } else {
        setToastMsg(`❌ Retry failed: ${res.error || "Delivery failed"}`);
        await fetchConversationDetail(selectedConvId, true);
      }
    } catch (err: any) {
      setToastMsg(`❌ Error retrying message: ${err.message}`);
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
                setToastMsg('✓ Voice note sent to customer!');
                setTimeout(() => setToastMsg(null), 3000);
                await fetchConversationDetail(selectedConvId!, true);
                await fetchConversationsList(true);
              }
            } else {
              setToastMsg(`❌ Failed to upload voice note: ${uploadRes.error}`);
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
      setToastMsg('🗑 Voice note discarded');
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
              setToastMsg(`❌ Upload Failed: ${uploadRes.error}`);
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
              setToastMsg(`✓ Direct attachment "${file.name}" sent to customer!`);
              setTimeout(() => setToastMsg(null), 3000);
            }
          } catch (err: any) {
            setToastMsg(`❌ Failed to send ${file.name}: ${err.message}`);
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
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("✓ Conversation deleted successfully");
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
      setToastMsg("✓ Customer name updated!");
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
      setToastMsg(editingReply ? "✓ Canned reply updated!" : "✓ Canned reply created!");
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
      setToastMsg("✓ Canned reply deleted.");
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
      // Just plain text, insert into input
      setMessageInput((prev) => (prev ? `${prev} ${r.content}` : r.content));
      setShowReplyLibraryModal(false);
    }
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
    if (!selectedConvId || !activeConvDetail?.customer?.id) return;
    const res = await generateWhatsAppPaymentLinkAction({
      conversationId: selectedConvId,
      customerId: activeConvDetail.customer.id,
      amount: paymentAmount,
      description: paymentDesc,
      deliveryMethod: paymentDeliveryMethod
    });
    if (res.success) {
      setShowPaymentModal(false);
      await fetchConversationDetail(selectedConvId, true);
      await fetchConversationsList(true);
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

  const handleToggleConversationStatus = async (status: 'OPEN' | 'CLOSED') => {
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
                className="panel-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
                title="Toggle Filters"
                style={{ color: showFilters ? "#6d28d9" : "#64748b" }}
              >
                <Filter size={16} />
              </button>


            </div>
          </div>

          {!isLeftCollapsed && (
            <>
              {/* Search Bar & Folder Tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
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
                {currentUserRole !== 'AGENT' && (
                <div className="left-folder-tabs" style={{ margin: 0 }}>
                  <button
                    className={`folder-tab ${activeNavTab === "all" ? "active" : ""}`}
                    onClick={() => {
                      setActiveNavTab("all");
                      setFilterEmployeeId("");
                    }}
                  >
                    <span>All</span>
                  </button>
                  <button
                    className={`folder-tab ${activeNavTab === "assigned_to_me" ? "active" : ""}`}
                    onClick={() => setActiveNavTab("assigned_to_me")}
                  >
                    <span>Assigned</span>
                  </button>
                  <button
                    className={`folder-tab ${activeNavTab === "unassigned" ? "active" : ""}`}
                    onClick={() => {
                      setActiveNavTab("unassigned");
                      setFilterEmployeeId("");
                    }}
                  >
                    <span>Unassigned</span>
                  </button>
                  <button
                    className={`folder-tab ${activeNavTab === "closed" ? "active" : ""}`}
                    onClick={() => {
                      setActiveNavTab("closed");
                      setFilterEmployeeId("");
                    }}
                  >
                    <span>Closed</span>
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
                {currentUserRole !== 'AGENT' && (
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
                  <div className="conv-avatar">
                    <span>{(cust?.contactPerson || cust?.businessName || "C").slice(0, 2).toUpperCase()}</span>
                    <span className="conv-wa-badge">
                      <MessageSquare size={10} color="#fff" />
                    </span>
                  </div>

                  {!isLeftCollapsed && (
                    <div className="conv-content-box">
                      <div className="conv-top-line">
                        <span className="conv-name">{cust?.contactPerson || cust?.businessName || cust?.whatsappNumber}</span>
                        <span className="conv-time">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="conv-contact-sub">
                        <span>{formatWhatsAppPhone(cust?.whatsappNumber || cust?.mobile)}</span>
                      </div>

                      <div className="conv-snippet-line">
                        <span className="conv-last-msg">{conv.lastMessageText || "No messages yet"}</span>
                        {isUnread && <span className="unread-counter-badge">{conv.unreadCount}</span>}
                      </div>

                      <div className="conv-tags-line" style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                        <span className={`stage-tag ${conv.leadStatus?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {conv.leadStatus || "New Lead"}
                        </span>
                        {conv.tags && conv.tags.split(',').filter(Boolean).map((t: string) => {
                          const tagClean = t.trim();
                          if (!tagClean || tagClean === "Auto Created" || tagClean === "WhatsApp Lead") return null;
                          return (
                            <span key={tagClean} style={{ fontSize: "9.5px", padding: "1px 6px", borderRadius: "10px", background: "#e0e7ff", color: "#4338ca", fontWeight: 700, border: "1px solid #c7d2fe" }}>
                              🏷️ {tagClean}
                            </span>
                          );
                        })}
                        {conv._raw?.assignedEmployee && (
                          <span style={{ fontSize: "9.5px", padding: "2px 6px", borderRadius: "12px", background: "#ffffff", color: "#334155", fontWeight: 600, display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", marginLeft: "2px", gap: "3px" }}>
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
                          <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: "#f1f5f9", color: "#64748b", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "2px", border: "1px solid #cbd5e1" }}>
                            ✓ Closed
                          </span>
                        )}

                        {isExpired && (
                          <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: "#fee2e2", color: "#ef4444", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "2px", border: "1px solid rgba(239,68,68,0.2)" }}>
                            🔒 Expired
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
                <MessageSquare size={54} color="#6d28d9" strokeWidth={1.5} />
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
                <div className="chat-avatar-large">
                  <span>{(activeConvDetail.customer?.contactPerson || "C").slice(0, 2).toUpperCase()}</span>
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
                          {activeConvDetail.customer?.contactPerson || activeConvDetail.customer?.businessName || activeConvDetail.customer?.whatsappNumber}
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
                    <span className="chat-wa-connected-badge">Connected</span>
                    {!sessionStatus.neverMessaged && (
                      <span 
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: sessionStatus.expired ? '#fff1f2' : '#f0fdf4',
                          color: sessionStatus.expired ? '#e11d48' : '#15803d',
                          border: `1px solid ${sessionStatus.expired ? '#fecdd3' : '#bbf7d0'}`
                        }}
                        title={sessionStatus.reason}
                      >
                        ⏱️ {sessionStatus.expired ? "24h Window: Expired" : `24h Window: ${sessionStatus.hoursLeft?.toFixed(1)}h left`}
                      </span>
                    )}
                  </div>
                  <div className="chat-sub-line">
                    <span>{formatWhatsAppPhone(activeConvDetail.customer?.whatsappNumber || activeConvDetail.customer?.mobile)}</span>
                  </div>
                </div>
              </div>

              <div className="chat-header-actions">
                <button className="chat-action-btn highlight-tags" onClick={() => setShowTagsModal(true)} title="Manage Tags">
                  <Tag size={14} />
                  <span>Tags ({activeTagsList.length})</span>
                </button>
                <button className="chat-action-btn highlight-assign" onClick={() => setShowAssignModal(true)} title="Assign WhatsApp Lead">
                  <UserCheck size={14} />
                  <span>{activeConvDetail.assignedEmployee?.user?.name ? `Assign (${activeConvDetail.assignedEmployee.user.name})` : "Assign"}</span>
                </button>

                {paymentConfigured && (
                  <button className="chat-action-btn" onClick={() => setShowPaymentModal(true)} title="Send Payment Link">
                    <CreditCard size={14} />
                    <span>Payment</span>
                  </button>
                )}
                <button
                  className="chat-action-btn"
                  disabled={aiToggleLoading}
                  onClick={async () => {
                    if (!activeConvDetail?.id) return;
                    setAiToggleLoading(true);
                    const newVal = !activeConvDetail.aiHandled;
                    const res = await toggleConversationAIAction(activeConvDetail.id, newVal);
                    if (res.success) {
                      setActiveConvDetail((prev: any) => ({ ...prev, aiHandled: newVal }));
                      setToastMsg(newVal ? "🤖 AI Assistant turned ON for this chat" : "👤 Manual Mode — AI paused for this chat");
                      setTimeout(() => setToastMsg(null), 3000);
                    }
                    setAiToggleLoading(false);
                  }}
                  title={activeConvDetail.aiHandled ? "AI is ON — Click to switch to Manual Mode" : "AI is OFF — Click to enable AI auto-replies"}
                  style={{
                    background: activeConvDetail.aiHandled ? "#f0fdf4" : "#fef3c7",
                    border: `1px solid ${activeConvDetail.aiHandled ? "#bbf7d0" : "#fde68a"}`,
                    color: activeConvDetail.aiHandled ? "#15803d" : "#b45309"
                  }}
                >
                  <Bot size={14} />
                  <span>{aiToggleLoading ? "..." : activeConvDetail.aiHandled ? "AI: ON" : "AI: OFF"}</span>
                </button>
                <button
                  className="chat-action-btn"
                  disabled={statusToggleLoading}
                  onClick={async () => {
                    if (!activeConvDetail?.id) return;
                    setStatusToggleLoading(true);
                    const newStatus = activeConvDetail.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
                    const res = await toggleConversationStatusAction(activeConvDetail.id, newStatus);
                    if (res.success) {
                      setActiveConvDetail((prev: any) => ({ ...prev, status: newStatus }));
                      setToastMsg(newStatus === 'CLOSED' ? "✅ Chat Closed — Active workload reduced" : "🔓 Chat Reopened");
                      setTimeout(() => setToastMsg(null), 3000);
                      fetchConversationsList(true);
                    }
                    setStatusToggleLoading(false);
                  }}
                  title={activeConvDetail.status === 'CLOSED' ? "Click to Reopen Chat" : "Click to Close Chat (Reduces agent active open chat count)"}
                  style={{
                    background: activeConvDetail.status === 'CLOSED' ? "#f1f5f9" : "#fff1f2",
                    border: `1px solid ${activeConvDetail.status === 'CLOSED' ? "#cbd5e1" : "#fecdd3"}`,
                    color: activeConvDetail.status === 'CLOSED' ? "#475569" : "#e11d48",
                    fontWeight: 600
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{statusToggleLoading ? "..." : activeConvDetail.status === 'CLOSED' ? "Reopen Chat" : "Close Chat"}</span>
                </button>

                <div style={{ position: 'relative' }}>
                  <button
                    className="chat-action-btn"
                    onClick={() => {
                      if (integrations.length === 1) {
                        handlePushToCrm(integrations[0].id);
                      } else if (integrations.length > 1) {
                        setShowIntegrationsMenu(!showIntegrationsMenu);
                      } else {
                        setToastMsg("No CRM integrations configured.");
                        setTimeout(() => setToastMsg(null), 3000);
                      }
                    }}
                    disabled={pushingToCrm}
                    title={integrations.length === 1 ? `Push lead to ${integrations[0].name}` : "Push Lead to CRM"}
                    style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 600 }}
                  >
                    <Activity size={14} />
                    <span>{pushingToCrm ? "Pushing..." : "Push to CRM"}</span>
                  </button>
                  
                  {showIntegrationsMenu && integrations.length > 1 && (
                    <>
                      <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 49 }} 
                        onClick={() => setShowIntegrationsMenu(false)} 
                      />
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, minWidth: '180px', overflow: 'hidden' }}>
                        {integrations.map(int => (
                          <div 
                            key={int.id}
                            onClick={() => handlePushToCrm(int.id)}
                            style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                          >
                            {int.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  className="chat-action-btn"
                  onClick={handleMarkLeadInterested}
                  disabled={firingMetaLead}
                  style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#b45309", fontWeight: 700 }}
                  title="Mark Lead Interested & Fire Meta Conversion Event"
                >
                  <Zap size={14} className={firingMetaLead ? "animate-spin text-amber-600" : "text-amber-600"} />
                  <span>{firingMetaLead ? "Firing..." : "Mark Interested"}</span>
                </button>

                <button
                  className={`chat-action-btn ${isFullScreen ? "active-fullscreen" : ""}`}
                  onClick={toggleFullScreenMode}
                  title={isFullScreen ? "Exit Full Screen Mode (Esc)" : "Full Screen WhatsApp Inbox"}
                >
                  {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isFullScreen ? "Exit Full Screen" : "Full Screen"}</span>
                </button>
                
                {currentUserRole !== 'AGENT' && (
                  <button
                    className="chat-action-btn"
                    onClick={handleDeleteConversation}
                    title="Delete Conversation"
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fee2e2",
                      color: "#ef4444"
                    }}
                  >
                    <UserX size={14} />
                    <span>Delete Chat</span>
                  </button>
                )}

              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="chat-messages-container" ref={chatMessagesContainerRef}>
              {sortedMessages?.map((msg: any) => {
                const isAgent = msg.senderType === "AGENT" || msg.senderType === "BOT" || msg.senderType === "AI";
                const isInternal = msg.isInternalNote;

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
                    <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
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
                              🎯
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
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }}>
                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Optional Ad Image / Media Thumbnail */}
                        {mediaUrl && (
                          <img
                            src={mediaUrl}
                            alt="Meta Ad Media"
                            style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "10px", border: "1px solid #dbeafe" }}
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
                  );
                }

                if (isInternal) {
                  return (
                    <div key={msg.id} className="internal-note-card">
                      <div className="internal-note-header">
                        <LockIcon size={12} />
                        <span>Internal Team Note by {msg.senderName}</span>
                        <span className="note-time">
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="internal-note-body">{msg.content}</div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`message-row ${isAgent ? "outgoing" : "incoming"} ${msg.isInternalNote ? "internal-note-row" : ""}`}>
                    <div className="message-bubble" style={msg.isInternalNote ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' } : {}}>
                      <div className="message-sender-name" style={msg.isInternalNote ? { color: '#a16207' } : {}}>
                        {msg.isInternalNote ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><LockIcon size={12} /> Internal Note</span>
                        ) : (
                          (msg.senderName === "Sales Rep" || msg.senderName === "Agent") && activeConvDetail.assignedEmployee?.user?.name 
                            ? activeConvDetail.assignedEmployee.user.name 
                            : msg.senderName
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
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="doc-download-btn">
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
                                src={msg.mediaUrl}
                                alt="Media Image"
                                style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "8px", cursor: "pointer" }}
                                onClick={() => window.open(msg.mediaUrl, "_blank")}
                              />
                              <button onClick={(e) => forceDownloadMedia(msg.mediaUrl, e)} style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Download Image">
                                <Download size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ padding: "12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", fontSize: "11.5px", color: "#64748b", textAlign: "center" }}>
                              📷 Image expired (Stored only for 30 days)
                            </div>
                          )}
                          {msg.content && msg.content !== "[IMAGE]" && !msg.content.startsWith("Attached file:") && <p className="message-text-content" style={{ marginTop: "4px" }}>{msg.content}</p>}
                        </div>
                      )}

                      {/* Video Message Renderer */}
                      {msg.messageType === "VIDEO" && (
                        <div style={{ marginTop: "4px", position: "relative" }}>
                          <video src={msg.mediaUrl || ""} controls style={{ width: "100%", maxHeight: "220px", borderRadius: "8px" }} />
                          {msg.mediaUrl && (
                            <button onClick={(e) => forceDownloadMedia(msg.mediaUrl, e)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }} title="Download Video">
                              <Download size={14} />
                            </button>
                          )}
                          {msg.content && msg.content !== "[IMAGE]" && !msg.content.startsWith("Attached file:") && <p className="message-text-content" style={{ marginTop: "4px" }}>{msg.content}</p>}
                        </div>
                      )}

                      {/* Audio Message Renderer */}
                      {msg.messageType === "AUDIO" && (
                        <div style={{ marginTop: "4px", background: "#f3f4f6", padding: "8px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>Voice Message</span>
                            {msg.mediaUrl && (
                              <button onClick={(e) => forceDownloadMedia(msg.mediaUrl, e)} style={{ background: "transparent", color: "#6b7280", border: "none", cursor: "pointer", padding: "2px" }} title="Download Audio">
                                <Download size={14} />
                              </button>
                            )}
                          </div>
                          {msg.mediaUrl ? (
                            <audio src={msg.mediaUrl} controls style={{ width: "100%", height: "36px" }} />
                          ) : (
                            <div style={{ padding: "8px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", fontSize: "11.5px", color: "#64748b", textAlign: "center" }}>
                              🎙 Voice note expired (Stored only for 30 days)
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payment Link Card Renderer */}
                      {msg.messageType === "PAYMENT_LINK" && (
                        <div className="message-payment-card">
                          <div className="payment-card-header">
                            <CreditCard size={18} />
                            <span>WhatsApp Payment Link</span>
                          </div>
                          <div className="payment-card-body">
                            <p>{msg.content}</p>
                            <div className="payment-status-pill">Status: PENDING</div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Buttons / List Renderer */}
                      {(msg.messageType === "BUTTONS" || msg.messageType === "LIST") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                          {/* Image Header Preview */}
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="Button Header"
                              style={{ width: "100%", aspectRatio: "1.91 / 1", objectFit: "cover", borderRadius: "8px", cursor: "pointer" }}
                              onClick={() => window.open(msg.mediaUrl, "_blank")}
                            />
                          )}
                          
                          {/* Text Body */}
                          <p className="message-text-content" style={{ margin: 0, color: msg.isInternalNote ? '#713f12' : undefined }}>
                            {msg.content}
                          </p>

                          {/* Passive Interactive Options Preview */}
                          {(() => {
                            let options: string[] = [];
                            try {
                              if (msg.metadata) {
                                options = JSON.parse(msg.metadata);
                              }
                            } catch (_) {}
                            if (options.length === 0) return null;

                            return (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                {options.map((optText, oIdx) => (
                                  <div
                                    key={oIdx}
                                    style={{
                                      background: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      color: "#475569",
                                      padding: "5px 12px",
                                      borderRadius: "16px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      userSelect: "none"
                                    }}
                                  >
                                    🔘 {optText}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Meta Template Badge */}
                      {msg.messageType === "TEMPLATE" && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 700, color: "#0284c7", background: "#e0f2fe", padding: "2px 7px", borderRadius: "4px", marginBottom: "6px" }}>
                          📋 Meta Approved Template
                        </div>
                      )}

                      {/* Interactive Flow Badge */}
                      {msg.messageType === "FLOW" && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 700, color: "#7c3aed", background: "#f3e8ff", padding: "2px 7px", borderRadius: "4px", marginBottom: "6px" }}>
                          ⚡ Interactive Flow Form
                        </div>
                      )}

                      {/* Product Card Badge */}
                      {msg.messageType === "PRODUCT_CARD" && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 700, color: "#ea580c", background: "#ffedd5", padding: "2px 7px", borderRadius: "4px", marginBottom: "6px" }}>
                          🛍️ Product Card
                        </div>
                      )}

                      {/* Standard Text & Unsupported Format Renderer */}
                      {msg.messageType !== "DOCUMENT" && msg.messageType !== "IMAGE" && msg.messageType !== "VIDEO" && msg.messageType !== "AUDIO" && msg.messageType !== "PAYMENT_LINK" && msg.messageType !== "BUTTONS" && msg.messageType !== "LIST" && (
                        <p className="message-text-content" style={msg.isInternalNote ? { color: '#713f12' } : { whiteSpace: 'pre-wrap' }}>
                          {msg.messageType === "UNSUPPORTED" ? (
                            <span style={{ fontStyle: "italic", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              📎 [Unsupported message format (e.g. Sticker, Location, or Poll)]
                            </span>
                          ) : (
                            msg.content
                          )}
                        </p>
                      )}

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
                            style={{ 
                              color: isReal24hExpired ? "#b45309" : "#dc2626", 
                              fontSize: "11.5px", 
                              display: "flex", 
                              alignItems: "center", 
                              flexWrap: "wrap",
                              gap: "6px", 
                              marginTop: "6px", 
                              background: isReal24hExpired ? "#fffbeb" : "#fef2f2", 
                              padding: "6px 10px", 
                              borderRadius: "6px", 
                              border: `1px solid ${isReal24hExpired ? "#fde68a" : "#fecaca"}`, 
                              width: "fit-content" 
                            }}
                            title={errorObj?.details || errorObj?.message || displayReason}
                          >
                            <span style={{ fontWeight: 600 }}>⚠️ {displayReason}</span>
                            
                            {isReal24hExpired ? (
                              <button
                                type="button"
                                onClick={() => setShowTemplatePicker(true)}
                                style={{
                                  background: "#d97706",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "2px 8px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}
                              >
                                Send Template
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isRetrying}
                                onClick={() => handleRetryMessage(msg)}
                                style={{
                                  background: "#dc2626",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "2px 8px",
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  cursor: isRetrying ? "wait" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}
                              >
                                <RefreshCw size={11} className={isRetrying ? "animate-spin" : ""} />
                                {isRetrying ? "Retrying..." : "Retry Send"}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      <div className="message-meta-line">
                        <span className="message-timestamp" style={msg.isInternalNote ? { color: '#a16207' } : {}}>
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isAgent && !msg.isInternalNote && (
                          <span className="msg-status-tick" style={{ display: "inline-flex", alignItems: "center" }}>
                            {msg.status?.toUpperCase() === "READ" ? (
                              <span title="Read"><CheckCheck size={14} style={{ color: "#3b82f6", marginLeft: "4px" }} /></span>
                            ) : msg.status?.toUpperCase() === "DELIVERED" ? (
                              <span title="Delivered"><CheckCheck size={14} style={{ color: "#94a3b8", marginLeft: "4px" }} /></span>
                            ) : msg.status?.toUpperCase() === "FAILED" ? (
                              <span style={{ color: "#ef4444", fontSize: "11px", marginLeft: "4px" }} title="Failed to send">⚠️</span>
                            ) : (
                              <span title="Sent"><Check size={14} style={{ color: "#94a3b8", marginLeft: "4px" }} /></span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );

              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input & Action Bar */}
            <div className="chat-input-wrapper">
              {/* Quick Action Shortcut Buttons */}
              <div className="chat-quick-actions-bar">


                <button className="quick-chip highlight" onClick={() => setShowReplyLibraryModal(true)}>
                  <MessageSquare size={12} /> Reply Library
                </button>
                <button className="quick-chip ai-suggest" onClick={handleSuggestReply} disabled={aiSuggesting} style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                  <Sparkles size={12} /> {aiSuggesting ? "Generating..." : "Suggest Reply AI"}
                </button>
                <button
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
                <div style={{ display: "flex", gap: "6px", padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginBottom: "6px", width: "fit-content" }}>
                  {EMOJI_LIST.map((emoji) => (
                    <span
                      key={emoji}
                      onClick={() => handleInsertEmoji(emoji)}
                      style={{ fontSize: "16px", cursor: "pointer", padding: "2px 4px", borderRadius: "4px" }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Text Area Form */}
              {isRecording ? (
                <div className="voice-recorder-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '24px', flex: 1, margin: '0 8px' }}>
                  <span className="record-dot-blink" style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: 600, flex: 1 }}>
                    Recording Voice Note... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Send Voice Note
                  </button>
                </div>
              ) : (
                <>
                {sessionStatus.expired && !isInternalNote && (
                  <div style={{ padding: "10px 14px", background: "#fffbeb", borderBottom: "1px solid #fef3c7", color: "#b45309", fontSize: "12.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px 8px 0 0" }}>
                    <AlertCircle size={15} color="#d97706" />
                    <span>24-Hour WhatsApp Session Window has expired. You can only send pre-approved template messages until the customer responds.</span>
                    <button type="button" onClick={() => setShowTemplatePicker(true)} style={{ marginLeft: "auto", background: "#d97706", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}>Send Template</button>
                  </div>
                )}
                <form className={`chat-input-form ${isInternalNote ? "internal-mode" : ""}`} onSubmit={handleSendMessage} style={{ display: "flex", gap: "12px", alignItems: "flex-end", padding: "12px", background: isInternalNote ? "#fffdf5" : "#ffffff", borderTop: "1px solid #e2e8f0" }}>
                  
                  <div style={{ display: "flex", gap: "2px", background: "#f8fafc", padding: "4px 8px", borderRadius: "24px", border: "1px solid #e2e8f0", alignItems: "center" }}>
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
                      className="input-attachment-btn"
                      title="Record Voice Note"
                      onClick={startRecording}
                      style={{ color: '#ef4444' }}
                    >
                      <Mic size={18} />
                    </button>

                    {/* Template Picker Button */}
                    <button
                      type="button"
                      className="input-attachment-btn"
                      title="Send Template Message"
                      onClick={() => setShowTemplatePicker(true)}
                      style={{ color: showTemplatePicker ? '#4f46e5' : '#64748b' }}
                    >
                      <FileCode size={18} />
                    </button>

                    {/* Product Catalog Button */}
                    <button
                      type="button"
                      className="input-attachment-btn"
                      title="Send Product from Catalog"
                      onClick={() => setShowProductPanel(v => !v)}
                      style={{ color: showProductPanel ? '#10b981' : '#64748b' }}
                    >
                      <ShoppingBag size={18} />
                    </button>

                    {/* Flow Picker Button */}
                    <button
                      type="button"
                      className="input-attachment-btn"
                      title="Send Interactive Flow Form"
                      onClick={() => setShowFlowPicker(true)}
                      style={{ color: showFlowPicker ? '#a78bfa' : '#64748b' }}
                    >
                      <Zap size={18} />
                    </button>

                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="input-attachment-btn"
                        title="Quick Replies / Canned Responses"
                        onClick={() => setShowCannedResponses(!showCannedResponses)}
                      >
                        <MessageSquare size={18} color={showCannedResponses ? "#f59e0b" : "#64748b"} />
                      </button>

                      {/* Canned Responses Popup Menu */}
                      {showCannedResponses && (
                        <div style={{ position: "absolute", bottom: "100%", left: "0", marginBottom: "14px", width: "300px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", zIndex: 10, overflow: "hidden" }}>
                          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700, color: "#64748b", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Quick Replies</span>
                            <button type="button" onClick={() => setShowCannedResponses(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={14} /></button>
                          </div>
                          <div style={{ maxHeight: "250px", overflowY: "auto", padding: "6px" }}>
                            {cannedResponses.length > 0 ? (
                              cannedResponses.map(cr => (
                                <button
                                  key={cr.id}
                                  type="button"
                                  onClick={() => {
                                    setMessageInput(prev => prev ? `${prev} ${cr.content}` : cr.content);
                                    setShowCannedResponses(false);
                                  }}
                                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12.5px", transition: "background 0.2s" }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>{cr.title} <span style={{ color: "#3b82f6", fontSize: "11px", fontWeight: "normal", marginLeft: "4px" }}>{cr.shortcut}</span></strong>
                                  <span style={{ color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cr.content}</span>
                                </button>
                              ))
                            ) : (
                              <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>No quick replies found.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="input-attachment-btn"
                      title="Quick Emojis"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={18} color={showEmojiPicker ? "#10b981" : "#64748b"} />
                    </button>
                  </div>

                {/* Team Mentions Popup Menu */}
                {showMentionsMenu && (
                  <div style={{ position: "absolute", bottom: "100%", left: "40px", marginBottom: "8px", width: "200px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 10 }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700, color: "#64748b", background: "#f8fafc", borderRadius: "8px 8px 0 0" }}>
                      Mention Teammate
                    </div>
                    <div style={{ maxHeight: "150px", overflowY: "auto", padding: "4px" }}>
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
                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "6px 8px", background: "none", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <User size={14} color="#3b82f6" />
                            <strong style={{ color: "#0f172a" }}>{emp.firstName || emp.name}</strong>
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>No team members found.</div>
                      )}
                    </div>
                  </div>
                )}

                <textarea
                  rows={2}
                  className="chat-textarea"
                  disabled={sessionStatus.expired && !isInternalNote}
                  placeholder={
                    isInternalNote
                      ? "Add an internal note visible only to your team..."
                      : sessionStatus.expired
                        ? "⚠️ 24-Hour Session Window Expired. Select a Template or Flow to resume..."
                        : "Type a WhatsApp message or use shortcuts like /catalog, /price..."
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
                    }

                    // Check if they typed a shortcut exactly
                    const match = cannedResponses.find(cr => val.endsWith(cr.shortcut + " "));
                    if (match) {
                      setMessageInput(val.replace(match.shortcut + " ", match.content + " "));
                    }
                  }}
                  onKeyDown={(e) => {
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
      <div className="inbox-right-panel collapsed" style={{ display: 'none' }}>
        {!isRightCollapsed && activeConvDetail && (
          <div className="crm-panel-container">
            {/* Panel Header */}
            <div className="crm-panel-header">
              <h3>CRM 360° Profile</h3>
              <div className="crm-header-btns">
                {isEditingCRM ? (
                  <button className="crm-save-btn" onClick={handleSaveCRMProfile}>
                    <Check size={14} /> Save
                  </button>
                ) : (
                  <button className="crm-edit-btn" onClick={() => setIsEditingCRM(true)}>
                    <Edit3 size={14} /> Edit
                  </button>
                )}
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
                    <span className="crm-stage-badge">{activeConvDetail.leadStatus || "New Lead"}</span>
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

            {/* Quick Actions Panel */}
            <div className="crm-section-box">
              <h5 className="crm-section-title">Quick Actions</h5>
              <div className="crm-quick-btns">

                {paymentConfigured && (
                  <button className="crm-action-tile" onClick={() => setShowPaymentModal(true)}>
                    <CreditCard size={14} /> Send Payment Link
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
                      <span className="timeline-time">
                        {new Date(activeConvDetail.messages[activeConvDetail.messages.length - 1].sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                {isManagingReplies ? "⚙️ Manage Quick Replies" : "📚 WhatsApp Reply Library & Shortcuts"}
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
                    cursor: "pointer"
                  }}
                >
                  {isManagingReplies ? "👈 Back to List" : "⚙️ Manage Replies"}
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
                    <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "#334155", margin: "0 0 4px 0" }}>
                      {editingReply ? "📝 Edit Canned Response" : "＋ Create New Canned Response"}
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
                style={{
                  marginTop: "8px",
                  padding: "14px",
                  background: "#4f46e5",
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
                  boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)"
                }}
              >
                <Send size={16} /> Send Request in Chat
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
              <button onClick={() => setShowTagsModal(false)}>✕</button>
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

              {currentUserRole !== 'AGENT' && (
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
      {/* End of inbox panels */}
    </div>
  );
}

function LockIcon({ size }: { size: number }) {
  return <ShieldCheck size={size} color="#f59e0b" />;
}








