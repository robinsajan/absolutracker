"use client";

import { useState, useEffect, useCallback } from "react";
import { Order, createOrder, OrderCreate, getProducts, createProduct, Product, getFilaments, FilamentSpool, deductFilament } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

export default function OrderModal({ open, onClose, onCreated }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filaments, setFilaments] = useState<FilamentSpool[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedSpoolId, setSelectedSpoolId] = useState<string>("");
  const [filamentGrams, setFilamentGrams] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priceOverridden, setPriceOverridden] = useState<boolean>(false);

  const [form, setForm] = useState<OrderCreate>({
    customer_name: "",
    phone: "",
    item_desc: "",
    qty: 1,
    price: 0,
    deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [prods, sList] = await Promise.all([getProducts(), getFilaments()]);
      setProducts(prods);
      setFilaments(sList);
    } catch {
      console.log("Could not load catalog or filaments");
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  if (!open) return null;

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectProduct(e: React.ChangeEvent<HTMLSelectElement>) {
    const pId = e.target.value;
    setSelectedProductId(pId);
    if (!pId) {
      setPriceOverridden(false);
      return;
    }

    const prod = products.find((p) => p.id === parseInt(pId));
    if (prod) {
      setUnitPrice(prod.price);
      setForm((prev) => ({
        ...prev,
        item_desc: prod.name,
        price: prod.price * (prev.qty || 1),
      }));
      setPriceOverridden(false);
    }
  }

  function handleQtyChange(newQty: number) {
    const qty = Math.max(1, newQty);
    update("qty", qty);
    if (!priceOverridden && unitPrice > 0) {
      update("price", unitPrice * qty);
    }
  }

  function handlePriceChange(newPrice: number) {
    update("price", newPrice);
    setPriceOverridden(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const order = await createOrder(form);

      if (selectedSpoolId && filamentGrams > 0) {
        deductFilament(parseInt(selectedSpoolId), filamentGrams, `Order #${order.id} (${form.customer_name})`)
          .catch((err) => console.log("Filament deduct error", err));
      }

      onCreated(order);

      if (saveToCatalog && form.item_desc.trim()) {
        const itemUnitPrice = (form.qty ?? 1) > 1 ? (form.price ?? 0) / (form.qty ?? 1) : (form.price ?? 0);
        createProduct({
          name: form.item_desc.trim(),
          price: Math.round((itemUnitPrice ?? 0) * 100) / 100,
        }).catch((err) => console.log("Catalog save error", err));
      }

      setForm({ customer_name: "", phone: "", item_desc: "", qty: 1, price: 0, deadline: "" });
      setSelectedProductId("");
      setSelectedSpoolId("");
      setFilamentGrams(0);
      setUnitPrice(0);
      setPriceOverridden(false);
      setSaveToCatalog(false);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2>New Order</h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Pre-select Product */}
          <div className="form-group">
            <label htmlFor="product_catalog_select">Select Product (Optional)</label>
            <select
              id="product_catalog_select"
              value={selectedProductId}
              onChange={handleSelectProduct}
            >
              <option value="">Custom item (Manual entry)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="customer_name">Customer Name *</label>
            <input
              id="customer_name"
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              placeholder="Customer name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone / WhatsApp</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="Phone number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="item_desc">Item Description *</label>
            <input
              id="item_desc"
              value={form.item_desc}
              onChange={(e) => update("item_desc", e.target.value)}
              placeholder="Item name or description"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div className="form-group">
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                value={form.qty}
                onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label htmlFor="price" style={{ margin: 0 }}>Total Price (₹)</label>
                {priceOverridden && (
                  <span style={{ fontSize: "10px", color: "var(--warning)", fontWeight: 600 }}>
                    Custom
                  </span>
                )}
              </div>
              <input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Optional Filament Stock Deduction */}
          <div className="form-group" style={{ background: "var(--bg-card)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <label style={{ fontSize: "11px", marginBottom: "6px" }}>Deduct Filament (Optional)</label>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
              <select
                value={selectedSpoolId}
                onChange={(e) => setSelectedSpoolId(e.target.value)}
              >
                <option value="">No spool selected</option>
                {filaments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.color_name}) - {s.remaining_grams.toFixed(0)}g
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                placeholder="Grams"
                value={filamentGrams || ""}
                onChange={(e) => setFilamentGrams(parseFloat(e.target.value) || 0)}
                disabled={!selectedSpoolId}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="deadline">Deadline</label>
            <input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
            />
          </div>

          {!selectedProductId && form.item_desc.trim() && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <input
                type="checkbox"
                id="save_to_catalog"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                style={{ width: "auto" }}
              />
              <label htmlFor="save_to_catalog" style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                Save product to catalog
              </label>
            </div>
          )}

          {error && (
            <div
              style={{
                background: "var(--danger-bg)",
                color: "var(--danger)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                marginBottom: "12px",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : `Create Order (₹${(form.price ?? 0).toLocaleString()})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

