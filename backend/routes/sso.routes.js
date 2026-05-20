/**
 * SSO Routes - Single Sign-On Endpoints
 * نقاط نهاية تسجيل الدخول الموحد
 *
 * W205 hardening:
 *  - /login enforces isActive + isLocked + incLoginAttempts + resetLoginAttempts,
 *    and short-circuits to a 2-step MFA flow when the user has MFA enabled.
 *  - /oauth2/authorize requires a valid SSO session (no more pre-login codes),
 *    accepts code_challenge + code_challenge_method (PKCE).
 *  - /oauth2/token forwards code_verifier so PKCE is enforced end-to-end.
 *  - /me re-reads the user from the DB so role/permissions can't go stale.
 *  - /mfa/verify completes the 2-step login flow.
 */

const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const SSOService = require('../services/sso.service');
const OAuthService = require('../services/oauth.service');
const ssoKeys = require('../services/ssoKeys.service');
const OAuthClient = require('../models/OAuthClient');
const SsoAuditEvent = require('../models/SsoAuditEvent');
const { recordAudit, recordAuditFailure } = require('../services/ssoAudit.service');
const { verifySSOToken, requireRole } = require('../middleware/sso-auth.middleware');

const ADMIN_ROLES = ['super_admin', 'head_office_admin', 'ceo', 'it_admin', 'admin'];
const adminOnly = requireRole(ADMIN_ROLES);
const logger = require('../utils/logger');
const User = require('../models/User');
const { loginLimiter, sensitiveOperationLimiter } = require('../middleware/rateLimiter');
const safeError = require('../utils/safeError');

const ssoService = new SSOService();
const oAuthService = new OAuthService();

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildUserPayload(user) {
  return {
    userId: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    permissions: user.customPermissions || [],
    branchId: user.branchId ? user.branchId.toString() : null,
    regionIds: (user.regionIds || []).map(r => r.toString()),
    mfaEnabled: !!user.mfa?.enabled,
  };
}

/**
 * Sanitised public profile — never includes password / mfa secret / reset
 * fields. Safe to return to /me callers.
 */
function buildPublicProfile(user) {
  const obj = user.toJSON ? user.toJSON() : user;
  delete obj.password;
  delete obj.passwordHistory;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  if (obj.mfa) {
    delete obj.mfa.secret;
    delete obj.mfa.backupCodes;
    delete obj.mfa.smsCode;
    delete obj.mfa.smsCodeExpires;
    delete obj.mfa.trustedDevices;
  }
  return obj;
}

// ============================================
// SSO Health & Status Endpoint
// ============================================

router.get('/status', (_req, res) => {
  res.json({
    success: true,
    status: 'operational',
    message: 'SSO system is operational',
    features: {
      sessions: true,
      oauth2: true,
      openid_connect: true,
      mfa: true,
      audit_logging: true,
      pkce: true,
    },
    endpoints: {
      login: '/api/sso/login',
      mfaVerify: '/api/sso/mfa/verify',
      logout: '/api/sso/logout',
      sessions: '/api/sso/sessions',
      oauth2: '/api/sso/oauth2',
      userinfo: '/api/sso/oauth2/userinfo',
      openidConfig: '/api/sso/.well-known/openid-configuration',
    },
  });
});

// ============================================
// SSO Session Management Endpoints
// ============================================

