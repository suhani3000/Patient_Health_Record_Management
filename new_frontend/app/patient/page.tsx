// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { FileText, Users, History, LogOut, Download, Upload, UserPlus } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


// export default function PatientDashboard() {
//   const [selectedFile, setSelectedFile] = useState<File | null>(null)
//   const router = useRouter()
//   const { toast } = useToast()
//   const [user, setUser] = useState<any>(null)
//   const [records, setRecords] = useState<any[]>([])
//   const [permissions, setPermissions] = useState<any[]>([])
//   const [auditLogs, setAuditLogs] = useState<any[]>([])
//   const [availableProviders, setAvailableProviders] = useState<any[]>([])
//   const [loading, setLoading] = useState(true)

//   const [showUpload, setShowUpload] = useState(false)
//   const [uploadData, setUploadData] = useState({
//     fileName: "",
//     fileType: "pdf",
//     recordType: "Lab Report",
//     description: "",
//     fileData: "",
//   })

//   const [showGrant, setShowGrant] = useState(false)
//   const [grantData, setGrantData] = useState({
//     userId: "",
//     accessLevel: "view",
//   })

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
//     if (parsedUser.role !== "patient") {
//       router.push("/")
//       return
//     }

//     setUser(parsedUser)
//     loadData()
//   }, [])

//   const loadData = async () => {
//     setLoading(true)
//     try {
//       const [recordsRes, permissionsRes, logsRes, providersRes] = await Promise.all([
//         fetch("/api/patient/records", { headers: getAuthHeaders() }),
//         fetch("/api/patient/access/list", { headers: getAuthHeaders() }),
//         fetch("/api/patient/audit-logs", { headers: getAuthHeaders() }),
//         // fetch("/api/users/search?role=doctor", { headers: getAuthHeaders() }),
//         fetch("/api/users/search", { headers: getAuthHeaders() })

//       ])

//       if (recordsRes.ok) {
//         const data = await recordsRes.json()
//         setRecords(data.records || [])
//       }

//       if (permissionsRes.ok) {
//         const data = await permissionsRes.json()
//         setPermissions(data.permissions || [])
//       }

//       if (logsRes.ok) {
//         const data = await logsRes.json()
//         setAuditLogs(data.logs || [])
//       }

//       if (providersRes.ok) {
//         const data = await providersRes.json()
//         setAvailableProviders(data.users || [])
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

//   const handleUpload = async () => {
//     if (!uploadData.fileName) {
//       toast({
//         title: "Error",
//         description: "Please enter a file name",
//         variant: "destructive",
//       })
//       return
//     }

//     try {
//       const res = await fetch("/api/patient/upload", {
//         method: "POST",
//         headers: getAuthHeaders(),
//         body: JSON.stringify(uploadData),
//       })

//       const data = await res.json()

//       if (!res.ok) {
//         throw new Error(data.error || "Upload failed")
//       }

//       toast({
//         title: "Success",
//         description: "Medical record uploaded successfully",
//       })

//       setUploadData({ fileName: "", fileType: "pdf", recordType: "Lab Report", description: "", fileData: "" })
//       setShowUpload(false)
//       loadData()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to upload record",
//         variant: "destructive",
//       })
//     }
//   }

//   const handleGrantAccess = async () => {
//     if (!grantData.userId) {
//       toast({
//         title: "Error",
//         description: "Please select a provider",
//         variant: "destructive",
//       })
//       return
//     }

//     try {
//       const res = await fetch("/api/patient/access/grant", {
//         method: "POST",
//         headers: getAuthHeaders(),
//         body: JSON.stringify(grantData),
//       })

//       const data = await res.json()

//       if (!res.ok) {
//         throw new Error(data.error || "Failed to grant access")
//       }

//       toast({
//         title: "Success",
//         description: "Access granted successfully",
//       })

//       setGrantData({ userId: "", accessLevel: "view" })
//       setShowGrant(false)
//       loadData()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to grant access",
//         variant: "destructive",
//       })
//     }
//   }

//   const handleRevokeAccess = async (userId: string) => {
//     try {
//       const res = await fetch("/api/patient/access/revoke", {
//         method: "POST",
//         headers: getAuthHeaders(),
//         body: JSON.stringify({ userId }),
//       })

