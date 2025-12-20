// import { type NextRequest, NextResponse } from "next/server"
// import { getDatabase } from "@/lib/db/mongo"
// import { requireRole } from "@/lib/auth/middleware"
// import type { MedicalRecord, AuditLog } from "@/lib/db/models"
// // Add this import at the top
// import { generateMedicalSummary } from "@/lib/ai/llm-service";

// export async function POST(req: NextRequest) {
//   try {
//     const user = requireRole(req, ["patient"])
//     const body = await req.json()
//     const { fileName, fileType, recordType, description, fileData } = body

//     if (!fileName || !fileType || !recordType) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
//     }

//     const db = await getDatabase()
//     const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
//     const auditLogsCollection = db.collection<AuditLog>("auditLogs")

//     const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`

//     const fileUrl = fileData || `/uploads/${user.userId}/${Date.now()}_${fileName}`

//     // Inside the POST try block, after inserting recordResult:
// const summaryData = await generateMedicalSummary(fileData, fileType, recordType);

// const newSummary: Omit<AISummary, "_id"> = {
//   recordId: recordResult.insertedId.toString(),
//   patientId: user.userId,
//   summary: summaryData,
//   generatedAt: new Date(),
//   modelUsed: "gemini-1.5-flash",
// };

// await db.collection("aiSummaries").insertOne(newSummary);

//     // Create medical record
//     const newRecord: Omit<MedicalRecord, "_id"> = {
//       patientId: user.userId,
//       uploadedBy: user.userId,
//       uploaderRole: "patient",
//       fileName,
//       fileType,
//       fileUrl,
//       fileHash,
//       recordType,
//       uploadDate: new Date(),
//       metadata: {
//         description,
//       },
//     }

//     const recordResult = await recordsCollection.insertOne(newRecord as any)

//     // Create audit log
//     const auditLog: Omit<AuditLog, "_id"> = {
//       action: "upload_record",
//       performedBy: user.userId,
//       performedByRole: "patient",
//       recordId: recordResult.insertedId.toString(),
//       patientId: user.userId,
//       timestamp: new Date(),
//       metadata: {
//         fileName,
//         recordType,
//       },
//     }

//     await auditLogsCollection.insertOne(auditLog as any)

//     return NextResponse.json(
//       {
//         message: "File uploaded successfully",
//         record: { _id: recordResult.insertedId, ...newRecord },
//       },
//       { status: 201 },
//     )
//   } catch (error: any) {
//     console.error("[Patient Upload API] Error:", error)
//     if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
//       return NextResponse.json({ error: error.message }, { status: 401 })
//     }
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 })
//   }
// }
import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/mongo";
import { requireRole } from "@/lib/auth/middleware";
import { MedicalRecord, AISummary, AuditLog } from "@/lib/db/models"; // Ensure AISummary is imported
import { generateMedicalSummary } from "@/lib/ai/llm-service"; // Correctly import the function

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"]);
    const body = await req.json();
    const { fileName, fileType, recordType, description, fileData } = body;

    const db = await getDatabase();
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords");
    
    // 1. Create the File Hash and URL
    const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`;
    const fileUrl = fileData || `/uploads/${user.userId}/${Date.now()}_${fileName}`;

<<<<<<< HEAD
    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")
    const auditLogsCollection = db.collection<AuditLog>("auditLogs")

    const fileHash = `sha256_${Buffer.from(fileName + Date.now()).toString("base64")}`
    const fileCID="";
    const fileUrl = fileData || `/uploads/${user.userId}/${Date.now()}_${fileName}`

    // Create medical record
=======
    // 2. Prepare the Record
>>>>>>> 04e6eaeb6b23c8f79ac231ded261d3198163f28b
    const newRecord: Omit<MedicalRecord, "_id"> = {
      patientId: user.userId,
      uploadedBy: user.userId,
      uploaderRole: "patient",
      fileName,
      fileType,
      fileUrl,
      fileCID,
      fileHash,
      recordType,
      uploadDate: new Date(),
      metadata: { description },
    };

    // 3. INSERT RECORD FIRST (Fixes "used before declaration")
    const recordResult = await recordsCollection.insertOne(newRecord as any);
    const insertedId = recordResult.insertedId.toString();

    // 4. GENERATE AI SUMMARY AUTOMATICALLY
    // We pass the fileData (base64) directly to Gemini
    try {
        const aiResult = await generateMedicalSummary(fileData, fileType, recordType);
        
        const summaryEntry: Omit<AISummary, "_id"> = {
          recordId: insertedId,
          patientId: user.userId,
          summary: aiResult,
          generatedAt: new Date(),
          modelUsed: "gemini-1.5-flash",
        };

        await db.collection("aiSummaries").insertOne(summaryEntry);
    } catch (aiError) {
        console.error("AI Generation failed but record was saved:", aiError);
        // We don't want to crash the whole upload if just the AI fails
    }

    // 5. Create Audit Log (using the now-defined insertedId)
    const auditLog: Omit<AuditLog, "_id"> = {
      action: "upload_record",
      performedBy: user.userId,
      performedByRole: "patient",
      recordId: insertedId,
      patientId: user.userId,
      timestamp: new Date(),
    };
    await db.collection("auditLogs").insertOne(auditLog as any);

    return NextResponse.json({ message: "Success", recordId: insertedId }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}