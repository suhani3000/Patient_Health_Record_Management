import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ["patient", "doctor", "lab", "admin"])
    const db = await getDatabase()
    const found = await db.collection("users").findOne(
      { _id: new ObjectId(user.userId) },
      { projection: { password: 0 } }
    )
    if (!found) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json({ user: found })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 })
  }
}