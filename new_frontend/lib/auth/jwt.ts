// JWT Token Utilities

import jwt from "jsonwebtoken"

export interface JWTPayload {
  userId: string
  email: string
  role: "patient" | "doctor" | "lab" | "admin"
  isVerified: boolean
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
const JWT_EXPIRES_IN = "7d"

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}
