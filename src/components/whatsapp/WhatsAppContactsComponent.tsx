"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Users,
  Search,
  Phone,
  Tag,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Send,
  X,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Filter,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Info,
  CheckCheck,
  Shuffle,
  UserCheck,
  UserX,
  Layers,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import {
  getWhatsAppContactsListAction,
  toggleContactCrmStatusAction,
  updateContactTagsAction,
  createWhatsAppContactAction,
  getOrCreateWhatsAppConversationForContactAction,
  importWhatsAppContactsBatchAction,
  exportAllWhatsAppContactsAction,
  assignImportedContactsBatchAction,
  getAllEmployeesAndTeams,
  cleanExistingDuplicateContactsAction
} from "@/app/actions/whatsAppPlatformActions";
import { formatWhatsAppPhone, parseDynamicPhone, normalizePhoneKey } from "@/lib/phoneUtils";

export default function WhatsAppContactsComponent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, done: 0, notDone: 0 });
  const [isCrmConnected, setIsCrmConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [search, setSearch] = useState("");
  const [crmFilter, setCrmFilter] = useState<"ALL" | "DONE" | "NOT_DONE">("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [allAvailableTags, setAllAvailableTags] = useState<string[]>([]);

  // Pagination states (50 contacts per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [totalFilteredContacts, setTotalFilteredContacts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageJumpInput, setPageJumpInput] = useState("");

  // Action states
  const [togglingCrmId, setTogglingCrmId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  // Export & Import states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [rawSheetRows, setRawSheetRows] = useState<any[]>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<{
    phoneNumber: string;
    countryCode: string;
    fullName: string;
    businessName: string;
    tags: string;
    customerType: string;
  }>({
    phoneNumber: "",
    countryCode: "",
    fullName: "",
    businessName: "",
    tags: "",
    customerType: ""
  });
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    batchNumber: number;
    totalBatches: number;
  } | null>(null);
  const [mergedInSheetCount, setMergedInSheetCount] = useState(0);
  const [cleaningDupes, setCleaningDupes] = useState(false);
  const [importDefaultCc, setImportDefaultCc] = useState("+91");
  const [importBatchTag, setImportBatchTag] = useState("");
  const [importAppendTags, setImportAppendTags] = useState(true);
  const [importPushToCrm, setImportPushToCrm] = useState(false);

  // Post-Import Assignment States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [importedCustomerIds, setImportedCustomerIds] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [assignMode, setAssignMode] = useState<"NONE" | "DIRECT_AGENT" | "TEAM" | "ROUND_ROBIN">("NONE");
  const [assignAgentId, setAssignAgentId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [roundRobinBasis, setRoundRobinBasis] = useState<"TEAM" | "AGENTS" | "ALL_ACTIVE">("TEAM");
  const [assignRoundRobinTeamId, setAssignRoundRobinTeamId] = useState("");
  const [assignSelectedAgentIds, setAssignSelectedAgentIds] = useState<string[]>([]);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Add Contact Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [selectedNewContactTags, setSelectedNewContactTags] = useState<string[]>([]);
  const [newCustomTagText, setNewCustomTagText] = useState("");
  const [newPushToCrm, setNewPushToCrm] = useState(true);
  const [savingContact, setSavingContact] = useState(false);

  // Edit Tag Modal
  const [tagModalContact, setTagModalContact] = useState<any | null>(null);
  const [editTagsList, setEditTagsList] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load system-wide tags on mount
  useEffect(() => {
    fetch("/api/whatsapp/tags")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.tags) {
          const names = d.tags.map((t: any) => t.name);
          setAllAvailableTags((prev) => Array.from(new Set([...prev, ...names])));
        }
      })
      .catch(() => {});
  }, []);

  // Load Teams and Employees for Assignment
  const loadEmployeesAndTeams = async () => {
    try {
      const res = await getAllEmployeesAndTeams();
      if (res.success) {
        const teams = res.teams || [];
        const employees = res.employees || [];
        setTeamsList(teams);
        setEmployeesList(employees);
        if (teams.length > 0) {
          setAssignTeamId(teams[0].id);
          setAssignRoundRobinTeamId(teams[0].id);
        }
        if (employees.length > 0) {
          setAssignAgentId(employees[0].id);
          setAssignSelectedAgentIds(employees.slice(0, 4).map((e: any) => e.id));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadEmployeesAndTeams();
  }, []);

  const fetchContacts = async (targetPage?: number) => {
    setLoading(true);
    const pageToFetch = typeof targetPage === "number" ? targetPage : currentPage;
    const res = await getWhatsAppContactsListAction({
      search,
      crmFilter,
      tag: tagFilter !== "ALL" ? tagFilter : undefined,
      page: pageToFetch,
      limit: pageSize
    });

    if (res.success) {
      setContacts(res.contacts || []);
      if (res.stats) setStats(res.stats);
      if (res.pagination) {
        setTotalFilteredContacts(res.pagination.totalCount ?? 0);
        setTotalPages(res.pagination.totalPages ?? 1);
        setCurrentPage(res.pagination.page ?? pageToFetch);
      }
      if (res.isCrmConnected !== undefined) {
        setIsCrmConnected(Boolean(res.isCrmConnected));
      }

      // Collect all unique tags for filter dropdown
      const tagsSet = new Set<string>();
      (res.contacts || []).forEach((c: any) => {
        (c.tags || []).forEach((t: string) => tagsSet.add(t));
      });
      setAllAvailableTags((prev) => Array.from(new Set([...prev, ...Array.from(tagsSet)])));
    } else {
      showToast(res.error || "Failed to load contacts", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchContacts(1);
  }, [search, crmFilter, tagFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || loading) return;
    setCurrentPage(newPage);
    fetchContacts(newPage);
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageJumpInput.trim(), 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      handlePageChange(p);
      setPageJumpInput("");
    }
  };

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push("...");
      pages.push(total);
    }
    return pages;
  };

  const handleToggleCrm = async (contact: any) => {
    setTogglingCrmId(contact.id);
    const nextStatus = !contact.pushedToCrm;
    const res = await toggleContactCrmStatusAction(contact.id, nextStatus);
    setTogglingCrmId(null);

    if (res.success) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, pushedToCrm: nextStatus } : c))
      );
      setStats((prev) => ({
        ...prev,
        done: nextStatus ? prev.done + 1 : Math.max(0, prev.done - 1),
        notDone: nextStatus ? Math.max(0, prev.notDone - 1) : prev.notDone + 1
      }));
      showToast(
        nextStatus
          ? `✓ Contact "${contact.name}" pushed to CRM (Status: DONE)!`
          : `✓ CRM status for "${contact.name}" reset to NOT DONE.`
      );
    } else {
      showToast(res.error || "Failed to update CRM status", "error");
    }
  };

  const handleOpenChat = async (contact: any) => {
    setOpeningChatId(contact.id);
    try {
      let convId = contact.conversationId;
      if (!convId) {
        const res = await getOrCreateWhatsAppConversationForContactAction(contact.id);
        if (res.success && res.conversationId) {
          convId = res.conversationId;
        }
      }

      const phoneParam = contact.mobile || contact.whatsappNumber || "";
      if (convId) {
        router.push(`/whatsapp/inbox?convId=${convId}&phone=${encodeURIComponent(phoneParam)}`);
      } else {
        router.push(`/whatsapp/inbox?phone=${encodeURIComponent(phoneParam)}`);
      }
    } catch (err: any) {
      router.push(`/whatsapp/inbox?phone=${encodeURIComponent(contact.mobile)}`);
    } finally {
      setOpeningChatId(null);
    }
  };

  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Phone number copied to clipboard!");
  };

  const openAddModal = () => {
    setNewName("");
    setNewMobile("");
    setSelectedNewContactTags([]);
    setNewCustomTagText("");
    setNewPushToCrm(true);
    setShowAddModal(true);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newMobile.trim()) {
      showToast("Name and mobile number are required.", "error");
      return;
    }

    setSavingContact(true);
    const res = await createWhatsAppContactAction({
      name: newName.trim(),
      mobile: newMobile.trim(),
      tags: selectedNewContactTags,
      pushToCrm: isCrmConnected ? newPushToCrm : false
    });
    setSavingContact(false);

    if (res.success) {
      if ((res as any).isExisting) {
        showToast(`✓ Contact "${newName}" already exists — updated details & merged tags (no duplicate created)!`);
      } else {
        showToast(`Contact "${newName}" created successfully!`);
      }
      setShowAddModal(false);
      setNewName("");
      setNewMobile("");
      setSelectedNewContactTags([]);
      setNewCustomTagText("");
      setNewPushToCrm(true);
      setCurrentPage(1);
      fetchContacts(1);
    } else {
      showToast(res.error || "Failed to create contact.", "error");
    }
  };

  const openTagModal = (contact: any) => {
    setTagModalContact(contact);
    setEditTagsList([...(contact.tags || [])]);
    setCustomTagInput("");
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const clean = customTagInput.trim();
    if (!editTagsList.includes(clean)) {
      setEditTagsList([...editTagsList, clean]);
    }
    if (!allAvailableTags.includes(clean)) {
      setAllAvailableTags([...allAvailableTags, clean]);
    }
    setCustomTagInput("");
  };

  const handleRemoveTag = (tagName: string) => {
    setEditTagsList(editTagsList.filter((t) => t !== tagName));
  };

  const handleSaveTags = async () => {
    if (!tagModalContact) return;
    setSavingTags(true);
    const res = await updateContactTagsAction(tagModalContact.id, editTagsList);
    setSavingTags(false);

    if (res.success) {
      setContacts((prev) =>
        prev.map((c) => (c.id === tagModalContact.id ? { ...c, tags: editTagsList } : c))
      );
      setTagModalContact(null);
      showToast("Tags updated successfully!");
    } else {
      showToast(res.error || "Failed to save tags", "error");
    }
  };

  const formatDateTime = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "WA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // ---------------------------------------------------------
  // EXCEL DUMMY TEMPLATE DOWNLOAD (WITH EXACT REQUIRED FIELDS)
  // ---------------------------------------------------------
  const handleDownloadDummyTemplate = () => {
    try {
      const headers = [
        "Phone Number (Required)",
        "Country Code",
        "Full Name (Required)",
        "Business / Shop Name",
        "Tags (Comma-Separated)",
        "Customer Type"
      ];

      const sampleRows = [
        [
          "9876543210",
          "+91",
          "Rahul Sharma",
          "Sharma Activewear & Sports",
          "Wholesale, VIP Buyer, Trackpants",
          "Wholesaler"
        ],
        [
          "9123456780",
          "+91",
          "Priya Verma",
          "FitZone Studios",
          "Retail, High Spender, Gym Co-Ords",
          "Retailer"
        ],
        [
          "7206066678",
          "+91",
          "Amit Patel",
          "Patel Fitness Hub",
          "Summer 2026, Bulk Buyer, Polyester Tees",
          "Wholesaler"
        ],
        [
          "9988776655",
          "+91",
          "Karan Singh",
          "Singh Uniforms & Apparel",
          "Sublimation Tees, Dealer, B2B",
          "Distributor"
        ],
        [
          "9811223344",
          "+91",
          "Sneha Kapoor",
          "Kapoor Fashion Boutique",
          "Festive Sale, Repeat Customer",
          "Retailer"
        ]
      ];

      const wb = XLSX.utils.book_new();

      // Sheet 1: Template with Ready-to-Use Dummy Data
      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set clean column widths
      ws["!cols"] = [
        { wch: 24 }, // Phone Number
        { wch: 14 }, // Country Code
        { wch: 24 }, // Full Name
        { wch: 32 }, // Business / Shop Name
        { wch: 38 }, // Tags
        { wch: 18 }  // Customer Type
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Contacts Import Template");

      // Sheet 2: Field Rules & Instructions
      const instructions = [
        ["Field / Column Name", "Required?", "Example Format", "Detailed Explanation & Formatting Rules"],
        ["Phone Number", "YES (Mandatory)", "9876543210 or +919876543210", "10-digit mobile number or full international phone number. Spaces, hyphens, and brackets are automatically stripped."],
        ["Country Code", "Optional", "+91 (or +1, +44, +971)", "Country dial code. If omitted or left empty, default +91 (India) is automatically applied."],
        ["Full Name", "YES (Mandatory)", "Rahul Sharma", "Name of the customer, shop owner, or contact person."],
        ["Business / Shop Name", "Optional", "Sharma Activewear & Sports", "Name of store, retail business, gym brand, or firm."],
        ["Tags", "Optional", "Wholesale, VIP Buyer, Activewear", "Multiple tags separated by commas. These will be added as searchable tags in WhatsApp campaigns & broadcast audience pickers."],
        ["Customer Type", "Optional", "Wholesaler / Retailer", "Account type (Wholesaler, Retailer, Distributor, Direct Buyer)."],
        [],
        ["IMPORTANT MERGING & IMPORT RULES", "", "", ""],
        ["1. Duplicate Handling", "", "", "If a contact with the same phone number already exists, their details will be updated and new tags will be safely merged."],
        ["2. Safe Tag Merging", "", "", "You can safely add new tags without losing existing tags already assigned to the customer."],
        ["3. CRM Sync", "", "", "Check 'Mark as Pushed to CRM' during import if you want the imported contacts marked as DONE for your sales team."]
      ];

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
      wsInstructions["!cols"] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 30 },
        { wch: 65 }
      ];

      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions & Guide");

      // Trigger download
      XLSX.writeFile(wb, "what-in_contacts_template.xlsx");
      showToast("📥 Sample Excel template downloaded with exact format & dummy data!");
    } catch (err: any) {
      showToast("Failed to download template: " + err.message, "error");
    }
  };

  // ---------------------------------------------------------
  // EXCEL EXPORT (DOWNLOAD ALL CONTACTS TO SPREADSHEET)
  // ---------------------------------------------------------
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      showToast("Preparing contacts for Excel export...");

      const res = await exportAllWhatsAppContactsAction();
      const exportList = (res.success && res.contacts && res.contacts.length > 0)
        ? res.contacts
        : contacts;

      if (!exportList || exportList.length === 0) {
        showToast("No contacts available to export.", "error");
        setExportingExcel(false);
        return;
      }

      const headers = [
        "Phone Number",
        "Country Code",
        "Full Name",
        "Business / Shop Name",
        "Tags",
        "Customer Type"
      ];

      const rows = exportList.map((c: any) => {
        const rawPhone = c.mobile || c.whatsappNumber || "";
        const parsed = parseDynamicPhone(rawPhone);
        const tagsStr = Array.isArray(c.tags) ? c.tags.join(", ") : (c.tags || "");

        return [
          parsed.nationalNumber || rawPhone,
          parsed.countryCode || "+91",
          c.contactPerson || c.name || "",
          c.businessName || "",
          tagsStr,
          c.customerType || "Retailer"
        ];
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 14 },
        { wch: 24 },
        { wch: 30 },
        { wch: 35 },
        { wch: 18 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "WhatsApp Contacts");
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `what-in_contacts_${dateStr}.xlsx`);
      showToast(`✓ Exported ${exportList.length} contacts to Excel!`);
    } catch (err: any) {
      showToast(err.message || "Failed to export contacts.", "error");
    } finally {
      setExportingExcel(false);
    }
  };

  // Helper to re-map raw sheet rows according to user's column mappings with strict deduplication
  const applyMappingToRows = (
    rawRows: any[],
    mapping: {
      phoneNumber: string;
      countryCode: string;
      fullName: string;
      businessName: string;
      tags: string;
      customerType: string;
    }
  ) => {
    const normalized = rawRows.map((row: any) => ({
      phoneNumber: mapping.phoneNumber ? String(row[mapping.phoneNumber] ?? "").trim() : "",
      countryCode: mapping.countryCode ? String(row[mapping.countryCode] ?? "").trim() : "",
      fullName: mapping.fullName ? String(row[mapping.fullName] ?? "").trim() : "",
      businessName: mapping.businessName ? String(row[mapping.businessName] ?? "").trim() : "",
      tags: mapping.tags ? String(row[mapping.tags] ?? "").trim() : "",
      customerType: mapping.customerType ? String(row[mapping.customerType] ?? "").trim() : ""
    }));

    const validRows = normalized.filter((r: any) => {
      const digits = String(r.phoneNumber).replace(/\D/g, "");
      return digits.length >= 7 || r.fullName.trim().length > 0;
    });

    // In-File Deduplication: ensure no repeated contacts enter from the uploaded sheet
    const uniqueMap = new Map<string, any>();
    let duplicateCount = 0;

    for (const row of validRows) {
      const phoneKey = normalizePhoneKey(row.phoneNumber);
      const dedupeKey = phoneKey || (row.fullName ? `name:${row.fullName.toLowerCase()}` : `row:${Math.random()}`);

      if (uniqueMap.has(dedupeKey)) {
        duplicateCount++;
        const existing = uniqueMap.get(dedupeKey);
        // Merge tags cleanly without duplicates
        const existingTags = existing.tags ? String(existing.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [];
        const newTags = row.tags ? String(row.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [];
        const combinedTags = Array.from(new Set([...existingTags, ...newTags])).join(", ");

        uniqueMap.set(dedupeKey, {
          ...existing,
          fullName: existing.fullName || row.fullName,
          businessName: existing.businessName || row.businessName,
          countryCode: existing.countryCode || row.countryCode,
          customerType: existing.customerType || row.customerType,
          tags: combinedTags
        });
      } else {
        uniqueMap.set(dedupeKey, { ...row });
      }
    }

    setMergedInSheetCount(duplicateCount);
    return Array.from(uniqueMap.values());
  };

  // User manually changes a matched column dropdown
  const handleUpdateFieldMapping = (
    fieldKey: "phoneNumber" | "countryCode" | "fullName" | "businessName" | "tags" | "customerType",
    selectedHeader: string
  ) => {
    const updated = {
      ...fieldMappings,
      [fieldKey]: selectedHeader
    };
    setFieldMappings(updated);

    if (rawSheetRows.length > 0) {
      const validRows = applyMappingToRows(rawSheetRows, updated);
      setParsedRows(validRows);
      if (validRows.length === 0) {
        setImportError("No valid contact rows with phone numbers were found with this column selection.");
      } else {
        setImportError("");
      }
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setParsedRows([]);
    setRawSheetRows([]);
    setSheetHeaders([]);
    setImportError("");
    setImportFileName("");
    setMergedInSheetCount(0);
    setFieldMappings({
      phoneNumber: "",
      countryCode: "",
      fullName: "",
      businessName: "",
      tags: "",
      customerType: ""
    });
  };

  // ---------------------------------------------------------
  // PARSE UPLOADED EXCEL / CSV FILE WITH AUTO FIELD MATCHING
  // ---------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setParsingFile(true);
    setImportError("");
    setMergedInSheetCount(0);
    setParsedRows([]);
    setRawSheetRows([]);
    setSheetHeaders([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setImportError("The uploaded file is empty. Please check the sheet or download our dummy template.");
          setParsingFile(false);
          return;
        }

        const headers = Object.keys(rawJson[0]);
        setSheetHeaders(headers);
        setRawSheetRows(rawJson);

        // Auto-match dynamic header columns to our 6 core fields
        const matchedPhone = headers.find((k) =>
          /phone|mobile|contact\s*no|contact\s*number|number|whatsapp/i.test(k)
        ) || "";
        const matchedName = headers.find((k) =>
          /full\s*name|contact\s*person|customer\s*name|name|buyer/i.test(k)
        ) || "";
        const matchedCc = headers.find((k) =>
          /country\s*code|country|dial\s*code|cc/i.test(k)
        ) || "";
        const matchedShop = headers.find((k) =>
          /shop|business|company|store|firm/i.test(k)
        ) || "";
        const matchedTags = headers.find((k) =>
          /tag|category|labels|group/i.test(k)
        ) || "";
        const matchedType = headers.find((k) =>
          /type|customer\s*type|tier/i.test(k)
        ) || "";

        const initialMapping = {
          phoneNumber: matchedPhone,
          countryCode: matchedCc,
          fullName: matchedName,
          businessName: matchedShop,
          tags: matchedTags,
          customerType: matchedType
        };
        setFieldMappings(initialMapping);

        const validRows = applyMappingToRows(rawJson, initialMapping);
        if (validRows.length === 0) {
          setImportError("No valid contact rows with phone numbers were found in the file. Check column mapping below.");
        }

        setParsedRows(validRows);
      } catch (err: any) {
        setImportError("Failed to parse file: " + err.message);
      } finally {
        setParsingFile(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ---------------------------------------------------------
  // EXECUTE CHUNKED BATCH IMPORT TO DATABASE (PREVENTS TIMEOUTS & PAYLOAD OVERFLOWS)
  // ---------------------------------------------------------
  const CHUNK_SIZE = 150;

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      showToast("No valid contacts to import.", "error");
      return;
    }

    setImporting(true);
    const totalRows = parsedRows.length;
    const totalBatches = Math.ceil(totalRows / CHUNK_SIZE);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allImportedCustomerIds: string[] = [];

    setImportProgress({
      current: 0,
      total: totalRows,
      percent: 0,
      batchNumber: 0,
      totalBatches
    });

    try {
      for (let b = 0; b < totalBatches; b++) {
        const start = b * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalRows);
        const chunk = parsedRows.slice(start, end);
        const isLastBatch = b === totalBatches - 1;

        setImportProgress({
          current: start,
          total: totalRows,
          percent: Math.round((start / totalRows) * 100),
          batchNumber: b + 1,
          totalBatches
        });

        const res = await importWhatsAppContactsBatchAction(chunk, {
          defaultCountryCode: importDefaultCc,
          appendTags: importAppendTags,
          pushToCrm: isCrmConnected ? importPushToCrm : false,
          batchTag: importBatchTag.trim() || undefined,
          skipRevalidate: !isLastBatch
        });

        if (res.success) {
          totalCreated += res.createdCount || 0;
          totalUpdated += res.updatedCount || 0;
          totalSkipped += res.skippedCount || 0;
          if (res.importedCustomerIds && res.importedCustomerIds.length > 0) {
            allImportedCustomerIds.push(...res.importedCustomerIds);
          }
        } else {
          console.warn(`[Batch ${b + 1}] Warning:`, res.error);
        }
      }

      setImportProgress({
        current: totalRows,
        total: totalRows,
        percent: 100,
        batchNumber: totalBatches,
        totalBatches
      });

      setShowImportModal(false);
      setParsedRows([]);
      setRawSheetRows([]);
      setSheetHeaders([]);
      setFieldMappings({
        phoneNumber: "",
        countryCode: "",
        fullName: "",
        businessName: "",
        tags: "",
        customerType: ""
      });
      setImportFileName("");
      setMergedInSheetCount(0);
      setImportProgress(null);
      setCurrentPage(1);
      fetchContacts(1);

      const uniqueImportedIds = Array.from(new Set(allImportedCustomerIds));

      if (uniqueImportedIds.length > 0) {
        setImportedCustomerIds(uniqueImportedIds);
        setImportedCount(uniqueImportedIds.length);
        setAssignMode("NONE");
        setShowAssignModal(true);
      } else {
        showToast(
          `🎉 Processed ${totalRows} contacts (${totalCreated} new created, ${totalUpdated} updated)!`
        );
      }
    } catch (err: any) {
      showToast(err.message || "Import encountered an error.", "error");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  // ---------------------------------------------------------
  // POST-IMPORT ASSIGNMENT HANDLERS
  // ---------------------------------------------------------
  const handleExecuteAssignment = async () => {
    if (!importedCustomerIds || importedCustomerIds.length === 0) {
      setShowAssignModal(false);
      return;
    }

    if (assignMode === "NONE") {
      setShowAssignModal(false);
      showToast(`✓ Contacts saved as Unassigned in general lead pool.`);
      return;
    }

    if (assignMode === "DIRECT_AGENT" && !assignAgentId) {
      showToast("Please select an agent to assign contacts to.", "error");
      return;
    }

    if (assignMode === "TEAM" && !assignTeamId) {
      showToast("Please select a team to assign contacts to.", "error");
      return;
    }

    if (assignMode === "ROUND_ROBIN") {
      if (roundRobinBasis === "TEAM" && !assignRoundRobinTeamId) {
        showToast("Please select a team for team-based round-robin.", "error");
        return;
      }
      if (roundRobinBasis === "AGENTS" && (!assignSelectedAgentIds || assignSelectedAgentIds.length === 0)) {
        showToast("Please select at least 1 agent for round-robin distribution.", "error");
        return;
      }
    }

    setAssigningLoading(true);
    try {
      const res = await assignImportedContactsBatchAction({
        customerIds: importedCustomerIds,
        mode: assignMode,
        agentId: assignMode === "DIRECT_AGENT" ? assignAgentId : undefined,
        teamId:
          assignMode === "TEAM"
            ? assignTeamId
            : assignMode === "ROUND_ROBIN" && roundRobinBasis === "TEAM"
            ? assignRoundRobinTeamId
            : undefined,
        roundRobinBasis: assignMode === "ROUND_ROBIN" ? roundRobinBasis : undefined,
        agentIds:
          assignMode === "ROUND_ROBIN" && roundRobinBasis === "AGENTS"
            ? assignSelectedAgentIds
            : undefined
      });

      if (res.success) {
        showToast(`✓ ${res.message || "Contacts assigned successfully!"}`);
        setShowAssignModal(false);
        fetchContacts(currentPage);
      } else {
        showToast(res.error || "Assignment failed.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Assignment failed.", "error");
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleSkipAssignment = () => {
    setShowAssignModal(false);
    showToast(`✓ Contacts saved without assignment (Unassigned).`);
  };

  const handleCleanDuplicates = async () => {
    const confirmed = window.confirm(
      "Scan database and merge all existing duplicate contacts (same mobile / phone number) into single primary contacts?\n\nAll chat conversations, orders, quotations, and tags will be safely merged and redundant duplicate records removed."
    );
    if (!confirmed) return;

    setCleaningDupes(true);
    try {
      const res = await cleanExistingDuplicateContactsAction();
      if (res.success) {
        showToast(
          `✓ Cleaned up! Found ${res.deletedRecordsCount} duplicate records, merged into ${res.mergedGroupsCount} unique contacts.`
        );
        setCurrentPage(1);
        fetchContacts(1);
      } else {
        showToast(res.error || "Failed to clean duplicates.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to clean duplicate contacts.", "error");
    } finally {
      setCleaningDupes(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Toast Notification */}
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
          {toastMsg.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toastMsg.text}
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={22} className="text-indigo-600" />
            WhatsApp Contacts Directory
          </h2>
          <p className="text-gray-500 text-sm">
            Manage customer names, mobile numbers, creation timestamps, custom tags{isCrmConnected ? ", and CRM push status" : ""}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchContacts(currentPage)}
            disabled={loading}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Refresh Contacts"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync
          </button>

          <button
            onClick={handleCleanDuplicates}
            disabled={cleaningDupes || loading}
            className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Scan database to merge any existing duplicate contacts by phone number"
          >
            <ShieldCheck size={14} className={cleaningDupes ? "animate-spin" : ""} />
            {cleaningDupes ? "Cleaning..." : "Clean Duplicates"}
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || (contacts.length === 0 && stats.total === 0)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export contacts directory to Excel (.xlsx)"
          >
            {exportingExcel ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Export Excel
          </button>

          <button
            onClick={() => {
              setParsedRows([]);
              setImportError("");
              setImportFileName("");
              setShowImportModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Import contacts from Excel or CSV"
          >
            <Upload size={14} /> Import Excel
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className={`grid grid-cols-1 ${isCrmConnected ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Contacts</div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
              {stats.total.toLocaleString()}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        {isCrmConnected ? (
          <>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Pushed to CRM (Done)
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.done.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Not Pushed (Pending)
                </div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {stats.notDone.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock size={24} />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Total Tags Applied
              </div>
              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {allAvailableTags.length}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Tag size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile number, business, or tag..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* CRM Status Filter - only if CRM connected */}
          {isCrmConnected && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
              <span className="text-xs font-bold text-gray-500">CRM:</span>
              <select
                value={crmFilter}
                onChange={(e) => setCrmFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DONE">CRM Pushed (Done)</option>
                <option value="NOT_DONE">Not Pushed (Pending)</option>
              </select>
            </div>
          )}

          {/* Tag Filter */}
          {allAvailableTags.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
              <Tag size={13} className="text-gray-400" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer max-w-[120px] truncate"
              >
                <option value="ALL">All Tags</option>
                {allAvailableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs text-gray-500 font-medium ml-2">
            {totalFilteredContacts > 0 ? (
              <>
                Showing{" "}
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {((currentPage - 1) * pageSize + 1).toLocaleString()}
                </span>
                {" - "}
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {Math.min(currentPage * pageSize, totalFilteredContacts).toLocaleString()}
                </span>
                {" of "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {totalFilteredContacts.toLocaleString()}
                </span>
                {" contacts"}
              </>
            ) : (
              "0 contacts"
            )}
          </span>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-3.5 px-5">Name & Customer</th>
                <th className="py-3.5 px-5">Mobile Number</th>
                <th className="py-3.5 px-5">Tags Applied</th>
                {isCrmConnected && <th className="py-3.5 px-5">Pushed to CRM</th>}
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={isCrmConnected ? 5 : 4} className="py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading contacts list...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={isCrmConnected ? 5 : 4} className="py-16 text-center text-gray-400">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <div className="font-bold text-gray-700 dark:text-gray-300">No contacts found</div>
                    <div className="text-xs mt-1">Try adjusting your search or create a new contact.</div>
                    <button
                      onClick={openAddModal}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      + Add First Contact
                    </button>
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-slate-700/30 transition-colors group"
                  >
                    {/* 1. Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">
                            <span>{c.name}</span>
                            {c.assignedAgent && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-900/50"
                                title={`Assigned Salesperson: ${c.assignedAgent}`}
                              >
                                👤 {c.assignedAgent}
                              </span>
                            )}
                            {c.assignedTeam && !c.assignedAgent && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-900/50"
                                title={`Assigned Team: ${c.assignedTeam}`}
                              >
                                👥 {c.assignedTeam}
                              </span>
                            )}
                          </div>
                          {c.businessName && c.businessName !== c.name && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {c.businessName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Mobile Number */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                          {formatWhatsAppPhone(c.mobile)}
                        </span>
                        <button
                          onClick={() => handleCopyPhone(c.id, c.mobile)}
                          title="Copy phone"
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition"
                        >
                          {copiedId === c.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>

                    {/* 3. Tags Applied - only show 1 tag and a "+N more" badge if more exist */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        {c.tags && c.tags.length > 0 ? (
                          <>
                            {/* First Tag */}
                            <span
                              className="inline-flex items-center px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-bold truncate max-w-[150px]"
                              title={c.tags[0]}
                            >
                              🏷️ {c.tags[0]}
                            </span>

                            {/* +N More button */}
                            {c.tags.length > 1 && (
                              <button
                                onClick={() => openTagModal(c)}
                                className="px-1.5 py-0.5 bg-gray-100 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-indigo-900/60 text-gray-600 hover:text-indigo-700 dark:text-gray-300 dark:hover:text-indigo-300 border border-gray-200 dark:border-slate-600 rounded-md text-[11px] font-extrabold transition shadow-2xs"
                                title={`Click to view all ${c.tags.length} tags: ${c.tags.join(', ')}`}
                              >
                                +{c.tags.length - 1} more
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No tags</span>
                        )}

                        <button
                          onClick={() => openTagModal(c)}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition text-[11px] font-semibold"
                          title="Manage Tags"
                        >
                          <Tag size={12} />
                        </button>
                      </div>
                    </td>

                    {/* 5. Pushed to CRM Status (DONE / NOT DONE) - only rendered if CRM connected */}
                    {isCrmConnected && (
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleCrm(c)}
                            disabled={togglingCrmId === c.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition shadow-sm border ${
                              c.pushedToCrm
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                            }`}
                            title="Click to toggle CRM push status"
                          >
                            {togglingCrmId === c.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : c.pushedToCrm ? (
                              <CheckCircle2 size={13} className="text-emerald-600" />
                            ) : (
                              <Clock size={13} className="text-amber-600" />
                            )}
                            <span>{c.pushedToCrm ? "DONE" : "NOT DONE"}</span>
                          </button>

                          {!c.pushedToCrm && (
                            <button
                              onClick={() => handleToggleCrm(c)}
                              disabled={togglingCrmId === c.id}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                              title="Push contact directly to connected CRM webhook"
                            >
                              Push to CRM
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 6. Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenChat(c)}
                          disabled={openingChatId === c.id}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                          title="Open in WhatsApp Inbox"
                        >
                          {openingChatId === c.id ? (
                            <RefreshCw size={13} className="animate-spin text-indigo-600" />
                          ) : (
                            <MessageSquare size={13} />
                          )}
                          <span>{openingChatId === c.id ? "Opening..." : "Chat"}</span>
                        </button>

                        <button
                          onClick={() => openTagModal(c)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                          title="Edit Tags"
                        >
                          <Tag size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalFilteredContacts > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-900/30">
            {/* Left: Summary text */}
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center sm:text-left">
              Showing{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {((currentPage - 1) * pageSize + 1).toLocaleString()}
              </span>{" "}
              to{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {Math.min(currentPage * pageSize, totalFilteredContacts).toLocaleString()}
              </span>{" "}
              of{" "}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {totalFilteredContacts.toLocaleString()}
              </span>{" "}
              contacts • Page{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">{currentPage}</span> of{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">{totalPages}</span>
            </div>

            {/* Right: Controls & Page Jumper */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {/* First Page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || loading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  typeof p === "number" ? (
                    <button
                      key={idx}
                      onClick={() => handlePageChange(p)}
                      disabled={loading}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentPage === p
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="px-1 text-xs text-gray-400 select-none">
                      ...
                    </span>
                  )
                )}
              </div>

              {/* Next Page */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                title="Next Page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || loading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>

              {/* Quick Jump Input if more than 3 pages */}
              {totalPages > 3 && (
                <form onSubmit={handlePageJump} className="flex items-center gap-1 ml-2 text-xs">
                  <span className="text-gray-400 text-[11px] hidden md:inline">Go:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageJumpInput}
                    onChange={(e) => setPageJumpInput(e.target.value)}
                    placeholder={String(currentPage)}
                    className="w-12 h-8 px-1.5 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    title={`Enter page 1 to ${totalPages}`}
                  />
                  <button
                    type="submit"
                    className="h-8 px-2 bg-gray-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add New Contact */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                Add New WhatsApp Contact
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Selectable Tags Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                    Select Tags
                  </label>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    {selectedNewContactTags.length} selected
                  </span>
                </div>

                {/* Selectable Tag Chips */}
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl min-h-[50px] max-h-[140px] overflow-y-auto">
                  {allAvailableTags.length === 0 && selectedNewContactTags.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No tags created yet. Add one below.</span>
                  ) : (
                    Array.from(new Set([...allAvailableTags, ...selectedNewContactTags])).map((t) => {
                      const isSelected = selectedNewContactTags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedNewContactTags(selectedNewContactTags.filter((tag) => tag !== t));
                            } else {
                              setSelectedNewContactTags([...selectedNewContactTags, t]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs border ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                          }`}
                        >
                          <span>🏷️ {t}</span>
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Optional + Create New Tag inline */}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newCustomTagText}
                    onChange={(e) => setNewCustomTagText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newCustomTagText.trim()) {
                          const clean = newCustomTagText.trim();
                          if (!selectedNewContactTags.includes(clean)) {
                            setSelectedNewContactTags([...selectedNewContactTags, clean]);
                          }
                          if (!allAvailableTags.includes(clean)) {
                            setAllAvailableTags([...allAvailableTags, clean]);
                          }
                          setNewCustomTagText("");
                        }
                      }
                    }}
                    placeholder="Create a new tag..."
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomTagText.trim()) {
                        const clean = newCustomTagText.trim();
                        if (!selectedNewContactTags.includes(clean)) {
                          setSelectedNewContactTags([...selectedNewContactTags, clean]);
                        }
                        if (!allAvailableTags.includes(clean)) {
                          setAllAvailableTags([...allAvailableTags, clean]);
                        }
                        setNewCustomTagText("");
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-600 transition"
                  >
                    + Add Tag
                  </button>
                </div>
              </div>

              {isCrmConnected && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                      Push to CRM Immediately
                    </div>
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-400">
                      Set CRM Status to DONE and sync to webhook.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newPushToCrm}
                    onChange={(e) => setNewPushToCrm(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  {savingContact ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  {savingContact ? "Saving..." : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Tags */}
      {tagModalContact && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <Tag size={16} className="text-indigo-600" />
                  Manage Tags
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Contact: {tagModalContact.name}</p>
              </div>
              <button
                onClick={() => setTagModalContact(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Active Tags */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase">
                  Applied Tags
                </label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                  {editTagsList.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No tags applied yet.</span>
                  ) : (
                    editTagsList.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 rounded-lg text-xs font-bold"
                      >
                        🏷️ {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-red-500 transition"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Add Custom Tag */}
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">
                  Add Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Type tag name and press Enter..."
                    className="flex-1 px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Quick Suggest Tags */}
              {allAvailableTags.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    Quick Suggestions:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allAvailableTags
                      .filter((t) => !editTagsList.includes(t))
                      .slice(0, 8)
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditTagsList([...editTagsList, t])}
                          className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-indigo-50 text-gray-600 dark:text-gray-300 text-[11px] font-semibold rounded-md transition"
                        >
                          + {t}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTagModalContact(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTags}
                  disabled={savingTags}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  {savingTags ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  {savingTags ? "Saving..." : "Save Tags"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* EXCEL IMPORT MODAL (WITH SAMPLE TEMPLATE DOWNLOAD)        */}
      {/* --------------------------------------------------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    Import Contacts from Excel
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload .xlsx, .xls or .csv file to import or update your WhatsApp contacts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseImportModal}
                disabled={importing}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              {/* Dummy Template Download Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-indigo-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <Sparkles size={14} className="text-emerald-600" />
                      <span>Need the exact format with Country Code & Tags?</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md leading-relaxed">
                      Download our ready-to-use dummy spreadsheet pre-filled with activewear buyer data, country code (+91) guides, and multi-tag samples.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadDummyTemplate}
                    className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition"
                  >
                    <Download size={14} />
                    <span>Download Dummy (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone / File Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Select or Drag Excel Spreadsheet:
                </label>
                <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center transition bg-gray-50/50 dark:bg-slate-900/40 cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition text-emerald-600">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {importFileName ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {importFileName}
                          </span>
                        ) : (
                          "Click to browse or drop file here"
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parsing Indicator */}
              {parsingFile && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-gray-500">
                  <RefreshCw size={14} className="animate-spin text-emerald-600" />
                  <span>Parsing spreadsheet columns and contacts...</span>
                </div>
              )}

              {/* Error Callout */}
              {importError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Format Error: </span>
                    {importError}
                  </div>
                </div>
              )}

              {/* 1. Matched Fields Preview (Column Mapping) */}
              {rawSheetRows.length > 0 && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <CheckCheck size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span>Matched Fields Preview</span>
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                            {Object.values(fieldMappings).filter(Boolean).length} of 6 Fields Matched
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Verify how columns in your spreadsheet connect to What-In fields. You can adjust mappings if needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mapping Grid (6 Core Fields) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {[
                      { key: "phoneNumber", label: "Phone Number", required: true, icon: Phone, fallbackHint: "10-digit number" },
                      { key: "fullName", label: "Full Name", required: true, icon: Users, fallbackHint: "Customer / Contact" },
                      { key: "businessName", label: "Business / Shop Name", required: false, icon: Briefcase, fallbackHint: "Shop / Store Name" },
                      { key: "countryCode", label: "Country Code", required: false, icon: Sparkles, fallbackHint: `Default ${importDefaultCc}` },
                      { key: "tags", label: "Tags", required: false, icon: Tag, fallbackHint: "Comma-separated tags" },
                      { key: "customerType", label: "Customer Type", required: false, icon: Layers, fallbackHint: "Default Retailer" }
                    ].map((field) => {
                      const mappedCol = fieldMappings[field.key as keyof typeof fieldMappings];
                      const isMatched = Boolean(mappedCol);
                      const sampleVal = isMatched && rawSheetRows[0] ? String(rawSheetRows[0][mappedCol] ?? "") : "";

                      return (
                        <div
                          key={field.key}
                          className={`p-3 rounded-xl border transition ${
                            isMatched
                              ? "bg-white dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/50 shadow-2xs"
                              : "bg-white/60 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                              <field.icon size={12} className={isMatched ? "text-emerald-500" : "text-gray-400"} />
                              <span>{field.label}</span>
                              {field.required && <span className="text-rose-500 text-[11px]">*</span>}
                            </span>
                            {isMatched ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                ✓ Matched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                Not in file
                              </span>
                            )}
                          </div>

                          <select
                            value={mappedCol}
                            onChange={(e) =>
                              handleUpdateFieldMapping(
                                field.key as keyof typeof fieldMappings,
                                e.target.value
                              )
                            }
                            className="w-full text-xs font-semibold px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200"
                          >
                            <option value="">-- Do not map (Use default) --</option>
                            {sheetHeaders.map((hdr) => (
                              <option key={hdr} value={hdr}>
                                Column: {hdr}
                              </option>
                            ))}
                          </select>

                          <div className="mt-1.5 text-[11px] text-gray-400 truncate flex items-center justify-between gap-1">
                            <span className="text-[10px] font-medium text-gray-400">Row 1 sample:</span>
                            <span
                              className="font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]"
                              title={sampleVal || field.fallbackHint}
                            >
                              {sampleVal ? `"${sampleVal}"` : field.fallbackHint}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Live Data Preview with Matched Fields */}
              {parsedRows.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 flex-wrap">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Data Preview ({parsedRows.length} Unique Contacts Ready to Import)</span>
                      {mergedInSheetCount > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          ⚡ {mergedInSheetCount} duplicate rows merged in file
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-gray-400">Showing first 4 rows with matched fields</span>
                  </div>

                  <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-slate-900/50">
                    <div className="max-h-52 overflow-x-auto overflow-y-auto divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold text-[11px]">
                          <tr>
                            <th className="px-3 py-2.5">
                              <div>Phone Number</div>
                              <div className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 truncate">
                                ← {fieldMappings.phoneNumber ? `"${fieldMappings.phoneNumber}"` : "Auto"}
                              </div>
                            </th>
                            <th className="px-3 py-2.5">
                              <div>Country Code</div>
                              <div className="text-[10px] font-normal text-gray-400 truncate">
                                ← {fieldMappings.countryCode ? `"${fieldMappings.countryCode}"` : importDefaultCc}
                              </div>
                            </th>
                            <th className="px-3 py-2.5">
                              <div>Full Name</div>
                              <div className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 truncate">
                                ← {fieldMappings.fullName ? `"${fieldMappings.fullName}"` : "Auto"}
                              </div>
                            </th>
                            <th className="px-3 py-2.5">
                              <div>Business / Shop</div>
                              <div className="text-[10px] font-normal text-gray-400 truncate">
                                ← {fieldMappings.businessName ? `"${fieldMappings.businessName}"` : "—"}
                              </div>
                            </th>
                            <th className="px-3 py-2.5">
                              <div>Tags</div>
                              <div className="text-[10px] font-normal text-gray-400 truncate">
                                ← {fieldMappings.tags ? `"${fieldMappings.tags}"` : "None"}
                              </div>
                            </th>
                            <th className="px-3 py-2.5">
                              <div>Customer Type</div>
                              <div className="text-[10px] font-normal text-gray-400 truncate">
                                ← {fieldMappings.customerType ? `"${fieldMappings.customerType}"` : "Retailer"}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-gray-300">
                          {parsedRows.slice(0, 4).map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800/80">
                              <td className="px-3 py-2 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {row.phoneNumber || "—"}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                                {row.countryCode || importDefaultCc}
                              </td>
                              <td className="px-3 py-2 font-medium whitespace-nowrap">
                                {row.fullName || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {row.businessName || "—"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {row.tags
                                    ? String(row.tags)
                                        .split(",")
                                        .map((t: string) => t.trim())
                                        .filter(Boolean)
                                        .map((t: string, tidx: number) => (
                                          <span
                                            key={tidx}
                                            className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-semibold whitespace-nowrap"
                                          >
                                            {t}
                                          </span>
                                        ))
                                    : <span className="text-gray-400 text-[10px]">—</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-medium">
                                {row.customerType || "Retailer"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 4 && (
                      <div className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700">
                        + {parsedRows.length - 4} more contacts will be imported with this matched mapping
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Configuration Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Default Country Code */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default Country Code (if missing):
                  </label>
                  <select
                    value={importDefaultCc}
                    onChange={(e) => setImportDefaultCc(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="+91">+91 (India)</option>
                    <option value="+1">+1 (USA / Canada)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+971">+971 (UAE)</option>
                    <option value="+966">+966 (Saudi Arabia)</option>
                    <option value="+65">+65 (Singapore)</option>
                    <option value="+61">+61 (Australia)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Automatically attached to 10-digit mobile numbers
                  </p>
                </div>

                {/* Batch Tag */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Assign Batch Tag (Optional):
                  </label>
                  <input
                    type="text"
                    value={importBatchTag}
                    onChange={(e) => setImportBatchTag(e.target.value)}
                    placeholder="e.g. BulkImport-2026, RetailExhibition"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Applies to all contacts in this upload
                  </p>
                </div>
              </div>

              {/* Advanced Flags */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importAppendTags}
                    onChange={(e) => setImportAppendTags(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Merge new tags with existing contact tags (prevents tag loss)</span>
                </label>

                {isCrmConnected && (
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importPushToCrm}
                      onChange={(e) => setImportPushToCrm(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Mark imported contacts as pushed to CRM (Status: DONE)</span>
                  </label>
                )}
              </div>

              {/* Live Batch Import Progress Bar */}
              {importProgress && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-emerald-600" />
                      <span>
                        Importing: {importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} contacts
                      </span>
                    </span>
                    <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300 font-extrabold">
                      {importProgress.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(3, importProgress.percent)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex justify-between items-center">
                    <span>Batch {importProgress.batchNumber} of {importProgress.totalBatches} (150 contacts per batch)</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">⚡ Deduplicating & updating in real-time</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
              <button
                type="button"
                onClick={handleDownloadDummyTemplate}
                disabled={importing}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Download size={13} />
                <span>Get Dummy Template</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  disabled={importing}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={parsedRows.length === 0 || importing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  {importing ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  <span>
                    {importing
                      ? `Importing (${importProgress ? `${importProgress.percent}%` : "Please wait..."})`
                      : `Import ${parsedRows.length > 0 ? parsedRows.length.toLocaleString() : ""} Contacts`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* POST-IMPORT ASSIGNMENT MODAL (AGENT, TEAM, ROUND-ROBIN)  */}
      {/* --------------------------------------------------------- */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 rounded-2xl">
                  <Shuffle size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      Assign Imported Contacts
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {importedCustomerIds.length} Contacts Ready
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose how to assign these contacts to your sales agents or teams
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSkipAssignment}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Select Assignment Method:
              </label>

              {/* 4 Selectable Method Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Do Not Assign */}
                <div
                  onClick={() => setAssignMode("NONE")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    assignMode === "NONE"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      assignMode === "NONE"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                    }`}
                  >
                    <UserX size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>Do Not Assign</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Leave in unassigned pool. Sales reps can pick or assign them later.
                    </p>
                  </div>
                </div>

                {/* 2. Specific Agent */}
                <div
                  onClick={() => setAssignMode("DIRECT_AGENT")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    assignMode === "DIRECT_AGENT"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      assignMode === "DIRECT_AGENT"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                    }`}
                  >
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>Specific Agent</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Assign all {importedCustomerIds.length} contacts to one selected salesperson.
                    </p>
                  </div>
                </div>

                {/* 3. Assign to Team */}
                <div
                  onClick={() => setAssignMode("TEAM")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    assignMode === "TEAM"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      assignMode === "TEAM"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                    }`}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>Assign to Team</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Route contacts to a department queue without locking to a single agent.
                    </p>
                  </div>
                </div>

                {/* 4. Round-Robin Distribution */}
                <div
                  onClick={() => setAssignMode("ROUND_ROBIN")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    assignMode === "ROUND_ROBIN"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      assignMode === "ROUND_ROBIN"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                    }`}
                  >
                    <Shuffle size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>Round-Robin</span>
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded text-[9px] font-extrabold">
                        Balanced
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Evenly rotate leads across agents (Team or Custom Agent basis).
                    </p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC CONFIGURATION PANELS */}

              {/* Panel 1: Direct Agent Selector */}
              {assignMode === "DIRECT_AGENT" && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Select Sales Rep / Agent:
                  </label>
                  {employeesList.length > 0 ? (
                    <select
                      value={assignAgentId}
                      onChange={(e) => setAssignAgentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {employeesList.map((emp: any) => {
                        const name = emp.user?.name || emp.name || "Agent";
                        const team = emp.team?.name ? ` · ${emp.team.name}` : "";
                        const chats = emp.assignedWhatsAppConversations?.length || 0;
                        return (
                          <option key={emp.id} value={emp.id}>
                            {name} {team} ({chats} open chats)
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
                      No active agents found in the system. Create agents in WhatsApp Settings.
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    All {importedCustomerIds.length} contacts and their active WhatsApp chats will be assigned directly to this agent.
                  </p>
                </div>
              )}

              {/* Panel 2: Team Selector */}
              {assignMode === "TEAM" && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Select Team / Department:
                  </label>
                  {teamsList.length > 0 ? (
                    <select
                      value={assignTeamId}
                      onChange={(e) => setAssignTeamId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {teamsList.map((team: any) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.members?.length || 0} agents)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
                      No teams created yet. Create teams under WhatsApp Settings &gt; Teams.
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Contacts will be routed to this department queue and visible to all team members.
                  </p>
                </div>
              )}

              {/* Panel 3: Round-Robin Distribution (With Selectable Both Basis) */}
              {assignMode === "ROUND_ROBIN" && (
                <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                      Round-Robin Distribution Basis (Selectable):
                    </label>
                    {/* Basis Selector Pills */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoundRobinBasis("TEAM")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          roundRobinBasis === "TEAM"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        <Users size={13} />
                        <span>Team Basis</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoundRobinBasis("AGENTS")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          roundRobinBasis === "AGENTS"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        <UserCheck size={13} />
                        <span>Select Agents</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoundRobinBasis("ALL_ACTIVE")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          roundRobinBasis === "ALL_ACTIVE"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        <Shuffle size={13} />
                        <span>All Active</span>
                      </button>
                    </div>
                  </div>

                  {/* Basis Sub-Form: Team Basis */}
                  {roundRobinBasis === "TEAM" && (
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Select Team to Distribute Across:
                      </label>
                      <select
                        value={assignRoundRobinTeamId}
                        onChange={(e) => setAssignRoundRobinTeamId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {teamsList.map((team: any) => (
                          <option key={team.id} value={team.id}>
                            {team.name} ({team.members?.length || 0} agents)
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const selTeam = teamsList.find((t: any) => t.id === assignRoundRobinTeamId);
                        const count = selTeam?.members?.length || 0;
                        const perAgent = count > 0 ? Math.ceil(importedCustomerIds.length / count) : 0;
                        return (
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                            💡 Each agent in <strong>{selTeam?.name || "this team"}</strong> ({count} members) will receive approximately <strong>~{perAgent} contacts</strong>.
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Basis Sub-Form: Custom Agent Multi-Select */}
                  {roundRobinBasis === "AGENTS" && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          Select Specific Agents ({assignSelectedAgentIds.length} of {employeesList.length} chosen):
                        </label>
                        <div className="flex gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setAssignSelectedAgentIds(employeesList.map((e: any) => e.id))}
                            className="text-indigo-600 hover:underline font-bold"
                          >
                            Select All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setAssignSelectedAgentIds([])}
                            className="text-gray-500 hover:underline font-bold"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        {employeesList.map((emp: any) => {
                          const isChecked = assignSelectedAgentIds.includes(emp.id);
                          const name = emp.user?.name || emp.name || "Agent";
                          const team = emp.team?.name || "General";
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition border text-xs ${
                                isChecked
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold"
                                  : "hover:bg-gray-50 dark:hover:bg-slate-700/50 border-transparent text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAssignSelectedAgentIds([...assignSelectedAgentIds, emp.id]);
                                  } else {
                                    setAssignSelectedAgentIds(assignSelectedAgentIds.filter((id) => id !== emp.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="truncate">
                                <div>{name}</div>
                                <div className="text-[10px] text-gray-400 font-normal">{team}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {assignSelectedAgentIds.length > 0 ? (
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                          💡 Each of the <strong>{assignSelectedAgentIds.length} selected agents</strong> will receive approximately <strong>~{Math.ceil(importedCustomerIds.length / assignSelectedAgentIds.length)} contacts</strong>.
                        </div>
                      ) : (
                        <div className="text-[11px] text-rose-500 font-medium">
                          Please select at least one agent.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Basis Sub-Form: All Active */}
                  {roundRobinBasis === "ALL_ACTIVE" && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      <div className="font-bold text-gray-800 dark:text-white">
                        Organization-Wide Active Agent Round-Robin
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Contacts will be distributed cyclically across all active agents currently marked available for chat in the company.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
              <button
                type="button"
                onClick={handleSkipAssignment}
                className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                Skip (Leave Unassigned)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkipAssignment}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAssignment}
                  disabled={assigningLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  {assigningLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  <span>
                    {assigningLoading
                      ? "Assigning Contacts..."
                      : assignMode === "NONE"
                      ? "Keep Unassigned"
                      : `Confirm Assignment (${importedCustomerIds.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
