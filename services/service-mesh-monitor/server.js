'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const cron = require('node-cron');
const { v4: uuid } = require('uuid');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3630;

/* ═══════════════════════════════════════════════════════════════ */
/*  Middleware                                                    */
/* ═══════════════════════════════════════════════════════════════ */
app.use(helmet());
app.use(cors());
app.use(express.json());

/* ═══════════════════════════════════════════════════════════════ */
/*  Redis                                                         */
/* ═══════════════════════════════════════════════════════════════ */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000), lazyConnect: true });
redis.connect().catch(() => console.warn('⚠️ Redis unavailable'));

/* ═══════════════════════════════════════════════════════════════ */
/*  Prometheus Metrics                                            */
/* ═══════════════════════════════════════════════════════════════ */
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const serviceHealthGauge = new promClient.Gauge({
  name: 'alawael_service_health',
  help: 'Service health status (1=healthy, 0=unhealthy)',
  labelNames: ['service', 'port'],
  registers: [register],
});
const serviceResponseTime = new promClient.Histogram({
  name: 'alawael_service_response_time_ms',
  help: 'Service health check response time',
  labelNames: ['service'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register],
});
const totalChecks = new promClient.Counter({
  name: 'alawael_health_checks_total',
  help: 'Total health checks performed',
  labelNames: ['service', 'status'],
  registers: [register],
});
const incidentsGauge = new promClient.Gauge({
  name: 'alawael_active_incidents',
  help: 'Number of active incidents',
  registers: [register],
});

/* ═══════════════════════════════════════════════════════════════ */
/*  MongoDB Schemas                                               */
/* ═══════════════════════════════════════════════════════════════ */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_mesh';

// ── Service Registry ──
const serviceSchema = new mongoose.Schema(
  {
    serviceId: { type: String, default: uuid, unique: true },
    name: { type: String, required: true, unique: true },
    nameAr: String,
    host: { type: String, required: true },
    port: { type: Number, required: true },
    healthUrl: String,
    status: { type: String, enum: ['healthy', 'unhealthy', 'down', 'unknown'], default: 'unknown' },
    lastCheck: Date,
    lastHealthy: Date,
    responseTime: Number,
    uptime: Number,
    version: String,
    phase: String,
    tags: [String],
    circuitBreaker: {
      state: { type: String, enum: ['closed', 'open', 'half-open'], default: 'closed' },
      failures: { type: Number, default: 0 },
      lastFailure: Date,
      threshold: { type: Number, default: 5 },
      resetTimeout: { type: Number, default: 60000 },
    },
    metadata: mongoose.Schema.Types.Mixed,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Service = mongoose.model('Service', serviceSchema);

// ── Health Check Log ──
const healthLogSchema = new mongoose.Schema({
  logId: { type: String, default: uuid },
  serviceName: { type: String, index: true },
  status: { type: String, enum: ['healthy', 'unhealthy', 'down', 'timeout'] },
  responseTime: Number,
  statusCode: Number,
  error: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true },
});

healthLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 3600 }); // 7 days TTL
const HealthLog = mongoose.model('HealthLog', healthLogSchema);

// ── Incident ──
const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, default: uuid, unique: true },
    serviceName: { type: String, index: true },
    type: { type: String, enum: ['down', 'degraded', 'high-latency', 'circuit-open', 'error-spike'], required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'high' },
    title: String,
    description: String,
    status: { type: String, enum: ['active', 'investigating', 'resolved'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    acknowledgedBy: String,
    notifications: [{ channel: String, sentAt: Date, status: String }],
  },
  { timestamps: true },
);

const Incident = mongoose.model('Incident', incidentSchema);

