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

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Find the user
    const user = db.users.find((u: User) => u._id === userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "doctor" && user.role !== "lab") {
      return NextResponse.json({ error: "Can only verify doctors and labs" }, { status: 400 })
    }

    if (action === "approve") {
      user.isVerified = true
      user.updatedAt = new Date()

      return NextResponse.json(
        {
          message: `${user.role === "doctor" ? "Doctor" : "Lab"} verified successfully`,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
          },
        },
        { status: 200 },
      )
    } else {
      // Reject: block the user
      user.isBlocked = true
      user.updatedAt = new Date()

      return NextResponse.json(
        {
          message: "User rejected and blocked",
        },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("[Verify User API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
