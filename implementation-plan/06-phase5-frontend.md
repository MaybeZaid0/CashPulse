# Phase 5 — Frontend Integration & Polish

> **Goal**: Transform the static `mockups/cashpulse-prototype.html` into a live, multi-screen web application that is fully wired to the FastAPI backend. We will build this using **Next.js (App Router)** and React.  
> **Acceptance Test**: Full end-to-end demo flow works: Login → Portfolio → New Assessment → Dashboard (with real charts) → Decision capture.

---

## Frontend Architecture Decision

Based on the requirements, the frontend will be built with:
- **Next.js 14+ (App Router)** for routing and server-side logic
- **React** for building interactive, reusable UI components
- **Tailwind CSS** or plain CSS Modules (translating the design system)
- **Chart.js (via react-chartjs-2)** for rendering cashflow and pillar charts
- **Axios or Fetch** for API client communication

---

## File Structure

```
frontend/
├── package.json
├── tsconfig.json (optional, if using TypeScript)
├── next.config.mjs
├── app/
│   ├── layout.js              ← Root layout (includes global CSS)
│   ├── globals.css            ← Translated from prototype CSS
│   ├── page.js                ← Login screen (/)
│   ├── (workspace)/           ← Route group for authenticated views
│   │   ├── layout.js          ← Sidebar and Topbar wrapper
│   │   ├── portfolio/page.js  ← SME list
│   │   ├── new-assessment/    ← Multi-step assessment flow
│   │   └── dashboard/[id]/    ← The full assessment dashboard
├── components/                ← Reusable React components
│   ├── ui/                    ← Buttons, Cards, Modals
│   ├── charts/                ← React-Chart.js wrappers
│   └── Dashboard/             ← Specific dashboard sections (ScoreRing, PillarCard)
└── lib/
    └── api.js                 ← API client wrappers
```

---

## API Client (`lib/api.js`)

Create a centralized API service that handles authentication tokens automatically (e.g., retrieving the JWT from localStorage/cookies and appending it).

```javascript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token'); // or use cookies for better security
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  
  if (res.status === 401) { 
    window.location.href = '/'; // redirect to login
    throw new Error('Unauthorized'); 
  }
  
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const API = {
  login: (email, password) => fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
  }).then(r => r.json()),
  
  getSMEs: () => authFetch('/smes'),
  getAssessment: (id) => authFetch(`/assessments/${id}`),
  createAssessment: (smeId, loan, tenure) => authFetch('/assessments', {
      method: 'POST',
      body: JSON.stringify({ sme_id: smeId, requested_loan: loan, requested_tenure: tenure })
  }),
  recordDecision: (id, decision, note) => authFetch(`/assessments/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note })
  })
};
```

---

## Next.js Pages (Routes)

### 1. `/` (Login Page)
Renders the login form matching the prototype's `login` screen. Submitting calls `API.login()`. On success, saves the token and redirects to `/portfolio`.

### 2. `/portfolio` (Portfolio View)
Uses a React `useEffect` or server component data fetching to load `API.getSMEs()`. Renders the data table with Readiness score chips. Clicking a row goes to `/new-assessment?smeId=...` or `/dashboard/[id]` if it already has an assessment.

### 3. `/new-assessment` (Flow)
A client component that manages state for a multi-step form (Step 1: Loan inputs, Step 2: Confirmation). On final submit, it calls `API.createAssessment()` and displays a loading spinner matching the `analyzing` screen from the prototype. On success, it redirects to `/dashboard/[new_id]`.

### 4. `/dashboard/[id]`
The core view. Fetches the full assessment data via `API.getAssessment(id)`. Passes data down to child components:
- `<ScoreRing score={data.readiness} band={data.readiness_band} />`
- `<CashflowChart series={data.cashflow_series} />`
- `<PillarsList scores={data.pillar_scores} />`
- `<RecommendationPanel data={data.recommendation} />`

---

## Chart Rendering (react-chartjs-2)

Translate the vanilla Chart.js into React components.

```javascript
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, LineController } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, LineController);

export default function CashflowChart({ series }) {
  const data = {
    labels: series.map(m => m.month),
    datasets: [
      { label: "Inflow",  data: series.map(m => m.inflow),  backgroundColor: "#1E9E5A", borderRadius: 6 },
      { label: "Outflow", data: series.map(m => m.outflow), backgroundColor: "#D6455B", borderRadius: 6 },
      { label: "Net",     data: series.map(m => m.net),     type: "line", borderColor: "#0083CA", tension: 0.4, fill: false }
    ]
  };

  return <Bar data={data} options={{ responsive: true }} />;
}
```

---

## Acceptance Criteria

- [ ] `npm run dev` starts the Next.js server successfully on port 3000
- [ ] Login screen calls real API and shows error for bad credentials
- [ ] Portfolio screen shows real SMEs from the database with readiness chips
- [ ] Clicking an SME navigates to "New Assessment" flow with that SME pre-selected
- [ ] `POST /api/assessments` is triggered on step 2 submit, loading spinner shown during wait
- [ ] Dashboard displays real readiness score, pillar scores with evidence, and real cashflow chart via React-Chart.js
- [ ] Pillar cards expand on click to show `reason` + `evidence` from the API
- [ ] Recommendation panel shows the correct type (APPROVE / COUNTER-OFFER / MANUAL REVIEW) with correct amount
- [ ] Decision buttons call `POST /api/assessments/{id}/decision` and confirm success
- [ ] Desktop and mobile layouts match the prototype using responsive Tailwind/CSS.
