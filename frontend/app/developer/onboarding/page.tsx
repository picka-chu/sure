"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Building2, User, Globe, Code2, ArrowRight, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function DeveloperOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("owner_token");
    if (!token) {
      router.push("/developer/login");
      return;
    }
    const user = JSON.parse(localStorage.getItem("owner_user") || "{}");
    if (user.full_name) setName(user.full_name);

    if (!sessionStorage.getItem("just_signed_up") && user.business_name) {
      router.push("/owner/developer");
    }
  }, [router]);

  const handleSubmit = async () => {
    if (!org.trim()) { setError("Organization name is required"); return; }
    setLoading(true);
    setError("");

    const user = JSON.parse(localStorage.getItem("owner_user") || "{}");
    user.business_name = org.trim();
    user.full_name = name.trim() || user.full_name;
    localStorage.setItem("owner_user", JSON.stringify(user));
    sessionStorage.removeItem("just_signed_up");
    router.push("/owner/developer");
  };

  const steps = [
    {
      title: "What's your organization?",
      subtitle: "Your API keys will be associated with this organization.",
      field: (
        <Input
          id="org"
          label="Organization / Business Name"
          placeholder="e.g. Acme Corp"
          icon={<Building2 size={16} />}
          value={org}
          onChange={(e: any) => setOrg(e.target.value)}
        />
      ),
    },
    {
      title: "What's your name?",
      subtitle: "So we know who to talk to.",
      field: (
        <Input
          id="name"
          label="Your Name"
          placeholder="Jane Doe"
          icon={<User size={16} />}
          value={name}
          onChange={(e: any) => setName(e.target.value)}
        />
      ),
    },
    {
      title: "How will you use the API?",
      subtitle: "This helps us improve the service for you.",
      field: (
        <div className="space-y-2">
          {[
            "Payment receipt verification",
            "Identity verification",
            "Fraud detection",
            "Just exploring / prototyping",
          ].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUseCase(option)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                useCase === option
                  ? "border-[#115ce9] bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                useCase === option ? "border-[#115ce9]" : "border-gray-300"
              }`}>
                {useCase === option && <div className="w-2 h-2 rounded-full bg-[#115ce9]" />}
              </div>
              {option}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#115ce9] rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
          <p className="text-gray-500 mt-1 text-sm">Step {step + 1} of {steps.length}</p>
        </div>

        <div className="flex gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                i <= step ? "bg-[#115ce9]" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 mb-1">{steps[step].title}</h2>
          <p className="text-sm text-gray-500 mb-6">{steps[step].subtitle}</p>

          {steps[step].field}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => { setStep(step - 1); setError(""); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (step < steps.length - 1) {
                  if (step === 0 && !org.trim()) { setError("Organization name is required"); return; }
                  setStep(step + 1);
                  setError("");
                } else {
                  handleSubmit();
                }
              }}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#115ce9] hover:bg-[#0f4fce] transition-colors disabled:opacity-50 ${step === 0 ? "flex-1" : ""}`}
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : step < steps.length - 1 ? (
                <>Next <ArrowRight size={14} /></>
              ) : (
                <>Complete <Check size={14} /></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          You can change these later in your settings.
        </p>
      </div>
    </div>
  );
}
