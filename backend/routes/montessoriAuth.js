const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const _logger = require('../utils/logger');
const User = require('../models/User');
const { jwtSecret } = require('../config/secrets');
const router = express.Router();

const JWT_EXPIRE = process.env.JWT_ACCESS_EXPIRY || process.env.JWT_EXPIRES_IN || '15m';

// Async error safety wrapper
const wrapAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// تسجيل الدخول (إرجاع JWT)
router.post(
  '/login',
  wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select('-twoFactorSecret -password');
    if (!user) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, jti: crypto.randomUUID() },
      jwtSecret,
      { expiresIn: JWT_EXPIRE }
    );
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  })
);

module.exports = router;
