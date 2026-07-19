"use client";

import { useState, useEffect } from "react";
import { Search, Filter, History, AlertTriangle } from "lucide-react";
import { verificationApi } from "@/lib/api";
import { Verification } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getBankName,
} from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function HistoryPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadVerifications();
  }, [page]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const res = await verificationApi.list({
        limit: 50,
        offset: page * 50,
      });
      setVerifications((prev) =>
        page === 0 ? res.data : [...prev, ...res.data]
      );
    } catch {
      setError("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  const filtered = verifications.filter((v) => {
    const matchesSearch =
      !search ||
      v.payer_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.transaction_reference
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Verification History</h1>
        <p className="text-surface-500 mt-1">
          View all payment verifications
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
          />
          <input
            type="text"
            placeholder="Search by name or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="scam">Scam</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading && page === 0 ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <History size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No verifications found</p>
          <p className="text-sm text-surface-400 mt-1">
            {search
              ? "Try a different search term"
              : "Start by verifying customer receipts"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <Card key={v.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      v.status === "verified"
                        ? "bg-primary-500"
                        : v.status === "scam"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-surface-900">
                        {v.payer_name || "Unknown"}
                      </span>
                      <Badge className={getStatusColor(v.status)}>
                        {v.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-surface-400 mt-0.5">
                      {v.bank_name && (
                        <span>{getBankName(v.bank_name)}</span>
                      )}
                      {v.transaction_reference && (
                        <>
                          <span>&middot;</span>
                          <span className="font-mono text-xs">
                            {v.transaction_reference}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {v.amount != null && (
                    <p className="font-semibold text-surface-900">
                      {formatCurrency(v.amount)}
                    </p>
                  )}
                  <p className="text-xs text-surface-400 mt-0.5">
                    {formatDate(v.created_at)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && verifications.length >= (page + 1) * 50 && (
        <div className="text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
