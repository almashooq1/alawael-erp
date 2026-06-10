'use strict';
/**
 * Form Template Routes — النماذج الجاهزة (dynamic form builder + submissions)
 * ══════════════════════════════════════════════════════════════════════════
 * Serves the ready-made forms system: browse FormTemplate docs (32 catalog
 * forms seeded via scripts/seed-forms-catalog.js + custom ones), fill and
 * submit responses (FormSubmission), and review/approve submissions.
 *
 *   GET    /                          list form templates
 *   GET    /categories                category counts (for UI tabs)
 *   GET    /stats                     usage statistics
 *   GET    /submissions/my            caller's own submissions
 *   GET    /submissions/pending       review queue (reviewer roles)
 *   GET    /submissions/:subId        single submission (owner or reviewer)
 *   PATCH  /submissions/:subId/status review a submission (approve/reject/…)
 *   POST   /                          create form template (draft)
 *   GET    /:id                       template detail (_id or templateId slug)
 *   PUT    /:id                       update template (draft only)
 *   DELETE /:id                       soft-delete (isActive=false)
 *   PATCH  /:id/publish               publish / unpublish toggle
 *   POST   /:id/duplicate             duplicate as new draft
 *   GET    /:id/submissions           submissions for one template
 *   POST   /:id/submit                submit a filled form
 *
 * W1179 contract realignment: the previous revision of this router queried
 * fields that do NOT exist on the real models (`title` / `status` /
 * `branchId` / `isDeleted` on FormTemplate; `formTemplateId` / `responses` /
 * `formTitle` / plain-ObjectId `submittedBy` on FormSubmission). Because
 * FormTemplate has no `branchId`, every list/detail lookup for a
 * branch-scoped user matched ZERO documents — the seeded "ready forms" were
 * invisible — and every submit threw ValidationError (`data` required).
 * This revision is aligned 1:1 with models/FormTemplate.js
 * (name / isPublished / isActive / templateId / fields[].name) and
 * models/FormSubmission.js (templateId slug / data / submittedBy.{userId}).
 *
 * Tenancy note: form templates are shared DEFINITIONS (no PHI, no branchId
 * on the model) — they are intentionally visible across branches, like the
 * catalog they are seeded from. Submissions are guarded by ownership
 * (submittedBy.userId) + reviewer roles instead.
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

// Best-effort notification side-channels (same lazy pattern as
// public-forms.routes.js) — absence of either must never break the API.
let unifiedNotifier = null;
try {
  unifiedNotifier = require('../services/unifiedNotifier');
} catch {
  /* notifier optional */
}
let pushSendToAdmins = null;
try {
  pushSendToAdmins = require('./push.routes').sendToAdmins;
} catch {
  /* push optional */
}

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

// Roles that manage templates / review submissions (super_admin bypasses
// requireRole internally, but list it for the canManage() data filter too).
const MANAGE_ROLES = ['admin', 'super_admin', 'manager', 'supervisor'];
const REVIEW_ROLES = [...MANAGE_ROLES, 'clinician'];
const canManage = req => MANAGE_ROLES.includes(req.user?.role);
const canReview = req => REVIEW_ROLES.includes(req.user?.role);

const LAYOUT_FIELD_TYPES = ['header', 'divider', 'paragraph', 'spacer'];
const isLayoutField = f => LAYOUT_FIELD_TYPES.includes(f?.type);

// W1186 — build the FormSubmission.approvals[] chain from the template's
// DECLARED approvalSteps (defensive fallback to the legacy phantom
// approvalWorkflow shape for any pre-W1186 doc that still carries one).
function buildApprovalChain(template) {
  const steps =
    template.approvalSteps && template.approvalSteps.length > 0
      ? template.approvalSteps
      : (template.approvalWorkflow && template.approvalWorkflow.enabled
          ? template.approvalWorkflow.steps
          : []) || [];
  return steps
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({ step: i, role: s.role, label: s.label || s.role, status: 'pending' }));
}

