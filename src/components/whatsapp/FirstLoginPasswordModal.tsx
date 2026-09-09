"use client";
import React, { useState, useEffect } from "react";
import { changeUserPasswordAction } from "@/app/actions/ownerPortalActions";

export default function FirstLoginPasswordModal() {
  const [show, setShow] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
      if (u) {
        const val = decodeURIComponent(u.split("=")[1]);
        const parsed = JSON.parse(val);
        if (parsed && parsed.mustChangePassword && parsed.email) {
          setUserEmail(parsed.email);
          setUserName(parsed.name || "");
          setShow(true);
        }
      }
    } catch {}
  }, []);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await changeUserPasswordAction(userEmail, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      // Update cookie to remove mustChangePassword
      try {
        const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
        if (u) {
          const val = decodeURIComponent(u.split("=")[1]);
          const parsed = JSON.parse(val);
          parsed.mustChangePassword = false;
          document.cookie = `wm_user=${encodeURIComponent(JSON.stringify(parsed))}; path=/; max-age=604800; SameSite=Lax`;
        }
      } catch {}

      setTimeout(() => {
        setShow(false);
      }, 1500);
    } else {
      setError(res.error || "Failed to update password. Please try again.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(8px)", padding: "20px" }}>
      <div style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "460px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        
        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>🎉</div>
            <h3 style={{ color: "#16a34a", fontSize: "20px", fontWeight: 800, margin: "0 0 6px 0" }}>Password Updated!</h3>
            <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Your new password has been securely saved. Welcome to What-In!</p>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#eef2ff", color: "#4f46e5", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "10px" }}>
                🔒
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
                Welcome {userName ? `${userName}!` : "to What-In!"}
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                For your account security, please set your new permanent password to continue.
              </p>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#dc2626", fontSize: "12px", fontWeight: 600, marginBottom: "16px" }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Your Account Email</label>
                <input type="email" value={userEmail} disabled style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#64748b", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>New Password</label>
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: "11px", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" required style={{ width: "100%", padding: "11px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Confirm New Password</label>
                <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" required style={{ width: "100%", padding: "11px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", color: "#0f172a", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <button type="submit" disabled={loading} style={{ marginTop: "6px", padding: "13px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" }}>
                {loading ? "Updating Password..." : "💾 Set New Password & Proceed"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
