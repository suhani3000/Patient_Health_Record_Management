export const runtime = "nodejs";
import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo";
import { uploadFileToIPFS } from "@/lib/ipfs";
import { requireRole } from "@/lib/auth/middleware";
import { leanMedicalRecordForClient } from "@/lib/serializeMedicalRecord";

export async function POST(req: NextRequest) {
  try {
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

    const fileName = formData.get("fileName")?.toString() || file.name
    const recordType = formData.get("recordType")?.toString()
    const description = formData.get("description")?.toString()
    const encryptedAESKey = formData.get("encryptedAESKey")?.toString() ?? null
    const aesIV = formData.get("aesIV")?.toString() ?? null

    const record = {
      patientId: new ObjectId(user.userId),
      uploadedBy: new ObjectId(user.userId),
      uploaderRole: "patient" as const,
      fileName: fileName,
      fileType: file.type,
      cid: ipfsResult.cid,
      fileSize: ipfsResult.size,
      recordType: recordType,
      description: description,
      encryptedAESKey: encryptedAESKey,
      aesIV: aesIV,
      doctorKeys: {},
      createdAt: new Date(),
    }

    const result = await recordsCollection.insertOne(record);

    // 5️⃣ Success response
    return NextResponse.json(
      { success: true, record },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("[Patient Records API] Upload Error:", error);

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

    const lean = records.map((r) => leanMedicalRecordForClient(r as Record<string, unknown>))

    return NextResponse.json(
      { records: lean },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Patient Records API] Fetch Error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to fetch records" },
      { status: 500 }
    );
  }
}
