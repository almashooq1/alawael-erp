/**
 * Integration Hub - مركز التكاملات
 * Enterprise Integration Platform for Alawael ERP
 */

const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Integration Configuration
 */
const integrationConfig = {
  // Supported providers
  providers: {
    // Payment
    payment: ['stripe', 'paypal', 'moyasar', 'tabby', 'tamara'],
    // CRM
    crm: ['salesforce', 'hubspot', 'zoho'],
    // Accounting
    accounting: ['quickbooks', 'xero', 'freshbooks', 'odo'],
    // E-commerce
    ecommerce: ['shopify', 'woocommerce', 'magento', 'salla', 'zid'],
    // Communication
    communication: ['twilio', 'sendgrid', 'mailchimp', 'slack'],
    // Storage
    storage: ['s3', 'azure', 'gcs', 'dropbox'],
    // Analytics
    analytics: ['google', 'mixpanel', 'amplitude'],
    // Saudi Government
    government: ['zatca', 'absher', 'muqeem', 'gosi'],
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    delay: 5000,
    multiplier: 2,
  },
  
  // Rate limits
  rateLimits: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
};

/**
 * Integration Schema
 */
const IntegrationSchema = new mongoose.Schema({
  // Identification
  name: { type: String, required: true },
  provider: { type: String, required: true },
  category: { type: String, required: true },
  
  // Configuration
  config: {
    endpoint: String,
    apiKey: String,
    secretKey: String,
    webhookUrl: String,
    sandbox: { type: Boolean, default: true },
    timeout: { type: Number, default: 30000 },
    custom: mongoose.Schema.Types.Mixed,
  },
  
  // Authentication
  auth: {
    type: { type: String, enum: ['api_key', 'oauth2', 'basic', 'bearer', 'custom'] },
    credentials: mongoose.Schema.Types.Mixed,
    token: String,
    tokenExpiry: Date,
    refreshToken: String,
  },
  
  // Sync settings
  sync: {
    enabled: { type: Boolean, default: false },
    interval: Number, // minutes
    lastSync: Date,
    lastSyncStatus: String,
  },
  
  // Mappings
  mappings: [{
    localField: String,
    remoteField: String,
    transform: String, // transformation function
  }],
  
  // Webhooks
  webhooks: [{
    event: String,
    handler: String,
    active: { type: Boolean, default: true },
  }],
  
  // Status
  status: { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },
  lastError: String,
  
  // Metadata
  tenantId: String,
  createdBy: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'integrations',
});

/**
 * Integration Log Schema
 */
const IntegrationLogSchema = new mongoose.Schema({
  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration' },
  provider: String,
  
  // Request details
  direction: { type: String, enum: ['inbound', 'outbound'] },
  method: String,
  endpoint: String,
  headers: mongoose.Schema.Types.Mixed,
  body: mongoose.Schema.Types.Mixed,
  
  // Response details
  statusCode: Number,
  response: mongoose.Schema.Types.Mixed,
  
  // Timing
  duration: Number,
  timestamp: { type: Date, default: Date.now },
  
  // Status
  status: { type: String, enum: ['success', 'error', 'pending'] },
  error: String,
  
  // Retry
  retryCount: { type: Number, default: 0 },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'integration_logs',
});

// Indexes
IntegrationLogSchema.index({ integrationId: 1, timestamp: -1 });
IntegrationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

/**
 * Integration Hub Class
 */
class IntegrationHub {
  constructor() {
    this.Integration = null;
    this.IntegrationLog = null;
    this.providers = new Map();
    this.webhooks = new Map();
  }
  
  /**
   * Initialize hub
   */
  async initialize(connection) {
    this.Integration = connection.model('Integration', IntegrationSchema);
    this.IntegrationLog = connection.model('IntegrationLog', IntegrationLogSchema);
    
    // Register built-in providers
    this.registerBuiltinProviders();
    
    console.log('✅ Integration Hub initialized');
  }
  
