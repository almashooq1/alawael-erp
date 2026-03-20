'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const integrationSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    provider: {
      type: String,
      enum: [
        'noor',
        'mudad',
        'gosi',
        'absher',
        'nic',
        'elm',
        'sadad',
        'mada',
        'stc-pay',
        'apple-pay',
        'unifonic',
        'twilio',
        'firebase',
        'smtp',
        'custom-api',
      ],
      required: true,
    },
    type: {
      type: String,
      enum: ['government', 'payment', 'sms', 'email', 'push-notification', 'identity-verification', 'hr-payroll', 'erp', 'custom'],
      required: true,
    },
    config: {
      baseUrl: String,
      apiKey: String,
      apiSecret: String,
      clientId: String,
      clientSecret: String,
      tokenUrl: String,
      accessToken: String,
      refreshToken: String,
      tokenExpiry: Date,
      webhookUrl: String,
      sandbox: { type: Boolean, default: true },
      headers: mongoose.Schema.Types.Mixed,
      extraParams: mongoose.Schema.Types.Mixed,
    },
    endpoints: [
      {
        name: String,
        method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: String,
        description: String,
        requestSchema: mongoose.Schema.Types.Mixed,
        responseSchema: mongoose.Schema.Types.Mixed,
      },
    ],
    rateLimits: { maxPerMinute: Number, maxPerHour: Number, maxPerDay: Number },
    healthCheck: { url: String, interval: Number, lastCheck: Date, lastStatus: String },
    status: { type: String, enum: ['active', 'inactive', 'maintenance', 'error'], default: 'inactive' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

const apiLogSchema = new mongoose.Schema(
  {
    logNo: { type: String, unique: true },
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration' },
    integrationCode: String,
    direction: { type: String, enum: ['outbound', 'inbound'], required: true },
    endpoint: String,
    method: String,
    requestUrl: String,
    requestHeaders: mongoose.Schema.Types.Mixed,
    requestBody: mongoose.Schema.Types.Mixed,
    responseStatus: Number,
    responseBody: mongoose.Schema.Types.Mixed,
    responseTime: Number, // ms
    success: Boolean,
    errorMessage: String,
    retryCount: { type: Number, default: 0 },
    correlationId: String,
    triggeredBy: { userId: String, service: String },
  },
  { timestamps: true },
);

apiLogSchema.pre('save', async function (next) {
  if (!this.logNo) {
    const count = await this.constructor.countDocuments();
    this.logNo = `LOG-${new Date().getFullYear()}-${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

const webhookSchema = new mongoose.Schema(
  {
    webhookNo: { type: String, unique: true },
    integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration' },
    event: String,
    payload: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed,
    sourceIp: String,
    processed: { type: Boolean, default: false },
    processedAt: Date,
    result: mongoose.Schema.Types.Mixed,
    error: String,
    retries: { type: Number, default: 0 },
  },
  { timestamps: true },
);

webhookSchema.pre('save', async function (next) {
  if (!this.webhookNo) {
    const count = await this.constructor.countDocuments();
    this.webhookNo = `WH-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const dataMapping = new mongoose.Schema(
  {
    integrationCode: String,
    direction: { type: String, enum: ['import', 'export'] },
    sourceEntity: String,
    targetEntity: String,
    fieldMappings: [{ sourceField: String, targetField: String, transform: String, defaultValue: mongoose.Schema.Types.Mixed }],
    isActive: { type: Boolean, default: true },
    lastSync: Date,
    syncFrequency: String,
  },
  { timestamps: true },
);

const Integration = mongoose.model('Integration', integrationSchema);
const ApiLog = mongoose.model('ApiLog', apiLogSchema);
const Webhook = mongoose.model('Webhook', webhookSchema);
const DataMapping = mongoose.model('DataMapping', dataMapping);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_integrations';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3580;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const integrationQueue = new Queue('integration-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */

// Proxy helper — execute external API call with logging
async function executeApiCall(integration, endpointName, data = {}, triggeredBy = {}) {
  const ep = integration.endpoints?.find(e => e.name === endpointName);
  if (!ep) throw new Error(`Endpoint ${endpointName} not found`);
  const url = `${integration.config.baseUrl}${ep.path}`;
  const headers = { ...integration.config.headers };
  if (integration.config.apiKey) headers['X-API-Key'] = integration.config.apiKey;
  if (integration.config.accessToken) headers['Authorization'] = `Bearer ${integration.config.accessToken}`;

  const start = Date.now();
  const log = new ApiLog({
    integrationId: integration._id,
    integrationCode: integration.code,
    direction: 'outbound',
    endpoint: endpointName,
    method: ep.method,
    requestUrl: url,
    requestBody: data,
    triggeredBy,
    correlationId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });
  try {
    const resp = await axios({
      method: ep.method,
      url,
      headers,
      data: ['POST', 'PUT', 'PATCH'].includes(ep.method) ? data : undefined,
      params: ep.method === 'GET' ? data : undefined,
      timeout: 30000,
    });
    log.responseStatus = resp.status;
    log.responseBody = resp.data;
    log.responseTime = Date.now() - start;
    log.success = true;
    await log.save();
    return resp.data;
  } catch (err) {
    log.responseStatus = err.response?.status || 0;
    log.responseBody = err.response?.data;
    log.responseTime = Date.now() - start;
    log.success = false;
    log.errorMessage = err.message;
    await log.save();
    throw err;
  }
}

app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'external-integration-hub-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// Integrations
app.post('/api/integrations', async (req, res) => {
  try {
    res.status(201).json(await Integration.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/integrations', async (req, res) => {
  const { type, provider, status } = req.query;
  const q = {};
  if (type) q.type = type;
  if (provider) q.provider = provider;
  if (status) q.status = status;
  res.json(
    await Integration.find(q)
      .select('-config.apiKey -config.apiSecret -config.clientSecret -config.accessToken -config.refreshToken')
      .sort({ code: 1 }),
  );
});
app.get('/api/integrations/:id', async (req, res) => {
  const i = await Integration.findById(req.params.id);
  if (!i) return res.status(404).json({ error: 'التكامل غير موجود' });
  res.json(i);
});
app.put('/api/integrations/:id', async (req, res) => {
  res.json(await Integration.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Execute API call
app.post('/api/integrations/:code/execute/:endpoint', async (req, res) => {
  try {
    const integration = await Integration.findOne({ code: req.params.code, status: 'active' });
    if (!integration) return res.status(404).json({ error: 'التكامل غير نشط أو غير موجود' });
    const result = await executeApiCall(integration, req.params.endpoint, req.body, req.body._triggeredBy);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(e.response?.status || 500).json({ success: false, error: e.message });
  }
});

// Test integration connectivity
app.post('/api/integrations/:id/test', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ error: 'غير موجود' });
    const url = integration.config.baseUrl + (integration.healthCheck?.url || '/health');
    const start = Date.now();
    const r = await axios.get(url, { timeout: 10000 });
    const rtime = Date.now() - start;
    integration.healthCheck = { ...integration.healthCheck, lastCheck: new Date(), lastStatus: 'ok' };
    await integration.save();
    res.json({ success: true, status: r.status, responseTime: rtime });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// API Logs
app.get('/api/integration-logs', async (req, res) => {
  const { integrationCode, direction, success, from, to, page = 1, limit = 50 } = req.query;
  const q = {};
  if (integrationCode) q.integrationCode = integrationCode;
  if (direction) q.direction = direction;
  if (success !== undefined) q.success = success === 'true';
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    ApiLog.find(q)
      .select('-requestBody -responseBody -requestHeaders')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    ApiLog.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/integration-logs/:id', async (req, res) => {
  const log = await ApiLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: 'السجل غير موجود' });
  res.json(log);
});

// Webhooks
app.post('/api/webhooks/:integrationCode', async (req, res) => {
  try {
    const wh = await Webhook.create({
      integrationId: null,
      event: req.headers['x-event'] || 'unknown',
      payload: req.body,
      headers: req.headers,
      sourceIp: req.ip,
    });
    const integration = await Integration.findOne({ code: req.params.integrationCode });
    if (integration) {
      wh.integrationId = integration._id;
      await wh.save();
    }
    await integrationQueue.add('process-webhook', { webhookId: wh._id.toString() }, { attempts: 3 });
    res.json({ received: true, webhookNo: wh.webhookNo });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/webhooks', async (req, res) => {
  const { integrationCode, processed, page = 1, limit = 30 } = req.query;
  const q = {};
  if (processed !== undefined) q.processed = processed === 'true';
  const [data, total] = await Promise.all([
    Webhook.find(q)
      .select('-payload -headers -result')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Webhook.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});

// Data Mappings
app.post('/api/data-mappings', async (req, res) => {
  try {
    res.status(201).json(await DataMapping.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/data-mappings', async (req, res) => {
  res.json(
    await DataMapping.find(req.query.integrationCode ? { integrationCode: req.query.integrationCode } : {}).sort({ integrationCode: 1 }),
  );
});

// Dashboard
app.get('/api/integration/dashboard', async (_req, res) => {
  const cacheKey = 'integration:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [totalIntegrations, activeIntegrations, todayApiCalls, todayErrors, byProvider] = await Promise.all([
    Integration.countDocuments(),
    Integration.countDocuments({ status: 'active' }),
    ApiLog.countDocuments({ createdAt: { $gte: today } }),
    ApiLog.countDocuments({ createdAt: { $gte: today }, success: false }),
    Integration.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
    ]),
  ]);
  const avgResponseTime = await ApiLog.aggregate([
    { $match: { createdAt: { $gte: today }, success: true } },
    { $group: { _id: null, avg: { $avg: '$responseTime' } } },
  ]);
  const result = {
    totalIntegrations,
    activeIntegrations,
    todayApiCalls,
    todayErrors,
    successRate: todayApiCalls ? (((todayApiCalls - todayErrors) / todayApiCalls) * 100).toFixed(1) : 100,
    avgResponseTime: avgResponseTime[0]?.avg?.toFixed(0) || 0,
    byProvider,
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 120);
  res.json(result);
});

// Cron: health check all active integrations every 15 min
cron.schedule('*/15 * * * *', async () => {
  const integrations = await Integration.find({ status: 'active', 'healthCheck.url': { $exists: true } });
  for (const i of integrations) {
    try {
      const url = i.config.baseUrl + i.healthCheck.url;
      await axios.get(url, { timeout: 10000 });
      i.healthCheck.lastCheck = new Date();
      i.healthCheck.lastStatus = 'ok';
    } catch {
      i.healthCheck.lastCheck = new Date();
      i.healthCheck.lastStatus = 'error';
    }
    await i.save();
  }
});

// Cron: clean old API logs (older than 90 days) at 3 AM daily
cron.schedule('0 3 * * *', async () => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const { deletedCount } = await ApiLog.deleteMany({ createdAt: { $lte: cutoff } });
  if (deletedCount) console.log(`🗑️ Cleaned ${deletedCount} old API logs`);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — external-integration-hub');
    app.listen(PORT, () => console.log(`🔗 External-Integration-Hub Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
