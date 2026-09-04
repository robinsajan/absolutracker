"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getProducts, createProduct, deleteProduct, Product } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  async function handleDelete(id: number, prodName: string) {
    if (!confirm(`Delete "${prodName}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Products</h1>
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "Add Product"}
          </button>
        </div>

        {showAddForm && (
          <div className="card" style={{ marginBottom: "16px" }}>
            <form onSubmit={handleAddProduct}>
              <div className="form-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="prod_name">Name</label>
                  <input
                    id="prod_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="prod_price">Price (₹)</label>
                  <input
                    id="prod_price"
                    type="number"
                    min={0}
                    step={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
              {error && (
                <div style={{ color: "var(--danger)", fontSize: "13px", marginTop: "10px" }}>
                  {error}
                </div>
              )}
              <div style={{ marginTop: "12px" }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "280px", marginBottom: "16px" }}
        />

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? "No matching products" : "No products yet"}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontWeight: 600 }}>{prod.name}</td>
                    <td>₹{prod.price.toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDelete(prod.id, prod.name)}
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
