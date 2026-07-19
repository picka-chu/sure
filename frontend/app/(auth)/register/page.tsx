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
import { authApi } from "@/lib/api";

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
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.register({
        business_name: data.business_name,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      });
      localStorage.setItem("owner_token", res.data.access_token);
      localStorage.setItem("owner_user", JSON.stringify(res.data.user));
      localStorage.setItem("show_welcome_trial", "true");
      router.push("/owner");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
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
