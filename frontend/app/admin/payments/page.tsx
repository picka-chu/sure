"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { adminApiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => { load(); }, [statusFilter, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.payments({ status: statusFilter || undefined, limit, offset: page * limit });
      setPayments(res.data.payments);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, status: "verified" | "rejected") => {
    setActionId(id);
    try {
      await adminApiClient.verifyPayment(id, { status });
      load();
    } catch {
      setError(`Failed to ${status} payment`);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Payments</h1>
        <p className="text-surface-500 mt-1">{total} payments</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-2">
        {["", "pending", "verified", "rejected"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === s ? "bg-primary-600 text-white" : "bg-white border border-surface-200 text-surface-600 hover:bg-surface-50"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : payments.length === 0 ? (
        <Card className="text-center py-16">
          <CreditCard size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No payments found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-4 border border-surface-100">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    p.status === "verified" ? "bg-primary-50" :
                    p.status === "rejected" ? "bg-red-50" : "bg-amber-50"
                  }`}>
                    <CreditCard size={18} className={
                      p.status === "verified" ? "text-primary-600" :
                      p.status === "rejected" ? "text-red-600" : "text-amber-600"
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900">{p.business_name || "Unknown Business"}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.status === "verified" ? "bg-primary-50 text-primary-700" :
                        p.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      }`}>{p.status}</span>
                    </div>
                    <p className="text-sm text-surface-400">
                      {p.plan_type} · {p.payment_method} · ETB {p.amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {p.sender_name && `${p.sender_name} · `}{formatDate(p.created_at)}
                    </p>
                  </div>
                </div>

                {p.status === "pending" && (
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button onClick={() => handleVerify(p.id, "verified")} disabled={actionId === p.id}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1">
                      <CheckCircle2 size={14} /> Verify
                    </button>
                    <button onClick={() => handleVerify(p.id, "rejected")} disabled={actionId === p.id}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-4 py-2 text-sm font-medium text-surface-600 bg-white rounded-xl border border-surface-200 disabled:opacity-50 hover:bg-surface-50">
            Previous
          </button>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}
            className="px-4 py-2 text-sm font-medium text-surface-600 bg-white rounded-xl border border-surface-200 disabled:opacity-50 hover:bg-surface-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
