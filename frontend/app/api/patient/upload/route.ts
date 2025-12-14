import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { MedicalRecord, AuditLog } from "@/lib/db/models"
import { generateFileHash } from "@/lib/storage/file-storage"

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const body = await req.json()
    const { fileName, fileType, recordType, description, fileData } = body

    if (!fileName || !fileType || !recordType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Generate file hash
    const fileHash = generateFileHash(fileData || fileName + Date.now())

    // Mock file URL (in production, upload to cloud storage)
    const fileUrl = `/uploads/${user.userId}/${Date.now()}_${fileName}`

    // Create medical record
    const newRecord: MedicalRecord = {
      _id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId: user.userId,
      uploadedBy: user.userId,
      uploaderRole: "patient",
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
      performedByRole: "patient",
      recordId: newRecord._id,
      patientId: user.userId,
      timestamp: new Date(),
      metadata: {
        fileName,
        recordType,
      },
    }

    db.auditLogs.push(auditLog)

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        record: newRecord,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[Patient Upload API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
