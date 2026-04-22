import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"
import { leanMedicalRecordForClient } from "@/lib/serializeMedicalRecord"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const user = requireVerified(req)

    if (user.role !== "lab") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { patientId } = await params

    if (!ObjectId.isValid(patientId)) {
      return NextResponse.json({ error: "Invalid patientId" }, { status: 400 })
    }

    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")
    const usersCollection = db.collection<User>("users")

    // Get lab's blockchain address
    const labDoc = await usersCollection.findOne({
      _id: new ObjectId(user.userId),
    })
    const labChain = labDoc?.blockchainAddress?.toLowerCase() ?? ""

    // Verify access permission
    const patientObjectId = new ObjectId(patientId)
    const permission = await permissionsCollection.findOne({
      patientId,
      grantedTo: user.userId,
      isActive: true,
      accessLevel: { $regex: "view" },
    })

    if (!permission) {
      return NextResponse.json(
        { error: "No access to this patient's records" },
        { status: 403 }
      )
    }

    // Fetch records
    const records = await recordsCollection
      .find({ patientId: patientObjectId })
      .sort({ uploadDate: -1, createdAt: -1 })
      .toArray()

    // Map records: inject myEncryptedAESKey from doctorKeys
    const mapped = records.map((rec) => {
      const keys = rec.doctorKeys ?? {}
      const myEncryptedAESKey =
        labChain && keys[labChain]
          ? String(keys[labChain])
          : undefined

      const cid = rec.cid ?? rec.fileCID
      const base = leanMedicalRecordForClient(rec as unknown as Record<string, unknown>)
      
      return {
        ...base,
        cid: cid != null ? String(cid) : base.cid,
        myEncryptedAESKey,
      }
    })

    // Log access
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "view_record",
      performedBy: user.userId,
      performedByRole: "lab",
      patientId,
      timestamp: new Date(),
      metadata: {
        recordCount: records.length,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

    return NextResponse.json({ records: mapped }, { status: 200 })

  } catch (error: any) {
    console.error("[Lab Records API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