// UI metadata for /categories (ids mirror the FormTemplate.category enum)
const CATEGORY_META = {
  beneficiary: {
    label: 'شؤون المستفيدين',
    labelEn: 'Beneficiary Affairs',
    icon: '🧑‍🦽',
    color: '#1565C0',
  },
  hr: { label: 'شؤون الموظفين', labelEn: 'Human Resources', icon: '👥', color: '#D32F2F' },
  administration: {
    label: 'الشؤون الإدارية',
    labelEn: 'Administration',
    icon: '🏛️',
    color: '#6D4C41',
  },
  finance: { label: 'الشؤون المالية', labelEn: 'Finance', icon: '💰', color: '#2E7D32' },
  general: { label: 'عامة', labelEn: 'General', icon: '📁', color: '#757575' },
  medical: { label: 'طبية', labelEn: 'Medical', icon: '🩺', color: '#00838F' },
  therapy: { label: 'علاجية', labelEn: 'Therapy', icon: '🧩', color: '#7B1FA2' },
  legal: { label: 'قانونية', labelEn: 'Legal', icon: '⚖️', color: '#37474F' },
  reports: { label: 'تقارير', labelEn: 'Reports', icon: '📊', color: '#EF6C00' },
  custom: { label: 'مخصصة', labelEn: 'Custom', icon: '🛠️', color: '#5D4037' },
};

const escapeRegExp = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Resolve a template by Mongo _id OR templateId slug (catalog ids). */
async function findTemplate(FormTemplate, idOrSlug, extraFilter = {}) {
  const base = { isActive: { $ne: false }, ...extraFilter };
  if (mongoose.isValidObjectId(idOrSlug)) {
    const byId = await FormTemplate.findOne({ ...base, _id: idOrSlug }).lean();
    if (byId) return byId;
  }
  return FormTemplate.findOne({ ...base, templateId: idOrSlug }).lean();
}

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 100, category, status, search } = req.query;
    const filter = { isActive: { $ne: false } };
    if (category && category !== 'all') filter.category = category;
    if (status === 'published') filter.isPublished = true;
    else if (status === 'draft') filter.isPublished = { $ne: true };
    else if (!canManage(req)) filter.isPublished = true; // staff see fillable forms only
    if (search) {
      const re = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [{ name: re }, { nameEn: re }, { description: re }, { templateId: re }];
    }
    const lim = Math.min(Number(limit) || 100, 200);
    const skip = (Number(page) - 1) * lim;
    const [data, total] = await Promise.all([
      FormTemplate.find(filter)
        .select('-versions -design.customCss')
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      FormTemplate.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: Number(page), limit: lim } });
  } catch (err) {
    safeError(res, err, 'list form templates');
  }
});

// ── GET /categories ────────────────────────────────────────────────────────
// NOTE: must precede /:id or Express treats "categories" as a template id.
router.get('/categories', async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate) return res.json({ success: true, data: [] });
    const match = { isActive: { $ne: false } };
    if (!canManage(req)) match.isPublished = true;
    const rows = await FormTemplate.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const total = rows.reduce((s, r) => s + r.count, 0);
    const data = [
      {
        id: 'all',
        label: 'جميع النماذج',
        labelEn: 'All Forms',
        icon: '📋',
        color: '#455A64',
        count: total,
      },
      ...rows.map(r => ({
        id: r._id,
        count: r.count,
        ...(CATEGORY_META[r._id] || CATEGORY_META.custom),
      })),
    ];
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'form template categories');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
// NOTE: must precede /:id or Express casts "stats" as a FormTemplate ObjectId.
router.get('/stats', async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    const FormSubmission = safeModel('FormSubmission');
    if (!FormTemplate) return res.json({ success: true, data: { totalTemplates: 0 } });
    // Managers/reviewers see global submission counts; others see their own.
    const subFilter = canReview(req) ? {} : { 'submittedBy.userId': req.user._id };
    const [
      totalTemplates,
      publishedTemplates,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
    ] = await Promise.all([
      FormTemplate.countDocuments({ isActive: { $ne: false } }),
      FormTemplate.countDocuments({ isActive: { $ne: false }, isPublished: true }),
      FormSubmission ? FormSubmission.countDocuments(subFilter) : 0,
      FormSubmission
        ? FormSubmission.countDocuments({
            ...subFilter,
            status: { $in: ['submitted', 'under_review'] },
          })
        : 0,
      FormSubmission ? FormSubmission.countDocuments({ ...subFilter, status: 'approved' }) : 0,
      FormSubmission ? FormSubmission.countDocuments({ ...subFilter, status: 'rejected' }) : 0,
    ]);
    res.json({
      success: true,
      data: {
        totalTemplates,
        publishedTemplates,
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
      },
    });
  } catch (err) {
    safeError(res, err, 'form template stats');
  }
});

