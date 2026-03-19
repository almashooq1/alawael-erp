/* eslint-disable no-unused-vars */
/**
 * خدمة النسخ المتماثل لقاعدة البيانات - Database Replication Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 * للتعافي من الكوارث والتوافر العالي
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class DatabaseReplicationService extends EventEmitter {
  constructor() {
    super();
    this.isReplicating = false;
    this.replicas = [];
    this.primaryConnection = null;
    this.secondaryConnections = [];
    this.config = {
      replicationLagThreshold: 5000, // 5 ثواني
      healthCheckInterval: 30000, // 30 ثانية
      autoFailover: true,
      retryAttempts: 3,
      retryDelay: 1000,
    };
    this.status = {
      primary: null,
      secondaries: [],
      lastSync: null,
      replicationLag: 0,
      health: 'unknown',
    };
  }

  // تهيئة خدمة النسخ المتماثل
  async initialize(primaryUri, replicaUris = []) {
    logger.info('🔄 تهيئة خدمة النسخ المتماثل...');

    try {
      // الاتصال بالسيرفر الأساسي
      this.primaryConnection = await this.createConnection(primaryUri, 'primary');
      this.status.primary = {
        uri: this.maskUri(primaryUri),
        connected: true,
        lastPing: new Date(),
      };

      // الاتصال بالسيرفرات الثانوية
      for (let i = 0; i < replicaUris.length; i++) {
        const conn = await this.createConnection(replicaUris[i], `secondary-${i}`);
        this.secondaryConnections.push(conn);
        this.status.secondaries.push({
          uri: this.maskUri(replicaUris[i]),
          connected: true,
          lastPing: new Date(),
        });
      }

      // بدء فحص الصحة
      this.startHealthCheck();

      this.isReplicating = true;
      this.status.health = 'healthy';

      logger.info(`✅ تم تهيئة النسخ المتماثل: 1 أساسي + ${replicaUris.length} ثانوي`);
      return true;
    } catch (error) {
      logger.error('❌ فشل تهيئة النسخ المتماثل:', error.message);
      this.status.health = 'unhealthy';
      return false;
    }
  }

  // إنشاء اتصال
  async createConnection(uri, name) {
    const connection = mongoose.createConnection(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });

    connection.on('connected', () => {
      logger.info(`📡 ${name} متصل`);
    });

    connection.on('disconnected', () => {
      logger.info(`📡 ${name} غير متصل`);
      this.emit('replica-disconnected', { name });
    });

    connection.on('error', err => {
      logger.error(`❌ خطأ في ${name}:`, err.message);
      this.emit('replica-error', { name, error: err });
    });

    return connection;
  }

  // بدء فحص الصحة
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  // فحص صحة النسخ المتماثل
  async performHealthCheck() {
    const results = {
      primary: null,
      secondaries: [],
      timestamp: new Date(),
    };

    // فحص السيرفر الأساسي
    try {
      if (this.primaryConnection) {
        const start = Date.now();
        await this.primaryConnection.db.admin().ping();
        const latency = Date.now() - start;

        results.primary = {
          status: 'healthy',
          latency,
          lastPing: new Date(),
        };

        this.status.primary.connected = true;
        this.status.primary.lastPing = new Date();
      }
    } catch (error) {
      results.primary = {
        status: 'unhealthy',
        error: 'حدث خطأ داخلي',
      };
      this.status.primary.connected = false;

      // محاولة التحويل التلقائي
      if (this.config.autoFailover && this.secondaryConnections.length > 0) {
        await this.attemptFailover();
      }
    }

    // فحص السيرفرات الثانوية
    for (let i = 0; i < this.secondaryConnections.length; i++) {
      try {
        const start = Date.now();
        await this.secondaryConnections[i].db.admin().ping();
        const latency = Date.now() - start;

        results.secondaries.push({
          index: i,
          status: 'healthy',
          latency,
        });

        this.status.secondaries[i].connected = true;
        this.status.secondaries[i].lastPing = new Date();
      } catch (error) {
        results.secondaries.push({
          index: i,
          status: 'unhealthy',
          error: 'حدث خطأ داخلي',
        });
        this.status.secondaries[i].connected = false;
      }
    }

    // تحديث حالة الصحة العامة
    const healthyCount =
      (results.primary?.status === 'healthy' ? 1 : 0) +
      results.secondaries.filter(s => s.status === 'healthy').length;
    const totalCount = 1 + this.secondaryConnections.length;

    this.status.health =
      healthyCount === totalCount ? 'healthy' : healthyCount > 0 ? 'degraded' : 'critical';

    this.emit('health-check', results);
    return results;
  }

  // محاولة التحويل التلقائي
  async attemptFailover() {
    logger.info('⚠️ محاولة التحويل التلقائي...');

    for (let i = 0; i < this.secondaryConnections.length; i++) {
      try {
        await this.secondaryConnections[i].db.admin().ping();

        // هذا السيرفر الثانوي يعمل - ترقيته إلى أساسي
        const newPrimary = this.secondaryConnections[i];
        const oldPrimary = this.primaryConnection;

        this.primaryConnection = newPrimary;
        this.secondaryConnections[i] = oldPrimary;

        // تحديث الحالة
        const tempStatus = this.status.primary;
        this.status.primary = this.status.secondaries[i];
        this.status.secondaries[i] = tempStatus;

        logger.info(`✅ تم التحويل إلى السيرفر الثانوي ${i}`);

        this.emit('failover', {
          success: true,
          newPrimaryIndex: i,
          timestamp: new Date(),
        });

        return true;
      } catch (error) {
        continue;
      }
    }

    logger.error('❌ فشل التحويل التلقائي - لا يوجد سيرفرات ثانوية متاحة');

    this.emit('failover', {
      success: false,
      error: 'No healthy secondaries available',
      timestamp: new Date(),
    });

    return false;
  }

  // مزامنة البيانات
  async syncData(collections = []) {
    if (!this.primaryConnection || this.secondaryConnections.length === 0) {
      throw new Error('لا يوجد اتصالات للنسخ المتماثل');
    }

    logger.info('🔄 بدء مزامنة البيانات...');
    const results = {
      startTime: new Date(),
      collections: [],
      errors: [],
    };

    try {
      // الحصول على قائمة المجموعات إذا لم تحدد
      if (collections.length === 0) {
        const list = await this.primaryConnection.db.listCollections().toArray();
        collections = list.map(c => c.name);
      }

      for (const collectionName of collections) {
        try {
          const startTime = Date.now();

          // قراءة البيانات من الأساسي
          const primaryCollection = this.primaryConnection.db.collection(collectionName);
          const data = await primaryCollection.find({}).toArray();

          // كتابة البيانات إلى الثانويات
          for (const secondary of this.secondaryConnections) {
            try {
              const secondaryCollection = secondary.db.collection(collectionName);

              // حذف البيانات القديمة
              await secondaryCollection.deleteMany({});

              // إدراج البيانات الجديدة
              if (data.length > 0) {
                await secondaryCollection.insertMany(data);
              }
            } catch (error) {
              results.errors.push({
                collection: collectionName,
                error: 'حدث خطأ داخلي',
              });
            }
          }

          results.collections.push({
            name: collectionName,
            count: data.length,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          results.errors.push({
            collection: collectionName,
            error: 'حدث خطأ داخلي',
          });
        }
      }

      results.endTime = new Date();
      results.totalDuration = results.endTime - results.startTime;
      this.status.lastSync = results.endTime;

      logger.info(
        `✅ اكتملت المزامنة: ${results.collections.length} مجموعة في ${results.totalDuration}ms`
      );

      this.emit('sync-complete', results);
      return results;
    } catch (error) {
      logger.error('❌ فشلت المزامنة:', error.message);
      throw error;
    }
  }

  // التحقق من التزامن
  async verifySync() {
    const results = {
      consistent: true,
      differences: [],
      timestamp: new Date(),
    };

    if (!this.primaryConnection || this.secondaryConnections.length === 0) {
      return results;
    }

    try {
      const collections = await this.primaryConnection.db.listCollections().toArray();

      for (const col of collections) {
        const primaryCount = await this.primaryConnection.db.collection(col.name).countDocuments();

        for (let i = 0; i < this.secondaryConnections.length; i++) {
          const secondaryCount = await this.secondaryConnections[i].db
            .collection(col.name)
            .countDocuments();

          if (primaryCount !== secondaryCount) {
            results.consistent = false;
            results.differences.push({
              collection: col.name,
              primaryCount,
              secondaryIndex: i,
              secondaryCount,
              difference: primaryCount - secondaryCount,
            });
          }
        }
      }

      return results;
    } catch (error) {
      return {
        consistent: false,
        error: 'حدث خطأ داخلي',
        timestamp: new Date(),
      };
    }
  }

  // الحصول على إحصائيات النسخ المتماثل
  getReplicationStats() {
    return {
      isReplicating: this.isReplicating,
      health: this.status.health,
      primary: this.status.primary,
      secondaries: this.status.secondaries.length,
      lastSync: this.status.lastSync,
      config: {
        autoFailover: this.config.autoFailover,
        replicationLagThreshold: this.config.replicationLagThreshold,
      },
    };
  }

  // إخفاء كلمة المرور من URI
  maskUri(uri) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  }

  // إيقاف خدمة النسخ المتماثل
  async stop() {
    logger.info('⏹️ إيقاف خدمة النسخ المتماثل...');

    clearInterval(this.healthCheckInterval);

    // إغلاق الاتصالات
    if (this.primaryConnection) {
      await this.primaryConnection.close();
    }

    for (const conn of this.secondaryConnections) {
      await conn.close();
    }

    this.isReplicating = false;
    this.status.health = 'stopped';

    logger.info('✅ تم إيقاف خدمة النسخ المتماثل');
  }
}

module.exports = new DatabaseReplicationService();
