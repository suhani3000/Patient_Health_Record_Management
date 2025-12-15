import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI!
const MONGODB_DB = "healthchain"

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local")
}

let cachedClient: MongoClient | null = null

export async function connectToDatabase() {
  if (cachedClient) {
    const db = cachedClient.db(MONGODB_DB)
    return {
      users: db.collection("users"),
      medicalRecords: db.collection("medicalRecords"),
      accessPermissions: db.collection("accessPermissions"),
      aiSummaries: db.collection("aiSummaries"),
      auditLogs: db.collection("auditLogs"),
    }
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()

  cachedClient = client
  const db = client.db(MONGODB_DB)

  console.log("[MongoDB] Connected successfully")

  return {
    users: db.collection("users"),
    medicalRecords: db.collection("medicalRecords"),
    accessPermissions: db.collection("accessPermissions"),
    aiSummaries: db.collection("aiSummaries"),
    auditLogs: db.collection("auditLogs"),
  }
}
