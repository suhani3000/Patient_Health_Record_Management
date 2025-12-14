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
import { FileText, Users, History, LogOut, Download, Upload, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, getAllUsers, logout } from "@/lib/mock-auth"
import {
  getMedicalRecords,
  getAccessPermissions,
  getAuditLogs,
  addMedicalRecord,
  grantAccess,
  revokeAccess,
  addAuditLog,
} from "@/lib/mock-data"

interface MedicalRecord {
  _id: string
  fileName: string
  recordType: string
  uploadDate: string
  uploaderRole: string
  fileUrl: string
  metadata?: {
    description?: string
  }
}

interface AccessPermission {
  _id: string
  grantedTo: string
  grantedToRole: string
  accessLevel: string
  grantedAt: string
  isActive: boolean
  grantedToUser: {
    name: string
    email: string
    role: string
    specialization?: string
  }
}

interface AuditLog {
  _id: string
  action: string
  timestamp: string
  performedByUser: {
    name: string
    role: string
  }
  metadata?: any
}

export default function PatientDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadData, setUploadData] = useState({
    fileName: "",
    recordType: "lab_report",
    description: "",
  })

  const [showGrant, setShowGrant] = useState(false)
  const [grantData, setGrantData] = useState({
    userId: "",
    accessLevel: "view",
  })

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser || currentUser.role !== "patient") {
      router.push("/")
      return
    }

    setUser(currentUser)
    loadData(currentUser)
  }, [])

  const loadData = (currentUser: any) => {
    setLoading(true)

    const userRecords = getMedicalRecords(currentUser.id)
    const userPermissions = getAccessPermissions(currentUser.id)
    const userLogs = getAuditLogs(currentUser.id)

    // Get full user details for permissions
    const allUsers = getAllUsers()
    const permissionsWithUsers = userPermissions.map((p) => {
      const grantedUser = allUsers.find((u) => u.id === p.grantedToId)
      return {
        ...p,
        grantedToUser: grantedUser || { name: "Unknown", email: "", role: p.grantedToRole },
      }
    })

    // Get full user details for audit logs
    const logsWithUsers = userLogs.map((l) => {
      const performedUser = allUsers.find((u) => u.id === l.performedById)
      return {
        ...l,
        performedByUser: performedUser || { name: "Unknown", role: l.performedByRole },
      }
    })

    setRecords(userRecords)
    setPermissions(permissionsWithUsers)
    setAuditLogs(logsWithUsers)
    setLoading(false)
  }

  const handleUpload = () => {
    if (!uploadData.fileName) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive",
      })
      return
    }

    const newRecord = addMedicalRecord({
      fileName: uploadData.fileName,
      recordType: uploadData.recordType,
      uploadDate: new Date().toISOString(),
      uploaderRole: "patient",
      uploaderId: user.id,
      patientId: user.id,
      description: uploadData.description,
    })

    addAuditLog({
      action: "UPLOAD_RECORD",
      timestamp: new Date().toISOString(),
      performedById: user.id,
      performedByRole: "patient",
      patientId: user.id,
      metadata: { recordId: newRecord.id },
    })

    toast({
      title: "Success",
      description: "Medical record uploaded successfully",
    })

    setUploadData({ fileName: "", recordType: "lab_report", description: "" })
    setShowUpload(false)
    loadData(user)
  }

  const handleGrantAccess = () => {
    if (!grantData.userId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      })
      return
    }

    grantAccess({
      patientId: user.id,
      grantedToId: grantData.userId,
      grantedToRole: getAllUsers().find((u) => u.id === grantData.userId)?.role || "doctor",
      accessLevel: grantData.accessLevel,
      grantedAt: new Date().toISOString(),
      isActive: true,
    })

    addAuditLog({
      action: "GRANT_ACCESS",
      timestamp: new Date().toISOString(),
      performedById: user.id,
      performedByRole: "patient",
      patientId: user.id,
      metadata: { grantedToId: grantData.userId, accessLevel: grantData.accessLevel },
    })

    toast({
      title: "Success",
      description: "Access granted successfully",
    })

    setGrantData({ userId: "", accessLevel: "view" })
    setShowGrant(false)
    loadData(user)
  }

  const handleRevokeAccess = async (userId: string) => {
    revokeAccess(user.id, userId)

    addAuditLog({
      action: "REVOKE_ACCESS",
      timestamp: new Date().toISOString(),
      performedById: user.id,
      performedByRole: "patient",
      patientId: user.id,
      metadata: { revokedFromId: userId },
    })

    toast({
      title: "Access Revoked",
      description: "Access has been revoked successfully.",
    })
    loadData(user)
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const otherUsers = getAllUsers().filter((u) => u.id !== user.id && u.role !== "patient" && u.isVerified)

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
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    placeholder="e.g., Blood Test Results.pdf"
                    value={uploadData.fileName}
                    onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recordType">Record Type</Label>
                  <Select
                    value={uploadData.recordType}
                    onValueChange={(value) => setUploadData({ ...uploadData, recordType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab_report">Lab Report</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Button variant="outline" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload}>Upload</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showGrant} onOpenChange={setShowGrant}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
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
                  <Label htmlFor="user">Select Provider</Label>
                  <Select
                    value={grantData.userId}
                    onValueChange={(value) => setGrantData({ ...grantData, userId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a doctor or lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessLevel">Access Level</Label>
                  <Select
                    value={grantData.accessLevel}
                    onValueChange={(value) => setGrantData({ ...grantData, accessLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="view_upload">View & Upload</SelectItem>
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
          <TabsList>
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
          </TabsList>

          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>View and manage your uploaded medical records</CardDescription>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-center text-muted-foreground">No records uploaded yet</p>
                ) : (
                  <div className="space-y-3">
                    {records.map((record) => (
                      <div key={record._id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{record.fileName}</span>
                            <Badge variant="secondary">{record.recordType}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Uploaded on {new Date(record.uploadDate).toLocaleDateString()}
                            {record.metadata?.description && ` • ${record.metadata.description}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {/* SummaryDialog component is assumed to be present and functional */}
                          {/* <SummaryDialog recordId={record._id} recordName={record.fileName} /> */}
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
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
                  <p className="text-center text-muted-foreground">No active access permissions</p>
                ) : (
                  <div className="space-y-3">
                    {permissions
                      .filter((p) => p.isActive)
                      .map((permission) => (
                        <div key={permission._id} className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{permission.grantedToUser.name}</span>
                              <Badge variant="outline">{permission.grantedToUser.role}</Badge>
                              <Badge>{permission.accessLevel}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {permission.grantedToUser.email}
                              {permission.grantedToUser.specialization &&
                                ` • ${permission.grantedToUser.specialization}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Granted on {new Date(permission.grantedAt).toLocaleDateString()}
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
                  <p className="text-center text-muted-foreground">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.slice(0, 20).map((log) => (
                      <div key={log._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.action.replace("_", " ")}</Badge>
                            <span className="text-sm">
                              by <span className="font-medium">{log.performedByUser.name}</span> (
                              {log.performedByUser.role})
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
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
