/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const logger = require('../../utils/logger');

// Always use MongoDB User model for auth
const User = require('../../models/User');
logger.info('Auth routes using MongoDB User model');
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
const safeError = require('../../utils/safeError');

// Session model for concurrent-session tracking
let Session;
try {
  Session = require('../../models/Session');
} catch {
  Session = null;
}

// Unified email service
let emailManager;
try {
  const { emailManager: em } = require('../../services/email');
  emailManager = em;
} catch {
  emailManager = null;
}

// Max concurrent sessions per user (configurable via env)
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10) || 5;

// bcrypt rounds — reduced in test env (4 vs 12 = 256x faster) to prevent CI slowness
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

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
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        ip: getClientIP(req),
      });
      return res.status(400).json({
        success: false,
        message: 'Registration failed. Please check your details and try again.',
      });
    }

    // Hash password before creating user (cost factor 12 per security audit)
    const salt = await bcrypt.genSalt(12);
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

    // Send welcome email (non-blocking)
    if (emailManager) {
      emailManager.sendWelcome(user.email, { fullName, email }).catch(err => {
        logger.error('Failed to send welcome email:', err.message);
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh',
        jti: crypto.randomUUID(),
      },
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
    safeError(res, error, 'Registration error');
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
      logger.error(
        '❌ Login failed: User not found for email:',
        email.replace(/(.{2}).*(@.*)/, '$1***$2')
      );
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

    // Check password — guard against null/undefined stored hash
    if (!user.password) {
      logger.error(
        '❌ Login failed: User has no password stored for email:',
        email.replace(/(.{2}).*(@.*)/, '$1***$2')
      );
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptErr) {
      logger.error('❌ bcrypt.compare error:', bcryptErr.message, '— resetting password flag');
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      // Increment failed attempts (may trigger lock)
      await user.incLoginAttempts();
      logger.error(
        '❌ Login failed: Invalid password for email:',
        email.replace(/(.{2}).*(@.*)/, '$1***$2')
      );
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

    // Generate token with unique jti for per-token revocation
    const accessJti = crypto.randomUUID();
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti: accessJti },
      JWT_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      }
    );

    // Generate refresh token with unique jti
    const refreshJti = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: 'refresh', jti: refreshJti },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Track session in database (concurrent session management)
    if (Session) {
      try {
        // Enforce concurrent session limit
        const activeSessions = await Session.countDocuments({ userId: user._id, isActive: true });
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
          // Deactivate oldest session
          const oldest = await Session.findOne({ userId: user._id, isActive: true }).sort({
            createdAt: 1,
          });
          if (oldest) await oldest.terminate();
        }
        await Session.create({
          userId: user._id,
          token: accessJti,
          refreshToken: refreshJti,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
      } catch (sessionErr) {
        logger.warn('Session tracking failed (non-blocking):', sessionErr.message);
      }
    }

    logSecurityEvent('LOGIN_SUCCESS', {
      email,
      ip: getClientIP(req),
    });

    // Send login alert email (non-blocking)
    if (emailManager) {
      emailManager
        .sendLoginAlert(user.email, {
          fullName: user.fullName,
          ip: getClientIP(req),
          userAgent: req.headers['user-agent'] || 'Unknown',
          time: new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }),
        })
        .catch(err => {
          logger.error('Failed to send login alert email:', err.message);
        });
    }

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
    safeError(res, error, '❌ Login error');
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

    // Generate new token pair with unique jti claims
    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const newRefreshToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        type: 'refresh',
        jti: crypto.randomUUID(),
      },
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

    safeError(res, error, 'Token refresh error');
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
    safeError(res, error, 'Get profile error');
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

    // Validate & sanitize input
    if (fullName !== undefined) {
      if (
        typeof fullName !== 'string' ||
        fullName.trim().length < 2 ||
        fullName.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be between 2 and 100 characters',
        });
      }
    }

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
    safeError(res, error, 'Update profile error');
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

      // Hash new password before saving (cost factor 12 per security audit)
      const salt = await bcrypt.genSalt(12);
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

      // Send password change notification email (non-blocking)
      if (emailManager) {
        emailManager
          .sendNotification(user.email, {
            title: 'تم تغيير كلمة المرور',
            message: `تم تغيير كلمة المرور الخاصة بحسابك بنجاح. إذا لم تقم بهذا التغيير، يرجى التواصل مع الدعم الفني فوراً.`,
            fullName: user.fullName,
          })
          .catch(err => {
            logger.error('Failed to send password change notification:', err.message);
          });
      }

      // Issue fresh tokens so the user stays logged in with the new password
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );
      const newRefreshToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          type: 'refresh',
          jti: crypto.randomUUID(),
        },
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
      safeError(res, error, 'Change password error');
    }
  }
);

