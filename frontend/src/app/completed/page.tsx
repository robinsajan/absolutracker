"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getCompleted, CompletedOrder } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function CompletedPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchCompleted = useCallback(async () => {
    try {
      const data = await getCompleted();
      setOrders(data);
    } catch {
      console.error("Failed to fetch completed orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchCompleted();
  }, [router, fetchCompleted]);

  const filtered = filter
    ? orders.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(filter.toLowerCase()) ||
          o.item_desc.toLowerCase().includes(filter.toLowerCase())
      )
    : orders;

  const totalRevenue = filtered.reduce((sum, o) => sum + o.price, 0);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Completed</h1>
          <input
            placeholder="Search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: "220px" }}
          />
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Orders</div>
            <div className="metric-value neutral">{filtered.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value positive">₹{totalRevenue.toLocaleString()}</div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{filter ? "No matching orders" : "No completed orders yet"}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} style={{ animation: "fadeIn 300ms ease" }}>
                    <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>#{order.id}</td>
                    <td style={{ fontWeight: 500 }}>{order.customer_name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{order.item_desc}</td>
                    <td>{order.qty}</td>
                    <td style={{ fontWeight: 600, color: "var(--success)" }}>
                      ₹{order.price.toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-success">{order.payment_status}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      {order.completed_at
                        ? new Date(order.completed_at).toLocaleDateString()
                        : "—"}
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
