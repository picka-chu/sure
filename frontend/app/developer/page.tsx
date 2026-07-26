"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Key, ArrowRight, Copy, Check, ChevronRight, Code2, Cpu, Zap, Lock, ExternalLink } from "lucide-react";

export default function DeveloperPage() {
  const [pyCopied, setPyCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  const copyCode = async (code: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const pythonCode = `from surepay import Surepay

client = Surepay(
    api_key="sk-your-api-key",
    base_url="https://sure1.onrender.com"
)

# Verify a receipt image
result = client.verify(
    "receipt.jpg",
    bank_name="cbe"
)
print(f"Verified: {result.is_verified}")
print(f"Payer: {result.payer_name}")
print(f"Amount: {result.amount} ETB")`;

  const curlCode = `curl -X POST https://sure1.onrender.com/api/v1/verify \\
  -H "X-API-Key: sk-your-api-key" \\
  -F "file=@receipt.jpg" \\
  -F "bank_name=cbe"`;

  const features = [
    {
      icon: ShieldCheck,
      title: "Real-time Verification",
      desc: "Verify bank transfer receipts in seconds across all major Ethiopian banks.",
    },
    {
      icon: Cpu,
      title: "AI-Powered",
      desc: "Automatic receipt parsing with QR, text extraction, and Gemini AI fallback.",
    },
    {
      icon: Zap,
      title: "High Throughput",
      desc: "Up to 100 requests per second per API key with rate limit management.",
    },
    {
      icon: Lock,
      title: "Secure by Design",
      desc: "API keys are hashed with SHA-256. Keys are shown once and never stored in plaintext.",
    },
  ];

  const endpoints = [
    { method: "POST", path: "/api/v1/verify", desc: "Upload a receipt image for verification" },
    { method: "POST", path: "/api/v1/verify-link", desc: "Verify by bank name + reference (no image)" },
    { method: "GET", path: "/api/v1/verifications/{id}", desc: "Get a verification result by ID" },
    { method: "GET", path: "/api/v1/verifications", desc: "List all verifications (paginated)" },
    { method: "POST", path: "/api/v1/keys", desc: "Create a new API key" },
    { method: "GET", path: "/api/v1/keys", desc: "List all API keys" },
    { method: "DELETE", path: "/api/v1/keys/{id}", desc: "Revoke an API key" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#115ce9] flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">Surepay</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/developer" className="text-sm font-medium text-[#115ce9]">API</Link>
            <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-800">Docs</Link>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">Sign In</Link>
            <Link
              href="/developer/register"
              className="text-sm font-medium bg-[#115ce9] text-white px-4 py-2 rounded-lg hover:bg-[#0f4fce] transition-colors"
            >
              Get API Key
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-sm font-medium text-[#115ce9] mb-6">
            <Code2 size={14} />
            Developer API
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
            Verify bank transfers
            <br />
            <span className="text-[#115ce9]">with a single API call</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-2xl">
            Integrate Ethiopian bank transfer verification into your app, SaaS platform, or
            accounting system. Works with CBE, Dashen, Awash, BOA, Zemen, and Telebirr.
          </p>
          <div className="flex items-center gap-3 mt-8">
            <Link
              href="/developer/register"
              className="inline-flex items-center gap-1.5 bg-[#115ce9] text-white font-medium px-5 py-2.5 rounded-lg hover:bg-[#0f4fce] transition-colors"
            >
              Get Your API Key <ArrowRight size={16} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 text-gray-600 font-medium px-5 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Read the Docs <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-6">
          <div className="bg-[#0d1117] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-500 ml-2">Python SDK</span>
              </div>
              <button onClick={() => copyCode(pythonCode, setPyCopied)} className="text-gray-500 hover:text-gray-300 transition-colors">
                {pyCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <pre className="text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">{pythonCode}</pre>
          </div>

          <div className="bg-[#0d1117] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-500 ml-2">cURL</span>
              </div>
              <button onClick={() => copyCode(curlCode, setCurlCopied)} className="text-gray-500 hover:text-gray-300 transition-colors">
                {curlCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <pre className="text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">{curlCode}</pre>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">Why build on Surepay</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-[#115ce9]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">API Endpoints</h2>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500 w-20">Method</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Path</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.path} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      ep.method === "POST" ? "bg-green-50 text-green-700" :
                      ep.method === "GET" ? "bg-blue-50 text-blue-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-800">{ep.path}</td>
                  <td className="px-5 py-3 text-gray-500">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-[#0d1117] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to integrate?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Get your API key in under 2 minutes. No credit card required.
          </p>
          <Link
            href="/developer/register"
            className="inline-flex items-center gap-1.5 bg-[#115ce9] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#0f4fce] transition-colors"
          >
            Get Your API Key <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ShieldCheck size={14} />
            <span>Surepay &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/docs" className="hover:text-gray-600">Docs</Link>
            <Link href="/" className="hover:text-gray-600">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
