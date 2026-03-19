/* eslint-disable no-unused-vars */
/**
 * ============================================
 * PRODUCTION DATABASE CONFIGURATION
 * تكوين قاعدة البيانات الإنتاجية
 * ============================================
 */

const mongoose = require('mongoose');
const path = require('path');
const logger = require('../utils/logger');

class ProductionDatabase {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.mongodbAtlasUri = process.env.MONGODB_ATLAS_URI;
    this.connectionPool = null;
  }

  /**
   * 1️⃣ CONNECTION OPTIONS
   */

  getConnectionOptions() {
    return {
      // Connection Pool
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 45000,

      // Timeouts
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,

      // Retry Logic
      retryWrites: true,
      retryReads: true,
      w: 'majority', // Write concern

      // Application Settings
      appName: 'ERP-System-Production',

      // TLS/SSL for Atlas
      tls: true,
      tlsAllowInvalidCertificates: false,

      // Compression
      compressors: ['snappy', 'zlib'],

      // Read Preference
      readPreference: 'secondaryPreferred',
      readConcern: { level: 'majority' },

      // Journal
      journal: true,

      // Replica Set
      replicaSet: process.env.MONGODB_REPLICA_SET,

      // Server API
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
    };
  }

  /**
   * 2️⃣ ESTABLISH CONNECTION
   */

  async connect() {
    try {
      const uri = this.mongodbAtlasUri || this.mongoUri;

      logger.info('🔗 Connecting to MongoDB Atlas...');

      const connection = await mongoose.connect(uri, this.getConnectionOptions());

      logger.info(`✅ Connected to MongoDB: ${connection.connection.host}`);

      // Setup event listeners
      this.setupEventListeners();

      // Setup indexes
      await this.setupIndexes();

      // Setup connection monitoring
      this.setupConnectionMonitoring();

      return connection;
    } catch (error) {
      logger.error(`❌ Database connection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 3️⃣ EVENT LISTENERS
   */

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB connected');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected');
    });

    mongoose.connection.on('error', error => {
      logger.error(`❌ MongoDB error: ${error.message}`);
    });

    mongoose.connection.on('close', () => {
      logger.info('🔌 MongoDB connection closed');
    });
  }

  /**
   * 4️⃣ SETUP INDEXES
   */

  async setupIndexes() {
    try {
      const db = mongoose.connection.db;

      // Ensure critical indexes are created
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        const col = db.collection(collection.name);

        // Create default indexes
        switch (collection.name) {
          case 'users':
            await col.createIndex({ email: 1 }, { unique: true });
            await col.createIndex({ phone: 1 });
            await col.createIndex({ createdAt: -1 });
            await col.createIndex({ status: 1, updatedAt: -1 });
            break;

          case 'orders':
            await col.createIndex({ orderId: 1 }, { unique: true });
            await col.createIndex({ userId: 1, createdAt: -1 });
            await col.createIndex({ status: 1, createdAt: -1 });
            await col.createIndex({ createdAt: -1 });
            break;

          case 'products':
            await col.createIndex({ sku: 1 }, { unique: true });
            await col.createIndex({ category: 1 });
            await col.createIndex({ name: 'text' });
            break;

          case 'accounting':
            await col.createIndex({ transactionId: 1 }, { unique: true });
            await col.createIndex({ userId: 1, date: -1 });
            await col.createIndex({ type: 1, date: -1 });
            break;

          case 'barcodes':
            await col.createIndex({ barcode: 1 }, { unique: true });
            await col.createIndex({ productId: 1 });
            await col.createIndex({ createdAt: -1 });
            break;

          default:
            // Generic indexes
            await col.createIndex({ createdAt: -1 });
            await col.createIndex({ updatedAt: -1 });
        }
      }

      logger.info('✅ Database indexes created');
    } catch (error) {
      logger.error(`⚠️  Index creation warning: ${error.message}`);
    }
  }

  /**
   * 5️⃣ CONNECTION MONITORING
   */

  setupConnectionMonitoring() {
    setInterval(
      async () => {
        try {
          const admin = mongoose.connection.db.admin();
          const status = await admin.serverStatus();

          // Check if healthy
          if (status.ok === 1) {
            logger.info(`✅ Database healthy - Connections: ${status.connections.current}`);
          }
        } catch (error) {
          logger.error(`⚠️  Database monitoring error: ${error.message}`);
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * 6️⃣ HEALTH CHECK
   */

  async healthCheck() {
    try {
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();

      return {
        status: result.ok === 1 ? 'healthy' : 'unhealthy',
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
   * 7️⃣ DATABASE STATISTICS
   */

  async getStatistics() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();

      const stats = {
        timestamp: new Date(),
        database: {
          name: mongoose.connection.name,
          sizeOnDisk: null,
          indexes: {},
        },
        collections: {},
      };

      // Get database stats
      const dbStats = await admin.serverStatus();
      stats.connections = {
        current: dbStats.connections.current,
        available: dbStats.connections.available,
      };

      // Collection stats
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        const col = db.collection(collection.name);
        const count = await col.countDocuments();
        const colStats = await col.stats();

        stats.collections[collection.name] = {
          count: count,
          size: `${(colStats.size / 1024).toFixed(2)} KB`,
          storageSize: `${(colStats.storageSize / 1024).toFixed(2)} KB`,
          averageObjectSize: `${colStats.avgObjSize.toFixed(2)} bytes`,
          indexes: colStats.nindexes,
        };
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * 8️⃣ DISCONNECT
   */

  async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('✅ MongoDB disconnected');
    } catch (error) {
      logger.error(`❌ Disconnect error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 9️⃣ REPLICA SET CONFIGURATION
   */

  async configureReplicaSet() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();

      const replicaSetStatus = await admin.replSetGetStatus();

      logger.info('✅ Replica set configured');
      logger.info(`   Primary: ${replicaSetStatus.members[0].name}`);
      logger.info(`   Members: ${replicaSetStatus.members.length}`);

      return replicaSetStatus;
    } catch (error) {
      logger.error(`⚠️  Replica set configuration warning: ${error.message}`);
    }
  }

  /**
   * 🔟 OPTIMIZE PERFORMANCE
   */

  async optimizePerformance() {
    try {
      const db = mongoose.connection.db;

      // Analyze collections for optimization
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        const col = db.collection(collection.name);

        // Get index information
        const indexes = await col.getIndexes();
        logger.info(`📊 Collection: ${collection.name}`);
        logger.info(`   Indexes: ${Object.keys(indexes).length}`);

        // Check for unused indexes
        const stats = await col.aggregate([{ $indexStats: {} }]).toArray();

        for (const stat of stats) {
          if (stat.accesses.ops === 0) {
            logger.info(`   ⚠️  Unused index: ${stat.name}`);
          }
        }
      }

      return {
        status: 'optimization_complete',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`⚠️  Performance optimization warning: ${error.message}`);
    }
  }

  /**
   * 1️⃣1️⃣ COMPRESSION SETTINGS
   */

  getCompressionSettings() {
    return {
      enabled: true,
      algorithms: ['snappy', 'zlib'],
      zlibCompressionLevel: 6, // 1-9, 6 is default
      description: 'Reduces network traffic between driver and server',
    };
  }

  /**
   * 1️⃣2️⃣ SECURITY SETTINGS
   */

  getSecuritySettings() {
    return {
      tls: true,
      tlsAllowInvalidCertificates: false,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-256',
      appName: 'ERP-System-Production',
      retryWrites: true,
      journal: true,
    };
  }

  /**
   * 1️⃣3️⃣ BACKUP CONFIGURATION
   */

  getBackupConfiguration() {
    return {
      method: 'mongodump',
      frequency: 'daily',
      time: '02:00 AM UTC',
      retention: '30 days',
      location: 'AWS S3',
      encryption: 'enabled',
      compression: 'enabled',
      verification: 'enabled',
    };
  }

  /**
   * 1️⃣4️⃣ CONNECTION STRING BUILDER
   */

  buildConnectionString(options = {}) {
    const {
      username = process.env.MONGODB_USERNAME,
      password = process.env.MONGODB_PASSWORD,
      cluster = process.env.MONGODB_CLUSTER,
      database = process.env.MONGODB_DATABASE,
      tls = true,
    } = options;

    const tlsParam = tls ? '?retryWrites=true&w=majority&tls=true' : '';

    return `mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${database}${tlsParam}`;
  }
}

// Export configuration
module.exports = {
  ProductionDatabase,
  getProductionDb: () => new ProductionDatabase(),
};
