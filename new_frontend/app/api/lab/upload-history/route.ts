import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const user = requireVerified(req)

    if (user.role !== "lab") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const usersCollection = db.collection<User>("users")

    const records = await recordsCollection.find({ uploadedBy: user.userId }).sort({ uploadDate: -1 }).toArray()

    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const patient = await usersCollection.findOne({ _id: new ObjectId(record.patientId) })
        return {
          ...record,
          patientName: patient?.name || "Unknown",
          patientEmail: patient?.email || "Unknown",
        }
      }),
    )

    return NextResponse.json({ records: enrichedRecords }, { status: 200 })
  } catch (error: any) {
    console.error("[Lab Upload History API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
