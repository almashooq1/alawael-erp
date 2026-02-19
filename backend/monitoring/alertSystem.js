/**
 * 🚨 Alert System
 *
 * Real-time alerts with rules, cooldowns, and notifiers
 */

const EventEmitter = require('events');

class AlertSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.rules = [];
    this.alerts = [];
    this.maxAlerts = options.maxAlerts || 200;
    this.cooldownMs = options.cooldownMs || 300000; // 5 minutes
    this.lastTriggered = new Map();
    this.notifiers = [];
    this.onAlert = options.onAlert;
  }

  addRule(rule) {
    if (!rule || !rule.id || typeof rule.condition !== 'function') {
      throw new Error('Invalid alert rule');
    }
    this.rules.push(rule);
  }

  addNotifier(notifierFn) {
    if (typeof notifierFn === 'function') {
      this.notifiers.push(notifierFn);
    }
  }

  evaluate(context = {}) {
    this.rules.forEach(rule => {
      let shouldTrigger = false;
      try {
        shouldTrigger = rule.condition(context);
      } catch (error) {
        console.error('[AlertSystem] Rule evaluation error:', rule.id, error.message);
      }

      if (shouldTrigger) {
        this.triggerAlert(rule, context);
      }
    });
  }

  triggerAlert(rule, context = {}) {
    const now = Date.now();
    const key = rule.id;
    const last = this.lastTriggered.get(key);
    if (last && now - last < this.cooldownMs) {
      return null;
    }

    const message =
      typeof rule.message === 'function' ? rule.message(context) : rule.message || rule.id;
    const alert = {
      id: `${rule.id}-${now}`,
      type: rule.type || rule.id,
      severity: rule.severity || 'warning',
      message,
      source: rule.source || 'system',
      timestamp: now,
      data: typeof rule.data === 'function' ? rule.data(context) : rule.data,
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    this.lastTriggered.set(key, now);
    this.emit('alert', alert);
    if (typeof this.onAlert === 'function') {
      this.onAlert(alert);
    }

    this.notifiers.forEach(async notifier => {
      try {
        await notifier(alert);
      } catch (error) {
        console.error('[AlertSystem] Notifier error:', error.message);
      }
    });

    return alert;
  }

  createManualAlert(alert) {
    const now = Date.now();
    const payload = {
      id: alert.id || `manual-${now}`,
      type: alert.type || 'manual',
      severity: alert.severity || 'info',
      message: alert.message || 'Manual alert',
      source: alert.source || 'manual',
      timestamp: now,
      data: alert.data,
    };

    this.alerts.push(payload);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    this.emit('alert', payload);
    if (typeof this.onAlert === 'function') {
      this.onAlert(payload);
    }

    this.notifiers.forEach(async notifier => {
      try {
        await notifier(payload);
      } catch (error) {
        console.error('[AlertSystem] Notifier error:', error.message);
      }
    });

    return payload;
  }

  getAlerts(limit = 50) {
    return this.alerts.slice(-limit).reverse();
  }

  clear() {
    this.alerts = [];
    this.lastTriggered.clear();
  }
}

module.exports = { AlertSystem };
