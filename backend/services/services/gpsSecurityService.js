/**
 * GPS Tracking Security & Encryption Service
 * نظام الأمان والتشفير لنظام تتبع الحافلات
 * 
 * ✅ Data Encryption
 * ✅ Location Privacy
 * ✅ Access Control
 * ✅ Audit Logging
 * ✅ Anti-spoofing
 * ✅ Anomaly Detection
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class GPSSecurityService {
  /**
   * ========== 1. تشفير البيانات ==========
   */

  /**
   * تشفير بيانات موقع GPS
   */
  static encryptLocationData(locationData, vehicleId) {
    try {
      const encryptionKey = this.getEncryptionKey(vehicleId);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
      
      let encrypted = cipher.update(JSON.stringify(locationData), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('خطأ في تشفير بيانات الموقع:', error);
      throw error;
    }
  }

  /**
   * فك تشفير بيانات موقع GPS
   */
  static decryptLocationData(encryptedData, vehicleId) {
    try {
      const encryptionKey = this.getEncryptionKey(vehicleId);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('خطأ في فك تشفير بيانات الموقع:', error);
      throw error;
    }
  }

  /**
   * الحصول على مفتاح التشفير
   */
  static getEncryptionKey(vehicleId) {
    // في الواقع، يجب الحصول عليه من مستودع آمن (Vault, KMS)
    const baseKey = process.env.GPS_ENCRYPTION_KEY || 'default-key-should-be-in-env';
    const hash = crypto.createHash('sha256');
    hash.update(baseKey + vehicleId);
    return hash.digest().slice(0, 32); // 256-bit key
  }

  /**
   * ========== 2. التحقق من صحة البيانات ==========
   */

  /**
   * التحقق من التوقيع الرقمي لبيانات GPS
   */
  static verifyGPSDataSignature(gpsData, deviceSignature, deviceId) {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(JSON.stringify(gpsData) + deviceId);
      const expectedSignature = hash.digest('hex');

      return expectedSignature === deviceSignature;
    } catch (error) {
      logger.error('خطأ في التحقق من التوقيع:', error);
      return false;
    }
  }

  /**
   * اكتشاف تزوير GPS (GPS Spoofing Detection)
   */
  static detectGPSSpoofing(currentLocation, previousLocation, timeDelta) {
    // 1. فحص السرعة المستحيلة
    if (previousLocation && timeDelta > 0) {
      const distance = this.calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      const maxPossibleSpeed = (distance / (timeDelta / 3600)) * 1000; // متر/ثانية
      
      if (maxPossibleSpeed > 300) { // أعلى من سرعة الصوت
        return {
          detected: true,
          type: 'impossible_speed',
          message: 'سرعة مستحيلة تم اكتشافها',
          severity: 'critical'
        };
      }
    }

    // 2. فحص تغيير الإحداثيات المفاجئ
    if (previousLocation) {
      const distance = this.calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      if (distance > 100 && timeDelta < 5) { // أكثر من 100كم في 5 ثواني
        return {
          detected: true,
          type: 'sudden_jump',
          message: 'قفزة موقع مفاجئة تم اكتشافها',
          severity: 'critical',
          distance: distance.toFixed(2)
        };
      }
    }

    // 3. فحص دقة GPS المريبة
    if (currentLocation.accuracy && currentLocation.accuracy > 200) {
      return {
        detected: true,
        type: 'suspicious_accuracy',
        message: 'دقة GPS مريبة',
        severity: 'low',
        accuracy: currentLocation.accuracy
      };
    }

    return { detected: false };
  }

  /**
   * ========== 3. التحكم في الوصول ==========
   */

  /**
   * التحقق من صلاحيات الوصول لبيانات المراقبة
   */
  static async verifyAccessPermission(userId, vehicleId, action) {
    try {
      // هذا يجب أن يتم في User & Role Service
      const permissions = {
        'view_location': ['fleet_manager', 'supervisor', 'dispatcher'],
        'view_details': ['fleet_manager', 'supervisor'],
        'export_data': ['fleet_manager', 'compliance_officer'],
        'modify_config': ['fleet_manager', 'admin'],
        'delete_records': ['admin']
      };

      const allowedRoles = permissions[action] || [];
      
      if (!allowedRoles.includes(userId.role)) {
        logger.warn(`محاولة وصول غير مصرح بها: ${userId.name} - ${action}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('خطأ في التحقق من الصلاحيات:', error);
      return false;
    }
  }

  /**
   * تشفير بيانات الموقع الحساسة
   */
  static maskSensitiveLocationData(locationData, userRole) {
    const masked = { ...locationData };

    if (userRole === 'driver') {
      // السائق يرى موقعه فقط (عادي)
      return masked;
    }

    if (userRole === 'supervisor') {
      // المشرف يرى المواقع مع تقليل الدقة
      masked.latitude = Math.round(masked.latitude * 100) / 100;
      masked.longitude = Math.round(masked.longitude * 100) / 100;
      return masked;
    }

    if (userRole === 'public') {
      // الجمهور يرى نطاقات عريضة فقط
      masked.latitude = Math.round(masked.latitude * 10) / 10;
      masked.longitude = Math.round(masked.longitude * 10) / 10;
      merged.address = masked.address.split(',')[0]; // المدينة فقط
    }

    return masked;
  }

  /**
   * ========== 4. تسجيل التدقيق (Audit Logging) ==========
   */

  /**
   * تسجيل جميع عمليات الوصول للبيانات
   */
  static async logAccessEvent(event) {
    try {
      const auditLog = {
        timestamp: new Date(),
        userId: event.userId,
        action: event.action,
        resourceType: 'GPS_TRACKING',
        resourceId: event.vehicleId,
        details: event.details,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        status: event.status || 'success',
        result: event.result
      };

      // يجب حفظها في قاعدة بيانات منفصلة
      logger.info(`تدقيق: ${JSON.stringify(auditLog)}`);

      // يمكن إرسالها لـ SIEM أو نظام تسجيل مركزي
      await this.sendToAuditLog(auditLog);

      return auditLog;
    } catch (error) {
      logger.error('خطأ في تسجيل الحدث:', error);
      throw error;
    }
  }

  /**
   * إرسال لسجل التدقيق المركزي
   */
  static async sendToAuditLog(auditLog) {
    // يمكن إرسالها لـ Elasticsearch, Splunk, AWS CloudTrail وغيرها
    // للآن نسجلها فقط
    logger.info(`Audit Log: ${JSON.stringify(auditLog)}`);
  }

  /**
   * البحث في سجلات التدقيق
   */
  static async searchAuditLogs(filters) {
    try {
      // هذا يجب أن يكون متصل بقاعدة بيانات التدقيق
      const { userId, vehicleId, action, startDate, endDate } = filters;

      logger.info(`بحث في السجلات: ${JSON.stringify(filters)}`);

      // يجب تنفيذ البحث الفعلي هنا
      return {
        success: true,
        results: [],
        total: 0
      };
    } catch (error) {
      logger.error('خطأ في البحث في السجلات:', error);
      throw error;
    }
  }

  /**
   * ========== 5. الكشف عن الحالات الشاذة ==========
   */

  /**
   * الكشف عن السلوك الشاذ
   */
  static detectAnomalousAccess(accessLog, history) {
    const anomalies = [];

    // 1. وصول من موقع جغرافي جديد
    const lastAccessLocation = history[0]?.ipAddress;
    if (lastAccessLocation !== accessLog.ipAddress) {
      anomalies.push({
        type: 'new_location',
        severity: 'medium',
        message: 'وصول من موقع جديد',
        details: accessLog.ipAddress
      });
    }

    // 2. وصول في وقت غير عادي
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      anomalies.push({
        type: 'unusual_time',
        severity: 'low',
        message: 'وصول في وقت غير عادي',
        details: `الساعة ${hour}`
      });
    }

    // 3. عمليات وصول متكررة سريعة
    const recentAccesses = history.filter(h => 
      (new Date() - new Date(h.timestamp)) < 60000 // آخر دقيقة
    ).length;

    if (recentAccesses > 10) {
      anomalies.push({
        type: 'rapid_access',
        severity: 'high',
        message: 'محاولات وصول متكررة سريعة',
        details: `${recentAccesses} محاولة في الدقيقة الأخيرة`
      });
    }

    // 4. محاولة الوصول لبيانات غير مصرح بها
    if (accessLog.action === 'export_data' && 
        accessLog.userRole !== 'fleet_manager') {
      anomalies.push({
        type: 'unauthorized_action',
        severity: 'high',
        message: 'محاولة تنفيذ إجراء غير مصرح به',
        details: accessLog.action
      });
    }

    return anomalies;
  }

  /**
   * ========== 6. وظائف مساعدة ==========
   */

  /**
   * حساب المسافة بين نقطتين
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * تحويل الدرجات إلى راديان
   */
  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * توليد مفتاح API آمن
   */
  static generateSecureAPIKey(userId) {
    const random = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256')
      .update(random + userId + timestamp)
      .digest('hex');

    return {
      apiKey: hash,
      secret: random,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // سنة واحدة
    };
  }

  /**
   * التحقق من صحة API Key
   */
  static async verifyAPIKey(apiKey, apiSecret) {
    try {
      // هذا يجب أن يكون متصل بقاعدة بيانات مفاتيح الـ API
      const hash = crypto.createHash('sha256')
        .update(apiSecret)
        .digest('hex');

      // المقارنة الآمنة
      return crypto.timingSafeEqual(
        Buffer.from(apiKey),
        Buffer.from(hash)
      );
    } catch (error) {
      logger.error('خطأ في التحقق من API Key:', error);
      return false;
    }
  }

  /**
   * تشفير كلمات المرور (Hashing)
   */
  static hashPassword(password) {
    return crypto.createHash('sha256')
      .update(password)
      .digest('hex');
  }

  /**
   * ========== 7. نقاط نهاية الأمان ==========
   */

  /**
   * Path Traversal Prevention
   */
  static sanitizePath(path) {
    // منع ../../../ وما شابهها
    return path.replace(/\.\.\//g, '').replace(/\\/g, '/');
  }

  /**
   * SQL Injection Prevention
   */
  static escapeSQL(value) {
    return String(value)
      .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
          case '\0': return '\\0';
          case '\x08': return '\\b';
          case '\x09': return '\\t';
          case '\x1a': return '\\z';
          case '\n': return '\\n';
          case '\r': return '\\r';
          case '"':
          case "'":
          case '\\':
          case '%': return '\\' + char;
          default: return char;
        }
      });
  }

  /**
   * XSS Prevention
   */
  static sanitizeHTML(str) {
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };

    return String(str).replace(/[&<>"'\/]/g, match => htmlEscapes[match]);
  }
}

module.exports = GPSSecurityService;
