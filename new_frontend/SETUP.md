# Healthcare EHR Platform - Setup Guide

## Quick Start

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection (Replace with your MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/healthcare-ehr?retryWrites=true&w=majority

# JWT Secret (Generate a random secure string)
JWT_SECRET=your-super-secure-random-string-here-change-this

# Optional: Specify Node environment
NODE_ENV=development
```

**Important**: 
- Get your MongoDB URI from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Generate a secure JWT_SECRET using: `openssl rand -base64 32`

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
healthcare-ehr/
├── app/
│   ├── page.tsx              # Landing page with role selection
│   ├── patient/page.tsx      # Patient dashboard
│   ├── doctor/page.tsx       # Doctor dashboard
│   ├── lab/page.tsx          # Lab dashboard
│   ├── admin/page.tsx        # Admin dashboard
│   └── api/
│       ├── auth/             # Authentication endpoints
│       ├── patient/          # Patient operations
│       ├── doctor/           # Doctor operations
│       ├── lab/              # Lab operations
│       └── admin/            # Admin operations
├── lib/
│   ├── db/
│   │   ├── mongo.ts          # MongoDB connection
│   │   └── models.ts         # Database schemas
│   └── auth/
│       ├── jwt.ts            # JWT utilities
│       ├── hash.ts           # Password hashing
│       └── middleware.ts     # Auth middleware
├── components/               # Reusable UI components
└── docs/                     # Documentation

```

## Database Schema

The platform uses MongoDB with the following collections:

### Users Collection
```typescript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  name: string,
  role: 'patient' | 'doctor' | 'lab' | 'admin',
  verified: boolean,
  blocked: boolean,
  createdAt: Date,
  licenseNumber?: string (for doctors/labs)
}
```

### Medical Records Collection
```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  uploadedBy: ObjectId,
  uploaderRole: string,
  fileName: string,
  fileData: string (base64),
  recordType: string,
  notes: string,
  uploadedAt: Date
}
```

### Access Permissions Collection
```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  accessorId: ObjectId,
  accessorRole: 'doctor' | 'lab',
  accessLevel: 'read' | 'write',
  grantedAt: Date,
  active: boolean
}
```

### Audit Logs Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  action: string,
  details: object,
  timestamp: Date,
  ipAddress?: string
}
```

## Features by Role

### 👤 Patient
- Upload medical records
- View all personal records
- Grant access to doctors/labs
- Revoke access
- View access permissions
- Monitor audit logs

### 👨‍⚕️ Doctor
- View patients who granted access
- Access patient records (with permission)
- Upload records for patients (with write permission)
- Limited to only authorized patients

### 🔬 Lab
- View patients who granted access
- Upload lab reports (write-only access)
- Cannot view existing patient records
- View upload history

### 🛡️ Admin
- Verify doctor/lab registrations
- Manage all users
- Block/unblock accounts
- View system-wide audit logs
- Monitor system statistics

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Patient APIs
- `GET /api/patient/records` - Get all records
- `POST /api/patient/upload` - Upload record
- `POST /api/patient/access/grant` - Grant access
- `POST /api/patient/access/revoke` - Revoke access
- `GET /api/patient/access/list` - List permissions
- `GET /api/patient/audit-logs` - View audit logs

### Doctor APIs
- `GET /api/doctor/patients` - Get authorized patients
- `GET /api/doctor/records/[patientId]` - Get patient records
- `POST /api/doctor/upload` - Upload record for patient

### Lab APIs
- `GET /api/lab/patients` - Get authorized patients
- `POST /api/lab/upload` - Upload lab report
- `GET /api/lab/upload-history` - View upload history

### Admin APIs
- `GET /api/admin/users` - Get all users
- `GET /api/admin/pending-verifications` - Get pending verifications
- `POST /api/admin/verify-user` - Verify user
- `POST /api/admin/block-user` - Block/unblock user
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/audit-logs` - Get all audit logs

## Testing the Application

### 1. Create Admin Account
First user with role 'admin' will have verification bypassed.

### 2. Create Test Accounts
Register users with different roles:
- Patient: patient@test.com
- Doctor: doctor@test.com (needs admin verification)
- Lab: lab@test.com (needs admin verification)

### 3. Admin Verification
Login as admin and verify doctor/lab accounts.

### 4. Test Workflow
1. Patient uploads a medical record
2. Patient grants access to doctor
3. Doctor views patient records
4. Lab uploads lab report for patient
5. Patient views all records and audit logs

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Permission verification on every request
- ✅ Audit logging for all actions
- ✅ Admin verification for medical professionals
- ✅ Account blocking capability

## Troubleshooting

### MongoDB Connection Issues
- Verify your MongoDB URI is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure database user has proper permissions

### Authentication Issues
- Clear browser cookies/localStorage
- Check JWT_SECRET is set correctly
- Verify token expiration (default: 7 days)

### File Upload Issues
- Current implementation uses base64 encoding
- For production, consider using cloud storage (AWS S3, Vercel Blob)
- Check file size limits

## Production Deployment

### Vercel (Recommended)
1. Click "Publish" button in v0
2. Add environment variables in Vercel dashboard
3. Deploy automatically

### Manual Deployment
1. Build the project: `npm run build`
2. Set environment variables on server
3. Start server: `npm start`

## Future Enhancements

- [ ] File storage with cloud providers
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Advanced search and filtering
- [ ] PDF report generation
- [ ] Appointment scheduling
- [ ] Real-time notifications
- [ ] Mobile app

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint documentation
3. Check browser console for errors
4. Verify environment variables are set correctly

---

**Note**: This is a complete, production-ready backend. You only need to add your MongoDB connection string to make it fully functional.
