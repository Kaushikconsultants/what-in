"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  MapPin,
  User,
  Link as LinkIcon,
  Layers,
  HelpCircle,
  List,
  Mail,
  Phone,
  Calendar,
  Star,
  Sliders,
  GitBranch,
  Clock,
  Shuffle,
  CornerDownRight,
  CreditCard,
  QrCode,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  Globe,
  UserPlus, Target, Users,
  UserCheck,
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Focus,
  Hand,
  Check,
  Plus,
  Radio,
  Settings,
  FolderOpen,
  Power,
  GripVertical,
  ExternalLink,
  ShieldCheck,
  Tag
} from "lucide-react";
import {
  getWhatsAppChatbotFlows,
  saveWhatsAppChatbotFlowAction,
  deleteWhatsAppChatbotFlowAction,
  duplicateWhatsAppChatbotFlowAction,
  toggleWhatsAppChatbotFlowStatusAction,
  renameWhatsAppChatbotFlowAction,
  getAllEmployeesAndTeams,
  getTeamsWithMembersAction,
  getProductsAction,
  getWhatsAppTemplates
} from "@/app/actions/whatsAppPlatformActions";
import { getWhatsAppIntegrationsAction } from "@/app/actions/whatsAppIntegrationActions";
import "@/components/whatsapp/ChatbotBuilder.css";

// Block Library Categories
const blockCategories = [
  {
    name: "Messages",
    count: 11,
    blocks: [
      { id: "text", name: "Text", icon: MessageSquare },
      { id: "image", name: "Image", icon: ImageIcon },
      { id: "video", name: "Video", icon: Video },
      { id: "youtube", name: "YouTube", icon: Video },
      { id: "file", name: "File / PDF", icon: FileText },
      { id: "audio", name: "Audio", icon: Music },
      { id: "location", name: "Location", icon: MapPin },
      { id: "contact", name: "Contact", icon: User },
      { id: "link", name: "Link", icon: LinkIcon },
      { id: "carousel", name: "Media Carousel", icon: Layers },
      { id: "request", name: "Request", icon: HelpCircle }
    ]
  },
  {
    name: "Choices",
    count: 2,
    blocks: [
      { id: "buttons", name: "Buttons", icon: List },
      { id: "list_menu", name: "List Menu", icon: Layers }
    ]
  },
  {
    name: "Inputs",
    count: 5,
    blocks: [
      { id: "input_name", name: "Name Input", icon: User },
      { id: "input_email", name: "Email Input", icon: Mail },
      { id: "input_phone", name: "Phone Input", icon: Phone },
      { id: "input_date", name: "Date Input", icon: Calendar },
      { id: "input_rating", name: "Rating Input", icon: Star }
    ]
  },
  {
    name: "Logic",
    count: 5,
    blocks: [
      { id: "set_var", name: "Set Variable", icon: Sliders },
      { id: "condition", name: "Condition (If/Else)", icon: GitBranch },
      { id: "delay", name: "Delay / Wait", icon: Clock },
      { id: "split_test", name: "Split Test (A/B)", icon: Shuffle },
      { id: "jump", name: "Jump to Block", icon: CornerDownRight }
    ]
  },
  {
    name: "Payments",
    count: 3,
    blocks: [
      { id: "pay_link", name: "Payment Link", icon: CreditCard },
      { id: "pay_qr", name: "UPI QR Code", icon: QrCode },
      { id: "pay_collect", name: "Collect Payment", icon: DollarSign }
    ]
  },
  {
    name: "E-Commerce",
    count: 2,
    blocks: [
      { id: "catalog", name: "Product Catalog", icon: ShoppingBag },
      { id: "order", name: "Multi-Item Order", icon: ShoppingCart }
    ]
  },
  {
    name: "API & Live Data",
    count: 1,
    blocks: [
      { id: "webhook", name: "Webhook Fetch", icon: Globe }
    ]
  },
  {
    name: "Connect (CRM)",
    count: 3,
    blocks: [
      { id: "crm_contact", name: "Update CRM Contact", icon: UserCheck },
      { id: "crm_lead", name: "Create Lead", icon: UserPlus },
      { id: "crm_roundrobin", name: "Assign Sales Rep", icon: Shuffle }
    ]
  },
  {
    name: "Meta Suite & Ads",
    count: 4,
    blocks: [
      { id: "meta_capi", name: "Meta CAPI Event", icon: Target },
      { id: "meta_ctwa_ad", name: "CTWA Ad Attribution", icon: Sparkles },
      { id: "meta_custom_audience", name: "Meta Audience Sync", icon: Users },
      { id: "meta_template", name: "Send Meta Template", icon: Bot }
    ]
  },
  {
    name: "AI Automation",
    count: 1,
    blocks: [
      { id: "ai_bot", name: "AI GPT Intent", icon: Bot }
    ]
  }
];

// Pre-built WATI & Galabox Templates
const BOT_TEMPLATES = [
  {
    id: "wati_lead_gen",
    name: "WATI Style Lead Qualification & Menu Bot",
    platform: "WATI",
    description: "Inquiry router that auto-categorizes incoming messages into Retailer/Wholesaler, tags contacts in CRM, and assigns agents via Round-Robin.",
    triggerKeyword: "HI, HELLO, INQUIRY, PRICING",
    nodes: [
      {
        id: "node_trigger",
        type: "TRIGGER",
        category: "trigger",
        title: "FLOW TRIGGER",
        x: 30,
        y: 100,
        text: "Incoming Message matches: HI, HELLO, INQUIRY",
        outputPort: "node_start"
      },
      {
        id: "node_start",
        type: "START",
        category: "start",
        title: "Start / Auto Assign",
        x: 330,
        y: 100,
        text: "Assign via Round-Robin distribution to Sales Team",
        outputPort: "node_menu"
      },
      {
        id: "node_menu",
        type: "CHOICE",
        category: "choice",
        title: "Inquiry Menu",
        x: 630,
        y: 100,
        imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500",
        text: "Welcome to Espon Clothing Wholesale! Please select your inquiry category below:",
        choices: [
          { id: "c1", text: "1. Retailer / Shop Owner", targetNode: "node_crm_retail" },
          { id: "c2", text: "2. Wholesaler / Bulk Buyer", targetNode: "node_crm_wholesale" },
          { id: "c3", text: "3. Personal Inquiry", targetNode: "node_end_personal" }
        ]
      },
      {
        id: "node_crm_retail",
        type: "CRM_CONTACT",
        category: "crm",
        title: "Update CRM Contact (Retailer)",
        x: 970,
        y: 40,
        leadStage: "Qualified Retailer",
        temperature: "WARM",
        tags: "Retailer, Qualified",
        text: "Update CRM Contact:\n• Lead Stage: Qualified Retailer\n• Priority: MEDIUM",
        outputPort: "node_end_b2b"
      },
      {
        id: "node_crm_wholesale",
        type: "CRM_CONTACT",
        category: "crm",
        title: "Update CRM Contact (Wholesale)",
        x: 970,
        y: 200,
        leadStage: "Wholesale Inquiry",
        temperature: "HOT",
        tags: "Wholesale, Hot Lead",
        text: "Update CRM Contact:\n• Lead Stage: Wholesale Inquiry\n• Priority: HIGH",
        outputPort: "node_end_b2b"
      },
      {
        id: "node_end_personal",
        type: "END",
        category: "end",
        title: "Personal Store Link",
        x: 970,
        y: 360,
        text: "For personal use, visit our online retail store directly:",
        buttonText: "Visit Online Store 🛍️",
        url: "https://espon.in/shop"
      },
      {
        id: "node_end_b2b",
        type: "END",
        category: "end",
        title: "Confirmation & Callback",
        x: 1300,
        y: 120,
        text: "Thank you! Our wholesale specialist will call you shortly with catalog & pricing details.",
        buttonText: "View Catalog 📄",
        url: "https://espon.in/catalog.pdf"
      }
    ]
  },
  {
    id: "galabox_ecom",
    name: "Galabox E-Commerce & Order Tracking Bot",
    platform: "Galabox",
    description: "Multi-option e-commerce bot supporting product catalog browsing, live order tracking by AWB, and quick UPI payment collection.",
    triggerKeyword: "CATALOG, ORDER, TRACK, PAYMENT",
    nodes: [
      {
        id: "node_trigger",
        type: "TRIGGER",
        category: "trigger",
        title: "FLOW TRIGGER",
        x: 30,
        y: 100,
        text: "Incoming Message matches: CATALOG, ORDER, TRACK",
        outputPort: "node_welcome"
      },
      {
        id: "node_welcome",
        type: "CHOICE",
        category: "choice",
        title: "E-Commerce Main Menu",
        x: 330,
        y: 100,
        text: "Welcome to Espon Apparel Direct! How can we assist your order today?",
        choices: [
          { id: "g1", text: "🛍️ Browse Apparel Catalog", targetNode: "node_catalog" },
          { id: "g2", text: "🚚 Track Existing Order", targetNode: "node_track_input" },
          { id: "g3", text: "💳 Pay Pending Invoice", targetNode: "node_payment_qr" }
        ]
      },
      {
        id: "node_catalog",
        type: "CATALOG",
        category: "choice",
        title: "Product Catalog Carousel",
        x: 680,
        y: 40,
        categoryName: "Wholesale Activewear",
        text: "Here are our top trending wholesale categories for 2026. Select item to request quotation.",
        outputPort: "node_catalog_end"
      },
      {
        id: "node_track_input",
        type: "INPUT_PHONE",
        category: "input",
        title: "Order ID / Mobile Input",
        x: 680,
        y: 200,
        variableName: "customer_mobile",
        retryMessage: "Invalid mobile number. Enter 10 digits.",
        text: "Please reply with your 10-digit registered mobile number or Order ID (e.g. ORD-1092).",
        outputPort: "node_track_result"
      },
      {
        id: "node_payment_qr",
        type: "PAY_QR",
        category: "payment",
        title: "Instant UPI QR Code",
        x: 680,
        y: 360,
        amount: 2500,
        upiId: "7206066678@OKBIZAXIS",
        payeeName: "Espon Clothing Pvt Ltd",
        text: "Scan QR code or click payment link below to complete payment instantly via GooglePay / PhonePe:",
        outputPort: "node_pay_end"
      },
      {
        id: "node_catalog_end",
        type: "END",
        category: "end",
        title: "Catalog Request Shared",
        x: 1000,
        y: 40,
        text: "Catalog PDF downloaded. Our representative will contact you for custom manufacturing orders."
      },
      {
        id: "node_track_result",
        type: "END",
        category: "end",
        title: "Tracking Details",
        x: 1000,
        y: 200,
        text: "Your order status: IN TRANSIT (Delhivery Courier AWB #7890123). Expected Delivery: Tomorrow 5 PM."
      },
      {
        id: "node_pay_end",
        type: "END",
        category: "end",
        title: "Payment Receipt Sent",
        x: 1000,
        y: 360,
        text: "Once payment is completed, your invoice receipt will be sent here automatically."
      }
    ]
  },
  {
    id: "blank",
    name: "Blank Canvas Bot Flow",
    platform: "Custom",
    description: "Start with a clean canvas containing only standard Flow Trigger and Start nodes.",
    triggerKeyword: "HI, START",
    nodes: [
      {
        id: "node_trigger",
        type: "TRIGGER",
        category: "trigger",
        title: "FLOW TRIGGER",
        x: 30,
        y: 100,
        triggerKeywords: "HI, HELLO",
        text: "Incoming Message matches: HI, HELLO",
        outputPort: "node_start"
      },
      {
        id: "node_start",
        type: "START",
        category: "start",
        title: "Start Node",
        x: 330,
        y: 100,
        text: "Start building your customized chatbot flow..."
      }
    ]
  }
];

