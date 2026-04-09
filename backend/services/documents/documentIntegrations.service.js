/**
 * Document Integrations Service — خدمة التكاملات الخارجية
 * ──────────────────────────────────────────────────────────────
 * تكامل مع أنظمة خارجية: بريد إلكتروني، ويب هوك،
 * موصلات API، إشعارات خارجية، تصدير/استيراد
 *
 * @module documentIntegrations.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const EventEmitter = require('events');

/* ─── Integration Model ──────────────────────────────────────── */
const integrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    type: {
      type: String,
      enum: ['webhook', 'email', 'api_connector', 'ftp', 'cloud_storage', 'erp', 'custom'],
      required: true,
    },
    provider: {
      type: String,
      enum: [
        'generic',
        'slack',
        'teams',
        'gmail',
        'outlook',
        'drive',
        'dropbox',
        'onedrive',
        'sharepoint',
        'custom',
      ],
      default: 'generic',
    },
    config: {
      url: String,
      method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'POST' },
      headers: mongoose.Schema.Types.Mixed,
      authType: {
        type: String,
        enum: ['none', 'basic', 'bearer', 'api_key', 'oauth2'],
        default: 'none',
      },
      authConfig: mongoose.Schema.Types.Mixed, // Encrypted
      retryCount: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 1000 },
      timeout: { type: Number, default: 30000 },
      contentType: { type: String, default: 'application/json' },
      // Email specific
      smtpHost: String,
      smtpPort: Number,
      smtpUser: String,
      // FTP specific
      ftpHost: String,
      ftpPort: Number,
      ftpPath: String,
    },
    triggers: [
      {
        event: {
          type: String,
          enum: [
            'document.created',
            'document.updated',
            'document.deleted',
            'document.approved',
            'document.rejected',
            'document.shared',
            'document.signed',
            'document.expired',
            'document.commented',
            'workflow.started',
            'workflow.completed',
            'workflow.escalated',
            'tag.added',
            'tag.removed',
            'acl.changed',
          ],
        },
        filters: {
          documentTypes: [String],
          departments: [String],
          priorities: [String],
          tags: [String],
        },
        enabled: { type: Boolean, default: true },
        template: String, // Payload template
      },
    ],
    status: { type: String, enum: ['active', 'inactive', 'error', 'testing'], default: 'inactive' },
    lastRun: Date,
    lastError: String,
    stats: {
      totalRuns: { type: Number, default: 0 },
      successRuns: { type: Number, default: 0 },
      failedRuns: { type: Number, default: 0 },
      avgResponse: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    secret: String,
  },
  { timestamps: true, collection: 'document_integrations' }
);

integrationSchema.index({ type: 1, status: 1 });
integrationSchema.index({ 'triggers.event': 1 });

const Integration =
  mongoose.models.DocumentIntegration || mongoose.model('DocumentIntegration', integrationSchema);

/* ─── Integration Log Model ──────────────────────────────────── */
const integrationLogSchema = new mongoose.Schema(
  {
    integrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentIntegration',
      index: true,
    },
    event: String,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    status: {
      type: String,
      enum: ['success', 'failed', 'retrying', 'timeout'],
      default: 'success',
    },
    request: {
      url: String,
      method: String,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
    },
    response: {
      statusCode: Number,
      body: mongoose.Schema.Types.Mixed,
      headers: mongoose.Schema.Types.Mixed,
    },
    error: String,
    responseTime: Number,
    retryAttempt: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'document_integration_logs' }
);

integrationLogSchema.index({ integrationId: 1, createdAt: -1 });

const IntegrationLog =
  mongoose.models.DocumentIntegrationLog ||
  mongoose.model('DocumentIntegrationLog', integrationLogSchema);

