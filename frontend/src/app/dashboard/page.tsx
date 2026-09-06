"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";
import { getDashboardStats, getOrders, advanceStage, DashboardStats, Order } from "@/lib/api";
import Navbar from "@/components/Navbar";

const STAGES_CONFIG: Record<
  number,
  { label: string; actionName: string; color: string; bgDim: string; icon: string }
> = {
  1: {
    label: "Needs Design",
    actionName: "Design",
    color: "#38bdf8",
    bgDim: "rgba(56, 189, 248, 0.12)",
    icon: "✎",
  },
  2: {
    label: "Ready to Print",
    actionName: "Print",
    color: "#818cf8",
    bgDim: "rgba(129, 140, 248, 0.12)",
    icon: "🖨",
  },
  3: {
    label: "Ready to Pack",
    actionName: "Package",
    color: "#f59e0b",
    bgDim: "rgba(245, 158, 11, 0.12)",
    icon: "📦",
  },
  4: {
    label: "Ready to Deliver",
    actionName: "Deliver",
    color: "#a855f7",
    bgDim: "rgba(168, 85, 247, 0.12)",
    icon: "🚚",
  },
  5: {
    label: "Awaiting Payment",
    actionName: "Collect Payment",
    color: "#10b981",
    bgDim: "rgba(16, 185, 129, 0.12)",
    icon: "₹",
  },
};

