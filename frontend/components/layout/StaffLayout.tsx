"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, History, LogOut, User, AlertTriangle } from "lucide-react";
import api, { getApiBase } from "@/lib/api";
import axios from "axios";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [subExpired, setSubExpired] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("staff_user");
    const token = localStorage.getItem("staff_token");
    if (!token || !stored) {
      router.push("/staff/login");
      return;
    }
    setStaff(JSON.parse(stored));
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const token = localStorage.getItem("staff_token");
    axios.get(`${getApiBase()}/api/subscription/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((res) => {
      if (res.data.status === "expired" || res.data.status === "cancelled") {
        setSubExpired(true);
      }
    }).catch(() => {
      console.error("Failed to load subscription status");
    });
  }, [ready]);

  const handleLogout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_user");
    router.push("/staff/login");
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <header className="bg-white border-b border-surface-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <span className="font-semibold text-surface-900">Sure</span>
              {staff && (
                <p className="text-xs text-surface-400">{staff.business_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {staff && (
              <span className="text-sm text-surface-500">{staff.full_name}</span>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {subExpired && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 text-sm text-red-700 flex items-center gap-2 justify-center">
          <AlertTriangle size={14} />
          <span>Business subscription expired. Contact your owner to renew.</span>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-30">
        <div className="max-w-lg mx-auto flex">
          <Link
            href="/staff"
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              pathname === "/staff"
                ? "text-emerald-600"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            <ShieldCheck size={22} />
            <span className="mt-1">Verify</span>
          </Link>
          <Link
            href="/staff/history"
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              pathname === "/staff/history"
                ? "text-emerald-600"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            <History size={22} />
            <span className="mt-1">History</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
