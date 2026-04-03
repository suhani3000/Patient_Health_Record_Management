import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireAuth } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    // Note: Ensure requireAuth has 'await' if it is an async function in your middleware!
    const user = await requireAuth(req) 
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const query = searchParams.get("q")

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")

    const filter: any = {
      _id: { $ne: new ObjectId(user.userId) },
      isBlocked: false,
    }

    if (role) {
      if (["doctor", "lab"].includes(role)) {
        filter.role = role
        filter.isVerified = true
      }
    } else {
      // If no role specified, allow doctor + lab only
      filter.role = { $in: ["doctor", "lab"] }
      filter.isVerified = true
    }

    // Filter by search query (name or email)
    if (query) {
      filter.$or = [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }]
    }

    // UPDATE: Using MongoDB projection to exclude the password. 
    // This automatically ensures encryptionPublicKey and all other safe fields are returned.
    const users = await usersCollection.find(filter, { 
      projection: { password: 0 } 
    }).toArray()

    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    console.error("[User Search API] Error:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}