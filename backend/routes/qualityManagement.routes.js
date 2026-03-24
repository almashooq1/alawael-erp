/**
 * Quality Management Routes — مسارات إدارة الجودة (ISO / CBAHI)
 * Phase 20 — تدقيق، مؤشرات جودة، تقارير اعتماد تلقائية
 */

const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const svc = require('../services/qualityManagement.service');

const router = express.Router();

/* ── Helpers ── */
const handleValidation = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

const getUserId = req => req.user?.id || req.user?._id || 'anonymous';

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ═══════════════════ Dashboard & Reference ═══════════════════ */

router.get(
  '/dashboard',
  authenticate,
  wrap((req, res) => {
    const data = svc.getDashboard();
    res.json({ success: true, data });
  })
);

router.get(
  '/statistics',
  authenticate,
  wrap((req, res) => {
    const data = svc.getStatistics();
    res.json({ success: true, data });
  })
);

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        standards: svc.getStandards(),
        auditTypes: svc.getAuditTypes(),
        auditStatuses: svc.getAuditStatuses(),
        findingSeverities: svc.getFindingSeverities(),
        ncStatuses: svc.getNcStatuses(),
        capaTypes: svc.getCapaTypes(),
        riskLevels: svc.getRiskLevels(),
        docTypes: svc.getDocTypes(),
        departments: svc.getDepartments(),
      },
    });
  })
);

/* ═══════════════════ Audits ═══════════════════ */

