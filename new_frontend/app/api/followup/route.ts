import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireAuth, requireRole } from "@/lib/auth/middleware"
import { Followup, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET /api/followup - Returns followups for current user (if patient) or requires patientId query (if doctor)
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const db = await getDatabase()
    const followupsCollection = db.collection<Followup>("followups")

    let query: any = {}

    if (user.role === "patient") {
      query.patientId = new ObjectId(user.userId)
    } else if (user.role === "doctor") {
      const { searchParams } = new URL(req.url)
      const patientId = searchParams.get("patientId")
      if (!patientId || !ObjectId.isValid(patientId)) {
        return NextResponse.json({ error: "Patient ID is required for doctors" }, { status: 400 })
      }
      query.patientId = new ObjectId(patientId)
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const followups = await followupsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray()

    return NextResponse.json({ followups })
  } catch (error: any) {
    console.error("[Followup API GET] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// POST /api/followup - Log a new followup (usually for "view" action)
export async function POST(req: NextRequest) {
  try {
    const userScope = requireRole(req, ["doctor"])
    const body = await req.json()
    const { patientId, description, action, recordId } = body

    if (!patientId || !description || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!ObjectId.isValid(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const followupsCollection = db.collection<Followup>("followups")

    const doctorDoc = await usersCollection.findOne({ _id: new ObjectId(userScope.userId) })
    if (!doctorDoc) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    const newFollowup: Omit<Followup, "_id"> = {
      patientId: new ObjectId(patientId),
      doctorId: new ObjectId(userScope.userId),
      doctorName: doctorDoc.name,
      doctorSpecialization: doctorDoc.specialization || "General Physician",
      action: action as "view" | "upload" | "observation",
      recordId: recordId,
      description,
      timestamp: new Date(),
    }

    const result = await followupsCollection.insertOne(newFollowup as any)

    return NextResponse.json({ 
      message: "Followup logged", 
      followupId: result.insertedId 
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Followup API POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
