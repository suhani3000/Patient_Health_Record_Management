const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in .env.local");
    return;
  }

  console.log("Attempting to connect to:", uri.split('@')[1]); // Log host part for safety
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB!");
    const db = client.db('ehr-platform');
    const collections = await db.listCollections().toArray();
    console.log("Collections in 'ehr-platform':", collections.map(c => c.name));
  } catch (err) {
    console.error("❌ Connection failed:");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    if (err.message.includes("IP")) {
      console.error("TIP: Your IP address might not be whitelisted in MongoDB Atlas.");
    }
  } finally {
    await client.close();
  }
}

testConnection();
