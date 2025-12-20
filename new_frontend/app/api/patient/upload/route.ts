import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { MedicalRecord, AuditLog } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const body = await req.json()
    const { fileName, fileType, recordType, description, fileData } = body

    if (!fileName || !fileType || !recordType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`
    const fileCID="";
    const fileUrl = fileData || `/uploads/${user.userId}/${Date.now()}_${fileName}`

    // Create medical record
    const newRecord: Omit<MedicalRecord, "_id"> = {
      patientId: user.userId,
      uploadedBy: user.userId,
      uploaderRole: "patient",
      fileName,
      fileType,
      fileUrl,
      fileCID,
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
      performedByRole: "patient",
      recordId: recordResult.insertedId.toString(),
      patientId: user.userId,
      timestamp: new Date(),
      metadata: {
        fileName,
        recordType,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        record: { _id: recordResult.insertedId, ...newRecord },
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
