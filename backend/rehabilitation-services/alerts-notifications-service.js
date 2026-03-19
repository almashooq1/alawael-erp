/**
 * 🔔 نظام التنبيهات والإشعارات — Alerts & Notifications Engine
 * الإصدار 6.0.0
 * يشمل: تنبيهات تقدم، تحذيرات تراجع، تذكيرات مواعيد، إشعارات معالم، تنبيهات طوارئ
 */

class AlertsNotificationsService {
  constructor() {
    this.alerts = new Map();
    this.notificationPreferences = new Map();
    this.rules = new Map();
    this.history = new Map();
    this._initDefaultRules();
  }

  _initDefaultRules() {
    const rules = [
      {
        id: 'rule-regression',
        name: 'تنبيه التراجع',
        condition: 'regression',
        severity: 'high',
        description: 'ينشط عند انخفاض الأداء بنسبة >15% في آخر 3 جلسات',
        channels: ['sms', 'dashboard', 'email'],
        active: true,
      },
      {
        id: 'rule-milestone',
        name: 'إشعار المعلم',
        condition: 'milestone',
        severity: 'info',
        description: 'ينشط عند تحقيق هدف أو معلم مهم',
        channels: ['dashboard', 'sms'],
        active: true,
      },
      {
        id: 'rule-absence',
        name: 'تنبيه الغياب',
        condition: 'absence',
        severity: 'medium',
        description: 'ينشط عند غياب المستفيد عن جلستين متتاليتين',
        channels: ['sms', 'email', 'dashboard'],
        active: true,
      },
      {
        id: 'rule-plan-expiry',
        name: 'انتهاء الخطة',
        condition: 'plan_expiry',
        severity: 'medium',
        description: 'تنبيه قبل أسبوعين من انتهاء الخطة العلاجية',
        channels: ['dashboard', 'email'],
        active: true,
      },
      {
        id: 'rule-assessment-due',
        name: 'تقييم مستحق',
        condition: 'assessment_due',
        severity: 'low',
        description: 'تذكير بموعد التقييم الدوري',
        channels: ['dashboard'],
        active: true,
      },
      {
        id: 'rule-risk-change',
        name: 'تغير درجة الخطر',
        condition: 'risk_change',
        severity: 'high',
        description: 'ينشط عند ارتفاع درجة الخطر لمستفيد',
        channels: ['sms', 'email', 'dashboard'],
        active: true,
      },
      {
        id: 'rule-family-action',
        name: 'إجراء أسري مطلوب',
        condition: 'family_action',
        severity: 'medium',
        description: 'إشعار للأسرة بإجراء مطلوب (واجبات منزلية، تمارين)',
        channels: ['sms'],
        active: true,
      },
      {
        id: 'rule-emergency',
        name: 'تنبيه طوارئ',
        condition: 'emergency',
        severity: 'critical',
        description: 'تنبيه فوري عند حدوث إصابة أو حالة طارئة',
        channels: ['sms', 'email', 'dashboard', 'phone'],
        active: true,
      },
    ];
    rules.forEach(r => this.rules.set(r.id, r));
  }

  /* ─── إنشاء تنبيه ─── */
  async createAlert(alertData) {
    const alert = {
      id: `alt-${Date.now()}`,
      beneficiaryId: alertData.beneficiaryId,
      type: alertData.type, // regression / milestone / absence / plan_expiry / assessment_due / risk_change / emergency
      severity: alertData.severity || this._getSeverityByType(alertData.type),
      title: alertData.title,
      message: alertData.message,
      data: alertData.data || {},
      serviceType: alertData.serviceType || '',
      therapistId: alertData.therapistId || '',
      status: 'active',
      read: false,
      channels: alertData.channels || this._getChannelsByType(alertData.type),
      createdAt: new Date(),
      expiresAt: alertData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      actions: alertData.actions || this._suggestActions(alertData.type),
    };

    this.alerts.set(alert.id, alert);

    // تسجيل في السجل
    const histKey = `${alertData.beneficiaryId}_alerts`;
    const hist = this.history.get(histKey) || [];
    hist.push({
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      date: alert.createdAt,
    });
    this.history.set(histKey, hist);

    return alert;
  }

