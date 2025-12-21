// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Users, LogOut, History, FileText } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"

// export default function LabDashboard() {
//   const router = useRouter()
//   const { toast } = useToast()
//   const [user, setUser] = useState<any>(null)
//   const [patients, setPatients] = useState<any[]>([])
//   const [uploadHistory, setUploadHistory] = useState<any[]>([])
//   const [loading, setLoading] = useState(true)

//   const getAuthHeaders = () => {
//     const token = localStorage.getItem("token")
//     return {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     }
//   }

//   useEffect(() => {
//     const storedUser = localStorage.getItem("user")
//     const token = localStorage.getItem("token")

//     if (!storedUser || !token) {
//       router.push("/")
//       return
//     }

//     const parsedUser = JSON.parse(storedUser)
//     if (parsedUser.role !== "lab") {
//       router.push("/")
//       return
//     }

//     setUser(parsedUser)

//     if (!parsedUser.isVerified) {
//       setLoading(false)
//       return
//     }

//     loadData()
//   }, [])

//   const loadData = async () => {
//     setLoading(true)
//     try {
//       const [patientsRes, historyRes] = await Promise.all([
//         fetch("/api/lab/patients", { headers: getAuthHeaders() }),
//         fetch("/api/lab/upload-history", { headers: getAuthHeaders() }),
//       ])

//       if (patientsRes.ok) {
//         const data = await patientsRes.json()
//         setPatients(data.patients || [])
//       }

//       if (historyRes.ok) {
//         const data = await historyRes.json()
//         setUploadHistory(data.records || [])
//       }
//     } catch (error) {
//       console.error("Error loading data:", error)
//       toast({
//         title: "Error",
//         description: "Failed to load data. Please refresh the page.",
//         variant: "destructive",
//       })
//     }
//     setLoading(false)
//   }

//   const handleLogout = () => {
//     localStorage.removeItem("token")
//     localStorage.removeItem("user")
//     router.push("/")
//   }

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <p className="text-muted-foreground">Loading...</p>
//       </div>
//     )
//   }

//   if (!user?.isVerified) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-background p-4">
//         <Card className="max-w-md">
//           <CardHeader>
//             <CardTitle>Account Pending Verification</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <p className="text-muted-foreground">
//               Your laboratory account is pending admin verification. You will be able to upload lab reports once an
//               administrator approves your account.
//             </p>
//             <Button onClick={handleLogout} className="mt-4 w-full">
//               Logout
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <header className="border-b bg-card">
//         <div className="container mx-auto flex items-center justify-between px-4 py-4">
//           <div>
//             <h1 className="text-2xl font-bold">Lab Dashboard</h1>
//             <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
//           </div>
//           <Button variant="ghost" onClick={handleLogout} className="gap-2">
//             <LogOut className="h-4 w-4" />
//             Logout
//           </Button>
//         </div>
//       </header>

