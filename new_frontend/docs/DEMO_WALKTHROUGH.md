# Healthcare EHR Platform - Demo Walkthrough

Complete demonstration guide for showcasing the platform's features.

## Demo Scenario

This walkthrough demonstrates a complete healthcare workflow with all user roles.

---

## Prerequisites

1. Application running on `http://localhost:3000`
2. MongoDB connected
3. Clean database (or use test accounts)

---

## Part 1: Admin Setup (2 minutes)

### Create Admin Account

1. Navigate to `http://localhost:3000`
2. Click "Sign Up"
3. Fill in admin details:
   - Name: `Admin User`
   - Email: `admin@healthehr.com`
   - Password: `admin123456`
   - Wallet Address: `0x1234567890123456789012345678901234567890`
   - Role: `admin`
4. Click "Sign Up"
5. Login with admin credentials

### Verify the Admin Dashboard

1. Navigate to `/admin`
2. Show the admin dashboard features:
   - System statistics (0 users initially)
   - Pending verifications tab (empty)
   - User management tab
   - Audit logs tab

---

## Part 2: Create Doctor and Lab (3 minutes)

### Register Doctor

1. Logout (top right)
2. Click "Sign Up"
3. Fill in doctor details:
   - Name: `Dr. Sarah Johnson`
   - Email: `doctor@healthehr.com`
   - Password: `doctor123456`
   - Wallet Address: `0xabcdef1234567890abcdef1234567890abcdef12`
   - Role: `doctor`
   - License Number: `MD-2024-12345`
4. Click "Sign Up"
5. Note: "Pending verification" message appears
6. Logout

### Register Lab

1. Click "Sign Up"
2. Fill in lab details:
   - Name: `City Lab Services`
   - Email: `lab@healthehr.com`
   - Password: `lab123456`
   - Wallet Address: `0x9876543210987654321098765432109876543210`
   - Role: `lab`
   - License Number: `LAB-2024-67890`
3. Click "Sign Up"
4. Note: "Pending verification" message appears
5. Logout

### Admin Verifies Users

1. Login as admin
2. Navigate to `/admin`
3. Click "Pending Verifications" tab
4. Show 2 pending verifications (doctor and lab)
5. Click "Approve" on Dr. Sarah Johnson
   - Note the success message
   - User disappears from pending list
6. Click "Approve" on City Lab Services
7. Show "Verified Users" tab
   - Now shows 2 verified users
8. Logout

---

## Part 3: Patient Workflow (5 minutes)

### Register Patient

1. Click "Sign Up"
2. Fill in patient details:
   - Name: `John Doe`
   - Email: `patient@healthehr.com`
   - Password: `patient123456`
   - Wallet Address: `0x1111222233334444555566667777888899990000`
   - Role: `patient`
3. Click "Sign Up"
4. Login with patient credentials

### Upload Medical Records

1. Navigate to `/patient`
2. Show the patient dashboard:
   - "My Records" tab (empty)
   - "Access Control" tab
   - "Audit Log" tab
3. Click "Upload New Record"
4. Upload first record:
   - Title: `Annual Physical Exam 2024`
   - Description: `Complete physical examination with blood work`
   - Category: `Medical Report`
   - Select a PDF file (or any file)
   - Click "Upload"
5. Wait for success message
6. Upload second record:
   - Title: `X-Ray Results - Chest`
   - Description: `Chest X-ray showing clear lungs`
   - Category: `Lab Result`
   - Select another file
   - Click "Upload"
7. Show the records list with 2 items

### Grant Access to Doctor

1. Click "Access Control" tab
2. Click "Grant Access"
3. Fill in access form:
   - Search user: Type `doctor` (should show Dr. Sarah Johnson)
   - Select `Dr. Sarah Johnson`
   - Access Level: `read-write`
   - Reason: `Annual checkup and consultation`
   - Duration: `7` days
4. Click "Grant Access"
5. Show the access permissions list:
   - Dr. Sarah Johnson with read-write access
   - Status: Active
   - Expires in 7 days

### Grant Upload Access to Lab

1. Click "Grant Access" again
2. Fill in form:
   - Search user: Type `lab` (should show City Lab Services)
   - Select `City Lab Services`
   - Access Level: `upload-only`
   - Reason: `Blood test and lab work`
   - Duration: `3` days
3. Click "Grant Access"
4. Show both access permissions

### Generate AI Summary

1. Go back to "My Records" tab
2. Click "Generate AI Summary" on first record
3. Wait for generation (simulated delay)
4. Show the AI summary modal:
   - Diagnoses section
   - Test results with values
   - Current medications
   - Recommendations
5. Close modal

### View Audit Log

1. Click "Audit Log" tab
2. Show all activities:
   - Record uploads
   - Access grants
   - AI summary generation
3. Note timestamps and actions

---

## Part 4: Doctor Workflow (3 minutes)

### Doctor Views Patient Records

1. Logout patient
2. Login as doctor (`doctor@healthehr.com` / `doctor123456`)
3. Navigate to `/doctor`
4. Show doctor dashboard:
   - Left sidebar with "My Patients"
   - Shows 1 patient (John Doe)
   - Access level: Read-Write
5. Click on "John Doe"
6. Show patient's records in main area:
   - 2 medical records visible
   - Can view all details
7. Click "Generate AI Summary" on a record
8. Show the summary modal (doctor can also generate summaries)

### Doctor Uploads Document

