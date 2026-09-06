"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getOrders, Order } from "@/lib/api";
import Navbar from "@/components/Navbar";
import KanbanView from "@/components/KanbanView";
import TableView from "@/components/TableView";
import OrderModal from "@/components/OrderModal";

type ViewMode = "kanban" | "table";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<ViewMode>("kanban");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Filters & Sorting ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"id_desc" | "id_asc" | "price_desc" | "price_asc" | "deadline">("id_desc");

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchOrders();
  }, [router, fetchOrders]);

  function handleOrderCreated(order: Order) {
    setOrders((prev) => [order, ...prev]);
  }

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    return orders
      .filter((o) => {
        // Text Search across customer name, item desc, or phone
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchCustomer = o.customer_name?.toLowerCase().includes(q);
          const matchItem = o.item_desc?.toLowerCase().includes(q);
          const matchPhone = o.phone?.toLowerCase().includes(q);
          const matchId = String(o.id).includes(q);
          if (!matchCustomer && !matchItem && !matchPhone && !matchId) return false;
        }

        // Stage filter
        if (selectedStage !== "all" && String(o.stage) !== selectedStage) {
          return false;
        }

        // Price range filter
        if (minPrice !== "" && o.price < minPrice) return false;
        if (maxPrice !== "" && o.price > maxPrice) return false;

        // Overdue filter
        if (isOverdueOnly) {
          if (!o.deadline || o.deadline >= todayStr) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "id_desc") return b.id - a.id;
        if (sortBy === "id_asc") return a.id - b.id;
        if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "deadline") {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        }
        return 0;
      });
  }, [orders, search, selectedStage, minPrice, maxPrice, isOverdueOnly, sortBy]);

  const hasActiveFilters =
    search || selectedStage !== "all" || minPrice !== "" || maxPrice !== "" || isOverdueOnly || sortBy !== "id_desc";

  function resetFilters() {
    setSearch("");
    setSelectedStage("all");
    setMinPrice("");
    setMaxPrice("");
    setIsOverdueOnly(false);
    setSortBy("id_desc");
  }

  const filteredValue = filteredOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="page-container">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Active Orders</h1>
              <p className="page-subtitle">
                Filter and track live production through all stages
              </p>
            </div>
            <div className="header-actions">
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${view === "kanban" ? "active" : ""}`}
                  onClick={() => setView("kanban")}
                >
                  Board
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${view === "table" ? "active" : ""}`}
                  onClick={() => setView("table")}
                >
                  Table
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
              >
                + New Order
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              MULTI-CRITERIA FILTER BAR (COLLAPSIBLE DROPDOWN PANEL)
          ───────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFilterPanel ? "10px" : "0" }}>
              <button
                type="button"
                className={`btn ${showFilterPanel || hasActiveFilters ? "btn-primary" : "btn-outline"} btn-sm`}
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>⚙ Filter Orders</span>
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
                    Showing {filteredOrders.length} of {orders.length} (₹{filteredValue.toLocaleString("en-IN")})
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
                  {/* Search */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Search Orders</label>
                    <input
                      placeholder="Customer, item, or phone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Stage Dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Filter by Stage</label>
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                    >
                      <option value="all">All Stages (1-6)</option>
                      <option value="1">Stage 1: Ordered</option>
                      <option value="2">Stage 2: Designed</option>
                      <option value="3">Stage 3: Printed</option>
                      <option value="4">Stage 4: Packed</option>
                      <option value="5">Stage 5: Delivered</option>
                      <option value="6">Stage 6: Payment</option>
                    </select>
                  </div>

                  {/* Min Price */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Min Price (₹)</label>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={minPrice}
                      onChange={(e) =>
                        setMinPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Max Price */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Max Price (₹)</label>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={maxPrice}
                      onChange={(e) =>
                        setMaxPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Sort By */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="id_desc">Order ID: Newest First</option>
                      <option value="id_asc">Order ID: Oldest First</option>
                      <option value="price_desc">Price: Highest First</option>
                      <option value="price_asc">Price: Lowest First</option>
                      <option value="deadline">Earliest Deadline</option>
                    </select>
                  </div>

                  {/* Overdue Toggle Checkbox */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      height: "38px",
                      padding: "0 10px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--outline)",
                      background: isOverdueOnly ? "var(--rose-dim)" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setIsOverdueOnly(!isOverdueOnly)}
                  >
                    <input
                      type="checkbox"
                      checked={isOverdueOnly}
                      onChange={(e) => setIsOverdueOnly(e.target.checked)}
                      style={{ width: "auto", margin: 0, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: isOverdueOnly ? "var(--rose)" : "var(--on-surface)" }}>
                      Overdue Only
                    </span>
                  </div>

                  {/* Reset button */}
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
                    Showing <strong>{filteredOrders.length}</strong> of{" "}
                    <strong>{orders.length}</strong> orders
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--primary-light)" }}>
                    Selected Value: ₹{filteredValue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Body Content */}
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div className="empty-state-text">Loading orders...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⊡</div>
              <div className="empty-state-text">
                {hasActiveFilters ? "No orders match the selected filters" : "No active orders found"}
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={resetFilters}
                  style={{ marginTop: "12px" }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : view === "kanban" ? (
            <KanbanView orders={filteredOrders} onRefresh={fetchOrders} />
          ) : (
            <TableView orders={filteredOrders} onRefresh={fetchOrders} />
          )}
        </div>
      </main>

      <OrderModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleOrderCreated}
      />
    </>
  );
}