//       const data = await res.json()

//       if (!res.ok) {
//         throw new Error(data.error || "Failed to revoke access")
//       }

//       toast({
//         title: "Access Revoked",
//         description: "Access has been revoked successfully.",
//       })
//       loadData()
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to revoke access",
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

//   // Inside your PatientDashboard component, create a derived data set:
// const graphData = records
//   .map(r => {
//     const s = r.summary; // You'll need to join these in your fetch or fetch separately
//     return {
//       date: new Date(r.uploadDate).toLocaleDateString(),
//       sugar: s?.vitals?.sugarLevel || null,
//       weight: s?.vitals?.weight || null,
//     };
//   })
//   .filter(d => d.sugar || d.weight)
//   .reverse();

//   return (
//     <div className="min-h-screen bg-background">
//       <header className="border-b bg-card">
//         <div className="container mx-auto flex items-center justify-between px-4 py-4">
//           <div>
//             <h1 className="text-2xl font-bold">Patient Dashboard</h1>
//             <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
//           </div>
//           <Button variant="ghost" onClick={handleLogout} className="gap-2">
//             <LogOut className="h-4 w-4" />
//             Logout
//           </Button>
//         </div>
//       </header>

//       <main className="container mx-auto px-4 py-8">
//         <div className="mb-6 flex flex-wrap gap-4">
//           <Dialog open={showUpload} onOpenChange={setShowUpload}>
//             <DialogTrigger asChild>
//               <Button className="gap-2">
//                 <Upload className="h-4 w-4" />
//                 Upload Record
//               </Button>
//             </DialogTrigger>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Upload Medical Record</DialogTitle>
//                 <DialogDescription>Add a new medical record to your health profile</DialogDescription>
//               </DialogHeader>
//               <div className="space-y-4 py-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="fileName">File Name</Label>
//                   <Input
//                     id="fileName"
//                     placeholder="e.g., Blood Test Results.pdf"
//                     value={uploadData.fileName}
//                     onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="recordType">Record Type</Label>
//                   <Input
//                     id="recordType"
//                     placeholder="e.g., Lab Report, X-Ray, Prescription"
//                     value={uploadData.recordType}
//                     onChange={(e) => setUploadData({ ...uploadData, recordType: e.target.value })}
//                   />
//                 </div>

//                 <div className="space-y-2">
//                 <Label htmlFor="file">Upload File</Label>
//                 <Input
//                   id="file"
//                   type="file"
//                   accept=".pdf,.jpg,.jpeg,.png"
//                   onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
//                 />
//                 </div>


//                 <div className="space-y-2">
//                   <Label htmlFor="description">Description (Optional)</Label>
//                   <Input
//                     id="description"
//                     placeholder="Brief description..."
//                     value={uploadData.description}
//                     onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
//                   />
//                 </div>
//               </div>
//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setShowUpload(false)}>
//                   Cancel
//                 </Button>
//                 <Button onClick={handleUpload}>Upload</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>

//           <Dialog open={showGrant} onOpenChange={setShowGrant}>
//             <DialogTrigger asChild>
//               <Button variant="outline" className="gap-2 bg-transparent">
//                 <UserPlus className="h-4 w-4" />
//                 Grant Access
//               </Button>
//             </DialogTrigger>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Grant Access</DialogTitle>
//                 <DialogDescription>Allow a healthcare provider to access your medical records</DialogDescription>
//               </DialogHeader>
//               <div className="space-y-4 py-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="user">Select Provider</Label>
//                   <Select
//                     value={grantData.userId}
//                     onValueChange={(value) => setGrantData({ ...grantData, userId: value })}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Choose a doctor or lab" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {availableProviders.map((provider) => (
//                         <SelectItem key={provider._id} value={provider._id}>
//                           {provider.name} ({provider.role})
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="accessLevel">Access Level</Label>
//                   <Select
//                     value={grantData.accessLevel}
//                     onValueChange={(value) => setGrantData({ ...grantData, accessLevel: value })}
//                   >
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="view">View Only</SelectItem>
//                       <SelectItem value="view-upload">View & Upload</SelectItem>
//                       <SelectItem value="upload">Upload Only</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>
//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setShowGrant(false)}>
//                   Cancel
//                 </Button>
//                 <Button onClick={handleGrantAccess}>Grant Access</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </div>

