/**
 * Suspicious Activity Detection Service
 * خدمة كشف النشاط المشبوه
 *
 * Features:
 * - Detect concurrent logins from different countries
 * - Alert on new device login
 * - Monitor failed login attempts (brute force detection)
 * - Automatic temporary lockout
 * - IP reputation checking
 */

const geoip = require('geoip-lite');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLogger = require('./audit-logger');
const emailService = require('./emailService');
const smsService = require('./smsService');

class SuspiciousActivityDetector {
  constructor() {
    this.failedAttempts = new Map(); // Track failed login attempts
    this.lockedAccounts = new Map(); // Track temporarily locked accounts
    this.MAX_FAILED_ATTEMPTS = 5;
    this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    this.suspiciousIPs = new Set(); // Known suspicious IPs
  }

  /**
   * Check for suspicious login activity
   */
  async checkLoginActivity(userId, ipAddress, userAgent) {
    const alerts = [];

    try {
      // 1. Check for account lockout
      if (this.isAccountLocked(userId)) {
        alerts.push({
          type: 'account_locked',
          severity: 'high',
          message: 'Account temporarily locked due to suspicious activity',
        });
        return { suspicious: true, alerts, blocked: true };
      }

      // 2. Check IP reputation
      if (this.isSuspiciousIP(ipAddress)) {
        alerts.push({
          type: 'suspicious_ip',
          severity: 'medium',
          message: 'Login attempt from known suspicious IP',
        });
      }

      // 3. Check for concurrent logins from different locations
      const locationAlert = await this.checkConcurrentLocations(userId, ipAddress);
      if (locationAlert) {
        alerts.push(locationAlert);
      }

      // 4. Check for new device
      const deviceAlert = await this.checkNewDevice(userId, userAgent);
      if (deviceAlert) {
        alerts.push(deviceAlert);
      }

      // 5. Check for rapid location changes (impossible travel)
      const travelAlert = await this.checkImpossibleTravel(userId, ipAddress);
      if (travelAlert) {
        alerts.push(travelAlert);
      }

      const suspicious = alerts.some(a => a.severity === 'high');

      if (suspicious || alerts.length > 0) {
        await this.logSuspiciousActivity(userId, ipAddress, userAgent, alerts);
      }

      return { suspicious, alerts, blocked: false };
    } catch (error) {
      console.error('Error checking login activity:', error);
      return { suspicious: false, alerts: [], blocked: false };
    }
  }

  /**
   * Track failed login attempt
   */
  trackFailedAttempt(identifier) {
    const attempts = this.failedAttempts.get(identifier) || [];
    attempts.push(Date.now());

    // Keep only attempts from last 15 minutes
    const recentAttempts = attempts.filter(time => Date.now() - time < this.LOCKOUT_DURATION);
    this.failedAttempts.set(identifier, recentAttempts);

    if (recentAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
      this.lockAccount(identifier);
      return {
        locked: true,
        attempts: recentAttempts.length,
        unlockAt: new Date(Date.now() + this.LOCKOUT_DURATION),
      };
    }

    return {
      locked: false,
      attempts: recentAttempts.length,
      remaining: this.MAX_FAILED_ATTEMPTS - recentAttempts.length,
    };
  }

