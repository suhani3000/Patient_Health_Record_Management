"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, LogOut, History, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, getAllUsers, logout } from "@/lib/mock-auth"
import { getMedicalRecords, getAccessPermissions } from "@/lib/mock-data"

export default function LabDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [uploadHistory, setUploadHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser || currentUser.role !== "lab") {
      router.push("/")
      return
    }

    if (!currentUser.isVerified) {
      setUser(currentUser)
      setLoading(false)
      return
    }

    setUser(currentUser)
    loadData(currentUser)
  }, [])

  const loadData = (currentUser: any) => {
    setLoading(true)

    const allUsers = getAllUsers()
    const patientUsers = allUsers.filter((u) => u.role === "patient")

    // Get patients who granted upload access to this lab
    const patientsWithAccess = patientUsers
      .map((patient) => {
        const permissions = getAccessPermissions(patient.id)
        const permission = permissions.find(
          (p) => p.grantedToId === currentUser.id && p.isActive && p.accessLevel.includes("upload"),
        )
        if (permission) {
          return {
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            accessLevel: permission.accessLevel,
            grantedAt: permission.grantedAt,
          }
        }
        return null
      })
      .filter(Boolean)

    // Get all records uploaded by this lab
    const allRecords = patientUsers.flatMap((patient) => {
      const records = getMedicalRecords(patient.id)
      return records
        .filter((r) => r.uploaderId === currentUser.id)
        .map((r) => ({
          ...r,
          patientName: patient.name,
          patientEmail: patient.email,
        }))
    })

    setPatients(patientsWithAccess)
    setUploadHistory(allRecords)
    setLoading(false)
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

  if (!user.isVerified) {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Lab Technician Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
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
                <CardTitle>Authorized Patients</CardTitle>
                <CardDescription>Patients who granted you permission to upload lab reports</CardDescription>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No patients have granted you upload access yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {patients.map((patient) => (
                      <Card key={patient.patientId} className="border-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{patient.patientName}</CardTitle>
                              <CardDescription>{patient.patientEmail}</CardDescription>
                            </div>
                            <Badge variant="secondary">{patient.accessLevel}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Access granted on {new Date(patient.grantedAt).toLocaleDateString()}
                          </p>
                        </CardHeader>
                      </Card>
                    ))}
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    {uploadHistory.map((record) => (
                      <div key={record._id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{record.fileName}</span>
                              <Badge variant="secondary">{record.recordType}</Badge>
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>
                                <span className="font-medium">Patient:</span> {record.patientName}
                              </p>
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
