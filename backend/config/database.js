// backend/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ==================== CONNECTION RETRY CONFIGURATION ====================
// Configuration for exponential backoff retry strategy
const RETRY_CONFIG = {
  maxRetries: parseInt(process.env.DB_MAX_RETRIES, 10) || 5,
  initialDelay: parseInt(process.env.DB_INITIAL_RETRY_DELAY, 10) || 1000, // 1 second
  maxDelay: parseInt(process.env.DB_MAX_RETRY_DELAY, 10) || 32000, // 32 seconds
  backoffMultiplier: Number(process.env.DB_BACKOFF_MULTIPLIER) || 2,
};

let isConnected = false;
let mongoServer;

// ==================== EXPONENTIAL BACKOFF HELPER ====================
// Calculates delay using exponential backoff formula
const calculateBackoffDelay = attemptNumber => {
  const baseDelay =
    RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  const cappedDelay = Math.min(baseDelay, RETRY_CONFIG.maxDelay);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  return Math.ceil(cappedDelay + jitter);
};

// ==================== WAIT HELPER ====================
// Helper function to wait/sleep for specified milliseconds
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// ==================== CONNECTION HEALTH TRACKING ====================
// Track connection health status
const connectionHealth = {
  isConnected: false,
  lastConnectedAt: null,
  connectionAttempts: 0,
  lastErrorMessage: null,
  lastErrorTime: null,
  usingFallback: false,
};

