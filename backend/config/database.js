// backend/config/database.js
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  // Check if using mock database first
  if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
    if (isConnected) {
      console.log('✅ Using existing in-memory database');
      return { connection: { host: 'in-memory' } };
    }

    console.log('🎯 Using in-memory database (development mode)');
    console.log('📝 Data will be lost when server restarts');
    console.log('⚙️  To use MongoDB Atlas, set USE_MOCK_DB=false in .env\n');
    isConnected = true;
    return { connection: { host: 'in-memory' } };
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

    if (process.env.USE_MOCK_DB === 'true') {
      console.log('⚠️  Fallback: Using in-memory database');
      isConnected = true;
      return { connection: { host: 'in-memory' } };
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
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  isConnected: () => isConnected,
};
