import { MongoClient, type Db } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || ""
const DB_NAME = "ehr-platform"

if (!MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI not found in environment variables. Please add it to connect to MongoDB.")
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  if (!MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local")
  }

  // Create new connection
  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db(DB_NAME)

  cachedClient = client
  cachedDb = db

  console.log("✅ Connected to MongoDB")

  return { client, db }
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase()
  return db
}
