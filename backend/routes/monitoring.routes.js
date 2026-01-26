/**
 * Monitoring & Metrics Routes
 * مسارات المراقبة والمقاييس
 */

const express = require('express');
const router = express.Router();
const os = require('os');

// Get Redis client if available
let redisClient;
try {
  const { getRedisClient } = require('../config/performance');
  redisClient = getRedisClient();
} catch (error) {
  console.warn('Redis client not available for monitoring');
}

/**
 * @route   GET /api/monitoring/health/detailed
 * @desc    Detailed health check with all services
 * @access  Public
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: {
          status: 'UP',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
        database: {
          status: 'UNKNOWN',
          type: 'MongoDB',
        },
        cache: {
          status: 'UNKNOWN',
          type: 'Redis',
        },
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024),
          used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
          processUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'Unknown',
          loadAverage: os.loadavg(),
        },
      },
    };

    // Check MongoDB
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        healthStatus.services.database.status = 'UP';
        healthStatus.services.database.host = mongoose.connection.host;
        healthStatus.services.database.name = mongoose.connection.name;
      } else {
        healthStatus.services.database.status = 'DOWN';
      }
    } catch (error) {
      healthStatus.services.database.status = 'ERROR';
      healthStatus.services.database.error = error.message;
    }

    // Check Redis
    if (redisClient) {
      try {
        await redisClient.ping();
        healthStatus.services.cache.status = 'UP';

        // Get Redis info
        const info = await redisClient.info('stats');
        const lines = info.split('\r\n');
        const stats = {};
        lines.forEach(line => {
          const [key, value] = line.split(':');
          if (key && value) {
            stats[key] = value;
          }
        });

        healthStatus.services.cache.stats = {
          connections: parseInt(stats.total_connections_received) || 0,
          commands: parseInt(stats.total_commands_processed) || 0,
          hits: parseInt(stats.keyspace_hits) || 0,
          misses: parseInt(stats.keyspace_misses) || 0,
          hitRate:
            stats.keyspace_hits && stats.keyspace_misses
              ? (
                  (parseInt(stats.keyspace_hits) /
                    (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))) *
                  100
                ).toFixed(2) + '%'
              : 'N/A',
        };
      } catch (error) {
        healthStatus.services.cache.status = 'DOWN';
        healthStatus.services.cache.error = error.message;
      }
    }

    // Overall status
    const allServicesUp = Object.values(healthStatus.services).every(
      service => service.status === 'UP'
    );
    healthStatus.status = allServicesUp ? 'OK' : 'DEGRADED';

    res.status(allServicesUp ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/monitoring/metrics
 * @desc    System performance metrics
 * @access  Public
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        system: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024),
          usagePercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
        },
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        speed: os.cpus()[0]?.speed || 0,
        loadAverage: os.loadavg().map(load => load.toFixed(2)),
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/monitoring/cache/stats
 * @desc    Redis cache statistics
 * @access  Public
 */
router.get('/cache/stats', async (req, res) => {
  if (!redisClient) {
    return res.status(503).json({
      error: 'Redis client not available',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const info = await redisClient.info('stats');
    const memory = await redisClient.info('memory');

    const parseInfo = infoStr => {
      const lines = infoStr.split('\r\n');
      const data = {};
      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          data[key] = value;
        }
      });
      return data;
    };

    const stats = parseInfo(info);
    const memStats = parseInfo(memory);

    const hits = parseInt(stats.keyspace_hits) || 0;
    const misses = parseInt(stats.keyspace_misses) || 0;
    const total = hits + misses;

    res.json({
      timestamp: new Date().toISOString(),
      connections: {
        received: parseInt(stats.total_connections_received) || 0,
        current: parseInt(stats.connected_clients) || 0,
      },
      commands: {
        processed: parseInt(stats.total_commands_processed) || 0,
        perSecond: parseFloat(stats.instantaneous_ops_per_sec) || 0,
      },
      cache: {
        hits,
        misses,
        total,
        hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : 'N/A',
      },
      memory: {
        used: memStats.used_memory_human || 'N/A',
        peak: memStats.used_memory_peak_human || 'N/A',
        fragmentation: parseFloat(memStats.mem_fragmentation_ratio) || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/monitoring/dashboard
 * @desc    Combined dashboard data
 * @access  Public
 */
router.get('/dashboard', async (req, res) => {
  try {
    const mongoose = require('mongoose');

    const dashboard = {
      timestamp: new Date().toISOString(),
      status: 'OK',
      services: {
        api: process.uptime() > 0,
        database: mongoose.connection.readyState === 1,
        cache: false,
      },
      performance: {
        uptime: formatUptime(process.uptime()),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        cpuCores: os.cpus().length,
      },
      cache: {
        enabled: !!redisClient,
        stats: null,
      },
    };

    // Redis stats
    if (redisClient) {
      try {
        await redisClient.ping();
        dashboard.services.cache = true;

        const info = await redisClient.info('stats');
        const stats = {};
        info.split('\r\n').forEach(line => {
          const [key, value] = line.split(':');
          if (key && value) stats[key] = value;
        });

        const hits = parseInt(stats.keyspace_hits) || 0;
        const misses = parseInt(stats.keyspace_misses) || 0;

        dashboard.cache.stats = {
          hitRate: hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(2) + '%' : 'N/A',
          commands: parseInt(stats.total_commands_processed) || 0,
        };
      } catch (error) {
        dashboard.services.cache = false;
      }
    }

    dashboard.status = Object.values(dashboard.services).every(v => v === true) ? 'OK' : 'DEGRADED';

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;