/**
 * POST /api/sso/login
 * تسجيل دخول المستخدم وإنشاء جلسة SSO
 *
 * If the user has MFA enabled, we DO NOT create a full session. Instead we
 * issue a short-lived `mfaChallengeToken` the client must present to
 * /api/sso/mfa/verify together with the code.
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, deviceId, userAgent } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    // Lockout check BEFORE password compare so attackers can't enumerate
    if (user.isLocked) {
      logger.warn(`Login rejected (locked): ${user.email}`);
      return res.status(423).json({
        success: false,
        error: 'account_locked',
        message: 'Account temporarily locked due to too many failed attempts',
        lockUntil: user.lockUntil,
      });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'account_disabled',
        message: 'Account is disabled',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      try {
        await user.incLoginAttempts();
      } catch (e) {
        logger.warn('incLoginAttempts failed:', e.message);
      }
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    // Successful auth → reset the failure counter regardless of MFA outcome
    try {
      await user.resetLoginAttempts();
    } catch (e) {
      logger.warn('resetLoginAttempts failed:', e.message);
    }

    // ── MFA branch ─────────────────────────────────────────────────────────
    if (user.mfa?.enabled) {
      const challengeId = crypto.randomBytes(24).toString('hex');
      const challenge = {
        challengeId,
        userId: user._id.toString(),
        deviceId: deviceId || 'default',
        userAgent: userAgent || req.get('user-agent') || 'unknown',
        ipAddress: req.ip,
        createdAt: Date.now(),
      };
      // Reuse SSO store; 5-minute window
      await ssoService._store(`mfa:challenge:${challengeId}`, challenge, 300);

      return res.json({
        success: true,
        mfaRequired: true,
        data: {
          mfaChallengeToken: challengeId,
          expiresIn: 300,
        },
      });
    }

    // ── Direct session issuance (no MFA) ───────────────────────────────────
    const userPayload = buildUserPayload(user);
    const session = await ssoService.createSession(userPayload.userId, userPayload, {
      deviceId: deviceId || 'default',
      userAgent: userAgent || req.get('user-agent'),
      ipAddress: req.ip,
    });
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in via SSO: ${userPayload.userId}`);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        idToken: session.idToken,
        expiresIn: session.expiresIn,
        user: userPayload,
      },
    });
  } catch (error) {
    safeError(res, error, 'SSO login failed');
  }
});

/**
 * POST /api/sso/mfa/verify
 * Completes a 2-step login that was paused for MFA.
 * Body: { mfaChallengeToken, code }
 */
router.post('/mfa/verify', loginLimiter, async (req, res) => {
  try {
    const { mfaChallengeToken, code } = req.body;
    if (!mfaChallengeToken || !code) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'mfaChallengeToken and code are required',
      });
    }

    const challenge = await ssoService._get(`mfa:challenge:${mfaChallengeToken}`);
    if (!challenge) {
      return res.status(401).json({
        success: false,
        error: 'invalid_challenge',
        message: 'MFA challenge expired or invalid',
      });
    }

    const user = await User.findById(challenge.userId).select(
      '+mfa.secret +mfa.backupCodes +mfa.smsCode +mfa.smsCodeExpires'
    );
    if (!user) {
      await ssoService._del(`mfa:challenge:${mfaChallengeToken}`);
      return res.status(401).json({
        success: false,
        error: 'invalid_challenge',
        message: 'User not found',
      });
    }

    // Try TOTP first (via speakeasy), then SMS code, then backup codes.
    let mfaOk = false;
    const trimmed = String(code).trim();
    if (user.mfa?.secret) {
      try {
        const speakeasy = require('speakeasy');
        mfaOk = speakeasy.totp.verify({
          secret: user.mfa.secret,
          encoding: 'base32',
          token: trimmed,
          window: 1,
        });
      } catch (e) {
        logger.warn('TOTP verification failed:', e.message);
      }
    }
    if (!mfaOk) {
      if (
        user.mfa?.smsCode &&
        user.mfa.smsCode === trimmed &&
        user.mfa.smsCodeExpires &&
        new Date(user.mfa.smsCodeExpires).getTime() > Date.now()
      ) {
        user.mfa.smsCode = undefined;
        user.mfa.smsCodeExpires = undefined;
        await user.save();
        mfaOk = true;
      } else if (Array.isArray(user.mfa?.backupCodes) && user.mfa.backupCodes.includes(trimmed)) {
        user.mfa.backupCodes = user.mfa.backupCodes.filter(c => c !== trimmed);
        await user.save();
        mfaOk = true;
      }
    }

    if (!mfaOk) {
      return res.status(401).json({
        success: false,
        error: 'invalid_mfa_code',
        message: 'Invalid MFA code',
      });
    }

    await ssoService._del(`mfa:challenge:${mfaChallengeToken}`);

    const userPayload = buildUserPayload(user);
    const session = await ssoService.createSession(userPayload.userId, userPayload, {
      deviceId: challenge.deviceId,
      userAgent: challenge.userAgent,
      ipAddress: challenge.ipAddress,
      mfa: true,
    });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        idToken: session.idToken,
        expiresIn: session.expiresIn,
        user: userPayload,
      },
    });
  } catch (error) {
    safeError(res, error, 'MFA verification failed');
  }
});