//       <main className="container mx-auto px-4 py-8">
//         <Tabs defaultValue="patients" className="space-y-4">
//           <TabsList>
//             <TabsTrigger value="patients" className="gap-2">
//               <Users className="h-4 w-4" />
//               Authorized Patients
//             </TabsTrigger>
//             <TabsTrigger value="history" className="gap-2">
//               <History className="h-4 w-4" />
//               Upload History
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="patients" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Authorized Patients</CardTitle>
//                 <CardDescription>Patients who granted you permission to upload lab reports</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {patients.length === 0 ? (
//                   <div className="flex flex-col items-center justify-center py-12 text-center">
//                     <Users className="mb-4 h-12 w-12 text-muted-foreground" />
//                     <p className="text-muted-foreground">No patients have granted you upload access yet</p>
//                   </div>
//                 ) : (
//                   <div className="grid gap-4 md:grid-cols-2">
//                     {patients.map((patient) => (
//                       <Card key={patient.patientId} className="border-2">
//                         <CardHeader>
//                           <div className="flex items-start justify-between">
//                             <div>
//                               <CardTitle className="text-lg">{patient.patientName}</CardTitle>
//                               <CardDescription>{patient.patientEmail}</CardDescription>
//                             </div>
//                             <Badge variant="secondary">{patient.accessLevel}</Badge>
//                           </div>
//                           <p className="text-xs text-muted-foreground">
//                             Access granted on {new Date(patient.grantedAt).toLocaleDateString()}
//                           </p>
//                         </CardHeader>
//                       </Card>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="history" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Upload History</CardTitle>
//                 <CardDescription>All lab reports you have uploaded</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {uploadHistory.length === 0 ? (
//                   <div className="flex flex-col items-center justify-center py-12 text-center">
//                     <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
//                     <p className="text-muted-foreground">No uploads yet</p>
//                   </div>
//                 ) : (
//                   <div className="space-y-3">
//                     {uploadHistory.map((record) => (
//                       <div key={record._id} className="rounded-lg border p-4">
//                         <div className="flex items-start justify-between">
//                           <div className="flex-1">
//                             <div className="flex items-center gap-2">
//                               <FileText className="h-4 w-4 text-muted-foreground" />
//                               <span className="font-medium">{record.fileName}</span>
//                               <Badge variant="secondary">{record.recordType}</Badge>
//                             </div>
//                             <div className="mt-2 space-y-1 text-sm text-muted-foreground">
//                               <p>
//                                 <span className="font-medium">Patient:</span> {record.patientName}
//                               </p>
//                               {record.metadata?.description && (
//                                 <p>
//                                   <span className="font-medium">Notes:</span> {record.metadata.description}
//                                 </p>
//                               )}
//                               <p className="text-xs">Uploaded on {new Date(record.uploadDate).toLocaleString()}</p>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </main>
//     </div>
//   )
// }


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
import { Users, LogOut, History, FileText, Upload, Beaker } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LabDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [uploadHistory, setUploadHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false)
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
    return {
      "Authorization": `Bearer ${token}`,
    }
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
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      })
      return
    }

    if (!uploadData.fileName || !selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file and enter a file name",
        variant: "destructive",
      })
      return
    }

    if (!uploadData.testType) {
      toast({
        title: "Error",
        description: "Please specify the test type",
        variant: "destructive",
      })
      return
    }

    const selectedPatient = patients.find(p => p.patientId === selectedPatientId)
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Patient not found",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("patientId", selectedPatientId)
    formData.append("fileName", uploadData.fileName)
    formData.append("recordType", uploadData.recordType)
    formData.append("labName", uploadData.labName || user?.name || "")
    formData.append("testType", uploadData.testType)
    formData.append("description", uploadData.description)
    formData.append("fileType", selectedFile.type || "application/pdf")

    try {
      const res = await fetch("/api/lab/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      toast({
        title: "Success",
        description: "Lab report uploaded successfully",
      })

      // Reset form
      setUploadData({
        fileName: "",
        fileType: "pdf",
        recordType: "Lab Report",
        labName: "",
        testType: "",
        description: "",
      })
      setSelectedPatientId("")
      setSelectedFile(null)
      setShowUploadDialog(false)

      // Refresh data
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload lab report",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user?.isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Account Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your laboratory account is pending admin verification. You will be able to upload lab reports once an
              administrator approves your account.
            </p>
            <Button onClick={handleLogout} className="mt-4 w-full">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter patients who have upload permission
  const patientsWithUploadAccess = patients.filter(p => 
    p.accessLevel?.includes("upload") || p.accessLevel === "upload"
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Lab Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Upload Button - only show if there are patients with upload access */}
            {patientsWithUploadAccess.length > 0 && (
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Lab Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Lab Report</DialogTitle>
                    <DialogDescription>
                      Upload a new lab report for a patient
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="patient">Select Patient *</Label>
                      <Select
                        value={selectedPatientId}
                        onValueChange={setSelectedPatientId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patientsWithUploadAccess.map((patient) => (
                            <SelectItem key={patient.patientId} value={patient.patientId}>
                              {patient.patientName} ({patient.patientEmail})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="testType">Test Type *</Label>
                      <Select
                        value={uploadData.testType}
                        onValueChange={(value) => setUploadData({ ...uploadData, testType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select test type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Blood Test">Blood Test</SelectItem>
                          <SelectItem value="Urine Test">Urine Test</SelectItem>
                          <SelectItem value="X-Ray">X-Ray</SelectItem>
                          <SelectItem value="MRI">MRI</SelectItem>
                          <SelectItem value="CT Scan">CT Scan</SelectItem>
                          <SelectItem value="Biopsy">Biopsy</SelectItem>
                          <SelectItem value="Culture">Culture</SelectItem>
                          <SelectItem value="Genetic Test">Genetic Test</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fileName">Report Name *</Label>
                      <Input
                        id="fileName"
                        placeholder="e.g., Complete Blood Count Results.pdf"
                        value={uploadData.fileName}
                        onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="labName">Lab Name</Label>
                      <Input
                        id="labName"
                        placeholder={user?.name || "Your lab name"}
                        value={uploadData.labName}
                        onChange={(e) => setUploadData({ ...uploadData, labName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Select Report File *</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Notes (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Any additional notes..."
                        value={uploadData.description}
                        onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={!selectedPatientId || !selectedFile || !uploadData.testType}
                    >
                      Upload Report
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patients" className="gap-2">
              <Users className="h-4 w-4" />
              Authorized Patients
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Upload History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Authorized Patients</CardTitle>
                    <CardDescription>
                      Patients who granted you permission to upload lab reports
                      {patientsWithUploadAccess.length > 0 && (
                        <span className="ml-2 text-primary">
                          • {patientsWithUploadAccess.length} patients can receive uploads
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {patientsWithUploadAccess.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Upload className="h-3 w-3" />
                      Upload Ready
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No patients have granted you access yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {patients.map((patient) => {
                      const canUpload = patient.accessLevel?.includes("upload") || patient.accessLevel === "upload"
                      return (
                        <Card 
                          key={patient.patientId} 
                          className={`border-2 ${canUpload ? "border-primary" : ""}`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{patient.patientName}</CardTitle>
                                <CardDescription>{patient.patientEmail}</CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant={canUpload ? "default" : "secondary"}>
                                  {patient.accessLevel}
                                </Badge>
                                {canUpload && (
                                  <Badge variant="outline" className="text-xs">
                                    <Upload className="mr-1 h-3 w-3" />
                                    Can Upload
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Access granted on {new Date(patient.grantedAt).toLocaleDateString()}
                            </p>
                          </CardHeader>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>All lab reports you have uploaded</CardDescription>
              </CardHeader>
              <CardContent>
                {uploadHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No uploads yet</p>
                    {patientsWithUploadAccess.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Use the "Upload Lab Report" button above to add your first report
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {uploadHistory.map((record) => (
                      <div key={record._id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Beaker className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{record.fileName}</span>
                              <Badge variant="secondary">{record.recordType}</Badge>
                              {record.metadata?.testType && (
                                <Badge variant="outline" className="text-xs">
                                  {record.metadata.testType}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>
                                <span className="font-medium">Patient:</span> {record.patientName}
                              </p>
                              {record.metadata?.labName && (
                                <p>
                                  <span className="font-medium">Lab:</span> {record.metadata.labName}
                                </p>
                              )}
                              {record.metadata?.description && (
                                <p>
                                  <span className="font-medium">Notes:</span> {record.metadata.description}
                                </p>
                              )}
                              <p className="text-xs">Uploaded on {new Date(record.uploadDate).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}