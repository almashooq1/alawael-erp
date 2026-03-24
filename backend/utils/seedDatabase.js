/* eslint-disable no-unused-vars */
// backend/utils/seedDatabase.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@alawael.com' });

    if (adminExists) {
      logger.info('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    const adminUser = new User({
      email: 'admin@alawael.com',
      password: hashedPassword,
      fullName: 'مدير النظام',
      phone: '966501234567',
      department: 'إدارة',
      role: 'admin',
      status: 'active',
    });

    await adminUser.save();
    logger.info('✅ Admin user created: admin@alawael.com');
  } catch (error) {
    if (error.code !== 11000) {
      // Ignore duplicate key error
      logger.error('⚠️  Seeding warning:', error.message);
    }
  }
};

module.exports = seedDatabase;
