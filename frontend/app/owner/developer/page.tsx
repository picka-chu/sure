"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Key, Plus, Copy, Check, X, ShieldCheck, Activity,
  Clock, ExternalLink, ChevronRight,
  Terminal, Book, Settings, BarChart3, Code2, CreditCard,
  AlertCircle, CheckCircle, XCircle, Loader2, TrendingUp,
  TrendingDown, Banknote, Zap, Calendar,
} from "lucide-react";
import { getApiBase } from "@/lib/api";

interface ApiKeyItem {
  id: string; name: string; key_prefix: string;
  rate_limit: number; is_active: boolean;
  last_used_at: string | null; created_at: string;
}

interface VerificationItem {
  id: string; status: string; bank_name: string | null;
  transaction_reference: string | null; payer_name: string | null;
  amount: string | null; currency: string | null;
  is_verified: boolean; reason: string | null;
  created_at: string;
}

interface DailyStat {
  date: string; total: number; verified: number;
  scam: number; pending: number;
}

interface AnalyticsData {
  total_verifications: number; verified_today: number;
  scam_today: number; scam_rate: number;
  total_scans_today: number;
  recent_verifications: any[];
  daily_stats: DailyStat[];
  bank_breakdown: Record<string, number>;
}

interface SubscriptionStatus {
  status: string; plan: string; days_remaining: number;
  is_active: boolean; trial_end_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
}

interface PaymentRecord {
  id: string; plan_type: string; amount: number;
  currency: string; payment_method: string; status: string;
  created_at: string;
}

type Tab = "keys" | "analytics" | "verifications" | "docs" | "billing" | "settings";

