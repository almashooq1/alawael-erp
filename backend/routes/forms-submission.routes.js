/**
 * Forms Submission Routes — fill, submit, review.
 *
 * Phase 24 Commit 1. Bridges the web-admin's `formsApi` (GET /templates,
 * POST /:templateId/submit, GET /submissions, …) to the existing
 * FormTemplate + FormSubmission Mongoose models. The legacy
 * `workflowPro.routes.js` was never mounted and uses different paths,
 * so this is a clean, dedicated mount.
 *
 * Mount: app.use('/api/documents-pro/forms', router)
 *
 *   GET    /templates                → list active templates the caller can fill
 *   GET    /templates/:id            → single template (by templateId or _id)
 *   POST   /:templateId/submit       → submit a filled form
 *   GET    /submissions              → my submissions (or all if admin + ?all=1)
 *   GET    /submissions/:id          → submission detail
 *   PUT    /submissions/:id          → update a draft
 *   PUT    /submissions/:id/review   → approve / reject (admin or assigned reviewer)
 *
 * Auth: every endpoint requires authenticate. Submission/list filters by the
 * caller's userId; admin role bypasses the filter when ?all=1 is passed.
 */

'use strict';

const express = require('express');
const FormTemplate = require('../models/FormTemplate');
const FormSubmission = require('../models/FormSubmission');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function userInfo(req) {
  const u = req.user || {};
  return {
    userId: u._id || u.id,
    name: u.name || u.email,
    email: u.email,
    role: u.role,
    department: u.department,
  };
}

function isAdmin(req) {
  const u = req.user || {};
  return ['admin', 'super_admin', 'forms_admin'].includes(u.role);
}

async function findTemplate(id) {
  // Try by templateId slug first (catalog seeds use this), fall back to _id
  let tpl = await FormTemplate.findOne({ templateId: id, isActive: true }).lean();
  if (!tpl && /^[0-9a-fA-F]{24}$/.test(id)) {
    tpl = await FormTemplate.findOne({ _id: id, isActive: true }).lean();
  }
  return tpl;
}

// ─── Templates ──────────────────────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.audience) {
      filter.tags = `aud:${req.query.audience}`;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const templates = await FormTemplate.find(filter)
      .sort({ name: 1 })
      .limit(Number(req.query.limit) || 200)
      .lean();
    res.json({ ok: true, templates });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const tpl = await findTemplate(req.params.id);
    if (!tpl) {
      return res.status(404).json({ ok: false, error: 'TEMPLATE_NOT_FOUND' });
    }
    res.json({ ok: true, template: tpl });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Phase 29 — admin toggles isPublic on a template (or other safe fields)
