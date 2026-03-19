/**
 * WebhookEvent Class
 * Represents a webhook event that can be sent to subscribers
 */
class WebhookEvent {
  constructor(eventType, data = {}) {
    this.id = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.event = eventType;
    this.data = data;
    this.status = 'pending';
    this.retries = 0;
    this.signature = null;
    this.timestamp = new Date().toISOString();
  }

  generateSignature(secret) {
    const crypto = require('crypto');
    const payload = JSON.stringify({
      id: this.id,
      event: this.event,
      data: this.data,
      timestamp: this.timestamp,
    });
    this.signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
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

/**
 * WebhookSubscription Class
 * Represents a webhook subscription to specific events
 */
class WebhookSubscription {
  constructor(url, events = []) {
    this.id = `hook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.url = url;
    this.events = events;
    this.isActive = true;
    this.secret = `secret_${Math.random().toString(36).substring(2)}`;
    this.deliveryCount = 0;
    this.failureCount = 0;
    this.retryPolicy = {
      maxRetries: 3,
      initialDelay: 5000, // 5 seconds
      maxDelay: 3600000, // 1 hour
      backoffMultiplier: 2,
    };
    this.createdAt = new Date().toISOString();
  }

  matches(eventType) {
    // Check for exact match or wildcard
    if (this.events.includes('*') || this.events.includes(eventType)) {
      return true;
    }
    
    // Check for wildcard patterns like 'order.*'
    for (const event of this.events) {
      if (event.endsWith('.*')) {
        const prefix = event.slice(0, -2); // Remove the '.*'
        if (eventType.startsWith(prefix + '.')) {
          return true;
        }
      }
    }
    
    return false;
  }

  incrementDelivery(success = true) {
    if (success) {
      this.deliveryCount++;
    } else {
      this.failureCount++;
    }
  }

  getRetryDelay(attemptNumber) {
    const baseDelay = Math.min(
      this.retryPolicy.initialDelay *
        Math.pow(this.retryPolicy.backoffMultiplier, attemptNumber),
      this.retryPolicy.maxDelay
    );
    // Add 10-20% jitter to avoid thundering herd
    const jitter = baseDelay * (0.1 + Math.random() * 0.1);
    return Math.floor(baseDelay + jitter);
  }
}

/**
 * IntegrationConnector Class
 * Represents a connection to external services
 */
class IntegrationConnector {
  constructor(name, type, config = {}) {
    this.id = `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.name = name;
    this.type = type; // 'api', 'webhook', 'database', etc.
    this.config = config;
    this.isActive = true;
    this.lastSync = null;
    this.syncStatus = 'idle';
    this.errorLog = [];
    this.mappings = new Map(); // Field mappings with transformation functions
    this.filters = [];
    this.syncCount = 0;
    this.errorCount = 0;
    this.createdAt = new Date().toISOString();
  }

  activate() {
    this.isActive = true;
  }

  deactivate() {
    this.isActive = false;
  }

  logError(error) {
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
    });
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100); // Keep last 100 errors
    }
  }

  addFieldMapping(sourceField, targetField, transformFn = null) {
    this.mappings.set(sourceField, { target: targetField, transform: transformFn });
    return this;
  }

  addFilter(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }

  applyFilters(data) {
    // Check if all filters pass
    return this.filters.every(filter => {
      const dataValue = data[filter.field];
      switch (filter.operator) {
        case '==':
        case '=':
          return dataValue === filter.value;
        case '>':
          return dataValue > filter.value;
        case '<':
          return dataValue < filter.value;
        case '<=':
          return dataValue <= filter.value;
        case '>=':
          return dataValue >= filter.value;
        default:
          return true;
      }
    });
  }

  recordSync(success) {
    this.lastSync = new Date().toISOString();
    if (success) {
      this.syncCount++;
    } else {
      this.errorCount++;
    }
  }

  getFieldMapping(sourceField) {
    return this.mappings.get(sourceField);
  }

  getAllFieldMappings() {
    const result = {};
    for (const [source, mapping] of this.mappings) {
      result[source] = mapping.target;
    }
    return result;
  }

  getSyncStats() {
    return {
      syncCount: this.syncCount,
      errorCount: this.errorCount,
      successRate: this.syncCount / (this.syncCount + this.errorCount) || 0,
      lastSync: this.lastSync,
    };
  }

  applyMappings(sourceData) {
    const mapped = {};
    for (const [sourceField, mapping] of this.mappings) {
      if (sourceField in sourceData) {
        let value = sourceData[sourceField];
        // Apply transformation function if exists
        if (mapping.transform && typeof mapping.transform === 'function') {
          value = mapping.transform(value);
        }
        mapped[mapping.target] = value;
      }
    }
    return mapped;
  }
}

