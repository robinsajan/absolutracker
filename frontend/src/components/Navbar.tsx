"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUsername, logout } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: "▦" },
  { href: "/orders",     label: "Orders",     icon: "⊡" },
  { href: "/completed",  label: "Completed",  icon: "✓" },
  { href: "/products",   label: "Products",   icon: "❐" },
  { href: "/filaments",  label: "Filaments",  icon: "≡" },
  { href: "/calculator", label: "Calculator", icon: "⊞" },
  { href: "/waiting",    label: "To-Do",      icon: "☐" },
  { href: "/expenses",   label: "Expenses",   icon: "₹" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/orders":     "Orders",
  "/completed":  "Completed Orders",
  "/products":   "Products",
  "/filaments":  "Filaments",
  "/calculator": "Price Calculator",
  "/waiting":    "To-Do & Waiting",
  "/expenses":   "Expenses",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setUsername(getUsername());
    const saved = localStorage.getItem("at-theme") as "dark" | "light" | null;
    const initial = saved || "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("at-theme", next);
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : "AT";

  const pageTitle = PAGE_TITLES[pathname] || "AbsoluTracker";

  return (
    <>
      {/* ── Sidebar ── */}
      <aside className={`sidebar${isOpen ? " mobile-open" : ""}`} aria-label="Navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">A</div>
          <div>
            <div className="sidebar-brand-text">AbsoluTracker</div>
            <div className="sidebar-brand-sub">3D Print Operations</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${pathname === item.href ? " active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            <span>{theme === "dark" ? "☀" : "☾"}</span>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-username">{username || "Guest"}</div>
              <div className="sidebar-role">Operator</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ width: "100%", justifyContent: "flex-start", gap: "8px" }}
          >
            <span>⇤</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      <div
        className={`sidebar-overlay${isOpen ? " visible" : ""}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ── Top Bar ── */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="topbar-hamburger"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="topbar-title">{pageTitle}</span>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>
    </>
  );
}
