/**
 * Advanced Health Check System - نظام الفحص الصحي المتقدم
 * Professional Health Monitoring for Alawael ERP
 */

const mongoose = require('mongoose');
const os = require('os');
const v8 = require('v8');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Health Check Configuration
 */
const config = {
  // Timeout for health checks (ms)
  timeout: 5000,
  
  // Cache duration for health results (ms)
  cacheDuration: 5000,
  
  // Detailed response in development
  detailedInDev: true,
  
  // Components to check
  checks: {
    database: true,
    redis: true,
    memory: true,
    cpu: true,
    disk: true,
    external: true,
  },
};

/**
 * Health Status Enum
 */
const HealthStatus = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded',
};

/**
 * Base Health Check Class
 */
class HealthCheck {
  constructor(name) {
    this.name = name;
    this.lastCheck = null;
    this.lastResult = null;
    this.cacheDuration = config.cacheDuration;
  }
  
  /**
   * Check if cached result is valid
   */
  isCacheValid() {
    if (!this.lastCheck || !this.lastResult) return false;
    return Date.now() - this.lastCheck < this.cacheDuration;
  }
  
  /**
   * Run health check with timeout
   */
  async runWithTimeout(checkFn, timeout = config.timeout) {
    return Promise.race([
      checkFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);
  }
  
  /**
   * Execute health check
   */
  async check() {
    // Return cached result if valid
    if (this.isCacheValid()) {
      return this.lastResult;
    }
    
    const startTime = Date.now();
    
    try {
      const result = await this.runWithTimeout(() => this.performCheck());
      const responseTime = Date.now() - startTime;
      
      this.lastCheck = Date.now();
      this.lastResult = {
        name: this.name,
        status: HealthStatus.HEALTHY,
        responseTime,
        ...result,
        timestamp: new Date().toISOString(),
      };
      
      return this.lastResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.lastCheck = Date.now();
      this.lastResult = {
        name: this.name,
        status: HealthStatus.UNHEALTHY,
        responseTime,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      
      return this.lastResult;
    }
  }
  
  /**
   * Perform actual check (to be overridden)
   */
  async performCheck() {
    return {};
  }
}

/**
 * Database Health Check
 */
class DatabaseHealthCheck extends HealthCheck {
  constructor() {
    super('database');
  }
  
  async performCheck() {
    const connection = mongoose.connection;
    
    // Check if connected
    if (connection.readyState !== 1) {
      throw new Error(`Database not connected. State: ${connection.readyState}`);
    }
    
    // Run a simple command to verify connection
    const adminDb = connection.db.admin();
    const result = await adminDb.ping();
    
    // Get database stats
    const stats = await connection.db.stats();
    
    return {
      connected: true,
      database: connection.name,
      host: connection.host,
      port: connection.port,
      collections: stats.collections,
      dataSize: this.formatBytes(stats.dataSize),
      indexSize: this.formatBytes(stats.indexSize),
      connections: mongoose.connections.length,
    };
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Redis Health Check
 */
class RedisHealthCheck extends HealthCheck {
  constructor(redisClient) {
    super('redis');
    this.client = redisClient;
  }
  
  async performCheck() {
    if (!this.client) {
      throw new Error('Redis client not configured');
    }
    
    // Ping Redis
    const pong = await this.client.ping();
    
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
    
    // Get Redis info
    const info = await this.client.info();
    const memoryInfo = this.parseRedisInfo(info);
    
    return {
      connected: true,
      version: memoryInfo.redis_version,
      uptime: `${memoryInfo.uptime_in_seconds}s`,
      connectedClients: parseInt(memoryInfo.connected_clients),
      usedMemory: memoryInfo.used_memory_human,
      totalConnections: parseInt(memoryInfo.total_connections_received),
    };
  }
  
  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    });
    
    return result;
  }
}

/**
 * Memory Health Check
 */
class MemoryHealthCheck extends HealthCheck {
  constructor(options = {}) {
    super('memory');
    this.warningThreshold = options.warningThreshold || 80; // 80%
    this.criticalThreshold = options.criticalThreshold || 95; // 95%
  }
  
  async performCheck() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Heap statistics
    const heapStats = v8.getHeapStatistics();
    const heapUsagePercent = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100;
    
    // Process memory
    const processMemory = process.memoryUsage();
    
