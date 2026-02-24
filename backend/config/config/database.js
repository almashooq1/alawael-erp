// Database Configuration
// إعدادات قاعدة البيانات

const mongoose = require('mongoose');

// ==================== CONNECTION RETRY CONFIGURATION ====================
// Configuration for exponential backoff retry strategy
const RETRY_CONFIG = {
  maxRetries: process.env.DB_MAX_RETRIES || 5,
  initialDelay: process.env.DB_INITIAL_RETRY_DELAY || 1000, // 1 second
  maxDelay: process.env.DB_MAX_RETRY_DELAY || 32000, // 32 seconds
  backoffMultiplier: process.env.DB_BACKOFF_MULTIPLIER || 2,
};

// MongoDB Connection Configuration
const dbConfig = {
  development: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/erp_new',
    options: {
      retryWrites: true,  // FIXED: Enable retries in development for better reliability
      serverSelectionTimeoutMS: 16000,  // Increased from 5000ms to handle timeout issues
      socketTimeoutMS: 45000,            // Connection socket timeout
      connectTimeoutMS: 10000,           // Initial connection timeout
      maxPoolSize: 10,                   // Connection pooling
      minPoolSize: 5,
      family: 4,  // Use IPv4
    },
  },
  production: {
    url: process.env.MONGODB_PROD_URL || 'mongodb+srv://user:password@cluster.mongodb.net/erp_prod',
    options: {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: 10,
      family: 4,  // Use IPv4
    },
  },
  test: {
    url: process.env.MONGODB_TEST_URL || 'mongodb://localhost:27017/erp_test',
    options: {
      retryWrites: true,  // FIXED: Enable retries in test mode
      serverSelectionTimeoutMS: 16000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      family: 4,  // Use IPv4
    },
  },
};

// Get current environment config
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

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

// ==================== CONNECTION RETRY WITH EXPONENTIAL BACKOFF ====================
// Connection function with retry logic and exponential backoff
const connectDB = async () => {
  // Check if using Mock DB
  if (process.env.USE_MOCK_DB === 'true') {
    console.log(`\n📦 Using Mock Database (Development Mode)`);
    console.log(`   Environment: ${env}`);
    console.log(`   ✅ Mock DB ready - No MongoDB required\n`);
    return { connection: { host: 'mock', name: 'mock-db' } };
  }

  let lastError = null;
  const maxRetries = parseInt(RETRY_CONFIG.maxRetries);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n📡 Connecting to MongoDB (${env}) - Attempt ${attempt}/${maxRetries}...`);
      console.log(`   URL: ${config.url}`);

      const conn = await mongoose.connect(config.url, config.options);

      console.log(`✅ MongoDB connected successfully!`);
      console.log(`   Host: ${conn.connection.host}`);
      console.log(`   Database: ${conn.connection.name}`);
      console.log(`   Collections: ${Object.keys(conn.connection.collections).length}`);
      console.log(`   Connection Pool: ${config.options.maxPoolSize} max\n`);

      return conn;
    } catch (error) {
      lastError = error;
      console.error(`\n❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delayMs = calculateBackoffDelay(attempt);
        console.log(`⏳ Retrying in ${(delayMs / 1000).toFixed(1)}s (exponential backoff)...`);
        await wait(delayMs);
      } else {
        console.error(`\n❌ All ${maxRetries} connection attempts failed`);
      }
    }
  }

  // All retries exhausted - provide helpful error message
  console.error(`\n❌ MongoDB connection failed after ${maxRetries} retry attempts:`);
  console.error(`   Error: ${lastError.message}`);
  console.error(`\n💡 Troubleshooting options:`);
  console.error(`   1. Check MongoDB is running: sudo systemctl start mongod`);
  console.error(`   2. Verify MONGODB_URL in .env file`);
  console.error(`   3. Check network connectivity to MongoDB server`);
  console.error(`   4. Use Mock DB for development: Set USE_MOCK_DB=true in .env`);
  console.error(`   5. Increase retry attempts: Set DB_MAX_RETRIES=10 in .env\n`);

  // Exit gracefully
  process.exit(1);
};

// ==================== GRACEFUL DISCONNECTION ====================
// Disconnect function with timeout protection
const disconnectDB = async () => {
  try {
    console.log('🔌 Disconnecting from MongoDB...');
    
    // Set a timeout to prevent hanging disconnections
    const disconnectTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Disconnection timeout')), 10000)
    );
    
    await Promise.race([mongoose.disconnect(), disconnectTimeout]);
    console.log('✅ MongoDB disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
  }
};

// ==================== CONNECTION EVENT LISTENERS ====================
// Monitor connection state and log events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

mongoose.connection.on('error', error => {
  console.error('❌ Mongoose connection error:', error.message);
  
  // Log detailed error info for debugging
  if (error.name === 'MongoNetworkError') {
    console.error('   Type: Network Error - Check MongoDB server and network connectivity');
  } else if (error.name === 'MongoAuthenticationError') {
    console.error('   Type: Authentication Error - Check credentials in MONGODB_URL');
  } else if (error.name === 'MongoTimeoutError') {
    console.error('   Type: Timeout Error - MongoDB server is not responding');
  } else if (error.name === 'MongoServerSelectionError') {
    console.error('   Type: Server Selection Error - Cannot find MongoDB server');
  }
});

mongoose.connection.on('close', () => {
  console.log('🔌 Mongoose connection closed');
});

// ==================== MONITORING & HEALTH CHECK ====================
// Track connection health status
let connectionHealth = {
  isConnected: false,
  lastConnectedAt: null,
  connectionAttempts: 0,
  lastErrorMessage: null,
  lastErrorTime: null,
};

// Update health status
mongoose.connection.on('connected', () => {
  connectionHealth.isConnected = true;
  connectionHealth.lastConnectedAt = new Date();
  connectionHealth.connectionAttempts = 0;
  connectionHealth.lastErrorMessage = null;
  connectionHealth.lastErrorTime = null;
});

mongoose.connection.on('error', (error) => {
  connectionHealth.isConnected = false;
  connectionHealth.connectionAttempts++;
  connectionHealth.lastErrorMessage = error.message;
  connectionHealth.lastErrorTime = new Date();
});

// Export connection health getter
const getConnectionHealth = () => ({
  ...connectionHealth,
  secondsSinceConnected: connectionHealth.lastConnectedAt 
    ? Math.floor((Date.now() - connectionHealth.lastConnectedAt) / 1000)
    : null,
});

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
  getConnectionHealth,
  RETRY_CONFIG,
};
