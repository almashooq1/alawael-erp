/**
 * KPI Alert Management Service
 * Handles alert thresholds, notifications, and escalation policies
 */

const logger = require('../utils/logger');

class KPIAlertService {
  constructor() {
    this.alerts = new Map();
    this.alertRules = new Map();
    this.alertHistory = [];
    this.subscribers = new Map();
    this.escalationPolicies = [];
  }

  /**
   * Create alert rule
   */
  createAlertRule(kpiId, rule) {
    const alertRule = {
      id: `rule_${Date.now()}`,
      kpiId,
      name: rule.name,
      enabled: true,
      condition: rule.condition, // 'below', 'above', 'equals', 'range'
      threshold: rule.threshold,
      thresholdMin: rule.thresholdMin,
      thresholdMax: rule.thresholdMax,
      severity: rule.severity, // 'info', 'warning', 'critical'
      notifyUsers: rule.notifyUsers || [],
      notifyChannels: rule.notifyChannels || ['in-app'], // email, slack, sms, etc.
      cooldownPeriod: rule.cooldownPeriod || 3600000, // 1 hour default
      lastTriggered: null,
      createdAt: new Date(),
    };

    this.alertRules.set(alertRule.id, alertRule);
    logger.info(`✅ Created alert rule: ${alertRule.name} for KPI ${kpiId}`);

    return alertRule;
  }

  /**
   * Evaluate KPI value against rules
   */
  evaluateKPI(kpiId, currentValue, targetValue) {
    const rules = Array.from(this.alertRules.values())
      .filter(r => r.kpiId === kpiId && r.enabled);

    const triggeredAlerts = [];

    rules.forEach((rule) => {
      if (this.shouldCooldown(rule)) {
        return; // Skip if in cooldown
      }

      const shouldTrigger = this.checkCondition(currentValue, rule);

      if (shouldTrigger) {
        const alert = this.createAlert(kpiId, rule, currentValue, targetValue);
        triggeredAlerts.push(alert);
        rule.lastTriggered = new Date();

        // Trigger notifications
        this.sendNotifications(alert, rule);
      }
    });

    return triggeredAlerts;
  }

  /**
   * Check if condition is met
   */
  checkCondition(currentValue, rule) {
    const { condition, threshold, thresholdMin, thresholdMax } = rule;

    switch (condition) {
      case 'below':
        return currentValue < threshold;
      case 'above':
        return currentValue > threshold;
      case 'equals':
        return currentValue === threshold;
      case 'range':
        return currentValue < thresholdMin || currentValue > thresholdMax;
      case 'percent_of_target':
        return currentValue < (threshold / 100) * targetValue;
      default:
        return false;
    }
  }

  /**
   * Check if alert is in cooldown
   */
  shouldCooldown(rule) {
    if (!rule.lastTriggered) return false;

    const now = new Date();
    const timeSinceLastTrigger = now - rule.lastTriggered;

    return timeSinceLastTrigger < rule.cooldownPeriod;
  }

