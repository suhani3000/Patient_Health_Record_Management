import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog, User } from "@/lib/db/models"
import { ObjectId } from "mongodb"
import { pinFileToIPFS } from "@/lib/ipfs"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = requireVerified(req)

    if (user.role !== "lab") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Parse FormData
    const formData = await req.formData()
    const patientId = formData.get("patientId") as string
    const fileName = formData.get("fileName") as string
    const recordType = formData.get("recordType") as string
    const labName = formData.get("labName") as string
    const testType = formData.get("testType") as string
    const description = formData.get("description") as string
    const fileType = formData.get("fileType") as string
    const file = formData.get("file") as File

    if (!patientId || !fileName || !recordType || !testType || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!ObjectId.isValid(patientId)) {
       return NextResponse.json({ error: "Invalid patientId" }, { status: 400 })
    }

    // Encryption fields
    const encryptedAESKey = formData.get("encryptedAESKey")?.toString() ?? null
    const aesIV = formData.get("aesIV")?.toString() ?? null
    const labEncryptedAESKey = formData.get("labEncryptedAESKey")?.toString() ?? null
    // Encryption is now optional

    const db = await getDatabase()
    const usersCollection = db.collection<User>("users")
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    // Check upload permission
    const permission = await permissionsCollection.findOne({
      patientId,
      grantedTo: user.userId,
      isActive: true,
      accessLevel: { $regex: "upload" },
    })

    if (!permission) {
      return NextResponse.json({ error: "No upload permission for this patient" }, { status: 403 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const cid = await pinFileToIPFS(buffer, fileName)
    if (!cid) {
      throw new Error("IPFS upload did not return a CID")
    }

    const fileCID = cid
    const fileUrl = `ipfs://${cid}`
    const patientOid = new ObjectId(patientId)
    const labOid = new ObjectId(user.userId)

    // Store lab's own key for self-decryption
    const labUserDoc = await usersCollection.findOne({ _id: labOid })
    const labChain = labUserDoc?.blockchainAddress?.toLowerCase() ?? ""
    const doctorKeys: Record<string, string> = {} // Keeping name 'doctorKeys' for model compatibility
    if (labEncryptedAESKey && labChain) {
      doctorKeys[labChain] = labEncryptedAESKey
    }

    const newRecord: Omit<MedicalRecord, "_id"> = {
      patientId: patientOid,
      uploadedBy: labOid,
      uploaderRole: "lab",
      fileName,
      fileType: file.type || fileType || "application/octet-stream",
      fileUrl,
      fileCID,
      cid,
      fileHash: `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`,
      recordType,
      encryptedAESKey,
      aesIV,
      doctorKeys,
      fileId: Number(0),
      transactionHash: String(""),
      uploadDate: new Date(),
      metadata: {
        description,
        labName: labName || user.name,
        testType,
      },
    }

    const recordResult = await recordsCollection.insertOne(newRecord as any)

    // Create audit log
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "upload_record",
      performedBy: user.userId,
      performedByRole: "lab",
      recordId: recordResult.insertedId.toString(),
      patientId,
      timestamp: new Date(),
      metadata: {
        fileName,
        recordType,
        labName: labName || user.name,
        testType,
      },
    }

    await auditLogsCollection.insertOne(auditLog as any)

    return NextResponse.json(
      {
        message: "Lab report uploaded successfully",
        recordId: recordResult.insertedId,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[Lab Upload API] Error:", error)
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}