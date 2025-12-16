import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireAuth } from "@/lib/auth/middleware"
import type { MedicalRecord, AISummary } from "@/lib/db/models"
import { generateMedicalSummary, extractTextFromFile } from "@/lib/ai/llm-service"

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { recordId } = await req.json()

    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 })
    }

    const db = await connectToDatabase()

    // Find the record
    const record = db.medicalRecords.find((r: MedicalRecord) => r._id === recordId)
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // Check if user has access to this record
    if (user.role === "patient" && record.patientId !== user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (user.role === "doctor" || user.role === "lab") {
      // Check if they have access to this patient
      const hasAccess = db.accessPermissions.some(
        (p: any) =>
          p.patientId === record.patientId &&
          p.grantedTo === user.userId &&
          p.isActive &&
          p.accessLevel.includes("view"),
      )

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Check if summary already exists
    const existingSummary = db.aiSummaries.find((s: AISummary) => s.recordId === recordId)
    if (existingSummary) {
      return NextResponse.json({ summary: existingSummary }, { status: 200 })
    }

    // Extract text from file (mock implementation)
    const extractedText = extractTextFromFile(record.fileName, record.fileType)

    // Generate AI summary
    const summaryData = await generateMedicalSummary(extractedText, record.recordType)

    // Store summary in database
    const newSummary: AISummary = {
      _id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordId,
      patientId: record.patientId,
      summary: summaryData,
      generatedAt: new Date(),
      modelUsed: "gpt-4-medical-demo",
    }

    db.aiSummaries.push(newSummary)

    return NextResponse.json(
      {
        message: "Summary generated successfully",
        summary: newSummary,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[Generate Summary API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
