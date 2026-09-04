"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import {
  createOrder,
  getFormulaConfig,
  saveFormulaConfig,
  FormulaConfig,
  getProducts,
  createProduct,
  deleteProduct,
  Product,
} from "@/lib/api";
import Navbar from "@/components/Navbar";

function parsePrintTime(timeVal: number) {
  if (isNaN(timeVal) || timeVal <= 0) {
    return { hrs: 0, minutes: 0, totalHours: 0, display: "0h 00m" };
  }
  const hrs = Math.floor(timeVal);
  const dec = Math.round((timeVal - hrs) * 100) / 100;
  const rawMin = Math.round(dec * 100);
  const minutes = Math.min(rawMin, 60);
  const totalHours = hrs + minutes / 60;
  const displayHours = hrs + Math.floor(minutes / 60);
  const displayMins = minutes % 60;
  return {
    hrs: displayHours,
    minutes: displayMins,
    totalHours: Math.max(0.05, totalHours),
    display: `${displayHours}h ${displayMins < 10 ? "0" : ""}${displayMins}m`,
  };
}

export default function CalculatorPage() {
  const router = useRouter();

  // Settings Modal visibility toggle
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Global formula variables
  const [filamentCostPerGram, setFilamentCostPerGram] = useState<number>(1.2);
  const [machineHourlyRate, setMachineHourlyRate] = useState<number>(25);
  const [electricityHourlyRate, setElectricityHourlyRate] = useState<number>(8);
  const [failureMarginPct, setFailureMarginPct] = useState<number>(10);
  const [markupMultiplier, setMarkupMultiplier] = useState<number>(2.5);

  // Multi-Color formula variables
  const [purgeWasteGramsPerColor, setPurgeWasteGramsPerColor] = useState<number>(15);
  const [colorSwapTimePct, setColorSwapTimePct] = useState<number>(10);
  const [colorSwapFee, setColorSwapFee] = useState<number>(30);

  // Current Model Input
  const [modelName, setModelName] = useState<string>("");
  const [weightGrams, setWeightGrams] = useState<number>(75);
  const [timeInput, setTimeInput] = useState<number>(3.3);
  const [numColors, setNumColors] = useState<number>(1);
  const [purgeGrams, setPurgeGrams] = useState<number>(0);
  const [hardwareAddonCost, setHardwareAddonCost] = useState<number>(0);

  // Quick Order creation form state
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [orderQty, setOrderQty] = useState<number>(1);
  const [orderCreatedMsg, setOrderCreatedMsg] = useState<string>("");
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);

  // Formula settings auto-save state
  const [configSavedMsg, setConfigSavedMsg] = useState<string>("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Product Catalog State
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState<string>("");
  const [newProductPrice, setNewProductPrice] = useState<number>(0);
  const [catalogMsg, setCatalogMsg] = useState<string>("");

  const applyFormulaConfig = useCallback((cfg: FormulaConfig) => {
    if (cfg.filament_cost_per_g !== undefined) setFilamentCostPerGram(cfg.filament_cost_per_g);
    if (cfg.machine_hourly_rate !== undefined) setMachineHourlyRate(cfg.machine_hourly_rate);
    if (cfg.electricity_hourly_rate !== undefined) setElectricityHourlyRate(cfg.electricity_hourly_rate);
    if (cfg.failure_margin_pct !== undefined) setFailureMarginPct(cfg.failure_margin_pct);
    if (cfg.markup_multiplier !== undefined) setMarkupMultiplier(cfg.markup_multiplier);
    if (cfg.purge_waste_grams_per_color !== undefined) setPurgeWasteGramsPerColor(cfg.purge_waste_grams_per_color);
    if (cfg.color_swap_fee !== undefined) setColorSwapFee(cfg.color_swap_fee);
    if (cfg.color_swap_time_pct !== undefined) setColorSwapTimePct(cfg.color_swap_time_pct);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const prods = await getProducts();
      setProductsList(prods);
    } catch {
      console.log("Could not load products");
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    getFormulaConfig()
      .then((cfg) => {
        applyFormulaConfig(cfg);
      })
      .catch((err) => {
        console.log("Could not fetch config from DB", err);
      });

    fetchProducts();
  }, [router, applyFormulaConfig, fetchProducts]);

  const autoSaveConfig = useCallback((cfg: FormulaConfig) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setConfigSavedMsg("Saving...");
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await saveFormulaConfig(cfg);
        setConfigSavedMsg("Saved");
        setTimeout(() => setConfigSavedMsg(""), 2000);
      } catch {
        setConfigSavedMsg("Error saving");
        setTimeout(() => setConfigSavedMsg(""), 2500);
      }
    }, 600);
  }, []);

  async function handleSaveCurrentToCatalog() {
    const name = modelName.trim() || `Print (${weightGrams}g, ${parsedTime.display})`;
    try {
      const created = await createProduct({ name, price: suggestedSalePrice });
      setProductsList((prev) => [...prev, created]);
      setCatalogMsg(`Added "${name}" to catalog`);
      setTimeout(() => setCatalogMsg(""), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add to catalog");
    }
  }

  async function handleAddNewProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductName.trim()) return;
    try {
      const created = await createProduct({
        name: newProductName.trim(),
        price: newProductPrice,
      });
      setProductsList((prev) => [...prev, created]);
      setNewProductName("");
      setNewProductPrice(0);
      setCatalogMsg("Product added");
      setTimeout(() => setCatalogMsg(""), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add product");
    }
  }

  async function handleDeleteProduct(id: number) {
    try {
      await deleteProduct(id);
      setProductsList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    }
  }

  function handleColorChange(colors: number) {
    setNumColors(colors);
    const extra = Math.max(0, colors - 1);
    setPurgeGrams(extra * purgeWasteGramsPerColor);
  }

  // Calculations
  const parsedTime = parsePrintTime(timeInput);
  const extraColors = Math.max(0, numColors - 1);

  const effectivePurgeGrams = extraColors > 0 ? purgeGrams : 0;
  const totalFilamentWeight = weightGrams + effectivePurgeGrams;
  const rawMaterialCost = totalFilamentWeight * filamentCostPerGram;

  const extraSwapHours = parsedTime.totalHours * (colorSwapTimePct / 100) * extraColors;
  const effectivePrintHours = parsedTime.totalHours + extraSwapHours;
  const machinePowerRate = machineHourlyRate + electricityHourlyRate;
  const machineCost = effectivePrintHours * machinePowerRate;

  const multiColorSurcharge = extraColors * colorSwapFee;

  const subtotalCost = rawMaterialCost + machineCost + hardwareAddonCost + multiColorSurcharge;
  const failureBuffer = (subtotalCost * failureMarginPct) / 100;
  const totalUnitCost = subtotalCost + failureBuffer;

  const suggestedSalePrice = Math.round(totalUnitCost * markupMultiplier);
  const estimatedProfit = suggestedSalePrice - totalUnitCost;
  const profitMarginPct = suggestedSalePrice > 0 ? Math.round((estimatedProfit / suggestedSalePrice) * 100) : 0;

  function adjustTime(delta: number) {
    setTimeInput((prev) => {
      const next = Math.max(0.1, Math.round((prev + delta) * 100) / 100);
      const hrs = Math.floor(next);
      const dec = Math.round((next - hrs) * 100) / 100;
      if (dec > 0.6) {
        return hrs + 1.0;
      }
      return next;
    });
  }

  async function handleCreateOrderFromPrice(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }

    setCreatingOrder(true);
    setOrderCreatedMsg("");
    try {
      const colorLabel = numColors > 1 ? `${numColors} Colors, ` : "";
      const filamentSummary = effectivePurgeGrams > 0
        ? `${weightGrams}g+${effectivePurgeGrams}g purge`
        : `${weightGrams}g`;

      const description = modelName
        ? `${modelName} (${colorLabel}${filamentSummary}, ${parsedTime.display})`
        : `Custom 3D Print (${colorLabel}${filamentSummary}, ${parsedTime.display})`;

      await createOrder({
        customer_name: customerName,
        phone: customerPhone,
        item_desc: description,
        qty: orderQty,
        price: suggestedSalePrice * orderQty,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

      setOrderCreatedMsg("Order created");
      setTimeout(() => {
        router.push("/orders");
      }, 800);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Calculator</h1>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowSettingsModal(true)}
          >
            Settings
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          {/* Left Column: Specifications */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="card">
              <div className="form-group">
                <label>Model Name</label>
                <input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Phone Stand"
                />
              </div>

              {/* Colors */}
              <div className="form-group">
                <label>Colors</label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {[1, 2, 3, 4].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      className={`btn btn-sm ${numColors === c ? "btn-primary" : "btn-outline"}`}
                      style={{ flex: 1 }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight & Time */}
              <div style={{ display: "grid", gridTemplateColumns: numColors > 1 ? "1fr 1fr 1fr" : "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Weight (g)</label>
                  <input
                    type="number"
                    min={1}
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {numColors > 1 && (
                  <div className="form-group">
                    <label>Purge (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={purgeGrams}
                      onChange={(e) => setPurgeGrams(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Print Time ({parsedTime.display})</label>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => adjustTime(-0.1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min={0.1}
                      value={timeInput}
                      onChange={(e) => setTimeInput(parseFloat(e.target.value) || 0)}
                      style={{ textAlign: "center" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => adjustTime(0.1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Hardware */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Hardware Cost (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={hardwareAddonCost}
                  onChange={(e) => setHardwareAddonCost(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Computed Output */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="card">
              {/* Price Banner */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                  border: "1px solid var(--border)",
                  marginBottom: "14px",
                }}
              >
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
                  Suggested Sale Price
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "var(--accent)",
                    margin: "4px 0",
                  }}
                >
                  ₹{suggestedSalePrice.toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "var(--success)" }}>
                  Profit: ₹{Math.round(estimatedProfit).toLocaleString()} ({profitMarginPct}%)
                </div>
              </div>

              {/* Cost Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                  <span>Filament ({totalFilamentWeight}g):</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>₹{rawMaterialCost.toFixed(0)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                  <span>Machine &amp; Power ({parsedTime.display}):</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>₹{machineCost.toFixed(0)}</span>
                </div>

                {extraColors > 0 && multiColorSurcharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent)" }}>
                    <span>Color Swap Fee ({extraColors} colors):</span>
                    <span style={{ fontWeight: 600 }}>₹{multiColorSurcharge.toFixed(0)}</span>
                  </div>
                )}

                {hardwareAddonCost > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>Hardware:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>₹{hardwareAddonCost.toFixed(0)}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                  <span>Failure Margin ({failureMarginPct}%):</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>₹{failureBuffer.toFixed(0)}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "8px",
                    borderTop: "1px solid var(--border)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  <span>Total Unit Cost:</span>
                  <span>₹{totalUnitCost.toFixed(0)}</span>
                </div>
              </div>

              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={handleSaveCurrentToCatalog}
                  className="btn btn-outline btn-sm"
                  style={{ width: "100%" }}
                >
                  Save to Catalog
                </button>
                {catalogMsg && (
                  <div style={{ color: "var(--success)", fontSize: "11px", marginTop: "4px", textAlign: "center" }}>
                    {catalogMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Create Order Card */}
            <div className="card">
              <form onSubmit={handleCreateOrderFromPrice}>
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone"
                    />
                  </div>
                  <div className="form-group">
                    <label>Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={orderQty}
                      onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {orderCreatedMsg && (
                  <div style={{ color: "var(--success)", fontSize: "12px", marginBottom: "8px", fontWeight: 600 }}>
                    {orderCreatedMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingOrder}
                  style={{ width: "100%", padding: "10px" }}
                >
                  {creatingOrder ? "Creating..." : `Create Order (₹${(suggestedSalePrice * orderQty).toLocaleString()})`}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2>Settings</h2>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="btn btn-outline btn-sm"
              >
                Close
              </button>
            </div>

            {/* Catalog list */}
            <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                PRODUCT CATALOG ({productsList.length})
              </label>

              <div style={{ maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                {productsList.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No products in catalog</div>
                ) : (
                  productsList.map((prod) => (
                    <div
                      key={prod.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 8px",
                        background: "var(--bg-card)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                      }}
                    >
                      <span>{prod.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 600 }}>₹{prod.price.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: "1px 5px", fontSize: "11px" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNewProduct} style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                <div style={{ flex: 2 }}>
                  <input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Product name"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min={0}
                    value={newProductPrice || ""}
                    onChange={(e) => setNewProductPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Price"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Add
                </button>
              </form>
            </div>

            {/* Formula Rates */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
                FORMULA RATES
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Filament (₹/g)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={filamentCostPerGram}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setFilamentCostPerGram(v);
                      autoSaveConfig({ filament_cost_per_g: v, machine_hourly_rate: machineHourlyRate, electricity_hourly_rate: electricityHourlyRate, failure_margin_pct: failureMarginPct, markup_multiplier: markupMultiplier, purge_waste_grams_per_color: purgeWasteGramsPerColor, color_swap_fee: colorSwapFee, color_swap_time_pct: colorSwapTimePct });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Machine (₹/hr)</label>
                  <input
                    type="number"
                    value={machineHourlyRate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setMachineHourlyRate(v);
                      autoSaveConfig({ filament_cost_per_g: filamentCostPerGram, machine_hourly_rate: v, electricity_hourly_rate: electricityHourlyRate, failure_margin_pct: failureMarginPct, markup_multiplier: markupMultiplier, purge_waste_grams_per_color: purgeWasteGramsPerColor, color_swap_fee: colorSwapFee, color_swap_time_pct: colorSwapTimePct });
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Power (₹/hr)</label>
                  <input
                    type="number"
                    value={electricityHourlyRate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setElectricityHourlyRate(v);
                      autoSaveConfig({ filament_cost_per_g: filamentCostPerGram, machine_hourly_rate: machineHourlyRate, electricity_hourly_rate: v, failure_margin_pct: failureMarginPct, markup_multiplier: markupMultiplier, purge_waste_grams_per_color: purgeWasteGramsPerColor, color_swap_fee: colorSwapFee, color_swap_time_pct: colorSwapTimePct });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Failure Margin (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={failureMarginPct}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setFailureMarginPct(v);
                      autoSaveConfig({ filament_cost_per_g: filamentCostPerGram, machine_hourly_rate: machineHourlyRate, electricity_hourly_rate: electricityHourlyRate, failure_margin_pct: v, markup_multiplier: markupMultiplier, purge_waste_grams_per_color: purgeWasteGramsPerColor, color_swap_fee: colorSwapFee, color_swap_time_pct: colorSwapTimePct });
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Markup Multiplier</label>
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  value={markupMultiplier}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 1;
                    setMarkupMultiplier(v);
                    autoSaveConfig({ filament_cost_per_g: filamentCostPerGram, machine_hourly_rate: machineHourlyRate, electricity_hourly_rate: electricityHourlyRate, failure_margin_pct: failureMarginPct, markup_multiplier: v, purge_waste_grams_per_color: purgeWasteGramsPerColor, color_swap_fee: colorSwapFee, color_swap_time_pct: colorSwapTimePct });
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Purge Waste/Color (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={purgeWasteGramsPerColor}
                    onChange={(e) => {
                      const g = parseFloat(e.target.value) || 0;
                      setPurgeWasteGramsPerColor(g);
                      if (extraColors > 0) setPurgeGrams(extraColors * g);
                      autoSaveConfig({ filament_cost_per_g: filamentCostPerGram, machine_hourly_rate: machineHourlyRate, electricity_hourly_rate: electricityHourlyRate, failure_margin_pct: failureMarginPct, markup_multiplier: markupMultiplier, purge_waste_grams_per_color: g, color_swap_fee: colorSwapFee, color_swap_time_pct: colorSwapTimePct });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Swap Fee/Color (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={colorSwapFee}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setColorSwapFee(v);
                      autoSaveConfig({ filament_cost_per_g: filamentCostPerGram, machine_hourly_rate: machineHourlyRate, electricity_hourly_rate: electricityHourlyRate, failure_margin_pct: failureMarginPct, markup_multiplier: markupMultiplier, purge_waste_grams_per_color: purgeWasteGramsPerColor, color_swap_fee: v, color_swap_time_pct: colorSwapTimePct });
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                {configSavedMsg}
              </span>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="btn btn-primary btn-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

