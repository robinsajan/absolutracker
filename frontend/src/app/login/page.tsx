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
      const res = await login(username, password);
      if (res.success) {
        setLogin(res.username);
        router.replace("/orders");
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f1629 100%)",
    }}>
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "var(--shadow-lg)",
        animation: "slideUp 400ms ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "16px",
            boxShadow: "var(--shadow-glow)",
          }}>
            A
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "26px",
            fontWeight: 700,
            marginBottom: "4px",
          }}>
            AbsoluTracker
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Sign in
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "var(--danger-bg)",
              color: "var(--danger)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              marginBottom: "16px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "12px",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
