import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 mb-2">Page not found</h1>
        <p className="text-surface-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/">
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  );
}
