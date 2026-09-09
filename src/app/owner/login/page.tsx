"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OwnerLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/owner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        sessionStorage.setItem("owner_authed", "1");
        router.push("/owner");
      } else {
        setError("Invalid master password. Access denied.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "440px", padding: "24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "28px", color: "white", boxShadow: "0 10px 25px rgba(79, 70, 229, 0.25)" }}>
            👑
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>Owner Console</h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>What-In Super Admin Portal</p>
        </div>

        {/* Card */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)" }}>
          <form onSubmit={handleLogin} autoComplete="off">
            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#475569", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Master Owner Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password..."
              required
              autoComplete="new-password"
              autoFocus
              style={{ width: "100%", padding: "12px 16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", color: "#0f172a", fontSize: "16px", outline: "none", boxSizing: "border-box" }}
            />
            {error && (
              <div style={{ marginTop: "14px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#dc2626", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚠️</span> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: "20px", padding: "14px", background: loading ? "#a5b4fc" : "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: "12px", color: "white", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.2px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)", transition: "all 0.2s" }}
            >
              {loading ? "Authenticating..." : "Access Console →"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link href="/login" style={{ color: "#64748b", fontSize: "13px", textDecoration: "none", fontWeight: 600 }}>
            ← Back to Client Login Portal
          </Link>
          <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "8px" }}>
            Restricted access • Authorized administrators only
          </p>
        </div>
      </div>
    </div>
  );
}
