/**
 * Real-time cross-tab store using BroadcastChannel + Storage Event Listener + Interval Heartbeat.
 *
 * Provides 100% instant, automatic real-time sync across SME and RM portal tabs.
 */

import { LoanApplication, SyncEvent, SyncEventType } from "@/types";

const CHANNEL_NAME = "cashpulse-sync";
const STORAGE_KEY = "cashpulse-applications";

type Listener = (apps: LoanApplication[]) => void;

let channel: BroadcastChannel | null = null;
let storageListenerAttached = false;
let heartbeatInterval: NodeJS.Timeout | null = null;

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

export function addApplication(app: LoanApplication): LoanApplication[] {
  const apps = loadApplications();
  const idx = apps.findIndex((a) => a.id === app.id);
  if (idx >= 0) apps[idx] = app;
  else apps.unshift(app);
  saveApplications(apps);

  broadcast("APPLICATION_SUBMITTED", app);
  notifyListeners();
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
  }
  return apps;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  initChannel();

  // Active tab heartbeat fallback to guarantee zero manual reloads needed
  if (!heartbeatInterval && typeof window !== "undefined") {
    heartbeatInterval = setInterval(() => {
      notifyListeners();
    }, 1200);
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
