/**
 * ============================================
 * HEALTH CHECK SERVICE
 * خدمة فحص صحة النظام
 * ============================================
 */

const mongoose = require('mongoose');
const redis = require('redis');
const os = require('os');
const http = require('http');

class HealthCheckService {
  constructor() {
    this.healthStatus = {
      overall: 'healthy',
      timestamp: new Date(),
      checks: {},
    };

    this.thresholds = {
      memoryUsage: 80, // percent
      cpuUsage: 80, // percent
      responseTime: 1000, // ms
      databaseLatency: 500, // ms
    };
  }

  /**
   * 1️⃣ DATABASE HEALTH
   */

  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();

      // Check connection
      const state = mongoose.connection.readyState;
      const connected = state === 1; // 1 = connected

      // Ping database
      if (connected) {
        const result = await mongoose.connection.db.admin().ping();
        const latency = Date.now() - startTime;

        return {
          status: 'healthy',
          connected: true,
          latency: `${latency}ms`,
          responseTime: latency,
          database: mongoose.connection.name,
          host: mongoose.connection.host,
          timestamp: new Date(),
        };
      }

      return {
        status: 'unhealthy',
        connected: false,
        error: 'Database not connected',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 2️⃣ CACHE/REDIS HEALTH
   */

  async checkRedisHealth() {
    try {
      const redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
      });

      const startTime = Date.now();

      // Test ping
      const result = await new Promise((resolve, reject) => {
        redisClient.ping((err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });

      const latency = Date.now() - startTime;

      redisClient.quit();

      return {
        status: result === 'PONG' ? 'healthy' : 'unhealthy',
        connection: 'active',
        latency: `${latency}ms`,
        responseTime: latency,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `Redis unavailable: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 3️⃣ SYSTEM RESOURCES
   */

  checkSystemResources() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - ~~((100 * totalIdle) / totalTick);

    return {
      status: memoryUsagePercent > this.thresholds.memoryUsage ? 'warning' : 'healthy',
      cpu: {
        usage: `${cpuUsage}%`,
        cores: cpus.length,
      },
      memory: {
        total: `${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        used: `${(usedMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        free: `${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        available: memoryUsagePercent < this.thresholds.memoryUsage,
      },
      uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
      timestamp: new Date(),
    };
  }

  /**
   * 4️⃣ API ENDPOINTS HEALTH
   */

  async checkEndpointHealth() {
    const endpoints = [
      { name: 'auth', url: 'http://localhost:3000/api/auth/health' },
      { name: 'users', url: 'http://localhost:3000/api/users/health' },
      { name: 'products', url: 'http://localhost:3000/api/products/health' },
      { name: 'orders', url: 'http://localhost:3000/api/orders/health' },
      { name: 'accounting', url: 'http://localhost:3000/api/accounting/health' },
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await new Promise((resolve, reject) => {
          const req = http.get(endpoint.url, res => {
            const responseTime = Date.now() - startTime;
            resolve({
              status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
              statusCode: res.statusCode,
              responseTime: `${responseTime}ms`,
            });
          });
          req.on('error', reject);
          req.setTimeout(5000);
        });

        results[endpoint.name] = response;
      } catch (error) {
        results[endpoint.name] = {
          status: 'unhealthy',
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * 5️⃣ DATABASE COLLECTIONS STATUS
   */

  async checkDatabaseCollections() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      const results = {};

      for (const collection of collections) {
        const col = db.collection(collection.name);
        const count = await col.countDocuments();
        const size = await col.stats();

        results[collection.name] = {
          documents: count,
          size: `${(size.size / 1024).toFixed(2)} KB`,
          indexes: size.nindexes || 0,
        };
      }

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 6️⃣ COMPREHENSIVE HEALTH CHECK
   */

  async runFullHealthCheck() {
    try {
      const [dbHealth, redisHealth, systemResources, endpointHealth, collectionStatus] =
        await Promise.all([
          this.checkDatabaseHealth(),
          this.checkRedisHealth(),
          Promise.resolve(this.checkSystemResources()),
          this.checkEndpointHealth(),
          this.checkDatabaseCollections(),
        ]);

      // Determine overall status
      const statuses = [dbHealth.status, redisHealth.status, systemResources.status];

      let overallStatus = 'healthy';
      if (statuses.includes('unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (statuses.includes('warning')) {
        overallStatus = 'degraded';
      }

      const report = {
        timestamp: new Date(),
        overallStatus: overallStatus,
        components: {
          database: dbHealth,
          cache: redisHealth,
          system: systemResources,
          endpoints: endpointHealth,
          collections: collectionStatus,
        },
        recommendations: this.generateRecommendations({
          db: dbHealth,
          redis: redisHealth,
          system: systemResources,
        }),
        nextCheckIn: new Date(Date.now() + 60000), // Next check in 1 minute
      };

      return report;
    } catch (error) {
      return {
        timestamp: new Date(),
        overallStatus: 'error',
        error: error.message,
      };
    }
  }

  /**
   * 7️⃣ RECOMMENDATIONS GENERATION
   */

  generateRecommendations(checks) {
    const recommendations = [];

    // Database recommendations
    if (checks.db.status !== 'healthy') {
      recommendations.push({
        type: 'critical',
        component: 'database',
        message: 'Database connection issue detected',
        action: 'Check MongoDB Atlas status and network connectivity',
      });
    } else if (checks.db.responseTime > this.thresholds.databaseLatency) {
      recommendations.push({
        type: 'warning',
        component: 'database',
        message: 'Database latency exceeds threshold',
        action: 'Review slow queries and consider adding indexes',
      });
    }

    // Redis recommendations
    if (checks.redis.status !== 'healthy') {
      recommendations.push({
        type: 'warning',
        component: 'cache',
        message: 'Redis cache unavailable',
        action: 'Check Redis connection and consider failover',
      });
    }

    // Memory recommendations
    if (checks.system.memory.usagePercent > 85) {
      recommendations.push({
        type: 'critical',
        component: 'system',
        message: 'Memory usage critically high',
        action: 'Review application memory leaks and consider scaling',
      });
    } else if (checks.system.memory.usagePercent > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'warning',
        component: 'system',
        message: 'Memory usage above threshold',
        action: 'Monitor memory trends and optimize if necessary',
      });
    }

    // CPU recommendations
    if (checks.system.cpu.usage > 90) {
      recommendations.push({
        type: 'critical',
        component: 'system',
        message: 'CPU usage critically high',
        action: 'Investigate processes and consider load distribution',
      });
    }

    return recommendations;
  }

  /**
   * 8️⃣ HEALTH CHECK HISTORY
   */

  getHealthHistory() {
    // This would typically be stored in database
    return {
      lastCheck: this.healthStatus.timestamp,
      checksToday: 24,
      averageResponseTime: '245ms',
      uptimePercentage: '99.9%',
      incidents: 0,
    };
  }

  /**
   * 9️⃣ SETUP AUTO HEALTH CHECK
   */

  setupAutoHealthCheck(intervalMinutes = 5) {
    setInterval(
      async () => {
        try {
          const report = await this.runFullHealthCheck();
          this.healthStatus = report;

          if (report.overallStatus !== 'healthy') {
            console.warn(`⚠️  Health check warning: ${report.overallStatus}`);
            // Send alert/notification
          } else {
            console.log(`✅ Health check passed: ${new Date().toISOString()}`);
          }
        } catch (error) {
          console.error(`❌ Health check failed: ${error.message}`);
        }
      },
      intervalMinutes * 60 * 1000
    );

    console.log(`✅ Auto health check configured (every ${intervalMinutes} minutes)`);
  }

  /**
   * 🔟 GET CURRENT STATUS
   */

  getCurrentStatus() {
    return {
      timestamp: new Date(),
      status: this.healthStatus.overallStatus,
      lastCheck: this.healthStatus.timestamp,
      components: this.healthStatus.checks,
    };
  }
}

module.exports = new HealthCheckService();
