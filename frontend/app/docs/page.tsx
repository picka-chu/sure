"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Copy,
  CheckCircle2,
  Globe,
  Code2,
  Terminal,
  Key,
  Cpu,
  BookOpen,
} from "lucide-react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "verify-image", label: "Verify by Image" },
  { id: "verify-link", label: "Verify by Reference" },
  { id: "get-verification", label: "Get Verification" },
  { id: "list-verifications", label: "List Verifications" },
  { id: "manage-keys", label: "Manage API Keys" },
  { id: "sdk", label: "Python SDK" },
  { id: "errors", label: "Errors" },
  { id: "pricing", label: "Pricing & Access" },
];

export default function DocsPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-surface-900 text-surface-100 rounded-xl p-4 sm:p-6 overflow-x-auto text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copy(code, id)}
        className="absolute top-3 right-3 p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied === id ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-surface-100" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <ShieldCheck size={14} className="text-white" />
              </div>
              <span className="font-bold text-lg text-surface-900">Surepay</span>
              <span className="ml-2 text-xs text-surface-400 font-mono">/docs</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm text-surface-500 hover:text-surface-900 transition-colors">Home</Link>
              <Link href="/docs" className="text-sm text-primary-600 font-medium">API Docs</Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-sm"
              >
                Get API Key
              </Link>
            </nav>

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
          <div className="md:hidden bg-white border-t border-surface-100 px-4 py-4 space-y-3">
            <Link href="/" className="block px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg">Home</Link>
            <Link href="/docs" className="block px-3 py-2 text-sm text-primary-600 font-medium bg-primary-50 rounded-lg">API Docs</Link>
            <Link href="/register" className="block px-3 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl text-center">Get API Key</Link>
          </div>
        )}
      </header>

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <aside className="hidden lg:block w-56 shrink-0 pt-12">
              <nav className="sticky top-24 space-y-1">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">API Reference</p>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-surface-500 hover:text-surface-900 hover:bg-surface-50 rounded-lg transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </nav>
            </aside>

            <main className="flex-1 min-w-0 pt-12 pb-24">
              <div className="max-w-3xl">
                <div className="mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-medium mb-4">
                    <Code2 size={12} />
                    Developer API
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 leading-tight">
                    Surepay API Reference
                  </h1>
                  <p className="mt-4 text-lg text-surface-500 leading-relaxed">
                    Integrate bank transfer verification into your applications. Verify receipts, check status, and manage verifications programmatically.
                  </p>
                </div>

                <section id="overview" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Overview</h2>
                  <div className="prose prose-surface max-w-none text-surface-600 space-y-4">
                    <p>
                      The Surepay API lets you verify Ethiopian bank transfer receipts programmatically.
                      All API endpoints are available to businesses on a <strong>paid subscription</strong>.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4 mt-6">
                      {[
                        { icon: Terminal, label: "Base URL", value: "https://api.surepay.et/api/v1" },
                        { icon: Key, label: "Auth", value: "X-API-Key header" },
                        { icon: Cpu, label: "Format", value: "JSON (REST)" },
                        { icon: Code2, label: "SDK", value: "Python (pip install surepay)" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100">
                          <item.icon size={18} className="text-primary-600 shrink-0" />
                          <div>
                            <p className="text-xs text-surface-400">{item.label}</p>
                            <p className="text-sm font-medium text-surface-900">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section id="authentication" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Authentication</h2>
                  <p className="text-surface-600 mb-4">
                    All API requests require an API key sent via the <code className="text-sm bg-surface-100 px-1.5 py-0.5 rounded font-mono text-primary-700">X-API-Key</code> header.
                    Get your API key from the <Link href="/dashboard/owner/settings" className="text-primary-600 font-medium hover:underline">Surepay dashboard</Link> under <strong>Developer &gt; API Keys</strong>.
                  </p>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 mb-6">
                    <div className="flex items-start gap-3">
                      <Key size={18} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800 text-sm">API Access requires a paid subscription</p>
                        <p className="text-sm text-amber-700 mt-1">
                          API keys are only available on Monthly or Yearly plans.{" "}
                          <Link href="/register" className="font-medium underline">Upgrade now</Link> or{" "}
                          <Link href="/docs#pricing" className="font-medium underline">see pricing</Link>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <CodeBlock
                    id="auth-example"
                    code={`# All requests need this header:
X-API-Key: sk-your-api-key-here`}
                  />

                  <div className="mt-6 space-y-3">
                    <h3 className="text-lg font-semibold text-surface-900">Creating an API Key</h3>
                    <p className="text-sm text-surface-600">
                      Log into your dashboard, go to <strong>Developer &gt; API Keys</strong>, and click <strong>Create Key</strong>.
                      Give it a name (e.g., "My App") and copy the key — it is shown only once.
                    </p>
                    <div className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                      <p className="text-sm text-surface-700 flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-primary-500 mt-0.5 shrink-0" />
                        <span>Keys start with <code className="font-mono text-sm bg-surface-200 px-1 rounded">sk-</code> followed by a random string.</span>
                      </p>
                      <p className="text-sm text-surface-700 flex items-start gap-2 mt-2">
                        <CheckCircle2 size={16} className="text-primary-500 mt-0.5 shrink-0" />
                        <span>Store it securely. You cannot see the full key again.</span>
                      </p>
                    </div>
                  </div>
                </section>

                <section id="verify-image" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Verify a Receipt by Image</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-green-600 rounded-md">POST</span>
                    <code className="text-sm font-mono text-surface-800">/api/v1/verify</code>
                  </div>
                  <p className="text-surface-600 mb-4">
                    Upload a receipt image (PNG, JPG, WEBP). The API extracts the QR code and text, detects the bank, finds the reference, and verifies the transaction.
                  </p>

                  <h3 className="text-lg font-semibold text-surface-900 mb-2">Request</h3>
                  <p className="text-sm text-surface-500 mb-3">Multipart form data:</p>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Field</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Type</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Required</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">file</td>
                          <td className="py-2 px-3 text-surface-600">File</td>
                          <td className="py-2 px-3"><span className="text-green-600 font-medium">Yes</span></td>
                          <td className="py-2 px-3 text-surface-600">Receipt image (max 10MB)</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">bank_name</td>
                          <td className="py-2 px-3 text-surface-600">string</td>
                          <td className="py-2 px-3"><span className="text-surface-400">No</span></td>
                          <td className="py-2 px-3 text-surface-600">Hint: cbe, dashen, awash, boa, zemen, telebirr</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">reference</td>
                          <td className="py-2 px-3 text-surface-600">string</td>
                          <td className="py-2 px-3"><span className="text-surface-400">No</span></td>
                          <td className="py-2 px-3 text-surface-600">Transaction reference / FT number</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-lg font-semibold text-surface-900 mb-2">Example (cURL)</h3>
                  <CodeBlock
                    id="curl-verify"
                    code={`curl -X POST https://api.surepay.et/api/v1/verify \\
  -H "X-API-Key: sk-your-api-key" \\
  -F "file=@receipt.jpg" \\
  -F "bank_name=cbe"`}
                  />

                  <h3 className="text-lg font-semibold text-surface-900 mt-6 mb-2">Response</h3>
                  <CodeBlock
                    id="resp-verify"
                    code={`{
  "verification": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "verified",
    "bank_name": "Commercial Bank of Ethiopia",
    "transaction_reference": "FT25211G11JQ",
    "payer_name": "Abebe Kebede",
    "payer_account": "1000XXXXXX1234",
    "receiver_name": "Your Business Name",
    "receiver_account": "1000XXXXXX5678",
    "amount": "15000.00",
    "currency": "ETB",
    "is_verified": true,
    "reason": "Transaction confirmed by Commercial Bank of Ethiopia. Receiver account matches your registered business account.",
    "created_at": "2026-07-23T12:00:00Z"
  }
}`}
                  />
                </section>

                <section id="verify-link" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Verify by Reference Number</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-green-600 rounded-md">POST</span>
                    <code className="text-sm font-mono text-surface-800">/api/v1/verify-link</code>
                  </div>
                  <p className="text-surface-600 mb-4">
                    Verify a transfer using just the bank name and reference number — no image upload needed. The API fetches the receipt directly from the bank.
                  </p>

                  <h3 className="text-lg font-semibold text-surface-900 mb-2">Request</h3>
                  <p className="text-sm text-surface-500 mb-3">Form data:</p>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Field</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Type</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Required</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">bank_name</td>
                          <td className="py-2 px-3 text-surface-600">string</td>
                          <td className="py-2 px-3"><span className="text-green-600 font-medium">Yes</span></td>
                          <td className="py-2 px-3 text-surface-600">cbe, dashen, awash, boa, zemen, telebirr</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">reference</td>
                          <td className="py-2 px-3 text-surface-600">string</td>
                          <td className="py-2 px-3"><span className="text-green-600 font-medium">Yes</span></td>
                          <td className="py-2 px-3 text-surface-600">Transaction reference / FT number</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-lg font-semibold text-surface-900 mb-2">Example (cURL)</h3>
                  <CodeBlock
                    id="curl-verify-link"
                    code={`curl -X POST https://api.surepay.et/api/v1/verify-link \\
  -H "X-API-Key: sk-your-api-key" \\
  -d "bank_name=cbe" \\
  -d "reference=FT25211G11JQ"`}
                  />
                  <p className="text-sm text-surface-500 mt-2">Response is identical to the image upload endpoint.</p>
                </section>

                <section id="get-verification" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Get a Verification</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-md">GET</span>
                    <code className="text-sm font-mono text-surface-800">/api/v1/verifications/{`{id}`}</code>
                  </div>
                  <p className="text-surface-600 mb-4">
                    Retrieve a previous verification result by its UUID.
                  </p>
                  <CodeBlock
                    id="curl-get"
                    code={`curl https://api.surepay.et/api/v1/verifications/550e8400-e29b-41d4-a716-446655440000 \\
  -H "X-API-Key: sk-your-api-key"`}
                  />
                </section>

                <section id="list-verifications" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">List Verifications</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-md">GET</span>
                    <code className="text-sm font-mono text-surface-800">/api/v1/verifications</code>
                  </div>
                  <p className="text-surface-600 mb-4">
                    List all verifications for your business. Paginated, newest first.
                  </p>

                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Parameter</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Type</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Default</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">limit</td>
                          <td className="py-2 px-3 text-surface-600">integer</td>
                          <td className="py-2 px-3 text-surface-600">20</td>
                          <td className="py-2 px-3 text-surface-600">Max 100</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">offset</td>
                          <td className="py-2 px-3 text-surface-600">integer</td>
                          <td className="py-2 px-3 text-surface-600">0</td>
                          <td className="py-2 px-3 text-surface-600">Pagination offset</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <CodeBlock
                    id="curl-list"
                    code={`curl "https://api.surepay.et/api/v1/verifications?limit=50&offset=0" \\
  -H "X-API-Key: sk-your-api-key"`}
                  />

                  <h3 className="text-lg font-semibold text-surface-900 mt-6 mb-2">Response</h3>
                  <CodeBlock
                    id="resp-list"
                    code={`{
  "verifications": [
    {
      "id": "550e8400-...",
      "status": "verified",
      "bank_name": "Commercial Bank of Ethiopia",
      "transaction_reference": "FT25211G11JQ",
      "is_verified": true,
      "reason": "Transaction confirmed...",
      "created_at": "2026-07-23T12:00:00Z"
    }
  ],
  "total": 1
}`}
                  />
                </section>

                <section id="manage-keys" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Manage API Keys</h2>
                  <p className="text-surface-600 mb-6">
                    You can also manage API keys programmatically using the same auth.
                  </p>

                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">Create a Key</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-xs font-bold text-white bg-green-600 rounded-md">POST</span>
                      <code className="text-sm font-mono text-surface-800">/api/v1/keys</code>
                    </div>
                    <CodeBlock
                      id="curl-create-key"
                      code={`curl -X POST https://api.surepay.et/api/v1/keys \\
  -H "X-API-Key: sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Production App"}'`}
                    />
                    <div className="mt-3 p-4 rounded-xl bg-green-50 border border-green-100">
                      <p className="text-sm text-green-800 flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                        <span>The response includes the full key — <strong>copy it now</strong>. You cannot see it again.</span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">List Keys</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-md">GET</span>
                      <code className="text-sm font-mono text-surface-800">/api/v1/keys</code>
                    </div>
                    <CodeBlock
                      id="curl-list-keys"
                      code={`curl https://api.surepay.et/api/v1/keys \\
  -H "X-API-Key: sk-your-api-key"`}
                    />
                    <p className="text-sm text-surface-500 mt-2">Only the key prefix (e.g. <code className="font-mono">sk-aBcDeFgHiJ</code>) is returned. The full key is never exposed.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">Revoke a Key</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-md">DELETE</span>
                      <code className="text-sm font-mono text-surface-800">/api/v1/keys/{`{id}`}</code>
                    </div>
                    <CodeBlock
                      id="curl-delete-key"
                      code={`curl -X DELETE https://api.surepay.et/api/v1/keys/550e8400-e29b-41d4-a716-446655440000 \\
  -H "X-API-Key: sk-your-api-key"`}
                    />
                  </div>
                </section>

                <section id="sdk" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Python SDK</h2>
                  <p className="text-surface-600 mb-4">
                    Use the official <code className="font-mono">surepay</code> Python package for type-safe access.
                  </p>

                  <CodeBlock
                    id="sdk-install"
                    code={`pip install surepay`}
                  />

                  <h3 className="text-lg font-semibold text-surface-900 mt-6 mb-2">Quick Start</h3>
                  <CodeBlock
                    id="sdk-usage"
                    code={`from surepay import Surepay

client = Surepay(api_key="sk-your-api-key")

# Verify a receipt image
result = client.verify("receipt.jpg", bank_name="cbe")
print(f"Verified: {result.is_verified}")
print(f"Amount: {result.amount} {result.currency}")
print(f"Payer: {result.payer_name} ({result.payer_account})")
print(f"Receiver: {result.receiver_name} ({result.receiver_account})")
print(f"Reason: {result.reason}")

# Verify by reference (no image)
result = client.verify_link(bank_name="cbe", reference="FT25211G11JQ")

# List verifications
results = client.list_verifications(limit=50)
for v in results.verifications:
    print(f"{v.id}: {v.status}")

# Manage API keys
key = client.create_api_key(name="My App")
print(f"New key (store safely): {key.key}")

client.revoke_api_key(key_id="key-uuid")`}
                  />

                  <h3 className="text-lg font-semibold text-surface-900 mt-6 mb-2">SDK Reference</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Method</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">verify(file, bank_name?, reference?)</td>
                          <td className="py-2 px-3 text-surface-600">Upload and verify a receipt image</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">verify_link(bank_name, reference)</td>
                          <td className="py-2 px-3 text-surface-600">Verify by bank + reference</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">get_verification(id)</td>
                          <td className="py-2 px-3 text-surface-600">Get a verification result</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">list_verifications(limit, offset)</td>
                          <td className="py-2 px-3 text-surface-600">List verifications</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">create_api_key(name)</td>
                          <td className="py-2 px-3 text-surface-600">Create a new API key</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">list_api_keys()</td>
                          <td className="py-2 px-3 text-surface-600">List API keys</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3 font-mono text-sm text-surface-900">revoke_api_key(id)</td>
                          <td className="py-2 px-3 text-surface-600">Deactivate an API key</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="errors" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Error Handling</h2>
                  <p className="text-surface-600 mb-4">
                    The API returns standard HTTP status codes and a JSON error body.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Status</th>
                          <th className="text-left py-2 px-3 font-medium text-surface-500">Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-green-600 font-mono font-medium">200</span></td>
                          <td className="py-2 px-3 text-surface-600">Success</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-red-600 font-mono font-medium">400</span></td>
                          <td className="py-2 px-3 text-surface-600">Invalid input (e.g. unsupported file type)</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-red-600 font-mono font-medium">401</span></td>
                          <td className="py-2 px-3 text-surface-600">Missing or invalid API key</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-red-600 font-mono font-medium">403</span></td>
                          <td className="py-2 px-3 text-surface-600">Business inactive or no subscription</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-red-600 font-mono font-medium">404</span></td>
                          <td className="py-2 px-3 text-surface-600">Verification not found</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-red-600 font-mono font-medium">413</span></td>
                          <td className="py-2 px-3 text-surface-600">File too large (max 10MB)</td>
                        </tr>
                        <tr className="border-b border-surface-100">
                          <td className="py-2 px-3"><span className="text-red-600 font-mono font-medium">429</span></td>
                          <td className="py-2 px-3 text-surface-600">Rate limit exceeded</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <CodeBlock
                    id="err-example"
                    code={`{
  "error": "Invalid API key format. Must start with 'sk-'"
}`}
                  />
                  <div className="mt-4 p-4 rounded-xl bg-surface-50 border border-surface-100">
                    <p className="text-sm text-surface-700">
                      <strong>Rate limits:</strong> 100 requests/minute per API key by default. Contact support if you need a higher limit.
                    </p>
                  </div>
                </section>

                <section id="pricing" className="mb-16 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-surface-900 mb-4">Pricing & Access</h2>
                  <div className="p-6 rounded-2xl bg-primary-50 border border-primary-100">
                    <div className="flex items-start gap-3">
                      <Key size={20} className="text-primary-600 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-primary-900">API access is available on paid plans only</h3>
                        <p className="text-sm text-primary-700 mt-2">
                          Free trial accounts cannot create API keys. Upgrade to Monthly (ETB 750/mo) or Yearly (ETB 7,500/yr) to unlock the API.
                        </p>
                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                          <Link
                            href="/register"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all"
                          >
                            Start Free Trial
                            <ArrowRight size={14} />
                          </Link>
                          <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-primary-700 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 transition-all"
                          >
                            Sign In to Upgrade
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-surface-200">
                      <h4 className="font-bold text-surface-900">Monthly — ETB 750/mo</h4>
                      <ul className="mt-3 space-y-2">
                        {["Unlimited verifications", "All 6 banks supported", "Staff management", "Analytics dashboard", "API Access + Python SDK", "Email support"].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-surface-600">
                            <CheckCircle2 size={14} className="text-primary-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-5 rounded-2xl border-2 border-primary-500 bg-white">
                      <h4 className="font-bold text-surface-900">Yearly — ETB 7,500/yr</h4>
                      <ul className="mt-3 space-y-2">
                        {["Everything in Monthly", "Priority support", "API Access + Python SDK", "2 months free"].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-surface-600">
                            <CheckCircle2 size={14} className="text-primary-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>

      <footer className="border-t border-surface-100 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-surface-400">
              &copy; {new Date().getFullYear()} Surepay. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xs text-surface-400 hover:text-surface-600">Home</Link>
              <span className="text-surface-200">|</span>
              <Globe size={12} className="text-surface-300" />
              <span className="text-xs text-surface-400">Ethiopia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
