"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getExpenses, addExpense, deleteExpense, Expense, ExpenseCreate } from "@/lib/api";
import Navbar from "@/components/Navbar";

const CATEGORIES = [
  "Filament",
  "Web",
  "Electrical Supplies",
  "Accessories",
  "Packing",
  "Electricity",
  "1 time",
  "Misc",
  "Raw Materials",
  "Delivery / Shipping",
  "Maintenance",
  "Other",
];

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseCreate>({
    amount: 0,
    category: CATEGORIES[0],
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // ── Filters & Search ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minAmount, setMinAmount] = useState<number | "">("");
  const [maxAmount, setMaxAmount] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch {
      console.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchExpenses();
  }, [router, fetchExpenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const exp = await addExpense(form);
      setExpenses((prev) => [exp, ...prev]);
      setForm({
        amount: 0,
        category: CATEGORIES[0],
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  // Multi-criteria Filtering & Sorting
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Search notes or category
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;
          const matchesCategory = exp.category ? exp.category.toLowerCase().includes(q) : false;
          if (!matchesNotes && !matchesCategory) return false;
        }

        // Category filter
        if (selectedCategory !== "all" && exp.category !== selectedCategory) {
          return false;
        }

        // Amount range filter
        if (minAmount !== "" && exp.amount < minAmount) return false;
        if (maxAmount !== "" && exp.amount > maxAmount) return false;

        // Date range filter
        if (startDate && exp.date < startDate) return false;
        if (endDate && exp.date > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") return (b.date || "").localeCompare(a.date || "");
        if (sortBy === "date_asc") return (a.date || "").localeCompare(b.date || "");
        if (sortBy === "amount_desc") return b.amount - a.amount;
        if (sortBy === "amount_asc") return a.amount - b.amount;
        return 0;
      });
  }, [expenses, search, selectedCategory, minAmount, maxAmount, startDate, endDate, sortBy]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  function resetFilters() {
    setSearch("");
    setSelectedCategory("all");
    setMinAmount("");
    setMaxAmount("");
    setStartDate("");
    setEndDate("");
    setSortBy("date_desc");
  }

  const hasActiveFilters =
    search || selectedCategory !== "all" || minAmount !== "" || maxAmount !== "" || startDate || endDate || sortBy !== "date_desc";

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Expenses Ledger</h1>
              <p className="page-subtitle">Track operational, filament, machinery, and logistics costs</p>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Cancel" : "+ Record Expense"}
              </button>
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-card-header">
                <div
                  className="metric-icon"
                  style={{ background: "rgba(244, 63, 94, 0.15)", color: "var(--rose)" }}
                >
                  ₹
                </div>
                <span className="metric-trend down">{filteredExpenses.length} entries</span>
              </div>
              <div className="metric-value negative">₹{totalFiltered.toLocaleString("en-IN")}</div>
              <div className="metric-label">
                {hasActiveFilters ? "Filtered Total" : "Total Outflow"}
              </div>
              {hasActiveFilters && (
                <div className="metric-sub">
                  Full ledger total: ₹{totalAll.toLocaleString("en-IN")}
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <div
                  className="metric-icon"
                  style={{ background: "rgba(124, 58, 237, 0.15)", color: "var(--primary-light)" }}
                >
                  ≡
                </div>
                <span className="metric-trend neutral">Categories</span>
              </div>
              <div className="metric-value">
                {new Set(expenses.map((e) => e.category)).size}
              </div>
              <div className="metric-label">Active Categories</div>
              <div className="metric-sub">Across business operations</div>
            </div>
          </div>

          {/* Inline Add Expense Form */}
          {showForm && (
            <div className="card" style={{ marginBottom: "24px", animation: "slideUp 300ms ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700 }}>Record New Expense</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="exp-amount">Amount (₹)</label>
                    <input
                      id="exp-amount"
                      type="number"
                      min={0.01}
                      step="any"
                      value={form.amount || ""}
                      onChange={(e) =>
                        setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="e.g. 850"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exp-category">Category</label>
                    <select
                      id="exp-category"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exp-date">Date</label>
                    <input
                      id="exp-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exp-notes">Description / Vendor</label>
                    <input
                      id="exp-notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g. Amazon spool purchase"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Expense"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              COMPREHENSIVE FILTER TOOLBAR (COLLAPSIBLE DROPDOWN PANEL)
          ───────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFilterPanel ? "10px" : "0" }}>
              <button
                type="button"
                className={`btn ${showFilterPanel || hasActiveFilters ? "btn-primary" : "btn-outline"} btn-sm`}
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>⚙ Filter & Search</span>
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
                    Showing {filteredExpenses.length} of {expenses.length} (₹{totalFiltered.toLocaleString("en-IN")})
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
                    <label>Search Notes/Category</label>
                    <input
                      placeholder="Type to search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Category Filter</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Range Min */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Min Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={minAmount}
                      onChange={(e) =>
                        setMinAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Amount Range Max */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Max Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={maxAmount}
                      onChange={(e) =>
                        setMaxAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Start Date */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  {/* End Date */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  {/* Sort By */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="date_desc">Date: Newest First</option>
                      <option value="date_asc">Date: Oldest First</option>
                      <option value="amount_desc">Amount: High → Low</option>
                      <option value="amount_asc">Amount: Low → High</option>
                    </select>
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
                    alignItems: "center",
                  }}
                >
                  <span>
                    Showing <strong>{filteredExpenses.length}</strong> of{" "}
                    <strong>{expenses.length}</strong> expenses
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--rose)" }}>
                    Subtotal: ₹{totalFiltered.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div className="empty-state-text">Loading expense ledger...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-text">
                {hasActiveFilters ? "No expenses match the selected filters" : "No expenses recorded yet"}
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
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description / Notes</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td style={{ fontSize: "12.5px", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {exp.date}
                      </td>
                      <td>
                        <span className="badge badge-cyan">{exp.category}</span>
                      </td>
                      <td style={{ color: "var(--on-surface-2)", fontSize: "13px" }}>
                        {exp.notes || "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: "13.5px",
                          color: "var(--rose)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ₹{exp.amount.toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(exp.id)}
                          style={{ color: "var(--rose)" }}
                          title="Delete expense entry"
                        >
                          Delete
                        </button>
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