/**
 * POST /api/sso/logout
 */
router.post('/logout', verifySSOToken(), async (req, res) => {
  try {
    await ssoService.endSession(req.sessionId);
    logger.info(`User logged out: ${req.user.userId}`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    safeError(res, error, 'SSO logout failed');
  }
});

/**
 * POST /api/sso/logout-all
 */
router.post('/logout-all', verifySSOToken(), async (req, res) => {
  try {
    const result = await ssoService.endAllUserSessions(req.user.userId);
    logger.info(`User logged out from all devices: ${req.user.userId}`);
    res.json({
      success: true,
      message: 'Logged out from all devices',
      sessionsEnded: result.sessionsEnded,
    });
  } catch (error) {
    safeError(res, error, 'Logout all failed');
  }
});

/**
 * GET /api/sso/sessions
 */
router.get('/sessions', verifySSOToken(), async (req, res) => {
  try {
    const sessions = await ssoService.getUserActiveSessions(req.user.userId);
    res.json({
      success: true,
      data: sessions.map(s => ({
        ...s,
        current: s.sessionId === req.sessionId,
      })),
    });
  } catch (error) {
    safeError(res, error, 'Failed to fetch sessions');
  }
});

/**
 * DELETE /api/sso/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', verifySSOToken(), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessions = await ssoService.getUserActiveSessions(req.user.userId);
    if (!sessions.find(s => s.sessionId === sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Session not found',
      });
    }
    await ssoService.endSession(sessionId);
    res.json({ success: true, message: 'Session ended' });
  } catch (error) {
    safeError(res, error, 'Failed to end session');
  }
});

// ============================================
// Token Management Endpoints
// ============================================

/**
 * POST /api/sso/refresh-token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { sessionId, refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'refresh token is required',
      });
    }
    const result = await ssoService.refreshAccessToken(sessionId, refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.warn('Token refresh failed:', error.message);
    res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: error.message,
    });
  }
});

/**
 * POST /api/sso/verify-token
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token, sessionId } = req.body;
    if (!token || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Token and session ID are required',
      });
    }
    const verification = await ssoService.verifySession(sessionId, token);
    res.json({
      success: true,
      data: {
        valid: verification.valid,
        user: verification.valid ? verification.user : null,
        error: verification.error,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'verification_failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/sso/introspect
 */
router.get('/introspect', verifySSOToken(), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const introspection = await ssoService.introspectToken(token);
    res.json({ success: true, data: introspection });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'introspection_failed',
      message: error.message,
    });
  }
});

// ============================================
// OAuth 2.0 Endpoints
// ============================================

/**
 * GET /api/sso/oauth2/authorize
 *
 * Requires an authenticated SSO session (verifySSOToken). If the client is a
 * browser without a session, the front-end should redirect to the SSO login
 * page first and bounce back here.
 *
 * Accepts: client_id, redirect_uri, scope, state, response_type, nonce,
 *          code_challenge, code_challenge_method
 */
router.get('/oauth2/authorize', sensitiveOperationLimiter, verifySSOToken(), async (req, res) => {
  try {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      response_type,
      nonce,
      code_challenge,
      code_challenge_method,
    } = req.query;

    if (!client_id || !redirect_uri || !response_type) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Missing required OAuth parameters',
      });
    }

    // Defence-in-depth: scheme + host allow-list
    try {
      const parsed = new URL(redirect_uri);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_request',
          message: 'redirect_uri must use http or https',
        });
      }
      const allowedRedirectHosts = (
        process.env.OAUTH_ALLOWED_REDIRECT_HOSTS ||
        process.env.CORS_ORIGINS ||
        process.env.FRONTEND_URL ||
        'localhost'
      )
        .split(',')
        .map(s => {
          try {
            return new URL(s.trim().startsWith('http') ? s.trim() : `https://${s.trim()}`).hostname;
          } catch {
            return s.trim();
          }
        })
        .filter(Boolean);
      if (!allowedRedirectHosts.includes(parsed.hostname) && parsed.hostname !== 'localhost') {
        return res.status(400).json({
          success: false,
          error: 'invalid_request',
          message: 'redirect_uri hostname is not in the allowed list',
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'redirect_uri is not a valid URL',
      });
    }

    const pkce = code_challenge
      ? {
          codeChallenge: code_challenge,
          codeChallengeMethod: (code_challenge_method || 'S256').toUpperCase(),
        }
      : null;
    if (pkce && !['S256', 'PLAIN'].includes(pkce.codeChallengeMethod)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Unsupported code_challenge_method',
      });
    }
    if (pkce && pkce.codeChallengeMethod === 'PLAIN') {
      pkce.codeChallengeMethod = 'plain';
    }

    const result = await oAuthService.initiateAuthorizationCodeFlow(
      req.user.userId,
      client_id,
      redirect_uri,
      scope || 'openid profile email',
      state,
      nonce,
      pkce
    );

    // Return the redirect URL — caller decides whether to 302 or surface
    res.json({
      success: true,
      data: {
        code: result.authCode,
        state: result.state,
        redirectUrl: result.redirectUri,
      },
    });
  } catch (error) {
    logger.error('OAuth authorization failed:', error);
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      message: error.message,
    });
  }
});

