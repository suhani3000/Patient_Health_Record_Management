import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")

    const db = await connectToDatabase()

    let users = db.users.filter((u: User) => u.role !== "admin")

    // Filter by role if specified
    if (role && ["patient", "doctor", "lab"].includes(role)) {
      users = users.filter((u: User) => u.role === role)
    }

    // Remove passwords
    const sanitizedUsers = users.map((u: User) => {
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
