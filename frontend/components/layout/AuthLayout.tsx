"use client";

import { ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#115ce9] text-white mb-4">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-[24px] font-bold text-[#37352f]">{title}</h1>
            <p className="text-[#787774] mt-1 text-[14px]">{subtitle}</p>
          </div>
          <div className="bg-white rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            {children}
          </div>
        </div>
      </div>
      <div className="text-center pb-6">
        <p className="text-[12px] text-[#9b9a97]">
          &copy; {new Date().getFullYear()} Surepay. All rights reserved.
        </p>
      </div>
    </div>
  );
}
