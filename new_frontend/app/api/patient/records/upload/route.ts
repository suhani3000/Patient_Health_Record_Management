// export const runtime = "nodejs";
// import mongoose from "mongoose";

// import { NextResponse } from "next/server";
// import { getDatabase } from "@/lib/db/mongo";
// import { uploadFileToIPFS } from "@/lib/ipfs";
// import { requireRole } from "@/lib/auth/middleware";

// export async function POST(req: Request) {
//   try {
//     // 🔐 TEMP: auth bypass (restore requireRole later)
//     // const user = { userId: "test_patient_123" };
//     const user = await requireRole(req, ["patient"]);

//     // 1️⃣ Read multipart form data
//     const formData = await req.formData();
//     const file = formData.get("file");

//     if (!file || !(file instanceof File)) {
//       return NextResponse.json(
//         { error: "No file uploaded" },
//         { status: 400 }
//       );
//     }

//     console.log("📁 File received:", file.name, file.size);

//     // 2️⃣ Convert File → Buffer
//     const buffer = Buffer.from(await file.arrayBuffer());

//     // 3️⃣ Upload to IPFS via Pinata
//     const ipfsResult = await uploadFileToIPFS(buffer, file.name);

//     if (!ipfsResult?.cid) {
//       throw new Error("IPFS upload succeeded but CID missing");
//     }

//     // 4️⃣ Insert metadata into MongoDB
//     const db = await getDatabase();
//     const recordsCollection = db.collection("medicalRecords");

//     const record = {
//       patientId: new mongoose.Types.ObjectId(user.userId),
//       uploadedBy: new mongoose.Types.ObjectId(user.userId),
//       fileName: file.name,
//       cid: ipfsResult.cid,
//       fileSize: ipfsResult.size,
//       uploadDate: new Date(),
//     };

//     const result = await recordsCollection.insertOne(record);

//     console.log("✅ MongoDB insert ID:", result.insertedId);

//     // 5️⃣ Success response
//     return NextResponse.json(
//       { success: true, record },
//       { status: 201 }
//     );

//   } catch (error: any) {
//     console.error("❌ Upload API Error:", error);

//     return NextResponse.json(
//       { error: error.message || "Upload failed" },
//       { status: 500 }
//     );
//   }
// }

// import type { NextRequest } from "next/server"
// import { NextResponse } from "next/server"

// // Legacy route kept for compatibility; the working upload endpoint is `POST /api/patient/records`.
// export const runtime = "nodejs"

// export async function POST(_req: NextRequest) {
//   return NextResponse.json(
//     { error: "Not implemented. Use POST /api/patient/records instead." },
//     { status: 404 },
//   )
// }


// CREATE NEW FILE: new_frontend/app/api/patient/records/upload/route.ts
// Handles patient's encrypted file uploads

import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { pinFileToIPFS } from "@/lib/ipfs"
import { requireRole } from "@/lib/auth/middleware"
import { ObjectId } from "mongodb"
import type { MedicalRecord } from "@/lib/db/models"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    console.log("[Patient Records Upload] Starting upload handler...")
    
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

    console.log(`[Patient Records Upload] File: ${fileName}, Size: ${file.size}`)

    // Convert to buffer and upload to IPFS
    const buffer = Buffer.from(await file.arrayBuffer())
    const cid = await pinFileToIPFS(buffer, fileName)

    if (!cid) {
      throw new Error("IPFS upload failed: no CID returned")
    }

    console.log(`[Patient Records Upload] IPFS upload successful, CID: ${cid}`)

    // Save metadata to MongoDB
    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")

    const record: Omit<MedicalRecord, "_id"> = {
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
      encryptedAESKey,  // ← AES key wrapped with PATIENT's public key
      aesIV,           // ← AES-GCM IV (base64)
      doctorKeys: {},  // ← Will be populated when access is granted
      uploadDate: new Date(),
      metadata: {
        description,
      },
    } as any

    const result = await recordsCollection.insertOne(record)

    console.log(`[Patient Records Upload] MongoDB insert successful: ${result.insertedId}`)

    return NextResponse.json(
      {
        success: true,
        recordId: result.insertedId,
        message: "Record uploaded and encrypted successfully",
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error("[Patient Records Upload] Error:", error)
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}