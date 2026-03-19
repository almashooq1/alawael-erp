/* eslint-disable no-unused-vars */
/**
 * 🎯 AlAwael ERP - نقطة البداية الموحدة
 * Unified Entry Point
 * @version 2.0.0
 */

const { app, startServer } = require('./server.unified');

// بدء الخادم
startServer().catch(error => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});

/**
 * 📚 دليل الاستخدام السريع:
 *
 * // تشغيل الخادم
 * node index.unified.js
 *
 * // أو استخدام server.unified.js مباشرة
 * node server.unified.js
 *
 * // أو الاستيراد في ملف آخر
 * const { app, startServer } = require('./server.unified');
 */