const tabs: { id: Tab; label: string; icon: typeof Key }[] = [
  { id: "keys", label: "API Keys", icon: Key },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "verifications", label: "Verifications", icon: Activity },
  { id: "docs", label: "Quick Start", icon: Book },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DeveloperDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("keys");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("owner_token");
    const u = localStorage.getItem("owner_user");
    if (!t || !u) { router.push("/developer/login"); return; }
    setToken(t);
    setUser(JSON.parse(u));
  }, [router]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} open={sidebarOpen} setOpen={setSidebarOpen} />

        <main className="flex-1 min-w-0 lg:ml-64">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
            {activeTab === "keys" && <ApiKeysSection token={token} />}
            {activeTab === "analytics" && <AnalyticsSection token={token} />}
            {activeTab === "verifications" && <VerificationsSection token={token} />}
            {activeTab === "docs" && <DocsSection token={token} />}
            {activeTab === "billing" && <BillingSection token={token} user={user} />}
            {activeTab === "settings" && <SettingsSection user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function TopBar({ user, sidebarOpen, setSidebarOpen }: any) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-14">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            {sidebarOpen ? <X size={18} /> : <MenuIcon />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#115ce9] flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="font-semibold text-[15px] text-gray-900 hidden sm:inline">Surepay</span>
            <span className="text-[15px] text-gray-300 hidden sm:inline">/</span>
            <span className="text-[13px] font-medium text-gray-500 hidden sm:inline">Developer</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/owner" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Business Dashboard</a>
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-[11px] font-medium text-gray-600">
              {user?.full_name?.charAt(0)?.toUpperCase() || "D"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function Sidebar({ activeTab, setActiveTab, open, setOpen }: any) {
  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed top-14 left-0 z-20 h-[calc(100vh-3.5rem)] w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="p-3 space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#115ce9] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100">
          <div className="bg-gradient-to-br from-[#115ce9] to-[#0e4fc9] rounded-xl p-4 text-white">
            <p className="text-[11px] font-medium opacity-80">Need help?</p>
            <p className="text-xs mt-1 opacity-90">Check our API docs for integration guides.</p>
            <a href="/docs" className="inline-flex items-center gap-1 text-[11px] font-medium mt-2 text-white/90 hover:text-white">
              View Docs <ChevronRight size={12} />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

function ApiKeysSection({ token }: { token: string }) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const apiHeaders = useCallback(() => ({ "Authorization": `Bearer ${token}` }), [token]);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/v1/keys`, { headers: apiHeaders() });
      if (res.ok) setKeys(await res.json());
      else setError("Failed to load keys");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [apiHeaders]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${getApiBase()}/api/v1/keys`, {
        method: "POST",
        headers: { ...apiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key);
        setNewKeyName("");
        setShowCreate(false);
        await fetchKeys();
      } else {
        const body = await res.json();
        setError(body.detail || "Failed to create key");
      }
    } catch { setError("Network error"); }
    finally { setCreating(false); }
  };

  const revokeKey = async (id: string) => {
    setRevoking(id);
    try {
      await fetch(`${getApiBase()}/api/v1/keys/${id}`, { method: "DELETE", headers: apiHeaders() });
      await fetchKeys();
    } catch { setError("Failed to revoke key"); }
    finally { setRevoking(null); }
  };

  const copyKey = async (key: string) => {
    try { await navigator.clipboard.writeText(key); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = key; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeKeys = keys.filter(k => k.is_active);
  const revokedKeys = keys.filter(k => !k.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage keys for programmatic access to the Surepay API.</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreatedKey(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#115ce9] text-white text-sm font-medium rounded-lg hover:bg-[#0f4fce] transition-colors"
        >
          <Plus size={15} /> Create Key
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {createdKey && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Key size={15} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900">API Key Created</p>
              <p className="text-xs text-emerald-700 mt-0.5">Copy this key now — you won&apos;t see it again.</p>
              <div className="flex items-center gap-2 mt-2 bg-white rounded-lg border border-emerald-200 px-3 py-2.5">
                <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all">{createdKey}</code>
                <button onClick={() => copyKey(createdKey)}
                  className={`shrink-0 p-1.5 rounded transition-colors ${copied ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
            <button onClick={() => setCreatedKey(null)} className="text-emerald-400 hover:text-emerald-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showCreate && !createdKey && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">New API Key</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production, My App, Staging"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#115ce9]/20 focus:border-[#115ce9]"
              onKeyDown={(e) => e.key === "Enter" && createKey()} autoFocus
            />
            <button onClick={createKey} disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 bg-[#115ce9] text-white text-sm font-medium rounded-lg hover:bg-[#0f4fce] transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Key size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900">No API keys yet</p>
          <p className="text-xs text-gray-500 mt-1">Create your first key to start integrating.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeKeys.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Active ({activeKeys.length})</h3>
              <div className="space-y-2">{activeKeys.map((key) => (
                <KeyCard key={key.id} keyItem={key} onRevoke={revokeKey} revoking={revoking === key.id} />
              ))}</div>
            </div>
          )}
          {revokedKeys.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Revoked ({revokedKeys.length})</h3>
              <div className="space-y-2">{revokedKeys.map((key) => (
                <KeyCard key={key.id} keyItem={key} onRevoke={revokeKey} revoking={false} />
              ))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KeyCard({ keyItem, onRevoke, revoking }: { keyItem: ApiKeyItem; onRevoke: (id: string) => void; revoking: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${keyItem.is_active ? "bg-white border-gray-200 hover:border-gray-300" : "bg-gray-50 border-gray-100"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${keyItem.is_active ? "bg-blue-50" : "bg-gray-100"}`}>
            <Key size={16} className={keyItem.is_active ? "text-[#115ce9]" : "text-gray-400"} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{keyItem.name}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${keyItem.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {keyItem.is_active ? "Active" : "Revoked"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <code className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{keyItem.key_prefix}••••••••••</code>
              <span className="text-[11px] text-gray-400">{keyItem.rate_limit} req/s</span>
              {keyItem.last_used_at && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock size={10} /> Last used {new Date(keyItem.last_used_at).toLocaleDateString()}
                </span>
              )}
              <span className="text-[11px] text-gray-400">Created {new Date(keyItem.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {keyItem.is_active && (
          <button onClick={() => onRevoke(keyItem.id)} disabled={revoking}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {revoking ? <Loader2 size={14} className="animate-spin" /> : "Revoke"}
          </button>
        )}
      </div>
    </div>
  );
}

function AnalyticsSection({ token }: { token: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiHeaders = useCallback(() => ({ "Authorization": `Bearer ${token}` }), [token]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/analytics/dashboard`, { headers: apiHeaders() });
        if (res.ok) setData(await res.json());
        else setError("Failed to load analytics");
      } catch { setError("Network error"); }
      finally { setLoading(false); }
    })();
  }, [apiHeaders]);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> Loading...</div>;
  if (error) return <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700"><AlertCircle size={15} /> {error}</div>;
  if (!data) return null;

  const maxDaily = Math.max(...data.daily_stats.map(d => d.total), 1);
  const banks = Object.entries(data.bank_breakdown || {}).sort((a, b) => b[1] - a[1]);
  const maxBank = Math.max(...banks.map(([, c]) => c), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Usage Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time metrics and historical usage trends.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Activity} label="Total Verifications" value={data.total_verifications.toLocaleString()} color="text-[#115ce9]" bg="bg-blue-50" />
        <StatCard icon={Zap} label="Scans Today" value={data.total_scans_today.toLocaleString()} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={CheckCircle} label="Verified Today" value={data.verified_today.toLocaleString()} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={data.scam_rate > 20 ? TrendingDown : TrendingUp} label="Scam Rate" value={`${data.scam_rate}%`} color={data.scam_rate > 20 ? "text-red-600" : "text-emerald-600"} bg={data.scam_rate > 20 ? "bg-red-50" : "bg-emerald-50"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Verifications (30 days)</h3>
          {data.daily_stats.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {data.daily_stats.map((d) => {
                const pct = (d.total / maxDaily) * 100;
                const isToday = d.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex flex-col-reverse" style={{ height: `${Math.max(pct, 2)}%` }}>
                      {d.verified > 0 && <div className="w-full bg-emerald-400 rounded-t" style={{ height: `${(d.verified / d.total) * 100}%` }} />}
                      {d.scam > 0 && <div className="w-full bg-red-400" style={{ height: `${(d.scam / d.total) * 100}%` }} />}
                      {d.pending > 0 && <div className="w-full bg-gray-300" style={{ height: `${(d.pending / d.total) * 100}%` }} />}
                      {d.total === 0 && <div className="w-full bg-gray-100 rounded-t" style={{ height: "100%" }} />}
                    </div>
                    <span className={`text-[8px] ${isToday ? "text-[#115ce9] font-semibold" : "text-gray-400"}`}>
                      {new Date(d.date).getDate()}
                    </span>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                      {d.date}: {d.total} ({d.verified} verified, {d.scam} scam)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Verified</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Scam</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-300" /> Pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Bank Breakdown</h3>
          {banks.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {banks.map(([bank, count]) => (
                <div key={bank}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 capitalize">{bank}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#115ce9] rounded-full transition-all" style={{ width: `${(count / maxBank) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function VerificationsSection({ token }: { token: string }) {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const apiHeaders = useCallback(() => ({ "Authorization": `Bearer ${token}` }), [token]);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/verifications?limit=${limit}&offset=${page * limit}`, { headers: apiHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(data.verifications || []);
        setTotal(data.total || 0);
      } else setError("Failed to load verifications");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [apiHeaders, page]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const stats = { total, verified: items.filter(i => i.is_verified).length, failed: items.filter(i => !i.is_verified).length };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Verifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recent receipt verification history.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900", bg: "bg-gray-50" },
          { label: "Verified", value: stats.verified, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Failed", value: stats.failed, color: "text-red-700", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700"><AlertCircle size={15} /> {error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><Activity size={22} className="text-gray-400" /></div>
          <p className="text-sm font-medium text-gray-900">No verifications yet</p>
          <p className="text-xs text-gray-500 mt-1">Use your API key to make your first verification.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((v) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.is_verified ? "bg-emerald-50" : "bg-red-50"}`}>
                      {v.is_verified ? <CheckCircle size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{v.bank_name || "Unknown bank"}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${v.is_verified ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {v.is_verified ? "Verified" : "Failed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {v.transaction_reference && <span>Ref: {v.transaction_reference}</span>}
                        {v.amount && <span>{v.amount} {v.currency || "ETB"}</span>}
                        {v.payer_name && <span>Payer: {v.payer_name}</span>}
                        <span>{new Date(v.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {v.reason && <div className="hidden md:block max-w-xs text-right"><p className="text-[11px] text-gray-400 leading-tight">{v.reason}</p></div>}
                </div>
              </div>
            ))}
          </div>

          {total > limit && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">Previous</button>
              <span className="text-xs text-gray-400">Page {page + 1} of {Math.ceil(total / limit)}</span>
              <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DocsSection({ token }: { token: string }) {
  const curl = `curl -X POST https://sure1.onrender.com/api/v1/verify \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "file=@receipt.jpg" \\
  -F "bank_name=cbe"`;

  const py = `from surepay import Surepay

client = Surepay(api_key="YOUR_API_KEY")
result = client.verify("receipt.jpg", bank_name="cbe")
print(f"Verified: {result.is_verified}")`;

  const node = `const surepay = new Surepay({ apiKey: "YOUR_API_KEY" });

const result = await surepay.verify({
  file: "receipt.jpg",
  bankName: "cbe"
});
console.log("Verified:", result.isVerified);`;

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = code; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const handleCopy = (code: string, idx: number) => { copyCode(code); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Quick Start</h1>
        <p className="text-sm text-gray-500 mt-0.5">Get up and running in minutes.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1"><Terminal size={15} className="text-[#115ce9]" /><h3 className="text-sm font-semibold text-gray-900">1. Install the SDK</h3></div>
          <p className="text-xs text-gray-500 mb-3">Python package for easy integration.</p>
          <div className="bg-gray-900 rounded-lg p-3"><code className="text-xs text-green-400 font-mono">pip install surepay-sdk</code></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1"><Key size={15} className="text-[#115ce9]" /><h3 className="text-sm font-semibold text-gray-900">2. Get your API key</h3></div>
          <p className="text-xs text-gray-500 mb-3">Create a key in the API Keys tab above.</p>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><code className="text-xs text-gray-600 font-mono">Replace YOUR_API_KEY with your key</code></div>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { label: "cURL", code: curl },
          { label: "Python", code: py },
          { label: "Node.js", code: node },
        ].map((snippet, idx) => (
          <div key={snippet.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2"><Code2 size={14} className="text-gray-400" /><span className="text-xs font-medium text-gray-600">{snippet.label}</span></div>
              <button onClick={() => handleCopy(snippet.code, idx)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {copiedIdx === idx ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto"><code className="text-xs font-mono text-gray-800 leading-relaxed">{snippet.code}</code></pre>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <a href="/docs" className="inline-flex items-center gap-1.5 text-sm text-[#115ce9] font-medium hover:text-[#0f4fce] transition-colors">
          View full API documentation <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function BillingSection({ token, user }: { token: string; user: any }) {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiHeaders = useCallback(() => ({ "Authorization": `Bearer ${token}` }), [token]);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, payRes] = await Promise.all([
          fetch(`${getApiBase()}/api/subscription/status`, { headers: apiHeaders() }),
          fetch(`${getApiBase()}/api/subscription/payments`, { headers: apiHeaders() }),
        ]);
        if (subRes.ok) setSub(await subRes.json());
        if (payRes.ok) setPayments(await payRes.json());
      } catch { setError("Failed to load billing data"); }
      finally { setLoading(false); }
    })();
  }, [apiHeaders]);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> Loading...</div>;

  const planLabel = (p?: string) => ({ monthly: "Monthly", yearly: "Yearly", trial: "Trial", none: "No Plan", expired: "Expired" })[p || "none"] || p || "—";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your plan, view payment history, and monitor usage.</p>
      </div>

      {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700"><AlertCircle size={15} /> {error}</div>}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Plan</h3>
          {sub ? (
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sub.is_active ? "bg-emerald-50" : sub.status === "expired" ? "bg-red-50" : "bg-gray-100"}`}>
                <CreditCard size={20} className={sub.is_active ? "text-emerald-600" : sub.status === "expired" ? "text-red-500" : "text-gray-400"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg font-bold text-gray-900">{planLabel(sub.plan)}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    sub.is_active ? "bg-emerald-50 text-emerald-700" : sub.status === "expired" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {sub.is_active ? "Active" : sub.status === "trial" ? "Trial" : sub.status}
                  </span>
                </div>
                {sub.is_active && sub.days_remaining > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    {sub.subscription_end_date ? (
                      <span>Renews {new Date(sub.subscription_end_date).toLocaleDateString()} ({sub.days_remaining} days remaining)</span>
                    ) : sub.trial_end_date ? (
                      <span>Trial ends {new Date(sub.trial_end_date).toLocaleDateString()} ({sub.days_remaining} days remaining)</span>
                    ) : null}
                  </div>
                )}
                {!sub.is_active && (
                  <button className="mt-3 px-4 py-1.5 bg-[#115ce9] text-white text-xs font-medium rounded-lg hover:bg-[#0f4fce] transition-colors">
                    Upgrade Plan
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4">Unable to load subscription status</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Usage This Period</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">API Calls</span>
              <span className="text-sm font-semibold text-gray-900">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Verifications</span>
              <span className="text-sm font-semibold text-gray-900">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Rate Limit</span>
              <span className="text-sm font-semibold text-gray-900">60 req/min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2">Date</th>
                  <th className="text-left font-medium text-gray-500 pb-2">Plan</th>
                  <th className="text-left font-medium text-gray-500 pb-2">Method</th>
                  <th className="text-right font-medium text-gray-500 pb-2">Amount</th>
                  <th className="text-right font-medium text-gray-500 pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-700">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 capitalize text-gray-700">{p.plan_type}</td>
                    <td className="py-2.5 uppercase text-gray-700">{p.payment_method}</td>
                    <td className="py-2.5 text-right text-gray-700">{p.amount.toLocaleString()} {p.currency}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.status === "verified" ? "bg-emerald-50 text-emerald-700" :
                        p.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsSection({ user }: { user: any }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your developer profile.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Name</label>
            <p className="text-sm text-gray-900 mt-0.5">{user?.full_name || "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email</label>
            <p className="text-sm text-gray-900 mt-0.5">{user?.email || "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Organization</label>
            <p className="text-sm text-gray-900 mt-0.5">{user?.business_name || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
