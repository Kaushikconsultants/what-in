"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Search, Zap, Trash, Edit } from "lucide-react";
import { getWhatsAppReplyLibrary, saveWhatsAppReplyItemAction } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppReplyLibraryPage() {
  const [replies, setReplies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Quick Reply");
  const [newShortcut, setNewShortcut] = useState("/sample");
  const [newContent, setNewContent] = useState("");

  const loadReplies = async () => {
    const res = await getWhatsAppReplyLibrary();
    if (res.success && res.replies) {
      setReplies(res.replies);
    }
  };

  useEffect(() => {
    loadReplies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    await saveWhatsAppReplyItemAction({
      title: newTitle,
      category: newCategory,
      shortcut: newShortcut,
      content: newContent
    });

    setShowModal(false);
    setNewTitle("");
    setNewContent("");
    loadReplies();
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Reply Library & Command Shortcuts</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Saved quick replies, sales pitches, pricing templates & command shortcuts (`/catalog`, `/price`).</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={16} /> Create Quick Reply
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
        {replies.map((r) => (
          <div key={r.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: "4px" }}>
                {r.shortcut}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>{r.category}</span>
            </div>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 6px 0" }}>{r.title}</h4>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, whiteSpace: "pre-wrap" }}>{r.content}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "450px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 14px 0" }}>Add Quick Reply Item</h3>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="text" placeholder="Title (e.g., Summer Price Slab)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
              <input type="text" placeholder="Shortcut (e.g., /priceslab)" value={newShortcut} onChange={(e) => setNewShortcut(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
              <textarea rows={4} placeholder="Reply Content..." value={newContent} onChange={(e) => setNewContent(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", resize: "none" }} />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "8px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700 }}>Save Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
