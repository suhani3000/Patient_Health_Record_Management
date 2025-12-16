"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  _id: string
  name: string
  email: string
  role: string
  specialization?: string
}

interface GrantAccessDialogProps {
  onGrantSuccess: () => void
}

export function GrantAccessDialog({ onGrantSuccess }: GrantAccessDialogProps) {
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
  }, [open, roleFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to grant access")
      }

      toast({
        title: "Access Granted",
        description: "Access has been granted successfully.",
      })

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
            <DialogDescription>Allow a doctor or lab to access your medical records.</DialogDescription>
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
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="button" onClick={searchUsers} disabled={searching} size="sm">
                  {searching ? "..." : "Search"}
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
                      {user.name} - {user.email}
                      {user.specialization && ` (${user.specialization})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="view-upload">View & Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedUserId}>
              {loading ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
