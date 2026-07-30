# CashPulse — SME Portal Enhancements

---

## 1. Current SME Portal State

### Components
| Component | Status | Quality |
|-----------|--------|---------|
| `SMEPortal.tsx` | ✅ Working | Good — tab-based layout, SME selector |
| `AccountOverview.tsx` | ⚠️ Partial | Hardcoded transaction data (Bug A1-022) |
| `LoanApplicationForm.tsx` | ⚠️ Partial | Missing validation, no backend calls, no `loanReason` field |
| `ReadinessScoreGauge.tsx` | ✅ Working | Good — SVG gauge, 4 subscores |
| `ReadinessReportModal.tsx` | ✅ Working | Good — but uses client-side scoring only |
| `ApplicationStatusView.tsx` | ✅ Working | Good — but reads from localStorage only |

---

## 2. Required Enhancements

### 2.1 Loan Application Form — Add AI Reason Field

**Purpose**: SME describes in detail why they need the loan. This text is analyzed by AI for disbursement recommendation.

```tsx
// Add to LoanApplicationForm.tsx state:
const [loanReason, setLoanReason] = useState("");

// Add textarea in form:
<div className="md:col-span-3">
  <label className="block text-xs font-bold text-[#0E1B2A] mb-1.5">
    <FileText className="w-3.5 h-3.5 inline mr-1" />
    Tell us why you need this loan <span className="text-[#D6455B]">*</span>
  </label>
  <textarea
    value={loanReason}
    onChange={(e) => setLoanReason(e.target.value)}
    placeholder="Explain in detail: What will you use the funds for? Do you have confirmed orders or contracts? 
What is your timeline? How will this loan help your business grow?

Example: We need PKR 25 lakh to purchase 3 industrial sewing machines for our garment 
factory expansion in Faisalabad. We have confirmed orders from 2 international buyers 
starting next quarter worth PKR 50 lakh. The machines will arrive within 6 weeks..."
    rows={5}
    minLength={50}
    maxLength={5000}
    className="w-full px-4 py-3 rounded-xl border border-[#E4EBF2] font-medium text-[#0E1B2A] 
    text-sm focus:outline-none focus:border-[#0083CA] focus:ring-2 focus:ring-[#0083CA]/20 resize-none
    placeholder:text-[#5B6B7C]/60"
  />
  <div className="flex justify-between mt-1">
    <p className="text-[10px] text-[#5B6B7C]">
      {loanReason.length < 50 
        ? `Please write at least ${50 - loanReason.length} more characters`
        : "✓ Good detail level"
      }
    </p>
    <p className="text-[10px] text-[#5B6B7C]">
      {loanReason.length}/5000
    </p>
  </div>
</div>
```

### 2.2 Form Validation (Bug A2-012)

```tsx
const validateForm = (): string[] => {
  const errors: string[] = [];
  if (requestedAmount <= 0) errors.push("Loan amount must be greater than 0");
  if (requestedAmount < 50000) errors.push("Minimum loan amount is PKR 50,000");
  if (requestedAmount > 100000000) errors.push("Maximum loan amount is PKR 10 crore");
  if (tenureMonths < 3) errors.push("Minimum tenure is 3 months");
  if (tenureMonths > 60) errors.push("Maximum tenure is 60 months");
  if (!purpose.trim()) errors.push("Please select a loan purpose");
  if (loanReason.length < 50) errors.push("Please provide a detailed reason (min 50 characters)");
  return errors;
};

const handleSubmit = () => {
  const errors = validateForm();
  if (errors.length > 0) {
    setFormErrors(errors);
    return;
  }
  // Proceed with assessment
};
```

### 2.3 Account Overview — Real Transaction Data (Bug A1-022)

Replace hardcoded transactions with actual SME data:

```tsx
// In AccountOverview.tsx — replace hardcoded sampleTransactions

// Option A: Use SME profile's historyInflows/historyOutflows to generate chart
const chartData = sme.historyInflows.map((inflow, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i],
  inflow,
  outflow: sme.historyOutflows[i],
  net: inflow - sme.historyOutflows[i],
}));

// Option B: Fetch from backend API
useEffect(() => {
  async function fetchTransactions() {
    const res = await apiGetSME(sme.id.toString());
    if (res.data?.transactionSummary) {
      setChartData(res.data.transactionSummary);
    }
  }
  fetchTransactions();
}, [sme.id]);
```

