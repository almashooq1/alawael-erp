/*  ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Saudi Government Gateway
 *  (بوابة الخدمات الحكومية السعودية)
 *  Port 3280 · Integration Proxy with Caching
 *  Provides: GOSI, Qiwa, Taqat, Mudad, Noor, MOI, Muqeem,
 *  HRSD, Absher integrations with unified API
 *  ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const winston = require('winston');

const app = express();
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/* ── Connections ─────────────────────────────────────────────── */
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/9');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael', {
    maxPoolSize: 5,
  })
  .then(() => log.info('MongoDB connected'));

/* ── Schemas ─────────────────────────────────────────────────── */
const GovApiLog = mongoose.model(
  'GovApiLog',
  new mongoose.Schema({
    service: { type: String, index: true }, // gosi, qiwa, taqat, mudad, noor, moi
    endpoint: String,
    method: String,
    requestData: Object,
    responseStatus: Number,
    responseData: Object,
    responseTimeMs: Number,
    cached: { type: Boolean, default: false },
    error: String,
    organizationId: String,
    requestedBy: String,
    createdAt: { type: Date, default: Date.now, index: true },
  }),
);

const GovCredential = mongoose.model(
  'GovCredential',
  new mongoose.Schema({
    organizationId: { type: String, required: true, index: true },
    service: { type: String, required: true },
    credentials: { type: Object, required: true }, // encrypted
    active: { type: Boolean, default: true },
    lastUsedAt: Date,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
  }),
);

/* ── Encryption helpers ──────────────────────────────────────── */
const ENC_KEY = process.env.GOV_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LEN = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENC_KEY, 'hex').slice(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const [ivHex, encrypted] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENC_KEY, 'hex').slice(0, 32), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/* ── Service Configurations ──────────────────────────────────── */
const SERVICES = {
  gosi: {
    name: 'المؤسسة العامة للتأمينات الاجتماعية',
    nameEn: 'General Organization for Social Insurance',
    baseUrl: process.env.GOSI_API_URL || 'https://api.gosi.gov.sa/v1',
    endpoints: {
      'employee-status': { path: '/subscriptions/status', method: 'GET', cacheTtl: 3600 },
      register: { path: '/subscriptions/register', method: 'POST', cacheTtl: 0 },
      'salary-update': { path: '/subscriptions/salary', method: 'PUT', cacheTtl: 0 },
      certificate: { path: '/certificates', method: 'GET', cacheTtl: 7200 },
      contributions: { path: '/contributions', method: 'GET', cacheTtl: 1800 },
    },
  },
  qiwa: {
    name: 'منصة قوى',
    nameEn: 'Qiwa Platform (HRSD)',
    baseUrl: process.env.QIWA_API_URL || 'https://api.qiwa.sa/v1',
    endpoints: {
      'contract-auth': { path: '/contracts/authenticate', method: 'POST', cacheTtl: 0 },
      'work-permit': { path: '/permits/work', method: 'GET', cacheTtl: 3600 },
      'transfer-request': { path: '/transfers/request', method: 'POST', cacheTtl: 0 },
      'employee-verify': { path: '/employees/verify', method: 'GET', cacheTtl: 1800 },
      'nitaqat-status': { path: '/nitaqat/status', method: 'GET', cacheTtl: 3600 },
    },
  },
  taqat: {
    name: 'طاقات',
    nameEn: 'Taqat (HRDF)',
    baseUrl: process.env.TAQAT_API_URL || 'https://api.taqat.sa/v1',
    endpoints: {
      'job-post': { path: '/jobs', method: 'POST', cacheTtl: 0 },
      candidates: { path: '/candidates/search', method: 'GET', cacheTtl: 1800 },
      'training-programs': { path: '/training/programs', method: 'GET', cacheTtl: 3600 },
      'subsidy-status': { path: '/subsidies/status', method: 'GET', cacheTtl: 1800 },
    },
  },
  mudad: {
    name: 'مُدد',
    nameEn: 'Mudad Wage Protection',
    baseUrl: process.env.MUDAD_API_URL || 'https://api.mudad.com.sa/v1',
    endpoints: {
      'salary-file': { path: '/payroll/upload', method: 'POST', cacheTtl: 0 },
      compliance: { path: '/compliance/status', method: 'GET', cacheTtl: 1800 },
      'bank-transfer': { path: '/transfers/initiate', method: 'POST', cacheTtl: 0 },
      'payment-status': { path: '/payments/status', method: 'GET', cacheTtl: 600 },
    },
  },
  noor: {
    name: 'نظام نور',
    nameEn: 'Noor Education System',
    baseUrl: process.env.NOOR_API_URL || 'https://api.noor.moe.gov.sa/v1',
    endpoints: {
      'student-register': { path: '/students/register', method: 'POST', cacheTtl: 0 },
      'student-info': { path: '/students', method: 'GET', cacheTtl: 3600 },
      attendance: { path: '/attendance/report', method: 'POST', cacheTtl: 0 },
      grades: { path: '/grades', method: 'GET', cacheTtl: 1800 },
      transfer: { path: '/students/transfer', method: 'POST', cacheTtl: 0 },
    },
  },
  moi: {
    name: 'وزارة الداخلية',
    nameEn: 'Ministry of Interior',
    baseUrl: process.env.MOI_API_URL || 'https://api.moi.gov.sa/v1',
    endpoints: {
      'iqama-verify': { path: '/iqama/verify', method: 'GET', cacheTtl: 7200 },
      'id-verify': { path: '/identity/verify', method: 'GET', cacheTtl: 7200 },
      'visa-status': { path: '/visa/status', method: 'GET', cacheTtl: 3600 },
      'border-status': { path: '/border/status', method: 'GET', cacheTtl: 1800 },
    },
  },
  muqeem: {
    name: 'مقيم',
    nameEn: 'Muqeem (Passport Directorate)',
    baseUrl: process.env.MUQEEM_API_URL || 'https://api.muqeem.sa/v1',
    endpoints: {
      'iqama-renew': { path: '/iqama/renew', method: 'POST', cacheTtl: 0 },
      'exit-reentry': { path: '/visa/exit-reentry', method: 'POST', cacheTtl: 0 },
      'final-exit': { path: '/visa/final-exit', method: 'POST', cacheTtl: 0 },
      dependents: { path: '/dependents', method: 'GET', cacheTtl: 3600 },
    },
  },
};

