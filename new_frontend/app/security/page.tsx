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
import { ArrowLeft, Copy, KeyRound, ShieldCheck, ShieldAlert, Loader2, Shield } from "lucide-react"
import { formatIdentifier } from "@/lib/utils/format"

const PRIV_KEY_PREFIX = "ehr_privkey_"

export default function SecurityPage() {
  const router = useRouter()
  const account = useActiveAccount()
  const { toast } = useToast()
  const [importText, setImportText] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(false)

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
      toast({ title: "Identification required", description: "Sign in to export your key.", variant: "destructive" })
      return
    }
    const raw = localStorage.getItem(`${PRIV_KEY_PREFIX}${address}`)
    if (!raw) {
      toast({
        title: "No local key",
        description: "Your encryption keys were not found on this device.",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(raw)
      toast({ title: "Copied to clipboard", description: "Store your recovery key in a secure offline location." })
    } catch {
      toast({
        title: "Export failed",
        description: "Clipboard access was denied by your browser.",
        variant: "destructive",
      })
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      toast({ title: "Identification required", description: "Connect your wallet to import a key.", variant: "destructive" })
      return
    }
    
    setLoading(true)
    try {
      const jwk = JSON.parse(importText.trim()) as JsonWebKey
      if (!jwk.kty || jwk.kty !== "RSA" || !jwk.d || !jwk.n) {
        throw new Error("Invalid RSA Private Key format.")
      }
      
      savePrivateKey(address, jwk)
      
      // Sync to escrow
      const storedUser = localStorage.getItem("user")
      const parsedUser = storedUser ? JSON.parse(storedUser) : null
      const role = parsedUser?.role ?? "patient"

      await fetch("/api/auth/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockchainAddress: address,
          role,
          encryptionPrivateKeyJwk: jwk,
        }),
      })

      setImportText("")
      setHasKey(true)
      toast({ title: "Recovery Successful", description: "Your encryption profile has been restored." })
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message || "Invalid key data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="container max-w-lg mx-auto pt-8 space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-500 hover:text-slate-900">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card className="border-none shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="h-2 bg-primary" />
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Security & Recovery</CardTitle>
            </div>
            <CardDescription className="text-sm border-l-4 border-primary/20 pl-4 py-1 leading-relaxed">
              Your recovery key allows you to access your encrypted medical history on any device. 
              <strong> Keep this secret. Anyone with this key can decrypt your files.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 border border-slate-200">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Blockchain Identity</p>
                <code className="text-sm font-semibold text-slate-700">{formatIdentifier(address)}</code>
              </div>
              <div className="flex border-l pl-4 border-slate-200 flex-col items-end">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vault Integrity</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {hasKey ? (
                    <><ShieldCheck className="h-4 w-4 text-green-500" /> <span className="text-sm font-bold text-green-600">Active</span></>
                  ) : (
                    <><ShieldAlert className="h-4 w-4 text-amber-500" /> <span className="text-sm font-bold text-amber-600">Offline</span></>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-bold text-slate-800">Export Backup Profile</Label>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Copies your secure encryption profile to the clipboard. Store this safely in a password manager.
              </p>
              <Button type="button" variant="outline" className="w-full gap-2 rounded-xl py-6 font-bold" onClick={handleExport}>
                <Copy className="h-4 w-4" />
                Copy Recovery String
              </Button>
            </div>

            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-jwk" className="text-base font-bold text-slate-800">Restore from Backup</Label>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Paste your recovery string below to re-authorize this device for decryption.
                </p>
              </div>
              <Textarea
                id="import-jwk"
                placeholder='Paste string here...'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="font-mono text-xs min-h-[140px] rounded-xl bg-slate-50 border-slate-200 focus:ring-primary"
              />
              <Button type="submit" disabled={loading} className="w-full py-6 font-bold">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Restore Vault Access
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
