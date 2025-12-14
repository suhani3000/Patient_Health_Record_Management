# Database Schema Documentation

## Collections Overview

### 1. Users Collection
Stores all user accounts with role-based information.

**Fields:**
- `_id`: Unique user identifier
- `email`: User email (unique)
- `password`: Hashed password
- `name`: Full name
- `role`: One of: 'patient', 'doctor', 'lab', 'admin'
- `isVerified`: Boolean (doctors/labs need admin approval)
- `isBlocked`: Boolean (admin can block malicious users)
- `specialization`: String (for doctors only)
- `licenseNumber`: String (for doctors and labs)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Indexes:**
- email (unique)
- role
- isVerified

---

### 2. Medical Records Collection
Stores metadata about medical files (actual files in cloud storage).

**Fields:**
- `_id`: Unique record identifier
- `patientId`: Reference to patient user
- `uploadedBy`: User ID of uploader
- `uploaderRole`: Role of uploader
- `fileName`: Original file name
- `fileType`: File extension (pdf, jpg, png)
- `fileUrl`: Cloud storage URL
- `fileHash`: SHA-256 hash for blockchain verification
- `recordType`: Type of medical record
- `uploadDate`: Timestamp
- `metadata`: Additional information object

**Indexes:**
- patientId
- uploadedBy
- uploadDate

---

### 3. Access Permissions Collection
Manages who can access patient records.

**Fields:**
- `_id`: Unique permission identifier
- `patientId`: Patient granting access
- `grantedTo`: User receiving access
- `grantedToRole`: Role of recipient
- `accessLevel`: 'view', 'upload', or 'view-upload'
- `grantedAt`: Timestamp
- `revokedAt`: Timestamp (if revoked)
- `isActive`: Boolean
- `blockchainTxHash`: Blockchain transaction reference

**Indexes:**
- patientId + grantedTo (composite)
- isActive

**Business Rules:**
- Labs typically only have 'upload' access
- Doctors can have 'view-upload' access
- Patients control all permissions

---

### 4. AI Summaries Collection
Stores LLM-generated summaries of medical records.

**Fields:**
- `_id`: Unique summary identifier
- `recordId`: Reference to medical record
- `patientId`: Reference to patient
- `summary`: Structured summary object
  - `diagnosis`: String
  - `medications`: Array of strings
  - `testResults`: Array of test result objects
  - `recommendations`: Array of strings
  - `keyFindings`: Array of strings
- `generatedAt`: Timestamp
- `modelUsed`: LLM model identifier

**Indexes:**
- recordId (unique)
- patientId

---

### 5. Audit Logs Collection
Immutable log of all system actions.

**Fields:**
- `_id`: Unique log identifier
- `action`: Type of action performed
- `performedBy`: User ID
- `performedByRole`: User role
- `targetUserId`: Target of action (optional)
- `recordId`: Related record (optional)
- `patientId`: Related patient
- `timestamp`: Action timestamp
- `ipAddress`: User IP address
- `blockchainTxHash`: Blockchain reference
- `metadata`: Additional context

**Indexes:**
- patientId
- performedBy
- timestamp
- action

**Actions:**
- grant_access
- revoke_access
- view_record
- upload_record
- download_record

---

## Data Flow

### Registration Flow
1. User submits registration
2. Password is hashed
3. User created with appropriate verification status
4. Doctors/Labs await admin approval

### Access Control Flow
1. Patient grants access to doctor/lab
2. Permission record created in database
3. Transaction logged to blockchain (hash + timestamp)
4. Audit log entry created

### File Upload Flow
1. File uploaded to cloud storage (encrypted)
2. File hash generated (SHA-256)
3. Record metadata stored in database
4. File hash stored on blockchain
5. AI summary generation triggered
6. Audit log entry created

### Access Verification Flow
1. Doctor/Lab requests patient record
2. System checks access_permissions table
3. Verifies user is not blocked
4. Verifies doctor/lab is verified by admin
5. Logs access in audit_logs
6. Returns record if authorized
