"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, User, MessageCircle, ArrowUpCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Followup {
  _id: string
  doctorName: string
  doctorSpecialization: string
  action: "view" | "upload" | "observation"
  description: string
  timestamp: string
}

interface FollowupsTimelineDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  patientId?: string // Required for doctors, omitted for patients (uses token)
  patientName: string
}

export function FollowupsTimelineDialog({
  isOpen,
  onOpenChange,
  patientId,
  patientName,
}: FollowupsTimelineDialogProps) {
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadFollowups = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const url = patientId 
        ? `/api/followup?patientId=${encodeURIComponent(patientId)}`
        : `/api/followup`
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load followups")
      setFollowups(data.followups || [])
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Could not load followup history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [patientId, toast])

  useEffect(() => {
    if (isOpen) {
      loadFollowups()
    }
  }, [isOpen, loadFollowups])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MessageCircle className="h-6 w-6 text-primary" />
            Clinical Follow-ups
          </DialogTitle>
          <DialogDescription>
            Historical clinical notes and interactions for <span className="font-semibold text-foreground">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Loading timeline...</p>
            </div>
          ) : followups.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted">
              <p className="text-muted-foreground">No clinical follow-ups recorded yet.</p>
            </div>
          ) : (
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {followups.map((item) => (
                <div key={item._id} className="relative flex items-start gap-6 pl-12 group">
                  {/* Timeline Icon */}
                  <div className="absolute left-0 mt-1 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm ring-4 ring-slate-50 transition-all group-hover:scale-110 group-hover:border-primary/50 group-hover:ring-primary/5">
                    {item.action === "upload" ? (
                      <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                    ) : item.action === "observation" ? (
                      <MessageCircle className="h-5 w-5 text-purple-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                                {item.doctorName}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase opacity-70">
                                {item.doctorSpecialization}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.timestamp).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-50/50 group-hover:bg-white group-hover:shadow-md group-hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                           <Badge variant={item.action === "upload" ? "default" : item.action === "observation" ? "secondary" : "outline"} className="text-[9px] uppercase tracking-widest font-black">
                                {item.action === "upload" ? "Report Uploaded" : item.action === "observation" ? "Clinical Observation" : "Record Viewed"}
                           </Badge>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                            "{item.description}"
                        </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
