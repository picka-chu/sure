"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push("/login");
        return;
      }

      const token = data.session.access_token;
      const user = data.session.user;
      const metadata = user.user_metadata || {};
      const email = user.email || "";

      localStorage.setItem("owner_token", token);
      localStorage.setItem("owner_user", JSON.stringify({
        id: user.id,
        email,
        full_name: metadata.full_name || metadata.name || email.split("@")[0],
        business_name: metadata.business_name || `${metadata.name || email.split("@")[0]}'s Business`,
      }));

      const redirectTo = sessionStorage.getItem("auth_redirect") || "/owner";
      sessionStorage.removeItem("auth_redirect");
      router.push(redirectTo);
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
    </div>
  );
}