interface ProductTaskSummary {
  productName: string;
  totalQty: number;
  orderCount: number;
  orderIds: number[];
  earliestDeadline?: string;
  isOverdue: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStageFilter, setActiveStageFilter] = useState<number>(0); // 0 = all tasks
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        getDashboardStats().catch(() => null),
        getOrders().catch(() => []),
      ]);
      setStats(statsData);
      setOrders(ordersData || []);
    } catch {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [router, loadData]);

  // Aggregate product-wise tasks for each active operational stage (stages 1 to 5)
  // Stage 1: Design
  // Stage 2: Print
  // Stage 3: Package
  // Stage 4: Deliver
  // Stage 5: Payment
  const stageProductSummaries = useMemo(() => {
    const map: Record<number, Record<string, ProductTaskSummary>> = {
      1: {},
      2: {},
      3: {},
      4: {},
      5: {},
    };

    const todayStr = new Date().toISOString().split("T")[0];

    orders.forEach((o) => {
      const st = o.stage;
      if (st >= 1 && st <= 5) {
        // Clean item description to group by base product
        const cleanName = o.item_desc
          ? o.item_desc.replace(/\s*\([^)]*\)/g, "").trim() || o.item_desc.trim()
          : "Custom 3D Print";

        if (!map[st][cleanName]) {
          map[st][cleanName] = {
            productName: cleanName,
            totalQty: 0,
            orderCount: 0,
            orderIds: [],
            earliestDeadline: o.deadline,
            isOverdue: o.deadline ? o.deadline < todayStr : false,
          };
        }

        const entry = map[st][cleanName];
        entry.totalQty += o.qty || 1;
        entry.orderCount += 1;
        entry.orderIds.push(o.id);

        if (o.deadline) {
          if (!entry.earliestDeadline || o.deadline < entry.earliestDeadline) {
            entry.earliestDeadline = o.deadline;
          }
          if (o.deadline < todayStr) {
            entry.isOverdue = true;
          }
        }
      }
    });

    // Convert map to sorted arrays (highest quantity / urgent first)
    const result: Record<number, ProductTaskSummary[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (let st = 1; st <= 5; st++) {
      result[st] = Object.values(map[st]).sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return b.totalQty - a.totalQty;
      });
    }
    return result;
  }, [orders]);

  // Overall counts for badges
  const totalTasksToDesign = stageProductSummaries[1].reduce((sum, p) => sum + p.totalQty, 0);
  const totalItemsToPrint = stageProductSummaries[2].reduce((sum, p) => sum + p.totalQty, 0);
  const totalItemsToPack = stageProductSummaries[3].reduce((sum, p) => sum + p.totalQty, 0);
  const totalItemsToDeliver = stageProductSummaries[4].reduce((sum, p) => sum + p.totalQty, 0);
  const totalPendingPayments = orders
    .filter((o) => o.stage === 6 || o.payment_status?.toLowerCase().includes("pending"))
    .reduce((sum, o) => sum + (o.price || 0), 0);

  const activeOrders = orders.filter((o) => o.stage >= 1 && o.stage <= 6);

  async function handleQuickAdvance(orderId: number) {
    setAdvancingId(orderId);
    try {
      await advanceStage(orderId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setAdvancingId(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Operations & Production Dashboard</h1>
              <p className="page-subtitle">
                Product-wise summary of what needs to be designed, printed, packaged & delivered
              </p>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadData}
                disabled={loading}
              >
                ↻ Refresh
              </button>
              <Link href="/orders" className="btn btn-primary btn-sm">
                + New Order
              </Link>
            </div>
          </div>

          {loading || !stats ? (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div className="empty-state-text">Loading operations data...</div>
            </div>
          ) : (
            <>
              {/* ── 4 KPI Metric Cards ── */}
              <div className="metrics-grid">
                {/* Print Queue Metric */}
                <div className="metric-card" style={{ borderColor: "rgba(129, 140, 248, 0.3)" }}>
                  <div className="metric-card-header">
                    <div
                      className="metric-icon"
                      style={{ background: "rgba(129, 140, 248, 0.15)", color: "#818cf8" }}
                    >
                      🖨
                    </div>
                    <span className="metric-trend up">Production Queue</span>
                  </div>
                  <div className="metric-value" style={{ color: "#a5b4fc" }}>
                    {totalItemsToPrint} <span style={{ fontSize: "14px", fontWeight: 500 }}>units</span>
                  </div>
                  <div className="metric-label">Items to Print</div>
                  <div className="metric-sub">
                    Across {stageProductSummaries[2].length} distinct products
                  </div>
                </div>

                {/* Packaging & Dispatch Queue */}
                <div className="metric-card" style={{ borderColor: "rgba(245, 158, 11, 0.3)" }}>
                  <div className="metric-card-header">
                    <div
                      className="metric-icon"
                      style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
                    >
                      📦
                    </div>
                    <span className="metric-trend down">Fulfillment</span>
                  </div>
                  <div className="metric-value" style={{ color: "#f59e0b" }}>
                    {totalItemsToPack + totalItemsToDeliver} <span style={{ fontSize: "14px", fontWeight: 500 }}>units</span>
                  </div>
                  <div className="metric-label">Pack & Deliver</div>
                  <div className="metric-sub">
                    {totalItemsToPack} to pack • {totalItemsToDeliver} to ship
                  </div>
                </div>

                {/* Pending Payments / Collections */}
                <div className="metric-card" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
                  <div className="metric-card-header">
                    <div
                      className="metric-icon"
                      style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
                    >
                      ₹
                    </div>
                    <span className="metric-trend up">Due for Collection</span>
                  </div>
                  <div className="metric-value" style={{ color: "#10b981" }}>
                    ₹{totalPendingPayments.toLocaleString("en-IN")}
                  </div>
                  <div className="metric-label">Pending Payments</div>
                  <div className="metric-sub">
                    {orders.filter((o) => o.stage === 6).length} orders delivered
                  </div>
                </div>

                {/* Net Profit & Total Revenue */}
                <div className="metric-card" style={{ borderColor: "rgba(59, 130, 246, 0.3)" }}>
                  <div className="metric-card-header">
                    <div
                      className="metric-icon"
                      style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}
                    >
                      ↗
                    </div>
                    <span className={`metric-trend ${stats.net_profit >= 0 ? "up" : "down"}`}>
                      {stats.net_profit >= 0 ? "Profitable" : "Deficit"}
                    </span>
                  </div>
                  <div
                    className="metric-value"
                    style={{ color: stats.net_profit >= 0 ? "#60a5fa" : "#f43f5e" }}
                  >
                    ₹{stats.net_profit.toLocaleString("en-IN")}
                  </div>
                  <div className="metric-label">Net Profit</div>
                  <div className="metric-sub">
                    Revenue: ₹{stats.total_revenue.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  TODAY'S PRODUCTION & FULFILLMENT: PRODUCT-WISE SUMMARY
              ───────────────────────────────────────────────────────────── */}
              <div className="card" style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "20px",
                    paddingBottom: "14px",
                    borderBottom: "1px solid var(--outline-light)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>⚡</span>
                      <h2 style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                        Action Items Summary (Product-Wise)
                      </h2>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--on-surface-muted)", marginTop: "2px" }}>
                      Aggregated quantities of every product grouped by production workflow stage
                    </p>
                  </div>

                  {/* Stage Category Filter Pills */}
                  <div className="toggle-group" style={{ flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`toggle-btn ${activeStageFilter === 0 ? "active" : ""}`}
                      onClick={() => setActiveStageFilter(0)}
                    >
                      All Stages
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${activeStageFilter === 2 ? "active" : ""}`}
                      onClick={() => setActiveStageFilter(2)}
                    >
                      🖨 Print ({totalItemsToPrint})
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${activeStageFilter === 3 ? "active" : ""}`}
                      onClick={() => setActiveStageFilter(3)}
                    >
                      📦 Pack ({totalItemsToPack})
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${activeStageFilter === 4 ? "active" : ""}`}
                      onClick={() => setActiveStageFilter(4)}
                    >
                      🚚 Deliver ({totalItemsToDeliver})
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${activeStageFilter === 1 ? "active" : ""}`}
                      onClick={() => setActiveStageFilter(1)}
                    >
                      ✎ Design ({totalTasksToDesign})
                    </button>
                  </div>
                </div>

                {/* 4 Operations Columns (or filtered view) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      activeStageFilter === 0
                        ? "repeat(auto-fit, minmax(280px, 1fr))"
                        : "1fr",
                    gap: "16px",
                  }}
                >
                  {[
                    { stage: 2, key: 2 }, // 🖨 Print
                    { stage: 3, key: 3 }, // 📦 Pack
                    { stage: 4, key: 4 }, // 🚚 Deliver
                    { stage: 1, key: 1 }, // ✎ Design
                  ]
                    .filter((col) => activeStageFilter === 0 || activeStageFilter === col.stage)
                    .map(({ stage }) => {
                      const cfg = STAGES_CONFIG[stage];
                      const items = stageProductSummaries[stage] || [];
                      const totalQty = items.reduce((sum, item) => sum + item.totalQty, 0);

                      return (
                        <div
                          key={stage}
                          style={{
                            background: "rgba(0, 0, 0, 0.2)",
                            border: `1px solid ${cfg.color}33`,
                            borderRadius: "var(--radius-lg)",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          {/* Column Header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              paddingBottom: "10px",
                              borderBottom: "1px solid var(--outline-light)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  fontSize: "14px",
                                  padding: "4px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  background: cfg.bgDim,
                                  color: cfg.color,
                                }}
                              >
                                {cfg.icon}
                              </span>
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--on-surface)" }}>
                                  {cfg.label}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--on-surface-muted)" }}>
                                  {items.length} unique products
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 800,
                                padding: "2px 10px",
                                borderRadius: "var(--radius-full)",
                                background: cfg.bgDim,
                                color: cfg.color,
                              }}
                            >
                              {totalQty} {totalQty === 1 ? "unit" : "units"}
                            </span>
                          </div>

                          {/* Product Items List */}
                          {items.length === 0 ? (
                            <div
                              style={{
                                padding: "28px 12px",
                                textAlign: "center",
                                color: "var(--on-surface-muted)",
                                fontSize: "12px",
                              }}
                            >
                              ✓ No pending items in this stage
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {items.map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    background: "rgba(255, 255, 255, 0.03)",
                                    border: `1px solid ${
                                      item.isOverdue ? "rgba(244, 63, 94, 0.4)" : "var(--outline-light)"
                                    }`,
                                    borderRadius: "var(--radius-md)",
                                    padding: "10px 12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                    transition: "all var(--transition)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-start",
                                      gap: "8px",
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: 600,
                                          color: "var(--on-surface)",
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {item.productName}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "var(--on-surface-muted)",
                                          marginTop: "2px",
                                        }}
                                      >
                                        Orders: {item.orderIds.map((id) => `#${id}`).join(", ")}
                                      </div>
                                    </div>

                                    {/* Product Quantity Badge */}
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: 800,
                                        padding: "3px 9px",
                                        borderRadius: "var(--radius-sm)",
                                        background: cfg.bgDim,
                                        color: cfg.color,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      ×{item.totalQty}
                                    </span>
                                  </div>

                                  {/* Footer: Due date & Fast Advance Button */}
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginTop: "4px",
                                      paddingTop: "6px",
                                      borderTop: "1px solid rgba(255,255,255,0.04)",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: item.isOverdue ? 700 : 500,
                                        color: item.isOverdue ? "var(--rose)" : "var(--on-surface-muted)",
                                      }}
                                    >
                                      {item.isOverdue
                                        ? `⚠ Due ${item.earliestDeadline} (Overdue)`
                                        : item.earliestDeadline
                                        ? `Due ${item.earliestDeadline}`
                                        : "No deadline"}
                                    </span>

                                    <div style={{ display: "flex", gap: "4px" }}>
                                      {item.orderIds.length === 1 && (
                                        <button
                                          type="button"
                                          className="btn btn-outline btn-sm"
                                          style={{ padding: "2px 7px", fontSize: "10.5px" }}
                                          disabled={advancingId === item.orderIds[0]}
                                          onClick={() => handleQuickAdvance(item.orderIds[0])}
                                          title={`Advance Order #${item.orderIds[0]}`}
                                        >
                                          {advancingId === item.orderIds[0]
                                            ? "..."
                                            : `Done →`}
                                        </button>
                                      )}
                                      <Link
                                        href="/orders"
                                        style={{
                                          fontSize: "11px",
                                          color: "var(--primary-light)",
                                          padding: "2px 4px",
                                        }}
                                      >
                                        View →
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* ── Workflow Pipeline Progress Visualizer ── */}
              <div className="card" style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: "14px", fontWeight: 700 }}>Orders Pipeline Breakdown</h2>
                    <p style={{ fontSize: "11px", color: "var(--on-surface-muted)", marginTop: "2px" }}>
                      Total active production flow across {activeOrders.length} active orders
                    </p>
                  </div>
                  <Link href="/orders" className="btn btn-outline btn-sm">
                    Open Kanban Board →
                  </Link>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {[
                    { stage: 1, label: "1. Design", count: totalTasksToDesign, color: "#38bdf8" },
                    { stage: 2, label: "2. Print", count: totalItemsToPrint, color: "#818cf8" },
                    { stage: 3, label: "3. Pack", count: totalItemsToPack, color: "#f59e0b" },
                    { stage: 4, label: "4. Deliver", count: totalItemsToDeliver, color: "#a855f7" },
                    { stage: 5, label: "5. Payment", count: orders.filter((o) => o.stage === 6).length, color: "#10b981" },
                  ].map((s) => (
                    <div
                      key={s.stage}
                      style={{
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid var(--outline-light)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--on-surface-muted)" }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: s.color }}>
                          {s.count}
                        </span>
                      </div>
                      <div
                        style={{
                          height: "4px",
                          borderRadius: "2px",
                          background: "var(--outline)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${
                              activeOrders.length ? Math.min(100, (s.count / activeOrders.length) * 100) : 0
                            }%`,
                            background: s.color,
                            borderRadius: "2px",
                            transition: "width 400ms ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Recent Orders & Operations Summary ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Recent Orders Mini Table */}
                <div className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <h2 style={{ fontSize: "14px", fontWeight: 700 }}>Recent Orders</h2>
                    <Link href="/orders" style={{ fontSize: "12px", color: "var(--primary-light)" }}>
                      View all ({orders.length})
                    </Link>
                  </div>

                  {orders.length === 0 ? (
                    <div className="empty-state" style={{ padding: "24px 0" }}>
                      <p>No active orders</p>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Stage</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map((o) => (
                            <tr key={o.id}>
                              <td style={{ fontWeight: 600, fontSize: "12px" }}>#{o.id}</td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: "12.5px" }}>{o.customer_name}</div>
                                <div style={{ fontSize: "11px", color: "var(--on-surface-muted)" }}>
                                  {o.item_desc?.slice(0, 24)}...
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-violet">
                                  Stage {o.stage}
                                </span>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>
                                ₹{(o.price || 0).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Operations Quick Actions */}
                <div
                  className="card"
                  style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  <div>
                    <h2 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>
                      Quick Operations
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <Link
                        href="/orders"
                        className="btn btn-outline"
                        style={{ justifyContent: "flex-start", padding: "10px 14px", fontSize: "13px" }}
                      >
                        <span>⊡</span> Manage Kanban & Orders
                      </Link>
                      <Link
                        href="/expenses"
                        className="btn btn-outline"
                        style={{ justifyContent: "flex-start", padding: "10px 14px", fontSize: "13px" }}
                      >
                        <span>₹</span> Record Business Expense
                      </Link>
                      <Link
                        href="/calculator"
                        className="btn btn-outline"
                        style={{ justifyContent: "flex-start", padding: "10px 14px", fontSize: "13px" }}
                      >
                        <span>⊞</span> Calculate Print Quotation
                      </Link>
                      <Link
                        href="/filaments"
                        className="btn btn-outline"
                        style={{ justifyContent: "flex-start", padding: "10px 14px", fontSize: "13px" }}
                      >
                        <span>≡</span> Check Filament Stock
                      </Link>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--outline-light)",
                      fontSize: "11.5px",
                      color: "var(--on-surface-muted)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Historical Archive:</span>
                    <strong style={{ color: "var(--on-surface)" }}>
                      {stats.completed_count} orders archived
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
