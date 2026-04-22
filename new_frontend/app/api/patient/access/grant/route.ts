import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, AuditLog, User, MedicalRecord } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["patient"])
    const body = await req.json()
    const { 
      userId, 
      accessLevel, 
      blockchainTxHash = null, 
      doctorKeyMap = {}, 
      doctorAddress = null 
    } = body

    if (!userId || !accessLevel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["view", "upload", "view-upload"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid access level" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    // Resolve user ID
    const userIdStr =
      typeof userId === "string" ? userId : typeof userId?.toString === "function" ? userId.toString() : null
    if (!userIdStr || !ObjectId.isValid(userIdStr)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 })
    }

    const grantedToObjectId = new ObjectId(userIdStr)
    const grantedToUser = await usersCollection.findOne({ _id: grantedToObjectId })

    if (!grantedToUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!["doctor", "lab"].includes(grantedToUser.role)) {
      return NextResponse.json({ error: "Can only grant access to doctors or labs" }, { status: 400 })
    }

    if (!grantedToUser.isVerified) {
      return NextResponse.json({ error: "User is not verified by admin" }, { status: 400 })
    }

    if (!grantedToUser.blockchainAddress) {
      return NextResponse.json(
        { error: "User has no blockchain address. They must log in first." },
        { status: 400 }
      )
    }

    const grantedToChain = grantedToUser.blockchainAddress.toLowerCase()

    // Check if permission already exists
    const existingPermission = await permissionsCollection.findOne({
      patientId: user.userId.toString(),
      grantedTo: userIdStr,
      isActive: true,
    })

    if (existingPermission) {
      return NextResponse.json({ error: "Access already granted" }, { status: 409 })
    }

    // Create permission record
    const newPermission: Omit<AccessPermission, "_id"> = {
      patientId: user.userId.toString(),
      grantedTo: userIdStr,
      grantedToRole: grantedToUser.role as "doctor" | "lab",
      accessLevel: accessLevel as "view" | "upload" | "view-upload",
      grantedAt: new Date(),
      isActive: true,
      blockchainTxHash: blockchainTxHash ?? undefined,
    }

    const permResult = await permissionsCollection.insertOne(newPermission as any)

    // Re-wrap doctor keys and store in each record
    if (Object.keys(doctorKeyMap).length > 0 && grantedToChain) {
      const updateOps = Object.entries(doctorKeyMap).map(([recordId, encryptedKey]) => {
        if (!ObjectId.isValid(recordId)) return null
        
        return recordsCollection.updateOne(
          { _id: new ObjectId(recordId) },
          { 
            $set: { 
              [`doctorKeys.${grantedToChain}`]: encryptedKey
            } 
          }
        )
      }).filter(Boolean)

      if (updateOps.length > 0) {
        await Promise.all(updateOps)
      }
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
        recordsUpdated: Object.keys(doctorKeyMap).length,
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