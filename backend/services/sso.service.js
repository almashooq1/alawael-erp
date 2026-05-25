/**
 * SSO (Single Sign-On) Service
 * نظام تسجيل الدخول الموحد المركزي
 * يدعم OAuth 2.0, OpenID Connect, SAML 2.0
 *
 * W205 hardening:
 *  - Unified storage layer (_store/_get/_del/_addToSet/_removeFromSet/_members)
 *    so the service works with or without Redis.
 *  - JWT iat/exp now in seconds (RFC 7519). Verification delegated to
 *    jsonwebtoken's built-in `exp` enforcement; no more duplicate ms checks.
 *  - PKCE: code_challenge + method stored at authorize-time, verified at
 *    exchange-time when the request supplies a code_verifier.
 *  - createSession enforces a session-per-user cap when SSO_MAX_SESSIONS_PER_USER is set.
 *  - exchangeAuthorizationCode rejects codes whose userId is still null
 *    (was the W205 "pre-login auth code" hole).
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const ssoKeys = require('./ssoKeys.service');

const SECONDS = 1000;

/**
 * Pick signing algorithm + secret per env:
 *   SSO_TOKEN_ALG=RS256 → asymmetric, signed with the RS256 private key.
 *   default            → HS256, signed with JWT_SECRET (back-compat).
 *
 * Verification always tries the kid-matched RS256 public key first when the
 * token carries a `kid` header, then falls back to HS256 with JWT_SECRET.
 * That means RS256 rollout is non-breaking: existing HS256 tokens still
 * verify, and clients can pin on the kid going forward.
 */
function getSigningOptions(expiresInSec) {
  const useRs256 = String(process.env.SSO_TOKEN_ALG || '').toUpperCase() === 'RS256';
  if (useRs256) {
    const { privatePem, kid } = ssoKeys.getKeyMaterial();
    return {
      secret: privatePem,
      options: { expiresIn: expiresInSec, algorithm: 'RS256', keyid: kid },
    };
  }
  return { secret: null, options: { expiresIn: expiresInSec, algorithm: 'HS256' } };
}

