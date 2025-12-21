// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { FileText, Users, LogOut, ChevronRight, Download } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"

// export default function DoctorDashboard() {
//   const router = useRouter()
//   const { toast } = useToast()
//   const [user, setUser] = useState<any>(null)
//   const [patients, setPatients] = useState<any[]>([])
//   const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
//   const [records, setRecords] = useState<any[]>([])
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
//     if (parsedUser.role !== "doctor") {
//       router.push("/")
//       return
//     }

//     setUser(parsedUser)

//     if (!parsedUser.isVerified) {
//       setLoading(false)
//       return
//     }

//     loadPatients()
//   }, [])

//   const loadPatients = async () => {
//     setLoading(true)
//     try {
//       const res = await fetch("/api/doctor/patients", { headers: getAuthHeaders() })

//       if (!res.ok) {
//         throw new Error("Failed to load patients")
//       }

//       const data = await res.json()
//       setPatients(data.patients || [])
//     } catch (error) {
//       console.error("Error loading patients:", error)
//       toast({
//         title: "Error",
//         description: "Failed to load patients. Please refresh the page.",
//         variant: "destructive",
//       })
//     }
//     setLoading(false)
//   }

//   const handleSelectPatient = async (patient: any) => {
//     setSelectedPatient(patient)
//     setRecords([])

//     try {
//       const res = await fetch(`/api/doctor/records/${patient.patientId}`, {
//         headers: getAuthHeaders(),
//       })

//       if (!res.ok) {
//         throw new Error("Failed to load records")
//       }

//       const data = await res.json()
//       setRecords(data.records || [])
//     } catch (error) {
//       console.error("Error loading records:", error)
//       toast({
//         title: "Error",
//         description: "Failed to load patient records.",
//         variant: "destructive",
//       })
//     }
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
//               Your account is pending admin verification. You will be able to access patient records once an
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
//     <div className="flex min-h-screen flex-col bg-background">
//       <header className="border-b bg-card">
//         <div className="container mx-auto flex items-center justify-between px-4 py-4">
//           <div>
//             <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
//             <p className="text-sm text-muted-foreground">Welcome, Dr. {user?.name}</p>
//           </div>
//           <Button variant="ghost" onClick={handleLogout} className="gap-2">
//             <LogOut className="h-4 w-4" />
//             Logout
//           </Button>
//         </div>
//       </header>

//       <main className="container mx-auto flex flex-1 gap-6 px-4 py-8">
//         <div className="w-80">
//           <Card className="h-full">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Users className="h-5 w-5" />
//                 My Patients
//               </CardTitle>
//               <CardDescription>Patients who granted you access</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {patients.length === 0 ? (
//                 <p className="text-center text-sm text-muted-foreground">No patients yet</p>
//               ) : (
//                 <div className="space-y-2">
//                   {patients.map((patient) => (
//                     <button
//                       key={patient.patientId}
//                       onClick={() => handleSelectPatient(patient)}
//                       className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
//                         selectedPatient?.patientId === patient.patientId ? "border-primary bg-accent" : ""
//                       }`}
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="flex-1">
//                           <p className="font-medium">{patient.patientName}</p>
//                           <p className="text-xs text-muted-foreground">{patient.patientEmail}</p>
//                           <div className="mt-1">
//                             <Badge variant="secondary" className="text-xs">
//                               {patient.accessLevel}
//                             </Badge>
//                           </div>
//                         </div>
//                         <ChevronRight className="h-4 w-4 text-muted-foreground" />
//                       </div>
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>

//         <div className="flex-1">
//           {!selectedPatient ? (
//             <Card className="h-full">
//               <CardContent className="flex h-full items-center justify-center p-12">
//                 <div className="text-center">
//                   <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
//                   <p className="mt-4 text-muted-foreground">Select a patient to view their medical records</p>
//                 </div>
//               </CardContent>
//             </Card>
//           ) : (
//             <Card>
//               <CardHeader>
//                 <CardTitle>Medical Records - {selectedPatient.patientName}</CardTitle>
//                 <CardDescription>View patient medical records</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {records.length === 0 ? (
//                   <p className="text-center text-muted-foreground py-8">No records available for this patient</p>
//                 ) : (
//                   <div className="space-y-3">
//                     {records.map((record) => (
//                       <div key={record._id} className="flex items-center justify-between rounded-lg border p-4">
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2">
//                             <FileText className="h-4 w-4 text-muted-foreground" />
//                             <span className="font-medium">{record.fileName}</span>
//                             <Badge variant="secondary">{record.recordType}</Badge>
//                           </div>
//                           <p className="mt-1 text-sm text-muted-foreground">
//                             Uploaded on {new Date(record.uploadDate).toLocaleDateString()}
//                             {record.metadata?.description && ` • ${record.metadata.description}`}
//                           </p>
//                         </div>
//                         <Button variant="ghost" size="sm" className="gap-2">
//                           <Download className="h-4 w-4" />
//                           View
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           )}
//         </div>
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
import { FileText, Users, LogOut, ChevronRight, Download, Upload, Plus } from "lucide-react"
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

