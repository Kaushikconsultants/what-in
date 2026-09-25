"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Shield } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/whatsapp/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        router.push(redirectTo);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #090d16 0%, #062419 50%, #090d16 100%)", fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* Background decoration */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "15%", width: "450px", height: "450px", background: "radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "15%", width: "350px", height: "350px", background: "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "440px", padding: "24px", position: "relative", zIndex: 10 }}>
        {/* Back to Landing Page */}
        <div style={{ marginBottom: "20px" }}>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 600, transition: "color 0.2s" }}
            onMouseOver={e => e.currentTarget.style.color = "#10b981"}
            onMouseOut={e => e.currentTarget.style.color = "#94a3b8"}
          >
            <ArrowLeft size={16} /> Back to What-In Landing Page
          </Link>
        </div>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "68px", height: "68px", borderRadius: "20px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "30px", boxShadow: "0 0 50px rgba(16, 185, 129, 0.4)" }}>
            💬
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#f8fafc", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            What-In
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Enterprise WhatsApp Business OS & AI Platform
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "24px", padding: "36px", backdropFilter: "blur(20px)", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 24px 0" }}>Sign in to your client account</h2>

          <form onSubmit={handleLogin} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "#f1f5f9", fontSize: "15px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "rgba(16,185,129,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "#f1f5f9", fontSize: "15px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "rgba(16,185,129,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", color: "#f87171", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: "4px", padding: "14px", background: loading ? "rgba(16,185,129,0.4)" : "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "12px", color: "white", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.2px", boxShadow: loading ? "none" : "0 4px 20px rgba(16,185,129,0.35)", transition: "all 0.2s" }}
            >
              {loading ? "Signing in..." : "Sign In to What-In →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: "12px", marginTop: "20px" }}>
          Contact your administrator for access credentials
        </p>
        
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => router.push("/owner/login")}
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(16,185,129,0.12)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(16,185,129,0.06)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.2)"; }}
          >
            🛡️ Platform Owner? Access Super-Admin Console
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#090d16", color: "#64748b" }}>
        Loading What-In Portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
