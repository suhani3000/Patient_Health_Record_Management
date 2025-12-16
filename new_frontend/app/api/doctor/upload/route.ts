import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog } from "@/lib/db/models"

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

    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const permission = await permissionsCollection.findOne({
      patientId,
      grantedTo: user.userId,
      isActive: true,
      accessLevel: { $regex: "upload" },
    })

    if (!permission) {
      return NextResponse.json({ error: "No upload permission for this patient" }, { status: 403 })
    }

    const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`
    const fileUrl = fileData || `/uploads/${patientId}/${Date.now()}_${fileName}`

    // Create medical record
    const newRecord: Omit<MedicalRecord, "_id"> = {
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

    const recordResult = await recordsCollection.insertOne(newRecord as any)

    // Create audit log
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "upload_record",
      performedBy: user.userId,
      performedByRole: "doctor",
      recordId: recordResult.insertedId.toString(),
      patientId,
      timestamp: new Date(),
      metadata: {
        fileName,
        recordType,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

    return NextResponse.json(
      {
        message: "Record uploaded successfully",
        record: { _id: recordResult.insertedId, ...newRecord },
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
