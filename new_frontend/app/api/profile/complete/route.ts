import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import type { User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

/**
 * POST /api/profile/complete — persist role-specific profile fields after universal intake.
 */
export async function POST(req: NextRequest) {
  try {
    const jwtUser = requireRole(req, ["patient", "doctor", "lab"])
    const body = await req.json()

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const oid = ObjectId.isValid(jwtUser.userId) ? new ObjectId(jwtUser.userId) : null
    if (!oid) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
    }

    const existing = await usersCollection.findOne({ _id: oid })
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (existing.role !== jwtUser.role) {
      return NextResponse.json({ error: "Role mismatch" }, { status: 403 })
    }

    const $set: Record<string, unknown> = { updatedAt: new Date() }

    if (jwtUser.role === "patient") {
      const { name, dateOfBirth, bloodType, emergencyContact } = body
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 })
      }
      if (!dateOfBirth || typeof dateOfBirth !== "string") {
        return NextResponse.json({ error: "Date of birth is required" }, { status: 400 })
      }
      if (!bloodType || typeof bloodType !== "string" || !bloodType.trim()) {
        return NextResponse.json({ error: "Blood type is required" }, { status: 400 })
      }
      if (!emergencyContact || typeof emergencyContact !== "string" || !emergencyContact.trim()) {
        return NextResponse.json({ error: "Emergency contact number is required" }, { status: 400 })
      }
      $set.name = name.trim()
      $set.dateOfBirth = dateOfBirth
      $set.bloodType = bloodType.trim()
      $set.emergencyContact = emergencyContact.trim()
    } else if (jwtUser.role === "doctor") {
      const { name, specialization, licenseNumber } = body
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 })
      }
      if (!specialization || typeof specialization !== "string" || !specialization.trim()) {
        return NextResponse.json({ error: "Specialization is required" }, { status: 400 })
      }
      if (!licenseNumber || typeof licenseNumber !== "string" || !licenseNumber.trim()) {
        return NextResponse.json({ error: "License number is required" }, { status: 400 })
      }
      $set.name = name.trim()
      $set.specialization = specialization.trim()
      $set.licenseNumber = licenseNumber.trim()
    } else if (jwtUser.role === "lab") {
      const { name, licenseNumber } = body
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 })
      }
      if (!licenseNumber || typeof licenseNumber !== "string" || !licenseNumber.trim()) {
        return NextResponse.json({ error: "License number is required" }, { status: 400 })
      }
      $set.name = name.trim()
      $set.licenseNumber = licenseNumber.trim()
    } else {
      return NextResponse.json({ error: "Unsupported role" }, { status: 400 })
    }

    await usersCollection.updateOne({ _id: oid }, { $set })

    const updated = await usersCollection.findOne(
      { _id: oid },
      { projection: { password: 0 } },
    )

    return NextResponse.json({ message: "Profile saved", user: updated }, { status: 200 })
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    console.error("[Profile Complete] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
