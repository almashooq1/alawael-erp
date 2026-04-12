'use strict';
/**
 * SystemFailover Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddSystemFailover.js
 */

const {
  DDDFailoverConfig,
  DDDHealthProbe,
  DDDSwitchoverEvent,
  DDDFailoverTest,
  FAILOVER_MODES,
  NODE_STATUSES,
  PROBE_TYPES,
  SWITCHOVER_REASONS,
  REDUNDANCY_LEVELS,
  HEALTH_STATES,
  BUILTIN_FAILOVER_CONFIGS,
} = require('../models/DddSystemFailover');

const BaseCrudService = require('./base/BaseCrudService');

class SystemFailover extends BaseCrudService {
  constructor() {
    super('SystemFailover', {}, {
      failoverConfigs: DDDFailoverConfig,
      healthProbes: DDDHealthProbe,
      switchoverEvents: DDDSwitchoverEvent,
      failoverTests: DDDFailoverTest,
    });
  }

  async createConfig(data) { return this._create(DDDFailoverConfig, data); }
  async listConfigs(filter = {}, page = 1, limit = 20) { return this._list(DDDFailoverConfig, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateConfig(id, data) { return this._update(DDDFailoverConfig, id, data); }

  async recordProbe(data) { return this._create(DDDHealthProbe, data); }
  async listProbes(filter = {}, page = 1, limit = 50) { return this._list(DDDHealthProbe, filter, { page: page, limit: limit, sort: { lastChecked: -1 } }); }

  async createSwitchover(data) { return this._create(DDDSwitchoverEvent, data); }
  async listSwitchovers(filter = {}, page = 1, limit = 20) { return this._list(DDDSwitchoverEvent, filter, { page: page, limit: limit, sort: { startedAt: -1 } }); }

  async createTest(data) { return this._create(DDDFailoverTest, data); }
  async listTests(filter = {}, page = 1, limit = 20) { return this._list(DDDFailoverTest, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateTest(id, data) { return this._update(DDDFailoverTest, id, data); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new SystemFailover();
