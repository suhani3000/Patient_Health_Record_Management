import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

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

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "doctor" && user.role !== "lab") {
      return NextResponse.json({ error: "Can only verify doctors and labs" }, { status: 400 })
    }

    if (action === "approve") {
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { isVerified: true, updatedAt: new Date() } },
      )

      return NextResponse.json(
        {
          message: `${user.role === "doctor" ? "Doctor" : "Lab"} verified successfully`,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: true,
          },
        },
        { status: 200 },
      )
    } else {
      // Reject: block the user
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { isBlocked: true, updatedAt: new Date() } },
      )

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
