/**
 * SSO Routes - Single Sign-On Endpoints
 * نقاط نهاية تسجيل الدخول الموحد
 */

const express = require('express');
const router = express.Router();
const SSOService = require('../services/sso.service');
const OAuthService = require('../services/oauth.service');
const {
  verifySSOToken,
  requireRole,
  requirePermission,
  verifyOptionalSSO,
  auditLog
} = require('../middleware/sso-auth.middleware');
const logger = require('../utils/logger');

console.log('[SSO] Loading SSO Routes Module...');

const ssoService = new SSOService();
const oAuthService = new OAuthService();

console.log('[SSO] Creating /status route handler...');

// ============================================
// SSO Health & Status Endpoint
// ============================================

/**
 * GET /api/sso/status
 * Get SSO system status
 */
router.get('/status', async (req, res) => {
  console.log('[SSO-HANDLER] /status endpoint hit!');
  try {
    res.json({
      success: true,
      status: 'operational',
      message: 'SSO system is operational',
      features: {
        sessions: true,
        oauth2: true,
        openid_connect: true,
        mfa: true,
        audit_logging: true
      },
      endpoints: {
        login: '/api/sso/login',
        logout: '/api/sso/logout',
        oauth2: '/api/sso/oauth2',
        userinfo: '/api/sso/oauth2/userinfo'
      }
    });
  } catch (error) {
    logger.error('SSO status check failed:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// SSO Session Management Endpoints
// ============================================

/**
 * POST /api/sso/login
 * تسجيل دخول المستخدم وإنشاء جلسة SSO
 */
router.post('/login', async (req, res) => {
  console.log('[SSO-HANDLER] /login endpoint hit!');
  console.log('[SSO-HANDLER] Body:', req.body);
  
  try {
    const { email, password, deviceId, userAgent } = req.body;

    // Validate credentials (implementation depends on your auth system)
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Email and password are required'
      });
    }

    // Authenticate user (this would call your actual auth service)
    // For now, returning mock response
    const userPayload = {
      userId: 'user_123',
      email,
      role: 'user',
      permissions: ['read'],
      organizationId: 'org_1'
    };

    // Create SSO session
    const session = await ssoService.createSession(userPayload.userId, userPayload, {
      deviceId: deviceId || 'default',
      userAgent: userAgent || req.get('user-agent'),
      ipAddress: req.ip
    });

    // Log activity
    logger.info(`User logged in via SSO: ${userPayload.userId}`);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        idToken: session.idToken,
        expiresIn: session.expiresIn,
        user: userPayload
      }
    });
  } catch (error) {
    logger.error('SSO login failed:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Login failed'
    });
  }
});

/**
 * POST /api/sso/logout
 * تسجيل الخروج وإنهاء الجلسة
 */
router.post('/logout', verifySSOToken(), async (req, res) => {
  try {
    const sessionId = req.sessionId;

    await ssoService.endSession(sessionId);

    logger.info(`User logged out: ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('SSO logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Logout failed'
    });
  }
});

/**
 * POST /api/sso/logout-all
 * تسجيل الخروج من جميع الأجهزة
 */
router.post('/logout-all', verifySSOToken(), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await ssoService.endAllUserSessions(userId);

    logger.info(`User logged out from all devices: ${userId}`);

    res.json({
      success: true,
      message: 'Logged out from all devices',
      sessionsEnded: result.sessionsEnded
    });
  } catch (error) {
    logger.error('Logout all failed:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Logout failed'
    });
  }
});

/**
 * GET /api/sso/sessions
 * الحصول على جميع جلسات المستخدم النشطة
 */
router.get('/sessions', verifySSOToken(), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const sessions = await ssoService.getUserActiveSessions(userId);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Failed to fetch sessions:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch sessions'
    });
  }
});

/**
 * DELETE /api/sso/sessions/:sessionId
 * إنهاء جلسة محددة
 */
router.delete('/sessions/:sessionId', verifySSOToken(), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify user owns this session
    const sessions = await ssoService.getUserActiveSessions(userId);
    const sessionExists = sessions.find(s => s.sessionId === sessionId);

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Session not found'
      });
    }

    await ssoService.endSession(sessionId);

    logger.info(`Session ended: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session ended'
    });
  } catch (error) {
    logger.error('Failed to end session:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to end session'
    });
  }
});

// ============================================
// Token Management Endpoints
// ============================================

/**
 * POST /api/sso/refresh-token
 * تحديث Access Token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { sessionId, refreshToken } = req.body;

    if (!sessionId || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Session ID and refresh token are required'
      });
    }

    const result = await ssoService.refreshAccessToken(sessionId, refreshToken);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: error.message
    });
  }
});

/**
 * POST /api/sso/verify-token
 * التحقق من صحة التوكن
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token, sessionId } = req.body;

    if (!token || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Token and session ID are required'
      });
    }

    const verification = await ssoService.verifySession(sessionId, token);

    res.json({
      success: true,
      data: {
        valid: verification.valid,
        user: verification.valid ? verification.user : null,
        error: verification.error
      }
    });
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(400).json({
      success: false,
      error: 'verification_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/sso/introspect
 * فحص التوكن (Token Introspection)
 */
