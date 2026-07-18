"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Scan,
  ArrowUp,
  ArrowDown,
  Building2,
  Users,
} from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { DashboardData } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, getBankName } from "@/lib/utils";

export default function OwnerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await analyticsApi.dashboard();
      setData(res.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">Could not load dashboard data</p>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Verifications",
      value: data.total_verifications,
      icon: Scan,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Verified Today",
      value: data.verified_today,
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Scam Detected",
      value: data.scam_today,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Scans Today",
      value: data.total_scans_today,
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 mt-1">Your business at a glance</p>
        </div>
        {data.scam_rate > 0 && (
          <Badge variant={data.scam_rate > 20 ? "danger" : "warning"}>
            {data.scam_rate}% scam rate
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-surface-500">{stat.label}</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Verifications</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {data.recent_verifications.length === 0 && (
              <p className="text-sm text-surface-400 text-center py-8">
                No verifications yet
              </p>
            )}
            {data.recent_verifications.map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      v.status === "verified"
                        ? "bg-emerald-500"
                        : v.status === "scam"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-surface-900">
                      {v.payer_name || "Unknown"}
                    </p>
                    <p className="text-xs text-surface-400">
                      {v.bank_name ? getBankName(v.bank_name) : ""} &middot;{" "}
                      {v.amount != null ? formatCurrency(v.amount) : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      v.status === "verified"
                        ? "success"
                        : v.status === "scam"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {v.status}
                  </Badge>
                  <p className="text-xs text-surface-400 mt-1">
                    {formatDate(v.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {Object.keys(data.bank_breakdown).length === 0 && (
              <p className="text-sm text-surface-400 text-center py-8">
                No data yet
              </p>
            )}
            {Object.entries(data.bank_breakdown).map(([bank, count]) => {
              const total = Object.values(data.bank_breakdown).reduce(
                (a, b) => a + b,
                0
              );
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={bank}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-700 font-medium">
                      {getBankName(bank)}
                    </span>
                    <span className="text-surface-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {data.daily_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity (30 days)</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-2">
              {data.daily_stats.map((day: any) => {
                const maxTotal = Math.max(
                  ...data.daily_stats.map((d: any) => d.total),
                  1
                );
                const height = Math.max(
                  (day.total / maxTotal) * 120,
                  4
                );
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1"
                    style={{ width: 32 }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-2.5 rounded-full bg-emerald-500"
                        style={{ height: height * 0.6 }}
                      />
                      {day.scam > 0 && (
                        <div
                          className="w-2.5 rounded-full bg-red-500"
                          style={{
                            height: Math.max(
                              (day.scam / maxTotal) * 120,
                              2
                            ),
                          }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-surface-400">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
