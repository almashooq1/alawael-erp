/**
 * AlAwael ERP Backend Server Launcher
 * مشغل خادم الباك اند مع حماية من التوقف غير المتوقع
 */

// حماية من توقف غير متوقع
process.on('uncaughtException', err => {
  console.error('⚠️ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  // لا نوقف الخادم
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
  // لا نوقف الخادم
});

// بدء الخادم
require('./server.js');
