/* eslint-disable no-unused-vars */
/**
 * نظام الأصول ERP - ملف تجميع المسارات
 * الإصدار 2.0.0
 */

const express = require('express');
const router = express.Router();

// استيراد المسارات
const authRoutes = require('./auth.routes');
const otpAuthRoutes = require('./otp-auth.routes');
const usersRoutes = require('./users.routes');
const branchesRoutes = require('./branches.routes');
const projectsRoutes = require('./projects.routes');
const hrRoutes = require('./hr.routes');
const inventoryRoutes = require('./inventory.routes');
const financeRoutes = require('./finance.routes');

// تسجيل المسارات
router.use('/auth', authRoutes);
router.use('/auth/otp', otpAuthRoutes);
router.use('/users', usersRoutes);
router.use('/branches', branchesRoutes);
router.use('/projects', projectsRoutes);
router.use('/hr', hrRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/finance', financeRoutes);

// مسار التحقق من الصحة
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'نظام الأصول ERP - البنية الأساسية تعمل بشكل صحيح',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// مسار الجذر
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'مرحباً بك في نظام الأصول ERP',
    endpoints: {
      auth: '/api/v1/auth',
      'auth/otp': '/api/v1/auth/otp',
      users: '/api/v1/users',
      branches: '/api/v1/branches',
      projects: '/api/v1/projects',
      health: '/api/v1/health',
    },
  });
});

module.exports = router;