1. Click "Upload for Patient" button
2. Fill in form:
   - Title: `Consultation Notes`
   - Description: `Follow-up consultation for annual exam`
   - Category: `Medical Report`
   - Select file
3. Click "Upload"
4. Show success message
5. Record now appears in patient's list (3 total)

---

## Part 5: Lab Workflow (2 minutes)

### Lab Uploads Results

1. Logout doctor
2. Login as lab (`lab@healthehr.com` / `lab123456`)
3. Navigate to `/lab`
4. Show lab dashboard:
   - "Authorized Patients" tab
   - Shows John Doe with upload-only access
   - Notice: Cannot see patient records
5. Click "Upload Lab Report"
6. Fill in form:
   - Patient: Select "John Doe"
   - Title: `Complete Blood Count (CBC)`
   - Description: `Routine blood work - all values normal`
   - Category: `Lab Result`
   - Select file
7. Click "Upload"
8. Show success message

### View Upload History

1. Click "Upload History" tab
2. Show the uploaded report in history
3. Note: Lab cannot view other records, only what they uploaded

---

## Part 6: Patient Reviews Updates (2 minutes)

### Check New Records

1. Logout lab
2. Login as patient again
3. Navigate to `/patient`
4. Show "My Records" tab
5. Now shows 4 records:
   - Original 2 uploaded by patient
   - 1 uploaded by doctor (Consultation Notes)
   - 1 uploaded by lab (CBC Results)

### Review Audit Log

1. Click "Audit Log" tab
2. Show complete activity history:
   - All uploads
   - Access grants
   - Record access by doctor
   - Lab uploads
3. Note different action types and actors

### Revoke Access

1. Click "Access Control" tab
2. Click "Revoke" on lab's access
3. Confirm revocation
4. Show updated permissions:
   - Lab access now shows "Revoked" status
   - Doctor access still active

---

## Part 7: Blockchain Verification (2 minutes)

### Verify File Integrity

1. On patient dashboard
2. Click "Verify Hash" on any record
3. Show the blockchain verification modal:
   - Transaction hash
   - File hash (SHA-256)
   - Upload timestamp
   - Uploader information
   - Verification status: "Valid"
4. Close modal

### View Blockchain Audit Trail

1. Click "View Blockchain Audit"
2. Show the blockchain audit trail modal:
   - All access grants
   - Access revocations
   - Record uploads
   - Each with transaction hash
   - Immutable timestamp
3. Demonstrate immutability concept

---

## Part 8: Admin Monitoring (2 minutes)

### System Overview

1. Logout patient
2. Login as admin
3. Navigate to `/admin`
4. Show updated statistics:
   - Total Users: 4 (1 admin, 1 patient, 1 doctor, 1 lab)
   - Total Records: 4
   - Pending Verifications: 0
   - Active Access Permissions: 1 (doctor still has access)

### User Management

1. Click "Verified Users" tab
2. Show all users with their roles
3. Click "Block" on lab user (demonstration only)
4. Show that user is now blocked
5. Click "Unblock" to restore access

### System-Wide Audit Log

1. Click "Audit Logs" tab
2. Show complete system activity:
   - All user actions
   - All uploads
   - All access changes
   - Filtered by user or action type
3. Search for specific patient: `John Doe`
4. Show filtered results

---

## Key Features Demonstrated

### Security Features
- Role-based access control
- Admin verification required for doctors/labs
- Conditional access (read-write vs upload-only)
- Access revocation
- Complete audit trail
- Blockchain-backed verification

### User Experience
- Clean, intuitive dashboards for each role
- Real-time updates
- Clear action feedback
- Comprehensive activity logging
- Easy access management

### Technical Capabilities
- File upload and storage
- AI-powered summarization
- Blockchain integration
- Multi-user workflows
- Permission management
- Data integrity verification

---

## Demo Tips

### Preparation
1. Have all test accounts ready
2. Prepare sample files (PDFs work best)
3. Test the flow once before demo
4. Clear browser cookies between tests

### Presentation
1. Explain each role before demo
2. Highlight security features
3. Show both successful and restricted actions
4. Emphasize blockchain immutability
5. Point out audit trail completeness

### Common Questions

**Q: How is data stored?**
A: Files stored locally (or S3/Azure in production), metadata in MongoDB, access logs on blockchain

**Q: Is this HIPAA compliant?**
A: Demo shows compliance features (audit logs, access control, encryption ready), full HIPAA requires additional security measures

**Q: Can access be granted permanently?**
A: Yes, set duration to 0 or very high value (365+ days)

**Q: What happens to files when access is revoked?**
A: Files remain, but user can no longer view/access them. Blockchain maintains permanent revocation record.

**Q: Can patients hide specific records from doctors?**
A: Current implementation grants access to all records. Could be enhanced for granular record-level permissions.

---

## Time Breakdown

Total Demo Time: ~20 minutes

- Admin Setup: 2 min
- User Registration & Verification: 3 min
- Patient Workflow: 5 min
- Doctor Workflow: 3 min
- Lab Workflow: 2 min
- Patient Review: 2 min
- Blockchain Features: 2 min
- Admin Monitoring: 2 min

---

## Cleanup After Demo

```bash
# Reset database
mongosh healthcare_ehr
db.dropDatabase()

# Or keep test data for multiple demos
```

---

## Next Steps After Demo

1. Discuss production requirements
2. Explain scalability considerations
3. Review security enhancements
4. Discuss integration possibilities
5. Address specific use cases
