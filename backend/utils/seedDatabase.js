/* eslint-disable no-unused-vars */
// backend/utils/seedDatabase.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('./logger');

/**
 * Seeds the database with an initial admin user if none exists.
 *
 * ⚠️  Requires ADMIN_PASSWORD env var — no hardcoded fallback.
 *     If not set, seeding is skipped with a warning.
 */
const seedDatabase = async () => {
  try {
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@alawael.com.sa').toLowerCase().trim();

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });

    if (adminExists) {
      logger.info('✅ Admin user already exists — skipping seed');
      return;
    }

    // Require password from environment — no hardcoded fallback
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
      logger.warn(
        '⚠️  No admin user exists and ADMIN_PASSWORD env var is not set. ' +
          'Set ADMIN_PASSWORD to auto-create the initial admin account.'
      );
      return;
    }

    if (ADMIN_PASSWORD.length < 8) {
      logger.error('❌ ADMIN_PASSWORD must be at least 8 characters — skipping seed');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const adminUser = new User({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      fullName: process.env.ADMIN_FULL_NAME || 'مدير النظام',
      phone: process.env.ADMIN_PHONE || '',
      department: 'إدارة',
      role: 'admin',
      status: 'active',
      isActive: true,
      requirePasswordChange: true,
    });

    await adminUser.save();
    logger.info(`✅ Admin user created: ${ADMIN_EMAIL} (password change required on first login)`);
  } catch (error) {
    if (error.code === 11000) {
      // Ignore duplicate key error (race condition)
      logger.info('✅ Admin user already exists (concurrent creation)');
    } else {
      logger.error('⚠️  Seeding warning:', error.message);
    }
  }
};

module.exports = seedDatabase;
