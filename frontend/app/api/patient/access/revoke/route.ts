import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, AuditLog } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Find active permission
    const permission = db.accessPermissions.find(
      (p: AccessPermission) => p.patientId === user.userId && p.grantedTo === userId && p.isActive,
    )

    if (!permission) {
      return NextResponse.json({ error: "No active permission found" }, { status: 404 })
    }

    // Revoke permission
    permission.isActive = false
    permission.revokedAt = new Date()

    // Create audit log
    const auditLog: AuditLog = {
      _id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: "revoke_access",
      performedBy: user.userId,
      performedByRole: "patient",
      targetUserId: userId,
      patientId: user.userId,
      timestamp: new Date(),
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock blockchain tx
      metadata: {
        previousAccessLevel: permission.accessLevel,
      },
    }

    db.auditLogs.push(auditLog)

    return NextResponse.json(
      {
        message: "Access revoked successfully",
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[Revoke Access API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
