import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { verifyPassword } from "@/lib/auth/hash"
import { generateToken } from "@/lib/auth/jwt"
import type { User } from "@/lib/db/models"
import { ADMIN_EMAIL, ADMIN_PASSWORD_HASH } from "@/lib/admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch (e) {
      console.error("[Login API Error] Invalid JSON body", e)
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // 🔐 HARD-CODED ADMIN LOGIN
    // if (email === ADMIN_EMAIL) {
    //   if (password !== ADMIN_PASSWORD_HASH) {
    //     return NextResponse.json(
    //       { error: "Invalid credentials" },
    //       { status: 401 }
    //     )
    //   }

    //   const token = generateToken({
    //     userId: "admin-id",
    //     email: ADMIN_EMAIL,
    //     role: "admin",
    //     isVerified: true,
    //   })

    //   return NextResponse.json({
    //     message: "Admin login successful",
    //     token,
    //     role: "admin",
    //   })
    // }
    if (email === ADMIN_EMAIL) {
  if (password !== ADMIN_PASSWORD_HASH) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const token = generateToken({
    userId: "admin-id",
    email: ADMIN_EMAIL,
    role: "admin",
    isVerified: true,
  })

  return NextResponse.json({
    message: "Admin login successful",
    token,
    user: {
      _id: "admin-id",
      email: ADMIN_EMAIL,
      name: "Admin",
      role: "admin",
      isVerified: true,
    },
  })
}


    // 👤 NORMAL USERS
    let db
    try {
      db = await getDatabase()
    } catch (e) {
      console.error("[Login API Error] Database not configured/available", e)
      return NextResponse.json(
        {
          error:
            "Authentication service is not available (database connection failed). Check MONGODB_URI/network access.",
        },
        { status: 503 }
      )
    }
    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Account blocked. Contact admin." },
        { status: 403 }
      )
    }

    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    })

    return NextResponse.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
    })
  } catch (error) {
    console.error("[Login API Error]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
