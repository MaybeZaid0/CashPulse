"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";

export default function PortfolioPage() {
  const [smes, setSmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    API.getSMEs()
      .then(setSmes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSmeClick = (sme) => {
    if (sme.lastAssessmentId) {
      router.push(`/dashboard/${sme.lastAssessmentId}`);
    } else {
      router.push(`/new-assessment?smeId=${sme.id}`);
    }
  };

  const getChipClass = (band) => {
    switch (band) {
      case "Strong": return "chip g";
      case "Review": return "chip a";
      case "High Risk": return "chip r";
      default: return "chip v";
    }
  };

  return (
    <div className="grid g1">
      <div className="tablewrap">
        <div className="thead">
          <div>Client / Business Name</div>
          <div>Sector</div>
          <div>Requested Facility</div>
          <div>Readiness Score</div>
          <div>Action</div>
        </div>
        
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Loading portfolio...</div>
        ) : (
          smes.map(sme => (
            <div key={sme.id} className="trow" onClick={() => handleSmeClick(sme)}>
              <div className="sme">
                <div className="ic">{sme.name.charAt(0)}</div>
                <div>
                  <div className="nm">{sme.name}</div>
                  <div className="sec">Acc: {sme.accountNo}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{sme.sector}</div>
              <div className="num">PKR {(sme.requestedLoan || 0).toLocaleString()}</div>
              <div>
                {sme.lastReadiness ? (
                  <div className={getChipClass(sme.lastReadinessBand)}>
                    {sme.lastReadiness} — {sme.lastReadinessBand}
                  </div>
                ) : (
                  <div className="chip v">No Assessment</div>
                )}
              </div>
              <div>
                <button className="btn sec" style={{ height: 32, padding: "0 12px", fontSize: 12 }} onClick={(e) => {
                  e.stopPropagation();
                  handleSmeClick(sme);
                }}>
                  {sme.lastAssessmentId ? "View Dashboard" : "Assess Now"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
