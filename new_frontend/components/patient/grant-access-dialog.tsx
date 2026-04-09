"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useActiveAccount } from "thirdweb/react"
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  thirdwebClient,
  localChain,
  EHRAccessABI,
  EHR_ACCESS_ADDRESS,
  EHR_ACCESS_ADDRESS_DEPLOYED,
  toAccessTypeUint,
} from "@/lib/contracts"

interface User {
  _id: string
  name: string
  email: string
  role: string
  specialization?: string
  blockchainAddress?: string
  encryptionPublicKey?: string  // ← needed to re-encrypt AES key for doctor
}

interface PatientRecordRow {
  _id: string
  encryptedAESKey?: string
  fileId?: number
}

interface GrantAccessDialogProps {
  onGrantSuccess: () => void
  fileId?: number
}

export function GrantAccessDialog({ onGrantSuccess, fileId = 0 }: GrantAccessDialogProps) {
  const account = useActiveAccount()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("doctor")
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [accessLevel, setAccessLevel] = useState("view-upload")
  const [stage, setStage] = useState("idle")
  const { toast } = useToast()

  const searchUsers = async () => {
    setSearching(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/users/search?role=${roleFilter}&q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setUsers(data.users)
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => { if (open) searchUsers() }, [open, roleFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const token = localStorage.getItem("token")
    const doctorUser = users.find((u) => u._id === selectedUserId)

    let blockchainTxHash: string | null = null
    let blockchainWarning = false

    // ── Step 1: On-chain grantAccess ─────────────────────────────────────────
    setStage("Signing blockchain transaction…")
    const doctorAddress = doctorUser?.blockchainAddress
    const accessAddr = EHR_ACCESS_ADDRESS_DEPLOYED
    const doctorHex =
      doctorAddress &&
      doctorAddress.startsWith("0x") &&
      doctorAddress.length === 42 &&
      /^0x[a-fA-F0-9]{40}$/.test(doctorAddress)
        ? (doctorAddress as `0x${string}`)
        : undefined

    if (!account || !accessAddr || !doctorHex) {
      blockchainWarning = true
    } else {
      const activeAccount = account
      const accessContractAddr = accessAddr satisfies `0x${string}`
      try {
        const contract = getContract({
          client: thirdwebClient, chain: localChain,
          address: accessContractAddr, abi: EHRAccessABI,
        })
        const tx = prepareContractCall({
          contract,
          method: "grantAccess",
          params: [
            doctorHex,
            BigInt(fileId),
            toAccessTypeUint(accessLevel as "view" | "upload" | "view-upload"),
          ],
        })
        const result = await sendTransaction({ transaction: tx, account: activeAccount })
        const receipt = await waitForReceipt({
          client: thirdwebClient, chain: localChain,
          transactionHash: result.transactionHash,
        })
        blockchainTxHash = receipt.transactionHash
      } catch (err) {
        console.error("[GrantAccess] Chain error:", err)
        blockchainWarning = true
      }
    }

    // ── Step 2: (Encryption disabled) No key re-wrapping required ───────────
    const doctorKeyMap: Record<string, string> = {}

    // ── Step 3: Save permission to MongoDB ──────────────────────────────────
    setStage("Saving access record…")
    try {
      const res = await fetch("/api/patient/access/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          accessLevel,
          blockchainTxHash: blockchainTxHash ?? null,
          doctorKeyMap, // { recordId → encryptedAESKeyForDoctor }
          doctorAddress: doctorAddress ?? null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to grant access")

      toast({
        title: blockchainWarning ? "Access Granted (Off-Chain) ⚠️" : "Access Granted ✅",
        description: blockchainWarning
          ? "Blockchain step failed — access saved off-chain only."
          : `On-chain TX: ${blockchainTxHash?.slice(0, 16)}… | Keys shared: ${Object.keys(doctorKeyMap).length} record(s)`,
        variant: blockchainWarning ? "destructive" : "default",
        duration: 6000,
      })

      setOpen(false)
      setSelectedUserId("")
      onGrantSuccess()
    } catch (error: any) {
      toast({ title: "Failed to Grant Access", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
      setStage("idle")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <UserPlus className="h-4 w-4" />
          Grant Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Grant Access</DialogTitle>
            <DialogDescription>
              Allow a doctor or lab to access your medical records stored on IPFS.
              {fileId > 0 && <span className="block text-xs font-medium mt-1">Scoped to File ID: {fileId}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User Type</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="lab">Lab Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Search</Label>
              <div className="flex gap-2">
                <Input placeholder="Name or email…" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} />
                <Button type="button" onClick={searchUsers} disabled={searching} size="sm">
                  {searching ? "…" : "Search"}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                <SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name} — {u.email}
                      {u.specialization && ` (${u.specialization})`}
                      {!u.blockchainAddress && " ⚠️ no wallet"}
                      {!u.encryptionPublicKey && " 🔑 no enc key"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Encryption disabled: no private-key sharing prerequisites */}
            </div>
            <div className="grid gap-2">
              <Label>Access Level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="upload">Upload Only</SelectItem>
                  <SelectItem value="view-upload">View & Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !selectedUserId}>
              {loading ? stage : "Grant Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}