### 2.4 Application Status — Real-time Updates

Instead of localStorage polling, connect to backend:

```tsx
// In ApplicationStatusView.tsx — replace localStorage with API

useEffect(() => {
  async function fetchApplications() {
    setLoading(true);
    const res = await apiGetApplications({ smeId: sme.id.toString() });
    if (res.data) {
      setApplications(res.data);
    }
    setLoading(false);
  }
  
  fetchApplications();
  
  // Poll every 30 seconds for status updates
  const interval = setInterval(fetchApplications, 30000);
  return () => clearInterval(interval);
}, [sme.id]);
```

---

## 3. New SME Portal Features

### 3.1 Disbursement Status View (for staged loans)

When an SME's loan is approved with staged disbursement, they should see:

```
┌─────────────────────────────────────────────────────────┐
│ YOUR LOAN DISBURSEMENT SCHEDULE                          │
│                                                          │
│ Total Approved: PKR 30,00,000                           │
│ Disbursement: Staged (3 Phases)                          │
│                                                          │
│ ┌────────────────────────────────────────────────┐      │
│ │ ✅ Stage 1: PKR 10,00,000 — DISBURSED           │      │
│ │    Date: Jul 15, 2026                            │      │
│ │    Credited to: IBAN PK36UBL0109-XXX-PKR        │      │
│ └────────────────────────────────────────────────┘      │
│                                                          │
│ ┌────────────────────────────────────────────────┐      │
│ │ ⏳ Stage 2: PKR 12,00,000 — PENDING              │      │
│ │    Expected: Oct 2026                             │      │
│ │    Status: Bank reviewing your business progress  │      │
│ └────────────────────────────────────────────────┘      │
│                                                          │
│ ┌────────────────────────────────────────────────┐      │
│ │ 🔒 Stage 3: PKR 8,00,000 — LOCKED               │      │
│ │    Expected: Jan 2027                             │      │
│ └────────────────────────────────────────────────┘      │
│                                                          │
│ ℹ️ Each stage is released after we verify your business  │
│ cashflow remains healthy. Keep transacting through your  │
│ UBL account for a smooth process!                        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Loan Purpose Helper (UI Enhancement)

Pre-defined purpose categories with helpful prompts:

```tsx
const PURPOSE_OPTIONS = [
  { value: "inventory", label: "Purchase Inventory/Stock", 
    hint: "Describe what inventory you'll buy and from which suppliers" },
  { value: "equipment", label: "Buy Equipment/Machinery", 
    hint: "Specify the equipment type, brand, and how it increases your capacity" },
  { value: "expansion", label: "Business Expansion", 
    hint: "Describe your expansion plan: new location, new product line, etc." },
  { value: "working_capital", label: "Working Capital/Cash Gap", 
    hint: "Explain the cash gap: delayed receivables, seasonal dip, etc." },
  { value: "renovation", label: "Shop/Office Renovation", 
    hint: "Describe renovation scope and expected impact on business" },
  { value: "vehicle", label: "Purchase Vehicle/Transport", 
    hint: "Vehicle type, purpose, and how it supports your business operations" },
  { value: "other", label: "Other Purpose", 
    hint: "Describe your specific need in detail" },
];
```

### 3.3 SME Onboarding Flow

For new SME users (future enhancement):

```
Step 1: Enter UBL Account Number → Verify
Step 2: Basic business information
Step 3: Connect to transaction history
Step 4: View account overview
Step 5: Apply for financing
```

---

## 4. Recommendations for SME Experience

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 1 | Add "Why is this asked?" tooltips on form fields | Trust building | Low |
| 2 | Show estimated monthly repayment as user types amount | Informed decisions | Low |
| 3 | Add SMS/WhatsApp notifications for status changes | Engagement | Medium |
| 4 | Support Urdu language toggle | Accessibility for Pakistani SMEs | High |
| 5 | Add "Required Documents" checklist (even if auto-verified) | Transparency | Low |
| 6 | Show comparison with similar approved loans ("SMEs like yours...") | Confidence building | Medium |
