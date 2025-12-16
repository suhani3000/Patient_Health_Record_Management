import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, AuditLog } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const permission = await permissionsCollection.findOne({
      patientId: user.userId,
      grantedTo: userId,
      isActive: true,
    })

    if (!permission) {
      return NextResponse.json({ error: "No active permission found" }, { status: 404 })
    }

    await permissionsCollection.updateOne(
      { _id: permission._id },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
        },
      },
    )

    // Create audit log
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "revoke_access",
      performedBy: user.userId,
      performedByRole: "patient",
      targetUserId: userId,
      patientId: user.userId,
      timestamp: new Date(),
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      metadata: {
        previousAccessLevel: permission.accessLevel,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

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
