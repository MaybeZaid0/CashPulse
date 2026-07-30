"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="grid g2">
      <div className="card" style={{ padding: 28 }}>
        <h3>User Profile</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Your UBL relationship manager account details.</p>
        
        {user ? (
          <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
            <div>
              <span style={{ color: "var(--muted)", display: "block", fontSize: 12 }}>Name</span>
              <strong style={{ fontSize: 16 }}>{user.name}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", fontSize: 12 }}>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", display: "block", fontSize: 12 }}>Role</span>
              <strong className="chip b" style={{ background: "var(--navy)", color: "#fff", padding: "4px 8px" }}>
                {user.role || "Relationship Manager"}
              </strong>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>No profile loaded.</div>
        )}
      </div>

      <div className="card" style={{ padding: 28 }}>
        <h3>Engine Status</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>UBL CashPulse configuration & health status.</p>
        
        <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
            <span>FastAPI Backend Connection</span>
            <span style={{ color: "var(--success)", fontWeight: 600 }}>ONLINE</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
            <span>MongoDB Database</span>
            <span style={{ color: "var(--success)", fontWeight: 600 }}>CONNECTED</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
            <span>Active Model Version</span>
            <strong>v1.0.2 (Production-Ready)</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
