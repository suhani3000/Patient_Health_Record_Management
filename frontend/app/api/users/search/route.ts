import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireAuth } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const query = searchParams.get("q")

    const db = await connectToDatabase()

    let users = db.users.filter((u: User) => u._id !== user.userId && !u.isBlocked)

    // Filter by role if specified
    if (role && ["doctor", "lab"].includes(role)) {
      users = users.filter((u: User) => u.role === role && u.isVerified)
    }

    // Filter by search query (name or email)
    if (query) {
      const lowerQuery = query.toLowerCase()
      users = users.filter(
        (u: User) => u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery),
      )
    }

    // Remove passwords
    const sanitizedUsers = users.map((u: User) => {
      const { password, ...userWithoutPassword } = u
      return userWithoutPassword
    })

    return NextResponse.json({ users: sanitizedUsers }, { status: 200 })
  } catch (error: any) {
    console.error("[User Search API] Error:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