  /* ─── تحليل الجلسات للتنبيهات التلقائية ─── */
  async analyzeSessionForAlerts(beneficiaryId, sessionData, historicalSessions) {
    const triggeredAlerts = [];

    // تنبيه التراجع
    if (historicalSessions && historicalSessions.length >= 3) {
      const recent3 = historicalSessions
        .slice(-3)
        .map(s => s.performance?.taskAccuracy || s.overallScore || 0);
      const prev3 = historicalSessions
        .slice(-6, -3)
        .map(s => s.performance?.taskAccuracy || s.overallScore || 0);
      if (prev3.length >= 3) {
        const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
        const prevAvg = prev3.reduce((a, b) => a + b, 0) / prev3.length;
        if (prevAvg > 0 && (prevAvg - recentAvg) / prevAvg > 0.15) {
          const alert = await this.createAlert({
            beneficiaryId,
            type: 'regression',
            title: 'تراجع في الأداء',
            message: `انخفاض الأداء بنسبة ${Math.round(((prevAvg - recentAvg) / prevAvg) * 100)}% — يرجى مراجعة الخطة`,
            data: {
              recentAvg,
              prevAvg,
              dropPercent: Math.round(((prevAvg - recentAvg) / prevAvg) * 100),
            },
            serviceType: sessionData.serviceType || '',
          });
          triggeredAlerts.push(alert);
        }
      }
    }

    // تنبيه معلم مهم
    if (sessionData.milestoneReached) {
      const alert = await this.createAlert({
        beneficiaryId,
        type: 'milestone',
        severity: 'info',
        title: 'تحقيق معلم مهم 🎉',
        message: sessionData.milestoneReached,
        serviceType: sessionData.serviceType || '',
      });
      triggeredAlerts.push(alert);
    }

    // تنبيه مستوى الألم / الإجهاد العالي
    if ((sessionData.painLevel || 0) >= 8 || (sessionData.frustrationLevel || 0) >= 9) {
      const alert = await this.createAlert({
        beneficiaryId,
        type: 'emergency',
        severity: 'critical',
        title: 'مستوى ألم / إجهاد مرتفع',
        message: `مستوى الألم: ${sessionData.painLevel || 'N/A'} | مستوى الإحباط: ${sessionData.frustrationLevel || 'N/A'}`,
        serviceType: sessionData.serviceType || '',
      });
      triggeredAlerts.push(alert);
    }

    return triggeredAlerts;
  }

  /* ─── إشعار الغياب ─── */
  async checkAbsence(beneficiaryId, scheduledDates, attendedDates) {
    const missed = scheduledDates.filter(d => !attendedDates.includes(d));
    if (missed.length >= 2) {
      return this.createAlert({
        beneficiaryId,
        type: 'absence',
        title: 'غياب متكرر',
        message: `غاب المستفيد عن ${missed.length} جلسات: ${missed.join(', ')}`,
        data: { missedDates: missed },
      });
    }
    return null;
  }

  /* ─── جلب التنبيهات ─── */
  async getAlerts(filters) {
    let all = Array.from(this.alerts.values());

    if (filters?.beneficiaryId) all = all.filter(a => a.beneficiaryId === filters.beneficiaryId);
    if (filters?.therapistId) all = all.filter(a => a.therapistId === filters.therapistId);
    if (filters?.type) all = all.filter(a => a.type === filters.type);
    if (filters?.severity) all = all.filter(a => a.severity === filters.severity);
    if (filters?.status) all = all.filter(a => a.status === filters.status);
    if (filters?.unreadOnly) all = all.filter(a => !a.read);

    return {
      total: all.length,
      alerts: all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      bySeverity: {
        critical: all.filter(a => a.severity === 'critical').length,
        high: all.filter(a => a.severity === 'high').length,
        medium: all.filter(a => a.severity === 'medium').length,
        low: all.filter(a => a.severity === 'low').length,
        info: all.filter(a => a.severity === 'info').length,
      },
    };
  }

