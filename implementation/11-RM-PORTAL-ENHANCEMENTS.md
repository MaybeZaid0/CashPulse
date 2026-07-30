# CashPulse — RM Portal Enhancements

---

## 1. Current RM Portal State

| Component | Status | Issues |
|-----------|--------|--------|
| `RMPortal.tsx` | ⚠️ Partial | Hardcoded login, no backend auth (A1-004) |
| `PortfolioList.tsx` | ⚠️ Partial | Uses localStorage + wrong SME data source (A1-011, A1-012) |
| `AssessmentDashboard.tsx` | ✅ Good | Well-designed but localStorage only for decisions |

---

## 2. Critical Fixes

### 2.1 Backend-Connected Authentication

Replace hardcoded login with backend API:

```tsx
// In RMPortal.tsx — replace handleLogin

const handleLogin = async () => {
  setIsLoading(true);
  setLoginError("");
  
  const result = await apiLogin(loginEmail, loginPassword);
  
  if (result.error) {
    setLoginError(result.error);
    setIsLoading(false);
    return;
  }
  
  // Token is automatically stored by apiLogin()
  setAuthState({
    isAuthenticated: true,
    user: result.data.user,
  });
  setIsLoading(false);
};
```

### 2.2 Backend-Connected Portfolio List

Replace localStorage with API:

```tsx
// In PortfolioList.tsx

const [applications, setApplications] = useState<any[]>([]);
const [smes, setSmes] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadData() {
    setLoading(true);
    
    // Load SMEs from backend
    const smeRes = await apiGetSMEs();
    if (smeRes.data) setSmes(smeRes.data);
    
    // Load applications from backend  
    const appRes = await apiGetApplications();
    if (appRes.data) setApplications(appRes.data);
    
    setLoading(false);
  }
  
  loadData();
  
  // Poll every 30 seconds
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);
```

### 2.3 Backend-Connected RM Decisions

Replace `updateApplication()` (localStorage) with API:

```tsx
// In AssessmentDashboard.tsx — replace handleRmDecision

const handleRmDecision = async (decision: string) => {
  setIsSubmitting(true);
  
  const result = await apiRecordDecision(
    currentApp.assessmentId,
    decision,
    rmNotes
  );
  
  if (result.error) {
    alert(`Error: ${result.error}`);
    setIsSubmitting(false);
    return;
  }
  
  // Also update application status
  await apiUpdateApplicationStatus(currentApp.id, {
    status: decision === "APPROVE" ? "APPROVED" : decision,
    rmNotes,
    assessmentId: currentApp.assessmentId,
  });
  
  setIsSubmitting(false);
  onBack();
};
```

---

## 3. New RM Portal Features

### 3.1 AI Disbursement Recommendation Panel

Add to AssessmentDashboard below the existing recommendation panel:

