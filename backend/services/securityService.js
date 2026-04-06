/* eslint-disable no-unused-vars */
/**
 * 🔐 Security Service — خدمة إعدادات الأمان المتقدمة
 * AlAwael ERP — MFA, Sessions, Password, Security Policies, Activity Logs, Analytics
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const Session = require('../models/Session');
const SecurityLog = require('../models/securityLog.model');
const logger = require('../utils/logger');

/* ── Security Policy Schema (stored in-memory with DB persistence) ── */
const mongoose = require('mongoose');
const { escapeRegex } = require('../utils/sanitize');

const SecurityPolicySchema = new mongoose.Schema(
  {
    organizationId: { type: String, default: 'default' },
    sessionTimeout: { type: Number, default: 480, min: 5, max: 10080 }, // minutes (default 8h)
    maxConcurrentSessions: { type: Number, default: 5, min: 1, max: 20 },
    maxLoginAttempts: { type: Number, default: 5, min: 3, max: 20 },
    lockoutDuration: { type: Number, default: 30, min: 5, max: 1440 }, // minutes
    passwordMinLength: { type: Number, default: 8, min: 6, max: 32 },
    passwordRequireUppercase: { type: Boolean, default: true },
    passwordRequireLowercase: { type: Boolean, default: true },
    passwordRequireNumbers: { type: Boolean, default: true },
    passwordRequireSpecial: { type: Boolean, default: true },
    passwordExpiryDays: { type: Number, default: 90, min: 0, max: 365 }, // 0=never
    passwordHistoryCount: { type: Number, default: 5, min: 0, max: 20 },
    requireMfa: { type: Boolean, default: false },
    allowedMfaMethods: { type: [String], default: ['totp', 'backup_codes'] },
    ipWhitelist: { type: [String], default: [] },
    ipBlacklist: { type: [String], default: [] },
    trustedDevicesEnabled: { type: Boolean, default: true },
    trustedDeviceExpiry: { type: Number, default: 30, min: 1, max: 365 }, // days
    autoLogoutInactive: { type: Boolean, default: true },
    notifyOnNewLogin: { type: Boolean, default: true },
    notifyOnPasswordChange: { type: Boolean, default: true },
    notifyOnMfaChange: { type: Boolean, default: true },
    notifyOnSuspiciousActivity: { type: Boolean, default: true },
    enforceHttps: { type: Boolean, default: true },
    csrfProtection: { type: Boolean, default: true },
    rateLimitPerMinute: { type: Number, default: 100, min: 10, max: 1000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
const SecurityPolicy =
  mongoose.models.SecurityPolicy || mongoose.model('SecurityPolicy', SecurityPolicySchema);

/* ── Login Attempt Tracking ── */
const LoginAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, index: true },
  ip: String,
  userAgent: String,
  success: { type: Boolean, default: false },
  reason: String,
  timestamp: { type: Date, default: Date.now },
});
LoginAttemptSchema.index({ email: 1, timestamp: -1 });
LoginAttemptSchema.index({ ip: 1, timestamp: -1 });
LoginAttemptSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }); // 30 days TTL
const LoginAttempt =
  mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', LoginAttemptSchema);

/* ══════════════════════════════════════════════════════════════════════
   SecurityService Class
   ══════════════════════════════════════════════════════════════════════ */
class SecurityService {
  /* ─────────────────────────────────────────────────────────────────
     MFA — Multi-Factor Authentication
     ───────────────────────────────────────────────────────────────── */

  /**
   * Initialize MFA setup — generate secret + QR URL
   */
  async setupMfa(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('المستخدم غير موجود');
    if (user.mfa?.enabled) throw new Error('المصادقة الثنائية مفعّلة بالفعل');

    const secret = crypto.randomBytes(20).toString('hex');
    const otpauthUrl = `otpauth://totp/AlAwael:${user.email}?secret=${secret}&issuer=AlAwael%20ERP`;

    // Store secret temporarily (not enabled yet)
    await User.findByIdAndUpdate(userId, { 'mfa.secret': secret });

    await this.logEvent(userId, 'mfa_setup_initiated', 'medium', 'بدء إعداد المصادقة الثنائية');

    return { secret, otpauthUrl, email: user.email };
  }

