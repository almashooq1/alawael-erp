const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Use in-memory User model when using mock DB
let User;
if (process.env.USE_MOCK_DB === 'true') {
  console.log('📝 Auth routes using In-Memory User model');
  User = require('../../models/User.memory');
} else {
  console.log('🗄️  Auth routes using MongoDB User model');
  User = require('../../models/User');
}
const { authLimiter, passwordLimiter, createAccountLimiter } = require('../../middleware/rateLimiter');
const { validateRegistration, validatePasswordChange } = require('../../middleware/validation');
const { logSecurityEvent, getClientIP } = require('../../utils/security');
const { authenticateToken } = require('../../middleware/auth');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', createAccountLimiter, validateRegistration, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (role defaults to 'user', but can be overridden for testing)
    const user = await User.create({
      email,
      password: hashedPassword,
      fullName,
      role: role || 'user',
    });

    logSecurityEvent('USER_REGISTERED', {
      userId: user.id,
      email: user.email,
      ip: getClientIP(req),
    });

    // Generate token
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '7d',
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Registration successful',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ Login failed: User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User found:', email);
    console.log('   Has password field:', !!user.password);
    console.log('   Password length:', user.password ? user.password.length : 0);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('   Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.error('❌ Login failed: Invalid password for email:', email);
      logSecurityEvent('FAILED_LOGIN', {
        email,
        ip: getClientIP(req),
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '7d',
    });

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
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message,
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

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    return res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    console.error('Token refresh error:', error);
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
router.post('/logout', authenticateToken, (req, res) => {
  logSecurityEvent('USER_LOGOUT', {
    userId: req.user.userId,
    ip: getClientIP(req),
  });

  return res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
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
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
});

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
    console.error('Update profile error:', error);
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
router.post('/change-password', authenticateToken, passwordLimiter, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
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

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    logSecurityEvent('PASSWORD_CHANGED', {
      userId: user.id,
      ip: getClientIP(req),
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
});

module.exports = router;
