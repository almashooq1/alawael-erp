/* eslint-disable no-unused-vars */
/**
 * 📦 Unified Middleware Index - فهرس الـ middleware الموحد
 * نقطة تصدير واحدة لجميع middleware
 * @version 2.0.0
 */

const logger = require('../utils/logger');

// ============================================
// المصادقة - Authentication
// ============================================
const auth = require('./auth.unified');

// ============================================
// التحقق - Validation
// ============================================
const validation = require('./validation.unified');

// ============================================
// تحديد المعدل - Rate Limiting
// ============================================
let rateLimiter;
try {
  rateLimiter = require('./rateLimiter.unified');
} catch (e) {
  logger.warn('RateLimiter module failed to load:', { error: e.message });
  // Fallback - create dummy rate limiter
  rateLimiter = {
    loginLimiter: (req, res, next) => next(),
    apiLimiter: (req, res, next) => next(),
    createLimiter: () => (req, res, next) => next(),
  };
}

// ============================================
// التخزين المؤقت - Caching
// ============================================
const caching = require('./caching.middleware');

// ============================================
// تصدير موحد
// ============================================

module.exports = {
  // Authentication - المصادقة
  authenticate: auth.authenticate,
  authorize: auth.authorize,
  optionalAuth: auth.optionalAuth,
  protect: auth.protect,
  authenticateToken: auth.authenticateToken,
  requireAuth: auth.requireAuth,
  requireRole: auth.requireRole,
  requireAdmin: auth.requireAdmin,
  checkPermission: auth.checkPermission,
  requireMFA: auth.requireMFA,
  checkOwnership: auth.checkOwnership,
  checkBranch: auth.checkBranch,
  refreshToken: auth.refreshToken,
  validateAPIKey: auth.validateAPIKey,
  logActivity: auth.logActivity,
  requirePasswordChange: auth.requirePasswordChange,
  requireVerified: auth.requireVerified,
  checkActiveUser: auth.checkActiveUser,

  // Validation - التحقق
  validate: validation.validate,
  handleValidationErrors: validation.handleValidationErrors,
  emailRules: validation.emailRules,
  passwordRules: validation.passwordRules,
  simplePasswordRules: validation.simplePasswordRules,
  phoneRules: validation.phoneRules,
  nationalIdRules: validation.nationalIdRules,
  idRules: validation.idRules,
  paginationRules: validation.paginationRules,
  dateRules: validation.dateRules,
  userRules: validation.userRules,
  loginRules: validation.loginRules,
  updateUserRules: validation.updateUserRules,
  employeeRules: validation.employeeRules,
  validateEmployee: validation.validateEmployee,
  beneficiaryRules: validation.beneficiaryRules,
  fileUploadRules: validation.fileUploadRules,
  maxFileSize: validation.maxFileSize,
  allowedFileTypes: validation.allowedFileTypes,
  amountRules: validation.amountRules,
  invoiceRules: validation.invoiceRules,
  sanitizeInput: validation.sanitizeInput,
  preventNoSQLInjection: validation.preventNoSQLInjection,

  // Rate Limiting - تحديد المعدل
  createRateLimiter: rateLimiter.createRateLimiter,
  generalLimiter: rateLimiter.generalLimiter,
  authLimiter: rateLimiter.authLimiter,
  loginLimiter: rateLimiter.loginLimiter,
  apiLimiter: rateLimiter.apiLimiter,
  createLimiter: rateLimiter.createLimiter,
  uploadLimiter: rateLimiter.uploadLimiter,
  searchLimiter: rateLimiter.searchLimiter,
  notificationLimiter: rateLimiter.notificationLimiter,
  roleBasedLimiter: rateLimiter.roleBasedLimiter,
  ipLimiter: rateLimiter.ipLimiter,
  userLimiter: rateLimiter.userLimiter,
  passwordResetLimiter: rateLimiter.passwordResetLimiter,
  messagingLimiter: rateLimiter.messagingLimiter,
  reportLimiter: rateLimiter.reportLimiter,
  exportLimiter: rateLimiter.exportLimiter,

  // Caching - التخزين المؤقت
  cacheGET: caching.cacheGET,
  cacheSingle: caching.cacheSingle,
  invalidateCache: caching.invalidateCache,
  invalidateOnMutation: caching.invalidateOnMutation,
  getCacheStats: caching.getCacheStats,
  clearCache: caching.clearCache,

  // Nested exports for advanced usage
  auth,
  validation,
  rateLimiter,
  caching,
};

// ============================================
// توثيق الاستخدام
// ============================================

/**
 * مثال على الاستخدام:
 *
 * const { authenticate, authorize, loginLimiter, validate, loginRules } = require('../middleware');
 *
 * // تطبيق على route
 * router.post('/login',
 *   loginLimiter,
 *   validate(loginRules()),
 *   authController.login
 * );
 *
 * // حماية route
 * router.get('/profile',
 *   authenticate,
 *   authorize('admin', 'manager'),
 *   userController.getProfile
 * );
 */
