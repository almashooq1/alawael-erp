#!/usr/bin/env node

/**
 * 🔍 MongoDB Connection Verification Script
 * التحقق من صحة الاتصال بـ MongoDB Atlas
 */

require('dotenv').config();
const mongoose = require('mongoose');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`\n${colors.cyan}🔍 MongoDB Connection Verification${colors.reset}\n`);

// الخطوة 1: قراءة .env
console.log(`${colors.blue}1. Reading .env configuration...${colors.reset}`);
console.log(`   MongoDB URI: ${process.env.MONGODB_URI.substring(0, 50)}...`);
console.log(`   USE_MOCK_DB: ${process.env.USE_MOCK_DB}\n`);

// الخطوة 2: التحقق من الإعدادات
if (process.env.USE_MOCK_DB === 'true') {
  console.log(`${colors.yellow}⚠️  WARNING: Using In-Memory Database!${colors.reset}`);
  console.log(`   Data will NOT be saved!`);
  console.log(`   To use MongoDB Atlas: Set USE_MOCK_DB=false in .env\n`);
}

// الخطوة 3: محاولة الاتصال
console.log(`${colors.blue}2. Connecting to MongoDB...${colors.reset}`);

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  })
  .then(async () => {
    console.log(`${colors.green}✅ Connected to MongoDB!${colors.reset}\n`);

    // الخطوة 4: الحصول على معلومات قاعدة البيانات
    console.log(`${colors.blue}3. Database Information:${colors.reset}`);

    const db = mongoose.connection.db;
    const stats = await db.stats();

    console.log(`   Database Name: ${stats.db}`);
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB\n`);

    // الخطوة 5: التحقق من المجموعات
    console.log(`${colors.blue}4. Collections:${colors.reset}`);
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log(`   ${colors.yellow}⚠️  No collections found!${colors.reset}`);
      console.log(`   Run: node scripts\\seed.js\n`);
    } else {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   ✅ ${col.name}: ${count} documents`);
      }
      console.log();
    }

    // الخطوة 6: اختبار القراءة
    console.log(`${colors.blue}5. Testing Data Read:${colors.reset}`);

    try {
      const organizations = db.collection('organizations');
      const count = await organizations.countDocuments();

      if (count > 0) {
        const org = await organizations.findOne();
        console.log(`   ${colors.green}✅ Found ${count} organization(s)${colors.reset}`);
        console.log(`      Name: ${org?.name || 'N/A'}`);
      } else {
        console.log(`   ${colors.yellow}⚠️  No organizations found${colors.reset}`);
      }
    } catch (err) {
      console.log(`   ${colors.yellow}⚠️  Could not query organizations: ${err.message}${colors.reset}`);
    }

    console.log();

    // النتيجة النهائية
    console.log(`${colors.green}✅ Connection Verification Complete!${colors.reset}\n`);
    console.log(`${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. Run: npm start`);
    console.log(`  2. Open: http://localhost:3002\n`);

    process.exit(0);
  })
  .catch(err => {
    console.log(`${colors.red}❌ Connection Failed!${colors.reset}\n`);
    console.log(`${colors.red}Error:${colors.reset} ${err.message}\n`);

    if (err.message.includes('authentication failed')) {
      console.log(`${colors.yellow}💡 Tip: Check username and password in MONGODB_URI${colors.reset}\n`);
    }

    if (err.message.includes('MongooseServerSelectionError')) {
      console.log(`${colors.yellow}💡 Tip: Check if IP address (0.0.0.0/0) is added in MongoDB Atlas${colors.reset}\n`);
    }

    if (err.message.includes('ENOTFOUND')) {
      console.log(`${colors.yellow}💡 Tip: Check internet connection or DNS${colors.reset}\n`);
    }

    process.exit(1);
  });
