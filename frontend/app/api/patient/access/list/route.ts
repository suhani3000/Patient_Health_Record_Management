import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { AccessPermission, User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await connectToDatabase()

    // Get all permissions for this patient
    const permissions = db.accessPermissions.filter((p: AccessPermission) => p.patientId === user.userId)

    // Enrich with user details
    const enrichedPermissions = permissions.map((p: AccessPermission) => {
      const grantedToUser = db.users.find((u: User) => u._id === p.grantedTo)
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
    })

    return NextResponse.json({ permissions: enrichedPermissions }, { status: 200 })
  } catch (error: any) {
    console.error("[List Access API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
