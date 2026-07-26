"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Key, Mail, Lock, User, Building2, Eye, EyeOff, Copy, Check, ShieldCheck, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getApiBase } from "@/lib/api";

interface DevRegisterForm {
  business_name: string;
  full_name: string;
  email: string;
  password: string;
}

interface SuccessResult {
  api_key: string;
  business_name: string;
  business_id: string;
}

export default function DeveloperRegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessResult | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DevRegisterForm>();

  const onSubmit = async (data: DevRegisterForm) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBase()}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail || "Registration failed");
        return;
      }
      setSuccess({
        api_key: body.api_key,
        business_name: body.business_name,
        business_id: body.business_id,
      });
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async () => {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.api_key);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = success.api_key;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#115ce9] px-6 py-8 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Key size={28} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">API Key Generated</h1>
              <p className="text-blue-200 text-sm mt-1">{success.business_name}</p>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">This is your only chance to see this key</p>
                  <p className="text-amber-700 mt-0.5">Store it securely — it will never be shown again.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Your API Key</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all">{success.api_key}</code>
                  <button
                    onClick={copyKey}
                    className={`shrink-0 p-2 rounded-lg transition-colors ${
                      copied ? "bg-green-50 text-green-600" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                    }`}
                    title="Copy API key"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 mt-1">Copied to clipboard</p>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Quick Start</p>
                <code className="block text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
                  pip install surepay<br />
                  <br />
                  from surepay import Surepay<br />
                  client = Surepay(api_key=&quot;{success.api_key.slice(0, 12)}...&quot;)<br />
                  result = client.verify(&quot;receipt.jpg&quot;)
                </code>
              </div>

              <div className="space-y-2.5">
                <Button fullWidth onClick={() => router.push("/login")}>
                  Go to Dashboard <ArrowLeft size={15} className="rotate-180" />
                </Button>
                <Link
                  href="/developer"
                  className="block text-center text-sm text-gray-500 hover:text-gray-700 py-1"
                >
                  Back to API docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1117] items-center justify-center p-12">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 text-sm mb-12">
            <ShieldCheck size={14} />
            <span className="font-medium">Surepay</span>
          </Link>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">One API for all Ethiopian bank verifications</h2>
            <ul className="space-y-4">
              {[
                "Verify receipts from CBE, Dashen, Awash, BOA, Zemen & Telebirr",
                "AI-powered receipt parsing with QR and text extraction",
                "Python SDK, cURL, and REST API support",
                "Real-time results with confidence scoring",
                "100 req/s rate limit per API key",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-300 text-sm">
                  <Check size={16} className="text-green-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 font-mono mb-2">$ curl -X POST /api/v1/verify-link \</p>
              <p className="text-xs text-gray-400 font-mono">  -d &quot;bank_name=cbe&amp;reference=FT25211G11JQ&quot;</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link href="/developer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
              <ArrowLeft size={14} />
              Back to API
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Get your API key</h1>
            <p className="text-gray-500 mt-1 text-sm">Create an account to start integrating.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              id="business_name"
              label="Business Name"
              placeholder="My Business"
              icon={<Building2 size={16} />}
              error={errors.business_name?.message}
              {...register("business_name", { required: "Business name is required" })}
            />

            <Input
              id="full_name"
              label="Your Name"
              placeholder="John Doe"
              icon={<User size={16} />}
              error={errors.full_name?.message}
              {...register("full_name", { required: "Full name is required" })}
            />

            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
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
                placeholder="Min. 8 chars, uppercase, digit"
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
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Generate API Key
            </Button>

            <div className="text-center pt-2">
              <p className="text-xs text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-[#115ce9] font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
