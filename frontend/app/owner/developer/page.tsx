"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Key, Plus, Copy, Check, X, AlertTriangle, Clock, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { getApiBase } from "@/lib/api";

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function OwnerDeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("owner_token") : null;

  const apiHeaders = () => ({ "Authorization": `Bearer ${token}` });

  const fetchKeys = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiBase()}/api/v1/keys`, {
        headers: apiHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem("owner_token");
        localStorage.removeItem("owner_user");
        router.push("/login");
        return;
      }
      if (res.ok) {
        setKeys(await res.json());
      } else {
        setError("Failed to load API keys");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim() || !token) return;
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
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this API key? It will immediately stop working.")) return;
    if (!token) return;
    try {
      const res = await fetch(`${getApiBase()}/api/v1/keys/${id}`, {
        method: "DELETE",
        headers: apiHeaders(),
      });
      if (res.ok) {
        await fetchKeys();
      } else {
        const body = await res.json();
        setError(body.detail || "Failed to revoke key");
      }
    } catch {
      setError("Network error");
    }
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = key;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Developer API</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage API keys for programmatic access</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setCreatedKey(null); }}>
          <Plus size={15} />
          New Key
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2 mb-4">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {createdKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <Key size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">New API Key Created</p>
              <p className="text-xs text-amber-700">Copy this key now — it will never be shown again.</p>
            </div>
            <button onClick={() => setCreatedKey(null)} className="ml-auto text-amber-400 hover:text-amber-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2.5 mt-2">
            <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all">{createdKey}</code>
            <button onClick={() => copyKey(createdKey)} className={`shrink-0 p-1.5 rounded transition-colors ${copied ? "text-green-600" : "text-gray-400 hover:text-gray-600"}`}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {showCreate && !createdKey && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 text-sm">Create API Key</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production, My App, Staging"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#115ce9]/20 focus:border-[#115ce9]"
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              autoFocus
            />
            <Button onClick={createKey} loading={creating} size="md">
              Create
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
          <Key size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No API keys yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a key to start integrating the API.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${key.is_active ? "bg-green-50" : "bg-gray-100"}`}>
                  <Key size={15} className={key.is_active ? "text-green-600" : "text-gray-400"} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{key.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs font-mono text-gray-400">{key.key_prefix}...</code>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${key.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className="text-xs text-gray-400">{key.is_active ? "Active" : "Revoked"}</span>
                    {key.last_used_at && (
                      <>
                        <Clock size={10} className="text-gray-300" />
                        <span className="text-xs text-gray-400">{new Date(key.last_used_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {key.is_active && (
                <button
                  onClick={() => revokeKey(key.id)}
                  className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Revoke key"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
