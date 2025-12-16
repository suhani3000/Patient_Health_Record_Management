"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Shield, Activity, LogOut, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
    if (parsedUser.role !== "admin") {
      router.push("/")
      return
    }

    setUser(parsedUser)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pendingRes, usersRes, logsRes, statsRes] = await Promise.all([
        fetch("/api/admin/pending-verifications", { headers: getAuthHeaders() }),
        fetch("/api/admin/users", { headers: getAuthHeaders() }),
        fetch("/api/admin/audit-logs?limit=50", { headers: getAuthHeaders() }),
        fetch("/api/admin/stats", { headers: getAuthHeaders() }),
      ])

      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPendingUsers(data.users || [])
      }

      if (usersRes.ok) {
        const data = await usersRes.json()
        setAllUsers(data.users || [])
      }

      if (logsRes.ok) {
        const data = await logsRes.json()
        setAuditLogs(data.logs || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
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

  const handleVerifyUser = async (userId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/admin/verify-user", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, action }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify user")
      }

      toast({
        title: action === "approve" ? "User Approved" : "User Rejected",
        description: data.message,
      })

      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify user",
        variant: "destructive",
      })
    }
  }

  const handleBlockUser = async (userId: string, action: "block" | "unblock") => {
    try {
      const res = await fetch("/api/admin/block-user", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, action }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to block/unblock user")
      }

      toast({
        title: action === "block" ? "User Blocked" : "User Unblocked",
        description: data.message,
      })

      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to block/unblock user",
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
        {stats && (
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
        )}

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
                  <p className="text-center text-muted-foreground py-8">No pending verifications</p>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((pendingUser) => (
                      <div key={pendingUser._id} className="flex items-center justify-between rounded-lg border p-4">
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
                            onClick={() => handleVerifyUser(pendingUser._id, "approve")}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerifyUser(pendingUser._id, "reject")}
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
                {allUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((systemUser) => (
                      <div key={systemUser._id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{systemUser.name}</span>
                            <Badge variant="outline">{systemUser.role}</Badge>
                            {systemUser.isVerified && <Badge variant="secondary">Verified</Badge>}
                            {systemUser.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{systemUser.email}</p>
                        </div>
                        {!systemUser.isBlocked && systemUser.role !== "admin" && (
                          <Button size="sm" variant="outline" onClick={() => handleBlockUser(systemUser._id, "block")}>
                            Block
                          </Button>
                        )}
                        {systemUser.isBlocked && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleBlockUser(systemUser._id, "unblock")}
                          >
                            Unblock
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No audit logs yet</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                            <span className="text-sm">
                              by <span className="font-medium">{log.performedByUser?.name || "Unknown"}</span> (
                              {log.performedByRole})
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
