import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AuditLog, User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const { searchParams } = new URL(req.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const db = await connectToDatabase()

    // Get all audit logs
    let logs = [...db.auditLogs]

    // Sort by timestamp (newest first)
    logs.sort((a: AuditLog, b: AuditLog) => b.timestamp.getTime() - a.timestamp.getTime())

    // Limit results
    logs = logs.slice(0, limit)

    // Enrich with user details
    const enrichedLogs = logs.map((log: AuditLog) => {
      const performedByUser = db.users.find((u: User) => u._id === log.performedBy)
      const targetUser = log.targetUserId ? db.users.find((u: User) => u._id === log.targetUserId) : null
      const patient = db.users.find((u: User) => u._id === log.patientId)

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
    })

    return NextResponse.json({ logs: enrichedLogs }, { status: 200 })
  } catch (error: any) {
    console.error("[Admin Audit Logs API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
