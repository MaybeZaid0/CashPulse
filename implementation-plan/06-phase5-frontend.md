# Phase 5 — Frontend Integration & Polish

> **Goal**: Transform the static `mockups/cashpulse-prototype.html` into a live, multi-screen web application that is fully wired to the FastAPI backend. The frontend is a clean vanilla HTML/CSS/JS app — no build tools required.  
> **Acceptance Test**: Full end-to-end demo flow works: Login → Portfolio → New Assessment → Dashboard (with real charts) → Decision capture.

---

## Frontend Architecture Decision

Since the backend is FastAPI (not a Next.js/React project), the frontend will be:
- **Vanilla HTML + CSS + JavaScript** (no build tools, no bundler)
- **Chart.js** for rendering cashflow and pillar charts
- Structured as a **Single Page Application (SPA)** — one `index.html`, `app.js` handles screen routing
- Mirrors the exact design and interaction from `mockups/cashpulse-prototype.html`

This keeps the stack simple and lets the backend be the focus.

---

## File Structure

```
frontend/
├── index.html         ← Shell: loads CSS + JS, holds all screen templates
├── style.css          ← All styles (from design-system.md + prototype CSS)
└── app.js             ← All JS: API client, router, screen rendering, charts
```

---

## Frontend Screens (matching prototype)

| Screen ID  | Route / Trigger                  | Description |
|------------|----------------------------------|-------------|
| `login`    | Initial load                     | Login form — calls `POST /api/auth/login` |
| `portfolio`| After login                      | SME table — calls `GET /api/smes` |
| `flow1`    | "New Assessment" button          | Assessment step 1: SME + loan details |
| `flow2`    | After step 1                     | Confirm data window, trigger analysis |
| `analyzing`| After step 2 submit              | Loading spinner while `POST /api/assessments` runs |
| `dashboard`| After analysis completes         | Full dashboard: score, pillars, chart, recommendation |
| `report`   | "View Report" button             | Printable summary view |

---

## API Client (`app.js` — `APIClient` module)

All backend calls go through a central API client:

```javascript
const API_BASE = "http://localhost:8000/api";
let authToken = null;

const API = {
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();
    authToken = data.access_token;
    return data;
  },

  async getSMEs() {
    return await authFetch(`${API_BASE}/smes`);
  },

  async getSME(id) {
    return await authFetch(`${API_BASE}/smes/${id}`);
  },

  async createAssessment(smeId, requestedLoan, requestedTenure) {
    return await authFetch(`${API_BASE}/assessments`, {
      method: "POST",
      body: JSON.stringify({ sme_id: smeId, requested_loan: requestedLoan, requested_tenure: requestedTenure }),
    });
  },

  async getAssessment(id) {
    return await authFetch(`${API_BASE}/assessments/${id}`);
  },

  async recordDecision(assessmentId, decision, note) {
    return await authFetch(`${API_BASE}/assessments/${assessmentId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    });
  },

  async getReport(assessmentId) {
    return await authFetch(`${API_BASE}/assessments/${assessmentId}/report`);
  }
};

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { go("login"); return; }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

## Chart Rendering (Chart.js)

Chart.js is loaded from CDN — no installation needed.

### Cashflow Bar Chart

```javascript
function renderCashflowChart(canvasId, cashflowSeries) {
  const labels   = cashflowSeries.map(m => m.month);
  const inflows  = cashflowSeries.map(m => m.inflow);
  const outflows = cashflowSeries.map(m => m.outflow);
  const nets     = cashflowSeries.map(m => m.net);

  new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Inflow",  data: inflows,  backgroundColor: "#1E9E5A", borderRadius: 6 },
        { label: "Outflow", data: outflows, backgroundColor: "#D6455B", borderRadius: 6 },
        { label: "Net",     data: nets,     type: "line", borderColor: "#0083CA", tension: 0.4, fill: false, pointRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: { ticks: { callback: v => "PKR " + (v/1000).toFixed(0) + "k" } }
      }
    }
  });
}
```

### Pillar Bar Chart (horizontal)