// ── GET /submissions/my ────────────────────────────────────────────────────
// NOTE: must precede /submissions/:subId.
router.get('/submissions/my', async (req, res) => {
  try {
    const FormSubmission = safeModel('FormSubmission');
    if (!FormSubmission) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, status } = req.query;
    const filter = { 'submittedBy.userId': req.user._id };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      FormSubmission.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list my submissions');
  }
});

// ── GET /submissions/pending ───────────────────────────────────────────────
router.get(
  '/submissions/pending',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const FormSubmission = safeModel('FormSubmission');
      if (!FormSubmission) return res.json({ success: true, data: [], pagination: { total: 0 } });
      const { page = 1, limit = 50 } = req.query;
      const filter = { status: { $in: ['submitted', 'under_review'] } };
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        FormSubmission.find(filter)
          .sort({ priority: -1, createdAt: 1 })
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
      safeError(res, err, 'list pending submissions');
    }
  }
);

// ── GET /submissions/:subId ────────────────────────────────────────────────
router.get('/submissions/:subId', async (req, res) => {
  try {
    const FormSubmission = safeModel('FormSubmission');
    if (!FormSubmission)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    if (!mongoose.isValidObjectId(req.params.subId))
      return res.status(400).json({ success: false, message: 'Invalid submission id' });
    const doc = await FormSubmission.findById(req.params.subId).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Submission not found' });
    const isOwner = String(doc.submittedBy?.userId || '') === String(req.user._id);
    if (!isOwner && !canReview(req))
      return res
        .status(403)
        .json({ success: false, message: 'Not allowed to view this submission' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get submission');
  }
});

// ── PATCH /submissions/:subId/status ──────────────────────────────────────
// W1186 — step-wise approval engine. When the submission carries a pending
// approvals[] chain (initialized at submit from template.approvalSteps), an
// approve/reject decision acts on the CURRENT pending step: approving
// advances the chain (full 'approved' only when every step is done);
// rejecting is terminal. Authorization for chain decisions: manage roles
// (admin/super_admin/manager/supervisor) OR the exact role the pending step
// names (e.g. hr_officer) — so step roles outside REVIEW_ROLES can act on
// their own step. Non-chain submissions keep the direct status set, gated to
// reviewer roles.
router.patch('/submissions/:subId/status', async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    // Mirrors the FormSubmission.status enum (review-reachable states only)
    const validStatuses = ['under_review', 'approved', 'rejected', 'returned', 'cancelled', 'archived'];
    if (!status || !validStatuses.includes(status))
      return res
        .status(400)
        .json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
    if (status === 'rejected' && !reviewNote)
      return res
        .status(400)
        .json({ success: false, message: 'reviewNote is required when rejecting' });
    const FormSubmission = safeModel('FormSubmission');
    if (!FormSubmission)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    if (!mongoose.isValidObjectId(req.params.subId))
      return res.status(400).json({ success: false, message: 'Invalid submission id' });
    const sub = await FormSubmission.findById(req.params.subId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    const stepIdx = (sub.approvals || []).findIndex(a => a.status === 'pending');
    const isChainDecision = stepIdx >= 0 && (status === 'approved' || status === 'rejected');

    if (isChainDecision) {
      const step = sub.approvals[stepIdx];
      if (!canManage(req) && req.user?.role !== step.role)
        return res
          .status(403)
          .json({ success: false, message: 'Not your approval step', requiredRole: step.role });
      step.status = status === 'approved' ? 'approved' : 'rejected';
      step.approvedBy = req.user._id;
      step.approverName = req.user.name || req.user.fullName || req.user.email;
      step.comment = reviewNote;
      step.date = new Date();
      if (status === 'rejected') {
        sub.status = 'rejected';
        sub.rejectionReason = reviewNote;
        sub.rejectedAt = new Date();
      } else {
        sub.currentApprovalStep = stepIdx + 1;
        const allDone = sub.approvals.every(a => a.status === 'approved' || a.status === 'skipped');
        sub.status = allDone ? 'approved' : 'under_review';
        if (allDone) sub.approvedAt = new Date();
      }
    } else {
      if (!canReview(req))
        return res
          .status(403)
          .json({ success: false, message: 'Not allowed to review submissions' });
      sub.status = status;
      if (status === 'approved') sub.approvedAt = new Date();
      if (status === 'rejected') {
        sub.rejectedAt = new Date();
        sub.rejectionReason = reviewNote;
      }
      if (status === 'returned') sub.returnReason = reviewNote || '';
    }

    sub.reviewedAt = new Date();
    sub.reviewedBy = req.user._id;
    if (reviewNote) {
      sub.comments.push({
        userId: req.user._id,
        userName: req.user.name || req.user.fullName || req.user.email,
        userRole: req.user.role,
        text: reviewNote,
        type: status === 'returned' ? 'request_change' : 'comment',
        isInternal: false,
      });
    }
    await sub.save();

    // Best-effort: tell the submitter their request moved (terminal states).
    if (['approved', 'rejected', 'returned'].includes(sub.status) && unifiedNotifier?.notify) {
      const to = { email: sub.submittedBy?.email || '', phone: sub.submittedBy?.phone || '' };
      if (to.email || to.phone) {
        const statusLabel =
          sub.status === 'approved'
            ? 'تمت الموافقة على'
            : sub.status === 'rejected'
              ? 'تم رفض'
              : 'أُعيد للتعديل';
        unifiedNotifier
          .notify({
            to,
            subject: `تحديث على طلبك ${sub.submissionNumber || ''}`,
            body: `${statusLabel} طلبك "${sub.templateName}".${reviewNote ? `\nالملاحظات: ${reviewNote}` : ''}`,
            templateKey: 'form.status-change',
            metadata: { submissionId: String(sub._id), newStatus: sub.status },
          })
          .catch(() => {});
      }
    }

    res.json({ success: true, data: sub.toObject() });
  } catch (err) {
    safeError(res, err, 'update submission status');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name || body.title; // legacy callers sent `title`
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const fields = body.fields || [];
    if (!Array.isArray(fields))
      return res.status(400).json({ success: false, message: 'fields must be an array' });
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await FormTemplate.create({
      templateId:
        body.templateId ||
        `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      nameEn: body.nameEn,
      description: body.description,
      category: body.category || 'general',
      tags: Array.isArray(body.tags) ? body.tags : [],
      icon: body.icon,
      color: body.color,
      fields,
      sections: Array.isArray(body.sections) ? body.sections : [],
      requiresApproval: body.requiresApproval !== false,
      isActive: true,
      isBuiltIn: false,
      isPublished: false,
      createdBy: req.user._id,
      createdByName: req.user.name || req.user.fullName || req.user.email,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err && err.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    safeError(res, err, 'create form template');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await findTemplate(FormTemplate, req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Form template not found' });
    if (!doc.isPublished && !canManage(req))
      return res.status(404).json({ success: false, message: 'Form template not found' });
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
    const existing = await findTemplate(FormTemplate, req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    if (existing.isPublished)
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a published form. Unpublish it first or duplicate it.',
      });
    const allowedFields = [
      'name',
      'nameEn',
      'description',
      'descriptionEn',
      'category',
      'tags',
      'icon',
      'color',
      'fields',
      'sections',
      'design',
      'requiresApproval',
      'outputFormat',
      'allowDraft',
      'notifyOnSubmission',
    ];
    const updates = {};
    allowedFields.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const doc = await FormTemplate.findByIdAndUpdate(
      existing._id,
      { $set: { ...updates, updatedBy: req.user._id } },
      { returnDocument: 'after', runValidators: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err && err.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    safeError(res, err, 'update form template');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const FormTemplate = safeModel('FormTemplate');
    if (!FormTemplate)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const existing = await findTemplate(FormTemplate, req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    await FormTemplate.updateOne(
      { _id: existing._id },
      { $set: { isActive: false, isPublished: false, updatedBy: req.user._id } }
    );
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
    const existing = await findTemplate(FormTemplate, req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    const doc = await FormTemplate.findByIdAndUpdate(
      existing._id,
      { $set: { isPublished: !existing.isPublished, updatedBy: req.user._id } },
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
    const original = await findTemplate(FormTemplate, req.params.id);
    if (!original)
      return res.status(404).json({ success: false, message: 'Form template not found' });
    const {
      _id: _origId,
      __v: _v,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      usageCount: _uc,
      lastUsedAt: _lua,
      versions: _versions,
      ...rest
    } = original;
    const copy = await FormTemplate.create({
      ...rest,
      templateId: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${original.name} (نسخة)`,
      isBuiltIn: false,
      isPublished: false,
      version: 1,
      versions: [],
      usageCount: 0,
      createdBy: req.user._id,
      createdByName: req.user.name || req.user.fullName || req.user.email,
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
      const FormTemplate = safeModel('FormTemplate');
      const FormSubmission = safeModel('FormSubmission');
      if (!FormTemplate || !FormSubmission)
        return res.json({ success: true, data: [], pagination: { total: 0 } });
      const template = await findTemplate(FormTemplate, req.params.id);
      if (!template)
        return res.status(404).json({ success: false, message: 'Form template not found' });
      const { page = 1, limit = 20, status } = req.query;
      // FormSubmission.templateId stores the slug (falls back to _id string)
      const filter = {
        templateId: { $in: [template.templateId, String(template._id)].filter(Boolean) },
      };
      if (status) filter.status = status;
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
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
    const body = req.body || {};
    // The legacy frontend sends { data, notes }; older callers sent { responses }.
    const data = body.data || body.responses || {};
    const FormTemplate = safeModel('FormTemplate');
    const FormSubmission = safeModel('FormSubmission');
    if (!FormTemplate || !FormSubmission)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const template = await findTemplate(FormTemplate, req.params.id, { isPublished: true });
    if (!template)
      return res.status(404).json({ success: false, message: 'Published form template not found' });
    for (const field of template.fields || []) {
      if (isLayoutField(field) || field.readOnly || field.hidden || !field.required) continue;
      const v = data[field.name];
      if (v === undefined || v === null || v === '')
        return res
          .status(400)
          .json({
            success: false,
            message: `Required field missing: ${field.label || field.name}`,
          });
    }
    // W1186 — initialize the approval chain from the template definition.
    const approvals = buildApprovalChain(template);
    const submission = await FormSubmission.create({
      templateId: template.templateId || String(template._id),
      templateName: template.name,
      templateVersion: template.version || 1,
      data,
      notes: body.notes,
      status: approvals.length > 0 ? 'under_review' : 'submitted',
      approvals,
      currentApprovalStep: 0,
      submittedBy: {
        userId: req.user._id,
        name: req.user.name || req.user.fullName || req.user.email,
        email: req.user.email,
        role: req.user.role,
      },
      tenantId: template.tenantId || undefined,
      submittedAt: new Date(),
    });
    await FormTemplate.updateOne(
      { _id: template._id },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
    );
    res.status(201).json({ success: true, data: submission });

    // Best-effort: surface the new request to staff devices.
    if (pushSendToAdmins) {
      pushSendToAdmins({
        title: `طلب جديد: ${template.name}`,
        body: `${submission.submittedBy?.name || ''} · ${submission.submissionNumber || ''}`,
        url: `/form-templates`,
      }).catch(() => {});
    }
  } catch (err) {
    if (err && err.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    safeError(res, err, 'submit form');
  }
});

module.exports = router;
