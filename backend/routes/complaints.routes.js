/**
 * مسارات الشكاوى والمقترحات الموحدة
 * Unified Complaints & Suggestions Routes
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const _logger = require('../utils/logger');
const Complaint = require('../models/Complaint');
const validateObjectId = require('../middleware/validateObjectId');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
/* ━━━ Field Whitelists ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CREATE_FIELDS = [
  'subject',
  'description',
  'type',
  'source',
  'category',
  'priority',
  'department',
  'attachments',
  'beneficiaryId',
];
const UPDATE_FIELDS = [
  'status',
  'priority',
  'assignedTo',
  'resolution',
  'notes',
  'category',
  'department',
  'internalNotes',
];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

// GET / — List all complaints (paginated, filterable)
router.get('/', async (req, res) => {
  try {
    const { type, source, status, priority, category, page = 1, limit = 20 } = req.query;
    // W613 — branch-scope the list (Complaint has no tenantScope plugin).
    const filter = { ...branchFilter(req) };
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('submittedBy', 'name email')
        .populate('assignedTo', 'name email')
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    safeError(res, err, 'Complaints list error');
  }
});

// GET /stats — Summary statistics
router.get('/stats', async (req, res) => {
  try {
    // W613 — branch-scope every stat. aggregate() bypasses the tenantScope
    // plugin, so each pipeline needs an explicit branchFilter $match; the
    // countDocuments calls compose it directly. branchFilter(req) = {} for
    // cross-branch/HQ roles → org-wide stats preserved for them.
    const scope = branchFilter(req);
    const [byStatus, byType, byPriority, bySource, total] = await Promise.all([
      Complaint.aggregate([
        { $match: { ...scope } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { ...scope } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { ...scope } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { ...scope } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Complaint.countDocuments({ ...scope }),
    ]);

    const resolved = await Complaint.countDocuments({
      ...scope,
      status: { $in: ['resolved', 'closed'] },
    });
    const avgRating = await Complaint.aggregate([
      { $match: { ...scope, rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        resolved,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgRating: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
        byStatus,
        byType,
        byPriority,
        bySource,
      },
    });
  } catch (err) {
    safeError(res, err, 'Complaints stats error');
  }
});

// GET /:id — Get complaint details
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    // W866 — branch-scope the instance read. Pre-W866 a bare findById let a
    // restricted user in branch A read any branch's complaint (PII + grievance
    // content) by guessing the ObjectId — same IDOR class W269/W447 closed.
    const doc = await Complaint.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'Complaint detail error');
  }
});

// POST / — Create complaint/suggestion
// W930 — bridge the web-admin complaint form onto the model contract. The form
// posts UPPER source codes (FAMILY/STAFF/EXTERNAL/ANONYMOUS), a free-text Arabic
// `category`, and a `description` but NO `subject`. The model needs a lowercase
// `source` enum + a required `subject`, and `category` must be a known slug.
// Without this every submit 400'd at the validator ("data not saved"). Runs
// BEFORE validate() so the validator sees the normalized shape.
const COMPLAINT_SOURCE_MAP = {
  FAMILY: 'parent',
  STAFF: 'employee',
  EXTERNAL: 'customer',
  ANONYMOUS: 'other',
  employee: 'employee',
  student: 'student',
  customer: 'customer',
  parent: 'parent',
  other: 'other',
};
const COMPLAINT_CATEGORIES = new Set([
  'administrative',
  'technical',
  'financial',
  'service',
  'hr',
  'safety',
  'academic',
  'other',
]);
function normalizeComplaintInput(req, _res, next) {
  const b = req.body || {};
  if (b.source) {
    b.source = COMPLAINT_SOURCE_MAP[b.source] || COMPLAINT_SOURCE_MAP[String(b.source).toUpperCase()] || 'other';
  }
  // subject is required by the model but the form has no subject field — derive
  // it from the (Arabic) category, else the first line of the description.
  if (!b.subject || !String(b.subject).trim()) {
    const fromCategory = b.category && String(b.category).trim();
    b.subject = fromCategory || (b.description ? String(b.description).trim().slice(0, 120) : '');
  }
  // category must be a known enum slug; the form sends free Arabic text → drop
  // it (the model defaults to 'other'); the Arabic value survives in `subject`.
  if (b.category && !COMPLAINT_CATEGORIES.has(b.category)) delete b.category;
  next();
}

router.post(
  '/',
  normalizeComplaintInput,
  validate([
    body('subject').trim().notEmpty().withMessage('عنوان الشكوى مطلوب'),
    body('description').trim().notEmpty().withMessage('وصف الشكوى مطلوب'),
    body('source')
      .isIn(['employee', 'student', 'customer', 'parent', 'other'])
      .withMessage('مصدر الشكوى غير صالح'),
  ]),
  async (req, res) => {
    try {
      const doc = new Complaint({
        ...pick(req.body, CREATE_FIELDS),
        submittedBy: req.user._id || req.userId,
        createdBy: req.user._id || req.userId,
        // W613 — stamp the filer's branch (restricted users only; for
        // cross-branch roles this is null and the pre-save hook falls back
        // to the linked beneficiary's branch). Never trust a body branchId.
        ...(req.branchScope?.branchId ? { branchId: req.branchScope.branchId } : {}),
      });
      await doc.save();
      res.status(201).json({ success: true, data: doc, message: 'تم تقديم الشكوى بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint create error');
    }
  }
);

// PUT /:id — Update complaint
router.put(
  '/:id',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('status')
      .optional()
      .isIn(['new', 'under_review', 'in_progress', 'escalated', 'resolved', 'closed', 'rejected'])
      .withMessage('حالة غير صالحة'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('أولوية غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const updates = pick(req.body, UPDATE_FIELDS);
      if (updates.status === 'resolved' && !updates.resolvedAt) {
        updates.resolvedAt = new Date();
      }
      // W866 — branch-scoped update (cross-tenant IDOR defense).
      const doc = await Complaint.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        updates,
        { returnDocument: 'after', runValidators: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'تم تحديث الشكوى بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint update error');
    }
  }
);

// POST /:id/respond — Add a response
router.post(
  '/:id/respond',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('content').trim().notEmpty().withMessage('محتوى الرد مطلوب'),
  ]),
  async (req, res) => {
    try {
      // W866 — branch-scoped lookup (cross-tenant IDOR defense).
      const doc = await Complaint.findOne({ _id: req.params.id, ...branchFilter(req) });
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });

      doc.responses.push({
        content: req.body.content,
        respondedBy: req.user._id || req.userId,
      });
      if (doc.status === 'new') doc.status = 'under_review';
      await doc.save();
      res.json({ success: true, data: doc, message: 'تم إضافة الرد بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint respond error');
    }
  }
);

// POST /:id/escalate — Escalate complaint
router.post(
  '/:id/escalate',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('assignedTo').optional().isMongoId().withMessage('معرف الموظف غير صالح'),
  ]),
  async (req, res) => {
    try {
      // W866 — branch-scoped update (cross-tenant IDOR defense).
      const doc = await Complaint.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        {
          priority: 'critical',
          status: 'escalated',
          assignedTo: req.body.assignedTo,
        },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'تم تصعيد الشكوى بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint escalate error');
    }
  }
);

// POST /:id/resolve — Resolve complaint
router.post(
  '/:id/resolve',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('resolution').trim().notEmpty().withMessage('نص الحل مطلوب'),
  ]),
  async (req, res) => {
    try {
      // W866 — branch-scoped update (cross-tenant IDOR defense).
      const doc = await Complaint.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        {
          status: 'resolved',
          resolution: req.body.resolution,
          resolvedAt: new Date(),
        },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'تم حل الشكوى بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint resolve error');
    }
  }
);

// POST /:id/rate — Rate resolution
router.post(
  '/:id/rate',
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5'),
  ]),
  async (req, res) => {
    try {
      // W866 — branch-scoped update (cross-tenant IDOR defense).
      const doc = await Complaint.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        { rating: req.body.rating },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'شكراً لتقييمك' });
    } catch (err) {
      safeError(res, err, 'Complaint rate error');
    }
  }
);

// DELETE /:id
router.delete(
  '/:id',
  authorize(['admin', 'super_admin']),
  validateObjectId('id'),
  async (req, res) => {
    try {
      // W866 — branch-scoped delete (cross-tenant IDOR defense).
      const doc = await Complaint.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, message: 'تم حذف الشكوى بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint delete error');
    }
  }
);

module.exports = router;
// W930 — exported for unit testing the web-admin→model normalization bridge.
module.exports.normalizeComplaintInput = normalizeComplaintInput;