/**
 * APIIntegrator Class
 * Handles API integrations
 */
class APIIntegrator {
  constructor(nameOrBaseURL, baseURLOrHeaders = {}, config = {}) {
    // Support both old and new constructor signatures
    if (typeof nameOrBaseURL === 'string') {
      // Check if first argument is a URL (contains http)
      if (nameOrBaseURL.startsWith('http')) {
        // Old signature: (baseURL, headers)
        this.baseURL = nameOrBaseURL;
        this.headers = baseURLOrHeaders || {};
        this.name = 'API';
        this.config = { timeout: 30000, ...config };
      } else {
        // New signature: (name, baseURL, config)
        this.name = nameOrBaseURL;
        this.baseURL = baseURLOrHeaders;
        this.headers = {};
        this.config = {
          timeout: 30000,
          ...config,
        };
      }
    }

    this.retryAttempts = 3;
    this.endpoints = new Map();
    this.callCount = 0;
    this.lastCall = null;
    this.createdAt = new Date().toISOString();
  }

  registerEndpoint(name, method, path) {
    const endpoint = {
      name,
      method,
      path,
      url: `${this.baseURL}${path}`,
    };
    this.endpoints.set(name, endpoint);
    return endpoint;
  }

  call(endpointName, params = {}) {
    // Synchronous validation - throw immediately if endpoint not found
    const endpoint = this.endpoints.get(endpointName);
    if (!endpoint) {
      throw new Error(`Endpoint '${endpointName}' not registered`);
    }

    // Async execution after validation
    return this._executeCall(endpointName, params);
  }

  async _executeCall(endpointName, params = {}) {
    const endpoint = this.endpoints.get(endpointName);

    // Replace path parameters
    let url = endpoint.url;
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, value);
    }

    this.callCount++;
    this.lastCall = new Date().toISOString();

    return await this.makeRequest(endpoint.method, url, params, endpointName);
  }

  async makeRequest(method, url, data = null, endpointName = null) {
    // Simulated API request
    let resultEndpoint = endpointName || url.split('/').pop();
    return {
      success: true,
      status: 200,
      endpoint: resultEndpoint,
      data: data || {},
      timestamp: new Date().toISOString(),
    };
  }

  getSummary() {
    return {
      name: this.name,
      baseURL: this.baseURL,
      endpoints: this.endpoints.size,
      callCount: this.callCount,
      lastCall: this.lastCall,
    };
  }
}

// External Integrations Service
// نظام التكاملات الخارجية

class IntegrationService {
  constructor() {
    this.webhooks = [];
    this.apis = [];
    this.connectors = [];
    this.eventListeners = new Map(); // For event-driven architecture
    this.eventHistory = [];
    this.transformations = new Map();
  }

  // Webhook Management
  registerWebhook(url, events = []) {
    const webhook = new WebhookSubscription(url, events);
    this.webhooks.push(webhook);
    return webhook;
  }

  getWebhook(id) {
    return this.webhooks.find(w => w.id === id);
  }

  getAllWebhooks() {
    return this.webhooks;
  }

  updateWebhook(id, updates) {
    const webhook = this.getWebhook(id);
    if (!webhook) return undefined;
    if (updates.events) webhook.events = updates.events;
    if (updates.url) webhook.url = updates.url;
    if (updates.isActive !== undefined) webhook.isActive = updates.isActive;
    return webhook;
  }

