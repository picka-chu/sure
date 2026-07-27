"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
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