router.get('/introspect', verifySSOToken(), async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const introspection = await ssoService.introspectToken(token);

    res.json({
      success: true,
      data: introspection
    });
  } catch (error) {
    logger.error('Token introspection failed:', error);
    res.status(400).json({
      success: false,
      error: 'introspection_failed',
      message: error.message
    });
  }
});

// ============================================
// OAuth 2.0 Endpoints
// ============================================

/**
 * GET /api/sso/oauth2/authorize
 * OAuth 2.0 Authorization endpoint
 */
router.get('/oauth2/authorize', async (req, res) => {
  try {
    const { client_id, redirect_uri, scope, state, response_type, nonce } = req.query;

    if (!client_id || !redirect_uri || !response_type) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Missing required OAuth parameters'
      });
    }

    // For demonstration, redirect to login with oauth params
    const result = await oAuthService.initiateAuthorizationCodeFlow(
      client_id,
      redirect_uri,
      scope || 'openid profile email',
      state,
      nonce
    );

    // In production, would redirect to login page
    res.json({
      success: true,
      data: {
        authUrl: `${req.baseUrl}/oauth2/login?${new URLSearchParams({
          client_id,
          redirect_uri,
          scope,
          state,
          nonce
        }).toString()}`
      }
    });
  } catch (error) {
    logger.error('OAuth authorization failed:', error);
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      message: error.message
    });
  }
});

/**
 * POST /api/sso/oauth2/token
 * OAuth 2.0 Token endpoint
 */
router.post('/oauth2/token', async (req, res) => {
  try {
    const {
      grant_type,
      code,
      client_id,
      client_secret,
      redirect_uri,
      refresh_token,
      username,
      password,
      scope
    } = req.body;

    if (!grant_type) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Grant type is required'
      });
    }

    const tokens = await oAuthService.getTokens(grant_type, {
      code,
      clientId: client_id,
      clientSecret: client_secret,
      redirectUri: redirect_uri,
      refreshToken: refresh_token,
      username,
      password,
      scope
    });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('OAuth token request failed:', error);
    res.status(400).json({
      success: false,
      error: 'invalid_grant',
      message: error.message
    });
  }
});

/**
 * GET /api/sso/oauth2/userinfo
 * OpenID Connect UserInfo endpoint
 */
router.get('/oauth2/userinfo', verifySSOToken(), async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const userInfo = await oAuthService.getUserInfo(accessToken);

    res.json(userInfo);
  } catch (error) {
    logger.error('UserInfo request failed:', error);
    res.status(401).json({
      success: false,
      error: 'invalid_token',
      message: error.message
    });
  }
});

/**
 * GET /api/sso/.well-known/openid-configuration
 * OpenID Connect Configuration
 */
router.get('/.well-known/openid-configuration', (req, res) => {
  const config = oAuthService.getOpenIDConfiguration();
  res.json(config);
});

/**
 * POST /api/sso/oauth2/revoke
 * Token revocation endpoint
 */
router.post('/oauth2/revoke', async (req, res) => {
  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Token is required'
      });
    }

    await oAuthService.revokeToken(token, token_type_hint);

    res.json({ success: true });
  } catch (error) {
    logger.error('Token revocation failed:', error);
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      message: error.message
    });
  }
});

// ============================================
// OpenID Connect Endpoints
// ============================================

/**
 * POST /api/sso/oauth2/register
 * Dynamic Client Registration
 */
router.post('/oauth2/register', async (req, res, next) => {
  try {
    const { client_name, redirect_uris, response_types, grant_types, scopes } = req.body;

    const { client, clientSecret } = await oAuthService.registerClient({
      clientName: client_name,
      redirectUris: redirect_uris,
      responseTypes: response_types,
      grantTypes: grant_types,
      scopes
    });

    res.status(201).json({
      success: true,
      data: {
        client_id: client.clientId,
        client_secret: clientSecret,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        response_types: client.responseTypes,
        grant_types: client.grantTypes,
        registration_access_token: 'registration_token', // Would be generated
        registration_client_uri: `${req.baseUrl}/oauth2/register/${client.clientId}`
      }
    });
  } catch (error) {
    logger.error('Client registration failed:', error);
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      message: error.message
    });
  }
});

// ============================================
// Session Management Endpoints
// ============================================

/**
 * GET /api/sso/me
 * الحصول على معلومات المستخدم الحالي
 */
router.get('/me', verifySSOToken(), (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

/**
 * PUT /api/sso/me
 * تحديث معلومات المستخدم
 */
router.put('/me', verifySSOToken(), async (req, res, next) => {
  try {
    const { metadata } = req.body;
    const sessionId = req.sessionId;

    const updatedSession = await ssoService.updateSessionMetadata(sessionId, metadata);

    res.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    logger.error('Failed to update user:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to update user'
    });
  }
});

module.exports = router;
