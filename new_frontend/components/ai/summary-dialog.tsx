"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SummaryDialogProps {
  recordId: string
  recordName: string
}

interface AISummary {
  _id: string
  summary: {
    diagnosis?: string
    medications?: string[]
    testResults?: Array<{
      test: string
      value: string
      unit?: string
      normalRange?: string
    }>
    recommendations?: string[]
    keyFindings: string[]
  }
  generatedAt: string
  modelUsed: string
}

export function SummaryDialog({ recordId, recordName }: SummaryDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [summary, setSummary] = useState<AISummary | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadSummary()
    }
  }, [open])

  const loadSummary = async () => {
    setLoading(true)
    const token = localStorage.getItem("token")

    try {
      const response = await fetch(`/api/ai/summary/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Error loading summary:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    setGenerating(true)
    const token = localStorage.getItem("token")

    try {
      const response = await fetch("/api/ai/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId }),
      })

      const data = await response.json()

      if (response.ok) {
        setSummary(data.summary)
        toast({
          title: "Summary Generated",
          description: "AI summary has been generated successfully.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Sparkles className="h-4 w-4" />
          AI Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Generated Medical Summary
          </DialogTitle>
          <DialogDescription>{recordName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !summary ? (
          <div className="space-y-4 py-6">
            <p className="text-center text-muted-foreground">
              No AI summary available for this record yet. Generate one using our advanced medical AI.
            </p>
            <div className="flex justify-center">
              <Button onClick={generateSummary} disabled={generating} className="gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {summary.summary.diagnosis && (
              <div>
                <h3 className="mb-2 font-semibold">Diagnosis</h3>
                <p className="rounded-lg bg-muted p-3 text-sm">{summary.summary.diagnosis}</p>
              </div>
            )}

            {summary.summary.keyFindings && summary.summary.keyFindings.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Key Findings</h3>
                <ul className="space-y-2">
                  {summary.summary.keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.summary.testResults && summary.summary.testResults.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Test Results</h3>
                <div className="space-y-2">
                  {summary.summary.testResults.map((result, index) => (
                    <div key={index} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.test}</span>
                        <Badge variant="secondary">
                          {result.value} {result.unit}
                        </Badge>
                      </div>
                      {result.normalRange && (
                        <p className="mt-1 text-xs text-muted-foreground">Normal range: {result.normalRange}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.summary.medications && summary.summary.medications.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Medications</h3>
                <ul className="space-y-2">
                  {summary.summary.medications.map((medication, index) => (
                    <li key={index} className="rounded-lg bg-muted p-3 text-sm">
                      {medication}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.summary.recommendations && summary.summary.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Recommendations</h3>
                <ul className="space-y-2">
                  {summary.summary.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Generated on {new Date(summary.generatedAt).toLocaleString()} using {summary.modelUsed}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Note: AI summaries are for informational purposes. Always consult with healthcare professionals for
                medical advice.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