/**
 * POST /api/sso/oauth2/token
 */
router.post('/oauth2/token', sensitiveOperationLimiter, async (req, res) => {
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
      scope,
      code_verifier,
    } = req.body;

    if (!grant_type) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Grant type is required',
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
      scope,
      codeVerifier: code_verifier,
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    logger.warn('OAuth token request failed:', error.message);
    res.status(400).json({
      success: false,
      error: 'invalid_grant',
      message: error.message,
    });
  }
});

/**
 * GET /api/sso/oauth2/userinfo
 */
router.get('/oauth2/userinfo', verifySSOToken(), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' });
    }
    res.json({
      sub: user._id.toString(),
      name: user.fullName,
      email: user.email,
      email_verified: user.emailVerified,
      phone_number: user.phone,
      phone_number_verified: user.phoneVerified,
      role: user.role,
      iss: process.env.SSO_BASE_URL || 'https://sso.yourdomain.com',
      aud: 'sso-client',
    });
  } catch (error) {
    logger.error('UserInfo request failed:', error);
    res.status(401).json({
      success: false,
      error: 'invalid_token',
      message: error.message,
    });
  }
});

/**
 * GET /api/sso/.well-known/openid-configuration
 */
router.get('/.well-known/openid-configuration', (_req, res) => {
  res.json(oAuthService.getOpenIDConfiguration());
});

/**
 * GET /api/sso/.well-known/jwks.json
 * Public JWKS for third-party RS256 token verification (W205c).
 */
router.get('/.well-known/jwks.json', (_req, res) => {
  try {
    const jwks = ssoKeys.getPublicJwks();
    res.set('Cache-Control', 'public, max-age=600');
    res.json(jwks);
  } catch (err) {
    res.status(503).json({ keys: [], error: 'jwks_unavailable', message: err.message });
  }
});

/**
 * POST /api/sso/oauth2/revoke
 */
router.post('/oauth2/revoke', async (req, res) => {
  try {
    const { token, token_type_hint } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Token is required',
      });
    }
    await oAuthService.revokeToken(token, token_type_hint);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      message: error.message,
    });
  }
});

/**
 * POST /api/sso/oauth2/register — Dynamic Client Registration
 */
router.post('/oauth2/register', sensitiveOperationLimiter, async (req, res) => {
  try {
    const { client_name, redirect_uris, response_types, grant_types, scopes } = req.body;
    const { client, clientSecret } = await oAuthService.registerClient({
      clientName: client_name,
      redirectUris: redirect_uris,
      responseTypes: response_types,
      grantTypes: grant_types,
      scopes,
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
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      message: error.message,
    });
  }
});

// ============================================
// Current user
// ============================================

/**
 * GET /api/sso/me
 * Re-reads the user from the DB so role/permissions can't go stale.
 */
router.get('/me', verifySSOToken(), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User no longer exists',
      });
    }
    res.json({
      success: true,
      data: {
        ...buildPublicProfile(user),
        sessionId: req.sessionId,
      },
    });
  } catch (error) {
    safeError(res, error, 'Failed to load profile');
  }
});

/**
 * PUT /api/sso/me — update session metadata only (NOT user profile)
 */
