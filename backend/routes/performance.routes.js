/**
 * performance.routes.js
 * مسارات مقاييس الأداء
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authGate } = require('../middleware/authUnified');
const controller = require('../controllers/performance.controller');

const router = express.Router();

// Web Vitals: POST عام للمتصفحات (يمكن أن يكون بدون auth أو مع auth خفيف)
router.post('/web-vitals', authenticate, controller.collectWebVitals);

// Web Vitals: GET للإدارة
router.get(
  '/web-vitals',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getWebVitals
);
router.get(
  '/web-vitals/worst-pages',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getWorstPages
);

// Lighthouse
router.post(
  '/lighthouse/run',
  authenticate,
  authGate({ roles: ['admin', 'super_admin'] }),
  controller.runLighthouse
);
router.get(
  '/lighthouse',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getLighthouseAudits
);
router.get(
  '/lighthouse/latest',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getLatestLighthouse
);

// PageSpeed Insights
router.get(
  '/pagespeed',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getPageSpeed
);
router.get(
  '/pagespeed/history',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getPageSpeedHistory
);

// Dashboard
router.get(
  '/dashboard',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getDashboard
);

// Alerts
router.get(
  '/alerts',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getAlerts
);
router.patch(
  '/alerts/:id',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.updateAlert
);

// Budget
router.get(
  '/budget',
  authenticate,
  authGate({ roles: ['admin', 'super_admin'] }),
  controller.getBudget
);
router.post(
  '/budget',
  authenticate,
  authGate({ roles: ['admin', 'super_admin'] }),
  controller.updateBudget
);
router.get(
  '/budget/status',
  authenticate,
  authGate({ roles: ['admin', 'super_admin', 'manager'] }),
  controller.getBudgetStatus
);

module.exports = router;
