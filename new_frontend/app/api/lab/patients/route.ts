import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { AccessPermission, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const user = requireVerified(req)

    if (user.role !== "lab") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const usersCollection = db.collection<User>("users")

    const permissions = await permissionsCollection
      .find({
        grantedTo: user.userId,
        isActive: true,
        accessLevel: { $regex: "upload" },
      })
      .toArray()

    const patients = await Promise.all(
      permissions.map(async (p) => {
        const patientIdStr = p.patientId?.toString?.() ?? String(p.patientId)
        const patientObjectId = ObjectId.isValid(patientIdStr) ? new ObjectId(patientIdStr) : null

        let patient = patientObjectId ? await usersCollection.findOne({ _id: patientObjectId }) : null
        if (!patient) patient = await usersCollection.findOne({ _id: patientIdStr })

        return {
          patientId: p.patientId,
          patientName: patient?.name || "Unknown",
          patientEmail: patient?.email || "Unknown",
          accessLevel: p.accessLevel,
          grantedAt: p.grantedAt,
        }
      }),
    )

    return NextResponse.json({ patients }, { status: 200 })
  } catch (error: any) {
    console.error("[Lab Patients API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
