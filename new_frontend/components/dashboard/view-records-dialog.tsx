"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye, Loader2, Download, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { normalizeRecordForDecryption, ipfsGatewayUrl } from "@/lib/view-encrypted-record"
import { formatIdentifier } from "@/lib/utils/format"

interface ViewRecordsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  patientName: string
  role: "doctor" | "lab"
}

export function ViewRecordsDialog({
  isOpen,
  onOpenChange,
  patientId,
  patientName,
  role,
}: ViewRecordsDialogProps) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [decryptingId, setDecryptingId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadRecords = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const endpoint = role === "doctor" 
        ? `/api/doctor/records/${encodeURIComponent(patientId)}`
        : `/api/lab/records/${encodeURIComponent(patientId)}` // We'll need to create this API for lab if it doesn't exist
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load records")
      setRecords(data.records || [])
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Could not load patient records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [patientId, role, toast])

  useEffect(() => {
    if (isOpen) {
      loadRecords()
    }
  }, [isOpen, loadRecords])

  const handleViewRecord = async (record: any) => {
    const norm = normalizeRecordForDecryption(record)
    if (!norm?.cid) {
      toast({
        title: "Missing file reference",
        description: "No IPFS CID found for this record.",
        variant: "destructive",
      })
      return
    }

    setDecryptingId(record._id)
    try {
      // In this system, records are currently opened via IPFS gateway
      window.open(ipfsGatewayUrl(norm.cid), "_blank", "noopener,noreferrer")
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not open record",
        variant: "destructive",
      })
    } finally {
      setDecryptingId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto glass-card animate-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Medical Records
          </DialogTitle>
          <DialogDescription>
            Viewing records for <span className="font-semibold text-foreground">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Fetching encrypted records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl border-muted">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No records found for this patient.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record._id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold truncate group-hover:text-primary transition-colors">
                        {record.fileName}
                      </span>
                      {record.recordType && (
                        <Badge variant="secondary" className="font-normal">
                          {record.recordType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.uploadDate).toLocaleDateString()}
                      {record.metadata?.description && ` • ${record.metadata.description}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2 hover:bg-primary hover:text-white transition-all shadow-sm"
                    disabled={decryptingId === record._id}
                    onClick={() => handleViewRecord(record)}
                  >
                    {decryptingId === record._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    View & Decrypt
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
