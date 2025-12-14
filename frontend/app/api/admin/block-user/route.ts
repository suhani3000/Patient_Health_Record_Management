import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    const admin = requireRole(req, ["admin"])
    const { userId, action } = await req.json()

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["block", "unblock"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Find the user
    const user = db.users.find((u: User) => u._id === userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role === "admin") {
      return NextResponse.json({ error: "Cannot block admin users" }, { status: 400 })
    }

    user.isBlocked = action === "block"
    user.updatedAt = new Date()

    return NextResponse.json(
      {
        message: `User ${action === "block" ? "blocked" : "unblocked"} successfully`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isBlocked: user.isBlocked,
        },
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[Block User API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