  deleteWebhook(id) {
    const index = this.webhooks.findIndex(w => w.id === id);
    if (index !== -1) {
      this.webhooks.splice(index, 1);
    }
  }

  // API Management
  registerAPI(name, baseURL, config = {}) {
    const api = new APIIntegrator(name, baseURL, config);
    this.apis.push(api);
    return api;
  }

  getAllIntegrations() {
    return this.apis;
  }

  // Connector Management
  createConnector(name, type, config = {}) {
    const connector = new IntegrationConnector(name, type, config);
    this.connectors.push(connector);
    return connector;
  }

  // Get connector by name
  getConnector(name) {
    const connector = this.connectors.find(c => c.name === name);
    if (!connector) {
      throw new Error(`Connector '${name}' not found`);
    }
    return connector;
  }

  // Get all webhooks
  getWebhooks() {
    return this.webhooks;
  }

  // Get all APIs
  getAPIs() {
    return this.apis;
  }

  // Get all connectors
  getConnectors() {
    return this.connectors;
  }

  // Event Transformation/Data Transformation
  registerTransformation(name, transformFn) {
    this.transformations.set(name, transformFn);
    return this;
  }

  applyTransformation(name, data) {
    const transform = this.transformations.get(name);
    if (!transform) {
      throw new Error(`Transformation '${name}' not found`);
    }
    return transform(data);
  }

  // Validate Webhook Signature
  validateWebhookSignature(signature, payload, secret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  // Integration Health Status
  getIntegrationHealth() {
    const health = {
      webhooks: {
        total: this.webhooks.length,
        active: this.webhooks.filter(w => w.isActive).length,
        failed: this.webhooks.filter(w => w.failureCount > 0).length,
      },
      apis: {
        total: this.apis.length,
        endpoints: this.apis.reduce((sum, api) => sum + (api.endpoints?.size || api.endpoints?.length || 0), 0),
        totalCalls: this.apis.reduce((sum, api) => sum + (api.callCount || 0), 0),
      },
      connectors: {
        total: this.connectors.length,
        active: this.connectors.filter(c => c.isActive).length,
        syncCount: this.connectors.reduce((sum, c) => sum + (c.syncCount || 0), 0),
        errorCount: this.connectors.reduce((sum, c) => sum + (c.errorCount || 0), 0),
      },
      totalConnectors: this.connectors.length,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    // Calculate health percentage
    const totalItems = health.connectors.total + health.webhooks.total + health.apis.total;
    const totalErrors = health.connectors.errorCount + health.webhooks.failed;
    health.healthPercentage = totalItems > 0 ? ((totalItems - totalErrors) / totalItems * 100) : 100;

    // Determine overall status
    if (health.connectors.errorCount > 0 || health.webhooks.failed > 0) {
      health.status = 'degraded';
    }
    if (health.webhooks.failed > health.webhooks.active) {
      health.status = 'unhealthy';
    }

    return health;
  }

  // Get Statistics
  getStatistics() {
    const successfulSyncs = this.connectors.reduce((sum, c) => sum + (c.syncCount || 0), 0);
    const failedSyncs = this.connectors.reduce((sum, c) => sum + (c.errorCount || 0), 0);
    const totalSyncs = successfulSyncs + failedSyncs;
    
    return {
      webhooks: this.webhooks.length,
      apis: this.apis.length,
      connectors: this.connectors.length,
      totalEndpoints: this.apis.reduce((sum, api) => sum + (api.endpoints?.size || 0), 0),
      totalEvents: this.eventHistory.length,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) : 0,
      syncCount: successfulSyncs,
      errorCount: failedSyncs,
    };
  }

  /**
   * Register event listener
   */
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
    return this;
  }