```tsx
// New section in AssessmentDashboard.tsx

{/* AI Disbursement Analysis */}
{application.loanReason && (
  <div className="bg-white rounded-2xl p-6 border border-[#E4EBF2] shadow-sm space-y-4">
    <div className="flex items-center space-x-2 border-b border-[#E4EBF2] pb-3">
      <Brain className="w-5 h-5 text-[#0083CA]" />
      <h3 className="font-bold text-[#0E1B2A] text-base">
        AI Disbursement Analysis
      </h3>
      <span className="text-[11px] font-bold px-2 py-0.5 bg-[#F2A900]/10 text-[#F2A900] 
             border border-[#F2A900]/20 rounded-full">
        Gemini-Powered
      </span>
    </div>
    
    {/* Purpose category */}
    <div className="flex items-center space-x-2">
      <span className="text-xs text-[#5B6B7C]">Purpose:</span>
      <span className="px-2 py-0.5 bg-[#0083CA]/10 text-[#0083CA] text-xs font-bold rounded">
        {aiAnalysis.purposeCategory}
      </span>
    </div>
    
    {/* Disbursement recommendation */}
    <div className={`p-4 rounded-xl border ${
      aiAnalysis.disbursementRecommendation === "SINGLE"
        ? "bg-[#1E9E5A]/5 border-[#1E9E5A]/20"
        : "bg-[#E8A33D]/5 border-[#E8A33D]/20"
    }`}>
      <div className="flex items-center space-x-2">
        <span className="text-xs font-extrabold">
          RECOMMENDATION: {aiAnalysis.disbursementRecommendation} DISBURSEMENT
        </span>
        <span className="text-xs text-[#5B6B7C]">
          (Confidence: {(aiAnalysis.confidenceScore * 100).toFixed(0)}%)
        </span>
      </div>
      <p className="text-xs text-[#5B6B7C] mt-1">{aiAnalysis.disbursementReason}</p>
    </div>
    
    {/* Staged timeline (if staged) */}
    {aiAnalysis.suggestedStages && aiAnalysis.suggestedStages.length > 1 && (
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#0E1B2A]">Suggested Stages:</span>
        <div className="flex items-center space-x-3">
          {aiAnalysis.suggestedStages.map((stage, idx) => (
            <React.Fragment key={idx}>
              <div className="flex-1 p-3 bg-[#F4F7FB] rounded-xl border border-[#E4EBF2] text-center">
                <span className="text-[10px] text-[#5B6B7C] block">Stage {stage.stageNumber}</span>
                <span className="text-sm font-extrabold text-[#0E1B2A]">
                  PKR {stage.amount.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#0083CA] block font-bold">{stage.timing}</span>
              </div>
              {idx < aiAnalysis.suggestedStages.length - 1 && (
                <span className="text-[#5B6B7C]">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    )}
    
    {/* Risk & positive indicators */}
    <div className="grid grid-cols-2 gap-3">
      {aiAnalysis.riskIndicators.length > 0 && (
        <div className="p-3 bg-[#D6455B]/5 rounded-xl border border-[#D6455B]/20 space-y-1">
          <span className="text-[10px] font-bold text-[#D6455B] uppercase">Risk Factors</span>
          {aiAnalysis.riskIndicators.map((r, i) => (
            <p key={i} className="text-[11px] text-[#5B6B7C]">• {r}</p>
          ))}
        </div>
      )}
      {aiAnalysis.positiveIndicators.length > 0 && (
        <div className="p-3 bg-[#1E9E5A]/5 rounded-xl border border-[#1E9E5A]/20 space-y-1">
          <span className="text-[10px] font-bold text-[#1E9E5A] uppercase">Positive Factors</span>
          {aiAnalysis.positiveIndicators.map((p, i) => (
            <p key={i} className="text-[11px] text-[#5B6B7C]">• {p}</p>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

### 3.2 Print/Report Mode (Bug A3-012 — F-12)

Complete the F-12 printable report view:

```tsx
// In AssessmentDashboard.tsx — when isPrintMode is true

