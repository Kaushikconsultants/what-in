"use client";
import React, { useState, useEffect } from "react";
import { X, Search, ShoppingBag, ChevronRight, ExternalLink, Send } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  url: string;
  description?: string;
  collection?: string;
  variants?: any[];
}

interface Props {
  onClose: () => void;
  onSendProduct: (product: Product) => void;
  recipientName?: string;
}

export default function ProductCatalogPanel({ onClose, onSendProduct, recipientName }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shopify/products?limit=100")
      .then(r => r.json())
      .then(data => {
        if (data.products) {
          const prods: Product[] = data.products.map((p: any) => ({
            id: String(p.id),
            title: p.title,
            price: p.variants?.[0]?.price || "0",
            image: p.images?.[0]?.src || "",
            url: `https://${data.domain || "store.myshopify.com"}/products/${p.handle}`,
            description: p.body_html?.replace(/<[^>]*>/g, "").slice(0, 150),
            collection: p.product_type || "General",
            variants: p.variants,
          }));
          setProducts(prods);
          const cols = ["All", ...Array.from(new Set(prods.map(p => p.collection || "General"))) as string[]];
          setCollections(cols);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = products.filter(p => {
    const matchesCollection = selectedCollection === "All" || p.collection === selectedCollection;
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCollection && matchesSearch;
  });

  const handleSend = async (product: Product) => {
    setSending(product.id);
    await onSendProduct(product);
    setSending(null);
  };

  return (
    <div style={{
      width: "320px", minWidth: "320px", height: "100%", borderLeft: "1px solid #e5e7eb",
      background: "white", display: "flex", flexDirection: "column", flexShrink: 0,
      fontFamily: "Inter, sans-serif"
    }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShoppingBag size={18} color="#4f46e5" />
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>Product Catalog</div>
            {recipientName && <div style={{ fontSize: "11px", color: "#6b7280" }}>Send to {recipientName}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "4px" }}>
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* Collection Tabs */}
      <div style={{ display: "flex", gap: "6px", padding: "8px 12px", overflowX: "auto", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
        {collections.map(col => (
          <button
            key={col}
            onClick={() => setSelectedCollection(col)}
            style={{
              padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
              whiteSpace: "nowrap", cursor: "pointer", border: "none",
              background: selectedCollection === col ? "#4f46e5" : "#f3f4f6",
              color: selectedCollection === col ? "white" : "#4b5563"
            }}
          >
            {col}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "13px" }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "13px" }}>No products found</div>
        ) : (
          filtered.map(product => (
            <div key={product.id} style={{
              display: "flex", gap: "10px", padding: "10px", borderRadius: "10px",
              border: "1px solid #f3f4f6", marginBottom: "8px", background: "#fafafa",
              transition: "all 0.15s"
            }}>
              {/* Product Image */}
              <div style={{ width: "56px", height: "56px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#e5e7eb" }}>
                {product.image ? (
                  <img src={product.image} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShoppingBag size={20} color="#9ca3af" />
                  </div>
                )}
              </div>
              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "12px", color: "#111827", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.title}
                </div>
                <div style={{ fontWeight: 800, fontSize: "13px", color: "#4f46e5", marginBottom: "6px" }}>₹{parseFloat(product.price).toLocaleString('en-IN')}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleSend(product)}
                    disabled={sending === product.id}
                    style={{
                      flex: 1, padding: "5px 8px", background: sending === product.id ? "#9ca3af" : "#4f46e5",
                      color: "white", border: "none", borderRadius: "6px", fontSize: "11px",
                      fontWeight: 700, cursor: sending === product.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"
                    }}
                  >
                    <Send size={11} />
                    {sending === product.id ? "Sending..." : "Send"}
                  </button>
                  <a href={product.url} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "5px 8px", background: "#f3f4f6", border: "none", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <ExternalLink size={11} color="#6b7280" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