/* ═══════════════════════════════════════════════════════════════ */
/*  Service Registry (All 33 services)                            */
/* ═══════════════════════════════════════════════════════════════ */
const SERVICE_REGISTRY = [
  // Core
  { name: 'backend-core', nameAr: 'النظام الأساسي', host: 'backend', port: 3001, phase: 'core' },
  // Phase 5
  { name: 'hr-payroll-service', nameAr: 'الموارد البشرية', host: 'hr-payroll-service', port: 3300, phase: '5' },
  { name: 'crm-service', nameAr: 'إدارة العلاقات', host: 'crm-service', port: 3310, phase: '5' },
  { name: 'attendance-biometric-service', nameAr: 'الحضور والبصمة', host: 'attendance-biometric-service', port: 3320, phase: '5' },
  { name: 'fleet-transport-service', nameAr: 'النقل والمواصلات', host: 'fleet-transport-service', port: 3330, phase: '5' },
  { name: 'document-management-service', nameAr: 'إدارة المستندات', host: 'document-management-service', port: 3340, phase: '5' },
  { name: 'workflow-engine-service', nameAr: 'محرك سير العمل', host: 'workflow-engine-service', port: 3350, phase: '5' },
  { name: 'identity-service', nameAr: 'إدارة الهوية', host: 'identity-service', port: 3360, phase: '5' },
  { name: 'analytics-bi-service', nameAr: 'التحليلات', host: 'analytics-bi-service', port: 3370, phase: '5' },
  { name: 'e-learning-service', nameAr: 'التعلم الإلكتروني', host: 'e-learning-service', port: 3380, phase: '5' },
  { name: 'parent-portal-service', nameAr: 'بوابة أولياء الأمور', host: 'parent-portal-service', port: 3390, phase: '5' },
  { name: 'rehabilitation-care-service', nameAr: 'الرعاية التأهيلية', host: 'rehabilitation-care-service', port: 3400, phase: '5' },
  { name: 'fee-billing-service', nameAr: 'الرسوم والفوترة', host: 'fee-billing-service', port: 3410, phase: '5' },
  { name: 'multi-tenant-service', nameAr: 'تعدد المستأجرين', host: 'multi-tenant-service', port: 3420, phase: '5' },
  { name: 'realtime-collaboration-service', nameAr: 'التعاون الفوري', host: 'realtime-collaboration-service', port: 3430, phase: '5' },
  { name: 'kitchen-laundry-facility-service', nameAr: 'المطبخ والمغسلة', host: 'kitchen-laundry-facility-service', port: 3440, phase: '5' },
  // Phase 6
  { name: 'inventory-warehouse-service', nameAr: 'المخزون والمستودعات', host: 'inventory-warehouse-service', port: 3450, phase: '6' },
  { name: 'academic-curriculum-service', nameAr: 'المنهج الأكاديمي', host: 'academic-curriculum-service', port: 3460, phase: '6' },
  { name: 'student-health-medical-service', nameAr: 'صحة الطلاب', host: 'student-health-medical-service', port: 3470, phase: '6' },
  { name: 'visitor-campus-security-service', nameAr: 'أمن الحرم', host: 'visitor-campus-security-service', port: 3480, phase: '6' },
  { name: 'crisis-safety-service', nameAr: 'إدارة الأزمات', host: 'crisis-safety-service', port: 3490, phase: '6' },
  {
    name: 'compliance-accreditation-service',
    nameAr: 'الامتثال والاعتماد',
    host: 'compliance-accreditation-service',
    port: 3500,
    phase: '6',
  },
  { name: 'events-activities-service', nameAr: 'الفعاليات والأنشطة', host: 'events-activities-service', port: 3510, phase: '6' },
  { name: 'asset-equipment-service', nameAr: 'الأصول والمعدات', host: 'asset-equipment-service', port: 3520, phase: '6' },
  {
    name: 'staff-training-development-service',
    nameAr: 'تدريب الموظفين',
    host: 'staff-training-development-service',
    port: 3530,
    phase: '6',
  },
  { name: 'cms-announcements-service', nameAr: 'الإعلانات والمحتوى', host: 'cms-announcements-service', port: 3540, phase: '6' },
  { name: 'forms-survey-service', nameAr: 'النماذج والاستبيانات', host: 'forms-survey-service', port: 3550, phase: '6' },
  {
    name: 'budget-financial-planning-service',
    nameAr: 'الميزانية والتخطيط',
    host: 'budget-financial-planning-service',
    port: 3560,
    phase: '6',
  },
  { name: 'student-lifecycle-service', nameAr: 'دورة حياة الطالب', host: 'student-lifecycle-service', port: 3570, phase: '6' },
  { name: 'external-integration-hub-service', nameAr: 'التكامل الخارجي', host: 'external-integration-hub-service', port: 3580, phase: '6' },
  { name: 'facility-space-management-service', nameAr: 'إدارة المرافق', host: 'facility-space-management-service', port: 3590, phase: '6' },
  // Phase 7
  { name: 'api-gateway', nameAr: 'بوابة API', host: 'api-gateway', port: 3600, phase: '7' },
  { name: 'security-auth-service', nameAr: 'التأمين والمصادقة', host: 'security-auth-service', port: 3610, phase: '7' },
  { name: 'smart-reports-service', nameAr: 'التقارير الذكية', host: 'smart-reports-service', port: 3620, phase: '7' },
];

