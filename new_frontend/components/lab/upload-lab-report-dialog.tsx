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

interface UploadLabReportDialogProps {
  patientId: string
  patientName: string
  onUploadSuccess: () => void
}

export function UploadLabReportDialog({ patientId, patientName, onUploadSuccess }: UploadLabReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [recordType, setRecordType] = useState("")
  const [testType, setTestType] = useState("")
  const [labName, setLabName] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const fileType = fileName.split(".").pop() || "pdf"

      const response = await fetch("/api/lab/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          fileName,
          fileType,
          recordType,
          testType,
          labName,
          description,
          fileData: "mock_file_data",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      toast({
        title: "Upload Successful",
        description: `Lab report uploaded for ${patientName}`,
      })

      setOpen(false)
      setFileName("")
      setRecordType("")
      setTestType("")
      setLabName("")
      setDescription("")
      onUploadSuccess()
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Lab Report</DialogTitle>
            <DialogDescription>Upload a lab test report for {patientName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recordType">Report Type</Label>
              <Select value={recordType} onValueChange={setRecordType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blood Test">Blood Test</SelectItem>
                  <SelectItem value="Urine Test">Urine Test</SelectItem>
                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                  <SelectItem value="MRI Scan">MRI Scan</SelectItem>
                  <SelectItem value="CT Scan">CT Scan</SelectItem>
                  <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="Biopsy">Biopsy</SelectItem>
                  <SelectItem value="ECG">ECG</SelectItem>
                  <SelectItem value="Other Lab Test">Other Lab Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="testType">Test Name</Label>
              <Input
                id="testType"
                placeholder="e.g., Complete Blood Count (CBC)"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="labName">Lab Name</Label>
              <Input
                id="labName"
                placeholder="Your laboratory name"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Notes (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional notes or observations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !fileName || !recordType || !testType || !labName}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
