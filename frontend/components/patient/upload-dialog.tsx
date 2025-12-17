// "use client"

// import type React from "react"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Upload } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"

// interface UploadDialogProps {
//   onUploadSuccess: () => void
// }

// export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
//   const [open, setOpen] = useState(false)
//   const [loading, setLoading] = useState(false)
//   const [fileName, setFileName] = useState("")
//   const [recordType, setRecordType] = useState("")
//   const [description, setDescription] = useState("")
//   const { toast } = useToast()

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (file) {
//       setFileName(file.name)
//     }
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       const token = localStorage.getItem("token")
//       const fileType = fileName.split(".").pop() || "pdf"

//       const response = await fetch("/api/patient/upload", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           fileName,
//           fileType,
//           recordType,
//           description,
//           fileData: "mock_file_data",
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || "Upload failed")
//       }

//       toast({
//         title: "Upload Successful",
//         description: "Your medical record has been uploaded successfully.",
//       })

//       setOpen(false)
//       setFileName("")
//       setRecordType("")
//       setDescription("")
//       onUploadSuccess()
//     } catch (error: any) {
//       toast({
//         title: "Upload Failed",
//         description: error.message,
//         variant: "destructive",
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button className="gap-2">
//           <Upload className="h-4 w-4" />
//           Upload Record
//         </Button>
//       </DialogTrigger>
//       <DialogContent>
//         <form onSubmit={handleSubmit}>
//           <DialogHeader>
//             <DialogTitle>Upload Medical Record</DialogTitle>
//             <DialogDescription>Upload a new medical record or test result to your health records.</DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="file">File</Label>
//               <Input id="file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required />
//             </div>
//             <div className="grid gap-2">
//               <Label htmlFor="recordType">Record Type</Label>
//               <Select value={recordType} onValueChange={setRecordType} required>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Lab Report">Lab Report</SelectItem>
//                   <SelectItem value="Prescription">Prescription</SelectItem>
//                   <SelectItem value="X-Ray">X-Ray</SelectItem>
//                   <SelectItem value="MRI Scan">MRI Scan</SelectItem>
//                   <SelectItem value="CT Scan">CT Scan</SelectItem>
//                   <SelectItem value="Blood Test">Blood Test</SelectItem>
//                   <SelectItem value="Medical Certificate">Medical Certificate</SelectItem>
//                   <SelectItem value="Other">Other</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="grid gap-2">
//               <Label htmlFor="description">Description (Optional)</Label>
//               <Textarea
//                 id="description"
//                 placeholder="Add any additional notes..."
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 rows={3}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
//               Cancel
//             </Button>
//             <Button type="submit" disabled={loading || !fileName || !recordType}>
//               {loading ? "Uploading..." : "Upload"}
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   )
// }

// suhanis

"use client"

import type React from "react"
import { useState } from "react"
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
import { Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadDialogProps {
  onUploadSuccess: () => void
}

export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recordType, setRecordType] = useState("")
  const [description, setDescription] = useState("")

  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !recordType) {
      toast({
        title: "Missing fields",
        description: "File and record type are required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("recordType", recordType)
      formData.append("description", description)

      const res = await fetch("/api/patient/records/upload", {
        method: "POST",
        body: formData, // IMPORTANT
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      toast({
        title: "Upload successful",
        description: "Medical record uploaded",
      })

      setOpen(false)
      setSelectedFile(null)
      setRecordType("")
      setDescription("")
      onUploadSuccess()
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Medical Record</DialogTitle>
            <DialogDescription>
              Upload a medical document securely.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Record Type</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lab Report">Lab Report</SelectItem>
                  <SelectItem value="Prescription">Prescription</SelectItem>
                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                  <SelectItem value="MRI">MRI</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