```javascript
function renderPillarChart(canvasId, pillarScores) {
  const labels  = pillarScores.map(p => p.label);
  const scores  = pillarScores.map(p => p.score);
  const maxes   = pillarScores.map(p => p.max);
  const colors  = scores.map((s, i) => {
    const pct = s / maxes[i];
    return pct >= 0.75 ? "#1E9E5A" : pct >= 0.50 ? "#E8A33D" : "#D6455B";
  });

  new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Score", data: scores, backgroundColor: colors, borderRadius: 6 }
      ]
    },
    options: {
      indexAxis: "y",   // horizontal bars
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { max: 30 } }
    }
  });
}
```

### Readiness Score Gauge (SVG-based, matches prototype)

```javascript
function renderGauge(svgId, score, band) {
  const colors = { "Strong": "#1E9E5A", "Review": "#E8A33D", "High Risk": "#D6455B" };
  const color  = colors[band] || "#0083CA";
  const radius = 70, cx = 84, cy = 84;
  const circumference = 2 * Math.PI * radius;
  const dashArray = (score / 100) * circumference;
  
  document.getElementById(svgId).innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#E4EBF2" stroke-width="12"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="12"
            stroke-dasharray="${dashArray} ${circumference}"
            stroke-dashoffset="0" stroke-linecap="round"
            style="transition: stroke-dasharray 1s ease"/>
  `;
}
```

---

## Screen Rendering Strategy

Each screen is a function that:
1. Injects HTML into the main `#app-container` div
2. Calls the appropriate API
3. Renders charts after the DOM is updated

```javascript
const SCREENS = { login, portfolio, dashboard, ... };

function go(screenName, params = {}) {
  document.getElementById("app-container").innerHTML = "";
  SCREENS[screenName](params);
  updateURL(screenName);
}
```

---

## Dashboard Screen — Rendering Logic

```javascript
async function dashboard({ assessmentId }) {
  const assessment = await API.getAssessment(assessmentId);
  const { pillarScores, readiness, readinessBand, recommendation,
          cashflowSeries, eligibility, smeName } = assessment;

  // 1. Render the full dashboard HTML (mirrors prototype s-dashboard)
  document.getElementById("app-container").innerHTML = getDashboardHTML(assessment);

  // 2. Render gauge
  renderGauge("gaugeCanvas", readiness, readinessBand);

  // 3. Render cashflow chart
  renderCashflowChart("cashflowChart", cashflowSeries);

  // 4. Render pillar chart
  renderPillarChart("pillarChart", pillarScores);

  // 5. Wire pillar expand/collapse interactions
  document.querySelectorAll(".pillar").forEach(el => {
    el.addEventListener("click", () => el.classList.toggle("open"));
  });

  // 6. Wire decision buttons
  document.getElementById("btn-accept").addEventListener("click", () => captureDecision(assessmentId, "ACCEPT"));
  document.getElementById("btn-counter").addEventListener("click", () => captureDecision(assessmentId, "COUNTER"));
  document.getElementById("btn-escalate").addEventListener("click", () => captureDecision(assessmentId, "ESCALATE"));
}
```

---

## Responsiveness & Mobile

- The CSS from the prototype already handles all responsive behavior (sidebar → drawer on mobile, single-column grids, etc.)
- A `ResizeObserver` or CSS media queries handle layout switching automatically
- Touch targets are all ≥ 44px per design system

---

## Acceptance Criteria

- [ ] Login screen calls real API and shows error for bad credentials
- [ ] Portfolio screen shows real SMEs from the database with readiness chips
- [ ] Clicking an SME navigates to "New Assessment" flow with that SME pre-selected
- [ ] `POST /api/assessments` is triggered on step 2 submit, loading spinner shown during wait
- [ ] Dashboard displays real readiness score, pillar scores with evidence, and real cashflow chart
- [ ] Pillar cards expand on click to show `reason` + `evidence` from the API
- [ ] Recommendation panel shows the correct type (APPROVE / COUNTER-OFFER / MANUAL REVIEW) with correct amount
- [ ] Decision buttons call `POST /api/assessments/{id}/decision` and confirm success
- [ ] Desktop and mobile layouts match the prototype (test at 360px and 1280px)
- [ ] No horizontal scroll on mobile (≤360px width)
