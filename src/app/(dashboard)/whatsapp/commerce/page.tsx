"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, CheckCircle2, AlertTriangle, RefreshCw, Plus, Store, ExternalLink, 
  Eye, EyeOff, ShoppingBag, Sparkles, X, Image as ImageIcon, Tag, Layers, ArrowUpRight,
  Upload, Trash2, Check, Sliders, ChevronDown, CheckSquare, Square, Edit3, Trash
} from "lucide-react";
import Link from "next/link";
import { 
  getShopifyCredentialsAction, 
  syncShopifyProductsAction, 
  getProductsAction, 
  toggleProductVisibilityAction,
  getMetaCatalogStatusAction,
  syncMetaCatalogProductsAction,
  createAndPushCatalogProductAction,
  pushSingleProductToMetaAction,
  getActiveCatalogPlatformAction,
  switchActiveCatalogPlatformAction,
  deleteInactiveProductsAction,
  updateProductGroupAction,
  deleteProductGroupAction,
  deleteSingleProductAction,
  quickUpdateProductImageAction,
  linkMetaCatalogToWhatsAppAction,
  getWhatsAppCommerceStatusAction
} from "@/app/actions/whatsAppPlatformActions";

// Graceful product thumbnail with 404 error suppression and hover device photo upload
export function ProductThumbnail({ 
  src, 
  alt = "", 
  className = "w-11 h-11", 
  onQuickUpload 
}: { 
  src?: string; 
  alt?: string; 
  className?: string; 
  onQuickUpload?: () => void; 
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div className={`relative group/thumb bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0 ${className}`}>
      {src && !hasError ? (
        <img 
          src={src} 
          alt="" 
          onError={() => setHasError(true)} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <Store size={18} className="text-gray-400" />
      )}
      {onQuickUpload && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickUpload();
          }}
          className="absolute inset-0 bg-black/65 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center text-white transition-opacity text-[9px] font-bold cursor-pointer"
          title="Upload new photo from device"
        >
          <Upload size={12} />
          <span className="leading-tight mt-0.5">Upload</span>
        </button>
      )}
    </div>
  );
}


// Shopify-style Preset Option Definitions with Quick Value Suggestions
export const PRESET_OPTION_DEFINITIONS = [
  { 
    name: "Color", 
    suggestions: ["Black", "White", "Navy Blue", "Olive Green", "Charcoal Grey", "Royal Blue", "Maroon", "Beige"] 
  },
  { 
    name: "Size", 
    suggestions: ["S", "M", "L", "XL", "2XL", "3XL", "Free Size"] 
  },
  { 
    name: "Pack / Pieces", 
    suggestions: ["1 Pc Sample", "Set of 2 Pcs", "Pack of 3", "Pack of 5", "Box of 10", "Bundle (12 Pcs)", "Master Carton (50 Pcs)"] 
  },
  { 
    name: "Design / Print", 
    suggestions: ["Solid / Plain", "Striped", "Graphic Print", "Army Camo", "Typography", "Embroidered", "Colorblock"] 
  },
  { 
    name: "Fabric / GSM", 
    suggestions: ["180 GSM Cotton", "240 GSM Terry", "4-Way Lycra", "NS 100% Polyester", "Dry-Fit Mesh"] 
  }
];

export const PRESET_CATEGORIES = [
  "T-Shirts", "Activewear", "Track Pants", "Shorts", "Hoodies & Sweatshirts", 
  "Compression Wear", "Polos", "Jackets", "Wholesale Sampler Kits"
];

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
  inputValue: string;
}

export interface VariantMatrixItem {
  id: string;
  label: string;
  sku: string;
  price: number;
  compareAt: number;
  inventory: number;
  imageUrl?: string;
  color?: string;
  size?: string;
  pattern?: string;
}

