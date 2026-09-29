"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "@/app/(dashboard)/whatsapp/silent-listener/silent-listener.module.css";

interface SilentEntry {
  id: string;
  customerQuestion: string;
  agentAnswer: string;
  qualityScore: number;
  toneScore: number;
  resolutionScore: number;
  overallScore: number;
  aiReasoning?: string;
  category?: string;
  agentName?: string;
  status: string;
  kbEntry?: string;
  createdAt: string;
  conversationId: string;
}

interface StatusCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  INJECTED: number;
}

const TABS = ["PENDING", "APPROVED", "INJECTED", "REJECTED"] as const;
type Tab = (typeof TABS)[number];

const CATEGORY_COLORS: Record<string, string> = {
  FAQ: "#6366f1",
  Pricing: "#f59e0b",
  Returns: "#ef4444",
  Shipping: "#3b82f6",
  Product: "#10b981",
  Order: "#8b5cf6",
  Payment: "#ec4899",
  General: "#64748b",
};

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className={styles.scoreBadge}>
      <div
        className={styles.scoreRing}
        style={
          {
            "--score": pct,
            "--color": color,
          } as React.CSSProperties
        }
      >
        <span className={styles.scoreNum}>{pct}</span>
      </div>
      <span className={styles.scoreLabel}>{label}</span>
    </div>
  );
}

interface SilentListenerComponentProps {
  embedded?: boolean;
  onInjected?: () => void;
}

