import { NextResponse } from "next/server";
import { LoanApplication } from "@/types";
import clientPromise from "@/lib/mongodb";

// In-memory fallback serverless cache for instant cross-device sync on Vercel
let inMemoryApplicationsStore: Map<string, LoanApplication> = new Map();

async function getMongoCollection() {
  if (!clientPromise) return null;
  try {
    const client = await clientPromise;
    const db = client.db("cashpulse");
    return db.collection<LoanApplication>("applications");
  } catch (err) {
    console.warn("MongoDB connection unavailable, using serverless cloud store:", err);
    return null;
  }
}

export async function GET() {
  try {
    const collection = await getMongoCollection();
    if (collection) {
      const dbApps = await collection.find({}).sort({ submittedAt: -1 }).toArray();
      // Clean Mongo _id from output
      const cleaned = dbApps.map(({ _id, ...app }: any) => app as LoanApplication);
      return NextResponse.json(cleaned);
    }
  } catch (err) {
    console.warn("Error fetching from MongoDB:", err);
  }

  // Fallback to in-memory serverless cache
  const apps = Array.from(inMemoryApplicationsStore.values()).sort(
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

    // Save to in-memory store
    inMemoryApplicationsStore.set(app.id, app);

    // Save to MongoDB if available
    const collection = await getMongoCollection();
    if (collection) {
      await collection.updateOne(
        { id: app.id },
        { $set: app },
        { upsert: true }
      );
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

    // Update in-memory store
    const existing = inMemoryApplicationsStore.get(id);
    if (existing) {
      inMemoryApplicationsStore.set(id, { ...existing, ...updates });
    }

    // Update MongoDB
    const collection = await getMongoCollection();
    if (collection) {
      await collection.updateOne(
        { id },
        { $set: updates }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update application" }, { status: 500 });
  }
}
