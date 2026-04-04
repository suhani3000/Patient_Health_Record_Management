/**
 * Normalize Mongo documents for JSON responses so crypto fields are plain strings
 * (avoids client-side typeof checks failing after BSON/JSON round-trips).
 */
export function leanMedicalRecordForClient(doc: Record<string, unknown>): Record<string, unknown> {
  const enc = doc.encryptedAESKey
  const iv = doc.aesIV
  return {
    ...doc,
    _id: doc._id != null ? String(doc._id) : doc._id,
    patientId: doc.patientId != null ? String(doc.patientId) : doc.patientId,
    uploadedBy: doc.uploadedBy != null ? String(doc.uploadedBy) : doc.uploadedBy,
    encryptedAESKey: enc == null || enc === undefined ? enc : String(enc),
    aesIV: iv == null || iv === undefined ? iv : String(iv),
    doctorKeys: typeof doc.doctorKeys === "object" && doc.doctorKeys !== null ? doc.doctorKeys : {},
  }
}
