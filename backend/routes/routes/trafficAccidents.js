/**
 * Traffic Accident Routes - مسارات الحوادث المرورية
 * API endpoints لتقارير الحوادث المرورية الشاملة
 */

const express = require('express');
const router = express.Router();
const trafficAccidentController = require('../controllers/trafficAccidentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// ========================================
// MIDDLEWARE
// ========================================
router.use(authenticate);

// ========================================
// REPORTS ENDPOINTS
// ========================================

/**
 * POST /api/traffic-accidents
 * إنشاء تقرير حادث جديد
 */
router.post(
  '/',
  authorize('create_accident_report'),
  trafficAccidentController.createAccidentReport
);

/**
 * GET /api/traffic-accidents
 * الحصول على جميع التقارير مع التصفية والترقيم
 * Query params: status, severity, city, priority, startDate, endDate, page, limit
 */
router.get(
  '/',
  authorize('view_accident_reports'),
  trafficAccidentController.getAllReports
);

/**
 * GET /api/traffic-accidents/search
 * البحث المتقدم في التقارير
 * Query params: q, severity, status, page, limit
 */
router.get(
  '/search',
  authorize('view_accident_reports'),
  trafficAccidentController.searchReports
);

/**
 * GET /api/traffic-accidents/statistics
 * الحصول على الإحصائيات والتقارير
 * Query params: startDate, endDate, city, severity, status
 */
router.get(
  '/statistics',
  authorize('view_accident_statistics'),
  trafficAccidentController.getStatistics
);

/**
 * GET /api/traffic-accidents/overdue
 * الحصول على المتابعات المتأخرة
 * Query params: daysThreshold
 */
router.get(
  '/overdue',
  authorize('view_accident_reports'),
  trafficAccidentController.getOverdueFollowUps
);

/**
 * GET /api/traffic-accidents/nearby
 * الحصول على الحوادث القريبة جغرافياً
 * Query params: latitude, longitude, maxDistance
 */
router.get(
  '/nearby',
  authorize('view_accident_reports'),
  trafficAccidentController.getNearbyAccidents
);

/**
 * GET /api/traffic-accidents/:id
 * الحصول على تقرير محدد
 */
router.get(
  '/:id',
  authorize('view_accident_reports'),
  trafficAccidentController.getReportById
);

/**
 * PUT /api/traffic-accidents/:id
 * تحديث تقرير الحادث
 */
router.put(
  '/:id',
  authorize('edit_accident_report'),
  trafficAccidentController.updateAccidentReport
);

/**
 * DELETE /api/traffic-accidents/:id
 * حذف/أرشفة تقرير
 */
router.delete(
  '/:id',
  authorize('delete_accident_report'),
  trafficAccidentController.deleteAccidentReport
);

// ========================================
// STATUS MANAGEMENT ENDPOINTS
// ========================================

/**
 * PATCH /api/traffic-accidents/:id/status
 * تحديث حالة التقرير
 * Body: { status: string, notes?: string }
 */
router.patch(
  '/:id/status',
  authorize('edit_accident_report'),
  trafficAccidentController.updateReportStatus
);

/**
 * POST /api/traffic-accidents/:id/approve
 * الموافقة على التقرير
 */
router.post(
  '/:id/approve',
  authorize('approve_accident_report'),
  (req, res, next) => {
    req.body.status = 'approved';
    trafficAccidentController.updateReportStatus(req, res);
  }
);

/**
 * POST /api/traffic-accidents/:id/close
 * إغلاق التقرير
 * Body: { conclusionData: object }
 */
router.post(
  '/:id/close',
  authorize('close_accident_report'),
  trafficAccidentController.closeReport
);

// ========================================
// INVESTIGATION ENDPOINTS
// ========================================

/**
 * POST /api/traffic-accidents/:id/investigation/start
 * بدء التحقيق
 * Body: { investigatingOfficerId: string }
 */
router.post(
  '/:id/investigation/start',
  authorize('start_investigation'),
  trafficAccidentController.startInvestigation
);

/**
 * POST /api/traffic-accidents/:id/investigation/complete
 * إكمال التحقيق
 * Body: { findings, rootCause, contributingFactors, recommendations, primaryCause }
 */
router.post(
  '/:id/investigation/complete',
  authorize('complete_investigation'),
  trafficAccidentController.completeInvestigation
);

// ========================================
// LIABILITY & DAMAGE ENDPOINTS
// ========================================

/**
 * POST /api/traffic-accidents/:id/liability
 * تحديد المسؤولية
 * Body: { primaryResponsiblePartyId, responsibilityPercentage, determination }
 */
router.post(
  '/:id/liability',
  authorize('determine_liability'),
  trafficAccidentController.determineLiability
);

/**
 * PUT /api/traffic-accidents/:id/vehicles/:vehicleIndex/damage
 * تحديث معلومات الضرر
 * Body: damageData object
 */
router.put(
  '/:id/vehicles/:vehicleIndex/damage',
  authorize('edit_accident_report'),
  trafficAccidentController.updateDamageInfo
);

/**
 * POST /api/traffic-accidents/:id/vehicles/:vehicleIndex/insurance
 * إضافة معلومات التأمين
 * Body: insuranceData object
 */
router.post(
  '/:id/vehicles/:vehicleIndex/insurance',
  authorize('edit_accident_report'),
  trafficAccidentController.addInsuranceInfo
);

// ========================================
// COMMENTS & ATTACHMENTS ENDPOINTS
// ========================================

/**
 * POST /api/traffic-accidents/:id/comments
 * إضافة تعليق
 * Body: { comment: string, attachments?: array }
 */
router.post(
  '/:id/comments',
  authorize('add_comment'),
  trafficAccidentController.addComment
);

/**
 * POST /api/traffic-accidents/:id/attachments
 * إضافة مرفق
 * Body: { fileName: string, fileUrl: string, fileType: string }
 */
router.post(
  '/:id/attachments',
  authorize('upload_attachment'),
  trafficAccidentController.addAttachment
);

// ========================================
// WITNESSES ENDPOINTS
// ========================================

/**
 * POST /api/traffic-accidents/:id/witnesses
 * إضافة شاهد
 * Body: witnessData object
 */
router.post(
  '/:id/witnesses',
  authorize('add_witness'),
  trafficAccidentController.addWitness
);

// ========================================
// EXPORT ENDPOINTS
// ========================================

/**
 * GET /api/traffic-accidents/:id/export/pdf
 * تصدير التقرير بصيغة PDF
 */
router.get(
  '/:id/export/pdf',
  authorize('export_report'),
  trafficAccidentController.exportPDF
);

/**
 * GET /api/traffic-accidents/export/excel
 * تصدير التقارير بصيغة Excel
 * Query params: startDate, endDate, city, severity
 */
router.get(
  '/export/excel',
  authorize('export_report'),
  trafficAccidentController.exportExcel
);

module.exports = router;