class SSOService {
  constructor() {
    this.useMockCache =
      process.env.USE_MOCK_CACHE === 'true' || process.env.DISABLE_REDIS === 'true';
    this.mockStore = new Map();
    this.mockExpires = new Map();
    this.redisClient = null;

    if (!this.useMockCache) {
      try {
        this.redisClient = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          password: process.env.REDIS_PASSWORD,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        this.redisClient.on('error', err => {
          logger.warn('Redis connection error, falling back to in-process store:', err.message);
          this.useMockCache = true;
        });
      } catch (err) {
        logger.warn('Redis init failed, using in-process store:', err.message);
        this.useMockCache = true;
      }
    }

    if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
      logger.error('CRITICAL: JWT_SECRET environment variable is not set for SSO service!');
      throw new Error('JWT_SECRET must be configured via environment variable for SSO service');
    }
    this.JWT_SECRET =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'test' ? 'test-sso-secret-key' : undefined);
    // ms-based for setTimeout / cookie maxAge ergonomics
    this.SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT, 10) || 3600000;
    this.REFRESH_TOKEN_TIMEOUT = parseInt(process.env.REFRESH_TOKEN_TIMEOUT, 10) || 604800000;
    this.MAX_SESSIONS_PER_USER = parseInt(process.env.SSO_MAX_SESSIONS_PER_USER, 10) || 0; // 0 = unlimited
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Storage abstraction — Redis when available, in-process Map otherwise
  // ─────────────────────────────────────────────────────────────────────────

  _expireMockIfDue(key) {
    const expAt = this.mockExpires.get(key);
    if (expAt && expAt <= Date.now()) {
      this.mockStore.delete(key);
      this.mockExpires.delete(key);
      return true;
    }
    return false;
  }

  async _store(key, value, ttlSeconds) {
    if (this.useMockCache || !this.redisClient) {
      this.mockStore.set(key, value);
      if (ttlSeconds) this.mockExpires.set(key, Date.now() + ttlSeconds * SECONDS);
      return;
    }
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.redisClient.setex(key, ttlSeconds, payload);
      } else {
        await this.redisClient.set(key, payload);
      }
    } catch (err) {
      logger.warn('Redis _store failed, switching to mock:', err.message);
      this.useMockCache = true;
      this.mockStore.set(key, value);
      if (ttlSeconds) this.mockExpires.set(key, Date.now() + ttlSeconds * SECONDS);
    }
  }

  async _get(key) {
    if (this.useMockCache || !this.redisClient) {
      if (this._expireMockIfDue(key)) return null;
      const v = this.mockStore.get(key);
      return v === undefined ? null : v;
    }
    try {
      const raw = await this.redisClient.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (err) {
      logger.warn('Redis _get failed, switching to mock:', err.message);
      this.useMockCache = true;
      return this.mockStore.get(key) ?? null;
    }
  }

  async _del(key) {
    if (this.useMockCache || !this.redisClient) {
      this.mockStore.delete(key);
      this.mockExpires.delete(key);
      return;
    }
    try {
      await this.redisClient.del(key);
    } catch (err) {
      logger.warn('Redis _del failed, switching to mock:', err.message);
      this.useMockCache = true;
      this.mockStore.delete(key);
    }
  }

  async _addToSet(key, member) {
    if (this.useMockCache || !this.redisClient) {
      const set = this.mockStore.get(key) instanceof Set ? this.mockStore.get(key) : new Set();
      set.add(member);
      this.mockStore.set(key, set);
      return;
    }
    try {
      await this.redisClient.sadd(key, member);
    } catch (err) {
      logger.warn('Redis _addToSet failed, switching to mock:', err.message);
      this.useMockCache = true;
      const set = this.mockStore.get(key) instanceof Set ? this.mockStore.get(key) : new Set();
      set.add(member);
      this.mockStore.set(key, set);
    }
  }

  async _removeFromSet(key, member) {
    if (this.useMockCache || !this.redisClient) {
      const set = this.mockStore.get(key);
      if (set instanceof Set) set.delete(member);
      return;
    }
    try {
      await this.redisClient.srem(key, member);
    } catch (err) {
      logger.warn('Redis _removeFromSet failed, switching to mock:', err.message);
      this.useMockCache = true;
      const set = this.mockStore.get(key);
      if (set instanceof Set) set.delete(member);
    }
  }

  async _members(key) {
    if (this.useMockCache || !this.redisClient) {
      const set = this.mockStore.get(key);
      return set instanceof Set ? [...set] : [];
    }
    try {
      return await this.redisClient.smembers(key);
    } catch (err) {
      logger.warn('Redis _members failed, switching to mock:', err.message);
      this.useMockCache = true;
      const set = this.mockStore.get(key);
      return set instanceof Set ? [...set] : [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new SSO session and issue access/refresh/id tokens.
   */
  async createSession(userId, userPayload, metadata = {}) {
    try {
      const sessionId = crypto.randomBytes(32).toString('hex');
      const now = Date.now();

      const session = {
        sessionId,
        userId,
        userPayload,
        createdAt: now,
        lastActivity: now,
        metadata: {
          ...metadata,
          userAgent: metadata.userAgent || 'unknown',
          ipAddress: metadata.ipAddress || 'unknown',
          deviceId: metadata.deviceId || crypto.randomUUID(),
        },
        tokens: { accessToken: null, refreshToken: null, idToken: null },
        status: 'active',
      };

      const tokens = this.generateTokens(userId, userPayload, sessionId);
      session.tokens = tokens;

      // W205j: track the active refresh-token jti for rotation. We persist
      // just the latest jti on the session — old jtis become invalid.
      const refreshDecoded = jwt.decode(tokens.refreshToken);
      session.activeRefreshJti = refreshDecoded?.jti || null;

      await this._store(
        `session:${sessionId}`,
        session,
        Math.floor(this.SESSION_TIMEOUT / SECONDS)
      );
      await this._addToSet(`user:${userId}:sessions`, sessionId);

      // Enforce per-user session cap if configured
      if (this.MAX_SESSIONS_PER_USER > 0) {
        await this._enforceSessionCap(userId, sessionId);
      }

      logger.info(`SSO Session created: ${sessionId} for user: ${userId}`);

      return {
        sessionId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        expiresIn: Math.floor(this.SESSION_TIMEOUT / SECONDS),
        tokenType: 'Bearer',
      };
    } catch (error) {
      logger.error('Failed to create SSO session:', error);
      throw new Error('Failed to create SSO session');
    }
  }

  async _enforceSessionCap(userId, justCreatedSessionId) {
    const sessionIds = await this._members(`user:${userId}:sessions`);
    if (sessionIds.length <= this.MAX_SESSIONS_PER_USER) return;

    // Build [{ sessionId, createdAt }] and evict oldest until at the cap
    const enriched = [];
    for (const sid of sessionIds) {
      if (sid === justCreatedSessionId) continue;
      const s = await this._get(`session:${sid}`);
      if (s) enriched.push({ sid, createdAt: s.createdAt || 0 });
      else await this._removeFromSet(`user:${userId}:sessions`, sid);
    }
    enriched.sort((a, b) => a.createdAt - b.createdAt);
    const toEvict = enriched.slice(0, enriched.length + 1 - this.MAX_SESSIONS_PER_USER);
    for (const { sid } of toEvict) {
      await this.endSession(sid);
    }
  }

  /**
   * Verify an SSO session by sessionId + access token.
   */
  async verifySession(sessionId, accessToken) {
    try {
      const session = await this._get(`session:${sessionId}`);
      if (!session) {
        return { valid: false, error: 'Session expired or invalid' };
      }
      if (session.status && session.status !== 'active') {
        return { valid: false, error: 'Session not active' };
      }

      let decoded;
      try {
        decoded = this._verifyTokenAnyAlg(accessToken);
      } catch (_err) {
        return { valid: false, error: 'Invalid or expired token' };
      }

      if (decoded.sessionId !== sessionId) {
        return { valid: false, error: 'Session mismatch' };
      }

      session.lastActivity = Date.now();
      await this._store(
        `session:${sessionId}`,
        session,
        Math.floor(this.SESSION_TIMEOUT / SECONDS)
      );

      return { valid: true, session, user: decoded };
    } catch (error) {
      logger.error('Session verification failed:', error);
      return { valid: false, error: 'Session verification failed' };
    }
  }

  /**
   * Refresh tokens. W205j adds single-use semantics + reuse detection:
   *
   *   - The presented refresh token's `jti` must match `session.activeRefreshJti`.
   *   - On success, a NEW refresh token is minted with a fresh jti, the
   *     session's activeRefreshJti is updated, and the new pair is returned.
   *   - If the presented jti does NOT match (i.e. the caller is using a
   *     refresh token that's already been rotated out), we treat this as
   *     token theft: the whole session is killed and we throw.
   *
   *   This is the standard OAuth refresh-token-rotation pattern (RFC 6749
   *   §10.4) and lets us detect refresh-token theft.
   */
  async refreshAccessToken(sessionId, refreshToken) {
    let decoded;
    try {
      // Pin to HS256 — the other verify in this file (line 537) is
      // already explicit; matching that pattern across the surface.
      decoded = jwt.verify(refreshToken, this.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (_err) {
      throw new Error('Invalid or expired refresh token');
    }
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const effectiveSessionId = sessionId || decoded.sessionId;
    if (!effectiveSessionId) {
      throw new Error('Session id missing');
    }
    if (decoded.sessionId !== effectiveSessionId) {
      throw new Error('Session mismatch');
    }

    const session = await this._get(`session:${effectiveSessionId}`);
    if (!session) {
      throw new Error('Session not found');
    }

    // W205j: reuse detection. If the presented jti is not the active one,
    // someone is replaying an old refresh — kill the whole session.
    if (session.activeRefreshJti && decoded.jti && session.activeRefreshJti !== decoded.jti) {
      logger.warn(
        `[sso] refresh-token reuse detected for session ${effectiveSessionId} — revoking entire session`
      );
      await this.endSession(effectiveSessionId);
      const err = new Error('Refresh token reuse detected — session revoked');
      err.code = 'REFRESH_REUSE';
      throw err;
    }

    // Rotate: issue a new access + a new refresh, retire the old jti.
    const newAccessToken = this.generateAccessToken(
      session.userId,
      session.userPayload,
      effectiveSessionId
    );
    const newRefreshToken = this.generateRefreshToken(session.userId, effectiveSessionId);
    const newRefreshDecoded = jwt.decode(newRefreshToken);

    session.tokens.accessToken = newAccessToken;
    session.tokens.refreshToken = newRefreshToken;
    session.activeRefreshJti = newRefreshDecoded?.jti || null;
    session.lastActivity = Date.now();
    session.refreshCount = (session.refreshCount || 0) + 1;

    await this._store(
      `session:${effectiveSessionId}`,
      session,
      Math.floor(this.SESSION_TIMEOUT / SECONDS)
    );

    logger.info(`Access token refreshed for session: ${effectiveSessionId}`);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: Math.floor(this.SESSION_TIMEOUT / SECONDS),
      tokenType: 'Bearer',
    };
  }

  /** End a single session. */
  async endSession(sessionId) {
    try {
      const session = await this._get(`session:${sessionId}`);
      if (session) {
        session.status = 'ended';
        session.endedAt = Date.now();
        // Retain ended session for 24h audit trail
        await this._store(`session:ended:${sessionId}`, session, 86400);
        await this._del(`session:${sessionId}`);
        if (session.userId) {
          await this._removeFromSet(`user:${session.userId}:sessions`, sessionId);
        }
      }
      logger.info(`Session ended: ${sessionId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to end session:', error);
      throw error;
    }
  }

  /** End every session belonging to a user. */
  async endAllUserSessions(userId) {
    try {
      const sessionIds = await this._members(`user:${userId}:sessions`);
      for (const sessionId of sessionIds) {
        await this.endSession(sessionId);
      }
      await this._del(`user:${userId}:sessions`);
      logger.info(`All sessions ended for user: ${userId} (count=${sessionIds.length})`);
      return { success: true, sessionsEnded: sessionIds.length };
    } catch (error) {
      logger.error('Failed to end all user sessions:', error);
      throw error;
    }
  }

  /** Return all active sessions for a user (sans tokens). */
  async getUserActiveSessions(userId) {
    try {
      const sessionIds = await this._members(`user:${userId}:sessions`);
      const out = [];
      for (const sessionId of sessionIds) {
        const session = await this._get(`session:${sessionId}`);
        if (session) {
          out.push({
            sessionId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            metadata: session.metadata,
            status: session.status,
          });
        } else {
          // Stale set member — clean up
          await this._removeFromSet(`user:${userId}:sessions`, sessionId);
        }
      }
      return out;
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Token generation
  // ─────────────────────────────────────────────────────────────────────────

  generateTokens(userId, userPayload, sessionId) {
    const accessToken = this.generateAccessToken(userId, userPayload, sessionId);
    const refreshToken = this.generateRefreshToken(userId, sessionId);

    const accessExpiresInSec = Math.floor(this.SESSION_TIMEOUT / SECONDS);
    const { secret, options } = getSigningOptions(accessExpiresInSec);
    // W205k: include sessionId in id_token so the OIDC logout endpoint can
    // identify which session to terminate from the id_token_hint param.
    const idToken = jwt.sign(
      { sub: userId, aud: 'sso-client', iss: 'sso-server', sessionId },
      secret || this.JWT_SECRET,
      options
    );

    return { accessToken, refreshToken, idToken };
  }

  /**
   * Generate a refresh token carrying a unique `jti`. The jti is what
   * makes refresh-token rotation (W205j) possible — we track which
   * jtis are still valid for a session, so reusing a rotated refresh
   * token is detectable.
   *
   * Refresh tokens stay HS256 — they never leave our trust boundary and
   * never get verified by third parties. Using HS256 avoids a costly
   * asymmetric sign on every refresh.
   */
  generateRefreshToken(userId, sessionId) {
    const refreshExpiresInSec = Math.floor(this.REFRESH_TOKEN_TIMEOUT / SECONDS);
    const jti = crypto.randomBytes(16).toString('hex');
    return jwt.sign({ userId, sessionId, type: 'refresh', jti }, this.JWT_SECRET, {
      expiresIn: refreshExpiresInSec,
      algorithm: 'HS256',
    });
  }

  generateAccessToken(userId, userPayload, sessionId) {
    const expiresInSec = Math.floor(this.SESSION_TIMEOUT / SECONDS);
    const { secret, options } = getSigningOptions(expiresInSec);
    return jwt.sign(
      { ...userPayload, userId, sessionId, type: 'access' },
      secret || this.JWT_SECRET,
      options
    );
  }

  /**
   * Verify a token regardless of algorithm:
   *   - If header has `kid` and we hold an RS256 public key for it → RS256 verify.
   *   - Otherwise → HS256 verify with JWT_SECRET (existing behaviour).
   * Throws the underlying jsonwebtoken error on failure.
   */
  _verifyTokenAnyAlg(token) {
    const decodedHeader = jwt.decode(token, { complete: true })?.header;
    if (decodedHeader?.kid) {
      const pubPem = ssoKeys.getPublicKeyPem(decodedHeader.kid);
      if (pubPem) {
        return jwt.verify(token, pubPem, { algorithms: ['RS256'] });
      }
    }
    return jwt.verify(token, this.JWT_SECRET, { algorithms: ['HS256'] });
  }

  /** Update mutable session metadata. */
  async updateSessionMetadata(sessionId, metadata) {
    const session = await this._get(`session:${sessionId}`);
    if (!session) throw new Error('Session not found');
    session.metadata = { ...session.metadata, ...metadata };
    session.lastActivity = Date.now();
    await this._store(`session:${sessionId}`, session, Math.floor(this.SESSION_TIMEOUT / SECONDS));
    return session;
  }

  async getSessionInfo(sessionId) {
    return this._get(`session:${sessionId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OAuth 2.0 / OIDC helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate redirect_uri + clientId — defense-in-depth for the route layer.
   */
  async validateOAuthRequest(clientId, redirectUri, scope, state) {
    if (!redirectUri || typeof redirectUri !== 'string') {
      return { valid: false, error: 'redirect_uri is required' };
    }
    let parsed;
    try {
      parsed = new URL(redirectUri);
    } catch {
      return { valid: false, error: 'redirect_uri is not a valid URL' };
    }
    const allowedSchemes = ['https:', 'http:'];
    if (!allowedSchemes.includes(parsed.protocol)) {
      return { valid: false, error: 'redirect_uri must use http or https' };
    }
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:' && !isLocalhost) {
      return { valid: false, error: 'redirect_uri must use HTTPS in production' };
    }
    if (parsed.hash) {
      return { valid: false, error: 'redirect_uri must not contain a fragment' };
    }
    if (!clientId || typeof clientId !== 'string') {
      return { valid: false, error: 'client_id is required' };
    }
    return {
      valid: true,
      clientId,
      redirectUri,
      scope: scope ? scope.split(' ') : [],
      state,
    };
  }

  /**
   * Generate an authorization code bound to (userId, clientId, redirectUri, scope)
   * and optional PKCE challenge. userId MUST be non-null — callers must
   * authenticate the user before requesting a code.
   */
  async generateAuthorizationCode(userId, clientId, scope, redirectUri, pkce = null) {
    if (!userId) {
      // W205 fix: pre-login code issuance was a security hole — refuse.
      throw new Error('generateAuthorizationCode requires an authenticated userId');
    }
    const code = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const authCode = {
      code,
      userId,
      clientId,
      scope,
      redirectUri,
      pkce: pkce
        ? {
            codeChallenge: pkce.codeChallenge,
            codeChallengeMethod: pkce.codeChallengeMethod || 'S256',
          }
        : null,
      createdAt: now,
      expiresAt: now + 600000, // 10 minutes
    };
    await this._store(`oauth:code:${code}`, authCode, 600);
    logger.info(`Authorization code generated for user: ${userId}, client: ${clientId}`);
    return code;
  }

  /**
   * Exchange an authorization code for a session.
   * Verifies clientSecret + redirect_uri match + PKCE (if originally bound).
   */
  async exchangeAuthorizationCode(code, clientId, clientSecret, opts = {}) {
    const authCode = await this._get(`oauth:code:${code}`);
    if (!authCode) {
      throw new Error('Invalid or expired authorization code');
    }
    if (authCode.clientId !== clientId) {
      throw new Error('Client ID mismatch');
    }
    if (!authCode.userId) {
      // Defense in depth: refuse codes that lack an authenticated subject.
      throw new Error('Authorization code is not bound to a user');
    }
    if (clientSecret !== process.env.OAUTH_CLIENT_SECRET) {
      throw new Error('Invalid client secret');
    }
    if (authCode.expiresAt < Date.now()) {
      await this._del(`oauth:code:${code}`);
      throw new Error('Authorization code expired');
    }
    if (opts.redirectUri && authCode.redirectUri !== opts.redirectUri) {
      throw new Error('redirect_uri mismatch');
    }

    // PKCE: if the code was issued with a challenge, the exchange MUST verify.
    if (authCode.pkce) {
      const verifier = opts.codeVerifier;
      if (!verifier) {
        throw new Error('code_verifier is required for this code');
      }
      const ok = SSOService.verifyPkce(
        verifier,
        authCode.pkce.codeChallenge,
        authCode.pkce.codeChallengeMethod
      );
      if (!ok) {
        throw new Error('PKCE verification failed');
      }
    }

    await this._del(`oauth:code:${code}`);

    const session = await this.createSession(
      authCode.userId,
      { scope: authCode.scope, clientId },
      { source: 'oauth' }
    );
    logger.info(`Authorization code exchanged for user: ${authCode.userId}`);
    return session;
  }

  static verifyPkce(codeVerifier, codeChallenge, method = 'S256') {
    if (method === 'plain') {
      return codeVerifier === codeChallenge;
    }
    if (method === 'S256') {
      const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64');
      const computed = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return computed === codeChallenge;
    }
    return false;
  }

  /**
   * Introspect an access token for service-to-service verification.
   */
  async introspectToken(token) {
    try {
      const decoded = this._verifyTokenAnyAlg(token);
      return {
        active: true,
        sub: decoded.userId,
        scope: decoded.scope,
        clientId: decoded.clientId,
        exp: decoded.exp,
        iat: decoded.iat,
      };
    } catch (error) {
      const reason = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return { active: false, reason };
    }
  }

  async disconnect() {
    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
    }
  }
}

module.exports = SSOService;
