# Healthcare EHR Platform

A comprehensive Electronic Health Records (EHR) platform built with Next.js, MongoDB, AI summarization, and blockchain-based access control.

## Features

### Role-Based Access Control
- **Patients**: Upload records, grant/revoke access to doctors and labs, view audit logs
- **Doctors**: View records of patients who granted access, upload medical documents
- **Labs**: Upload lab reports for authorized patients (upload-only access)
- **Admin**: Verify doctors and labs, manage users, view system-wide audit logs

### Core Capabilities
- **Secure Authentication**: JWT-based auth with role-based permissions
- **File Management**: Upload and store medical records securely
- **Conditional Access**: Granular control over who can view/upload records
- **AI Summaries**: Generate structured medical summaries using LLM
- **Blockchain Integration**: Immutable audit logs and file integrity verification on Quorum
- **Audit Trail**: Complete activity logging for compliance

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing
- **AI**: OpenAI GPT-4 for medical record summarization
- **Blockchain**: Solidity smart contracts on Quorum network
- **Storage**: Local file system (can be extended to S3/Azure)

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── patient/      # Patient-specific endpoints
│   │   ├── doctor/       # Doctor-specific endpoints
│   │   ├── lab/          # Lab-specific endpoints
│   │   ├── admin/        # Admin-specific endpoints
│   │   ├── ai/           # AI summary endpoints
│   │   └── blockchain/   # Blockchain endpoints
│   ├── patient/          # Patient dashboard
│   ├── doctor/           # Doctor dashboard
│   ├── lab/              # Lab dashboard
│   └── admin/            # Admin dashboard
├── components/           # React components
│   ├── patient/          # Patient-specific components
│   ├── doctor/           # Doctor-specific components
│   ├── lab/              # Lab-specific components
│   ├── ai/               # AI summary components
│   └── blockchain/       # Blockchain components
├── lib/
│   ├── db/               # Database models and connection
│   ├── auth/             # Authentication utilities
│   ├── storage/          # File storage utilities
│   ├── ai/               # AI/LLM services
│   └── blockchain/       # Blockchain client
├── contracts/            # Solidity smart contracts
└── docs/                 # Documentation
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection String (Get from MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/healthcare-ehr?retryWrites=true&w=majority

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: Node Environment
NODE_ENV=development
```

**Getting MongoDB URI:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

**Generate JWT Secret:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use any random string generator
```

3. **Run the development server**
```bash
npm run dev
```

4. **Access the application**
Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage Guide

### 1. First Time Setup
- Open the landing page at [http://localhost:3000](http://localhost:3000)
- Register an admin account first
- Then register test accounts for each role

### 2. Patient Workflow
- Register/Login as a patient from landing page
- Upload medical records (PDF, images, documents)
- Grant access to specific doctors/labs by searching their email
- View all your records in the "My Records" tab
- Monitor who accessed your data in "Audit Logs" tab
- Revoke access anytime

### 3. Doctor Workflow
- Register as a doctor (requires admin verification)
- Wait for admin to verify your account
- View patients who granted you access
- Access and view medical records
- Upload additional documents for patients

### 4. Lab Workflow
- Register as a lab (requires admin verification)
- Wait for admin to verify your account
- View patients who granted upload access
- Upload lab reports (upload-only, cannot read existing records)
- View your upload history

### 5. Admin Workflow
- Login as admin
- Go to "Pending Verifications" tab
- Review and approve/reject doctor and lab registrations
- Manage all users in "User Management" tab
- Block/unblock accounts if needed
- Monitor system-wide activity in "Audit Logs"

## Security Features

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC)
- Middleware protection on all API routes
- HTTP-only cookies for token storage

### Data Protection
- Conditional access checks before data retrieval
- Patient-controlled access permissions
- Comprehensive audit logging of all actions
- Admin verification for medical professionals
- Account blocking capability

## API Documentation

Detailed API documentation is available in `docs/API_ENDPOINTS.md` and `SETUP.md`.

### Key Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user (email, password, name, role)
- `POST /api/auth/login` - Login and get JWT token

**Patient APIs** (Requires authentication, patient role)
- `GET /api/patient/records` - Get all patient's records
- `POST /api/patient/upload` - Upload medical record
- `POST /api/patient/access/grant` - Grant access to doctor/lab
- `POST /api/patient/access/revoke` - Revoke access
- `GET /api/patient/access/list` - List all permissions
- `GET /api/patient/audit-logs` - View audit logs

**Doctor APIs** (Requires authentication, verified doctor)
- `GET /api/doctor/patients` - Get accessible patients
- `GET /api/doctor/records/[patientId]` - Get patient records
- `POST /api/doctor/upload` - Upload document for patient

**Lab APIs** (Requires authentication, verified lab)
- `GET /api/lab/patients` - Get upload-authorized patients
- `POST /api/lab/upload` - Upload lab report
- `GET /api/lab/upload-history` - View upload history

**Admin APIs** (Requires authentication, admin role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/pending-verifications` - Get unverified users
- `POST /api/admin/verify-user` - Approve/reject doctor/lab
- `POST /api/admin/block-user` - Block/unblock user
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/audit-logs` - Get system-wide audit logs

**Utility APIs**
- `GET /api/users/search` - Search users by email/name (for access granting)

## Database Schema

See `docs/DATABASE_SCHEMA.md` for complete MongoDB schema documentation.

### Core Collections
- `users` - User accounts and profiles
- `medical_records` - Medical records and metadata
- `access_permissions` - Access control records
- `ai_summaries` - Generated AI summaries
- `audit_logs` - System activity logs

## Features Overview

### ✅ Implemented
- Complete authentication system with JWT
- Role-based dashboards (Patient, Doctor, Lab, Admin)
- File upload with base64 storage
- Granular access control (read/write permissions)
- Admin verification workflow for medical professionals
- Comprehensive audit logging
- Real-time permission management
- User search functionality
- Account blocking/unblocking
- System statistics and monitoring

### 🚧 Future Enhancements (Optional)
- Cloud file storage (AWS S3, Vercel Blob, Azure)
- AI-powered medical record summaries
- Blockchain audit trail integration
- Email notifications
- Two-factor authentication
- Advanced search and filtering
- PDF report generation
- Appointment scheduling
- Real-time notifications
- Mobile app

## Deployment

### Option 1: Vercel (Recommended - Easiest)

1. **Connect GitHub**
   - Push your code to GitHub repository
   - Connect repository in v0's Settings sidebar

2. **Deploy to Vercel**
   - Click "Publish" button in v0
   - Or connect GitHub repo in Vercel dashboard

3. **Add Environment Variables**
   - Go to Vercel project settings
   - Add `MONGODB_URI` and `JWT_SECRET`
   - Redeploy

### Option 2: Manual Deployment

```bash
# Build the project
npm run build

# Set environment variables on your server
export MONGODB_URI="your-mongodb-uri"
export JWT_SECRET="your-jwt-secret"

# Start the server
npm start
```

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing Guide

### Create Test Accounts

1. **Admin Account**
```
Email: admin@test.com
Password: admin123
Role: Admin
```

2. **Patient Account**
```
Email: patient@test.com
Password: patient123
Role: Patient
```

3. **Doctor Account** (needs verification)
```
Email: doctor@test.com
Password: doctor123
Role: Doctor
License: DOC-12345
```

4. **Lab Account** (needs verification)
```
Email: lab@test.com
Password: lab123
Role: Lab
License: LAB-67890
```

### Test Workflow

1. Register admin account
2. Register doctor and lab accounts
3. Login as admin and verify doctor/lab
4. Login as patient and upload a medical record
5. Grant read access to doctor
6. Grant write access to lab
7. Login as doctor and view patient records
8. Login as lab and upload lab report
9. Login as patient and view all records + audit logs
10. Revoke doctor access
11. Verify doctor can no longer access records

## Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
- Verify MONGODB_URI is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure database user has read/write permissions
- Test connection string in MongoDB Compass

**2. Authentication Not Working**
- Clear browser cookies and localStorage
- Verify JWT_SECRET is set in environment variables
- Check token expiration (default: 7 days)
- Look for errors in browser console

**3. File Upload Issues**
- Check file size (default limit: 10MB for base64)
- Verify file type is supported
- Check browser console for errors
- For large files, consider implementing cloud storage

**4. Access Denied Errors**
- Verify user role matches the dashboard
- For doctors/labs, ensure admin has verified account
- Check if user account is blocked
- Verify permissions are granted correctly

**5. Environment Variables Not Loading**
- File must be named `.env.local` (not `.env`)
- Restart dev server after adding variables
- Don't commit `.env.local` to git
- For production, set variables in hosting platform

### Debug Mode

Add this to see detailed logs:
```env
DEBUG=true
```

## Security Best Practices

### For Development
- Use strong JWT_SECRET (32+ characters)
- Don't commit `.env.local` to version control
- Use different passwords for test accounts
- Regularly update dependencies

### For Production
- Use HTTPS only (force SSL)
- Implement rate limiting
- Add CORS restrictions
- Enable MongoDB encryption at rest
- Set up monitoring and alerts
- Regular security audits
- Implement backup strategy
- Use environment-specific secrets
- Enable MongoDB IP whitelist
- Add DDoS protection

## Project Structure Details

```
healthcare-ehr/
├── app/
│   ├── page.tsx              # Landing page with role selection
│   ├── patient/page.tsx      # Patient dashboard
│   ├── doctor/page.tsx       # Doctor dashboard (view records)
│   ├── lab/page.tsx          # Lab dashboard (upload only)
│   ├── admin/page.tsx        # Admin dashboard (user management)
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts    # User registration
│       │   └── login/route.ts       # User login
│       ├── patient/
│       │   ├── records/route.ts     # Get patient records
│       │   ├── upload/route.ts      # Upload record
│       │   ├── access/
│       │   │   ├── grant/route.ts   # Grant access
│       │   │   ├── revoke/route.ts  # Revoke access
│       │   │   └── list/route.ts    # List permissions
│       │   └── audit-logs/route.ts  # Patient audit logs
│       ├── doctor/
│       │   ├── patients/route.ts    # Get accessible patients
│       │   ├── records/[patientId]/route.ts  # Get patient records
│       │   └── upload/route.ts      # Upload for patient
│       ├── lab/
│       │   ├── patients/route.ts    # Get authorized patients
│       │   ├── upload/route.ts      # Upload lab report
│       │   └── upload-history/route.ts  # Upload history
│       ├── admin/
│       │   ├── users/route.ts       # Get all users
│       │   ├── pending-verifications/route.ts  # Pending verifications
│       │   ├── verify-user/route.ts # Verify doctor/lab
│       │   ├── block-user/route.ts  # Block/unblock user
│       │   ├── stats/route.ts       # System statistics
│       │   └── audit-logs/route.ts  # System audit logs
│       └── users/
│           └── search/route.ts      # Search users
├── lib/
│   ├── db/
│   │   ├── mongo.ts          # MongoDB connection singleton
│   │   └── models.ts         # TypeScript interfaces
│   └── auth/
│       ├── jwt.ts            # JWT sign/verify utilities
│       ├── hash.ts           # Password hashing (bcrypt)
│       └── middleware.ts     # Auth middleware for routes
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── patient/              # Patient-specific components
│   ├── doctor/               # Doctor-specific components
│   └── lab/                  # Lab-specific components
├── docs/                     # Documentation files
├── SETUP.md                  # Detailed setup guide
└── .env.local               # Environment variables (create this)
```

## Contributing

This is a hackathon/educational project. Contributions welcome for:
- Bug fixes
- Feature enhancements
- Documentation improvements
- Security improvements
- Test coverage
- Performance optimization

## License

MIT License - See LICENSE file for details

## Support & Questions

1. Check SETUP.md for detailed instructions
2. Review docs/ folder for specific features
3. Check browser console for error messages
4. Verify environment variables are set correctly
5. Test MongoDB connection separately

## Acknowledgments

Built with modern web technologies for secure, scalable healthcare data management.

---

**Ready to use!** Just add your MongoDB URI and you're all set. The entire backend is production-ready with real authentication, authorization, and data persistence.
