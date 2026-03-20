import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const usersCollection = db.collection<User>("users")

    const permissions = await permissionsCollection.find({ patientId: user.userId.toString() }).toArray()

    const enrichedPermissions = await Promise.all(
      permissions.map(async (p) => {
        const grantedToStr = p.grantedTo?.toString?.() ?? String(p.grantedTo)
        const grantedToObjectId =
          ObjectId.isValid(grantedToStr) ? new ObjectId(grantedToStr) : null

        let grantedToUser = grantedToObjectId
          ? await usersCollection.findOne({ _id: grantedToObjectId })
          : null
        if (!grantedToUser) {
          // Fallback in case `_id` in Mongo is stored as string.
          grantedToUser = await usersCollection.findOne({ _id: grantedToStr })
        }
        return {
          ...p,
          grantedToUser: grantedToUser
            ? {
                name: grantedToUser.name,
                email: grantedToUser.email,
                role: grantedToUser.role,
                specialization: grantedToUser.specialization,
              }
            : null,
        }
      }),
    )

    return NextResponse.json({ permissions: enrichedPermissions }, { status: 200 })
  } catch (error: any) {
    console.error("[List Access API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
