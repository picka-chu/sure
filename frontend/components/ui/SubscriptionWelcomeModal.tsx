"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  X,
  CreditCard,
  ArrowRight,
  Scan,
  Users,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  businessName: string;
  trialEndDate: string | null;
  daysRemaining: number;
  onClose: () => void;
}

export default function SubscriptionWelcomeModal({ businessName, trialEndDate, daysRemaining, onClose }: Props) {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const steps = [
    {
      title: `Welcome to Surepay, ${businessName}!`,
      subtitle: "Your 7-day free trial has started. Here's what you can do.",
      icon: Sparkles,
      features: [
        { icon: ShieldCheck, text: "Verify bank transfer receipts in real-time" },
        { icon: Scan, text: "Scan QR codes and receipts with your phone" },
        { icon: Users, text: "Add staff members to help with verifications" },
        { icon: TrendingUp, text: "Track analytics and detect payment scams" },
      ],
    },
    {
      title: "Your Subscription Plan",
      subtitle: "After your trial, choose a plan to continue.",
      icon: CreditCard,
      plans: [
        {
          name: "Monthly",
          price: "ETB 750",
          period: "/month",
          features: ["Unlimited verifications", "All banks supported", "Staff management", "Analytics"],
        },
        {
          name: "Yearly",
          price: "ETB 7,500",
          period: "/year",
          features: ["Everything in Monthly", "Priority support", "2 months free"],
          popular: true,
        },
      ],
    },
  ];

  const current = steps[step];

  if (step === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 z-10" aria-label="Close welcome modal">
            <X size={18} />
          </button>

          <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-6 pt-8 pb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">{current.title}</h2>
            <p className="text-primary-100 mt-2">{current.subtitle}</p>

            {daysRemaining > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">
                <Clock size={14} className="text-primary-200" />
                <span className="text-sm text-primary-50 font-medium">{daysRemaining} days remaining in trial</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {current.features?.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <feature.icon size={16} className="text-primary-600" />
                </div>
                <p className="text-sm text-surface-700">{feature.text}</p>
              </div>
            ))}

            <div className="pt-4 space-y-3">
              <Button className="w-full" onClick={() => setStep(1)}>
                See Plans & Pricing <ArrowRight size={16} />
              </Button>
              <button onClick={onClose} className="w-full text-sm text-surface-400 hover:text-surface-600 py-2">
                I'll explore later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 z-10" aria-label="Close welcome modal">
          <X size={18} />
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
            <CreditCard size={32} className="text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-surface-900">{current.title}</h2>
          <p className="text-surface-500 mt-2">{current.subtitle}</p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {current.plans?.map((plan, i) => (
            <div
              key={i}
              className={`relative p-5 rounded-xl border-2 ${
                plan.popular ? "border-primary-500 bg-primary-50/50" : "border-surface-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-primary-600 text-white text-xs font-medium">
                  Best Value
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-surface-900">{plan.name}</h3>
                <div className="text-right">
                  <span className="text-xl font-bold text-surface-900">{plan.price}</span>
                  <span className="text-xs text-surface-400">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-surface-600">
                    <CheckCircle2 size={14} className="text-primary-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="pt-2 space-y-3">
            <Button className="w-full" onClick={() => { onClose(); router.push("/owner/subscription"); }}>
              Choose a Plan <ArrowRight size={16} />
            </Button>
            <button onClick={onClose} className="w-full text-sm text-surface-400 hover:text-surface-600 py-2">
              Continue with trial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
