const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/placement-simulator';
const DUMP_DIR = path.join(__dirname, '../data-dump');

async function exportDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.\n');

    if (!fs.existsSync(DUMP_DIR)) {
      fs.mkdirSync(DUMP_DIR, { recursive: true });
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Starting export...\n`);

    for (const collInfo of collections) {
      const collName = collInfo.name;
      // Skip internal system collections
      if (collName.startsWith('system.')) continue;

      const collection = mongoose.connection.db.collection(collName);
      const docs = await collection.find({}).toArray();

      const filePath = path.join(DUMP_DIR, `${collName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      console.log(` Exported [${collName}]: ${docs.length} documents -> data-dump/${collName}.json`);
    }

    console.log(`\n Export complete! All data saved into: ${DUMP_DIR}`);
  } catch (error) {
    console.error(' Export failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

exportDatabase();
