// backend/db/seeders/initialData.js
const mongoose = require('mongoose');

const seedDatabase = async () => {
  try {
    // Check if admin already exists
    let User;
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('📝 Seeding check using In-Memory User model');
      User = require('../../models/User.memory');
    } else {
      console.log('🗄️  Seeding check using MongoDB User model');
      User = require('../../models/User');
    }

    const existingAdmin = await User.findOne({ email: 'admin@alawael.com' });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Use environment variables; fall back to dev defaults only outside prod
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@alawael.com';
    let adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SEED_ADMIN_PASSWORD must be set in production');
      }
      adminPassword = 'Admin@123456'; // dev-only default
    }

    // Create admin user — let Mongoose pre('save') hook handle hashing
    const admin = new User({
      email: adminEmail,
      password: adminPassword,
      fullName: 'مسؤول النظام',
      role: 'admin',
      lastLogin: new Date(),
    });

    await admin.save();

    console.log('✅ Database seeded successfully');
    console.log('📧 Admin Email:', adminEmail);
    // NEVER log passwords — even in development

    return admin;
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    throw error;
  }
};

module.exports = { seedDatabase };
