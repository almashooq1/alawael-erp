/**
 * Authentication Routes - alawael-backend Professional Upgrade
 * مسارات المصادقة - الترقية الاحترافية
 * 
 * ** UPGRADE: Using Singleton Pattern **
 * All routes use singleton instances for consistency
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import singleton instances
const { getAuthenticationService, getOAuth2Provider, getSecurityService } = require('../../services/services.singleton');
const { authenticateToken, generateToken } = require('../../middleware/auth.middleware');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

/**
 * Register Route
 * POST /auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
    }

    // Get authentication service singleton
    const authService = getAuthenticationService();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (mock implementation)
    const user = {
      id: `user-${Date.now()}`,
      email,
      name,
      phone,
      password: hashedPassword,
      role: 'user',
      permissions: ['read', 'create-own'],
      createdAt: new Date(),
    };

    // Generate token using singleton
    const tokenResult = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: tokenResult.token,
      expiresIn: tokenResult.expiresIn,
    });
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Login Route
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Get services from singleton
    const authService = getAuthenticationService();
    const securityService = getSecurityService();

    // Mock user lookup (replace with DB query)
    const user = {
      id: 'user-123',
      email: email,
      name: 'Test User',
      role: 'user',
      permissions: ['read', 'create-own'],
    };

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRE,
    });
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Refresh Token Route
 * POST /auth/refresh
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

      const newAccessToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      return res.json({
        success: true,
        accessToken: newAccessToken,
        expiresIn: JWT_EXPIRE,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }
  } catch (error) {
    console.error('[REFRESH] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Logout Route
 * POST /auth/logout
 */
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // Invalidate token (add to blacklist if needed)
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Current User Route
 * GET /auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('[ME] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * OAuth Callback Route
 * GET /auth/oauth/callback?code=...
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required',
      });
    }

    // Get OAuth provider from singleton
    const oauth2Provider = getOAuth2Provider();

    // Exchange code for token
    const tokenResult = await oauth2Provider.exchangeCodeForToken('google', code);

    if (!tokenResult || !tokenResult.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to exchange code for token',
      });
    }

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/callback?token=${tokenResult.accessToken}`);
  } catch (error) {
    console.error('[OAUTH_CALLBACK] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * OAuth Login Route
 * GET /auth/oauth/google
 */
router.get('/oauth/google', (req, res) => {
  try {
    const oauth2Provider = getOAuth2Provider();
    const googleAuthURL = oauth2Provider.getGoogleAuthURL?.();

    if (!googleAuthURL) {
      return res.status(500).json({
        success: false,
        error: 'OAuth not configured',
      });
    }

    return res.redirect(googleAuthURL);
  } catch (error) {
    console.error('[OAUTH_GOOGLE] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
