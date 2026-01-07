import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/db/mongo"
import { requireRole } from "@/lib/auth/middleware"
import { uploadFileToIPFS } from "@/lib/ipfs"

import type { MedicalRecord } from "@/lib/db/models"
// import { connectDB } from "@/lib/db";
// import MedicalRecord from "@/lib/models/MedicalRecord";

export async function GET(req: NextRequest) {
  try {
    const user = requireRole(req, ["patient"])
    const db = await getDatabase()
    const recordsCollection = db.collection<MedicalRecord>("medicalRecords")

    // Get all records for this patient
    const records = await recordsCollection.find({ patientId: user.userId }).sort({ uploadDate: -1 }).toArray()

    return NextResponse.json({ records }, { status: 200 })
  } catch (error: any) {
  console.error("🔥 IPFS ERROR FULL:", error?.response?.data || error);

  return NextResponse.json(
    { error: "IPFS upload failed" },
    { status: 500 }
  );
}
}
