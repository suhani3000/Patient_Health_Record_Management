"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type Role = "patient" | "doctor" | "lab"

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]

export default function CompleteProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)

  const [patientForm, setPatientForm] = useState({
    name: "",
    dateOfBirth: "",
    bloodType: "",
    emergencyContact: "",
  })
  const [doctorForm, setDoctorForm] = useState({
    name: "",
    specialization: "",
    licenseNumber: "",
  })
  const [labForm, setLabForm] = useState({
    name: "",
    licenseNumber: "",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const raw = localStorage.getItem("user")
    if (!token || !raw) {
      router.replace("/")
      return
    }
    try {
      const u = JSON.parse(raw)
      if (!["patient", "doctor", "lab"].includes(u.role)) {
        router.replace("/")
        return
      }
      setRole(u.role)
    } catch {
      router.replace("/")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem("token")
    if (!token || !role) return

    setLoading(true)
    try {
      let body: Record<string, string> = {}
      if (role === "patient") {
        body = {
          name: patientForm.name,
          dateOfBirth: patientForm.dateOfBirth,
          bloodType: patientForm.bloodType,
          emergencyContact: patientForm.emergencyContact,
        }
      } else if (role === "doctor") {
        body = {
          name: doctorForm.name,
          specialization: doctorForm.specialization,
          licenseNumber: doctorForm.licenseNumber,
        }
      } else {
        body = {
          name: labForm.name,
          licenseNumber: labForm.licenseNumber,
        }
      }

      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save profile")

      localStorage.setItem("user", JSON.stringify(data.user))
      toast({ title: "Profile complete", description: "Your details have been saved securely." })
      router.replace(`/${role}`)
    } catch (err: any) {
      toast({
        title: "Could not save profile",
        description: err.message ?? "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            {role === "patient" && "We need a few details for your health record."}
            {role === "doctor" && "Confirm your professional details for verification."}
            {role === "lab" && "Confirm your laboratory details for verification."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "patient" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    required
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Blood type</Label>
                  <Select
                    required
                    value={patientForm.bloodType || undefined}
                    onValueChange={(v) => setPatientForm({ ...patientForm, bloodType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_TYPES.map((bt) => (
                        <SelectItem key={bt} value={bt}>
                          {bt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency">Emergency contact number</Label>
                  <Input
                    id="emergency"
                    type="tel"
                    required
                    value={patientForm.emergencyContact}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, emergencyContact: e.target.value })
                    }
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            {role === "doctor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dname">Full name</Label>
                  <Input
                    id="dname"
                    required
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spec">Specialization</Label>
                  <Input
                    id="spec"
                    required
                    placeholder="e.g. Cardiology"
                    value={doctorForm.specialization}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, specialization: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lic">License number</Label>
                  <Input
                    id="lic"
                    required
                    value={doctorForm.licenseNumber}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {role === "lab" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="lname">Full name</Label>
                  <Input
                    id="lname"
                    required
                    value={labForm.name}
                    onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="llic">License number</Label>
                  <Input
                    id="llic"
                    required
                    value={labForm.licenseNumber}
                    onChange={(e) => setLabForm({ ...labForm, licenseNumber: e.target.value })}
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Save and continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