export default function DoctorDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [canUpload, setCanUpload] = useState(false)
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadData, setUploadData] = useState({
    fileName: "",
    fileType: "pdf",
    recordType: "Consultation Note",
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

      if (!res.ok) {
        throw new Error("Failed to load patients")
      }

      const data = await res.json()
      setPatients(data.patients || [])
    } catch (error) {
      console.error("Error loading patients:", error)
      toast({
        title: "Error",
        description: "Failed to load patients. Please refresh the page.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient)
    setRecords([])

    // Check if doctor can upload to this patient
    const canUploadToPatient = patient.accessLevel?.includes("upload") || 
                               patient.accessLevel === "view-upload"
    setCanUpload(canUploadToPatient)

    try {
      const res = await fetch(`/api/doctor/records/${patient.patientId}`, {
        headers: getAuthHeaders(),
      })

      if (!res.ok) {
        throw new Error("Failed to load records")
      }

      const data = await res.json()
      setRecords(data.records || [])
    } catch (error) {
      console.error("Error loading records:", error)
      toast({
        title: "Error",
        description: "Failed to load patient records.",
        variant: "destructive",
      })
    }
  }

  const handleUpload = async () => {
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient first",
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

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("patientId", selectedPatient.patientId)
    formData.append("fileName", uploadData.fileName)
    formData.append("recordType", uploadData.recordType)
    formData.append("description", uploadData.description)
    formData.append("fileType", selectedFile.type || "application/pdf")

    try {
      const res = await fetch("/api/doctor/upload", {
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
        description: "Record uploaded successfully",
      })

      // Reset form
      setUploadData({
        fileName: "",
        fileType: "pdf",
        recordType: "Consultation Note",
        description: "",
      })
      setSelectedFile(null)
      setShowUploadDialog(false)

      // Refresh records
      handleSelectPatient(selectedPatient)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload record",
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
              Your account is pending admin verification. You will be able to access patient records once an
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, Dr. {user?.name}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 gap-6 px-4 py-8">
        {/* Left Sidebar - Patients List */}
        <div className="w-80">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Patients
              </CardTitle>
              <CardDescription>Patients who granted you access</CardDescription>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No patients yet</p>
              ) : (
                <div className="space-y-2">
                  {patients.map((patient) => (
                    <button
                      key={patient.patientId}
                      onClick={() => handleSelectPatient(patient)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                        selectedPatient?.patientId === patient.patientId ? "border-primary bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{patient.patientName}</p>
                          <p className="text-xs text-muted-foreground">{patient.patientEmail}</p>
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {patient.accessLevel}
                            </Badge>
                            {patient.accessLevel?.includes("upload") && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                Can Upload
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Records and Upload */}
        <div className="flex-1 space-y-4">
          {!selectedPatient ? (
            <Card className="h-full">
              <CardContent className="flex h-full items-center justify-center p-12">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Select a patient to view their medical records</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Patient Header with Upload Button */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Medical Records - {selectedPatient.patientName}</CardTitle>
                    <CardDescription>
                      View patient medical records
                      {canUpload && " • You can upload records for this patient"}
                    </CardDescription>
                  </div>
                  
                  {/* Upload Button (only show if doctor has upload permission) */}
                  {canUpload && (
                    <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
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
                            Upload a new record for {selectedPatient.patientName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="fileName">File Name</Label>
                            <Input
                              id="fileName"
                              placeholder="e.g., Consultation Note.pdf"
                              value={uploadData.fileName}
                              onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="recordType">Record Type</Label>
                            <Input
                              id="recordType"
                              placeholder="e.g., Consultation Note, Prescription, Lab Order"
                              value={uploadData.recordType}
                              onChange={(e) => setUploadData({ ...uploadData, recordType: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="file">Select File</Label>
                            <Input
                              id="file"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                              id="description"
                              placeholder="Brief description..."
                              value={uploadData.description}
                              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleUpload} disabled={!selectedFile}>
                            Upload
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
              </Card>

              {/* Records List */}
              <Card>
                <CardContent className="pt-6">
                  {records.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">No records available for this patient</p>
                      {canUpload && (
                        <p className="text-sm text-muted-foreground mt-2">
                          You can upload the first record using the button above
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {records.map((record) => (
                        <div key={record._id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{record.fileName}</span>
                              <Badge variant="secondary">{record.recordType}</Badge>
                              {record.uploaderRole === "doctor" && (
                                <Badge variant="outline" className="text-xs">
                                  Uploaded by you
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Uploaded on {new Date(record.uploadDate).toLocaleDateString()}
                              {record.metadata?.description && ` • ${record.metadata.description}`}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}