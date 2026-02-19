/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    🔗 ZAKAT API ROUTES                                        ║
 * ║                        مسارات نظام حساب الزكاة                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const ZakatController = require('../controllers/zakat.controller');

// Middleware
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// ============================================================================
// 🔐 ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================================
router.use(protect);

// ============================================================================
// 📊 ZAKAT CALCULATIONS
// ============================================================================

/**
 * POST /api/zakat/calculate
 * 🧮 حساب زكاة جديدة
 * Create a new zakat calculation
 * 
 * Required roles: USER, FINANCE_OFFICER, ADMIN
 * 
 * Request body:
 * {
 *   assets: [
 *     {
 *       type: "CASH",
 *       name: "حسابي البنكي",
 *       amount: 10000,
 *       currency: "SAR"
 *     },
 *     {
 *       type: "GOLD",
 *       name: "الذهب الشخصي",
 *       quantity: 100,
 *       unit: "grams",
 *       currentPrice: 65000
 *     }
 *   ],
 *   jahriYear: 1445
 * }
 */
router.post(
  '/calculate',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  validateRequest,
  ZakatController.calculateNewZakat
);

/**
 * GET /api/zakat/calculations
 * 📋 الحصول على قائمة حسابات الزكاة
 * Get list of zakat calculations
 * 
 * Query parameters:
 * - status: PENDING, PARTIALLY_PAID, FULLY_PAID, OVERDUE
 * - year: الحصول على حسابات سنة معينة
 */
router.get(
  '/calculations',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  ZakatController.getCalculations
);

/**
 * GET /api/zakat/calculations/:id
 * 📊 الحصول على تفاصيل حساب الزكاة
 * Get zakat calculation details
 */
router.get(
  '/calculations/:id',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  ZakatController.getCalculationDetails
);

// ============================================================================
// 💰 ZAKAT PAYMENTS
// ============================================================================

/**
 * POST /api/zakat/payments
 * 💳 تسجيل دفعة زكاة جديدة
 * Record a new zakat payment
 * 
 * Required roles: USER, FINANCE_OFFICER, ADMIN
 * 
 * Request body:
 * {
 *   calculationId: "507f1f77bcf86cd799439011",
 *   amount: 2500,
 *   paymentMethod: "BANK_TRANSFER",
 *   recipientType: "CHARITY_ORG",
 *   recipientName: "جمعية خيرية",
 *   recipientContact: "0551234567"
 * }
 */
router.post(
  '/payments',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  validateRequest,
  ZakatController.recordZakatPayment
);

/**
 * GET /api/zakat/payments/:calculationId
 * 📜 الحصول على سجل الدفعات
 * Get payment history for a calculation
 */
router.get(
  '/payments/:calculationId',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  ZakatController.getPayments
);

// ============================================================================
// 📊 DASHBOARD & STATISTICS
// ============================================================================

/**
 * GET /api/zakat/dashboard
 * 📈 لوحة تحكم الزكاة
 * Get zakat dashboard with comprehensive statistics
 */
router.get(
  '/dashboard',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  ZakatController.getZakatDashboard
);

// ============================================================================
// 🔔 REMINDERS & NOTIFICATIONS
// ============================================================================

/**
 * GET /api/zakat/reminders
 * 🔔 الحصول على التذكيرات
 * Get zakat reminders
 * 
 * Query parameters:
 * - isRead: true/false لتصفية التذكيرات
 */
router.get(
  '/reminders',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  ZakatController.getReminders
);

/**
 * PUT /api/zakat/reminders/:id/read
 * ✅ تحديد التذكير كمقروء
 * Mark reminder as read
 */
router.put(
  '/reminders/:id/read',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  ZakatController.markReminderAsRead
);

// ============================================================================
// 📄 REPORTS
// ============================================================================

/**
 * POST /api/zakat/reports/generate
 * 📄 إنشاء تقرير الزكاة
 * Generate zakat report
 * 
 * Required roles: USER, FINANCE_OFFICER, ADMIN
 * 
 * Request body:
 * {
 *   fromYear: 1444,
 *   toYear: 1445,
 *   reportType: "ANNUAL"
 * }
 */
router.post(
  '/reports/generate',
  authorize(['USER', 'FINANCE_OFFICER', 'ADMIN']),
  validateRequest,
  ZakatController.generateZakatReport
);

// ============================================================================
// 🏥 HEALTH CHECK
// ============================================================================

/**
 * GET /api/zakat/health
 * 🟢 صحة النظام
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام حساب الزكاة يعمل بكفاءة',
    status: 'HEALTHY',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 📤 EXPORT
// ============================================================================

module.exports = router;
