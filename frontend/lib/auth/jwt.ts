// JWT Token Utilities

export interface JWTPayload {
  userId: string
  email: string
  role: "patient" | "doctor" | "lab" | "admin"
  isVerified: boolean
}

const JWT_SECRET = process.env.JWT_SECRET || "hackathon-secret-key-2024"

export function generateToken(payload: JWTPayload): string {
  // In production, use jsonwebtoken library:
  // const jwt = require('jsonwebtoken')
  // return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

  // Mock implementation for demo
  const token = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    }),
  ).toString("base64")

  return token
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // In production, use jsonwebtoken library:
    // const jwt = require('jsonwebtoken')
    // return jwt.verify(token, JWT_SECRET) as JWTPayload

    // Mock implementation for demo
    const decoded = JSON.parse(Buffer.from(token, "base64").toString())

    if (decoded.exp < Date.now()) {
      return null
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      isVerified: decoded.isVerified,
    }
  } catch {
    return null
  }
}
