"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, ArrowUpRight, CheckCircle2, AlertTriangle, MessageSquare, Download, RefreshCw, Plus, Store, ExternalLink, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { getShopifyCredentialsAction, syncShopifyProductsAction, getProductsAction, createProductAction, toggleProductVisibilityAction } from "@/app/actions/whatsAppPlatformActions";

// Mock Data
const MOCK_PRODUCTS = [
  { id: 1, name: "Premium Cotton T-Shirt", sku: "TS-PCT-01", price: 899, compareAt: 1299, cost: 450, inventory: 342, status: "Active" },
  { id: 2, name: "Slim Fit Denim Jeans", sku: "DN-SFJ-04", price: 1999, compareAt: 2499, cost: 950, inventory: 128, status: "Active" },
  { id: 3, name: "Casual Linen Button-Down", sku: "SH-CLB-12", price: 1499, compareAt: 1899, cost: 700, inventory: 45, status: "Low Stock" },
  { id: 4, name: "Heavyweight Pullover Hoodie", sku: "HD-HPH-02", price: 2299, compareAt: 2999, cost: 1100, inventory: 0, status: "Out of Stock" },
  { id: 5, name: "Athletic Performance Shorts", sku: "SH-APS-09", price: 799, compareAt: 1099, cost: 350, inventory: 512, status: "Active" },
];

