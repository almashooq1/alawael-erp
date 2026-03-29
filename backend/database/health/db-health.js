/**
 * @file db-health.js
 * @description نظام فحص صحة قاعدة البيانات الشامل
 * Comprehensive database health check system for Al-Awael ERP
 */

'use strict';

const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const HEALTH_THRESHOLDS = {
  pingLatencyMs: parseInt(process.env.DB_PING_WARNING_MS) || 100,
  pingCriticalMs: parseInt(process.env.DB_PING_CRITICAL_MS) || 500,
  diskUsageWarning: 0.8, // 80%
  diskUsageCritical: 0.95, // 95%
  connPoolWarning: 0.75, // 75% of pool used
  connPoolCritical: 0.9, // 90% of pool used
  oplogLagWarningMin: 60, // 60 minutes
  slowQueryThresholdMs: 100,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 1: Connection Status
// ─────────────────────────────────────────────────────────────────────────────
async function checkConnection() {
  const readyState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  return {
    name: 'connection',
    status: readyState === 1 ? 'healthy' : 'critical',
    message: states[readyState] || 'unknown',
    details: {
      readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 2: Ping Latency
// ─────────────────────────────────────────────────────────────────────────────
async function checkPing() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'ping', status: 'critical', message: 'Not connected', latencyMs: null };
  }

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;

    let status = 'healthy';
    if (latencyMs >= HEALTH_THRESHOLDS.pingCriticalMs) status = 'critical';
    else if (latencyMs >= HEALTH_THRESHOLDS.pingLatencyMs) status = 'warning';

    return {
      name: 'ping',
      status,
      message: `${latencyMs}ms`,
      details: { latencyMs, threshold: HEALTH_THRESHOLDS.pingLatencyMs },
    };
  } catch (err) {
    return { name: 'ping', status: 'critical', message: err.message, latencyMs: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 3: Database Stats
// ─────────────────────────────────────────────────────────────────────────────
async function checkDatabaseStats() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'stats', status: 'critical', message: 'Not connected' };
  }

  try {
    const stats = await mongoose.connection.db.stats();
    const diskUsageRatio = stats.dataSize / (stats.storageSize || 1);

    let status = 'healthy';
    if (diskUsageRatio >= HEALTH_THRESHOLDS.diskUsageCritical) status = 'critical';
    else if (diskUsageRatio >= HEALTH_THRESHOLDS.diskUsageWarning) status = 'warning';

    return {
      name: 'database-stats',
      status,
      message: `${stats.collections} collections, ${formatBytes(stats.dataSize)} data`,
      details: {
        collections: stats.collections,
        objects: stats.objects,
        dataSize: formatBytes(stats.dataSize),
        storageSize: formatBytes(stats.storageSize),
        indexes: stats.indexes,
        indexSize: formatBytes(stats.indexSize),
        avgObjSize: formatBytes(stats.avgObjSize),
      },
    };
  } catch (err) {
    return { name: 'database-stats', status: 'warning', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 4: Server Status
// ─────────────────────────────────────────────────────────────────────────────
async function checkServerStatus() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'server-status', status: 'critical', message: 'Not connected' };
  }

  try {
    const serverStatus = await mongoose.connection.db.admin().serverStatus();

    const uptimeSeconds = serverStatus.uptime;
    const connections = serverStatus.connections;
    const memMB = serverStatus.mem ? Math.round(serverStatus.mem.resident) : null;

    // Connection pool health
    const connUsage = connections
      ? connections.current / (connections.available + connections.current)
      : 0;
    let status = 'healthy';
    if (connUsage >= HEALTH_THRESHOLDS.connPoolCritical) status = 'critical';
    else if (connUsage >= HEALTH_THRESHOLDS.connPoolWarning) status = 'warning';

    return {
      name: 'server-status',
      status,
      message: `Uptime: ${formatDuration(uptimeSeconds * 1000)}`,
      details: {
        version: serverStatus.version,
        uptime: formatDuration(uptimeSeconds * 1000),
        uptimeSeconds,
        connections: {
          current: connections?.current,
          available: connections?.available,
          totalCreated: connections?.totalCreated,
          usagePercent: `${(connUsage * 100).toFixed(1)}%`,
        },
        memory: memMB ? `${memMB} MB` : 'N/A',
        opcounters: serverStatus.opcounters,
      },
    };
  } catch (err) {
    return { name: 'server-status', status: 'warning', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 5: Collections Health
// ─────────────────────────────────────────────────────────────────────────────
async function checkCollections() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'collections', status: 'critical', message: 'Not connected' };
  }

  try {
    const REQUIRED_COLLECTIONS = [
      'users',
      'beneficiaries',
      'employees',
      'branches',
      'programs',
      'therapysessions',
      'attendances',
      'leaves',
      'payrolls',
      'invoices',
      'auditlogs',
      'notifications',
    ];

    const collections = await mongoose.connection.db.listCollections().toArray();
    const existingNames = new Set(collections.map(c => c.name));

    const missing = REQUIRED_COLLECTIONS.filter(c => !existingNames.has(c));

    return {
      name: 'collections',
      status: missing.length > 0 ? 'warning' : 'healthy',
      message: `${collections.length} total, ${missing.length} required missing`,
      details: {
        total: collections.length,
        required: REQUIRED_COLLECTIONS.length,
        missing: missing.length > 0 ? missing : [],
        existingRequired: REQUIRED_COLLECTIONS.filter(c => existingNames.has(c)),
      },
    };
  } catch (err) {
    return { name: 'collections', status: 'warning', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 6: Index Health
// ─────────────────────────────────────────────────────────────────────────────
async function checkIndexes() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'indexes', status: 'critical', message: 'Not connected' };
  }

  try {
    const criticalCollections = ['users', 'beneficiaries', 'employees', 'auditlogs'];
    const indexStats = {};
    let totalIndexes = 0;

    for (const collName of criticalCollections) {
      try {
        const coll = mongoose.connection.db.collection(collName);
        const indexes = await coll.indexes();
        indexStats[collName] = indexes.length;
        totalIndexes += indexes.length;
      } catch {
        indexStats[collName] = 0;
      }
    }

    return {
      name: 'indexes',
      status: 'healthy',
      message: `${totalIndexes} indexes across critical collections`,
      details: indexStats,
    };
  } catch (err) {
    return { name: 'indexes', status: 'warning', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 7: Replication Status (if replica set)
// ─────────────────────────────────────────────────────────────────────────────
async function checkReplication() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'replication', status: 'critical', message: 'Not connected' };
  }

  try {
    const replStatus = await mongoose.connection.db.admin().replSetGetStatus();

    const primary = replStatus.members?.find(m => m.stateStr === 'PRIMARY');
    const secondaries = replStatus.members?.filter(m => m.stateStr === 'SECONDARY') || [];
    const unhealthy = replStatus.members?.filter(m => m.health !== 1) || [];

    let status = 'healthy';
    if (unhealthy.length > 0) status = 'warning';
    if (!primary) status = 'critical';

    return {
      name: 'replication',
      status,
      message: `${replStatus.members?.length || 0} members, ${secondaries.length} secondaries`,
      details: {
        setName: replStatus.set,
        members: replStatus.members?.length,
        primary: primary?.name,
        secondaries: secondaries.map(s => s.name),
        unhealthy: unhealthy.map(m => ({ name: m.name, state: m.stateStr })),
      },
    };
  } catch (err) {
    // Not a replica set - that's fine for single node
    if (err.code === 76 || err.message.includes('not running with --replSet')) {
      return {
        name: 'replication',
        status: 'info',
        message: 'Standalone mode (no replica set)',
      };
    }
    return { name: 'replication', status: 'warning', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 8: Recent Error Rate (from audit logs)
// ─────────────────────────────────────────────────────────────────────────────
async function checkErrorRate() {
  if (mongoose.connection.readyState !== 1) {
    return { name: 'error-rate', status: 'critical', message: 'Not connected' };
  }

  try {
    const since = new Date(Date.now() - 60 * 60 * 1000); // last hour

    const auditCol = mongoose.connection.db.collection('auditlogs');
    const errorCount = await auditCol.countDocuments({
      severity: { $in: ['error', 'critical'] },
      createdAt: { $gte: since },
    });

    const totalCount = await auditCol.countDocuments({ createdAt: { $gte: since } });
    const errorRate = totalCount > 0 ? errorCount / totalCount : 0;

    let status = 'healthy';
    if (errorRate > 0.1)
      status = 'critical'; // >10% errors
    else if (errorRate > 0.05) status = 'warning'; // >5% errors

    return {
      name: 'error-rate',
      status,
      message: `${errorCount} errors in last hour (${(errorRate * 100).toFixed(1)}%)`,
      details: {
        errorsLastHour: errorCount,
        totalEventsLastHour: totalCount,
        errorRatePercent: `${(errorRate * 100).toFixed(1)}%`,
      },
    };
  } catch {
    return { name: 'error-rate', status: 'info', message: 'Audit logs not available' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: Run Full Health Check
// ─────────────────────────────────────────────────────────────────────────────
async function runHealthCheck(options = {}) {
  const { minimal = false } = options;
  const startTime = Date.now();

  const checks = minimal
    ? [checkConnection, checkPing]
    : [
        checkConnection,
        checkPing,
        checkDatabaseStats,
        checkServerStatus,
        checkCollections,
        checkIndexes,
        checkReplication,
        checkErrorRate,
      ];

  const results = await Promise.allSettled(checks.map(fn => fn()));

  const checkResults = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      name: checks[i].name,
      status: 'error',
      message: r.reason?.message || 'Check failed',
    };
  });

  // Determine overall status
  const hasCritical = checkResults.some(c => c.status === 'critical');
  const hasWarning = checkResults.some(c => c.status === 'warning');
  const overallStatus = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';

  const summary = {
    overall: overallStatus,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    checks: checkResults,
    summary: {
      total: checkResults.length,
      healthy: checkResults.filter(c => c.status === 'healthy').length,
      warning: checkResults.filter(c => c.status === 'warning').length,
      critical: checkResults.filter(c => c.status === 'critical').length,
      info: checkResults.filter(c => c.status === 'info').length,
    },
  };

  return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware health endpoint handler
// ─────────────────────────────────────────────────────────────────────────────
async function healthEndpointHandler(req, res) {
  try {
    const minimal = req.query.minimal === 'true';
    const health = await runHealthCheck({ minimal });

    const statusCode =
      health.overall === 'critical' ? 503 : health.overall === 'warning' ? 200 : 200;

    return res.status(statusCode).json(health);
  } catch (err) {
    return res.status(503).json({
      overall: 'critical',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Runner
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

  async function runCLI() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

    const health = await runHealthCheck();

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║       Al-Awael ERP - Database Health Check       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\n  Overall Status: ${health.overall.toUpperCase()}`);
    console.log(`  Timestamp: ${health.timestamp}`);
    console.log(`  Duration: ${health.durationMs}ms\n`);

    const statusEmoji = { healthy: '✅', warning: '⚠️ ', critical: '❌', info: 'ℹ️ ', error: '💥' };

    health.checks.forEach(check => {
      const emoji = statusEmoji[check.status] || '❓';
      console.log(`  ${emoji} ${check.name.padEnd(20)} ${check.message}`);
      if (check.details && process.argv.includes('--verbose')) {
        console.log(`     ${JSON.stringify(check.details, null, 2).replace(/\n/g, '\n     ')}`);
      }
    });

    console.log(
      `\n  Summary: ${health.summary.healthy} healthy, ${health.summary.warning} warnings, ${health.summary.critical} critical\n`
    );

    await mongoose.disconnect();
    process.exit(health.overall === 'critical' ? 1 : 0);
  }

  runCLI().catch(err => {
    console.error('Health check failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  runHealthCheck,
  healthEndpointHandler,
  checkConnection,
  checkPing,
  checkDatabaseStats,
  checkServerStatus,
  checkCollections,
  checkIndexes,
  checkReplication,
  checkErrorRate,
  HEALTH_THRESHOLDS,
};