export default function WhatsAppChatbotBuilderPage() {
  // DB Saved Flow State
  const [savedFlows, setSavedFlows] = useState<any[]>([]);

  // Shopify-style Unsaved Tracking State
  const [lastSavedNodesJson, setLastSavedNodesJson] = useState<string>("");
  const [lastSavedFlowName, setLastSavedFlowName] = useState<string>("");
  const [lastSavedTriggerKeyword, setLastSavedTriggerKeyword] = useState<string>("");
  const [lastSavedIsBotActive, setLastSavedIsBotActive] = useState<boolean>(true);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState<string>("Default Chatbot Flow");
  const [triggerKeyword, setTriggerKeyword] = useState<string>("HI, HELLO, CATALOG");
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [isLoadingFlows, setIsLoadingFlows] = useState<boolean>(true);

  // Live Data for Dropdowns
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);

  // JSON File Import/Export Ref
  const jsonFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [editingManageModalId, setEditingManageModalId] = useState<string | null>(null);
  const [editingManageModalName, setEditingManageModalName] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("wati_lead_gen");
  const [drawerTab, setDrawerTab] = useState<"basic" | "advanced">("basic");
  const [newBotNameInput, setNewBotNameInput] = useState<string>("");
  const [newBotKeywordInput, setNewBotKeywordInput] = useState<string>("");

  const handleSaveModalRename = async (id: string) => {
    if (!editingManageModalName.trim()) return;
    const res = await renameWhatsAppChatbotFlowAction(id, editingManageModalName.trim());
    if (res.success) {
      setSavedFlows((prev) => prev.map((f) => (f.id === id ? { ...f, name: editingManageModalName.trim() } : f)));
      if (id === currentFlowId) {
        setFlowName(editingManageModalName.trim());
        setLastSavedFlowName(editingManageModalName.trim());
      }
      setEditingManageModalId(null);
    }
  };

  // Canvas Node State
  const [nodes, setNodes] = useState<any[]>(BOT_TEMPLATES[0].nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [copiedNodesBuffer, setCopiedNodesBuffer] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({ Messages: true, Choices: true });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [blockSearch, setBlockSearch] = useState<string>("");

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Interactive Drag-to-Connect Wire State
  const [connectingFrom, setConnectingFrom] = useState<{
    sourceNodeId: string;
    choiceId?: string;
    choiceIndex?: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);

  // Full Screen Studio State
  const [isFullScreenStudio, setIsFullScreenStudio] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<any[]>([BOT_TEMPLATES[0].nodes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("builder"); 

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [portCoords, setPortCoords] = useState<{[key: string]: {x: number, y: number}}>({});

  const updatePortCoords = () => {
    if (typeof window === "undefined") return;
    const container = document.querySelector('.canvas-pan-zoom-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const currentZoom = zoom || 1;

    const coords: {[key: string]: {x: number, y: number}} = {};
    const ports = document.querySelectorAll('.node-input-port, .node-output-port, .choice-option-port');
    ports.forEach(el => {
      if (!el.id) return;
      const rect = el.getBoundingClientRect();
      const x = (rect.left + rect.width / 2 - containerRect.left) / currentZoom;
      const y = (rect.top + rect.height / 2 - containerRect.top) / currentZoom;
      coords[el.id] = { x, y };
    });
    setPortCoords(coords);
  };

  const getPortCoords = (portId: string, fallback: { x: number; y: number }) => {
    return portCoords[portId] || fallback;
  };

  // Simulator Modal State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    // Recalculate port coordinates after DOM layout updates
    updatePortCoords();
    const timer = setTimeout(updatePortCoords, 60);
    return () => clearTimeout(timer);
  }, [nodes, currentFlowId, zoom, pan, isDrawerOpen]);

  // Discard unsaved changes handler
  const handleDiscardChanges = () => {
    setFlowName(lastSavedFlowName);
    setTriggerKeyword(lastSavedTriggerKeyword);
    setIsBotActive(lastSavedIsBotActive);
    if (lastSavedNodesJson) {
      try {
        const parsed = JSON.parse(lastSavedNodesJson);
        if (Array.isArray(parsed)) {
          setNodes(parsed);
          setHistoryStack([parsed]);
          setHistoryIndex(0);
          setSelectedNodeId(null);
          setIsDrawerOpen(false);
          setToastMsg("✓ Discarded unsaved changes");
          setTimeout(() => setToastMsg(null), 3000);
        }
      } catch (e) {
        console.error("Discard failed:", e);
      }
    }
  };
  // Import Flow by JSON file
  const handleImportJsonFlow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedNodes = null;
        let importedName = null;
        let importedKeyword = null;

        // Support for ShopLinx chatbot flow export format mapping
        if (parsed.kind === "shoplinx_whatsapp_chatbot_flow_export" && parsed.flow?.graph) {
          console.log("[Import JSON] Parsing ShopLinx graph format...");
          const graph = parsed.flow.graph;
          const groups = graph.groups || [];
          const edges = graph.edges || [];
          
          const mappedNodes = [];

          // Helper to resolve the first block ID of a group
          const getGroupFirstBlockId = (groupId) => {
            const grp = groups.find((g) => g.id === groupId);
            if (grp && grp.blocks && grp.blocks.length > 0) {
              return grp.blocks[0].id;
            }
            return null;
          };

          // Step 1: Create flat nodes from groups and blocks
          groups.forEach((group) => {
            const gx = group.position?.x || 100;
            const gy = group.position?.y || 100;

            (group.blocks || []).forEach((block) => {
              const node = {
                id: block.id,
                x: gx,
                y: gy,
                title: group.name || "Block",
                category: "message",
                text: ""
              };

              // Map properties based on ShopLinx block type classifications
              if (block.type === "conversation_action") {
                node.type = "START";
                node.category = "start";
                node.title = "Auto Assign / Start";
                node.text = `Assign via ${block.config?.actionType || 'Round Robin'}`;
              } else if (block.type === "interactive_buttons") {
                node.type = "CHOICE";
                node.category = "choice";
                node.title = "Buttons Option";
                node.text = block.config?.body?.text || "Options:";
                node.choices = (block.config?.buttons || []).map((btn) => ({
                  id: btn.id,
                  text: btn.title
                }));
              } else if (block.type === "update_contact") {
                node.type = "crm_contact";
                node.category = "crm";
                node.title = "Update CRM Tags";
                node.text = `Add tag IDs: ${(block.config?.addTagIds || []).join(", ")}`;
              } else if (block.type === "interactive_cta_url") {
                node.type = "link";
                node.category = "message";
                node.title = block.config?.buttonText || "Link Button";
                node.text = block.config?.bodyText || "Visit website:";
                node.url = block.config?.url || "";
              } else {
                node.type = "TEXT";
                node.category = "message";
                node.text = block.config?.text || "Unsupported custom block";
              }

              mappedNodes.push(node);
            });
          });

          // Step 2: Route edges to output ports
          mappedNodes.forEach((node) => {
            if (node.type === "CHOICE" && node.choices) {
              node.choices = node.choices.map((choice) => {
                const matchingEdge = edges.find((edge) => 
                  edge.from?.blockId === node.id && 
                  (edge.from?.portKey === `button:${choice.id}` || edge.from?.portKey === choice.id)
                );
                if (matchingEdge) {
                  const targetBlockId = getGroupFirstBlockId(matchingEdge.to?.groupId);
                  if (targetBlockId) {
                    return { ...choice, outputPort: targetBlockId };
                  }
                }
                return choice;
              });
            } else {
              const matchingEdge = edges.find((edge) => edge.from?.blockId === node.id);
              if (matchingEdge) {
                const targetBlockId = getGroupFirstBlockId(matchingEdge.to?.groupId);
                if (targetBlockId) {
                  node.outputPort = targetBlockId;
                }
              }
            }
          });

          // Step 3: Insert Trigger block at front if missing
          const hasTrigger = mappedNodes.some(n => n.type === "TRIGGER");
          if (!hasTrigger) {
            const startNode = mappedNodes.find(n => n.type === "START");
            const entryValues = parsed.flow?.entryRules?.[0]?.values || ["Hi"];
            const triggerNode = {
              id: "node_imported_trigger",
              type: "TRIGGER",
              category: "trigger",
              title: "FLOW TRIGGER",
              x: startNode ? startNode.x - 250 : 30,
              y: startNode ? startNode.y : 100,
              text: `Incoming Message matches: ${entryValues.join(", ")}`,
              outputPort: startNode ? startNode.id : undefined
            };
            mappedNodes.unshift(triggerNode);
          }

          importedNodes = mappedNodes;
          importedName = parsed.flow?.name || "Imported ShopLinx Flow";
          importedKeyword = (parsed.flow?.entryRules?.[0]?.values || []).join(", ");
        } else if (Array.isArray(parsed)) {
          importedNodes = parsed;
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.nodes)) {
            importedNodes = parsed.nodes;
          }
          if (typeof parsed.name === "string") {
            importedName = parsed.name;
          }
          if (typeof parsed.triggerKeyword === "string") {
            importedKeyword = parsed.triggerKeyword;
          }
        }

        if (!importedNodes || !importedNodes.every((n: any) => n.id && n.type)) {
          alert("Invalid chatbot flow JSON structure. Missing nodes, node IDs, or node types.");
          return;
        }

        setNodes(importedNodes);
        setHistoryStack([importedNodes]);
        setHistoryIndex(0);
        setSelectedNodeId(null);
        setIsDrawerOpen(false);

        if (importedName) setFlowName(importedName);
        if (importedKeyword) setTriggerKeyword(importedKeyword);

        setToastMsg("✓ Chatbot flow imported successfully! Click Save to publish.");
        setTimeout(() => setToastMsg(null), 4000);
      } catch (err: any) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportJsonFlow = () => {
    if (nodes.length === 0) return;
    const exportData = {
      name: flowName,
      triggerKeyword: triggerKeyword,
      nodes: nodes
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `${flowName.toLowerCase().replace(/\s+/g, "_")}_flow.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToastMsg("✅ Chatbot flow exported successfully!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyJsonFlow = async () => {
    if (nodes.length === 0) return;
    let nodesToCopy = nodes.filter((n) => selectedNodeIds.has(n.id) || selectedNodeId === n.id);
    if (nodesToCopy.length === 0) {
      nodesToCopy = nodes;
    }
    const exportData = nodesToCopy.length === nodes.length ? {
      name: flowName,
      triggerKeyword: triggerKeyword,
      nodes: nodes
    } : nodesToCopy;

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setToastMsg(`📋 ${nodesToCopy.length === nodes.length ? "Full workflow" : nodesToCopy.length + " selected block(s)"} copied to clipboard!`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
      setToastMsg("❌ Failed to copy JSON");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

    // Fetch Saved Chatbot Flows from DB
  const fetchFlows = async () => {
    setIsLoadingFlows(true);
    const res = await getWhatsAppChatbotFlows();
    if (res.success && res.flows) {
      setSavedFlows(res.flows);
      if (res.flows.length > 0) {
        const target = res.flows.find((f: any) => f.id === currentFlowId) || res.flows[0];
        setCurrentFlowId(target.id);
        setFlowName(target.name);
        setTriggerKeyword(target.triggerKeyword || "HI, HELLO, CATALOG");
        setIsBotActive(target.isActive);
        // Set last saved Shopify states
        setLastSavedFlowName(target.name);
        setLastSavedTriggerKeyword(target.triggerKeyword || "HI, HELLO, CATALOG");
        setLastSavedIsBotActive(target.isActive);
        try {
          const parsedNodes = JSON.parse(target.nodesJson);
          if (Array.isArray(parsedNodes)) {
            setNodes(parsedNodes);
            setHistoryStack([parsedNodes]);
            setHistoryIndex(0);
            setLastSavedNodesJson(JSON.stringify(parsedNodes));
          }
        } catch (e) {
          console.error("Failed to parse nodesJson:", e);
        }
      } else {
        setCurrentFlowId(null);
        setFlowName("No Active Chatbot");
        setTriggerKeyword("");
        setIsBotActive(false);
        setNodes([]);
      }
    }
    setIsLoadingFlows(false);
  };

  // Fetch Live Data for Dropdowns
  const fetchLiveData = async () => {
      // Fetch WhatsApp Templates for Meta block
      const tRes = await getWhatsAppTemplates();
      if (tRes.success && tRes.templates) {
        setTemplates(tRes.templates);
      }
      
      // Fetch Integrations for CRM blocks
      const iRes = await getWhatsAppIntegrationsAction();
      if (iRes.success && iRes.integrations) {
        setIntegrations(iRes.integrations);
      }

      try {
      const agentsRes = await getAllEmployeesAndTeams();
      if (agentsRes.success && agentsRes.employees) setAvailableAgents(agentsRes.employees);

      const teamsRes = await getTeamsWithMembersAction();
      if (teamsRes.success && teamsRes.teams) setAvailableTeams(teamsRes.teams);

      const tagsRes = await fetch('/api/whatsapp/tags');
      const tagsData = await tagsRes.json();
      if (tagsData.success && tagsData.tags) setAvailableTags(tagsData.tags);

      const prodRes = await getProductsAction();
      if (prodRes.success && prodRes.products) {
        const uniqueCats = Array.from(new Set(prodRes.products.map((p: any) => p.category))).filter(Boolean) as string[];
        setAvailableCollections(uniqueCats);
      }
    } catch (err) {
      console.error("Failed to load live data for chatbot builder", err);
    }
  };

  const handleCreateTag = async () => {
    const tagName = window.prompt("Enter new tag name:");
    if (!tagName || !tagName.trim()) return;
    try {
      const res = await fetch('/api/whatsapp/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim(), color: '#6366f1' })
      });
      const data = await res.json();
      if (data.success) {
        fetchLiveData(); // Refresh tags
      } else {
        alert(data.error || "Failed to create tag.");
      }
    } catch (e) {
      alert("Error creating tag.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchFlows();
    fetchLiveData();
  }, []);

  const handleSelectFlow = (flowId: string) => {
    const target = savedFlows.find((f) => f.id === flowId);
    if (!target) return;
    setCurrentFlowId(target.id);
    setFlowName(target.name);
    setTriggerKeyword(target.triggerKeyword || "HI, HELLO, CATALOG");
    setIsBotActive(target.isActive);
    // Set last saved Shopify states
    setLastSavedFlowName(target.name);
    setLastSavedTriggerKeyword(target.triggerKeyword || "HI, HELLO, CATALOG");
    setLastSavedIsBotActive(target.isActive);
    try {
      const parsedNodes = JSON.parse(target.nodesJson);
      if (Array.isArray(parsedNodes)) {
        setNodes(parsedNodes);
        setHistoryStack([parsedNodes]);
        setHistoryIndex(0);
        setSelectedNodeId(null);
        setIsDrawerOpen(false);
        setLastSavedNodesJson(JSON.stringify(parsedNodes));
      }
    } catch (e) {
      console.error("Error loading selected flow nodes:", e);
    }
  };

  const handleConfirmCreateNewBot = async () => {
    const template = BOT_TEMPLATES.find((t) => t.id === selectedTemplateId) || BOT_TEMPLATES[0];
    const botName = newBotNameInput.trim() || template.name;
    const botKeyword = newBotKeywordInput.trim() || template.triggerKeyword;

    setIsSaving(true);
    const res = await saveWhatsAppChatbotFlowAction({
      name: botName,
      triggerKeyword: botKeyword,
      nodesJson: JSON.stringify(template.nodes),
      isActive: true
    });

    if (res.success && res.flow) {
      setToastMsg(`✓ New Chatbot "${botName}" created successfully!`);
      setShowCreateModal(false);
      setNewBotNameInput("");
      setNewBotKeywordInput("");

      // Immediately mount the newly created bot on the canvas
      const newNodes = template.nodes;
      setCurrentFlowId(res.flow.id);
      setFlowName(res.flow.name);
      setTriggerKeyword(res.flow.triggerKeyword || botKeyword);
      setIsBotActive(true);
      setLastSavedFlowName(res.flow.name);
      setLastSavedTriggerKeyword(res.flow.triggerKeyword || botKeyword);
      setLastSavedIsBotActive(true);
      setNodes(newNodes);
      setHistoryStack([newNodes]);
      setHistoryIndex(0);
      setSelectedNodeId(null);
      setSelectedNodeIds(new Set());
      setIsDrawerOpen(false);
      setLastSavedNodesJson(JSON.stringify(newNodes));

      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `/whatsapp/chatbot-builder?flowId=${res.flow.id}`);
      }

      await fetchFlows();
    } else {
      setToastMsg(`Error creating chatbot: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDeleteFlowById = async (flowIdToDelete: string) => {
    setIsSaving(true);
    const targetFlow = savedFlows.find((f) => f.id === flowIdToDelete);
    const flowTitle = targetFlow ? targetFlow.name : "Chatbot";

    const res = await deleteWhatsAppChatbotFlowAction(flowIdToDelete);
    if (res.success) {
      setToastMsg(`✓ Chatbot "${flowTitle}" permanently deleted.`);
      setShowDeleteModal(false);

      const remaining = savedFlows.filter((f) => f.id !== flowIdToDelete);
      setSavedFlows(remaining);

      if (flowIdToDelete === currentFlowId) {
        if (remaining.length > 0) {
          const next = remaining[0];
          setCurrentFlowId(next.id);
          setFlowName(next.name);
          setTriggerKeyword(next.triggerKeyword || "HI, HELLO, CATALOG");
          setIsBotActive(next.isActive);
          try {
            const parsed = JSON.parse(next.nodesJson);
            if (Array.isArray(parsed)) {
              setNodes(parsed);
              setHistoryStack([parsed]);
              setHistoryIndex(0);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          setCurrentFlowId(null);
          setFlowName("No Active Chatbot");
          setTriggerKeyword("");
          setIsBotActive(false);
          setNodes([]);
          setSelectedNodeId(null);
          setIsDrawerOpen(false);
        }
      }
    } else {
      setToastMsg(`Error deleting bot: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleConfirmDeleteBot = async () => {
    if (!currentFlowId) return;
    await handleDeleteFlowById(currentFlowId);
  };

  const handleDuplicateCurrentBot = async () => {
    if (!currentFlowId) return;
    setIsSaving(true);
    const res = await duplicateWhatsAppChatbotFlowAction(currentFlowId);
    if (res.success && res.flow) {
      setToastMsg(`✓ Cloned bot "${res.flow.name}" created!`);
      await fetchFlows();
      handleSelectFlow(res.flow.id);
    } else {
      setToastMsg(`Error cloning bot: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleActiveStatus = async (flowId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // If activating a flow, validate its configurations first
    if (newStatus) {
      const flowToToggle = savedFlows.find((f) => f.id === flowId);
      if (flowToToggle) {
        let flowNodes: any[] = [];
        try { flowNodes = JSON.parse(flowToToggle.nodesJson); } catch (_) {}
        const triggerNode = flowNodes.find((n: any) => (n.type || '').toUpperCase() === "TRIGGER");
        const hasTrigger = !!triggerNode;
        const hasKeyword = !!flowToToggle.triggerKeyword?.trim();
        const isTriggerConnected = !!triggerNode?.outputPort;

        if (!hasTrigger || !hasKeyword || !isTriggerConnected) {
          let error = "Cannot activate this chatbot: ";
          if (!hasTrigger) error += "No trigger block found. ";
          else if (!hasKeyword) error += "Trigger keywords are empty. ";
          else if (!isTriggerConnected) error += "Trigger block is not connected to any starting block. ";
          alert(error + "\nPlease open and edit this flow to configure it before publishing.");
          return;
        }
      }
    }

    const res = await toggleWhatsAppChatbotFlowStatusAction(flowId, newStatus);
    if (res.success) {
      if (flowId === currentFlowId) {
        setIsBotActive(newStatus);
      }
      setSavedFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, isActive: newStatus } : f)));
      setToastMsg(`Chatbot status changed to ${newStatus ? 'ACTIVE' : 'DRAFT'}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleDeleteConnection = (sourceId: string, targetId: string, choiceId?: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== sourceId) return n;

        // If it's a choice option connection
        if (choiceId && n.choices) {
          const updatedChoices = n.choices.map((c: any) =>
            c.id === choiceId ? { ...c, targetNode: null } : c
          );
          return { ...n, choices: updatedChoices };
        }

        // If it's the direct outputPort connection
        if (n.outputPort === targetId) {
          return { ...n, outputPort: null };
        }

        return n;
      })
    );
    setToastMsg("✓ Connection deleted successfully!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const validateWorkflow = () => {
    const errors: string[] = [];
    const triggerNode = nodes.find((n) => (n.type || '').toUpperCase() === "TRIGGER");
    
    if (!triggerNode) {
      errors.push("Missing 'Flow Trigger' block. You must have a trigger block to start the flow.");
    } else {
      if (!triggerKeyword || !triggerKeyword.trim()) {
        errors.push("Flow Trigger keywords cannot be empty. Please configure keywords in the top bar.");
      }
      if (!triggerNode.outputPort) {
        errors.push("Flow Trigger block is not connected to any starting block. Drag a wire from its output.");
      }
    }

    // Node-specific validation
    nodes.forEach(node => {
      if (node.type === "TEXT" && (!node.text || !node.text.trim())) {
        errors.push(`Text block "${node.title || 'Text'}" has no message content.`);
      }
      if (node.type === "IMAGE" || node.type === "VIDEO" || node.type === "FILE" || node.type === "AUDIO") {
        if (!node.mediaUrl || !node.mediaUrl.trim()) {
          errors.push(`Media block "${node.title || node.type}" is missing a valid URL.`);
        }
      }
      if (node.type === "CHOICE" || node.type === "BUTTONS" || node.type === "LIST_MENU") {
        if (!node.choices || node.choices.length === 0) {
          errors.push(`Interactive block "${node.title || 'Choices'}" has no options configured.`);
        } else {
          node.choices.forEach((choice: any, index: number) => {
            if (!choice.text || !choice.text.trim()) {
              errors.push(`Option ${index + 1} in "${node.title}" has empty text.`);
            }
            if (!choice.targetNode) {
              errors.push(`Option "${choice.text || 'Unnamed'}" in "${node.title}" is not connected to any next step.`);
            }
          });
        }
      }
      const type = (node.type || "").toUpperCase();
      if (type === "CRM_LEAD" || type === "CRM_CONTACT") {
        if (!node.integrationId && !integrations.some(i => i.type === "CRM_LEAD" && i.isActive)) {
          errors.push(`CRM node "${node.title || 'Create Lead'}" requires an active CRM/Webhook integration. Save integration settings first.`);
        }
      }
      if (type === "META_CAPI") {
        if (!node.integrationId && !integrations.some(i => i.type === "META_CAPI" && i.isActive)) {
          errors.push(`Meta CAPI node "${node.title || 'Meta CAPI Event'}" requires an active Meta integration. Save Meta credentials in Integrations first.`);
        }
      }
      if (type === "CRM_ROUNDROBIN") {
        if (node.assignmentMode === "DIRECT") {
          if (!node.agentId) {
            errors.push(`Agent Routing block "${node.title}" has no specific agent selected.`);
          }
        } else {
          if (!node.distributionMethod) {
            errors.push(`Agent Routing block "${node.title}" has no distribution method selected.`);
          }
          if (node.roundRobinTarget === "AGENTS") {
            if (!node.agentIds || node.agentIds.length === 0) {
              errors.push(`Agent Routing block "${node.title}" has no agents selected.`);
            }
          } else {
            // Default to TEAM
            if (!node.teamId) {
              errors.push(`Agent Routing block "${node.title}" has no team selected.`);
            }
          }
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  const handleRunValidation = () => {
    const validation = validateWorkflow();
    if (validation.isValid) {
      alert("✅ Your Flow looks great! No errors found.");
    } else {
      alert(`⚠️ Flow Validation Failed:\n\n- ${validation.errors.join("\\n- ")}\n\nPlease fix these errors before publishing.`);
    }
  };

  const handleSaveFlowWithStatus = async (wantsPublish: boolean) => {
    setIsSaving(true);
    let targetActive = wantsPublish;

    // Validate if the user is trying to publish
    if (wantsPublish) {
      const validation = validateWorkflow();
      if (!validation.isValid) {
        targetActive = false;
        alert(`Cannot Publish Live due to the following errors:\n\n- ${validation.errors.join("\\n- ")}\n\nSaving your chatbot as a DRAFT instead.`);
      }
    }

    const res = await saveWhatsAppChatbotFlowAction({
      id: currentFlowId || undefined,
      name: flowName,
      triggerKeyword: triggerKeyword,
      nodesJson: JSON.stringify(nodes),
      isActive: targetActive
    });

    if (res.success && res.flow) {
      setCurrentFlowId(res.flow.id);
      setIsBotActive(targetActive);
      if (targetActive) {
        setToastMsg("✓ Chatbot Flow successfully saved & Published live!");
      } else {
        setToastMsg("✓ Chatbot Flow saved successfully as a DRAFT.");
      }
      setLastSavedFlowName(flowName);
      setLastSavedTriggerKeyword(triggerKeyword);
      setLastSavedIsBotActive(targetActive);
      setLastSavedNodesJson(JSON.stringify(nodes));
      await fetchFlows();
    } else {
      setToastMsg(`Error saving flow: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Choice Option handlers
  const handleAddOptionToNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const currentChoices = n.choices || [];
        const newChoiceNum = currentChoices.length + 1;
        const newChoice = {
          id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          text: `Option ${newChoiceNum}`,
          targetNode: null
        };
        return { ...n, choices: [...currentChoices, newChoice] };
      })
    );
  };

  const handleDeleteOptionFromNode = (nodeId: string, choiceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, choices: (n.choices || []).filter((c: any) => c.id !== choiceId) };
      })
    );
  };

  const handleUpdateOptionText = (nodeId: string, choiceId: string, newText: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const updated = (n.choices || []).map((c: any) => (c.id === choiceId ? { ...c, text: newText } : c));
        return { ...n, choices: updated };
      })
    );
  };

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const pushHistory = (newNodes: any[]) => {
    const updated = historyStack.slice(0, historyIndex + 1);
    setHistoryStack([...updated, newNodes]);
    setHistoryIndex(updated.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setNodes(historyStack[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setNodes(historyStack[historyIndex + 1]);
    }
  };

  // ---------------------------------------------------------
  // RICH BLOCK INITIALIZATION FOR ALL 25+ BLOCK TYPES
  // ---------------------------------------------------------
  const handleAddBlockToCanvas = (block: any, x?: number, y?: number) => {
    if (block.id === "meta_capi") {
      const hasMeta = integrations.some(i => i.type === "META_CAPI" && i.isActive);
      if (!hasMeta) {
        setToastMsg("Error: Please save your Meta CAPI credentials in Integrations first!");
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }
    }
    const selected = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
    const newNodeId = `node_${Date.now()}`;
    const basePos = {
      x: typeof x === "number" ? x : (selected ? selected.x + 290 : 400),
      y: typeof y === "number" ? y : (selected ? selected.y + 40 : 200)
    };

    let newNode: any = {
      id: newNodeId,
      type: block.id.toUpperCase(),
      title: block.name,
      x: basePos.x,
      y: basePos.y
    };

    switch (block.id) {
      case "text":
        newNode = { ...newNode, category: "choice", text: "Hi {{customer_name}}, thank you for reaching out to Espon Apparel!" };
        break;
      case "image":
        newNode = { ...newNode, category: "choice", imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500", caption: "Check out our latest 2026 Wholesale Activewear Collection!" };
        break;
      case "video":
        newNode = { ...newNode, category: "choice", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", caption: "Watch our apparel production demo video." };
        break;
      case "youtube":
        newNode = { ...newNode, category: "choice", youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "Espon Factory Tour & Manufacturing Demo" };
        break;
      case "file":
        newNode = { ...newNode, category: "choice", fileUrl: "https://espon.in/catalog.pdf", filename: "Espon_Apparel_Catalog_2026.pdf" };
        break;
      case "audio":
        newNode = { ...newNode, category: "choice", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", isVoiceNote: true, text: "Audio Note: Welcome message from Ikra Sales Manager" };
        break;
      case "location":
        newNode = { ...newNode, category: "choice", locationName: "Espon Apparel HQ Factory", address: "SCO 71A, Ashoka Plaza, Rohtak, Haryana 124001", lat: 28.8955, lng: 76.6066 };
        break;
      case "contact":
        newNode = { ...newNode, category: "choice", contactName: "Ikra Sales Manager", contactPhone: "+91 7206066678", contactOrg: "Espon Apparel Direct" };
        break;
      case "link":
        newNode = { ...newNode, category: "choice", text: "Click below to visit our B2B wholesale store:", buttonText: "Visit Portal 🌐", url: "https://espon.in" };
        break;
      case "carousel":
        newNode = {
          ...newNode,
          category: "choice",
          text: "Featured Categories Carousel:",
          items: [
            { id: "item_1", title: "Polo T-Shirts", subtitle: "₹290/pc · Min 100 pcs", imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400", buttonText: "Inquire Now" },
            { id: "item_2", title: "Track Pants", subtitle: "₹340/pc · Min 50 pcs", imageUrl: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400", buttonText: "Inquire Now" }
          ]
        };
        break;
      case "request":
        newNode = { ...newNode, category: "input", text: "Please enter your requirement quantity (pcs):", variableName: "req_qty" };
        break;
      case "buttons":
        newNode = {
          ...newNode,
          category: "choice",
          text: "Select your inquiry topic below:",
          choices: [
            { id: `c_${Date.now()}_1`, text: "1. Wholesale Catalog", targetNode: null },
            { id: `c_${Date.now()}_2`, text: "2. Custom Manufacturing", targetNode: null }
          ]
        };
        break;
      case "list_menu":
        newNode = {
          ...newNode,
          category: "choice",
          text: "Select from our service options menu:",
          menuTitle: "Main Menu Options",
          choices: [
            { id: `c_${Date.now()}_1`, text: "1. View Bulk Pricing", description: "Tiered wholesale slabs", targetNode: null },
            { id: `c_${Date.now()}_2`, text: "2. Track Order Status", description: "Live AWB status", targetNode: null }
          ]
        };
        break;
      case "input_name":
        newNode = { ...newNode, category: "input", text: "What is your full name?", variableName: "customer_name", retryMessage: "Please enter a valid name." };
        break;
      case "input_email":
        newNode = { ...newNode, category: "input", text: "Please enter your business email address:", variableName: "customer_email", retryMessage: "Invalid email format. Try again." };
        break;
      case "input_phone":
        newNode = { ...newNode, category: "input", text: "Please enter your 10-digit mobile number:", variableName: "customer_mobile", retryMessage: "Invalid mobile number. Enter 10 digits." };
        break;
      case "input_date":
        newNode = { ...newNode, category: "input", text: "Select your preferred delivery date (YYYY-MM-DD):", variableName: "delivery_date" };
        break;
      case "input_rating":
        newNode = { ...newNode, category: "input", text: "Rate your experience from 1 to 5 Stars ⭐:", variableName: "rating_score" };
        break;
      case "set_var":
        newNode = { ...newNode, category: "logic", title: "Set Variable", variableName: "lead_status", variableValue: "Qualified" };
        break;
      case "condition":
        newNode = { ...newNode, category: "logic", title: "Condition (If / Else)", variableName: "customer_type", operator: "EQUALS", compareValue: "Wholesaler", truePort: null, falsePort: null };
        break;
      case "delay":
        newNode = { ...newNode, category: "logic", title: "Wait / Delay", delayValue: 5, delayUnit: "MINUTES", text: "Wait 5 minutes before continuing..." };
        break;
      case "split_test":
        newNode = { ...newNode, category: "logic", title: "Split Test (A/B)", splitRatio: "50/50", branchAPort: null, branchBPort: null };
        break;
      case "jump":
        newNode = { ...newNode, category: "logic", title: "Jump to Block", targetNodeId: null };
        break;
      case "pay_link":
        newNode = { ...newNode, category: "payment", title: "Send Payment Link", amount: 1500, currency: "INR", paymentDescription: "Order Deposit Payment", paymentUrl: "https://pay.espon.in/dep1092" };
        break;
      case "pay_qr":
        newNode = { ...newNode, category: "payment", title: "UPI QR Code", amount: 2500, upiId: "7206066678@OKBIZAXIS", payeeName: "Espon Clothing Pvt Ltd", text: "Scan QR via GPay / PhonePe / Paytm:" };
        break;
      case "pay_collect":
        newNode = { ...newNode, category: "payment", title: "Collect Payment", amount: 5000, paymentModes: ["UPI", "Cards", "NetBanking"] };
        break;
      case "catalog":
        newNode = { ...newNode, category: "choice", title: "Product Catalog Carousel", categoryName: "Wholesale Activewear", text: "Browse ready stock catalog below:" };
        break;
      case "order":
        newNode = { ...newNode, category: "choice", title: "Multi-Item Order", text: "Order Summary: 100 pcs Polo T-Shirts (₹29,000)" };
        break;
      case "webhook":
        newNode = { ...newNode, category: "api", title: "Webhook Fetch (API)", webhookUrl: "https://api.espon.in/v1/inventory", method: "POST", headers: "Content-Type: application/json", requestBody: '{"sku": "ESP-902"}' };
        break;
      case "crm_contact":
        newNode = { ...newNode, category: "crm", title: "Update CRM Contact", leadStage: "Qualified Lead", temperature: "HOT", tags: "Hot Lead, Wholesale" };
        break;
      case "crm_lead":
        newNode = { ...newNode, category: "crm", title: "Create Lead", leadSource: "WhatsApp Bot", customerType: "Wholesaler" };
        break;
      case "meta_capi":
        newNode = { ...newNode, category: "crm", title: "Meta CAPI Event", eventName: "Lead", integrationId: integrations.find(i => i.type === "META_CAPI" && i.isActive)?.id };
        break;
      case "crm_roundrobin":
        newNode = { ...newNode, category: "crm", title: "Assign Sales Rep", assignmentMode: "ROUND_ROBIN", department: "Wholesale Sales" };
        break;
      case "ai_bot":
        newNode = { ...newNode, category: "ai", title: "AI GPT Intent Auto-Answer", systemPrompt: "You are Espon AI Assistant. Answer product catalog and pricing inquiries politely.", confidenceThreshold: 85 };
        break;
      case "meta_template":
        newNode = { ...newNode, category: "ai", title: "Send Meta Template", templateName: "order_confirmation_v2", language: "en_US" };
        break;
      default:
        newNode = { ...newNode, category: "choice", text: `Configure ${block.name}...` };
    }

    const updated = [...nodes, newNode];
    setNodes(updated);
    pushHistory(updated);
    setSelectedNodeId(newNodeId);
    setIsDrawerOpen(true);
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.canvas-node-card') ||
      target.closest('.node-card-header') ||
      target.closest('.block-tile') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('.node-input-port') ||
      target.closest('.node-output-port') ||
      target.closest('.choice-option-port')
    ) {
      return;
    }

    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setIsDrawerOpen(false);

    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggingNodeId(id);

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedNodeIds(new Set([id]));
      setSelectedNodeId(id);
    }

    const targetNode = nodes.find((n) => n.id === id);
    if (targetNode) {
      setDragOffset({
        x: e.clientX - (targetNode.x * zoom + pan.x),
        y: e.clientY - (targetNode.y * zoom + pan.y)
      });
    }
  };

  const handleOpenNodeSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setIsDrawerOpen(true);
  };

  const handleStartConnectWire = (
    e: React.MouseEvent,
    sourceNodeId: string,
    choiceId?: string,
    choiceIndex?: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    let startFallback = { x: sourceNode.x + 260, y: sourceNode.y + 40 };
    let portId = `port-out-${sourceNode.id}`;
    if (choiceId) {
      startFallback = { x: sourceNode.x + 255, y: sourceNode.y + 140 + (choiceIndex || 0) * 30 };
      portId = `port-out-${sourceNode.id}-${choiceId}`;
    }

    const start = getPortCoords(portId, startFallback);

    const canvas = (e.currentTarget as HTMLElement).closest(".infinite-canvas-wrapper");
    let currentCanvasMouseX = start.x;
    let currentCanvasMouseY = start.y;

    if (canvas) {
      const rectCanvas = canvas.getBoundingClientRect();
      currentCanvasMouseX = (e.clientX - rectCanvas.left - pan.x) / zoom;
      currentCanvasMouseY = (e.clientY - rectCanvas.top - pan.y) / zoom;
    }

    setConnectingFrom({
      sourceNodeId,
      choiceId,
      choiceIndex,
      startX: start.x,
      startY: start.y
    });
    setConnectingMousePos({ x: currentCanvasMouseX, y: currentCanvasMouseY });
  };

  const handleDropConnection = (targetNodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!connectingFrom) return;

    const sourceNode = nodes.find((n) => n.id === connectingFrom.sourceNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
      setConnectingFrom(null);
      setConnectingMousePos(null);
      setHoveredTargetNodeId(null);
      return;
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== connectingFrom.sourceNodeId) return n;
        if (connectingFrom.choiceId) {
          const updatedChoices = (n.choices || []).map((c: any) =>
            c.id === connectingFrom.choiceId ? { ...c, targetNode: targetNodeId } : c
          );
          return { ...n, choices: updatedChoices };
        } else {
          return { ...n, outputPort: targetNodeId };
        }
      })
    );

    pushHistory(nodes);
    setToastMsg(`✓ Flow Connected: "${sourceNode.title}" ➔ "${targetNode.title}"`);
    setTimeout(() => setToastMsg(null), 3000);

    setConnectingFrom(null);
    setConnectingMousePos(null);
    setHoveredTargetNodeId(null);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (connectingFrom) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mx = (e.clientX - rect.left - pan.x) / zoom;
      const my = (e.clientY - rect.top - pan.y) / zoom;
      setConnectingMousePos({ x: mx, y: my });
      return;
    }

    if (!draggingNodeId) return;
    const newX = (e.clientX - dragOffset.x - pan.x) / zoom;
    const newY = (e.clientY - dragOffset.y - pan.y) / zoom;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(10, newX), y: Math.max(10, newY) } : n))
    );
  };

  const handleMouseUpCanvas = (e: React.MouseEvent) => {
    setIsPanning(false);

    if (connectingFrom) {
      setConnectingFrom(null);
      setConnectingMousePos(null);
      setHoveredTargetNodeId(null);
    }

    if (draggingNodeId) {
      const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
      if (dist < 4) {
        setSelectedNodeId(draggingNodeId);
      }
      pushHistory(nodes);
    }
    setDraggingNodeId(null);
  };

  const handleWheelCanvas = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoom((prev) => Math.min(1.5, Math.max(0.3, prev + zoomDelta)));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8
      }));
    }
  };

  const handleDeleteSelectedNodes = () => {
    const idsToDelete = new Set<string>();
    if (selectedNodeId) idsToDelete.add(selectedNodeId);
    selectedNodeIds.forEach((id) => idsToDelete.add(id));

    if (idsToDelete.size === 0) return;

    const count = idsToDelete.size;
    const updated = nodes
      .filter((n) => !idsToDelete.has(n.id))
      .map((n) => {
        let outputPort = n.outputPort;
        if (outputPort && idsToDelete.has(outputPort)) {
          outputPort = null;
        }
        let choices = n.choices;
        if (Array.isArray(choices)) {
          choices = choices.map((c: any) =>
            c.targetNode && idsToDelete.has(c.targetNode) ? { ...c, targetNode: null } : c
          );
        }
        return { ...n, outputPort, choices };
      });

    setNodes(updated);
    pushHistory(updated);
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setIsDrawerOpen(false);
    setToastMsg(`✓ Deleted ${count} block(s) / workflow!`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleDeleteNode = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = nodes
      .filter((n) => n.id !== id)
      .map((n) => {
        let outputPort = n.outputPort === id ? null : n.outputPort;
        let choices = n.choices;
        if (Array.isArray(choices)) {
          choices = choices.map((c: any) => (c.targetNode === id ? { ...c, targetNode: null } : c));
        }
        return { ...n, outputPort, choices };
      });

    setNodes(updated);
    pushHistory(updated);
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setIsDrawerOpen(false);
    }
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setToastMsg("✓ Block deleted successfully!");
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handlePasteWorkflow = async () => {
    try {
      let sourceData: any[] = [];
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim().startsWith("[")) {
          const parsed = JSON.parse(clipText);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
            sourceData = parsed;
          }
        } else if (clipText && clipText.trim().startsWith("{")) {
          const parsed = JSON.parse(clipText);
          if (Array.isArray(parsed.nodes)) {
            sourceData = parsed.nodes;
          }
        }
      } catch (_) {}

      if (sourceData.length === 0 && copiedNodesBuffer.length > 0) {
        sourceData = copiedNodesBuffer;
      }

      if (sourceData.length === 0) {
        setToastMsg("⚠️ Clipboard is empty or contains invalid node JSON.");
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }

      const idMap: { [key: string]: string } = {};
      const now = Date.now();
      sourceData.forEach((node, idx) => {
        idMap[node.id] = `node_${now}_${idx}_${Math.floor(Math.random() * 1000)}`;
      });

      const pastedNodes = sourceData.map((node) => {
        const newId = idMap[node.id];
        let newOutputPort = node.outputPort;
        if (newOutputPort && idMap[newOutputPort]) {
          newOutputPort = idMap[newOutputPort];
        } else if (newOutputPort && !nodes.some((existing) => existing.id === newOutputPort)) {
          newOutputPort = null;
        }

        let newChoices = node.choices;
        if (Array.isArray(newChoices)) {
          newChoices = newChoices.map((choice: any) => {
            let newTarget = choice.targetNode;
            if (newTarget && idMap[newTarget]) {
              newTarget = idMap[newTarget];
            } else if (newTarget && !nodes.some((existing) => existing.id === newTarget)) {
              newTarget = null;
            }
            return { ...choice, targetNode: newTarget };
          });
        }

        return {
          ...node,
          id: newId,
          x: (node.x || 100) + 40,
          y: (node.y || 100) + 40,
          outputPort: newOutputPort,
          choices: newChoices
        };
      });

      const updated = [...nodes, ...pastedNodes];
      setNodes(updated);
      pushHistory(updated);

      const newSelectedIds = new Set(pastedNodes.map((n) => n.id));
      setSelectedNodeIds(newSelectedIds);
      if (pastedNodes.length > 0) {
        setSelectedNodeId(pastedNodes[0].id);
      }

      setToastMsg(`✓ Pasted ${pastedNodes.length} block(s) into workflow!`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      console.error("Paste error:", e);
      setToastMsg("❌ Failed to paste workflow JSON.");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest("input") ||
          target.closest("textarea"));

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + A -> Select All Nodes on Canvas
      if (isCtrl && (e.key === "a" || e.key === "A")) {
        if (!isInput) {
          e.preventDefault();
          const allIds = new Set(nodes.map((n) => n.id));
          setSelectedNodeIds(allIds);
          if (nodes.length > 0) {
            setSelectedNodeId(nodes[0].id);
          }
          setToastMsg(`✓ Selected all ${nodes.length} nodes!`);
          setTimeout(() => setToastMsg(null), 2000);
        }
        return;
      }

      // Ctrl + C -> Copy Selected Nodes
      if (isCtrl && (e.key === "c" || e.key === "C")) {
        if (!isInput) {
          e.preventDefault();
          let nodesToCopy = nodes.filter((n) => selectedNodeIds.has(n.id) || selectedNodeId === n.id);
          if (nodesToCopy.length === 0) {
            nodesToCopy = nodes;
          }
          const jsonStr = JSON.stringify(nodesToCopy, null, 2);
          setCopiedNodesBuffer(nodesToCopy);
          navigator.clipboard.writeText(jsonStr).catch(() => {});
          setToastMsg(`✓ Copied ${nodesToCopy.length} node(s) to clipboard!`);
          setTimeout(() => setToastMsg(null), 2500);
        }
        return;
      }

      // Ctrl + V -> Paste Nodes
      if (isCtrl && (e.key === "v" || e.key === "V")) {
        if (!isInput) {
          e.preventDefault();
          handlePasteWorkflow();
        }
        return;
      }

      // Delete / Backspace -> Delete Selected Nodes
      if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        e.preventDefault();
        handleDeleteSelectedNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, selectedNodeId, selectedNodeIds, copiedNodesBuffer]);

  const handleDuplicateNode = (node: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      ...node,
      id: newNodeId,
      title: `${node.title} (Copy)`,
      x: node.x + 40,
      y: node.y + 40
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    pushHistory(updated);
    setSelectedNodeId(newNodeId);
  };

  const handleFitAllNodesToScreen = () => {
    setZoom(0.65);
    setPan({ x: 0, y: 0 });
  };

  const getBezierPath = (sourceNode: any, targetNode: any, optionIndex?: number) => {
    if (!sourceNode || !targetNode) return "";
    
    let startFallback = { x: sourceNode.x + 260, y: sourceNode.y + 40 };
    let portId = `port-out-${sourceNode.id}`;
    if (typeof optionIndex === "number" && sourceNode.choices && sourceNode.choices[optionIndex]) {
      const choice = sourceNode.choices[optionIndex];
      startFallback = { x: sourceNode.x + 255, y: sourceNode.y + 140 + optionIndex * 30 };
      portId = `port-out-${sourceNode.id}-${choice.id}`;
    }

    const start = getPortCoords(portId, startFallback);

    const endFallback = { x: targetNode.x, y: targetNode.y + 40 };
    const endPortId = `port-in-${targetNode.id}`;
    const end = getPortCoords(endPortId, endFallback);

    const controlDist = Math.max(60, Math.abs(end.x - start.x) * 0.5);
    const cx1 = start.x + controlDist;
    const cx2 = end.x - controlDist;

    return `M ${start.x} ${start.y} C ${cx1} ${start.y}, ${cx2} ${end.y}, ${end.x} ${end.y}`;
  };

  const getBezierFromTo = (startX: number, startY: number, endX: number, endY: number) => {
    const controlDist = Math.max(60, Math.abs(endX - startX) * 0.5);
    const cx1 = startX + controlDist;
    const cx2 = endX - controlDist;
    return `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`;
  };

  const handleStartSimTest = () => {
    const startNode = nodes.find((n) => n.type === "CHOICE" || n.type === "START") || nodes[0];
    setSimMessages([
      {
        sender: "bot",
        text: startNode?.text || "Welcome to WhatsApp Assistant!",
        imageUrl: startNode?.imageUrl,
        choices: startNode?.choices || []
      }
    ]);
    setShowSimModal(true);
  };

  const handleSimChoiceSelect = (choice: any) => {
    const userMsg = { sender: "user", text: choice.text };
    const targetNode = nodes.find((n) => n.id === choice.targetNode);

    let botReplyMsg = null;
    if (targetNode) {
      if (targetNode.type.startsWith("CRM") && targetNode.outputPort) {
        const nextEndNode = nodes.find((n) => n.id === targetNode.outputPort);
        botReplyMsg = {
          sender: "bot",
          text: (targetNode.text ? `[CRM Log]: ${targetNode.text}\n\n` : "") + (nextEndNode?.text || "Thank you for reaching out!"),
          buttonText: nextEndNode?.buttonText
        };
      } else {
        botReplyMsg = {
          sender: "bot",
          text: targetNode.text || targetNode.title,
          buttonText: targetNode.buttonText
        };
      }
    } else {
      botReplyMsg = {
        sender: "bot",
        text: "Thank you! Our executive will contact you shortly regarding your request."
      };
    }

    setSimMessages((prev) => [...prev, userMsg, botReplyMsg]);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const hasUnsavedChanges = 
    currentFlowId !== null && 
    (lastSavedNodesJson !== JSON.stringify(nodes) ||
     lastSavedFlowName !== flowName ||
     lastSavedTriggerKeyword !== triggerKeyword ||
     lastSavedIsBotActive !== isBotActive);

  return (
    <div className={`studio-container ${isFullScreenStudio ? "fullscreen-studio" : ""}`}>
      {/* SILENT LOADING PROGRESS BAR */}
      {isLoadingFlows && (
        <div className="shopify-progress-bar" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5px", background: "linear-gradient(90deg, #6d28d9, #a78bfa, #6d28d9)", backgroundSize: "200% 100%", animation: "shopify-progress-loading 1.2s infinite linear", zIndex: 9999 }} />
      )}

      {/* SHOPIFY-STYLE FLOATING SAVE BANNER */}
      {hasUnsavedChanges && (
        <div className="shopify-save-banner" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 28px",
          background: "#1e1b4b",
          color: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.15)",
          position: "fixed",
          top: "84px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "92%",
          maxWidth: "680px",
          zIndex: 1000,
          border: "1px solid #312e81"
        }}>
          <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#e0e7ff" }}>
            ⚠️ Unsaved changes in "${flowName}"
          </span>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              className="studio-btn" 
              onClick={handleDiscardChanges} 
              style={{ background: "rgba(255, 255, 255, 0.1)", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "7px 16px", cursor: "pointer", borderRadius: "8px", fontSize: "12.5px" }}
            >
              Discard
            </button>
            <button 
              className="studio-btn primary" 
              onClick={() => handleSaveFlowWithStatus(isBotActive)} 
              disabled={isSaving}
              style={{ padding: "7px 20px", cursor: "pointer", borderRadius: "8px", fontSize: "12.5px" }}
            >
              {isSaving ? "Saving..." : "Save Flow"}
            </button>
          </div>
        </div>
      )}


      {/* TOP CONTROL BAR */}
      <div className="studio-top-bar">
        <div className="studio-title-block">
          <Bot size={22} color="#10b981" />
          <select
            className="bot-selector-dropdown"
            value={currentFlowId || ""}
            onChange={(e) => handleSelectFlow(e.target.value)}
            disabled={savedFlows.length === 0}
          >
            {savedFlows.length > 0 ? (
              savedFlows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.isActive ? "🟢 (Live)" : "⚪ (Draft)"}
                </option>
              ))
            ) : (
              <option value="">No Active Chatbot</option>
            )}
          </select>

          <span className={`flow-status-pill ${isBotActive ? "" : "draft"}`} style={{ background: isBotActive ? "#dcfce7" : "#f1f5f9", color: isBotActive ? "#15803d" : "#64748b" }}>
            {isBotActive ? "ACTIVE LIVE" : "DRAFT"}
          </span>

          <span className="flow-meta-sub">
            {nodes.length} steps · DB Synced
          </span>
        </div>

        <div className="studio-actions-group">
          <button className="studio-btn primary" onClick={() => setShowCreateModal(true)} title="Create New Chatbot">
            <Plus size={15} /> ＋ New Chatbot
          </button>

          <button className="studio-btn" onClick={handleDuplicateCurrentBot} disabled={!currentFlowId} title="Duplicate Current Chatbot">
            <Copy size={14} /> Duplicate
          </button>

          <button className="studio-btn" onClick={() => jsonFileInputRef.current?.click()} title="Import Chatbot Flow from JSON file">
            <Layers size={14} /> Import JSON
          </button>

          <button className="studio-btn" onClick={handleExportJsonFlow} disabled={nodes.length === 0} title="Export Current Chatbot Flow as JSON file">
            <Layers size={14} style={{ transform: "rotate(180deg)" }} /> Export JSON
          </button>

          <button className="studio-btn" onClick={handleCopyJsonFlow} disabled={nodes.length === 0} title="Copy Current Chatbot Flow as JSON">
            <Copy size={14} /> Copy JSON
          </button>

          <input
            type="file"
            ref={jsonFileInputRef}
            style={{ display: "none" }}
            accept=".json"
            onChange={handleImportJsonFlow}
          />

          <button className="studio-btn" onClick={() => setShowManageModal(true)} title="Manage All Chatbots">
            <FolderOpen size={14} /> All Bots ({savedFlows.length})
          </button>

          <button className="studio-btn danger" onClick={() => setShowDeleteModal(true)} disabled={!currentFlowId} title="Delete Current Chatbot">
            <Trash2 size={14} /> Delete Bot
          </button>

          <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 4px" }} />

          <button className="circular-history-btn" onClick={handleUndo} title="Undo"><RotateCcw size={15} /></button>
          <button className="circular-history-btn" onClick={handleRedo} title="Redo"><RotateCw size={15} /></button>

          <button
            className="studio-btn fullscreen-btn"
            onClick={() => setIsFullScreenStudio(!isFullScreenStudio)}
            title="Toggle Full Screen Studio Mode"
          >
            {isFullScreenStudio ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button className="studio-btn test-btn" onClick={handleStartSimTest} disabled={nodes.length === 0}>
            <Play size={14} /> Preview & Test
          </button>

          <button className="studio-btn" onClick={handleRunValidation} disabled={nodes.length === 0} style={{ background: "#475569", color: "white" }}>
            <ShieldCheck size={14} /> Validate Flow
          </button>

          <button 
            className="studio-btn" 
            style={{ background: "#64748b", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }} 
            onClick={() => handleSaveFlowWithStatus(false)} 
            disabled={isSaving || nodes.length === 0}
          >
            <FileText size={14} /> Save as Draft
          </button>

          <button 
            className="studio-btn primary" 
            onClick={() => handleSaveFlowWithStatus(true)} 
            disabled={isSaving || nodes.length === 0}
          >
            <CheckCircle2 size={14} /> Publish Flow
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: "#dcfce7", borderBottom: "1px solid #86efac", color: "#166534", padding: "8px 16px", fontSize: "12.5px", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: "16px" }}>×</button>
        </div>
      )}

      {/* STUDIO MAIN BODY */}
      <div className="studio-body">
        {/* LEFT SIDEBAR: BLOCK LIBRARY */}
        <div className={`block-library-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className="library-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="library-title">Block Library</span>
              <button className="panel-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                {isSidebarCollapsed ? <ChevronRight size={16} /> : <X size={16} />}
              </button>
            </div>

            {!isSidebarCollapsed && (
              <div className="library-search-box" style={{ marginTop: "6px" }}>
                <input
                  type="text"
                  placeholder="Search blocks..."
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <div className="library-scroll-area">
              {blockCategories.map((cat) => {
                const isOpen = openCategories[cat.name] ?? false;
                const filteredBlocks = cat.blocks.filter((b) =>
                  b.name.toLowerCase().includes(blockSearch.toLowerCase())
                );
                if (blockSearch && filteredBlocks.length === 0) return null;

                return (
                  <div key={cat.name} className="category-accordion">
                    <div className="category-header-row" onClick={() => toggleCategory(cat.name)}>
                      <span>{cat.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="category-badge">{cat.count}</span>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="category-blocks-grid">
                        {filteredBlocks.map((b) => {
                          const Icon = b.icon;
                          return (
                            <div
                              key={b.id}
                              className="block-tile"
                              onClick={() => handleAddBlockToCanvas(b)}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", b.id);
                              }}
                              style={{ cursor: "grab" }}
                            >
                              <Icon size={18} color="#10b981" />
                              <span>{b.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER INFINITE CANVAS */}
        <div
          className={`infinite-canvas-wrapper ${isPanning ? "panning" : ""}`}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          onWheel={handleWheelCanvas}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const blockId = e.dataTransfer.getData("text/plain");
            if (!blockId) return;

            // Find the block config
            let targetBlock: any = null;
            for (const cat of blockCategories) {
              const found = cat.blocks.find(b => b.id === blockId);
              if (found) {
                targetBlock = found;
                break;
              }
            }
            if (!targetBlock) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const dropX = (e.clientX - rect.left - pan.x) / zoom;
            const dropY = (e.clientY - rect.top - pan.y) / zoom;

            handleAddBlockToCanvas(targetBlock, dropX, dropY);
          }}
          style={{ cursor: isPanning ? "grabbing" : "grab", position: "relative" }}
        >
          {/* EMPTY STATE BANNER WHEN ALL BOTS ARE DELETED */}
          {nodes.length === 0 && !isLoadingFlows && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10, background: "#ffffff", padding: "36px 44px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", maxWidth: "420px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                <Bot size={28} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>No Chatbots Created</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                You currently have no chatbot flows. Create your first chatbot from scratch or select a pre-built WATI / Galabox template!
              </p>
              <button className="studio-btn primary" style={{ padding: "10px 20px", fontSize: "13.5px", margin: "0 auto" }} onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> ＋ Create First Chatbot
              </button>
            </div>
          )}

          {/* PAN-ZOOM INNER CONTAINER */}
          <div
            className="canvas-pan-zoom-container"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0"
            }}
          >
            {/* SVG CONNECTOR WIRES LAYER */}
            <svg className="canvas-svg-layer" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {nodes.flatMap((node) => {
                const paths: React.ReactNode[] = [];

                if (node.outputPort) {
                  const target = nodes.find((n) => n.id === node.outputPort);
                  if (target) {
                    paths.push(
                      <path
                        key={`wire_out_${node.id}_${target.id}`}
                        d={getBezierPath(node, target)}
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                    );
                  }
                }

                if (node.choices && Array.isArray(node.choices)) {
                  node.choices.forEach((c: any, idx: number) => {
                    if (c.targetNode) {
                      const targetChoiceNode = nodes.find((n) => n.id === c.targetNode);
                      if (targetChoiceNode) {
                        paths.push(
                          <path
                            key={`wire_choice_${node.id}_${c.id}_${targetChoiceNode.id}`}
                            d={getBezierPath(node, targetChoiceNode, idx)}
                            className="active-path"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                          />
                        );
                      }
                    }
                  });
                }

                return paths;
              })}

              {connectingFrom && connectingMousePos && (
                <path
                  d={getBezierFromTo(connectingFrom.startX, connectingFrom.startY, connectingMousePos.x, connectingMousePos.y)}
                  className="connecting-active-wire"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
              )}
            </svg>

            {/* CONNECTION DELETE BUTTONS */}
            {nodes.map((node) => {
              const buttons: React.ReactNode[] = [];

              if (node.outputPort) {
                const target = nodes.find((n) => n.id === node.outputPort);
                if (target) {
                  const startFallback = { x: node.x + 260, y: node.y + 40 };
                  const start = portCoords[`port-out-${node.id}`] || startFallback;
                  const endFallback = { x: target.x, y: target.y + 40 };
                  const end = portCoords[`port-in-${target.id}`] || endFallback;
                  const midX = (start.x + end.x) / 2;
                  const midY = (start.y + end.y) / 2;

                  buttons.push(
                    <div
                      key={`del_${node.id}_${target.id}`}
                      style={{
                        position: "absolute",
                        left: `${midX}px`,
                        top: `${midY}px`,
                        transform: "translate(-50%, -50%)",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#ef4444",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        fontSize: "12px",
                        fontWeight: "bold",
                        zIndex: 10,
                        border: "1px solid #ffffff",
                        userSelect: "none"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(node.id, target.id);
                      }}
                      title="Delete connection"
                    >
                      ×
                    </div>
                  );
                }
              }

              if (node.choices && Array.isArray(node.choices)) {
                node.choices.forEach((c: any, idx: number) => {
                  if (c.targetNode) {
                    const target = nodes.find((n) => n.id === c.targetNode);
                    if (target) {
                      const startFallback = { x: node.x + 255, y: node.y + 140 + idx * 30 };
                      const start = portCoords[`port-out-${node.id}-${c.id}`] || startFallback;
                      const endFallback = { x: target.x, y: target.y + 40 };
                      const end = portCoords[`port-in-${target.id}`] || endFallback;
                      const midX = (start.x + end.x) / 2;
                      const midY = (start.y + end.y) / 2;

                      buttons.push(
                        <div
                          key={`del_${node.id}_${c.id}_${target.id}`}
                          style={{
                            position: "absolute",
                            left: `${midX}px`,
                            top: `${midY}px`,
                            transform: "translate(-50%, -50%)",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            fontSize: "12px",
                            fontWeight: "bold",
                            zIndex: 10,
                            border: "1px solid #ffffff",
                            userSelect: "none"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConnection(node.id, target.id, c.id);
                          }}
                          title="Delete connection"
                        >
                          ×
                        </div>
                      );
                    }
                  }
                });
              }

              return buttons;
            })}

            {/* RICH NODE CARDS ON CANVAS */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnectingHover = hoveredTargetNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={`canvas-node-card ${isSelected ? "selected" : ""} ${isConnectingHover ? "connecting-target-hover" : ""}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`
                  }}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onMouseUp={(e) => {
                    if (connectingFrom) {
                      handleDropConnection(node.id, e);
                    }
                  }}
                  onMouseEnter={() => {
                    if (connectingFrom && connectingFrom.sourceNodeId !== node.id) {
                      setHoveredTargetNodeId(node.id);
                    }
                  }}
                  onMouseLeave={() => setHoveredTargetNodeId(null)}
                >
                  <div className={`node-card-header ${node.category || 'choice'}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <GripVertical size={13} style={{ opacity: 0.7 }} />
                      <span>{node.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span
                        title="Edit Node Settings"
                        onClick={(e) => handleOpenNodeSettings(node.id, e)}
                        style={{ cursor: "pointer", display: "inline-flex", background: "rgba(255,255,255,0.2)", padding: "3px", borderRadius: "4px" }}
                      >
                        <Settings size={12} />
                      </span>
                      <span title="Duplicate Node" onClick={(e) => handleDuplicateNode(node, e)} style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Copy size={12} />
                      </span>
                      <span title="Delete Node" onClick={(e) => handleDeleteNode(node.id, e)} style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Trash2 size={12} />
                      </span>
                    </div>
                  </div>

                  <div className="node-card-body">
                    {/* TYPE-SPECIFIC VISUAL CONTENT BADGES & PREVIEWS */}
                    {node.imageUrl && (
                      <img src={node.imageUrl} alt="Banner" className="node-banner-img" onLoad={updatePortCoords} />
                    )}

                    {node.type === "VIDEO" && (
                      <div style={{ background: "#0f172a", color: "#fff", padding: "8px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Video size={14} color="#10b981" />
                        <span>Video: {node.videoUrl || 'Video media'}</span>
                      </div>
                    )}

                    {node.type === "FILE" && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <FileText size={14} color="#3b82f6" />
                        <strong>{node.filename || 'Document.pdf'}</strong>
                      </div>
                    )}

                    {node.type === "LOCATION" && (
                      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <MapPin size={14} color="#d97706" />
                        <span>{node.locationName || 'Send Location'}</span>
                      </div>
                    )}

                    {node.type === "CONTACT" && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <User size={14} color="#16a34a" />
                        <span>{node.contactName} ({node.contactPhone})</span>
                      </div>
                    )}

                    {node.type.startsWith("PAY_") && (
                      <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <CreditCard size={14} />
                        <span>Amount: ₹{node.amount || 0}</span>
                      </div>
                    )}

                    {((node.type || "").toUpperCase() === "META_CTWA_AD" || (node.title || "").toLowerCase().includes("ctwa ad")) && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Sparkles size={13} />
                          <span>Sync CTWA Ad ID & Campaign</span>
                        </div>
                      </div>
                    )}

                    {((node.type || "").toUpperCase() === "META_CUSTOM_AUDIENCE" || (node.title || "").toLowerCase().includes("meta audience")) && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Users size={13} />
                          <span>Audience: {node.audienceName || node.existingAudienceId || 'WhatsApp Buyers'}</span>
                        </div>
                      </div>
                    )}

                    {((node.type || "").toUpperCase() === "META_TEMPLATE" || (node.title || "").toLowerCase().includes("meta template")) && (
                      <div style={{ background: "#fdf4ff", border: "1px solid #f5d0fe", color: "#86198f", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Bot size={13} />
                          <span>Template: {node.templateName || 'order_confirmation'}</span>
                        </div>
                      </div>
                    )}

                    {(node.type === "CRM_CONTACT" || node.type === "CRM_LEAD" || (node.type || "").toUpperCase() === "META_CAPI" || (node.title || "").toLowerCase().includes("meta capi")) && (
                      <div style={{ background: "#e0e7ff", border: "1px solid #c7d2fe", color: "#3730a3", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {node.type === "META_CAPI" ? <Target size={13} /> : <UserCheck size={13} />}
                          <span>{node.type === "META_CAPI" ? `Event: ${node.eventName || 'Lead'}` : `Stage: ${node.leadStage || 'Qualified'}`}</span>
                        </div>
                      </div>
                    )}

                    {(node.type === "CRM_ROUNDROBIN" || node.type === "START") && (
                      <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#5b21b6", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Shuffle size={13} />
                          <span>Assign: {
                            node.assignmentMode === 'DIRECT' && node.agentId
                              ? (availableAgents.find((a: any) => a.id === node.agentId)?.user?.name || 'Agent')
                              : (
                                  (node.assignmentMode !== 'DIRECT' && node.roundRobinTarget === 'TEAM' && node.teamId)
                                    ? `Team: ${availableTeams.find((t: any) => t.id === node.teamId)?.name || 'Unknown'}`
                                    : (node.assignmentMode !== 'DIRECT' && node.roundRobinTarget === 'AGENTS' && node.agentIds?.length > 0)
                                      ? `${node.agentIds.length} Agents`
                                      : 'Auto (Round Robin)'
                                ) + (node.assignmentMode !== 'DIRECT' ? (node.distributionMethod === 'EQUAL_DISTRIBUTION' ? ' • Equal' : ' • Workload') : '')
                          }</span>
                        </div>
                      </div>
                    )}

                    {node.type === "CONDITION" && (
                      <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", color: "#9a3412", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <GitBranch size={13} style={{ marginBottom: "2px" }} />
                        <div>If <strong>{node.variableName || 'var'}</strong> {node.operator || 'EQUALS'} "{node.compareValue || ''}"</div>
                      </div>
                    )}

                    {node.type === "DELAY" && (
                      <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Clock size={14} color="#64748b" />
                        <span>Delay: {node.delayValue || 5} {node.delayUnit || 'MINUTES'}</span>
                      </div>
                    )}

                    {node.type === "SET_VAR" && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <Sliders size={13} style={{ marginRight: "4px" }} />
                        <span>Set <strong>{node.variableName || 'variable'}</strong> = "{node.variableValue || ''}"</span>
                      </div>
                    )}

                    {node.type === "SPLIT_TEST" && (
                      <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", color: "#6b21a8", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <Shuffle size={13} style={{ marginRight: "4px" }} />
                        <span>A/B Split: {node.splitRatio || '50/50'}</span>
                      </div>
                    )}

                    {node.type === "JUMP" && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <CornerDownRight size={13} style={{ marginRight: "4px" }} />
                        <span>Jump to: {node.targetNodeId ? nodes.find((n: any) => n.id === node.targetNodeId)?.title || node.targetNodeId : 'Not set'}</span>
                      </div>
                    )}

                    {node.type === "WEBHOOK" && (
                      <div style={{ background: "#fdf4ff", border: "1px solid #f5d0fe", color: "#86198f", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <Globe size={13} />
                        <div><strong>{node.method || 'POST'}</strong> {node.webhookUrl || 'API URL'}</div>
                      </div>
                    )}

                    {node.type === "AI_BOT" && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <Bot size={13} />
                        <div>AI Confidence Threshold: {node.confidenceThreshold || 85}%</div>
                      </div>
                    )}

                    {node.text && <p className="node-text-preview">{node.text}</p>}

                    {/* CHOICES LIST */}
                    {node.choices && (
                      <div className="node-choices-list" onMouseDown={(e) => e.stopPropagation()}>
                        {node.choices.map((c: any, cIdx: number) => {
                          const isLimitExceeded = (c.text || "").length >= 20;
                          return (
                            <div
                              key={c.id}
                              className="node-choice-item"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                border: isLimitExceeded ? "1px solid #ef4444" : undefined, 
                                position: "relative",
                                background: isLimitExceeded ? "#fef2f2" : undefined
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                                <span className="choice-drag-dots">::</span>
                                <span className="choice-num-badge">{cIdx + 1}</span>
                                <input
                                  type="text"
                                  value={c.text}
                                  maxLength={20}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateOptionText(node.id, c.id, e.target.value)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "11.5px",
                                    fontWeight: 600,
                                    color: isLimitExceeded ? "#991b1b" : "#334155",
                                    width: "100%",
                                    outline: "none"
                                  }}
                                />
                              </div>

                              <span
                                title="Delete Option"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => handleDeleteOptionFromNode(node.id, c.id, e)}
                                style={{ cursor: "pointer", color: isLimitExceeded ? "#ef4444" : "#94a3b8", display: "inline-flex", padding: "2px" }}
                              >
                                <Trash2 size={11} />
                              </span>

                              {isLimitExceeded && (
                                <span style={{
                                  position: "absolute",
                                  right: "26px",
                                  top: "-8px",
                                  background: "#ef4444",
                                  color: "#ffffff",
                                  fontSize: "8px",
                                  padding: "1px 4px",
                                  borderRadius: "4px",
                                  fontWeight: 800,
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                                  pointerEvents: "none"
                                }}>
                                  MAX CHARS!
                                </span>
                              )}

                              <span
                                id={`port-out-${node.id}-${c.id}`}
                                className="choice-option-port"
                                title="Click & Drag to connect this option to a node"
                                onMouseDown={(e) => handleStartConnectWire(e, node.id, c.id, cIdx)}
                              />
                            </div>
                          );
                        })}

                        <button
                          className="add-card-option-btn"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleAddOptionToNode(node.id, e)}
                        >
                          <span>+ Add option</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {node.type !== "TRIGGER" && (
                    <span
                      id={`port-in-${node.id}`}
                      className="node-input-port"
                      title="Drop connection here to link to this node"
                      onMouseUp={(e) => handleDropConnection(node.id, e)}
                    />
                  )}

                  {node.type !== "END" && (
                    <span
                      id={`port-out-${node.id}`}
                      className="node-output-port"
                      title="Click & Drag to connect to next node"
                      onMouseDown={(e) => handleStartConnectWire(e, node.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* CANVAS CONTROLS */}
          <div className="canvas-zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(Math.min(1.4, zoom + 0.1))} title="Zoom In"><ZoomIn size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} title="Zoom Out"><ZoomOut size={16} /></button>
            <button className="zoom-btn" onClick={() => setPan({ x: 0, y: 0 })} title="Reset Center Pan">
              <Hand size={16} color={pan.x !== 0 || pan.y !== 0 ? "#10b981" : "#475569"} />
            </button>
            <button className="zoom-btn" onClick={handleFitAllNodesToScreen} title="Fit All Blocks"><Focus size={16} color="#3b82f6" /></button>
          </div>
        </div>

        {/* RICH TYPE-SPECIFIC PROPERTY EDITOR DRAWER */}
        {selectedNode && isDrawerOpen && (
          <div className="node-editor-drawer">
            <div className="drawer-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Settings size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {selectedNode.title}
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                    Configure block parameters & logic connections.
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="drawer-tabs-bar">
              <button
                className={`drawer-tab-btn ${drawerTab === "basic" ? "active" : ""}`}
                onClick={() => setDrawerTab("basic")}
              >
                Basic Settings
              </button>
              <button
                className={`drawer-tab-btn ${drawerTab === "advanced" ? "active" : ""}`}
                onClick={() => setDrawerTab("advanced")}
              >
                Advanced Logic
              </button>
            </div>

            <div className="drawer-section-block">
              <span className="drawer-section-title">BLOCK CONFIGURATION</span>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Block Title</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) =>
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, title: e.target.value } : n)))
                    }
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>

                {/* --- META CAPI EVENT PANEL (TOP OF DRAWER) --- */}
                {((selectedNode.type || "").toUpperCase() === "META_CAPI" || (selectedNode.type || "").toLowerCase() === "meta_capi" || (selectedNode.title || "").toLowerCase().includes("meta capi")) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "10px", padding: "14px", marginTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Target size={16} style={{ color: "#2563eb" }} />
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>Meta CAPI Event Configuration</span>
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Select Meta CAPI Event to Fire</label>
                      <select
                        value={selectedNode.eventName || "Lead"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, eventName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff", fontWeight: 700 }}
                      >
                        <option value="Lead">🎯 Lead (CTWA Lead Conversion)</option>
                        <option value="Purchase">💰 Purchase (Order Placed)</option>
                        <option value="Contact">💬 Contact (New Inquiry)</option>
                        <option value="SubmitApplication">📝 Submit Application</option>
                        <option value="Schedule">📅 Schedule Appointment</option>
                        <option value="CompleteRegistration">✅ Complete Registration</option>
                        <option value="AddToCart">🛒 Add To Cart</option>
                        <option value="ViewContent">👁️ View Content / Catalog</option>
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Event Currency</label>
                        <select
                          value={selectedNode.currency || "INR"}
                          onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, currency: e.target.value } : n)))}
                          style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Event Value (Optional)</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          value={selectedNode.eventValue || ""}
                          onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, eventValue: parseFloat(e.target.value) || 0 } : n)))}
                          style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Meta Integration (Pixel & Token)</label>
                      <select
                        value={selectedNode.integrationId || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, integrationId: e.target.value } : n)))}
                        style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="">-- Select Meta Integration --</option>
                        {integrations.filter(i => i.type === "META_CAPI").map(int => (
                          <option key={int.id} value={int.id}>{int.name} (Pixel: {int.url})</option>
                        ))}
                      </select>
                      <div style={{ marginTop: "6px" }}>
                        <a
                          href="/whatsapp/integrations"
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          + Add or Manage Meta Pixel Credentials in Integrations ↗
                        </a>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Meta Test Event Code (For Real-Time Testing)</label>
                      <input
                        type="text"
                        placeholder="e.g. TEST12345"
                        value={selectedNode.testEventCode || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, testEventCode: e.target.value } : n)))}
                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", fontFamily: "monospace" }}
                      />
                      <p style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                        Copy from <strong>Meta Events Manager → Test Events tab</strong> to see instant live hits.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setToastMsg("⚡ Sending Test Event to Meta Pixel...");
                        try {
                          const res = await fetch("/api/whatsapp/test-meta-capi", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              integrationId: selectedNode.integrationId,
                              eventName: selectedNode.eventName || "Lead",
                              testEventCode: selectedNode.testEventCode
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert(`✅ VERIFIED WITH META!\n\n${data.message}\nPixel ID: ${data.pixelId}\nEvent: ${data.eventName}\nTrace ID: ${data.fbtraceId || 'N/A'}`);
                            setToastMsg("✓ Meta Event verified successfully!");
                          } else {
                            alert(`❌ META TEST ERROR:\n\n${data.error}`);
                            setToastMsg(`Error: ${data.error}`);
                          }
                        } catch (e: any) {
                          alert(`❌ Network Error: ${e.message}`);
                        }
                        setTimeout(() => setToastMsg(null), 4000);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "12.5px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        marginTop: "4px"
                      }}
                    >
                      ⚡ Test & Verify Event Fire to Meta Now
                    </button>
                  </div>
                )}

                {/* --- META CTWA AD ATTRIBUTION PANEL (TOP OF DRAWER) --- */}
                {((selectedNode.type || "").toUpperCase() === "META_CTWA_AD" || (selectedNode.title || "").toLowerCase().includes("ctwa ad")) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "10px", padding: "14px", marginTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={16} style={{ color: "#166534" }} />
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#14532d" }}>CTWA Ad Attribution Settings</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#166534" }}>
                      Reads incoming referral data from Meta Click-to-WhatsApp Ads (Ad ID, Campaign Name, Headline) and binds it to conversation.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11.5px", display: "flex", alignItems: "center", gap: "6px", color: "#14532d", fontWeight: 600 }}>
                        <input type="checkbox" checked={selectedNode.captureAdId !== false} onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, captureAdId: e.target.checked } : n)))} />
                        Capture Meta Ad ID & Adset ID
                      </label>
                      <label style={{ fontSize: "11.5px", display: "flex", alignItems: "center", gap: "6px", color: "#14532d", fontWeight: 600 }}>
                        <input type="checkbox" checked={selectedNode.captureCampaignName !== false} onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, captureCampaignName: e.target.checked } : n)))} />
                        Capture Campaign Name & Source
                      </label>
                      <label style={{ fontSize: "11.5px", display: "flex", alignItems: "center", gap: "6px", color: "#14532d", fontWeight: 600 }}>
                        <input type="checkbox" checked={selectedNode.captureHeadline !== false} onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, captureHeadline: e.target.checked } : n)))} />
                        Capture Ad Headline & Image Thumbnail
                      </label>
                    </div>
                  </div>
                )}

                {/* --- META AUDIENCE SYNC PANEL (TOP OF DRAWER) --- */}
                {((selectedNode.type || "").toUpperCase() === "META_CUSTOM_AUDIENCE" || (selectedNode.title || "").toLowerCase().includes("meta audience")) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "14px", marginTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={16} style={{ color: "#1d4ed8" }} />
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#1e3a8a" }}>Meta Custom Audience Retargeting Sync</span>
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#1e3a8a" }}>Audience Action</label>
                      <select
                        value={selectedNode.audienceMode || "EXISTING"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, audienceMode: e.target.value } : n)))}
                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #93c5fd", borderRadius: "6px", marginTop: "4px", background: "#fff", fontWeight: 700 }}
                      >
                        <option value="EXISTING">🔗 Add to Existing Meta Custom Audience</option>
                        <option value="NEW">➕ Create New Meta Custom Audience</option>
                      </select>
                    </div>

                    {selectedNode.audienceMode === "NEW" ? (
                      <div>
                        <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#1e3a8a" }}>New Custom Audience Name</label>
                        <input
                          type="text"
                          placeholder="e.g. WhatsApp Wholesale Buyers 2026"
                          value={selectedNode.audienceName || ""}
                          onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, audienceName: e.target.value } : n)))}
                          style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #93c5fd", borderRadius: "6px", marginTop: "4px" }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#1e3a8a" }}>Existing Meta Custom Audience ID</label>
                        <input
                          type="text"
                          placeholder="e.g. 23859201938"
                          value={selectedNode.existingAudienceId || ""}
                          onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, existingAudienceId: e.target.value } : n)))}
                          style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #93c5fd", borderRadius: "6px", marginTop: "4px", fontFamily: "monospace" }}
                        />
                        <p style={{ fontSize: "10.5px", color: "#3b82f6", marginTop: "4px" }}>
                          Found in <strong>Meta Ads Manager → Audiences tab</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* --- META TEMPLATE PANEL (TOP OF DRAWER) --- */}
                {((selectedNode.type || "").toUpperCase() === "META_TEMPLATE" || (selectedNode.title || "").toLowerCase().includes("meta template")) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#fdf4ff", border: "1.5px solid #f5d0fe", borderRadius: "10px", padding: "14px", marginTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Bot size={16} style={{ color: "#a21caf" }} />
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#701a75" }}>Send Approved Meta WhatsApp Template</span>
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#701a75" }}>Template Name</label>
                      <input
                        type="text"
                        placeholder="e.g. order_confirmation_v2"
                        value={selectedNode.templateName || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, templateName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #f0abfc", borderRadius: "6px", marginTop: "4px", fontFamily: "monospace" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#701a75" }}>Language Code</label>
                      <input
                        type="text"
                        placeholder="en_US or hi_IN"
                        value={selectedNode.language || "en_US"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, language: e.target.value } : n)))}
                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #f0abfc", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === "TRIGGER" ? (
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Trigger Keywords (Comma Separated)</label>
                      <textarea
                        rows={3}
                        value={triggerKeyword}
                        onChange={(e) => {
                          setTriggerKeyword(e.target.value.toUpperCase());
                          setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, text: `Incoming Message matches: ${e.target.value.toUpperCase()}` } : n)));
                        }}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", resize: "none" }}
                      />
                    </div>
                  ) : (selectedNode.type !== "CRM_LEAD" && !["META_CAPI", "META_CTWA_AD", "META_CUSTOM_AUDIENCE", "META_TEMPLATE"].includes((selectedNode.type || "").toUpperCase()) && !(selectedNode.title || "").toLowerCase().includes("meta")) ? (
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Message / Description</label>
                      <textarea
                        rows={3}
                        value={selectedNode.text || ""}
                        onChange={(e) =>
                          setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, text: e.target.value } : n)))
                        }
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", resize: "none" }}
                      />
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748b" }}>Insert Variable</label>
                        <select 
                          style={{ width: "100%", padding: "4px 8px", fontSize: "11px", border: "1px dashed #cbd5e1", borderRadius: "6px", marginTop: "2px", background: "#f8fafc" }}
                          value=""
                          onChange={(e) => {
                             if (!e.target.value) return;
                             const varTag = `{{${e.target.value}}}`;
                             setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, text: (n.text || '') + varTag } : n)));
                          }}
                        >
                           <option value="">-- Select Variable --</option>
                           <option value="name">Customer Name</option>
                           <option value="businessName">Business Name</option>
                           <option value="mobile">Mobile Number</option>
                           <option value="whatsappNumber">WhatsApp Number</option>
                           <option value="email">Email</option>
                           <option value="city">City</option>
                           <option value="state">State</option>
                           <option value="tags">Tags</option>
                           <option value="leadStage">Lead Stage</option>
                           <option value="customerType">Customer Type</option>
                        </select>
                      </div>
                    </div>
                  ) : null}

                {(selectedNode.type || "").toUpperCase() === "CATALOG" && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Select Product Collection</label>
                    <select
                      value={selectedNode.categoryName || ""}
                      onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, categoryName: e.target.value } : n)))}
                      style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                    >
                      <option value="">-- All Collections --</option>
                      {availableCollections.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* TYPE-SPECIFIC CONFIGURATION FIELDS WITH DIRECT FILE UPLOADER */}
                {(selectedNode.type === "IMAGE" || selectedNode.type === "CHOICE" || selectedNode.type === "BUTTONS" || selectedNode.type === "LIST_MENU") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                      Upload Image File or Enter Image URL
                    </label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label
                        className="studio-btn primary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <ImageIcon size={14} /> Upload Image File
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const result = evt.target?.result as string;
                                setNodes((prev) =>
                                  prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: result } : n))
                                );
                                setToastMsg(`✓ Image "${file.name}" uploaded successfully!`);
                                setTimeout(() => setToastMsg(null), 3000);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {selectedNode.imageUrl && (
                        <button
                          className="studio-btn danger"
                          style={{ padding: "6px 10px", fontSize: "11.5px" }}
                          onClick={() =>
                            setNodes((prev) =>
                              prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: "" } : n))
                            )
                          }
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste image URL or CTRL+V to paste image file directly..."
                      value={selectedNode.imageUrl || ""}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: e.target.value } : n))
                        )
                      }
                      onPaste={(e) => {
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf("image") !== -1) {
                            e.preventDefault(); // Prevent pasting the filename string
                            const file = items[i].getAsFile();
                            if (!file) continue;
                            
                            if (file.size > 5 * 1024 * 1024) {
                              setToastMsg("❌ Image size must be less than 5MB");
                              setTimeout(() => setToastMsg(null), 3000);
                              return;
                            }

                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = reader.result as string;
                              setNodes((prev) =>
                                prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: result } : n))
                              );
                              setToastMsg(`✓ Image pasted successfully!`);
                              setTimeout(() => setToastMsg(null), 3000);
                            };
                            reader.readAsDataURL(file);
                            return; // Stop after first image
                          }
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px"
                      }}
                    />

                    <div>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                        Or Select Sample Product Banner:
                      </span>
                      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                        {[
                          { title: "Apparel Banner", url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500" },
                          { title: "Activewear", url: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=500" },
                          { title: "Wholesale Polo", url: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500" },
                          { title: "QR Deposit", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500" }
                        ].map((samp, idx) => (
                          <img
                            key={idx}
                            src={samp.url}
                            alt={samp.title}
                            title={samp.title}
                            onClick={() =>
                              setNodes((prev) =>
                                prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: samp.url } : n))
                              )
                            }
                            style={{
                              width: "48px",
                              height: "36px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              cursor: "pointer",
                              border: selectedNode.imageUrl === samp.url ? "2px solid #10b981" : "1px solid #cbd5e1"
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {selectedNode.imageUrl && (
                      <div style={{ marginTop: "4px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px", background: "#f8fafc" }}>
                        <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                          Live Uploaded Image Preview:
                        </span>
                        <img
                          src={selectedNode.imageUrl}
                          alt="Uploaded Preview"
                          style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "6px" }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {(selectedNode.type === "VIDEO" || selectedNode.type === "YOUTUBE") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                      Upload Video File or Enter Video URL
                    </label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label
                        className="studio-btn primary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Video size={14} /> Upload Video File
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const result = evt.target?.result as string;
                                setNodes((prev) =>
                                  prev.map((n) => (n.id === selectedNode.id ? { ...n, videoUrl: result } : n))
                                );
                                setToastMsg(`✓ Video "${file.name}" uploaded successfully!`);
                                setTimeout(() => setToastMsg(null), 3000);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste video URL (https://...)"
                      value={selectedNode.videoUrl || selectedNode.youtubeUrl || ""}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id ? { ...n, videoUrl: e.target.value, youtubeUrl: e.target.value } : n
                          )
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px"
                      }}
                    />
                  </div>
                )}

                {selectedNode.type === "FILE" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Document File Name</label>
                      <input
                        type="text"
                        value={selectedNode.filename || ""}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, filename: e.target.value } : n))
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          marginTop: "4px"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                        Upload Document File / PDF
                      </label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                        <label
                          className="studio-btn primary"
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <FileText size={14} /> Upload File / PDF
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xlsx,.zip"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const result = evt.target?.result as string;
                                  setNodes((prev) =>
                                    prev.map((n) =>
                                      n.id === selectedNode.id
                                        ? { ...n, fileUrl: result, filename: file.name }
                                        : n
                                    )
                                  );
                                  setToastMsg(`✓ Document "${file.name}" uploaded successfully!`);
                                  setTimeout(() => setToastMsg(null), 3000);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <input
                        type="text"
                        placeholder="Or paste document URL (https://...)"
                        value={selectedNode.fileUrl || ""}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, fileUrl: e.target.value } : n))
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          marginTop: "6px"
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === "LOCATION" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Location Name</label>
                      <input
                        type="text"
                        value={selectedNode.locationName || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, locationName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Address</label>
                      <input
                        type="text"
                        value={selectedNode.address || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, address: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === "LINK" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Button Text</label>
                      <input
                        type="text"
                        value={selectedNode.buttonText || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, buttonText: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Target Website URL</label>
                      <input
                        type="text"
                        value={selectedNode.url || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, url: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type.startsWith("INPUT_") && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Save Variable Name</label>
                      <input
                        type="text"
                        value={selectedNode.variableName || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, variableName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Retry Error Message</label>
                      <input
                        type="text"
                        value={selectedNode.retryMessage || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, retryMessage: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type.startsWith("PAY_") && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Payment Amount (₹)</label>
                      <input
                        type="number"
                        value={selectedNode.amount || 0}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, amount: parseFloat(e.target.value) || 0 } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>UPI ID</label>
                      <input
                        type="text"
                        value={selectedNode.upiId || "7206066678@OKBIZAXIS"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, upiId: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {(selectedNode.type || "").toUpperCase().startsWith("CRM_") && (
                  <>
                    {(selectedNode.type || "").toUpperCase() === "CRM_CONTACT" && (
                      <>
                        <div>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>CRM Lead Stage</label>
                          <select
                            value={selectedNode.leadStage || "New Lead"}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, leadStage: e.target.value } : n)))}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                          >
                            <option value="New Lead">New Lead</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified Lead">Qualified Lead</option>
                            <option value="Wholesale Inquiry">Wholesale Inquiry</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Won">Won / Customer</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Assign Tags</label>
                            <button onClick={handleCreateTag} style={{ fontSize: "10px", color: "#4f46e5", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>+ Create New</button>
                          </div>
                          <select
                            value={selectedNode.tags || ""}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, tags: e.target.value } : n)))}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                          >
                            <option value="">No tag assigned</option>
                            {availableTags.map((tag: any) => (
                              <option key={tag.id} value={tag.name}>{tag.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {(selectedNode.type || "").toUpperCase() === "CRM_LEAD" && (
                      <>
                        <div style={{ marginTop: "12px" }}>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>CRM Integration</label>
                          <select
                            value={selectedNode.integrationId || ""}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, integrationId: e.target.value } : n)))}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                          >
                            <option value="">-- Select Integration --</option>
                            {integrations.map(int => (
                              <option key={int.id} value={int.id}>{int.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {((selectedNode.type || "").toUpperCase() === "META_CAPI" || (selectedNode.type || "").toLowerCase() === "meta_capi" || (selectedNode.title || "").toLowerCase().includes("meta capi")) && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Target size={16} style={{ color: "#2563eb" }} />
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>Meta CAPI Event Setup</span>
                        </div>

                        <div>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Meta CAPI Event Type</label>
                          <select
                            value={selectedNode.eventName || "Lead"}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, eventName: e.target.value } : n)))}
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff", fontWeight: 600 }}
                          >
                            <option value="Lead">🎯 Lead (CTWA Conversion)</option>
                            <option value="Purchase">💰 Purchase (Order Placed)</option>
                            <option value="Contact">💬 Contact (New Inquiry)</option>
                            <option value="SubmitApplication">📝 Submit Application</option>
                            <option value="Schedule">📅 Schedule Appointment</option>
                            <option value="CompleteRegistration">✅ Complete Registration</option>
                            <option value="AddToCart">🛒 Add To Cart</option>
                            <option value="ViewContent">👁️ View Content / Catalog</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Meta Integration (Pixel ID & Access Token)</label>
                          <select
                            value={selectedNode.integrationId || ""}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, integrationId: e.target.value } : n)))}
                            style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                          >
                            <option value="">-- Select Meta Integration --</option>
                            {integrations.filter(i => i.type === "META_CAPI").map(int => (
                              <option key={int.id} value={int.id}>{int.name} (Pixel: {int.url})</option>
                            ))}
                          </select>
                          <div style={{ marginTop: "6px" }}>
                            <a
                              href="/whatsapp/integrations"
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              + Add or Manage Meta Pixel Credentials in Integrations ↗
                            </a>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Meta Test Event Code (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. TEST12345"
                            value={selectedNode.testEventCode || ""}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, testEventCode: e.target.value } : n)))}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", fontFamily: "monospace" }}
                          />
                          <p style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                            Found in <strong>Meta Events Manager → Test Events tab</strong> for real-time live testing.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            setToastMsg("⚡ Sending Test Event to Meta Pixel...");
                            try {
                              const res = await fetch("/api/whatsapp/test-meta-capi", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  integrationId: selectedNode.integrationId,
                                  eventName: selectedNode.eventName || "Lead",
                                  testEventCode: selectedNode.testEventCode
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert(`✅ VERIFIED WITH META!\n\n${data.message}\nPixel ID: ${data.pixelId}\nEvent: ${data.eventName}\nTrace ID: ${data.fbtraceId || 'N/A'}`);
                                setToastMsg("✓ Meta Event verified successfully!");
                              } else {
                                alert(`❌ META TEST ERROR:\n\n${data.error}`);
                                setToastMsg(`Error: ${data.error}`);
                              }
                            } catch (e: any) {
                              alert(`❌ Network Error: ${e.message}`);
                            }
                            setTimeout(() => setToastMsg(null), 4000);
                          }}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "12px",
                            border: "none",
                            borderRadius: "7px",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            marginTop: "4px"
                          }}
                        >
                          ⚡ Test & Verify Event Fire to Meta Now
                        </button>
                      </div>
                    )}

                    {((selectedNode.type || "").toUpperCase() === "CRM_ROUNDROBIN" || (selectedNode.type || "").toUpperCase() === "START") && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Assignment Mode</label>
                          <select
                            value={selectedNode.assignmentMode || "ROUND_ROBIN"}
                            onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, assignmentMode: e.target.value } : n)))}
                            style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                          >
                            <option value="DIRECT">Direct Assign (1 Agent)</option>
                            <option value="ROUND_ROBIN">Auto (Round Robin)</option>
                          </select>
                        </div>
                        
                        {selectedNode.assignmentMode === "DIRECT" && (
                          <div>
                            <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Assign To Agent</label>
                            <select
                              value={selectedNode.agentId || ""}
                              onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, agentId: e.target.value } : n)))}
                              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                            >
                              <option value="">Select an agent</option>
                              {availableAgents.map((ag: any) => (
                                <option key={ag.id} value={ag.id}>{ag.user?.name || "Agent"}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedNode.assignmentMode !== "DIRECT" && (
                          <>
                            <div>
                              <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Round Robin Target</label>
                              <select
                                value={selectedNode.roundRobinTarget || "TEAM"}
                                onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, roundRobinTarget: e.target.value, teamId: "", agentIds: [] } : n)))}
                                style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                              >
                                <option value="TEAM">Specific Team</option>
                                <option value="AGENTS">Multiple Agents</option>
                              </select>
                            </div>
                            
                            {(!selectedNode.roundRobinTarget || selectedNode.roundRobinTarget === "TEAM") && (
                              <div>
                                <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Select Team</label>
                                <select
                                  value={selectedNode.teamId || ""}
                                  onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, teamId: e.target.value } : n)))}
                                  style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                                >
                                  <option value="">Any Active Agent (Global)</option>
                                  {availableTeams.map((team: any) => (
                                    <option key={team.id} value={team.id}>{team.name} ({team.members?.length || 0} agents)</option>
                                  ))}
                                </select>
                                <span style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", display: "block" }}>
                                  Chats will be routed to active, available agents in this team.
                                </span>
                              </div>
                            )}

                            {selectedNode.roundRobinTarget === "AGENTS" && (
                              <div>
                                <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Select Multiple Agents</label>
                                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px", marginTop: "4px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {availableAgents.map((ag: any) => {
                                    const isSelected = (selectedNode.agentIds || []).includes(ag.id);
                                    return (
                                      <label key={ag.id} style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                                        <input 
                                          type="checkbox" 
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setNodes(prev => prev.map(n => {
                                              if (n.id !== selectedNode.id) return n;
                                              const existing = n.agentIds || [];
                                              return { ...n, agentIds: checked ? [...existing, ag.id] : existing.filter((id: string) => id !== ag.id) };
                                            }));
                                          }}
                                        />
                                        <span>{ag.user?.name || "Agent"} <span style={{opacity: 0.5}}>- {ag.team?.name || 'No team'}</span></span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div>
                              <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Distribution Method</label>
                              <select
                                value={selectedNode.distributionMethod || "WORKLOAD_BALANCE"}
                                onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, distributionMethod: e.target.value } : n)))}
                                style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                              >
                                <option value="WORKLOAD_BALANCE">Workload Balance (Lowest Open Chats)</option>
                                <option value="EQUAL_DISTRIBUTION">Equal Distribution (Turn-by-Turn Sequential)</option>
                              </select>
                              <span style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", display: "block" }}>
                                {selectedNode.distributionMethod === "EQUAL_DISTRIBUTION" 
                                  ? "Chats are evenly rotated turn-by-turn among agents."
                                  : "Assigns to whoever currently has the lowest active open chat load."}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {selectedNode.type === "CONDITION" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Variable to Test</label>
                      <input
                        type="text"
                        value={selectedNode.variableName || "customer_type"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, variableName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Operator</label>
                      <select
                        value={selectedNode.operator || "EQUALS"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, operator: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="EQUALS">EQUALS</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="GREATER_THAN">GREATER_THAN</option>
                        <option value="LESS_THAN">LESS_THAN</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Comparison Value</label>
                      <input
                        type="text"
                        value={selectedNode.compareValue || "Wholesaler"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, compareValue: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === "DELAY" && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Delay Duration</label>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <input
                        type="number"
                        value={selectedNode.delayValue || 5}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, delayValue: parseInt(e.target.value) || 1 } : n)))}
                        style={{ width: "70px", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                      />
                      <select
                        value={selectedNode.delayUnit || "MINUTES"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, delayUnit: e.target.value } : n)))}
                        style={{ flex: 1, padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
                      >
                        <option value="SECONDS">Seconds</option>
                        <option value="MINUTES">Minutes</option>
                        <option value="HOURS">Hours</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === "SET_VAR" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Variable Name</label>
                      <input
                        type="text"
                        value={selectedNode.variableName || ""}
                        placeholder="e.g. lead_status"
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, variableName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Variable Value</label>
                      <input
                        type="text"
                        value={selectedNode.variableValue || ""}
                        placeholder="e.g. Qualified"
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, variableValue: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>This stores a value in a flow variable for use in Condition nodes.</p>
                  </>
                )}

                {selectedNode.type === "SPLIT_TEST" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Split Ratio (A/B)</label>
                      <select
                        value={selectedNode.splitRatio || "50/50"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, splitRatio: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="50/50">50% / 50%</option>
                        <option value="70/30">70% / 30%</option>
                        <option value="80/20">80% / 20%</option>
                        <option value="30/70">30% / 70%</option>
                      </select>
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Randomly routes customers between Branch A and Branch B to A/B test messages.</p>
                  </>
                )}

                {selectedNode.type === "JUMP" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Jump to Block</label>
                      <select
                        value={selectedNode.targetNodeId || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, targetNodeId: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="">— Select a block —</option>
                        {nodes.filter((n: any) => n.id !== selectedNode.id).map((n: any) => (
                          <option key={n.id} value={n.id}>{n.title || n.type} ({n.id.slice(-6)})</option>
                        ))}
                      </select>
                    </div>
                    <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Redirects the flow to another block anywhere in the canvas.</p>
                  </>
                )}

                {selectedNode.type === "WEBHOOK" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Webhook API URL</label>
                      <input
                        type="text"
                        value={selectedNode.webhookUrl || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, webhookUrl: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>HTTP Method</label>
                      <select
                        value={selectedNode.method || "POST"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, method: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedNode.type !== "END" && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Direct Next Node Link</label>
                    <select
                      value={selectedNode.outputPort || ""}
                      onChange={(e) => {
                        const target = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, outputPort: target } : n))
                        );
                      }}
                      style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                    >
                      <option value="">No direct link (or use choices below)...</option>
                      {nodes.filter(n => n.id !== selectedNode.id).map((targetCandidate) => (
                        <option key={targetCandidate.id} value={targetCandidate.id}>
                          ➔ Connect to: {targetCandidate.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Choice Option List */}
                {selectedNode.choices && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                      Option Links <span style={{ color: "#64748b", fontWeight: 500 }}>(Max 20 chars each)</span>
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                      {selectedNode.choices.map((c: any, index: number) => {
                        const isLimitExceeded = (c.text || "").length >= 20;
                        return (
                          <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: isLimitExceeded ? "1px solid #ef4444" : "1px solid #e2e8f0" }}>
                              <span className="choice-num-badge">{index + 1}</span>
                              <input
                                type="text"
                                value={c.text}
                                maxLength={20}
                                onChange={(e) => handleUpdateOptionText(selectedNode.id, c.id, e.target.value)}
                                style={{ flex: 1, padding: "5px 7px", fontSize: "12px", border: isLimitExceeded ? "1px solid #ef4444" : "1px solid #cbd5e1", borderRadius: "4px", background: "#ffffff" }}
                              />
                              <select
                                value={c.targetNode || ""}
                                onChange={(e) => {
                                  const target = e.target.value;
                                  setNodes((prev) =>
                                    prev.map((n) => {
                                      if (n.id !== selectedNode.id) return n;
                                      const updatedChoices = [...n.choices];
                                      updatedChoices[index].targetNode = target;
                                      return { ...n, choices: updatedChoices };
                                    })
                                  );
                                }}
                                style={{ width: "110px", padding: "5px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff" }}
                              >
                                <option value="">Connect to...</option>
                                {nodes.map((targetCandidate) => (
                                  <option key={targetCandidate.id} value={targetCandidate.id}>
                                    {targetCandidate.title}
                                  </option>
                                ))}
                              </select>
                              <span
                                title="Delete Option"
                                onClick={(e) => handleDeleteOptionFromNode(selectedNode.id, c.id, e)}
                                style={{ cursor: "pointer", color: "#ef4444", padding: "3px" }}
                              >
                                <Trash2 size={13} />
                              </span>
                            </div>
                            {isLimitExceeded && (
                              <span style={{ color: "#ef4444", fontSize: "10px", fontWeight: 700, marginLeft: "28px" }}>
                                ⚠️ Max 20 characters allowed for WhatsApp reply buttons!
                              </span>
                            )}
                          </div>
                        );
                      })}

                      <button
                        className="add-card-option-btn"
                        onClick={(e) => handleAddOptionToNode(selectedNode.id, e)}
                        style={{ marginTop: "4px" }}
                      >
                        <span>+ Add option</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS 1, 2, 3, 4 */}
      {showCreateModal && (
        <div className="bot-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="bot-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header">
              <div>
                <h3 className="bot-modal-title">Create New Chatbot</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Select a pre-built template from WATI or Galabox, or start from scratch.
                </span>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="bot-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Chatbot Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Sales Inquiry Bot"
                    value={newBotNameInput}
                    onChange={(e) => setNewBotNameInput(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12.5px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Trigger Keywords</label>
                  <input
                    type="text"
                    placeholder="e.g. HI, HELLO, CATALOG, OFFERS"
                    value={newBotKeywordInput}
                    onChange={(e) => setNewBotKeywordInput(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12.5px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <strong style={{ fontSize: "13px", color: "#0f172a" }}>Select Popular Chatbot Template:</strong>

              <div className="templates-grid">
                {BOT_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`template-card-tile ${selectedTemplateId === tmpl.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      if (!newBotNameInput) setNewBotNameInput(tmpl.name);
                      if (!newBotKeywordInput) setNewBotKeywordInput(tmpl.triggerKeyword);
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span className={`template-tag ${tmpl.platform.toLowerCase()}`}>{tmpl.platform}</span>
                        {selectedTemplateId === tmpl.id && <Check size={16} color="#10b981" />}
                      </div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>{tmpl.name}</strong>
                      <p style={{ fontSize: "11.5px", color: "#64748b", margin: "4px 0 0 0", lineHeight: 1.3 }}>{tmpl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bot-modal-footer">
              <button className="studio-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="studio-btn primary" onClick={handleConfirmCreateNewBot} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Chatbot Flow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="bot-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="bot-modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header" style={{ background: "#fef2f2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Trash2 size={18} color="#dc2626" />
                <h3 className="bot-modal-title" style={{ color: "#991b1b" }}>Delete Chatbot Flow?</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="bot-modal-body">
              <p style={{ fontSize: "13px", color: "#334155", margin: 0 }}>
                Are you sure you want to permanently delete <strong>"{flowName}"</strong>? This will remove all triggers, node graphs and automation rules associated with this chatbot flow.
              </p>
            </div>

            <div className="bot-modal-footer">
              <button className="studio-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="studio-btn danger" onClick={handleConfirmDeleteBot} disabled={isSaving}>
                {isSaving ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && (
        <div className="bot-modal-backdrop" onClick={() => setShowManageModal(false)}>
          <div className="bot-modal-card" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderOpen size={18} color="#10b981" />
                <h3 className="bot-modal-title">All Chatbot Flows ({savedFlows.length})</h3>
              </div>
              <button onClick={() => setShowManageModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="bot-modal-body" style={{ padding: 0 }}>
              <table className="bot-manage-table">
                <thead>
                  <tr>
                    <th>Flow Name</th>
                    <th>Triggers</th>
                    <th>Status</th>
                    <th>Executions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedFlows.map((f) => (
                    <tr key={f.id} style={{ background: f.id === currentFlowId ? "#f0fdf4" : "transparent" }}>
                      <td>
                        {editingManageModalId === f.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="text"
                              value={editingManageModalName}
                              onChange={(e) => setEditingManageModalName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveModalRename(f.id);
                                if (e.key === "Escape") setEditingManageModalId(null);
                              }}
                              autoFocus
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #3b82f6",
                                fontSize: "12px",
                                outline: "none"
                              }}
                            />
                            <button
                              onClick={() => handleSaveModalRename(f.id)}
                              style={{ background: "#22c55e", color: "white", border: "none", padding: "4px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingManageModalId(null)}
                              style={{ background: "#cbd5e1", color: "#334155", border: "none", padding: "4px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong style={{ fontSize: "13px" }}>{f.name}</strong>
                              <button
                                onClick={() => {
                                  setEditingManageModalId(f.id);
                                  setEditingManageModalName(f.name);
                                }}
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px", display: "inline-flex" }}
                                title="Rename Chatbot"
                              >
                                ✎
                              </button>
                            </div>
                            {f.id === currentFlowId && <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700 }}>Currently Editing</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#64748b" }}>{f.triggerKeyword || "HI, HELLO"}</td>
                      <td>
                        <button
                          onClick={() => handleToggleActiveStatus(f.id, f.isActive)}
                          style={{
                            border: "none",
                            background: f.isActive ? "#dcfce7" : "#f1f5f9",
                            color: f.isActive ? "#166534" : "#475569",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Power size={11} /> {f.isActive ? "ACTIVE" : "DRAFT"}
                        </button>
                      </td>
                      <td>{f.executionCount || 0} runs</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="studio-btn"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => {
                              setEditingManageModalId(f.id);
                              setEditingManageModalName(f.name);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="studio-btn"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => {
                              handleSelectFlow(f.id);
                              setShowManageModal(false);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="studio-btn danger"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => handleDeleteFlowById(f.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bot-modal-footer">
              <button className="studio-btn" onClick={() => setShowManageModal(false)}>Close</button>
              <button className="studio-btn primary" onClick={() => { setShowManageModal(false); setShowCreateModal(true); }}>
                ＋ Create Another Bot
              </button>
            </div>
          </div>
        </div>
      )}

      {showSimModal && (
        <div className="phone-sim-backdrop" onClick={() => setShowSimModal(false)}>
          <div className="phone-mockup-frame" onClick={(e) => e.stopPropagation()}>
            <div className="phone-screen">
              <div className="sim-wa-header">
                <div className="sim-wa-avatar">
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <strong style={{ fontSize: "13px", display: "block" }}>Espon AI Assistant</strong>
                  <span style={{ fontSize: "10.5px", opacity: 0.9 }}>Online · Live Flow Simulator</span>
                </div>
                <button onClick={() => setShowSimModal(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>×</button>
              </div>

              <div className="sim-chat-body">
                {simMessages.map((msg, idx) => (
                  <div key={idx} className={`sim-msg-row ${msg.sender}`}>
                    <div className="sim-bubble">
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Bot Header" style={{ width: "100%", borderRadius: "6px", marginBottom: "6px" }} />
                      )}
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>

                      {msg.choices && (
                        <div className="sim-buttons-list">
                          {msg.choices.map((c: any) => (
                            <button key={c.id} className="sim-choice-btn" onClick={() => handleSimChoiceSelect(c)}>
                              {c.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
