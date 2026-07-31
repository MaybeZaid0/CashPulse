import { MongoClient } from "mongodb";

// MongoDB Atlas Cluster URI fallback for zero-config Vercel cross-device persistence
const DEFAULT_MONGODB_URI =
  "mongodb+srv://cashpulse_user:cashpulse2026@cluster0.w3r8y.mongodb.net/cashpulse?retryWrites=true&w=majority";

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  DEFAULT_MONGODB_URI;

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

export default clientPromise;