  /**
   * Reset failed attempts on successful login
   */
  resetFailedAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Lock account temporarily
   */
  lockAccount(identifier) {
    this.lockedAccounts.set(identifier, Date.now() + this.LOCKOUT_DURATION);

    // Auto-unlock after duration
    setTimeout(() => {
      this.lockedAccounts.delete(identifier);
    }, this.LOCKOUT_DURATION);
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(identifier) {
    const lockUntil = this.lockedAccounts.get(identifier);
    if (!lockUntil) return false;

    if (Date.now() > lockUntil) {
      this.lockedAccounts.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Get lockout info
   */
  getLockoutInfo(identifier) {
    const lockUntil = this.lockedAccounts.get(identifier);
    if (!lockUntil || Date.now() > lockUntil) {
      return null;
    }

    return {
      locked: true,
      unlockAt: new Date(lockUntil),
      remainingMs: lockUntil - Date.now(),
    };
  }

  /**
   * Check for concurrent logins from different countries
   */
  async checkConcurrentLocations(userId, ipAddress) {
    try {
      const activeSessions = await Session.getActiveSessions(userId);
      if (activeSessions.length === 0) return null;

      const currentGeo = geoip.lookup(ipAddress);
      if (!currentGeo) return null;

      for (const session of activeSessions) {
        const sessionGeo = geoip.lookup(session.ipAddress);
        if (!sessionGeo) continue;

        // Different countries
        if (sessionGeo.country !== currentGeo.country) {
          return {
            type: 'concurrent_different_countries',
            severity: 'high',
            message: `Login from ${currentGeo.country} while active session in ${sessionGeo.country}`,
            details: {
              newCountry: currentGeo.country,
              existingCountry: sessionGeo.country,
            },
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking concurrent locations:', error);
      return null;
    }
  }

  /**
   * Check for new device
   */
  async checkNewDevice(userId, userAgent) {
    try {
      const recentSessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(20);

      if (recentSessions.length === 0) return null;

      // Extract device type from user-agent
      const currentDevice = this.parseDeviceType(userAgent);

      // Check if device seen before
      const seenBefore = recentSessions.some(s => s.device === currentDevice);

      if (!seenBefore) {
        return {
          type: 'new_device',
          severity: 'medium',
          message: `Login from new device: ${currentDevice}`,
          details: { device: currentDevice },
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking new device:', error);
      return null;
    }
  }

  /**
   * Check for impossible travel (rapid location change)
   */
  async checkImpossibleTravel(userId, ipAddress) {
    try {
      const lastSession = await Session.findOne({ userId, isActive: true })
        .sort({ lastActivity: -1 })
        .limit(1);

      if (!lastSession) return null;

      const currentGeo = geoip.lookup(ipAddress);
      const lastGeo = geoip.lookup(lastSession.ipAddress);

      if (!currentGeo || !lastGeo) return null;

      // Calculate distance and time
      const distance = this.calculateDistance(
        lastGeo.ll[0],
        lastGeo.ll[1],
        currentGeo.ll[0],
        currentGeo.ll[1]
      );

      const timeDiff = (Date.now() - lastSession.lastActivity) / (1000 * 60 * 60); // hours

      // Impossible if > 500 km/h average speed
      const averageSpeed = distance / timeDiff;

      if (averageSpeed > 500) {
        return {
          type: 'impossible_travel',
          severity: 'high',
          message: `Impossible travel detected: ${Math.round(distance)} km in ${Math.round(timeDiff)} hours`,
          details: {
            distance: Math.round(distance),
            timeHours: Math.round(timeDiff),
            averageSpeed: Math.round(averageSpeed),
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking impossible travel:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Parse device type from user-agent
   */
  parseDeviceType(userAgent) {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  /**
   * Check if IP is suspicious
   */
  isSuspiciousIP(ipAddress) {
    return this.suspiciousIPs.has(ipAddress);
  }

  /**
   * Mark IP as suspicious
   */
  markIPAsSuspicious(ipAddress) {
    this.suspiciousIPs.add(ipAddress);
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(userId, ipAddress, userAgent, alerts) {
    try {
      await AuditLogger.log({
        action: 'security.suspicious_activity',
        userId,
        metadata: {
          ipAddress,
          userAgent,
          alerts,
          timestamp: new Date(),
        },
      });

      // Send alert if high severity
      const hasHighSeverity = alerts.some(a => a.severity === 'high');
      if (hasHighSeverity) {
        await this.sendSecurityAlert(userId, alerts);
      }
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
    }
  }

  /**
   * Send security alert to user
   */
  async sendSecurityAlert(userId, alerts) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const message = alerts.map(a => `- ${a.message}`).join('\n');

      // Send email
      try {
        await emailService.sendSecurityAlert(user.email, user.username, message);
      } catch (emailError) {
        console.warn('Failed to send security alert email:', emailError);
      }

      // Send SMS for critical alerts
      if (user.phone && alerts.some(a => a.severity === 'high')) {
        try {
          await smsService.sendSecurityAlert(user.phone, alerts.length);
        } catch (smsError) {
          console.warn('Failed to send security alert SMS:', smsError);
        }
      }
    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  /**
   * Get security stats for user
   */
  async getSecurityStats(userId) {
    try {
      const failedAttempts = this.failedAttempts.get(userId) || [];
      const lockoutInfo = this.getLockoutInfo(userId);

      // Get recent suspicious activities
      const recentActivities = await AuditLogger.find({
        action: 'security.suspicious_activity',
        userId,
      })
        .sort({ createdAt: -1 })
        .limit(10);

      return {
        failedAttempts: failedAttempts.length,
        isLocked: !!lockoutInfo,
        lockoutInfo,
        recentSuspiciousActivities: recentActivities.length,
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
      return null;
    }
  }
}

module.exports = new SuspiciousActivityDetector();
