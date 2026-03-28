/**
 * Real-Time Dashboard Helpers
 *
 * Helper functions for Socket.IO dashboard and KPI broadcasting.
 * Extracted from server.js for maintainability.
 */

'use strict';

const logger = require('./logger');

/**
 * Get KPI data for a specific module.
 * @param {string} moduleKey
 * @returns {Array}
 */
function getModuleKPIs(moduleKey) {
  try {
    const moduleData = require('../data/moduleMocks')[moduleKey];
    return moduleData ? moduleData.kpis || [] : [];
  } catch (_err) {
    return [];
  }
}

/**
 * Get system summary cards for the dashboard.
 * @returns {Array<Object>}
 */
function getSummarySystems() {
  return [
    {
      title: 'Average Response Time',
      value: '245ms',
      trend: '+5%',
      status: 'normal',
      icon: 'clock',
    },
    {
      title: 'System Health',
      value: '98.5%',
      trend: '+0.2%',
      status: 'excellent',
      icon: 'heart',
    },
    {
      title: 'Active Users',
      value: '342',
      trend: '+12%',
      status: 'increasing',
      icon: 'users',
    },
    {
      title: 'Data Processed',
      value: '2.4GB',
      trend: '+8%',
      status: 'normal',
      icon: 'database',
    },
    {
      title: 'Error Rate',
      value: '0.2%',
      trend: '-0.1%',
      status: 'excellent',
      icon: 'alert',
    },
    {
      title: 'Success Rate',
      value: '99.8%',
      trend: '+0.1%',
      status: 'excellent',
      icon: 'check',
    },
  ];
}

/**
 * Get top KPIs across all modules.
 * @param {number} [limit=4]
 * @returns {Array<Object>}
 */
function getTopKPIs(limit = 4) {
  try {
    const moduleMocks = require('../data/moduleMocks');
    const allKPIs = [];
    for (const moduleKey of Object.keys(moduleMocks)) {
      const mod = moduleMocks[moduleKey];
      if (mod.kpis) {
        allKPIs.push(...mod.kpis.map(kpi => ({ ...kpi, module: moduleKey })));
      }
    }
    return allKPIs.slice(0, limit);
  } catch (_err) {
    return [];
  }
}

/**
 * Start periodic Socket.IO broadcasts for KPIs and dashboard.
 *
 * @param {import('socket.io').Server} io
 * @param {import('http').Server} server - HTTP server (stores interval refs for cleanup)
 */
function startRealtimeBroadcasts(io, server) {
  const socketEmitter = require('./socketEmitter');

  const KPI_MODULES = [
    'reports',
    'finance',
    'hr',
    'security',
    'elearning',
    'rehab',
    'appeals',
    'biometrics',
  ];

  // Emit KPI updates every 5 seconds
  const kpiInterval = setInterval(() => {
    try {
      for (const moduleKey of KPI_MODULES) {
        try {
          socketEmitter.emitModuleKPIUpdate(moduleKey, getModuleKPIs(moduleKey));
        } catch (error) {
          logger.error(`[KPI Update] Error for ${moduleKey}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('[KPI Update] Fatal error:', error.message);
    }
  }, 5000);

  // Emit dashboard updates every 10 seconds
  const dashboardInterval = setInterval(() => {
    try {
      socketEmitter.emitDashboardUpdate({
        summaryCards: getSummarySystems(),
        topKPIs: getTopKPIs(4),
      });
    } catch (error) {
      logger.error('[Dashboard Update] Error:', error.message);
    }
  }, 10000);

  // Store interval IDs on server for graceful shutdown cleanup
  server._kpiInterval = kpiInterval;
  server._dashboardInterval = dashboardInterval;

  // Register cleanup hook for graceful shutdown
  try {
    const { registerShutdownHook } = require('./gracefulShutdown');
    registerShutdownHook('realtimeDashboard', () => {
      clearInterval(kpiInterval);
      clearInterval(dashboardInterval);
      logger.info('[Realtime] Broadcasts stopped');
    });
  } catch (_e) {
    // gracefulShutdown not yet initialized — server._* refs will be cleared there
  }

  logger.info('[Realtime] KPI + Dashboard broadcasts started');
}

module.exports = {
  getModuleKPIs,
  getSummarySystems,
  getTopKPIs,
  startRealtimeBroadcasts,
};
