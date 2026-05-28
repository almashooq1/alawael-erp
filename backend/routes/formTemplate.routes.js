'use strict';
/**
 * Form Template Routes — استمارات التقييم والموافقة والمتابعة
 * ══════════════════════════════════════════════════════════════════════════
 * Dynamic form builder: create reusable form templates, collect submissions,
 * review responses, and generate submission reports.
 *
 *   GET    /                    list form templates
 *   POST   /                    create form template
 *   GET    /:id                 get template details (with schema)
 *   PUT    /:id                 update template (draft only)
 *   DELETE /:id                 delete template
 *   PATCH  /:id/publish         publish / unpublish template
 *   POST   /:id/duplicate       duplicate template
 *   GET    /:id/submissions     list submissions for template
 *   POST   /:id/submit          submit form response
 *   GET    /submissions/:subId  get single submission
 *   PATCH  /submissions/:subId/status  update submission status (review, approve, reject)
 *   GET    /stats               form usage statistics
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, category, status } = req.query;
    const filter = { branchId: req.user.branchId, isDeleted: { $ne: true } };
    if (category) filter.category = category;
    if (status) filter.status = status;
    else filter.status = { $ne: 'deleted' };
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      FormTemplate.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      FormTemplate.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list form templates');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      fields = [],
      requiresSignature = false,
      targetAudience = 'all',
    } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    if (!Array.isArray(fields))
      return res.status(400).json({ success: false, message: 'fields must be an array' });
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await FormTemplate.create({
      title,
      description,
      category,
      fields,
      requiresSignature,
      targetAudience,
      status: 'draft',
      version: 1,
      branchId: req.user.branchId,
      createdBy: req.user._id,
      submissionCount: 0,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create form template');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
// NOTE: must precede /:id or Express casts "stats" as a FormTemplate ObjectId.
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    const FormSubmission = safeModel('FormSubmission');
    if (!FormTemplate) return res.json({ success: true, data: { templates: 0, submissions: 0 } });
    const base = { branchId: req.user.branchId };
    const [templates, published, submissions, pendingReview] = await Promise.all([
      FormTemplate.countDocuments({ ...base, isDeleted: { $ne: true } }),
      FormTemplate.countDocuments({ ...base, status: 'published', isDeleted: { $ne: true } }),
      FormSubmission ? FormSubmission.countDocuments(base) : 0,
      FormSubmission ? FormSubmission.countDocuments({ ...base, status: 'submitted' }) : 0,
    ]);
    res.json({ success: true, data: { templates, published, submissions, pendingReview } });
  } catch (err) {
    safeError(res, err, 'form template stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await FormTemplate.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      isDeleted: { $ne: true },
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Form template not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get form template');
  }
});

// ── PUT /:id ───────────────────────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    // Only allow editing drafts (not published)
    const existing = await FormTemplate.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      isDeleted: { $ne: true },
    }).lean();
    if (!existing)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    if (existing.status === 'published')
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a published form. Unpublish it first or create a new version.',
      });
    const allowedFields = [
      'title',
      'description',
      'category',
      'fields',
      'requiresSignature',
      'targetAudience',
    ];
    const updates = {};
    allowedFields.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const doc = await FormTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { ...updates, updatedAt: new Date(), updatedBy: req.user._id } },
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update form template');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await FormTemplate.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id, status: 'deleted' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Form template not found' });
    res.json({ success: true, message: 'Form template deleted' });
  } catch (err) {
    safeError(res, err, 'delete form template');
  }
});

// ── PATCH /:id/publish ─────────────────────────────────────────────────────
router.patch('/:id/publish', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const existing = await FormTemplate.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      isDeleted: { $ne: true },
    }).lean();
    if (!existing)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    const newStatus = existing.status === 'published' ? 'draft' : 'published';
    const extraFields =
      newStatus === 'published'
        ? { publishedAt: new Date(), publishedBy: req.user._id }
        : { unpublishedAt: new Date() };
    const doc = await FormTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { status: newStatus, ...extraFields } },
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'publish/unpublish form template');
  }
});

// ── POST /:id/duplicate ────────────────────────────────────────────────────
router.post('/:id/duplicate', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const original = await FormTemplate.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      isDeleted: { $ne: true },
    }).lean();
    if (!original)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    const {
      _id: _origId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      submissionCount: _sc,
      publishedAt: _pa,
      ...rest
    } = original;
    const copy = await FormTemplate.create({
      ...rest,
      title: `${original.title} (نسخة)`,
      status: 'draft',
      version: 1,
      submissionCount: 0,
      createdBy: req.user._id,
      branchId: req.user.branchId,
    });
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    safeError(res, err, 'duplicate form template');
  }
});

// ── GET /:id/submissions ───────────────────────────────────────────────────
router.get(
  '/:id/submissions',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const FormSubmission = safeModel('FormSubmission');
      if (!FormSubmission) return res.json({ success: true, data: [], pagination: { total: 0 } });
      const { page = 1, limit = 20, status, beneficiaryId } = req.query;
      const filter = { formTemplateId: req.params.id, branchId: req.user.branchId };
      if (status) filter.status = status;
      if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        FormSubmission.find(filter)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        FormSubmission.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data,
        pagination: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (err) {
      safeError(res, err, 'list submissions');
    }
  }
);

// ── POST /:id/submit ───────────────────────────────────────────────────────
router.post('/:id/submit', async (req, res) => {
  try {
    const { beneficiaryId, responses = {}, submittedOnBehalf = false } = req.body;
    const FormTemplate = safeModel('FormTemplate');
    const FormSubmission = safeModel('FormSubmission');
    if (!FormTemplate || !FormSubmission)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const template = await FormTemplate.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      status: 'published',
      isDeleted: { $ne: true },
    }).lean();
    if (!template)
      return res.status(404).json({ success: false, message: 'Published form template not found' });
    // Validate required fields
    const requiredFields = (template.fields || []).filter(f => f.required);
    for (const field of requiredFields) {
      if (
        responses[field.key] === undefined ||
        responses[field.key] === null ||
        responses[field.key] === ''
      ) {
        return res
          .status(400)
          .json({ success: false, message: `Required field missing: ${field.label || field.key}` });
      }
    }
    const submission = await FormSubmission.create({
      formTemplateId: req.params.id,
      formTitle: template.title,
      beneficiaryId,
      responses,
      submittedBy: req.user._id,
      submittedOnBehalf,
      status: 'submitted',
      branchId: req.user.branchId,
      submittedAt: new Date(),
    });
    // Increment submission counter
    await FormTemplate.updateOne({ _id: req.params.id }, { $inc: { submissionCount: 1 } });
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    safeError(res, err, 'submit form');
  }
});

// ── GET /submissions/:subId ────────────────────────────────────────────────
router.get('/submissions/:subId', async (req, res) => {
  try {
    const FormSubmission = safeModel('FormSubmission');
    if (!FormSubmission)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await FormSubmission.findOne({
      _id: req.params.subId,
      branchId: req.user.branchId,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get submission');
  }
});

// ── PATCH /submissions/:subId/status ──────────────────────────────────────
router.patch(
  '/submissions/:subId/status',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const { status, reviewNote } = req.body;
      const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'pending_info'];
      if (!status || !validStatuses.includes(status))
        return res
          .status(400)
          .json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
      const FormSubmission = safeModel('FormSubmission');
      if (!FormSubmission)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await FormSubmission.findOneAndUpdate(
        { _id: req.params.subId, branchId: req.user.branchId },
        { $set: { status, reviewNote, reviewedBy: req.user._id, reviewedAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Submission not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'update submission status');
    }
  }
);

module.exports = router;