{isPrintMode && (
  <div className="print:block space-y-6 bg-white p-8 rounded-2xl border">
    {/* Printable Header */}
    <div className="text-center border-b pb-4">
      <h1 className="text-xl font-extrabold">CREDIT ASSESSMENT REPORT</h1>
      <p className="text-sm text-[#5B6B7C]">United Bank Limited — CashPulse Platform</p>
      <p className="text-xs text-[#5B6B7C] mt-1">
        Report Generated: {new Date().toLocaleDateString()} | 
        Assessment ID: {currentApp.assessmentId}
      </p>
    </div>
    
    {/* Summary Table */}
    <table className="w-full text-xs border-collapse">
      <tbody>
        <tr className="border-b"><td className="py-2 font-bold">SME Name:</td><td>{currentApp.smeName}</td></tr>
        <tr className="border-b"><td className="py-2 font-bold">Sector:</td><td>{currentApp.sector}</td></tr>
        <tr className="border-b"><td className="py-2 font-bold">Requested Amount:</td><td>PKR {currentApp.requestedAmount.toLocaleString()}</td></tr>
        <tr className="border-b"><td className="py-2 font-bold">Tenure:</td><td>{currentApp.tenureMonths} Months</td></tr>
        <tr className="border-b"><td className="py-2 font-bold">Readiness Score:</td><td>{readinessScore}/100 ({band.label})</td></tr>
        <tr className="border-b"><td className="py-2 font-bold">Recommendation:</td><td>{recommendation.type}</td></tr>
        <tr className="border-b"><td className="py-2 font-bold">Recommended Amount:</td><td>PKR {eligibility.recommendedAmount.toLocaleString()}</td></tr>
      </tbody>
    </table>
    
    {/* 5 Pillar Scores */}
    <div>
      <h2 className="font-bold text-sm mb-2">5 Banking Pillar Scores</h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#F4F7FB]">
            <th className="py-2 px-3 text-left">Pillar</th>
            <th className="py-2 px-3">Score</th>
            <th className="py-2 px-3">Weight</th>
            <th className="py-2 px-3 text-left">Key Evidence</th>
          </tr>
        </thead>
        <tbody>
          {pillarEvidences.map((p, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 px-3 font-bold">{p.pillarName}</td>
              <td className="py-2 px-3 text-center">{p.score}/{p.maxScore}</td>
              <td className="py-2 px-3 text-center">{p.weight}</td>
              <td className="py-2 px-3">{p.evidenceLines[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Print button */}
    <div className="print:hidden text-center">
      <button onClick={() => window.print()} className="px-6 py-2 bg-[#012A4A] text-white rounded-xl font-bold text-xs">
        Print Report
      </button>
    </div>
  </div>
)}
```

### 3.3 RM Analytics Dashboard (New Feature)

Overview dashboard showing aggregate metrics:

```
┌──────────────────────────────────────────────────────────────┐
│ RM ANALYTICS OVERVIEW                                        │
│                                                              │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│ │  47    │  │  12    │  │  8     │  │  PKR   │            │
│ │ Total  │  │ Under  │  │ Approved│  │ 3.2Cr  │            │
│ │ Cases  │  │ Review │  │ Today  │  │ Disbursed│           │
│ └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                              │
│ Score Distribution          Sector Breakdown                 │
│ ┌─────────────────┐        ┌─────────────────┐             │
│ │ ███ Strong: 18   │        │ Textile: 28%    │             │
│ │ ███ Review: 21   │        │ F&B: 22%        │             │
│ │ ███ High Risk: 8 │        │ Retail: 18%     │             │
│ └─────────────────┘        │ IT: 15%         │             │
│                             │ Other: 17%      │             │
│                             └─────────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Application Queue View Enhancement

Add filtering and sorting to PortfolioList:

```tsx
// Enhanced PortfolioList with filters

const [statusFilter, setStatusFilter] = useState<string>("ALL");
const [sortBy, setSortBy] = useState<"date" | "score" | "amount">("date");
const [searchTerm, setSearchTerm] = useState("");

// Filter controls
<div className="flex items-center space-x-3">
  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
    className="px-3 py-1.5 rounded-xl border text-xs font-bold">
    <option value="ALL">All Status</option>
    <option value="PENDING">Pending Review</option>
    <option value="ASSESSED">Assessed</option>
    <option value="APPROVED">Approved</option>
    <option value="COUNTER_OFFER">Counter Offered</option>
    <option value="MANUAL_REVIEW">Manual Review</option>
    <option value="REJECTED">Rejected</option>
  </select>
  
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search SME name, sector, or ID..."
    className="px-3 py-1.5 rounded-xl border text-xs w-64"
  />
</div>
```

---

## 5. Recommendations for RM Workflow Efficiency

| # | Enhancement | Value | Effort |
|---|------------|-------|--------|
| 1 | Bulk assessment: Select multiple SMEs and assess together | Saves 5-10 min/day | Medium |
| 2 | Decision templates: Pre-written rejection/approval reasons | Consistency | Low |
| 3 | RM-to-RM case transfer | Team collaboration | Medium |
| 4 | Quick-view comparison: Compare 2-3 SMEs side-by-side | Better decisions | Medium |
| 5 | Export to Excel: Download portfolio data | Offline review | Low |
| 6 | Notification center: Bell icon with pending action alerts | Prioritization | Medium |