// ==================== CONNECTION RETRY WITH EXPONENTIAL BACKOFF ====================
const connectDB = async () => {
  // ========== MOCK/TEST DATABASE HANDLING ==========
  if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
    if (isConnected && mongoose.connection.readyState === 1) {
      // console.log('✅ Using existing in-memory database connection');
      return mongoose.connection;
    }

    // console.log('🎯 Starting in-memory database initialization...');

    // Try to use MongoMemoryServer with a reasonable timeout
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      // console.log('📦 Starting MongoDB Memory Server...');

      const startTime = Date.now();
      mongoServer = await Promise.race([
        MongoMemoryServer.create(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MongoMemoryServer startup timeout after 30s')), 30000)
        ),
      ]);

      const _startupTime = Date.now() - startTime;
      // console.log(`✅ MongoDB Memory Server started in ${_startupTime}ms`);

      const uri = mongoServer.getUri();
      // console.log(`🔗 Connecting to: ${uri.substring(0, 50)}...`);

      const conn = await mongoose.connect(uri, {
        dbName: 'alawael-erp-mem',
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      isConnected = conn.connections[0].readyState === 1;
      connectionHealth.isConnected = true;
      connectionHealth.lastConnectedAt = new Date();
      connectionHealth.usingFallback = false;
      // console.log(`✅ Mongoose connected, readyState: ${mongoose.connection.readyState}`);
      return conn;
    } catch (memoryServerError) {
      logger.error('MongoMemoryServer Error:', { error: memoryServerError.message });
      // console.log('⚠️  Attempting fallback connection...');

      // Fallback: Try to connect to localhost MongoDB if available
      try {
        const fallbackUri = 'mongodb://localhost:27017/alawael-erp-test';
        // console.log('🔄 Trying fallback: localhost MongoDB...');
        const conn = await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        });
        isConnected = conn.connections[0].readyState === 1;
        connectionHealth.isConnected = true;
        connectionHealth.lastConnectedAt = new Date();
        connectionHealth.usingFallback = true;
        // console.log('✅ Connected to localhost MongoDB');
        return conn;
      } catch (fallbackError) {
        logger.error('Fallback also failed:', { error: fallbackError.message });
        logger.error('Running in disconnected mock mode - database operations will be limited');
        connectionHealth.isConnected = false;
        connectionHealth.lastErrorMessage = fallbackError.message;
        connectionHealth.lastErrorTime = new Date();
        return mongoose.connection;
      }
    }
  }

  // ========== PRODUCTION MONGODB WITH RETRY LOGIC ==========
  if (isConnected && mongoose.connection.readyState === 1) {
    // console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  let lastError = null;
  const maxRetries = parseInt(RETRY_CONFIG.maxRetries);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Require explicit MONGODB_URI in production
      if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required in production');
      }
      if (!process.env.MONGODB_URI && process.env.NODE_ENV !== 'test') {
        console.warn('[DB] MONGODB_URI not set — using localhost fallback (dev only)');
      }
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority',
        maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
        minPoolSize: 2,
        // TLS for cloud MongoDB (Atlas, DocumentDB, etc.)
        ...(process.env.NODE_ENV === 'production' && {
          tls: process.env.DB_TLS !== 'false',
        }),
      });

      isConnected = conn.connections[0].readyState === 1;
      connectionHealth.isConnected = true;
      connectionHealth.lastConnectedAt = new Date();
      connectionHealth.connectionAttempts = 0;
      connectionHealth.lastErrorMessage = null;
      connectionHealth.lastErrorTime = null;
      connectionHealth.usingFallback = false;

      // console.log(`✅ MongoDB Connected: ${conn.connection.host}\n`);

      // Setup connection event listeners
      setupEventListeners();

      return conn;
    } catch (error) {
      lastError = error;
      connectionHealth.connectionAttempts++;
      logger.error(`\n❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delayMs = calculateBackoffDelay(attempt);
        // console.log(`⏳ Retrying in ${(delayMs / 1000).toFixed(1)}s (exponential backoff)...`);
        await wait(delayMs);
      }
    }
  }

  // ========== RETRY FAILED - ATTEMPT FALLBACK ==========
  logger.error(`\n❌ All ${maxRetries} connection attempts failed`);
  logger.error(`   Error: ${lastError.message}`);

  // SAFETY: Never use in-memory fallback in production — it would serve empty data
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFallback = !isProduction && process.env.DISABLE_MOCK_FALLBACK !== 'true';

  if (isProduction) {
    logger.error(
      '❌ CRITICAL: MongoDB connection failed in production. Refusing to fall back to in-memory DB.'
    );
    logger.error('   The application will not serve requests until MongoDB is available.');
    connectionHealth.isConnected = false;
    connectionHealth.lastErrorMessage = lastError.message;
    connectionHealth.lastErrorTime = new Date();
    throw new Error(
      `MongoDB connection failed in production after ${maxRetries} retries: ${lastError.message}`
    );
  }

  if (allowFallback) {
    // console.log('\n🔄 Attempting to use mock database as fallback...');
    try {
      process.env.USE_MOCK_DB = 'true';
      // console.log('⚠️  Fallback: Using in-memory database');
      if (!mongoServer) {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
      }
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { dbName: 'alawael-erp-mem' });
      isConnected = conn.connections[0].readyState === 1;
      connectionHealth.isConnected = true;
      connectionHealth.usingFallback = true;
      return conn;
    } catch (fallbackErr) {
      logger.error('❌ In-memory MongoDB fallback failed:', fallbackErr.message);
      connectionHealth.isConnected = false;
      connectionHealth.lastErrorMessage = fallbackErr.message;
      connectionHealth.lastErrorTime = new Date();
    }
  }

  // ========== ALL FALLBACKS EXHAUSTED ==========
  logger.error(`\n❌ MongoDB connection failed after ${maxRetries} retry attempts`);
  logger.error(`\n💡 Troubleshooting options:`);
  logger.error(`   1. Check MongoDB is running: sudo systemctl start mongod`);
  logger.error(`   2. Verify MONGODB_URI in .env file`);
  logger.error(`   3. Check network connectivity to MongoDB server`);
  logger.error(`   4. Use Mock DB for development: Set USE_MOCK_DB=true in .env`);
  logger.error(`   5. Increase retry attempts: Set DB_MAX_RETRIES=10 in .env\n`);

  // Return mongoose connection in disconnected state
  // This may cause operations to fail, but at least won't crash the app
  return mongoose.connection;
};

// ==================== EVENT LISTENERS SETUP ====================
const setupEventListeners = () => {
  mongoose.connection.on('error', err => {
    logger.error('❌ MongoDB Connection Error:', err.message);
    connectionHealth.isConnected = false;
    connectionHealth.lastErrorMessage = err.message;
    connectionHealth.lastErrorTime = new Date();
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️  MongoDB Disconnected');
    isConnected = false;
    connectionHealth.isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    // console.log('✅ MongoDB Reconnected');
    isConnected = true;
    connectionHealth.isConnected = true;
    connectionHealth.lastConnectedAt = new Date();
  });

  mongoose.connection.on('close', () => {
    // console.log('🔌 MongoDB connection closed');
    isConnected = false;
    connectionHealth.isConnected = false;
  });
};

// ==================== GRACEFUL DISCONNECTION ====================
const disconnectDB = async () => {
  try {
    if (isConnected) {
      // console.log('🔌 Disconnecting from MongoDB...');

      // Set a timeout to prevent hanging disconnections
      const disconnectTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Disconnection timeout')), 10000)
      );

      await Promise.race([mongoose.connection.close(), disconnectTimeout]);
      isConnected = false;
      connectionHealth.isConnected = false;
      // console.log('✅ MongoDB Disconnected');
    }

    if (mongoServer) {
      // // console.log('🧹 Stopping in-memory MongoDB...');
      await mongoServer.stop();
      mongoServer = null;
      // console.log('✅ In-memory MongoDB stopped');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting MongoDB:', error.message);
  }
};

// ==================== CONNECTION STATUS HELPERS ====================
// Lightweight connection status helper used by health checks
const checkConnection = () => {
  try {
    if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
      return true;
    }
    return !!mongoose.connection && mongoose.connection.readyState === 1;
  } catch (e) {
    return false;
  }
};

// ==================== DATABASE PING (HEALTH-CHECK) ====================
/**
 * Send a lightweight `ping` command to the database.
 * Returns { ok: true, latencyMs } on success, { ok: false, error } on failure.
 * Useful for readiness probes (K8s, load-balancers, /health endpoints).
 */
const pingDatabase = async (timeoutMs = 5000) => {
  try {
    if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB === 'true') {
      return { ok: true, latencyMs: 0 };
    }
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return { ok: false, error: 'Not connected' };
    }
    const start = Date.now();
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), timeoutMs)),
    ]);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// ==================== CONNECTION POOL METRICS ====================
/**
 * Retrieve Mongoose connection-pool statistics.
 * Available only when connected to a real MongoDB server.
 */
const getPoolMetrics = () => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return null;
    }
    const pool = mongoose.connection.getClient()?.topology?.s?.pool;
    if (!pool) return null;
    return {
      totalConnectionCount: pool.totalConnectionCount ?? null,
      availableConnectionCount: pool.availableConnectionCount ?? null,
      waitQueueSize: pool.waitQueueSize ?? null,
      maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
      minPoolSize: 2,
    };
  } catch (_err) {
    return null;
  }
};

// ==================== SLOW-QUERY PROFILING (DEV) ====================
/**
 * Enable Mongoose debug logging for slow queries in development.
 * Queries exceeding `thresholdMs` are logged as warnings.
 */
const enableSlowQueryProfiling = (thresholdMs = 500) => {
  if (process.env.NODE_ENV === 'test') return;

  mongoose.set('debug', (collectionName, method, query, _doc, _options) => {
    // mongoose 'debug' fires for EVERY query — we only want slow ones.
    // Record timing manually via pre/post hooks would be more accurate,
    // but this piggy-backs on the built-in flag with zero model changes.
    const ts = new Date().toISOString();
    const msg = `[DB] ${collectionName}.${method}`;

    if (process.env.LOG_ALL_QUERIES === 'true') {
      logger.debug(msg, { query, ts });
    }
  });

  // Per-query timing via Mongoose middleware plugin (global plugin)
  const queryTimingPlugin = schema => {
    schema.pre(/^(find|update|delete|count|aggregate)/, function () {
      this.__queryStart = Date.now();
    });
    schema.post(/^(find|update|delete|count|aggregate)/, function () {
      if (this.__queryStart) {
        const duration = Date.now() - this.__queryStart;
        if (duration >= thresholdMs) {
          logger.warn(`Slow query detected: ${this.mongooseCollection?.name}.${this.op}`, {
            duration: `${duration}ms`,
            threshold: `${thresholdMs}ms`,
            filter: this.getFilter ? this.getFilter() : undefined,
          });
        }
      }
    });
  };

  mongoose.plugin(queryTimingPlugin);
  logger.info(`Slow-query profiling enabled (threshold: ${thresholdMs}ms)`);
};

// Get detailed connection health status
const getConnectionHealth = () => ({
  ...connectionHealth,
  secondsSinceConnected: connectionHealth.lastConnectedAt
    ? Math.floor((Date.now() - connectionHealth.lastConnectedAt) / 1000)
    : null,
  pool: getPoolMetrics(),
});

module.exports = {
  connectDB,
  disconnectDB,
  isConnected: () => isConnected,
  checkConnection,
  getConnectionHealth,
  pingDatabase,
  getPoolMetrics,
  enableSlowQueryProfiling,
  RETRY_CONFIG,
};
