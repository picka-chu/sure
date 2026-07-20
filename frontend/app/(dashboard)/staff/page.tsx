"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle, XCircle, Loader2, Scan, ShieldCheck } from "lucide-react";
import { verificationApi } from "@/lib/api";
import { StaffTodayStats, VerifyResult } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function StaffPage() {
  const [stats, setStats] = useState<StaffTodayStats>({
    total: 0,
    verified: 0,
    scam: 0,
  });
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadStats();
  }, []);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
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
    setCapturing(false);
    try {
      const res = await verificationApi.capture(file);
      setResult(res.data);
      setShowResult(true);
      loadStats();
    } catch (err: any) {
      setResult({
        is_verified: false,
        matches_business_account: false,
        verification: {
          id: "",
          business_id: "",
          status: "failed",
          currency: "ETB",
          created_at: new Date().toISOString(),
          error_message:
            err.response?.data?.detail || "Failed to verify. Please try again.",
        },
      } as any);
      setShowResult(true);
    } finally {
      setProcessing(false);
    }
  };

  const resetCapture = () => {
    setShowResult(false);
    setResult(null);
    setCapturing(false);
  };

  const verifiedPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  if (showResult && result) {
    return (
      <ResultScreen
        result={result}
        onClose={resetCapture}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-surface-900">Verify Payment</h1>
        <p className="text-sm text-surface-500 mt-1">Scan customer receipt to verify</p>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-2">
          <XCircle size={14} />
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-surface-900">{stats.total}</p>
          <p className="text-xs text-surface-400 mt-1">Total</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary-600">{stats.verified}</p>
          <p className="text-xs text-surface-400 mt-1">Verified</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-red-600">{stats.scam}</p>
          <p className="text-xs text-surface-400 mt-1">Scam</p>
        </Card>
      </div>

      {stats.total > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-surface-100">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-surface-500">Success Rate</span>
            <span className="font-semibold text-surface-900">{verifiedPct}%</span>
          </div>
          <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${verifiedPct}%` }}
            />
          </div>
        </div>
      )}

      {capturing ? (
        <div className="relative aspect-[3/4] bg-black rounded-[3px] overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
          />
          {cameraActive && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/40" />
              </div>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                <button onClick={captureFromCamera} className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <div className="w-14 h-14 rounded-full border-4 border-[#37352f]" />
                </button>
              </div>
            </>
          )}
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f7f7f7]">
              <p className="text-[#9b9a97] text-sm">Unable to access camera</p>
            </div>
          )}
          <button onClick={stopCamera} className="absolute top-3 right-3 text-white/70 hover:text-white" aria-label="Close camera">
            <XCircle size={22} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={startCamera} className="w-full aspect-[3/4] bg-[#f7f7f7] border-2 border-dashed border-[#e9e9e7] rounded-[3px] flex flex-col items-center justify-center hover:border-[#115ce9] transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#115ce9]/10 flex items-center justify-center mb-3">
              <Camera size={28} className="text-[#115ce9]" />
            </div>
            <p className="text-[15px] font-medium text-[#37352f]">Open Camera</p>
            <p className="text-[13px] text-[#9b9a97] mt-1">Take photo of receipt</p>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border border-[#e9e9e7] rounded-[3px] text-[14px] text-[#37352f] hover:bg-[#e9e9e7] transition-colors flex items-center justify-center gap-2">
            <Scan size={16} />
            Upload Image from Gallery
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileCapture}
      />

      {processing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <Card className="text-center p-8 max-w-xs mx-auto">
            <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
            <p className="font-medium text-surface-900">Verifying...</p>
            <p className="text-sm text-surface-500 mt-1">
              Checking with bank servers
            </p>
          </Card>
        </div>
      )}

      <div className="text-center text-xs text-surface-400 pb-4">
        <p>
          By capturing, you agree that the receipt will be verified
          <br />
          using the respective bank&apos;s systems
        </p>
      </div>
    </div>
  );
}

function ResultScreen({
  result,
  onClose,
}: {
  result: VerifyResult;
  onClose: () => void;
}) {
  const v = result.verification;
  const isVerified = result.is_verified;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center">
        {isVerified ? (
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-100 mb-4">
            <CheckCircle size={48} className="text-primary-600" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-4">
            <XCircle size={48} className="text-red-600" />
          </div>
        )}
        <h2
          className={`text-2xl font-bold ${
            isVerified ? "text-primary-700" : "text-red-700"
          }`}
        >
          {isVerified ? "Payment Verified!" : "Suspicious Payment"}
        </h2>
        <p className="text-surface-500 mt-1">
          {isVerified
            ? "This receipt matches the bank records"
            : "This receipt could not be verified"}
        </p>
      </div>

      <Card className="space-y-3">
        {v.bank_name && (
          <div className="flex justify-between">
            <span className="text-surface-500">Bank</span>
            <span className="font-medium capitalize">{v.bank_name}</span>
          </div>
        )}
        {v.amount != null && (
          <div className="flex justify-between">
            <span className="text-surface-500">Amount</span>
            <span className="font-bold text-lg">
              {formatCurrency(v.amount, v.currency)}
            </span>
          </div>
        )}
        {v.payer_name && (
          <div className="flex justify-between">
            <span className="text-surface-500">Payer</span>
            <span className="font-medium">{v.payer_name}</span>
          </div>
        )}
        {v.receiver_name && (
          <div className="flex justify-between">
            <span className="text-surface-500">Receiver</span>
            <span className="font-medium">{v.receiver_name}</span>
          </div>
        )}
        {v.transaction_reference && (
          <div className="flex justify-between">
            <span className="text-surface-500">Reference</span>
            <span className="font-medium text-xs">{v.transaction_reference}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-surface-500">Status</span>
          <Badge
            variant={
              v.status === "verified"
                ? "success"
                : v.status === "scam"
                ? "danger"
                : "warning"
            }
          >
            {v.status}
          </Badge>
        </div>
        {v.error_message && (
          <div className="p-3 rounded-xl bg-amber-50 text-sm text-amber-800">
            {v.error_message}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          Verify Another
        </button>
      </div>
    </div>
  );
}
