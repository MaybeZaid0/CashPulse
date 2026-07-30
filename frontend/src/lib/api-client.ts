const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// Token management
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("cashpulse_token", token);
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = sessionStorage.getItem("cashpulse_token");
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("cashpulse_token");
  }
}

// Generic fetch wrapper
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      clearAuthToken();
      return { error: "Session expired. Please login again.", status: 401 };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        error: errBody.detail || `Request failed (${res.status})`,
        status: res.status,
      };
    }

    const data = await res.json();
    return { data, status: res.status };
  } catch (err) {
    return {
      error: "Cannot connect to server. Please check if the backend is running.",
      status: 0,
    };
  }
}

// ─── AUTH ───
export async function apiLogin(email: string, password: string) {
  // OAuth2PasswordRequestForm expects form data, not JSON
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.detail || "Login failed", status: res.status };
  }

  const data = await res.json();
  setAuthToken(data.access_token);
  return { data, status: res.status };
}

export async function apiSignup(name: string, email: string, password: string) {
  return apiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// ─── SMEs ───
export async function apiGetSMEs() {
  return apiFetch<any[]>("/api/smes/");
}

export async function apiGetSME(id: string) {
  return apiFetch<any>(`/api/smes/${id}`);
}

// ─── ASSESSMENTS ───
export async function apiGetAssessments() {
  return apiFetch<any[]>("/api/assessments/");
}

export async function apiCreateAssessment(
  smeId: string,
  requestedLoan: number,
  requestedTenure: number
) {
  return apiFetch<any>("/api/assessments/", {
    method: "POST",
    body: JSON.stringify({ smeId, requestedLoan, requestedTenure }),
  });
}

export async function apiGetAssessment(id: string) {
  return apiFetch<any>(`/api/assessments/${id}`);
}

export async function apiRecordDecision(
  assessmentId: string,
  decision: string,
  note: string
) {
  return apiFetch<any>(`/api/assessments/${assessmentId}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
}

export async function apiGetReport(assessmentId: string) {
  return apiFetch<any>(`/api/assessments/${assessmentId}/report`);
}