  /**
   * Enable MFA after token verification
   */
  async enableMfa(userId, token, secret) {
    const user = await User.findById(userId).select('+mfa.secret');
    if (!user) throw new Error('المستخدم غير موجود');

    // Verify the TOTP token using speakeasy
    const isValid = this._verifyTotp(secret || user.mfa?.secret, token);
    if (!isValid) throw new Error('رمز التحقق غير صحيح');

    const backupCodes = this._generateBackupCodes(8);
    const hashedCodes = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));

    await User.findByIdAndUpdate(userId, {
      'mfa.enabled': true,
      'mfa.secret': secret || user.mfa?.secret,
      'mfa.backupCodes': hashedCodes,
      'mfa.enabledAt': new Date(),
    });

    await this.logEvent(userId, 'mfa_enabled', 'high', 'تم تفعيل المصادقة الثنائية');

    return { enabled: true, backupCodes };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId, password) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error('المستخدم غير موجود');

    // If password provided, verify it
    if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('كلمة المرور غير صحيحة');
    }

    await User.findByIdAndUpdate(userId, {
      'mfa.enabled': false,
      'mfa.secret': null,
      'mfa.backupCodes': [],
      'mfa.enabledAt': null,
    });

    await this.logEvent(userId, 'mfa_disabled', 'high', 'تم إلغاء المصادقة الثنائية');

    return { enabled: false };
  }

  /**
   * Get MFA status for a user
   */
  async getMfaStatus(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('المستخدم غير موجود');
    return {
      enabled: !!user.mfa?.enabled,
      enabledAt: user.mfa?.enabledAt || null,
      trustedDevices: (user.mfa?.trustedDevices || []).filter(
        d => !d.expiresAt || new Date(d.expiresAt) > new Date()
      ).length,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('المستخدم غير موجود');
    if (!user.mfa?.enabled) throw new Error('المصادقة الثنائية غير مفعّلة');

    const backupCodes = this._generateBackupCodes(8);
    const hashedCodes = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));

    await User.findByIdAndUpdate(userId, { 'mfa.backupCodes': hashedCodes });
    await this.logEvent(
      userId,
      'backup_codes_regenerated',
      'high',
      'تم إعادة إنشاء رموز الاسترداد'
    );

    return { backupCodes };
  }

  /* ─────────────────────────────────────────────────────────────────
     Sessions Management
     ───────────────────────────────────────────────────────────────── */

  /**
   * Get user's active sessions
   */
  async getActiveSessions(userId) {
    const sessions = await Session.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActivity: -1 })
      .lean();

    return sessions.map(s => ({
      _id: s._id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      device: s.device,
      location: s.location,
      lastActivity: s.lastActivity,
      createdAt: s.createdAt,
      isCurrent: false, // caller should mark current session
    }));
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId, userId) {
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) throw new Error('الجلسة غير موجودة');

    session.isActive = false;
    await session.save();

    await this.logEvent(
      userId,
      'session_terminated',
      'medium',
      `تم إنهاء جلسة: ${session.ipAddress}`
    );

    return { terminated: true };
  }

  /**
   * Terminate all other sessions
   */
  async terminateAllOtherSessions(userId, currentSessionToken) {
    const filter = { userId, isActive: true };
    if (currentSessionToken) {
      filter.token = { $ne: currentSessionToken };
    }

    const result = await Session.updateMany(filter, { isActive: false });
    await this.logEvent(
      userId,
      'all_sessions_terminated',
      'high',
      `تم إنهاء ${result.modifiedCount} جلسة`
    );

    return { terminated: result.modifiedCount };
  }

  /* ─────────────────────────────────────────────────────────────────
     Password Management
     ───────────────────────────────────────────────────────────────── */

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password +passwordHistory');
    if (!user) throw new Error('المستخدم غير موجود');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('كلمة المرور الحالية غير صحيحة');

    // Check password policy
    const policy = await this.getSecurityPolicy();
    this._validatePasswordPolicy(newPassword, policy);

    // Check password history
    if (policy.passwordHistoryCount > 0 && user.passwordHistory?.length) {
      const recent = user.passwordHistory.slice(-policy.passwordHistoryCount);
      for (const oldHash of recent) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          throw new Error('لا يمكن استخدام كلمة مرور سابقة');
        }
      }
    }

    // Hash and save
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);

    const history = [...(user.passwordHistory || []), user.password].slice(-10);

    await User.findByIdAndUpdate(userId, {
      password: hashed,
      passwordChangedAt: new Date(),
      passwordHistory: history,
      requirePasswordChange: false,
    });

    await this.logEvent(userId, 'password_changed', 'high', 'تم تغيير كلمة المرور');

    return { changed: true };
  }

  /* ─────────────────────────────────────────────────────────────────
     Security Policy
     ───────────────────────────────────────────────────────────────── */

  /**
   * Get current security policy
   */
  async getSecurityPolicy() {
    let policy = await SecurityPolicy.findOne({ organizationId: 'default' }).lean();
    if (!policy) {
      policy = await SecurityPolicy.create({ organizationId: 'default' });
      policy = policy.toObject();
    }
    return policy;
  }

  /**
   * Update security policy
   */
  async updateSecurityPolicy(updates, userId) {
    const allowed = [
      'sessionTimeout',
      'maxConcurrentSessions',
      'maxLoginAttempts',
      'lockoutDuration',
      'passwordMinLength',
      'passwordRequireUppercase',
      'passwordRequireLowercase',
      'passwordRequireNumbers',
      'passwordRequireSpecial',
      'passwordExpiryDays',
      'passwordHistoryCount',
      'requireMfa',
      'allowedMfaMethods',
      'ipWhitelist',
      'ipBlacklist',
      'trustedDevicesEnabled',
      'trustedDeviceExpiry',
      'autoLogoutInactive',
      'notifyOnNewLogin',
      'notifyOnPasswordChange',
      'notifyOnMfaChange',
      'notifyOnSuspiciousActivity',
      'enforceHttps',
      'csrfProtection',
      'rateLimitPerMinute',
    ];

    const clean = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) clean[key] = updates[key];
    }
    clean.updatedBy = userId;

    const policy = await SecurityPolicy.findOneAndUpdate({ organizationId: 'default' }, clean, {
      new: true,
      upsert: true,
      runValidators: true,
    }).lean();

    await this.logEvent(userId, 'security_policy_updated', 'critical', 'تم تحديث سياسة الأمان');

    return policy;
  }

  /* ─────────────────────────────────────────────────────────────────
     IP Whitelist / Blacklist
     ───────────────────────────────────────────────────────────────── */

  async addIpToWhitelist(ip, userId) {
    const policy = await SecurityPolicy.findOne({ organizationId: 'default' });
    if (!policy.ipWhitelist.includes(ip)) {
      policy.ipWhitelist.push(ip);
      await policy.save();
    }
    await this.logEvent(userId, 'ip_whitelisted', 'high', `تمت إضافة IP للقائمة البيضاء: ${ip}`);
    return policy.ipWhitelist;
  }

  async removeIpFromWhitelist(ip, userId) {
    const policy = await SecurityPolicy.findOne({ organizationId: 'default' });
    policy.ipWhitelist = policy.ipWhitelist.filter(i => i !== ip);
    await policy.save();
    await this.logEvent(
      userId,
      'ip_removed_whitelist',
      'high',
      `تمت إزالة IP من القائمة البيضاء: ${ip}`
    );
    return policy.ipWhitelist;
  }

  async addIpToBlacklist(ip, userId) {
    const policy = await SecurityPolicy.findOne({ organizationId: 'default' });
    if (!policy.ipBlacklist.includes(ip)) {
      policy.ipBlacklist.push(ip);
      await policy.save();
    }
    await this.logEvent(
      userId,
      'ip_blacklisted',
      'critical',
      `تمت إضافة IP للقائمة السوداء: ${ip}`
    );
    return policy.ipBlacklist;
  }

  async removeIpFromBlacklist(ip, userId) {
    const policy = await SecurityPolicy.findOne({ organizationId: 'default' });
    policy.ipBlacklist = policy.ipBlacklist.filter(i => i !== ip);
    await policy.save();
    await this.logEvent(
      userId,
      'ip_removed_blacklist',
      'high',
      `تمت إزالة IP من القائمة السوداء: ${ip}`
    );
    return policy.ipBlacklist;
  }

  /* ─────────────────────────────────────────────────────────────────
     Security Logs & Activity
     ───────────────────────────────────────────────────────────────── */

  /**
   * Get security logs for a user
   */
  async getUserLogs(userId, query = {}) {
    const { page = 1, limit = 50, eventType, severity, from, to } = query;
    const filter = { userId };
    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [logs, total] = await Promise.all([
      SecurityLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(+limit).lean(),
      SecurityLog.countDocuments(filter),
    ]);

    return { logs, pagination: { page: +page, limit: +limit, total } };
  }

  /**
   * Get all security logs (admin)
   */
  async getAllLogs(query = {}) {
    const { page = 1, limit = 50, eventType, severity, userId, ip } = query;
    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity;
    if (userId) filter.userId = userId;
    if (ip) filter.ip = ip;

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [logs, total] = await Promise.all([
      SecurityLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('userId', 'name email')
        .lean(),
      SecurityLog.countDocuments(filter),
    ]);

    return { logs, pagination: { page: +page, limit: +limit, total } };
  }

  /**
   * Log a security event
   */
  async logEvent(userId, action, severity = 'low', details = '', extra = {}) {
    try {
      await SecurityLog.create({
        userId,
        action,
        severity,
        ip: extra.ip || 'system',
        userAgent: extra.userAgent || '',
        eventType: this._mapActionToEventType(action),
        details: { body: { message: details, ...extra } },
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error('Failed to write security log:', err.message);
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     Login Attempts
     ───────────────────────────────────────────────────────────────── */

  async getLoginAttempts(query = {}) {
    const { page = 1, limit = 50, email, ip, success } = query;
    const filter = {};
    if (email) filter.email = { $regex: escapeRegex(email), $options: 'i' };
    if (ip) filter.ip = ip;
    if (success !== undefined) filter.success = success === 'true';

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [attempts, total] = await Promise.all([
      LoginAttempt.find(filter).sort({ timestamp: -1 }).skip(skip).limit(+limit).lean(),
      LoginAttempt.countDocuments(filter),
    ]);

    return { attempts, pagination: { page: +page, limit: +limit, total } };
  }

  /* ─────────────────────────────────────────────────────────────────
     Security Overview / Analytics
     ───────────────────────────────────────────────────────────────── */

  async getSecurityOverview() {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      mfaEnabledUsers,
      activeSessions,
      logs24h,
      failedLogins24h,
      failedLogins7d,
      criticalEvents,
      logsBySeverity,
      logsByType,
      recentCritical,
    ] = await Promise.all([
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ 'mfa.enabled': true }),
      Session.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
      SecurityLog.countDocuments({ timestamp: { $gte: last24h } }),
      LoginAttempt.countDocuments({ success: false, timestamp: { $gte: last24h } }),
      LoginAttempt.countDocuments({ success: false, timestamp: { $gte: last7d } }),
      SecurityLog.countDocuments({ severity: 'critical', timestamp: { $gte: last7d } }),
      SecurityLog.aggregate([
        { $match: { timestamp: { $gte: last30d } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      SecurityLog.aggregate([
        { $match: { timestamp: { $gte: last30d } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
      SecurityLog.find({ severity: { $in: ['critical', 'high'] } })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .lean(),
    ]);

    return {
      totalUsers,
      mfaEnabledUsers,
      mfaAdoptionRate: totalUsers > 0 ? Math.round((mfaEnabledUsers / totalUsers) * 100) : 0,
      activeSessions,
      logs24h,
      failedLogins24h,
      failedLogins7d,
      criticalEvents,
      logsBySeverity,
      logsByType,
      recentCritical,
      securityScore: this._calculateSecurityScore({
        totalUsers,
        mfaEnabledUsers,
        failedLogins24h,
        criticalEvents,
      }),
    };
  }

  /**
   * Get security dashboard stats
   */
  async getSecurityStats() {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    const [totalLogs, activeSessions, mfaUsers, totalUsers] = await Promise.all([
      SecurityLog.countDocuments({ timestamp: { $gte: last24h } }),
      Session.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
      User.countDocuments({ 'mfa.enabled': true }),
      User.countDocuments({ isActive: { $ne: false } }),
    ]);

    return { totalLogs, activeSessions, mfaUsers, totalUsers };
  }

  /* ─────────────────────────────────────────────────────────────────
     User Security Profile (for settings page)
     ───────────────────────────────────────────────────────────────── */

  async getUserSecurityProfile(userId) {
    const user = await User.findById(userId).select('email name mfa passwordChangedAt role');
    if (!user) throw new Error('المستخدم غير موجود');

    const [activeSessions, recentLogs] = await Promise.all([
      Session.countDocuments({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      }),
      SecurityLog.find({ userId }).sort({ timestamp: -1 }).limit(5).lean(),
    ]);

    return {
      email: user.email,
      name: user.name,
      role: user.role,
      mfaEnabled: !!user.mfa?.enabled,
      mfaEnabledAt: user.mfa?.enabledAt,
      trustedDevicesCount: (user.mfa?.trustedDevices || []).filter(
        d => !d.expiresAt || new Date(d.expiresAt) > new Date()
      ).length,
      passwordChangedAt: user.passwordChangedAt,
      activeSessions,
      recentActivity: recentLogs,
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     Private Helpers
     ───────────────────────────────────────────────────────────────── */

  _verifyTotp(secret, token) {
    if (!secret || !token) return false;
    return speakeasy.totp.verify({
      secret,
      encoding: 'hex',
      token: String(token),
      window: 2, // Allow 2 time-step tolerance (±60 seconds)
    });
  }

  _generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () =>
      crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()
        .replace(/(.{4})(.{4})/, '$1-$2')
    );
  }

  _validatePasswordPolicy(password, policy) {
    if (password.length < (policy.passwordMinLength || 8)) {
      throw new Error(`كلمة المرور يجب أن تكون ${policy.passwordMinLength || 8} أحرف على الأقل`);
    }
    if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('كلمة المرور يجب أن تحتوي على حرف كبير');
    }
    if (policy.passwordRequireLowercase && !/[a-z]/.test(password)) {
      throw new Error('كلمة المرور يجب أن تحتوي على حرف صغير');
    }
    if (policy.passwordRequireNumbers && !/[0-9]/.test(password)) {
      throw new Error('كلمة المرور يجب أن تحتوي على رقم');
    }
    if (policy.passwordRequireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      throw new Error('كلمة المرور يجب أن تحتوي على رمز خاص');
    }
  }

  _mapActionToEventType(action) {
    if (/login|auth/.test(action)) return 'login';
    if (/logout/.test(action)) return 'logout';
    if (/password|mfa|security/.test(action)) return 'modification';
    if (/delete|remove/.test(action)) return 'deletion';
    if (/fail|block|suspicious/.test(action)) return 'failed_auth';
    return 'access';
  }

  _calculateSecurityScore({ totalUsers, mfaEnabledUsers, failedLogins24h, criticalEvents }) {
    let score = 100;
    // MFA adoption penalty
    if (totalUsers > 0) {
      const mfaRate = mfaEnabledUsers / totalUsers;
      if (mfaRate < 0.5) score -= 20;
      else if (mfaRate < 0.8) score -= 10;
    }
    // Failed logins penalty
    if (failedLogins24h > 20) score -= 15;
    else if (failedLogins24h > 10) score -= 10;
    else if (failedLogins24h > 5) score -= 5;
    // Critical events penalty
    if (criticalEvents > 5) score -= 20;
    else if (criticalEvents > 2) score -= 10;
    else if (criticalEvents > 0) score -= 5;
    return Math.max(0, Math.min(100, score));
  }
}

/* ─────────────────────────────────────────────────────────────────
   Compatibility aliases — used by Phase 7 tests
   ───────────────────────────────────────────────────────────────── */
SecurityService.prototype.generateMfaSecret = SecurityService.prototype.setupMfa;
SecurityService.prototype.verifyMfaToken = async function (userId, token, secret) {
  return this._verifyTotp(secret, token);
};
SecurityService.prototype.logSecurityEvent = async function ({ action, userId, description }) {
  return this.logEvent(userId, action, 'medium', description);
};

// Singleton
const securityService = new SecurityService();

module.exports = {
  SecurityService,
  securityService,
  SecurityPolicy,
  LoginAttempt,
};
