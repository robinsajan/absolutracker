"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import {
  getFilaments,
  createFilament,
  deductFilament,
  deleteFilament,
  FilamentSpool,
  FilamentCreate,
} from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function FilamentsPage() {
  const router = useRouter();
  const [spools, setSpools] = useState<FilamentSpool[]>([]);
  const [loading, setLoading] = useState(true);

  // New Spool Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState<FilamentCreate>({
    name: "",
    material: "PLA",
    color_name: "",
    color_hex: "#7c3aed",
    remaining_grams: 1000,
    total_grams: 1000,
    cost_per_kg: 0,
  });

  // Deduct Modal State
  const [deductSpool, setDeductSpool] = useState<FilamentSpool | null>(null);
  const [deductGrams, setDeductGrams] = useState<number>(50);
  const [deductReason, setDeductReason] = useState<string>("Failed print waste");

  const fetchSpools = useCallback(async () => {
    try {
      const data = await getFilaments();
      setSpools(data);
    } catch {
      console.log("Error loading filaments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchSpools();
  }, [router, fetchSpools]);

  async function handleAddSpool(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    try {
      await createFilament(newForm);
      setShowAddModal(false);
      setNewForm({
        name: "",
        material: "PLA",
        color_name: "",
        color_hex: "#7c3aed",
        remaining_grams: 1000,
        total_grams: 1000,
        cost_per_kg: 0,
      });
      fetchSpools();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create spool");
    }
  }

  async function handleDeduct(e: React.FormEvent) {
    e.preventDefault();
    if (!deductSpool || deductGrams <= 0) return;
    try {
      await deductFilament(deductSpool.id, deductGrams, deductReason);
      setDeductSpool(null);
      setDeductGrams(50);
      setDeductReason("Failed print waste");
      fetchSpools();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deduct filament");
    }
  }

  async function handleDeleteSpool(id: number) {
    if (!confirm("Permanently delete this filament spool?")) return;
    try {
      await deleteFilament(id);
      fetchSpools();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete spool");
    }
  }

  // Summary Metrics
  const totalSpools = spools.length;
  const totalStockKg = (spools.reduce((acc, s) => acc + s.remaining_grams, 0) / 1000).toFixed(2);
  const totalStockValue = Math.round(
    spools.reduce((acc, s) => acc + (s.remaining_grams / 1000) * s.cost_per_kg, 0)
  );
  const lowStockCount = spools.filter((s) => s.remaining_grams < 150).length;

  return (
    <>
      <Navbar />

      <div className="page-container">
        {/* Page Title & Add Button */}
        <div className="page-header">
          <h1>Filaments</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Add Spool
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Spools</div>
            <div className="metric-value">{totalSpools}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Available Stock</div>
            <div className="metric-value positive">
              {totalStockKg} kg
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Inventory Value</div>
            <div className="metric-value neutral">
              ₹{totalStockValue.toLocaleString()}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Low Stock</div>
            <div
              className={`metric-value ${lowStockCount > 0 ? "negative" : "neutral"}`}
            >
              {lowStockCount}
            </div>
          </div>
        </div>

        {/* Inventory Cards Grid */}
        {loading ? (
          <div className="empty-state">Loading inventory...</div>
        ) : spools.length === 0 ? (
          <div className="empty-state">
            <p>No filament spools found</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            {spools.map((spool) => {
              const pct = Math.round((spool.remaining_grams / spool.total_grams) * 100);
              const isLow = spool.remaining_grams < 150;
              const spoolValue = Math.round((spool.remaining_grams / 1000) * spool.cost_per_kg);

              let barColor = "var(--success)";
              if (pct < 20) barColor = "var(--danger)";
              else if (pct < 40) barColor = "var(--warning)";

              return (
                <div
                  key={spool.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderLeft: `4px solid ${spool.color_hex || "var(--accent)"}`,
                  }}
                >
                  <div>
                    {/* Header: Color dot + Name */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            background: spool.color_hex,
                            border: "1px solid rgba(255,255,255,0.2)",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {spool.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {spool.color_name} • ₹{spool.cost_per_kg}/kg
                          </div>
                        </div>
                      </div>

                      <span className="badge" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {spool.material}
                      </span>
                    </div>

                    {/* Weight & Progress */}
                    <div style={{ margin: "12px 0 8px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "12px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: isLow ? "var(--danger)" : "var(--text-secondary)", fontWeight: 500 }}>
                          {spool.remaining_grams.toFixed(0)}g / {spool.total_grams}g
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
                      </div>

                      {/* Progress Bar Container */}
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          background: "var(--bg-secondary)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            height: "100%",
                            background: barColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stock Value & Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      <span>Value: ₹{spoolValue}</span>
                      {isLow && <span style={{ color: "var(--danger)", fontWeight: 600 }}>Low Stock</span>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "6px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                    <button
                      onClick={() => setDeductSpool(spool)}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                    >
                      Log Usage
                    </button>
                    <button
                      onClick={() => handleDeleteSpool(spool.id)}
                      className="btn btn-outline btn-sm"
                      title="Delete spool"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add New Spool */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2>Add Filament Spool</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddSpool} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="form-group">
                  <label>Spool Name / Brand</label>
                  <input
                    required
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    placeholder="e.g. Matte Black PLA"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label>Material</label>
                    <select
                      value={newForm.material}
                      onChange={(e) => setNewForm({ ...newForm, material: e.target.value })}
                    >
                      <option value="PLA">PLA</option>
                      <option value="PLA+">PLA+</option>
                      <option value="PETG">PETG</option>
                      <option value="ABS">ABS</option>
                      <option value="ASA">ASA</option>
                      <option value="TPU">TPU</option>
                      <option value="PC">Polycarbonate</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Color Name</label>
                    <input
                      value={newForm.color_name}
                      onChange={(e) => setNewForm({ ...newForm, color_name: e.target.value })}
                      placeholder="e.g. Black"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label>Color Code</label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="color"
                        value={newForm.color_hex}
                        onChange={(e) => setNewForm({ ...newForm, color_hex: e.target.value })}
                        style={{ width: "36px", height: "34px", padding: "2px", cursor: "pointer" }}
                      />
                      <input
                        value={newForm.color_hex}
                        onChange={(e) => setNewForm({ ...newForm, color_hex: e.target.value })}
                        placeholder="#18181b"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Cost per Kg (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={newForm.cost_per_kg}
                      onChange={(e) => setNewForm({ ...newForm, cost_per_kg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label>Capacity (g)</label>
                    <input
                      type="number"
                      min={100}
                      value={newForm.total_grams}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1000;
                        setNewForm({ ...newForm, total_grams: val, remaining_grams: val });
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Weight (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={newForm.remaining_grams}
                      onChange={(e) => setNewForm({ ...newForm, remaining_grams: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Spool
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Usage / Deduct Waste */}
        {deductSpool && (
          <div className="modal-overlay" onClick={() => setDeductSpool(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2>Log Filament Usage</h2>
                <button
                  type="button"
                  onClick={() => setDeductSpool(null)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
              </div>

              <div style={{ background: "var(--bg-card)", padding: "10px", borderRadius: "var(--radius-sm)", marginBottom: "12px", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>{deductSpool.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Current Stock: {deductSpool.remaining_grams.toFixed(0)}g
                </div>
              </div>

              <form onSubmit={handleDeduct} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="form-group">
                  <label>Grams to Deduct</label>
                  <input
                    type="number"
                    min={1}
                    max={deductSpool.remaining_grams}
                    required
                    value={deductGrams}
                    onChange={(e) => setDeductGrams(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Reason</label>
                  <select value={deductReason} onChange={(e) => setDeductReason(e.target.value)}>
                    <option value="Failed print waste">Failed print waste</option>
                    <option value="Purge / color swap waste">Purge / color swap waste</option>
                    <option value="Test / prototype print">Test / prototype print</option>
                    <option value="Manual calibration / tuning">Manual calibration / tuning</option>
                    <option value="Spool damage / dry purge">Spool damage / dry purge</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setDeductSpool(null)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger">
                    Deduct {deductGrams}g
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

