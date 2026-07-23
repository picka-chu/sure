"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Scan,
  TrendingUp,
  Smartphone,
  Users,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Star,
  Clock,
  CreditCard,
  Globe,
  Lock,
  ChevronRight,
  Code2,
} from "lucide-react";

const features = [
  {
    icon: Scan,
    title: "Real-Time Verification",
    description: "Scan and verify CBE, Dashen, Awash, BOA, Zemen & Telebirr receipts instantly.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Built for Ethiopian businesses. Works on any phone with a camera.",
  },
  {
    icon: Users,
    title: "Staff Management",
    description: "Add staff members with unique PINs. Control who can verify receipts.",
  },
  {
    icon: TrendingUp,
    title: "Analytics Dashboard",
    description: "Track verifications, detect scam attempts, and monitor daily activity.",
  },
  {
    icon: ShieldCheck,
    title: "Fraud Detection",
    description: "AI-powered receipt analysis flags suspicious payments before they cost you.",
  },
  {
    icon: Code2,
    title: "Developer API",
    description: "Integrate payment verification into your apps. REST API + Python SDK available on paid plans.",
  },
];

const steps = [
  { step: "01", title: "Register", description: "Create your business account in under 2 minutes." },
  { step: "02", title: "Add Bank Accounts", description: "Link your CBE, Dashen, or other bank accounts." },
  { step: "03", title: "Train Your Staff", description: "Invite staff with secure PIN-based login." },
  { step: "04", title: "Start Verifying", description: "Scan customer receipts and get instant results." },
];

