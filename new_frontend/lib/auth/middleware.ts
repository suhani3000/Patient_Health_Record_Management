// Auth middleware remains the same - already properly structured
import type { NextRequest } from "next/server"
import { verifyToken, type JWTPayload } from "./jwt"

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

export function getAuthUser(req: NextRequest): JWTPayload | null {
  const authHeader = req.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

export function requireAuth(req: NextRequest): JWTPayload {
  const user = getAuthUser(req)

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user
}

export function requireRole(req: NextRequest, allowedRoles: string[]): JWTPayload {
  const user = requireAuth(req)

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient permissions")
  }

  return user
}

export function requireVerified(req: NextRequest): JWTPayload {
  const user = requireAuth(req)

  if (!user.isVerified && user.role !== "patient") {
    throw new Error("Account not verified by admin")
  }

  return user
}
