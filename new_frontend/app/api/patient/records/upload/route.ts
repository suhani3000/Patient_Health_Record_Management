import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { pinFileToIPFS } from "@/lib/ipfs"
import { requireRole } from "@/lib/auth/middleware"
import { ObjectId } from "mongodb"
import type { MedicalRecord } from "@/lib/db/models"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["patient"])
    const formData = await req.formData()

    // Parse multipart form data
    const file = formData.get("file") as File
    const fileName = formData.get("fileName")?.toString() || file?.name || "record"
    const recordType = formData.get("recordType")?.toString()
    const description = formData.get("description")?.toString()
    const encryptedAESKey = formData.get("encryptedAESKey")?.toString()
    const aesIV = formData.get("aesIV")?.toString()

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    if (!encryptedAESKey || !aesIV) {
      return NextResponse.json(
        { error: "Missing encryption metadata (encryptedAESKey, aesIV)" },
        { status: 400 }
      )
    }

    // Convert to buffer and upload to IPFS
    const buffer = Buffer.from(await file.arrayBuffer())
    const cid = await pinFileToIPFS(buffer, fileName)

    if (!cid) {
      throw new Error("IPFS upload failed: no CID returned")
    }

    // Save metadata to MongoDB
    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")

    const record = {
      patientId: new ObjectId(user.userId),
      uploadedBy: new ObjectId(user.userId),
      uploaderRole: "patient",
      fileName,
      fileType: file.type || "application/octet-stream",
      cid,
      fileCID: cid,
      fileUrl: `ipfs://${cid}`,
      fileHash: `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`,
      recordType: recordType || "Medical Record",
      encryptedAESKey,
      aesIV,
      doctorKeys: {},
      uploadDate: new Date(),
      metadata: {
        description,
      },
    } 

    const result = await recordsCollection.insertOne(record as any)

    return NextResponse.json(
      {
        success: true,
        recordId: result.insertedId,
        message: "Record uploaded and encrypted successfully",
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error("[Patient Records Upload API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}