/* eslint-disable no-unused-vars */
/**
 * خدمة إدارة اتصالات قاعدة البيانات - Database Connection Pool Manager
 * نظام الألوائل للتأهيل وإعادة التأهيل
 * لإدارة الاتصالات بكفاءة عالية
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class DatabaseConnectionPool extends EventEmitter {
  constructor() {
    super();

    this.pools = new Map();
    this.config = {
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      errors: 0,
    };

    this.healthStatus = 'unknown';
  }

  // إنشاء تجمع اتصالات جديد
  async createPool(name, uri, options = {}) {
    if (this.pools.has(name)) {
      logger.info(`⚠️ تجمع الاتصالات '${name}' موجود بالفعل`);
      return this.pools.get(name);
    }

    const poolConfig = {
      ...this.config,
      ...options,
      maxPoolSize: options.maxPoolSize || this.config.maxPoolSize,
      minPoolSize: options.minPoolSize || this.config.minPoolSize,
    };

    logger.info(`🔗 إنشاء تجمع اتصالات '${name}'...`);

    try {
      const connection = mongoose.createConnection(uri, {
        maxPoolSize: poolConfig.maxPoolSize,
        minPoolSize: poolConfig.minPoolSize,
        maxIdleTimeMS: poolConfig.maxIdleTimeMS,
        waitQueueTimeoutMS: poolConfig.waitQueueTimeoutMS,
        connectTimeoutMS: poolConfig.connectTimeoutMS,
        heartbeatFrequencyMS: poolConfig.heartbeatFrequencyMS,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        retryReads: true,
      });

      // إعداد المستمعين
      connection.on('connected', () => {
        logger.info(`✅ تجمع '${name}' متصل`);
        this.emit('pool-connected', { name });
      });

      connection.on('disconnected', () => {
        logger.info(`⚠️ تجمع '${name}' غير متصل`);
        this.emit('pool-disconnected', { name });
      });

      connection.on('error', err => {
        logger.error(`❌ خطأ في تجمع '${name}':`, err.message);
        this.stats.errors++;
        this.emit('pool-error', { name, error: err });
      });

      // انتظار الاتصال
      await new Promise((resolve, reject) => {
        connection.once('connected', resolve);
        connection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), poolConfig.connectTimeoutMS);
      });

      const pool = {
        name,
        connection,
        config: poolConfig,
        createdAt: new Date(),
        stats: {
          queries: 0,
          errors: 0,
          totalQueryTime: 0,
        },
      };

      this.pools.set(name, pool);
      this.updateStats();

      logger.info(
        `✅ تم إنشاء تجمع '${name}' (${poolConfig.minPoolSize}-${poolConfig.maxPoolSize} اتصالات)`
      );
      return pool;
    } catch (error) {
      logger.error(`❌ فشل إنشاء تجمع '${name}':`, error.message);
      throw error;
    }
  }

  // الحصول على تجمع اتصالات
  getPool(name) {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`تجمع الاتصالات '${name}' غير موجود`);
    }
    return pool;
  }

  // الحصول على اتصال من التجمع
  getConnection(name) {
    const pool = this.getPool(name);
    return pool.connection;
  }

  // تنفيذ استعلام مع تتبع
  async executeQuery(poolName, queryFn) {
    const pool = this.getPool(poolName);
    const startTime = Date.now();

    try {
      const result = await queryFn(pool.connection);

      const duration = Date.now() - startTime;
      pool.stats.queries++;
      pool.stats.totalQueryTime += duration;

      this.emit('query-executed', {
        pool: poolName,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      pool.stats.errors++;
      this.stats.errors++;

      const duration = Date.now() - startTime;
      this.emit('query-error', {
        pool: poolName,
        duration,
        error,
      });

      throw error;
    }
  }

  // تنفيذ معاملة
  async executeTransaction(poolName, transactionFn) {
    const pool = this.getPool(poolName);
    const session = await pool.connection.startSession();

    const startTime = Date.now();

    try {
      let result;
      await session.withTransaction(async () => {
        result = await transactionFn(pool.connection, session);
      });

      const duration = Date.now() - startTime;
      pool.stats.queries++;
      pool.stats.totalQueryTime += duration;

      this.emit('transaction-completed', {
        pool: poolName,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      pool.stats.errors++;
      this.stats.errors++;

      this.emit('transaction-error', {
        pool: poolName,
        error,
      });

      throw error;
    } finally {
      await session.endSession();
    }
  }

  // تحديث الإحصائيات
  updateStats() {
    this.stats.totalConnections = 0;
    this.stats.activeConnections = 0;
    this.stats.idleConnections = 0;

    for (const pool of this.pools.values()) {
      const db = pool.connection.db;
      if (db) {
        // تقدير الاتصالات النشطة
        this.stats.totalConnections += pool.config.maxPoolSize;
      }
    }
  }

  // الحصول على إحصائيات التجمع
  getPoolStats(name) {
    const pool = this.getPool(name);
    const avgQueryTime =
      pool.stats.queries > 0 ? (pool.stats.totalQueryTime / pool.stats.queries).toFixed(2) : 0;

    return {
      name: pool.name,
      createdAt: pool.createdAt,
      config: pool.config,
      queries: pool.stats.queries,
      errors: pool.stats.errors,
      avgQueryTime: `${avgQueryTime}ms`,
      totalQueryTime: pool.stats.totalQueryTime,
    };
  }

  // الحصول على جميع الإحصائيات
  getAllStats() {
    const pools = {};
    for (const [name] of this.pools) {
      pools[name] = this.getPoolStats(name);
    }

    return {
      totalPools: this.pools.size,
      stats: this.stats,
      pools,
    };
  }

  // فحص صحة التجمعات
  async healthCheck() {
    const results = {
      status: 'healthy',
      pools: [],
      timestamp: new Date(),
    };

    for (const [name, pool] of this.pools) {
      try {
        const start = Date.now();
        await pool.connection.db.admin().ping();
        const latency = Date.now() - start;

        const poolHealth = {
          name,
          status: 'healthy',
          latency: `${latency}ms`,
          queries: pool.stats.queries,
          errors: pool.stats.errors,
        };

        // تحديد الحالة بناءً على زمن الاستجابة
        if (latency > 1000) {
          poolHealth.status = 'degraded';
          results.status = 'degraded';
        }

        results.pools.push(poolHealth);
      } catch (error) {
        results.pools.push({
          name,
          status: 'unhealthy',
          error: 'حدث خطأ داخلي',
        });
        results.status = 'unhealthy';
      }
    }

    this.healthStatus = results.status;
    this.emit('health-check', results);

    return results;
  }

  // إغلاق تجمع اتصالات
  async closePool(name) {
    const pool = this.pools.get(name);
    if (!pool) {
      logger.info(`⚠️ تجمع الاتصالات '${name}' غير موجود`);
      return false;
    }

    logger.info(`🔌 إغلاق تجمع '${name}'...`);

    try {
      await pool.connection.close();
      this.pools.delete(name);
      this.updateStats();

      logger.info(`✅ تم إغلاق تجمع '${name}'`);
      this.emit('pool-closed', { name });

      return true;
    } catch (error) {
      logger.error(`❌ فشل إغلاق تجمع '${name}':`, error.message);
      throw error;
    }
  }

  // إغلاق جميع التجمعات
  async closeAll() {
    logger.info('🔌 إغلاق جميع تجمعات الاتصال...');

    const results = {
      closed: [],
      failed: [],
    };

    for (const [name] of this.pools) {
      try {
        await this.closePool(name);
        results.closed.push(name);
      } catch (error) {
        results.failed.push({ name, error: 'حدث خطأ داخلي' });
      }
    }

    this.healthStatus = 'closed';
    logger.info(`✅ تم إغلاق ${results.closed.length} تجمع`);

    return results;
  }

  // إعادة تشكيل التجمع
  async resizePool(name, newConfig) {
    const pool = this.getPool(name);

    // إغلاق التجمع القديم
    await this.closePool(name);

    // إنشاء تجمع جديد بالتكوين الجديد
    const uri = pool.connection._connectionString;
    return this.createPool(name, uri, newConfig);
  }
}

module.exports = new DatabaseConnectionPool();
