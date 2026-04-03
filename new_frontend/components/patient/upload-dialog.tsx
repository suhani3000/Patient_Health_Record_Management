"use client"

import type React from "react"
import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  EHR_REGISTRY_ADDRESS,
} from "@/lib/contracts"

interface UploadDialogProps {
  onUploadSuccess: () => void
}

export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
  const account = useActiveAccount()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadStage, setUploadStage] = useState<
    "idle" | "uploading-ipfs" | "registering-chain" | "saving-db"
  >("idle")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recordType, setRecordType] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !recordType) {
      toast({
        title: "Missing fields",
        description: "Please select a file and choose a record type.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setUploadStage("uploading-ipfs")

    try {
      const token = localStorage.getItem("token")

      // ── Step 1: Upload file to IPFS via the existing backend route ──────────
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("fileName", selectedFile.name)
      formData.append("recordType", recordType)
      formData.append("description", description)

      const uploadRes = await fetch("/api/patient/records", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "IPFS upload failed")
      }

      const { record } = uploadData
      const cid: string = record?.cid ?? ""
      const recordId: string = record?._id ?? ""

      // ── Step 2: Register file on EHRRegistry smart contract ───────────────
      setUploadStage("registering-chain")

      let fileId: number | null = null
      let transactionHash: string | null = null
      let blockchainWarning = false

      if (!account) {
        console.warn("[UploadDialog] No wallet connected — skipping on-chain registration")
        blockchainWarning = true
      } else if (!EHR_REGISTRY_ADDRESS) {
        console.warn("[UploadDialog] EHR_REGISTRY_ADDRESS not set — skipping on-chain registration")
        blockchainWarning = true
      } else {
        try {
          const contract = getContract({
            client: thirdwebClient,
            chain: localChain,
            address: EHR_REGISTRY_ADDRESS,
            abi: EHRRegistryABI,
          })

          const transaction = prepareContractCall({
            contract,
            method: "registerFile",
            params: [recordType],
          })

          const receipt = await sendTransaction({
            transaction,
            account,
          })

          // Wait for confirmation and get full receipt with logs
          const confirmedReceipt = await waitForReceipt({
            client: thirdwebClient,
            chain: localChain,
            transactionHash: receipt.transactionHash,
          })

          transactionHash = confirmedReceipt.transactionHash

          // ── Parse the FileRegistered event to extract fileId ───────────────
          // Event: FileRegistered(address indexed patient, uint256 indexed fileId, string category)
          // The fileId is the second indexed topic (topics[2]) in the log entry.
          for (const log of confirmedReceipt.logs ?? []) {
            if (
              log.address?.toLowerCase() === EHR_REGISTRY_ADDRESS.toLowerCase() &&
              log.topics &&
              log.topics.length >= 3
            ) {
              // topics[2] is the indexed fileId (padded uint256 as hex)
              const fileIdHex = log.topics[2]
              if (fileIdHex) {
                fileId = Number(BigInt(fileIdHex))
                break
              }
            }
          }
        } catch (chainErr: any) {
          console.error("[UploadDialog] Blockchain registration failed:", chainErr)
          blockchainWarning = true
        }
      }

      // ── Step 3: Persist fileId + transactionHash to MongoDB ───────────────
      setUploadStage("saving-db")

      if ((fileId !== null || transactionHash) && recordId) {
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
        } catch (patchErr) {
          console.warn("[UploadDialog] Could not patch record with blockchain data:", patchErr)
        }
      }

      // ── Success feedback ───────────────────────────────────────────────────
      if (blockchainWarning) {
        toast({
          title: "File Uploaded (Off-Chain Only)",
          description:
            "⚠️ Blockchain transaction failed — saving off-chain only. Start your Hardhat node and set contract addresses to enable on-chain registration.",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Upload Successful ✅",
          description: `File registered on-chain. File ID: ${fileId} | TX: ${transactionHash?.slice(0, 16)}…`,
          duration: 6000,
        })
      }

      setOpen(false)
      setSelectedFile(null)
      setRecordType("")
      setDescription("")
      onUploadSuccess()
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message ?? "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setUploadStage("idle")
    }
  }

  const stageLabel: Record<typeof uploadStage, string> = {
    idle: "Upload",
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
            <DialogDescription>
              Your file will be stored on IPFS and registered on the blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recordType">Record Type</Label>
              <Select value={recordType} onValueChange={setRecordType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lab Report">Lab Report</SelectItem>
                  <SelectItem value="Prescription">Prescription</SelectItem>
                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                  <SelectItem value="MRI Scan">MRI Scan</SelectItem>
                  <SelectItem value="CT Scan">CT Scan</SelectItem>
                  <SelectItem value="Blood Test">Blood Test</SelectItem>
                  <SelectItem value="Medical Certificate">Medical Certificate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional notes…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Blockchain warning banner */}
            {!EHR_REGISTRY_ADDRESS && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>NEXT_PUBLIC_EHR_REGISTRY_ADDRESS</strong> is not set. File will be saved
                  off-chain only until a contract address is configured.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedFile || !recordType}
            >
              {loading ? stageLabel[uploadStage] : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
