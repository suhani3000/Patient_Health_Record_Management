// MongoDB Schema Definitions for Healthcare EHR Platform

export interface User {
  _id: string
  email: string
  password: string // hashed
  name: string
  role: "patient" | "doctor" | "lab" | "admin"
  isVerified: boolean // For doctor/lab approval by admin
  isBlocked: boolean
  specialization?: string // For doctors
  licenseNumber?: string // For doctors and labs
  createdAt: Date
  updatedAt: Date
}

export interface MedicalRecord {
  _id: string
  patientId: string
  uploadedBy: string // userId of uploader (patient, doctor, or lab)
  uploaderRole: "patient" | "doctor" | "lab"
  fileName: string
  fileType: string // pdf, jpg, png
  fileUrl: string // Cloud storage URL
  fileHash: string // SHA-256 hash for blockchain verification
  recordType: string // e.g., "Lab Report", "Prescription", "X-Ray"
  uploadDate: Date
  metadata?: {
    description?: string
    labName?: string
    testType?: string
  }
}

export interface AccessPermission {
  _id: string
  patientId: string
  grantedTo: string // userId of doctor or lab
  grantedToRole: "doctor" | "lab"
  accessLevel: "view" | "upload" | "view-upload" // Labs typically only have upload
  grantedAt: Date
  revokedAt?: Date
  isActive: boolean
  blockchainTxHash?: string // Reference to blockchain transaction
}

export interface AISummary {
  _id: string
  recordId: string
  patientId: string
  summary: {
    diagnosis?: string
    medications?: string[]
    testResults?: Array<{
      test: string
      value: string
      unit?: string
      normalRange?: string
    }>
    recommendations?: string[]
    keyFindings: string[]
  }
  generatedAt: Date
  modelUsed: string
}

export interface AuditLog {
  _id: string
  action: "grant_access" | "revoke_access" | "view_record" | "upload_record" | "download_record"
  performedBy: string // userId
  performedByRole: "patient" | "doctor" | "lab" | "admin"
  targetUserId?: string // For access grants/revokes
  recordId?: string // For record operations
  patientId: string
  timestamp: Date
  ipAddress?: string
  blockchainTxHash?: string
  metadata?: Record<string, any>
}
