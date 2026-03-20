
// import { getDatabase } from "@/lib/db/mongo"
// import { requireRole } from "@/lib/auth/middleware"
// import { uploadFileToIPFS } from "@/lib/ipfs"

// import type { MedicalRecord } from "@/lib/db/models"
// // import { connectDB } from "@/lib/db";
// // import MedicalRecord from "@/lib/models/MedicalRecord";

// export async function GET(req: NextRequest) {
//   try {
//     const user = requireRole(req, ["patient"])
//     const db = await getDatabase()
//     const recordsCollection = db.collection<MedicalRecord>("medicalRecords")

//     // Get all records for this patient
//     const records = await recordsCollection.find({ patientId: user.userId }).sort({ uploadDate: -1 }).toArray()

//     return NextResponse.json({ records }, { status: 200 })
//   } catch (error: any) {
//   console.error("🔥 IPFS ERROR FULL:", error?.response?.data || error);

//   return NextResponse.json(
//     { error: "IPFS upload failed" },
//     { status: 500 }
//   );
// }
// }

export const runtime = "nodejs";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo";
import { uploadFileToIPFS } from "@/lib/ipfs";
import { requireRole } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 UPLOAD ROUTE HIT");
    // 🔐 TEMP: auth bypass (restore requireRole later)
    // const user = { userId: "test_patient_123" };
    const user = await requireRole(req, ["patient"]);

    // 1️⃣ Read multipart form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    console.log("📁 File received:", file.name, file.size);

    // 2️⃣ Convert File → Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3️⃣ Upload to IPFS via Pinata
    const ipfsResult = await uploadFileToIPFS(buffer, file.name);

    if (!ipfsResult?.cid) {
      throw new Error("IPFS upload succeeded but CID missing");
    }

    // 4️⃣ Insert metadata into MongoDB
    const db = await getDatabase();
    const recordsCollection = db.collection("medicalRecords");

    // const record = {
    //   patientId: new mongoose.Types.ObjectId(user.userId),
    //   uploadedBy: new mongoose.Types.ObjectId(user.userId),
    //   fileName: file.name,
    //   cid: ipfsResult.cid,
    //   fileSize: ipfsResult.size,
    //   uploadDate: new Date(),
    // };
    const fileName = formData.get("fileName")?.toString() || file.name;
    const recordType = formData.get("recordType")?.toString();
    const description = formData.get("description")?.toString();

    const record = {
      patientId: new ObjectId(user.userId),
      uploadedBy: new ObjectId(user.userId),
      fileName: fileName,
      fileType: file.type,
      cid: ipfsResult.cid,
      fileSize: ipfsResult.size,
      recordType: recordType,
      description:description,
      createdAt: new Date(),
    };

    const result = await recordsCollection.insertOne(record);
    console.log("✅ MongoDB insert ID:", result.insertedId);

    // 5️⃣ Success response
    return NextResponse.json(
      { success: true, record },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ Upload API Error:", error);

    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ["patient"]);

    const db = await getDatabase();
    const recordsCollection = db.collection("medicalRecords");

    const records = await recordsCollection
      .find({ patientId: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      { records },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Fetch Records Error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to fetch records" },
      { status: 500 }
    );
  }
}
