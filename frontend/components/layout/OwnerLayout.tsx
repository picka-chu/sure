"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CreditCard,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { subscriptionApi } from "@/lib/api";

const navItems = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/banks", label: "Bank Accounts", icon: Building2 },
  { href: "/owner/staff", label: "Staff", icon: Users },
  { href: "/owner/history", label: "History", icon: History },
  { href: "/owner/subscription", label: "Subscription", icon: CreditCard },
  { href: "/owner/settings", label: "Settings", icon: Settings },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subBanner, setSubBanner] = useState<{ type: string; message: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("owner_user");
    const token = localStorage.getItem("owner_token");
    if (!token || !stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    if (pathname.startsWith("/owner/subscription")) return;

    subscriptionApi.getStatus().then((res) => {
      const sub = res.data;
      if (sub.status === "expired" || sub.status === "cancelled") {
        setSubBanner({ type: "error", message: "Your subscription has expired. Renew now to regain access." });
      } else if (sub.status === "trial" && sub.days_remaining <= 2) {
        setSubBanner({ type: "warning", message: `Your free trial ends in ${sub.days_remaining} days. Subscribe to keep using Surepay.` });
      } else if (sub.status === "trial" && sub.days_remaining <= 0) {
        setSubBanner({ type: "error", message: "Your trial has ended. Subscribe to continue using Sure." });
      }
    }).catch(() => {
      console.error("Failed to load subscription status");
    });
  }, [user, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("owner_token");
    localStorage.removeItem("owner_user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e9e7] px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#115ce9] flex items-center justify-center">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="font-semibold text-[#37352f] text-[15px]">Surepay</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded hover:bg-[#f7f7f7]" aria-label={sidebarOpen ? "Close" : "Open"}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className={`fixed inset-0 z-40 bg-black/30 lg:hidden transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#f7f7f7] border-r border-[#e9e9e7] transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-3 py-3 border-b border-[#e9e9e7]">
          <div className="w-7 h-7 rounded bg-[#115ce9] flex items-center justify-center">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="font-bold text-[#37352f] text-[15px]">Surepay</span>
        </div>

        <nav className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-[3px] text-[14px] transition-colors ${
                  isActive
                    ? "bg-[#e9e9e7] text-[#37352f]"
                    : "text-[#787774] hover:bg-[#e9e9e7] hover:text-[#37352f]"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-[#e9e9e7]">
          {user && (
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#e9e9e7] flex items-center justify-center">
                  <span className="text-[11px] font-medium text-[#37352f]">{user.full_name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#37352f] truncate max-w-[120px]">{user.full_name}</p>
                  <p className="text-[11px] text-[#9b9a97] truncate max-w-[120px]">{user.business_name}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-1 rounded hover:bg-[#e9e9e7] text-[#9b9a97] hover:text-[#e03e3e]" aria-label="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {subBanner && (
        <div className={`lg:ml-64 px-3 py-2 text-[13px] font-medium flex items-center gap-2 ${
          subBanner.type === "error"
            ? "bg-[#fde7e5] text-[#c73c3c] border-b border-[#f5cdc9]"
            : "bg-[#fef3d0] text-[#9f6d00] border-b border-[#fce68d]"
        }`}>
          {subBanner.type === "error" ? <AlertTriangle size={14} /> : <Clock size={14} />}
          <span className="flex-1">{subBanner.message}</span>
          <Link href="/owner/subscription" className="underline font-medium shrink-0">
            {subBanner.type === "error" ? "Renew Now" : "View Plans"}
          </Link>
        </div>
      )}

      <main className="lg:ml-64 pt-12 lg:pt-0 min-h-screen">
        <div className="px-4 py-5 md:px-6 lg:px-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
