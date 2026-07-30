import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashPulse - SME Working Capital & Financing Portal",
  description: "UBL Working Capital Financing & Cashflow Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#F4F7FB]">{children}</body>
    </html>
  );
}
