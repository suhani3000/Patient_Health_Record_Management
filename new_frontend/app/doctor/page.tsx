"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, LogOut, ChevronRight, Upload, AlertTriangle, Loader2, Hospital } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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
import { formatIdentifier } from "@/lib/utils/format"
import { ViewRecordsDialog } from "@/components/dashboard/view-records-dialog"

export default function DoctorDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "encrypting" | "uploading">("idle")
  const [canUpload, setCanUpload] = useState(false)
  
  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showRecordsDialog, setShowRecordsDialog] = useState(false)
  const [uploadData, setUploadData] = useState({
    fileName: "",
    fileType: "pdf",
    recordType: "Consultation Note",
    description: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return { "Authorization": `Bearer ${token}` }
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (!storedUser || !token) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(storedUser)
    if (parsedUser.role !== "doctor") {
      router.push("/")
      return
    }

    setUser(parsedUser)

    if (!parsedUser.isVerified) {
      setLoading(false)
      return
    }

    loadPatients()
  }, [])

  const loadPatients = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/doctor/patients", { headers: getAuthHeaders() })
      if (!res.ok) throw new Error("Failed to load patients")
      const data = await res.json()
      setPatients(data.patients || [])
    } catch (error) {
      toast({ title: "Error", description: "Failed to load patients.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient)
    const hasUploadAccess = patient.accessLevel?.includes("upload") || patient.accessLevel === "view-upload"
    setCanUpload(hasUploadAccess)
  }

  const handleUpload = async () => {
    if (!selectedPatient || !selectedFile || !uploadData.fileName) return

    setUploadStatus("encrypting")
    setUploadStatus("uploading")
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("patientId", String(selectedPatient.patientId))
      formData.append("fileName", uploadData.fileName)
      formData.append("recordType", uploadData.recordType)
      formData.append("description", uploadData.description)
      formData.append("fileType", selectedFile.type || "application/octet-stream")
      const res = await fetch("/api/doctor/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      toast({ title: "Success", description: "Record uploaded successfully" })
      setShowUploadDialog(false)
      setSelectedFile(null)
      setUploadData({ fileName: "", fileType: "pdf", recordType: "Consultation Note", description: "" })
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setUploadStatus("idle")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-none shadow-lg ring-1 ring-border">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle>Account Verification Pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Your credentials are being reviewed by the administration. You will be notified once full access is granted.
            </p>
            <Button onClick={handleLogout} className="w-full" variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hospital className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">Physician Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Dr. <span className="font-medium text-foreground">{user?.name}</span> • {formatIdentifier(user?.userId)}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 gap-8 px-6 py-8 h-[calc(100vh-73px)] overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-4">
          <Card className="border-none shadow-sm ring-1 ring-border h-full overflow-hidden flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Patient Access List
              </CardTitle>
              <CardDescription>Patients who authorized your access</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
              {patients.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground italic">No authorized patients.</p>
              ) : (
                <div className="space-y-2">
                  {patients.map((p) => (
                    <button
                      key={p.patientId}
                      onClick={() => handleSelectPatient(p)}
                      className={`w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
                        selectedPatient?.patientId === p.patientId 
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                          : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{formatIdentifier(p.patientId, p.patientName)}</p>
                          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-bold mt-1">
                            {p.accessLevel}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedPatient?.patientId === p.patientId ? "translate-x-1" : ""}`} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto">
          {!selectedPatient ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
              <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                <Users className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Select a Patient</h2>
              <p className="max-w-xs text-sm leading-relaxed">
                Choose an authorized patient from the list to manage their medical history and upload new reports.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="border-none shadow-sm ring-1 ring-border overflow-hidden">
                <div className="h-1 bg-primary w-full" />
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      {formatIdentifier(selectedPatient.patientId, selectedPatient.patientName)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedPatient.patientEmail} • Access: <span className="font-semibold text-primary">{selectedPatient.accessLevel}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => setShowRecordsDialog(true)} className="gap-2">
                      <FileText className="h-4 w-4" />
                      View Medical Records
                    </Button>
                    {canUpload && (
                      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary">
                            <Upload className="h-4 w-4" /> Upload Report
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Secure Diagnostic Upload</DialogTitle>
                            <DialogDescription>
                              Upload a report for <strong>{selectedPatient.patientName}</strong>.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Report Name</Label>
                              <Input 
                                value={uploadData.fileName} 
                                onChange={(e) => setUploadData({...uploadData, fileName: e.target.value})}
                                placeholder="e.g., General Checkup Note" 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>File</Label>
                              <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                            <Button 
                              onClick={handleUpload} 
                              disabled={!selectedFile || uploadStatus !== "idle"}
                            >
                              {uploadStatus === "uploading" ? "Uploading to Vault..." : "Upload Record"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
              </Card>

              <ViewRecordsDialog 
                isOpen={showRecordsDialog}
                onOpenChange={setShowRecordsDialog}
                patientId={selectedPatient.patientId}
                patientName={selectedPatient.patientName}
                role="doctor"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}