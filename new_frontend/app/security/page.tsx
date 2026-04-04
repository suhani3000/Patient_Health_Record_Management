"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { savePrivateKey } from "@/lib/crypto"
import Link from "next/link"
import { ArrowLeft, Copy, KeyRound } from "lucide-react"

const PRIV_KEY_PREFIX = "ehr_privkey_"

export default function SecurityPage() {
  const router = useRouter()
  const account = useActiveAccount()
  const { toast } = useToast()
  const [importText, setImportText] = useState("")
  const [hasKey, setHasKey] = useState(false)

  const address = account?.address?.toLowerCase() ?? ""

  useEffect(() => {
    const stored = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    if (!stored || !token) {
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    if (!address) return
    setHasKey(!!localStorage.getItem(`${PRIV_KEY_PREFIX}${address}`))
  }, [address])

  const handleExport = async () => {
    if (!address) {
      toast({ title: "Connect wallet", description: "Sign in to export your key.", variant: "destructive" })
      return
    }
    const raw = localStorage.getItem(`${PRIV_KEY_PREFIX}${address}`)
    if (!raw) {
      toast({
        title: "No key on this device",
        description: "Generate or import a recovery key first.",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(raw)
      toast({ title: "Copied", description: "Recovery key copied to clipboard. Store it offline, safely." })
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      })
    }
  }

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      toast({ title: "Connect wallet", description: "Sign in to import your key.", variant: "destructive" })
      return
    }
    let jwk: JsonWebKey
    try {
      jwk = JSON.parse(importText.trim()) as JsonWebKey
    } catch {
      toast({ title: "Invalid JSON", description: "Paste the full JWK string from your backup.", variant: "destructive" })
      return
    }
    if (!jwk.kty || jwk.kty !== "RSA" || !jwk.d || !jwk.n) {
      toast({ title: "Not a valid RSA private JWK", description: "Check your recovery key backup.", variant: "destructive" })
      return
    }
    try {
      savePrivateKey(address, jwk)
      setImportText("")
      setHasKey(true)
      toast({ title: "Recovery key imported", description: "You can decrypt files stored for this wallet." })
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message ?? "Try again.", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="container max-w-lg mx-auto pt-8 space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Security &amp; recovery
            </CardTitle>
            <CardDescription>
              Your encryption private key stays in this browser. Export it to unlock records on another device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wallet:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {address || "—"}
                </code>
              </p>
              <p className="text-sm text-muted-foreground">
                Local key present: {hasKey ? "yes" : "no"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Export recovery key</Label>
              <p className="text-xs text-muted-foreground">
                Copies the JWK from local storage to your clipboard. Anyone with this key can decrypt your shared files.
              </p>
              <Button type="button" variant="outline" className="gap-2" onClick={handleExport}>
                <Copy className="h-4 w-4" />
                Export recovery key
              </Button>
            </div>

            <form onSubmit={handleImport} className="space-y-3">
              <Label htmlFor="import-jwk">Import recovery key</Label>
              <p className="text-xs text-muted-foreground">
                Paste the JWK string you exported from another device. It will be saved for the connected wallet address.
              </p>
              <Textarea
                id="import-jwk"
                placeholder='{"kty":"RSA",...}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="font-mono text-xs min-h-[120px]"
              />
              <Button type="submit">Import recovery key</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
