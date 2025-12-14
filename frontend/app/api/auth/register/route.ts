import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { hashPassword } from "@/lib/auth/hash"
import type { User } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, specialization, licenseNumber } = await req.json()

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["patient", "doctor", "lab", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Check if user already exists
    const existingUser = db.users.find((u: User) => u.email === email)
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create new user
    const newUser: User = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      password: hashedPassword,
      name,
      role,
      isVerified: role === "patient" || role === "admin", // Patients and admins are auto-verified
      isBlocked: false,
      specialization: role === "doctor" ? specialization : undefined,
      licenseNumber: role === "doctor" || role === "lab" ? licenseNumber : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.users.push(newUser)

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: userWithoutPassword,
        needsVerification: role === "doctor" || role === "lab",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[Register API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
