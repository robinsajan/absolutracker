"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getDashboardStats, DashboardStats } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      console.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    fetchStats();
  }, [router, fetchStats]);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>

        {loading || !stats ? (
          <div className="empty-state"><p>Loading stats...</p></div>
        ) : (
          <>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Revenue</div>
                <div className="metric-value positive">
                  ₹{stats.total_revenue.toLocaleString()}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Expenses</div>
                <div className="metric-value negative">
                  ₹{stats.total_expenses.toLocaleString()}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Profit</div>
                <div className={`metric-value ${stats.net_profit >= 0 ? "positive" : "negative"}`}>
                  ₹{stats.net_profit.toLocaleString()}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Completed</div>
                <div className="metric-value neutral">
                  {stats.completed_count}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