  /**
   * Create alert instance
   */
  createAlert(kpiId, rule, currentValue, targetValue) {
    const performancePercent = (currentValue / targetValue) * 100;

    const alert = {
      id: `alert_${Date.now()}`,
      kpiId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      currentValue,
      targetValue,
      performancePercent: performancePercent.toFixed(2),
      condition: rule.condition,
      message: this.generateAlertMessage(rule, currentValue, targetValue),
      message_ar: this.generateAlertMessageAR(rule, currentValue, targetValue),
      createdAt: new Date(),
      status: 'active',
      read: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    return alert;
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(rule, currentValue, targetValue) {
    const performancePercent = ((currentValue / targetValue) * 100).toFixed(1);

    switch (rule.condition) {
      case 'below':
        return `Alert: Value (${currentValue}) is below threshold (${rule.threshold}). Performance: ${performancePercent}%`;
      case 'above':
        return `Alert: Value (${currentValue}) exceeds threshold (${rule.threshold})`;
      case 'range':
        return `Alert: Value (${currentValue}) is outside acceptable range (${rule.thresholdMin} - ${rule.thresholdMax})`;
      case 'percent_of_target':
        return `Alert: Performance (${performancePercent}%) is below ${rule.threshold}% of target`;
      default:
        return `Alert triggered for rule: ${rule.name}`;
    }
  }

  /**
   * Generate Arabic alert message
   */
  generateAlertMessageAR(rule, currentValue, targetValue) {
    const performancePercent = ((currentValue / targetValue) * 100).toFixed(1);

    switch (rule.condition) {
      case 'below':
        return `تنبيه: القيمة (${currentValue}) أقل من الحد (${rule.threshold}). الأداء: ${performancePercent}%`;
      case 'above':
        return `تنبيه: القيمة (${currentValue}) تتجاوز الحد (${rule.threshold})`;
      case 'range':
        return `تنبيه: القيمة (${currentValue}) خارج النطاق المقبول (${rule.thresholdMin} - ${rule.thresholdMax})`;
      case 'percent_of_target':
        return `تنبيه: الأداء (${performancePercent}%) أقل من ${rule.threshold}% من الهدف`;
      default:
        return `تم تفعيل تنبيه للقاعدة: ${rule.name}`;
    }
  }

  /**
   * Send notifications
   */
  sendNotifications(alert, rule) {
    const notificationData = {
      alert,
      rule,
      timestamp: new Date(),
    };

    rule.notifyChannels.forEach((channel) => {
      switch (channel) {
        case 'in-app':
          this.sendInAppNotification(alert, rule);
          break;
        case 'email':
          this.sendEmailNotification(alert, rule);
          break;
        case 'slack':
          this.sendSlackNotification(alert, rule);
          break;
        case 'sms':
          this.sendSMSNotification(alert, rule);
          break;
      }
    });

    logger.info(`📢 Notifications sent for alert: ${alert.id}`);
  }

  /**
   * Send in-app notification
   */
  sendInAppNotification(alert, rule) {
    rule.notifyUsers.forEach((userId) => {
      if (!this.subscribers.has(userId)) {
        this.subscribers.set(userId, []);
      }

      const userAlerts = this.subscribers.get(userId);
      userAlerts.push({
        alertId: alert.id,
        message: alert.message,
        severity: alert.severity,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Send email notification
   */
  sendEmailNotification(alert, rule) {
    // Integration point with email service
    logger.info(`📧 Email notification queued for alert: ${alert.id}`);
  }

  /**
   * Send Slack notification
   */
  sendSlackNotification(alert, rule) {
    // Integration point with Slack
    const message = {
      text: alert.message,
      severity: alert.severity,
      kpiId: alert.kpiId,
      timestamp: new Date(),
    };

    logger.info(`💬 Slack notification for alert: ${JSON.stringify(message)}`);
  }

  /**
   * Send SMS notification
   */
  sendSMSNotification(alert, rule) {
    // Integration point with SMS service
    logger.info(`📱 SMS notification queued for alert: ${alert.id}`);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(kpiId = null, severity = null) {
    let activeAlerts = Array.from(this.alerts.values())
      .filter(a => a.status === 'active');

    if (kpiId) {
      activeAlerts = activeAlerts.filter(a => a.kpiId === kpiId);
    }

    if (severity) {
      activeAlerts = activeAlerts.filter(a => a.severity === severity);
    }

    return activeAlerts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;
      logger.info(`✔️  Alert acknowledged: ${alertId}`);
    }
    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, userId, note = '') {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = userId;
      alert.resolutionNote = note;
      logger.info(`✅ Alert resolved: ${alertId}`);
    }
    return alert;
  }

  /**
   * Get alert rules for KPI
   */
  getAlertRules(kpiId) {
    return Array.from(this.alertRules.values())
      .filter(r => r.kpiId === kpiId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId, updates) {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      logger.info(`🔄 Alert rule updated: ${ruleId}`);
    }
    return rule;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId) {
    const rule = this.alertRules.get(ruleId);
    this.alertRules.delete(ruleId);
    logger.info(`🗑️  Alert rule deleted: ${ruleId}`);
    return Boolean(rule);
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const allAlerts = Array.from(this.alerts.values());
    const severityCount = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    const statusCount = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
    };

    allAlerts.forEach((alert) => {
      severityCount[alert.severity]++;
      statusCount[alert.status]++;
    });

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: this.getActiveAlerts().length,
      severityCount,
      statusCount,
      totalRules: this.alertRules.size,
      timestamp: new Date(),
    };
  }

  /**
   * Create escalation policy
   */
  createEscalationPolicy(policy) {
    const escalationPolicy = {
      id: `policy_${Date.now()}`,
      name: policy.name,
      steps: policy.steps, // [{ severity: 'warning', delay: 300000, action: 'notify_manager' }]
      enabled: true,
      createdAt: new Date(),
    };

    this.escalationPolicies.push(escalationPolicy);
    return escalationPolicy;
  }

  /**
   * Get alert timeline
   */
  getAlertTimeline(kpiId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.alertHistory
      .filter(a => a.kpiId === kpiId && a.createdAt >= startDate)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId) {
    return this.subscribers.get(userId) || [];
  }

  /**
   * Clear user notifications
   */
  clearUserNotifications(userId) {
    this.subscribers.set(userId, []);
  }

  /**
   * Get alert health report
   */
  getAlertHealthReport() {
    const stats = this.getAlertStats();
    const rules = Array.from(this.alertRules.values());

    return {
      overview: stats,
      rules: {
        total: rules.length,
        enabled: rules.filter(r => r.enabled).length,
        disabled: rules.filter(r => !r.enabled).length,
      },
      escalationPolicies: this.escalationPolicies.length,
      recentAlerts: this.getActiveAlerts().slice(0, 10),
      timestamp: new Date(),
    };
  }
}

module.exports = new KPIAlertService();
