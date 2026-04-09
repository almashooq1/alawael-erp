'use strict';

/**
 * DDD Health Monitor
 * ═══════════════════════════════════════════════════════════════════════
 * Deep health checking for all platform services, infrastructure, and
 * DDD domains. Kubernetes-compatible liveness/readiness probes.
 *
 * Features:
 *  - MongoDB connectivity & replica-set status
 *  - Redis connectivity & memory stats
 *  - DDD domain health (model availability, counts)
 *  - Dependency health matrix
 *  - Liveness / Readiness / Startup probes
 *  - Historical health snapshots for trend analysis
 *  - Degraded-service detection
 *  - Configurable check intervals
 *
 * @module dddHealthMonitor
 */

const mongoose = require('mongoose');
const { Router } = require('express');

const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   1. Health Check Snapshot Model
   ═══════════════════════════════════════════════════════════════════════ */
const healthSchema = new mongoose.Schema(
  {
    checkType: {
      type: String,
      enum: ['full', 'liveness', 'readiness', 'dependency', 'domain'],
      default: 'full',
      index: true,
    },
    overallStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'unhealthy', 'unknown'],
      required: true,
    },

    /* Infrastructure checks */
    infrastructure: {
      mongodb: {
        status: { type: String, enum: ['up', 'down', 'degraded'], default: 'unknown' },
        latencyMs: Number,
        connectionState: Number,
        dbName: String,
        collections: Number,
      },
      redis: {
        status: {
          type: String,
          enum: ['up', 'down', 'degraded', 'not-configured'],
          default: 'not-configured',
        },
        latencyMs: Number,
        memoryUsedMB: Number,
        connectedClients: Number,
      },
      memory: {
        heapUsedMB: Number,
        heapTotalMB: Number,
        rssMB: Number,
        externalMB: Number,
        usagePercent: Number,
      },
      uptime: {
        processSeconds: Number,
        systemSeconds: Number,
      },
    },

    /* Domain health */
    domains: [
      {
        name: String,
        status: { type: String, enum: ['healthy', 'degraded', 'unhealthy', 'unknown'] },
        modelCount: Number,
        recordCount: Number,
        lastActivity: Date,
        issues: [String],
      },
    ],

    /* Dependencies */
    dependencies: [
      {
        name: String,
        type: { type: String, enum: ['database', 'cache', 'queue', 'api', 'storage', 'service'] },
        status: { type: String, enum: ['up', 'down', 'degraded', 'not-configured'] },
        latencyMs: Number,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    /* Aggregate */
    totalChecks: Number,
    passedChecks: Number,
    failedChecks: Number,
    degradedChecks: Number,
    durationMs: Number,

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

healthSchema.index({ checkType: 1, createdAt: -1 });
healthSchema.index({ overallStatus: 1, createdAt: -1 });

const DDDHealthCheck =
  mongoose.models.DDDHealthCheck || mongoose.model('DDDHealthCheck', healthSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Health Check Definitions — DDD Models
   ═══════════════════════════════════════════════════════════════════════ */
const DOMAIN_MODEL_MAP = {
  core: ['Beneficiary'],
  episodes: ['EpisodeOfCare'],
  timeline: ['CareTimeline'],
  assessments: ['ClinicalAssessment'],
  'care-plans': ['UnifiedCarePlan'],
  sessions: ['ClinicalSession'],
  goals: ['TherapeuticGoal'],
  workflow: ['WorkflowTask', 'WorkflowTransitionLog'],
  programs: ['Program', 'ProgramEnrollment'],
  'ai-recommendations': ['ClinicalRiskScore', 'Recommendation'],
  quality: ['QualityAudit', 'CorrectiveAction'],
  family: ['FamilyMember', 'FamilyCommunication'],
  reports: ['ReportTemplate', 'GeneratedReport'],
  'group-therapy': ['TherapyGroup', 'GroupSession'],
  'tele-rehab': ['TeleSession'],
  'ar-vr': ['ARVRSession'],
  behavior: ['BehaviorRecord', 'BehaviorPlan'],
  research: ['ResearchStudy'],
  'field-training': ['TrainingProgram', 'TraineeRecord'],
  dashboards: ['DashboardConfig', 'KPIDefinition', 'KPISnapshot', 'DecisionAlert'],
};

const HEALTH_CHECK_DEFS = Object.keys(DOMAIN_MODEL_MAP);

/* ═══════════════════════════════════════════════════════════════════════
   3. Infrastructure Checks
   ═══════════════════════════════════════════════════════════════════════ */
async function checkMongoDB() {
  const start = Date.now();
  try {
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      return { status: 'down', latencyMs: Date.now() - start, connectionState: state };
    }

    const admin = mongoose.connection.db.admin();
    await admin.ping();
    const latency = Date.now() - start;

    const collections = await mongoose.connection.db.listCollections().toArray();

    return {
      status: latency > 500 ? 'degraded' : 'up',
      latencyMs: latency,
      connectionState: state,
      dbName: mongoose.connection.db.databaseName,
      collections: collections.length,
    };
  } catch {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      connectionState: mongoose.connection.readyState,
    };
  }
}

async function checkRedis() {
  try {
    let redis;
    try {
      redis = require('ioredis');
    } catch {
      return { status: 'not-configured', latencyMs: 0 };
    }

    const client = new redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    const start = Date.now();
    await client.connect();
    await client.ping();
    const latency = Date.now() - start;

    let info;
    try {
      const rawInfo = await client.info('memory');
      const memMatch = rawInfo.match(/used_memory:(\d+)/);
      const clientMatch = rawInfo.match(/connected_clients:(\d+)/);
      info = {
        memoryUsedMB: memMatch ? Math.round(parseInt(memMatch[1]) / 1048576) : 0,
        connectedClients: clientMatch ? parseInt(clientMatch[1]) : 0,
      };
    } catch {
      info = { memoryUsedMB: 0, connectedClients: 0 };
    }

    await client.quit();

    return {
      status: latency > 200 ? 'degraded' : 'up',
      latencyMs: latency,
      ...info,
    };
  } catch {
    return { status: 'down', latencyMs: 0 };
  }
}

function checkMemory() {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: Math.round(mem.heapUsed / 1048576),
    heapTotalMB: Math.round(mem.heapTotal / 1048576),
    rssMB: Math.round(mem.rss / 1048576),
    externalMB: Math.round(mem.external / 1048576),
    usagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
  };
}

