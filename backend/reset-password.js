'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_erp';

const NEW_PASSWORD = 'Admin@123456';
const EMAIL = 'admin@alawael.com';

async function run() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;

  // Check user exists
  const user = await db.collection('users').findOne({ email: EMAIL });
  if (!user) {
    console.log('❌ User not found:', EMAIL);
    process.exit(1);
  }

  console.log('👤 Found user:', user.email, '| role:', user.role, '| isActive:', user.isActive);

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(NEW_PASSWORD, salt);

  // Verify hash works
  const testMatch = await bcrypt.compare(NEW_PASSWORD, hash);
  console.log('🔑 Hash verification test:', testMatch ? '✅ PASS' : '❌ FAIL');

  // Update directly via collection (bypasses Mongoose middleware)
  const result = await db.collection('users').findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        password: hash,
        failedLoginAttempts: 0,
        isActive: true,
      },
      $unset: { lockUntil: '' },
    },
    { returnDocument: 'after' }
  );

  const updated = result.value || result;
  console.log('✅ Password updated successfully!');
  console.log('   Email:', updated.email || EMAIL);

  // Verify the saved hash
  const verifyUser = await db.collection('users').findOne({ email: EMAIL });
  const finalMatch = await bcrypt.compare(NEW_PASSWORD, verifyUser.password);
  console.log('🔑 Final verification in DB:', finalMatch ? '✅ MATCHES' : '❌ NO MATCH');

  if (!finalMatch) {
    console.log('🔍 Hash mismatch detected — check bcrypt version');
  }

  await mongoose.disconnect();
  console.log('\n🎉 Done! Login with:');
  console.log('   Email:', EMAIL);
  console.log('   Password: ********');
  process.exit(finalMatch ? 0 : 1);
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
