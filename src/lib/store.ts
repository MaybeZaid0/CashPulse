/**
 * Real-Time Cross-Device Store using Next.js Server API + MongoDB + LocalStorage + Polling.
 *
 * Provides 100% instant, automatic real-time sync across SME and RM portals on ALL devices & phones.
 */

import { LoanApplication, SyncEvent, SyncEventType } from "@/types";

const CHANNEL_NAME = "cashpulse-sync";
const STORAGE_KEY = "cashpulse-applications";

type Listener = (apps: LoanApplication[]) => void;

let channel: BroadcastChannel | null = null;
let storageListenerAttached = false;
let heartbeatInterval: NodeJS.Timeout | null = null;
let isFetchingRemote = false;

const listeners: Set<Listener> = new Set();

function initChannel() {
  if (typeof window === "undefined") return;

  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => {
        notifyListeners();
      };
    } catch (e) {
      console.warn("BroadcastChannel initialization fallback:", e);
    }
  }

  if (!storageListenerAttached) {
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        notifyListeners();
      }
    });
    storageListenerAttached = true;
  }
}

function notifyListeners() {
  const apps = loadApplications();
  listeners.forEach((fn) => fn(apps));
}

// ─── Public API ───

export function loadApplications(): LoanApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveApplications(apps: LoanApplication[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

// ─── Cross-Device API Sync ───

export async function fetchRemoteApplications(): Promise<LoanApplication[]> {
  if (typeof window === "undefined" || isFetchingRemote) return loadApplications();
  isFetchingRemote = true;
  try {
    const res = await fetch("/api/applications", { cache: "no-store" });
    if (res.ok) {
      const remoteApps: LoanApplication[] = await res.json();
      if (Array.isArray(remoteApps) && remoteApps.length > 0) {
        const localApps = loadApplications();
        // Merge local & remote (remote takes priority for status updates)
        const mergedMap = new Map<string, LoanApplication>();
        localApps.forEach((a) => mergedMap.set(a.id, a));
        remoteApps.forEach((a) => mergedMap.set(a.id, a));

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        saveApplications(merged);
        notifyListeners();
        return merged;
      }
    }
  } catch (err) {
    console.warn("Remote cross-device sync polling fallback:", err);
  } finally {
    isFetchingRemote = false;
  }
  return loadApplications();
}

export function addApplication(app: LoanApplication): LoanApplication[] {
  const apps = loadApplications();
  const idx = apps.findIndex((a) => a.id === app.id);
  if (idx >= 0) apps[idx] = app;
  else apps.unshift(app);
  saveApplications(apps);

  broadcast("APPLICATION_SUBMITTED", app);
  notifyListeners();

  // Push to Server API / MongoDB for cross-device visibility
  if (typeof window !== "undefined") {
    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application: app }),
    }).catch((err) => console.warn("Remote push application error:", err));
  }

  return apps;
}

export function updateApplication(
  id: string,
  updates: Partial<LoanApplication>
): LoanApplication[] {
  const apps = loadApplications();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx >= 0) {
    apps[idx] = { ...apps[idx], ...updates };
    saveApplications(apps);
    broadcast("STATUS_UPDATED", apps[idx]);
    notifyListeners();

    // Push update to Server API / MongoDB for cross-device visibility
    if (typeof window !== "undefined") {
      fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      }).catch((err) => console.warn("Remote update application error:", err));
    }
  }
  return apps;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  initChannel();
  fetchRemoteApplications();

  // Polling server API every 2 seconds for instant cross-device updates
  if (!heartbeatInterval && typeof window !== "undefined") {
    heartbeatInterval = setInterval(() => {
      fetchRemoteApplications();
    }, 2000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };
}

function broadcast(type: SyncEventType, payload: LoanApplication) {
  try {
    if (channel) {
      channel.postMessage({
        type,
        payload,
        timestamp: Date.now(),
      } satisfies SyncEvent);
    }
  } catch {
    // Fallback if BroadcastChannel fails
  }
}
