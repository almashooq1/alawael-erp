/* eslint-disable no-unused-vars */
/**
 * نقطة الدخول الرئيسية - نظام الأصول ERP
 */

'use strict';

// تحميل متغيرات البيئة
require('dotenv').config();

// استيراد التطبيق
const app = require('./app.new');
const logger = require('./utils/logger');

// استيراد دوال قاعدة البيانات
const { connectDB, disconnectDB } = require('./config/database.config');
const { connectRedis, disconnectRedis } = require('./config/redis.config');

// ========================================
// بدء الخادم
// ========================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // الاتصال بقاعدة البيانات
    logger.info('Connecting to database...');
    await connectDB();

    // الاتصال بـ Redis
    logger.info('Connecting to Redis...');
    connectRedis();

    // بدء الخادم
    const server = app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    // ========================================
    // معالجة إغلاق الخادم بأمان
    // ========================================
    const gracefulShutdown = async signal => {
      logger.info(`Received ${signal} - shutting down gracefully...`);

      server.close(async () => {
        logger.info('Server closed');

        try {
          await disconnectDB();
          await disconnectRedis();
          logger.info('All connections closed');
        } catch (error) {
          logger.error('Error closing connections:', { error: error.message });
        }

        process.exit(0);
      });

      // إجبار الإغلاق بعد 10 ثوان
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // الاستماع لإشارات الإغلاق
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // معالجة الأخطاء غير المعالجة
    process.on('uncaughtException', error => {
      logger.error('Uncaught exception:', { message: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { reason: String(reason) });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', { message: error.message, stack: error.stack });
    process.exit(1);
  }
};

// بدء تشغيل الخادم
startServer();
