"use client";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";

export default function ReportsPage() {
  const [smes, setSmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    API.getSMEs()
      .then(data => {
        const assessed = data.filter(sme => sme.lastAssessmentId);
        setSmes(assessed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleViewReport = async (assessmentId) => {
    setReportLoading(true);
    try {
      const report = await API.getReport(assessmentId);
      setSelectedReport(report);
    } catch (err) {
      alert("Failed to load report");
    } finally {
      setReportLoading(false);
    }
  };

  if (selectedReport) {
    return (
      <div className="grid">
        <div className="card" style={{ padding: 32, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid var(--navy)", paddingBottom: 16, marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, margin: 0 }}>CashPulse Credit Assessment Report</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Generated automatically via UBL Lending Intelligence Engine</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <button className="btn sec" onClick={() => setSelectedReport(null)} style={{ marginRight: 8 }}>Back to Reports</button>
              <button className="btn" onClick={() => window.print()}>Print / Export PDF</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            <div>
              <h4 style={{ color: "var(--navy)", marginBottom: 8 }}>SME Details</h4>
              <div style={{ fontSize: 14, display: "grid", gap: 6 }}>
                <div><b>Business Name:</b> {selectedReport.smeName}</div>
                <div><b>Sector:</b> {selectedReport.smeSector}</div>
                <div><b>Account No:</b> {selectedReport.smeAccount}</div>
              </div>
            </div>
            <div>
              <h4 style={{ color: "var(--navy)", marginBottom: 8 }}>Facility Details</h4>
              <div style={{ fontSize: 14, display: "grid", gap: 6 }}>
                <div><b>Requested Loan:</b> PKR {selectedReport.requestedLoan?.toLocaleString()}</div>
                <div><b>Requested Tenure:</b> {selectedReport.requestedTenure} Months</div>
                <div><b>Assessment Date:</b> {new Date(selectedReport.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: 20, borderRadius: 10, border: "1px solid var(--line)", marginBottom: 32 }}>
            <h4 style={{ color: "var(--navy)", margin: "0 0 12px 0" }}>System Credit Summary</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Readiness Score</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedReport.readiness} / 100</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Risk Category</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: selectedReport.readinessBand === "Strong" ? "var(--success)" : "var(--warn)" }}>
                  {selectedReport.readinessBand}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Proposed Facility</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {selectedReport.recommendation?.recommended_amount ? `PKR ${selectedReport.recommendation.recommended_amount.toLocaleString()}` : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <h4 style={{ color: "var(--navy)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 12 }}>Credit Decision & Recommendations</h4>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
            <div><b>System Recommendation:</b> {selectedReport.recommendation?.type}</div>
            <div style={{ marginTop: 6 }}><b>Justification:</b> {selectedReport.recommendation?.reason}</div>
            <div style={{ marginTop: 12, padding: 12, background: "#fbfcfe", borderRadius: 8, borderLeft: "4px solid var(--blue)" }}>
              <b>Final RM Decision:</b> {selectedReport.decision || "PENDING"} <br />
              <b>Justification Note:</b> {selectedReport.decisionNote || "No notes recorded."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 60, fontSize: 13, borderTop: "1px dashed var(--line)", paddingTop: 20 }}>
            <div>
              <div style={{ marginBottom: 40 }}>Assessed & Signed By:</div>
              <div style={{ borderBottom: "1px solid #000", width: 200, marginBottom: 4 }}></div>
              <div>Relationship Manager</div>
            </div>
            <div>
              <div style={{ marginBottom: 40 }}>Approved By:</div>
              <div style={{ borderBottom: "1px solid #000", width: 200, marginBottom: 4 }}></div>
              <div>Credit Approver / Branch Manager</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card" style={{ padding: 28 }}>
        <h3>Printable Assessment Reports</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
          Generate audit-ready official UBL credit proposal reports for assessed SMEs.
        </p>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>Loading assessed clients...</div>
        ) : smes.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ color: "var(--muted)" }}>No assessed clients available to generate reports.</p>
          </div>
        ) : (
          <div className="tablewrap">
            <div className="thead" style={{ gridTemplateColumns: "2.5fr 1.5fr 1.5fr" }}>
              <div>SME Name</div>
              <div>Last Assessed</div>
              <div>Actions</div>
            </div>
            {smes.map(sme => (
              <div key={sme.id} className="trow" style={{ gridTemplateColumns: "2.5fr 1.5fr 1.5fr" }} onClick={() => handleViewReport(sme.lastAssessmentId)}>
                <div style={{ fontWeight: 600 }}>{sme.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Score: {sme.lastReadiness} ({sme.lastReadinessBand})
                </div>
                <div>
                  <button className="btn" style={{ height: 32, padding: "0 12px", fontSize: 12 }} disabled={reportLoading}>
                    {reportLoading ? "Loading..." : "Generate Proposal"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
