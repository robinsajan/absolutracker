"use client";

import { useState } from "react";
import { Order, advanceStage, revertStage, completeOrder, deleteOrder } from "@/lib/api";

const STAGE_LABELS: Record<number, string> = {
  1: "Ordered",
  2: "Designed",
  3: "Printed",
  4: "Packed",
  5: "Delivered",
  6: "Payment",
};

const STAGE_NEXT: Record<number, string> = {
  1: "Designed",
  2: "Printed",
  3: "Packed",
  4: "Delivered",
  5: "Payment",
};

const STAGE_COLORS: Record<number, string> = {
  1: "#38bdf8",
  2: "#6366f1",
  3: "#3b82f6",
  4: "#f59e0b",
  5: "#8b5cf6",
  6: "#10b981",
};

interface Props {
  orders: Order[];
  onRefresh: () => void;
}

export default function TableView({ orders, onRefresh }: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function handleAdvance(id: number) {
    setLoadingId(id);
    try {
      await advanceStage(id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to advance");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRevert(id: number) {
    setLoadingId(id);
    try {
      await revertStage(id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revert");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleComplete(id: number) {
    if (!confirm("Mark as Paid & Archive this order?")) return;
    setLoadingId(id);
    try {
      await completeOrder(id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Permanently delete this order?")) return;
    setLoadingId(id);
    try {
      await deleteOrder(id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  }

  function isOverdue(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  function formatDate(dt: string | null): string {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <p>No active orders</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Stage</th>
            <th>Date</th>
            <th>Deadline</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const busy = loadingId === order.id;
            return (
              <tr
                key={order.id}
                style={{
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>#{order.id}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                  {order.phone && (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{order.phone}</div>
                  )}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{order.item_desc}</td>
                <td>{order.qty}</td>
                <td style={{ fontWeight: 700, color: "var(--accent)" }}>₹{order.price.toLocaleString()}</td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: `${STAGE_COLORS[order.stage]}20`,
                      color: STAGE_COLORS[order.stage],
                    }}
                  >
                    {STAGE_LABELS[order.stage]}
                  </span>
                </td>
                <td style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatDate(order.created_at)}
                </td>
                <td>
                  {order.deadline ? (
                    <span style={{
                      color: isOverdue(order.deadline) ? "var(--danger)" : "var(--text-secondary)",
                      fontWeight: isOverdue(order.deadline) ? 600 : 400,
                      fontSize: "12px",
                    }}>
                      {order.deadline}
                      {isOverdue(order.deadline) && " (Overdue)"}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "nowrap" }}>
                    {order.stage < 6 && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAdvance(order.id)}
                        disabled={busy}
                      >
                        Move to {STAGE_NEXT[order.stage]}
                      </button>
                    )}
                    {order.stage > 1 && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRevert(order.id)}
                        disabled={busy}
                        title="Back"
                      >
                        Back
                      </button>
                    )}
                    {order.stage === 6 && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleComplete(order.id)}
                        disabled={busy}
                      >
                        {busy ? "..." : "Paid"}
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDelete(order.id)}
                      title="Delete"
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

