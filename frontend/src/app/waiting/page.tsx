"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import {
  getTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
  TodoItem,
  TodoCreate,
  getWaiting,
  promoteWaiting,
  deleteWaiting,
  WaitingItem,
} from "@/lib/api";
import Navbar from "@/components/Navbar";

const CATEGORIES = [
  "General",
  "Calculator",
  "Orders",
  "Materials",
  "Print Farm",
];

export default function TodoWaitingPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [waitingOrders, setWaitingOrders] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"todos" | "orders">("todos");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [form, setForm] = useState<TodoCreate>({
    title: "",
    category: "General",
    priority: "medium",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [todosData, waitingData] = await Promise.all([
        getTodos().catch(() => []),
        getWaiting().catch(() => []),
      ]);
      setTodos(todosData);
      setWaitingOrders(waitingData);
    } catch {
      console.error("Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [router, fetchData]);

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const item = await addTodo(form);
      setTodos((prev) => [item, ...prev]);
      setForm({ title: "", category: form.category, priority: "medium", notes: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await toggleTodo(id);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handlePromoteOrder(id: number) {
    if (!confirm("Move this to active orders?")) return;
    try {
      await promoteWaiting(id);
      setWaitingOrders((prev) => prev.filter((i) => i.id !== id));
      router.push("/orders");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move order");
    }
  }

  async function handleDeleteOrder(id: number) {
    if (!confirm("Delete this queued order?")) return;
    try {
      await deleteWaiting(id);
      setWaitingOrders((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const filteredTodos = todos.filter((t) => {
    if (filterStatus === "active" && t.is_done === 1) return false;
    if (filterStatus === "completed" && t.is_done === 0) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  const activeCount = todos.filter((t) => t.is_done === 0).length;
  const completedCount = todos.filter((t) => t.is_done === 1).length;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>To-Do</h1>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${activeTab === "todos" ? "active" : ""}`}
              onClick={() => setActiveTab("todos")}
            >
              Tasks
            </button>
            <button
              className={`toggle-btn ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              Queue ({waitingOrders.length})
            </button>
          </div>
        </div>

        {activeTab === "todos" ? (
          <>
            <div className="card" style={{ marginBottom: "14px" }}>
              <form onSubmit={handleAddTodo}>
                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Task</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Task description"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Adding..." : "Add Task"}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "14px" }}>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${filterStatus === "all" ? "active" : ""}`}
                  onClick={() => setFilterStatus("all")}
                >
                  All
                </button>
                <button
                  className={`toggle-btn ${filterStatus === "active" ? "active" : ""}`}
                  onClick={() => setFilterStatus("active")}
                >
                  Active ({activeCount})
                </button>
                <button
                  className={`toggle-btn ${filterStatus === "completed" ? "active" : ""}`}
                  onClick={() => setFilterStatus("completed")}
                >
                  Done ({completedCount})
                </button>
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="empty-state"><p>Loading...</p></div>
            ) : filteredTodos.length === 0 ? (
              <div className="empty-state">
                <p>No tasks</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {filteredTodos.map((todo) => {
                  const isDone = todo.is_done === 1;
                  return (
                    <div
                      key={todo.id}
                      className="card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        opacity: isDone ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => handleToggle(todo.id)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            textDecoration: isDone ? "line-through" : "none",
                            color: isDone ? "var(--text-muted)" : "var(--text-primary)",
                            wordBreak: "break-word",
                          }}
                        >
                          {todo.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {todo.category} • {todo.priority}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(todo.id)}
                        className="btn btn-outline btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : waitingOrders.length === 0 ? (
          <div className="empty-state">
            <p>No queued orders</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {waitingOrders.map((item) => (
              <div key={item.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <div style={{ fontWeight: 600, marginBottom: "2px" }}>{item.customer_name}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{item.item_desc}</div>
                    {item.phone && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {item.phone}
                      </div>
                    )}
                    {item.notes && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handlePromoteOrder(item.id)}>
                      Move to Orders
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDeleteOrder(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

