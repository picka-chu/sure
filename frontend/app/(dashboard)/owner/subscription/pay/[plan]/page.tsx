"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Smartphone,
  Building2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { subscriptionApi } from "@/lib/api";

export default function PayPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan } = use(params);
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<"cbe" | "telebirr" | null>(null);
  const [accounts, setAccounts] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [txRef, setTxRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copiedCbe, setCopiedCbe] = useState(false);
  const [copiedTele, setCopiedTele] = useState(false);

  useEffect(() => {
    subscriptionApi.getPaymentAccounts().then((res) => setAccounts(res.data)).catch(() => {});
  }, []);

  const isYearly = plan === "yearly";
  const amount = isYearly ? 7500 : 750;
  const label = isYearly ? "Yearly" : "Monthly";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      setError("Select a payment method");
      return;
    }
    if (!file) {
      setError("Upload a payment screenshot");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("plan_type", plan);
    formData.append("payment_method", paymentMethod);
    formData.append("screenshot", file);
    if (senderName) formData.append("sender_name", senderName);
    if (senderAccount) formData.append("sender_account", senderAccount);
    if (txRef) formData.append("transaction_reference", txRef);

    try {
      await subscriptionApi.submitPayment(formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Payment Submitted!</h1>
          <p className="text-surface-500 mt-2">
            Your {label} plan payment is being reviewed. We'll activate your subscription once verified (usually within 24 hours).
          </p>
        </div>
        <Button className="w-full" onClick={() => router.push("/owner/subscription")}>
          Back to Subscription
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-surface-900">Complete Payment</h1>
        <p className="text-surface-500 mt-1">{label} Plan — ETB {amount.toLocaleString()}</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Choose Payment Method</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <button
            onClick={() => setPaymentMethod("cbe")}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              paymentMethod === "cbe"
                ? "border-emerald-500 bg-emerald-50"
                : "border-surface-200 hover:border-surface-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Building2 size={20} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-surface-900">CBE Bank Transfer</p>
                <p className="text-sm text-surface-500">Commercial Bank of Ethiopia</p>
              </div>
              {paymentMethod === "cbe" && <CheckCircle2 size={20} className="text-emerald-600" />}
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod("telebirr")}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              paymentMethod === "telebirr"
                ? "border-emerald-500 bg-emerald-50"
                : "border-surface-200 hover:border-surface-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Smartphone size={20} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-surface-900">Telebirr</p>
                <p className="text-sm text-surface-500">Ethio telecom mobile money</p>
              </div>
              {paymentMethod === "telebirr" && <CheckCircle2 size={20} className="text-emerald-600" />}
            </div>
          </button>
        </div>
      </Card>

      {paymentMethod && accounts[paymentMethod] && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Send Payment</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-800 mb-3">Send exactly ETB {amount.toLocaleString()} to:</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white">
                  <div>
                    <p className="text-xs text-surface-400">Bank</p>
                    <p className="text-sm font-medium text-surface-900">{accounts[paymentMethod].bank_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white">
                  <div>
                    <p className="text-xs text-surface-400">Account Holder</p>
                    <p className="text-sm font-medium text-surface-900">{accounts[paymentMethod].account_holder}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white">
                  <div>
                    <p className="text-xs text-surface-400">Account Number</p>
                    <p className="text-sm font-bold text-surface-900">{accounts[paymentMethod].account_number}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(accounts[paymentMethod].account_number, paymentMethod === "cbe" ? setCopiedCbe : setCopiedTele)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600"
                  >
                    {(paymentMethod === "cbe" ? copiedCbe : copiedTele) ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <CardTitle className="text-sm">Optional: Sender Details</CardTitle>
              <input
                type="text"
                placeholder="Your name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Your account/phone number"
                value={senderAccount}
                onChange={(e) => setSenderAccount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Transaction reference (if available)"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </Card>
      )}

      {paymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Upload Payment Screenshot</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <label className="block">
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-surface-300 hover:border-emerald-400 cursor-pointer transition-colors bg-surface-50">
                <Upload size={32} className="text-surface-400 mb-2" />
                <p className="text-sm font-medium text-surface-600">Click to upload screenshot</p>
                <p className="text-xs text-surface-400 mt-1">PNG, JPG — Max 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </label>

            {preview && (
              <div className="rounded-xl overflow-hidden border border-surface-200">
                <img src={preview} alt="Payment screenshot preview" className="w-full" />
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit} loading={loading} disabled={!file}>
              <Upload size={16} />
              Submit Payment for Verification
            </Button>

            <p className="text-xs text-surface-400 text-center">
              Our team will verify your payment within 24 hours. Your subscription will be activated once confirmed.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
