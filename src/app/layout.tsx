import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashPulse - SME Working Capital & Financing Portal",
  description: "UBL Working Capital Financing & Cashflow Dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased overflow-x-hidden">
      <body className="min-h-full flex flex-col font-sans bg-[#F6F6F6] text-[#081921] overflow-x-hidden w-full max-w-full">
        {children}
      </body>
    </html>
  );
}
