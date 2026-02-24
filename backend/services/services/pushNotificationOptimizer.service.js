/**
 * Push Notifications Optimizer Service
 * خدمة تحسين إشعارات الدفع للهاتف المحمول
 * 
 * المسؤوليات:
 * - إرسال تنبيهات بدفع فعالة
 * - تحسين الإشعارات حسب الجهاز والشبكة
 * - إدارة استهلاك البطارية
 * - تتبع معدلات الفتح والنقر
 * - اختبار الإشعارات
 */

const EventEmitter = require('events');
const uuid = require('crypto').randomUUID;
const { Logger } = require('../utils/logger');

class PushNotificationOptimizer extends EventEmitter {
  constructor() {
    super();
    this.pushQueue = new Map();
    this.deviceTokens = new Map();
    this.notificationStats = new Map();
    this.testResults = new Map();
    this.tokenValidation = new Map();
  }

  /**
   * تسجيل رمز تنبيه الجهاز
   * Register device push token
   */
  registerPushToken(userId, deviceId, pushToken, metadata = {}) {
    try {
      const tokenRecord = {
        userId,
        deviceId,
        pushToken,
        platform: metadata.platform || 'unknown', // iOS, Android, Web
        registered: new Date(),
        isValid: true,
        lastValidated: new Date(),
        environment: metadata.environment || 'production', // production, sandbox
      };

      const key = `${userId}:${deviceId}`;
      this.deviceTokens.set(key, tokenRecord);

      Logger.info(`✅ Push token registered for ${deviceId} (${metadata.platform})`);

      this.emit('token:registered', {
        userId,
        deviceId,
        platform: metadata.platform,
      });

      return tokenRecord;
    } catch (error) {
      Logger.error('Push token registration error:', error);
      throw error;
    }
  }

  /**
   * حذف رمز التنبيه
   * Unregister device push token
   */
  unregisterPushToken(userId, deviceId) {
    const key = `${userId}:${deviceId}`;
    this.deviceTokens.delete(key);

    Logger.info(`❌ Push token unregistered for ${deviceId}`);

    this.emit('token:unregistered', { userId, deviceId });

    return true;
  }

  /**
   * التحقق من صحة رمز التنبيه
   * Validate push token
   */
  async validatePushToken(userId, deviceId) {
    try {
      const key = `${userId}:${deviceId}`;
      const tokenRecord = this.deviceTokens.get(key);

      if (!tokenRecord) {
        return { valid: false, reason: 'Token not found' };
      }

      // Simulate token validation with provider
      const isValid = Math.random() > 0.05; // 95% valid

      tokenRecord.isValid = isValid;
      tokenRecord.lastValidated = new Date();

      if (!isValid) {
        this.emit('token:invalid', { userId, deviceId });
      }

      return { valid: isValid };
    } catch (error) {
      Logger.error('Token validation error:', error);
      return { valid: false, reason: error.message };
    }
  }

  /**
   * إرسال إشعار مُحسّن للدفع
   * Send optimized push notification
   */
  async sendPushNotification(data) {
    try {
      const notificationId = uuid();
      const notification = {
        id: notificationId,
        userId: data.userId,
        deviceId: data.deviceId,
        title: data.title,
        body: data.body,
        badge: data.badge || 1,
        sound: data.sound || 'default',
        priority: data.priority || 'normal', // low, normal, high
        ttl: data.ttl || 3600, // seconds to live
        collapseKey: data.collapseKey || null,
        customData: data.customData || {},
        action: data.action || null,
        imageUrl: data.imageUrl || null,
        createdAt: new Date(),
        scheduledFor: data.scheduledFor || new Date(),
        status: 'pending',
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        clickedAt: null,
        stats: {
          sent: false,
          delivered: false,
          opened: false,
          clicked: false,
          failureReason: null,
        },
      };

      // Optimize based on device and network
      const optimized = this._optimizeForDevice(notification);

      this.pushQueue.set(notificationId, optimized);

      Logger.info(`📲 Push notification queued: ${notificationId}`);

      this.emit('notification:queued', {
        notificationId,
        userId: data.userId,
        deviceId: data.deviceId,
      });

      return optimized;
    } catch (error) {
      Logger.error('Push notification error:', error);
      throw error;
    }
  }

  /**
   * إرسال إشعارات مجموعية
   * Send batch push notifications
   */
  async sendBatchNotifications(deviceList, notification) {
    try {
      const results = {
        successful: [],
        failed: [],
        totalCount: deviceList.length,
      };

      for (const device of deviceList) {
        try {
          const result = await this.sendPushNotification({
            ...notification,
            userId: device.userId,
            deviceId: device.deviceId,
          });

          results.successful.push(result.id);
        } catch (error) {
          results.failed.push({
            device: device.deviceId,
            error: error.message,
          });
        }
      }

      Logger.info(
        `📤 Batch push sent: ${results.successful.length}/${results.totalCount} successful`
      );

      this.emit('batch:sent', results);

      return results;
    } catch (error) {
      Logger.error('Batch notification error:', error);
      throw error;
    }
  }

