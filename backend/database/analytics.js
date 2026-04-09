/**
 * Database Analytics & Monitoring - Al-Awael ERP
 * تحليلات ومراقبة قاعدة البيانات
 *
 * Features:
 *  - Real-time performance metrics collection
 *  - Query performance profiling
 *  - Collection-level statistics
 *  - Index usage analysis & recommendations
 *  - Connection pool monitoring
 *  - Slow query log with analysis
 *  - Storage utilization tracking
 *  - Automated performance alerts
 *  - Dashboard-ready data
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Performance Metrics Collector
// ══════════════════════════════════════════════════════════════════
class DatabaseAnalytics {
  constructor() {
    this._metrics = {
      queries: { total: 0, slow: 0, errors: 0 },
      operations: { inserts: 0, reads: 0, updates: 0, deletes: 0 },
      latency: { samples: [], maxSamples: 1000 },
      slowQueries: [],
      maxSlowQueries: 100,
    };

    this._alerts = [];
    this._alertThresholds = {
      slowQueryMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS) || 500,
      highLatencyMs: 1000,
      connectionPoolUsage: 0.85,
      storageSizeGB: 10,
      indexSizeRatio: 0.5, // index size / data size
    };

    this._collectionInterval = null;
    this._snapshotHistory = []; // periodic snapshots
    this._maxSnapshots = 288; // 24hrs at 5min intervals
  }

  // ────── Install as Mongoose Plugin ──────
  install() {
    const self = this;

    mongoose.plugin(function analyticsPlugin(schema) {
      // Track all queries
      const ops = [
        'find',
        'findOne',
        'findOneAndUpdate',
        'findOneAndDelete',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
        'countDocuments',
        'aggregate',
      ];

      for (const op of ops) {
        schema.pre(op, function () {
          this._analyticsStart = Date.now();
        });

        schema.post(op, function () {
          if (!this._analyticsStart) return;
          const duration = Date.now() - this._analyticsStart;
          const collection =
            this.model?.collection?.name || this._collection?.collectionName || 'unknown';

          self._recordQuery(op, collection, duration, this.getFilter?.() || {});
        });
      }

      // Track writes
      schema.post('save', function () {
        self._metrics.operations.inserts++;
      });
    });

    logger.info('[DBAnalytics] Installed monitoring plugin');
  }

  // ────── Record Query Metrics ──────
  _recordQuery(operation, collection, durationMs, filter) {
    this._metrics.queries.total++;

    // Categorize operation
    if (['find', 'findOne', 'countDocuments', 'aggregate'].includes(operation)) {
      this._metrics.operations.reads++;
    } else if (['updateOne', 'updateMany', 'findOneAndUpdate'].includes(operation)) {
      this._metrics.operations.updates++;
    } else if (['deleteOne', 'deleteMany', 'findOneAndDelete'].includes(operation)) {
      this._metrics.operations.deletes++;
    }

    // Track latency
    this._metrics.latency.samples.push({
      op: operation,
      col: collection,
      ms: durationMs,
      at: Date.now(),
    });

    // Trim samples
    while (this._metrics.latency.samples.length > this._metrics.latency.maxSamples) {
      this._metrics.latency.samples.shift();
    }

    // Track slow queries
    if (durationMs >= this._alertThresholds.slowQueryMs) {
      this._metrics.queries.slow++;
      this._metrics.slowQueries.push({
        operation,
        collection,
        durationMs,
        filter: JSON.stringify(filter).slice(0, 300),
        timestamp: new Date(),
      });

      // Trim slow queries
      while (this._metrics.slowQueries.length > this._metrics.maxSlowQueries) {
        this._metrics.slowQueries.shift();
      }
    }
  }

  // ────── Get Comprehensive Database Stats ──────
  async getDatabaseStats() {
    const db = mongoose.connection.db;
    if (!db) return { error: 'Not connected' };

    try {
      const [dbStats, serverStatus] = await Promise.all([
        db.stats(),
        db
          .admin()
          .serverStatus()
          .catch(() => null),
      ]);

      return {
        database: {
          name: dbStats.db,
          collections: dbStats.collections,
          views: dbStats.views,
          objects: dbStats.objects,
          dataSize: this._formatBytes(dbStats.dataSize),
          storageSize: this._formatBytes(dbStats.storageSize),
          indexSize: this._formatBytes(dbStats.indexSize),
          totalSize: this._formatBytes(dbStats.totalSize || dbStats.dataSize + dbStats.indexSize),
          avgObjSize: this._formatBytes(dbStats.avgObjSize),
          dataSizeBytes: dbStats.dataSize,
          indexSizeBytes: dbStats.indexSize,
          indexToDataRatio:
            dbStats.dataSize > 0 ? (dbStats.indexSize / dbStats.dataSize).toFixed(3) : '0',
        },
        server: serverStatus
          ? {
              uptime: this._formatDuration(serverStatus.uptime * 1000),
              uptimeSeconds: serverStatus.uptime,
              connections: {
                current: serverStatus.connections?.current,
                available: serverStatus.connections?.available,
                totalCreated: serverStatus.connections?.totalCreated,
                utilization:
                  serverStatus.connections?.current && serverStatus.connections?.available
                    ? (
                        (serverStatus.connections.current /
                          (serverStatus.connections.current + serverStatus.connections.available)) *
                        100
                      ).toFixed(1) + '%'
                    : 'N/A',
              },
              opcounters: serverStatus.opcounters,
              network: {
                bytesIn: this._formatBytes(serverStatus.network?.bytesIn),
                bytesOut: this._formatBytes(serverStatus.network?.bytesOut),
                numRequests: serverStatus.network?.numRequests,
              },
              memory: {
                resident: this._formatBytes((serverStatus.mem?.resident || 0) * 1048576),
                virtual: this._formatBytes((serverStatus.mem?.virtual || 0) * 1048576),
              },
            }
          : null,
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ────── Collection-Level Statistics ──────
  async getCollectionStats() {
    const db = mongoose.connection.db;
    if (!db) return { error: 'Not connected' };

    try {
      const collections = await db.listCollections().toArray();
      const stats = [];

      for (const col of collections) {
        try {
          const colStats = await db.collection(col.name).stats();
          const indexes = await db.collection(col.name).indexes();

          stats.push({
            name: col.name,
            count: colStats.count,
            size: this._formatBytes(colStats.size),
            avgObjSize: this._formatBytes(colStats.avgObjSize),
            storageSize: this._formatBytes(colStats.storageSize),
            indexCount: indexes.length,
            indexSize: this._formatBytes(colStats.totalIndexSize),
            capped: colStats.capped || false,
            sizeBytes: colStats.size,
          });
        } catch (_) {
          stats.push({ name: col.name, error: 'Unable to get stats' });
        }
      }

      // Sort by size descending
      stats.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));

      return {
        totalCollections: collections.length,
        collections: stats,
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ────── Index Analysis ──────
  async analyzeIndexes() {
    const db = mongoose.connection.db;
    if (!db) return { error: 'Not connected' };

    try {
      const collections = await db.listCollections().toArray();
      const analysis = [];
      const recommendations = [];

      for (const col of collections) {
        try {
          const indexes = await db.collection(col.name).indexes();

          // Check for missing _id index (shouldn't happen but safety check)
          const hasIdIndex = indexes.some(idx => idx.key._id === 1);

          // Check for duplicate/redundant indexes
          const keyPatterns = indexes.map(idx => JSON.stringify(idx.key));
          const duplicates = keyPatterns.filter((k, i) => keyPatterns.indexOf(k) !== i);

          // Check for compound indexes that could be optimized
          const compoundIndexes = indexes.filter(idx => Object.keys(idx.key).length > 3);

          const collAnalysis = {
            collection: col.name,
            totalIndexes: indexes.length,
            indexes: indexes.map(idx => ({
              name: idx.name,
              key: idx.key,
              unique: idx.unique || false,
              sparse: idx.sparse || false,
              ttl: idx.expireAfterSeconds || null,
              partial: !!idx.partialFilterExpression,
            })),
          };

          analysis.push(collAnalysis);

          // Generate recommendations
          if (duplicates.length > 0) {
            recommendations.push({
              collection: col.name,
              type: 'duplicate_index',
              severity: 'warning',
              message: `${duplicates.length} duplicate index pattern(s) found`,
              details: duplicates,
            });
          }

          if (compoundIndexes.length > 0) {
            recommendations.push({
              collection: col.name,
              type: 'wide_compound_index',
              severity: 'info',
              message: `${compoundIndexes.length} compound index(es) with >3 fields — consider splitting`,
              details: compoundIndexes.map(i => i.name),
            });
          }

          if (indexes.length > 15) {
            recommendations.push({
              collection: col.name,
              type: 'too_many_indexes',
              severity: 'warning',
              message: `${indexes.length} indexes — may slow down writes. Review unused indexes.`,
            });
          }

          if (!hasIdIndex) {
            recommendations.push({
              collection: col.name,
              type: 'missing_id_index',
              severity: 'critical',
              message: 'Missing _id index',
            });
          }
        } catch (_) {
          // Skip collections we can't analyze
        }
      }

      return {
        totalCollections: analysis.length,
        totalIndexes: analysis.reduce((sum, a) => sum + a.totalIndexes, 0),
        analysis,
        recommendations,
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ────── Query Performance Summary ──────
  getQueryPerformance() {
    const samples = this._metrics.latency.samples;

    if (samples.length === 0) {
      return {
        totalQueries: 0,
        avgLatencyMs: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        slowQueries: 0,
      };
    }

    // Calculate percentiles
    const durations = samples.map(s => s.ms).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    const avg = durations.reduce((s, d) => s + d, 0) / durations.length;

    // Queries per second (last 60 seconds)
    const now = Date.now();
    const recentSamples = samples.filter(s => now - s.at < 60000);
    const qps = (recentSamples.length / 60).toFixed(2);

    // Breakdown by collection
    const byCollection = {};
    for (const s of samples) {
      if (!byCollection[s.col]) {
        byCollection[s.col] = { count: 0, totalMs: 0, maxMs: 0 };
      }
      byCollection[s.col].count++;
      byCollection[s.col].totalMs += s.ms;
      byCollection[s.col].maxMs = Math.max(byCollection[s.col].maxMs, s.ms);
    }

    // Top 5 slowest collections
    const topSlow = Object.entries(byCollection)
      .map(([col, data]) => ({
        collection: col,
        avgMs: (data.totalMs / data.count).toFixed(1),
        maxMs: data.maxMs,
        queryCount: data.count,
      }))
      .sort((a, b) => parseFloat(b.avgMs) - parseFloat(a.avgMs))
      .slice(0, 5);

    return {
      totalQueries: this._metrics.queries.total,
      slowQueries: this._metrics.queries.slow,
      errors: this._metrics.queries.errors,
      avgLatencyMs: avg.toFixed(1),
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      qps,
      operations: { ...this._metrics.operations },
      topSlowCollections: topSlow,
      recentSlowQueries: this._metrics.slowQueries.slice(-10),
    };
  }

  // ────── Dashboard Data (all-in-one) ──────
  async getDashboardData() {
    const [dbStats, collectionStats, performance] = await Promise.all([
      this.getDatabaseStats(),
      this.getCollectionStats(),
      Promise.resolve(this.getQueryPerformance()),
    ]);

    return {
      timestamp: new Date(),
      database: dbStats,
      collections: {
        total: collectionStats.totalCollections,
        top10BySize: collectionStats.collections?.slice(0, 10),
      },
      performance,
      queryCache: null, // Will be filled if query cache is available
      alerts: this._alerts.slice(-20),
    };
  }

  // ────── Periodic Snapshot Collection ──────
  startPeriodicCollection(intervalMs = 300000) {
    // 5 min default
    if (this._collectionInterval) return;

    this._collectionInterval = setInterval(async () => {
      try {
        const snapshot = {
          timestamp: new Date(),
          performance: this.getQueryPerformance(),
        };

        this._snapshotHistory.push(snapshot);
        while (this._snapshotHistory.length > this._maxSnapshots) {
          this._snapshotHistory.shift();
        }

        // Check thresholds and emit alerts
        this._checkAlerts(snapshot);
      } catch (err) {
        logger.error('[DBAnalytics] Snapshot collection failed:', err.message);
      }
    }, intervalMs);

    logger.info(`[DBAnalytics] Periodic collection started (${intervalMs / 1000}s interval)`);
  }

  stopPeriodicCollection() {
    if (this._collectionInterval) {
      clearInterval(this._collectionInterval);
      this._collectionInterval = null;
    }
  }

  // ────── Alert Checking ──────
  _checkAlerts(snapshot) {
    const perf = snapshot.performance;

    if (parseFloat(perf.p95Ms) > this._alertThresholds.highLatencyMs) {
      this._addAlert(
        'high_latency',
        'warning',
        `P95 latency is ${perf.p95Ms}ms (threshold: ${this._alertThresholds.highLatencyMs}ms)`
      );
    }

    if (perf.slowQueries > 10) {
      this._addAlert(
        'excessive_slow_queries',
        'warning',
        `${perf.slowQueries} slow queries detected in monitoring window`
      );
    }
  }

  _addAlert(type, severity, message) {
    this._alerts.push({
      type,
      severity,
      message,
      timestamp: new Date(),
    });

    // Keep last 100 alerts
    while (this._alerts.length > 100) {
      this._alerts.shift();
    }

    if (severity === 'critical') {
      logger.error(`[DBAlert] ${message}`);
    } else {
      logger.warn(`[DBAlert] ${message}`);
    }
  }

  // ────── History ──────
  getSnapshotHistory(minutes = 60) {
    const cutoff = Date.now() - minutes * 60000;
    return this._snapshotHistory.filter(s => s.timestamp.getTime() > cutoff);
  }

  // ────── Reset ──────
  reset() {
    this._metrics.queries = { total: 0, slow: 0, errors: 0 };
    this._metrics.operations = { inserts: 0, reads: 0, updates: 0, deletes: 0 };
    this._metrics.latency.samples = [];
    this._metrics.slowQueries = [];
    this._alerts = [];
  }

  // ────── Helpers ──────
  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  }
}

// Singleton
const dbAnalytics = new DatabaseAnalytics();

module.exports = {
  DatabaseAnalytics,
  dbAnalytics,
};
