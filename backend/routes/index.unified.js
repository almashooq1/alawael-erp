/**
 * 📦 Unified Routes Index - فهرس المسارات الموحد
 * نقطة تجميع واحدة لجميع المسارات
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();

// ============================================
// استيراد المسارات الموحدة
// ============================================

// المسارات الأساسية
const hrRoutes = require('./hr.routes.unified');
const notificationsRoutes = require('./notifications.routes.unified');

// ============================================
// المسارات القديمة (للتوافقية)
// ============================================

// محاولة استيراد المسارات القديمة إذا وجدت
let authRoutes, userRoutes, financeRoutes, dashboardRoutes;

try {
  authRoutes = require('./auth.routes');
} catch (e) { authRoutes = null; }

try {
  userRoutes = require('./user.routes');
} catch (e) { userRoutes = null; }

try {
  financeRoutes = require('./finance.routes');
} catch (e) { financeRoutes = null; }

try {
  dashboardRoutes = require('./dashboard.routes');
} catch (e) { dashboardRoutes = null; }

// ============================================
// Health Check
// ============================================

/**
 * @route   GET /api/health
 * @desc    فحص صحة النظام
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام الأوقاف يعمل بشكل صحيح',
    timestamp: new Date(),
    version: '2.0.0'
  });
});

// ============================================
// تسجيل المسارات
// ============================================

// المسارات الموحدة (جديدة)
router.use('/hr', hrRoutes);
router.use('/notifications', notificationsRoutes);

// المسارات القديمة (للتوافقية)
if (authRoutes) router.use('/auth', authRoutes);
if (userRoutes) router.use('/users', userRoutes);
if (financeRoutes) router.use('/finance', financeRoutes);
if (dashboardRoutes) router.use('/dashboard', dashboardRoutes);

// ============================================
// معالجة 404
// ============================================

router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `المسار ${req.originalUrl} غير موجود`,
    availableRoutes: [
      'GET /api/health',
      'HR: /api/hr/*',
      'Notifications: /api/notifications/*',
      'Dashboard: /api/dashboard/*',
      'Auth: /api/auth/*',
      'Users: /api/users/*',
      'Finance: /api/finance/*'
    ]
  });
});

// ============================================
// معالجة الأخطاء
// ============================================

router.use((err, req, res, next) => {
  console.error('❌ Route Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'خطأ داخلي في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// تصدير المسارات
// ============================================

module.exports = router;

// ============================================
// قائمة بجميع المسارات المتاحة
// ============================================

/**
 * المسارات المتاحة:
 *
 * 🏥 Health:
 * GET /api/health
 *
 * 👥 HR (الموارد البشرية):
 * GET    /api/hr/employees
 * GET    /api/hr/employees/:id
 * POST   /api/hr/employees
 * PUT    /api/hr/employees/:id
 * DELETE /api/hr/employees/:id
 * GET    /api/hr/payroll
 * POST   /api/hr/payroll/calculate
 * POST   /api/hr/payroll/approve
 * GET    /api/hr/leaves
 * POST   /api/hr/leaves/request
 * PUT    /api/hr/leaves/:id/approve
 * PUT    /api/hr/leaves/:id/reject
 * GET    /api/hr/attendance
 * POST   /api/hr/attendance/check-in
 * POST   /api/hr/attendance/check-out
 * GET    /api/hr/performance
 * POST   /api/hr/performance/review
 * GET    /api/hr/training
 * POST   /api/hr/training/enroll
 * GET    /api/hr/reports
 * GET    /api/hr/dashboard
 *
 * 🔔 Notifications (الإشعارات):
 * GET    /api/notifications
 * GET    /api/notifications/unread
 * GET    /api/notifications/:id
 * PUT    /api/notifications/:id/read
 * PUT    /api/notifications/read-all
 * DELETE /api/notifications/:id
 * DELETE /api/notifications/clear-all
 * GET    /api/notifications/settings
 * PUT    /api/notifications/settings
 * POST   /api/notifications/send
 * POST   /api/notifications/broadcast
 * GET    /api/notifications/types/list
 * GET    /api/notifications/scheduled
 * POST   /api/notifications/schedule
 * DELETE /api/notifications/scheduled/:id
 * GET    /api/notifications/templates
 * POST   /api/notifications/templates
 * GET    /api/notifications/stats
 */
