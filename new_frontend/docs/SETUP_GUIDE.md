# Healthcare EHR Platform - Setup Guide

Complete guide to set up and run the Healthcare EHR platform locally or in production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher
- **MongoDB**: v5.0 or higher

### Optional Software
- **Docker**: For containerized MongoDB
- **Git**: For version control

### API Keys
- **OpenAI API Key**: For AI summarization (optional for demo)
- **Blockchain Node**: Quorum endpoint (optional for demo)

---

## Local Development Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd healthcare-ehr

# Install dependencies
npm install
```

### Step 2: Set Up MongoDB

#### Option A: Local MongoDB
```bash
# Install MongoDB locally
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongosh
```

#### Option B: Docker MongoDB
```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# Verify it's running
docker ps
```

#### Option C: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Whitelist your IP address

### Step 3: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

**Minimum required configuration:**
```env
MONGODB_URI=mongodb://localhost:27017/healthcare-ehr
JWT_SECRET=generate-a-secure-random-string-here
```

**Generate a secure JWT_SECRET:**
```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Copy the output to JWT_SECRET in .env.local
```

### Step 4: Create Upload Directory

```bash
# Create directory for file uploads
mkdir -p uploads

# Set proper permissions (Unix/macOS)
chmod 755 uploads
```

### Step 5: Start Development Server

```bash
# Start Next.js development server
npm run dev

# Server will start on http://localhost:3000
```

### Step 6: Verify Installation

1. Open browser to `http://localhost:3000`
2. You should see the landing page
3. Try registering a new account

---

## Production Deployment

### Option 1: Deploy to Vercel

#### Prerequisites
- Vercel account
- MongoDB Atlas cluster (free tier available)

#### Steps

1. **Prepare MongoDB**
```bash
# Set up MongoDB Atlas
# 1. Create cluster at mongodb.com/cloud/atlas
# 2. Create database user
# 3. Whitelist IPs (0.0.0.0/0 for Vercel)
# 4. Get connection string
```

2. **Install Vercel CLI**
```bash
npm i -g vercel
```

3. **Deploy**
```bash
# Login to Vercel
vercel login

# Deploy project
vercel

# Follow prompts to configure project
```

4. **Configure Environment Variables**

Go to Vercel Dashboard > Project > Settings > Environment Variables

Add:
```
MONGODB_URI=your-atlas-connection-string
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=your-openai-key (optional)
UPLOAD_DIR=/tmp/uploads
```

5. **Deploy to Production**
```bash
vercel --prod
```

### Option 2: Deploy with Docker

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/healthcare-ehr
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongodb
    volumes:
      - ./uploads:/app/uploads

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

#### Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Traditional Server Deployment

#### Prerequisites
- Ubuntu 20.04+ server
- Root or sudo access
- Domain name (optional)

#### Steps

1. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install MongoDB**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

3. **Clone and Configure**
```bash
cd /var/www
git clone <your-repo-url> healthcare-ehr
cd healthcare-ehr
npm install
npm run build
```

4. **Set Environment Variables**
```bash
sudo nano .env.production

# Add your variables
MONGODB_URI=mongodb://localhost:27017/healthcare-ehr
JWT_SECRET=your-production-secret
# ... other variables
```

5. **Install PM2**
```bash
sudo npm install -g pm2
```

6. **Start Application**
```bash
pm2 start npm --name "healthcare-ehr" -- start
pm2 save
pm2 startup
```

7. **Configure Nginx (Optional)**
```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/healthcare-ehr
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/healthcare-ehr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

8. **SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Database Initialization

The platform automatically creates indexes when first started. To manually initialize:

```javascript
// Run in MongoDB shell (mongosh)

use healthcare_ehr

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ walletAddress: 1 })
db.medical_records.createIndex({ patientId: 1 })
db.medical_records.createIndex({ uploadedBy: 1 })
db.access_permissions.createIndex({ patientId: 1, accessorId: 1 })
db.audit_logs.createIndex({ patientId: 1, timestamp: -1 })
```

---

## Testing the Setup

### Create Test Admin

```bash
# Use the registration page to create first user
# First user is automatically assigned admin role

# Or use MongoDB shell
mongosh healthcare_ehr

db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin", isVerified: true } }
)
```

### Test Each Role

1. **Admin Dashboard** (`/admin`)
   - Verify pending users
   - View system stats
   - Check audit logs

2. **Patient Dashboard** (`/patient`)
   - Upload a test file
   - Grant access to a doctor
   - Generate AI summary

3. **Doctor Dashboard** (`/doctor`)
   - View accessible patients
   - Access granted records
   - Upload document

4. **Lab Dashboard** (`/lab`)
   - View upload-authorized patients
   - Upload lab report

---

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoNetworkError: connect ECONNREFUSED`

**Solution**:
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection string in .env.local
```

### JWT Token Issues

**Error**: `JsonWebTokenError: invalid signature`

**Solution**:
- Ensure JWT_SECRET is set in .env.local
- Clear browser cookies and login again
- Generate new JWT_SECRET if compromised

### File Upload Issues

**Error**: `ENOENT: no such file or directory`

**Solution**:
```bash
# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# For Vercel, uploads go to /tmp
UPLOAD_DIR=/tmp/uploads
```

### Build Errors

**Error**: `Module not found`

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

---

## Performance Optimization

### Database Indexes

Already configured in the models. Verify:
```javascript
mongosh healthcare_ehr
db.medical_records.getIndexes()
```

### File Storage

For production, use cloud storage:

**AWS S3 Integration:**
```typescript
// lib/storage/s3-storage.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(file: Buffer, key: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file,
  });
  
  await s3Client.send(command);
  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

### Caching

Add Redis for session caching:
```bash
npm install redis
```

---

## Monitoring

### Application Logs

```bash
# Using PM2
pm2 logs healthcare-ehr

# Using Docker
docker-compose logs -f app
```

### Database Monitoring

```javascript
// MongoDB shell
mongosh healthcare_ehr

// Check database stats
db.stats()

// Check collection sizes
db.medical_records.stats()
db.audit_logs.stats()

// Monitor operations
db.currentOp()
```

---

## Backup

### MongoDB Backup

```bash
# Create backup
mongodump --db healthcare_ehr --out /backup/$(date +%Y%m%d)

# Restore backup
mongorestore --db healthcare_ehr /backup/20240101/healthcare_ehr
```

### Automated Backups

Create cron job:
```bash
crontab -e

# Add daily backup at 2 AM
0 2 * * * mongodump --db healthcare_ehr --out /backup/$(date +\%Y\%m\%d)
```

---

## Security Checklist

- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Set secure CORS policies
- [ ] Enable rate limiting
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Implement file size limits
- [ ] Sanitize all user inputs
- [ ] Enable MongoDB encryption at rest

---

## Next Steps

After successful setup:
1. Configure OpenAI API for real AI summaries
2. Deploy Quorum blockchain network
3. Set up monitoring and alerting
4. Implement automated backups
5. Configure email notifications
6. Set up CI/CD pipeline
7. Conduct security audit

---

## Support

For issues:
1. Check troubleshooting section
2. Review application logs
3. Check MongoDB logs
4. Open GitHub issue with details
