import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog } from "@/lib/db/models"
import { generateFileHash } from "@/lib/storage/file-storage"

export async function POST(req: NextRequest) {
  try {
    const user = requireVerified(req)

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await req.json()
    const { patientId, fileName, fileType, recordType, description, fileData } = body

    if (!patientId || !fileName || !fileType || !recordType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Check if doctor has upload access to this patient's records
    const permission = db.accessPermissions.find(
      (p: AccessPermission) =>
        p.patientId === patientId && p.grantedTo === user.userId && p.isActive && p.accessLevel.includes("upload"),
    )

    if (!permission) {
      return NextResponse.json({ error: "No upload permission for this patient" }, { status: 403 })
    }

    // Generate file hash
    const fileHash = generateFileHash(fileData || fileName + Date.now())

    // Mock file URL (in production, upload to cloud storage)
    const fileUrl = `/uploads/${patientId}/${Date.now()}_${fileName}`

    // Create medical record
    const newRecord: MedicalRecord = {
      _id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      uploadedBy: user.userId,
      uploaderRole: "doctor",
      fileName,
      fileType,
      fileUrl,
      fileHash,
      recordType,
      uploadDate: new Date(),
      metadata: {
        description,
      },
    }

    db.medicalRecords.push(newRecord)

    // Create audit log
    const auditLog: AuditLog = {
      _id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: "upload_record",
      performedBy: user.userId,
      performedByRole: "doctor",
      recordId: newRecord._id,
      patientId,
      timestamp: new Date(),
      metadata: {
        fileName,
        recordType,
      },
    }

    db.auditLogs.push(auditLog)

    return NextResponse.json(
      {
        message: "Record uploaded successfully",
        record: newRecord,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[Doctor Upload API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
