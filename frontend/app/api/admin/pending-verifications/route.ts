import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["admin"])
    const db = await connectToDatabase()

    // Get all unverified doctors and labs
    const pendingUsers = db.users.filter(
      (u: User) => (u.role === "doctor" || u.role === "lab") && !u.isVerified && !u.isBlocked,
    )

    // Sort by creation date (oldest first)
    pendingUsers.sort((a: User, b: User) => a.createdAt.getTime() - b.createdAt.getTime())

    // Remove passwords
    const sanitizedUsers = pendingUsers.map((u: User) => {
      const { password, ...userWithoutPassword } = u
      return userWithoutPassword
    })

    return NextResponse.json({ users: sanitizedUsers }, { status: 200 })
  } catch (error: any) {
    console.error("[Pending Verifications API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
