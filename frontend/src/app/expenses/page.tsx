"use client";

import { useEffect, useState, useCallback } from "react";
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
      setForm({ amount: 0, category: CATEGORIES[0], date: new Date().toISOString().split("T")[0], notes: "" });
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

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Expenses</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add"}
          </button>
        </div>

        {/* Total card */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Total</div>
            <div className="metric-value negative">₹{total.toLocaleString()}</div>
          </div>
        </div>

        {/* Inline form */}
        {showForm && (
          <div className="card" style={{ marginBottom: "20px", animation: "slideUp 300ms ease" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div className="form-group">
                  <label htmlFor="exp-amount">Amount (₹)</label>
                  <input
                    id="exp-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
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
                      <option key={c} value={c}>{c}</option>
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
                  <label htmlFor="exp-notes">Notes</label>
                  <input
                    id="exp-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td>
                      <span className="badge badge-info">{exp.category}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{exp.amount.toLocaleString()}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{exp.notes || "—"}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDelete(exp.id)}
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
    </>
  );
}
