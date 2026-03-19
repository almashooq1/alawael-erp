/**
 * SSO (Single Sign-On) Service
 * نظام تسجيل الدخول الموحد المركزي
 * يدعم OAuth 2.0, OpenID Connect, SAML 2.0
 */

const jwt = require('jwt-simple');
const crypto = require('crypto');
const redis = require('redis');
const logger = require('../utils/logger');

class SSOService {
  constructor() {
    this.useMockCache = process.env.USE_MOCK_CACHE === 'true';
    this.mockStore = new Map();
    
    // Try to connect to Redis if not using mock
    if (!this.useMockCache) {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      });
      
      this.redisClient.connect().catch(err => {
        logger.error('Redis connection error:', err);
        // Fallback to mock cache
        this.useMockCache = true;
      });
    }
    
    this.JWT_SECRET = process.env.JWT_SECRET || 'sso-secret-key';
    this.SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || 3600000); // 1 hour
    this.REFRESH_TOKEN_TIMEOUT = parseInt(process.env.REFRESH_TOKEN_TIMEOUT || 604800000); // 7 days
  }

  /**
   * Helper: Store data (Redis or Mock)
   */
  async _store(key, value, ttl) {
    try {
      if (this.useMockCache) {
        this.mockStore.set(key, value);
        if (ttl) {
          setTimeout(() => this.mockStore.delete(key), ttl * 1000);
        }
      } else if (this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      }
    } catch (error) {
      logger.warn('Store failed, falling back to mock:', error.message);
      this.useMockCache = true;
      this.mockStore.set(key, value);
    }
  }

  /**
   * Helper: Get stored data (Redis or Mock)
   */
  async _get(key) {
    try {
      if (this.useMockCache) {
        return this.mockStore.get(key);
      } else if (this.redisClient) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      logger.warn('Get failed, falling back to mock:', error.message);
      this.useMockCache = true;
      return this.mockStore.get(key);
    }
  }

  /**
   * Helper: Add to set (Redis or Mock)
   */
  async _addToSet(key, member) {
    try {
      if (this.useMockCache) {
        let set = this.mockStore.get(key) || new Set();
        set.add(member);
        this.mockStore.set(key, set);
      } else if (this.redisClient) {
        await this.redisClient.sAdd(key, member);
      }
    } catch (error) {
      logger.warn('AddToSet failed, falling back to mock:', error.message);
      this.useMockCache = true;
      let set = this.mockStore.get(key) || new Set();
      set.add(member);
      this.mockStore.set(key, set);
    }
  }

  /**
   * إنشاء جلسة SSO جديدة
   * Create a new SSO session
   */
  async createSession(userId, userPayload, metadata = {}) {
    try {
      const sessionId = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      
      // Create session object
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
          deviceId: metadata.deviceId || crypto.randomUUID()
        },
        tokens: {
          accessToken: null,
          refreshToken: null,
          idToken: null
        },
        status: 'active'
      };

      // Generate tokens
      const tokens = this.generateTokens(userId, userPayload, sessionId);
      session.tokens = tokens;

      // Store session with TTL
      await this._store(
        `session:${sessionId}`,
        session,
        Math.floor(this.SESSION_TIMEOUT / 1000)
      );

      // Index session by userId for quick lookup
      await this._addToSet(`user:${userId}:sessions`, sessionId);

      logger.info(`SSO Session created: ${sessionId} for user: ${userId}`);

      return {
        sessionId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        expiresIn: this.SESSION_TIMEOUT,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Failed to create SSO session:', error);
      throw new Error('Failed to create SSO session');
    }
  }

  /**
   * التحقق من جلسة SSO
   * Verify SSO session
   */
  async verifySession(sessionId, accessToken) {
    try {
      // Get session from storage
      const sessionData = await this._get(`session:${sessionId}`);
      
      if (!sessionData) {
        logger.warn(`Session not found: ${sessionId}`);
        return { valid: false, error: 'Session expired or invalid' };
      }

      const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

      // Verify access token
      try {
        const decoded = jwt.decode(accessToken, this.JWT_SECRET);
        
        if (decoded.sessionId !== sessionId) {
          logger.warn(`Session mismatch for token`);
          return { valid: false, error: 'Session mismatch' };
        }

        if (decoded.exp && decoded.exp < Date.now()) {
          logger.warn(`Token expired for session: ${sessionId}`);
          return { valid: false, error: 'Token expired' };
        }

        // Update last activity
        session.lastActivity = Date.now();
        await this.redisClient.setEx(
          `session:${sessionId}`,
          Math.floor(this.SESSION_TIMEOUT / 1000),
          JSON.stringify(session)
        );

        return {
          valid: true,
          session,
          user: decoded
        };
      } catch (tokenError) {
        logger.error(`Token verification failed: ${tokenError.message}`);
        return { valid: false, error: 'Invalid token' };
      }
    } catch (error) {
      logger.error('Session verification failed:', error);
      return { valid: false, error: 'Session verification failed' };
    }
  }

  /**
   * تحديث Access Token
   * Refresh access token
   */
  async refreshAccessToken(sessionId, refreshToken) {
    try {
      // Get session from Redis
      const sessionData = await this.redisClient.get(`session:${sessionId}`);
      
      if (!sessionData) {
        throw new Error('Session not found');
      }

      const session = JSON.parse(sessionData);

      // Verify refresh token
      try {
        const decoded = jwt.decode(refreshToken, this.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
          throw new Error('Invalid token type');
        }

        if (decoded.exp && decoded.exp < Date.now()) {
          throw new Error('Refresh token expired');
        }
      } catch (error) {
        logger.error(`Refresh token verification failed: ${error.message}`);
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(
        session.userId,
        session.userPayload,
        sessionId
      );

      session.tokens.accessToken = newAccessToken;
      session.lastActivity = Date.now();

      // Update session in Redis
      await this.redisClient.setEx(
        `session:${sessionId}`,
        Math.floor(this.SESSION_TIMEOUT / 1000),
        JSON.stringify(session)
      );

      logger.info(`Access token refreshed for session: ${sessionId}`);

      return {
        accessToken: newAccessToken,
        expiresIn: this.SESSION_TIMEOUT,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  /**
   * إنهاء الجلسة
   * End SSO session
   */
  async endSession(sessionId) {
    try {
      const sessionData = await this.redisClient.get(`session:${sessionId}`);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Mark session as ended
        session.status = 'ended';
        session.endedAt = Date.now();
        
        // Store ended session for audit trail (24 hours)
        await this.redisClient.setEx(
          `session:ended:${sessionId}`,
          86400,
          JSON.stringify(session)
        );
        
        // Remove active session
        await this.redisClient.del(`session:${sessionId}`);
        await this.redisClient.sRem(`user:${session.userId}:sessions`, sessionId);
      }

      logger.info(`Session ended: ${sessionId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to end session:', error);
      throw error;
    }
  }

  /**
   * إنهاء جميع جلسات المستخدم (Logout everywhere)
   * End all user sessions
   */
  async endAllUserSessions(userId) {
    try {
      const sessionIds = await this.redisClient.sMembers(`user:${userId}:sessions`);
      
      for (const sessionId of sessionIds) {
        await this.endSession(sessionId);
      }

      await this.redisClient.del(`user:${userId}:sessions`);
      
      logger.info(`All sessions ended for user: ${userId}`);
      return { success: true, sessionsEnded: sessionIds.length };
    } catch (error) {
      logger.error('Failed to end all user sessions:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع جلسات النشطة للمستخدم
   * Get all active sessions for user
   */
  async getUserActiveSessions(userId) {
    try {
      const sessionIds = await this.redisClient.sMembers(`user:${userId}:sessions`);
      const sessions = [];

      for (const sessionId of sessionIds) {
        const sessionData = await this.redisClient.get(`session:${sessionId}`);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          sessions.push({
            sessionId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            metadata: session.metadata,
            status: session.status
          });
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  /**
   * توليد التوكنات (Access, Refresh, ID)
   * Generate JWT tokens
   */
  generateTokens(userId, userPayload, sessionId) {
    const now = Date.now();
    
    // Access Token (valid for 1 hour)
    const accessToken = jwt.encode({
      ...userPayload,
      userId,
      sessionId,
      type: 'access',
      iat: now,
      exp: now + this.SESSION_TIMEOUT
    }, this.JWT_SECRET);

    // Refresh Token (valid for 7 days)
    const refreshToken = jwt.encode({
      userId,
      sessionId,
      type: 'refresh',
      iat: now,
      exp: now + this.REFRESH_TOKEN_TIMEOUT
    }, this.JWT_SECRET);

    // ID Token (for client identity)
    const idToken = jwt.encode({
      sub: userId,
      aud: 'sso-client',
      iss: 'sso-server',
      iat: now,
      exp: now + this.SESSION_TIMEOUT
    }, this.JWT_SECRET);

    return { accessToken, refreshToken, idToken };
  }

  /**
   * توليد Access Token فقط
   * Generate access token only
   */
  generateAccessToken(userId, userPayload, sessionId) {
    const now = Date.now();
    
    return jwt.encode({
      ...userPayload,
      userId,
      sessionId,
      type: 'access',
      iat: now,
      exp: now + this.SESSION_TIMEOUT
    }, this.JWT_SECRET);
  }

  /**
   * تحديث بيانات الجلسة
   * Update session metadata
   */
  async updateSessionMetadata(sessionId, metadata) {
    try {
      const sessionData = await this.redisClient.get(`session:${sessionId}`);
      
      if (!sessionData) {
        throw new Error('Session not found');
      }

      const session = JSON.parse(sessionData);
      session.metadata = { ...session.metadata, ...metadata };
      session.lastActivity = Date.now();

      await this.redisClient.setEx(
        `session:${sessionId}`,
        Math.floor(this.SESSION_TIMEOUT / 1000),
        JSON.stringify(session)
      );

      logger.info(`Session metadata updated: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to update session metadata:', error);
      throw error;
    }
  }

  /**
   * الحصول على معلومات الجلسة
   * Get session info
   */
  async getSessionInfo(sessionId) {
    try {
      const sessionData = await this.redisClient.get(`session:${sessionId}`);
      
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      logger.error('Failed to get session info:', error);
      throw error;
    }
  }

  /**
   * التحقق من طلب SSO OAuth 2.0
   * Validate OAuth 2.0 request
   */
  async validateOAuthRequest(clientId, redirectUri, scope, state) {
    try {
      // This would validate against registered OAuth clients
      // Implementation depends on your client registration system
      
      return {
        valid: true,
        clientId,
        redirectUri,
        scope: scope ? scope.split(' ') : [],
        state
      };
    } catch (error) {
      logger.error('OAuth request validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * إنشاء Authorization Code
   * Generate authorization code
   */
  async generateAuthorizationCode(userId, clientId, scope, redirectUri) {
    try {
      const code = crypto.randomBytes(32).toString('hex');
      const now = Date.now();

      const authCode = {
        code,
        userId,
        clientId,
        scope,
        redirectUri,
        createdAt: now,
        expiresAt: now + 600000 // 10 minutes
      };

      await this.redisClient.setEx(
        `oauth:code:${code}`,
        600,
        JSON.stringify(authCode)
      );

      logger.info(`Authorization code generated for user: ${userId}, client: ${clientId}`);
      return code;
    } catch (error) {
      logger.error('Failed to generate authorization code:', error);
      throw error;
    }
  }

  /**
   * تبديل Authorization Code بـ Access Token
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(code, clientId, clientSecret) {
    try {
      const authCodeData = await this.redisClient.get(`oauth:code:${code}`);
      
      if (!authCodeData) {
        throw new Error('Invalid or expired authorization code');
      }

      const authCode = JSON.parse(authCodeData);

      if (authCode.clientId !== clientId) {
        throw new Error('Client ID mismatch');
      }

      // In production, verify clientSecret against your client registry
      if (clientSecret !== process.env.OAUTH_CLIENT_SECRET) {
        throw new Error('Invalid client secret');
      }

      if (authCode.expiresAt < Date.now()) {
        throw new Error('Authorization code expired');
      }

      // Delete used authorization code
      await this.redisClient.del(`oauth:code:${code}`);

      // Create session and generate tokens
      const session = await this.createSession(authCode.userId, {
        scope: authCode.scope,
        clientId
      }, {
        source: 'oauth'
      });

      logger.info(`Authorization code exchanged for user: ${authCode.userId}`);
      return session;
    } catch (error) {
      logger.error('Failed to exchange authorization code:', error);
      throw error;
    }
  }

  /**
   * التحقق من Token أثناء المكالمات البينية
   * Introspect token (for service-to-service verification)
   */
  async introspectToken(token) {
    try {
      const decoded = jwt.decode(token, this.JWT_SECRET);
      
      if (decoded.exp && decoded.exp < Date.now()) {
        return {
          active: false,
          reason: 'Token expired'
        };
      }

      return {
        active: true,
        sub: decoded.userId,
        scope: decoded.scope,
        clientId: decoded.clientId,
        exp: decoded.exp,
        iat: decoded.iat
      };
    } catch (error) {
      logger.error('Token introspection failed:', error);
      return { active: false, reason: 'Invalid token' };
    }
  }

  /**
   * إغلاق الاتصال مع Redis
   * Disconnect Redis
   */
  async disconnect() {
    try {
      await this.redisClient.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}

module.exports = SSOService;