  /**
   * Emit event to registered webhooks and listeners
   */
  emitEvent(eventType, data) {
    // Create webhook event
    const webhookEvent = new WebhookEvent(eventType, data);
    
    // Store in event history
    this.eventHistory.push(webhookEvent);
    
    // Call registered webhooks
    const matchingWebhooks = this.webhooks.filter(w => w.matches(eventType));
    matchingWebhooks.forEach(webhook => {
      try {
        // Simulate webhook delivery
        webhook.incrementDelivery(true);
      } catch (error) {
        webhook.incrementDelivery(false);
        this.logError(`Webhook delivery failed: ${error.message}`);
      }
    });
    
    // Call registered event listeners
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(callback => {
      try {
        callback(webhookEvent);
      } catch (error) {
        this.logError(`Event listener error: ${error.message}`);
      }
    });
    
    return webhookEvent;
  }

  /**
   * Get event history
   */
  getEventHistory(limit = 100) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Export service configuration
   */
  exportConfiguration() {
    return {
      webhooks: this.webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
      })),
      apis: this.apis.map(api => ({
        name: api.name,
        baseURL: api.baseURL,
        endpoints: Array.from(api.endpoints.keys()),
        callCount: api.callCount,
      })),
      connectors: this.connectors.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isActive: c.isActive,
        mappings: c.getAllFieldMappings(),
        syncStats: c.getSyncStats(),
      })),
      eventListeners: Array.from(this.eventListeners.keys()),
      statistics: this.getStatistics(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Log errors
   */
  logError(message) {
    console.error(`[IntegrationService] ${message}`);
  }

  // Integrate with Payment Gateway
  static integratePaymentGateway(data) {
    // Simulate payment processing
    const transactionId = `TXN_${Date.now()}`;

    return {
      success: true,
      transaction: {
        id: transactionId,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: 'completed',
        gateway: 'stripe', // or paypal, square, etc.
        method: data.method || 'card',
        timestamp: new Date().toISOString(),
        reference: `REF_${Math.random().toString(36).substring(7)}`,
      },
      message: 'Payment processed successfully',
    };
  }

  // Integrate with Email Service
  static sendEmailIntegration(data) {
    return {
      success: true,
      email: {
        id: `EMAIL_${Date.now()}`,
        to: data.to,
        subject: data.subject,
        template: data.template || 'default',
        status: 'sent',
        provider: 'sendgrid', // or mailgun, aws-ses, etc.
        timestamp: new Date().toISOString(),
        messageId: `msg_${Math.random().toString(36).substring(7)}`,
      },
      message: 'Email sent successfully',
    };
  }

  // Integrate with SMS Service
  static sendSMSIntegration(data) {
    return {
      success: true,
      sms: {
        id: `SMS_${Date.now()}`,
        to: data.to,
        message: data.message,
        status: 'delivered',
        provider: 'twilio', // or nexmo, sns, etc.
        timestamp: new Date().toISOString(),
        deliveryReport: true,
      },
      message: 'SMS sent successfully',
    };
  }

  // Integrate with Cloud Storage
  static uploadToCloudStorage(data) {
    return {
      success: true,
      file: {
        id: `FILE_${Date.now()}`,
        filename: data.filename,
        size: data.size,
        provider: 'aws-s3', // or google-cloud, azure, etc.
        bucket: 'erp-files',
        path: `/uploads/${data.filename}`,
        url: `https://erp-files.s3.amazonaws.com/uploads/${data.filename}`,
        status: 'uploaded',
        timestamp: new Date().toISOString(),
        accessLevel: 'private',
      },
      message: 'File uploaded successfully',
    };
  }

  // Integrate with CRM System
  static syncWithCRM(data) {
    return {
      success: true,
      sync: {
        id: `SYNC_${Date.now()}`,
        system: 'salesforce', // or hubspot, pipedrive, etc.
        entityType: data.entityType, // contact, lead, account, etc.
        recordCount: Math.floor(Math.random() * 50 + 10),
        status: 'completed',
        timestamp: new Date().toISOString(),
        details: {
          created: Math.floor(Math.random() * 20 + 5),
          updated: Math.floor(Math.random() * 30 + 10),
          failed: Math.floor(Math.random() * 2),
        },
      },
      message: 'CRM synchronization completed',
    };
  }

  // Integrate with Analytics Platform
  static trackAnalytics(data) {
    return {
      success: true,
      event: {
        id: `ANALYTICS_${Date.now()}`,
        eventName: data.eventName,
        userId: data.userId,
        platform: 'google-analytics', // or mixpanel, amplitude, etc.
        properties: data.properties || {},
        timestamp: new Date().toISOString(),
        status: 'tracked',
      },
      message: 'Event tracked successfully',
    };
  }

  // Get Integration Status
  static getIntegrationStatus() {
    return {
      success: true,
      integrations: {
        payments: {
          provider: 'stripe',
          status: 'connected',
          lastSync: new Date(Date.now() - 10 * 60000).toISOString(),
          transactionsProcessed: 1250,
        },
        email: {
          provider: 'sendgrid',
          status: 'connected',
          lastSync: new Date(Date.now() - 5 * 60000).toISOString(),
          emailsSent: 5890,
        },
        sms: {
          provider: 'twilio',
          status: 'connected',
          lastSync: new Date(Date.now() - 15 * 60000).toISOString(),
          smsSent: 2340,
        },
        storage: {
          provider: 'aws-s3',
          status: 'connected',
          lastSync: new Date(Date.now() - 30 * 60000).toISOString(),
          filesStored: 5670,
        },
        crm: {
          provider: 'salesforce',
          status: 'connected',
          lastSync: new Date(Date.now() - 60 * 60000).toISOString(),
          recordsSynced: 15240,
        },
        analytics: {
          provider: 'google-analytics',
          status: 'connected',
          lastSync: new Date(Date.now() - 2 * 60000).toISOString(),
          eventsTracked: 45890,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Get Available Integrations
  static getAvailableIntegrations() {
    return {
      success: true,
      availableIntegrations: [
        { id: 'stripe', name: 'Stripe', category: 'payments', status: 'available' },
        { id: 'paypal', name: 'PayPal', category: 'payments', status: 'available' },
        { id: 'sendgrid', name: 'SendGrid', category: 'email', status: 'available' },
        { id: 'twilio', name: 'Twilio', category: 'sms', status: 'available' },
        { id: 'aws-s3', name: 'AWS S3', category: 'storage', status: 'available' },
        {
          id: 'google-cloud',
          name: 'Google Cloud Storage',
          category: 'storage',
          status: 'available',
        },
        { id: 'salesforce', name: 'Salesforce', category: 'crm', status: 'available' },
        { id: 'hubspot', name: 'HubSpot', category: 'crm', status: 'available' },
        {
          id: 'google-analytics',
          name: 'Google Analytics',
          category: 'analytics',
          status: 'available',
        },
        { id: 'mixpanel', name: 'Mixpanel', category: 'analytics', status: 'available' },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Webhook Handler
  static handleWebhook(data) {
    return {
      success: true,
      webhook: {
        id: `WEBHOOK_${Date.now()}`,
        source: data.source,
        event: data.event,
        payload: data.payload,
        status: 'received',
        timestamp: new Date().toISOString(),
      },
      message: 'Webhook processed successfully',
    };
  }

  // API Rate Limiting
  static checkRateLimit(apiKey) {
    return {
      success: true,
      rateLimit: {
        apiKey: apiKey,
        requestsUsed: Math.floor(Math.random() * 800 + 200),
        requestsLimit: 1000,
        remainingRequests: Math.floor(Math.random() * 800 + 200),
        resetTime: new Date(Date.now() + 60 * 60000).toISOString(),
        limitStatus: 'normal', // warning, critical
      },
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = IntegrationService;
module.exports.WebhookEvent = WebhookEvent;
module.exports.WebhookSubscription = WebhookSubscription;
module.exports.IntegrationConnector = IntegrationConnector;
module.exports.APIIntegrator = APIIntegrator;
// Alias for test compatibility
module.exports.APIIntegration = APIIntegrator;
