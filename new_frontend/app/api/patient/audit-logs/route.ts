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

    const logs = await auditLogsCollection.find({ patientId: user.userId.toString() }).sort({ timestamp: -1 }).toArray()

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const performedByIdStr =
          log.performedBy?.toString?.() ?? (log.performedBy ? String(log.performedBy) : "")
        const performedByObjectId =
          performedByIdStr && ObjectId.isValid(performedByIdStr) ? new ObjectId(performedByIdStr) : null

        let performedByUser = performedByObjectId
          ? await usersCollection.findOne({ _id: performedByObjectId })
          : null
        if (!performedByUser && performedByIdStr) {
          performedByUser = await usersCollection.findOne({ _id: performedByIdStr })
        }

        const targetUserIdStr =
          log.targetUserId?.toString?.() ?? (log.targetUserId ? String(log.targetUserId) : null)
        const targetUserObjectId =
          targetUserIdStr && ObjectId.isValid(targetUserIdStr) ? new ObjectId(targetUserIdStr) : null

        let targetUser = targetUserObjectId
          ? await usersCollection.findOne({ _id: targetUserObjectId })
          : null
        if (!targetUser && targetUserIdStr) {
          targetUser = await usersCollection.findOne({ _id: targetUserIdStr })
        }

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