const stats = [
  { value: "10,000+", label: "Receipts Verified" },
  { value: "98.5%", label: "Accuracy Rate" },
  { value: "6", label: "Banks Supported" },
  { value: "4.9★", label: "User Rating" },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-surface-100" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl text-surface-900">Surepay</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo("features")} className="text-sm text-surface-600 hover:text-surface-900 transition-colors">Features</button>
              <button onClick={() => scrollTo("how-it-works")} className="text-sm text-surface-600 hover:text-surface-900 transition-colors">How It Works</button>
              <button onClick={() => scrollTo("pricing")} className="text-sm text-surface-600 hover:text-surface-900 transition-colors">Pricing</button>
              <Link href="/docs" className="text-sm text-surface-600 hover:text-surface-900 transition-colors">API</Link>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-surface-700 hover:text-surface-900 transition-colors">
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Get Started Free
              </Link>
            </div>

            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-100"
              aria-label={mobileMenu ? "Close menu" : "Open menu"}
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-surface-100 px-4 py-4 space-y-3 animate-fade-in">
            <button onClick={() => scrollTo("features")} className="block w-full text-left px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg">Features</button>
            <button onClick={() => scrollTo("how-it-works")} className="block w-full text-left px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg">How It Works</button>
            <button onClick={() => scrollTo("pricing")} className="block w-full text-left px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg">Pricing</button>
            <Link href="/docs" className="block w-full text-left px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg">API</Link>
            <hr className="border-surface-100" />
            <Link href="/login" className="block px-3 py-2 text-sm font-medium text-surface-700">Sign In</Link>
            <Link href="/register" className="block px-3 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl text-center">Get Started Free</Link>
          </div>
        )}
      </header>

      <section className="relative pt-24 lg:pt-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 via-white to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary-200/30 via-primary-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-6 animate-fade-in">
              <Star size={14} />
              Loved by Ethiopian businesses
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight tracking-tight">
              Verify Bank Transfers{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
                in Real-Time
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-surface-500 max-w-2xl mx-auto leading-relaxed">
              Protect your Ethiopian business from payment scams. Instantly verify CBE, Dashen, Awash, and other bank receipts — no more fake payment screenshots.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight size={18} />
              </Link>
              <button
                onClick={() => scrollTo("features")}
                className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-surface-700 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors border border-surface-200 inline-flex items-center justify-center gap-2"
              >
                Learn More
              </button>
            </div>
          </div>

          <div className="mt-16 lg:mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none z-10" />
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-surface-200 shadow-2xl shadow-primary-100/50 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-50 border-b border-surface-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-surface-400 font-mono">surepay.app/dashboard</span>
              </div>
              <div className="p-6 sm:p-10">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {["Total Verifications", "Verified Today", "Scam Detected"].map((label, i) => (
                    <div key={label} className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                      <p className="text-xs text-surface-400">{label}</p>
                      <p className={`text-2xl font-bold mt-1 ${i === 2 ? "text-red-600" : "text-primary-600"}`}>
                        {i === 0 ? "1,247" : i === 1 ? "38" : "12"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Abebe Kebede", bank: "CBE", amount: "ETB 15,000", status: "Verified" },
                    { name: "Meron Alemu", bank: "Dashen", amount: "ETB 8,500", status: "Verified" },
                    { name: "Yonas Tadesse", bank: "Awash", amount: "ETB 22,000", status: "Scam" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-surface-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.status === "Verified" ? "bg-primary-500" : "bg-red-500"}`} />
                        <div>
                          <p className="text-sm font-medium text-surface-900">{item.name}</p>
                          <p className="text-xs text-surface-400">{item.bank}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-surface-900">{item.amount}</p>
                        <p className={`text-xs ${item.status === "Verified" ? "text-primary-600" : "text-red-600"}`}>{item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Everything you need to prevent payment fraud
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              Stop guessing. Start verifying. Surepay gives Ethiopian businesses the tools to eliminate fake receipts.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-surface-100 hover:border-primary-100 hover:shadow-lg hover:shadow-primary-50/50 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <f.icon size={20} className="text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{f.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-gradient-to-b from-surface-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary-600">{s.value}</p>
                <p className="mt-2 text-sm text-surface-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Get started in 4 simple steps
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              From registration to first verification in less than 5 minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary-600">{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{s.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 lg:py-28 bg-gradient-to-br from-primary-50/50 via-white to-primary-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              Start with a 7-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                name: "Monthly",
                price: "ETB 750",
                period: "/month",
                features: ["Unlimited verifications", "All banks supported", "Staff management", "Analytics dashboard", "API Access + Python SDK", "Email support"],
                popular: false,
              },
              {
                name: "Yearly",
                price: "ETB 7,500",
                period: "/year",
                features: ["Everything in Monthly", "Priority support", "API Access + Python SDK", "2 months free", "Best value"],
                popular: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                  plan.popular
                    ? "border-primary-500 bg-white shadow-xl shadow-primary-100/50 scale-[1.02]"
                    : "border-surface-200 bg-white hover:border-surface-300"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary-600 text-white text-xs font-medium">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-surface-900">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-surface-900">{plan.price}</span>
                  <span className="text-surface-400 text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-surface-600">
                      <CheckCircle2 size={16} className="text-primary-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/register`}
                  className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                    plan.popular
                      ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg"
                      : "border-2 border-surface-200 text-surface-700 hover:border-surface-300 hover:bg-surface-50"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-sm text-surface-400">
              Pay via CBE Bank (1000602869893) or Telebirr (0930529985).{" "}
              <Link href="/register" className="text-primary-600 font-medium hover:underline">Start your free trial</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-6">
            Ready to protect your business?
          </h2>
          <p className="text-lg text-surface-500 max-w-2xl mx-auto mb-10">
            Join hundreds of Ethiopian businesses using Surepay to verify receipts and eliminate payment fraud.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-xl active:scale-[0.98]"
          >
            Get Started Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-surface-100 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-white" />
                </div>
                <span className="font-bold text-surface-900">Surepay</span>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed">
                Real-time bank transfer verification for Ethiopian businesses. Stop payment scams before they happen.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-surface-900 mb-4">Product</h4>
              <div className="space-y-2">
                <button onClick={() => scrollTo("features")} className="block text-sm text-surface-500 hover:text-surface-700 transition-colors">Features</button>
                <button onClick={() => scrollTo("pricing")} className="block text-sm text-surface-500 hover:text-surface-700 transition-colors">Pricing</button>
                <Link href="/docs" className="block text-sm text-surface-500 hover:text-surface-700 transition-colors">API / Docs</Link>
                <Link href="/login" className="block text-sm text-surface-500 hover:text-surface-700 transition-colors">Sign In</Link>
                <Link href="/register" className="block text-sm text-surface-500 hover:text-surface-700 transition-colors">Register</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-surface-900 mb-4">Supported Banks</h4>
              <div className="space-y-2">
                {["CBE", "Dashen Bank", "Awash Bank", "Bank of Abyssinia", "Zemen Bank", "Telebirr"].map((b) => (
                  <p key={b} className="text-sm text-surface-500">{b}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-surface-400">
              &copy; {new Date().getFullYear()} Surepay. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Globe size={14} className="text-surface-300" />
              <span className="text-xs text-surface-400">Ethiopia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
