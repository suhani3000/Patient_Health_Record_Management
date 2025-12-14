import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AuditLog, User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await connectToDatabase()

    // Get all audit logs for this patient
    const logs = db.auditLogs.filter((log: AuditLog) => log.patientId === user.userId)

    // Sort by timestamp (newest first)
    logs.sort((a: AuditLog, b: AuditLog) => b.timestamp.getTime() - a.timestamp.getTime())

    // Enrich with user details
    const enrichedLogs = logs.map((log: AuditLog) => {
      const performedByUser = db.users.find((u: User) => u._id === log.performedBy)
      const targetUser = log.targetUserId ? db.users.find((u: User) => u._id === log.targetUserId) : null

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
    })

    return NextResponse.json({ logs: enrichedLogs }, { status: 200 })
  } catch (error: any) {
    console.error("[Audit Logs API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
