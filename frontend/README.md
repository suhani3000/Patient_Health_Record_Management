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

\`\`\`
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
\`\`\`

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB instance
- OpenAI API key (for AI summaries)
- Quorum blockchain node (optional for demo)

### Installation

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd healthcare-ehr
npm install
\`\`\`

2. **Configure environment variables**

Create a `.env.local` file in the root directory:

\`\`\`env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/healthcare-ehr

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Blockchain (optional - uses mock for demo)
BLOCKCHAIN_PROVIDER_URL=http://localhost:8545
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_PRIVATE_KEY=0x...

# File Storage
UPLOAD_DIR=./uploads
\`\`\`

3. **Start MongoDB**
\`\`\`bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or use MongoDB Atlas cloud database
\`\`\`

4. **Run the development server**
\`\`\`bash
npm run dev
\`\`\`

5. **Access the application**
Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage Guide

### 1. Admin Setup
- Register an admin account (first user is auto-admin)
- Navigate to `/admin` dashboard
- Verify pending doctors and labs

### 2. Patient Workflow
- Register as a patient
- Upload medical records
- Grant access to specific doctors/labs
- View AI-generated summaries
- Monitor audit logs
- Revoke access when needed

### 3. Doctor Workflow
- Register as a doctor
- Wait for admin verification
- View patients who granted access
- Access medical records (read + upload)
- View AI summaries

### 4. Lab Workflow
- Register as a lab
- Wait for admin verification
- View patients who granted upload access
- Upload lab reports (upload-only, no read access)

## Security Features

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC)
- Middleware protection on all API routes

### Data Protection
- Conditional access checks before data retrieval
- File integrity verification via blockchain hashes
- Comprehensive audit logging
- MongoDB indexes for performance

### Blockchain Security
- Immutable access logs on Quorum
- Smart contract access control
- SHA-256 file hashing
- Transaction-based audit trail

## API Documentation

Detailed API documentation is available in `docs/API_ENDPOINTS.md`.

### Key Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

**Patient**
- `GET /api/patient/records` - Get patient's records
- `POST /api/patient/upload` - Upload medical record
- `POST /api/patient/access/grant` - Grant access to doctor/lab
- `POST /api/patient/access/revoke` - Revoke access

**Doctor**
- `GET /api/doctor/patients` - Get accessible patients
- `GET /api/doctor/records/[patientId]` - Get patient records
- `POST /api/doctor/upload` - Upload document for patient

**Lab**
- `GET /api/lab/patients` - Get upload-authorized patients
- `POST /api/lab/upload` - Upload lab report

**Admin**
- `GET /api/admin/pending-verifications` - Get unverified users
- `POST /api/admin/verify-user` - Verify doctor/lab
- `POST /api/admin/block-user` - Block/unblock user

**AI**
- `POST /api/ai/generate-summary` - Generate AI summary
- `GET /api/ai/summary/[recordId]` - Get existing summary

**Blockchain**
- `POST /api/blockchain/verify-hash` - Verify file integrity
- `GET /api/blockchain/audit-trail` - Get blockchain audit logs

## Database Schema

See `docs/DATABASE_SCHEMA.md` for complete MongoDB schema documentation.

### Core Collections
- `users` - User accounts and profiles
- `medical_records` - Medical records and metadata
- `access_permissions` - Access control records
- `ai_summaries` - Generated AI summaries
- `audit_logs` - System activity logs

## AI Summary System

The AI summary system uses OpenAI GPT-4 to analyze medical records and generate structured summaries including:
- Key diagnoses
- Test results and values
- Current medications
- Recommendations

See `docs/AI_SUMMARY_SYSTEM.md` for implementation details.

## Blockchain Integration

The platform uses Quorum blockchain for:
- Immutable audit trails
- File integrity verification
- Decentralized access control
- Compliance proof

See `docs/BLOCKCHAIN_INTEGRATION.md` for technical details.

## Demo Mode

The project includes mock implementations for demo purposes:
- **Blockchain**: Simulated blockchain transactions (no real Quorum network required)
- **AI**: Mock LLM responses (no OpenAI API key required for basic testing)

For production deployment, configure real services.

## Deployment

### Production Checklist
- [ ] Set up production MongoDB cluster
- [ ] Configure secure JWT_SECRET
- [ ] Set up OpenAI API with billing
- [ ] Deploy Quorum blockchain network
- [ ] Configure secure file storage (S3/Azure)
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting
- [ ] Configure CORS policies
- [ ] Set up backup systems

### Deploy to Vercel

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
\`\`\`

## Testing

Create test accounts for each role:

\`\`\`bash
# Patient
Email: patient@test.com
Password: patient123

# Doctor (needs admin verification)
Email: doctor@test.com
Password: doctor123

# Lab (needs admin verification)
Email: lab@test.com
Password: lab123

# Admin
Email: admin@test.com
Password: admin123
\`\`\`

## Contributing

This is a hackathon project. For production use, consider:
- Adding comprehensive unit and integration tests
- Implementing proper error handling and validation
- Setting up CI/CD pipelines
- Adding rate limiting and DDoS protection
- Implementing data encryption at rest
- Adding backup and disaster recovery
- Conducting security audits
- Implementing HIPAA compliance measures

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open a GitHub issue or contact the development team.

---

Built with Next.js, MongoDB, AI, and Blockchain for secure healthcare data management.
