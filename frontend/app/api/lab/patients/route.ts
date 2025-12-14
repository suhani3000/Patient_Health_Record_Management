import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { AccessPermission, User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireVerified(req)

    if (user.role !== "lab") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = await connectToDatabase()

    // Get all active permissions granted to this lab
    const permissions = db.accessPermissions.filter(
      (p: AccessPermission) => p.grantedTo === user.userId && p.isActive && p.accessLevel.includes("upload"),
    )

    // Get patient details
    const patients = permissions.map((p: AccessPermission) => {
      const patient = db.users.find((u: User) => u._id === p.patientId)
      return {
        patientId: p.patientId,
        patientName: patient?.name || "Unknown",
        patientEmail: patient?.email || "Unknown",
        accessLevel: p.accessLevel,
        grantedAt: p.grantedAt,
      }
    })

    return NextResponse.json({ patients }, { status: 200 })
  } catch (error: any) {
    console.error("[Lab Patients API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
