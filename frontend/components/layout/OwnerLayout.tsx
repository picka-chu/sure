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
        setSubBanner({ type: "warning", message: `Your free trial ends in ${sub.days_remaining} days. Subscribe to keep using Sure.` });
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
    <div className="min-h-screen bg-surface-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-surface-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-semibold text-surface-900">Sure</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-surface-100"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-surface-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-surface-900">Sure</span>
            <p className="text-xs text-surface-400">Business Dashboard</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-100">
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-emerald-700">
                    {user.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900 truncate max-w-[120px]">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-surface-400">{user.business_name}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {subBanner && (
        <div className={`lg:ml-64 px-4 py-3 text-sm font-medium flex items-center gap-2 ${
          subBanner.type === "error"
            ? "bg-red-50 text-red-700 border-b border-red-100"
            : "bg-amber-50 text-amber-700 border-b border-amber-100"
        }`}>
          {subBanner.type === "error" ? <AlertTriangle size={16} /> : <Clock size={16} />}
          <span className="flex-1">{subBanner.message}</span>
          <Link href="/owner/subscription" className="underline font-semibold shrink-0">
            {subBanner.type === "error" ? "Renew Now" : "View Plans"}
          </Link>
        </div>
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
