'use strict';
/**
 * Montessori Auth Routes — مصادقة نظام مونتيسوري
 * Provides Montessori-specific login flow (separate from main auth)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// POST /api/montessori-auth/login
// Montessori-specific login
router.post('/login', async (req, res) => {
  try {
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/montessori-auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
