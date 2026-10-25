const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/placement-simulator';
const DUMP_DIR = path.join(__dirname, '../data-dump');

// Helper to convert ISO date strings or string ObjectIds back into MongoDB types if needed
function reviveMongoTypes(doc) {
  if (doc === null || typeof doc !== 'object') return doc;
  if (Array.isArray(doc)) return doc.map(reviveMongoTypes);

  const restored = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id' && typeof value === 'string' && ObjectId.isValid(value) && value.length === 24) {
      restored[key] = new ObjectId(value);
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const parsedDate = new Date(value);
      restored[key] = isNaN(parsedDate.getTime()) ? value : parsedDate;
    } else if (typeof value === 'object') {
      restored[key] = reviveMongoTypes(value);
    } else {
      restored[key] = value;
    }
  }
  return restored;
}

async function importDatabase() {
  try {
    if (!fs.existsSync(DUMP_DIR)) {
      console.error(` Error: Data dump directory not found at: ${DUMP_DIR}`);
      process.exit(1);
    }

    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.\n');

    const files = fs.readdirSync(DUMP_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
      console.log('No .json dump files found in data-dump directory.');
      return;
    }

    for (const file of files) {
      const collName = path.basename(file, '.json');
      const filePath = path.join(DUMP_DIR, file);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const docs = JSON.parse(rawData);

      if (!Array.isArray(docs) || docs.length === 0) {
        console.log(` Skipping [${collName}]: file is empty`);
        continue;
      }

      const collection = mongoose.connection.db.collection(collName);
      
      // Clear existing collection before restoring
      await collection.deleteMany({});

      const hydratedDocs = docs.map(reviveMongoTypes);
      await collection.insertMany(hydratedDocs);

      console.log(` Restored [${collName}]: ${hydratedDocs.length} documents imported`);
    }

    console.log(`\n Restore complete! All collections imported successfully.`);
  } catch (error) {
    console.error(' Restore failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

importDatabase();
