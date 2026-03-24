/* eslint-disable no-unused-vars */
/**
 * 🔧 Unified Integration Config - تكامل الملفات الموحدة
 * هذا الملف يوضح كيفية استبدال الاستيرادات القديمة بالجديدة
 * @version 2.0.0
 */

// ============================================
// استيراد الملفات الموحدة
// ============================================

// ✅ الطريقة الجديدة (موحدة)
const unifiedMiddleware = require('../middleware/index.unified');
const unifiedRoutes = require('../routes/index.unified');
const logger = require('../utils/logger');

// فك الاستيراد
const {
  // المصادقة
  authenticate,
  authorize,
  checkPermission,
  optionalAuth,

  // التحقق
  validate,
  body,
  query,
  params,
  loginRules,
  registerRules,

  // تحديد المعدل
  loginLimiter,
  apiLimiter,
  strictLimiter,
  notificationLimiter,

  // أخرى
  sanitizeInput,
  requestLogger,
} = unifiedMiddleware;

// ============================================
// أمثلة الاستخدام
// ============================================

/**
 * مثال 1: حماية مسار تسجيل الدخول
 */
const loginRouteExample = {
  method: 'POST',
  path: '/api/auth/login',
  middleware: [
    loginLimiter, // تحديد معدل المحاولات
    validate(loginRules()), // التحقق من البيانات
    authenticate, // المصادقة
  ],
};

/**
 * مثال 2: حماية مسار المسؤولين
 */
const adminRouteExample = {
  method: 'DELETE',
  path: '/api/users/:id',
  middleware: [
    authenticate, // يجب تسجيل الدخول
    authorize('admin'), // يجب أن يكون مسؤولاً
    strictLimiter, // تحديد صارم
  ],
};

/**
 * مثال 3: مسار عام مع تحقق
 */
const publicRouteExample = {
  method: 'GET',
  path: '/api/search',
  middleware: [
    optionalAuth, // المصادقة اختيارية
    validate([
      // التحقق من المعاملات
      query('q').optional().trim(),
      query('page').optional().isInt({ min: 1 }),
    ]),
  ],
};

// ============================================
// مقارنة قبل وبعد
// ============================================

/**
 * ❌ قبل (الطريقة القديمة):
 *
 * const auth = require('../middleware/auth');
 * const authMiddleware = require('../middleware/authMiddleware');
 * const authenticate = require('../middleware/authenticate');
 * const validator = require('../middleware/validation.middleware');
 * const requestValidation = require('../middleware/requestValidation');
 * const rateLimiter = require('../middleware/rate-limiter-advanced');
 * const userRateLimiter = require('../middleware/userRateLimiter');
 *
 * router.post('/login',
 *   rateLimiter.login,
 *   requestValidation.validateLogin,
 *   auth.authenticate,
 *   controller.login
 * );
 */

/**
 * ✅ بعد (الطريقة الجديدة):
 *
 * const { loginLimiter, validate, loginRules, authenticate } =
 *   require('../middleware/index.unified');
 *
 * router.post('/login',
 *   loginLimiter,
 *   validate(loginRules()),
 *   authenticate,
 *   controller.login
 * );
 */

// ============================================
// دالة التكامل مع الخادم
// ============================================

/**
 * دمج الملفات الموحدة مع خادم Express
 * @param {Express} app - تطبيق Express
 */
function integrateUnifiedModules(app) {
  logger.info('Integrating unified modules...');

  // 1. إضافة Middleware الموحد
  app.use(sanitizeInput);
  app.use(requestLogger);

  // 2. إضافة المسارات الموحدة (اختياري)
  // app.use('/api/v2', unifiedRoutes);

  logger.info('Unified modules integrated successfully');

  return {
    middleware: {
      authenticate,
      authorize,
      checkPermission,
      validate,
      loginLimiter,
      apiLimiter,
      strictLimiter,
    },
    routes: unifiedRoutes,
  };
}

// ============================================
// تصدير
// ============================================

module.exports = {
  // Middleware
  authenticate,
  authorize,
  checkPermission,
  optionalAuth,
  validate,
  body,
  query,
  params,
  loginRules,
  registerRules,
  loginLimiter,
  apiLimiter,
  strictLimiter,
  notificationLimiter,
  sanitizeInput,
  requestLogger,

  // Routes
  unifiedRoutes,

  // Integration function
  integrateUnifiedModules,
};
