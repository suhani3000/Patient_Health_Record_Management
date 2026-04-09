"use client"

import type React from "react"
import { useRef, useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  thirdwebClient,
  localChain,
  EHRRegistryABI,
  EHR_REGISTRY_ADDRESS_DEPLOYED,
} from "@/lib/contracts"

interface UploadDialogProps {
  onUploadSuccess: () => void
}

/** Must be a named type: in .tsx, `useState` + newline + `<` is parsed as JSX, not generics. */
type UploadStage = "idle" | "encrypting" | "uploading-ipfs" | "registering-chain" | "saving-db"

export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
  const account = useActiveAccount()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitInFlightRef = useRef(false)
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recordType, setRecordType] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Guard against double-submit (double click, Enter key repeat, etc.)
    if (submitInFlightRef.current || loading) return
    submitInFlightRef.current = true

    if (!selectedFile || !recordType) {
      toast({ title: "Missing fields", description: "Select a file and record type.", variant: "destructive" })
      submitInFlightRef.current = false
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      toast({ title: "Not logged in", variant: "destructive" })
      submitInFlightRef.current = false
      return
    }

    setLoading(true)

    try {
      // ── Step 1: Upload plaintext file to IPFS ────────────────────────────
      setUploadStage("uploading-ipfs")

      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("fileName", selectedFile.name) // original name for display
      formData.append("recordType", recordType)
      formData.append("description", description)

      const uploadRes = await fetch("/api/patient/records", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || "IPFS upload failed")

      const { record } = uploadData
      const recordId: string = record?._id ?? ""

      // ── Step 3: Register on blockchain ───────────────────────────────────
      setUploadStage("registering-chain")

      let fileId: number | null = null
      let transactionHash: string | null = null
      let blockchainWarning = false

      const registryAddr = EHR_REGISTRY_ADDRESS_DEPLOYED
      if (!account || !registryAddr) {
        blockchainWarning = true
      } else {
        const activeAccount = account
        const contractAddress = registryAddr satisfies `0x${string}`
        try {
          const contract = getContract({
            client: thirdwebClient,
            chain: localChain,
            address: contractAddress,
            abi: EHRRegistryABI,
          })

          const tx = prepareContractCall({
            contract,
            method: "registerFile",
            params: [recordType],
          })

          const receipt = await sendTransaction({ transaction: tx, account: activeAccount })
          const confirmed = await waitForReceipt({
            client: thirdwebClient,
            chain: localChain,
            transactionHash: receipt.transactionHash,
          })

          transactionHash = confirmed.transactionHash
          const regLower = contractAddress.toLowerCase()
          for (const log of confirmed.logs ?? []) {
            const topic2 = log.topics?.[2]
            if (
              log.address?.toLowerCase() === regLower &&
              topic2 !== undefined &&
              topic2 !== null
            ) {
              fileId = Number(BigInt(topic2))
              break
            }
          }
        } catch (err) {
          console.error("[UploadDialog] Blockchain error:", err)
          blockchainWarning = true
        }
      }

      // ── Step 4: Patch MongoDB record with blockchain data ────────────────
      setUploadStage("saving-db")

      if (recordId && (fileId !== null || transactionHash)) {
        try {
          await fetch(`/api/patient/records/${recordId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileId,
              transactionHash: transactionHash ?? "pending",
            }),
          })
        } catch (err) {
          console.warn("[UploadDialog] Patch failed:", err)
        }
      }

      // ── Done ─────────────────────────────────────────────────────────────
      if (blockchainWarning) {
        toast({
          title: "File Uploaded (Off-Chain Only) ⚠️",
          description: "File stored on IPFS. Blockchain step was skipped — start Hardhat and set contract addresses.",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Upload Successful ✅",
          description: `Stored on IPFS. On-chain File ID: ${fileId} | TX: ${transactionHash?.slice(0, 16)}…`,
          duration: 6000,
        })
      }

      setOpen(false)
      setSelectedFile(null)
      setRecordType("")
      setDescription("")
      onUploadSuccess()
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
      setUploadStage("idle")
      submitInFlightRef.current = false
    }
  }

  const stageLabel: Record<UploadStage, string> = {
    idle: "Upload",
    encrypting: "Preparing upload…",
    "uploading-ipfs": "Uploading to IPFS…",
    "registering-chain": "Registering on blockchain…",
    "saving-db": "Saving record…",
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Medical Record</DialogTitle>
            <DialogDescription className="flex items-center gap-1">
              File will be uploaded to IPFS.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required />
              {selectedFile && <p className="text-xs text-muted-foreground">{selectedFile.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recordType">Record Type</Label>
              <Select value={recordType} onValueChange={setRecordType} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {["Lab Report","Prescription","X-Ray","MRI Scan","CT Scan","Blood Test","Medical Certificate","Other"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" placeholder="Add any notes…" value={description}
                onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            {!EHR_REGISTRY_ADDRESS_DEPLOYED && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span><strong>NEXT_PUBLIC_EHR_REGISTRY_ADDRESS</strong> not set or invalid. Blockchain step will be skipped.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !selectedFile || !recordType}>
              {loading ? stageLabel[uploadStage] : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}