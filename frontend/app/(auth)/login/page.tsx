"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithRedirect } from "firebase/auth";
import { useFirebaseRedirect } from "@/lib/useFirebaseRedirect";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  useFirebaseRedirect();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const token = await cred.user.getIdToken();
      const metadata = cred.user.providerData[0] || {};

      localStorage.setItem("owner_token", token);
      localStorage.setItem("owner_user", JSON.stringify({
        id: cred.user.uid,
        email: cred.user.email,
        full_name: cred.user.displayName || cred.user.email?.split("@")[0],
        business_name: "",
      }));

      router.push("/owner");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError("");
    sessionStorage.setItem("auth_redirect", "/owner");
    await signInWithRedirect(auth, googleProvider);
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your business account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@business.com"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
            pattern: { value: /^\S+@\S+$/i, message: "Invalid email" },
          })}
        />

        <div className="relative">
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            {...register("password", { required: "Password is required" })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-surface-400 hover:text-surface-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign In
          <ArrowRight size={18} />
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-surface-400">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-surface-200 rounded-xl text-sm font-medium text-surface-700 bg-white hover:bg-surface-50 transition-colors"
        >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Google
        </button>

        <div className="text-center pt-2 space-y-1">
          <p className="text-sm text-surface-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary-600 font-medium hover:text-primary-700">
              Register your business
            </Link>
          </p>
          <p className="text-sm text-surface-500">
            Staff?{" "}
            <Link href="/staff/login" className="text-primary-600 font-medium hover:text-primary-700">
              Login with email & PIN
            </Link>
          </p>
          <p className="text-sm text-surface-500">
            Developer?{" "}
            <Link href="/developer/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
