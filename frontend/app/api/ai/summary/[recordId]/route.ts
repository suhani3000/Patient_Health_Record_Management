import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireAuth } from "@/lib/auth/middleware"
import type { MedicalRecord, AISummary } from "@/lib/db/models"

export async function GET(req: NextRequest, { params }: { params: { recordId: string } }) {
  try {
    const user = requireAuth(req)
    const { recordId } = params

    const db = await connectToDatabase()

    // Find the record
    const record = db.medicalRecords.find((r: MedicalRecord) => r._id === recordId)
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // Check if user has access to this record
    if (user.role === "patient" && record.patientId !== user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (user.role === "doctor" || user.role === "lab") {
      // Check if they have access to this patient
      const hasAccess = db.accessPermissions.some(
        (p: any) =>
          p.patientId === record.patientId &&
          p.grantedTo === user.userId &&
          p.isActive &&
          p.accessLevel.includes("view"),
      )

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Find the summary
    const summary = db.aiSummaries.find((s: AISummary) => s.recordId === recordId)

    if (!summary) {
      return NextResponse.json({ error: "Summary not found", exists: false }, { status: 404 })
    }

    return NextResponse.json({ summary, exists: true }, { status: 200 })
  } catch (error: any) {
    console.error("[Get Summary API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
