"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "remaining_desc" | "remaining_asc" | "cost_desc">("name");

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

  // Filtered Spools
  const filteredSpools = useMemo(() => {
    return spools
      .filter((s) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchColor = s.color_name?.toLowerCase().includes(q);
          const matchMaterial = s.material?.toLowerCase().includes(q);
          if (!matchName && !matchColor && !matchMaterial) return false;
        }

        if (selectedMaterial !== "all" && s.material !== selectedMaterial) {
          return false;
        }

        if (lowStockOnly && s.remaining_grams >= 150) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "remaining_desc") return b.remaining_grams - a.remaining_grams;
        if (sortBy === "remaining_asc") return a.remaining_grams - b.remaining_grams;
        if (sortBy === "cost_desc") return b.cost_per_kg - a.cost_per_kg;
        return 0;
      });
  }, [spools, search, selectedMaterial, lowStockOnly, sortBy]);

  const uniqueMaterials = useMemo(() => {
    return Array.from(new Set(spools.map((s) => s.material))).filter(Boolean);
  }, [spools]);

  function resetFilters() {
    setSearch("");
    setSelectedMaterial("all");
    setLowStockOnly(false);
    setSortBy("name");
  }

  const hasActiveFilters = search || selectedMaterial !== "all" || lowStockOnly || sortBy !== "name";

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
      <main className="main-content">
        <div className="page-container">
          {/* Page Title & Add Button */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Filament Inventory & Spool Stock</h1>
              <p className="page-subtitle">Track materials, color palettes, spool usage, and waste logs</p>
            </div>
            <div className="header-actions">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                + Add Spool
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Spools</div>
              <div className="metric-value">{totalSpools}</div>
              <div className="metric-sub">{uniqueMaterials.length} materials in stock</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Available Stock</div>
              <div className="metric-value positive">{totalStockKg} kg</div>
              <div className="metric-sub">Total material ready for farm</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Inventory Value</div>
              <div className="metric-value neutral">₹{totalStockValue.toLocaleString("en-IN")}</div>
              <div className="metric-sub">Based on purchase cost</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Low Stock Alerts</div>
              <div className={`metric-value ${lowStockCount > 0 ? "negative" : "neutral"}`}>
                {lowStockCount}
              </div>
              <div className="metric-sub">Spools under 150g remaining</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                alignItems: "flex-end",
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Search Filaments</label>
                <input
                  placeholder="Name, color, or material..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Filter by Material</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                >
                  <option value="all">All Materials</option>
                  {uniqueMaterials.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                  <option value="name">Name (A → Z)</option>
                  <option value="remaining_desc">Stock: High → Low</option>
                  <option value="remaining_asc">Stock: Low → High</option>
                  <option value="cost_desc">Cost/Kg: High → Low</option>
                </select>
              </div>

              {/* Low stock toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "38px",
                  padding: "0 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--outline)",
                  background: lowStockOnly ? "var(--rose-dim)" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setLowStockOnly(!lowStockOnly)}
              >
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  style={{ width: "auto", margin: 0, cursor: "pointer" }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: lowStockOnly ? "var(--rose)" : "var(--on-surface)",
                  }}
                >
                  Low Stock Only (&lt;150g)
                </span>
              </div>

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

            {hasActiveFilters && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--outline-light)",
                  fontSize: "12px",
                  color: "var(--on-surface-muted)",
                }}
              >
                Showing <strong>{filteredSpools.length}</strong> of <strong>{spools.length}</strong> spools
              </div>
            )}
          </div>

          {/* Inventory Cards Grid */}
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div className="empty-state-text">Loading filament inventory...</div>
            </div>
          ) : filteredSpools.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">≡</div>
              <div className="empty-state-text">
                {hasActiveFilters ? "No filaments match the selected filters" : "No filament spools found"}
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredSpools.map((spool) => {
                const pct = Math.round((spool.remaining_grams / spool.total_grams) * 100);
                const isLow = spool.remaining_grams < 150;
                const spoolValue = Math.round((spool.remaining_grams / 1000) * spool.cost_per_kg);

                let barColor = "var(--emerald)";
                if (pct < 20) barColor = "var(--rose)";
                else if (pct < 40) barColor = "var(--amber)";

                return (
                  <div
                    key={spool.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      borderLeft: `4px solid ${spool.color_hex || "var(--primary)"}`,
                    }}
                  >
                    <div>
                      {/* Header: Color dot + Name */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
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
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: "14px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {spool.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--on-surface-muted)" }}>
                              {spool.color_name || "Custom"} • ₹{spool.cost_per_kg}/kg
                            </div>
                          </div>
                        </div>

                        <span className="badge badge-violet">{spool.material}</span>
                      </div>

                      {/* Weight & Progress */}
                      <div style={{ margin: "14px 0 10px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "12px",
                            marginBottom: "5px",
                          }}
                        >
                          <span
                            style={{
                              color: isLow ? "var(--rose)" : "var(--on-surface-2)",
                              fontWeight: 600,
                            }}
                          >
                            {spool.remaining_grams.toFixed(0)}g / {spool.total_grams}g
                          </span>
                          <span style={{ color: "var(--on-surface-muted)" }}>{pct}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div
                          style={{
                            width: "100%",
                            height: "6px",
                            background: "var(--surface-high)",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, pct))}%`,
                              height: "100%",
                              background: barColor,
                              transition: "width 300ms ease",
                            }}
                          />
                        </div>
                      </div>

                      {/* Stock Value & Status */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "var(--on-surface-muted)",
                          marginBottom: "12px",
                        }}
                      >
                        <span>Stock Value: ₹{spoolValue.toLocaleString("en-IN")}</span>
                        {isLow && (
                          <span style={{ color: "var(--rose)", fontWeight: 700 }}>
                            ⚠ Low Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        borderTop: "1px solid var(--outline-light)",
                        paddingTop: "10px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setDeductSpool(spool)}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1 }}
                      >
                        Log Usage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSpool(spool.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--rose)" }}
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
                <div className="modal-header">
                  <h2 className="modal-title">Add Filament Spool</h2>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="modal-close"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleAddSpool} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="form-group">
                    <label>Spool Name / Brand</label>
                    <input
                      required
                      value={newForm.name}
                      onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                      placeholder="e.g. eSUN PLA+ Silk Gold"
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
                        placeholder="e.g. Silk Gold"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div className="form-group">
                      <label>Color Swatch</label>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="color"
                          value={newForm.color_hex}
                          onChange={(e) => setNewForm({ ...newForm, color_hex: e.target.value })}
                          style={{ width: "38px", height: "36px", padding: "2px", cursor: "pointer" }}
                        />
                        <input
                          value={newForm.color_hex}
                          onChange={(e) => setNewForm({ ...newForm, color_hex: e.target.value })}
                          placeholder="#7c3aed"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Cost per Kg (₹)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 1350"
                        value={newForm.cost_per_kg || ""}
                        onChange={(e) =>
                          setNewForm({ ...newForm, cost_per_kg: parseFloat(e.target.value) || 0 })
                        }
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
                      <label>Initial Weight (g)</label>
                      <input
                        type="number"
                        min={0}
                        value={newForm.remaining_grams}
                        onChange={(e) =>
                          setNewForm({ ...newForm, remaining_grams: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="btn btn-outline"
                    >
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
                <div className="modal-header">
                  <h2 className="modal-title">Log Filament Usage</h2>
                  <button
                    type="button"
                    onClick={() => setDeductSpool(null)}
                    className="modal-close"
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "14px",
                    border: "1px solid var(--outline-light)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13.5px" }}>{deductSpool.name}</div>
                  <div style={{ fontSize: "11.5px", color: "var(--on-surface-muted)", marginTop: "2px" }}>
                    Current Stock: {deductSpool.remaining_grams.toFixed(0)}g available
                  </div>
                </div>

                <form onSubmit={handleDeduct} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                    <select
                      value={deductReason}
                      onChange={(e) => setDeductReason(e.target.value)}
                    >
                      <option value="Failed print waste">Failed print waste</option>
                      <option value="Purge / color swap waste">Purge / color swap waste</option>
                      <option value="Test / prototype print">Test / prototype print</option>
                      <option value="Manual calibration / tuning">Manual calibration / tuning</option>
                      <option value="Spool damage / dry purge">Spool damage / dry purge</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setDeductSpool(null)}
                      className="btn btn-outline"
                    >
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
      </main>
    </>
  );
}
