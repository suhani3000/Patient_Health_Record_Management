"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  normalizeRecordForDecryption,
  resolveWalletAddressForCrypto,
  fetchDecryptAndOpen,
  ipfsGatewayUrl,
  coerceCryptoString,
} from "@/lib/view-encrypted-record"

interface DoctorRecord {
  _id: string | { toString?: () => string }
  fileName: string
  recordType?: string
  cid?: string
  fileCID?: string
  fileType?: string
  aesIV?: string
  myEncryptedAESKey?: string
  uploadDate?: string
  createdAt?: string
  metadata?: { description?: string }
}

export default function DoctorPatientRecordsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const account = useActiveAccount()
  const { toast } = useToast()

  const patientId = typeof params.patientId === "string" ? params.patientId : ""
  const patientName = searchParams.get("name") || "Patient"

  const [records, setRecords] = useState<DoctorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [decryptingId, setDecryptingId] = useState<string | null>(null)

  const profileChainAddress = (() => {
    try {
      const raw = localStorage.getItem("user")
      if (!raw) return undefined
      return JSON.parse(raw).blockchainAddress as string | undefined
    } catch {
      return undefined
    }
  })()

  const loadRecords = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token || !patientId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/doctor/records/${encodeURIComponent(patientId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load records")
      setRecords(data.records || [])
    } catch (e: any) {
      toast({
        title: "Could not load records",
        description: e.message ?? "Try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [patientId, toast])

  useEffect(() => {
    const stored = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    if (!stored || !token) {
      router.replace("/")
      return
    }
    try {
      const u = JSON.parse(stored)
      if (u.role !== "doctor") {
        router.replace("/")
        return
      }
    } catch {
      router.replace("/")
      return
    }
    loadRecords()
  }, [loadRecords, router])

  const recordIdStr = (r: DoctorRecord) => String(r._id)

  const handleViewRecord = async (record: DoctorRecord) => {
    const walletAddress = resolveWalletAddressForCrypto(account?.address, profileChainAddress)

    if (!walletAddress) {
      toast({
        title: "Wallet address unavailable",
        description: "Reconnect from the home page so your wallet matches your profile, or check /security for your key.",
        variant: "destructive",
      })
      return
    }

    const norm = normalizeRecordForDecryption(record)
    const cid = norm?.cid
    const wrappedKey = coerceCryptoString(record.myEncryptedAESKey)
    const iv = norm?.aesIV
    const fileType = norm?.fileType || record.fileType?.trim() || "application/octet-stream"

    if (!cid) {
      toast({
        title: "Missing file reference",
        description: "No IPFS CID on this record (checked cid / fileCID).",
        variant: "destructive",
      })
      return
    }

    if (!wrappedKey || !iv) {
      if (!wrappedKey && cid) {
        toast({
          title: "No key shared — opening raw IPFS",
          description: "You will see ciphertext unless the patient re-grants access with key sharing.",
          duration: 6000,
        })
        window.open(ipfsGatewayUrl(cid), "_blank", "noopener,noreferrer")
        return
      }
      if (!wrappedKey) {
        toast({
          title: "No encryption key for this record",
          description: "Ask the patient to grant access again so your wrapped AES key is stored.",
          variant: "destructive",
        })
      } else {
        toast({ title: "Missing IV", description: "This record cannot be decrypted.", variant: "destructive" })
      }
      return
    }

    setDecryptingId(recordIdStr(record))
    try {
      await fetchDecryptAndOpen({
        cid,
        wrappedKeyB64: wrappedKey,
        aesIV: iv,
        fileType,
        walletAddressLower: walletAddress,
        displayFileName: record.fileName || "record",
      })
    } catch (err: any) {
      console.error("[ViewRecord]", err)
      toast({
        title: "Decryption failed",
        description: err.message ?? "Could not open this file.",
        variant: "destructive",
      })
    } finally {
      setDecryptingId(null)
    }
  }

  const displayDate = (r: DoctorRecord) => {
    const d = r.uploadDate || r.createdAt
    return d ? new Date(d).toLocaleDateString() : "—"
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/doctor" aria-label="Back to dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">Medical records</h1>
              <p className="text-sm text-muted-foreground truncate">{patientName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Encrypted files
            </CardTitle>
            <CardDescription>
              View opens the decrypted file in a new tab. Decryption runs only in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No records for this patient.</p>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={recordIdStr(record)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{record.fileName}</span>
                        {record.recordType && (
                          <Badge variant="secondary" className="shrink-0">
                            {record.recordType}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {displayDate(record)}
                        {record.metadata?.description && ` • ${record.metadata.description}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-2 shrink-0"
                      disabled={decryptingId === recordIdStr(record)}
                      onClick={() => handleViewRecord(record)}
                    >
                      {decryptingId === recordIdStr(record) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      View record
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
