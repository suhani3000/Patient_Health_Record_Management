
// CREATE NEW FILE: new_frontend/components/patient/upload-dialog.tsx
// This handles patient file uploads with encryption

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { encryptFile, wrapAESKey, hasPrivateKey } from "@/lib/crypto"
import { useActiveAccount } from "thirdweb/react"

interface UploadDialogProps {
  onUploadSuccess?: () => void
}

export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
  const account = useActiveAccount()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    fileName: "",
    recordType: "Lab Report",
    description: "",
  })

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      })
      return
    }

    if (!uploadData.fileName) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive",
      })
      return
    }

    const walletAddress = account?.address?.toLowerCase()
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Wallet not connected. Please reconnect.",
        variant: "destructive",
      })
      return
    }

    if (!hasPrivateKey(walletAddress)) {
      toast({
        title: "Error",
        description:
          "Encryption key not found. Please log out and log back in to generate keys.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      console.log("[Patient Upload] Starting encryption workflow...")

      // Step 1: Encrypt file
      const fileBuffer = await selectedFile.arrayBuffer()
      const { encryptedBuffer, aesKeyRaw, ivB64 } = await encryptFile(fileBuffer)
      console.log("[Patient Upload] File encrypted with AES-256-GCM ✅")

      // Step 2: Wrap AES key with patient's own public key
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No auth token. Please log in again.")
      }

      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!meRes.ok) {
        throw new Error("Could not fetch patient's public key")
      }

      const meData = await meRes.json()
      const patientPub = meData.user?.encryptionPublicKey as string | undefined
      if (!patientPub) {
        throw new Error("Patient has no encryption public key on file")
      }

      const encryptedAESKey = await wrapAESKey(aesKeyRaw, patientPub)
      console.log("[Patient Upload] AES key wrapped with patient's public key ✅")

      // Step 3: Prepare FormData
      const encBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" })
      const baseName = uploadData.fileName.replace(/\.enc$/i, "")
      const encryptedFile = new File([encBlob], `${baseName}.enc`)

      const formData = new FormData()
      formData.append("file", encryptedFile)
      formData.append("fileName", uploadData.fileName)
      formData.append("recordType", uploadData.recordType)
      formData.append("description", uploadData.description)
      formData.append("encryptedAESKey", encryptedAESKey)
      formData.append("aesIV", ivB64)

      console.log("[Patient Upload] FormData prepared, uploading...")

      // Step 4: Upload
      const res = await fetch("/api/patient/records/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Upload failed")
      }

      console.log("[Patient Upload] Upload successful ✅")

      toast({
        title: "Success",
        description: "Record uploaded and encrypted successfully",
      })

      // Reset form
      setUploadData({
        fileName: "",
        recordType: "Lab Report",
        description: "",
      })
      setSelectedFile(null)
      setOpen(false)
      onUploadSuccess?.()

    } catch (error: any) {
      console.error("[Patient Upload] Error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload record",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
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
        <DialogHeader>
          <DialogTitle>Upload Medical Record</DialogTitle>
          <DialogDescription>
            Your file will be encrypted before upload
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name *</Label>
            <Input
              id="fileName"
              placeholder="e.g., Blood Test Results.pdf"
              value={uploadData.fileName}
              onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recordType">Record Type *</Label>
            <Input
              id="recordType"
              placeholder="e.g., Lab Report, X-Ray, Prescription"
              value={uploadData.recordType}
              onChange={(e) => setUploadData({ ...uploadData, recordType: e.target.value })}
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Select File *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Brief description..."
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              disabled={uploading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload (Encrypted)"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}