/* ═══════════════════════════════════════════════════════════════ */
/*  Health Check Engine                                           */
/* ═══════════════════════════════════════════════════════════════ */
async function checkServiceHealth(svc) {
  const url = svc.healthUrl || `http://${svc.host}:${svc.port}/health`;
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const responseTime = Date.now() - start;
    const status = resp.ok ? 'healthy' : 'unhealthy';
    const details = resp.ok ? await resp.json().catch(() => ({})) : {};
    return { status, responseTime, statusCode: resp.status, details };
  } catch (err) {
    return { status: 'down', responseTime: Date.now() - start, statusCode: 0, error: err.message };
  }
}

async function runHealthChecks() {
  const results = [];
  const checks = await Promise.allSettled(
    SERVICE_REGISTRY.map(async svc => {
      const result = await checkServiceHealth(svc);

      // Update metrics
      serviceHealthGauge.set({ service: svc.name, port: String(svc.port) }, result.status === 'healthy' ? 1 : 0);
      serviceResponseTime.observe({ service: svc.name }, result.responseTime);
      totalChecks.inc({ service: svc.name, status: result.status });

      // Update in DB
      const update = { status: result.status, lastCheck: new Date(), responseTime: result.responseTime };
      if (result.status === 'healthy') update.lastHealthy = new Date();
      await Service.updateOne({ name: svc.name }, { $set: update }, { upsert: true });

      // Log
      await HealthLog.create({ serviceName: svc.name, ...result });

      // Circuit breaker logic
      const service = await Service.findOne({ name: svc.name });
      if (service) {
        if (result.status !== 'healthy') {
          service.circuitBreaker.failures++;
          service.circuitBreaker.lastFailure = new Date();
          if (service.circuitBreaker.failures >= service.circuitBreaker.threshold) {
            if (service.circuitBreaker.state !== 'open') {
              service.circuitBreaker.state = 'open';
              // Create incident
              await Incident.create({
                serviceName: svc.name,
                type: 'circuit-open',
                severity: 'high',
                title: `دائرة ${svc.nameAr} مفتوحة`,
                description: `الخدمة ${svc.nameAr} تجاوزت حد الأخطاء (${service.circuitBreaker.threshold})`,
              });
            }
          }
        } else {
          if (service.circuitBreaker.state === 'open') service.circuitBreaker.state = 'half-open';
          if (service.circuitBreaker.state === 'half-open') {
            service.circuitBreaker.state = 'closed';
            service.circuitBreaker.failures = 0;
          }
          // Auto-resolve incidents
          await Incident.updateMany(
            { serviceName: svc.name, status: 'active', type: { $in: ['down', 'circuit-open'] } },
            { status: 'resolved', resolvedAt: new Date() },
          );
        }
        await service.save();
      }

      // Create down incident
      if (result.status === 'down') {
        const existing = await Incident.findOne({ serviceName: svc.name, status: 'active', type: 'down' });
        if (!existing) {
          await Incident.create({
            serviceName: svc.name,
            type: 'down',
            severity: 'critical',
            title: `${svc.nameAr} متوقفة`,
            description: `الخدمة ${svc.nameAr} (${svc.host}:${svc.port}) لا تستجيب`,
          });
        }
      }

      results.push({ name: svc.name, nameAr: svc.nameAr, port: svc.port, ...result });
      return result;
    }),
  );

  // Update active incidents gauge
  const activeCount = await Incident.countDocuments({ status: 'active' });
  incidentsGauge.set(activeCount);

  // Cache results in Redis
  if (redis.status === 'ready') {
    await redis.setex('mesh:latest-check', 120, JSON.stringify(results));
  }

  return results;
}

/* ═══════════════════════════════════════════════════════════════ */
/*  API Endpoints                                                 */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-mesh-monitor', uptime: process.uptime() }));