export default function ProductsCommercePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Shopify Integration State
  const [isShopifyConnected, setIsShopifyConnected] = useState(false);
  const [isFetchingShopify, setIsFetchingShopify] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  
  // Catalog Maker Modal State
  const [showCatalogMaker, setShowCatalogMaker] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", price: "", compareAt: "", cost: "", inventory: "10" });

  const handleToggleVisibility = async (dbId: string, currentStatus: string) => {
    if (!dbId) return;
    const targetStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const res = await toggleProductVisibilityAction(dbId, targetStatus);
    if (res.success) {
      await fetchProducts();
    } else {
      alert("Failed to update visibility: " + res.error);
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
        price: p.sellingPrice || 0,
        compareAt: p.mrp || 0,
        cost: p.purchasePrice || 0,
        inventory: p.stockQuantity || 0,
        status: p.status || "Active",
        image: p.images?.[0] || "",
        description: p.description || "",
        collection: p.fabric || "General"
      }));
      setProducts(mapped);
    }
  };

  useEffect(() => {
    getShopifyCredentialsAction().then((res) => {
      if (res.success && res.credentials?.shopifyAccessToken) {
        setIsShopifyConnected(true);
        setShopifyDomain(res.credentials.shopifyStoreDomain || "Connected Store");
      }
    });
    fetchProducts();
  }, []);

  const handleEditChange = (id: number, field: string, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: Number(value) || 0 } : p));
  };

  const calculateMargin = (price: number, cost: number) => {
    if (!price || !cost) return "0%";
    return (((price - cost) / price) * 100).toFixed(1) + "%";
  };
  
  const handleFetchShopify = async () => {
    setIsFetchingShopify(true);
    const res = await syncShopifyProductsAction();
    if (res.success) {
      alert(res.message);
      await fetchProducts();
    } else {
      alert("Shopify Sync Failed: " + res.error);
    }
    setIsFetchingShopify(false);
  };
  
  const handleSaveCatalogProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createProductAction({
      name: newProduct.name,
      sku: newProduct.sku,
      price: Number(newProduct.price) || 0,
      compareAt: Number(newProduct.compareAt) || 0,
      cost: Number(newProduct.cost) || 0,
      inventory: Number(newProduct.inventory) || 0
    });
    if (res.success) {
      await fetchProducts();
      setShowCatalogMaker(false);
      setNewProduct({ name: "", sku: "", price: "", compareAt: "", cost: "", inventory: "10" });
    } else {
      alert("Failed to save product: " + res.error);
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
    return matchesSearch && matchesCollection;
  });

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
      variantTitle: variantTitle || "Default Variant"
    });
  });

  return (
    <div className="p-8 w-full max-w-none flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">Products & Pricing</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your catalog, adjust pricing, and sync with WhatsApp.</p>
        </div>
        
        <div className="flex gap-3">
          {isShopifyConnected ? (
            <button 
              onClick={handleFetchShopify}
              disabled={isFetchingShopify}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 rounded-xl border border-gray-200 text-sm font-bold shadow-sm transition-all"
            >
              <RefreshCw size={16} className={isFetchingShopify ? "animate-spin" : ""} />
              {isFetchingShopify ? "Syncing..." : "Sync from Shopify"}
            </button>
          ) : (
            <Link 
              href="/whatsapp/api-settings"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-200 text-sm font-bold shadow-sm transition-all"
            >
              <Store size={16} /> Connect Shopify
            </Link>
          )}
          
          <button 
            onClick={() => setShowCatalogMaker(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={18} /> Catalog Maker
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products, SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div style={{ marginLeft: "12px" }}>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              style={{
                padding: "8px 12px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#1e293b",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="all">📁 All Collections ({allCollections.length})</option>
              {allCollections.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"><Filter size={18} /></button>
            <button className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"><Download size={18} /></button>
          </div>
        </div>

        {/* Dense Data Table (Shopify Style) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Inventory</th>
                <th className="px-6 py-4">Price (₹)</th>
                <th className="px-6 py-4 text-gray-400">Compare at (₹)</th>
                <th className="px-6 py-4 text-gray-400">Cost per item (₹)</th>
                <th className="px-6 py-4 text-right">Margin</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {groupedProducts.map((group) => {
                const isExpanded = expandedGroups.includes(group.baseName);
                const hasActiveVariant = group.variants.some(v => v.status === "Active");
                const totalInventory = group.variants.reduce((sum, v) => sum + v.inventory, 0);
                const minPrice = Math.min(...group.variants.map(v => v.price));
                const maxPrice = Math.max(...group.variants.map(v => v.price));
                const minCompare = Math.min(...group.variants.map(v => v.compareAt));
                const maxCompare = Math.max(...group.variants.map(v => v.compareAt));
                const minCost = Math.min(...group.variants.map(v => v.cost));
                const maxCost = Math.max(...group.variants.map(v => v.cost));
                
                return (
                  <React.Fragment key={group.baseName}>
                    {/* Parent Group Row */}
                    <tr className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-gray-200 dark:border-slate-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleGroup(group.baseName)}
                            className="text-gray-400 hover:text-indigo-600 font-bold text-sm w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm cursor-pointer"
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                          <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 dark:border-slate-700">
                            {group.image ? (
                              <img src={group.image} alt={group.baseName} className="w-full h-full object-cover" />
                            ) : (
                              <Store size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {group.baseName}
                              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold border border-indigo-100 dark:border-indigo-900/30">
                                {group.variants.length} variant{group.variants.length > 1 ? "s" : ""}
                              </span>
                            </p>
                            {group.description && (
                              <p className="text-xs text-gray-400 max-w-[380px] truncate" title={group.description.replace(/<[^>]*>/g, '').trim()}>
                                {group.description.replace(/<[^>]*>/g, '').trim()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          hasActiveVariant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {hasActiveVariant ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-700 dark:text-gray-300">
                        {totalInventory}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {group.variants.length > 1 ? `₹${minPrice} - ₹${maxPrice}` : `₹${minPrice}`}
                      </td>
                      <td className="px-6 py-4 text-gray-400 line-through">
                        {group.variants.length > 1 ? `₹${minCompare} - ₹${maxCompare}` : `₹${minCompare}`}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {group.variants.length > 1 ? `₹${minCost} - ₹${maxCost}` : `₹${minCost}`}
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
                        <button
                          onClick={() => handleToggleAllVisibility(group.variants)}
                          className="text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 dark:text-gray-300 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors font-bold shadow-sm"
                          title="Hide or Unhide all variants in this product"
                        >
                          Toggle All
                        </button>
                      </td>
                    </tr>

                    {/* Variants Child Rows */}
                    {isExpanded && group.variants.map((v) => (
                      <tr key={v.id} className="bg-slate-50/10 dark:bg-slate-900/30 hover:bg-indigo-50/10 dark:hover:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 transition-colors group">
                        <td className="px-6 py-3.5 pl-14">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-gray-200">{v.variantTitle}</p>
                              <p className="text-xs text-gray-400 font-mono">SKU: {v.sku || "N/A"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            v.status === "Active" ? "bg-green-100 text-green-700" :
                            v.status === "Low Stock" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-700"
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-gray-600 dark:text-gray-400">
                          {v.inventory}
                        </td>
                        <td className="px-6 py-3.5">
                          {editingId === v.id ? (
                            <input 
                              type="number" 
                              value={v.price} 
                              onChange={(e) => handleEditChange(v.id, 'price', e.target.value)}
                              className="w-20 px-2 py-1 border border-indigo-500 rounded text-sm outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-indigo-600" onClick={() => setEditingId(v.id)}>₹{v.price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-gray-400 line-through">
                          {editingId === v.id ? (
                            <input 
                              type="number" 
                              value={v.compareAt} 
                              onChange={(e) => handleEditChange(v.id, 'compareAt', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm outline-none line-through bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <span className="cursor-pointer hover:text-indigo-600" onClick={() => setEditingId(v.id)}>₹{v.compareAt.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-gray-400">
                          {editingId === v.id ? (
                            <input 
                              type="number" 
                              value={v.cost} 
                              onChange={(e) => handleEditChange(v.id, 'cost', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <span className="cursor-pointer hover:text-indigo-600" onClick={() => setEditingId(v.id)}>₹{v.cost.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right text-gray-500 font-medium">
                          {calculateMargin(v.price, v.cost)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingId === v.id ? (
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md">
                                <CheckCircle2 size={14} />
                              </button>
                            ) : null}
                            <button
                              onClick={() => handleToggleVisibility(v.dbId, v.status)}
                              className={`p-1.5 rounded-md transition-colors ${v.status === "Active" ? "text-gray-500 hover:bg-red-50 hover:text-red-600" : "text-gray-400 hover:bg-green-50 hover:text-green-600"}`}
                              title={v.status === "Active" ? "Hide Variant" : "Unhide Variant"}
                            >
                              {v.status === "Active" ? <EyeOff size={14} /> : <Eye size={14} />}
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
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center text-sm text-gray-500">
          <span>Showing {products.length} products</span>
          {editingId !== null && <span className="text-indigo-600 font-semibold animate-pulse">Unsaved changes...</span>}
        </div>
      </div>
      
      {/* Catalog Maker Modal */}
      {showCatalogMaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
               <div>
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meta Catalog Maker</h2>
                 <p className="text-sm text-gray-500 mt-1">Create a product to instantly push to your WhatsApp Catalog.</p>
               </div>
               <button onClick={() => setShowCatalogMaker(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                 &times;
               </button>
             </div>
             
             <form onSubmit={handleSaveCatalogProduct} className="p-6 flex flex-col gap-5">
               <div className="grid grid-cols-2 gap-5">
                 <div className="col-span-2">
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Product Title</label>
                   <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800" placeholder="e.g. Classic White T-Shirt" />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">SKU</label>
                   <input type="text" required value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800" placeholder="TSH-001" />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Inventory Quantity</label>
                   <input type="number" required value={newProduct.inventory} onChange={e => setNewProduct({...newProduct, inventory: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800" />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Selling Price (₹)</label>
                   <input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800" placeholder="999" />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Compare-at Price (₹)</label>
                   <input type="number" value={newProduct.compareAt} onChange={e => setNewProduct({...newProduct, compareAt: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800" placeholder="1499" />
                 </div>
               </div>
               
               <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 mt-2">
                 <button type="button" onClick={() => setShowCatalogMaker(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                 <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
                   <Plus size={16} /> Save & Push to Meta
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}