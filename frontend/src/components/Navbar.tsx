"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUsername, logout } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/orders", label: "Orders" },
  { href: "/products", label: "Products" },
  { href: "/filaments", label: "Filaments" },
  { href: "/calculator", label: "Calculator" },
  { href: "/waiting", label: "To-Do" },
  { href: "/expenses", label: "Expenses" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/completed", label: "Completed" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <>
      <nav className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            Menu
          </button>

          <Link href="/orders" className="topbar-brand">
            AbsoluTracker
          </Link>
        </div>

        <div className="topbar-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="topbar-right">
          {username && <span className="topbar-user">{username}</span>}
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="nav-overlay" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`nav-drawer${isOpen ? " open" : ""}`} aria-hidden={!isOpen}>
        <div className="nav-drawer-head">
          <span>AbsoluTracker</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setIsOpen(false)}
          >
            Close
          </button>
        </div>
        <nav className="nav-drawer-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-drawer-link${pathname === item.href ? " active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

