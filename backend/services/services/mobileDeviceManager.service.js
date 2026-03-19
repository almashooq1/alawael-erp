/**
 * Mobile Device Manager Service
 * خدمة إدارة الأجهزة المحمولة
 * 
 * المسؤوليات:
 * - إدارة تسجيل الأجهزة
 * - تتبع حالة الجهاز
 * - إدارة جلسات المستخدم على الهاتف
 * - تحديد الأجهزة الموثوقة والمشبوهة
 * - إدارة المصادقة البيومترية
 */

const EventEmitter = require('events');
const uuid = require('crypto').randomUUID;
const { Logger } = require('../utils/logger');

class MobileDeviceManager extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.deviceSessions = new Map();
    this.trustedDevices = new Set();
    this.suspiciousActivity = new Map();
  }

  /**
   * تسجيل جهاز محمول جديد
   * Register a new mobile device
   */
  registerDevice(data) {
    try {
      const deviceId = uuid();
      const device = {
        id: deviceId,
        userId: data.userId,
        deviceName: data.deviceName || 'Unknown Device',
        osType: data.osType, // iOS, Android
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        model: data.model,
        manufacturer: data.manufacturer,
        pushToken: data.pushToken,
        biometricEnabled: data.biometricEnabled || false,
        registeredAt: new Date(),
        lastSeen: new Date(),
        isActive: true,
        trustedUntil: null,
        deviceFingerprint: this._generateFingerprint(data),
        securityLevel: 'normal',
        syncStatus: 'initial',
        storageSpace: {
          total: data.totalStorage || 0,
          used: data.usedStorage || 0,
          available: data.availableStorage || 0,
        },
        appSettings: {
          debugMode: false,
          analyticsEnabled: true,
          crashReportingEnabled: true,
          offlineModeEnabled: true,
        },
        metadata: {
          locale: data.locale || 'en',
          timezone: data.timezone || 'UTC',
          networkType: data.networkType || 'unknown',
          batteryLevel: data.batteryLevel || 100,
        },
      };

      this.devices.set(deviceId, device);
      Logger.info(`📱 Device registered: ${deviceId} (${device.osType})`);

      this.emit('device:registered', {
        deviceId,
        userId: data.userId,
        osType: data.osType,
        timestamp: new Date(),
      });

      return device;
    } catch (error) {
      Logger.error('Device registration error:', error);
      throw error;
    }
  }

  /**
   * الحصول على جهاز محدد
   * Get specific device
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  /**
   * الحصول على جميع أجهزة المستخدم
   * Get all user devices
   */
  getUserDevices(userId) {
    return Array.from(this.devices.values()).filter(d => d.userId === userId);
  }

  /**
   * تحديث حالة الجهاز
   * Update device status
   */
  updateDeviceStatus(deviceId, status) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.lastSeen = new Date();
    device.syncStatus = status;

    this.emit('device:statusUpdated', {
      deviceId,
      status,
      timestamp: new Date(),
    });

    return device;
  }

  /**
   * إنشاء جلسة جهاز
   * Create device session
   */
  createSession(deviceId, userId) {
    try {
      const sessionId = uuid();
      const session = {
        id: sessionId,
        deviceId,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        lastActivity: new Date(),
        isActive: true,
        activityCount: 0,
        ipAddress: null,
        userAgent: null,
      };

      this.deviceSessions.set(sessionId, session);
      Logger.info(`🔐 Session created: ${sessionId}`);

      this.emit('session:created', {
        sessionId,
        deviceId,
        userId,
      });

      return session;
    } catch (error) {
      Logger.error('Session creation error:', error);
      throw error;
    }
  }

  /**
   * التحقق من صحة الجلسة
   * Validate session
   */
  validateSession(sessionId) {
    const session = this.deviceSessions.get(sessionId);
    if (!session) return null;

    if (!session.isActive || new Date() > session.expiresAt) {
      session.isActive = false;
      return null;
    }

    session.lastActivity = new Date();
    session.activityCount++;

    return session;
  }

  /**
   * الموثوقية ضد الجهاز
   * Trust device (for biometric auth)
   */
  trustDevice(deviceId, daysValid = 90) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.trustedUntil = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
    device.securityLevel = 'trusted';
    this.trustedDevices.add(deviceId);

    Logger.info(`✅ Device trusted: ${deviceId} for ${daysValid} days`);

    this.emit('device:trusted', {
      deviceId,
      trustedUntil: device.trustedUntil,
    });

    return device;
  }

  /**
   * إزالة الثقة من جهاز
   * Untrust device
   */
  untrustDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.trustedUntil = null;
    device.securityLevel = 'normal';
    this.trustedDevices.delete(deviceId);

    Logger.info(`❌ Device untrusted: ${deviceId}`);

    this.emit('device:untrusted', { deviceId });

    return device;
  }

  /**
   * كشف النشاط المريب
   * Detect suspicious activity
   */
  detectSuspiciousActivity(deviceId, activity) {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const suspicionScore = this._calculateSuspicionScore(activity);

    if (!this.suspiciousActivity.has(deviceId)) {
      this.suspiciousActivity.set(deviceId, []);
    }

    const record = {
      timestamp: new Date(),
      activity,
      suspicionScore,
      resolved: false,
    };

    this.suspiciousActivity.get(deviceId).push(record);

    if (suspicionScore > 70) {
      device.securityLevel = 'suspicious';

      this.emit('device:suspicious', {
        deviceId,
        suspicionScore,
        activity,
        timestamp: new Date(),
      });
    }

    return record;
  }

  /**
   * تفعيل المصادقة البيومترية
   * Enable biometric authentication
   */
  enableBiometric(deviceId, biometricType) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.biometricEnabled = true;
    device.biometricType = biometricType; // fingerprint, face, iris

    this.emit('biometric:enabled', {
      deviceId,
      biometricType,
    });

    return device;
  }

  /**
   * تعطيل المصادقة البيومترية
   * Disable biometric authentication
   */
  disableBiometric(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.biometricEnabled = false;
    device.biometricType = null;

    this.emit('biometric:disabled', { deviceId });

    return device;
  }

  /**
   * تحديث معلومات تخزين الجهاز
   * Update device storage info
   */
  updateStorageInfo(deviceId, storageData) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.storageSpace = {
      total: storageData.total,
      used: storageData.used,
      available: storageData.available,
    };

    const usagePercent = (storageData.used / storageData.total) * 100;

    if (usagePercent > 90) {
      this.emit('device:lowStorage', {
        deviceId,
        usagePercent,
      });
    }

    return device;
  }

  /**
   * حذف جهاز
   * Delete device
   */
  deleteDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    this.devices.delete(deviceId);
    this.trustedDevices.delete(deviceId);
    this.suspiciousActivity.delete(deviceId);

    Logger.info(`🗑️  Device deleted: ${deviceId}`);

    this.emit('device:deleted', { deviceId });

    return true;
  }

  /**
   * الحصول على إحصائيات الأجهزة
   * Get device statistics
   */
  getDeviceStats(userId) {
    const userDevices = this.getUserDevices(userId);

    return {
      total: userDevices.length,
      active: userDevices.filter(d => d.isActive).length,
      trusted: userDevices.filter(d => this.trustedDevices.has(d.id)).length,
      suspicious: userDevices.filter(d => d.securityLevel === 'suspicious').length,
      byOS: {
        iOS: userDevices.filter(d => d.osType === 'iOS').length,
        Android: userDevices.filter(d => d.osType === 'Android').length,
      },
      lastSync: Math.max(...userDevices.map(d => d.lastSeen.getTime())),
    };
  }

  /**
   * حذف جلسات منتهية الصلاحية
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    let cleaned = 0;
    const now = new Date();

    for (const [sessionId, session] of this.deviceSessions) {
      if (session.expiresAt < now) {
        this.deviceSessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      Logger.info(`🧹 Cleaned ${cleaned} expired sessions`);
      this.emit('sessions:cleaned', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * ===== Private Methods =====
   */

  /**
   * Generate device fingerprint
   */
  _generateFingerprint(data) {
    const fingerprint = Buffer.from(
      `${data.osType}-${data.osVersion}-${data.model}-${data.manufacturer}`
    ).toString('base64');

    return fingerprint;
  }

  /**
   * Calculate suspicion score
   */
  _calculateSuspicionScore(activity) {
    let score = 0;

    // Suspicious login patterns
    if (activity.suspiciousLogin) score += 30;

    // Unusual location
    if (activity.locationChange > 500) score += 25; // > 500km

    // Time-based suspicion (login at odd hours)
    const hour = new Date().getHours();
    if (hour < 5 || hour > 23) score += 15;

    // Multiple failed auth attempts
    if (activity.failedAttempts > 3) score += 20;

    // Jailbreak/Root detection
    if (activity.isRooted || activity.isJailbroken) score += 40;

    return Math.min(score, 100);
  }
}

module.exports = new MobileDeviceManager();
