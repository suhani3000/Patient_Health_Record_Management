import { NextRequest, NextResponse } from "next/server"
import { verifyRefreshToken, generateAccessToken } from "@/lib/auth/jwt"
import { getDatabase } from "@/lib/db/mongo"
import type { User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

/**
 * Refresh Token Endpoint
 * 
 * This endpoint allows users to obtain a new access token using their refresh token.
 * This prevents users from having to log in again when their access token expires.
 * 
 * Flow:
 * 1. Client sends refresh token in request body
 * 2. Server verifies refresh token
 * 3. Server fetches latest user data from database
 * 4. Server generates new access token (and optionally new refresh token)
 * 5. Server returns new tokens to client
 */
export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      )
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      )
    }

    // Fetch latest user data from database
    // This ensures we have the most up-to-date user information
    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const userId = ObjectId.isValid(decoded.userId)
      ? new ObjectId(decoded.userId)
      : null

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid refresh token payload" },
        { status: 401 }
      )
    }

    const user = await usersCollection.findOne({ _id: userId.toString() })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Account blocked. Contact admin." },
        { status: 403 }
      )
    }

    // Optional: Check token version for revocation
    // If you implement token rotation, you can check decoded.tokenVersion
    // against user.tokenVersion in database to revoke tokens

    // Generate new access token with latest user data
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    })

    // Optionally generate a new refresh token (token rotation)
    // This invalidates the old refresh token and improves security
    // For now, we'll return the same refresh token
    // Uncomment below for token rotation:
    // const newRefreshToken = generateRefreshToken({
    //   userId: user._id.toString(),
    //   tokenVersion: user.tokenVersion || 0
    // })

    return NextResponse.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      // refreshToken: newRefreshToken, // Uncomment if using token rotation
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
    })
  } catch (error) {
    console.error("[Refresh Token API Error]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
