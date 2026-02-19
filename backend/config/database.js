// backend/config/database.js
const mongoose = require('mongoose');

let isConnected = false;
let mongoServer;

const connectDB = async () => {
  // Check if using mock database first
  if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log('✅ Using existing in-memory database connection');
      return mongoose.connection;
    }

    console.log('🎯 Starting in-memory database initialization...');

    // Try to use MongoMemoryServer with a reasonable timeout
    try {
      let { MongoMemoryServer } = require('mongodb-memory-server');
      // Increase download timeout for slower systems
      console.log('📦 Starting MongoDB Memory Server...');

      const startTime = Date.now();
      mongoServer = await Promise.race([
        MongoMemoryServer.create(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MongoMemoryServer startup timeout after 30s')), 30000)
        ),
      ]);

      const startupTime = Date.now() - startTime;
      console.log(`✅ MongoDB Memory Server started in ${startupTime}ms`);

      const uri = mongoServer.getUri();
      console.log(`🔗 Connecting to: ${uri.substring(0, 50)}...`);

      const conn = await mongoose.connect(uri, {
        dbName: 'alawael-erp-mem',
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      isConnected = conn.connections[0].readyState === 1;
      console.log(`✅ Mongoose connected, readyState: ${mongoose.connection.readyState}`);
      return conn;
    } catch (memoryServerError) {
      console.error('❌ MongoMemoryServer Error:', memoryServerError.message);
      console.log('⚠️  Attempting fallback connection...');

      // Fallback: Try to connect to localhost MongoDB if available
      try {
        const fallbackUri = 'mongodb://localhost:27017/alawael-erp-test';
        console.log('🔄 Trying fallback: localhost MongoDB...');
        const conn = await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        });
        isConnected = conn.connections[0].readyState === 1;
        console.log('✅ Connected to localhost MongoDB');
        return conn;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        console.error('⚠️  Running in disconnected mock mode - database operations will fail');

        // Last resort: Return mongoose connection even though it's not connected
        // This may cause tests to fail, but at least it won't timeout
        return mongoose.connection;
      }
    }
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

    console.log('🔄 Connecting to MongoDB:', mongoURI);

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });

    isConnected = conn.connections[0].readyState === 1;

    console.log('✅ MongoDB Connected:', conn.connection.host);

    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Reconnected');
      isConnected = true;
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
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
        return conn;
      } catch (fallbackErr) {
        console.error('❌ In-memory MongoDB fallback failed:', fallbackErr.message);
      }
    }

    console.log('⚠️  MongoDB not available');
    return null;
  }
};

const disconnectDB = async () => {
  try {
    if (isConnected) {
      await mongoose.connection.close();
      isConnected = false;
      console.log('✅ MongoDB Disconnected');
    }

    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
      console.log('🧹 In-memory MongoDB stopped');
    }
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error);
  }
};

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

module.exports = {
  connectDB,
  disconnectDB,
  isConnected: () => isConnected,
  checkConnection,
};