  /* ─── قراءة / رفض تنبيه ─── */
  async markAlertRead(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) return { success: false, error: 'التنبيه غير موجود' };
    alert.read = true;
    alert.readAt = new Date();
    this.alerts.set(alertId, alert);
    return { success: true };
  }

  async dismissAlert(alertId, reason) {
    const alert = this.alerts.get(alertId);
    if (!alert) return { success: false, error: 'التنبيه غير موجود' };
    alert.status = 'dismissed';
    alert.dismissedAt = new Date();
    alert.dismissReason = reason || '';
    this.alerts.set(alertId, alert);
    return { success: true };
  }

  async resolveAlert(alertId, resolution) {
    const alert = this.alerts.get(alertId);
    if (!alert) return { success: false, error: 'التنبيه غير موجود' };
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolution = resolution || '';
    this.alerts.set(alertId, alert);
    return { success: true };
  }

  /* ─── تفضيلات الإشعارات ─── */
  async setNotificationPreferences(userId, preferences) {
    const prefs = {
      userId,
      channels: preferences.channels || { sms: true, email: true, dashboard: true },
      quietHours: preferences.quietHours || { start: '22:00', end: '07:00' },
      severityFilter: preferences.severityFilter || 'all',
      updatedAt: new Date(),
    };
    this.notificationPreferences.set(userId, prefs);
    return { success: true, preferences: prefs };
  }

  async getNotificationPreferences(userId) {
    return (
      this.notificationPreferences.get(userId) || {
        userId,
        channels: { sms: true, email: true, dashboard: true },
        quietHours: { start: '22:00', end: '07:00' },
        severityFilter: 'all',
      }
    );
  }

  /* ─── تقرير التنبيهات ─── */
  async getAlertsReport(dateRange) {
    let all = Array.from(this.alerts.values());
    if (dateRange?.from) all = all.filter(a => new Date(a.createdAt) >= new Date(dateRange.from));
    if (dateRange?.to) all = all.filter(a => new Date(a.createdAt) <= new Date(dateRange.to));

    return {
      total: all.length,
      active: all.filter(a => a.status === 'active').length,
      resolved: all.filter(a => a.status === 'resolved').length,
      dismissed: all.filter(a => a.status === 'dismissed').length,
      bySeverity: {
        critical: all.filter(a => a.severity === 'critical').length,
        high: all.filter(a => a.severity === 'high').length,
        medium: all.filter(a => a.severity === 'medium').length,
        low: all.filter(a => a.severity === 'low').length,
        info: all.filter(a => a.severity === 'info').length,
      },
      byType: this._groupByType(all),
      avgResolutionTime: this._calcAvgResolutionTime(all.filter(a => a.status === 'resolved')),
      topBeneficiaries: this._topBeneficiariesByAlerts(all),
    };
  }

  /* ─── مساعدات ─── */
  _getSeverityByType(type) {
    const map = {
      emergency: 'critical',
      regression: 'high',
      risk_change: 'high',
      absence: 'medium',
      plan_expiry: 'medium',
      family_action: 'medium',
      assessment_due: 'low',
      milestone: 'info',
    };
    return map[type] || 'medium';
  }

  _getChannelsByType(type) {
    const rule = Array.from(this.rules.values()).find(r => r.condition === type);
    return rule?.channels || ['dashboard'];
  }

  _suggestActions(type) {
    const actions = {
      regression: [
        { action: 'مراجعة الخطة العلاجية', url: '/plans/review' },
        { action: 'طلب استشارة', url: '/consultations/new' },
      ],
      milestone: [{ action: 'مشاركة التقرير مع الأسرة', url: '/reports/share' }],
      absence: [
        { action: 'التواصل مع الأسرة', url: '/communication' },
        { action: 'إعادة جدولة', url: '/scheduling' },
      ],
      plan_expiry: [
        { action: 'تجديد الخطة', url: '/plans/renew' },
        { action: 'إجراء تقييم جديد', url: '/assessments/new' },
      ],
      emergency: [
        { action: 'الاتصال بخدمات الطوارئ', url: '/emergency' },
        { action: 'إشعار المشرف', url: '/supervisors/notify' },
      ],
    };
    return actions[type] || [];
  }

  _groupByType(alerts) {
    const groups = {};
    alerts.forEach(a => {
      groups[a.type] = (groups[a.type] || 0) + 1;
    });
    return groups;
  }

  _calcAvgResolutionTime(resolvedAlerts) {
    if (resolvedAlerts.length === 0) return 0;
    const times = resolvedAlerts.map(
      a => (new Date(a.resolvedAt) - new Date(a.createdAt)) / (1000 * 60 * 60)
    );
    return Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
  }

  _topBeneficiariesByAlerts(alerts) {
    const counts = {};
    alerts.forEach(a => {
      counts[a.beneficiaryId] = (counts[a.beneficiaryId] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ beneficiaryId: id, alertCount: count }));
  }
}

module.exports = { AlertsNotificationsService };
