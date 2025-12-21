// import { type NextRequest, NextResponse } from "next/server"
// import { getDatabase } from "@/lib/db/mongo"
// import { requireVerified } from "@/lib/auth/middleware"
// import type { MedicalRecord, AccessPermission, AuditLog } from "@/lib/db/models"

// export async function POST(req: NextRequest) {
//   try {
//     const user = requireVerified(req)

//     if (user.role !== "lab") {
//       return NextResponse.json({ error: "Access denied" }, { status: 403 })
//     }

//     const body = await req.json()
//     const { patientId, fileName, fileType, recordType, description, labName, testType, fileData } = body

//     if (!patientId || !fileName || !fileType || !recordType) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
//     }

//     const db = await getDatabase()
//     const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
//     const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
//     const auditLogsCollection = db.collection<AuditLog>("auditLogs")

//     const permission = await permissionsCollection.findOne({
//       patientId,
//       grantedTo: user.userId,
//       isActive: true,
//       accessLevel: { $regex: "upload" },
//     })

//     if (!permission) {
//       return NextResponse.json({ error: "No upload permission for this patient" }, { status: 403 })
//     }

//     const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`
//     const fileUrl = fileData || `/uploads/${patientId}/${Date.now()}_${fileName}`

//     // Create medical record
//     const newRecord: Omit<MedicalRecord, "_id"> = {
//       patientId,
//       uploadedBy: user.userId,
//       uploaderRole: "lab",
//       fileName,
//       fileType,
//       fileUrl,
//       fileHash,
//       recordType,
//       uploadDate: new Date(),
//       metadata: {
//         description,
//         labName,
//         testType,
//       },
//     }

//     const recordResult = await recordsCollection.insertOne(newRecord as any)

//     // Create audit log
//     const auditLog: Omit<AuditLog, "_id"> = {
//       action: "upload_record",
//       performedBy: user.userId,
//       performedByRole: "lab",
//       recordId: recordResult.insertedId.toString(),
//       patientId,
//       timestamp: new Date(),
//       metadata: {
//         fileName,
//         recordType,
//         labName,
//         testType,
//       },
//     }

//     await auditLogsCollection.insertOne(auditLog as any)

//     return NextResponse.json(
//       {
//         message: "Lab report uploaded successfully",
//         record: { _id: recordResult.insertedId, ...newRecord },
//       },
//       { status: 201 },
//     )
//   } catch (error: any) {
//     console.error("[Lab Upload API] Error:", error)
//     if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("verified")) {
//       return NextResponse.json({ error: error.message }, { status: 401 })
//     }
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 })
//   }
// }


import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireVerified } from "@/lib/auth/middleware"
import type { MedicalRecord, AccessPermission, AuditLog } from "@/lib/db/models"

export const config = {
  api: {
    bodyParser: false,
  },
}

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

    const db = await getDatabase()
    const permissionsCollection = db.collection<AccessPermission>("accessPermissions")
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const permission = await permissionsCollection.findOne({
      patientId,
      grantedTo: user.userId,
      isActive: true,
      accessLevel: { $regex: "upload" },
    })

    if (!permission) {
      return NextResponse.json({ error: "No upload permission for this patient" }, { status: 403 })
    }

    // Mock IPFS for now
    const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`
    const fileCID = `lab_cid_${Date.now()}`
    const fileUrl = `/uploads/${patientId}/${Date.now()}_${fileName}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    const newRecord: Omit<MedicalRecord, "_id"> = {
      patientId,
      uploadedBy: user.userId,
      uploaderRole: "lab",
      fileName,
      fileType: file.type || fileType || "application/octet-stream",
      fileUrl,
      fileCID,
      fileHash,
      recordType,
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