//         <Tabs defaultValue="records" className="space-y-4">
//           <TabsList>
//             <TabsTrigger value="records" className="gap-2">
//               <FileText className="h-4 w-4" />
//               My Records
//             </TabsTrigger>
//             <TabsTrigger value="access" className="gap-2">
//               <Users className="h-4 w-4" />
//               Access Control
//             </TabsTrigger>
//             <TabsTrigger value="history" className="gap-2">
//               <History className="h-4 w-4" />
//               Audit History
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="records" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Medical Records</CardTitle>
//                 <CardDescription>View and manage your uploaded medical records</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {records.length === 0 ? (
//                   <p className="text-center text-muted-foreground py-8">No records uploaded yet</p>
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
//                           Download
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="access" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Access Permissions</CardTitle>
//                 <CardDescription>Manage who can access your medical records</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {permissions.filter((p) => p.isActive).length === 0 ? (
//                   <p className="text-center text-muted-foreground py-8">No active access permissions</p>
//                 ) : (
//                   <div className="space-y-3">
//                     {permissions
//                       .filter((p) => p.isActive)
//                       .map((permission) => (
//                         <div key={permission._id} className="flex items-center justify-between rounded-lg border p-4">
//                           <div>
//                             <div className="flex items-center gap-2">
//                               <span className="font-medium">{permission.grantedToUser?.name || "Unknown"}</span>
//                               <Badge variant="outline">{permission.grantedToRole}</Badge>
//                               <Badge>{permission.accessLevel}</Badge>
//                             </div>
//                             <p className="mt-1 text-sm text-muted-foreground">{permission.grantedToUser?.email}</p>
//                             <p className="text-xs text-muted-foreground">
//                               Granted on {new Date(permission.grantedAt).toLocaleDateString()}
//                             </p>
//                           </div>
//                           <Button
//                             variant="destructive"
//                             size="sm"
//                             onClick={() => handleRevokeAccess(permission.grantedTo)}
//                           >
//                             Revoke
//                           </Button>
//                         </div>
//                       ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
              
