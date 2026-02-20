/**
 * SSO Security & Audit Service
 * خدمة الأمان والتدقيق لـ SSO
 */

const redis = require('redis');
const crypto = require('crypto');
const logger = require('../utils/logger');

class SSOSecurityService {
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

    // Security constants
    this.MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || 5);
    this.LOGIN_ATTEMPT_WINDOW = parseInt(process.env.LOGIN_ATTEMPT_WINDOW || 900000); // 15 min
    this.SUSPICIOUS_ACTIVITY_THRESHOLD = parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || 10);
    this.SESSION_FINGERPRINT_ALGORITHM = 'sha256';
  }

  // ===== Mock Cache Helper Methods =====
  async _store(key, value, ttl = null) {
    if (this.useMockCache) {
      this.mockStore.set(key, value);
      if (ttl) {
        setTimeout(() => this.mockStore.delete(key), ttl * 1000);
      }
      return true;
    }
    try {
      if (ttl) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        await this.redisClient.set(key, JSON.stringify(value));
      }
      return true;
    } catch (err) {
      logger.error('Error storing cache:', err);
      return false;
    }
  }

  async _get(key) {
    if (this.useMockCache) {
      return this.mockStore.get(key);
    }
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Error retrieving cache:', err);
      return null;
    }
  }

  async _incr(key) {
    if (this.useMockCache) {
      const current = this.mockStore.get(key) || 0;
      const newVal = current + 1;
      this.mockStore.set(key, newVal);
      return newVal;
    }
    try {
      return await this.redisClient.incr(key);
    } catch (err) {
      logger.error('Error incrementing counter:', err);
      return 0;
    }
  }

  async _expire(key, ttl) {
    if (this.useMockCache) {
      const current = this.mockStore.get(key);
      if (current !== undefined && ttl) {
        setTimeout(() => this.mockStore.delete(key), ttl * 1000);
      }
      return true;
    }
    try {
      await this.redisClient.expire(key, ttl);
      return true;
    } catch (err) {
      logger.error('Error setting expiration:', err);
      return false;
    }
  }

  /**
   * تتبع محاولات تسجيل الدخول الفاشلة
   * Track login attempts
   */
  async trackLoginAttempt(email, success = false, metadata = {}) {
    try {
      const key = `login:attempts:${email}`;
      const now = Date.now();

      if (!success) {
        // Increment failed attempts
        const count = await this._incr(key);

        if (count === 1) {
          // Set expiration on first attempt
          await this._expire(key, Math.floor(this.LOGIN_ATTEMPT_WINDOW / 1000));
        }

        // Check if account should be locked
        if (count >= this.MAX_LOGIN_ATTEMPTS) {
          await this.lockAccount(email, 'too_many_failed_attempts');
          logger.warn(`Account locked due to failed login attempts: ${email}`);

          return {
            blocked: true,
            attemptsRemaining: 0,
            message: 'Too many failed login attempts. Account temporarily locked.'
          };
        }

        // Log failed attempt
        this.logAuditEvent('LOGIN_FAILED', {
          email,
          attempt: count,
          timestamp: now,
          ...metadata
        });

        return {
          blocked: false,
          attemptsRemaining: this.MAX_LOGIN_ATTEMPTS - count
        };
      } else {
        // Clear failed attempts on successful login
        await this.redisClient.del(key);

        // Clear account lock if exists
        await this.redisClient.del(`account:locked:${email}`);

        // Log successful login
        this.logAuditEvent('LOGIN_SUCCESS', {
          email,
          timestamp: now,
          ...metadata
        });

        return { blocked: false };
      }
    } catch (error) {
      logger.error('Failed to track login attempt:', error);
      throw error;
    }
  }

  /**
   * قفل الحساب مؤقتاً
   * Lock account temporarily
   */
  async lockAccount(email, reason, durationMinutes = 30) {
    try {
      const lockKey = `account:locked:${email}`;
      const lockData = {
        email,
        reason,
        lockedAt: Date.now(),
        unlocksAt: Date.now() + (durationMinutes * 60 * 1000)
      };

      await this.redisClient.setEx(
        lockKey,
        durationMinutes * 60,
        JSON.stringify(lockData)
      );

      this.logAuditEvent('ACCOUNT_LOCKED', {
        email,
        reason,
        duration: durationMinutes
      });

      return lockData;
    } catch (error) {
      logger.error('Failed to lock account:', error);
      throw error;
    }
  }

  /**
   * التحقق من حالة قفل الحساب
   * Check if account is locked
   */
  async isAccountLocked(email) {
    try {
      const lockKey = `account:locked:${email}`;
      const lockData = await this._get(lockKey);

      if (!lockData) {
        return { locked: false };
      }

      const lock = JSON.parse(lockData);
      return {
        locked: true,
        reason: lock.reason,
        unlocksAt: lock.unlocksAt,
        remainingTime: Math.ceil((lock.unlocksAt - Date.now()) / 1000)
      };
    } catch (error) {
      logger.error('Failed to check account lock:', error);
      return { locked: false };
    }
  }

  /**
   * كشف النشاط المريب
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId, metadata = {}) {
    try {
      const key = `activity:${userId}`;
      const now = Date.now();

      // Get user's recent activities
      const activitiesData = await this.redisClient.get(key);
      let activities = activitiesData ? JSON.parse(activitiesData) : [];

      // Remove old activities (older than 1 hour)
      activities = activities.filter(a => a.timestamp > now - 3600000);

      // Add new activity
      activities.push({
        ...metadata,
        timestamp: now
      });

      // Save back to Redis
      await this.redisClient.setEx(
        key,
        3600, // 1 hour
        JSON.stringify(activities)
      );

      // Check for suspicious patterns
      const suspicionScore = this.calculateSuspicionScore(userId, activities);

      if (suspicionScore > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        logger.warn(`Suspicious activity detected for user: ${userId}, score: ${suspicionScore}`);

        this.logAuditEvent('SUSPICIOUS_ACTIVITY', {
          userId,
          score: suspicionScore,
          activities: activities.slice(-5) // Last 5 activities
        });

        return {
          suspicious: true,
          score: suspicionScore,
          action: 'require_verification'
        };
      }

      return {
        suspicious: false,
        score: suspicionScore
      };
    } catch (error) {
      logger.error('Failed to detect suspicious activity:', error);
      return { suspicious: false, score: 0 };
    }
  }

  /**
   * حساب درجة الريبة
   * Calculate suspicion score
   */
  calculateSuspicionScore(userId, activities) {
    let score = 0;

    if (!activities || activities.length === 0) return score;

    const now = Date.now();
    const recentActivities = activities.slice(-10); // Last 10 activities

    // Multiple login attempts from different IPs
    const uniqueIPs = new Set(activities.map(a => a.ipAddress).filter(Boolean));
    if (uniqueIPs.size > 3) score += 5;

    // Unusual time of access
    const hour = new Date().getHours();
    if (hour < 5 || hour > 23) score += 3;

    // Multiple failed attempts
    const failedAttempts = activities.filter(a => a.type === 'failed').length;
    if (failedAttempts > 3) score += 10;

    // Access from unusual geographic location
    const newLocations = new Set();
    activities.forEach(a => {
      if (a.country && !activities[0]?.country?.includes(a.country)) {
        newLocations.add(a.country);
      }
    });
    if (newLocations.size > 2) score += 5;

    // Rapid sequential requests
    if (recentActivities.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < recentActivities.length; i++) {
        timeDiffs.push(recentActivities[i].timestamp - recentActivities[i - 1].timestamp);
      }
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b) / timeDiffs.length;
      if (avgTimeDiff < 5000) score += 5; // Quick requests
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * توليد بصمة الجلسة
   * Generate session fingerprint for anomaly detection
   */
  generateSessionFingerprint(metadata = {}) {
    try {
      const fingerprintData = {
        userAgent: metadata.userAgent || '',
        acceptLanguage: metadata.acceptLanguage || '',
        screenResolution: metadata.screenResolution || '',
        timezone: metadata.timezone || '',
        plugins: metadata.plugins || [],
        timestamp: Date.now()
      };

      const fingerprintString = JSON.stringify(fingerprintData);
      const fingerprint = crypto
        .createHash(this.SESSION_FINGERPRINT_ALGORITHM)
        .update(fingerprintString)
        .digest('hex');

      return {
        fingerprint,
        fingerprintData
      };
    } catch (error) {
      logger.error('Failed to generate session fingerprint:', error);
      throw error;
    }
  }

  /**
   * التحقق من بصمة الجلسة
   * Verify session fingerprint
   */
  async verifySessionFingerprint(sessionId, currentFingerprint) {
    try {
      const key = `session:fingerprint:${sessionId}`;
      const storedFingerprint = await this.redisClient.get(key);

      if (!storedFingerprint) {
        return { valid: false, reason: 'No fingerprint stored' };
      }

      if (storedFingerprint === currentFingerprint) {
        return { valid: true };
      }

      logger.warn(`Session fingerprint mismatch for session: ${sessionId}`);
      return { valid: false, reason: 'Fingerprint mismatch' };
    } catch (error) {
      logger.error('Failed to verify session fingerprint:', error);
      return { valid: false, reason: 'Verification failed' };
    }
  }

  /**
   * تسجيل أحداث التدقيق
   * Log audit events
   */
  async logAuditEvent(eventType, data) {
    try {
      const auditEntry = {
        eventType,
        timestamp: new Date().toISOString(),
        data,
        severity: this.getEventSeverity(eventType)
      };

      // Store in Redis for quick access
      const key = `audit:${eventType}:${Date.now()}`;
      await this.redisClient.setEx(
        key,
        86400, // 24 hours
        JSON.stringify(auditEntry)
      );

      // Also log to main audit log
      logger.info(`AUDIT[${eventType}]`, auditEntry);

      return auditEntry;
    } catch (error) {
      logger.error('Failed to log audit event:', error);
    }
  }

  /**
   * الحصول على درجة خطورة الحدث
   * Get event severity level
   */
  getEventSeverity(eventType) {
    const severitMap = {
      'LOGIN_SUCCESS': 'INFO',
      'LOGIN_FAILED': 'WARNING',
      'ACCOUNT_LOCKED': 'WARNING',
      'SUSPICIOUS_ACTIVITY': 'CRITICAL',
      'TOKEN_EXPIRED': 'INFO',
      'UNAUTHORIZED_ACCESS': 'CRITICAL',
      'PERMISSION_DENIED': 'WARNING',
      'LOGOUT': 'INFO',
      'SESSION_CREATED': 'INFO',
      'SESSION_ENDED': 'INFO'
    };

    return severitMap[eventType] || 'INFO';
  }

  /**
   * الحصول على سجل التدقيق
   * Get audit log
   */
  async getAuditLog(filters = {}) {
    try {
      const {
        eventType = '*',
        startDate = Date.now() - 86400000,
        endDate = Date.now(),
        limit = 100
      } = filters;

      const pattern = `audit:${eventType}:*`;
      const keys = await this.redisClient.keys(pattern);

      const logs = [];
      for (const key of keys.slice(0, limit)) {
        const logData = await this.redisClient.get(key);
        if (logData) {
          const log = JSON.parse(logData);
          const timestamp = new Date(log.timestamp).getTime();

          if (timestamp >= startDate && timestamp <= endDate) {
            logs.push(log);
          }
        }
      }

      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return logs;
    } catch (error) {
      logger.error('Failed to retrieve audit log:', error);
      throw error;
    }
  }

  /**
   * التحقق من التوافق الجغرافي
   * Perform geolocation validation
   */
  async validateGeolocation(userId, ipAddress, previousLocations = []) {
    try {
      // This would integrate with a geolocation service
      // For now, returning a mock response

      const geoData = {
        ipAddress,
        country: 'SA', // Mock
        city: 'Riyadh',
        coordinates: { lat: 24.7136, lng: 46.6753 }
      };

      // Check if location is significantly different
      if (previousLocations.length > 0) {
        const lastLocation = previousLocations[previousLocations.length - 1];
        const distance = this.calculateDistance(
          { lat: geoData.coordinates.lat, lng: geoData.coordinates.lng },
          { lat: lastLocation.coordinates?.lat, lng: lastLocation.coordinates?.lng }
        );

        // If more than 1000km in less than 1 hour, flag as suspicious
        if (distance > 1000) {
          logger.warn(`Suspicious geolocation change for user: ${userId}`);
          return {
            valid: false,
            reason: 'Impossible travel detected',
            distance
          };
        }
      }

      return { valid: true, geoData };
    } catch (error) {
      logger.error('Geolocation validation failed:', error);
      return { valid: false, reason: 'Validation failed' };
    }
  }

  /**
   * حساب المسافة بين نقطتين
   * Calculate distance between two coordinates
   */
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * إنشاء قائمة بيضاء للعناوين IP
   * Whitelist IP addresses
   */
  async whitelistIP(userId, ipAddress, deviceName = '') {
    try {
      const key = `whitelist:${userId}`;
      const whitelistData = await this.redisClient.get(key);
      let whitelist = whitelistData ? JSON.parse(whitelistData) : [];

      whitelist.push({
        ipAddress,
        deviceName,
        whitelistedAt: Date.now()
      });

      // Keep only last 10 whitelisted IPs
      whitelist = whitelist.slice(-10);

      await this.redisClient.setEx(
        key,
        31536000, // 1 year
        JSON.stringify(whitelist)
      );

      logger.info(`IP whitelisted for user: ${userId}, IP: ${ipAddress}`);
      return whitelist;
    } catch (error) {
      logger.error('Failed to whitelist IP:', error);
      throw error;
    }
  }

  /**
   * التحقق من قائمة بيضاء العناوين IP
   * Check IP whitelist
   */
  async isIPWhitelisted(userId, ipAddress) {
    try {
      const key = `whitelist:${userId}`;
      const whitelistData = await this.redisClient.get(key);

      if (!whitelistData) {
        return false;
      }

      const whitelist = JSON.parse(whitelistData);
      return whitelist.some(w => w.ipAddress === ipAddress);
    } catch (error) {
      logger.error('Failed to check IP whitelist:', error);
      return false;
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

module.exports = SSOSecurityService;
