"use client";

import { useState, useEffect } from "react";
import { Users, AlertTriangle } from "lucide-react";
import { adminApiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const limit = 20;

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.staff({ limit, offset: page * limit });
      setStaff(res.data.staff);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Staff</h1>
        <p className="text-surface-500 mt-1">{total} staff members across all businesses</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : staff.length === 0 ? (
        <Card className="text-center py-16">
          <Users size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No staff found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className="bg-white rounded-xl p-4 border border-surface-100">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary-700">{s.full_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900">{s.full_name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? "bg-primary-50 text-primary-700" : "bg-red-50 text-red-700"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-surface-400">{s.email || "No email"} · {s.business_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      <span>{s.verification_count} verifications</span>
                      {s.last_login_at && <span>Last login: {formatDate(s.last_login_at)}</span>}
                    </div>
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