// ─── Forgot Password ────────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post('/forgot-password', passwordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Always return the same response to prevent email enumeration
    const genericMsg = 'If that email is registered, a reset link has been sent.';

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) {
      logSecurityEvent('FORGOT_PASSWORD_UNKNOWN_EMAIL', { ip: getClientIP(req) });
      return res.json({ success: true, message: genericMsg });
    }

    // Generate cryptographic reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email (non-blocking — failure does NOT expose existence)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    if (emailManager) {
      emailManager
        .sendPasswordReset(user.email, {
          fullName: user.fullName,
          resetUrl,
          resetToken,
          expiresIn: '60 دقيقة',
        })
        .catch(err => {
          logger.error('Failed to send reset email:', err.message);
        });
    }

    logSecurityEvent('FORGOT_PASSWORD_REQUESTED', {
      userId: user.id,
      ip: getClientIP(req),
    });

    return res.json({ success: true, message: genericMsg });
  } catch (error) {
    safeError(res, error, 'Forgot password error');
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', passwordLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Token and new password are required' });
    }

    // Enforce password complexity (same rules as registration)
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, and a number',
      });
    }

    // Hash the token and find user
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Hash and save new password (cost factor 12 per security audit)
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordChangedAt = new Date();
    await user.save();

    // Terminate all existing sessions
    if (Session) {
      await Session.terminateAllForUser(user._id).catch(() => {});
    }

    logSecurityEvent('PASSWORD_RESET_SUCCESS', {
      userId: user.id,
      ip: getClientIP(req),
    });

    // Send password reset confirmation email (non-blocking)
    if (emailManager) {
      emailManager
        .sendNotification(user.email, {
          title: 'تم إعادة تعيين كلمة المرور',
          message:
            'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة. تم إنهاء جميع الجلسات النشطة السابقة لحماية حسابك.',
          fullName: user.fullName,
        })
        .catch(err => {
          logger.error('Failed to send password reset confirmation:', err.message);
        });
    }

    return res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (error) {
    safeError(res, error, 'Reset password error');
  }
});

// ─── Session Management ─────────────────────────────────────────────────────
/**
 * @route   GET /api/auth/sessions
 * @desc    List current user's active sessions
 * @access  Private
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    if (!Session) {
      return res.json({ success: true, data: [] });
    }
    const sessions = await Session.getActiveSessions(req.user.userId);
    return res.json({
      success: true,
      data: sessions.map(s => ({
        id: s._id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    safeError(res, error, 'List sessions error');
  }
});

/**
 * @route   DELETE /api/auth/sessions/:id
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    if (!Session) {
      return res.json({ success: true, message: 'Session revoked' });
    }
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    await session.terminate();
    // Blacklist the token so it cannot be reused
    if (session.token) {
      await tokenBlacklist.add(`jti:${session.token}`, 86400).catch(() => {});
    }
    logSecurityEvent('SESSION_REVOKED', {
      userId: req.user.userId,
      sessionId: req.params.id,
      ip: getClientIP(req),
    });
    return res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    safeError(res, error, 'Revoke session error');
  }
});

module.exports = router;