router.put('/me', verifySSOToken(), async (req, res) => {
  try {
    const { metadata } = req.body;
    const updatedSession = await ssoService.updateSessionMetadata(req.sessionId, metadata);
    res.json({ success: true, data: updatedSession });
  } catch (error) {
    safeError(res, error, 'Failed to update session metadata');
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Admin: OAuth client registry (W205d)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/sso/admin/oauth-clients
 * List registered OAuth clients. Admin-only.
 */
router.get('/admin/oauth-clients', verifySSOToken(), adminOnly, async (_req, res) => {
  try {
    const clients = await OAuthClient.find({})
      .select('-clientSecretHash')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: clients, total: clients.length });
  } catch (error) {
    safeError(res, error, 'Failed to list OAuth clients');
  }
});

/**
 * POST /api/sso/admin/oauth-clients
 * Body: { clientName, redirectUris[], grantTypes[]?, scopes[]?,
 *         tokenEndpointAuthMethod? }
 * Returns the plaintext clientSecret ONCE — never again.
 */
router.post('/admin/oauth-clients', verifySSOToken(), adminOnly, async (req, res) => {
  try {
    const { clientName, redirectUris, grantTypes, scopes, tokenEndpointAuthMethod } = req.body;
    if (!clientName || !Array.isArray(redirectUris) || redirectUris.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'clientName and redirectUris are required',
      });
    }
    for (const uri of redirectUris) {
      try {
        const parsed = new URL(uri);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({
            success: false,
            error: 'validation_error',
            message: `redirect_uri ${uri} must use http or https`,
          });
        }
      } catch {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: `redirect_uri ${uri} is not a valid URL`,
        });
      }
    }
    const { client, clientSecret } = await oAuthService.registerClient({
      clientName,
      redirectUris,
      grantTypes,
      scopes,
      tokenEndpointAuthMethod,
      createdBy: req.user.userId,
    });
    await recordAudit(req, {
      action: 'sso.oauth-client.register',
      targetType: 'oauth_client',
      targetId: client.clientId,
      metadata: { clientName: client.clientName, tokenEndpointAuthMethod },
    });
    res.status(201).json({
      success: true,
      data: { ...client, clientSecret },
      message: 'Save the clientSecret now — it cannot be retrieved later',
    });
  } catch (error) {
    await recordAuditFailure(
      req,
      { action: 'sso.oauth-client.register', targetType: 'oauth_client' },
      error
    );
    safeError(res, error, 'Failed to register OAuth client');
  }
});

/**
 * POST /api/sso/admin/oauth-clients/:clientId/rotate-secret  (W205g)
 * Returns the new plaintext clientSecret ONCE — never retrievable again.
 * No-op for public clients (returns 204).
 */
