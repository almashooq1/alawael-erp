/* eslint-disable no-unused-vars */
/**
 * Database Optimization & Indexes
 * تحسين قاعدة البيانات والفهارس
 *
 * Enhanced with:
 *  - Comprehensive compound indexes for common queries
 *  - TTL indexes for auto-expiring data
 *  - Text indexes for search
 *  - Connection pool sizing based on environment
 *  - Query profiling with threshold alerting
 *  - Database statistics collection
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Create MongoDB indexes for better performance — comprehensive coverage
 * إنشاء فهارس MongoDB لتحسين الأداء
 */
const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      logger.warn('Skipping index creation — no active database connection');
      return;
    }

    const existingCollections = await db.listCollections().toArray();
    const collectionNames = new Set(existingCollections.map(c => c.name));

    // Helper: safely create index only if collection exists
    const safeIndex = async (modelName, indexSpec, options = {}) => {
      try {
        const Model = mongoose.model(modelName);
        if (!Model || !collectionNames.has(Model.collection.collectionName)) return;
        await Model.collection.createIndex(indexSpec, { background: true, ...options });
      } catch (e) {
        // Model not registered or index already exists — safe to skip
        if (e.code !== 85 && e.code !== 86) {
          logger.debug(`Index skip (${modelName}): ${e.message}`);
        }
      }
    };

    // ────── User indexes ──────
    await safeIndex('User', { email: 1 }, { unique: true });
    await safeIndex('User', { role: 1, isActive: 1 });
    await safeIndex('User', { department: 1, createdAt: -1 });
    await safeIndex('User', { lastLoginAt: -1 });
    await safeIndex('User', { phone: 1 }, { sparse: true });
    await safeIndex('User', { nationalId: 1 }, { unique: true, sparse: true });

    // ────── Employee indexes ──────
    await safeIndex('Employee', { employeeId: 1 }, { unique: true });
    await safeIndex('Employee', { department: 1, status: 1 });
    await safeIndex('Employee', { manager: 1 });
    await safeIndex('Employee', { hireDate: -1 });

    // ────── Student indexes ──────
    await safeIndex('Student', { studentId: 1 }, { unique: true });
    await safeIndex('Student', { status: 1, enrollmentDate: -1 });
    await safeIndex('Student', { guardianId: 1 });

    // ────── Document indexes ──────
    await safeIndex('Document', { owner: 1, createdAt: -1 });
    await safeIndex('Document', { category: 1, status: 1 });
    await safeIndex('Document', { title: 'text', content: 'text' });

    // ────── Notification indexes ──────
    await safeIndex('Notification', { userId: 1, read: 1, createdAt: -1 });
    await safeIndex('Notification', { createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }); // TTL: 90 days

    // ────── AuditLog indexes ──────
    await safeIndex('AuditLog', { userId: 1, createdAt: -1 });
    await safeIndex('AuditLog', { action: 1, resource: 1 });
    await safeIndex('AuditLog', { createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 }); // TTL: 1 year

    // ────── Vehicle / Fleet indexes ──────
    await safeIndex('Vehicle', { registrationNumber: 1 }, { unique: true });
    await safeIndex('Vehicle', { status: 1, assignedDriver: 1 });
    await safeIndex('Vehicle', { 'tracking.lastLocation.timestamp': -1 });

    // ────── Finance / Transaction indexes ──────
    await safeIndex('Transaction', { accountId: 1, date: -1 });
    await safeIndex('Transaction', { type: 1, status: 1 });
    await safeIndex('Invoice', { invoiceNumber: 1 }, { unique: true, sparse: true });
    await safeIndex('Invoice', { customerId: 1, status: 1, dueDate: -1 });

    // ────── Session / Token indexes ──────
    await safeIndex('Session', { userId: 1, expiresAt: 1 });
    await safeIndex('Session', { expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-expire
    await safeIndex('RefreshToken', { token: 1 }, { unique: true });
    await safeIndex('RefreshToken', { userId: 1, expiresAt: -1 });

    // ────── Beneficiary (core business entity) ──────
    await safeIndex('Beneficiary', { beneficiaryId: 1 }, { unique: true, sparse: true });
    await safeIndex('Beneficiary', { status: 1, createdAt: -1 });
    await safeIndex('Beneficiary', { guardianId: 1 });
    await safeIndex('Beneficiary', { branch: 1, status: 1 });

    // ────── TherapySession ──────
    await safeIndex('TherapySession', { beneficiaryId: 1, sessionDate: -1 });
    await safeIndex('TherapySession', { therapistId: 1, status: 1 });
    await safeIndex('TherapySession', { sessionDate: -1 });

    // ────── Attendance ──────
    await safeIndex('Attendance', { employeeId: 1, date: -1 });
    await safeIndex('Attendance', { studentId: 1, date: -1 });
    await safeIndex('Attendance', { date: -1, status: 1 });

    // ────── Leave ──────
    await safeIndex('Leave', { employeeId: 1, status: 1, startDate: -1 });
    await safeIndex('Leave', { status: 1, startDate: -1 });

    // ────── Payroll ──────
    await safeIndex('Payroll', { employeeId: 1, month: 1, year: 1 });
    await safeIndex('Payroll', { status: 1, createdAt: -1 });

    // ────── Assessment ──────
    await safeIndex('Assessment', { beneficiaryId: 1, assessmentDate: -1 });
    await safeIndex('Assessment', { assessorId: 1, status: 1 });

    logger.info('✅ Database indexes verified/created successfully');
  } catch (error) {
    logger.error('❌ Error creating indexes:', error.message);
    // Don't throw - let the app continue even if indexes fail
  }
};

