"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import {
  getTodos,
  addTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  TodoItem,
  TodoCreate,
  TodoUpdate,
  getWaiting,
  promoteWaiting,
  updateWaiting,
  deleteWaiting,
  WaitingItem,
  WaitingUpdate,
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
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [todoSearch, setTodoSearch] = useState<string>("");
  const [todoSortBy, setTodoSortBy] = useState<"priority_desc" | "created_desc" | "created_asc" | "title_asc">("priority_desc");
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  const [form, setForm] = useState<TodoCreate>({
    title: "",
    category: "General",
    priority: "medium",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Todo State
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editTodoForm, setEditTodoForm] = useState<TodoUpdate>({});
  const [editTodoSubmitting, setEditTodoSubmitting] = useState(false);

  // Edit Waiting Order State
  const [editingWaiting, setEditingWaiting] = useState<WaitingItem | null>(null);
  const [editWaitingForm, setEditWaitingForm] = useState<WaitingUpdate>({});
  const [editWaitingSubmitting, setEditWaitingSubmitting] = useState(false);

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

  function startEditTodo(todo: TodoItem) {
    setEditingTodo(todo);
    setEditTodoForm({
      title: todo.title,
      category: todo.category,
      priority: todo.priority,
      notes: todo.notes,
    });
  }

  async function handleEditTodoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTodo) return;
    setEditTodoSubmitting(true);
    try {
      const updated = await updateTodo(editingTodo.id, editTodoForm);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTodo(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setEditTodoSubmitting(false);
    }
  }

  function startEditWaiting(item: WaitingItem) {
    setEditingWaiting(item);
    setEditWaitingForm({
      customer_name: item.customer_name,
      phone: item.phone,
      item_desc: item.item_desc,
      notes: item.notes,
    });
  }

  async function handleEditWaitingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWaiting) return;
    setEditWaitingSubmitting(true);
    try {
      const updated = await updateWaiting(editingWaiting.id, editWaitingForm);
      setWaitingOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setEditingWaiting(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update waiting order");
    } finally {
      setEditWaitingSubmitting(false);
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

  const PRIORITY_ORDER: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const PRIORITY_THEMES: Record<string, { bg: string; border: string; badgeBg: string; badgeColor: string; label: string; dot: string }> = {
    high: {
      bg: "rgba(244, 63, 94, 0.05)",
      border: "rgba(244, 63, 94, 0.35)",
      badgeBg: "rgba(244, 63, 94, 0.15)",
      badgeColor: "#f43f5e",
      label: "High Priority",
      dot: "#f43f5e",
    },
    medium: {
      bg: "rgba(245, 158, 11, 0.04)",
      border: "rgba(245, 158, 11, 0.3)",
      badgeBg: "rgba(245, 158, 11, 0.15)",
      badgeColor: "#f59e0b",
      label: "Medium",
      dot: "#f59e0b",
    },
    low: {
      bg: "rgba(16, 185, 129, 0.03)",
      border: "rgba(16, 185, 129, 0.25)",
      badgeBg: "rgba(16, 185, 129, 0.12)",
      badgeColor: "#10b981",
      label: "Low",
      dot: "#10b981",
    },
  };

  const filteredTodos = useMemo(() => {
    return todos
      .filter((t) => {
        if (filterStatus === "active" && t.is_done === 1) return false;
        if (filterStatus === "completed" && t.is_done === 0) return false;
        if (filterCategory !== "all" && t.category !== filterCategory) return false;
        if (filterPriority !== "all" && (t.priority?.toLowerCase() || "medium") !== filterPriority) return false;
        if (todoSearch.trim()) {
          const q = todoSearch.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
          const matchCategory = t.category.toLowerCase().includes(q);
          if (!matchTitle && !matchNotes && !matchCategory) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Incompleted tasks always stay above completed ones if mixed
        if (a.is_done !== b.is_done) {
          return a.is_done - b.is_done;
        }

        if (todoSortBy === "priority_desc") {
          const prioA = PRIORITY_ORDER[a.priority?.toLowerCase() || "medium"] || 1;
          const prioB = PRIORITY_ORDER[b.priority?.toLowerCase() || "medium"] || 1;
          if (prioA !== prioB) return prioB - prioA; // High priority top
          return (b.id || 0) - (a.id || 0); // Newest within priority
        }
        if (todoSortBy === "created_desc") {
          return (b.id || 0) - (a.id || 0);
        }
        if (todoSortBy === "created_asc") {
          return (a.id || 0) - (b.id || 0);
        }
        if (todoSortBy === "title_asc") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [todos, filterStatus, filterCategory, filterPriority, todoSearch, todoSortBy]);

  const activeCount = todos.filter((t) => t.is_done === 0).length;
  const completedCount = todos.filter((t) => t.is_done === 1).length;
  const hasActiveTodoFilters =
    todoSearch || filterStatus !== "all" || filterCategory !== "all" || filterPriority !== "all" || todoSortBy !== "priority_desc";

  function resetTodoFilters() {
    setTodoSearch("");
    setFilterStatus("all");
    setFilterCategory("all");
    setFilterPriority("all");
    setTodoSortBy("priority_desc");
  }

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">To-Do & Tasks</h1>
            <p className="page-subtitle">Track project actions, maintenance checklists, and queued requests</p>
          </div>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${activeTab === "todos" ? "active" : ""}`}
              onClick={() => setActiveTab("todos")}
            >
              Tasks ({activeCount})
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
            {/* Quick Add Form */}
            <div className="card" style={{ marginBottom: "16px" }}>
              <form onSubmit={handleAddTodo}>
                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Task Description *</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Clean nozzle, restock Matte Black PLA, ship order #14"
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
                      <option value="high">🔴 High Priority (Pinned to top)</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Adding..." : "+ Add Task"}
                  </button>
                </div>
              </form>
            </div>

            {/* Filter & Sort Dropdown Panel */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFilterPanel ? "10px" : "0" }}>
                <button
                  type="button"
                  className={`btn ${showFilterPanel || hasActiveTodoFilters ? "btn-primary" : "btn-outline"} btn-sm`}
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>⚙ Filter & Sort Tasks</span>
                  <span style={{ fontSize: "10px", transition: "transform 200ms ease", transform: showFilterPanel ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▼
                  </span>
                  {hasActiveTodoFilters && (
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

                {/* Quick Status pills when dropdown is closed */}
                {!showFilterPanel && (
                  <div className="toggle-group" style={{ height: "32px" }}>
                    <button
                      className={`toggle-btn ${filterStatus === "all" ? "active" : ""}`}
                      onClick={() => setFilterStatus("all")}
                      style={{ padding: "0 10px", fontSize: "12px" }}
                    >
                      All
                    </button>
                    <button
                      className={`toggle-btn ${filterStatus === "active" ? "active" : ""}`}
                      onClick={() => setFilterStatus("active")}
                      style={{ padding: "0 10px", fontSize: "12px" }}
                    >
                      Active ({activeCount})
                    </button>
                    <button
                      className={`toggle-btn ${filterStatus === "completed" ? "active" : ""}`}
                      onClick={() => setFilterStatus("completed")}
                      style={{ padding: "0 10px", fontSize: "12px" }}
                    >
                      Done ({completedCount})
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Dropdown Form */}
              {showFilterPanel && (
                <div
                  className="card"
                  style={{
                    padding: "16px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline-light)",
                    borderRadius: "var(--radius-md)",
                    animation: "fadeIn 200ms ease",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                      alignItems: "flex-end",
                    }}
                  >
                    {/* Search */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Search Tasks</label>
                      <input
                        placeholder="Search title, notes, category..."
                        value={todoSearch}
                        onChange={(e) => setTodoSearch(e.target.value)}
                      />
                    </div>

                    {/* Status */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                        <option value="all">All Tasks</option>
                        <option value="active">Active Only ({activeCount})</option>
                        <option value="completed">Completed Only ({completedCount})</option>
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Priority</label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">🔴 High Priority Only</option>
                        <option value="medium">🟡 Medium Only</option>
                        <option value="low">🟢 Low Only</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sorting Options */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Sort By</label>
                      <select
                        value={todoSortBy}
                        onChange={(e) => setTodoSortBy(e.target.value as any)}
                      >
                        <option value="priority_desc">⚡ Priority: High → Low</option>
                        <option value="created_desc">Date: Newest First</option>
                        <option value="created_asc">Date: Oldest First</option>
                        <option value="title_asc">Title: A → Z</option>
                      </select>
                    </div>

                    {/* Reset Button */}
                    {hasActiveTodoFilters && (
                      <div style={{ display: "flex", alignItems: "flex-end", height: "100%" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={resetTodoFilters}
                          style={{ width: "100%", height: "38px" }}
                        >
                          ✕ Reset Filters
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
                    }}
                  >
                    <span>
                      Showing <strong>{filteredTodos.length}</strong> of <strong>{todos.length}</strong> tasks
                    </span>
                    <span>
                      Sorted by:{" "}
                      <strong>
                        {todoSortBy === "priority_desc"
                          ? "Priority (High First)"
                          : todoSortBy === "created_desc"
                          ? "Newest First"
                          : todoSortBy === "created_asc"
                          ? "Oldest First"
                          : "Title (A-Z)"}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="empty-state"><p>Loading tasks...</p></div>
            ) : filteredTodos.length === 0 ? (
              <div className="empty-state">
                <p>{hasActiveTodoFilters ? "No tasks match your filters" : "No tasks in your checklist"}</p>
                {hasActiveTodoFilters && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={resetTodoFilters}
                    style={{ marginTop: "12px" }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {filteredTodos.map((todo) => {
                  const isDone = todo.is_done === 1;
                  const prioKey = (todo.priority?.toLowerCase() || "medium");
                  const theme = PRIORITY_THEMES[prioKey] || PRIORITY_THEMES.medium;

                  return (
                    <div
                      key={todo.id}
                      className="card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        background: isDone ? "var(--surface)" : theme.bg,
                        border: `1px solid ${isDone ? "var(--outline-light)" : theme.border}`,
                        borderLeft: `4px solid ${theme.dot}`,
                        borderRadius: "var(--radius-md)",
                        opacity: isDone ? 0.6 : 1,
                        transition: "all 200ms ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => handleToggle(todo.id)}
                        style={{
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                          accentColor: theme.dot,
                        }}
                        title={isDone ? "Mark as active" : "Mark as completed"}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              textDecoration: isDone ? "line-through" : "none",
                              color: isDone ? "var(--on-surface-muted)" : "var(--on-surface)",
                              wordBreak: "break-word",
                            }}
                          >
                            {todo.title}
                          </span>

                          {/* Priority Badge */}
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                              background: theme.badgeBg,
                              color: theme.badgeColor,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: theme.dot }} />
                            {theme.label}
                          </span>

                          {/* Category Badge */}
                          <span
                            className="badge badge-cyan"
                            style={{ fontSize: "11px" }}
                          >
                            {todo.category}
                          </span>
                        </div>

                        {todo.notes && (
                          <div style={{ fontSize: "12px", color: "var(--on-surface-2)", marginTop: "2px" }}>
                            {todo.notes}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => startEditTodo(todo)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--primary)" }}
                          title="Edit task"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--rose)" }}
                          title="Delete task"
                        >
                          Delete
                        </button>
                      </div>
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
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => startEditWaiting(item)}
                      style={{ color: "var(--primary)" }}
                      title="Edit queued order"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDeleteOrder(item.id)}
                      style={{ color: "var(--rose)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Todo Modal */}
      {editingTodo && (
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
            if (e.target === e.currentTarget) setEditingTodo(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              border: "1px solid var(--outline-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "17px", fontWeight: 700 }}>Edit Task</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingTodo(null)}
                style={{ fontSize: "16px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditTodoSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  required
                  value={editTodoForm.title ?? ""}
                  onChange={(e) => setEditTodoForm({ ...editTodoForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={editTodoForm.category ?? "General"}
                    onChange={(e) => setEditTodoForm({ ...editTodoForm, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editTodoForm.priority ?? "medium"}
                    onChange={(e) => setEditTodoForm({ ...editTodoForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={2}
                  value={editTodoForm.notes ?? ""}
                  onChange={(e) => setEditTodoForm({ ...editTodoForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingTodo(null)}
                  disabled={editTodoSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editTodoSubmitting}>
                  {editTodoSubmitting ? "Saving..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Queued Order Modal */}
      {editingWaiting && (
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
            if (e.target === e.currentTarget) setEditingWaiting(null);
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
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "17px", fontWeight: 700 }}>Edit Queued Order</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingWaiting(null)}
                style={{ fontSize: "16px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditWaitingSubmit}>
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  required
                  value={editWaitingForm.customer_name ?? ""}
                  onChange={(e) => setEditWaitingForm({ ...editWaitingForm, customer_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  value={editWaitingForm.phone ?? ""}
                  onChange={(e) => setEditWaitingForm({ ...editWaitingForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Item Description *</label>
                <input
                  required
                  value={editWaitingForm.item_desc ?? ""}
                  onChange={(e) => setEditWaitingForm({ ...editWaitingForm, item_desc: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={2}
                  value={editWaitingForm.notes ?? ""}
                  onChange={(e) => setEditWaitingForm({ ...editWaitingForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingWaiting(null)}
                  disabled={editWaitingSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editWaitingSubmitting}>
                  {editWaitingSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

