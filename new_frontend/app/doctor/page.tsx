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
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, LogOut, ChevronRight, Upload, AlertTriangle } from "lucide-react"
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
import { encryptFile, wrapAESKey } from "@/lib/crypto"

export default function DoctorDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
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

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient)

    const canUploadToPatient =
      patient.accessLevel?.includes("upload") || patient.accessLevel === "view-upload"
    setCanUpload(canUploadToPatient)
  }

  // const handleUpload = async () => {
  //   if (!selectedPatient) {
  //     toast({
  //       title: "Error",
  //       description: "Please select a patient first",
  //       variant: "destructive",
  //     })
  //     return
  //   }

  //   if (!uploadData.fileName || !selectedFile) {
  //     toast({
  //       title: "Error",
  //       description: "Please select a file and enter a file name",
  //       variant: "destructive",
  //     })
  //     return
  //   }

  //   if (!selectedPatient.patientEncryptionPublicKey) {
  //     toast({
  //       title: "Cannot upload encrypted file",
  //       description:
  //         "This patient has no RSA public key on file. They must sign in once so encryption can be set up.",
  //       variant: "destructive",
  //     })
  //     return
  //   }

  //   try {
  //     const fileBuffer = await selectedFile.arrayBuffer()
  //     const { encryptedBuffer, aesKeyRaw, ivB64 } = await encryptFile(fileBuffer)
  //     const encryptedAESKey = await wrapAESKey(
  //       aesKeyRaw,
  //       selectedPatient.patientEncryptionPublicKey as string,
  //     )

  //     const token = localStorage.getItem("token")
  //     let doctorEncryptedAESKey: string | null = null
  //     if (token) {
  //       try {
  //         const meRes = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
  //         if (meRes.ok) {
  //           const meData = await meRes.json()
  //           const doctorPub = meData.user?.encryptionPublicKey as string | undefined
  //           if (doctorPub) {
  //             doctorEncryptedAESKey = await wrapAESKey(aesKeyRaw, doctorPub)
  //           }
  //         }
  //       } catch {
  //         console.warn("[Doctor upload] Could not wrap AES key for doctor copy")
  //       }
  //     }

  //     const encBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" })
  //     const baseName = (uploadData.fileName || selectedFile.name).replace(/\.enc$/i, "")
  //     const encryptedFile = new File([encBlob], `${baseName}.enc`)

  //     const formData = new FormData()
  //     formData.append("file", encryptedFile)
  //     formData.append("patientId", String(selectedPatient.patientId))
  //     formData.append("fileName", uploadData.fileName || selectedFile.name)
  //     formData.append("recordType", uploadData.recordType)
  //     formData.append("description", uploadData.description)
  //     formData.append("fileType", selectedFile.type || "application/octet-stream")
  //     formData.append("encryptedAESKey", encryptedAESKey)
  //     formData.append("aesIV", ivB64)
  //     if (doctorEncryptedAESKey) {
  //       formData.append("doctorEncryptedAESKey", doctorEncryptedAESKey)
  //     }

  //     const res = await fetch("/api/doctor/upload", {
  //       method: "POST",
  //       headers: getAuthHeaders(),
  //       body: formData,
  //     })

  //     const data = await res.json()

  //     if (!res.ok) {
  //       throw new Error(data.error || "Upload failed")
  //     }

  //     toast({
  //       title: "Success",
  //       description: "Record uploaded successfully",
  //     })

  //     // Reset form
  //     setUploadData({
  //       fileName: "",
  //       fileType: "pdf",
  //       recordType: "Consultation Note",
  //       description: "",
  //     })
  //     setSelectedFile(null)
  //     setShowUploadDialog(false)
  //   } catch (error: any) {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to upload record",
  //       variant: "destructive",
  //     })
  //   }
  // }

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

  if (!selectedPatient.patientEncryptionPublicKey) {
    toast({
      title: "Cannot upload encrypted file",
      description:
        "This patient has no RSA public key on file. They must sign in once so encryption can be set up.",
      variant: "destructive",
    })
    return
  }

  try {
    console.log("[Doctor Upload] Starting encryption workflow...")
    
    // Step 1: Get file buffer
    const fileBuffer = await selectedFile.arrayBuffer()
    console.log(`[Doctor Upload] File size: ${fileBuffer.byteLength} bytes`)

    // Step 2: Encrypt file with random AES-256-GCM key
    const { encryptedBuffer, aesKeyRaw, ivB64 } = await encryptFile(fileBuffer)
    console.log("[Doctor Upload] File encrypted with AES-256-GCM ✅")

    // Step 3: Wrap AES key with PATIENT's public key (mandatory - for patient to decrypt)
    const encryptedAESKey = await wrapAESKey(
      aesKeyRaw,
      selectedPatient.patientEncryptionPublicKey as string,
    )
    console.log("[Doctor Upload] AES key wrapped with patient's public key ✅")

    // Step 4: Get doctor's own public key and wrap AES key for self-access (MANDATORY)
    let doctorEncryptedAESKey: string | null = null
    const token = localStorage.getItem("token")
    
    if (!token) {
      throw new Error("No auth token found. Please log in again.")
    }

    try {
      const meRes = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      if (!meRes.ok) {
        throw new Error(`Failed to fetch doctor's public key: ${meRes.statusText}`)
      }
      
      const meData = await meRes.json()
      const doctorPub = meData.user?.encryptionPublicKey as string | undefined
      
      if (!doctorPub) {
        throw new Error(
          "Doctor has no encryption public key. Please log out and log back in to generate keys."
        )
      }

      doctorEncryptedAESKey = await wrapAESKey(aesKeyRaw, doctorPub)
      console.log("[Doctor Upload] AES key wrapped with doctor's public key ✅")
      
    } catch (err: any) {
      console.error("[Doctor Upload] Error wrapping doctor's key:", err.message)
      throw new Error(
        `Cannot wrap AES key for your own decryption: ${err.message}. Upload aborted.`
      )
    }

    // Step 5: Prepare encrypted file blob
    const encBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" })
    const baseName = (uploadData.fileName || selectedFile.name).replace(/\.enc$/i, "")
    const encryptedFile = new File([encBlob], `${baseName}.enc`)
    console.log("[Doctor Upload] Encrypted file prepared for IPFS")

    // Step 6: Build FormData with ALL encryption metadata
    const formData = new FormData()
    formData.append("file", encryptedFile)
    formData.append("patientId", String(selectedPatient.patientId))
    formData.append("fileName", uploadData.fileName || selectedFile.name)
    formData.append("recordType", uploadData.recordType)
    formData.append("description", uploadData.description)
    formData.append("fileType", selectedFile.type || "application/octet-stream")
    formData.append("encryptedAESKey", encryptedAESKey)  // ← For patient decryption
    formData.append("aesIV", ivB64)
    formData.append("doctorEncryptedAESKey", doctorEncryptedAESKey)  // ← For doctor self-decrypt
    
    console.log("[Doctor Upload] FormData prepared with encryption metadata")

    // Step 7: Upload to backend
    const res = await fetch("/api/doctor/upload", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || `Upload failed with status ${res.status}`)
    }

    console.log("[Doctor Upload] Upload successful ✅", data.recordId)

    toast({
      title: "Success",
      description: "Record uploaded successfully. You can decrypt it from the records page.",
    })

    // Step 8: Reset form
    setUploadData({
      fileName: "",
      fileType: "pdf",
      recordType: "Consultation Note",
      description: "",
    })
    setSelectedFile(null)
    setShowUploadDialog(false)
    
  } catch (error: any) {
    console.error("[Doctor Upload] Critical error:", error)
    toast({
      title: "Upload Failed",
      description: error.message || "An error occurred during encryption or upload.",
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
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Medical Records - {selectedPatient.patientName}</CardTitle>
                    <CardDescription>
                      Open the encrypted records page to view and decrypt files in your browser.
                      {canUpload && " You can upload records for this patient from here."}
                    </CardDescription>
                  </div>


                  <Button asChild className="gap-2 shrink-0">
                    <Link
                      href={`/doctor/records/${encodeURIComponent(selectedPatient.patientId)}?name=${encodeURIComponent(selectedPatient.patientName || "")}`}
                    >
                      View &amp; decrypt records
                    </Link>
                  </Button>

                  
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
                          {!selectedPatient.patientEncryptionPublicKey && (
                            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>
                                This patient has no encryption public key on file. They must sign in at least once
                                with a device that registers their key before you can upload.
                              </span>
                            </div>
                          )}
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
                          <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || !selectedPatient.patientEncryptionPublicKey}
                          >
                            Upload (encrypted for patient)
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
              </Card>

            </>
          )}
        </div>
      </main>
    </div>
  )
}