// MongoDB Connection Utility

let isConnected = false

export interface MongoCollections {
  users: any[]
  medicalRecords: any[]
  accessPermissions: any[]
  aiSummaries: any[]
  auditLogs: any[]
}

// Mock in-memory database for hackathon demo
const mockDb: MongoCollections = {
  users: [],
  medicalRecords: [],
  accessPermissions: [],
  aiSummaries: [],
  auditLogs: [],
}

export async function connectToDatabase() {
  if (isConnected) {
    return mockDb
  }

  // In production, connect to MongoDB:
  // const client = await MongoClient.connect(process.env.MONGODB_URI!)
  // const db = client.db('ehr-platform')

  console.log("[MongoDB] Connected to mock database")
  isConnected = true

  return mockDb
}

export function getMockDatabase() {
  return mockDb
}
