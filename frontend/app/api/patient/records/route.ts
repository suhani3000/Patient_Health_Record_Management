import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { MedicalRecord } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await connectToDatabase()

    // Get all records for this patient
    const records = db.medicalRecords.filter((record: MedicalRecord) => record.patientId === user.userId)

    // Sort by upload date (newest first)
    records.sort((a: MedicalRecord, b: MedicalRecord) => b.uploadDate.getTime() - a.uploadDate.getTime())

    return NextResponse.json({ records }, { status: 200 })
  } catch (error: any) {
    console.error("[Patient Records API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
