import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const { userId, accessLevel, blockchainTxHash = null, doctorKeyMap = {}, doctorAddress = null } = await req.json()

    if (!userId || !accessLevel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const userIdStr =
      typeof userId === "string" ? userId : typeof userId?.toString === "function" ? userId.toString() : null
    if (!userIdStr) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 })
    }

    if (!["view", "upload", "view-upload"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid access level" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    // `users._id` is an ObjectId in Mongo. The UI sends a string, so we must convert it.
    const grantedToObjectId = ObjectId.isValid(userIdStr) ? new ObjectId(userIdStr) : null
    const grantedToUser = grantedToObjectId
      ? await usersCollection.findOne({ _id: grantedToObjectId })
      : await usersCollection.findOne({ _id: userIdStr })
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
      patientId: user.userId.toString(),
      grantedTo: userIdStr,
      isActive: true,
    })

    if (existingPermission) {
      return NextResponse.json({ error: "Access already granted" }, { status: 409 })
    }

    // Create new permission
    const newPermission: Omit<AccessPermission, "_id"> = {
      patientId: user.userId.toString(),
      grantedTo: userIdStr,
      grantedToRole: grantedToUser.role as "doctor" | "lab",
      accessLevel: accessLevel as "view" | "upload" | "view-upload",
      grantedAt: new Date(),
      isActive: true,
      // Real hash from EHRAccess.grantAccess() tx; null if chain call was skipped
      blockchainTxHash: blockchainTxHash ?? undefined,
    }

    const permResult = await permissionsCollection.insertOne(newPermission as any)

    // Save doctor-specific encrypted AES keys into each MedicalRecord
if (doctorAddress && Object.keys(doctorKeyMap).length > 0) {
  const recordsCollection = db.collection("medicalRecords")
  const updateOps = Object.entries(doctorKeyMap).map(([recordId, encryptedKey]) => {
    if (!ObjectId.isValid(recordId)) return null
    return recordsCollection.updateOne(
      { _id: new ObjectId(recordId) },
      { $set: { [`doctorKeys.${doctorAddress.toLowerCase()}`]: encryptedKey } }
    )
  }).filter(Boolean)
  await Promise.all(updateOps)
}

    // Create audit log
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "grant_access",
      performedBy: user.userId.toString(),
      performedByRole: "patient",
      targetUserId: userIdStr,
      patientId: user.userId.toString(),
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
