"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { adminApiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatCurrency, getBankName } from "@/lib/utils";

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    load();
  }, [params.id]);

  const load = async () => {
    try {
      const res = await adminApiClient.getBusiness(params.id);
      setData(res.data);
    } catch {
      setError("Failed to load business");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      await adminApiClient.toggleBusiness(params.id);
      load();
    } catch {
      setError("Failed to toggle business");
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
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">{error || "Business not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-primary-600 font-medium">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => router.push("/admin/businesses")} className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <ArrowLeft size={16} /> Back to Businesses
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
            <Building2 size={28} className="text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900">{data.name}</h1>
              <Badge variant={data.is_active ? "success" : "danger"}>{data.is_active ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="text-surface-500">{data.email}</p>
          </div>
        </div>
        <button onClick={handleToggle}
          className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 ${
            data.is_active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-primary-50 text-primary-700 hover:bg-primary-100"
          }`}>
          {data.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
          {data.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Subscription</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-surface-50">
                <p className="text-xs text-surface-400">Status</p>
                <p className={`text-sm font-medium mt-1 ${
                  data.subscription_status === "active" ? "text-primary-600" :
                  data.subscription_status === "trial" ? "text-amber-600" : "text-red-600"
                }`}>{data.subscription_status}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50">
                <p className="text-xs text-surface-400">Plan</p>
                <p className="text-sm font-medium text-surface-900 mt-1 capitalize">{data.subscription_plan || "None"}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50">
                <p className="text-xs text-surface-400">Trial Ends</p>
                <p className="text-sm font-medium text-surface-900 mt-1">{data.trial_end_date ? formatDate(data.trial_end_date) : "—"}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Bank Accounts</h3>
            {data.bank_accounts?.length === 0 ? (
              <p className="text-sm text-surface-400">No bank accounts</p>
            ) : (
              <div className="space-y-3">
                {data.bank_accounts?.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-100">
                    <div>
                      <p className="text-sm font-medium text-surface-900">{getBankName(acc.bank_name)}</p>
                      <p className="text-xs text-surface-400">{acc.account_holder_name} · {acc.account_number}</p>
                    </div>
                    <Badge variant={acc.is_active ? "success" : "warning"}>{acc.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Recent Verifications</h3>
            {data.recent_verifications?.length === 0 ? (
              <p className="text-sm text-surface-400">No verifications</p>
            ) : (
              <div className="space-y-2">
                {data.recent_verifications?.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${v.status === "verified" ? "bg-primary-500" : v.status === "scam" ? "bg-red-500" : "bg-amber-500"}`} />
                      <div>
                        <p className="text-sm font-medium text-surface-900">{v.payer_name || "Unknown"}</p>
                        <p className="text-xs text-surface-400">{v.bank_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-surface-900">{v.amount ? formatCurrency(v.amount) : "—"}</p>
                      <p className={`text-xs ${v.status === "verified" ? "text-primary-600" : "text-red-600"}`}>{v.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Owner</h3>
            {data.owner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">{data.owner.full_name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-900">{data.owner.full_name}</p>
                    <p className="text-xs text-surface-400">{data.owner.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <Badge variant={data.owner.is_active ? "success" : "danger"}>{data.owner.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-400">No owner assigned</p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Staff ({data.staff?.length || 0})</h3>
            {data.staff?.length === 0 ? (
              <p className="text-sm text-surface-400">No staff</p>
            ) : (
              <div className="space-y-2">
                {data.staff?.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-surface-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-700">{s.full_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">{s.full_name}</p>
                        <p className="text-xs text-surface-400">{s.email || "—"}</p>
                      </div>
                    </div>
                    <Badge variant={s.is_active ? "success" : "danger"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Payment History</h3>
            {data.payments?.length === 0 ? (
              <p className="text-sm text-surface-400">No payments</p>
            ) : (
              <div className="space-y-2">
                {data.payments?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-surface-100">
                    <div>
                      <p className="text-sm font-medium text-surface-900 capitalize">{p.plan_type} — ETB {p.amount?.toLocaleString()}</p>
                      <p className="text-xs text-surface-400">{p.payment_method} · {formatDate(p.created_at)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === "verified" ? "bg-primary-50 text-primary-700" :
                      p.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
