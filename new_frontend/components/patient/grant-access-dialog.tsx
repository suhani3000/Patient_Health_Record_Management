"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useActiveAccount } from "thirdweb/react"
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb"
import { Button } from "@/components/ui/button"
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
import { UserPlus, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  thirdwebClient,
  localChain,
  EHRAccessABI,
  EHR_ACCESS_ADDRESS,
  toAccessTypeUint,
} from "@/lib/contracts"

interface User {
  _id: string
  name: string
  email: string
  role: string
  specialization?: string
  blockchainAddress?: string // Needed to call EHRAccess.grantAccess(doctorAddress, ...)
}

interface GrantAccessDialogProps {
  onGrantSuccess: () => void
  /**
   * Optional: if provided, the on-chain call will use this fileId so that
   * access is scoped to a specific record. When omitted, fileId defaults to 0
   * (which in EHRAccess.sol means "all files" by convention).
   */
  fileId?: number
}

export function GrantAccessDialog({ onGrantSuccess, fileId = 0 }: GrantAccessDialogProps) {
  const account = useActiveAccount()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("doctor")
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [accessLevel, setAccessLevel] = useState("view-upload")
  const { toast } = useToast()

  const searchUsers = async () => {
    setSearching(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/users/search?role=${roleFilter}&q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (open) {
      searchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roleFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let blockchainTxHash: string | null = null
    let blockchainWarning = false

    // ── Step 1: On-chain grantAccess call (EHRAccess.sol) ────────────────────
    const grantedToUser = users.find((u) => u._id === selectedUserId)
    const doctorAddress = grantedToUser?.blockchainAddress

    if (!account) {
      console.warn("[GrantAccessDialog] No wallet connected — skipping on-chain grant")
      blockchainWarning = true
    } else if (!EHR_ACCESS_ADDRESS) {
      console.warn("[GrantAccessDialog] EHR_ACCESS_ADDRESS not set — skipping on-chain grant")
      blockchainWarning = true
    } else if (!doctorAddress) {
      console.warn(
        "[GrantAccessDialog] Target user has no blockchainAddress — skipping on-chain grant"
      )
      blockchainWarning = true
    } else {
      try {
        const contract = getContract({
          client: thirdwebClient,
          chain: localChain,
          address: EHR_ACCESS_ADDRESS,
          abi: EHRAccessABI,
        })

        const accessTypeUint = toAccessTypeUint(
          accessLevel as "view" | "upload" | "view-upload"
        )

        const transaction = prepareContractCall({
          contract,
          method: "grantAccess",
          params: [
            doctorAddress as `0x${string}`,
            BigInt(fileId),
            accessTypeUint,
          ],
        })

        const txResult = await sendTransaction({ transaction, account })
        const receipt = await waitForReceipt({
          client: thirdwebClient,
          chain: localChain,
          transactionHash: txResult.transactionHash,
        })

        blockchainTxHash = receipt.transactionHash
      } catch (chainErr: any) {
        console.error("[GrantAccessDialog] Blockchain grant failed:", chainErr)
        blockchainWarning = true
      }
    }

    // ── Step 2: Persist to MongoDB via the API route ─────────────────────────
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/patient/access/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          accessLevel,
          // Pass the real tx hash (or null if chain call failed)
          blockchainTxHash: blockchainTxHash ?? null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to grant access")
      }

      if (blockchainWarning) {
        toast({
          title: "Access Granted (Off-Chain Only)",
          description:
            "⚠️ Blockchain transaction failed — access recorded off-chain only. Ensure your Hardhat node is running and NEXT_PUBLIC_EHR_ACCESS_ADDRESS is set.",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Access Granted ✅",
          description: `On-chain TX: ${blockchainTxHash?.slice(0, 16)}… | File ID: ${fileId}`,
          duration: 6000,
        })
      }

      setOpen(false)
      setSelectedUserId("")
      onGrantSuccess()
    } catch (error: any) {
      toast({
        title: "Failed to Grant Access",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
              Allow a doctor or lab to access your medical records.
              {fileId > 0 && (
                <span className="block text-xs font-medium mt-1">
                  Scoped to File ID: {fileId}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User Type</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="lab">Lab Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Search Users</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="button" onClick={searchUsers} disabled={searching} size="sm">
                  {searching ? "…" : "Search"}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} — {user.email}
                      {user.specialization && ` (${user.specialization})`}
                      {!user.blockchainAddress && " ⚠️ no wallet"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserId &&
                !users.find((u) => u._id === selectedUserId)?.blockchainAddress && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-md">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    This user has no linked wallet address. Access will be recorded off-chain only.
                  </div>
                )}
            </div>

            <div className="grid gap-2">
              <Label>Access Level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="upload">Upload Only</SelectItem>
                  <SelectItem value="view-upload">View &amp; Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!EHR_ACCESS_ADDRESS && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>NEXT_PUBLIC_EHR_ACCESS_ADDRESS</strong> is not set. Access will be
                  recorded off-chain only.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedUserId}>
              {loading ? "Granting…" : "Grant Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
