"use client";

import { useState, useEffect } from "react";
import { History, ArrowLeft, AlertTriangle } from "lucide-react";
import { verificationApi } from "@/lib/api";
import { Verification } from "@/lib/types";
import { formatCurrency, formatDate, getStatusColor, getBankName } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export default function StaffHistoryPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadVerifications();
  }, [page]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const res = await verificationApi.staffList({
        limit: 20,
        offset: page * 20,
      });
      setVerifications((prev) =>
        page === 0 ? res.data : [...prev, ...res.data]
      );
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      <div>
        <h1 className="text-xl font-bold text-surface-900">History</h1>
        <p className="text-sm text-surface-500 mt-1">
          Your recent verifications
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {verifications.length === 0 && !loading && (
        <div className="text-center py-16">
          <History size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">No verifications yet</p>
          <p className="text-sm text-surface-400 mt-1">
            Start verifying customer receipts
          </p>
        </div>
      )}

      <div className="space-y-3">
        {verifications.map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-xl p-4 border border-surface-100 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(v.status)}>
                {v.status}
              </Badge>
              <span className="text-xs text-surface-400">
                {formatDate(v.created_at)}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                {v.bank_name && (
                  <p className="text-sm font-medium text-surface-900">
                    {getBankName(v.bank_name)}
                  </p>
                )}
                {v.payer_name && (
                  <p className="text-xs text-surface-500">{v.payer_name}</p>
                )}
              </div>
              {v.amount != null && (
                <p className="text-lg font-bold text-surface-900">
                  {formatCurrency(v.amount)}
                </p>
              )}
            </div>
            {v.transaction_reference && (
              <p className="text-xs text-surface-400 font-mono truncate">
                Ref: {v.transaction_reference}
              </p>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      )}

      {!loading && verifications.length >= (page + 1) * 20 && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full py-3 text-sm text-primary-600 font-medium hover:text-primary-700"
        >
          Load more
        </button>
      )}
    </div>
  );
}