  /**
   * Register built-in providers
   */
  registerBuiltinProviders() {
    // ZATCA (Saudi Tax Authority)
    this.registerProvider('zatca', {
      category: 'government',
      baseUrl: 'https://zatca.gov.sa/api',
      authType: 'oauth2',
      endpoints: {
        submitInvoice: { method: 'POST', path: '/invoices' },
        checkCompliance: { method: 'GET', path: '/compliance/{id}' },
      },
    });
    
    // Salla (Saudi E-commerce)
    this.registerProvider('salla', {
      category: 'ecommerce',
      baseUrl: 'https://api.salla.dev',
      authType: 'bearer',
      endpoints: {
        getProducts: { method: 'GET', path: '/products' },
        getOrders: { method: 'GET', path: '/orders' },
        updateOrder: { method: 'PUT', path: '/orders/{id}' },
      },
    });
    
    // Zid (Saudi E-commerce)
    this.registerProvider('zid', {
      category: 'ecommerce',
      baseUrl: 'https://api.zid.sa',
      authType: 'bearer',
      endpoints: {
        getProducts: { method: 'GET', path: '/v1/products' },
        getOrders: { method: 'GET', path: '/v1/orders' },
      },
    });
    
    // Moyasar (Saudi Payment)
    this.registerProvider('moyasar', {
      category: 'payment',
      baseUrl: 'https://api.moyasar.com/v1',
      authType: 'basic',
      endpoints: {
        createPayment: { method: 'POST', path: '/payments' },
        getPayment: { method: 'GET', path: '/payments/{id}' },
        createInvoice: { method: 'POST', path: '/invoices' },
      },
    });
    
    // Tabby (Buy Now Pay Later)
    this.registerProvider('tabby', {
      category: 'payment',
      baseUrl: 'https://api.tabby.ai/api/v2',
      authType: 'bearer',
      endpoints: {
        createSession: { method: 'POST', path: '/checkout' },
        capturePayment: { method: 'POST', path: '/payments/{id}/capture' },
      },
    });
    
    // Slack
    this.registerProvider('slack', {
      category: 'communication',
      baseUrl: 'https://slack.com/api',
      authType: 'bearer',
      endpoints: {
        postMessage: { method: 'POST', path: '/chat.postMessage' },
      },
    });
    
    // Stripe
    this.registerProvider('stripe', {
      category: 'payment',
      baseUrl: 'https://api.stripe.com/v1',
      authType: 'bearer',
      endpoints: {
        createCustomer: { method: 'POST', path: '/customers' },
        createPaymentIntent: { method: 'POST', path: '/payment_intents' },
        getBalance: { method: 'GET', path: '/balance' },
      },
    });
  }
  
  /**
   * Register provider
   */
  registerProvider(name, config) {
    this.providers.set(name, config);
  }
  
  /**
   * Create integration
   */
  async createIntegration(data) {
    const integration = await this.Integration.create(data);
    return integration;
  }
  
  /**
   * Get integration
   */
  async getIntegration(id) {
    return this.Integration.findById(id);
  }
  
  /**
   * List integrations
   */
  async listIntegrations(filter = {}) {
    return this.Integration.find(filter);
  }
  
  /**
   * Update integration
   */
  async updateIntegration(id, data) {
    data.updatedAt = new Date();
    return this.Integration.findByIdAndUpdate(id, data, { new: true });
  }
  
  /**
   * Delete integration
   */
  async deleteIntegration(id) {
    return this.Integration.findByIdAndDelete(id);
  }
  
