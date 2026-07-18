"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function AuthError({
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
        <h1 className="text-xl font-bold text-surface-900 mb-2">Something went wrong</h1>
        <p className="text-surface-500 mb-6">An unexpected error occurred. Please try again.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
