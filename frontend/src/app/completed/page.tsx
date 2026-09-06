"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getCompleted, CompletedOrder } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function CompletedPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters & Sorting ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"completed_desc" | "completed_asc" | "price_desc" | "price_asc">("completed_desc");

  const fetchCompleted = useCallback(async () => {
    try {
      const data = await getCompleted();
      setOrders(data);
    } catch {
      console.error("Failed to fetch completed orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchCompleted();
  }, [router, fetchCompleted]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchCustomer = o.customer_name?.toLowerCase().includes(q);
          const matchItem = o.item_desc?.toLowerCase().includes(q);
          const matchPhone = o.phone?.toLowerCase().includes(q);
          const matchId = String(o.id).includes(q);
          if (!matchCustomer && !matchItem && !matchPhone && !matchId) return false;
        }

        if (minPrice !== "" && o.price < minPrice) return false;
        if (maxPrice !== "" && o.price > maxPrice) return false;

        if (startDate && o.completed_at && o.completed_at.slice(0, 10) < startDate) return false;
        if (endDate && o.completed_at && o.completed_at.slice(0, 10) > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "completed_desc") return (b.completed_at || "").localeCompare(a.completed_at || "");
        if (sortBy === "completed_asc") return (a.completed_at || "").localeCompare(b.completed_at || "");
        if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
        return 0;
      });
  }, [orders, search, minPrice, maxPrice, startDate, endDate, sortBy]);

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const totalItems = filteredOrders.reduce((sum, o) => sum + (o.qty || 1), 0);

  function resetFilters() {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setStartDate("");
    setEndDate("");
    setSortBy("completed_desc");
  }

  const hasActiveFilters = search || minPrice !== "" || maxPrice !== "" || startDate || endDate || sortBy !== "completed_desc";

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Completed Orders Archive</h1>
              <p className="page-subtitle">Historical records of delivered and settled orders</p>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-card-header">
                <div
                  className="metric-icon"
                  style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--emerald)" }}
                >
                  ✓
                </div>
                <span className="metric-trend up">{filteredOrders.length} orders</span>
              </div>
              <div className="metric-value positive">₹{totalRevenue.toLocaleString("en-IN")}</div>
              <div className="metric-label">{hasActiveFilters ? "Filtered Revenue" : "Total Revenue"}</div>
              <div className="metric-sub">{totalItems} units produced & delivered</div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              COMPLETED ORDERS FILTER (COLLAPSIBLE DROPDOWN PANEL)
          ───────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFilterPanel ? "10px" : "0" }}>
              <button
                type="button"
                className={`btn ${showFilterPanel || hasActiveFilters ? "btn-primary" : "btn-outline"} btn-sm`}
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>⚙ Filter Archive</span>
                <span style={{ fontSize: "10px", transition: "transform 200ms ease", transform: showFilterPanel ? "rotate(180deg)" : "rotate(0deg)" }}>
                  ▼
                </span>
                {hasActiveFilters && (
                  <span
                    style={{
                      background: "#fff",
                      color: "var(--primary)",
                      borderRadius: "var(--radius-full)",
                      padding: "1px 6px",
                      fontSize: "10px",
                      fontWeight: 800,
                    }}
                  >
                    Active
                  </span>
                )}
              </button>

              {hasActiveFilters && !showFilterPanel && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--on-surface-muted)" }}>
                  <span>
                    Showing {filteredOrders.length} of {orders.length} (₹{totalRevenue.toLocaleString("en-IN")})
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={resetFilters}
                    style={{ padding: "2px 6px", fontSize: "11px", color: "var(--rose)" }}
                  >
                    ✕ Reset
                  </button>
                </div>
              )}
            </div>

            {showFilterPanel && (
              <div className="card" style={{ animation: "slideUp 200ms ease" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "12px",
                    alignItems: "flex-end",
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Search Archive</label>
                    <input
                      placeholder="Customer, item, or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Min Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Max Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Delivered From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Delivered To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                      <option value="completed_desc">Completion: Newest First</option>
                      <option value="completed_asc">Completion: Oldest First</option>
                      <option value="price_desc">Amount: Highest First</option>
                      <option value="price_asc">Amount: Lowest First</option>
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <div style={{ display: "flex", alignItems: "flex-end", height: "100%" }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={resetFilters}
                        style={{ width: "100%", height: "38px" }}
                      >
                        ✕ Reset
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--outline-light)",
                    fontSize: "12px",
                    color: "var(--on-surface-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> completed orders
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--emerald)" }}>
                    Subtotal: ₹{totalRevenue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div className="empty-state-text">Loading archive...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <div className="empty-state-text">
                {hasActiveFilters ? "No completed orders match the selected filters" : "No completed orders yet"}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, color: "var(--on-surface-muted)" }}>#{order.id}</td>
                      <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                      <td style={{ color: "var(--on-surface-2)" }}>{order.item_desc}</td>
                      <td>{order.qty}</td>
                      <td style={{ fontWeight: 700, color: "var(--emerald)" }}>
                        ₹{(order.price || 0).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className="badge badge-emerald">{order.payment_status || "Settled"}</span>
                      </td>
                      <td style={{ color: "var(--on-surface-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {order.completed_at ? new Date(order.completed_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
