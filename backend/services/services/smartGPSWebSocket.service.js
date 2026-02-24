/**
 * Real-Time GPS Tracking WebSocket Service
 * خدمة WebSocket لتتبع GPS في الوقت الفعلي مع إشعارات حية
 * 
 * ✅ Real-time location updates
 * ✅ Live alerts & notifications
 * ✅ Instant driver communication
 * ✅ Fleet status dashboard
 * ✅ Event broadcasting
 */

const logger = require('../utils/logger');

class SmartGPSWebSocketService {
  static connectedClients = new Map();
  static vehicleSubscribers = new Map();
  static driverSubscribers = new Map();
  static adminSubscriptions = new Map();

  /**
   * ========== 1. إدارة الاتصالات ==========
   */

  /**
   * تسجيل اتصال عميل جديد
   */
  static registerClient(socket, userId, userType, permissions = {}) {
    const clientId = socket.id;

    const client = {
      id: clientId,
      socket,
      userId,
      userType, // driver, dispatcher, manager, admin
      permissions,
      subscribedVehicles: new Set(),
      subscribedRoutes: new Set(),
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    this.connectedClients.set(clientId, client);

    logger.info(`عميل متصل: ${clientId} (${userType})`);

    // إرسال حالة الاتصال
    socket.emit('connection_status', {
      status: 'connected',
      clientId,
      timestamp: new Date(),
      message: 'تم الاتصال بنجاح'
    });

    // تحديث قائمة العملاء النشطين
    this.broadcastToAdmins('online_users_updated', {
      totalConnected: this.connectedClients.size,
      byType: this.getClientsByType()
    });

    return client;
  }

  /**
   * فصل اتصال العميل
   */
  static disconnectClient(clientId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    // إلغاء الاشتراكات
    if (client.subscribedVehicles.size > 0) {
      client.subscribedVehicles.forEach(vehicleId => {
        this.unsubscribeFromVehicle(clientId, vehicleId);
      });
    }

    this.connectedClients.delete(clientId);

    logger.info(`عميل قطع الاتصال: ${clientId}`);

    // تحديث قائمة العملاء
    this.broadcastToAdmins('online_users_updated', {
      totalConnected: this.connectedClients.size,
      byType: this.getClientsByType()
    });
  }

  /**
   * ========== 2. إدارة الاشتراكات ==========
   */

  /**
   * الاشتراك في تحديثات مركبة معينة
   */
  static subscribeToVehicle(clientId, vehicleId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return false;

    // التحقق من الصلاحيات
    if (client.userType === 'driver' && client.userId !== vehicleId) {
      logger.warn(`محاولة وصول غير مصرح بها: ${clientId} لـ ${vehicleId}`);
      return false;
    }

    client.subscribedVehicles.add(vehicleId);

    if (!this.vehicleSubscribers.has(vehicleId)) {
      this.vehicleSubscribers.set(vehicleId, new Set());
    }
    this.vehicleSubscribers.get(vehicleId).add(clientId);

    logger.info(`${clientId} اشترك في مركبة ${vehicleId}`);

    // إرسال تأكيد الاشتراك
    client.socket.emit('subscribed_to_vehicle', {
      vehicleId,
      message: 'تم الاشتراك بنجاح',
      timestamp: new Date()
    });

    return true;
  }

  /**
   * إلغاء الاشتراك من تحديثات مركبة
   */
  static unsubscribeFromVehicle(clientId, vehicleId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return false;

    client.subscribedVehicles.delete(vehicleId);

    const subscribers = this.vehicleSubscribers.get(vehicleId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.vehicleSubscribers.delete(vehicleId);
      }
    }

    logger.info(`${clientId} ألغى الاشتراك من مركبة ${vehicleId}`);

    client.socket.emit('unsubscribed_from_vehicle', {
      vehicleId,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * الاشتراك في جميع مركبات المستخدم
   */
  static subscribeToAllVehicles(clientId, vehicleIds) {
    vehicleIds.forEach(vehicleId => {
      this.subscribeToVehicle(clientId, vehicleId);
    });
  }

  /**
   * ========== 3. بث التحديثات الحية ==========
   */

  /**
   * بث تحديث موقع المركبة
   */
  static broadcastLocationUpdate(vehicleId, locationData) {
    const subscribers = this.vehicleSubscribers.get(vehicleId);
    if (!subscribers || subscribers.size === 0) return;

    const update = {
      type: 'location_update',
      vehicleId,
      data: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        bearing: locationData.bearing,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
        speedStatus: locationData.speedStatus,
        movementPattern: locationData.movementPattern
      },
      receivedAt: new Date()
    };

    subscribers.forEach(clientId => {
      const client = this.connectedClients.get(clientId);
      if (client && client.isActive) {
        client.socket.emit('vehicle_location_update', update);
        client.lastActivity = new Date();
      }
    });

    logger.debug(`تم بث تحديث موقع للمركبة ${vehicleId} إلى ${subscribers.size} عميل`);
  }

  /**
   * بث تنبيه فوري
   */
  static broadcastAlert(alert, targetVehicleIds = null) {
    const alertMessage = {
      type: 'alert',
      id: this.generateAlertId(),
      severity: alert.severity,
      category: alert.type,
      message: alert.message,
      recommendation: alert.recommendation,
      timestamp: new Date(),
      vehicleId: alert.vehicleId,
      driverName: alert.driverName
    };

    let recipients = [];

    if (targetVehicleIds && targetVehicleIds.length > 0) {
      // بث لمشتركي مركبات محددة
      targetVehicleIds.forEach(vehicleId => {
        const subscribers = this.vehicleSubscribers.get(vehicleId) || new Set();
        recipients.push(...Array.from(subscribers));
      });
    } else {
      // بث للكل
      recipients = Array.from(this.connectedClients.keys());
    }

    recipients.forEach(clientId => {
      const client = this.connectedClients.get(clientId);
      if (client && client.isActive) {
        // تطبيق صلاحيات العرض
        if (this.canViewAlert(client, alert)) {
          client.socket.emit('alert_received', alertMessage);
        }
      }
    });

    logger.info(`تم بث تنبيه من نوع ${alert.type} إلى ${recipients.length} عميل`);
  }

  /**
   * بث تحديث حالة السائق
   */
  static broadcastDriverStatus(driverId, status) {
    const update = {
      type: 'driver_status_update',
      driverId,
      status, // online, offline, on_trip, on_break, unavailable
      timestamp: new Date()
    };

    // بث إلى مديري النقل والمشرفين
    this.broadcastToRole(['fleet_manager', 'dispatcher', 'supervisor'], update);

    logger.info(`تحديث حالة السائق ${driverId}: ${status}`);
  }

  /**
   * بث إحصائيات الأسطول الحية
   */
  static broadcastFleetStatistics(fleetStats) {
    const update = {
      type: 'fleet_statistics',
      data: fleetStats,
      timestamp: new Date()
    };

    // بث إلى لوحات التحكم
    this.broadcastToRole(['fleet_manager', 'supervisor', 'admin'], update);

    logger.debug('تم بث إحصائيات الأسطول');
  }

  /**
   * ========== 4. وظائف البث المساعدة ==========
   */

  /**
   * بث رسالة إلى دور معين
   */
  static broadcastToRole(roles, message) {
    this.connectedClients.forEach((client) => {
      if (roles.includes(client.userType) && client.isActive) {
        client.socket.emit('message', message);
      }
    });
  }

  /**
   * بث لجميع المديرين
   */
  static broadcastToAdmins(eventType, data) {
    this.connectedClients.forEach((client) => {
      if ((client.userType === 'admin' || client.userType === 'fleet_manager') && client.isActive) {
        client.socket.emit(eventType, data);
      }
    });
  }

  /**
   * بث رسالة خاصة للعميل
   */
  static sendPrivateMessage(clientId, eventType, data) {
    const client = this.connectedClients.get(clientId);
    if (client && client.isActive) {
      client.socket.emit(eventType, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * ========== 5. الإشعارات الذكية ==========
   */

  /**
   * بث إشعار فوري للسائق
   */
  static sendToDriverNotification(driverId, notification) {
    // البحث عن المشتركين للسائق
    const driverClients = Array.from(this.connectedClients.values())
      .filter(client => client.userId === driverId && client.isActive);

    const notificationMessage = {
      id: this.generateNotificationId(),
      type: 'notification',
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      action: notification.action || null,
      timestamp: new Date(),
      sound: notification.sound !== false, // تشغيل صوت افتراضياً
      vibration: notification.vibration !== false
    };

    driverClients.forEach(client => {
      client.socket.emit('driver_notification', notificationMessage);
    });

    logger.info(`إشعار للسائق ${driverId}: ${notification.title}`);
  }

  /**
   * تنبيه مدير الأسطول
   */
  static alertFleetManager(alert) {
    const managers = Array.from(this.connectedClients.values())
      .filter(client => client.userType === 'fleet_manager' && client.isActive);

    const alertData = {
      id: this.generateAlertId(),
      ...alert,
      timestamp: new Date(),
      priority: alert.severity === 'critical' ? 'high' : 'normal'
    };

    managers.forEach(manager => {
      manager.socket.emit('alert', alertData);
      
      // إرسال بريد فوري إذا لم يكن متصلاً
      if (!manager.isActive) {
        this.sendEmailAlert(manager.userId, alertData);
      }
    });

    logger.warn(`تنبيه للمدير: ${alert.message}`);
  }

  /**
   * ========== 6. إدارة الجلسات ==========
   */

  /**
   * تحديث نشاط العميل
   */
  static updateClientActivity(clientId) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  /**
   * معالجة نبضات القلب (Heartbeat)
   */
  static handleHeartbeat(clientId) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
      client.socket.emit('heartbeat_ack', {
        timestamp: new Date(),
        clientId
      });
    }
  }

  /**
   * تنظيف الجلسات الخاملة
   */
  static cleanupIdleSessions(maxIdleTime = 30 * 60 * 1000) { // 30 دقيقة
    const now = new Date();

    this.connectedClients.forEach((client, clientId) => {
      if (now - client.lastActivity > maxIdleTime) {
        logger.warn(`قطع جلسة خاملة: ${clientId}`);
        client.socket.disconnect(true);
        this.disconnectClient(clientId);
      }
    });
  }

  /**
   * ========== 7. وظائف التقارير ==========
   */

  /**
   * الحصول على عدد العملاء النشطين
   */
  static getActiveClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * الحصول على العملاء حسب النوع
   */
  static getClientsByType() {
    const breakdown = {
      driver: 0,
      dispatcher: 0,
      manager: 0,
      admin: 0,
      other: 0
    };

    this.connectedClients.forEach(client => {
      if (breakdown.hasOwnProperty(client.userType)) {
        breakdown[client.userType]++;
      } else {
        breakdown.other++;
      }
    });

    return breakdown;
  }

  /**
   * الحصول على إحصائيات الاتصالات
   */
  static getConnectionStatistics() {
    return {
      totalConnections: this.connectedClients.size,
      byType: this.getClientsByType(),
      trackedVehicles: this.vehicleSubscribers.size,
      avgSubscriptionsPerClient: 
        Array.from(this.connectedClients.values())
          .reduce((sum, client) => sum + client.subscribedVehicles.size, 0) / 
        this.connectedClients.size || 0
    };
  }

  /**
   * ========== 8. وظائف مساعدة ==========
   */

  /**
   * توليد معرّف فريد للتنبيه
   */
  static generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * توليد معرّف فريد للإشعار
   */
  static generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * التحقق من إمكانية عرض التنبيه
   */
  static canViewAlert(client, alert) {
    // السائق يرى تنبيهات مركبته فقط
    if (client.userType === 'driver') {
      return alert.driverId === client.userId;
    }

    // المشرفون يرون جميع التنبيهات لمركباتهم
    if (client.userType === 'supervisor') {
      return client.subscribedVehicles.has(alert.vehicleId);
    }

    // المديرون والمشرفون
    return client.userType === 'fleet_manager' || client.userType === 'admin';
  }

  /**
   * إرسال تنبيه بريدي (للحالات الطارئة)
   */
  static async sendEmailAlert(userId, alert) {
    try {
      // سيتم تنفيذه باستخدام Mail Service
      logger.info(`إرسال تنبيه بريدي للمستخدم ${userId}: ${alert.message}`);
    } catch (error) {
      logger.error('خطأ في إرسال البريد:', error);
    }
  }

  /**
   * إرسال تنبيه SMS (للتنبيهات الحرجة)
   */
  static async sendSmsAlert(driverId, message) {
    try {
      logger.info(`إرسال SMS للسائق ${driverId}: ${message}`);
    } catch (error) {
      logger.error('خطأ في إرسال SMS:', error);
    }
  }

  /**
   * ========== 9. معالجات أحداث WebSocket ==========
   */

  /**
   * إعداد معالجات الأحداث
   */
  static setupEventHandlers(socket, userId, userType) {
    const clientId = socket.id;

    // تسجيل الاتصال
    this.registerClient(socket, userId, userType);

    // معالجة الاشتراكات
    socket.on('subscribe_vehicle', (data) => {
      this.subscribeToVehicle(clientId, data.vehicleId);
    });

    socket.on('unsubscribe_vehicle', (data) => {
      this.unsubscribeFromVehicle(clientId, data.vehicleId);
    });

    socket.on('subscribe_all_vehicles', (data) => {
      this.subscribeToAllVehicles(clientId, data.vehicleIds);
    });

    // معالجة نبضات القلب
    socket.on('heartbeat', () => {
      this.handleHeartbeat(clientId);
    });

    // معالجة الرسائل
    socket.on('message', (data) => {
      this.updateClientActivity(clientId);
      logger.debug(`رسالة من ${clientId}: ${data.message}`);
    });

    // معالجة الأخطاء
    socket.on('error', (error) => {
      logger.error(`خطأ من ${clientId}: ${error}`);
    });

    // معالجة القطع
    socket.on('disconnect', () => {
      this.disconnectClient(clientId);
    });
  }
}

module.exports = SmartGPSWebSocketService;
