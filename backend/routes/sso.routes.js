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
const { verifySSOToken } = require('../middleware/sso-auth.middleware');
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

module.exports = router;
