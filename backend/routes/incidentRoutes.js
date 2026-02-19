// backend/routes/incidentRoutes.js
// مسارات إدارة الحوادث
// Incident Management Routes

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const incidentController = require('../controllers/incidentController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const upload = require('../middleware/upload');

// =============== التحقق من البيانات ===============

const createIncidentValidation = [
  body('title').isLength({ min: 5 }).withMessage('العنوان يجب أن يكون 5 أحرف على الأقل'),
  body('description').isLength({ min: 10 }).withMessage('الوصف يجب أن يكون 10 أحرف على الأقل'),
  body('category').isIn([
    'SECURITY_BREACH', 'SYSTEM_OUTAGE', 'NETWORK_ISSUE', 'DATABASE_FAILURE',
    'APPLICATION_ERROR', 'HARDWARE_FAILURE', 'PERFORMANCE_ISSUE', 'DATA_LOSS',
    'COMPLIANCE_ISSUE', 'COMMUNICATION_ISSUE', 'HUMAN_ERROR', 'THIRD_PARTY_ISSUE',
    'ENVIRONMENTAL', 'OTHER'
  ]).withMessage('نوع الحادثة غير صحيح'),
  body('severity').isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).withMessage('مستوى الخطورة غير صحيح'),
  body('priority').optional().isIn(['P1', 'P2', 'P3', 'P4', 'P5']).withMessage('الأولوية غير صحيحة')
];

const updateStatusValidation = [
  body('status').isIn([
    'REPORTED', 'ACKNOWLEDGED', 'INVESTIGATING', 'IDENTIFIED',
    'IN_RESOLUTION', 'RESOLVED', 'CLOSED', 'REOPENED'
  ]).withMessage('الحالة غير صحيحة'),
  body('notes').optional().isString().withMessage('الملاحظات يجب أن تكون نص')
];

const assignValidation = [
  body('assignedToIds').isArray({ min: 1 }).withMessage('يجب تحديد على الأقل مستخدم واحد'),
  body('teamLeadId').optional().isString().withMessage('معرف رئيس الفريق غير صحيح')
];

const responderValidation = [
  body('name').isString().withMessage('الاسم مطلوب'),
  body('role').isIn(['PRIMARY', 'SECONDARY', 'SUPPORT', 'OBSERVER']).withMessage('الدور غير صحيح'),
  body('employeeId').isString().withMessage('معرف الموظف مطلوب')
];

const escalationValidation = [
  body('escalatedTo').isString().withMessage('يجب تحديد المستقبل'),
  body('reason').isString().withMessage('السبب مطلوب'),
  body('notes').optional().isString().withMessage('الملاحظات يجب أن تكون نص')
];

const commentValidation = [
  body('comment').isLength({ min: 1 }).withMessage('التعليق مطلوب'),
  body('isInternal').optional().isBoolean().withMessage('isInternal يجب أن تكون قيمة منطقية')
];

const resolutionValidation = [
  body('rootCause').isString().withMessage('السبب الجذري مطلوب'),
  body('solution').isString().withMessage('الحل مطلوب'),
  body('permanentFix').optional().isBoolean().withMessage('permanentFix يجب أن تكون قيمة منطقية'),
  body('temporaryWorkaround').optional().isString().withMessage('حل مؤقت غير صحيح')
];

const closureValidation = [
  body('closureReason').isIn(['RESOLVED', 'DUPLICATE', 'CANNOT_REPRODUCE', 'INVALID', 'DEFERRED', 'OTHER']).withMessage('سبب الإغلاق غير صحيح'),
  body('closureNotes').optional().isString().withMessage('ملاحظات الإغلاق غير صحيحة')
];

// =============== المسارات ===============

// 1. إنشاء حادثة جديدة
router.post('/',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER', 'SUPPORT_TEAM']),
  createIncidentValidation,
  incidentController.createIncident
);

// 2. الحصول على جميع الحوادث
router.get('/',
  auth,
  incidentController.getAllIncidents
);

// 3. الحصول على الحوادث المعلقة (Dashboard)
router.get('/pending/list',
  auth,
  incidentController.getPendingIncidents
);

// 4. الحصول على الحوادث الحرجة
router.get('/critical/list',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER']),
  incidentController.getCriticalIncidents
);

// 5. البحث المتقدم
router.get('/search/advanced',
  auth,
  incidentController.searchIncidents
);

// 6. الحصول على الإحصائيات
router.get('/reports/statistics',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER', 'ANALYST']),
  incidentController.getStatistics
);

// 7. الحصول على حادثة بواسطة ID
router.get('/:id',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  incidentController.getIncidentById
);

// 8. الحصول على الحوادث ذات الصلة
router.get('/:id/related',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  incidentController.getRelatedIncidents
);

// 9. تحديث حادثة
router.put('/:id',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  createIncidentValidation,
  incidentController.updateIncident
);

// 10. تحديث حالة الحادثة
router.patch('/:id/status',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  updateStatusValidation,
  incidentController.updateStatus
);

// 11. إسناد الحادثة
router.post('/:id/assign',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  assignValidation,
  incidentController.assignIncident
);

// 12. إضافة مستجيب
router.post('/:id/responder',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  responderValidation,
  incidentController.addResponder
);

// 13. تصعيد الحادثة
router.post('/:id/escalate',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER', 'TEAM_LEAD']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  escalationValidation,
  incidentController.escalateIncident
);

// 14. إضافة تعليق
router.post('/:id/comment',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  commentValidation,
  incidentController.addComment
);

// 15. إضافة مرفق
router.post('/:id/attachment',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  upload.single('file'),
  incidentController.addAttachment
);

// 16. حل الحادثة
router.post('/:id/resolve',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER', 'TEAM_LEAD']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  resolutionValidation,
  incidentController.resolveIncident
);

// 17. إغلاق الحادثة
router.post('/:id/close',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  closureValidation,
  incidentController.closeIncident
);

// 18. أرشفة الحادثة
router.post('/:id/archive',
  auth,
  roleAuth(['ADMIN', 'INCIDENT_MANAGER']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  incidentController.archiveIncident
);

// 19. توليد تقرير
router.get('/:id/report',
  auth,
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  incidentController.generateReport
);

// 20. حذف حادثة
router.delete('/:id',
  auth,
  roleAuth(['ADMIN']),
  param('id').isMongoId().withMessage('معرف الحادثة غير صحيح'),
  incidentController.deleteIncident
);

// معالجة الأخطاء العامة
router.use((error, req, res, next) => {
  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  next();
});

module.exports = router;
