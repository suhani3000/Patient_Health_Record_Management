import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User, MedicalRecord, AccessPermission, AuditLog } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const db = await getDatabase()

    const usersCollection = db.collection<User>("users")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const [users, records, permissions, auditLogs] = await Promise.all([
      usersCollection.find({}).toArray(),
      recordsCollection.find({}).toArray(),
      permissionsCollection.find({}).toArray(),
      auditLogsCollection.countDocuments(),
    ])

    const stats = {
      users: {
        total: users.length,
        patients: users.filter((u) => u.role === "patient").length,
        doctors: users.filter((u) => u.role === "doctor").length,
        labs: users.filter((u) => u.role === "lab").length,
        admins: users.filter((u) => u.role === "admin").length,
      },
      pending: {
        doctors: users.filter((u) => u.role === "doctor" && !u.isVerified && !u.isBlocked).length,
        labs: users.filter((u) => u.role === "lab" && !u.isVerified && !u.isBlocked).length,
      },
      blocked: users.filter((u) => u.isBlocked).length,
      records: {
        total: records.length,
        byPatient: records.filter((r) => r.uploaderRole === "patient").length,
        byDoctor: records.filter((r) => r.uploaderRole === "doctor").length,
        byLab: records.filter((r) => r.uploaderRole === "lab").length,
      },
      permissions: {
        total: permissions.length,
        active: permissions.filter((p) => p.isActive).length,
        revoked: permissions.filter((p) => !p.isActive).length,
      },
      auditLogs,
    }

    return NextResponse.json({ stats }, { status: 200 })
  } catch (error: any) {
    console.error("[Admin Stats API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
