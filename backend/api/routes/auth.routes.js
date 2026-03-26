/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const logger = require('../../utils/logger');

// Use in-memory User model when using mock DB
let User;
if (process.env.USE_MOCK_DB === 'true') {
  logger.info('Auth routes using In-Memory User model');
  User = require('../../models/User.memory');
} else {
  logger.info('Auth routes using MongoDB User model');
  User = require('../../models/User');
}
const {
  authLimiter,
  passwordLimiter,
  createAccountLimiter,
} = require('../../middleware/rateLimiter');
const { validateRegistration, validatePasswordChange } = require('../../middleware/validation');
const { logSecurityEvent, getClientIP } = require('../../utils/security');
const { authenticateToken } = require('../../middleware/auth');
const tokenBlacklist = require('../../utils/tokenBlacklist');
const { jwtSecret, jwtRefreshSecret } = require('../../config/secrets');

// JWT
const JWT_SECRET = jwtSecret;
const JWT_REFRESH_SECRET = jwtRefreshSecret;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', createAccountLimiter, validateRegistration, async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logSecurityEvent('REGISTRATION_ATTEMPT_EXISTING_EMAIL', {
        email,
        ip: getClientIP(req),
      });
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password before creating user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user — role is always 'user'; admin roles must be assigned by an admin
    const user = await User.create({
      email,
      password: hashedPassword,
      fullName,
      role: 'user',
    });

    logSecurityEvent('USER_REGISTERED', {
      userId: user.id,
      email: user.email,
      ip: getClientIP(req),
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Registration successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user — must select password explicitly (field has select: false)
    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');
    if (!user) {
      logger.error('❌ Login failed: User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logSecurityEvent('LOGIN_LOCKED_ACCOUNT', {
        email,
        ip: getClientIP(req),
        lockUntil: user.lockUntil,
      });
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts (may trigger lock)
      await user.incLoginAttempts();
      logger.error('❌ Login failed: Invalid password for email:', email);
      logSecurityEvent('FAILED_LOGIN', {
        email,
        ip: getClientIP(req),
        failedAttempts: user.failedLoginAttempts + 1,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Successful login — reset failed attempts
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    logSecurityEvent('LOGIN_SUCCESS', {
      email,
      ip: getClientIP(req),
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error('❌ Login error:', error.message);
    logger.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Check if refresh token has been blacklisted (token rotation)
    const isBlacklisted = await tokenBlacklist.has(refreshToken);
    if (isBlacklisted) {
      logger.warn('Attempted reuse of rotated refresh token', { userId: decoded.userId });
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Blacklist the old refresh token (rotation)
    const oldTtl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 604800;
    if (oldTtl > 0) {
      await tokenBlacklist.add(refreshToken, oldTtl);
    }

    // Generate new token pair
    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const newRefreshToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    logger.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Blacklist the current token so it cannot be reused
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const decoded = jwt.decode(token);
      const ttl = decoded && decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
      if (ttl > 0) {
        await tokenBlacklist.add(token, ttl);
      }
    }

    logSecurityEvent('USER_LOGOUT', {
      userId: req.user.userId,
      ip: getClientIP(req),
    });

    return res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.json({
      success: true,
      message: 'Logout successful',
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
const getProfileHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
};
router.get('/me', authenticateToken, getProfileHandler);
router.get('/profile', authenticateToken, getProfileHandler);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (fullName) user.fullName = fullName;
    await user.save();

    logSecurityEvent('PROFILE_UPDATED', {
      userId: user.id,
      ip: getClientIP(req),
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticateToken,
  passwordLimiter,
  validatePasswordChange,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        logSecurityEvent('PASSWORD_CHANGE_FAILED', {
          userId: user.id,
          ip: getClientIP(req),
        });
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Hash new password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      // Increment tokenVersion to invalidate all existing tokens for this user
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      // Blacklist the current access token so it can't be reused
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const decoded = jwt.decode(token);
        const ttl = decoded && decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
        if (ttl > 0) {
          await tokenBlacklist.add(token, ttl);
        }
      }

      logSecurityEvent('PASSWORD_CHANGED', {
        userId: user.id,
        ip: getClientIP(req),
      });

      // Issue fresh tokens so the user stays logged in with the new password
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );
      const newRefreshToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      return res.json({
        success: true,
        statusCode: 200,
        message: 'Password changed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      logger.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to change password',
      });
    }
  }
);

module.exports = router;
