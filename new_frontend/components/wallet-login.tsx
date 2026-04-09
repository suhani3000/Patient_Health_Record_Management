"use client"

import { useMemo, useState } from "react"
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
   * Thirdweb In-App: Email OTP and Google OAuth derive *different* smart wallets for the same email.
   * One wallet per auth strategy — user must pick the same method they used at registration.
   */
  const [authMethod, setAuthMethod] = useState<"email" | "google">("email")
  const wallets = useMemo(
    () => [inAppWallet({ auth: { options: [authMethod] } })],
    [authMethod],
  )

  /**
   * Runs after Thirdweb confirms wallet connection.
   * 1. Calls /api/auth/unified → get JWT
   * 2. Stores JWT in localStorage
   * 3. Generates RSA-OAEP keypair if first time
   * 4. Pushes public key to /api/auth/unified (second call, lightweight)
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
          // Do not request private-key escrow on the first call.
          // For new users, this would otherwise block auto-registration.
          // We'll request escrow only after we know `user.encryptionPublicKey` exists.
          requestEncryptionPrivateKeyJwk: false,
        }),
      })

      const authData = await authRes.json()
      if (!authRes.ok) throw new Error(authData.error || "Authentication failed")

      const { token, user, needsProfileCompletion } = authData

      // ── Step 2: Store JWT ──────────────────────────────────────────────────
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      // ── Step 3: Encryption key — restore from server escrow (auto) ──
      if (!hasPrivateKey(walletAddress)) {
        if (user.encryptionPublicKey) {
          // Existing user: ask the server for escrowed private key.
          const escrowRes = await fetch("/api/auth/unified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockchainAddress: walletAddress,
              email: null,
              role,
              requestEncryptionPrivateKeyJwk: true,
            }),
          })

          const escrowData = await escrowRes.json().catch(() => ({}))
          if (escrowRes.ok && escrowData?.encryptionPrivateKeyJwk) {
            savePrivateKey(walletAddress, escrowData.encryptionPrivateKeyJwk)
          } else {
            toast({
              title: "Recovery key missing on server",
              description:
                "This browser does not have your RSA private key. Import your Recovery Key in /security once to seed escrow.",
              variant: "destructive",
              duration: 12_000,
            })
          }
        } else {
          // New user: generate a fresh RSA keypair and seed escrow.
          const { publicKeyB64, privateKeyJwk } = await generateEncryptionKeyPair()
          savePrivateKey(walletAddress, privateKeyJwk)

          await fetch("/api/auth/unified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockchainAddress: walletAddress,
              role,
              encryptionPublicKey: publicKeyB64,
              encryptionPrivateKeyJwk: privateKeyJwk,
            }),
          })
        }
      }

      // Ensure the server has an escrowed copy so decryption works on any future device.
      // (If the user imported/created a local key, this seeds the server-side escrow.)
      if (hasPrivateKey(walletAddress)) {
        try {
          const raw = localStorage.getItem(`ehr_privkey_${walletAddress}`)
          if (raw) {
            const privKeyJwk = JSON.parse(raw)
            await fetch("/api/auth/unified", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                blockchainAddress: walletAddress,
                role,
                encryptionPrivateKeyJwk: privKeyJwk,
              }),
            })
          }
        } catch (e) {
          console.warn("[WalletLogin] Failed to seed server escrow:", e)
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
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div className="w-full space-y-2 rounded-lg border bg-muted/40 p-3 text-left">
        <p className="text-xs font-medium text-foreground">Sign-in method</p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Email and Google each create a <span className="font-medium">different</span> wallet for the same email.
          Always use the method you used when you first registered, or your account and encryption keys will not match.
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={authMethod === "email" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setAuthMethod("email")}
          >
            Email
          </Button>
          <Button
            type="button"
            size="sm"
            variant={authMethod === "google" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setAuthMethod("google")}
          >
            Google
          </Button>
        </div>
      </div>
      <Button 
        onClick={handleSignIn} 
        disabled={busy}
        className="w-full"
      >
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in securely
      </Button>

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