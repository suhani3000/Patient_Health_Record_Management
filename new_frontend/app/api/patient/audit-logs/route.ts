import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await getDatabase()
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")
    const usersCollection = db.collection<User>("users")

    const logs = await auditLogsCollection.find({ patientId: user.userId }).sort({ timestamp: -1 }).toArray()

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const performedByUser = await usersCollection.findOne({ _id: new ObjectId(log.performedBy) })
        const targetUser = log.targetUserId
          ? await usersCollection.findOne({ _id: new ObjectId(log.targetUserId) })
          : null

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
        }
      }),
    )

    return NextResponse.json({ logs: enrichedLogs }, { status: 200 })
  } catch (error: any) {
    console.error("[Audit Logs API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
