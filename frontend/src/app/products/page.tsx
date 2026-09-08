"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getProducts, createProduct, updateProduct, deleteProduct, Product, ProductUpdate } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Edit State ──
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductUpdate>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Filters & Sort ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "price_desc" | "price_asc">("name_asc");

  const fetchProductsList = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      console.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchProductsList();
  }, [router, fetchProductsList]);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const newProd = await createProduct({
        name: name.trim(),
        price: typeof price === "number" ? price : 0,
      });
      setProducts((prev) => [...prev, newProd]);
      setName("");
      setPrice("");
      setShowAddForm(false);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(prod: Product) {
    setEditingProduct(prod);
    setEditForm({
      name: prod.name,
      price: prod.price,
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setEditSubmitting(true);
    try {
      const updated = await updateProduct(editingProduct.id, editForm);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProduct(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: number, prodName: string) {
    if (!confirm(`Delete "${prodName}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (minPrice !== "" && p.price < minPrice) return false;
        if (maxPrice !== "" && p.price > maxPrice) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        return 0;
      });
  }, [products, search, minPrice, maxPrice, sortBy]);

  function resetFilters() {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("name_asc");
  }

  const hasActiveFilters = search || minPrice !== "" || maxPrice !== "" || sortBy !== "name_asc";

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Catalog & Standard Products</h1>
              <p className="page-subtitle">Manage base 3D printed inventory, default rates, and descriptions</p>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? "Cancel" : "+ Add Product"}
              </button>
            </div>
          </div>

          {/* New Product Form */}
          {showAddForm && (
            <div className="card" style={{ marginBottom: "20px", animation: "slideUp 300ms ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700 }}>Add Catalog Product</h2>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddProduct}>
                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="prod_name">Product Name</label>
                    <input
                      id="prod_name"
                      placeholder="e.g. Phone Stand / Desk Holder"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="prod_price">Default Price (₹)</label>
                    <input
                      id="prod_price"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 350"
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>
                </div>
                {error && (
                  <div style={{ color: "var(--rose)", fontSize: "13px", marginTop: "10px" }}>
                    {error}
                  </div>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Product"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              PRODUCTS FILTER (COLLAPSIBLE DROPDOWN PANEL)
          ───────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFilterPanel ? "10px" : "0" }}>
              <button
                type="button"
                className={`btn ${showFilterPanel || hasActiveFilters ? "btn-primary" : "btn-outline"} btn-sm`}
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>⚙ Filter Products</span>
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
                    Showing {filteredProducts.length} of {products.length} products
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
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Search Products</label>
                    <input
                      placeholder="Filter by name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Min Price (₹)</label>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={minPrice}
                      onChange={(e) =>
                        setMinPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Max Price (₹)</label>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={maxPrice}
                      onChange={(e) =>
                        setMaxPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                      <option value="name_asc">Name: A → Z</option>
                      <option value="name_desc">Name: Z → A</option>
                      <option value="price_desc">Price: High → Low</option>
                      <option value="price_asc">Price: Low → High</option>
                    </select>
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

                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--outline-light)",
                    fontSize: "12px",
                    color: "var(--on-surface-muted)",
                  }}
                >
                  Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div className="empty-state-text">Loading catalog...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">❐</div>
              <div className="empty-state-text">
                {hasActiveFilters ? "No products match the selected filters" : "No products added yet"}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th style={{ textAlign: "right" }}>Base Price</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: "var(--on-surface-muted)" }}>#{p.id}</td>
                      <td style={{ fontWeight: 600, color: "var(--on-surface)" }}>{p.name}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: "13.5px",
                          color: "var(--primary-light)",
                        }}
                      >
                        ₹{p.price.toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => startEdit(p)}
                          style={{ color: "var(--primary)", marginRight: "6px" }}
                          title="Edit product"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(p.id, p.name)}
                          style={{ color: "var(--rose)" }}
                          title="Delete product"
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

      {/* Edit Product Modal */}
      {editingProduct && (
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
            if (e.target === e.currentTarget) setEditingProduct(null);
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
              <h2 style={{ fontSize: "17px", fontWeight: 700 }}>Edit Product #{editingProduct.id}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingProduct(null)}
                style={{ fontSize: "16px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  required
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Base Price (₹) *</label>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingProduct(null)}
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
    </>
  );
}
