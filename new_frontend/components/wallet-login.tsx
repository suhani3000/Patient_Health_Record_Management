"use client"

import { useState } from "react"
import { createThirdwebClient } from "thirdweb"
import { ConnectButton, useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react"
import { inAppWallet } from "thirdweb/wallets"
import { useRouter } from "next/navigation"
import { generateEncryptionKeyPair, savePrivateKey, hasPrivateKey } from "@/lib/crypto"

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
})

const wallets = [
  inAppWallet({
    auth: { options: ["email", "google"] },
  }),
]

interface WalletLoginProps {
  role: "patient" | "doctor" | "lab" | "admin"
  /** Called after JWT is saved — use this to refresh parent state */
  onLoginSuccess?: (user: any) => void
}

export function WalletLogin({ role, onLoginSuccess }: WalletLoginProps) {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "authenticating" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  /**
   * Runs after Thirdweb confirms wallet connection.
   * 1. Calls /api/auth/unified → get JWT
   * 2. Stores JWT in localStorage
   * 3. Generates RSA-OAEP keypair if first time
   * 4. Pushes public key to /api/auth/unified (second call, lightweight)
   * 5. Redirects to role dashboard
   */
  const handleConnect = async (wallet: any) => {
    setStatus("authenticating")
    setError(null)

    try {
      const account = wallet.getAccount()
      if (!account?.address) throw new Error("Could not read wallet address")

      const walletAddress: string = account.address.toLowerCase()

      // ── Step 1: Authenticate with backend ──────────────────────────────────
      const authRes = await fetch("/api/auth/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockchainAddress: walletAddress,
          email: null, // Thirdweb will have set this during OAuth — backend derives from wallet
          role,
        }),
      })

      const authData = await authRes.json()
      if (!authRes.ok) throw new Error(authData.error || "Authentication failed")

      const { token, user } = authData

      // ── Step 2: Store JWT ──────────────────────────────────────────────────
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      // ── Step 3: Generate encryption keypair if first time on this device ──
      if (!hasPrivateKey(walletAddress)) {
        const { publicKeyB64, privateKeyJwk } = await generateEncryptionKeyPair()
        savePrivateKey(walletAddress, privateKeyJwk)

        // ── Step 4: Push public key to backend ────────────────────────────
        // We call unified again — it will find the existing user (returning user path)
        // and set encryptionPublicKey if it isn't already set
        await fetch("/api/auth/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockchainAddress: walletAddress,
            role,
            encryptionPublicKey: publicKeyB64,
          }),
        })
        // No need to update the stored token — the public key doesn't affect JWT claims
      }

      // ── Step 5: Notify parent + redirect ──────────────────────────────────
      setStatus("done")
      onLoginSuccess?.(user)
      router.push(`/${role}`)

    } catch (err: any) {
      console.error("[WalletLogin] Post-connect error:", err)
      setError(err.message ?? "Login failed. Please try again.")
      setStatus("idle")
      // Clear any partial state
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <ConnectButton
        client={client}
        wallets={wallets}
        connectButton={{ label: "Sign in securely" }}
        onConnect={handleConnect}
      />

      {/* Status feedback */}
      {status === "authenticating" && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Setting up your secure account…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center max-w-xs">
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}