/* ── Core proxy function ─────────────────────────────────────── */
async function callGovApi(service, endpoint, params = {}, body = null, orgId, userId) {
  const svcConfig = SERVICES[service];
  if (!svcConfig) throw new Error(`Unknown service: ${service}`);
  const epConfig = svcConfig.endpoints[endpoint];
  if (!epConfig) throw new Error(`Unknown endpoint: ${service}/${endpoint}`);

  // Check cache
  const cacheKey = `gov:${service}:${endpoint}:${JSON.stringify(params)}:${orgId}`;
  if (epConfig.cacheTtl > 0) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      await GovApiLog.create({
        service,
        endpoint,
        method: epConfig.method,
        requestData: { params, body },
        responseStatus: 200,
        responseData: JSON.parse(cached),
        cached: true,
        organizationId: orgId,
        requestedBy: userId,
      });
      return { data: JSON.parse(cached), cached: true };
    }
  }

  // Get credentials
  const cred = await GovCredential.findOne({ organizationId: orgId, service, active: true });
  const headers = { 'Content-Type': 'application/json', 'Accept-Language': 'ar' };
  if (cred) {
    const decrypted = JSON.parse(decrypt(cred.credentials));
    if (decrypted.apiKey) headers['X-API-Key'] = decrypted.apiKey;
    if (decrypted.token) headers['Authorization'] = `Bearer ${decrypted.token}`;
    cred.lastUsedAt = new Date();
    await cred.save();
  }

  const start = Date.now();
  try {
    const url = `${svcConfig.baseUrl}${epConfig.path}`;
    const response = await axios({
      method: epConfig.method,
      url,
      params: epConfig.method === 'GET' ? params : undefined,
      data: epConfig.method !== 'GET' ? body || params : undefined,
      headers,
      timeout: 30000,
    });

    const elapsed = Date.now() - start;
    const responseData = response.data;

    // Handle XML responses
    let parsedData = responseData;
    if (typeof responseData === 'string' && responseData.trim().startsWith('<')) {
      parsedData = await parseStringPromise(responseData, { explicitArray: false });
    }

    // Cache response
    if (epConfig.cacheTtl > 0) {
      await redis.setex(cacheKey, epConfig.cacheTtl, JSON.stringify(parsedData));
    }

    await GovApiLog.create({
      service,
      endpoint,
      method: epConfig.method,
      requestData: { params, body },
      responseStatus: response.status,
      responseData: parsedData,
      responseTimeMs: elapsed,
      organizationId: orgId,
      requestedBy: userId,
    });

    log.info('Gov API call success', { service, endpoint, ms: elapsed });
    return { data: parsedData, cached: false };
  } catch (err) {
    const elapsed = Date.now() - start;
    const status = err.response?.status || 0;
    await GovApiLog.create({
      service,
      endpoint,
      method: epConfig.method,
      requestData: { params, body },
      responseStatus: status,
      responseTimeMs: elapsed,
      error: err.message,
      organizationId: orgId,
      requestedBy: userId,
    });
    log.error('Gov API call failed', { service, endpoint, status, error: err.message });
    throw { status, message: err.message, responseData: err.response?.data };
  }
}