// ── Services ──
app.get('/api/mesh/services', async (req, res) => {
  try {
    const { phase, status } = req.query;
    const filter = { isActive: true };
    if (phase) filter.phase = phase;
    if (status) filter.status = status;
    const services = await Service.find(filter).sort({ port: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mesh/services/:name', async (req, res) => {
  try {
    const service = await Service.findOne({ name: req.params.name });
    if (!service) return res.status(404).json({ error: 'الخدمة غير موجودة' });
    const logs = await HealthLog.find({ serviceName: req.params.name }).sort({ timestamp: -1 }).limit(50);
    const incidents = await Incident.find({ serviceName: req.params.name }).sort({ startedAt: -1 }).limit(10);
    res.json({ service, recentLogs: logs, incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health Checks ──
app.get('/api/mesh/health-check', async (_req, res) => {
  try {
    if (redis.status === 'ready') {
      const c = await redis.get('mesh:latest-check');
      if (c) return res.json(JSON.parse(c));
    }
    const results = await runHealthChecks();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mesh/health-check/run', async (_req, res) => {
  try {
    const results = await runHealthChecks();
    const healthy = results.filter(r => r.status === 'healthy').length;
    res.json({ total: results.length, healthy, unhealthy: results.length - healthy, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Incidents ──
app.get('/api/mesh/incidents', async (req, res) => {
  try {
    const { status = 'active', severity, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (severity) filter.severity = severity;
    const [data, total] = await Promise.all([
      Incident.find(filter)
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      Incident.countDocuments(filter),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/mesh/incidents/:incidentId', async (req, res) => {
  try {
    const { status, acknowledgedBy } = req.body;
    const update = {};
    if (status) update.status = status;
    if (status === 'resolved') update.resolvedAt = new Date();
    if (acknowledgedBy) update.acknowledgedBy = acknowledgedBy;
    const incident = await Incident.findOneAndUpdate({ incidentId: req.params.incidentId }, update, { new: true });
    if (!incident) return res.status(404).json({ error: 'الحادثة غير موجودة' });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Logs ──
app.get('/api/mesh/logs', async (req, res) => {
  try {
    const { service, status, from, to, limit = 100 } = req.query;
    const filter = {};
    if (service) filter.serviceName = service;
    if (status) filter.status = status;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    const logs = await HealthLog.find(filter).sort({ timestamp: -1 }).limit(+limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prometheus Metrics ──
app.get('/api/mesh/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ──
app.get('/api/mesh/dashboard', async (_req, res) => {
  try {
    const cacheKey = 'mesh:dashboard';
    if (redis.status === 'ready') {
      const c = await redis.get(cacheKey);
      if (c) return res.json(JSON.parse(c));
    }

    const [services, activeIncidents, totalIncidents, recentLogs] = await Promise.all([
      Service.find({ isActive: true }).lean(),
      Incident.countDocuments({ status: 'active' }),
      Incident.countDocuments(),
      HealthLog.find().sort({ timestamp: -1 }).limit(20).lean(),
    ]);

    const healthy = services.filter(s => s.status === 'healthy').length;
    const unhealthy = services.filter(s => s.status === 'unhealthy').length;
    const down = services.filter(s => s.status === 'down').length;
    const avgResponseTime = services.length ? Math.round(services.reduce((a, s) => a + (s.responseTime || 0), 0) / services.length) : 0;

    const byPhase = {};
    for (const s of services) {
      const p = s.phase || 'unknown';
      if (!byPhase[p]) byPhase[p] = { total: 0, healthy: 0 };
      byPhase[p].total++;
      if (s.status === 'healthy') byPhase[p].healthy++;
    }

    const circuitBreakers = services
      .filter(s => s.circuitBreaker?.state !== 'closed')
      .map(s => ({ name: s.name, state: s.circuitBreaker.state, failures: s.circuitBreaker.failures }));

    const dashboard = {
      totalServices: services.length,
      healthy,
      unhealthy,
      down,
      unknown: services.length - healthy - unhealthy - down,
      healthRate: services.length ? ((healthy / services.length) * 100).toFixed(1) + '%' : '0%',
      avgResponseTime,
      activeIncidents,
      totalIncidents,
      byPhase,
      circuitBreakers,
      recentLogs,
      services: services.map(s => ({
        name: s.name,
        nameAr: s.nameAr,
        port: s.port,
        status: s.status,
        responseTime: s.responseTime,
        lastCheck: s.lastCheck,
        phase: s.phase,
      })),
      timestamp: new Date(),
    };

    if (redis.status === 'ready') await redis.setex(cacheKey, 60, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Cron: Health Checks (every 30 seconds)                        */
/* ═══════════════════════════════════════════════════════════════ */
cron.schedule('*/30 * * * * *', async () => {
  try {
    await runHealthChecks();
  } catch (e) {
    console.error('Health check error:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Seed Service Registry                                         */
/* ═══════════════════════════════════════════════════════════════ */
async function seedRegistry() {
  for (const svc of SERVICE_REGISTRY) {
    await Service.updateOne(
      { name: svc.name },
      {
        $setOnInsert: { serviceId: uuid() },
        $set: {
          nameAr: svc.nameAr,
          host: svc.host,
          port: svc.port,
          phase: svc.phase,
          healthUrl: `http://${svc.host}:${svc.port}/health`,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(`📋 Service registry seeded (${SERVICE_REGISTRY.length} services)`);
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Start                                                         */
/* ═══════════════════════════════════════════════════════════════ */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_mesh');
    await seedRegistry();
    app.listen(PORT, () => console.log(`🔍 Service Mesh Monitor running on port ${PORT}`));
    // Initial health check
    setTimeout(() => runHealthChecks().catch(() => {}), 5000);
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });
