/**
 * نظام الأصول ERP - مسار المصادقة
 * الإصدار 2.0.0
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { UnauthorizedError, ValidationError } = require('../errors/AppError');
const tokenBlacklist = require('../utils/tokenBlacklist');
const { authenticateToken } = require('../middleware/auth');
const { jwtSecret, jwtRefreshSecret } = require('../config/secrets');
const User = require('../models/User');
const { flattenPermissions, ROLE_HIERARCHY, getRoleLabel } = require('../config/rbac.config');

// JWT
const JWT_SECRET = jwtSecret;
const JWT_REFRESH_SECRET = jwtRefreshSecret;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * @route   POST /api/v1/auth/login
 * @desc    تسجيل الدخول
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { email, password } = req.body;

      // Look up user from database
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new UnauthorizedError('بيانات الدخول غير صحيحة');
      }

      // Verify password using bcrypt
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new UnauthorizedError('بيانات الدخول غير صحيحة');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // Build permissions from role + custom overrides
      const permissions = flattenPermissions(
        user.role,
        user.customPermissions || [],
        user.deniedPermissions || []
      );

      // إنشاء التوكن
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, permissions },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      const refreshToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      const roleLevel = ROLE_HIERARCHY[user.role]?.level || 0;

      res.json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            roleLabel: getRoleLabel(user.role, 'ar'),
            roleLabelEn: getRoleLabel(user.role, 'en'),
            roleLevel,
            permissions,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/register
 * @desc    تسجيل مستخدم جديد
 * @access  Public
 */
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('الاسم مطلوب'),
    body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
    body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { name, email, password } = req.body;

      // Check for existing user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ValidationError('البريد الإلكتروني مسجل بالفعل');
      }

      // Save new user to database (password hashed by pre-save hook)
      const newUser = await User.create({
        fullName: name,
        email,
        password,
        role: 'user',
      });

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحساب بنجاح',
        data: { id: newUser._id, name: newUser.fullName, email: newUser.email },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    الحصول على بيانات المستخدم الحالي
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedError('المستخدم غير موجود');
    }

    const permissions = flattenPermissions(
      user.role,
      user.customPermissions || [],
      user.deniedPermissions || []
    );
    const roleLevel = ROLE_HIERARCHY[user.role]?.level || 0;

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        roleLabel: getRoleLabel(user.role, 'ar'),
        roleLabelEn: getRoleLabel(user.role, 'en'),
        roleLevel,
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    تسجيل الخروج
 * @access  Private
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const decoded = jwt.decode(token);
      if (decoded) {
        await tokenBlacklist.add(token, decoded);
      }
    }

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  } catch {
    // Even if blacklisting fails, logout should succeed
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  }
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    تجديد التوكن
 * @access  Private
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers.authorization?.split(' ')[1];

    if (!refreshToken) {
      throw new UnauthorizedError('التوكن مطلوب');
    }

    // Verify with the REFRESH secret — not the access secret
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Ensure user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('المستخدم غير موجود');
    }

    // Rebuild permissions for the refreshed token
    const permissions = flattenPermissions(
      user.role,
      user.customPermissions || [],
      user.deniedPermissions || []
    );

    // Issue a new ACCESS token (signed with access secret)
    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Optionally rotate the refresh token
    const newRefreshToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(new UnauthorizedError('توكن غير صالح'));
  }
});

module.exports = router;
