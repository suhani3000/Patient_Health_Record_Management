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
