"use client";

import { ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 mb-4">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-surface-900">{title}</h1>
            <p className="text-surface-500 mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
      <div className="text-center pb-6">
        <p className="text-xs text-surface-400">
          &copy; {new Date().getFullYear()} VerifyPay. All rights reserved.
        </p>
      </div>
    </div>
  );
}