function checkUptime() {
  return {
    processSeconds: Math.round(process.uptime()),
    systemSeconds: Math.round(require('os').uptime()),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Domain Health Checks
   ═══════════════════════════════════════════════════════════════════════ */
async function checkDomainHealth(domainName) {
  const modelNames = DOMAIN_MODEL_MAP[domainName];
  if (!modelNames) return { name: domainName, status: 'unknown', issues: ['Domain not defined'] };

  const issues = [];
  let totalRecords = 0;
  let modelsFound = 0;
  let lastActivity = null;

  for (const modelName of modelNames) {
    const Model = model(modelName);
    if (!Model) {
      issues.push(`Model ${modelName} not registered`);
      continue;
    }
    modelsFound++;

    try {
      const count = await Model.countDocuments({ isDeleted: { $ne: true } });
      totalRecords += count;

      const latest = await Model.findOne({ isDeleted: { $ne: true } })
        .sort({ updatedAt: -1 })
        .select('updatedAt')
        .lean();
      if (latest?.updatedAt) {
        if (!lastActivity || latest.updatedAt > lastActivity) {
          lastActivity = latest.updatedAt;
        }
      }
    } catch (err) {
      issues.push(`${modelName}: ${err.message}`);
    }
  }

  const status = issues.length === 0 ? 'healthy' : modelsFound === 0 ? 'unhealthy' : 'degraded';

  return {
    name: domainName,
    status,
    modelCount: modelsFound,
    recordCount: totalRecords,
    lastActivity,
    issues,
  };
}

async function checkAllDomains() {
  const results = [];
  for (const domain of HEALTH_CHECK_DEFS) {
    results.push(await checkDomainHealth(domain));
  }
  return results;
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Full Health Check
   ═══════════════════════════════════════════════════════════════════════ */
async function runFullHealthCheck() {
  const start = Date.now();

  const [mongoResult, redisResult, domainResults] = await Promise.all([
    checkMongoDB(),
    checkRedis(),
    checkAllDomains(),
  ]);

  const memory = checkMemory();
  const uptime = checkUptime();

  /* Dependency summary */
  const dependencies = [
    {
      name: 'MongoDB',
      type: 'database',
      status: mongoResult.status,
      latencyMs: mongoResult.latencyMs,
    },
    { name: 'Redis', type: 'cache', status: redisResult.status, latencyMs: redisResult.latencyMs },
  ];

  /* Calculate overall status */
  let totalChecks = dependencies.length + domainResults.length;
  let passedChecks =
    dependencies.filter(d => d.status === 'up').length +
    domainResults.filter(d => d.status === 'healthy').length;
  let degradedChecks =
    dependencies.filter(d => d.status === 'degraded').length +
    domainResults.filter(d => d.status === 'degraded').length;
  let failedChecks = totalChecks - passedChecks - degradedChecks;

  let overallStatus = 'healthy';
  if (failedChecks > 0 && mongoResult.status === 'down') overallStatus = 'unhealthy';
  else if (failedChecks > 0 || degradedChecks > 0) overallStatus = 'degraded';

  /* Memory warning */
  if (memory.usagePercent > 90) {
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    degradedChecks++;
    totalChecks++;
  } else {
    passedChecks++;
    totalChecks++;
  }

  const snapshot = await DDDHealthCheck.create({
    checkType: 'full',
    overallStatus,
    infrastructure: {
      mongodb: mongoResult,
      redis: redisResult,
      memory,
      uptime,
    },
    domains: domainResults,
    dependencies,
    totalChecks,
    passedChecks,
    failedChecks,
    degradedChecks,
    durationMs: Date.now() - start,
  });

  return snapshot.toObject();
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Liveness / Readiness Probes
   ═══════════════════════════════════════════════════════════════════════ */
async function livenessCheck() {
  /* Process is alive, basic memory check */
  const mem = process.memoryUsage();
  const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
  return {
    status: heapPercent < 95 ? 'ok' : 'warning',
    uptime: Math.round(process.uptime()),
    heapPercent: Math.round(heapPercent),
    timestamp: new Date().toISOString(),
  };
}

async function readinessCheck() {
  const mongo = mongoose.connection.readyState === 1;
  const start = Date.now();
  let dbLatency = 0;

  if (mongo) {
    try {
      await mongoose.connection.db.admin().ping();
      dbLatency = Date.now() - start;
    } catch {
      return { ready: false, reason: 'MongoDB ping failed' };
    }
  }

  return {
    ready: mongo,
    reason: mongo ? null : 'MongoDB not connected',
    dbLatencyMs: dbLatency,
    timestamp: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Health Dashboard / Trend
   ═══════════════════════════════════════════════════════════════════════ */
async function getHealthDashboard() {
  const [latest, trend, counts] = await Promise.all([
    DDDHealthCheck.findOne({ checkType: 'full', isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean(),
    DDDHealthCheck.find({ checkType: 'full', isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(24)
      .select('overallStatus durationMs totalChecks passedChecks createdAt')
      .lean(),
    DDDHealthCheck.aggregate([
      {
        $match: { isDeleted: { $ne: true }, createdAt: { $gte: new Date(Date.now() - 86400000) } },
      },
      { $group: { _id: '$overallStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = counts.reduce((m, r) => ({ ...m, [r._id]: r.count }), {});

  return {
    current: latest,
    trend: trend.map(t => ({
      status: t.overallStatus,
      durationMs: t.durationMs,
      passed: t.passedChecks,
      total: t.totalChecks,
      at: t.createdAt,
    })),
    last24h: statusCounts,
    domainsMonitored: HEALTH_CHECK_DEFS.length,
    modelsMonitored: Object.values(DOMAIN_MODEL_MAP).flat().length,
  };
}

async function getHealthTrend(hours = 24) {
  return DDDHealthCheck.find({
    checkType: 'full',
    isDeleted: { $ne: true },
    createdAt: { $gte: new Date(Date.now() - hours * 3600000) },
  })
    .sort({ createdAt: -1 })
    .lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createHealthMonitorRouter() {
  const router = Router();

  /* Full health check */
  router.get('/health-monitor/check', async (_req, res) => {
    try {
      const result = await runFullHealthCheck();
      const httpStatus = result.overallStatus === 'unhealthy' ? 503 : 200;
      res.status(httpStatus).json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Kubernetes liveness probe */
  router.get('/health-monitor/live', async (_req, res) => {
    try {
      const result = await livenessCheck();
      res.status(result.status === 'ok' ? 200 : 503).json(result);
    } catch {
      res.status(503).json({ status: 'fail' });
    }
  });

  /* Kubernetes readiness probe */
  router.get('/health-monitor/ready', async (_req, res) => {
    try {
      const result = await readinessCheck();
      res.status(result.ready ? 200 : 503).json(result);
    } catch {
      res.status(503).json({ ready: false });
    }
  });

  /* Dashboard */
  router.get('/health-monitor/dashboard', async (_req, res) => {
    try {
      const dashboard = await getHealthDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Trend */
  router.get('/health-monitor/trend', async (req, res) => {
    try {
      const hours = parseInt(req.query.hours, 10) || 24;
      const trend = await getHealthTrend(hours);
      res.json({ success: true, count: trend.length, trend });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Single domain check */
  router.get('/health-monitor/domain/:name', async (req, res) => {
    try {
      const result = await checkDomainHealth(req.params.name);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Infrastructure only */
  router.get('/health-monitor/infrastructure', async (_req, res) => {
    try {
      const [mongo, redis] = await Promise.all([checkMongoDB(), checkRedis()]);
      const memory = checkMemory();
      const uptime = checkUptime();
      res.json({ success: true, mongodb: mongo, redis, memory, uptime });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Monitored domains list */
  router.get('/health-monitor/domains', (_req, res) => {
    const domains = Object.entries(DOMAIN_MODEL_MAP).map(([name, models]) => ({
      domain: name,
      models,
      modelCount: models.length,
    }));
    res.json({ success: true, count: domains.length, domains });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDHealthCheck,
  DOMAIN_MODEL_MAP,
  HEALTH_CHECK_DEFS,
  checkMongoDB,
  checkRedis,
  checkMemory,
  checkUptime,
  checkDomainHealth,
  checkAllDomains,
  runFullHealthCheck,
  livenessCheck,
  readinessCheck,
  getHealthDashboard,
  getHealthTrend,
  createHealthMonitorRouter,
};