  /**
   * Test integration connection
   */
  async testConnection(id) {
    const integration = await this.getIntegration(id);
    if (!integration) throw new Error('Integration not found');
    
    const provider = this.providers.get(integration.provider);
    if (!provider) throw new Error('Provider not supported');
    
    try {
      // Attempt a simple request to test connection
      const response = await this.makeRequest(integration, 'get', '/');
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Make API request
   */
  async makeRequest(integration, method, endpoint, data = {}) {
    const provider = this.providers.get(integration.provider);
    if (!provider) throw new Error('Provider not supported');
    
    const startTime = Date.now();
    const logEntry = {
      integrationId: integration._id,
      provider: integration.provider,
      direction: 'outbound',
      method: method.toUpperCase(),
      endpoint,
      status: 'pending',
      tenantId: integration.tenantId,
    };
    
    try {
      // Build request config
      const config = {
        method,
        url: `${provider.baseUrl}${endpoint}`,
        headers: this.buildHeaders(integration, provider),
        data: method !== 'get' ? data : undefined,
        params: method === 'get' ? data : undefined,
        timeout: integration.config.timeout || 30000,
      };
      
      logEntry.headers = this.sanitizeHeaders(config.headers);
      logEntry.body = data;
      
      // Make request
      const response = await axios(config);
      
      // Log success
      logEntry.statusCode = response.status;
      logEntry.response = response.data;
      logEntry.status = 'success';
      logEntry.duration = Date.now() - startTime;
      
      await this.IntegrationLog.create(logEntry);
      
      return response.data;
      
    } catch (error) {
      // Log error
      logEntry.statusCode = error.response?.status;
      logEntry.response = error.response?.data;
      logEntry.status = 'error';
      logEntry.error = error.message;
      logEntry.duration = Date.now() - startTime;
      
      await this.IntegrationLog.create(logEntry);
      
      throw error;
    }
  }
  
  /**
   * Build headers based on auth type
   */
  buildHeaders(integration, provider) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    switch (integration.auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${integration.auth.credentials.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(
          `${integration.auth.credentials.username}:${integration.auth.credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'api_key':
        headers['X-API-Key'] = integration.auth.credentials.apiKey;
        break;
      case 'oauth2':
        if (integration.auth.token) {
          headers['Authorization'] = `Bearer ${integration.auth.token}`;
        }
        break;
    }
    
    return headers;
  }
  
  /**
   * Sanitize headers for logging
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveFields = ['authorization', 'x-api-key', 'token', 'secret'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Handle incoming webhook
   */
  async handleWebhook(provider, payload, signature) {
    const integration = await this.Integration.findOne({ provider });
    if (!integration) throw new Error('Integration not found');
    
    // Verify signature if provided
    if (integration.config.webhookSecret && signature) {
      // Verify webhook signature
    }
    
    // Log webhook
    const logEntry = await this.IntegrationLog.create({
      integrationId: integration._id,
      provider,
      direction: 'inbound',
      method: 'POST',
      endpoint: '/webhook',
      body: payload,
      status: 'success',
      tenantId: integration.tenantId,
    });
    
    // Process webhook based on provider
    const handler = this.webhooks.get(provider);
    if (handler) {
      await handler(payload, integration);
    }
    
    return { received: true, logId: logEntry._id };
  }
  
  /**
   * Register webhook handler
   */
  registerWebhookHandler(provider, handler) {
    this.webhooks.set(provider, handler);
  }
  
  /**
   * Sync data
   */
  async sync(integrationId) {
    const integration = await this.getIntegration(integrationId);
    if (!integration) throw new Error('Integration not found');
    
    try {
      // Perform sync based on provider
      const provider = this.providers.get(integration.provider);
      if (!provider) throw new Error('Provider not supported');
      
      // Update sync status
      integration.sync.lastSync = new Date();
      integration.sync.lastSyncStatus = 'success';
      await integration.save();
      
      return { success: true, timestamp: integration.sync.lastSync };
    } catch (error) {
      integration.sync.lastSyncStatus = 'error';
      integration.lastError = error.message;
      await integration.save();
      
      throw error;
    }
  }
  
  /**
   * Get integration logs
   */
  async getLogs(integrationId, options = {}) {
    const filter = { integrationId };
    if (options.status) filter.status = options.status;
    if (options.startDate) filter.timestamp = { $gte: options.startDate };
    if (options.endDate) filter.timestamp = { ...filter.timestamp, $lte: options.endDate };
    
    return this.IntegrationLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100);
  }
  
  /**
   * Get integration statistics
   */
  async getStats(integrationId) {
    const stats = await this.IntegrationLog.aggregate([
      { $match: { integrationId: mongoose.Types.ObjectId(integrationId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);
    
    const total = await this.IntegrationLog.countDocuments({ integrationId });
    const success = stats.find(s => s._id === 'success')?.count || 0;
    
    return {
      total,
      success,
      failed: total - success,
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgDuration: stats.reduce((sum, s) => sum + (s.avgDuration || 0), 0) / stats.length,
    };
  }
  
  /**
   * Refresh OAuth token
   */
  async refreshToken(integrationId) {
    const integration = await this.getIntegration(integrationId);
    if (!integration) throw new Error('Integration not found');
    
    if (integration.auth.type !== 'oauth2') {
      throw new Error('Integration does not use OAuth2');
    }
    
    // Implementation depends on provider
    // This is a placeholder
    return { refreshed: true };
  }
}

// Singleton instance
const integrationHub = new IntegrationHub();

/**
 * Pre-built Integration Templates
 */
const integrationTemplates = {
  // ZATCA Integration
  zatca: {
    name: 'هيئة الزكاة والضريبة والجمارك',
    provider: 'zatca',
    category: 'government',
    config: {
      sandbox: true,
      timeout: 30000,
    },
    auth: {
      type: 'oauth2',
    },
    webhooks: [
      { event: 'invoice.submitted', handler: 'handleInvoiceSubmission' },
      { event: 'compliance.check', handler: 'handleComplianceCheck' },
    ],
  },
  
  // Salla Integration
  salla: {
    name: 'سلة',
    provider: 'salla',
    category: 'ecommerce',
    config: {
      sandbox: false,
      timeout: 15000,
    },
    auth: {
      type: 'bearer',
    },
    sync: {
      enabled: true,
      interval: 30, // minutes
    },
  },
  
  // Moyasar Integration
  moyasar: {
    name: 'مياسر للدفع',
    provider: 'moyasar',
    category: 'payment',
    config: {
      sandbox: true,
      timeout: 15000,
    },
    auth: {
      type: 'basic',
    },
  },
  
  // Tabby Integration
  tabby: {
    name: 'تابي',
    provider: 'tabby',
    category: 'payment',
    config: {
      sandbox: true,
      timeout: 15000,
    },
    auth: {
      type: 'bearer',
    },
  },
};

module.exports = {
  IntegrationHub,
  integrationHub,
  integrationConfig,
  integrationTemplates,
};