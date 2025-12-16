import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["admin"])
    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")

    const pendingUsers = await usersCollection
      .find({
        role: { $in: ["doctor", "lab"] },
        isVerified: false,
        isBlocked: false,
      })
      .sort({ createdAt: 1 })
      .toArray()

    // Remove passwords
    const sanitizedUsers = pendingUsers.map((u) => {
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
