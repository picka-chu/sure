"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function DashboardError({
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
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-surface-900 mb-2">Something went wrong</h1>
        <p className="text-surface-500 mb-4">An unexpected error occurred.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