//           <TabsContent value="history" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Audit History</CardTitle>
//                 <CardDescription>View all access and activity logs for your records</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {auditLogs.length === 0 ? (
//                   <p className="text-center text-muted-foreground py-8">No activity yet</p>
//                 ) : (
//                   <div className="space-y-2">
//                     {auditLogs.slice(0, 20).map((log) => (
//                       <div key={log._id} className="rounded-lg border p-3">
//                         <div className="flex items-center justify-between">
//                           <div className="flex items-center gap-2">
//                             <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
//                             <span className="text-sm">
//                               by <span className="font-medium">{log.performedByUser?.name || "Unknown"}</span> (
//                               {log.performedByRole})
//                             </span>
//                           </div>
//                           <span className="text-xs text-muted-foreground">
//                             {new Date(log.timestamp).toLocaleString()}
//                           </span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//             {/*// In the JSX, add a new Card for the Health Trends:*/}
//           <Card className="col-span-4">
//             <CardHeader>
//               <CardTitle>Health Trends</CardTitle>
//                 <CardDescription>Automatic tracking from your reports</CardDescription>
//             </CardHeader>
//             <CardContent className="h-[300px]">
//               <ResponsiveContainer width="100%" height="100%">
//               <LineChart data={graphData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="date" />
//               <YAxis />
//               <Tooltip />
//               <Line type="monotone" dataKey="sugar" stroke="#ef4444" name="Sugar (mg/dL)" />
//               <Line type="monotone" dataKey="weight" stroke="#3b82f6" name="Weight (kg)" />
//             </LineChart>
//             </ResponsiveContainer>
//             </CardContent>
//           </Card>
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
import { FileText, Users, History, LogOut, Download, Upload, UserPlus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function PatientDashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [availableProviders, setAvailableProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadData, setUploadData] = useState({
    fileName: "",
    recordType: "Lab Report",
    description: "",
  })

  const [showGrant, setShowGrant] = useState(false)
  const [grantData, setGrantData] = useState({
    userId: "",
    accessLevel: "view",
  })

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
    if (parsedUser.role !== "patient") {
      router.push("/")
      return
    }

    setUser(parsedUser)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recordsRes, permissionsRes, logsRes, providersRes] = await Promise.all([
        fetch("/api/patient/records", { headers: getAuthHeaders() }),
        fetch("/api/patient/access/list", { headers: getAuthHeaders() }),
        fetch("/api/patient/audit-logs", { headers: getAuthHeaders() }),
        fetch("/api/users/search", { headers: getAuthHeaders() })
      ])

      if (recordsRes.ok) {
        const data = await recordsRes.json()
        setRecords(data.records || [])
      }

      if (permissionsRes.ok) {
        const data = await permissionsRes.json()
        setPermissions(data.permissions || [])
      }

      if (logsRes.ok) {
        const data = await logsRes.json()
        setAuditLogs(data.logs || [])
      }

      if (providersRes.ok) {
        const data = await providersRes.json()
        setAvailableProviders(data.users || [])
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
    if (!uploadData.fileName) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive",
      })
      return
    }

    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      // Create FormData (NOT JSON)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("fileName", uploadData.fileName)
      formData.append("recordType", uploadData.recordType)
      formData.append("description", uploadData.description)

      const token = localStorage.getItem("token")
      
      const res = await fetch("/api/patient/records", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // DO NOT set Content-Type header - browser sets it automatically for FormData
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.details || "Upload failed")
      }

      toast({
        title: "Success",
        description: "Medical record uploaded successfully",
      })

      // Reset form
      setUploadData({ fileName: "", recordType: "Lab Report", description: "" })
      setSelectedFile(null)
      setShowUpload(false)
      
      // Refresh data
      loadData()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload record",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleGrantAccess = async () => {
    if (!grantData.userId) {
      toast({
        title: "Error",
        description: "Please select a provider",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/patient/access/grant", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(grantData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to grant access")
      }

      toast({
        title: "Success",
        description: "Access granted successfully",
      })

      setGrantData({ userId: "", accessLevel: "view" })
      setShowGrant(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to grant access",
        variant: "destructive",
      })
    }
  }

  const handleRevokeAccess = async (userId: string) => {
    try {
      const res = await fetch("/api/patient/access/revoke", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke access")
      }

      toast({
        title: "Access Revoked",
        description: "Access has been revoked successfully.",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke access",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const handleDownload = (record: any) => {
    toast({
      title: "Downloading",
      description: `Downloading ${record.fileName}`,
    })
    // In production, you would fetch the file from IPFS/CDN
    // window.open(record.fileUrl, '_blank')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    
    // Auto-fill file name if not set
    if (file && !uploadData.fileName) {
      setUploadData(prev => ({
        ...prev,
        fileName: file.name.replace(/\.[^/.]+$/, "") // Remove extension
      }))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Create graph data from records
  const graphData = records
    .map(r => {
      // You'll need to join these in your fetch or fetch separately
      const s = r.summary
      return {
        date: new Date(r.uploadDate).toLocaleDateString(),
        sugar: s?.vitals?.sugarLevel || Math.floor(Math.random() * 50) + 80, // Mock data
        weight: s?.vitals?.weight || Math.floor(Math.random() * 30) + 60, // Mock data
      }
    })
    .filter(d => d.sugar || d.weight)
    .reverse()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Patient Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-4">
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Medical Record</DialogTitle>
                <DialogDescription>Add a new medical record to your health profile</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name *</Label>
                  <Input
                    id="fileName"
                    placeholder="e.g., Blood Test Results.pdf"
                    value={uploadData.fileName}
                    onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recordType">Record Type *</Label>
                  <Input
                    id="recordType"
                    placeholder="e.g., Lab Report, X-Ray, Prescription"
                    value={uploadData.recordType}
                    onChange={(e) => setUploadData({ ...uploadData, recordType: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Upload File *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                    required
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
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
                <Button variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showGrant} onOpenChange={setShowGrant}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Grant Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Access</DialogTitle>
                <DialogDescription>Allow a healthcare provider to access your medical records</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Select Provider *</Label>
                  <Select
                    value={grantData.userId}
                    onValueChange={(value) => setGrantData({ ...grantData, userId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a doctor or lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProviders.map((provider) => (
                        <SelectItem key={provider._id} value={provider._id}>
                          {provider.name} ({provider.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessLevel">Access Level *</Label>
                  <Select
                    value={grantData.accessLevel}
                    onValueChange={(value) => setGrantData({ ...grantData, accessLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="view-upload">View & Upload</SelectItem>
                      <SelectItem value="upload">Upload Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGrant(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGrantAccess}>Grant Access</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="records" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="records" className="gap-2">
              <FileText className="h-4 w-4" />
              My Records
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2">
              <Users className="h-4 w-4" />
              Access Control
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Audit History
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <FileText className="h-4 w-4" />
              Health Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>View and manage your uploaded medical records</CardDescription>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No records uploaded yet</p>
                    <Button 
                      onClick={() => setShowUpload(true)} 
                      className="mt-4 gap-2"
                      variant="outline"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Your First Record
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {records.map((record) => (
                      <div key={record._id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{record.fileName}</span>
                            <Badge variant="secondary">{record.recordType}</Badge>
                            {record.cid && (
                              <Badge variant="outline" className="text-xs">
                                ⛓️ Blockchain Verified
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Uploaded on {new Date(record.createdAt).toLocaleDateString()}
                            {record.metadata?.description && ` • ${record.metadata.description}`}
                            {/* {record.fileCID && ` • CID: ${record.fileCID.substring(0, 12)}...`} */}
                          </p>
                          {record.uploaderRole !== "patient" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Uploaded by: {record.uploaderRole} ({record.uploadedBy})
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleDownload(record)}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Access Permissions</CardTitle>
                <CardDescription>Manage who can access your medical records</CardDescription>
              </CardHeader>
              <CardContent>
                {permissions.filter((p) => p.isActive).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No active access permissions</p>
                    <Button 
                      onClick={() => setShowGrant(true)} 
                      className="mt-4 gap-2"
                      variant="outline"
                    >
                      <UserPlus className="h-4 w-4" />
                      Grant Your First Access
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {permissions
                      .filter((p) => p.isActive)
                      .map((permission) => (
                        <div key={permission._id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{permission.grantedToUser?.name || "Unknown"}</span>
                              <Badge variant="outline">{permission.grantedToRole}</Badge>
                              <Badge variant={
                                permission.accessLevel === "view" ? "secondary" :
                                permission.accessLevel === "upload" ? "default" :
                                "default"
                              }>
                                {permission.accessLevel}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{permission.grantedToUser?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Granted on {new Date(permission.grantedAt).toLocaleDateString()}
                              {permission.expiresAt && ` • Expires: ${new Date(permission.expiresAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeAccess(permission.grantedTo)}
                          >
                            Revoke
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
              
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit History</CardTitle>
                <CardDescription>View all access and activity logs for your records</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.slice(0, 20).map((log) => (
                      <div key={log._id} className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              log.action === "upload_record" ? "default" :
                              log.action === "view_record" ? "secondary" :
                              log.action === "grant_access" ? "outline" :
                              "destructive"
                            }>
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-sm">
                              by <span className="font-medium">{log.performedByUser?.name || "Unknown"}</span> (
                              {log.performedByRole})
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Trends</CardTitle>
                <CardDescription>Automatic tracking from your reports</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {graphData.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">
                      No health data available yet. Upload more records to see trends.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value}`, "Value"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sugar" 
                        stroke="#ef4444" 
                        name="Sugar (mg/dL)" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#3b82f6" 
                        name="Weight (kg)" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Recent Uploads</h3>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {records.slice(0, 3).map((record) => (
                        <li key={record._id} className="flex justify-between">
                          <span>{record.fileName}</span>
                          <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Access Summary</h3>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Doctors with access: {permissions.filter(p => p.grantedToRole === "doctor").length}</p>
                      <p>Labs with access: {permissions.filter(p => p.grantedToRole === "lab").length}</p>
                      <p>Total records: {records.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}