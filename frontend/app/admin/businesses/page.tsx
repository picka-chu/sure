"use client";

import { useState, useEffect } from "react";
import { Search, Building2, AlertTriangle, ToggleLeft, ToggleRight, ArrowRight } from "lucide-react";
import { adminApiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const limit = 20;

  useEffect(() => { load(); }, [search, statusFilter, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.businesses({ search: search || undefined, status: statusFilter || undefined, limit, offset: page * limit });
      setBusinesses(res.data.businesses);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await adminApiClient.toggleBusiness(id);
      load();
    } catch {
      setError("Failed to toggle business");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Businesses</h1>
        <p className="text-surface-500 mt-1">{total} registered businesses</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text" placeholder="Search by name or email..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2.5 rounded-xl border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">All</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : businesses.length === 0 ? (
        <Card className="text-center py-16">
          <Building2 size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No businesses found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white rounded-xl p-4 border border-surface-100 hover:border-surface-200 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900 truncate">{b.name}</h3>
                      <Badge variant={b.is_active ? "success" : "danger"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="text-sm text-surface-400">{b.email} {b.owner_name && `· ${b.owner_name}`}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-surface-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        b.subscription_status === "active" ? "bg-primary-50 text-primary-700" :
                        b.subscription_status === "trial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                      }`}>{b.subscription_status}</span>
                      <span>{b.staff_count} staff</span>
                      <span>{b.verification_count} verifications</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleToggle(b.id)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-primary-600" aria-label={`Toggle ${b.name}`}>
                    {b.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <Link href={`/admin/businesses/${b.id}`} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-primary-600" aria-label={`View ${b.name}`}>
                    <ArrowRight size={16} />
                  </Link>
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
