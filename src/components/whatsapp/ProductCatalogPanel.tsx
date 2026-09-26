"use client";
import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  ShoppingBag,
  ExternalLink,
  Send,
  RefreshCw,
  Tag,
  CheckCircle2,
  Sparkles
} from "lucide-react";

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
  const [sentId, setSentId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Dynamic Theme Detection
  useEffect(() => {
    const checkTheme = () => {
      const doc = document.documentElement;
      const isDarkMode =
        doc.classList.contains("dark") ||
        doc.getAttribute("data-theme") === "dark" ||
        (!localStorage.getItem("wm_theme") && window.matchMedia("(prefers-color-scheme: dark)").matches) ||
        localStorage.getItem("wm_theme") === "dark";
      setIsDark(isDarkMode);
    };

    checkTheme();

    const observer = new MutationObserver(() => checkTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const handleThemeChange = () => checkTheme();
    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
      mql.removeEventListener("change", handleThemeChange);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    fetch("/api/shopify/products?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          const prods: Product[] = data.products.map((p: any) => ({
            id: String(p.id),
            title: p.title,
            price: p.variants?.[0]?.price || "0",
            image: p.images?.[0]?.src || "",
            url: `https://${data.domain || "store.myshopify.com"}/products/${p.handle}`,
            description: p.body_html?.replace(/<[^>]*>/g, "").slice(0, 150),
            collection: p.product_type || "General",
            variants: p.variants
          }));
          setProducts(prods);
          const cols = ["All", ...((Array.from(new Set(prods.map((p) => p.collection || "General").filter(Boolean)))) as string[])];
          setCollections(cols);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchesCollection = selectedCollection === "All" || p.collection === selectedCollection;
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCollection && matchesSearch;
  });

  const handleSend = async (product: Product) => {
    setSending(product.id);
    await onSendProduct(product);
    setSending(null);
    setSentId(product.id);
    setTimeout(() => setSentId(null), 2500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        animation: "catalogBackdropFade 0.18s ease-out"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          height: "100%",
          background: isDark ? "#0f172a" : "#ffffff",
          display: "flex",
          flexDirection: "column",
          boxShadow: isDark ? "-8px 0 32px rgba(0, 0, 0, 0.6)" : "-8px 0 32px rgba(0, 0, 0, 0.16)",
          borderLeft: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          animation: "catalogDrawerSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isDark ? "#151e2e" : "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: isDark ? "#f8fafc" : "#0f172a", letterSpacing: "-0.2px" }}>
                Product Catalog
              </div>
              <div style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", marginTop: "1px" }}>
                {recipientName ? `Send to ${recipientName}` : "Share product card directly into chat"}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close Catalog (Esc)"
            style={{
              background: isDark ? "#1e293b" : "#f1f5f9",
              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: isDark ? "#cbd5e1" : "#64748b",
              transition: "all 0.15s ease"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div
          style={{
            padding: "10px 14px 6px",
            background: isDark ? "#0f172a" : "#ffffff"
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                color: isDark ? "#64748b" : "#94a3b8",
                pointerEvents: "none"
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by title or type..."
              style={{
                width: "100%",
                padding: "8px 32px 8px 34px",
                border: `1.5px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                borderRadius: "10px",
                fontSize: "12.5px",
                outline: "none",
                boxSizing: "border-box",
                background: isDark ? "#151f32" : "#f8fafc",
                color: isDark ? "#f8fafc" : "#0f172a",
                transition: "border-color 0.15s ease, background 0.15s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#4f46e5";
                e.target.style.background = isDark ? "#111827" : "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isDark ? "#334155" : "#e2e8f0";
                e.target.style.background = isDark ? "#151f32" : "#f8fafc";
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isDark ? "#94a3b8" : "#94a3b8",
                  padding: "4px"
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Collection Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "5px",
            padding: "6px 14px 10px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
            flexShrink: 0,
            background: isDark ? "#0f172a" : "#ffffff"
          }}
        >
          {collections.map((col) => {
            const isSelected = selectedCollection === col;
            return (
              <button
                key={col}
                onClick={() => setSelectedCollection(col)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "16px",
                  fontSize: "11px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: `1px solid ${
                    isSelected
                      ? "#4f46e5"
                      : isDark
                      ? "#334155"
                      : "#e2e8f0"
                  }`,
                  background: isSelected
                    ? "#4f46e5"
                    : isDark
                    ? "#1e293b"
                    : "#f8fafc",
                  color: isSelected ? "#ffffff" : isDark ? "#cbd5e1" : "#475569",
                  transition: "all 0.15s ease"
                }}
              >
                {col}
              </button>
            );
          })}
        </div>

        {/* Count Bar */}
        <div
          style={{
            padding: "6px 16px",
            fontSize: "11px",
            fontWeight: 600,
            color: isDark ? "#64748b" : "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isDark ? "#0a0f1d" : "#fafafa",
            borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`
          }}
        >
          <span>{filtered.length} {filtered.length === 1 ? "Product" : "Products"} available</span>
          {selectedCollection !== "All" && (
            <span style={{ color: "#4f46e5", cursor: "pointer" }} onClick={() => setSelectedCollection("All")}>
              Reset filter
            </span>
          )}
        </div>

        {/* Products List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 12px",
            background: isDark ? "#0b0f19" : "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 0" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "76px",
                    borderRadius: "12px",
                    background: isDark ? "#1e293b" : "#ffffff",
                    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                    opacity: 0.6,
                    animation: "pulse 1.5s infinite"
                  }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: isDark ? "#64748b" : "#94a3b8" }}>
              <ShoppingBag size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <div style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#cbd5e1" : "#475569" }}>
                No products found
              </div>
              <div style={{ fontSize: "11.5px", marginTop: "4px" }}>
                {search ? `No products match "${search}"` : "No products in this category."}
              </div>
            </div>
          ) : (
            filtered.map((product) => {
              const isSendingThis = sending === product.id;
              const isSentJustNow = sentId === product.id;

              return (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "12px",
                    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                    background: isDark ? "#151e2e" : "#ffffff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow = "0 3px 10px rgba(99, 102, 241, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "#1e293b" : "#e2e8f0";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.03)";
                  }}
                >
                  {/* Product Thumbnail */}
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      minWidth: "56px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      background: isDark ? "#1e293b" : "#f1f5f9",
                      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ShoppingBag size={20} color={isDark ? "#64748b" : "#94a3b8"} />
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "12.5px",
                        color: isDark ? "#f1f5f9" : "#0f172a",
                        lineHeight: "1.3",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical"
                      }}
                      title={product.title}
                    >
                      {product.title}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: isDark ? "#94a3b8" : "#64748b",
                          background: isDark ? "#1e293b" : "#f1f5f9",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {product.collection || "General"}
                      </span>

                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "13.5px",
                          color: "#10b981",
                          whiteSpace: "nowrap"
                        }}
                      >
                        ₹{parseFloat(product.price).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", flexShrink: 0 }}>
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview in Store ↗"
                        style={{
                          color: isDark ? "#64748b" : "#94a3b8",
                          padding: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          transition: "color 0.15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#4f46e5")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "#64748b" : "#94a3b8")}
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}

                    <button
                      onClick={() => handleSend(product)}
                      disabled={isSendingThis}
                      style={{
                        padding: "5px 12px",
                        background: isSentJustNow
                          ? "#10b981"
                          : isSendingThis
                          ? (isDark ? "#334155" : "#94a3b8")
                          : "#4f46e5",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "7px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: isSendingThis ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {isSendingThis ? (
                        <RefreshCw size={11} className="spin-icon" />
                      ) : isSentJustNow ? (
                        <CheckCircle2 size={11} />
                      ) : (
                        <Send size={11} />
                      )}
                      <span>{isSendingThis ? "Sending..." : isSentJustNow ? "Sent ✓" : "Send"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes catalogBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes catalogDrawerSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .catalog-pill-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
