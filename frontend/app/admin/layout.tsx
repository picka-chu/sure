"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Scan,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/verifications", label: "Verifications", icon: Scan },
  { href: "/admin/staff", label: "Staff", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    const stored = localStorage.getItem("admin_user");
    const token = localStorage.getItem("admin_token");
    if (!token || !stored) {
      router.push("/admin/login");
      return;
    }
    setUser(JSON.parse(stored));
    setReady(true);
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
  };

  if (!ready) return null;

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e9e9e7] px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#115ce9] flex items-center justify-center">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="font-semibold text-[#37352f] text-[15px]">Surepay Admin</span>
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
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-[3px] text-[14px] transition-colors ${
                isActive(item.href) ? "bg-[#e9e9e7] text-[#37352f]" : "text-[#787774] hover:bg-[#e9e9e7] hover:text-[#37352f]"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-[#e9e9e7]">
          {user && (
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#e9e9e7] flex items-center justify-center">
                  <span className="text-[11px] font-medium text-[#37352f]">{user.full_name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#37352f] truncate max-w-[120px]">{user.full_name}</p>
                  <p className="text-[11px] text-[#9b9a97]">Admin</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-1 rounded hover:bg-[#e9e9e7] text-[#9b9a97] hover:text-[#e03e3e]" aria-label="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="lg:ml-64 pt-12 lg:pt-0 min-h-screen">
        <div className="px-4 py-5 md:px-6 lg:px-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
