"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { subscriptionApi } from "@/lib/api";

const PLANS = [
  {
    plan: "monthly",
    label: "Monthly",
    amount: 750,
    currency: "ETB",
    description: "Billed every month",
    features: ["Unlimited verifications", "All banks supported", "Staff management", "Analytics dashboard", "Email support"],
  },
  {
    plan: "yearly",
    label: "Yearly",
    amount: 7500,
    currency: "ETB",
    description: "Billed annually (2 months free)",
    discount_note: "Save 2 months",
    features: ["Unlimited verifications", "All banks supported", "Staff management", "Analytics dashboard", "Priority support", "Best value"],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await subscriptionApi.getStatus();
      setSubscription(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to load subscription status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const isTrial = subscription?.status === "trial";
  const isActive = subscription?.status === "active";
  const isExpired = subscription?.status === "expired" || subscription?.status === "cancelled";

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Subscription</h1>
        <p className="text-surface-500 mt-1">Manage your plan and billing</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Status</CardTitle>
              <Badge
                variant={
                  isActive ? "success" : isTrial ? "warning" : "danger"
                }
              >
                {isActive && "Active"}
                {isTrial && "Trial"}
                {isExpired && "Expired"}
              </Badge>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {isTrial && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">
                      Free Trial — {subscription.days_remaining} days remaining
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Your 7-day trial ends soon. Subscribe to keep using Sure.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isActive && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800">
                      {subscription.plan === "yearly" ? "Yearly" : "Monthly"} Plan — {subscription.days_remaining} days remaining
                    </p>
                    <p className="text-sm text-emerald-700 mt-1">
                      {subscription.subscription_end_date && `Renews on ${new Date(subscription.subscription_end_date).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-start gap-3">
                  <XCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Subscription Expired</p>
                    <p className="text-sm text-red-700 mt-1">
                      Your subscription has ended. Renew now to regain access.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm pt-2">
              <div className="p-3 rounded-lg bg-surface-50">
                <p className="text-surface-400">Plan</p>
                <p className="font-medium text-surface-900 capitalize">{subscription.plan || "—"}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50">
                <p className="text-surface-400">Status</p>
                <p className="font-medium text-surface-900 capitalize">{subscription.status}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-50">
                <p className="text-surface-400">Days Left</p>
                <p className="font-medium text-surface-900">{subscription.days_remaining}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {(!isActive || isTrial) && (
        <div>
          <h2 className="text-lg font-semibold text-surface-900 mb-4">
            {isActive ? "Switch Plan" : "Choose a Plan"}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <Card key={plan.plan} className={plan.plan === "yearly" ? "ring-2 ring-emerald-500" : ""}>
                <div className="space-y-4">
                  {plan.discount_note && (
                    <Badge variant="success" className="mb-2">
                      {plan.discount_note}
                    </Badge>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-surface-900">{plan.label}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-surface-900">ETB {plan.amount.toLocaleString()}</span>
                      <span className="text-surface-400 text-sm ml-1">/{plan.plan === "monthly" ? "mo" : "yr"}</span>
                    </div>
                    <p className="text-sm text-surface-500 mt-1">{plan.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-surface-600">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.plan === "yearly" ? "primary" : "outline"}
                    onClick={() => router.push(`/owner/subscription/pay/${plan.plan}`)}
                  >
                    {isActive ? "Switch to" : "Get Started with"} {plan.label}
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <PaymentHistory />
        </Card>
      )}
    </div>
  );
}

function PaymentHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionApi.getPaymentHistory().then((res) => {
      setPayments(res.data);
    }).catch(() => {
      console.error("Failed to load payment history");
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-surface-400">Loading...</p>;
  if (payments.length === 0) return <p className="text-sm text-surface-400">No payments yet</p>;

  return (
    <div className="space-y-2">
      {payments.map((p: any) => (
        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
          <div>
            <p className="text-sm font-medium text-surface-900 capitalize">{p.plan_type} — ETB {p.amount.toLocaleString()}</p>
            <p className="text-xs text-surface-400">{new Date(p.created_at).toLocaleDateString()}</p>
          </div>
          <Badge variant={p.status === "verified" ? "success" : p.status === "pending" ? "warning" : "danger"}>
            {p.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
