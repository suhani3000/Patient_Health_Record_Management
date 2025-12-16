import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")

    const filter: any = { role: { $ne: "admin" } }

    // Filter by role if specified
    if (role && ["patient", "doctor", "lab"].includes(role)) {
      filter.role = role
    }

    const users = await usersCollection.find(filter).toArray()

    // Remove passwords
    const sanitizedUsers = users.map((u) => {
      const { password, ...userWithoutPassword } = u
      return userWithoutPassword
    })

    return NextResponse.json({ users: sanitizedUsers }, { status: 200 })
  } catch (error: any) {
    console.error("[Admin Users API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
