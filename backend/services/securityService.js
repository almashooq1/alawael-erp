const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

class SecurityService {
  /**
   * Generates a new MFA secret for a user.
   * In a production environment, this would use a library like 'speakeasy'.
   * Here we mock the generation for the prototype.
   */
  async generateMfaSecret(userId) {
    const secret = crypto.randomBytes(20).toString('hex'); // Mock secret
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // In PROD: Generate otpauth URL for QR code
    const otpauth_url = `otpauth://totp/Alaweal:${user.email}?secret=${secret}&issuer=Alaweal`;

    return { secret, otpauth_url };
  }

  /**
   * Verifies an MFA token.
   * For this phase, we accept '123456' as the universal master code for testing,
   * or we could implement actual TOTP if we imported a library.
   */
  async verifyMfaToken(userId, token, secret) {
    // Development backdoor/mock
    if (token === '123456') return true;

    // In PROD: speakeasy.totp.verify({ secret, encoding: 'base32', token });
    return false;
  }

  /**
   * Enables MFA for a user after successful verification.
   */
  async enableMfa(userId, secret) {
    const user = await User.findById(userId);
    user.mfa.enabled = true;
    user.mfa.secret = secret; // In PROD: Encrypt this!
    user.mfa.backupCodes = this.generateBackupCodes();
    await user.save();

    await this.logSecurityEvent({
      action: 'MFA_ENABLED',
      userId: userId,
      description: 'User enabled Multi-Factor Authentication',
    });

    return { params: user.mfa };
  }

  generateBackupCodes() {
    return Array(6)
      .fill(0)
      .map(() => crypto.randomBytes(4).toString('hex'));
  }

  /**
   * Logs a security audit event.
   */
  async logSecurityEvent({ action, userId, ip, description, module = 'SECURITY', status = 'SUCCESS' }) {
    try {
      const log = new AuditLog({
        action,
        module,
        actor: userId ? { id: userId } : undefined,
        description,
        status,
        meta: { ip: ip || 'unknown' },
        timestamp: new Date(),
      });
      await log.save();
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Retrieves security logs for admin or user.
   */
  async getSecurityLogs(filter = {}) {
    return await AuditLog.find(filter).sort({ timestamp: -1 }).limit(100);
  }
}

module.exports = new SecurityService();