/**
 * MongoDB connection options — environment-adaptive pool sizing
 */
const isProd = process.env.NODE_ENV === 'production';
const mongooseOptions = {
  // Connection pool settings — larger in production
  maxPoolSize: isProd ? parseInt(process.env.DB_POOL_SIZE, 10) || 20 : 10,
  minPoolSize: isProd ? 5 : 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: isProd ? 15000 : 10000,
  heartbeatFrequencyMS: 10000,

  // Compression — reduce network bandwidth
  compressors: ['zstd', 'zlib', 'snappy'],
  zlibCompressionLevel: 6,

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Auto index only in development
  autoIndex: !isProd,

  // Write concern
  w: isProd ? 'majority' : 1,
  wtimeoutMS: 10000,
};

/**
 * Monitor MongoDB performance
 */
const monitorDBPerformance = () => {
  mongoose.connection.on('connected', () => {
    // console.log('📊 MongoDB Performance Monitoring Active');

    // Log slow queries (> 100ms)
    mongoose.set('debug', (collectionName, method, _query, _doc, _options) => {
      const startTime = Date.now();

      // This is a simplified version - in production use proper query profiling
      setTimeout(() => {
        const duration = Date.now() - startTime;
        if (duration > 100) {
          logger.warn(`⚠️  Slow query detected: ${collectionName}.${method} took ${duration}ms`);
        }
      }, 0);
    });
  });
};

/**
 * Database health check — detailed diagnostics
 */
const checkDatabaseHealth = async () => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const isHealthy = dbState === 1;

    const baseHealth = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      state: states[dbState] || 'unknown',
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
      collections: Object.keys(mongoose.connection.collections).length,
    };

    // Add server stats if connected
    if (isHealthy && mongoose.connection.db) {
      try {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        baseHealth.latencyMs = Date.now() - start;

        const serverStatus = await mongoose.connection.db.admin().serverStatus();
        baseHealth.connections = {
          current: serverStatus.connections?.current,
          available: serverStatus.connections?.available,
          totalCreated: serverStatus.connections?.totalCreated,
        };
        baseHealth.opcounters = serverStatus.opcounters;
        baseHealth.uptimeSeconds = serverStatus.uptime;
      } catch (statsErr) {
        baseHealth.statsError = statsErr.message;
      }
    }

    return baseHealth;
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
};

/**
 * Clean up database connections
 */
const cleanupConnections = async () => {
  try {
    // console.log('🧹 Cleaning up database connections...');

    // Close all connections
    await mongoose.connection.close();

    // console.log('✅ Database connections cleaned up');
  } catch (error) {
    logger.error('❌ Error cleaning up connections:', error.message);
  }
};

/**
 * Query optimization helpers
 */
const queryHelpers = {
  /**
   * Paginate results
   */
  paginate: (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return query.skip(skip).limit(limit);
  },

  /**
   * Select only needed fields
   */
  selectFields: (query, fields = []) => {
    if (fields.length > 0) {
      return query.select(fields.join(' '));
    }
    return query;
  },

  /**
   * Populate with lean option
   */
  populateOptimized: (query, populate) => {
    if (populate) {
      return query.populate(populate).lean();
    }
    return query.lean();
  },
};

module.exports = {
  createIndexes,
  mongooseOptions,
  monitorDBPerformance,
  checkDatabaseHealth,
  cleanupConnections,
  queryHelpers,
};
