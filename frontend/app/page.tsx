"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const ownerToken = localStorage.getItem("owner_token");
    const staffToken = localStorage.getItem("staff_token");
    if (ownerToken) router.push("/owner");
    else if (staffToken) router.push("/staff");
    else router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
      <div className="text-center animate-pulse-slow">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 mb-4">
          <ShieldCheck size={32} />
        </div>
        <p className="text-surface-500 text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
