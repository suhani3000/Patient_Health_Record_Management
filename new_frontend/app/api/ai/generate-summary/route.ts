import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { requireAuth } from "@/lib/auth/middleware"
import type { MedicalRecord, AISummary, AccessPermission } from "@/lib/db/models"
import { generateMedicalSummary, extractTextFromFile } from "@/lib/ai/llm-service"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const { recordId } = await req.json()

    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const aiSummariesCollection = db.collection<AISummary>("aiSummaries")

    // Find the record by Mongo _id.
    const recordObjectId = ObjectId.isValid(recordId) ? new ObjectId(recordId) : null
    if (!recordObjectId) {
      return NextResponse.json({ error: "Invalid recordId" }, { status: 400 })
    }

    const record = await recordsCollection.findOne({ _id: recordObjectId })
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // Check if user has access to this record
    if (user.role === "patient" && record.patientId.toString() !== user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (user.role === "doctor" || user.role === "lab") {
      // Check if they have access to this patient
      const hasAccess = await permissionsCollection.findOne({
        patientId: record.patientId.toString(),
        grantedTo: user.userId,
        isActive: true,
        accessLevel: { $in: ["view", "view-upload"] },
      })

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Check if summary already exists
    const existingSummary = await aiSummariesCollection.findOne({ recordId })
    if (existingSummary) return NextResponse.json({ summary: existingSummary }, { status: 200 })

    // Extract text from file (mock implementation)
    const extractedText = extractTextFromFile(
      record.fileName,
      record.fileType || "application/octet-stream",
    )

    // Generate AI summary
    const summaryData = await generateMedicalSummary(extractedText, record.recordType)

    // Store summary in database
    const newSummary: AISummary = {
      _id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordId,
      patientId: record.patientId.toString(),
      summary: summaryData,
      generatedAt: new Date(),
      modelUsed: "gpt-4-medical-demo",
    }

    await aiSummariesCollection.insertOne(newSummary as any)

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
