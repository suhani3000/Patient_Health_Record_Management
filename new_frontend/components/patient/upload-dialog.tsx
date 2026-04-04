"use client"

import type React from "react"
import { useState } from "react"
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
import { Upload, AlertTriangle, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { thirdwebClient, localChain, EHRRegistryABI, EHR_REGISTRY_ADDRESS } from "@/lib/contracts"
import { encryptFile, wrapAESKey } from "@/lib/crypto"

interface UploadDialogProps {
  onUploadSuccess: () => void
}

export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
  const account = useActiveAccount()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadStage, setUploadStage] = useState<
    "idle" | "encrypting" | "uploading-ipfs" | "registering-chain" | "saving-db"
  >("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recordType, setRecordType] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !recordType) {
      toast({ title: "Missing fields", description: "Select a file and record type.", variant: "destructive" })
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      toast({ title: "Not logged in", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      // ── Step 1: Encrypt the file client-side ──────────────────────────────
      setUploadStage("encrypting")

      const fileBuffer = await selectedFile.arrayBuffer()
      const { encryptedBuffer, aesKeyRaw, ivB64 } = await encryptFile(fileBuffer)

      // Get patient's encryption public key from localStorage (stored after login)
      // We need to fetch it from the backend since we stored it there
      let encryptedAESKey: string | null = null
      try {
        // Fetch the current user's public key from their profile
        const profileRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          const patientPublicKey = profileData.user?.encryptionPublicKey
          if (patientPublicKey) {
            encryptedAESKey = await wrapAESKey(aesKeyRaw, patientPublicKey)
          }
        }
      } catch {
        console.warn("[UploadDialog] Could not wrap AES key — record will be stored without encryption key")
      }

      // ── Step 2: Upload ENCRYPTED blob to IPFS ────────────────────────────
      setUploadStage("uploading-ipfs")

      const encryptedBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" })
      const encryptedFile = new File([encryptedBlob], `${selectedFile.name}.enc`)

      const formData = new FormData()
      formData.append("file", encryptedFile)
      formData.append("fileName", selectedFile.name) // original name for display
      formData.append("recordType", recordType)
      formData.append("description", description)
      if (encryptedAESKey) formData.append("encryptedAESKey", encryptedAESKey)
      formData.append("aesIV", ivB64)

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

      if (!account || !EHR_REGISTRY_ADDRESS) {
        blockchainWarning = true
      } else {
        try {
          const contract = getContract({
            client: thirdwebClient,
            chain: localChain,
            address: EHR_REGISTRY_ADDRESS,
            abi: EHRRegistryABI,
          })

          const tx = prepareContractCall({
            contract,
            method: "registerFile",
            params: [recordType],
          })

          const receipt = await sendTransaction({ transaction: tx, account })
          const confirmed = await waitForReceipt({
            client: thirdwebClient,
            chain: localChain,
            transactionHash: receipt.transactionHash,
          })

          transactionHash = confirmed.transactionHash
          for (const log of confirmed.logs ?? []) {
            if (
              log.address?.toLowerCase() === EHR_REGISTRY_ADDRESS.toLowerCase() &&
              log.topics?.length >= 3
            ) {
              fileId = Number(BigInt(log.topics[2]))
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
          description: "File is encrypted on IPFS. Blockchain step was skipped — start Hardhat and set contract addresses.",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Upload Successful 🔒✅",
          description: `Encrypted & stored on IPFS. On-chain File ID: ${fileId} | TX: ${transactionHash?.slice(0, 16)}…`,
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
    }
  }

  const stageLabel: Record<typeof uploadStage, string> = {
    idle: "Upload",
    encrypting: "Encrypting file…",
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
              <Lock className="h-3 w-3" />
              File is encrypted in your browser before upload. Your key never leaves your device.
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
            {!EHR_REGISTRY_ADDRESS && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span><strong>NEXT_PUBLIC_EHR_REGISTRY_ADDRESS</strong> not set. Blockchain step will be skipped.</span>
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