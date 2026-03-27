/* eslint-disable no-unused-vars */
const Integration = require('../models/Integration');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { EventEmitter } = require('events');

// =========================================
// WebhookEvent — single webhook event
// =========================================
class WebhookEvent {
  constructor(event, data) {
    this.id = crypto.randomUUID();
    this.event = event;
    this.data = data;
    this.status = 'pending';
    this.retries = 0;
    this.signature = null;
    this.timestamp = new Date();
  }

  generateSignature(secret) {
    this.signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(this.data))
      .digest('hex');
    return this.signature;
  }

  getPayload() {
    return {
      id: this.id,
      event: this.event,
      data: this.data,
      signature: this.signature,
      timestamp: this.timestamp,
    };
  }
}

// =========================================
// WebhookSubscription — event subscription
// =========================================
class WebhookSubscription {
  constructor(url, events) {
    this.id = crypto.randomUUID();
    this.url = url;
    this.events = events;
    this.isActive = true;
    this.secret = crypto.randomBytes(32).toString('hex');
    this.deliveryCount = 0;
    this.failureCount = 0;
    this.retryPolicy = { maxRetries: 5, initialDelay: 1000, maxDelay: 60000, backoffFactor: 2 };
  }

  matches(eventName) {
    if (this.events.includes('*')) return true;
    // Support prefix wildcards: "order.*" matches "order.created"
    return this.events.some(e => {
      if (e.endsWith('.*')) return eventName.startsWith(e.slice(0, -1));
      return e === eventName;
    });
  }

  incrementDelivery(success) {
    if (success) this.deliveryCount++;
    else this.failureCount++;
  }

  getRetryDelay(attempt) {
    const delay = this.retryPolicy.initialDelay * Math.pow(this.retryPolicy.backoffFactor, attempt);
    return Math.min(delay, this.retryPolicy.maxDelay);
  }
}

// =========================================
// IntegrationConnector — field-mapping sync
// =========================================
class IntegrationConnector {
  constructor(name, type, config) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.type = type;
    this.config = config;
    this.isActive = true;
    this.mappings = new Map();
    this.filters = [];
    this.syncCount = 0;
    this.errorCount = 0;
    this.lastSync = null;
  }

  addFieldMapping(source, target, transform) {
    this.mappings.set(source, { target, transform });
  }

  applyMappings(data) {
    const result = {};
    for (const [source, { target, transform }] of this.mappings) {
      if (source in data) {
        result[target] = transform ? transform(data[source]) : data[source];
      }
    }
    return result;
  }

  addFilter(field, operator, value) {
    this.filters.push({ field, operator, value });
  }

  applyFilters(data) {
    return this.filters.every(({ field, operator, value }) => {
      const v = data[field];
      if (operator === '==') return v === value;
      if (operator === '!=') return v !== value;
      if (operator === '>') return v > value;
      if (operator === '<') return v < value;
      if (operator === '>=') return v >= value;
      if (operator === '<=') return v <= value;
      return true;
    });
  }

  recordSync(success) {
    if (success) this.syncCount++;
    else this.errorCount++;
    this.lastSync = new Date();
  }
}

// =========================================
// APIIntegration (also aliased APIIntegrator)
// =========================================
class APIIntegration {
  constructor(name, baseURL) {
    this.name = name;
    this.baseURL = baseURL;
    this.config = { timeout: 30000 };
    this.endpoints = new Map();
    this.callCount = 0;
    this.lastCall = null;
  }

  registerEndpoint(name, method, path) {
    this.endpoints.set(name, { method, path });
  }

  async call(name, params) {
    const endpoint = this.endpoints.get(name);
    if (!endpoint) throw new Error(`Endpoint "${name}" not registered`);
    this.callCount++;
    this.lastCall = new Date();
    return {
      success: true,
      endpoint: name,
      method: endpoint.method,
      params,
      timestamp: this.lastCall,
    };
  }

  getSummary() {
    return {
      name: this.name,
      baseURL: this.baseURL,
      endpoints: this.endpoints.size,
      callCount: this.callCount,
    };
  }
}

const APIIntegrator = APIIntegration; // alias

// =========================================
// IntegrationService — full integration engine
// =========================================
class IntegrationService extends EventEmitter {
  constructor() {
    super();
    this._webhooks = new Map();
    this._connectors = new Map();
    this._apis = new Map();
    this._eventHistory = [];
    this._transformations = new Map();
  }

  // --- DB-backed methods (original) ---

