/**
 * startup/adminEndpoints.js — Emergency admin & diagnostic endpoints
 * ═══════════════════════════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Endpoints:
 *   POST /api/_init  — Emergency admin reset (native MongoDB driver)
 *   GET  /api/_diag  — Admin diagnostic (read-only, dev/staging only)
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

/**
 * Mount emergency admin endpoints.
 *
 * @param {import('express').Application} app
 * @param {object}  opts
 * @param {boolean} opts.isProd
 */
function setupAdminEndpoints(app, { isProd }) {
  // ── Emergency Admin Reset ───────────────────────────────────────────────
  // POST /api/_init — uses native MongoDB driver directly (bypasses Mongoose hooks)
  // ⚠️  SECURITY: Disabled in production unless ALLOW_ADMIN_INIT=true
  app.post('/api/_init', async (req, res) => {
    if (isProd && process.env.ALLOW_ADMIN_INIT !== 'true') {
      return res.status(403).json({ success: false, message: 'Disabled in production' });
    }

    const SECRET = process.env.SETUP_SECRET_KEY;
    if (!SECRET) {
      return safeError(res, new Error('SETUP_SECRET_KEY env var is not set'), 'adminEndpoints');
    }

    const key = req.headers['x-init-key'] || req.body?.secretKey;
    if (
      !key ||
      key.length !== SECRET.length ||
      !require('crypto').timingSafeEqual(Buffer.from(key), Buffer.from(SECRET))
    ) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const bcrypt = require('bcryptjs');
      const email = (process.env.ADMIN_EMAIL || 'admin@alawael.com').toLowerCase().trim();
      const password = process.env.ADMIN_PASSWORD;
      if (!password) {
        return safeError(res, new Error('ADMIN_PASSWORD env var is not set'), 'adminEndpoints');
      }

      const hash = await bcrypt.hash(password, 12);
      const verifyOk = await bcrypt.compare(password, hash);
      if (!verifyOk) throw new Error('bcrypt hash verification failed');

      const collection = mongoose.connection.db.collection('users');
      const now = new Date();

      const result = await collection.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            password: hash,
            fullName: 'مدير النظام',
            role: 'admin',
            isActive: true,
            emailVerified: true,
            failedLoginAttempts: 0,
            tokenVersion: 0,
            updatedAt: now,
            requirePasswordChange: true,
          },
          $unset: { lockUntil: '', resetPasswordToken: '', resetPasswordExpires: '' },
          $setOnInsert: {
            createdAt: now,
            loginHistory: [],
            customPermissions: [],
            deniedPermissions: [],
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      const wasNew = result?.lastErrorObject?.updatedExisting === false;

      return res.json({
        success: true,
        action: wasNew ? 'created' : 'updated',
        email,
        requirePasswordChange: true,
      });
    } catch (err) {
      safeError(res, err, '[/api/_init] Error');
    }
  });

  // ── Admin Diagnostic ────────────────────────────────────────────────────
  // GET /api/_diag (header: X-Init-Key)
  // ⚠️  SECURITY: Disabled in production. Never expose password hashes.
  app.get('/api/_diag', async (req, res) => {
    if (isProd) {
      return res.status(403).json({ success: false, message: 'Disabled in production' });
    }

    const SECRET = process.env.SETUP_SECRET_KEY;
    if (!SECRET) {
      return safeError(res, new Error('SETUP_SECRET_KEY env var is not set'), 'adminEndpoints');
    }

    const key = req.headers['x-init-key'];
    if (
      !key ||
      key.length !== SECRET.length ||
      !require('crypto').timingSafeEqual(Buffer.from(key), Buffer.from(SECRET))
    ) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const email = (process.env.ADMIN_EMAIL || 'admin@alawael.com.sa').toLowerCase().trim();
      const collection = mongoose.connection.db.collection('users');

      const user = await collection.findOne({ email });
      const adminCount = await collection.countDocuments({ role: 'admin' });

      return res.json({
        success: true,
        targetEmail: email,
        userFound: !!user,
        role: user?.role,
        isActive: user?.isActive,
        hasPassword: !!user?.password,
        failedLoginAttempts: user?.failedLoginAttempts,
        isLocked: !!(user?.lockUntil && user.lockUntil > new Date()),
        totalAdmins: adminCount,
        mongoState: mongoose.connection.readyState,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      safeError(res, err, '[/api/_diag] Error');
    }
  });
}

module.exports = { setupAdminEndpoints };
