/**
 * 🔔 نظام الإنذارات والتنبيهات المتقدمة
 * Advanced Alert & Notification Service
 * 
 * نظام متكامل للإنذارات والتنبيهات في الوقت الفعلي
 */

class AlertNotificationService {
  constructor() {
    this.alerts = [];
    this.notifications = [];
    this.alertRules = [];
    this.alertCounter = 8000;
    this.notificationCounter = 9000;
    this.initializeAlertRules();
  }

  initializeAlertRules() {
    this.alertRules = [
      // تنبيهات السلامة
      {
        id: 'safety-speed',
        name: 'تجاوز السرعة',
        type: 'safety',
        threshold: 120,
        unit: 'km/h',
        severity: 'high',
        enabled: true
      },
      {
        id: 'safety-fatigue',
        name: 'إرهاق السائق',
        type: 'safety',
        threshold: 8,
        unit: 'hours',
        severity: 'critical',
        enabled: true
      },
      // تنبيهات الصيانة
      {
        id: 'maintenance-oil',
        name: 'تغيير الزيت',
        type: 'maintenance',
        threshold: 5000,
        unit: 'km',
        severity: 'medium',
        enabled: true
      },
      {
        id: 'maintenance-tire',
        name: 'فحص الإطارات',
        type: 'maintenance',
        threshold: 10000,
        unit: 'km',
        severity: 'medium',
        enabled: true
      },
      // تنبيهات الوقود
      {
        id: 'fuel-consumption',
        name: 'استهلاك وقود غير طبيعي',
        type: 'fuel',
        threshold: 12,
        unit: 'km/l',
        severity: 'low',
        enabled: true
      },
      // تنبيهات التأمين
      {
        id: 'insurance-expiry',
        name: 'انتهاء التأمين',
        type: 'insurance',
        threshold: 30,
        unit: 'days',
        severity: 'high',
        enabled: true
      }
    ];
  }

  // إنشاء إنذار جديد
  createAlert(alertData) {
    const alert = {
      id: ++this.alertCounter,
      ...alertData,
      status: 'active',
      acknowledged: false,
      acknowledgedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.alerts.push(alert);

    // إرسال إشعار تلقائي
    this.sendNotification({
      type: 'alert',
      alertId: alert.id,
      title: `⚠️ ${alert.title}`,
      message: alert.description,
      severity: alert.severity,
      recipients: alert.recipients || []
    });

    return alert;
  }

  // إنشاء تنبيه أمان
  createSafetyAlert(vehicleId, driverId, alertType, details) {
    const alertMessages = {
      'speeding': 'تم تجاوز السرعة المحددة',
      'harsh-braking': 'كبح مفاجئ اكتُشف',
      'sharp-turn': 'منعطف حاد اكتُشف',
      'fatigue': 'علامات إرهاق السائق',
      'phone-use': 'استخدام الهاتف أثناء القيادة',
      'wrong-lane': 'تغيير غير آمن للحارة'
    };

    return this.createAlert({
      type: 'safety',
      severity: 'high',
      title: alertMessages[alertType] || 'تنبيه أمان',
      description: `${alertMessages[alertType]} للمركبة ${vehicleId}`,
      vehicleId,
      driverId,
      alertType,
      details,
      recipients: ['admin@fleet.com']
    });
  }

  // إرسال إشعار
  sendNotification(notificationData) {
    const notification = {
      id: ++this.notificationCounter,
      ...notificationData,
      status: 'sent',
      readBy: [],
      createdAt: new Date()
    };

    this.notifications.push(notification);
    return notification;
  }

  // جلب الإنذارات النشطة
  getActiveAlerts(filters = {}) {
    let results = this.alerts.filter(a => a.status === 'active' && !a.acknowledged);

    if (filters.vehicleId) {
      results = results.filter(a => a.vehicleId === filters.vehicleId);
    }
    if (filters.severity) {
      results = results.filter(a => a.severity === filters.severity);
    }
    if (filters.type) {
      results = results.filter(a => a.type === filters.type);
    }

    return {
      count: results.length,
      alerts: results.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    };
  }

  // تأكيد الإنذار
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    alert.status = 'acknowledged';
    alert.updatedAt = new Date();

    return alert;
  }

  // إغلاق الإنذار
  closeAlert(alertId, resolution) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    alert.status = 'closed';
    alert.resolution = resolution;
    alert.closedAt = new Date();
    alert.updatedAt = new Date();

