/**
 * Admin Users Seed
 * المستخدمون الافتراضيون - حساب المدير العام
 * WARNING: Change passwords immediately after first login!
 */

'use strict';

const crypto = require('crypto');

/**
 * Simple password hashing using bcrypt-compatible approach
 * We use a placeholder that will be detected and hashed properly on first login
 * OR we can use the actual bcrypt if available
 */
async function hashPassword(plain) {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(plain, 12);
  } catch {
    try {
      const bcrypt = require('bcrypt');
      return await bcrypt.hash(plain, 12);
    } catch {
      // fallback: SHA-256 (not for production use)
      return '$sha256$' + crypto.createHash('sha256').update(plain).digest('hex');
    }
  }
}

const adminUsers = [
  {
    username: 'superadmin',
    email: 'superadmin@alawael.com.sa',
    plainPassword: 'Admin@2025!',
    profile: {
      firstName: { ar: 'مدير', en: 'Super' },
      lastName: { ar: 'النظام', en: 'Admin' },
    },
    role: 'superadmin',
    isActive: true,
    mustChangePassword: true,
    notes: 'Default super administrator - CHANGE PASSWORD IMMEDIATELY',
  },
  {
    username: 'admin',
    email: 'admin@alawael.com.sa',
    plainPassword: 'Admin@2025#',
    profile: {
      firstName: { ar: 'مدير', en: 'Admin' },
      lastName: { ar: 'النظام', en: 'User' },
    },
    role: 'admin',
    isActive: true,
    mustChangePassword: true,
    notes: 'Default administrator - CHANGE PASSWORD IMMEDIATELY',
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('users');

  let created = 0;
  let skipped = 0;

  for (const u of adminUsers) {
    const existing = await col.findOne({ $or: [{ username: u.username }, { email: u.email }] });
    if (existing) {
      console.log(`  ⏭  admin-users: skipping '${u.username}' (already exists)`);
      skipped++;
      continue;
    }

    const hashedPassword = await hashPassword(u.plainPassword);
    const now = new Date();

    await col.insertOne({
      username: u.username,
      email: u.email,
      password: hashedPassword,
      profile: u.profile,
      role: u.role,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      emailVerified: true,
      loginAttempts: 0,
      permissions: [],
      branches: [],
      preferences: {
        language: 'ar',
        theme: 'light',
      },
      metadata: {
        isSystemUser: true,
        notes: u.notes,
        seededAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    console.log(`  ✔ admin-users: created '${u.username}' (${u.role})`);
    created++;
  }

  if (created > 0) {
    console.log(`\n  ⚠️  IMPORTANT: Change default passwords immediately!`);
    console.log(`     superadmin: ${adminUsers[0].plainPassword}`);
    console.log(`     admin:      ${adminUsers[1].plainPassword}\n`);
  }

  console.log(`  ✔ admin-users: ${created} created, ${skipped} skipped`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db.collection('users').deleteMany({
    username: { $in: adminUsers.map(u => u.username) },
    'metadata.isSystemUser': true,
  });
  console.log(`  ✔ admin-users: removed ${result.deletedCount} system users`);
}

module.exports = { seed, down };
