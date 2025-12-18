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

export default function PatientDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [availableProviders, setAvailableProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadData, setUploadData] = useState({
    fileName: "",
    fileType: "pdf",
    recordType: "Lab Report",
    description: "",
    fileData: "",
  })

  const [showGrant, setShowGrant] = useState(false)
  const [grantData, setGrantData] = useState({
    userId: "",
    accessLevel: "view",
  })

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
        // fetch("/api/users/search?role=doctor", { headers: getAuthHeaders() }),
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

    try {
      const res = await fetch("/api/patient/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(uploadData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      toast({
        title: "Success",
        description: "Medical record uploaded successfully",
      })

      setUploadData({ fileName: "", fileType: "pdf", recordType: "Lab Report", description: "", fileData: "" })
      setShowUpload(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload record",
        variant: "destructive",
      })
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

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
                  <Input
                    id="recordType"
                    placeholder="e.g., Lab Report, X-Ray, Prescription"
                    value={uploadData.recordType}
                    onChange={(e) => setUploadData({ ...uploadData, recordType: e.target.value })}
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
                      {availableProviders.map((provider) => (
                        <SelectItem key={provider._id} value={provider._id}>
                          {provider.name} ({provider.role})
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
                  <p className="text-center text-muted-foreground py-8">No records uploaded yet</p>
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
                        <Button variant="ghost" size="sm" className="gap-2">
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
                  <p className="text-center text-muted-foreground py-8">No active access permissions</p>
                ) : (
                  <div className="space-y-3">
                    {permissions
                      .filter((p) => p.isActive)
                      .map((permission) => (
                        <div key={permission._id} className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{permission.grantedToUser?.name || "Unknown"}</span>
                              <Badge variant="outline">{permission.grantedToRole}</Badge>
                              <Badge>{permission.accessLevel}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{permission.grantedToUser?.email}</p>
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
                  <p className="text-center text-muted-foreground py-8">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.slice(0, 20).map((log) => (
                      <div key={log._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                            <span className="text-sm">
                              by <span className="font-medium">{log.performedByUser?.name || "Unknown"}</span> (
                              {log.performedByRole})
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