    return alert;
  }

  // جلب تاريخ الإنذارات
  getAlertHistory(filters = {}, limit = 50) {
    let results = this.alerts;

    if (filters.vehicleId) {
      results = results.filter(a => a.vehicleId === filters.vehicleId);
    }
    if (filters.driverId) {
      results = results.filter(a => a.driverId === filters.driverId);
    }
    if (filters.type) {
      results = results.filter(a => a.type === filters.type);
    }
    if (filters.startDate && filters.endDate) {
      results = results.filter(a => {
        const alertDate = new Date(a.createdAt);
        return alertDate >= new Date(filters.startDate) && alertDate <= new Date(filters.endDate);
      });
    }

    return {
      count: results.length,
      alerts: results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit)
    };
  }

  // إحصائيات الإنذارات
  getAlertStatistics(period = 'monthly') {
    const now = new Date();
    let startDate;

    if (period === 'daily') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const periodAlerts = this.alerts.filter(a => new Date(a.createdAt) >= startDate);

    return {
      period,
      total: periodAlerts.length,
      byType: {
        safety: periodAlerts.filter(a => a.type === 'safety').length,
        maintenance: periodAlerts.filter(a => a.type === 'maintenance').length,
        fuel: periodAlerts.filter(a => a.type === 'fuel').length,
        insurance: periodAlerts.filter(a => a.type === 'insurance').length,
        other: periodAlerts.filter(a => !['safety', 'maintenance', 'fuel', 'insurance'].includes(a.type)).length
      },
      bySeverity: {
        critical: periodAlerts.filter(a => a.severity === 'critical').length,
        high: periodAlerts.filter(a => a.severity === 'high').length,
        medium: periodAlerts.filter(a => a.severity === 'medium').length,
        low: periodAlerts.filter(a => a.severity === 'low').length
      },
      acknowledged: periodAlerts.filter(a => a.acknowledged).length,
      pending: periodAlerts.filter(a => !a.acknowledged).length
    };
  }

  // إشعارات معلقة
  getPendingNotifications(userId) {
    return {
      count: this.notifications.filter(n => n.recipients.includes(userId) && n.readBy.indexOf(userId) === -1).length,
      notifications: this.notifications
        .filter(n => n.recipients.includes(userId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20)
    };
  }

  // تحديد الإشعار كمقروء
  markNotificationAsRead(notificationId, userId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return null;

    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
    }

    return notification;
  }

  // قواعد التنبيهات المخصصة
  createCustomAlertRule(ruleData) {
    const rule = {
      id: `custom-${Date.now()}`,
      ...ruleData,
      enabled: true,
      createdAt: new Date()
    };

    this.alertRules.push(rule);
    return rule;
  }

  // جلب القواعس المتاحة
  getAlertRules() {
    return this.alertRules;
  }

  // تحديث قاعدة
  updateAlertRule(ruleId, updates) {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (!rule) return null;

    Object.assign(rule, updates);
    rule.updatedAt = new Date();

    return rule;
  }

  // تقرير الإنذارات
  getAlertReport(vehicleId, startDate, endDate) {
    const vehicleAlerts = this.alerts.filter(a => 
      a.vehicleId === vehicleId &&
      new Date(a.createdAt) >= new Date(startDate) &&
      new Date(a.createdAt) <= new Date(endDate)
    );

    const typeBreakdown = {};
    const severityBreakdown = {};

    vehicleAlerts.forEach(alert => {
      typeBreakdown[alert.type] = (typeBreakdown[alert.type] || 0) + 1;
      severityBreakdown[alert.severity] = (severityBreakdown[alert.severity] || 0) + 1;
    });

    return {
      vehicleId,
      period: { startDate, endDate },
      totalAlerts: vehicleAlerts.length,
      typeBreakdown,
      severityBreakdown,
      acknowledgedRate: vehicleAlerts.filter(a => a.acknowledged).length / vehicleAlerts.length * 100,
      averageTimeToAcknowledge: this.calculateAverageAcknowledgeTime(vehicleAlerts),
      criticalAlerts: vehicleAlerts.filter(a => a.severity === 'critical')
    };
  }

  // حساب متوسط وقت التأكيد
  calculateAverageAcknowledgeTime(alerts) {
    const acknowledgedAlerts = alerts.filter(a => a.acknowledged && a.acknowledgedAt);
    
    if (acknowledgedAlerts.length === 0) return 0;

    const totalTime = acknowledgedAlerts.reduce((sum, a) => {
      return sum + (new Date(a.acknowledgedAt) - new Date(a.createdAt));
    }, 0);

    return Math.round(totalTime / acknowledgedAlerts.length / 60 / 1000); // بالدقائق
  }

  // تحليل الأنماط
  analyzeAlertPatterns() {
    const patterns = {
      mostCommonType: this.getMostCommonAlertType(),
      highRiskVehicles: this.getHighRiskVehicles(),
      highRiskDrivers: this.getHighRiskDrivers(),
      timePatterns: this.getTimePatterns(),
      recommendations: []
    };

    if (patterns.mostCommonType) {
      patterns.recommendations.push(`التركيز على منع تنبيهات ${patterns.mostCommonType.type}`);
    }

    return patterns;
  }

  getMostCommonAlertType() {
    const types = {};
    this.alerts.forEach(a => {
      types[a.type] = (types[a.type] || 0) + 1;
    });

    const maxType = Object.entries(types).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0]);
    return { type: maxType[0], count: maxType[1] };
  }

  getHighRiskVehicles() {
    const vehicleAlerts = {};
    this.alerts.forEach(a => {
      if (a.vehicleId) {
        vehicleAlerts[a.vehicleId] = (vehicleAlerts[a.vehicleId] || 0) + 1;
      }
    });

    return Object.entries(vehicleAlerts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([vehicleId, count]) => ({ vehicleId, alertCount: count }));
  }

  getHighRiskDrivers() {
    const driverAlerts = {};
    this.alerts.forEach(a => {
      if (a.driverId) {
        driverAlerts[a.driverId] = (driverAlerts[a.driverId] || 0) + 1;
      }
    });

    return Object.entries(driverAlerts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([driverId, count]) => ({ driverId, alertCount: count }));
  }

  getTimePatterns() {
    const hourlyDistribution = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0;
    }

    this.alerts.forEach(a => {
      const hour = new Date(a.createdAt).getHours();
      hourlyDistribution[hour]++;
    });

    return hourlyDistribution;
  }
}

module.exports = new AlertNotificationService();
