"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, LogOut, ChevronRight, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DoctorDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [records, setRecords] = useState<any[]>([])
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

        <div className="flex-1">
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
            <Card>
              <CardHeader>
                <CardTitle>Medical Records - {selectedPatient.patientName}</CardTitle>
                <CardDescription>View patient medical records</CardDescription>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No records available for this patient</p>
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
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
