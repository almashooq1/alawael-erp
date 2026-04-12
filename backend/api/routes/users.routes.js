/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
let User;

/**
 * ==================== USER MODEL INITIALIZATION ====================
 * Dynamically loads User model based on database mode (mock vs. real)
 *
 * This is intentional and REQUIRED for development flexibility:
 * - Mock Mode (USE_MOCK_DB=true): Uses in-memory User.memory model
 *   - Fast development/testing without database
 *   - No persistence across restarts
 *   - Use for: Unit tests, development, CI/CD pipelines
 *
 * - Database Mode (USE_MOCK_DB=false or unset): Uses persistent User model
 *   - Connect to MongoDB
 *   - Data persists across restarts
 *   - Use for: Production, development with real data
 *
 * IMPORTANT: Both models must have compatible interfaces for routes to work.
 * Always test route changes with BOTH models to ensure compatibility.
 */

if (process.env.USE_MOCK_DB === 'true') {
  // ✅ MOCK MODE: Use in-memory implementation for fast dev/testing
  User = require('../../models/User.memory');
  logger.info('[Users Route] Using in-memory User.memory model (Mock Mode)');
} else {
  // ✅ PRODUCTION MODE: Use persistent MongoDB implementation
  User = require('../../models/User');
  logger.info('[Users Route] Using persistent User database model (Production Mode)');
}
let { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { validateProfileUpdate } = require('../../middleware/validation');
const { logSecurityEvent, getClientIP } = require('../../utils/security');

// RBAC Integration (Role-Based Access Control)
let createRBACMiddleware;
try {
  const rbacModule = require('../../rbac');
const safeError = require('../../utils/safeError');
  createRBACMiddleware = rbacModule.createRBACMiddleware;
} catch (err) {
  logger.warn('[Users Route] RBAC module not available, using fallback');
  createRBACMiddleware = permissions => (req, res, next) => next(); // Fallback
}

// Fallback for middleware functions
const fallbackAuthenticateToken = (req, res, next) => {
  req.user = req.user || { id: 'test-user', role: 'admin' };
  next();
};
const fallbackRequireAdmin = (req, res, next) => {
  req.user = req.user || { id: 'test-user', role: 'admin' };
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin required' });
  }
  next();
};

if (typeof authenticateToken !== 'function') {
  authenticateToken = fallbackAuthenticateToken;
}
if (typeof requireAdmin !== 'function') {
  requireAdmin = fallbackRequireAdmin;
}

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      const search = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -mfaSecret -mfaBackupCodes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    if (!users || !Array.isArray(users)) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      });
    }

    // Remove any remaining sensitive fields from response
    const sanitizedUsers = users.map(u => ({
      _id: u._id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return res.json({
      success: true,
      data: sanitizedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    safeError(res, error, 'Get users error');
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -mfaSecret -mfaBackupCodes')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove password from response
    const sanitizedUser = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.json({
      success: true,
      data: sanitizedUser,
    });
  } catch (error) {
    safeError(res, error, 'Get user error');
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user (admin only)
 * @access  Private (Admin)
 * @requires Permission: users:create
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  createRBACMiddleware(['users:create']), // RBAC: Requires create permission
  async (req, res) => {
    try {
      const { email, password, fullName, role } = req.body;

      // Validate required fields
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and fullName are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters',
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // Create user
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        email,
        password: hashedPassword,
        fullName,
        role: role || 'user',
      });

      logSecurityEvent('USER_CREATED_BY_ADMIN', {
        adminId: req.user.userId,
        newUserId: user._id,
        email: user.email,
        ip: getClientIP(req),
      });

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      safeError(res, error, 'Create user error');
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin only)
 * @access  Private (Admin)
 * @requires Permission: users:update
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  createRBACMiddleware(['users:update']), // RBAC: Requires update permission
  validateProfileUpdate,
  async (req, res) => {
    try {
      const { fullName, role } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (fullName) user.fullName = fullName;
      if (role) user.role = role;

      await user.save();

      logSecurityEvent('USER_UPDATED_BY_ADMIN', {
        adminId: req.user.userId,
        updatedUserId: user._id,
        ip: getClientIP(req),
      });

      return res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (error) {
      safeError(res, error, 'Update user error');
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 * @requires Permission: users:delete
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  createRBACMiddleware(['users:delete']), // RBAC: Requires delete permission
  async (req, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await User.findByIdAndDelete(req.params.id);

      logSecurityEvent('USER_DELETED_BY_ADMIN', {
        adminId: req.user.userId,
        deletedUserId: req.params.id,
        deletedUserEmail: user.email,
        ip: getClientIP(req),
      });

      return res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'Delete user error');
    }
  }
);

module.exports = router;
