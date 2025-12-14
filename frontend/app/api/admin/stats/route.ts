import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User, MedicalRecord, AccessPermission } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const db = await connectToDatabase()

    const stats = {
      users: {
        total: db.users.length,
        patients: db.users.filter((u: User) => u.role === "patient").length,
        doctors: db.users.filter((u: User) => u.role === "doctor").length,
        labs: db.users.filter((u: User) => u.role === "lab").length,
        admins: db.users.filter((u: User) => u.role === "admin").length,
      },
      pending: {
        doctors: db.users.filter((u: User) => u.role === "doctor" && !u.isVerified && !u.isBlocked).length,
        labs: db.users.filter((u: User) => u.role === "lab" && !u.isVerified && !u.isBlocked).length,
      },
      blocked: db.users.filter((u: User) => u.isBlocked).length,
      records: {
        total: db.medicalRecords.length,
        byPatient: db.medicalRecords.filter((r: MedicalRecord) => r.uploaderRole === "patient").length,
        byDoctor: db.medicalRecords.filter((r: MedicalRecord) => r.uploaderRole === "doctor").length,
        byLab: db.medicalRecords.filter((r: MedicalRecord) => r.uploaderRole === "lab").length,
      },
      permissions: {
        total: db.accessPermissions.length,
        active: db.accessPermissions.filter((p: AccessPermission) => p.isActive).length,
        revoked: db.accessPermissions.filter((p: AccessPermission) => !p.isActive).length,
      },
      auditLogs: db.auditLogs.length,
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
