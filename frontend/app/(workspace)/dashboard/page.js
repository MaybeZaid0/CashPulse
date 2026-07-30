"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";

export default function DashboardIndexPage() {
  const [smes, setSmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    API.getSMEs()
      .then(data => {
        // Only show SMEs that have completed assessments
        const assessed = data.filter(sme => sme.lastAssessmentId);
        setSmes(assessed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid">
      <div className="card" style={{ padding: 28 }}>
        <h3>Dashboard Overview</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
          Select an active assessment below to view the lending intelligence dashboard.
        </p>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>Loading active dashboards...</div>
        ) : smes.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", marginBottom: 16 }}>No active assessments found.</p>
            <button className="btn" onClick={() => router.push("/portfolio")}>
              Go to Portfolio to Assess an SME
            </button>
          </div>
        ) : (
          <div className="tablewrap">
            <div className="thead" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <div>SME Name</div>
              <div>Sector</div>
              <div>Readiness Score</div>
              <div>Action</div>
            </div>
            {smes.map(sme => (
              <div 
                key={sme.id} 
                className="trow" 
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
                onClick={() => router.push(`/dashboard/${sme.lastAssessmentId}`)}
              >
                <div style={{ fontWeight: 600 }}>{sme.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{sme.sector}</div>
                <div>
                  <div className={`chip ${sme.lastReadinessBand === "Strong" ? "g" : sme.lastReadinessBand === "Review" ? "a" : "r"}`}>
                    {sme.lastReadiness} — {sme.lastReadinessBand}
                  </div>
                </div>
                <div>
                  <button className="btn sec" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>
                    Open Dashboard
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
