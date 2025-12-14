import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog } from "@/lib/db/models"

export async function GET(req: NextRequest, { params }: { params: { patientId: string } }) {
  try {
    const user = requireVerified(req)

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { patientId } = params
    const db = await connectToDatabase()

    // Check if doctor has access to this patient's records
    const permission = db.accessPermissions.find(
      (p: AccessPermission) =>
        p.patientId === patientId && p.grantedTo === user.userId && p.isActive && p.accessLevel.includes("view"),
    )

    if (!permission) {
      return NextResponse.json({ error: "No access to this patient's records" }, { status: 403 })
    }

    // Get all records for this patient
    const records = db.medicalRecords.filter((record: MedicalRecord) => record.patientId === patientId)

    // Sort by upload date (newest first)
    records.sort((a: MedicalRecord, b: MedicalRecord) => b.uploadDate.getTime() - a.uploadDate.getTime())

    // Log the access
    const auditLog: AuditLog = {
      _id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: "view_record",
      performedBy: user.userId,
      performedByRole: "doctor",
      patientId,
      timestamp: new Date(),
      metadata: {
        recordCount: records.length,
      },
    }

    db.auditLogs.push(auditLog)

    return NextResponse.json({ records }, { status: 200 })
  } catch (error: any) {
    console.error("[Doctor Records API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
