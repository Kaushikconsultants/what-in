"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
        // Backup flag in sessionStorage in case cookie SameSite causes issues
        sessionStorage.setItem("owner_authed", "1");
        router.push("/owner");
      } else {
        setError("Invalid password. Access denied.");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "28px", boxShadow: "0 0 40px rgba(124, 58, 237, 0.4)" }}>
            👑
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#f8fafc", margin: 0, letterSpacing: "-0.5px" }}>Owner Console</h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "6px" }}>What-In Super Admin Portal</p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "32px", backdropFilter: "blur(20px)" }}>
          <form onSubmit={handleLogin} autoComplete="off">
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Owner Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter owner password..."
              required
              autoComplete="new-password"
              autoFocus
              style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f1f5f9", fontSize: "16px", outline: "none", letterSpacing: "2px", boxSizing: "border-box" }}
            />
            {error && (
              <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px" }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: "20px", padding: "14px", background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "12px", color: "white", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.3px", transition: "all 0.2s" }}
            >
              {loading ? "Authenticating..." : "Access Console →"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", color: "#334155", fontSize: "12px", marginTop: "20px" }}>
          Restricted access — authorized personnel only
        </p>
      </div>
    </div>
  );
}
