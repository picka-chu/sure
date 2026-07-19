"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Scan, ShieldCheck, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { adminApiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await adminApiClient.dashboard();
      setData(res.data);
    } catch {
      console.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-surface-500">Failed to load dashboard</div>;
  }

  const stats = [
    { label: "Total Businesses", value: data.total_businesses, icon: Building2, color: "bg-blue-50 text-blue-600" },
    { label: "Active Businesses", value: data.active_businesses, icon: ShieldCheck, color: "bg-primary-50 text-primary-600" },
    { label: "Total Owners", value: data.total_owners, icon: Users, color: "bg-purple-50 text-purple-600" },
    { label: "Total Staff", value: data.total_staff, icon: Users, color: "bg-amber-50 text-amber-600" },
    { label: "Verifications", value: data.total_verifications, icon: Scan, color: "bg-cyan-50 text-cyan-600" },
    { label: "Verified", value: data.total_verified, icon: ShieldCheck, color: "bg-green-50 text-green-600" },
    { label: "Scam Detected", value: data.total_scam, icon: AlertTriangle, color: "bg-red-50 text-red-600" },
    { label: "Revenue", value: `ETB ${(data.total_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: "bg-primary-50 text-primary-600" },
    { label: "Pending Payments", value: data.pending_payments, icon: CreditCard, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Admin Dashboard</h1>
        <p className="text-surface-500 mt-1">Platform overview at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label} padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-surface-400">{s.label}</p>
                <p className="text-xl font-bold text-surface-900 mt-1">{s.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon size={16} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Recent Businesses</h3>
          {data.recent_businesses?.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No businesses yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_businesses?.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{b.name}</p>
                    <p className="text-xs text-surface-400">{b.email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    b.subscription_status === "active" ? "bg-primary-50 text-primary-700" :
                    b.subscription_status === "trial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                  }`}>{b.subscription_status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Recent Verifications</h3>
          {data.recent_verifications?.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No verifications yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_verifications?.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${v.status === "verified" ? "bg-primary-500" : v.status === "scam" ? "bg-red-500" : "bg-amber-500"}`} />
                    <div>
                      <p className="text-sm font-medium text-surface-900">{v.payer_name || "Unknown"}</p>
                      <p className="text-xs text-surface-400">{v.bank_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-surface-900">{v.amount ? `ETB ${v.amount.toLocaleString()}` : "—"}</p>
                    <p className={`text-xs ${v.status === "verified" ? "text-primary-600" : v.status === "scam" ? "text-red-600" : "text-amber-600"}`}>{v.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
