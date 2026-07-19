"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Key, ArrowRight, Mail } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authApi } from "@/lib/api";

interface StaffLoginForm {
  email: string;
  pin: string;
}

export default function StaffLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginForm>();

  const onSubmit = async (data: StaffLoginForm) => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.staffLogin(data);
      localStorage.setItem("staff_token", res.data.access_token);
      localStorage.setItem("staff_user", JSON.stringify(res.data.staff));
      router.push("/staff");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Staff Login" subtitle="Enter your email and PIN to start verifying">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="email"
          label="Email"
          type="text"
          placeholder="meron.alemu@abc123.staff"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          {...register("email", { required: "Email is required" })}
        />

        <Input
          id="pin"
          label="PIN"
          type="password"
          placeholder="Enter your PIN"
          icon={<Key size={16} />}
          maxLength={10}
          inputMode="numeric"
          error={errors.pin?.message}
          {...register("pin", {
            required: "PIN is required",
            minLength: { value: 4, message: "PIN must be at least 4 digits" },
          })}
        />

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Login
          <ArrowRight size={18} />
        </Button>

        <div className="text-center pt-2">
          <p className="text-sm text-surface-500">
            Business owner?{" "}
            <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