export default function ProductsCommercePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Shopify Integration State
  const [isShopifyConnected, setIsShopifyConnected] = useState(false);
  const [isFetchingShopify, setIsFetchingShopify] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");

  // Meta Catalog Integration State
  const [metaCatalog, setMetaCatalog] = useState<{
    isConnected: boolean;
    catalogId?: string;
    catalogName?: string;
    productCount?: number;
  }>({ isConnected: false });
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [pushingProductId, setPushingProductId] = useState<string | null>(null);

  // Active Catalog Platform State & Filtering
  const [activePlatform, setActivePlatform] = useState<'META' | 'SHOPIFY'>('META');
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<'ACTIVE_PLATFORM' | 'INACTIVE' | 'ALL'>('ACTIVE_PLATFORM');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingTargetPlatform, setPendingTargetPlatform] = useState<'META' | 'SHOPIFY' | null>(null);
  const [switchCleanupOption, setSwitchCleanupOption] = useState<'deactivate' | 'delete'>('deactivate');
  const [isSwitchingPlatform, setIsSwitchingPlatform] = useState(false);
  const [isPurgingInactive, setIsPurgingInactive] = useState(false);

  // Toast / Status notification banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  
  // Catalog Maker Modal State
  const [showCatalogMaker, setShowCatalogMaker] = useState(false);
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState(false);

  // Form State
  const [productForm, setProductForm] = useState({
    title: "",
    baseSku: "",
    description: "",
    category: "T-Shirts",
    brand: "Esponsports",
    sellingPrice: "",
    compareAtPrice: "",
    costPrice: "",
    imageUrl: "",
    pushToMeta: true
  });

  // Direct Image Upload State
  const [isUploadingPrimaryImage, setIsUploadingPrimaryImage] = useState(false);
  const [uploadingVariantSku, setUploadingVariantSku] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const primaryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Shopify-style Options State ("This product has options, like size or color")
  const [hasOptions, setHasOptions] = useState(true);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([
    { id: "opt_color", name: "Color", values: ["Black", "Navy Blue"], inputValue: "" },
    { id: "opt_size", name: "Size", values: ["M", "L", "XL"], inputValue: "" }
  ]);

  // Generated variant matrix
  const [variantsMatrix, setVariantsMatrix] = useState<VariantMatrixItem[]>([]);

  // -------------------------------------------------------------
  // Product Edit Modal State
  // -------------------------------------------------------------
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "Apparel",
    description: "",
    primaryImage: "",
    syncToMeta: true
  });
  const [editVariants, setEditVariants] = useState<Array<{
    id?: string;
    sku: string;
    variantTitle: string;
    color: string;
    size: string;
    price: number;
    compareAt: number;
    cost: number;
    inventory: number;
    status: string;
    imageUrl: string;
    isNew?: boolean;
    isDeleted?: boolean;
  }>>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingEditPrimaryImage, setIsUploadingEditPrimaryImage] = useState(false);
  const [uploadingEditVariantSku, setUploadingEditVariantSku] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const editVariantFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadVariantSku, setActiveUploadVariantSku] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Product Delete Confirmation States
  // -------------------------------------------------------------
  const [deletingGroup, setDeletingGroup] = useState<any | null>(null);
  const [deleteFromMeta, setDeleteFromMeta] = useState(true);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const [deletingVariant, setDeletingVariant] = useState<{ group: any; variant: any } | null>(null);
  const [deleteVariantFromMeta, setDeleteVariantFromMeta] = useState(true);
  const [isDeletingVariant, setIsDeletingVariant] = useState(false);

  // Catalog Link to WhatsApp State
  const [linkingCatalog, setLinkingCatalog] = useState(false);
  const [catalogLinkedStatus, setCatalogLinkedStatus] = useState<{ linked: boolean; phone?: string } | null>(null);

  // -------------------------------------------------------------
  // Quick Image Upload State (from table hover)
  // -------------------------------------------------------------
  const [quickUploadGroup, setQuickUploadGroup] = useState<any | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  // Open Edit Modal for a Product Group
  const handleOpenEditModal = (group: any) => {
    setEditingGroup(group);
    setEditForm({
      name: group.baseName,
      category: group.collection || group.variants[0]?.category || "Apparel",
      description: group.description || "",
      primaryImage: group.image || "",
      syncToMeta: metaCatalog.isConnected
    });
    setEditVariants(
      group.variants.map((v: any) => ({
        id: v.dbId,
        sku: v.sku || "",
        variantTitle: v.variantTitle || "Default Variant",
        color: v.color || "",
        size: v.size || "",
        price: v.price || 0,
        compareAt: v.compareAt || v.price || 0,
        cost: v.cost || Math.round((v.price || 0) * 0.5),
        inventory: v.inventory ?? 20,
        status: v.status || "Active",
        imageUrl: v.image || group.image || "",
        isNew: false,
        isDeleted: false
      }))
    );
  };

  // Edit Variant matrix row updater
  const handleEditVariantField = (sku: string, field: string, val: any) => {
    setEditVariants(prev => prev.map(v => v.sku === sku ? { ...v, [field]: val } : v));
  };

  const handleMarkVariantDeleted = (sku: string) => {
    const remaining = editVariants.filter(v => !v.isDeleted && v.sku !== sku);
    if (remaining.length === 0) {
      showToast("A product must keep at least 1 variant. To delete the whole product, use Delete Product instead.", "error");
      return;
    }
    setEditVariants(prev => prev.map(v => v.sku === sku ? { ...v, isDeleted: true } : v));
  };

  const handleAddVariantToEdit = () => {
    const count = editVariants.filter(v => !v.isDeleted).length + 1;
    const baseClean = editForm.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || "PROD";
    const genSku = `${baseClean}-VAR-${Date.now().toString(36).toUpperCase()}-${count}`;
    const firstActive = editVariants.find(v => !v.isDeleted);
    
    setEditVariants(prev => [
      ...prev,
      {
        sku: genSku,
        variantTitle: `New Variant ${count}`,
        color: "",
        size: "",
        price: firstActive ? firstActive.price : 999,
        compareAt: firstActive ? firstActive.compareAt : 1999,
        cost: firstActive ? firstActive.cost : 499,
        inventory: 20,
        status: "Active",
        imageUrl: editForm.primaryImage || "",
        isNew: true,
        isDeleted: false
      }
    ]);
  };

  // Direct Image Upload for Edit Modal
  const handleEditImageUpload = async (file: File, variantSku?: string) => {
    if (!file) return;
    if (variantSku) {
      setUploadingEditVariantSku(variantSku);
    } else {
      setIsUploadingEditPrimaryImage(true);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/whatsapp/upload-product-image", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        if (variantSku) {
          setEditVariants(prev => prev.map(v => v.sku === variantSku ? { ...v, imageUrl: data.url } : v));
          showToast("Variant photo updated!", "success");
        } else {
          setEditForm(prev => ({ ...prev, primaryImage: data.url }));
          setEditVariants(prev => prev.map(v => v.imageUrl ? v : { ...v, imageUrl: data.url }));
          showToast("Primary product photo updated!", "success");
        }
      } else {
        showToast(data.error || "Upload failed", "error");
      }
    } catch (e: any) {
      showToast("Image upload error: " + e.message, "error");
    } finally {
      setIsUploadingEditPrimaryImage(false);
      setUploadingEditVariantSku(null);
    }
  };

  // Save Edit Product Group changes
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      showToast("Product name cannot be empty.", "error");
      return;
    }

    const activeVars = editVariants.filter(v => !v.isDeleted);
    if (activeVars.length === 0) {
      showToast("Product must have at least one active variant.", "error");
      return;
    }

    setIsSavingEdit(true);
    try {
      const productIds = editingGroup.variants.map((v: any) => v.dbId).filter(Boolean);
      const res = await updateProductGroupAction({
        productIds,
        name: editForm.name,
        category: editForm.category,
        description: editForm.description,
        primaryImage: editForm.primaryImage,
        variants: editVariants,
        syncToMeta: editForm.syncToMeta
      });

      if (res.success) {
        showToast(res.message || "Product updated successfully!", "success");
        await fetchProducts();
        setEditingGroup(null);
      } else {
        showToast("Update error: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Failed to update product: " + e.message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Confirm Delete Product Group
  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    setIsDeletingGroup(true);
    try {
      const productIds = deletingGroup.variants.map((v: any) => v.dbId).filter(Boolean);
      const skus = deletingGroup.variants.map((v: any) => v.sku).filter(Boolean);

      const res = await deleteProductGroupAction({
        productIds,
        skus,
        deleteFromMeta
      });

      if (res.success) {
        showToast(res.message || "Product deleted successfully!", "success");
        await fetchProducts();
        setDeletingGroup(null);
      } else {
        showToast("Delete failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error deleting product: " + e.message, "error");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // Confirm Delete Single Variant
  const handleConfirmDeleteSingleVariant = async () => {
    if (!deletingVariant) return;
    setIsDeletingVariant(true);
    try {
      const res = await deleteSingleProductAction({
        productId: deletingVariant.variant.dbId,
        sku: deletingVariant.variant.sku,
        deleteFromMeta: deleteVariantFromMeta
      });

      if (res.success) {
        showToast(res.message || "Variant deleted successfully!", "success");
        await fetchProducts();
        setDeletingVariant(null);
      } else {
        showToast("Delete failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error deleting variant: " + e.message, "error");
    } finally {
      setIsDeletingVariant(false);
    }
  };

  // Quick image change trigger from table thumbnail
  const handleQuickImageClick = (group: any) => {
    setQuickUploadGroup(group);
    quickFileInputRef.current?.click();
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const handleToggleVisibility = async (dbId: string, currentStatus: string) => {
    if (!dbId) return;
    const targetStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const res = await toggleProductVisibilityAction(dbId, targetStatus);
    if (res.success) {
      await fetchProducts();
    } else {
      showToast("Failed to update visibility: " + res.error, "error");
    }
  };

  const handleToggleAllVisibility = async (variantsList: any[]) => {
    if (variantsList.length === 0) return;
    const anyActive = variantsList.some(v => v.status === "Active");
    const targetStatus = anyActive ? "Inactive" : "Active";
    
    for (const v of variantsList) {
      if (v.dbId) {
        await toggleProductVisibilityAction(v.dbId, targetStatus);
      }
    }
    await fetchProducts();
  };

  const toggleGroup = (baseName: string) => {
    if (expandedGroups.includes(baseName)) {
      setExpandedGroups(expandedGroups.filter(g => g !== baseName));
    } else {
      setExpandedGroups([...expandedGroups, baseName]);
    }
  };

  const fetchProducts = async () => {
    const res = await getProductsAction();
    if (res.success && res.products && res.products.length > 0) {
      const mapped = res.products.map((p: any, idx: number) => ({
        id: idx + 1,
        dbId: p.id,
        name: p.name,
        sku: p.sku || "",
        articleNumber: p.subCategory || p.articleNumber || "",
        platform: p.hsnCode || (p.sku?.startsWith("SP-") ? "SHOPIFY" : "META"),
        price: p.sellingPrice || 0,
        compareAt: p.mrp || 0,
        cost: p.purchasePrice || 0,
        inventory: p.stockQuantity || 0,
        status: p.status || "Active",
        image: p.images?.[0] || "",
        description: p.description || "",
        collection: p.category || p.fabric || "General",
        color: p.color || "",
        size: p.size || ""
      }));
      setProducts(mapped);
    }
  };

  const checkIntegrations = async () => {
    getActiveCatalogPlatformAction().then((res) => {
      if (res.success && (res.activePlatform === 'SHOPIFY' || res.activePlatform === 'META')) {
        setActivePlatform(res.activePlatform);
      }
    });

    getShopifyCredentialsAction().then((res) => {
      if (res.success && res.credentials?.shopifyAccessToken) {
        setIsShopifyConnected(true);
        setShopifyDomain(res.credentials.shopifyStoreDomain || "Connected Store");
      }
    });

    getMetaCatalogStatusAction().then((res) => {
      if (res.success && res.isConnected) {
        setMetaCatalog({
          isConnected: true,
          catalogId: res.catalogId,
          catalogName: res.catalogName,
          productCount: res.productCount
        });
      } else {
        setMetaCatalog({ isConnected: false });
      }
    });

    getWhatsAppCommerceStatusAction().then((res) => {
      if (res.success) {
        setCatalogLinkedStatus({ linked: res.isCatalogVisible, phone: res.phoneNumber });
      }
    }).catch(() => {});
  };

  const handleLinkCatalog = async () => {
    setLinkingCatalog(true);
    try {
      const res = await linkMetaCatalogToWhatsAppAction(metaCatalog.catalogId);
      if (res.success) {
        setCatalogLinkedStatus({ linked: true, phone: res.phoneNumber });
        alert(`✓ Success! Linked Meta Catalog (${res.catalogId}) to WhatsApp Number (${res.phoneNumber || "API"}).\nCart and Catalog storefront are now live on your WhatsApp Business API profile!`);
      } else {
        alert(`Failed to link catalog: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLinkingCatalog(false);
    }
  };

  useEffect(() => {
    checkIntegrations();
    fetchProducts();
  }, []);

  const handleEditChange = (id: number, field: string, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: Number(value) || 0 } : p));
  };

  const calculateMargin = (price: number, cost: number) => {
    if (!price || !cost) return "0%";
    return (((price - cost) / price) * 100).toFixed(1) + "%";
  };

  // Initiate Platform Switch modal
  const handleInitiateSwitchPlatform = (target: 'META' | 'SHOPIFY') => {
    if (target === activePlatform) return;
    setPendingTargetPlatform(target);
    setShowSwitchModal(true);
  };

  // Confirm Platform Switch
  const handleConfirmSwitchPlatform = async () => {
    if (!pendingTargetPlatform) return;
    setIsSwitchingPlatform(true);
    try {
      const res = await switchActiveCatalogPlatformAction(pendingTargetPlatform, switchCleanupOption);
      if (res.success) {
        setActivePlatform(pendingTargetPlatform);
        showToast(res.message || `Switched active platform to ${pendingTargetPlatform}`, "success");
        await fetchProducts();
        setShowSwitchModal(false);
        setPendingTargetPlatform(null);
      } else {
        showToast("Failed to switch platform: " + res.error, "error");
      }
    } catch (err: any) {
      showToast("Error switching platform: " + err.message, "error");
    } finally {
      setIsSwitchingPlatform(false);
    }
  };

  // Delete all inactive products
  const handleDeleteInactive = async () => {
    if (!confirm("Are you sure you want to permanently delete all inactive products from the database? This cannot be undone.")) return;
    setIsPurgingInactive(true);
    try {
      const res = await deleteInactiveProductsAction();
      if (res.success) {
        showToast(res.message || "Inactive products deleted!", "success");
        await fetchProducts();
      } else {
        showToast("Delete Failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error deleting: " + e.message, "error");
    } finally {
      setIsPurgingInactive(false);
    }
  };
  
  // Sync live from Meta Catalog
  const handleSyncMetaCatalog = async (cleanup: 'deactivate' | 'delete' = 'deactivate') => {
    setIsSyncingMeta(true);
    setToast(null);
    try {
      const res = await syncMetaCatalogProductsAction({ cleanupPrevious: cleanup });
      if (res.success) {
        setActivePlatform('META');
        showToast(res.message || `Successfully synced ${res.count} products from Meta!`, "success");
        await fetchProducts();
        await checkIntegrations();
      } else {
        showToast("Meta Catalog Sync Failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error syncing from Meta: " + e.message, "error");
    } finally {
      setIsSyncingMeta(false);
    }
  };

  // Sync from Shopify
  const handleFetchShopify = async (cleanup: 'deactivate' | 'delete' = 'deactivate') => {
    setIsFetchingShopify(true);
    try {
      const res = await syncShopifyProductsAction({ cleanupPrevious: cleanup });
      if (res.success) {
        setActivePlatform('SHOPIFY');
        showToast(res.message || "Shopify synced successfully!", "success");
        await fetchProducts();
        await checkIntegrations();
      } else {
        showToast("Shopify Sync Failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error syncing from Shopify: " + e.message, "error");
    } finally {
      setIsFetchingShopify(false);
    }
  };

  // Push single product/variant to Meta Catalog
  const handlePushSingleToMeta = async (productId: string) => {
    if (!productId) return;
    setPushingProductId(productId);
    try {
      const res = await pushSingleProductToMetaAction(productId);
      if (res.success) {
        showToast(res.message || "Product pushed to Meta Catalog!", "success");
      } else {
        showToast("Meta Push Error: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Failed to push to Meta: " + e.message, "error");
    } finally {
      setPushingProductId(null);
    }
  };

  // -------------------------------------------------------------
  // Variant Matrix Generator for Catalog Maker Modal
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Direct Image File Upload Handler (Saved to PostgreSQL & Served via HTTPS)
  // -------------------------------------------------------------
  const handleImageUpload = async (file: File, variantSku?: string) => {
    if (!file) return;
    if (variantSku) {
      setUploadingVariantSku(variantSku);
    } else {
      setIsUploadingPrimaryImage(true);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/whatsapp/upload-product-image", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success && data.url) {
        if (variantSku) {
          setVariantsMatrix(prev => prev.map(v => v.sku === variantSku ? { ...v, imageUrl: data.url } : v));
          showToast("Variant photo updated!", "success");
        } else {
          setProductForm(prev => ({ ...prev, imageUrl: data.url }));
          // Also set default image on variants that don't have a custom image yet
          setVariantsMatrix(prev => prev.map(v => v.imageUrl ? v : { ...v, imageUrl: data.url }));
          showToast("Product image uploaded successfully!", "success");
        }
      } else {
        showToast(data.error || "Image upload failed.", "error");
      }
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setIsUploadingPrimaryImage(false);
      setUploadingVariantSku(null);
    }
  };

  // -------------------------------------------------------------
  // Shopify-Style Variant Matrix Generator
  // -------------------------------------------------------------
  const recomputeVariantsMatrix = (
    options: ProductOption[],
    baseSku: string,
    sPrice: number,
    cPrice: number,
    hasOpts: boolean = hasOptions,
    currentImgUrl: string = productForm.imageUrl
  ) => {
    const cleanSku = (baseSku || "PROD").trim().toUpperCase();
    const cleanPrice = sPrice || 0;
    const cleanCompare = cPrice || cleanPrice;

    if (!hasOpts) {
      setVariantsMatrix([
        {
          id: cleanSku,
          label: "Default",
          sku: cleanSku,
          price: cleanPrice,
          compareAt: cleanCompare,
          inventory: 20,
          imageUrl: currentImgUrl
        }
      ]);
      return;
    }

    const activeOptions = options.filter(o => o.name.trim() && o.values.length > 0);

    if (activeOptions.length === 0) {
      setVariantsMatrix([
        {
          id: cleanSku,
          label: "Default",
          sku: cleanSku,
          price: cleanPrice,
          compareAt: cleanCompare,
          inventory: 20,
          imageUrl: currentImgUrl
        }
      ]);
      return;
    }

    // Cartesian combinations across all active options
    let combinations: string[][] = [[]];
    for (const opt of activeOptions) {
      const next: string[][] = [];
      for (const prefix of combinations) {
        for (const val of opt.values) {
          next.push([...prefix, val]);
        }
      }
      combinations = next;
    }

    const newMatrix: VariantMatrixItem[] = combinations.map(combo => {
      const label = combo.join(" / ");
      const slugSuffix = combo
        .map(v => v.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean)
        .join("-");
      const variantSku = slugSuffix ? `${cleanSku}-${slugSuffix}` : cleanSku;

      const existing = variantsMatrix.find(v => v.sku === variantSku || v.label === label);

      let color: string | undefined;
      let size: string | undefined;
      let pattern: string | undefined;

      activeOptions.forEach((opt, idx) => {
        const lower = opt.name.toLowerCase();
        if (lower.includes("color")) color = combo[idx];
        else if (lower.includes("size")) size = combo[idx];
        else if (lower.includes("design") || lower.includes("print") || lower.includes("pattern")) pattern = combo[idx];
      });

      return {
        id: variantSku,
        label,
        sku: existing?.sku || variantSku,
        price: existing?.price ?? cleanPrice,
        compareAt: existing?.compareAt ?? cleanCompare,
        inventory: existing?.inventory ?? 20,
        imageUrl: existing?.imageUrl || currentImgUrl,
        color,
        size,
        pattern
      };
    });

    setVariantsMatrix(newMatrix);
  };

  // Shopify-Style Options Actions
  const handleToggleHasOptions = (enabled: boolean) => {
    setHasOptions(enabled);
    recomputeVariantsMatrix(
      productOptions,
      productForm.baseSku,
      Number(productForm.sellingPrice) || 0,
      Number(productForm.compareAtPrice) || 0,
      enabled
    );
  };

  const handleAddOption = () => {
    if (productOptions.length >= 3) {
      showToast("Shopify standard supports up to 3 option groups per product.", "info");
      return;
    }
    const unusedPresets = PRESET_OPTION_DEFINITIONS.filter(p => !productOptions.some(o => o.name.toLowerCase() === p.name.toLowerCase()));
    const nextName = unusedPresets[0]?.name || `Option ${productOptions.length + 1}`;

    const newOpt: ProductOption = {
      id: `opt_${Date.now()}`,
      name: nextName,
      values: [],
      inputValue: ""
    };
    const updated = [...productOptions, newOpt];
    setProductOptions(updated);
  };

  const handleRemoveOption = (optionId: string) => {
    const updated = productOptions.filter(o => o.id !== optionId);
    setProductOptions(updated);
    recomputeVariantsMatrix(
      updated,
      productForm.baseSku,
      Number(productForm.sellingPrice) || 0,
      Number(productForm.compareAtPrice) || 0
    );
  };

  const handleOptionNameChange = (optionId: string, newName: string) => {
    const updated = productOptions.map(o => o.id === optionId ? { ...o, name: newName } : o);
    setProductOptions(updated);
    recomputeVariantsMatrix(
      updated,
      productForm.baseSku,
      Number(productForm.sellingPrice) || 0,
      Number(productForm.compareAtPrice) || 0
    );
  };

  const handleAddOptionValue = (optionId: string, val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const targetOpt = productOptions.find(o => o.id === optionId);
    if (!targetOpt || targetOpt.values.includes(trimmed)) return;

    const updated = productOptions.map(o => o.id === optionId ? {
      ...o,
      values: [...o.values, trimmed],
      inputValue: ""
    } : o);

    setProductOptions(updated);
    recomputeVariantsMatrix(
      updated,
      productForm.baseSku,
      Number(productForm.sellingPrice) || 0,
      Number(productForm.compareAtPrice) || 0
    );
  };

  const handleRemoveOptionValue = (optionId: string, valToRemove: string) => {
    const updated = productOptions.map(o => o.id === optionId ? {
      ...o,
      values: o.values.filter(v => v !== valToRemove)
    } : o);

    setProductOptions(updated);
    recomputeVariantsMatrix(
      updated,
      productForm.baseSku,
      Number(productForm.sellingPrice) || 0,
      Number(productForm.compareAtPrice) || 0
    );
  };

  // Matrix Row Actions
  const handleMatrixVariantChange = (sku: string, field: string, value: any) => {
    setVariantsMatrix(variantsMatrix.map(v => v.sku === sku ? { ...v, [field]: value } : v));
  };

  const handleRemoveVariantRow = (sku: string) => {
    setVariantsMatrix(variantsMatrix.filter(v => v.sku !== sku));
  };

  const handleAddCustomVariantRow = () => {
    const customIdx = variantsMatrix.length + 1;
    const cleanSku = (productForm.baseSku || "PROD").trim().toUpperCase();
    const customSku = `${cleanSku}-CUSTOM-${customIdx}`;
    const customItem: VariantMatrixItem = {
      id: customSku,
      label: `Custom Option ${customIdx}`,
      sku: customSku,
      price: Number(productForm.sellingPrice) || 0,
      compareAt: Number(productForm.compareAtPrice) || Number(productForm.sellingPrice) || 0,
      inventory: 20,
      imageUrl: productForm.imageUrl
    };
    setVariantsMatrix([...variantsMatrix, customItem]);
    showToast("Added custom variant row.", "info");
  };

  // Submit Catalog Maker Form
  const handleSaveCatalogProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title.trim() || !productForm.baseSku.trim()) {
      showToast("Product title and Base SKU are required", "error");
      return;
    }

    setIsSubmittingCatalog(true);
    try {
      const res = await createAndPushCatalogProductAction({
        title: productForm.title,
        baseSku: productForm.baseSku,
        description: productForm.description,
        category: productForm.category,
        brand: productForm.brand,
        imageUrl: productForm.imageUrl,
        sellingPrice: Number(productForm.sellingPrice) || 0,
        compareAtPrice: Number(productForm.compareAtPrice) || Number(productForm.sellingPrice) || 0,
        costPrice: Number(productForm.costPrice) || 0,
        variants: variantsMatrix.map(v => ({
          name: v.label,
          label: v.label,
          color: v.color,
          size: v.size,
          pattern: v.pattern,
          sku: v.sku,
          price: Number(v.price) || Number(productForm.sellingPrice) || 0,
          compareAt: Number(v.compareAt) || Number(productForm.compareAtPrice) || 0,
          inventory: Number(v.inventory) || 20,
          imageUrl: v.imageUrl || productForm.imageUrl
        })),
        pushToMeta: productForm.pushToMeta
      });

      if (res.success) {
        const pushMsg = res.metaResult?.message ? ` (${res.metaResult.message})` : "";
        showToast(`Product created successfully!${pushMsg}`, "success");
        await fetchProducts();
        setShowCatalogMaker(false);
        setProductForm({
          title: "",
          baseSku: "",
          description: "",
          category: "T-Shirts",
          brand: "Esponsports",
          sellingPrice: "",
          compareAtPrice: "",
          costPrice: "",
          imageUrl: "",
          pushToMeta: true
        });
        setVariantsMatrix([]);
      } else {
        showToast("Error creating product: " + res.error, "error");
      }
    } catch (err: any) {
      showToast("Failed to save product: " + err.message, "error");
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  const allCollections = Array.from(
    new Set(
      products
        .map(p => p.collection)
        .flatMap(c => String(c || '').split(',').map(s => s.trim()))
        .filter(Boolean)
    )
  );

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCollection = selectedCollection === "all" || 
      String(p.collection || '').split(',').map(s => s.trim().toLowerCase()).includes(selectedCollection.toLowerCase());
    
    let matchesTab = true;
    if (selectedPlatformTab === 'ACTIVE_PLATFORM') {
      matchesTab = (p.platform === activePlatform || p.platform === 'MANUAL') && p.status === 'Active';
    } else if (selectedPlatformTab === 'INACTIVE') {
      matchesTab = p.status === 'Inactive';
    }

    return matchesSearch && matchesCollection && matchesTab;
  });

  const activePlatformCount = products.filter(p => (p.platform === activePlatform || p.platform === 'MANUAL') && p.status === 'Active').length;
  const inactiveCount = products.filter(p => p.status === 'Inactive').length;
  const totalCount = products.length;

  // Group products by base name
  const groupedProducts: {
    baseName: string;
    image: string;
    collection: string;
    description: string;
    variants: any[];
  }[] = [];

  filteredProducts.forEach(p => {
    const parts = p.name.split(' - ');
    const baseName = parts[0];
    const variantTitle = parts.slice(1).join(' - ');

    let group = groupedProducts.find(g => g.baseName === baseName);
    if (!group) {
      group = {
        baseName,
        image: p.image,
        collection: p.collection,
        description: p.description,
        variants: []
      };
      groupedProducts.push(group);
    }
    group.variants.push({
      ...p,
      variantTitle: variantTitle || (p.color || p.size ? `${p.color || ''} ${p.size || ''}`.trim() : "Default Variant")
    });
  });

  return (
    <div className="p-8 w-full max-w-none flex flex-col gap-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
          toast.type === "success" 
            ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800" 
            : toast.type === "error"
            ? "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800"
            : "bg-blue-50 text-blue-900 border-blue-200"
        }`}>
          <div className="flex items-center gap-2 font-medium text-sm">
            {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Products & Pricing</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
              activePlatform === 'META'
                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            }`}>
              {activePlatform === 'META' ? <ShoppingBag size={12} /> : <Store size={12} />}
              Active Store: {activePlatform === 'META' ? 'Meta Commerce Catalog' : 'Shopify Store'} ({activePlatformCount} active items)
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your store inventory, variant matrix, WhatsApp catalog, and sync products from one platform at a time.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Platform Primary Sync Button */}
          {activePlatform === 'META' ? (
            <button 
              onClick={() => handleSyncMetaCatalog('deactivate')}
              disabled={isSyncingMeta || !metaCatalog.isConnected}
              title={metaCatalog.isConnected ? "Sync live items directly from Meta Catalog" : "Connect Meta Catalog in Integrations first"}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={isSyncingMeta ? "animate-spin" : ""} />
              {isSyncingMeta ? "Syncing Meta Catalog..." : "Sync from Meta Catalog"}
            </button>
          ) : (
            <button 
              onClick={() => handleFetchShopify('deactivate')}
              disabled={isFetchingShopify || !isShopifyConnected}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={isFetchingShopify ? "animate-spin" : ""} />
              {isFetchingShopify ? "Syncing Shopify..." : "Sync from Shopify"}
            </button>
          )}

          {/* Switch Platform Button */}
          <button
            onClick={() => handleInitiateSwitchPlatform(activePlatform === 'META' ? 'SHOPIFY' : 'META')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold shadow-2xs transition-all cursor-pointer"
          >
            {activePlatform === 'META' ? <Store size={15} className="text-emerald-600" /> : <ShoppingBag size={15} className="text-purple-600" />}
            Switch to {activePlatform === 'META' ? 'Shopify' : 'Meta Catalog'}
          </button>
          
          {/* Open Multi-Variant Catalog Maker */}
          <button 
            onClick={() => {
              setShowCatalogMaker(true);
              recomputeVariantsMatrix(
                productOptions,
                productForm.baseSku || "PROD",
                Number(productForm.sellingPrice) || 0,
                Number(productForm.compareAtPrice) || 0
              );
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={18} /> Catalog Maker
          </button>
        </div>
      </div>

      {/* Active Store Platform Switcher Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
            activePlatform === 'META' ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-600/20' : 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-600/20'
          }`}>
            {activePlatform === 'META' ? <ShoppingBag size={22} /> : <Store size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Single Platform Mode:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                activePlatform === 'META' 
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                {activePlatform === 'META' ? '🟣 Meta Commerce Manager (Active)' : '🟢 Shopify Store (Active)'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Only products from your active platform (<strong>{activePlatform === 'META' ? 'Meta Commerce Catalog' : 'Shopify Store'}</strong>) are live in WhatsApp chats. Switching platform keeps the previous platform's products inactive.
            </p>
          </div>
        </div>

        {/* Platform Toggle Pills */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => handleInitiateSwitchPlatform('META')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePlatform === 'META'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag size={14} /> Meta Catalog
            {activePlatform === 'META' && <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
          </button>
          <button
            onClick={() => handleInitiateSwitchPlatform('SHOPIFY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePlatform === 'SHOPIFY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Store size={14} /> Shopify
            {activePlatform === 'SHOPIFY' && <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
          </button>
        </div>
      </div>

      {/* Meta Catalog Banner Info if connected and active */}
      {metaCatalog.isConnected && activePlatform === 'META' && (
        <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/40 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{metaCatalog.catalogName || "Meta Product Catalog"}</span>
                <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-md font-semibold">
                  ID: {metaCatalog.catalogId}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Connected with Meta Commerce Manager. Products added here automatically push to your WhatsApp Catalog.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLinkCatalog}
              disabled={linkingCatalog}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                catalogLinkedStatus?.linked
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                  : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              }`}
            >
              {linkingCatalog ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Linking...
                </>
              ) : catalogLinkedStatus?.linked ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  Linked to WhatsApp ({catalogLinkedStatus.phone || "API"})
                </>
              ) : (
                <>
                  <Store size={13} />
                  Link to WhatsApp Number
                </>
              )}
            </button>
            <Link 
              href="/whatsapp/integrations" 
              className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 ml-1"
            >
              Credentials <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Toolbar with Status & Platform Tabs */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4 bg-gray-50 dark:bg-slate-800/50">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedPlatformTab('ACTIVE_PLATFORM')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedPlatformTab === 'ACTIVE_PLATFORM'
                  ? activePlatform === 'META'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100'
              }`}
            >
              <span>Active {activePlatform === 'META' ? 'Meta' : 'Shopify'} Products</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedPlatformTab === 'ACTIVE_PLATFORM' ? 'bg-black/20 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
              }`}>
                {activePlatformCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedPlatformTab('INACTIVE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedPlatformTab === 'INACTIVE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100'
              }`}
            >
              <span>Inactive Archive</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedPlatformTab === 'INACTIVE' ? 'bg-black/20 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
              }`}>
                {inactiveCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedPlatformTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedPlatformTab === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100'
              }`}
            >
              <span>All ({totalCount})</span>
            </button>

            {selectedPlatformTab === 'INACTIVE' && inactiveCount > 0 && (
              <button
                onClick={handleDeleteInactive}
                disabled={isPurgingInactive}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                {isPurgingInactive ? "Deleting..." : `Delete ${inactiveCount} Inactive`}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search products, SKU, color..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
            >
              <option value="all">📁 All Categories ({allCollections.length})</option>
              {allCollections.map(col => (
                <option key={col} value={col.toLowerCase()}>{col}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-100/70 dark:bg-slate-700/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3.5">Product & Variant</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Stock</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Compare-at (MRP)</th>
                <th className="px-6 py-3.5">Cost</th>
                <th className="px-6 py-3.5 text-right">Margin</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {groupedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                    <p className="font-semibold">No products found</p>
                    <p className="text-xs mt-1">Click "Sync from Meta Catalog" or "Catalog Maker" to add products.</p>
                  </td>
                </tr>
              ) : null}

              {groupedProducts.map((group) => {
                const isExpanded = expandedGroups.includes(group.baseName);
                const totalInventory = group.variants.reduce((sum, v) => sum + v.inventory, 0);
                const minPrice = Math.min(...group.variants.map(v => v.price));
                const maxPrice = Math.max(...group.variants.map(v => v.price));
                const minCompare = Math.min(...group.variants.map(v => v.compareAt));
                const maxCompare = Math.max(...group.variants.map(v => v.compareAt));
                const minCost = Math.min(...group.variants.map(v => v.cost));
                const maxCost = Math.max(...group.variants.map(v => v.cost));
                const hasActiveVariant = group.variants.some(v => v.status === "Active");

                return (
                  <React.Fragment key={group.baseName}>
                    <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-750 border-b border-gray-100 dark:border-slate-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleGroup(group.baseName)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                            title={isExpanded ? "Collapse variants" : "Expand variants"}
                          >
                            <span className="text-base font-mono">{isExpanded ? "▼" : "▶"}</span>
                          </button>
                          
                          <ProductThumbnail
                            src={group.image}
                            alt={group.baseName}
                            onQuickUpload={() => handleQuickImageClick(group)}
                          />

                          <div>
                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {group.baseName}
                              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold border border-indigo-100 dark:border-indigo-900/30">
                                {group.variants.length} variant{group.variants.length > 1 ? "s" : ""}
                              </span>
                              {group.variants[0]?.platform === 'META' ? (
                                <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800">
                                  🟣 Meta
                                </span>
                              ) : group.variants[0]?.platform === 'SHOPIFY' ? (
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                                  🟢 Shopify
                                </span>
                              ) : (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold border border-slate-200 dark:border-slate-700">
                                  ⚪ Manual
                                </span>
                              )}
                            </p>
                            {group.description && (
                              <p className="text-xs text-gray-400 max-w-[400px] truncate mt-0.5" title={group.description.replace(/<[^>]*>/g, '').trim()}>
                                {group.description.replace(/<[^>]*>/g, '').trim()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          hasActiveVariant ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                        }`}>
                          {hasActiveVariant ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-700 dark:text-gray-300">
                        {totalInventory}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {group.variants.length > 1 ? `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}` : `₹${minPrice.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 text-gray-400 line-through">
                        {group.variants.length > 1 ? `₹${minCompare.toLocaleString()} - ₹${maxCompare.toLocaleString()}` : `₹${minCompare.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {group.variants.length > 1 ? `₹${minCost.toLocaleString()} - ₹${maxCost.toLocaleString()}` : `₹${minCost.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gray-600 dark:text-gray-400">
                          {calculateMargin(
                            group.variants.reduce((sum, v) => sum + v.price, 0) / group.variants.length,
                            group.variants.reduce((sum, v) => sum + v.cost, 0) / group.variants.length
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(group)}
                            className="inline-flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors font-bold shadow-2xs cursor-pointer"
                            title="Edit product details, photos & variants"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          {/* Toggle All Button */}
                          <button
                            onClick={() => handleToggleAllVisibility(group.variants)}
                            className="text-xs bg-white hover:bg-slate-100 text-gray-700 dark:text-gray-300 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors font-semibold shadow-2xs cursor-pointer"
                            title="Hide or Unhide all variants in this product"
                          >
                            Toggle All
                          </button>

                          {/* Delete Product Button */}
                          <button
                            onClick={() => {
                              setDeletingGroup(group);
                              setDeleteFromMeta(group.variants[0]?.platform === 'META');
                            }}
                            className="inline-flex items-center gap-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors font-bold shadow-2xs cursor-pointer"
                            title="Delete this product group and all its variants"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Variants Child Rows */}
                    {isExpanded && group.variants.map((v) => (
                      <tr key={v.id} className="bg-slate-50/20 dark:bg-slate-900/30 hover:bg-indigo-50/10 dark:hover:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 transition-colors group">
                        <td className="px-6 py-3 pl-12">
                          <div className="flex items-center gap-2.5">
                            <ProductThumbnail
                              src={v.image || group.image}
                              alt={v.variantTitle}
                              className="w-8 h-8 rounded-lg"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{v.variantTitle}</p>
                                {v.color && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    {v.color}
                                  </span>
                                )}
                                {v.size && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {v.size}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 font-mono">SKU: {v.sku || "N/A"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            v.status === "Active" ? "bg-green-100 text-green-700" :
                            v.status === "Low Stock" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-700"
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono text-gray-600 dark:text-gray-400">
                          {v.inventory}
                        </td>
                        <td className="px-6 py-3">
                          {editingId === v.id ? (
                            <input 
                              type="number" 
                              value={v.price} 
                              onChange={(e) => handleEditChange(v.id, 'price', e.target.value)}
                              className="w-20 px-2 py-1 border border-indigo-500 rounded text-sm outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-indigo-600 font-medium" onClick={() => setEditingId(v.id)}>
                              ₹{v.price.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-400 line-through">
                          {editingId === v.id ? (
                            <input 
                              type="number" 
                              value={v.compareAt} 
                              onChange={(e) => handleEditChange(v.id, 'compareAt', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm outline-none line-through bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <span className="cursor-pointer hover:text-indigo-600" onClick={() => setEditingId(v.id)}>
                              ₹{v.compareAt.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-400">
                          {editingId === v.id ? (
                            <input 
                              type="number" 
                              value={v.cost} 
                              onChange={(e) => handleEditChange(v.id, 'cost', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <span className="cursor-pointer hover:text-indigo-600" onClick={() => setEditingId(v.id)}>
                              ₹{v.cost.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-500 font-medium">
                          {calculateMargin(v.price, v.cost)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingId === v.id && (
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md">
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            
                            {/* Push Single Variant to Meta Catalog */}
                            {metaCatalog.isConnected && (
                              <button
                                onClick={() => handlePushSingleToMeta(v.dbId)}
                                disabled={pushingProductId === v.dbId}
                                className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                                title="Push this item to Meta Catalog"
                              >
                                {pushingProductId === v.dbId ? <RefreshCw size={14} className="animate-spin text-purple-600" /> : <ShoppingBag size={14} />}
                              </button>
                            )}

                            {/* Visibility Toggle */}
                            <button
                              onClick={() => handleToggleVisibility(v.dbId, v.status)}
                              className={`p-1.5 rounded-md transition-colors ${v.status === "Active" ? "text-gray-500 hover:bg-red-50 hover:text-red-600" : "text-gray-400 hover:bg-green-50 hover:text-green-600"}`}
                              title={v.status === "Active" ? "Hide Variant" : "Unhide Variant"}
                            >
                              {v.status === "Active" ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>

                            {/* Delete Variant */}
                            <button
                              onClick={() => {
                                setDeletingVariant({ group, variant: v });
                                setDeleteVariantFromMeta(v.platform === 'META');
                              }}
                              className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Delete this variant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center text-sm text-gray-500">
          <span>Showing {products.length} catalog items across {groupedProducts.length} product groups</span>
          {editingId !== null && <span className="text-indigo-600 font-semibold animate-pulse">Unsaved changes in table...</span>}
        </div>
      </div>
      
      {/* ------------------------------------------------------------- */}
      {/* REDESIGNED MULTI-VARIANT META CATALOG MAKER MODAL */}
      {/* ------------------------------------------------------------- */}
      {showCatalogMaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-50/50 via-indigo-50/30 to-transparent dark:from-purple-950/20 dark:to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Meta Catalog Product Maker</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Build multi-variant products with colors, sizes, and pricing to push live to Meta Commerce Manager & WhatsApp.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCatalogMaker(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCatalogProduct} className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Basic Information */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Tag size={13} /> 1. Product Core Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Product Title <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={productForm.title} 
                      onChange={e => setProductForm({ ...productForm, title: e.target.value })} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 font-medium" 
                      placeholder="e.g. 4-Way Lycra Compression Activewear T-Shirt" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Base SKU / Style Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={productForm.baseSku} 
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setProductForm({ ...productForm, baseSku: val });
                        recomputeVariantsMatrix(
                          productOptions,
                          val,
                          Number(productForm.sellingPrice) || 0,
                          Number(productForm.compareAtPrice) || 0
                        );
                      }} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 font-mono" 
                      placeholder="e.g. ESP-TSH-01" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                    <select
                      value={productForm.category}
                      onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 font-medium"
                    >
                      {PRESET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Description for Meta Catalog & WhatsApp
                    </label>
                    <textarea 
                      rows={3}
                      value={productForm.description} 
                      onChange={e => setProductForm({ ...productForm, description: e.target.value })} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 leading-relaxed" 
                      placeholder="Highlight fabric composition, GSM, wholesale MOQ, 4-way stretch, fit, and delivery details..." 
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Margins */}
              <div className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <span>₹</span> 2. Base Pricing & Margins
                  </h3>
                  {productForm.sellingPrice && productForm.costPrice && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Profit: ₹{(Number(productForm.sellingPrice) - Number(productForm.costPrice)).toFixed(0)} ({calculateMargin(Number(productForm.sellingPrice), Number(productForm.costPrice))})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      required 
                      value={productForm.sellingPrice} 
                      onChange={e => {
                        const val = e.target.value;
                        setProductForm({ ...productForm, sellingPrice: val });
                        recomputeVariantsMatrix(
                          productOptions,
                          productForm.baseSku,
                          Number(val) || 0,
                          Number(productForm.compareAtPrice) || 0
                        );
                      }} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 font-bold text-emerald-600" 
                      placeholder="e.g. 799" 
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">Actual customer checkout price</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Compare-at Price / MRP (₹)
                    </label>
                    <input 
                      type="number" 
                      value={productForm.compareAtPrice} 
                      onChange={e => {
                        const val = e.target.value;
                        setProductForm({ ...productForm, compareAtPrice: val });
                        recomputeVariantsMatrix(
                          productOptions,
                          productForm.baseSku,
                          Number(productForm.sellingPrice) || 0,
                          Number(val) || 0
                        );
                      }} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 font-medium line-through text-gray-500" 
                      placeholder="e.g. 1299" 
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">Strikethrough MRP on catalog</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Cost Price (₹)
                    </label>
                    <input 
                      type="number" 
                      value={productForm.costPrice} 
                      onChange={e => setProductForm({ ...productForm, costPrice: e.target.value })} 
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 font-medium" 
                      placeholder="e.g. 350" 
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">Factory manufacturing cost</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Media & Direct File Upload (Like Shopify) */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <ImageIcon size={14} /> 3. Primary Product Media & Photos
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowUrlFallback(!showUrlFallback)}
                    className="text-[11px] text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 font-medium"
                  >
                    {showUrlFallback ? "Hide URL Input" : "Or enter external URL"}
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={primaryFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  {/* Direct Drop / Browse Area */}
                  <div
                    onClick={() => primaryFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className={`md:col-span-3 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isUploadingPrimaryImage
                        ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40"
                        : "border-gray-300 hover:border-purple-500 hover:bg-purple-50/20 bg-gray-50/60 dark:bg-slate-800/40 dark:border-slate-700"
                    }`}
                  >
                    {isUploadingPrimaryImage ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <RefreshCw size={28} className="animate-spin text-purple-600" />
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                          Uploading & processing image...
                        </span>
                        <span className="text-[11px] text-gray-400">Saving securely & generating public HTTPS URL for Meta</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 flex items-center justify-center shadow-inner">
                          <Upload size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Click to upload or drag & drop image from device
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            PNG, JPG, WEBP up to 10MB • Direct upload stored and pushed to Meta Catalog
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Thumbnail Preview */}
                  <div className="w-full aspect-square max-w-[130px] rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col items-center justify-center relative shadow-sm group">
                    {productForm.imageUrl ? (
                      <>
                        <img 
                          src={productForm.imageUrl} 
                          alt="Product" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { (e.target as any).style.display = 'none'; }} 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                          <button
                            type="button"
                            onClick={() => primaryFileInputRef.current?.click()}
                            className="px-2 py-1 bg-white text-gray-800 text-[10px] font-bold rounded-lg shadow-sm hover:bg-gray-100"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductForm({ ...productForm, imageUrl: "" })}
                            className="p-1 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700"
                            title="Remove image"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 p-2">
                        <ImageIcon size={26} className="mx-auto mb-1 opacity-40" />
                        <span className="text-[10px] block font-medium">No Image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional URL Fallback */}
                {showUrlFallback && (
                  <div className="p-3 bg-purple-50/50 dark:bg-slate-800/60 rounded-xl border border-purple-200 dark:border-slate-700 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Image URL (Optional Fallback)</label>
                    <input
                      type="url"
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                      placeholder="https://cdn.shopify.com/.../image.jpg"
                      className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Section 4: Shopify-Style Variants & Option Groups */}
              <div className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                {/* Checkbox: This product has options like size or color */}
                <div className="flex items-center justify-between bg-gray-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasOptions}
                      onChange={(e) => handleToggleHasOptions(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">
                        This product has options, like size, color, or pieces
                      </span>
                      <span className="text-xs text-gray-500">
                        Create multiple variants with separate SKUs, prices, inventory, and photos (Shopify style).
                      </span>
                    </div>
                  </label>
                  {hasOptions && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                      {variantsMatrix.length} variant{variantsMatrix.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {hasOptions && (
                  <div className="flex flex-col gap-4">
                    {/* Option Groups Cards */}
                    {productOptions.map((opt, optIndex) => {
                      const presetDef = PRESET_OPTION_DEFINITIONS.find(p => p.name.toLowerCase() === opt.name.toLowerCase());
                      const suggestions = presetDef ? presetDef.suggestions : [];

                      return (
                        <div key={opt.id} className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Option {optIndex + 1}:
                              </span>
                              {/* Option Name Selector */}
                              <select
                                value={PRESET_OPTION_DEFINITIONS.some(p => p.name.toLowerCase() === opt.name.toLowerCase()) ? opt.name : "Custom"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== "Custom") {
                                    handleOptionNameChange(opt.id, val);
                                  } else {
                                    handleOptionNameChange(opt.id, "Custom Option");
                                  }
                                }}
                                className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                              >
                                {PRESET_OPTION_DEFINITIONS.map(p => (
                                  <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                                <option value="Custom">Custom Option...</option>
                              </select>
                              
                              <input
                                type="text"
                                value={opt.name}
                                onChange={(e) => handleOptionNameChange(opt.id, e.target.value)}
                                placeholder="Option Name (e.g. Fit, Sleeve, Set)"
                                className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                              />
                            </div>

                            {productOptions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(opt.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Remove this option"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          {/* Option Values Section */}
                          <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                              Option values for {opt.name || "this option"}:
                            </label>

                            {/* Tag Input Field */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.inputValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductOptions(productOptions.map(o => o.id === opt.id ? { ...o, inputValue: val } : o));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === ",") {
                                    e.preventDefault();
                                    handleAddOptionValue(opt.id, opt.inputValue);
                                  }
                                }}
                                placeholder={`Type value (e.g. ${suggestions.slice(0, 3).join(", ") || "Value"}) and press Enter...`}
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddOptionValue(opt.id, opt.inputValue)}
                                className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                              >
                                + Add
                              </button>
                            </div>

                            {/* Suggestions Chips */}
                            {suggestions.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] font-bold text-gray-400 mr-1">Quick Suggestions:</span>
                                {suggestions.map(s => {
                                  const isSelected = opt.values.includes(s);
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => handleAddOptionValue(opt.id, s)}
                                      disabled={isSelected}
                                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                        isSelected
                                          ? "bg-purple-600 text-white border-purple-600 shadow-2xs cursor-default"
                                          : "bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-purple-400"
                                      }`}
                                    >
                                      + {s}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Selected Values Pills */}
                            {opt.values.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                                {opt.values.map(val => (
                                  <span
                                    key={val}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-200 dark:border-purple-800"
                                  >
                                    {val}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionValue(opt.id, val)}
                                      className="hover:text-red-600 ml-0.5"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Another Option Button (Up to 3) */}
                    {productOptions.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="self-start text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-slate-800/60 border border-purple-200 dark:border-slate-700 hover:bg-purple-100 transition-colors"
                      >
                        <Plus size={14} /> Add another option (e.g. Pack/Pieces, Design, Fabric)
                      </button>
                    )}

                    {/* Variants Matrix Table (Shopify Style) */}
                    {variantsMatrix.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Variants Matrix ({variantsMatrix.length} Items)
                          </h4>
                          <button
                            type="button"
                            onClick={handleAddCustomVariantRow}
                            className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                          >
                            <Plus size={12} /> Add custom variant row
                          </button>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold uppercase">
                              <tr>
                                <th className="p-3 w-12 text-center">Photo</th>
                                <th className="p-3">Variant</th>
                                <th className="p-3">SKU</th>
                                <th className="p-3">Price (₹)</th>
                                <th className="p-3">MRP (₹)</th>
                                <th className="p-3">Stock</th>
                                <th className="p-3 text-center">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                              {variantsMatrix.map((v) => (
                                <tr key={v.sku} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                                  {/* Inline Variant Photo Upload */}
                                  <td className="p-2.5 text-center">
                                    <label className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500 relative mx-auto group">
                                      {v.imageUrl ? (
                                        <img src={v.imageUrl} alt={v.label} className="w-full h-full object-cover" />
                                      ) : (
                                        <ImageIcon size={14} className="text-gray-400 group-hover:text-purple-600" />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleImageUpload(file, v.sku);
                                          e.target.value = "";
                                        }}
                                      />
                                      {uploadingVariantSku === v.sku && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                          <RefreshCw size={12} className="animate-spin text-purple-600" />
                                        </div>
                                      )}
                                    </label>
                                  </td>
                                  <td className="p-3 font-semibold text-gray-900 dark:text-white">
                                    <input
                                      type="text"
                                      value={v.label}
                                      onChange={(e) => handleMatrixVariantChange(v.sku, "label", e.target.value)}
                                      className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-purple-500 rounded bg-transparent text-xs font-semibold outline-none w-full"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="text"
                                      value={v.sku}
                                      onChange={(e) => handleMatrixVariantChange(v.sku, "sku", e.target.value.toUpperCase())}
                                      className="w-32 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-xs font-mono outline-none focus:border-purple-500 bg-white dark:bg-slate-900"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="number"
                                      value={v.price}
                                      onChange={(e) => handleMatrixVariantChange(v.sku, "price", Number(e.target.value))}
                                      className="w-20 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-xs font-bold text-emerald-600 outline-none focus:border-purple-500 bg-white dark:bg-slate-900"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="number"
                                      value={v.compareAt}
                                      onChange={(e) => handleMatrixVariantChange(v.sku, "compareAt", Number(e.target.value))}
                                      className="w-20 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-xs line-through text-gray-500 outline-none focus:border-purple-500 bg-white dark:bg-slate-900"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="number"
                                      value={v.inventory}
                                      onChange={(e) => handleMatrixVariantChange(v.sku, "inventory", Number(e.target.value))}
                                      className="w-16 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-xs font-mono outline-none focus:border-purple-500 bg-white dark:bg-slate-900"
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariantRow(v.sku)}
                                      className="text-gray-400 hover:text-red-600 p-1"
                                      title="Remove variant"
                                    >
                                      <X size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 5: Meta Push Switch & Footer */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-4">
                <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={productForm.pushToMeta} 
                    onChange={e => setProductForm({ ...productForm, pushToMeta: e.target.checked })} 
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-purple-600" />
                      Push directly to Meta Commerce Catalog & WhatsApp Store
                    </span>
                    <span className="text-[11px] text-purple-700 dark:text-purple-400">
                      Creates grouped items in your Meta Catalog so customers can browse styles and pick color/size in WhatsApp chats.
                    </span>
                  </div>
                </label>

                <div className="flex justify-end gap-3 items-center">
                  <button 
                    type="button" 
                    onClick={() => setShowCatalogMaker(false)} 
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingCatalog}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmittingCatalog ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                    {isSubmittingCatalog ? "Saving & Syncing to Meta..." : "Save & Publish to Meta Catalog"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform Switch Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="text-indigo-600" size={18} /> Switch Active Store Platform
              </h3>
              <button onClick={() => setShowSwitchModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              You are switching your active store platform to <strong>{pendingTargetPlatform === 'META' ? 'Meta Commerce Catalog' : 'Shopify Store'}</strong>. Only one platform's products can be active on WhatsApp at a time.
            </p>

            <div className="space-y-3 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/60 text-xs">
              <div className="font-bold text-gray-700 dark:text-gray-200 mb-2">What to do with products from the previous platform?</div>
              
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="switchCleanup" 
                  checked={switchCleanupOption === 'deactivate'} 
                  onChange={() => setSwitchCleanupOption('deactivate')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">Deactivate previous products (Recommended)</span>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">Keeps product records and order history safe, but sets their status to Inactive so only {pendingTargetPlatform === 'META' ? 'Meta' : 'Shopify'} products are active.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-gray-200 dark:border-slate-700/50">
                <input 
                  type="radio" 
                  name="switchCleanup" 
                  checked={switchCleanupOption === 'delete'} 
                  onChange={() => setSwitchCleanupOption('delete')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-rose-600 dark:text-rose-400">Permanently delete previous products</span>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">Completely removes unreferenced products of the other platform from your database.</p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitchPlatform}
                disabled={isSwitchingPlatform}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isSwitchingPlatform && <RefreshCw size={13} className="animate-spin" />}
                Confirm & Switch Platform
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EDIT PRODUCT & VARIANTS MODAL */}
      {/* ------------------------------------------------------------- */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-transparent dark:from-indigo-950/30 dark:to-transparent shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Product & Variants</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Update product details, photos, prices, stock, and sync live to Meta Catalog
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingGroup(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEditProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Base Details & Primary Image */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Photo Box */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Primary Product Photo
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 relative bg-gray-50/50 dark:bg-slate-800/30 min-h-[170px]">
                    {editForm.primaryImage ? (
                      <div className="w-full flex flex-col items-center gap-2">
                        <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-700 relative group">
                          <img 
                            src={editForm.primaryImage} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as any).src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, primaryImage: "" })}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          disabled={isUploadingEditPrimaryImage}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isUploadingEditPrimaryImage ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
                          <span>{isUploadingEditPrimaryImage ? "Uploading..." : "Replace from Device"}</span>
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => editFileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center text-center cursor-pointer p-3 w-full"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
                          {isUploadingEditPrimaryImage ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {isUploadingEditPrimaryImage ? "Uploading..." : "Upload Device Photo"}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP up to 10MB</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Base Product Information */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                      Product Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="e.g. Pro NS Terry Lycra Track Pants"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                        Category / Collection
                      </label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        placeholder="e.g. Track Pants"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                        Brand
                      </label>
                      <input
                        type="text"
                        defaultValue="Esponsports"
                        readOnly
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs bg-gray-50 dark:bg-slate-800 text-gray-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Product features, fabric specification, wash care..."
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Variant Matrix Table */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>Variants Matrix</span>
                      <span className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                        {editVariants.filter(v => !v.isDeleted).length} active
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">Edit variant details, individual photos, prices, inventory, or add new variants</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariantToEdit}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Photo</th>
                        <th className="px-3 py-2.5 min-w-[140px]">Variant Title / Option</th>
                        <th className="px-3 py-2.5 min-w-[110px]">SKU</th>
                        <th className="px-3 py-2.5">Price (₹)</th>
                        <th className="px-3 py-2.5">Compare (₹)</th>
                        <th className="px-3 py-2.5">Cost (₹)</th>
                        <th className="px-3 py-2.5">Stock</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {editVariants.filter(v => !v.isDeleted).map((v) => (
                        <tr key={v.sku} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          {/* Photo picker */}
                          <td className="px-3 py-2">
                            <div 
                              onClick={() => {
                                setActiveUploadVariantSku(v.sku);
                                editVariantFileInputRef.current?.click();
                              }}
                              className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 relative group"
                              title="Click to upload/change photo for this variant"
                            >
                              {v.imageUrl ? (
                                <img 
                                  src={v.imageUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                    (e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement | null)?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <ImageIcon size={14} className={`text-gray-400 fallback-icon ${v.imageUrl ? 'hidden' : ''}`} />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Upload size={11} />
                              </div>
                            </div>
                          </td>

                          {/* Variant Title */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={v.variantTitle}
                              onChange={(e) => handleEditVariantField(v.sku, 'variantTitle', e.target.value)}
                              className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                            />
                          </td>

                          {/* SKU */}
                          <td className="px-3 py-2 font-mono text-[11px] text-gray-500">
                            {v.sku}
                          </td>

                          {/* Price */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => handleEditVariantField(v.sku, 'price', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-900 dark:text-white"
                            />
                          </td>

                          {/* Compare At (MRP) */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={v.compareAt}
                              onChange={(e) => handleEditVariantField(v.sku, 'compareAt', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-500"
                            />
                          </td>

                          {/* Cost */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={v.cost}
                              onChange={(e) => handleEditVariantField(v.sku, 'cost', Number(e.target.value) || 0)}
                              className="w-18 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-500"
                            />
                          </td>

                          {/* Stock Inventory */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={v.inventory}
                              onChange={(e) => handleEditVariantField(v.sku, 'inventory', Number(e.target.value) || 0)}
                              className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2">
                            <select
                              value={v.status}
                              onChange={(e) => handleEditVariantField(v.sku, 'status', e.target.value)}
                              className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Out of Stock">Out of Stock</option>
                            </select>
                          </td>

                          {/* Action Delete */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleMarkVariantDeleted(v.sku)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Delete variant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Meta Commerce Catalog Sync Option */}
              {metaCatalog.isConnected && (
                <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Sync Changes to Meta Catalog</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Automatically pushes updated title, prices, inventory and photos to your live WhatsApp Commerce Catalog ({metaCatalog.catalogName}).
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={editForm.syncToMeta}
                      onChange={(e) => setEditForm({ ...editForm, syncToMeta: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Sync Live</span>
                  </label>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingGroup(editingGroup);
                    setDeleteFromMeta(editingGroup.variants[0]?.platform === 'META');
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Entire Product</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingGroup(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSavingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                    <span>{isSavingEdit ? "Saving Changes..." : "Save Product Changes"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE PRODUCT GROUP MODAL */}
      {/* ------------------------------------------------------------- */}
      {deletingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Product</h3>
                <p className="text-xs text-gray-500">Permanently delete or archive</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deletingGroup.baseName}</strong> and all <strong className="text-gray-900 dark:text-white">{deletingGroup.variants.length} variant{deletingGroup.variants.length > 1 ? 's' : ''}</strong>?
            </p>

            {metaCatalog.isConnected && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={deleteFromMeta} 
                  onChange={(e) => setDeleteFromMeta(e.target.checked)} 
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" 
                />
                <div className="text-xs">
                  <span className="font-bold text-purple-900 dark:text-purple-200">Also delete from Meta Commerce Catalog</span>
                  <p className="text-purple-700/80 dark:text-purple-300/80 mt-0.5 text-[11px]">
                    Removes these SKUs from your WhatsApp Commerce Catalog immediately.
                  </p>
                </div>
              </label>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingGroup(null)}
                disabled={isDeletingGroup}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteGroup}
                disabled={isDeletingGroup}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                {isDeletingGroup ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isDeletingGroup ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE SINGLE VARIANT MODAL */}
      {/* ------------------------------------------------------------- */}
      {deletingVariant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Variant</h3>
                <p className="text-xs text-gray-500 font-mono">SKU: {deletingVariant.variant.sku}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Delete variant <strong className="text-gray-900 dark:text-white">{deletingVariant.variant.variantTitle}</strong> from <strong className="text-gray-900 dark:text-white">{deletingVariant.group.baseName}</strong>?
            </p>

            {metaCatalog.isConnected && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={deleteVariantFromMeta} 
                  onChange={(e) => setDeleteVariantFromMeta(e.target.checked)} 
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" 
                />
                <div className="text-xs">
                  <span className="font-bold text-purple-900 dark:text-purple-200">Also delete from Meta Commerce Catalog</span>
                </div>
              </label>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingVariant(null)}
                disabled={isDeletingVariant}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteSingleVariant}
                disabled={isDeletingVariant}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                {isDeletingVariant ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isDeletingVariant ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HIDDEN FILE INPUTS FOR DIRECT DEVICE IMAGE PICKING */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Primary photo upload for Edit Modal */}
      <input
        type="file"
        ref={editFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleEditImageUpload(file);
          if (editFileInputRef.current) editFileInputRef.current.value = "";
        }}
      />

      {/* 2. Variant photo upload for Edit Modal */}
      <input
        type="file"
        ref={editVariantFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeUploadVariantSku) {
            handleEditImageUpload(file, activeUploadVariantSku);
          }
          if (editVariantFileInputRef.current) editVariantFileInputRef.current.value = "";
          setActiveUploadVariantSku(null);
        }}
      />

      {/* 3. Quick photo upload directly from table hover */}
      <input
        type="file"
        ref={quickFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !quickUploadGroup) return;
          try {
            showToast("Uploading replacement photo...", "info");
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/whatsapp/upload-product-image", { method: "POST", body: formData });
            const data = await res.json();
            if (data.success && data.url) {
              const productIds = quickUploadGroup.variants.map((v: any) => v.dbId).filter(Boolean);
              const updRes = await quickUpdateProductImageAction({
                productIds,
                imageUrl: data.url,
                syncToMeta: metaCatalog.isConnected
              });
              if (updRes.success) {
                showToast(updRes.message || "Product photo updated successfully!", "success");
                await fetchProducts();
              } else {
                showToast("Failed to update photo: " + updRes.error, "error");
              }
            } else {
              showToast("Upload failed: " + data.error, "error");
            }
          } catch (err: any) {
            showToast("Error updating photo: " + err.message, "error");
          } finally {
            setQuickUploadGroup(null);
            if (quickFileInputRef.current) quickFileInputRef.current.value = "";
          }
        }}
      />
    </div>
  );
}