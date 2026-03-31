/**
 * Create admin user directly
 */
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

async function createAdmin() {
  console.log('🔌 Connecting to:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const User = require('./models/User');

  // Check if admin exists
  const existing = await User.findOne({ email: 'admin@alawael.com' });
  if (existing) {
    console.log('✅ Admin user already exists!');
    console.log('   Email:', existing.email);
    console.log('   Role:', existing.role);
    console.log('\n🔑 Try logging in with:');
    console.log('   Email: admin@alawael.com');
    console.log('   Password: Admin@123456 (or the password set during creation)');

    // Reset password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash('Admin@123456', salt);
    existing.password = hashed;
    existing.failedLoginAttempts = 0;
    existing.lockUntil = undefined;
    await existing.save();
    console.log('\n✅ Password reset to: Admin@123456');
    await mongoose.disconnect();
    return;
  }

  // Create admin
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('Admin@123456', salt);

  const user = await User.create({
    email: 'admin@alawael.com',
    password: hashedPassword,
    fullName: 'مدير النظام',
    role: 'admin',
  });

  console.log('✅ Admin user created!');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('\n🔑 Login credentials:');
  console.log('   Email:    admin@alawael.com');
  console.log('   Password: Admin@123456');

  await mongoose.disconnect();
  console.log('🔌 Done');
}

createAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
