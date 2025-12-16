import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const { searchParams } = new URL(req.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const db = await getDatabase()
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")
    const usersCollection = db.collection<User>("users")

    const logs = await auditLogsCollection.find({}).sort({ timestamp: -1 }).limit(limit).toArray()

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const performedByUser = await usersCollection.findOne({ _id: new ObjectId(log.performedBy) })
        const targetUser = log.targetUserId
          ? await usersCollection.findOne({ _id: new ObjectId(log.targetUserId) })
          : null
        const patient = log.patientId ? await usersCollection.findOne({ _id: new ObjectId(log.patientId) }) : null

        return {
          ...log,
          performedByUser: performedByUser
            ? {
                name: performedByUser.name,
                email: performedByUser.email,
                role: performedByUser.role,
              }
            : null,
          targetUser: targetUser
            ? {
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
              }
            : null,
          patient: patient
            ? {
                name: patient.name,
                email: patient.email,
              }
            : null,
        }
      }),
    )

    return NextResponse.json({ logs: enrichedLogs }, { status: 200 })
  } catch (error: any) {
    console.error("[Admin Audit Logs API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