    let status = HealthStatus.HEALTHY;
    if (memoryUsagePercent > this.criticalThreshold || heapUsagePercent > this.criticalThreshold) {
      status = HealthStatus.UNHEALTHY;
    } else if (memoryUsagePercent > this.warningThreshold || heapUsagePercent > this.warningThreshold) {
      status = HealthStatus.DEGRADED;
    }
    
    return {
      system: {
        total: this.formatBytes(totalMemory),
        used: this.formatBytes(usedMemory),
        free: this.formatBytes(freeMemory),
        usagePercent: memoryUsagePercent.toFixed(2) + '%',
      },
      heap: {
        used: this.formatBytes(heapStats.used_heap_size),
        limit: this.formatBytes(heapStats.heap_size_limit),
        usagePercent: heapUsagePercent.toFixed(2) + '%',
      },
      process: {
        rss: this.formatBytes(processMemory.rss),
        heapTotal: this.formatBytes(processMemory.heapTotal),
        heapUsed: this.formatBytes(processMemory.heapUsed),
        external: this.formatBytes(processMemory.external),
      },
      status,
    };
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * CPU Health Check
 */
class CpuHealthCheck extends HealthCheck {
  constructor(options = {}) {
    super('cpu');
    this.warningThreshold = options.warningThreshold || 70; // 70%
    this.criticalThreshold = options.criticalThreshold || 90; // 90%
    this.previousCpuInfo = null;
  }
  
  async performCheck() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const numCpus = cpus.length;
    
    // Calculate CPU usage
    const cpuUsage = await this.getCpuUsage();
    
    let status = HealthStatus.HEALTHY;
    if (cpuUsage > this.criticalThreshold) {
      status = HealthStatus.UNHEALTHY;
    } else if (cpuUsage > this.warningThreshold) {
      status = HealthStatus.DEGRADED;
    }
    
    return {
      model: cpus[0].model,
      cores: numCpus,
      speed: cpus[0].speed + ' MHz',
      loadAverage: {
        '1m': loadAvg[0].toFixed(2),
        '5m': loadAvg[1].toFixed(2),
        '15m': loadAvg[2].toFixed(2),
      },
      usage: cpuUsage.toFixed(2) + '%',
      status,
    };
  }
  
  async getCpuUsage() {
    return new Promise((resolve) => {
      const stats1 = this.getCpuInfo();
      
      setTimeout(() => {
        const stats2 = this.getCpuInfo();
        const idleDiff = stats2.idle - stats1.idle;
        const totalDiff = stats2.total - stats1.total;
        const usage = 100 - (100 * idleDiff / totalDiff);
        resolve(usage);
      }, 100);
    });
  }
  
  getCpuInfo() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    });
    
    return { idle, total };
  }
}

/**
 * Disk Health Check
 */
class DiskHealthCheck extends HealthCheck {
  constructor(options = {}) {
    super('disk');
    this.warningThreshold = options.warningThreshold || 80; // 80%
    this.criticalThreshold = options.criticalThreshold || 95; // 95%
    this.path = options.path || '/';
  }
  
  async performCheck() {
    try {
      // Check disk usage (Linux/Mac)
      const { stdout } = await execAsync(`df -h ${this.path} | tail -1`);
      const parts = stdout.trim().split(/\s+/);
      
      const total = parts[1];
      const used = parts[2];
      const available = parts[3];
      const usagePercent = parseInt(parts[4]);
      
      let status = HealthStatus.HEALTHY;
          if (usagePercent > this.criticalThreshold) {
        status = HealthStatus.UNHEALTHY;
      } else if (usagePercent > this.warningThreshold) {
        status = HealthStatus.DEGRADED;
      }
      
      return {
        path: this.path,
        total,
        used,
        available,
        usage: usagePercent + '%',
        status,
      };
    } catch (error) {
      // Fallback for Windows or when df is not available
      return {
        path: this.path,
        status: HealthStatus.HEALTHY,
        note: 'Disk usage check not available on this platform',
      };
    }
  }
}

/**
 * External Services Health Check
 */
class ExternalServicesHealthCheck extends HealthCheck {
  constructor(services = []) {
    super('external');
    this.services = services;
  }
  
  addService(name, checkFn) {
    this.services.push({ name, check: checkFn });
  }
  
