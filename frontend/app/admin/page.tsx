"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Shield, Activity, LogOut, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, getAllUsers, logout } from "@/lib/mock-auth"
import { getMedicalRecords, getAccessPermissions, getAuditLogs } from "@/lib/mock-data"

interface PendingUser {
  _id: string
  name: string
  email: string
  role: string
  specialization?: string
  licenseNumber?: string
  createdAt: string
}

interface SystemUser {
  _id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  isBlocked: boolean
  createdAt: string
}

interface AuditLog {
  _id: string
  action: string
  timestamp: string
  performedByUser: {
    name: string
    role: string
  }
  patient?: {
    name: string
  }
  metadata?: any
}

interface Stats {
  users: {
    total: number
    patients: number
    doctors: number
    labs: number
    admins: number
  }
  pending: {
    doctors: number
    labs: number
  }
  blocked: number
  records: {
    total: number
    byPatient: number
    byDoctor: number
    byLab: number
  }
  permissions: {
    total: number
    active: number
    revoked: number
  }
  auditLogs: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allAuditLogs, setAllAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser || currentUser.role !== "admin") {
      router.push("/")
      return
    }

    setUser(currentUser)
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)

    const users = getAllUsers()

    // Collect all audit logs from all patients
    const patientUsers = users.filter((u) => u.role === "patient")
    const allLogs = patientUsers.flatMap((patient) => {
      const logs = getAuditLogs(patient.id)
      return logs.map((log) => {
        const performedUser = users.find((u) => u.id === log.performedById)
        return {
          ...log,
          performedByUser: performedUser || { name: "Unknown", role: log.performedByRole },
          patient: { name: patient.name },
        }
      })
    })

    setAllUsers(users)
    setAllAuditLogs(allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    setLoading(false)
  }

  const handleVerifyUser = (userId: string, action: "approve" | "reject") => {
    const updatedUsers = getAllUsers().map((u) => {
      if (u.id === userId) {
        return { ...u, isVerified: action === "approve" }
      }
      return u
    })

    // Update mock data (in a real app, this would be an API call)
    toast({
      title: action === "approve" ? "User Approved" : "User Rejected",
      description: `User has been ${action === "approve" ? "verified" : "rejected"} successfully`,
    })

    loadData()
  }

  const handleBlockUser = (userId: string, action: "block" | "unblock") => {
    toast({
      title: action === "block" ? "User Blocked" : "User Unblocked",
      description: `User has been ${action}ed successfully`,
    })

    loadData()
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

  const pendingUsers = allUsers.filter((u) => !u.isVerified && u.role !== "patient")
  const verifiedUsers = allUsers.filter((u) => u.isVerified || u.role === "patient")

  // Calculate stats
  const stats = {
    users: {
      total: allUsers.length,
      patients: allUsers.filter((u) => u.role === "patient").length,
      doctors: allUsers.filter((u) => u.role === "doctor").length,
      labs: allUsers.filter((u) => u.role === "lab").length,
      admins: allUsers.filter((u) => u.role === "admin").length,
    },
    pending: {
      doctors: pendingUsers.filter((u) => u.role === "doctor").length,
      labs: pendingUsers.filter((u) => u.role === "lab").length,
    },
    records: {
      total: allUsers.filter((u) => u.role === "patient").reduce((acc, p) => acc + getMedicalRecords(p.id).length, 0),
    },
    permissions: {
      total: allUsers
        .filter((u) => u.role === "patient")
        .reduce((acc, p) => acc + getAccessPermissions(p.id).length, 0),
      active: allUsers
        .filter((u) => u.role === "patient")
        .reduce((acc, p) => acc + getAccessPermissions(p.id).filter((perm) => perm.isActive).length, 0),
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">System Administration & User Management</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.users.patients} patients, {stats.users.doctors} doctors, {stats.users.labs} labs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending.doctors + stats.pending.labs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending.doctors} doctors, {stats.pending.labs} labs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medical Records</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.records.total}</div>
              <p className="text-xs text-muted-foreground">Total records uploaded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Permissions</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.permissions.active}</div>
              <p className="text-xs text-muted-foreground">Out of {stats.permissions.total} total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Verifications ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Activity className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending User Verifications</CardTitle>
                <CardDescription>Approve or reject doctors and lab technicians</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground">No pending verifications</p>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((pendingUser) => (
                      <div key={pendingUser.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pendingUser.name}</span>
                            <Badge variant="outline">{pendingUser.role}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{pendingUser.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleVerifyUser(pendingUser.id, "approve")}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerifyUser(pendingUser.id, "reject")}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All System Users</CardTitle>
                <CardDescription>Manage and monitor all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verifiedUsers.map((systemUser) => (
                    <div key={systemUser.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{systemUser.name}</span>
                          <Badge variant="outline">{systemUser.role}</Badge>
                          {systemUser.isVerified && <Badge variant="secondary">Verified</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{systemUser.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Audit Logs</CardTitle>
                <CardDescription>Monitor all system activities and access logs</CardDescription>
              </CardHeader>
              <CardContent>
                {allAuditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground">No audit logs yet</p>
                ) : (
                  <div className="space-y-2">
                    {allAuditLogs.slice(0, 50).map((log) => (
                      <div key={log._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                            <span className="text-sm">
                              by <span className="font-medium">{log.performedByUser.name}</span> (
                              {log.performedByUser.role})
                            </span>
                            {log.patient && (
                              <span className="text-sm text-muted-foreground">for patient {log.patient.name}</span>
                            )}
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
