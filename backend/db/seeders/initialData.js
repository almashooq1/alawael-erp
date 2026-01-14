// backend/db/seeders/initialData.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const seedDatabase = async () => {
  try {
    // Check if admin already exists
    const User = require('../../models/User');
    const existingAdmin = await User.findOne({ email: 'admin@alawael.com' });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    // Create admin user
    const admin = await User.create({
      email: 'admin@alawael.com',
      password: hashedPassword,
      fullName: 'مسؤول النظام',
      role: 'admin',
      lastLogin: new Date(),
    });

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
