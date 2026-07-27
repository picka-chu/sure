"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getRedirectResult } from "firebase/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result || !result.user) {
          router.push("/login");
          return;
        }
        const token = await result.user.getIdToken();
        localStorage.setItem("owner_token", token);
        localStorage.setItem("owner_user", JSON.stringify({
          id: result.user.uid,
          email: result.user.email,
          full_name: result.user.displayName || result.user.email?.split("@")[0],
          business_name: "",
        }));

        const redirectTo = sessionStorage.getItem("auth_redirect") || "/owner";
        sessionStorage.removeItem("auth_redirect");
        router.push(redirectTo);
      } catch {
        router.push("/login");
      }
    };
    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}
