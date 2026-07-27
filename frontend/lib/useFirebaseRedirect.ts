"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import { getRedirectResult } from "firebase/auth";

export function useFirebaseRedirect() {
  const router = useRouter();

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result || !result.user) return;

      const token = await result.user.getIdToken();
      const redirectTo = sessionStorage.getItem("auth_redirect") || "/owner";
      sessionStorage.removeItem("auth_redirect");

      localStorage.setItem("owner_token", token);
      localStorage.setItem("owner_user", JSON.stringify({
        id: result.user.uid,
        email: result.user.email,
        full_name: result.user.displayName || result.user.email?.split("@")[0],
        business_name: "",
      }));

      router.push(redirectTo);
    }).catch(() => {});
  }, [router]);
}
