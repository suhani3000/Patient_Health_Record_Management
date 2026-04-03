export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import { ObjectId } from "mongodb"

/**
 * PATCH /api/patient/records/[id]
 *
 * Updates a specific medical record with blockchain data (fileId, transactionHash)
 * after the smart contract call completes on the frontend.
 *
 * Body: { fileId?: number, transactionHash?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ["patient"])
    const { id } = params

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { fileId, transactionHash } = body

    if (fileId === undefined && transactionHash === undefined) {
      return NextResponse.json(
        { error: "Nothing to update — provide fileId or transactionHash" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const recordsCollection = db.collection("medicalRecords")

    // Ensure the record belongs to this patient before updating
    const existing = await recordsCollection.findOne({
      _id: new ObjectId(id),
      patientId: new ObjectId(user.userId),
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Record not found or not owned by this patient" },
        { status: 404 }
      )
    }

    const updateFields: Record<string, any> = {}
    if (fileId !== undefined) updateFields.fileId = fileId
    if (transactionHash !== undefined) updateFields.transactionHash = transactionHash

    await recordsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    )

    return NextResponse.json({
      message: "Record updated with blockchain data",
      updated: updateFields,
    })
  } catch (error: any) {
    console.error("[PATCH /api/patient/records/:id]", error)
    if (error.message === "Unauthorized" || error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
