"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, UserCircle, FlaskConical, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LandingPage() {
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | "lab" | "admin" | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    specialization: "",
    licenseNumber: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const roles = [
    {
      id: "patient" as const,
      title: "Patient",
      description: "Access your medical records, upload documents, and manage who can view your health information",
      icon: UserCircle,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      features: ["Upload medical records", "Control access permissions", "View audit logs", "AI health summaries"],
    },
    {
      id: "doctor" as const,
      title: "Doctor",
      description: "View patient records with proper authorization and upload medical reports securely",
      icon: Activity,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      features: ["View authorized records", "Upload prescriptions", "Patient management", "Secure access"],
    },
    {
      id: "lab" as const,
      title: "Laboratory",
      description: "Upload lab reports and test results for patients who have granted you access",
      icon: FlaskConical,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      features: ["Upload lab reports", "Test result management", "Patient notifications", "Secure delivery"],
    },
    {
      id: "admin" as const,
      title: "Admin",
      description: "Verify healthcare providers, manage users, and oversee system operations",
      icon: ShieldCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      features: ["User verification", "System oversight", "Audit management", "Security monitoring"],
    },
  ]

  const handleRoleSelect = (role: typeof selectedRole) => {
    setSelectedRole(role)
    setShowAuth(true)
    setFormData({ email: "", password: "", name: "", specialization: "", licenseNumber: "" })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      // Store token
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      // Redirect based on role
      const role = data.user.role
      if (!data.user.isVerified && role !== "patient") {
        setError("Your account is pending admin verification")
        setLoading(false)
        return
      }

      router.push(`/${role}`)
    } catch (err) {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!selectedRole) {
      setError("Please select a role")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: selectedRole,
          specialization: formData.specialization,
          licenseNumber: formData.licenseNumber,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed")
        setLoading(false)
        return
      }

      if (data.needsVerification) {
        alert("Account created successfully! Your account is pending admin verification.")
        setShowAuth(false)
        setSelectedRole(null)
      } else {
        alert("Account created successfully! Please login.")
        // Switch to login tab
      }
      setLoading(false)
    } catch (err) {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAuth(false)}>
                Back
              </Button>
            </div>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  {selectedRole && (
                    <div className="text-sm bg-muted p-3 rounded-md">
                      Registering as: <span className="font-semibold">{selectedRole}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  {selectedRole === "doctor" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          placeholder="e.g., Cardiology"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="license">License Number</Label>
                        <Input
                          id="license"
                          placeholder="Medical license number"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {selectedRole === "lab" && (
                    <div className="space-y-2">
                      <Label htmlFor="lab-license">Lab License Number</Label>
                      <Input
                        id="lab-license"
                        placeholder="Laboratory license number"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      />
                    </div>
                  )}
                  {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
                  <Button type="submit" className="w-full" disabled={loading || !selectedRole}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                  {(selectedRole === "doctor" || selectedRole === "lab") && (
                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                      Note: Your account will require admin verification before you can access the system.
                    </div>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">HealthChain</span>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowAuth(true)
              setSelectedRole(null)
            }}
          >
            <Lock className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-balance leading-tight">
            Secure Healthcare Records{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Powered by Blockchain
            </span>
          </h1>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
            Revolutionary EHR platform with AI-powered summaries, granular access control, and immutable audit trails
            secured by blockchain technology
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>AI-Powered</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Choose Your Role</h2>
          <p className="text-muted-foreground text-lg">Select your role to get started with the platform</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <Card
                key={role.id}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary"
                onClick={() => handleRoleSelect(role.id)}
              >
                <CardHeader>
                  <div className={`h-14 w-14 rounded-xl ${role.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-7 w-7 ${role.color}`} />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {role.title}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center space-y-3">
            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-lg">Granular Access Control</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Patients control exactly who can view or upload to their medical records with blockchain-verified
              permissions
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="h-12 w-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto">
              <Activity className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="font-semibold text-lg">AI Health Summaries</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Automatically generate structured medical summaries with diagnoses, medications, and recommendations
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg">Immutable Audit Trail</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every access and modification is logged on the blockchain, creating a tamper-proof history
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 HealthChain. Built with Next.js, AI, and Blockchain Technology.</p>
        </div>
      </footer>
    </div>
  )
}
