import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { hashPassword } from "@/lib/auth/hash"
import type { User } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch (e) {
      console.error("[Register API] Invalid JSON body:", e)
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { email, password, name, role, specialization, licenseNumber } = body

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["patient", "doctor", "lab"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    let db
    try {
      db = await getDatabase()
    } catch (e) {
      console.error("[Register API] Database not configured/available:", e)
      return NextResponse.json(
        {
          error:
            "Authentication service is not available (database connection failed). Check MONGODB_URI/network access.",
        },
        { status: 503 }
      )
    }
    const usersCollection = db.collection<User>("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create new user
    const newUser: Omit<User, "_id"> = {
      email,
      password: hashedPassword,
      name,
      role,
      isVerified: role === "patient", // Patients auto-verified, doctors/labs need admin approval
      isBlocked: false,
      specialization: role === "doctor" ? specialization : undefined,
      licenseNumber: role === "doctor" || role === "lab" ? licenseNumber : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newUser as any)

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          _id: result.insertedId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isVerified: newUser.isVerified,
        },
        needsVerification: role === "doctor" || role === "lab",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[Register API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
