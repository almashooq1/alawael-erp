/* eslint-disable no-unused-vars */
/**
 * Database Optimization & Indexes
 * تحسين قاعدة البيانات والفهارس
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Create MongoDB indexes for better performance
 * إنشاء فهارس MongoDB لتحسين الأداء
 */
const createIndexes = async () => {
  try {
    // console.log('🔍 Creating MongoDB indexes...');

    // User indexes
    const User = mongoose.model('User');
    if (User) {
      await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
      await User.collection.createIndex({ role: 1 }, { background: true });
      await User.collection.createIndex({ isActive: 1 }, { background: true });
      await User.collection.createIndex({ createdAt: -1 }, { background: true });
      // console.log('✅ User indexes created');
    }

    // Add more model indexes as needed
    // Example for other models:
    /*
    const Employee = mongoose.model('Employee');
    if (Employee) {
      await Employee.collection.createIndex({ employeeId: 1 }, { unique: true, background: true });
      await Employee.collection.createIndex({ department: 1, status: 1 }, { background: true });
      console.log('✅ Employee indexes created');
    }
    */

    // console.log('✅ All indexes created successfully');
  } catch (error) {
    logger.error('❌ Error creating indexes:', error.message);
    // Don't throw - let the app continue even if indexes fail
  }
};

/**
 * MongoDB connection options
 */
const mongooseOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,

  // Compression
  compressors: ['zlib'],
  zlibCompressionLevel: 6,

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Auto index in production
  autoIndex: process.env.NODE_ENV !== 'production',
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
 * Database health check
 */
const checkDatabaseHealth = async () => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    return {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      state: states[dbState] || 'unknown',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections).length,
    };
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
