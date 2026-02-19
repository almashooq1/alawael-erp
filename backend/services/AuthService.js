/**
 * Authentication Service
 * JWT token generation, verification, and password management
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} role - User role (admin, finance_officer, analyst, viewer)
   * @returns {string} JWT token
   */
  static generateToken(userId, email, role) {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const payload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      type: 'access',
    };

    try {
      const token = jwt.sign(payload, jwtSecret, {
        expiresIn,
        algorithm: 'HS256',
      });
      return { success: true, token, expiresIn };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate Refresh Token (longer expiry)
   * @param {string} userId - User ID
   * @returns {string} Refresh token
   */
  static generateRefreshToken(userId) {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      type: 'refresh',
    };

    try {
      const token = jwt.sign(payload, jwtSecret, {
        expiresIn,
        algorithm: 'HS256',
      });
      return { success: true, token, expiresIn };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {object} Verification result with decoded payload
   */
  static verifyToken(token) {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

    try {
      // Remove "Bearer " prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      const decoded = jwt.verify(cleanToken, jwtSecret, {
        algorithms: ['HS256'],
      });

      return {
        valid: true,
        decoded,
        error: null,
      };
    } catch (error) {
      return {
        valid: false,
        decoded: null,
        error: error.message,
        code: error.code || 'INVALID_TOKEN',
      };
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    try {
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      return { success: true, hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  static async comparePassword(password, hash) {
    try {
      const match = await bcrypt.compare(password, hash);
      return { success: true, match };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Decode token without verification (for inspection)
   * @param {string} token - JWT token
   * @returns {object} Decoded payload
   */
  static decodeToken(token) {
    try {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.decode(cleanToken);
      return { success: true, decoded };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  static isTokenExpired(token) {
    const result = this.decodeToken(token);
    if (!result.success) return true;

    const { decoded } = result;
    if (!decoded.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Get time until token expires
   * @param {string} token - JWT token
   * @returns {number} Seconds until expiry, or -1 if expired
   */
  static getTokenTimeToExpire(token) {
    const result = this.decodeToken(token);
    if (!result.success) return -1;

    const { decoded } = result;
    if (!decoded.exp) return Infinity;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeToExpire = decoded.exp - currentTime;

    return timeToExpire > 0 ? timeToExpire : -1;
  }
}

module.exports = AuthService;
