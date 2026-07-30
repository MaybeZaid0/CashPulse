"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await API.login(email, password);
      } else {
        data = await API.signup(name, email, password);
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/portfolio");
    } catch (err) {
      setError(err.message || (isLogin ? "Login failed" : "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-form">
        <div style={{ maxWidth: 320, width: "100%", margin: "0 auto" }}>
          <h2>{isLogin ? "Sign in" : "Create Account"}</h2>
          <p className="sub">{isLogin ? "Welcome back to CashPulse" : "Join CashPulse to start assessing SMEs"}</p>
          
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <label>Full Name</label>
                <input
                  type="text"
                  className="inp"
                  placeholder="e.g. Sara Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </>
            )}

            <label>Email</label>
            <input
              type="email"
              className="inp"
              placeholder="e.g. sara@ubl.com.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <label>Password</label>
            <input
              type="password"
              className="inp"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{error}</div>}
            
            <button type="submit" className="btn block" disabled={loading}>
              {loading ? "Please wait..." : (isLogin ? "Sign in" : "Sign up")}
            </button>
            
            <p className="hint" style={{ marginTop: 24 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <b style={{ cursor: "pointer" }} onClick={() => { setIsLogin(!isLogin); setError(""); }}>
                {isLogin ? "Sign up" : "Sign in"}
              </b>
            </p>
          </form>
        </div>
      </div>
      
      <div className="login-art">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="brand">
          <div className="logo">C</div>
          <div>
            <div className="bt">CashPulse</div>
            <div className="bs">LENDING INTELLIGENCE ENGINE</div>
          </div>
        </div>
        <h1>AI-Driven SME Credit Decisions at Scale.</h1>
        <p>Analyze transaction history, evaluate real-time financial health, and make informed lending decisions in minutes.</p>
        
        <div className="pulse-line">
          <svg viewBox="0 0 400 60" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <path d="M0 30 L50 30 L70 10 L90 50 L110 30 L400 30" fill="none" stroke="var(--cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="110" cy="30" r="5" fill="var(--cyan)" />
          </svg>
        </div>
        
        <div className="chip-w">
          <span>Readiness Score</span>
          <span>Cashflow Analytics</span>
          <span>Behavioral Trends</span>
        </div>
      </div>
    </div>
  );
}
