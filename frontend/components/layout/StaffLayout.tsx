"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, History, LogOut, User } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<any>(null);
  const [ready, setReady] = useState(false);
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
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-30">
        <div className="max-w-lg mx-auto flex">
          <a
            href="/staff"
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              pathname === "/staff"
                ? "text-emerald-600"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            <ShieldCheck size={22} />
            <span className="mt-1">Verify</span>
          </a>
          <a
            href="/staff/history"
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              pathname === "/staff/history"
                ? "text-emerald-600"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            <History size={22} />
            <span className="mt-1">History</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
