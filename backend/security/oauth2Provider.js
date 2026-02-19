/**
 * 🔐 OAuth 2.0 & OpenID Connect Integration
 *
 * Modern authentication and authorization
 * - OAuth 2.0 flow implementation
 * - OpenID Connect support
 * - Social login integration
 * - Token management
 */

const crypto = require('crypto');

class OAuth2Provider {
  constructor(options = {}) {
    this.clients = new Map();
    this.authorizationCodes = new Map();
    this.accessTokens = new Map();
    this.refreshTokens = new Map();
    this.scopes = options.scopes || ['openid', 'profile', 'email'];
    this.tokenExpiry = options.tokenExpiry || 3600; // 1 hour
    this.refreshTokenExpiry = options.refreshTokenExpiry || 7 * 24 * 3600; // 7 days
    this.codeExpiry = options.codeExpiry || 600; // 10 minutes
  }

  /**
   * Register OAuth client
   */
  registerClient(clientId, clientSecret, config = {}) {
    this.clients.set(clientId, {
      clientId,
      clientSecret,
      redirectUris: config.redirectUris || [],
      allowedScopes: config.allowedScopes || this.scopes,
      clientName: config.clientName || '',
      clientUri: config.clientUri || '',
      logoUri: config.logoUri || '',
      contactEmails: config.contactEmails || [],
      createdAt: Date.now(),
    });
  }

  /**
   * Generate authorization code
   */
  generateAuthorizationCode(clientId, userId, scopes, redirectUri) {
    if (!this.clients.has(clientId)) {
      throw new Error('Invalid client ID');
    }

    const client = this.clients.get(clientId);
    if (!client.redirectUris.includes(redirectUri)) {
      throw new Error('Invalid redirect URI');
    }

    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.codeExpiry * 1000;

    this.authorizationCodes.set(code, {
      code,
      clientId,
      userId,
      scopes,
      redirectUri,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });

    // Cleanup expired codes
    this._cleanupExpiredItems();

    return code;
  }

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForToken(code, clientId, clientSecret) {
    const authCode = this.authorizationCodes.get(code);

    if (!authCode) {
      throw new Error('Invalid authorization code');
    }

    if (Date.now() > authCode.expiresAt) {
      this.authorizationCodes.delete(code);
      throw new Error('Authorization code expired');
    }

    if (authCode.used) {
      throw new Error('Authorization code already used');
    }

    if (authCode.clientId !== clientId) {
      throw new Error('Client ID mismatch');
    }

    const client = this.clients.get(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      throw new Error('Invalid client credentials');
    }

    // Mark code as used
    authCode.used = true;

    // Generate tokens
    const accessToken = this._generateAccessToken(clientId, authCode.userId, authCode.scopes);

    const refreshToken = this._generateRefreshToken(clientId, authCode.userId);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenExpiry,
    };
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken, clientId, clientSecret) {
    const token = this.refreshTokens.get(refreshToken);

    if (!token) {
      throw new Error('Invalid refresh token');
    }

    if (Date.now() > token.expiresAt) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token expired');
    }

    if (token.clientId !== clientId) {
      throw new Error('Client ID mismatch');
    }

    const client = this.clients.get(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      throw new Error('Invalid client credentials');
    }

    // Generate new access token
    const newAccessToken = this._generateAccessToken(clientId, token.userId, token.scopes);

    return {
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenExpiry,
    };
  }

  /**
   * Generate access token
   */
  _generateAccessToken(clientId, userId, scopes) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.tokenExpiry * 1000;

    this.accessTokens.set(token, {
      token,
      clientId,
      userId,
      scopes,
      expiresAt,
      createdAt: Date.now(),
    });

    return token;
  }

  /**
   * Generate refresh token
   */
  _generateRefreshToken(clientId, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.refreshTokenExpiry * 1000;

    this.refreshTokens.set(token, {
      token,
      clientId,
      userId,
      scopes: this.scopes,
      expiresAt,
      createdAt: Date.now(),
    });

    return token;
  }

  /**
   * Validate access token
   */
  validateAccessToken(token) {
    const tokenData = this.accessTokens.get(token);

    if (!tokenData) {
      return { valid: false, error: 'Invalid token' };
    }

    if (Date.now() > tokenData.expiresAt) {
      this.accessTokens.delete(token);
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      userId: tokenData.userId,
      clientId: tokenData.clientId,
      scopes: tokenData.scopes,
    };
  }

  /**
   * Revoke token
   */
  revokeToken(token) {
    this.accessTokens.delete(token);
    this.refreshTokens.delete(token);
  }

  /**
   * Cleanup expired items
   */
  _cleanupExpiredItems() {
    const now = Date.now();

    // Clean authorization codes
    for (const [code, data] of this.authorizationCodes) {
      if (now > data.expiresAt) {
        this.authorizationCodes.delete(code);
      }
    }

    // Clean access tokens
    for (const [token, data] of this.accessTokens) {
      if (now > data.expiresAt) {
        this.accessTokens.delete(token);
      }
    }

    // Clean refresh tokens
    for (const [token, data] of this.refreshTokens) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
      }
    }
  }
}

/**
 * Express middleware for OAuth 2.0
 */
function oauth2Middleware(provider) {
  return {
    /**
     * Authenticate middleware
     */
    authenticate: (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const validation = provider.validateAccessToken(token);

      if (!validation.valid) {
        return res.status(401).json({ error: validation.error });
      }

      req.user = {
        userId: validation.userId,
        scopes: validation.scopes,
      };

      next();
    },

    /**
     * Check scope middleware
     */
    requireScope: requiredScopes => (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasRequiredScopes = requiredScopes.every(scope => req.user.scopes.includes(scope));

      if (!hasRequiredScopes) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    },
  };
}

module.exports = { OAuth2Provider, oauth2Middleware };
