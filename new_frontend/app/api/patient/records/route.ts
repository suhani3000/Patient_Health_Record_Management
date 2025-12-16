import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { MedicalRecord } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")

    // Get all records for this patient
    const records = await recordsCollection.find({ patientId: user.userId }).sort({ uploadDate: -1 }).toArray()

    return NextResponse.json({ records }, { status: 200 })
  } catch (error: any) {
    console.error("[Patient Records API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
