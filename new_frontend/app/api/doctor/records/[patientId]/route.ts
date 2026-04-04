import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const user = requireVerified(req)

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { patientId } = await params
    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")
    const usersCollection = db.collection<User>("users")

    const doctorDoc = await usersCollection.findOne({
      _id: new ObjectId(user.userId),
    })
    const doctorChain = doctorDoc?.blockchainAddress?.toLowerCase() ?? ""

    const patientObjectId = ObjectId.isValid(patientId) ? new ObjectId(patientId) : null
    if (!patientObjectId) {
      return NextResponse.json({ error: "Invalid patientId" }, { status: 400 })
    }

    const permission = await permissionsCollection.findOne({
      patientId,
      grantedTo: user.userId,
      isActive: true,
      accessLevel: { $regex: "view" },
    })

    if (!permission) {
      return NextResponse.json({ error: "No access to this patient's records" }, { status: 403 })
    }

    const records = await recordsCollection
      .find({ patientId: patientObjectId })
      .sort({ uploadDate: -1 })
      .toArray()

    // Log the access
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "view_record",
      performedBy: user.userId,
      performedByRole: "doctor",
      patientId,
      timestamp: new Date(),
      metadata: {
        recordCount: records.length,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

    const mapped = records.map((rec) => {
      const keys = rec.doctorKeys ?? {}
      const myEncryptedAESKey =
        doctorChain && keys[doctorChain] ? keys[doctorChain] : undefined
      return {
        ...rec,
        myEncryptedAESKey,
      }
    })

    return NextResponse.json({ records: mapped }, { status: 200 })
  } catch (error: any) {
    console.error("[Doctor Records API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
