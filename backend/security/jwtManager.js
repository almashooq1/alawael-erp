/**
 * 🎫 Advanced JWT Security System
 *
 * Secure token generation and validation
 * - JWT signing and verification
 * - Token rotation
 * - Claims validation
 * - Blacklist management
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class JWTManager {
  constructor(options = {}) {
    this.publicKey = options.publicKey || crypto.randomBytes(32).toString('hex');
    this.privateKey = options.privateKey || crypto.randomBytes(32).toString('hex');
    this.accessTokenExpiry = options.accessTokenExpiry || '15m';
    this.refreshTokenExpiry = options.refreshTokenExpiry || '7d';
    this.issuer = options.issuer || 'alawael';
    this.audience = options.audience || 'alawael-app';
    this.algorithm = options.algorithm || 'HS256';
    this.tokenBlacklist = new Set();
    this.tokenMetadata = new Map();
    this.rotationSchedule = options.rotationSchedule || 30 * 24 * 60 * 60 * 1000; // 30 days
    this.lastRotation = Date.now();
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload, options = {}) {
    const claims = {
      ...payload,
      type: 'access',
      iss: this.issuer,
      aud: this.audience,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(claims, this.privateKey, {
      expiresIn: this.accessTokenExpiry,
      algorithm: this.algorithm,
      ...options,
    });

    // Track token metadata
    const decoded = jwt.decode(token);
    this.tokenMetadata.set(token, {
      userId: payload.userId,
      createdAt: Date.now(),
      expiresAt: decoded.exp * 1000,
      scopes: payload.scopes || [],
      type: 'access',
    });

    return token;
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload, options = {}) {
    const claims = {
      ...payload,
      type: 'refresh',
      iss: this.issuer,
      aud: this.audience,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex'), // Unique ID for refresh token
    };

    const token = jwt.sign(claims, this.privateKey, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: this.algorithm,
      ...options,
    });

    const decoded = jwt.decode(token);
    this.tokenMetadata.set(token, {
      userId: payload.userId,
      createdAt: Date.now(),
      expiresAt: decoded.exp * 1000,
      jti: decoded.jti,
      type: 'refresh',
    });

    return token;
  }

  /**
   * Verify and decode token
   */
  verifyToken(token, options = {}) {
    try {
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      // Verify token signature and claims
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
        ...options,
      });

      // Additional validation
      const metadata = this.tokenMetadata.get(token);
      if (metadata) {
        if (decoded.type === 'refresh' && !decoded.jti) {
          throw new Error('Invalid refresh token format');
        }
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken) {
    const verification = this.verifyToken(refreshToken);

    if (!verification.valid) {
      return {
        success: false,
        error: verification.error,
      };
    }

    const payload = verification.payload;

    if (payload.type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid token type',
      };
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      scopes: payload.scopes,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      expiresIn: this.accessTokenExpiry,
    };
  }

  /**
   * Revoke token
   */
  revokeToken(token) {
    this.tokenBlacklist.add(token);
    const metadata = this.tokenMetadata.get(token);

    // Clean up metadata after expiry
    if (metadata) {
      setTimeout(
        () => {
          this.tokenBlacklist.delete(token);
          this.tokenMetadata.delete(token);
        },
        metadata.expiresAt - Date.now() + 1000
      );
    }

    return { success: true };
  }

  /**
   * Revoke all user tokens
   */
  revokeUserTokens(userId) {
    let revokedCount = 0;

    for (const [token, metadata] of this.tokenMetadata) {
      if (metadata.userId === userId) {
        this.tokenBlacklist.add(token);
        revokedCount++;
      }
    }

    return { success: true, revokedCount };
  }

  /**
   * Rotate keys
   */
  rotateKeys(newPublicKey, newPrivateKey) {
    if (Date.now() - this.lastRotation < this.rotationSchedule) {
      return {
        success: false,
        error: 'Key rotation not yet due',
      };
    }

    // Store old keys for verification of existing tokens
    this.oldPublicKey = this.publicKey;
    this.oldPrivateKey = this.privateKey;

    this.publicKey = newPublicKey;
    this.privateKey = newPrivateKey;
    this.lastRotation = Date.now();

    return {
      success: true,
      message: 'Keys rotated successfully',
      rotatedAt: this.lastRotation,
    };
  }

  /**
   * Verify with key rotation support
   */
  verifyTokenWithRotation(token) {
    let verification = this.verifyToken(token);

    // If verification fails and we have old key, try with old key
    if (!verification.valid && this.oldPublicKey) {
      try {
        const decoded = jwt.verify(token, this.oldPublicKey, {
          algorithms: [this.algorithm],
        });

        return {
          valid: true,
          payload: decoded,
          usedOldKey: true,
        };
      } catch (error) {
        // Continue with original error
      }
    }

    return verification;
  }

  /**
   * Get token statistics
   */
  getStatistics() {
    const activeTokens = Array.from(this.tokenMetadata.values()).filter(
      meta => meta.expiresAt > Date.now()
    );

    const tokensByType = {};
    const tokensByUser = {};

    for (const meta of activeTokens) {
      tokensByType[meta.type] = (tokensByType[meta.type] || 0) + 1;
      tokensByUser[meta.userId] = (tokensByUser[meta.userId] || 0) + 1;
    }

    return {
      totalTokens: this.tokenMetadata.size,
      activeTokens: activeTokens.length,
      blacklistedTokens: this.tokenBlacklist.size,
      tokensByType,
      topUsers: Object.entries(tokensByUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  }

  /**
   * Clean expired tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, metadata] of this.tokenMetadata) {
      if (metadata.expiresAt < now) {
        this.tokenMetadata.delete(token);
        this.tokenBlacklist.delete(token);
        cleaned++;
      }
    }

    return { cleaned };
  }

  /**
   * Get token info
   */
  getTokenInfo(token) {
    const verification = this.verifyToken(token);

    if (!verification.valid) {
      return { valid: false, error: verification.error };
    }

    const metadata = this.tokenMetadata.get(token);

    return {
      valid: true,
      payload: verification.payload,
      metadata,
      expiresIn: Math.max(0, (metadata?.expiresAt || 0) - Date.now()),
    };
  }
}

/**
 * Express middleware for JWT
 */
function jwtMiddleware(jwtManager) {
  return {
    /**
     * Authenticate middleware
     */
    authenticate: (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const verification = jwtManager.verifyToken(token);

      if (!verification.valid) {
        return res.status(401).json({ error: verification.error });
      }

      req.user = verification.payload;
      next();
    },

    /**
     * Optional authentication middleware
     */
    authenticateOptional: (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const verification = jwtManager.verifyToken(token);

        if (verification.valid) {
          req.user = verification.payload;
        }
      }

      next();
    },

    /**
     * Require specific claims
     */
    requireClaim: (claimName, expectedValue) => (req, res, next) => {
      if (!req.user || !req.user[claimName]) {
        return res.status(403).json({ error: `Missing required claim: ${claimName}` });
      }

      if (expectedValue && req.user[claimName] !== expectedValue) {
        return res.status(403).json({ error: `Invalid claim value for: ${claimName}` });
      }

      next();
    },
  };
}

module.exports = { JWTManager, jwtMiddleware };
