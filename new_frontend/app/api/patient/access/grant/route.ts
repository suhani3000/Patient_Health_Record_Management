import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const { userId, accessLevel } = await req.json()

    if (!userId || !accessLevel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["view", "upload", "view-upload"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid access level" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const grantedToUser = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!grantedToUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify user is doctor or lab
    if (!["doctor", "lab"].includes(grantedToUser.role)) {
      return NextResponse.json({ error: "Can only grant access to doctors or labs" }, { status: 400 })
    }

    // Check if user is verified
    if (!grantedToUser.isVerified) {
      return NextResponse.json({ error: "User is not verified by admin" }, { status: 400 })
    }

    const existingPermission = await permissionsCollection.findOne({
      patientId: user.userId,
      grantedTo: userId,
      isActive: true,
    })

    if (existingPermission) {
      return NextResponse.json({ error: "Access already granted" }, { status: 409 })
    }

    // Create new permission
    const newPermission: Omit<AccessPermission, "_id"> = {
      patientId: user.userId,
      grantedTo: userId,
      grantedToRole: grantedToUser.role as "doctor" | "lab",
      accessLevel: accessLevel as "view" | "upload" | "view-upload",
      grantedAt: new Date(),
      isActive: true,
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    }

    const permResult = await permissionsCollection.insertOne(newPermission as any)

    // Create audit log
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "grant_access",
      performedBy: user.userId,
      performedByRole: "patient",
      targetUserId: userId,
      patientId: user.userId,
      timestamp: new Date(),
      blockchainTxHash: newPermission.blockchainTxHash,
      metadata: {
        accessLevel,
        grantedToRole: grantedToUser.role,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

    return NextResponse.json(
      {
        message: "Access granted successfully",
        permission: { _id: permResult.insertedId, ...newPermission },
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[Grant Access API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
