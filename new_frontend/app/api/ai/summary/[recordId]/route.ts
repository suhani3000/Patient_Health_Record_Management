import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireAuth } from "@/lib/auth/middleware"
import type { MedicalRecord, AISummary, AccessPermission } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const user = requireAuth(req)
    const { recordId } = await params

    const { db } = await connectToDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const aiSummariesCollection = db.collection<AISummary>("aiSummaries")

    // Find the record
    const recordObjectId = ObjectId.isValid(recordId) ? new ObjectId(recordId) : null
    if (!recordObjectId) {
      return NextResponse.json({ error: "Invalid recordId" }, { status: 400 })
    }

    const record = await recordsCollection.findOne({ _id: recordObjectId })
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // Check if user has access to this record
    if (user.role === "patient" && record.patientId.toString() !== user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (user.role === "doctor" || user.role === "lab") {
      // Check if they have access to this patient
      const hasAccess = await permissionsCollection.findOne({
        patientId: record.patientId.toString(),
        grantedTo: user.userId,
        isActive: true,
        accessLevel: { $in: ["view", "view-upload"] },
      })

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Find the summary
    const summary = await aiSummariesCollection.findOne({ recordId })

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
