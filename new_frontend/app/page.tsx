"use client"

import { WalletLogin } from "@/components/wallet-login"
import { useActiveAccount } from "thirdweb/react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, UserCircle, FlaskConical, ShieldCheck, ArrowRight, Lock, CheckCircle2, AlertTriangle } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const account = useActiveAccount()
  const [showAuth, setShowAuth] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | "lab" | "admin" | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // Prevent the unified-auth call from firing more than once per wallet session
  const authCalledRef = useRef(false)

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
    setError("")
    // Reset the guard so a new role selection can re-trigger
    authCalledRef.current = false
  }

  // ─── Unified Auth Effect ───────────────────────────────────────────────────
  // Fires whenever Thirdweb connects a wallet AND a role has been selected.
  useEffect(() => {
    if (!account?.address || !selectedRole || authCalledRef.current) return

    authCalledRef.current = true
    setLoading(true)
    setError("")

    const perform = async () => {
      try {
        // Thirdweb In-App Wallets expose the email via account.getEmail() on SDK v5.
        // If unavailable we fall back to the address itself as a placeholder email.
        const email =
          typeof (account as any).getEmail === "function"
            ? await (account as any).getEmail()
            : `${account.address.toLowerCase()}@wallet.local`

        const res = await fetch("/api/auth/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockchainAddress: account.address,
            email,
            role: selectedRole,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Authentication failed")
          authCalledRef.current = false
          return
        }

        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))

        if (data.needsProfileCompletion) {
          router.push(`/${selectedRole}/complete-profile`)
        } else {
          router.push(`/${selectedRole}`)
        }
      } catch (err) {
        setError("Network error. Please try again.")
        authCalledRef.current = false
      } finally {
        setLoading(false)
      }
    }

    perform()
  }, [account, selectedRole, router])

  if (showAuth) {
    const roleInfo = roles.find((r) => r.id === selectedRole)
    const Icon = roleInfo?.icon ?? Activity
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Sign In Securely</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowAuth(false); setSelectedRole(null); setError(""); authCalledRef.current = false }}
              >
                ← Back
              </Button>
            </div>
            <CardDescription>
              Connecting as{" "}
              <span className="font-semibold capitalize">{selectedRole}</span> using your Web3 wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Role badge */}
            {roleInfo && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${roleInfo.bgColor}`}>
                <Icon className={`h-5 w-5 ${roleInfo.color}`} />
                <span className={`text-sm font-medium ${roleInfo.color}`}>{roleInfo.title} Portal</span>
              </div>
            )}

            {/* Thirdweb passwordless login */}
            <div className="flex justify-center">
              <WalletLogin />
            </div>

            {/* Status feedback */}
            {loading && (
              <div className="text-sm text-muted-foreground text-center animate-pulse">
                Authenticating wallet… please wait
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {(selectedRole === "doctor" || selectedRole === "lab") && !loading && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                New Doctors &amp; Labs require admin verification. You will be redirected to complete your profile after sign-in.
              </div>
            )}
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
          
          {/* REPLACED: Web3 Seamless Login Button */}
          <WalletLogin />
          
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* NEW: Show the wallet address if they logged in successfully! */}
          {account && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg inline-block animate-in fade-in slide-in-from-bottom-4 shadow-sm">
              <p className="text-sm text-green-800 font-semibold mb-1">✅ Secure Web3 Wallet Generated!</p>
              <code className="text-xs text-green-600 bg-white px-2 py-1 rounded border border-green-100 font-mono">
                {account.address}
              </code>
            </div>
          )}

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