/* ─── Provider Templates ─────────────────────────────────────── */
const PROVIDER_TEMPLATES = {
  slack: {
    nameAr: 'Slack',
    icon: '💬',
    configTemplate: {
      url: '',
      method: 'POST',
      authType: 'bearer',
      contentType: 'application/json',
    },
    payloadTemplate: data => ({
      text: `📄 ${data.event}: ${data.document?.title || 'مستند'}`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${data.event}*\n${data.document?.title || ''}` },
        },
      ],
    }),
  },
  teams: {
    nameAr: 'Microsoft Teams',
    icon: '👥',
    configTemplate: { url: '', method: 'POST', authType: 'none', contentType: 'application/json' },
    payloadTemplate: data => ({
      '@type': 'MessageCard',
      summary: `${data.event}: ${data.document?.title || 'مستند'}`,
      themeColor: '0076D7',
      title: `📄 ${data.event}`,
      sections: [{ activityTitle: data.document?.title || 'مستند' }],
    }),
  },
  gmail: {
    nameAr: 'Gmail',
    icon: '📧',
    configTemplate: { smtpHost: 'smtp.gmail.com', smtpPort: 587, authType: 'basic' },
  },
  outlook: {
    nameAr: 'Outlook',
    icon: '📨',
    configTemplate: { smtpHost: 'smtp.office365.com', smtpPort: 587, authType: 'oauth2' },
  },
  generic: {
    nameAr: 'عام',
    icon: '🔗',
    configTemplate: { url: '', method: 'POST', authType: 'none' },
  },
};

/* ─── Service ────────────────────────────────────────────────── */
class DocumentIntegrationsService extends EventEmitter {
  constructor() {
    super();
    this.encryptionKey = process.env.INTEGRATION_SECRET || 'integration-default-key-32chars!!';
  }

  /* ── Encrypt sensitive data ───────────────────────────────── */
  _encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  _decrypt(encrypted) {
    if (!encrypted || !encrypted.includes(':')) return encrypted;
    try {
      const [ivHex, data] = encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /* ── Create Integration ───────────────────────────────────── */
  async create(data) {
    const { name, nameAr, type, provider, config, triggers, userId } = data;

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    // Encrypt auth config
    const safeConfig = { ...config };
    if (safeConfig.authConfig) {
      safeConfig.authConfig = this._encrypt(safeConfig.authConfig);
    }

    const integration = new Integration({
      name,
      nameAr: nameAr || name,
      type,
      provider: provider || 'generic',
      config: safeConfig,
      triggers: triggers || [],
      status: 'inactive',
      createdBy: userId,
      secret,
    });

    await integration.save();
    this.emit('integrationCreated', { integrationId: integration._id, type });

    return { success: true, integration, webhookSecret: secret };
  }

  /* ── Update Integration ───────────────────────────────────── */
  async update(integrationId, updates) {
    if (updates.config?.authConfig) {
      updates.config.authConfig = this._encrypt(updates.config.authConfig);
    }

    const integration = await Integration.findByIdAndUpdate(
      integrationId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!integration) return { success: false, error: 'التكامل غير موجود' };
    return { success: true, integration };
  }

  /* ── Delete Integration ───────────────────────────────────── */
  async delete(integrationId) {
    const integration = await Integration.findByIdAndDelete(integrationId);
    if (!integration) return { success: false, error: 'التكامل غير موجود' };
    await IntegrationLog.deleteMany({ integrationId });
    return { success: true };
  }

  /* ── Toggle Status ────────────────────────────────────────── */
  async toggleStatus(integrationId) {
    const integration = await Integration.findById(integrationId);
    if (!integration) return { success: false, error: 'التكامل غير موجود' };

    integration.status = integration.status === 'active' ? 'inactive' : 'active';
    await integration.save();
    return { success: true, integration };
  }

  /* ── Test Integration ─────────────────────────────────────── */
  async test(integrationId) {
    const integration = await Integration.findById(integrationId);
    if (!integration) return { success: false, error: 'التكامل غير موجود' };

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      document: { title: 'مستند تجريبي', id: 'test-123' },
      message: 'هذا اختبار للتكامل',
    };

    integration.status = 'testing';
    await integration.save();

    try {
      const result = await this._executeWebhook(integration, testPayload, 'test');
      integration.status = result.success ? 'active' : 'error';
      integration.lastRun = new Date();
      if (!result.success) integration.lastError = result.error;
      await integration.save();

      return { success: true, testResult: result };
    } catch (err) {
      integration.status = 'error';
      integration.lastError = err.message;
      await integration.save();
      return { success: false, error: err.message };
    }
  }

  /* ── Fire Event (trigger integrations) ────────────────────── */
  async fireEvent(eventName, eventData = {}) {
    const integrations = await Integration.find({
      status: 'active',
      'triggers.event': eventName,
      'triggers.enabled': true,
    }).lean();

    const results = [];
    for (const integration of integrations) {
      const matchingTrigger = integration.triggers.find(t => t.event === eventName && t.enabled);
      if (!matchingTrigger) continue;

      // Check filters
      if (!this._matchFilters(matchingTrigger.filters, eventData)) continue;

      try {
        const payload = this._buildPayload(
          integration,
          eventName,
          eventData,
          matchingTrigger.template
        );
        const result = await this._executeWebhook(integration, payload, eventName);
        results.push({ integrationId: integration._id, success: result.success });

        // Update stats
        await Integration.findByIdAndUpdate(integration._id, {
          lastRun: new Date(),
          $inc: {
            'stats.totalRuns': 1,
            [`stats.${result.success ? 'successRuns' : 'failedRuns'}`]: 1,
          },
        });
      } catch (err) {
        results.push({ integrationId: integration._id, success: false, error: err.message });
      }
    }

    return { success: true, triggered: results.length, results };
  }

  /* ── Execute Webhook ──────────────────────────────────────── */
  async _executeWebhook(integration, payload, event) {
    const { config } = integration;
    if (!config?.url) return { success: false, error: 'لم يتم تحديد URL' };

    const startTime = Date.now();
    const log = {
      integrationId: integration._id,
      event,
      request: { url: config.url, method: config.method || 'POST', body: payload },
    };

    try {
      // Build headers
      const headers = {
        'Content-Type': config.contentType || 'application/json',
        ...(config.headers || {}),
      };

      // Add auth
      if (config.authType === 'bearer') {
        const token = this._decrypt(config.authConfig)?.token || config.authConfig?.token;
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } else if (config.authType === 'api_key') {
        const apiKey = this._decrypt(config.authConfig)?.apiKey || config.authConfig?.apiKey;
        const headerName = config.authConfig?.headerName || 'X-API-Key';
        if (apiKey) headers[headerName] = apiKey;
      }

      // Add webhook signature
      const signature = crypto
        .createHmac('sha256', integration.secret || '')
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;

      // Simulate HTTP request (in production use fetch/axios)
      const response = await this._httpRequest(config.url, {
        method: config.method || 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: config.timeout || 30000,
      });

      const responseTime = Date.now() - startTime;
      log.status = response.ok ? 'success' : 'failed';
      log.response = { statusCode: response.status, body: response.body };
      log.responseTime = responseTime;

      await IntegrationLog.create(log);

      return { success: response.ok, statusCode: response.status, responseTime };
    } catch (err) {
      log.status = 'failed';
      log.error = err.message;
      log.responseTime = Date.now() - startTime;
      await IntegrationLog.create(log);

      return { success: false, error: err.message };
    }
  }

  async _httpRequest(url, options) {
    // Use built-in fetch if available, otherwise simulate
    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
      try {
        const res = await fetch(url, {
          method: options.method,
          headers: options.headers,
          body: options.body,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        let body;
        try {
          body = await res.json();
        } catch {
          body = await res.text();
        }
        return { ok: res.ok, status: res.status, body };
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }
    // Fallback: use http/https modules
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const lib = require(isHttps ? 'https' : 'http');
      const urlObj = new URL(url);
      const req = lib.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: options.method,
          headers: options.headers,
          timeout: options.timeout,
        },
        res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            let body;
            try {
              body = JSON.parse(data);
            } catch {
              body = data;
            }
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              body,
            });
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  /* ── Build Payload ────────────────────────────────────────── */
  _buildPayload(integration, event, data, template) {
    const providerTemplate = PROVIDER_TEMPLATES[integration.provider];
    if (providerTemplate?.payloadTemplate) {
      return providerTemplate.payloadTemplate({ event, ...data });
    }

    return {
      event,
      timestamp: new Date().toISOString(),
      integration: { id: integration._id, name: integration.name },
      document: data.document || {},
      user: data.user || {},
      metadata: data.metadata || {},
    };
  }

  /* ── Match Filters ────────────────────────────────────────── */
  _matchFilters(filters, data) {
    if (!filters) return true;
    if (filters.documentTypes?.length && !filters.documentTypes.includes(data.document?.type))
      return false;
    if (filters.departments?.length && !filters.departments.includes(data.document?.department))
      return false;
    if (filters.priorities?.length && !filters.priorities.includes(data.document?.priority))
      return false;
    return true;
  }

  /* ── Get Integrations ─────────────────────────────────────── */
  async getAll(options = {}) {
    const { type, status, provider, page = 1, limit = 20 } = options;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (provider) filter.provider = provider;

    const [integrations, total] = await Promise.all([
      Integration.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name')
        .lean(),
      Integration.countDocuments(filter),
    ]);

    // Mask sensitive config
    const masked = integrations.map(i => ({
      ...i,
      config: { ...i.config, authConfig: i.config?.authConfig ? '***' : undefined },
      secret: undefined,
    }));

    return { success: true, integrations: masked, total, page, limit };
  }

  /* ── Get Integration by ID ────────────────────────────────── */
  async getById(integrationId) {
    const integration = await Integration.findById(integrationId)
      .populate('createdBy', 'name')
      .lean();
    if (!integration) return { success: false, error: 'التكامل غير موجود' };

    integration.config.authConfig = integration.config?.authConfig ? '***' : undefined;
    integration.secret = undefined;

    return { success: true, integration };
  }

  /* ── Get Logs ─────────────────────────────────────────────── */
  async getLogs(integrationId, options = {}) {
    const { status, event, page = 1, limit = 50 } = options;
    const filter = { integrationId };
    if (status) filter.status = status;
    if (event) filter.event = event;

    const [logs, total] = await Promise.all([
      IntegrationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IntegrationLog.countDocuments(filter),
    ]);

    return { success: true, logs, total, page, limit };
  }

  /* ── Get Providers ────────────────────────────────────────── */
  getProviders() {
    return Object.entries(PROVIDER_TEMPLATES).map(([key, val]) => ({
      key,
      nameAr: val.nameAr,
      icon: val.icon,
      configTemplate: val.configTemplate,
    }));
  }

  /* ── Get Event Types ──────────────────────────────────────── */
  getEventTypes() {
    return [
      { key: 'document.created', labelAr: 'إنشاء مستند', group: 'document' },
      { key: 'document.updated', labelAr: 'تحديث مستند', group: 'document' },
      { key: 'document.deleted', labelAr: 'حذف مستند', group: 'document' },
      { key: 'document.approved', labelAr: 'اعتماد مستند', group: 'document' },
      { key: 'document.rejected', labelAr: 'رفض مستند', group: 'document' },
      { key: 'document.shared', labelAr: 'مشاركة مستند', group: 'document' },
      { key: 'document.signed', labelAr: 'توقيع مستند', group: 'document' },
      { key: 'document.expired', labelAr: 'انتهاء صلاحية', group: 'document' },
      { key: 'document.commented', labelAr: 'تعليق على مستند', group: 'document' },
      { key: 'workflow.started', labelAr: 'بدء سير عمل', group: 'workflow' },
      { key: 'workflow.completed', labelAr: 'اكتمال سير عمل', group: 'workflow' },
      { key: 'workflow.escalated', labelAr: 'تصعيد سير عمل', group: 'workflow' },
      { key: 'tag.added', labelAr: 'إضافة وسم', group: 'tag' },
      { key: 'tag.removed', labelAr: 'إزالة وسم', group: 'tag' },
      { key: 'acl.changed', labelAr: 'تغيير صلاحيات', group: 'acl' },
    ];
  }

  /* ── Statistics ───────────────────────────────────────────── */
  async getStats() {
    const [total, byType, byStatus, recentLogs] = await Promise.all([
      Integration.countDocuments(),
      Integration.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Integration.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      IntegrationLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return {
      success: true,
      stats: {
        total,
        byType: byType.reduce((a, t) => ({ ...a, [t._id]: t.count }), {}),
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        recentActivity: recentLogs.length,
      },
    };
  }
}

module.exports = new DocumentIntegrationsService();
