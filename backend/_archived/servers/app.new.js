/* eslint-disable no-unused-vars */
/**
 * نظام الأصول ERP - التطبيق الرئيسي
 * الإصدار 2.0.0 - بنية منظمة
 */

// ========================================
// تحميل متغيرات البيئة
// ========================================
require('dotenv').config();

// ========================================
// استيراد ملفات التكوين
// ========================================
const { createApp, createRateLimiter, setupStaticRoutes } = require('./config/express.config');
const { connectDB, disconnectDB, checkDBHealth } = require('./config/database.config');
const { connectRedis, disconnectRedis, checkRedisHealth } = require('./config/redis.config');
const { setupRoutes, setupBaseRoutes } = require('./config/routes.config');

// ========================================
// استيراد الوسطاء
// ========================================
const errorHandler = require('./middleware/errorHandler');

// ========================================
// إنشاء التطبيق
// ========================================
const app = createApp();

// ========================================
// إعداد Rate Limiter
// ========================================
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
});
app.use('/api/', apiLimiter);

// ========================================
// المسارات الثابتة
// ========================================
setupStaticRoutes(app);

// ========================================
// المسارات الأساسية (الصحة والجذر)
// ========================================
setupBaseRoutes(app, checkDBHealth, checkRedisHealth);

// ========================================
// إعداد المسارات
// ========================================
setupRoutes(app);

// ========================================
// معالج 404
// ========================================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
    path: req.originalUrl,
  });
});

// ========================================
// معالج الأخطاء العام
// ========================================
app.use(errorHandler);

// ========================================
// تصدير التطبيق للوحدات
// ========================================
module.exports = app;

// ========================================
// بدء الخادم (إذا تم تشغيل الملف مباشرة)
// ========================================
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  const startServer = async () => {
    try {
      // الاتصال بقاعدة البيانات
      await connectDB();

      // الاتصال بـ Redis
      connectRedis();

      // بدء الخادم
      const server = app.listen(PORT, () => {
        console.log('═══════════════════════════════════════════════════');
        console.log('🚀 نظام الأصول ERP - الخادم يعمل');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📡 المنفذ: ${PORT}`);
        console.log(`🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
        console.log(`⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`);
        console.log('═══════════════════════════════════════════════════');
        console.log('📍 المسارات المتاحة:');
        console.log('   • GET  /health - فحص صحة الخادم');
        console.log('   • GET  /api    - معلومات API');
        console.log('   • GET  /       - الصفحة الرئيسية');
        console.log('═══════════════════════════════════════════════════');
      });

      // معالجة إغلاق الخادم
      const gracefulShutdown = async () => {
        console.log('\n⏹️ جاري إغلاق الخادم...');
        server.close(async () => {
          console.log('✅ تم إغلاق الخادم');
          await disconnectDB();
          await disconnectRedis();
          process.exit(0);
        });
      };

      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
    } catch (error) {
      console.error('❌ خطأ في بدء الخادم:', error.message);
      process.exit(1);
    }
  };

  startServer();
}
