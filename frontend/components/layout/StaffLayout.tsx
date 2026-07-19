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
    <div className="min-h-screen bg-[#f7f7f7] pb-20">
      <header className="bg-white border-b border-[#e9e9e7] px-3 py-2 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#115ce9] flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div>
              <span className="font-semibold text-[#37352f] text-[15px]">Surepay</span>
              {staff && (
                <p className="text-[11px] text-[#9b9a97]">{staff.business_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {staff && (
              <span className="text-[13px] text-[#787774]">{staff.full_name}</span>
            )}
            <button onClick={handleLogout} className="p-1.5 rounded hover:bg-[#f7f7f7] text-[#9b9a97] hover:text-[#e03e3e]" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {subExpired && (
        <div className="bg-[#fde7e5] border-b border-[#f5cdc9] px-3 py-2 text-[13px] text-[#c73c3c] flex items-center gap-2 justify-center">
          <AlertTriangle size={14} />
          <span>Business subscription expired. Contact your owner to renew.</span>
        </div>
      )}

      <main className="max-w-lg mx-auto px-3 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e9e9e7] z-30">
        <div className="max-w-lg mx-auto flex">
          <Link href="/staff" className={`flex-1 flex flex-col items-center py-2.5 text-[11px] font-medium transition-colors ${
            pathname === "/staff" ? "text-[#115ce9]" : "text-[#9b9a97] hover:text-[#37352f]"
          }`}>
            <ShieldCheck size={20} />
            <span className="mt-0.5">Verify</span>
          </Link>
          <Link href="/staff/history" className={`flex-1 flex flex-col items-center py-2.5 text-[11px] font-medium transition-colors ${
            pathname === "/staff/history" ? "text-[#115ce9]" : "text-[#9b9a97] hover:text-[#37352f]"
          }`}>
            <History size={20} />
            <span className="mt-0.5">History</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