router.patch('/templates/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }
    const FormTemplate = require('../models/FormTemplate');
    const q = { templateId: req.params.id };
    let tpl = await FormTemplate.findOne(q);
    if (!tpl && /^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      tpl = await FormTemplate.findOne({ _id: req.params.id });
    }
    if (!tpl) return res.status(404).json({ ok: false, error: 'TEMPLATE_NOT_FOUND' });
    const allowed = ['isPublic', 'isActive', 'isPublished'];
    let touched = false;
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        tpl[k] = !!req.body[k];
        touched = true;
      }
    }
    if (touched) await tpl.save();
    res.json({ ok: true, template: tpl.toObject() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Submissions ────────────────────────────────────────────────────────────

router.post('/:templateId/submit', async (req, res) => {
  try {
    const tpl = await findTemplate(req.params.templateId);
    if (!tpl) {
      return res.status(404).json({ ok: false, error: 'TEMPLATE_NOT_FOUND' });
    }
    const submitter = userInfo(req);
    const isDraft = req.body?.saveAsDraft === true;

    // Build initial approval record list from the template's workflow.
    const approvals = [];
    if (tpl.approvalWorkflow && tpl.approvalWorkflow.enabled) {
      const steps = (tpl.approvalWorkflow.steps || [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      steps.forEach((s, i) => {
        approvals.push({
          step: i,
          role: s.role,
          label: s.label || s.role,
          status: 'pending',
        });
      });
    }

    const submissionNumber = `SUB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const sub = await FormSubmission.create({
      templateId: tpl.templateId || String(tpl._id),
      templateName: tpl.name,
      templateVersion: tpl.version || 1,
      submissionNumber,
      submittedBy: submitter,
      data: req.body?.data || {},
      status: isDraft ? 'draft' : approvals.length > 0 ? 'under_review' : 'submitted',
      priority: req.body?.priority || 'normal',
      approvals,
      currentApprovalStep: 0,
      currentRevision: 1,
      submittedAt: isDraft ? undefined : new Date(),
    });

    res.status(201).json({ ok: true, submission: sub.toObject() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const filter = {};
    // By default scope to the caller. ?all=1 + admin role lifts the filter.
    if (!(req.query.all === '1' && isAdmin(req))) {
      filter['submittedBy.userId'] = userInfo(req).userId;
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.templateId) filter.templateId = req.query.templateId;

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.page) > 1 ? (Number(req.query.page) - 1) * limit : 0;

    const [submissions, total] = await Promise.all([
      FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FormSubmission.countDocuments(filter),
    ]);

    res.json({ ok: true, submissions, total });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    }
    const sub = await FormSubmission.findById(req.params.id).lean();
    if (!sub) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    // Caller may only read their own unless admin
    const me = userInfo(req).userId?.toString();
    const owner = sub.submittedBy?.userId?.toString();
    if (!isAdmin(req) && me !== owner) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }
    res.json({ ok: true, submission: sub });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/submissions/:id', async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    }
    const sub = await FormSubmission.findById(req.params.id);
    if (!sub) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    const me = userInfo(req).userId?.toString();
    const owner = sub.submittedBy?.userId?.toString();
    if (me !== owner && !isAdmin(req)) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }
    if (!['draft', 'returned'].includes(sub.status)) {
      return res.status(409).json({ ok: false, error: 'NOT_EDITABLE', status: sub.status });
    }
    if (req.body?.data) {
      sub.revisions.push({
        revisionNumber: sub.currentRevision,
        data: sub.data,
        changedAt: new Date(),
        changedBy: me,
      });
      sub.data = req.body.data;
      sub.currentRevision = (sub.currentRevision || 1) + 1;
    }
    if (req.body?.priority) sub.priority = req.body.priority;
    if (req.body?.saveAsDraft === false) {
      sub.status = sub.approvals && sub.approvals.length > 0 ? 'under_review' : 'submitted';
      sub.submittedAt = sub.submittedAt || new Date();
    }
    await sub.save();
    res.json({ ok: true, submission: sub.toObject() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/submissions/:id/review', async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    }
    if (!isAdmin(req) && (req.user || {}).role !== 'reviewer') {
      // We allow any role that matches one of the pending approval steps;
      // simplest gate: if not admin and not 'reviewer', must match a step role.
    }
    const sub = await FormSubmission.findById(req.params.id);
    if (!sub) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

    const approved = req.body?.approved === true;
    const comment = req.body?.comment || '';
    const me = userInfo(req);

    // Find the next pending approval — admins can act on any pending step;
    // others must match the role.
    const stepIdx = (sub.approvals || []).findIndex(a => a.status === 'pending');
    if (stepIdx === -1) {
      return res.status(409).json({ ok: false, error: 'NO_PENDING_STEP', status: sub.status });
    }
    const step = sub.approvals[stepIdx];
    if (!isAdmin(req) && step.role !== me.role) {
      return res.status(403).json({ ok: false, error: 'NOT_YOUR_STEP', requiredRole: step.role });
    }

    step.status = approved ? 'approved' : 'rejected';
    step.approvedBy = me.userId;
    step.approverName = me.name;
    step.comment = comment;
    step.date = new Date();

    if (!approved) {
      sub.status = 'rejected';
      sub.rejectionReason = comment;
    } else {
      sub.currentApprovalStep = stepIdx + 1;
      const allDone = sub.approvals.every(a => a.status === 'approved' || a.status === 'skipped');
      sub.status = allDone ? 'approved' : 'under_review';
    }
    sub.reviewedAt = new Date();
    await sub.save();
    res.json({ ok: true, submission: sub.toObject() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
