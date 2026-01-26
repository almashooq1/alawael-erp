// backend/db/seeders/initialData.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    // Create admin user directly without middleware
    const admin = new User({
      email: 'admin@alawael.com',
      password: hashedPassword,
      fullName: 'مسؤول النظام',
      role: 'admin',
      lastLogin: new Date(),
    });

    await admin.save();

    console.log('✅ Database seeded successfully');
    console.log('📧 Admin Email: admin@alawael.com');
    console.log('🔐 Admin Password: Admin@123456');

    return admin;
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    throw error;
  }
};

module.exports = { seedDatabase };
