// JWT Token Utilities

import jwt, { type Secret, type SignOptions } from "jsonwebtoken"

export interface JWTPayload {
  userId: string
  email: string
  role: "patient" | "doctor" | "lab" | "admin"
  isVerified: boolean
}

export interface RefreshTokenPayload {
  userId: string
  tokenVersion?: number
}

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
const ACCESS_TOKEN_EXPIRES_IN = (process.env.ACCESS_TOKEN_EXPIRES_IN ??
  "7d") as SignOptions["expiresIn"]

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || `${JWT_SECRET}-refresh`
const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_TOKEN_EXPIRES_IN ??
  "7d") as SignOptions["expiresIn"]

// Backward-compatible: existing code uses generateToken() as "access token".
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as Secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as Secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET as Secret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  })
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload
  } catch {
    return null
  }
}
