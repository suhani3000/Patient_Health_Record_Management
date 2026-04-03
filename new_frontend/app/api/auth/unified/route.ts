import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { generateToken } from "@/lib/auth/jwt"
import type { User } from "@/lib/db/models"

export const runtime = "nodejs"

/**
 * POST /api/auth/unified
 *
 * Handles both login and auto-registration for Thirdweb In-App Wallet users.
 *
 * Body: { blockchainAddress: string, email: string, role: "patient" | "doctor" | "lab" | "admin" }
 *
 * Response:
 *   - { token, user }                              — for returning users
 *   - { token, user, needsProfileCompletion: true } — for new Doctor/Lab registrations
 */
export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { blockchainAddress, email, role } = body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!blockchainAddress) {
      return NextResponse.json(
        { error: "blockchainAddress is required" },
        { status: 400 }
      )
    }

    // Normalise to lowercase for consistent comparison (EVM addresses are case-insensitive)
    const normalizedAddress = (blockchainAddress as string).toLowerCase()

    if (!role || !["patient", "doctor", "lab"].includes(role)) {
      return NextResponse.json(
        { error: "role must be one of: patient, doctor, lab" },
        { status: 400 }
      )
    }

    // ── Database ─────────────────────────────────────────────────────────────
    let db
    try {
      db = await getDatabase()
    } catch (e) {
      console.error("[Unified Auth] Database unavailable:", e)
      return NextResponse.json(
        {
          error:
            "Authentication service unavailable (database connection failed). Check MONGODB_URI.",
        },
        { status: 503 }
      )
    }

    const usersCollection = db.collection<User>("users")

    // ── Lookup existing user by wallet address ────────────────────────────────
    // We also accept the checksummed (mixed-case) form so we do a case-insensitive search.
    const existingUser = await usersCollection.findOne({
      blockchainAddress: { $regex: new RegExp(`^${normalizedAddress}$`, "i") },
    })

    if (existingUser) {
      // ── RETURNING USER — just log them in ──────────────────────────────────
      if (existingUser.isBlocked) {
        return NextResponse.json(
          { error: "Account blocked. Contact admin." },
          { status: 403 }
        )
      }

      const token = generateToken({
        userId: existingUser._id.toString(),
        email: existingUser.email,
        role: existingUser.role,
        isVerified: existingUser.isVerified,
        name: existingUser.name,
      })

      return NextResponse.json({
        message: "Login successful",
        token,
        user: {
          _id: existingUser._id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          isVerified: existingUser.isVerified,
          blockchainAddress: existingUser.blockchainAddress,
        },
        needsProfileCompletion: false,
      })
    }

    // ── NEW USER — auto-register ──────────────────────────────────────────────
    //
    // isVerified logic mirrors the original /api/auth/register route exactly:
    //   - Patient  → isVerified: true  (auto-approved)
    //   - Doctor   → isVerified: false (needs admin approval)
    //   - Lab      → isVerified: false (needs admin approval)
    //
    const isNewDoctor = role === "doctor"
    const isNewLab = role === "lab"

    // Derive a friendly display name from the email (before the @) or use the address.
    const displayName = email
      ? email.split("@")[0].replace(/[._+-]/g, " ")
      : `Wallet_${normalizedAddress.slice(2, 8)}`

    const newUser: Omit<User, "_id"> = {
      email: email ?? `${normalizedAddress}@wallet.local`,
      password: "", // No password — Thirdweb wallet is the credential
      name: displayName,
      role: role as User["role"],
      isVerified: role === "patient", // Patients auto-verified; Doctor/Lab require admin approval
      isBlocked: false,
      blockchainAddress: normalizedAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newUser as any)

    const token = generateToken({
      userId: result.insertedId.toString(),
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.isVerified,
      name: newUser.name,
    })

    return NextResponse.json(
      {
        message: "User registered and authenticated successfully",
        token,
        user: {
          _id: result.insertedId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isVerified: newUser.isVerified,
          blockchainAddress: newUser.blockchainAddress,
        },
        // New Doctors and Labs must complete their profile (name, specialization, licenseNumber)
        needsProfileCompletion: isNewDoctor || isNewLab,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Unified Auth] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
