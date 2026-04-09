"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, LogOut, History, FileText, Upload, Beaker, Loader2, Eye, FlaskConical, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ViewRecordsDialog } from "@/components/dashboard/view-records-dialog"
import { formatIdentifier } from "@/lib/utils/format"

export default function LabDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [uploadHistory, setUploadHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "encrypting" | "uploading">("idle")
  
  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showRecordsDialog, setShowRecordsDialog] = useState(false)
  const [selectedPatientForView, setSelectedPatientForView] = useState<any | null>(null)
  
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [uploadData, setUploadData] = useState({
    fileName: "",
    fileType: "pdf",
    recordType: "Lab Report",
    labName: "",
    testType: "",
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
    if (parsedUser.role !== "lab") {
      router.push("/")
      return
    }

    setUser(parsedUser)

    if (!parsedUser.isVerified) {
      setLoading(false)
      setUser(parsedUser) // Still set the user so the pending UI can show name/logout
      return
    }

    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [patientsRes, historyRes] = await Promise.all([
        fetch("/api/lab/patients", { headers: getAuthHeaders() }),
        fetch("/api/lab/upload-history", { headers: getAuthHeaders() }),
      ])

      if (patientsRes.ok) {
        const data = await patientsRes.json()
        setPatients(data.patients || [])
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setUploadHistory(data.records || [])
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load laboratory data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedPatientId || !selectedFile || !uploadData.fileName || !uploadData.testType) return

    setUploadStatus("uploading")
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("patientId", selectedPatientId)
      formData.append("fileName", uploadData.fileName)
      formData.append("recordType", uploadData.recordType)
      formData.append("labName", uploadData.labName || user?.name || "")
      formData.append("testType", uploadData.testType)
      formData.append("description", uploadData.description)
      formData.append("fileType", selectedFile.type || "application/pdf")
      const res = await fetch("/api/lab/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      toast({ title: "Success", description: "Lab report securely uploaded" })
      setShowUploadDialog(false)
      loadData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setUploadStatus("idle")
    }
  }

  const handleOpenViewRecords = (patient: any) => {
    setSelectedPatientForView(patient)
    setShowRecordsDialog(true)
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

  if (user && !user.isVerified) {
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
            <p className="text-center text-muted-foreground font-medium">
              Your laboratory credentials are being reviewed by the administration. 
              You will be notified once full access is granted.
            </p>
            <Button onClick={handleLogout} className="w-full" variant="outline" className="font-bold">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const patientsWithUploadAccess = patients.filter(p => p.accessLevel?.includes("upload"))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">Laboratory Portal</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Technician: <span className="font-medium text-foreground">{user?.name}</span> • {formatIdentifier(user?.userId)}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 h-[calc(100vh-73px)] overflow-hidden flex flex-col gap-6">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold tracking-tight">Active Workflows</h2>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button disabled={patientsWithUploadAccess.length === 0} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Secure Lab Report Upload</DialogTitle>
                <DialogDescription>
                  This file will be end-to-end encrypted for the patient's medical vault.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Patient Selector</Label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsWithUploadAccess.map((p) => (
                        <SelectItem key={p.patientId} value={p.patientId}>
                          {formatIdentifier(p.patientId, p.patientName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Type</Label>
                    <Select value={uploadData.testType} onValueChange={(v) => setUploadData({ ...uploadData, testType: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blood Test">Blood</SelectItem>
                        <SelectItem value="Urine Test">Urine</SelectItem>
                        <SelectItem value="Imaging">Imaging</SelectItem>
                        <SelectItem value="Biopsy">Biopsy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Report Title</Label>
                    <Input
                      value={uploadData.fileName}
                      onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                      placeholder="e.g. CBC-24"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Report File (PDF/Image)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={uploadStatus !== "idle" || !selectedFile}>
                  {uploadStatus === "uploading" ? "Uploading to Vault..." : "Submit Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="patients" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
            <TabsTrigger value="patients" className="gap-2 rounded-lg">
              <Users className="h-4 w-4" /> Authorized Patients
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-lg">
              <History className="h-4 w-4" /> Recent Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="flex-1 overflow-y-auto mt-4 pr-2">
            {patients.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-3xl text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No patient authorizations found.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {patients.map((p) => {
                  const canUpl = p.accessLevel?.includes("upload")
                  const canView = p.accessLevel?.includes("view")
                  return (
                    <Card key={p.patientId} className="border-none shadow-sm ring-1 ring-border group hover:ring-primary/50 transition-all">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <CardTitle className="text-lg font-bold truncate">
                              {formatIdentifier(p.patientId, p.patientName)}
                            </CardTitle>
                            <CardDescription className="truncate text-xs">{p.patientEmail}</CardDescription>
                          </div>
                          <Badge variant={canUpl ? "default" : "secondary"} className="text-[10px] uppercase">
                            {p.accessLevel}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          {canView && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full gap-2 border-primary/20"
                              onClick={() => handleOpenViewRecords(p)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Records
                            </Button>
                          )}
                          {canUpl && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="w-full gap-2"
                              onClick={() => {
                                setSelectedPatientId(p.patientId)
                                setShowUploadDialog(true)
                              }}
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto mt-4 border-t pt-4">
            {uploadHistory.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground italic">No recent uploads.</p>
            ) : (
              <div className="grid gap-2">
                {uploadHistory.map((history) => (
                  <div key={history._id} className="flex items-center justify-between p-4 rounded-xl border bg-card text-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg">
                        <Beaker className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{history.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatIdentifier(history.patientId, history.patientName)} • {new Date(history.uploadDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      {history.cid?.substring(0, 10)}...
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {selectedPatientForView && (
        <ViewRecordsDialog
          isOpen={showRecordsDialog}
          onOpenChange={setShowRecordsDialog}
          patientId={selectedPatientForView.patientId}
          patientName={selectedPatientForView.patientName}
          role="lab"
        />
      )}
    </div>
  )
}
