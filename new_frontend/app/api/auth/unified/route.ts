import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { generateToken } from "@/lib/auth/jwt"
import type { User } from "@/lib/db/models"
import crypto from "crypto"

export const runtime = "nodejs"

const ESCROW_SECRET = process.env.KEY_ESCROW_SECRET ?? "dev-insecure-escrow-secret"

function deriveEscrowKey(): Buffer {
  // 32-byte AES-256 key
  return crypto.createHash("sha256").update(ESCROW_SECRET).digest()
}

function encryptEscrowString(plaintext: string): User["encryptionPrivateKeyEscrow"] {
  const iv = crypto.randomBytes(12) // recommended length for GCM
  const key = deriveEscrowKey()
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const cipherText = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
    cipherB64: cipherText.toString("base64"),
  }
}

function decryptEscrowString(payload: NonNullable<User["encryptionPrivateKeyEscrow"]>): string {
  const key = deriveEscrowKey()
  const iv = Buffer.from(payload.ivB64, "base64")
  const tag = Buffer.from(payload.tagB64, "base64")
  const cipherText = Buffer.from(payload.cipherB64, "base64")

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8")
  return plaintext
}

/**
 * POST /api/auth/unified
 *
 * Handles both login and auto-registration for Thirdweb In-App Wallet users.
 *
 * Body: { blockchainAddress: string, email: string, role: "patient" | "doctor" | "lab" | "admin" }
 *
 * Response:
 *   - { token, user }                              — for returning users
 *   - { token, user, needsProfileCompletion: true } — for all new registrations (universal intake)
 */
export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const {
      blockchainAddress,
      email,
      role,
      encryptionPublicKey,
      encryptionPrivateKeyJwk,
      requestEncryptionPrivateKeyJwk,
    } = body
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

      let resolvedEncryptionPublicKey = existingUser.encryptionPublicKey
      if (encryptionPublicKey && !existingUser.encryptionPublicKey) {
        await usersCollection.updateOne(
          { _id: existingUser._id },
          { $set: { encryptionPublicKey } }
        )
        resolvedEncryptionPublicKey = encryptionPublicKey
      }

      // If the client generated keys on this device, store the RSA private key escrow (encrypted).
      if (encryptionPrivateKeyJwk) {
        const escrowPayload = encryptEscrowString(JSON.stringify(encryptionPrivateKeyJwk))
        await usersCollection.updateOne(
          { _id: existingUser._id },
          { $set: { encryptionPrivateKeyEscrow: escrowPayload } }
        )
      }

      let resolvedEncryptionPrivateKeyJwk: any = null
      if (requestEncryptionPrivateKeyJwk && existingUser.encryptionPrivateKeyEscrow) {
        try {
          const decrypted = decryptEscrowString(existingUser.encryptionPrivateKeyEscrow)
          resolvedEncryptionPrivateKeyJwk = JSON.parse(decrypted)
        } catch (e) {
          console.warn("[Unified Auth] Failed to decrypt escrow private key:", e)
        }
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
          encryptionPublicKey: resolvedEncryptionPublicKey ?? null,
        },
        needsProfileCompletion: false,
        ...(resolvedEncryptionPrivateKeyJwk
          ? { encryptionPrivateKeyJwk: resolvedEncryptionPrivateKeyJwk }
          : {}),
      })
    }

    // Prevent auto-registration when the client is only trying to restore
    // the encryption private key from escrow.
    // Auto-registering here would create a different account/encryption context
    // and guarantees decryption will still fail.
    if (requestEncryptionPrivateKeyJwk) {
      return NextResponse.json(
        {
          error:
            "No user found for this wallet address. Import your Recovery Key once to seed escrow.",
        },
        { status: 404 }
      )
    }

    // ── NEW USER — auto-register ──────────────────────────────────────────────
    //
    // isVerified logic mirrors the original /api/auth/register route exactly:
    //   - Patient  → isVerified: true  (auto-approved)
    //   - Doctor   → isVerified: false (needs admin approval)
    //   - Lab      → isVerified: false (needs admin approval)
    //
    // Derive a friendly display name from the email (before the @) or use the address.
    const displayName = email
      ? email.split("@")[0].replace(/[._+-]/g, " ")
      : `Wallet_${normalizedAddress.slice(2, 8)}`

    const newUser: Omit<User, "_id"> = {
      email: email ?? `${normalizedAddress}@wallet.local`,
      password: "",
      name: displayName,
      role: role as User["role"],
      isVerified: role === "patient",
      isBlocked: false,
      blockchainAddress: normalizedAddress,
      encryptionPublicKey: encryptionPublicKey ?? undefined,
      ...(encryptionPrivateKeyJwk
        ? { encryptionPrivateKeyEscrow: encryptEscrowString(JSON.stringify(encryptionPrivateKeyJwk)) }
        : {}),
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
          encryptionPublicKey: newUser.encryptionPublicKey ?? null,
        },
        needsProfileCompletion: true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Unified Auth] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
