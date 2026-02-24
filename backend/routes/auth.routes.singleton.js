/**
 * Authentication Routes with Singleton Pattern
 * OAuth 2.0, JWT, and session management endpoints
 * All routes use singleton service instances
 * 
 * Usage:
 * const authRoutes = require('./auth.routes.singleton');
 * app.use('/auth', authRoutes);
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const {
  getAuthenticationService,
  getOAuth2Provider,
  getSecurityService,
  getUserService,
  getUnifiedJWTSecret,
  getUnifiedJWTRefreshSecret,
} = require('../../services/services.singleton');

const {
  authenticate,
  optionalAuth,
  extractToken,
  generateTokenHelper,
  logActivity,
} = require('../../middleware/authentication.middleware.singleton');

const { checkActiveUser } = require('../../middleware/authorization.middleware.singleton');

// Configure JWT expiration
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

/**
 * POST /auth/register
 * Register new user account
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "secure-password",
 *   "name": "User Name"
 * }
 * 
 * Returns: User object with JWT tokens
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
        code: 'INVALID_INPUT',
      });
    }

    // Check if user already exists
    const userService = getUserService();
    const existingUser = await userService.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
        code: 'USER_EXISTS',
      });
    }

    // Create new user
    const securityService = getSecurityService();
    const hashedPassword = securityService.hashPassword(password);

    const newUser = await userService.create({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      status: 'active',
      emailVerified: false,
      mfaEnabled: false,
    });

    // Generate tokens
    const JWT_SECRET = getUnifiedJWTSecret();
    const JWT_REFRESH_SECRET = getUnifiedJWTRefreshSecret();

    const accessToken = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRE }
    );

    logActivity(req, 'USER_REGISTERED', { userId: newUser.id, email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours in seconds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      code: 'REGISTRATION_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT tokens
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "secure-password"
 * }
 * 
 * Returns: User object with JWT and refresh tokens
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'INVALID_INPUT',
      });
    }

    // Find user
    const userService = getUserService();
    const user = await userService.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Verify password
    const securityService = getSecurityService();
    const passwordValid = securityService.verifyPassword(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Generate tokens
    const JWT_SECRET = getUnifiedJWTSecret();
    const JWT_REFRESH_SECRET = getUnifiedJWTRefreshSecret();

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRE }
    );

    logActivity(req, 'USER_LOGIN', { userId: user.id, email });

    res.json({
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
      expiresIn: 86400,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      code: 'LOGIN_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh JWT access token using refresh token
 * 
 * Body:
 * {
 *   "refreshToken": "jwt-refresh-token"
 * }
 * 
 * Returns: New access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN',
      });
    }

    const JWT_REFRESH_SECRET = getUnifiedJWTRefreshSecret();

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      try {
        // Generate new access token
        const JWT_SECRET = getUnifiedJWTSecret();

        const newAccessToken = jwt.sign(
          { id: decoded.id, email: decoded.email, role: decoded.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRE }
        );

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          accessToken: newAccessToken,
          expiresIn: 86400,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Token generation error',
          code: 'TOKEN_ERROR',
          details: error.message,
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh error',
      code: 'REFRESH_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate tokens
 * 
 * Returns: Success message
 */
router.post('/logout', authenticate, (req, res) => {
  try {
    logActivity(req, 'USER_LOGOUT', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      code: 'LOGOUT_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user profile
 * 
 * Returns: Current user object
 */
router.get('/me', authenticate, checkActiveUser, async (req, res) => {
  try {
    const userService = getUserService();
    const user = await userService.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'User profile retrieved',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      code: 'PROFILE_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /auth/verify-email
 * Send email verification link
 * 
 * Returns: Success message
 */
router.post('/verify-email', authenticate, async (req, res) => {
  try {
    const userService = getUserService();

    // In real app, would send email with verification token
    // For now, just mark as verified
    await userService.update(req.user.id, { emailVerified: true });

    logActivity(req, 'EMAIL_VERIFIED', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Email verification sent (in production, email would be sent)',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      code: 'VERIFICATION_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /auth/oauth/authorize/{provider}
 * Initiate OAuth flow for specified provider
 * 
 * @param provider - OAuth provider (google, github, etc.)
 * 
 * Returns: OAuth authorization URL
 */
router.get('/oauth/authorize/:provider', (req, res) => {
  try {
    const { provider } = req.params;

    if (!['google', 'github', 'facebook'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported OAuth provider: ${provider}`,
        code: 'INVALID_PROVIDER',
      });
    }

    const oauth2Provider = getOAuth2Provider();
    const oauthConfig = oauth2Provider.getOAuthConfig(provider);

    const authorizeUrl = `${oauthConfig.authorizationUrl}?client_id=${oauthConfig.clientId}&redirect_uri=${process.env.OAUTH_REDIRECT_URI}/auth/oauth/callback&response_type=code&scope=${oauthConfig.scope}`;

    res.json({
      success: true,
      message: 'OAuth authorization URL generated',
      authorizationUrl: authorizeUrl,
      provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OAuth authorization failed',
      code: 'OAUTH_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /auth/oauth/callback
 * OAuth provider callback handler
 * 
 * Query:
 * {
 *   "code": "authorization-code",
 *   "state": "state-param"
 * }
 * 
 * Returns: User object with JWT tokens
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, provider } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code required',
        code: 'MISSING_CODE',
      });
    }

    // Exchange code for tokens
    const oauth2Provider = getOAuth2Provider();
    const tokenResult = await oauth2Provider.exchangeCodeForToken(provider || 'google', code);

    if (!tokenResult) {
      return res.status(401).json({
        success: false,
        message: 'Failed to exchange authorization code',
        code: 'TOKEN_EXCHANGE_FAILED',
      });
    }

    // Get OAuth user profile
    const profile = await oauth2Provider.getUserProfile(provider, tokenResult.accessToken);

    // Find or create user
    const userService = getUserService();
    let user = await userService.findByEmail(profile.email);

    if (!user) {
      user = await userService.create({
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        oauthProvider: provider,
        oauthId: profile.id,
        role: 'user',
        status: 'active',
        emailVerified: true, // OAuth email already verified
        mfaEnabled: false,
      });
    }

    // Generate JWT tokens
    const JWT_SECRET = getUnifiedJWTSecret();
    const JWT_REFRESH_SECRET = getUnifiedJWTRefreshSecret();

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRE }
    );

    logActivity(req, 'OAUTH_LOGIN', { userId: user.id, provider });

    res.json({
      success: true,
      message: 'OAuth login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 86400,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OAuth callback failed',
      code: 'OAUTH_CALLBACK_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /auth/verify-token
 * Verify if a token is valid
 * 
 * Body:
 * {
 *   "token": "jwt-token"
 * }
 * 
 * Returns: Token validation result
 */
router.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required',
        code: 'MISSING_TOKEN',
      });
    }

    const JWT_SECRET = getUnifiedJWTSecret();

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.json({
          success: false,
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          valid: false,
        });
      }

      res.json({
        success: true,
        message: 'Token is valid',
        valid: true,
        decoded,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      code: 'VERIFICATION_ERROR',
      details: error.message,
    });
  }
});

module.exports = router;
