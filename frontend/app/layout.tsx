import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Surepay - Bank Transfer Verifier",
  description:
    "Verify Ethiopian bank transfer receipts in real-time. Protect your business from payment scams.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Surepay",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#115ce9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script src="/runtime-config.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
