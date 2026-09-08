"use client";

import { useState } from "react";
import { Order, OrderUpdate, advanceStage, revertStage, completeOrder, deleteOrder, updateOrder } from "@/lib/api";

const STAGES: Record<number, { label: string; color: string }> = {
  1: { label: "Ordered", color: "#38bdf8" },
  2: { label: "Designed", color: "#6366f1" },
  3: { label: "Printed", color: "#3b82f6" },
  4: { label: "Packed", color: "#f59e0b" },
  5: { label: "Delivered", color: "#8b5cf6" },
  6: { label: "Payment", color: "#10b981" },
};

const STAGE_NEXT: Record<number, string> = {
  1: "Designed",
  2: "Printed",
  3: "Packed",
  4: "Delivered",
  5: "Payment",
};

const STAGE_PREV: Record<number, string> = {
  2: "Ordered",
  3: "Designed",
  4: "Printed",
  5: "Packed",
  6: "Delivered",
};

interface Props {
  orders: Order[];
  onRefresh: () => void;
}

export default function KanbanView({ orders, onRefresh }: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);

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
      alert(err instanceof Error ? err.message : "Failed to advance stage");
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
      alert(err instanceof Error ? err.message : "Failed to revert stage");
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

  async function handleConfirmArchive(id: number) {
    setConfirmArchiveId(null);
    setLoadingId(id);
    try {
      await completeOrder(id);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive order");
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
      alert(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setLoadingId(null);
    }
  }

  function isOverdue(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  function formatDate(dt: string | null): string {
    if (!dt) return "";
    return new Date(dt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="kanban-board">
      {[1, 2, 3, 4, 5, 6].map((stage) => {
        const stageOrders = orders.filter((o) => o.stage === stage);
        const info = STAGES[stage];
        return (
          <div key={stage} className="kanban-column">
            {/* Column Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: info.color,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {info.label}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  background: "var(--bg-card)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                {stageOrders.length}
              </span>
            </div>

            {/* Cards */}
            {stageOrders.length === 0 ? (
              <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                No orders
              </div>
            ) : (
              stageOrders.map((order) => {
                const busy = loadingId === order.id;
                const awaitingConfirm = confirmArchiveId === order.id;

                return (
                  <div
                    key={order.id}
                    className="card"
                    style={{
                      borderLeft: `3px solid ${isOverdue(order.deadline) ? "var(--danger)" : info.color}`,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {/* ID + Badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>#{order.id}</span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {isOverdue(order.deadline) && <span className="badge badge-danger">Overdue</span>}
                        {stage === 6 && (
                          <span className="badge badge-success">Awaiting Payment</span>
                        )}
                      </div>
                    </div>

                    {/* Customer */}
                    <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "2px" }}>{order.customer_name}</div>
                    {order.phone && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{order.phone}</div>
                    )}

                    {/* Item */}
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      {order.item_desc}
                      {order.qty > 1 && <span style={{ color: "var(--text-muted)" }}> ×{order.qty}</span>}
                    </div>

                    {/* Price + Deadline */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                        ₹{order.price.toLocaleString()}
                      </span>
                      {order.deadline && (
                        <span style={{
                          color: isOverdue(order.deadline) ? "var(--danger)" : "var(--text-muted)",
                          fontSize: "11px",
                          fontWeight: isOverdue(order.deadline) ? 600 : 400,
                        }}>
                          {order.deadline}
                        </span>
                      )}
                    </div>

                    {/* Order Date */}
                    {order.created_at && (
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "10px" }}>
                        {formatDate(order.created_at)}
                      </div>
                    )}

                    {/* STAGE 6: Confirmation UI */}
                    {stage === 6 && awaitingConfirm && (
                      <div style={{
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid var(--success)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px",
                        marginBottom: "8px",
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--success)", marginBottom: "6px" }}>
                          Confirm payment received?
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn btn-success btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => handleConfirmArchive(order.id)}
                            disabled={busy}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => setConfirmArchiveId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ACTION BUTTONS */}
                    {!awaitingConfirm && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {stage < 6 && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ width: "100%" }}
                            onClick={() => handleAdvance(order.id)}
                            disabled={busy}
                          >
                            {busy ? "Moving..." : `Move to ${STAGE_NEXT[stage]}`}
                          </button>
                        )}

                        {stage === 6 && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ width: "100%" }}
                            onClick={() => setConfirmArchiveId(order.id)}
                            disabled={busy}
                          >
                            Paid &amp; Archive
                          </button>
                        )}

                        <div style={{ display: "flex", gap: "5px" }}>
                          {stage > 1 && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ flex: 1 }}
                              onClick={() => handleRevert(order.id)}
                              disabled={busy}
                              title={`Revert to ${STAGE_PREV[stage]}`}
                            >
                              Back
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => startEdit(order)}
                            title="Edit order"
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}

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

