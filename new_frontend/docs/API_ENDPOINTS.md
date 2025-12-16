# API Endpoints Documentation

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "role": "patient|doctor|lab|admin",
  "specialization": "string (optional, for doctors)",
  "licenseNumber": "string (optional, for doctors/labs)"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "isVerified": boolean
  },
  "needsVerification": boolean
}
```

---

### POST /api/auth/login
Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "string (JWT)",
  "user": {
    "_id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "isVerified": boolean
  }
}
```

---

## Patient Endpoints (Upcoming)

### GET /api/patient/records
Get all medical records for logged-in patient.

### POST /api/patient/upload
Upload a new medical record.

### POST /api/patient/access/grant
Grant access to a doctor or lab.

### POST /api/patient/access/revoke
Revoke access from a doctor or lab.

### GET /api/patient/access/list
List all current access permissions.

### GET /api/patient/audit-logs
View access history and audit logs.

---

## Doctor Endpoints (Upcoming)

### GET /api/doctor/patients
Get list of patients who granted access.

### GET /api/doctor/records/:patientId
View records for a specific patient (if access granted).

### POST /api/doctor/upload
Upload medical record for a patient.

---

## Lab Endpoints (Upcoming)

### POST /api/lab/upload
Upload lab report for a patient.

---

## Admin Endpoints (Upcoming)

### GET /api/admin/pending-verifications
Get doctors and labs pending verification.

### POST /api/admin/verify-user
Approve or reject doctor/lab.

### POST /api/admin/block-user
Block a malicious user.

### GET /api/admin/audit-logs
View all system audit logs.

---

## AI Endpoints (Upcoming)

### POST /api/ai/generate-summary
Generate AI summary for a medical record.

### GET /api/ai/summary/:recordId
Get AI summary for a specific record.

---

## Blockchain Endpoints (Upcoming)

### POST /api/blockchain/log-access
Log access permission to blockchain.

### GET /api/blockchain/verify/:hash
Verify a file hash on blockchain.

---

## Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Error Responses

**400 Bad Request:**
```json
{
  "error": "Missing required fields"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid credentials"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
