const express = require('express');
const { body, param, query } = require('express-validator');
const policyController = require('../controllers/policyController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Middleware للتحقق من التصريح
const requireAuth = auth.authenticate;
const requireAdmin = [auth.authenticate, rbac.authorize(['ADMIN', 'POLICY_MANAGER'])];
const requireApprover = [auth.authenticate, rbac.authorize(['ADMIN', 'POLICY_MANAGER', 'APPROVER'])];

// ==================== سياسات ====================

/**
 * POST /api/policies
 * إنشاء سياسة جديدة
 */
router.post(
  '/',
  requireAdmin,
  [
    body('policyName').trim().notEmpty().withMessage('اسم السياسة مطلوب'),
    body('policyNameAr').trim().notEmpty().withMessage('اسم السياسة بالعربية مطلوب'),
    body('description').trim().notEmpty().withMessage('الوصف مطلوب'),
    body('descriptionAr').trim().notEmpty().withMessage('الوصف بالعربية مطلوب'),
    body('policyType').isIn([
      'SALARY_INCENTIVES', 'LEAVE_VACATION', 'SECURITY_COMPLIANCE',
      'LOANS_BENEFITS', 'HR_PROCEDURES', 'WORKPLACE_CONDUCT',
      'HEALTH_SAFETY', 'DATA_CONFIDENTIALITY', 'PERFORMANCE_EVALUATION',
      'DISCIPLINARY', 'COMPENSATION', 'TRAINING_DEVELOPMENT',
      'WORKPLACE_RIGHTS', 'OTHER'
    ]).withMessage('نوع السياسة غير صحيح'),
    body('content').trim().notEmpty().withMessage('محتوى السياسة مطلوب'),
    body('contentAr').trim().notEmpty().withMessage('محتوى السياسة بالعربية مطلوب'),
    body('effectiveDate').isISO8601().withMessage('تاريخ البدء غير صحيح')
  ],
  policyController.createPolicy.bind(policyController)
);

/**
 * GET /api/policies
 * الحصول على جميع السياسات مع التصفية
 */
router.get(
  '/',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn([
      'SALARY_INCENTIVES', 'LEAVE_VACATION', 'SECURITY_COMPLIANCE',
      'LOANS_BENEFITS', 'HR_PROCEDURES', 'WORKPLACE_CONDUCT',
      'HEALTH_SAFETY', 'DATA_CONFIDENTIALITY', 'PERFORMANCE_EVALUATION',
      'DISCIPLINARY', 'COMPENSATION', 'TRAINING_DEVELOPMENT',
      'WORKPLACE_RIGHTS', 'OTHER'
    ]),
    query('status').optional().isIn(['DRAFT', 'ACTIVE', 'PENDING_APPROVAL', 'ARCHIVED', 'SUSPENDED'])
  ],
  policyController.getPolicies.bind(policyController)
);

/**
 * GET /api/policies/active/all
 * الحصول على السياسات النشطة فقط
 */
router.get(
  '/active/all',
  requireAuth,
  policyController.getActivePolicies.bind(policyController)
);

/**
 * GET /api/policies/:policyId
 * الحصول على سياسة محددة
 */
router.get(
  '/:policyId',
  requireAuth,
  [param('policyId').notEmpty().withMessage('معرف السياسة مطلوب')],
  policyController.getPolicy.bind(policyController)
);

/**
 * PUT /api/policies/:policyId
 * تحديث السياسة
 */
router.put(
  '/:policyId',
  requireAdmin,
  [param('policyId').notEmpty().withMessage('معرف السياسة مطلوب')],
  policyController.updatePolicy.bind(policyController)
);

/**
 * DELETE /api/policies/:policyId
 * حذف السياسة
 */
router.delete(
  '/:policyId',
  requireAdmin,
  [param('policyId').notEmpty().withMessage('معرف السياسة مطلوب')],
  policyController.deletePolicy.bind(policyController)
);

// ==================== الموافقات ====================

/**
 * POST /api/policies/:policyId/submit-approval
 * إرسال السياسة للموافقة
 */
router.post(
  '/:policyId/submit-approval',
  requireAdmin,
  [
    param('policyId').notEmpty(),
    body('approvers').isArray().notEmpty()
  ],
  policyController.submitForApproval.bind(policyController)
);

/**
 * POST /api/policies/:policyId/approve
 * الموافقة على السياسة
 */
router.post(
  '/:policyId/approve',
  requireApprover,
  [
    param('policyId').notEmpty(),
    body('approverRole').notEmpty()
  ],
  policyController.approvePolicy.bind(policyController)
);

/**
 * POST /api/policies/:policyId/reject
 * رفض السياسة
 */
router.post(
  '/:policyId/reject',
  requireApprover,
  [
    param('policyId').notEmpty(),
    body('approverRole').notEmpty(),
    body('reason').notEmpty()
  ],
  policyController.rejectPolicy.bind(policyController)
);

/**
 * GET /api/policies/approvals/pending
 * الحصول على السياسات المعلقة للموافقة
 */
router.get(
  '/approvals/pending',
  requireApprover,
  policyController.getPendingApprovals.bind(policyController)
);

// ==================== الاعترافات ====================

/**
 * POST /api/policies/:policyId/send-acknowledgement
 * إرسال السياسة للاعتراف
 */
router.post(
  '/:policyId/send-acknowledgement',
  requireAdmin,
  [
    param('policyId').notEmpty(),
    body('employees').isArray().notEmpty()
  ],
  policyController.sendForAcknowledgement.bind(policyController)
);

/**
 * POST /api/policies/acknowledge/batch
 * الاعتراف بالسياسات
 */
router.post(
  '/acknowledge/batch',
  requireAuth,
  [body('policyIds').isArray().notEmpty()],
  policyController.acknowledgePolicies.bind(policyController)
);

/**
 * GET /api/acknowledgements/pending
 * الحصول على الاعترافات المعلقة للموظف الحالي
 */
router.get(
  '/acknowledgements/pending',
  requireAuth,
  policyController.getPendingAcknowledgements.bind(policyController)
);

/**
 * GET /api/policies/:policyId/acknowledgement-report
 * الحصول على تقرير الاعترافات
 */
router.get(
  '/:policyId/acknowledgement-report',
  requireAdmin,
  policyController.getAcknowledgementReports.bind(policyController)
);

// ==================== معلومات مساعدة ====================

/**
 * GET /api/policies/metadata/types
 * الحصول على أنواع السياسات
 */
router.get(
  '/metadata/types',
  requireAuth,
  policyController.getPolicyTypes.bind(policyController)
);

/**
 * GET /api/policies/metadata/statuses
 * الحصول على حالات السياسات
 */
router.get(
  '/metadata/statuses',
  requireAuth,
  policyController.getPolicyStatuses.bind(policyController)
);

/**
 * GET /api/policies/analytics/statistics
 * الحصول على الإحصائيات العامة
 */
router.get(
  '/analytics/statistics',
  requireAdmin,
  policyController.getStatistics.bind(policyController)
);

module.exports = router;
