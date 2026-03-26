/**
 * Seed Script — Users & Roles
 * بذر بيانات المستخدمين والأدوار الافتراضية
 *
 * Creates admin + one user per critical role for initial setup / staging.
 * Run: node seed/users-seed.js
 *
 * Environment:
 *   MONGODB_URI        — target database (default: localhost)
 *   SEED_ADMIN_EMAIL   — admin email (default: admin@alawael.com)
 *   SEED_ADMIN_PASSWORD — admin password (default: Admin@123456)
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

const ROLES = [
  'super_admin',
  'admin',
  'manager',
  'supervisor',
  'hr',
  'accountant',
  'doctor',
  'therapist',
  'teacher',
  'receptionist',
  'data_entry',
  'viewer',
];

const ROLE_LABELS = {
  super_admin: 'مدير النظام',
  admin: 'مدير',
  manager: 'مدير فرع',
  supervisor: 'مشرف',
  hr: 'موارد بشرية',
  accountant: 'محاسب',
  doctor: 'طبيب',
  therapist: 'معالج',
  teacher: 'معلم',
  receptionist: 'استقبال',
  data_entry: 'إدخال بيانات',
  viewer: 'مشاهد',
};

async function seed() {
  console.log('🔌 Connecting to MongoDB…');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected');

  const User = require('../models/User');
  const SALT_ROUNDS = 12;

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@alawael.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';

  const users = ROLES.map((role, i) => ({
    email: role === 'super_admin' ? adminEmail : `${role}@alawael.com`,
    password: role === 'super_admin' ? adminPassword : `Test@${role}123`,
    fullName: `${ROLE_LABELS[role]} (${role})`,
    role,
    isActive: true,
    emailVerified: true,
  }));

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`  ⏭  ${u.email} already exists — skipped`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
    await User.create({ ...u, password: hashed });
    console.log(`  ✅ Created ${u.role}: ${u.email}`);
    created++;
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
