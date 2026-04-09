
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('./.env.local') });

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ehr-platform");
    
    console.log("--- LAB USERS ---");
    const labs = await db.collection('users').find({ role: 'lab' }).toArray();
    labs.forEach(l => {
      console.log(`Email: ${l.email}, ID: ${l._id}, Verified: ${l.isVerified}`);
    });

  } finally {
    await client.close();
  }
}

check().catch(console.error);