export default function SilentListenerComponent({ embedded = false, onInjected }: SilentListenerComponentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("PENDING");
  const [entries, setEntries] = useState<SilentEntry[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    INJECTED: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [toastMsg, setToastMsg] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/whatsapp/silent-listener/review?status=${activeTab}&page=${page}`
      );
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
        setTotal(data.total);
        setPages(data.pages);
        setStatusCounts(data.statusCounts);
      }
    } catch {
      showToast("❌ Failed to load entries");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeResult("");
    try {
      const res = await fetch("/api/whatsapp/silent-listener/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setAnalyzeResult(
          `✅ Scanned ${data.conversationsScanned} conversations — found ${data.entriesCreated} quality pairs!`
        );
        fetchEntries();
      } else {
        setAnalyzeResult(`❌ ${data.error}`);
      }
    } catch {
      setAnalyzeResult("❌ Network error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAction = async (
    entryId: string,
    action: "APPROVE" | "REJECT" | "INJECT"
  ) => {
    setActionLoading(entryId + action);
    try {
      const res = await fetch("/api/whatsapp/silent-listener/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchEntries();
        if (action === "INJECT" && onInjected) {
          onInjected();
        }
      } else {
        showToast(`❌ ${data.error}`);
      }
    } catch {
      showToast("❌ Request failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkInject = async () => {
    if (statusCounts.PENDING === 0) {
      showToast("No pending entries to approve");
      return;
    }
    if (
      !confirm(
        `Approve & inject ALL ${statusCounts.PENDING} pending entries into your AI Knowledge Base?`
      )
    )
      return;
    setActionLoading("bulk");
    try {
      const res = await fetch("/api/whatsapp/silent-listener/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_ALL" }),
      });
      const data = await res.json();
      showToast(data.message || data.error);
      fetchEntries();
      if (onInjected) {
        onInjected();
      }
    } catch {
      showToast("❌ Bulk inject failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`${styles.page} ${embedded ? styles.embeddedPage : ""}`}>
      {/* Toast */}
      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <span className={styles.micIcon}>🎙️</span>
            <div className={styles.pulseRing} />
          </div>
          <div>
            <h1 className={styles.title}>Silent Listener</h1>
            <p className={styles.subtitle}>
              AI observes your best agents &amp; auto-builds your chatbot brain
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <><span className={styles.spinner} /> Scanning conversations…</>
            ) : (
              <><span>🔍</span> Scan New Conversations</>
            )}
          </button>
          {statusCounts.PENDING > 0 && (
            <button
              className={styles.bulkBtn}
              onClick={handleBulkInject}
              disabled={actionLoading === "bulk"}
            >
              {actionLoading === "bulk" ? (
                <span className={styles.spinner} />
              ) : (
                "⚡"
              )}{" "}
              Inject All ({statusCounts.PENDING})
            </button>
          )}
        </div>
      </div>

      {analyzeResult && (
        <div className={styles.analyzeResult}>{analyzeResult}</div>
      )}

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#f59e0b" }}>
            {statusCounts.PENDING}
          </span>
          <span className={styles.statLabel}>Pending Review</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#10b981" }}>
            {statusCounts.INJECTED}
          </span>
          <span className={styles.statLabel}>In Knowledge Base</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#6366f1" }}>
            {statusCounts.APPROVED}
          </span>
          <span className={styles.statLabel}>Approved</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#ef4444" }}>
            {statusCounts.REJECTED}
          </span>
          <span className={styles.statLabel}>Rejected</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
          >
            {tab === "PENDING" && "⏳ "}
            {tab === "APPROVED" && "✅ "}
            {tab === "INJECTED" && "🧠 "}
            {tab === "REJECTED" && "❌ "}
            {tab}
            {statusCounts[tab] > 0 && (
              <span className={styles.tabBadge}>{statusCounts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Entry List */}
      <div className={styles.entryList}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading entries…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              {activeTab === "PENDING" ? "🔍" : activeTab === "INJECTED" ? "🧠" : "📭"}
            </div>
            <h3>
              {activeTab === "PENDING"
                ? "No pending entries yet"
                : activeTab === "INJECTED"
                ? "Nothing injected yet"
                : `No ${activeTab.toLowerCase()} entries`}
            </h3>
            <p>
              {activeTab === "PENDING"
                ? 'Click "Scan New Conversations" to let the AI analyze your best agents'
                : "Approve and inject entries to start here"}
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`${styles.entryCard} ${expandedId === entry.id ? styles.expanded : ""}`}
            >
              <div
                className={styles.entryHeader}
                onClick={() =>
                  setExpandedId(expandedId === entry.id ? null : entry.id)
                }
              >
                <div className={styles.entryMeta}>
                  <span
                    className={styles.categoryPill}
                    style={{
                      background: CATEGORY_COLORS[entry.category || "General"] + "22",
                      color: CATEGORY_COLORS[entry.category || "General"],
                      borderColor: CATEGORY_COLORS[entry.category || "General"] + "55",
                    }}
                  >
                    {entry.category || "General"}
                  </span>
                  {entry.agentName && (
                    <span className={styles.agentPill}>
                      👤 {entry.agentName}
                    </span>
                  )}
                  <span className={styles.dateLabel}>
                    {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                <div className={styles.scoreRow}>
                  <ScoreBadge score={entry.qualityScore} label="Quality" />
                  <ScoreBadge score={entry.toneScore} label="Tone" />
                  <ScoreBadge score={entry.resolutionScore} label="Resolve" />
                  <div className={styles.overallBadge}>
                    <span>{Math.round(entry.overallScore * 100)}%</span>
                    <span className={styles.overallLabel}>Overall</span>
                  </div>
                </div>

                <span className={styles.chevron}>
                  {expandedId === entry.id ? "▲" : "▼"}
                </span>
              </div>

              {/* Collapsed preview */}
              {expandedId !== entry.id && (
                <div className={styles.entryPreview}>
                  <span className={styles.qLabel}>Q:</span>
                  <span className={styles.qText}>
                    {entry.customerQuestion.slice(0, 120)}
                    {entry.customerQuestion.length > 120 ? "…" : ""}
                  </span>
                </div>
              )}

              {/* Expanded full content */}
              {expandedId === entry.id && (
                <div className={styles.entryBody}>
                  <div className={styles.qaBlock}>
                    <div className={styles.bubble} data-role="customer">
                      <span className={styles.bubbleRole}>Customer</span>
                      <p>{entry.customerQuestion}</p>
                    </div>
                    <div className={styles.bubble} data-role="agent">
                      <span className={styles.bubbleRole}>Agent ⭐</span>
                      <p>{entry.agentAnswer}</p>
                    </div>
                  </div>

                  {entry.aiReasoning && (
                    <div className={styles.reasoning}>
                      <span>🤖</span>
                      <p>{entry.aiReasoning}</p>
                    </div>
                  )}

                  {entry.kbEntry && (
                    <div className={styles.kbPreview}>
                      <span className={styles.kbLabel}>📚 KB Entry Preview</span>
                      <pre className={styles.kbText}>{entry.kbEntry}</pre>
                    </div>
                  )}

                  {/* Action buttons */}
                  {entry.status === "PENDING" && (
                    <div className={styles.actions}>
                      <button
                        className={styles.approveBtn}
                        disabled={!!actionLoading}
                        onClick={() => handleAction(entry.id, "APPROVE")}
                      >
                        {actionLoading === entry.id + "APPROVE" ? (
                          <span className={styles.spinner} />
                        ) : "✅"}{" "}
                        Approve
                      </button>
                      <button
                        className={styles.injectBtn}
                        disabled={!!actionLoading}
                        onClick={() => handleAction(entry.id, "INJECT")}
                      >
                        {actionLoading === entry.id + "INJECT" ? (
                          <span className={styles.spinner} />
                        ) : "🧠"}{" "}
                        Inject to KB
                      </button>
                      <button
                        className={styles.rejectBtn}
                        disabled={!!actionLoading}
                        onClick={() => handleAction(entry.id, "REJECT")}
                      >
                        {actionLoading === entry.id + "REJECT" ? (
                          <span className={styles.spinner} />
                        ) : "❌"}{" "}
                        Reject
                      </button>
                    </div>
                  )}

                  {entry.status === "APPROVED" && (
                    <div className={styles.actions}>
                      <button
                        className={styles.injectBtn}
                        disabled={!!actionLoading}
                        onClick={() => handleAction(entry.id, "INJECT")}
                      >
                        {actionLoading === entry.id + "INJECT" ? (
                          <span className={styles.spinner} />
                        ) : "🧠"}{" "}
                        Inject to KB Now
                      </button>
                    </div>
                  )}

                  {entry.status === "INJECTED" && (
                    <div className={styles.injectedBadge}>
                      🧠 This entry is live in your AI Knowledge Base
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.pageBtn}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pages} &nbsp;·&nbsp; {total} entries
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
