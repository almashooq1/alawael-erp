/**
 * OCR Document Routes — مسارات معالجة المستندات بالتعرف الضوئي
 * Phase 18
 */
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const svc = require('../services/ocrDocument.service');

const router = express.Router();

/* ── helpers ── */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
const getUserId = req => req.user?.id || req.user?.userId || 'u1';
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ════════════════════════════════════════════
   DASHBOARD — لوحة التحكم
   ════════════════════════════════════════════ */
router.get(
  '/dashboard',
  authenticate,
  wrap((req, res) => {
    const data = svc.getDashboard();
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   REFERENCE DATA — البيانات المرجعية
   ════════════════════════════════════════════ */
router.get('/document-types', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getDocumentTypes() })
);
router.get('/ocr-engines', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getOCREngines() })
);
router.get('/processing-statuses', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getProcessingStatuses() })
);
router.get('/medical-fields', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getMedicalFields() })
);
router.get('/supported-formats', authenticate, (req, res) =>
  res.json({ success: true, data: svc.getSupportedFormats() })
);
router.get(
  '/statistics',
  authenticate,
  wrap((req, res) => res.json({ success: true, data: svc.getStatistics() }))
);

/* ════════════════════════════════════════════
   DOCUMENTS — المستندات
   ════════════════════════════════════════════ */
router.get(
  '/documents',
  authenticate,
  wrap((req, res) => {
    const { beneficiaryId, documentType, status, search, fromDate, toDate } = req.query;
    const data = svc.listDocuments({
      beneficiaryId,
      documentType,
      status,
      search,
      fromDate,
      toDate,
    });
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
    if (!data) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/documents',
  authenticate,
  authorize(['admin', 'manager', 'doctor', 'therapist', 'receptionist']),
  [
    body('fileName').notEmpty().withMessage('اسم الملف مطلوب'),
    body('documentType').notEmpty().withMessage('نوع المستند مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.uploadDocument(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/documents/:id',
  authenticate,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateDocument(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/documents/:id',
  authenticate,
  authorize(['admin', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.deleteDocument(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    res.json({ success: true, message: 'تم حذف المستند بنجاح' });
  })
);

/* ════════════════════════════════════════════
   OCR PROCESSING — معالجة التعرف الضوئي
   ════════════════════════════════════════════ */
router.post(
  '/documents/:id/reprocess',
  authenticate,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.reprocessDocument(req.params.id, getUserId(req), req.body);
    if (!data) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   EXTRACTED DATA — البيانات المستخرجة
   ════════════════════════════════════════════ */
router.get(
  '/documents/:id/extraction',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getExtraction(req.params.id);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: 'لا توجد بيانات مستخرجة لهذا المستند' });
    res.json({ success: true, data });
  })
);

router.get(
  '/extractions/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getExtractionById(req.params.id);
    if (!data)
      return res.status(404).json({ success: false, message: 'البيانات المستخرجة غير موجودة' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   CORRECTIONS — التصحيحات
   ════════════════════════════════════════════ */
router.get(
  '/documents/:id/corrections',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.listCorrections(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/documents/:id/corrections',
  authenticate,
  authorize(['admin', 'manager', 'doctor', 'therapist']),
  [
    param('id').notEmpty(),
    body('field').notEmpty().withMessage('اسم الحقل مطلوب'),
    body('newValue').notEmpty().withMessage('القيمة الجديدة مطلوبة'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.addCorrection(req.params.id, req.body, getUserId(req));
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: 'المستند أو البيانات المستخرجة غير موجودة' });
    res.status(201).json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   REVIEW (APPROVE / REJECT) — المراجعة
   ════════════════════════════════════════════ */
router.put(
  '/documents/:id/approve',
  authenticate,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.approveDocument(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    if (data.error) return res.status(400).json({ success: false, message: data.error });
    res.json({ success: true, data });
  })
);

router.put(
  '/documents/:id/reject',
  authenticate,
  authorize(['admin', 'manager', 'doctor']),
  [param('id').notEmpty(), body('reason').notEmpty().withMessage('سبب الرفض مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.rejectDocument(req.params.id, getUserId(req), req.body.reason);
    if (!data) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    if (data.error) return res.status(400).json({ success: false, message: data.error });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   TEMPLATES — القوالب
   ════════════════════════════════════════════ */
router.get(
  '/templates',
  authenticate,
  wrap((req, res) => {
    const data = svc.listTemplates();
    res.json({ success: true, data });
  })
);

router.get(
  '/templates/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getTemplate(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/templates',
  authenticate,
  authorize(['admin', 'manager']),
  [
    body('name').notEmpty().withMessage('اسم القالب مطلوب'),
    body('documentType').notEmpty().withMessage('نوع المستند مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createTemplate(req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/templates/:id',
  authenticate,
  authorize(['admin', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateTemplate(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/templates/:id',
  authenticate,
  authorize(['admin', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const ok = svc.deleteTemplate(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, message: 'تم حذف القالب بنجاح' });
  })
);

/* ════════════════════════════════════════════
   BATCHES — الدفعات
   ════════════════════════════════════════════ */
router.get(
  '/batches',
  authenticate,
  wrap((req, res) => {
    const data = svc.listBatches();
    res.json({ success: true, data });
  })
);

router.get(
  '/batches/:id',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getBatch(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'الدفعة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/batches',
  authenticate,
  authorize(['admin', 'manager']),
  wrap((req, res) => {
    const data = svc.createBatch(req.body, getUserId(req));
    res.status(201).json({ success: true, data });
  })
);

router.post(
  '/batches/:id/add-document',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').notEmpty(), body('documentId').notEmpty().withMessage('معرف المستند مطلوب')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.addDocumentToBatch(req.params.id, req.body.documentId);
    if (!data)
      return res.status(404).json({ success: false, message: 'الدفعة أو المستند غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/batches/:id/process',
  authenticate,
  authorize(['admin', 'manager']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.processBatch(req.params.id, getUserId(req));
    if (!data) return res.status(404).json({ success: false, message: 'الدفعة غير موجودة' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   SEARCH — البحث
   ════════════════════════════════════════════ */
router.get(
  '/search',
  authenticate,
  query('q').notEmpty().withMessage('عبارة البحث مطلوبة'),
  handleValidation,
  wrap((req, res) => {
    const data = svc.searchDocuments(req.query.q);
    res.json({ success: true, data, total: data.length });
  })
);

/* ════════════════════════════════════════════
   BENEFICIARY DOCUMENTS — مستندات المستفيد
   ════════════════════════════════════════════ */
router.get(
  '/beneficiaries/:beneficiaryId/documents',
  authenticate,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getBeneficiaryDocuments(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/medical-summary',
  authenticate,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getBeneficiaryMedicalSummary(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   EXPORT — التصدير
   ════════════════════════════════════════════ */
router.get(
  '/documents/:id/export',
  authenticate,
  [param('id').notEmpty(), query('format').optional().isIn(['json', 'csv'])],
  handleValidation,
  wrap((req, res) => {
    const data = svc.exportDocument(req.params.id, req.query.format || 'json');
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: 'المستند أو البيانات المستخرجة غير موجودة' });
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   AUDIT — سجل التدقيق
   ════════════════════════════════════════════ */
router.get(
  '/audit-log',
  authenticate,
  authorize(['admin', 'manager']),
  wrap((req, res) => {
    const { documentId } = req.query;
    const data = svc.getAuditLog(documentId);
    res.json({ success: true, data });
  })
);

router.get(
  '/documents/:id/audit-log',
  authenticate,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getAuditLog(req.params.id);
    res.json({ success: true, data });
  })
);

module.exports = router;
