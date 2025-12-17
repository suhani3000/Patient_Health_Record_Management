"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

import {
  getEHRRegistryContract,
  getEHRAccessContract,
} from "@/lib/blockchain"

import { getCurrentUser, logout } from "@/lib/mock-auth"

/* ---------------- TYPES ---------------- */

interface BlockchainFile {
  fileName: string
  recordType: string
  ipfsHash: string
  timestamp: bigint
}

/* ---------------- PAGE ---------------- */

export default function PatientDashboard() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [files, setFiles] = useState<BlockchainFile[]>([])
  const [loading, setLoading] = useState(true)

  const [fileName, setFileName] = useState("")
  const [recordType, setRecordType] = useState("lab")

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== "patient") {
      router.push("/")
      return
    }
    setUser(u)
    // loadFiles(u.walletAddress)
  }, [])

  /* ---------------- BLOCKCHAIN READ ---------------- */

  async function loadFiles(patientAddress: string) {
    try {
      const registry = await getEHRRegistryContract()
      const data = await registry.getFiles(patientAddress)
      setFiles(data)
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to load records from blockchain",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- BLOCKCHAIN WRITE ---------------- */

  async function uploadRecord() {
    if (!fileName) return

    try {
      const registry = await getEHRRegistryContract()

      const tx = await registry.addFile(
        user.walletAddress,
        fileName,
        recordType,
        "QmDummyIPFSHash" // placeholder
      )

      await tx.wait()

      toast({
        title: "Success",
        description: "Record uploaded to blockchain",
      })

      setFileName("")
      loadFiles(user.walletAddress)
    } catch (err) {
      console.error(err)
      toast({
        title: "Transaction failed",
        description: "Upload rejected",
        variant: "destructive",
      })
    }
  }

  /* ---------------- LOGOUT ---------------- */

  function handleLogout() {
    logout()
    router.push("/")
  }

  /* ---------------- UI ---------------- */

  if (loading) return <p className="p-8">Loading...</p>

  return (
    <div className="p-8 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patient Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Medical Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          <div>
            <Label>Record Type</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab">Lab Report</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={uploadRecord}>Upload to Blockchain</Button>
        </CardContent>
      </Card>

      {/* Records */}
      <Card>
        <CardHeader>
          <CardTitle>Your Records</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p>No records yet</p>
          ) : (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={i} className="border p-3 rounded">
                  <p><strong>{f.fileName}</strong></p>
                  <p className="text-sm text-muted-foreground">
                    {f.recordType} •{" "}
                    {new Date(Number(f.timestamp) * 1000).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
