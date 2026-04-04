"use client"

import { useState } from "react"
import { createThirdwebClient } from "thirdweb"
import { useConnectModal } from "thirdweb/react"
import { inAppWallet } from "thirdweb/wallets"
import { useRouter } from "next/navigation"
import { generateEncryptionKeyPair, savePrivateKey, hasPrivateKey } from "@/lib/crypto"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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
  const { toast } = useToast()
  const { connect, isConnecting } = useConnectModal()
  const [status, setStatus] = useState<"idle" | "authenticating" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  /**
   * Triggered when the user clicks "Sign In".
   * 1. Opens the Thirdweb modal programmatically (no nested <button>)
   * 2. On success, calls /api/auth/unified → get JWT
   * 3. Stores JWT in localStorage
   * 4. Generates RSA-OAEP keypair if first time
   * 5. Redirects to role dashboard
   */
  const handleSignIn = async () => {
    setError(null)

    let wallet: any
    try {
      // Open the Thirdweb connect modal – resolves when user finishes auth
      wallet = await connect({
        client,
        wallets,
      })
    } catch (err: any) {
      // User closed the modal or cancelled — not a critical error
      console.log("[WalletLogin] Connect modal dismissed:", err?.message)
      return
    }

    setStatus("authenticating")

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
          email: null, // backend derives email from the wallet record
          role,
        }),
      })

      const authData = await authRes.json()
      if (!authRes.ok) throw new Error(authData.error || "Authentication failed")

      const { token, user, needsProfileCompletion } = authData

      // ── Step 2: Store JWT ──────────────────────────────────────────────────
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      // ── Step 3: Encryption key — new device with existing server key must import recovery key ──
      if (!hasPrivateKey(walletAddress)) {
        if (user.encryptionPublicKey) {
          toast({
            title: "New device detected",
            description:
              "Open /security (Security & recovery) and import your Recovery Key to decrypt existing records.",
            variant: "destructive",
            duration: 12_000,
          })
        } else {
          const { publicKeyB64, privateKeyJwk } = await generateEncryptionKeyPair()
          savePrivateKey(walletAddress, privateKeyJwk)

          await fetch("/api/auth/unified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockchainAddress: walletAddress,
              role,
              encryptionPublicKey: publicKeyB64,
            }),
          })
        }
      }

      // ── Step 4: Notify parent + redirect ──────────────────────────────────
      setStatus("done")
      onLoginSuccess?.(user)
      if (needsProfileCompletion) {
        router.push("/complete-profile")
      } else {
        router.push(`/${role}`)
      }

    } catch (err: any) {
      console.error("[WalletLogin] Post-connect error:", err)
      setError(err.message ?? "Login failed. Please try again.")
      setStatus("idle")
      // Clear any partial state
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }

  const busy = isConnecting || status === "authenticating"

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <Button
        id="wallet-login-btn"
        className="w-full gap-2"
        onClick={handleSignIn}
        disabled={busy}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Signing in…" : "Sign in securely"}
      </Button>

      {error && (
        <p className="text-sm text-red-600 text-center max-w-xs">
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}