"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getOrders, Order } from "@/lib/api";
import Navbar from "@/components/Navbar";
import KanbanView from "@/components/KanbanView";
import TableView from "@/components/TableView";
import OrderModal from "@/components/OrderModal";

type ViewMode = "kanban" | "table";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<ViewMode>("kanban");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchOrders();
  }, [router, fetchOrders]);

  function handleOrderCreated(order: Order) {
    setOrders((prev) => [order, ...prev]);
  }

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Orders</h1>
          <div className="header-actions">
            <div className="toggle-group">
              <button
                className={`toggle-btn ${view === "kanban" ? "active" : ""}`}
                onClick={() => setView("kanban")}
              >
                Board
              </button>
              <button
                className={`toggle-btn ${view === "table" ? "active" : ""}`}
                onClick={() => setView("table")}
              >
                Table
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              New Order
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading orders...</p>
          </div>
        ) : view === "kanban" ? (
          <KanbanView orders={orders} onRefresh={fetchOrders} />
        ) : (
          <TableView orders={orders} onRefresh={fetchOrders} />
        )}
      </div>

      <OrderModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleOrderCreated}
      />
    </>
  );
}