router.post(
  '/admin/oauth-clients/:clientId/rotate-secret',
  verifySSOToken(),
  adminOnly,
  async (req, res) => {
    try {
      const client = await OAuthClient.findOne({ clientId: req.params.clientId }).select(
        '+clientSecretHash'
      );
      if (!client) {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      const newSecret = await client.rotateSecret();
      await recordAudit(req, {
        action: 'sso.oauth-client.rotate-secret',
        targetType: 'oauth_client',
        targetId: client.clientId,
        metadata: { tokenEndpointAuthMethod: client.tokenEndpointAuthMethod },
      });
      if (newSecret === null) {
        return res.status(204).end();
      }
      logger.info(`[admin] OAuth client secret rotated by ${req.user.userId}: ${client.clientId}`);
      res.json({
        success: true,
        data: { clientId: client.clientId, clientSecret: newSecret },
        message: 'Save the new clientSecret now — it cannot be retrieved later',
      });
    } catch (error) {
      await recordAuditFailure(
        req,
        {
          action: 'sso.oauth-client.rotate-secret',
          targetType: 'oauth_client',
          targetId: req.params.clientId,
        },
        error
      );
      safeError(res, error, 'Failed to rotate OAuth client secret');
    }
  }
);

/**
 * DELETE /api/sso/admin/oauth-clients/:clientId  (soft delete → isActive=false)
 */
router.delete('/admin/oauth-clients/:clientId', verifySSOToken(), adminOnly, async (req, res) => {
  try {
    const result = await OAuthClient.updateOne(
      { clientId: req.params.clientId },
      { $set: { isActive: false } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    await recordAudit(req, {
      action: 'sso.oauth-client.deactivate',
      targetType: 'oauth_client',
      targetId: req.params.clientId,
    });
    res.json({ success: true });
  } catch (error) {
    await recordAuditFailure(
      req,
      {
        action: 'sso.oauth-client.deactivate',
        targetType: 'oauth_client',
        targetId: req.params.clientId,
      },
      error
    );
    safeError(res, error, 'Failed to deactivate OAuth client');
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Admin: Cross-user session management (W205e)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/sso/admin/sessions?userId=<id>
 * Returns the active sessions of a specific user. Admin-only.
 */
router.get('/admin/sessions', verifySSOToken(), adminOnly, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'userId query param is required',
      });
    }
    const sessions = await ssoService.getUserActiveSessions(String(userId));
    res.json({ success: true, data: sessions, total: sessions.length });
  } catch (error) {
    safeError(res, error, 'Failed to fetch user sessions');
  }
});

/**
 * DELETE /api/sso/admin/sessions/:sessionId
 * Force-end any session by id. Admin-only.
 */
router.delete('/admin/sessions/:sessionId', verifySSOToken(), adminOnly, async (req, res) => {
  try {
    const info = await ssoService.getSessionInfo(req.params.sessionId);
    if (!info) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    await ssoService.endSession(req.params.sessionId);
    await recordAudit(req, {
      action: 'sso.session.end',
      targetType: 'session',
      targetId: req.params.sessionId,
      metadata: { ownerUserId: info.userId, source: info.metadata?.source },
    });
    logger.info(
      `[admin] session forced-end by ${req.user.userId}: ${req.params.sessionId} (owner=${info.userId})`
    );
    res.json({ success: true });
  } catch (error) {
    await recordAuditFailure(
      req,
      { action: 'sso.session.end', targetType: 'session', targetId: req.params.sessionId },
      error
    );
    safeError(res, error, 'Failed to end session');
  }
});

/**
 * POST /api/sso/admin/users/:userId/logout-all
 * Force-end every session of a user.
 */
router.post('/admin/users/:userId/logout-all', verifySSOToken(), adminOnly, async (req, res) => {
  try {
    const result = await ssoService.endAllUserSessions(req.params.userId);
    await recordAudit(req, {
      action: 'sso.session.logout-all',
      targetType: 'user',
      targetId: req.params.userId,
      metadata: { sessionsEnded: result.sessionsEnded },
    });
    logger.info(
      `[admin] all sessions ended for ${req.params.userId} by ${req.user.userId} (count=${result.sessionsEnded})`
    );
    res.json({ success: true, sessionsEnded: result.sessionsEnded });
  } catch (error) {
    await recordAuditFailure(
      req,
      { action: 'sso.session.logout-all', targetType: 'user', targetId: req.params.userId },
      error
    );
    safeError(res, error, 'Failed to end all user sessions');
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Admin: SSO audit trail query (W205h)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/sso/admin/audit
 *
 * Query params (all optional):
 *   action       — exact match (e.g. 'sso.session.end')
 *   actorUserId  — events by this admin
 *   targetType   — 'session' | 'oauth_client' | 'user'
 *   targetId     — events about this specific target
 *   outcome      — 'success' | 'failure'
 *   since        — ISO date, inclusive
 *   until        — ISO date, exclusive
 *   limit        — default 100, max 500
 *   skip         — default 0
 */
router.get('/admin/audit', verifySSOToken(), adminOnly, async (req, res) => {
  try {
    const { action, actorUserId, targetType, targetId, outcome, since, until } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const filter = {};
    if (action) filter.action = String(action);
    if (actorUserId) filter.actorUserId = String(actorUserId);
    if (targetType) filter.targetType = String(targetType);
    if (targetId) filter.targetId = String(targetId);
    if (outcome) filter.outcome = String(outcome);
    if (since || until) {
      filter.createdAt = {};
      if (since) filter.createdAt.$gte = new Date(String(since));
      if (until) filter.createdAt.$lt = new Date(String(until));
    }

    const [rows, total] = await Promise.all([
      SsoAuditEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SsoAuditEvent.countDocuments(filter),
    ]);

    res.json({ success: true, data: rows, total, limit, skip });
  } catch (error) {
    safeError(res, error, 'Failed to query audit log');
  }
});

module.exports = router;