  async performCheck() {
    const results = {};
    let overallStatus = HealthStatus.HEALTHY;
    
    for (const service of this.services) {
      try {
        const result = await this.runWithTimeout(
          () => service.check(),
          config.timeout
        );
        results[service.name] = {
          status: HealthStatus.HEALTHY,
          ...result,
        };
      } catch (error) {
        results[service.name] = {
          status: HealthStatus.UNHEALTHY,
          error: error.message,
        };
        overallStatus = HealthStatus.DEGRADED;
      }
    }
    
    return {
      services: results,
      overallStatus,
    };
  }
}

/**
 * Health Check Manager
 */
class HealthCheckManager {
  constructor() {
    this.checks = new Map();
    this.livenessChecks = [];
    this.readinessChecks = [];
    
    // Add default checks
    this.addCheck('database', new DatabaseHealthCheck());
    this.addCheck('memory', new MemoryHealthCheck());
    this.addCheck('cpu', new CpuHealthCheck());
    this.addCheck('disk', new DiskHealthCheck());
  }
  
  /**
   * Add health check
   */
  addCheck(name, check) {
    this.checks.set(name, check);
  }
  
  /**
   * Remove health check
   */
  removeCheck(name) {
    this.checks.delete(name);
  }
  
  /**
   * Configure Redis check
   */
  configureRedis(client) {
    this.addCheck('redis', new RedisHealthCheck(client));
  }
  
  /**
   * Configure external services check
   */
  configureExternalServices(services) {
    this.addCheck('external', new ExternalServicesHealthCheck(services));
  }
  
  /**
   * Run all health checks
   */
  async runAll() {
    const startTime = Date.now();
    const results = {};
    let overallStatus = HealthStatus.HEALTHY;
    
    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, check]) => {
        const result = await check.check();
        return [name, result];
      }
    );
    
    const checkResults = await Promise.allSettled(checkPromises);
    
    checkResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const [name, checkResult] = result.value;
        results[name] = checkResult;
        
        if (checkResult.status === HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.UNHEALTHY;
        } else if (checkResult.status === HealthStatus.DEGRADED && overallStatus !== HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseTime,
      checks: results,
    };
  }
  
  /**
   * Run liveness check (is the service running?)
   */
  async liveness() {
    // Basic check - if we can respond, we're alive
    return {
      status: HealthStatus.HEALTHY,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
  
  /**
   * Run readiness check (is the service ready to accept traffic?)
   */
  async readiness() {
    const criticalChecks = ['database'];
    const results = {};
    let isReady = true;
    
    for (const checkName of criticalChecks) {
      const check = this.checks.get(checkName);
      if (check) {
        const result = await check.check();
        results[checkName] = result;
        
        if (result.status === HealthStatus.UNHEALTHY) {
          isReady = false;
        }
      }
    }
    
    return {
      status: isReady ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }
  
  /**
   * Express middleware for health endpoint
   */
  healthMiddleware() {
    return async (req, res) => {
      const health = await this.runAll();
      
      const statusCode = health.status === HealthStatus.HEALTHY ? 200 :
                         health.status === HealthStatus.DEGRADED ? 200 : 503;
      
      res.status(statusCode).json(health);
    };
  }
  
  /**
   * Express middleware for liveness endpoint
   */
  livenessMiddleware() {
    return async (req, res) => {
      const liveness = await this.liveness();
      res.status(200).json(liveness);
    };
  }
  
  /**
   * Express middleware for readiness endpoint
   */
  readinessMiddleware() {
    return async (req, res) => {
      const readiness = await this.readiness();
      const statusCode = readiness.status === HealthStatus.HEALTHY ? 200 : 503;
      res.status(statusCode).json(readiness);
    };
  }
  
  /**
   * Setup health check routes
   */
  setupRoutes(app) {
    app.get('/health', this.healthMiddleware());
    app.get('/healthz', this.livenessMiddleware());
    app.get('/readyz', this.readinessMiddleware());
    
    // Detailed health check (for monitoring dashboards)
    app.get('/health/details', async (req, res) => {
      const health = await this.runAll();
      res.json({
        ...health,
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          hostname: os.hostname(),
          cpus: os.cpus().length,
          totalMemory: os.totalmem(),
          networkInterfaces: Object.keys(os.networkInterfaces()),
        },
      });
    });
  }
}

// Create singleton instance
const healthManager = new HealthCheckManager();

module.exports = {
  HealthCheckManager,
  healthManager,
  HealthStatus,
  DatabaseHealthCheck,
  RedisHealthCheck,
  MemoryHealthCheck,
  CpuHealthCheck,
  DiskHealthCheck,
  ExternalServicesHealthCheck,
  config,
};