"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { adminApiClient } from "@/lib/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await adminApiClient.login({ email, password });
      localStorage.setItem("admin_token", res.data.access_token);
      localStorage.setItem("admin_user", JSON.stringify(res.data.user));
      router.push("/admin");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#115ce9] text-white mb-4">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-[24px] font-bold text-[#37352f]">Admin Login</h1>
          <p className="text-[#787774] mt-1 text-[14px]">Super admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 space-y-4">
          {error && (
            <div className="p-3 rounded bg-[#fde7e5] text-[13px] text-[#c73c3c]">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[#37352f]">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@surepay.et"
                required
                className="block w-full rounded-[3px] border border-[#e9e9e7] bg-white pl-8 pr-3 py-2 text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:outline-none focus:border-[#115ce9]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[#37352f]">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="block w-full rounded-[3px] border border-[#e9e9e7] bg-white pl-8 pr-8 py-2 text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:outline-none focus:border-[#115ce9]"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9b9a97] hover:text-[#37352f]"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#115ce9] text-white rounded-[3px] font-medium text-[14px] hover:bg-[#0d4fc4] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight size={14} />
          </button>
        </form>

        <p className="text-[12px] text-[#9b9a97] text-center mt-6">
          &copy; {new Date().getFullYear()} Surepay Admin
        </p>
      </div>
    </div>
  );
}