router.get(
  '/audits',
  authenticate,
  wrap((req, res) => {
    const data = svc.listAudits(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/audits/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getAudit(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'التدقيق غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/audits',
  authenticate,
  authorize('admin', 'quality_manager', 'auditor'),
  [
    body('titleAr').notEmpty().withMessage('عنوان التدقيق بالعربية مطلوب'),
    body('type')
      .isIn(['internal', 'external', 'surveillance', 'mock', 'follow_up'])
      .withMessage('نوع التدقيق غير صالح'),
    body('standard').notEmpty().withMessage('المعيار مطلوب'),
    body('department').notEmpty().withMessage('القسم مطلوب'),
    body('scheduledDate').notEmpty().withMessage('تاريخ التدقيق مطلوب'),
    body('leadAuditor').notEmpty().withMessage('المدقق الرئيسي مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createAudit({ ...req.body, status: 'planned' }, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/audits/:id',
  authenticate,
  authorize('admin', 'quality_manager', 'auditor'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateAudit(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'التدقيق غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/audits/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.deleteAudit(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'التدقيق غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Findings ═══════════════════ */

router.get(
  '/findings',
  authenticate,
  wrap((req, res) => {
    const data = svc.listFindings(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/findings/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getFinding(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/findings',
  authenticate,
  authorize('admin', 'quality_manager', 'auditor'),
  [
    body('auditId').notEmpty().withMessage('معرف التدقيق مطلوب'),
    body('titleAr').notEmpty().withMessage('عنوان الملاحظة بالعربية مطلوب'),
    body('severity')
      .isIn(['critical', 'major', 'minor', 'observation', 'opportunity'])
      .withMessage('درجة الخطورة غير صالحة'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createFinding(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/findings/:id',
  authenticate,
  authorize('admin', 'quality_manager', 'auditor'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateFinding(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/findings/:id/close',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.closeFinding(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Non-Conformances ═══════════════════ */

router.get(
  '/non-conformances',
  authenticate,
  wrap((req, res) => {
    const data = svc.listNonConformances(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/non-conformances/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getNonConformance(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'عدم المطابقة غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/non-conformances',
  authenticate,
  authorize('admin', 'quality_manager', 'auditor'),
  [
    body('titleAr').notEmpty().withMessage('عنوان عدم المطابقة بالعربية مطلوب'),
    body('standard').notEmpty().withMessage('المعيار مطلوب'),
    body('department').notEmpty().withMessage('القسم مطلوب'),
    body('severity')
      .isIn(['critical', 'major', 'minor', 'observation', 'opportunity'])
      .withMessage('درجة الخطورة غير صالحة'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createNonConformance(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/non-conformances/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateNonConformance(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'عدم المطابقة غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/non-conformances/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.deleteNonConformance(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'عدم المطابقة غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ CAPA (Corrective & Preventive Actions) ═══════════════════ */

router.get(
  '/capa',
  authenticate,
  wrap((req, res) => {
    const data = svc.listCAPAs(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/capa/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getCAPA(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/capa',
  authenticate,
  authorize('admin', 'quality_manager'),
  [
    body('ncId').notEmpty().withMessage('معرف عدم المطابقة مطلوب'),
    body('type').isIn(['corrective', 'preventive']).withMessage('نوع الإجراء غير صالح'),
    body('titleAr').notEmpty().withMessage('عنوان الإجراء بالعربية مطلوب'),
    body('responsiblePerson').notEmpty().withMessage('الشخص المسؤول مطلوب'),
    body('dueDate').notEmpty().withMessage('تاريخ الاستحقاق مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createCAPA(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/capa/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateCAPA(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/capa/:id/verify',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.verifyCAPA(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Quality Indicators ═══════════════════ */

router.get(
  '/indicators',
  authenticate,
  wrap((req, res) => {
    const data = svc.listIndicators(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/indicators/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getIndicator(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/indicators',
  authenticate,
  authorize('admin', 'quality_manager'),
  [
    body('code').notEmpty().withMessage('رمز المؤشر مطلوب'),
    body('nameAr').notEmpty().withMessage('اسم المؤشر بالعربية مطلوب'),
    body('standard').notEmpty().withMessage('المعيار المرتبط مطلوب'),
    body('department').notEmpty().withMessage('القسم مطلوب'),
    body('unit').notEmpty().withMessage('وحدة القياس مطلوبة'),
    body('target').isNumeric().withMessage('القيمة المستهدفة يجب أن تكون رقم'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createIndicator(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/indicators/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateIndicator(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/indicators/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.deleteIndicator(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══ Indicator Records ═══ */

router.get(
  '/indicators/:id/records',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getIndicatorRecords(req.params.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/indicators/:id/records',
  authenticate,
  authorize('admin', 'quality_manager'),
  [
    param('id').notEmpty(),
    body('period').notEmpty().withMessage('الفترة مطلوبة'),
    body('value').isNumeric().withMessage('القيمة يجب أن تكون رقم'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.addIndicatorRecord(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/indicators/:id/trend',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getIndicatorTrend(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Documents ═══════════════════ */

router.get(
  '/documents',
  authenticate,
  wrap((req, res) => {
    const data = svc.listDocuments(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/documents/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getDocument(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/documents',
  authenticate,
  authorize('admin', 'quality_manager'),
  [
    body('code').notEmpty().withMessage('رمز الوثيقة مطلوب'),
    body('titleAr').notEmpty().withMessage('عنوان الوثيقة بالعربية مطلوب'),
    body('type')
      .isIn(['policy', 'sop', 'work_instruction', 'form', 'manual', 'record'])
      .withMessage('نوع الوثيقة غير صالح'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createDocument(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/documents/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateDocument(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/documents/:id/approve',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.approveDocument(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/documents/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.deleteDocument(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Risk Register ═══════════════════ */

router.get(
  '/risks',
  authenticate,
  wrap((req, res) => {
    const data = svc.listRisks(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/risks/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getRisk(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الخطر غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/risks',
  authenticate,
  authorize('admin', 'quality_manager'),
  [
    body('titleAr').notEmpty().withMessage('عنوان الخطر بالعربية مطلوب'),
    body('standard').notEmpty().withMessage('المعيار مطلوب'),
    body('department').notEmpty().withMessage('القسم مطلوب'),
    body('likelihood').isInt({ min: 1, max: 5 }).withMessage('الاحتمالية يجب أن تكون بين 1 و 5'),
    body('impact').isInt({ min: 1, max: 5 }).withMessage('الأثر يجب أن يكون بين 1 و 5'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createRisk(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/risks/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateRisk(req.params.id, req.body, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الخطر غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/risks/:id',
  authenticate,
  authorize('admin', 'quality_manager'),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.deleteRisk(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الخطر غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Accreditation Reports ═══════════════════ */

router.get(
  '/accreditation-reports',
  authenticate,
  wrap((req, res) => {
    const data = svc.listAccreditationReports(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/accreditation-reports/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getAccreditationReport(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'تقرير الاعتماد غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/accreditation-reports/generate',
  authenticate,
  authorize('admin', 'quality_manager'),
  [body('standard').notEmpty().withMessage('المعيار مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.generateAccreditationReport(req.body, getUserId(req));
    if (!data) return res.status(400).json({ success: false, message: 'المعيار غير صالح' });
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/accreditation-reports/:id/export',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const format = req.query.format || 'json';
    const data = svc.exportAccreditationReport(req.params.id, format);
    if (!data) return res.status(404).json({ success: false, message: 'تقرير الاعتماد غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Compliance Matrix ═══════════════════ */

router.get(
  '/compliance-matrix/:standardId',
  authenticate,
  param('standardId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getComplianceMatrix(req.params.standardId);
    if (!data) return res.status(404).json({ success: false, message: 'المعيار غير موجود' });
    res.json({ success: true, data });
  })
);

/* ═══════════════════ Audit Log ═══════════════════ */

router.get(
  '/audit-log',
  authenticate,
  authorize('admin', 'quality_manager'),
  wrap((req, res) => {
    const data = svc.getAuditLog(req.query);
    res.json({ success: true, data });
  })
);

module.exports = router;
