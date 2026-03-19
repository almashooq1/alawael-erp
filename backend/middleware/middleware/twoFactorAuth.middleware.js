/**
 * Two-Factor Authentication Middleware
 * Implements TOTP (Time-based One-Time Password) 2FA
 * Protects admin and sensitive accounts
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate 2FA secret for user
 * Returns: { secret, qrCode, backupCodes }
 */
const generate2FASecret = async (userId, userEmail) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `AlAwael ERP (${userEmail})`,
      issuer: 'AlAwael',
      length: 32
    });

    // Generate backup codes (10 codes for account recovery)
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Generate QR code image
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
      manualEntryKey: secret.base32,
      uri: secret.otpauth_url
    };
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    throw new Error('Failed to generate 2FA secret');
  }
};

/**
 * Verify TOTP token
 * Returns: boolean (token is valid or not)
 */
const verify2FAToken = (secret, token, window = 2) => {
  try {
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window
    });
    return isValid;
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
};

/**
 * Verify backup code
 * Returns: boolean and removes used code
 */
const verifyBackupCode = (code, backupCodes) => {
  const index = backupCodes.indexOf(code.toUpperCase());
  if (index === -1) {
    return { valid: false };
  }
  
  // Remove used code
  backupCodes.splice(index, 1);
  
  return { valid: true, remainingCodes: backupCodes.length };
};

/**
 * Middleware to require 2FA for sensitive operations
 */
const require2FA = async (req, res, next) => {
  try {
    // Check if user has 2FA enabled
    if (!req.user.twoFactorEnabled) {
      return res.status(403).json({
        error: 'Two-factor authentication required for this operation',
        requires2FA: true
      });
    }

    // Check if 2FA has been verified in this session
    if (!req.session || !req.session.twoFactorVerified) {
      return res.status(403).json({
        error: 'Please verify your 2FA token',
        needs2FAVerification: true
      });
    }

    // Check if 2FA verification is still valid (5 minutes)
    const verificationAge = Date.now() - req.session.twoFactorVerifiedAt;
    if (verificationAge > 5 * 60 * 1000) {
      req.session.twoFactorVerified = false;
      return res.status(403).json({
        error: '2FA verification expired. Please verify again',
        needs2FAVerification: true
      });
    }

    next();
  } catch (error) {
    console.error('Error in 2FA middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify 2FA token and create session
 */
const verify2FAMiddleware = async (req, res, next) => {
  try {
    const { token, backupCode } = req.body;

    if (!token && !backupCode) {
      return res.status(400).json({
        error: 'Token or backup code required'
      });
    }

    // Verify TOTP token
    if (token) {
      const isValid = verify2FAToken(req.user.twoFactorSecret, token);
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid 2FA token'
        });
      }
    } 
    // Verify backup code
    else if (backupCode) {
      const result = verifyBackupCode(backupCode, req.user.twoFactorBackupCodes);
      if (!result.valid) {
        return res.status(401).json({
          error: 'Invalid backup code'
        });
      }
      // Update user on backup code consumption
      req.user.twoFactorBackupCodes = result.remainingCodes;
      await req.user.save();
    }

    // Mark 2FA as verified in session
    if (req.session) {
      req.session.twoFactorVerified = true;
      req.session.twoFactorVerifiedAt = Date.now();
    }

    next();
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Enable 2FA for user account
 */
const enableUserTwoFactor = async (req, res, _next) => {
  try {
    const { secret, backupCodes } = req.body;

    // Verify the secret is valid
    if (!secret || !Array.isArray(backupCodes) || backupCodes.length === 0) {
      return res.status(400).json({
        error: 'Invalid 2FA setup data'
      });
    }

    // Store encrypted secret on user
    req.user.twoFactorSecret = secret;
    req.user.twoFactorBackupCodes = backupCodes;
    req.user.twoFactorEnabled = true;
    req.user.twoFactorEnabledAt = new Date();

    await req.user.save();

    res.json({
      message: '2FA enabled successfully',
      backupCodesRemaining: backupCodes.length,
      warning: 'Store backup codes in a safe location'
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

/**
 * Disable 2FA for user (requires current password)
 */
const disableUserTwoFactor = async (req, res, _next) => {
  try {
    const { password } = req.body;

    // Verify password before disabling
    if (!password) {
      return res.status(400).json({
        error: 'Current password required to disable 2FA'
      });
    }

    // Verify password (implementation depends on auth method)
    const isPasswordValid = await req.user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Remove 2FA
    req.user.twoFactorEnabled = false;
    req.user.twoFactorSecret = null;
    req.user.twoFactorBackupCodes = [];
    req.user.twoFactorEnabledAt = null;

    await req.user.save();

    res.json({
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

/**
 * Create backup codes for user
 */
const regenerateBackupCodes = async (req, res, _next) => {
  try {
    if (!req.user.twoFactorEnabled) {
      return res.status(400).json({
        error: '2FA must be enabled first'
      });
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Update user
    req.user.twoFactorBackupCodes = backupCodes;
    await req.user.save();

    res.json({
      backupCodes,
      codesRemaining: backupCodes.length,
      message: 'New backup codes generated. Old codes are no longer valid.'
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
};

/**
 * Get 2FA status for user
 */
const getTwoFactorStatus = (req, res) => {
  res.json({
    twoFactorEnabled: req.user.twoFactorEnabled || false,
    twoFactorEnabledAt: req.user.twoFactorEnabledAt || null,
    backupCodesRemaining: req.user.twoFactorBackupCodes?.length || 0,
    needsRecovery: (req.user.twoFactorBackupCodes?.length || 0) < 3
  });
};

module.exports = {
  // Core 2FA functions
  generate2FASecret,
  verify2FAToken,
  verifyBackupCode,

  // Middleware
  require2FA,
  verify2FAMiddleware,

  // Route handlers
  enableUserTwoFactor,
  disableUserTwoFactor,
  regenerateBackupCodes,
  getTwoFactorStatus
};
