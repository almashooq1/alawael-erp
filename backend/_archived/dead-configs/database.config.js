/* eslint-disable no-unused-vars */
/**
 * تكوين قاعدة البيانات - MongoDB
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      waitQueueTimeoutMS: 60000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error('MongoDB Disconnection Error:', error.message);
  }
};

const checkDBHealth = () => {
  return {
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    host: mongoose.connection.host || 'N/A',
    database: mongoose.connection.name || 'N/A',
    readyState: mongoose.connection.readyState,
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  checkDBHealth,
};
