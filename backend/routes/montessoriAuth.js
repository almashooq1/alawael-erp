'use strict';
/**
 * Montessori Auth Routes — مصادقة نظام مونتيسوري
 * Provides Montessori-specific login flow (separate from main auth)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// POST /api/montessori-auth/login
// Montessori-specific login.
// Hardening (W412):
//   1. `loginLimiter` (5/15min per IP) — sister of the main /sso/login
//      gate; without it this side-door endpoint was exposed to
//      unlimited credential-stuffing.
//   2. Refuse to sign if JWT_SECRET is unset — the previous code passed
//      `undefined` straight through to jsonwebtoken which creates an
//      unverifiable token (the verifier later rejects it, but the
//      token IS issued, polluting clients).
//   3. Catch-all returns generic 500 — `err.message` previously leaked
//      stack-trace strings (model field names, query shapes) to anyone
//      able to trigger an unhandled throw.
router.post('/login', loginLimiter, async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      logger.error('[montessoriAuth] JWT_SECRET not configured — refusing to issue token');
      return res.status(503).json({ success: false, message: 'الخدمة غير مكوّنة بعد' });
    }
    const User = require('../models/User');
    const jwt = require('jsonwebtoken');
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const user = await User.findOne({
      username,
      role: { $in: ['montessori_teacher', 'montessori_admin', 'admin'] },
    }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign(
      { _id: user._id, username: user.username, role: user.role, system: 'montessori' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({
      success: true,
      data: { token, user: { _id: user._id, username: user.username, role: user.role } },
    });
  } catch (err) {
    logger.error('[montessoriAuth] login failure', { message: err.message });
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// POST /api/montessori-auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    logger.error('[montessoriAuth] logout failure', { message: err.message });
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// GET /api/montessori-auth/session
router.get('/session', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user, system: 'montessori' } });
  } catch (err) {
    logger.error('[montessoriAuth] session failure', { message: err.message });
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// GET /api/montessori-auth/classrooms
// Returns classrooms accessible to the authenticated Montessori user
router.get('/classrooms', authenticate, async (req, res) => {
  try {
    const Classroom = require('../models/Montessori/Classroom');
    const filter = req.user.role === 'montessori_teacher' ? { teacherId: req.user._id } : {};
    const classrooms = await Classroom.find(filter).lean();
    res.json({ success: true, data: classrooms });
  } catch (err) {
    logger.error('[montessoriAuth] classrooms failure', { message: err.message });
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
