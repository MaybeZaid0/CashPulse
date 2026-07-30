# CashPulse — Frontend Routing & UI Completion Plan

---

## 1. Current Routing State

### Page Structure (Next.js App Router)
```
frontend/src/app/
├── layout.tsx          # Root layout — missing meta tags, missing providers
├── page.tsx            # Home page — renders SMEPortal
├── globals.css         # Tailwind v4 import
└── rm/
    └── page.tsx        # RM page — renders RMPortal
```

### Issues Found
1. **No `ApplicationProvider`** wrapping the component tree (Bug A1-013)
2. **No `layout.tsx` in `/rm/`** — shares root layout
3. **Root `layout.tsx` title is "Create Next App"** (Bug A1-015)
4. **No 404 page**
5. **No loading states**
6. **No error boundaries**
7. **`next.config.ts` is empty** — no API proxy, no rewrites (Bug A3-009)

---

## 2. Fixes Required

### 2.1 Root Layout Fix

**File: `frontend/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CashPulse — AI-Powered SME Financing Platform",
  description: "UBL's intelligent loan assessment and disbursement platform for Small & Medium Enterprises in Pakistan. Powered by 5-pillar scoring, cashflow analysis, and AI recommendations.",
  keywords: ["UBL", "SME", "loan", "financing", "Pakistan", "CashPulse", "credit scoring"],
  authors: [{ name: "UBL Innovation Lab" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-[#F4F7FB] text-[#0E1B2A]">
        {children}
      </body>
    </html>
  );
}
```

### 2.2 Next.js Config Updates

**File: `frontend/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxy for development (avoids CORS issues)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/api/:path*`,
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 2.3 Frontend Environment Variables

**File: `frontend/.env.local`**

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

### 2.4 Loading & Error States

**File: `frontend/src/app/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F7FB]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#0083CA] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-[#5B6B7C]">Loading CashPulse...</p>
      </div>
    </div>
  );
}
```

**File: `frontend/src/app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F7FB]">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-extrabold text-[#012A4A]">404</h1>
        <p className="text-lg font-bold text-[#5B6B7C]">Page not found</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#0083CA] text-white font-bold text-sm rounded-xl hover:bg-[#005B8F] transition-all"
        >
          Go to SME Portal
        </Link>
      </div>
    </div>
  );
}
```

---

## 3. Dead Component Cleanup

These 9 components currently return `null` and should be either:
- **Removed** if truly obsolete, or
- **Implemented** if needed for future features

| Component | Current State | Recommendation |
|-----------|--------------|----------------|
| `Header.tsx` | Returns null | **Implement** — add global navigation bar |
| `RMDashboard.tsx` | Returns null | **Remove** — replaced by `RMPortal.tsx` |
| `RMApplicationDetailModal.tsx` | Returns null | **Remove** — replaced by `AssessmentDashboard.tsx` |
| `FactorDrivers.tsx` | Returns null | **Remove** — functionality in pillar drill-down |
| `ForecastChart.tsx` | Returns null | **Implement** — needed for disbursement forecast |
| `SMEDashboard.tsx` | Returns null | **Remove** — replaced by `SMEPortal.tsx` |
| `ReadinessModal.tsx` | Returns null | **Remove** — replaced by `ReadinessReportModal.tsx` |
| `RequestStatusTracker.tsx` | Returns null | **Remove** — replaced by `ApplicationStatusView.tsx` |
| `TransactionLedger.tsx` | Returns null | **Remove** — functionality in `AccountOverview.tsx` |

### Action: Delete 6 obsolete components, implement 2, keep 1 for future.

---

## 4. Header Component Implementation

```tsx
// frontend/src/components/layout/Header.tsx

"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Shield, ArrowLeftRight } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const isRM = pathname.startsWith("/rm");

  return (
    <header className="bg-[#012A4A] border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#0083CA]/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#00B7E4]" />
            </div>
            <div>
              <span className="text-white font-extrabold text-sm tracking-tight">CashPulse</span>
              <span className="text-[#F2A900] text-[10px] font-bold ml-1">by UBL</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-2">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                !isRM
                  ? "bg-[#0083CA]/20 text-[#00B7E4] border border-[#0083CA]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>SME Portal</span>
            </Link>
            <Link
              href="/rm"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                isRM
                  ? "bg-[#0083CA]/20 text-[#00B7E4] border border-[#0083CA]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>RM Portal</span>
            </Link>
          </nav>

          {/* Portal Switch */}
          <Link
            href={isRM ? "/" : "/rm"}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Switch to {isRM ? "SME" : "RM"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
```

---

## 5. Responsive Design Audit

### Current Issues (NFR-3: No horizontal scroll at 360px)
1. **AssessmentDashboard**: 5-column pillar grid doesn't stack properly on mobile
2. **ReadinessReportModal**: Modal overflows on small screens
3. **PortfolioList**: Table-like layout doesn't adapt to mobile

### Fixes Required
- All grids: `grid-cols-1 md:grid-cols-X`
- Modals: `max-h-[90vh] overflow-y-auto`
- Text: Use responsive font sizes
- Padding: `p-4 sm:p-6`
- Charts: `ResponsiveContainer` already handles this

---

## 6. Accessibility Fixes (A3-005, A3-006)

### ARIA Labels
```tsx
// Score gauge
<div role="progressbar" aria-valuenow={readinessScore} aria-valuemin={0} aria-valuemax={100}
     aria-label={`Financing readiness score: ${readinessScore} out of 100`}>

// Status badges
<span role="status" aria-label={`Application status: ${status}`}>

// Clickable cards
<div role="button" tabIndex={0} aria-expanded={isExpanded}
     onKeyDown={(e) => e.key === 'Enter' && toggleExpand()}
     aria-label={`${pillar.pillarName}: Score ${pillar.score} of ${pillar.maxScore}`}>
```

### Keyboard Navigation
```tsx
// Modal focus trap
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```
