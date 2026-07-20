"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, CheckCircle, XCircle, Loader2, Scan, ChevronDown } from "lucide-react";
import { verificationApi } from "@/lib/api";
import type { StaffTodayStats, VerifyResult } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const BANKS = [
  { value: "", label: "Auto-detect from image" },
  { value: "cbe", label: "Commercial Bank of Ethiopia" },
  { value: "dashen", label: "Dashen Bank" },
  { value: "awash", label: "Awash Bank" },
  { value: "boa", label: "Bank of Abyssinia" },
  { value: "zemen", label: "Zemen Bank" },
  { value: "telebirr", label: "Telebirr" },
];

function compressImage(file: File, maxDim = 1200): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: "image/jpeg" }));
      }, "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function StaffPage() {
  const [stats, setStats] = useState<StaffTodayStats>({ total: 0, verified: 0, scam: 0 });
  const [selectedBank, setSelectedBank] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [manualRef, setManualRef] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await verificationApi.staffToday();
      setStats(res.data);
    } catch {
      setLoadError("Failed to load today's stats");
    }
  };

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCapturing(false);
  }, []);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        stopCamera();
        await processImage(file);
      }
    }, "image/jpeg");
  }, [stopCamera]);

  const processImage = async (file: File) => {
    setProcessing(true);
    setStep("Preparing image...");
    const compressed = await compressImage(file);
    setStep("Analyzing with AI...");
    try {
      const res = await verificationApi.capture(compressed, selectedBank || undefined, manualRef || undefined);
      setResult(res.data);
      setStep("");
      loadStats();
    } catch (err: any) {
      setResult({
        is_verified: false,
        matches_business_account: false,
        verification: {
          id: "", business_id: "", status: "failed", currency: "ETB",
          created_at: new Date().toISOString(),
          error_message: err.response?.data?.detail || "Failed to verify. Please try again.",
        },
      } as any);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => { if (result) setShowResult(true); }, [result]);

  const resetCapture = () => { setShowResult(false); setResult(null); setCapturing(false); };

  const verifiedPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  if (showResult && result) return <ResultScreen result={result} onClose={resetCapture} />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#37352f]">Verify Payment</h1>

      {loadError && (
        <div className="p-2.5 rounded bg-[#fde7e5] text-[13px] text-[#c73c3c]">{loadError}</div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-[#37352f]" },
          { label: "Verified", value: stats.verified, color: "text-[#115ce9]" },
          { label: "Scam", value: stats.scam, color: "text-[#e03e3e]" },
        ].map((s) => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-[#9b9a97] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {capturing ? (
        <div className="relative aspect-[3/4] bg-black rounded overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay />
          {cameraActive ? (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-white/40" />
              </div>
              <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                <button onClick={captureFromCamera} className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-full border-4 border-[#37352f]" />
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f7f7f7]">
              <p className="text-[#9b9a97] text-sm">Camera unavailable</p>
            </div>
          )}
          <button onClick={stopCamera} className="absolute top-3 right-3 text-white/70 hover:text-white"><XCircle size={22} /></button>
        </div>
      ) : (
        <div className="space-y-2">
          <input type="text" value={manualRef} onChange={(e) => setManualRef(e.target.value)} placeholder="Reference (optional) — e.g. FT25211G11JQ" className="w-full px-3 py-2 border border-[#e9e9e7] rounded text-[14px] text-[#37352f] placeholder:text-[#9b9a97] focus:outline-none focus:border-[#115ce9]" />
          <div className="relative">
            <button onClick={() => setBankOpen(!bankOpen)} className="w-full flex items-center justify-between px-3 py-2 border border-[#e9e9e7] rounded text-[14px] text-left bg-white hover:bg-[#f7f7f7] transition-colors">
              <span className={selectedBank ? "text-[#37352f]" : "text-[#9b9a97]"}>{BANKS.find((b) => b.value === selectedBank)?.label || "Select bank (optional)"}</span>
              <ChevronDown size={16} className={`text-[#9b9a97] transition-transform ${bankOpen ? "rotate-180" : ""}`} />
            </button>
            {bankOpen && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-[#e9e9e7] rounded shadow-lg overflow-hidden">
                {BANKS.map((b) => (
                  <button key={b.value} onClick={() => { setSelectedBank(b.value); setBankOpen(false); }} className={`w-full text-left px-3 py-2 text-[14px] hover:bg-[#f7f7f7] ${selectedBank === b.value ? "text-[#115ce9]" : "text-[#37352f]"}`}>{b.label}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={startCamera} className="w-full aspect-[3/4] bg-[#f7f7f7] border-2 border-dashed border-[#e9e9e7] rounded flex flex-col items-center justify-center hover:border-[#115ce9] transition-colors">
            <div className="w-12 h-12 rounded-full bg-[#115ce9]/10 flex items-center justify-center mb-2"><Camera size={24} className="text-[#115ce9]" /></div>
            <p className="text-[15px] font-medium text-[#37352f]">Open Camera</p>
            <p className="text-[12px] text-[#9b9a97] mt-0.5">Take photo of receipt</p>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 border border-[#e9e9e7] rounded text-[14px] text-[#37352f] hover:bg-[#e9e9e7] transition-colors flex items-center justify-center gap-2"><Scan size={16} />Upload from Gallery</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileCapture} />

      {processing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <Card className="text-center p-6 max-w-[200px] mx-auto">
            <Loader2 size={32} className="animate-spin text-[#115ce9] mx-auto mb-3" />
            <p className="font-medium text-[#37352f] text-[14px]">{step || "Verifying..."}</p>
          </Card>
        </div>
      )}

      <p className="text-[11px] text-[#9b9a97] text-center">By capturing, you agree the receipt will be verified using the respective bank&apos;s systems</p>
    </div>
  );
}

function ResultScreen({ result, onClose }: { result: VerifyResult; onClose: () => void }) {
  const v = result.verification;
  const isVerified = result.is_verified;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${isVerified ? "bg-[#e6f7e6]" : "bg-[#fde7e5]"}`}>
          {isVerified ? <CheckCircle size={40} className="text-[#1a7d1a]" /> : <XCircle size={40} className="text-[#e03e3e]" />}
        </div>
        <h2 className={`text-2xl font-bold ${isVerified ? "text-[#1a7d1a]" : "text-[#e03e3e]"}`}>
          {isVerified ? "Verified!" : "Suspicious"}
        </h2>
        <p className="text-[#787774] mt-1 text-[14px]">
          {isVerified ? "Receipt matches bank records" : "This receipt could not be verified"}
        </p>
      </div>

      {result.reason && (
        <div className={`p-3 rounded text-[13px] leading-relaxed ${isVerified ? "bg-[#e6f7e6] text-[#1a7d1a]" : "bg-[#fde7e5] text-[#c73c3c]"}`}>
          {result.reason}
        </div>
      )}

      <Card className="space-y-2">
        <p className="text-[10px] font-semibold text-[#9b9a97] uppercase tracking-wider">Receipt Details</p>
        {[
          ["Bank", v.bank_name, "capitalize"],
          ["Reference", v.transaction_reference],
          ["Amount", v.amount != null ? formatCurrency(v.amount, v.currency) : null],
          ["Payer", v.payer_name],
          ["Payer Account", v.payer_account],
          ["Receiver", v.receiver_name],
          ["Receiver Account", v.receiver_account],
        ].map(([label, value]) =>
          value ? (
            <div key={label as string} className="flex justify-between">
              <span className="text-[#787774] text-[13px]">{label as string}</span>
              <span className={`font-medium text-[#37352f] text-[13px] ${label === "Amount" ? "font-bold text-[15px]" : ""}`}>{value as string}</span>
            </div>
          ) : null
        )}
        <div className="border-t border-[#e9e9e7] pt-2 mt-2 flex justify-between">
          <span className="text-[#787774] text-[13px]">Status</span>
          <Badge variant={v.status === "verified" ? "success" : v.status === "scam" ? "danger" : "warning"}>{v.status}</Badge>
        </div>
        {v.error_message && <div className="p-2 rounded bg-[#fde7e5] text-[12px] text-[#c73c3c]">{v.error_message}</div>}
      </Card>

      <button onClick={onClose} className="w-full py-2.5 bg-[#115ce9] text-white rounded font-medium text-[14px] hover:bg-[#0d4fc4] transition-colors">Verify Another</button>
    </div>
  );
}
