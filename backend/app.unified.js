/**
 * 🎯 AlAwael ERP - Unified Application
 * التطبيق الموحد الشامل
 * @version 2.0.0
 */

// ============================================
// التصدير الرئيسي
// ============================================

module.exports = {
  // Middleware
  middleware: require('./middleware/index.unified'),

  // Routes
  routes: require('./routes/index.unified'),

  // Models
  models: require('./models/index.unified'),

  // Services
  services: require('./services/index.unified'),

  // Utils
  utils: require('./utils/index.unified'),

  // Server
  createServer: () => require('./server.unified')
};

// ============================================
// معلومات النظام
// ============================================

/**
 * 🏗️ هيكل النظام الموحد:
 *
 * 📁 backend/
 * ├── middleware/
 * │   ├── auth.unified.js      → المصادقة والتفويض
 * │   ├── validation.unified.js → التحقق من البيانات
 * │   ├── rateLimiter.unified.js → تحديد المعدل
 * │   └── index.unified.js     → نقطة التصدير
 * │
 * ├── routes/
 * │   ├── hr.routes.unified.js → مسارات HR (25+ endpoints)
 * │   ├── notifications.routes.unified.js → الإشعارات (20+ endpoints)
 * │   ├── dashboard.routes.unified.js → لوحة التحكم (20+ endpoints)
 * │   └── index.unified.js     → فهرس المسارات
 * │
 * ├── models/
 * │   └── index.unified.js     → 8 نماذج (User, Employee, etc.)
 * │
 * ├── services/
 * │   └── index.unified.js     → 4 خدمات موحدة
 * │
 * ├── utils/
 * │   └── index.unified.js     → 25+ دالة مساعدة
 * │
 * ├── config/
 * │   └── unified-integration.js → دليل التكامل
 * │
 * ├── server.unified.js        → الخادم الموحد
 * └── app.unified.js           → هذا الملف
 */

// ============================================
// أمثلة الاستخدام
// ============================================

/**
 * مثال 1: إنشاء خادم جديد
 *
 * const { createServer } = require('./app.unified');
 * const { app, startServer } = createServer();
 * startServer();
 */

/**
 * مثال 2: استخدام Middleware
 *
 * const { middleware } = require('./app.unified');
 * const { authenticate, validate, loginRules } = middleware;
 *
 * router.post('/login',
 *   validate(loginRules()),
 *   authenticate,
 *   controller.login
 * );
 */

/**
 * مثال 3: استخدام Models
 *
 * const { models } = require('./app.unified');
 * const { User, Employee, Department } = models;
 *
 * const user = await User.findById(userId);
 */

/**
 * مثال 4: استخدام Services
 *
 * const { services } = require('./app.unified');
 * const { notification, auth } = services;
 *
 * await notification.send(userId, {
 *   title: 'مرحباً',
 *   message: 'أهلاً بك في النظام'
 * });
 */

/**
 * مثال 5: استخدام Utils
 *
 * const { utils } = require('./app.unified');
 * const { formatDate, formatCurrency, successResponse } = utils;
 *
 * res.json(successResponse(res, {
 *   date: formatDate(new Date()),
 *   amount: formatCurrency(1000)
 * }));
 */
