const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function authFetch(endpoint, options = {}) {
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem('token');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  
  if (res.status === 401) { 
    if (typeof window !== "undefined") {
        window.location.href = '/'; // redirect to login
    }
    throw new Error('Unauthorized'); 
  }
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const API = {
  login: (username, password) => fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
  }).then(async r => {
      if (!r.ok) {
        let msg = await r.text();
        try { msg = JSON.parse(msg).detail; } catch (e) {}
        throw new Error(msg);
      }
      return r.json();
  }),

  signup: (name, email, password) => fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
  }).then(async r => {
      if (!r.ok) {
        let msg = await r.text();
        try { msg = JSON.parse(msg).detail; } catch (e) {}
        throw new Error(msg);
      }
      return r.json();
  }),
  
  getSMEs: () => authFetch('/smes'),
  getAssessment: (id) => authFetch(`/assessments/${id}`),
  createAssessment: (smeId, loan, tenure) => authFetch('/assessments', {
      method: 'POST',
      body: JSON.stringify({ smeId: smeId, requestedLoan: loan, requestedTenure: tenure })
  }),
  recordDecision: (id, decision, note) => authFetch(`/assessments/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note })
  }),
  getReport: (id) => authFetch(`/assessments/${id}/report`),
};
