// Mock data for demonstration - no database required
import type { User } from "./mock-auth"

export interface MedicalRecord {
  id: string
  fileName: string
  recordType: string
  uploadDate: string
  uploaderRole: string
  uploaderId: string
  patientId: string
  description?: string
}

export interface AccessPermission {
  id: string
  patientId: string
  grantedToId: string
  grantedToRole: string
  accessLevel: string
  grantedAt: string
  isActive: boolean
}

export interface AuditLog {
  id: string
  action: string
  timestamp: string
  performedById: string
  performedByRole: string
  patientId?: string
  metadata?: any
}

// Mock storage
const mockRecords: MedicalRecord[] = []
const mockPermissions: AccessPermission[] = []
const mockAuditLogs: AuditLog[] = []

// Helper to get user data
function getUserById(userId: string, users: User[]): User | undefined {
  return users.find((u) => u.id === userId)
}

export function addMedicalRecord(record: Omit<MedicalRecord, "id">): MedicalRecord {
  const newRecord: MedicalRecord = {
    ...record,
    id: String(mockRecords.length + 1),
  }
  mockRecords.push(newRecord)
  return newRecord
}

export function getMedicalRecords(patientId: string): MedicalRecord[] {
  return mockRecords.filter((r) => r.patientId === patientId)
}

export function grantAccess(permission: Omit<AccessPermission, "id">): AccessPermission {
  // Revoke existing permission if any
  mockPermissions.forEach((p) => {
    if (p.patientId === permission.patientId && p.grantedToId === permission.grantedToId) {
      p.isActive = false
    }
  })

  const newPermission: AccessPermission = {
    ...permission,
    id: String(mockPermissions.length + 1),
  }
  mockPermissions.push(newPermission)
  return newPermission
}

export function revokeAccess(patientId: string, grantedToId: string): void {
  mockPermissions.forEach((p) => {
    if (p.patientId === patientId && p.grantedToId === grantedToId) {
      p.isActive = false
    }
  })
}

export function getAccessPermissions(patientId: string): AccessPermission[] {
  return mockPermissions.filter((p) => p.patientId === patientId)
}

export function hasAccess(patientId: string, userId: string): AccessPermission | undefined {
  return mockPermissions.find((p) => p.patientId === patientId && p.grantedToId === userId && p.isActive)
}

export function getPatientsForProvider(providerId: string, providerRole: string): AccessPermission[] {
  return mockPermissions.filter((p) => p.grantedToId === providerId && p.grantedToRole === providerRole && p.isActive)
}

export function addAuditLog(log: Omit<AuditLog, "id">): AuditLog {
  const newLog: AuditLog = {
    ...log,
    id: String(mockAuditLogs.length + 1),
  }
  mockAuditLogs.push(newLog)
  return newLog
}

export function getAuditLogs(patientId?: string): AuditLog[] {
  if (patientId) {
    return mockAuditLogs.filter((l) => l.patientId === patientId)
  }
  return mockAuditLogs
}

export function getUploadHistory(uploaderId: string): MedicalRecord[] {
  return mockRecords.filter((r) => r.uploaderId === uploaderId)
}
