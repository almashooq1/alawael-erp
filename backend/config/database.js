// backend/config/database.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ==================== CONNECTION RETRY CONFIGURATION ====================
// Configuration for exponential backoff retry strategy
const RETRY_CONFIG = {
  maxRetries: process.env.DB_MAX_RETRIES || 5,
  initialDelay: process.env.DB_INITIAL_RETRY_DELAY || 1000, // 1 second
  maxDelay: process.env.DB_MAX_RETRY_DELAY || 32000, // 32 seconds
  backoffMultiplier: process.env.DB_BACKOFF_MULTIPLIER || 2,
};

let isConnected = false;
let mongoServer;

// ==================== EXPONENTIAL BACKOFF HELPER ====================
// Calculates delay using exponential backoff formula
const calculateBackoffDelay = (attemptNumber) => {
  const baseDelay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  const cappedDelay = Math.min(baseDelay, RETRY_CONFIG.maxDelay);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  return Math.ceil(cappedDelay + jitter);
};

// ==================== WAIT HELPER ====================
// Helper function to wait/sleep for specified milliseconds
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== CONNECTION HEALTH TRACKING ====================
// Track connection health status
let connectionHealth = {
  isConnected: false,
  lastConnectedAt: null,
  connectionAttempts: 0,
  lastErrorMessage: null,
  lastErrorTime: null,
  usingFallback: false,
};

// ==================== CONNECTION RETRY WITH EXPONENTIAL BACKOFF ====================
const connectDB = async () => {
  // Check if using mock database first
  if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
    if (isConnected) {
      console.log('✅ Using existing in-memory database');
      return mongoose.connection;
    }

    console.log('🎯 Using in-memory database (development mode)');
    console.log('📝 Data will be lost when server restarts');
    console.log('⚙️  To use MongoDB Atlas, set USE_MOCK_DB=false in .env\n');

    try {
      // Spin up an ephemeral MongoDB for local/test usage
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { dbName: 'alawael-erp-mem' });
      isConnected = conn.connections[0].readyState === 1;
      connectionHealth.isConnected = true;
      connectionHealth.lastConnectedAt = new Date();
      connectionHealth.usingFallback = false;
      return conn;
    } catch (error) {
      console.error('❌ MongoMemoryServer failed:', error.message);
      connectionHealth.isConnected = false;
      connectionHealth.lastErrorMessage = error.message;
      connectionHealth.lastErrorTime = new Date();
      return mongoose.connection;
    }
  }

  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  // ========== PRODUCTION MONGODB WITH RETRY LOGIC ==========
  let lastError = null;
  const maxRetries = parseInt(RETRY_CONFIG.maxRetries);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

      console.log(`\n📡 Connecting to MongoDB - Attempt ${attempt}/${maxRetries}...`);
      console.log(`   URL: ${mongoURI}`);

      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority',
      });

      isConnected = conn.connections[0].readyState === 1;
      connectionHealth.isConnected = true;
      connectionHealth.lastConnectedAt = new Date();
      connectionHealth.connectionAttempts = 0;
      connectionHealth.lastErrorMessage = null;
      connectionHealth.usingFallback = false;

      console.log(`✅ MongoDB Connected: ${conn.connection.host}\n`);

      // Setup connection event listeners
      setupEventListeners();

      return conn;
    } catch (error) {
      lastError = error;
      connectionHealth.connectionAttempts++;
      console.error(`\n❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delayMs = calculateBackoffDelay(attempt);
        console.log(`⏳ Retrying in ${(delayMs / 1000).toFixed(1)}s (exponential backoff)...`);
        await wait(delayMs);
      }
    }
  }

  // ========== RETRY FAILED - ATTEMPT FALLBACK ==========
  console.error(`\n❌ All ${maxRetries} connection attempts failed`);
  const allowFallback = process.env.DISABLE_MOCK_FALLBACK !== 'true';

  if (allowFallback) {
    try {
      process.env.USE_MOCK_DB = 'true';
      console.log('⚠️  Fallback: Using in-memory database');
      if (!mongoServer) {
        mongoServer = await MongoMemoryServer.create();
      }
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { dbName: 'alawael-erp-mem' });
      isConnected = conn.connections[0].readyState === 1;
      connectionHealth.isConnected = true;
      connectionHealth.usingFallback = true;
      return conn;
    } catch (fallbackErr) {
      console.error('❌ In-memory MongoDB fallback failed:', fallbackErr.message);
      connectionHealth.isConnected = false;
      connectionHealth.lastErrorMessage = fallbackErr.message;
      connectionHealth.lastErrorTime = new Date();
    }
  }

  console.log('⚠️  MongoDB not available');
  return mongoose.connection;
};

// ==================== EVENT LISTENERS SETUP ====================
const setupEventListeners = () => {
  mongoose.connection.on('error', err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    connectionHealth.isConnected = false;
    connectionHealth.lastErrorMessage = err.message;
    connectionHealth.lastErrorTime = new Date();
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB Disconnected');
    isConnected = false;
    connectionHealth.isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB Reconnected');
    isConnected = true;
    connectionHealth.isConnected = true;
    connectionHealth.lastConnectedAt = new Date();
  });

  mongoose.connection.on('close', () => {
    console.log('🔌 MongoDB connection closed');
    isConnected = false;
    connectionHealth.isConnected = false;
  });
};

// ==================== GRACEFUL DISCONNECTION ====================
const disconnectDB = async () => {
  try {
    if (isConnected) {
      console.log('🔌 Disconnecting from MongoDB...');
      
      // Set a timeout to prevent hanging disconnections
      const disconnectTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Disconnection timeout')), 10000)
      );
      
      await Promise.race([mongoose.connection.close(), disconnectTimeout]);
      isConnected = false;
      connectionHealth.isConnected = false;
      console.log('✅ MongoDB Disconnected');
    }

    if (mongoServer) {
      console.log('🧹 Stopping in-memory MongoDB...');
      await mongoServer.stop();
      mongoServer = null;
      console.log('✅ In-memory MongoDB stopped');
    }
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
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

// Get detailed connection health status
const getConnectionHealth = () => ({
  ...connectionHealth,
  secondsSinceConnected: connectionHealth.lastConnectedAt 
    ? Math.floor((Date.now() - connectionHealth.lastConnectedAt) / 1000)
    : null,
});

module.exports = {
  connectDB,
  disconnectDB,
  isConnected: () => isConnected,
  checkConnection,
  getConnectionHealth,
  RETRY_CONFIG,
};
