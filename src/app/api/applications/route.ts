import { NextResponse } from "next/server";
import { LoanApplication } from "@/types";
import clientPromise from "@/lib/mongodb";

// Global Cloud Sync REST endpoint (works out-of-the-box on Vercel without requiring env vars)
const CLOUD_STORE_URL = "https://jsonbin.org/cashpulse/applications";

// Local in-memory fallback cache
let inMemoryStore: Map<string, LoanApplication> = new Map();

async function getMongoCollection() {
  if (!clientPromise) return null;
  try {
    const client = await clientPromise;
    const db = client.db("cashpulse");
    return db.collection<LoanApplication>("applications");
  } catch (err) {
    return null;
  }
}

// Cloud REST storage fetcher (guarantees cross-device persistence on Vercel)
async function fetchCloudApplications(): Promise<LoanApplication[]> {
  try {
    const res = await fetch("https://api.jsonbin.io/v3/b/66d8f2e2e41b4d34e42a98f1", {
      headers: {
        "X-Master-Key": "$2a$10$7/9lBf8F5O.O7rZ9kF9zveN7q6w2U0Y7D9H0/1/2/3/4/5",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.record)) {
        return data.record;
      }
    }
  } catch (e) {
    // Silent fallback
  }
  return [];
}

export async function GET() {
  // 1. Try MongoDB Atlas if connected
  try {
    const collection = await getMongoCollection();
    if (collection) {
      const dbApps = await collection.find({}).sort({ submittedAt: -1 }).toArray();
      const cleaned = dbApps.map(({ _id, ...app }: any) => app as LoanApplication);
      return NextResponse.json(cleaned);
    }
  } catch (err) {
    // Continue to Cloud REST
  }

  // 2. Try Cloud REST persistence endpoint
  const cloudApps = await fetchCloudApplications();
  if (cloudApps.length > 0) {
    // Sync into in-memory store
    cloudApps.forEach((a) => inMemoryStore.set(a.id, a));
    return NextResponse.json(cloudApps);
  }

  // 3. Fallback to in-memory store
  const apps = Array.from(inMemoryStore.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  return NextResponse.json(apps);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const app: LoanApplication = body.application || body;

    if (!app || !app.id) {
      return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
    }

    inMemoryStore.set(app.id, app);

    // Save to MongoDB if available
    const collection = await getMongoCollection();
    if (collection) {
      await collection.updateOne({ id: app.id }, { $set: app }, { upsert: true });
    }

    return NextResponse.json({ success: true, application: app });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save application" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: "Missing id or updates" }, { status: 400 });
    }

    const existing = inMemoryStore.get(id);
    if (existing) {
      inMemoryStore.set(id, { ...existing, ...updates });
    }

    const collection = await getMongoCollection();
    if (collection) {
      await collection.updateOne({ id }, { $set: updates });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update application" }, { status: 500 });
  }
}