  /**
   * معالجة الإشعارات المعلقة
   * Process pending notifications
   */
  async processPendingNotifications() {
    try {
      let processed = 0;
      const now = new Date();

      for (const [notifId, notification] of this.pushQueue) {
        if (notification.status === 'pending' && notification.scheduledFor <= now) {
          // Simulate sending
          notification.status = 'sent';
          notification.sentAt = new Date();

          // Record stats
          this._recordNotificationSent(notification);

          processed++;

          this.emit('notification:sent', {
            notificationId: notifId,
            userId: notification.userId,
          });
        }
      }

      if (processed > 0) {
        Logger.info(`📬 Processed ${processed} pending notifications`);
      }

      return { processedCount: processed };
    } catch (error) {
      Logger.error('Process pending notifications error:', error);
      throw error;
    }
  }

  /**
   * تسجيل تفاعل المستخدم مع الإشعار
   * Record notification interaction
   */
  recordInteraction(notificationId, action) {
    try {
      const notification = this.pushQueue.get(notificationId);

      if (!notification) {
        throw new Error('Notification not found');
      }

      const timestamp = new Date();

      switch (action) {
        case 'delivered':
          notification.stats.delivered = true;
          notification.deliveredAt = timestamp;
          break;
        case 'opened':
          notification.stats.opened = true;
          notification.openedAt = timestamp;
          break;
        case 'clicked':
          notification.stats.clicked = true;
          notification.clickedAt = timestamp;
          break;
      }

      this._recordNotificationInteraction(notification, action);

      this.emit('notification:interaction', {
        notificationId,
        action,
        timestamp,
      });

      return notification;
    } catch (error) {
      Logger.error('Record interaction error:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الإشعارات
   * Get push notification statistics
   */
  getNotificationStats(userId, timeframe = 'day') {
    try {
      const key = userId;
      const stats = this.notificationStats.get(key) || {
        total: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
      };

      // Calculate rates
      stats.deliveryRate =
        stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(2) : 0;
      stats.openRate =
        stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(2) : 0;
      stats.clickRate =
        stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(2) : 0;

      return stats;
    } catch (error) {
      Logger.error('Get stats error:', error);
      throw error;
    }
  }

  /**
   * اختبار إرسال الإشعارات
   * Test push notification delivery
   */
  async testPushDelivery(userId, deviceId) {
    try {
      const testId = uuid();
      const testNotification = {
        id: testId,
        userId,
        deviceId,
        title: 'اختبار الإشعار',
        body: 'Test notification - if you see this, push notifications are working!',
        customData: {
          testId,
          test: true,
        },
        priority: 'high',
        createdAt: new Date(),
        status: 'testing',
      };

      this.testResults.set(testId, {
        ...testNotification,
        testStartTime: new Date(),
        delivered: false,
        deliveryTime: null,
      });

      // Simulate test delivery
      setTimeout(() => {
        const result = this.testResults.get(testId);
        if (result) {
          result.delivered = true;
          result.deliveryTime = new Date();

          this.emit('test:completed', {
            testId,
            delivered: true,
            deliveryTime: result.deliveryTime.getTime() - result.testStartTime.getTime(),
          });
        }
      }, Math.random() * 3000 + 1000); // 1-4 seconds

      return {
        testId,
        message: 'Test notification sent. Check your device.',
      };
    } catch (error) {
      Logger.error('Test push delivery error:', error);
      throw error;
    }
  }

  /**
   * ضبط إعدادات الإشعارات المحسّنة
   * Configure notification optimization
   */
  configureOptimization(settings = {}) {
    this.optimizationSettings = {
      batteryOptimization: settings.batteryOptimization !== false,
      networkOptimization: settings.networkOptimization !== false,
      quietHoursEnabled: settings.quietHoursEnabled || false,
      quietHoursStart: settings.quietHoursStart || '22:00',
      quietHoursEnd: settings.quietHoursEnd || '08:00',
      bundleNotifications: settings.bundleNotifications !== false,
      maxNotificationsPerHour: settings.maxNotificationsPerHour || 10,
    };

    Logger.info('⚙️  Notification optimization configured');

    return this.optimizationSettings;
  }

  /**
   * ===== Private Methods =====
   */

  /**
   * Optimize notification for device
   */
  _optimizeForDevice(notification) {
    const optimized = { ...notification };

    // Reduce priority on WiFi since battery is not a concern
    // Keep high priority on cellular

    // Compress payload
    const payloadSize = JSON.stringify(notification.customData).length;
    if (payloadSize > 1000) {
      // Compress large payloads
      optimized.customData = this._compressPayload(notification.customData);
    }

    return optimized;
  }

  /**
   * Record notification sent
   */
  _recordNotificationSent(notification) {
    const key = notification.userId;

    if (!this.notificationStats.has(key)) {
      this.notificationStats.set(key, {
        total: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
      });
    }

    const stats = this.notificationStats.get(key);
    stats.total++;
    stats.sent++;
  }

  /**
   * Record notification interaction
   */
  _recordNotificationInteraction(notification, action) {
    const key = notification.userId;
    const stats = this.notificationStats.get(key);

    if (stats) {
      if (action === 'delivered') stats.delivered++;
      if (action === 'opened') stats.opened++;
      if (action === 'clicked') stats.clicked++;
    }
  }

  /**
   * Compress payload
   */
  _compressPayload(payload) {
    // Remove unnecessary fields
    const essential = {};

    const essentialFields = ['action', 'id', 'type', 'url'];
    for (const field of essentialFields) {
      if (payload[field] !== undefined) {
        essential[field] = payload[field];
      }
    }

    return essential;
  }
}

module.exports = new PushNotificationOptimizer();
