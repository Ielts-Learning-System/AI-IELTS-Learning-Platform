/**
 * setup-admin-and-config.js
 * Run from /ielts/be: node setup-admin-and-config.js
 * Creates admin user (if not exists) + saves Gemini API key in SystemConfig
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'auth-service/.env') });

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.SETUP_ADMIN_EMAIL || 'tranvinhhuy@gmail.com';
const ADMIN_PASS  = process.env.SETUP_ADMIN_PASS  || 'vhuytran07';
const GEMINI_KEY  = process.env.SETUP_GEMINI_KEY  || '';

if (!MONGO_URI) { console.error('ERROR: MONGO_URI not set'); process.exit(1); }

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(); // uses DB from URI
    const users = db.collection('users');
    const configs = db.collection('systemconfigs');

    // --- Admin user ---
    let user = await users.findOne({ email: ADMIN_EMAIL });
    if (!user) {
      const hashed = await bcrypt.hash(ADMIN_PASS, 10);
      const res = await users.insertOne({
        name: 'Admin',
        email: ADMIN_EMAIL,
        password: hashed,
        role: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✔ Admin user created: ${ADMIN_EMAIL} (_id=${res.insertedId})`);
    } else if (user.role !== 'admin') {
      await users.updateOne({ _id: user._id }, { $set: { role: 'Admin', updatedAt: new Date() } });
      console.log(`✔ Promoted ${ADMIN_EMAIL} to admin`);
    } else {
      console.log(`✔ Admin user already exists: ${ADMIN_EMAIL} (role=${user.role})`);
    }

    // --- System config (save Gemini key if provided) ---
    if (GEMINI_KEY) {
      const existing = await configs.findOne({ key: 'global' });
      const update = {
        key: 'global',
        geminiApiKey: GEMINI_KEY,
        readingPromptTemplate: existing?.readingPromptTemplate || '',
        listeningPromptTemplate: existing?.listeningPromptTemplate || '',
        updatedAt: new Date(),
      };
      await configs.replaceOne({ key: 'global' }, update, { upsert: true });
      console.log(`✔ SystemConfig saved (gemini key length=${GEMINI_KEY.length})`);
    } else {
      const cfg = await configs.findOne({ key: 'global' });
      console.log(`ℹ SystemConfig: ${cfg ? 'exists, key-set=' + (cfg.geminiApiKey?.length > 5) : 'not set'}`);
    }

  } finally {
    await client.close();
    console.log('Done.');
  }
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
