"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setLogin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(username.trim(), password);
      if (res.success) {
        setLogin(res.username);
        window.location.href = "/dashboard";
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Invalid credentials");
      } else {
        setError("Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(circle at 50% 20%, rgba(124, 58, 237, 0.15) 0%, #0a0f1e 70%)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "36px 32px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          animation: "slideUp 300ms ease",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--primary), #5b21b6)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 800,
              color: "#fff",
              marginBottom: "14px",
              boxShadow: "0 8px 24px rgba(124, 58, 237, 0.4)",
            }}
          >
            A
          </div>
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--on-surface)",
              marginBottom: "4px",
            }}
          >
            AbsoluTracker
          </h1>
          <p style={{ color: "var(--on-surface-muted)", fontSize: "13px" }}>
            Sales & Operations Intelligence Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. robinsajan4"
              autoComplete="username"
              required
              style={{ padding: "11px 14px", fontSize: "13.5px" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              style={{ padding: "11px 14px", fontSize: "13.5px" }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "var(--rose-dim)",
                color: "var(--rose)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: "12.5px",
                marginBottom: "18px",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "var(--radius-md)",
            }}
          >
            {loading ? "Authenticating..." : "Sign In to Operations →"}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid var(--outline-light)",
            textAlign: "center",
            fontSize: "11px",
            color: "var(--on-surface-muted)",
          }}
        >
          Protected environment • Multi-stage print farm operations
        </div>
      </div>
    </div>
  );
}
