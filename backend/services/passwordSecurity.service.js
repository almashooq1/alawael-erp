/**
 * Password Security Service
 * خدمة أمان كلمات المرور
 *
 * Features:
 * - Force password rotation every 90 days
 * - Password strength checker
 * - Prevent password reuse (last 5 passwords)
 * - Compromised password detection
 * - Password history tracking
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const User = require('../models/User');
const AuditLogger = require('./audit-logger');

class PasswordSecurityService {
  constructor() {
    this.PASSWORD_EXPIRY_DAYS = 90;
    this.PASSWORD_HISTORY_LENGTH = 5;
    this.MIN_PASSWORD_LENGTH = 8;
  }

  /**
   * Check password strength
   * Returns score 0-5 and feedback
   */
  checkPasswordStrength(password) {
    let score = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) score++;
    else feedback.push('Password must be at least 8 characters');

    if (password.length >= 12) score++;

    // Complexity checks
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');

    // Common patterns (reduce score)
    const commonPatterns = [/123456/, /password/i, /qwerty/i, /admin/i, /welcome/i, /letmein/i];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      score = Math.max(0, score - 2);
      feedback.push('Avoid common passwords');
    }

    // Sequential characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid repeated characters');
    }

    // Strength level
    let strength = 'very-weak';
    if (score >= 5) strength = 'very-strong';
    else if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';
    else if (score >= 2) strength = 'weak';

    return {
      score,
      strength,
      feedback,
      passed: score >= 3,
    };
  }

  /**
   * Check if password is compromised (HaveIBeenPwned API)
   */
  async isPasswordCompromised(password) {
    try {
      // Hash password with SHA-1
      const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1Hash.substring(0, 5);
      const suffix = sha1Hash.substring(5);

      // Query HaveIBeenPwned API (k-anonymity model)
      const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
        timeout: 5000,
      });

      // Check if suffix exists in response
      const hashes = response.data.split('\n');
      for (const line of hashes) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
          return {
            compromised: true,
            count: parseInt(count, 10),
          };
        }
      }

      return { compromised: false };
    } catch (error) {
      console.warn('Failed to check compromised password:', error.message);
      return { compromised: false, error: error.message };
    }
  }

  /**
   * Check if password is reused
   */
  async isPasswordReused(userId, newPassword) {
    try {
      const user = await User.findById(userId).select('+passwordHistory');
      if (!user || !user.passwordHistory || user.passwordHistory.length === 0) {
        return false;
      }

      // Check against password history
      for (const oldPasswordHash of user.passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, oldPasswordHash);
        if (isMatch) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking password reuse:', error);
      return false;
    }
  }

  /**
   * Check if password needs rotation
   */
  async needsPasswordRotation(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.passwordChangedAt) {
        return false;
      }

      const daysSinceChange = (Date.now() - user.passwordChangedAt) / (1000 * 60 * 60 * 24);
      return daysSinceChange >= this.PASSWORD_EXPIRY_DAYS;
    } catch (error) {
      console.error('Error checking password rotation:', error);
      return false;
    }
  }

  /**
   * Validate password change
   */
  async validatePasswordChange(userId, oldPassword, newPassword) {
    const errors = [];

    try {
      // 1. Verify current password
      const user = await User.findById(userId).select('+password +passwordHistory');
      if (!user) {
        throw new Error('User not found');
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        errors.push('Current password is incorrect');
      }

      // 2. Check password strength
      const strengthCheck = this.checkPasswordStrength(newPassword);
      if (!strengthCheck.passed) {
        errors.push(`Weak password: ${strengthCheck.feedback.join(', ')}`);
      }

      // 3. Check if password is reused
      const isReused = await this.isPasswordReused(userId, newPassword);
      if (isReused) {
        errors.push('Cannot reuse recent passwords');
      }

      // 4. Check if password is compromised
      const compromisedCheck = await this.isPasswordCompromised(newPassword);
      if (compromisedCheck.compromised) {
        errors.push(`This password has been compromised ${compromisedCheck.count} times`);
      }

      return {
        valid: errors.length === 0,
        errors,
        strengthCheck,
        compromisedCheck,
      };
    } catch (error) {
      console.error('Error validating password change:', error);
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Validate password change
      const validation = await this.validatePasswordChange(userId, oldPassword, newPassword);

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user
      const user = await User.findById(userId).select('+password +passwordHistory');
      if (!user) {
        throw new Error('User not found');
      }

      // Add current password to history
      user.passwordHistory = user.passwordHistory || [];
      user.passwordHistory.unshift(user.password);

      // Keep only last N passwords
      if (user.passwordHistory.length > this.PASSWORD_HISTORY_LENGTH) {
        user.passwordHistory = user.passwordHistory.slice(0, this.PASSWORD_HISTORY_LENGTH);
      }

      // Update password
      user.password = hashedPassword;
      user.passwordChangedAt = new Date();

      await user.save();

      // Log audit event
      await AuditLogger.log({
        action: 'password.changed',
        userId,
        metadata: {
          strengthScore: validation.strengthCheck.score,
          compromised: validation.compromisedCheck.compromised,
        },
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Force password reset
   */
  async forcePasswordReset(userId, reason = 'security') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.requirePasswordChange = true;
      user.passwordResetReason = reason;
      await user.save();

      await AuditLogger.log({
        action: 'password.force_reset',
        userId,
        metadata: { reason },
      });

      return { success: true };
    } catch (error) {
      console.error('Error forcing password reset:', error);
      throw error;
    }
  }

  /**
   * Get password security info
   */
  async getPasswordSecurityInfo(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const daysSinceChange = user.passwordChangedAt
        ? Math.floor((Date.now() - user.passwordChangedAt) / (1000 * 60 * 60 * 24))
        : null;

      const daysUntilExpiry = daysSinceChange
        ? Math.max(0, this.PASSWORD_EXPIRY_DAYS - daysSinceChange)
        : null;

      return {
        passwordChangedAt: user.passwordChangedAt,
        daysSinceChange,
        daysUntilExpiry,
        expiryDate: user.passwordChangedAt
          ? new Date(
              user.passwordChangedAt.getTime() + this.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000
            )
          : null,
        requiresChange: user.requirePasswordChange || false,
        passwordHistoryCount: user.passwordHistory?.length || 0,
      };
    } catch (error) {
      console.error('Error getting password security info:', error);
      throw error;
    }
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';

    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Bulk check users needing password rotation
   */
  async getUsersNeedingRotation() {
    try {
      const expiryDate = new Date(Date.now() - this.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const users = await User.find({
        $or: [
          { passwordChangedAt: { $lt: expiryDate } },
          { passwordChangedAt: null },
          { requirePasswordChange: true },
        ],
      }).select('email username passwordChangedAt requirePasswordChange');

      return users;
    } catch (error) {
      console.error('Error getting users needing rotation:', error);
      return [];
    }
  }
}

module.exports = new PasswordSecurityService();
