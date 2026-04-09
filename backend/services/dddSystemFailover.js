'use strict';
/**
 * DDD System Failover Service
 * ────────────────────────────
 * Phase 33 – Disaster Recovery & Business Continuity (Module 3/4)
 *
 * Manages failover configurations, health probes, switchover operations,
 * redundancy groups, and failover testing/reporting.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const FAILOVER_MODES = [
  'active_passive',
  'active_active',
  'hot_standby',
  'warm_standby',
  'cold_standby',
  'geographic',
  'cloud_burst',
  'load_balanced',
  'dns_failover',
  'manual',
  'automated',
  'hybrid',
];

const NODE_STATUSES = [
  'primary',
  'secondary',
  'standby',
  'active',
  'inactive',
  'degraded',
  'failed',
  'recovering',
  'syncing',
  'maintenance',
];

const PROBE_TYPES = [
  'http_get',
  'tcp_connect',
  'dns_lookup',
  'ping',
  'database_query',
  'custom_script',
  'certificate_check',
  'disk_space',
  'memory_usage',
  'service_status',
];

const SWITCHOVER_REASONS = [
  'planned_maintenance',
  'hardware_failure',
  'software_failure',
  'network_outage',
  'performance_degradation',
  'security_incident',
  'disaster_event',
  'capacity_overflow',
  'test_exercise',
  'manual_trigger',
];

const REDUNDANCY_LEVELS = [
  'none',
  'N_plus_1',
  'N_plus_2',
  '2N',
  'dual_site',
  'triple_site',
  'geo_distributed',
  'zone_redundant',
  'region_redundant',
  'global',
];

const HEALTH_STATES = [
  'healthy',
  'warning',
  'critical',
  'unknown',
  'unreachable',
  'timeout',
  'degraded',
  'recovering',
  'maintenance',
  'offline',
];

const BUILTIN_FAILOVER_CONFIGS = [
  {
    code: 'DB_FAILOVER',
    name: 'Database Failover',
    mode: 'active_passive',
    probeInterval: 10,
    threshold: 3,
  },
  { code: 'APP_HA', name: 'App Server HA', mode: 'active_active', probeInterval: 5, threshold: 2 },
  {
    code: 'CACHE_REPL',
    name: 'Cache Replication',
    mode: 'hot_standby',
    probeInterval: 5,
    threshold: 3,
  },
  {
    code: 'LB_FAILOVER',
    name: 'Load Balancer Failover',
    mode: 'active_passive',
    probeInterval: 3,
    threshold: 2,
  },
  {
    code: 'DNS_FAILOVER',
    name: 'DNS Failover',
    mode: 'dns_failover',
    probeInterval: 30,
    threshold: 3,
  },
  { code: 'GEO_DR', name: 'Geographic DR', mode: 'geographic', probeInterval: 60, threshold: 5 },
  {
    code: 'API_GW_HA',
    name: 'API Gateway HA',
    mode: 'load_balanced',
    probeInterval: 5,
    threshold: 2,
  },
  {
    code: 'QUEUE_HA',
    name: 'Message Queue HA',
    mode: 'active_active',
    probeInterval: 10,
    threshold: 3,
  },
  {
    code: 'STORAGE_REP',
    name: 'Storage Replication',
    mode: 'active_passive',
    probeInterval: 15,
    threshold: 3,
  },
  {
    code: 'CLOUD_BURST',
    name: 'Cloud Burst Config',
    mode: 'cloud_burst',
    probeInterval: 30,
    threshold: 5,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const failoverConfigSchema = new Schema(
  {
    name: { type: String, required: true },
    mode: { type: String, enum: FAILOVER_MODES, required: true },
    redundancy: { type: String, enum: REDUNDANCY_LEVELS, default: 'N_plus_1' },
    isActive: { type: Boolean, default: true },
    autoFailover: { type: Boolean, default: true },
    probeIntervalSec: { type: Number, default: 10 },
    failureThreshold: { type: Number, default: 3 },
    recoveryThreshold: { type: Number, default: 2 },
    cooldownSec: { type: Number, default: 300 },
    primaryNode: { type: String },
    secondaryNodes: [{ type: String }],
    notifyOnSwitch: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
failoverConfigSchema.index({ mode: 1, isActive: 1 });
failoverConfigSchema.index({ name: 1 });

const healthProbeSchema = new Schema(
  {
    configId: { type: Schema.Types.ObjectId, ref: 'DDDFailoverConfig', required: true },
    nodeAddress: { type: String, required: true },
    probeType: { type: String, enum: PROBE_TYPES, required: true },
    healthState: { type: String, enum: HEALTH_STATES, default: 'unknown' },
    responseMs: { type: Number },
    lastChecked: { type: Date },
    consecutiveFails: { type: Number, default: 0 },
    consecutiveOks: { type: Number, default: 0 },
    details: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
healthProbeSchema.index({ configId: 1, healthState: 1 });
healthProbeSchema.index({ nodeAddress: 1 });

const switchoverEventSchema = new Schema(
  {
    configId: { type: Schema.Types.ObjectId, ref: 'DDDFailoverConfig', required: true },
    reason: { type: String, enum: SWITCHOVER_REASONS, required: true },
    fromNode: { type: String, required: true },
    toNode: { type: String, required: true },
    status: {
      type: String,
      enum: ['initiated', 'in_progress', 'completed', 'failed', 'rolled_back'],
      default: 'initiated',
    },
    isAutomatic: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationMs: { type: Number },
    dataLossEstimate: { type: String },
    details: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
switchoverEventSchema.index({ configId: 1, createdAt: -1 });
switchoverEventSchema.index({ reason: 1, status: 1 });

const failoverTestSchema = new Schema(
  {
    configId: { type: Schema.Types.ObjectId, ref: 'DDDFailoverConfig', required: true },
    testName: { type: String, required: true },
    testType: {
      type: String,
      enum: ['automatic', 'manual', 'scheduled', 'chaos_test'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['planned', 'running', 'passed', 'failed', 'cancelled'],
      default: 'planned',
    },
    scheduledDate: { type: Date },
    executedDate: { type: Date },
    rtoActual: { type: Number },
    rpoActual: { type: Number },
    findings: [{ issue: String, severity: String }],
    overallResult: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    executedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
failoverTestSchema.index({ configId: 1, status: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDFailoverConfig =
  mongoose.models.DDDFailoverConfig || mongoose.model('DDDFailoverConfig', failoverConfigSchema);
const DDDHealthProbe =
  mongoose.models.DDDHealthProbe || mongoose.model('DDDHealthProbe', healthProbeSchema);
const DDDSwitchoverEvent =
  mongoose.models.DDDSwitchoverEvent || mongoose.model('DDDSwitchoverEvent', switchoverEventSchema);
const DDDFailoverTest =
  mongoose.models.DDDFailoverTest || mongoose.model('DDDFailoverTest', failoverTestSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class SystemFailover {
  async createConfig(data) {
    return DDDFailoverConfig.create(data);
  }
  async listConfigs(filter = {}, page = 1, limit = 20) {
    return DDDFailoverConfig.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateConfig(id, data) {
    return DDDFailoverConfig.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async recordProbe(data) {
    return DDDHealthProbe.create(data);
  }
  async listProbes(filter = {}, page = 1, limit = 50) {
    return DDDHealthProbe.find(filter)
      .sort({ lastChecked: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createSwitchover(data) {
    return DDDSwitchoverEvent.create(data);
  }
  async listSwitchovers(filter = {}, page = 1, limit = 20) {
    return DDDSwitchoverEvent.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createTest(data) {
    return DDDFailoverTest.create(data);
  }
  async listTests(filter = {}, page = 1, limit = 20) {
    return DDDFailoverTest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateTest(id, data) {
    return DDDFailoverTest.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async getFailoverStats() {
    const [configs, healthyProbes, switchovers, tests] = await Promise.all([
      DDDFailoverConfig.countDocuments({ isActive: true }),
      DDDHealthProbe.countDocuments({ healthState: 'healthy' }),
      DDDSwitchoverEvent.countDocuments(),
      DDDFailoverTest.countDocuments({ status: 'passed' }),
    ]);
    return {
      activeConfigs: configs,
      healthyProbes,
      totalSwitchovers: switchovers,
      passedTests: tests,
    };
  }

  async healthCheck() {
    const [configs, probes, switchovers, tests] = await Promise.all([
      DDDFailoverConfig.countDocuments(),
      DDDHealthProbe.countDocuments(),
      DDDSwitchoverEvent.countDocuments(),
      DDDFailoverTest.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'SystemFailover',
      counts: { configs, probes, switchovers, tests },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createSystemFailoverRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new SystemFailover();

  router.get('/system-failover/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/system-failover/configs', async (req, res) => {
    try {
      res.status(201).json(await svc.createConfig(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/system-failover/configs', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listConfigs(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/system-failover/configs/:id', async (req, res) => {
    try {
      res.json(await svc.updateConfig(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/system-failover/probes', async (req, res) => {
    try {
      res.status(201).json(await svc.recordProbe(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/system-failover/probes', async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json(await svc.listProbes(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/system-failover/switchovers', async (req, res) => {
    try {
      res.status(201).json(await svc.createSwitchover(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/system-failover/switchovers', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listSwitchovers(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/system-failover/tests', async (req, res) => {
    try {
      res.status(201).json(await svc.createTest(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/system-failover/tests', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listTests(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/system-failover/stats', async (_req, res) => {
    try {
      res.json(await svc.getFailoverStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  FAILOVER_MODES,
  NODE_STATUSES,
  PROBE_TYPES,
  SWITCHOVER_REASONS,
  REDUNDANCY_LEVELS,
  HEALTH_STATES,
  BUILTIN_FAILOVER_CONFIGS,
  DDDFailoverConfig,
  DDDHealthProbe,
  DDDSwitchoverEvent,
  DDDFailoverTest,
  SystemFailover,
  createSystemFailoverRouter,
};
