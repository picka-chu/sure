"use client";

import { useState, useEffect } from "react";
import { Scan, AlertTriangle } from "lucide-react";
import { adminApiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { formatDate, getBankName } from "@/lib/utils";

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const limit = 20;

  useEffect(() => { load(); }, [statusFilter, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.verifications({ status: statusFilter || undefined, limit, offset: page * limit });
      setVerifications(res.data.verifications);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Verifications</h1>
        <p className="text-surface-500 mt-1">{total} verifications across all businesses</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["", "verified", "scam", "pending", "failed"].map((s) => (
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
      ) : verifications.length === 0 ? (
        <Card className="text-center py-16">
          <Scan size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No verifications found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <div key={v.id} className="bg-white rounded-xl p-4 border border-surface-100">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 ${
                    v.status === "verified" ? "bg-primary-500" :
                    v.status === "scam" ? "bg-red-500" :
                    v.status === "pending" ? "bg-amber-500" : "bg-gray-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900">{v.payer_name || "Unknown"}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        v.status === "verified" ? "bg-primary-50 text-primary-700" :
                        v.status === "scam" ? "bg-red-50 text-red-700" :
                        v.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-700"
                      }`}>{v.status}</span>
                    </div>
                    <p className="text-sm text-surface-400">
                      {v.business_name} · {v.bank_name ? getBankName(v.bank_name) : "Unknown"}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      {v.amount != null && <span>ETB {v.amount.toLocaleString()}</span>}
                      {v.transaction_reference && <span className="font-mono">Ref: {v.transaction_reference}</span>}
                      <span>{formatDate(v.created_at)}</span>
                    </div>
                    {v.error_message && (
                      <p className="text-xs text-red-500 mt-1">{v.error_message}</p>
                    )}
                  </div>
                </div>
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
