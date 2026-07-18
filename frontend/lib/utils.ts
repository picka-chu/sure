import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ETB"): string {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-ET", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function getBankColor(bank: string): string {
  const colors: Record<string, string> = {
    cbe: "bg-green-100 text-green-800",
    dashen: "bg-blue-100 text-blue-800",
    awash: "bg-yellow-100 text-yellow-800",
    boa: "bg-purple-100 text-purple-800",
    zemen: "bg-red-100 text-red-800",
    telebirr: "bg-cyan-100 text-cyan-800",
  };
  return colors[bank.toLowerCase()] || "bg-gray-100 text-gray-800";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-800",
    scam: "bg-red-100 text-red-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-gray-100 text-gray-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

export function getBankName(bankId: string): string {
  const names: Record<string, string> = {
    cbe: "CBE",
    dashen: "Dashen Bank",
    awash: "Awash Bank",
    boa: "Bank of Abyssinia",
    zemen: "Zemen Bank",
    telebirr: "Telebirr",
  };
  return names[bankId.toLowerCase()] || bankId;
}