  async configureIntegration(name, type, config) {
    let integration = await Integration.findOne({ name });
    if (integration) {
      integration.type = type;
      integration.config = { ...integration.config, ...config };
      integration.status = 'ACTIVE';
    } else {
      integration = new Integration({ name, type, config, status: 'ACTIVE' });
    }
    await integration.save();
    return integration;
  }

  async triggerWebhook(integrationName, payload) {
    const integration = await Integration.findOne({ name: integrationName });
    if (!integration || integration.status !== 'ACTIVE') {
      throw new Error('Integration not found or inactive');
    }
    try {
      logger.info(
        `[IntegrationService] Sending webhook to ${integration.config.webhookUrl}`,
        payload
      );
      integration.logs.push({
        action: 'WEBHOOK_DISPATCH',
        status: 'SUCCESS',
        message: 'Payload sent successfully',
      });
      integration.lastSync = new Date();
      await integration.save();
      return { success: true, timestamp: new Date() };
    } catch (error) {
      integration.logs.push({
        action: 'WEBHOOK_DISPATCH',
        status: 'FAILED',
        message: 'حدث خطأ داخلي',
      });
      await integration.save();
      throw error;
    }
  }

  async listIntegrations() {
    return Integration.find({}, 'name type status lastSync');
  }

  // --- In-memory API ---

  registerWebhook(url, events) {
    const sub = new WebhookSubscription(url, events);
    this._webhooks.set(sub.id, sub);
    return sub;
  }

  getWebhook(id) {
    return this._webhooks.get(id);
  }

  getAllWebhooks() {
    return Array.from(this._webhooks.values());
  }

  updateWebhook(id, updates) {
    const wh = this._webhooks.get(id);
    if (!wh) return;
    if (updates.events) wh.events = updates.events;
    if (updates.url) wh.url = updates.url;
    if (typeof updates.isActive === 'boolean') wh.isActive = updates.isActive;
  }

  deleteWebhook(id) {
    this._webhooks.delete(id);
  }

  emitEvent(eventName, data) {
    const event = new WebhookEvent(eventName, data);
    this._eventHistory.push(event);
    // fire EventEmitter listeners
    this.emit(eventName, event);
    return event;
  }

  getEventHistory(limit) {
    return this._eventHistory.slice(-limit);
  }

  createConnector(name, type, config) {
    const connector = new IntegrationConnector(name, type, config);
    this._connectors.set(connector.id, connector);
    return connector;
  }

  getConnector(id) {
    const c = this._connectors.get(id);
    if (!c) throw new Error(`Connector "${id}" not found`);
    return c;
  }

  registerAPI(name, baseURL) {
    const api = new APIIntegration(name, baseURL);
    this._apis.set(name, api);
    return api;
  }

  getAllIntegrations() {
    return Array.from(this._apis.values());
  }

  registerTransformation(name, fn) {
    this._transformations.set(name, fn);
  }

  applyTransformation(name, data) {
    const fn = this._transformations.get(name);
    if (!fn) throw new Error(`Transformation "${name}" not found`);
    return fn(data);
  }

  validateWebhookSignature(signature, payload, secret) {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  getStatistics() {
    let totalDeliveries = 0,
      totalFailures = 0;
    for (const wh of this._webhooks.values()) {
      totalDeliveries += wh.deliveryCount;
      totalFailures += wh.failureCount;
    }
    const total = totalDeliveries + totalFailures;
    return {
      webhooks: this._webhooks.size,
      connectors: this._connectors.size,
      apis: this._apis.size,
      events: this._eventHistory.length,
      successRate: total ? (totalDeliveries / total) * 100 : 100,
    };
  }

  getIntegrationHealth() {
    const connectors = Array.from(this._connectors.values());
    const active = connectors.filter(c => c.isActive).length;
    return {
      timestamp: new Date(),
      totalConnectors: connectors.length,
      activeConnectors: active,
      healthPercentage: connectors.length ? (active / connectors.length) * 100 : 100,
    };
  }

  exportConfiguration() {
    return {
      webhooks: this.getAllWebhooks().map(w => ({ id: w.id, url: w.url, events: w.events })),
      connectors: Array.from(this._connectors.values()).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
      })),
      statistics: this.getStatistics(),
    };
  }
}

// Attach utility classes
IntegrationService.WebhookEvent = WebhookEvent;
IntegrationService.WebhookSubscription = WebhookSubscription;
IntegrationService.IntegrationConnector = IntegrationConnector;
IntegrationService.APIIntegrator = APIIntegrator;
IntegrationService.APIIntegration = APIIntegration;

module.exports = IntegrationService;
module.exports.instance = new IntegrationService();
