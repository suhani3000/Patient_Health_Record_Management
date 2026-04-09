
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ehr-platform");
    
    console.log("--- USERS ---");
    const users = await db.collection('users').find({}).toArray();
    users.forEach(u => {
      console.log(`ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Verified: ${u.isVerified}`);
    });

    console.log("\n--- ACCESS PERMISSIONS ---");
    const perms = await db.collection('accessPermissions').find({}).toArray();
    perms.forEach(p => {
      console.log(`From: ${p.patientId}, To: ${p.grantedTo}, Role: ${p.grantedToRole}, Active: ${p.isActive}`);
    });

  } finally {
    await client.close();
  }
}

check().catch(console.error);
