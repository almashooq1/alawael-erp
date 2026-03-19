/* eslint-disable no-unused-vars */
/**
 * Authentication Controller
 * Handles user authentication and session management
 * Maps requests to AuthService methods
 */

const AuthService = require('../services/authService');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Username, email, and password are required',
          code: 'MISSING_FIELDS',
        });
      }

      // Validate email format
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD',
        });
      }

      const user = this.authService.registerUser({
        username,
        email,
        password,
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if ((error.message || '').includes('already exists')) {
        return res.status(409).json({
          error: 'conflict',
          message: 'حدث خطأ داخلي',
          code: 'USER_EXISTS',
        });
      }
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Username and password are required',
          code: 'MISSING_CREDENTIALS',
        });
      }

      const result = this.authService.authenticateUser(username, password);

      if (!result.success) {
        return res.status(401).json({
          error: 'authentication_failed',
          message: result.error,
          code: 'INVALID_CREDENTIALS',
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify token
   * GET /api/v1/auth/verify
   */
  async verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'No token provided',
          code: 'MISSING_TOKEN',
        });
      }

      const result = this.authService.verifyToken(token);

      if (!result.valid) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          userId: result.userId,
          username: result.username,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Refresh token is required',
          code: 'MISSING_TOKEN',
        });
      }

      const result = this.authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      if ((error.message || '').includes('Invalid')) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'حدث خطأ داخلي',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Session ID is required',
          code: 'MISSING_SESSION_ID',
        });
      }

      this.authService.logoutUser(sessionId);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA
   * POST /api/v1/auth/2fa/setup
   */
  async enableTwoFactor(req, res, next) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const result = this.authService.enableTwoFactor(userId);

      res.json({
        success: true,
        data: {
          secret: result.secret,
          qrCode: result.qrCode,
          backupCodes: result.backupCodes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 2FA code
   * POST /api/v1/auth/2fa/verify
   */
  async verifyTwoFactor(req, res, next) {
    try {
      const userId = req.user?.id;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      if (!code) {
        return res.status(400).json({
          error: 'validation_error',
          message: '2FA code is required',
          code: 'MISSING_CODE',
        });
      }

      const result = this.authService.verifyTwoFactor(userId, code);

      res.json({
        success: true,
        data: {
          verified: result.verified,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   * POST /api/v1/auth/password/reset
   */
  async resetPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Email is required',
          code: 'MISSING_EMAIL',
        });
      }

      const result = this.authService.resetPassword(email);

      res.json({
        success: true,
        message: 'Password reset email sent',
        resetToken: result.token, // Would be sent via email in production
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update password
   * POST /api/v1/auth/password/update
   */
  async updatePassword(req, res, next) {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Current and new password are required',
          code: 'MISSING_PASSWORDS',
        });
      }

      const result = this.authService.updatePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
