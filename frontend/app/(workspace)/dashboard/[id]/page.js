"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API } from "@/lib/api";
import CashflowChart from "@/components/charts/CashflowChart";
import PillarBarChart from "@/components/charts/PillarBarChart";

function ScoreRing({ score, band }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let color = "var(--blue)";
  if (band === "Strong") color = "var(--success)";
  if (band === "Review") color = "var(--warn)";
  if (band === "High Risk") color = "var(--danger)";

  return (
    <div className="gauge">
      <svg width="168" height="168" viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={radius} fill="none" stroke="#e5eef6" strokeWidth="12" />
        <circle cx="84" cy="84" r={radius} fill="none" stroke={color} strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="cap">
        <div className="s">{score}</div>
        <div className="of">out of 100</div>
      </div>
    </div>
  );
}

function PillarCard({ pillar }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className={`pillar ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
      <div className="ph">
        <div>
          <div className="pt">{pillar.label}</div>
          <div className="pq">{pillar.question}</div>
        </div>
        <div className="psc">{pillar.score}/{pillar.max}</div>
      </div>
      <div className="pbar">
        <i style={{ width: `${(pillar.score / pillar.max) * 100}%`, background: "var(--blue)" }}></i>
      </div>
      {!open && <div className="expand-hint">View details</div>}
      <div className="evidence">
        <div className="reason">{pillar.reason}</div>
        {pillar.evidence?.map((ev, i) => (
          <div className="ev" key={i}>
            <span>{ev.label}</span>
            <b>{ev.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decisionModal, setDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState("ACCEPT");
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    API.getAssessment(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecision = async () => {
    setSubmitting(true);
    try {
      const updated = await API.recordDecision(id, decisionType, decisionNote);
      setData(updated);
      setDecisionModal(false);
    } catch (err) {
      alert("Failed to save decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading dashboard...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center" }}>Assessment not found</div>;

  return (
    <>
      <div className="grid">
        <div className="card scorecard" style={{ gridColumn: "1 / -1" }}>
          <ScoreRing score={data.readiness} band={data.readinessBand} />
          <div className="scoremeta">
            <h3>Readiness Score</h3>
            <div className="band" style={{ color: data.readinessBand === "Strong" ? "var(--success)" : data.readinessBand === "Review" ? "var(--warn)" : "var(--danger)" }}>
              {data.readinessBand}
            </div>
            <p>This score evaluates cashflow stability, repayment capacity, and business momentum based on 6 months of verified bank statements.</p>
          </div>
          
          <div style={{ marginLeft: "auto", display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", minWidth: 260 }}>
             <div>
               <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Requested Loan</div>
               <div style={{ fontSize: 18, fontWeight: 700 }}>PKR {data.requestedLoan.toLocaleString()}</div>
             </div>
             <div>
               <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Requested Tenure</div>
               <div style={{ fontSize: 18, fontWeight: 700 }}>{data.requestedTenure} Mos</div>
             </div>
             {data.eligibility && (
               <>
                 <div>
                   <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Max Safe Loan</div>
                   <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>PKR {data.eligibility.safe_loan_amount.toLocaleString()}</div>
                 </div>
                 <div>
                   <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Capacity Used</div>
                   <div style={{ fontSize: 18, fontWeight: 700 }}>{data.eligibility.headroom_pct}%</div>
                 </div>
               </>
             )}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h3>Cashflow Analytics</h3>
          <CashflowChart series={data.cashflowSeries} />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Pillar Analysis</h3>
          <div className="grid g3">
            {data.pillarScores?.map((p, i) => <PillarCard key={i} pillar={p} />)}
          </div>
        </div>

        {data.recommendation && (
          <div className="rec" style={{ gridColumn: "1 / -1" }}>
            <div className="rh">
              <div className="badge" style={{ background: data.recommendation.type === "APPROVE" ? "var(--success)" : data.recommendation.type === "COUNTER_OFFER" ? "var(--warn)" : "var(--danger)" }}>
                {data.recommendation.type.replace("_", " ")}
              </div>
              <h3 style={{ fontSize: 18 }}>System Recommendation</h3>
            </div>
            
            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <p style={{ color: "var(--ink)", lineHeight: 1.6 }}>{data.recommendation.reason}</p>
                {data.recommendation.recommended_amount && (
                  <div className="amt">
                    Recommended: PKR {data.recommendation.recommended_amount.toLocaleString()} 
                    <span style={{ fontSize: 16, color: "var(--muted)", fontWeight: 400 }}> / {data.recommendation.recommended_tenure} Mos</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <ul style={{ marginTop: 0 }}>
                  {data.recommendation.evidence?.map((ev, i) => (
                    <li key={i}><b>{ev.label}:</b> {ev.value}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {!data.decision ? (
              <div className="decide">
                <button className="btn" onClick={() => { setDecisionType("ACCEPT"); setDecisionModal(true); }}>Accept Recommendation</button>
                <button className="btn sec" onClick={() => { setDecisionType("COUNTER"); setDecisionModal(true); }}>Make Counter-Offer</button>
                <button className="btn ghost" style={{ border: "1px solid var(--danger)", color: "var(--danger)" }} onClick={() => { setDecisionType("ESCALATE"); setDecisionModal(true); }}>Escalate to Credit</button>
              </div>
            ) : (
              <div style={{ marginTop: 20, padding: 16, background: "#fff", borderRadius: 10, border: "1px solid var(--line)" }}>
                <h4 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>Final Decision Recorded</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="chip b" style={{ background: "var(--navy)", color: "#fff" }}>{data.decision}</div>
                  <div style={{ fontSize: 14 }}>{data.decisionNote}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {decisionModal && (
        <div className="overlay show">
          <div className="modal" style={{ textAlign: "left", maxWidth: 500 }}>
            <h3 style={{ marginBottom: 16 }}>Record Decision: {decisionType}</h3>
            <label>Decision Notes / Justification</label>
            <textarea 
              className="inp" 
              style={{ height: 100, padding: 12, resize: "none" }} 
              placeholder="Enter details..."
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
            ></textarea>
            
            <div className="flow-actions" style={{ marginTop: 24 }}>
              <button className="btn sec" onClick={() => setDecisionModal(false)} disabled={submitting}>Cancel</button>
              <button className="btn" onClick={handleDecision} disabled={submitting}>{submitting ? "Saving..." : "Save Decision"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
