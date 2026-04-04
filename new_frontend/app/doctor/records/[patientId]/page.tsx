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
import { decryptFile, unwrapAESKey } from "@/lib/crypto"

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

  const doctorAddress = account?.address?.toLowerCase() ?? ""

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
    if (!doctorAddress) {
      toast({
        title: "Wallet required",
        description: "Connect your wallet to decrypt files.",
        variant: "destructive",
      })
      return
    }
    if (!record.myEncryptedAESKey) {
      toast({
        title: "No encryption key for this record",
        description: "The patient may need to grant access again so keys can be shared.",
        variant: "destructive",
      })
      return
    }
    if (!record.aesIV) {
      toast({ title: "Missing IV", description: "This record cannot be decrypted.", variant: "destructive" })
      return
    }

    const cid = record.cid || record.fileCID
    if (!cid) {
      toast({ title: "Missing file reference", description: "No IPFS CID on this record.", variant: "destructive" })
      return
    }

    setDecryptingId(recordIdStr(record))
    try {
      const aesKeyRaw = await unwrapAESKey(record.myEncryptedAESKey, doctorAddress)

      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`
      const fileRes = await fetch(gatewayUrl)
      if (!fileRes.ok) throw new Error(`Gateway error (${fileRes.status})`)

      const ciphertextBuffer = await fileRes.arrayBuffer()
      const plain = await decryptFile(ciphertextBuffer, aesKeyRaw, record.aesIV)

      const mime = record.fileType?.trim() || "application/octet-stream"
      const blob = new Blob([plain], { type: mime })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
