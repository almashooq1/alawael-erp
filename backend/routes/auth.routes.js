/**
 * Authentication Routes
 * Login, logout, token refresh, and user authentication endpoints
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { verifyToken, loginRateLimit } = require('../middleware/authMiddleware');

// Mock user database - Replace with actual User model in production
const USERS_DB = {
  'admin@financeserp.com': {
    userId: '507f1f77bcf86cd799439011',
    email: 'admin@financeserp.com',
    name: 'Admin User',
    role: 'admin',
    passwordHash: '$2a$10$...', // bcryptjs hash
  },
};

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user (replace with database query)
    const user = USERS_DB[email];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const passwordCheck = await AuthService.comparePassword(password, user.passwordHash);

    if (!passwordCheck.success || !passwordCheck.match) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessTokenResult = AuthService.generateToken(
      user.userId,
      user.email,
      user.role
    );

    const refreshTokenResult = AuthService.generateRefreshToken(user.userId);

    if (!accessTokenResult.success || !refreshTokenResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authentication tokens',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        accessToken: accessTokenResult.token,
        refreshToken: refreshTokenResult.token,
        expiresIn: accessTokenResult.expiresIn,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message,
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const verification = AuthService.verifyToken(refreshToken);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    const { decoded } = verification;

    // Generate new access token
    const newAccessToken = AuthService.generateToken(
      decoded.userId,
      decoded.email,
      decoded.role
    );

    if (!newAccessToken.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate new access token',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken.token,
        expiresIn: newAccessToken.expiresIn,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      details: error.message,
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (token invalidation in production)
 */
router.post('/logout', verifyToken, (req, res) => {
  try {
    // In production, implement token blacklisting or revocation
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: error.message,
    });
  }
});

/**
 * GET /auth/verify
 * Verify current token and return user info
 */
router.get('/verify', verifyToken, (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        tokenExpires: new Date(req.user.exp * 1000),
        isValid: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      details: error.message,
    });
  }
});

/**
 * GET /auth/profile
 * Get authenticated user's profile
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // Fetch user from database
    const user = USERS_DB[req.user.email];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      details: error.message,
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    // In production, implement actual password change with database update
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Password change failed',
      details: error.message,
    });
  }
});

module.exports = router;
