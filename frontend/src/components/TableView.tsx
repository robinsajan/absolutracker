"use client";

import { useState } from "react";
import { Order, OrderUpdate, advanceStage, revertStage, completeOrder, deleteOrder, updateOrder } from "@/lib/api";

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

  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<OrderUpdate>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  function startEdit(order: Order) {
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name,
      phone: order.phone,
      item_desc: order.item_desc,
      qty: order.qty,
      price: order.price,
      deadline: order.deadline,
      stage: order.stage,
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOrder) return;
    setEditSubmitting(true);
    try {
      await updateOrder(editingOrder.id, editForm);
      setEditingOrder(null);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setEditSubmitting(false);
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
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => startEdit(order)}
                      title="Edit"
                      disabled={busy}
                      style={{ color: "var(--primary)" }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDelete(order.id)}
                      title="Delete"
                      disabled={busy}
                      style={{ color: "var(--rose)" }}
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingOrder(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              border: "1px solid var(--outline-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "17px", fontWeight: 700 }}>Edit Order #{editingOrder.id}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingOrder(null)}
                style={{ fontSize: "16px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  required
                  value={editForm.customer_name ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Item Description *</label>
                <input
                  required
                  value={editForm.item_desc ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, item_desc: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editForm.qty ?? 1}
                    onChange={(e) =>
                      setEditForm({ ...editForm, qty: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Total Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={editForm.price ?? 0}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={editForm.deadline ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Stage</label>
                  <select
                    value={editForm.stage ?? 1}
                    onChange={(e) =>
                      setEditForm({ ...editForm, stage: parseInt(e.target.value) || 1 })
                    }
                  >
                    <option value={1}>1. Ordered</option>
                    <option value={2}>2. Designed</option>
                    <option value={3}>3. Printed</option>
                    <option value={4}>4. Packed</option>
                    <option value={5}>5. Delivered</option>
                    <option value={6}>6. Payment</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingOrder(null)}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

