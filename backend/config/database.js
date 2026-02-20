// Database Configuration
// إعدادات قاعدة البيانات

const mongoose = require('mongoose');

// MongoDB Connection Configuration
const dbConfig = {
  development: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/erp_new',
    options: {
      retryWrites: false,
      serverSelectionTimeoutMS: 16000,  // Increased from 5000ms to handle timeout issues
      socketTimeoutMS: 45000,            // Connection socket timeout
      connectTimeoutMS: 10000,           // Initial connection timeout
      maxPoolSize: 10,                   // Connection pooling
      minPoolSize: 5,
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
    },
  },
  test: {
    url: process.env.MONGODB_TEST_URL || 'mongodb://localhost:27017/erp_test',
    options: {
      retryWrites: false,
      serverSelectionTimeoutMS: 16000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
    },
  },
};

// Get current environment config
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Connection function
const connectDB = async () => {
  // Check if using Mock DB
  if (process.env.USE_MOCK_DB === 'true') {
    console.log(`\n📦 Using Mock Database (Development Mode)`);
    console.log(`   Environment: ${env}`);
    console.log(`   ✅ Mock DB ready - No MongoDB required\n`);
    return { connection: { host: 'mock', name: 'mock-db' } };
  }

  try {
    console.log(`\n📡 Connecting to MongoDB (${env})...`);
    console.log(`   URL: ${config.url}`);

    const conn = await mongoose.connect(config.url, config.options);

    console.log(`✅ MongoDB connected successfully`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Collections: ${Object.keys(conn.connection.collections).length}\n`);

    return conn;
  } catch (error) {
    console.error(`\n❌ MongoDB connection failed:`);
    console.error(`   Error: ${error.message}`);
    console.error(`\n💡 TIP: Set USE_MOCK_DB=true in .env to use Mock DB\n`);

    process.exit(1);
  }
};

// Disconnect function
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected');
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected');
});

mongoose.connection.on('error', error => {
  console.error('❌ Mongoose connection error:', error.message);
});

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
};
