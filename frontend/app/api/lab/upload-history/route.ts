import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireVerified(req)

    if (user.role !== "lab") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = await connectToDatabase()

    // Get all records uploaded by this lab
    const records = db.medicalRecords.filter((record: MedicalRecord) => record.uploadedBy === user.userId)

    // Sort by upload date (newest first)
    records.sort((a: MedicalRecord, b: MedicalRecord) => b.uploadDate.getTime() - a.uploadDate.getTime())

    // Enrich with patient details
    const enrichedRecords = records.map((record: MedicalRecord) => {
      const patient = db.users.find((u: User) => u._id === record.patientId)
      return {
        ...record,
        patientName: patient?.name || "Unknown",
        patientEmail: patient?.email || "Unknown",
      }
    })

    return NextResponse.json({ records: enrichedRecords }, { status: 200 })
  } catch (error: any) {
    console.error("[Lab Upload History API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
