'use strict';
/**
 * DddHealthMonitor Model
 * Auto-extracted from services/dddHealthMonitor.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDHealthCheck,
};
