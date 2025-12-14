import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { verifyPassword } from "@/lib/auth/hash"
import { generateToken } from "@/lib/auth/jwt"
import type { User } from "@/lib/db/models"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Find user
    const user = db.users.find((u: User) => u.email === email)
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json({ error: "Account has been blocked. Please contact admin." }, { status: 403 })
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: userWithoutPassword,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[Login API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
