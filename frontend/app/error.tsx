"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { ShieldCheck } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 mb-2">Something went wrong</h1>
        <p className="text-surface-500 mb-6">An unexpected error occurred. Please try again.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
