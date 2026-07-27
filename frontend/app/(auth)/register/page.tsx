"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { auth, googleProvider } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithRedirect, updateProfile } from "firebase/auth";

interface RegisterForm {
  business_name: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const afterAuth = async (user: any, fullName?: string) => {
    const token = await user.getIdToken();
    localStorage.setItem("owner_token", token);
    localStorage.setItem("owner_user", JSON.stringify({
      id: user.uid,
      email: user.email,
      full_name: fullName || user.displayName || user.email?.split("@")[0],
      business_name: "",
    }));
    localStorage.setItem("show_welcome_trial", "true");
    router.push("/owner");
  };

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.full_name });
      await afterAuth(cred.user, data.full_name);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    setError("");
    sessionStorage.setItem("auth_redirect", "/owner");
    await signInWithRedirect(auth, googleProvider);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your 7-day free trial, no credit card required"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="business_name"
          label="Business Name"
          placeholder="Your Cafe or Business Name"
          icon={<Building2 size={16} />}
          error={errors.business_name?.message}
          {...register("business_name", { required: "Business name is required" })}
        />

        <Input
          id="full_name"
          label="Your Full Name"
          placeholder="John Doe"
          icon={<User size={16} />}
          error={errors.full_name?.message}
          {...register("full_name", { required: "Full name is required" })}
        />

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

        <Input
          id="phone"
          label="Phone (optional)"
          type="tel"
          placeholder="+251 91 234 5678"
          icon={<Phone size={16} />}
          {...register("phone")}
        />

        <div className="relative">
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
            })}
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

        <Input
          id="confirm_password"
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          icon={<Lock size={16} />}
          error={errors.confirm_password?.message}
          {...register("confirm_password", {
            required: "Please confirm your password",
            validate: (v) => v === watch("password") || "Passwords do not match",
          })}
        />

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create Account
          <ArrowRight size={18} />
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-surface-400">or sign up with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={signUpWithGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-surface-200 rounded-xl text-sm font-medium text-surface-700 bg-white hover:bg-surface-50 transition-colors disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-surface-300 border-t-primary-600 rounded-full" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Google
        </button>

        <div className="text-center pt-2">
          <p className="text-sm text-surface-500">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
