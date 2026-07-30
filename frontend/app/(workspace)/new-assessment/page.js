"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";

function AssessmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const smeId = searchParams.get("smeId") || "";

  const [step, setStep] = useState(1);
  const [loan, setLoan] = useState("");
  const [tenure, setTenure] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = (e) => {
    e.preventDefault();
    if (!loan || !tenure) {
      setError("Please fill in all fields.");
      return;
    }
    setStep(2);
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = await API.createAssessment(smeId, parseFloat(loan), parseInt(tenure));
      router.push(`/dashboard/${data.id}`);
    } catch (err) {
      setError(err.message || "Failed to create assessment");
      setLoading(false);
      setStep(1);
    }
  };

  if (loading) {
    return (
      <div className="analyzing">
        <h2>Synthesizing Financial Profile</h2>
        <div className="ring-load"></div>
        <div className="steps-log">
          Applying scoring model...
        </div>
      </div>
    );
  }

  return (
    <div className="flow">
      <div className="steps">
        <div className={`st ${step >= 1 ? (step > 1 ? "done" : "on") : ""}`}><div className="n">{step > 1 ? "✓" : "1"}</div> SME Details</div>
        <div className="bar"></div>
        <div className={`st ${step >= 2 ? (step > 2 ? "done" : "on") : ""}`}><div className="n">{step > 2 ? "✓" : "2"}</div> Facility Details</div>
        <div className="bar"></div>
        <div className="st"><div className="n">3</div> Assessment</div>
      </div>

      <div className="card" style={{ padding: 32 }}>
        {error && <div style={{ color: "var(--danger)", marginBottom: 20 }}>{error}</div>}
        
        {step === 1 && (
          <form onSubmit={handleStart}>
            <h3 style={{ fontSize: 20, marginBottom: 6 }}>Configure Loan Request</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 26 }}>Enter the facility details requested by the SME.</p>
            
            <div className="formrow">
              <div>
                <label>Requested Amount (PKR)</label>
                <input type="number" className="inp" placeholder="e.g. 5000000" value={loan} onChange={e => setLoan(e.target.value)} required />
              </div>
              <div>
                <label>Tenure (Months)</label>
                <select className="inp" value={tenure} onChange={e => setTenure(e.target.value)} required>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                  <option value="36">36 Months</option>
                </select>
              </div>
            </div>
            
            <div className="flow-actions">
              <button type="button" className="btn ghost" onClick={() => router.back()}>Cancel</button>
              <button type="submit" className="btn">Continue</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 6 }}>Confirm Details</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 26 }}>Ready to process 6 months of banking history.</p>
            
            <div style={{ background: "#fbfcfe", border: "1px solid var(--line)", borderRadius: 10, padding: 20, marginBottom: 26 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14 }}>
                <div>
                  <div style={{ color: "var(--muted)", marginBottom: 4 }}>Requested Loan</div>
                  <div style={{ fontWeight: 600 }}>PKR {parseFloat(loan).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: "var(--muted)", marginBottom: 4 }}>Tenure</div>
                  <div style={{ fontWeight: 600 }}>{tenure} Months</div>
                </div>
              </div>
            </div>
            
            <div className="flow-actions">
              <button type="button" className="btn sec" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn" onClick={handleSubmit}>Start Assessment</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewAssessmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AssessmentForm />
    </Suspense>
  );
}
