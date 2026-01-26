// backend/config/database.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let isConnected = false;
let mongoServer;

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

    // Spin up an ephemeral MongoDB for local/test usage
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    const conn = await mongoose.connect(uri, { dbName: 'alawael-erp-mem' });
    isConnected = conn.connections[0].readyState === 1;
    return conn;
  }

  if (isConnected) {
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