/* ── Health ───────────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: Object.keys(SERVICES).length });
});

/* ── List Available Services ─────────────────────────────────── */
app.get('/api/gov/services', (_req, res) => {
  const result = {};
  for (const [key, svc] of Object.entries(SERVICES)) {
    result[key] = {
      name: svc.name,
      nameEn: svc.nameEn,
      endpoints: Object.keys(svc.endpoints),
    };
  }
  res.json(result);
});

/* ── Unified Gov API Call ────────────────────────────────────── */
app.post('/api/gov/:service/:endpoint', async (req, res) => {
  try {
    const { service, endpoint } = req.params;
    const { params, body, organizationId, userId } = req.body;
    if (!organizationId) return res.status(400).json({ error: 'organizationId required' });

    const result = await callGovApi(service, endpoint, params || {}, body, organizationId, userId);
    res.json(result);
  } catch (e) {
    const status = e.status || 500;
    res.status(status >= 100 && status < 600 ? status : 500).json({
      error: e.message,
      responseData: e.responseData,
    });
  }
});

/* ── Store Credentials ───────────────────────────────────────── */
app.post('/api/gov/credentials', async (req, res) => {
  try {
    const { organizationId, service, credentials, expiresAt } = req.body;
    if (!organizationId || !service || !credentials) {
      return res.status(400).json({ error: 'organizationId, service, credentials required' });
    }
    const encrypted = encrypt(JSON.stringify(credentials));
    const cred = await GovCredential.findOneAndUpdate(
      { organizationId, service },
      { credentials: encrypted, active: true, expiresAt },
      { upsert: true, new: true },
    );
    res.json({ id: cred._id, service, active: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Invalidate Cache ────────────────────────────────────────── */
app.delete('/api/gov/cache/:service', async (req, res) => {
  const keys = await redis.keys(`gov:${req.params.service}:*`);
  if (keys.length) await redis.del(...keys);
  res.json({ cleared: keys.length });
});

/* ── API Call Logs ───────────────────────────────────────────── */
app.get('/api/gov/logs', async (req, res) => {
  const { service, org, from = 0, size = 50 } = req.query;
  const filter = {};
  if (service) filter.service = service;
  if (org) filter.organizationId = org;
  const logs = await GovApiLog.find(filter)
    .sort('-createdAt')
    .skip(parseInt(from))
    .limit(Math.min(parseInt(size), 200));
  const total = await GovApiLog.countDocuments(filter);
  res.json({ total, logs });
});

/* ── Stats ────────────────────────────────────────────────────── */
app.get('/api/gov/stats', async (_req, res) => {
  const byService = await GovApiLog.aggregate([
    {
      $group: {
        _id: '$service',
        totalCalls: { $sum: 1 },
        errors: { $sum: { $cond: [{ $gt: ['$error', null] }, 1, 0] } },
        cached: { $sum: { $cond: ['$cached', 1, 0] } },
        avgResponseMs: { $avg: '$responseTimeMs' },
      },
    },
    { $sort: { totalCalls: -1 } },
  ]);
  res.json({ byService });
});

/* ── Batch Call (multiple endpoints at once) ─────────────────── */
app.post('/api/gov/batch', async (req, res) => {
  const { calls, organizationId, userId } = req.body;
  if (!calls?.length || !organizationId) {
    return res.status(400).json({ error: 'calls[] and organizationId required' });
  }
  const results = {};
  await Promise.allSettled(
    calls.map(async call => {
      try {
        const result = await callGovApi(call.service, call.endpoint, call.params || {}, call.body, organizationId, userId);
        results[`${call.service}/${call.endpoint}`] = { success: true, ...result };
      } catch (e) {
        results[`${call.service}/${call.endpoint}`] = { success: false, error: e.message };
      }
    }),
  );
  res.json(results);
});

/* ── Start ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3280;
app.listen(PORT, () => log.info(`Saudi Gov Gateway running on port ${PORT}`));
