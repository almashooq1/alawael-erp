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
const safeError = require('../utils/safeError');

// Loaded lazily so the routes file still parses if these aren't installed.
let unifiedNotifier = null;
try {
  unifiedNotifier = require('../services/unifiedNotifier');
} catch {
  /* notifier optional */
}

let Beneficiary = null;
try {
  Beneficiary = require('../models/Beneficiary');
} catch {
  /* model optional */
}

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
      .limit(Math.min(Number(req.query.limit) || 200, 2000)) // W1182 — DoS cap
      .lean();
    res.json({ ok: true, templates });
  } catch (err) {
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
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
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
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
    const boolFields = ['isPublic', 'isActive', 'isPublished'];
    const numFields = ['slaHours'];
    let touched = false;
    for (const k of boolFields) {
      if (req.body[k] !== undefined) {
        tpl[k] = !!req.body[k];
        touched = true;
      }
    }
    for (const k of numFields) {
      if (req.body[k] !== undefined) {
        const v = req.body[k] === null ? null : Number(req.body[k]);
        if (v === null || (Number.isFinite(v) && v >= 0)) {
          tpl[k] = v;
          touched = true;
        }
      }
    }
    if (touched) await tpl.save();
    res.json({ ok: true, template: tpl.toObject() });
  } catch (err) {
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
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

    // Build initial approval record list from the template's chain.
    // W1186 — the model's declared field is approvalSteps; the old
    // approvalWorkflow read was a phantom (strict mode never persisted it),
    // so the step-wise review engine below never engaged for catalog forms.
    const approvals = [];
    {
      const wfSteps =
        tpl.approvalSteps && tpl.approvalSteps.length > 0
          ? tpl.approvalSteps
          : (tpl.approvalWorkflow && tpl.approvalWorkflow.enabled
              ? tpl.approvalWorkflow.steps
              : []) || [];
      wfSteps
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((s, i) => {
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
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
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
    // Phase 30 — admins can filter by submitter role to see only public
    // (unauth) submissions queued from /api/v1/public/forms/*/submit.
    if (req.query.role && isAdmin(req)) {
      filter['submittedBy.role'] = req.query.role;
    }
    // Date-range filter for reporting / monthly exports.
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        const from = new Date(String(req.query.from));
        if (!isNaN(from.getTime())) filter.createdAt.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(String(req.query.to));
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999); // include the entire end day
          filter.createdAt.$lte = to;
        }
      }
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.page) > 1 ? (Number(req.query.page) - 1) * limit : 0;

    const [submissions, total] = await Promise.all([
      FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FormSubmission.countDocuments(filter),
    ]);

    // Phase 30 — enrich each row with its template's slaHours so the admin
    // queue can compute SLA badges per-template instead of one global value.
    const templateIds = [...new Set(submissions.map(s => s.templateId).filter(Boolean))];
    if (templateIds.length > 0) {
      const tpls = await FormTemplate.find(
        { templateId: { $in: templateIds } },
        { templateId: 1, slaHours: 1 }
      ).lean();
      const slaMap = new Map(tpls.map(t => [t.templateId, t.slaHours]));
      for (const s of submissions) {
        s.templateSlaHours = slaMap.get(s.templateId) ?? null;
      }
    }

    res.json({ ok: true, submissions, total });
  } catch (err) {
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
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
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
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
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
  }
});

// ─── Analytics (admin) ───────────────────────────────────────────────────────
//
// Aggregate counts for the forms-analytics dashboard. Window defaults to 30
// days, capped at 365. Returns: total + per-day series + status breakdown +
// top templates + average review time.

router.get('/analytics', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });

    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const baseFilter = { createdAt: { $gte: since } };
    if (req.query.role) baseFilter['submittedBy.role'] = String(req.query.role);

    const [total, byDay, byStatus, byTemplate, byPriority, reviewedAgg] = await Promise.all([
      FormSubmission.countDocuments(baseFilter),
      FormSubmission.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      FormSubmission.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      FormSubmission.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$templateId',
            templateName: { $first: '$templateName' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      FormSubmission.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      FormSubmission.aggregate([
        {
          $match: {
            ...baseFilter,
            reviewedAt: { $exists: true },
            submittedAt: { $exists: true },
          },
        },
        {
          $project: {
            ms: { $subtract: ['$reviewedAt', '$submittedAt'] },
          },
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: '$ms' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Fill the daily series: zeros for days with no submissions, so the
    // chart line is continuous.
    const seriesMap = new Map(byDay.map(d => [d._id, d]));
    const series = [];
    const cur = new Date(since);
    cur.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    while (cur <= today) {
      const key = cur.toISOString().slice(0, 10);
      const e = seriesMap.get(key);
      series.push({
        date: key,
        count: e?.count || 0,
        approved: e?.approved || 0,
        rejected: e?.rejected || 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    res.json({
      ok: true,
      windowDays: days,
      total,
      series,
      byStatus,
      byTemplate,
      byPriority,
      avgReviewMs: reviewedAgg[0]?.avgMs || 0,
      reviewedCount: reviewedAgg[0]?.count || 0,
    });
  } catch (err) {
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
  }
});

// ─── Bulk review (admin) ─────────────────────────────────────────────────────
//
// Loops review() over an array of submission ids — same semantics, same
// side-effects (visitor notify, intake → Beneficiary). Capped at 100 to
// stop a runaway POST from melting the API.

const MAX_BULK = 100;

router.post('/submissions/bulk-review', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ ok: false, error: 'IDS_REQUIRED' });
    if (ids.length > MAX_BULK)
      return res.status(400).json({ ok: false, error: 'TOO_MANY', max: MAX_BULK });
    const approved = req.body?.approved === true;
    const comment = req.body?.comment || '';

    const results = { approved: 0, rejected: 0, failed: 0, errors: [] };

    for (const id of ids) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        results.failed += 1;
        results.errors.push({ id, error: 'INVALID_ID' });
        continue;
      }
      try {
        // Forge a per-iteration mock res and call the real review logic by
        // invoking the same code path inline. Cleaner than HTTP self-call.
        const sub = await FormSubmission.findById(id);
        if (!sub) {
          results.failed += 1;
          results.errors.push({ id, error: 'NOT_FOUND' });
          continue;
        }
        const me = userInfo(req);
        const previousStatus = sub.status;
        const stepIdx = (sub.approvals || []).findIndex(a => a.status === 'pending');
        if (stepIdx >= 0) {
          const step = sub.approvals[stepIdx];
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
            const allDone = sub.approvals.every(
              a => a.status === 'approved' || a.status === 'skipped'
            );
            sub.status = allDone ? 'approved' : 'under_review';
          }
        } else {
          sub.status = approved ? 'approved' : 'rejected';
          if (!approved) sub.rejectionReason = comment;
        }
        sub.reviewedAt = new Date();
        await sub.save();

        const isPublic =
          sub.submittedBy?.role === 'public' || /^PUB-/.test(sub.submissionNumber || '');
        if (sub.status !== previousStatus && isPublic) {
          const submitter = sub.submittedBy || {};
          const trackUrl = `https://alaweal.org/forms/track/${encodeURIComponent(sub.submissionNumber)}`;
          const statusLabel = sub.status === 'approved' ? 'تمت الموافقة على' : 'الاعتذار عن';
          const body = [
            `مرحباً ${submitter.name || ''}،`,
            '',
            `بشأن طلبك (${sub.submissionNumber}):`,
            `${statusLabel} طلبك.`,
            comment ? `\nالملاحظات: ${comment}` : '',
            '',
            `لمتابعة التفاصيل: ${trackUrl}`,
          ]
            .filter(Boolean)
            .join('\n');
          if ((submitter.phone || submitter.email) && unifiedNotifier?.notify) {
            unifiedNotifier
              .notify({
                to: { phone: submitter.phone || '', email: submitter.email || '' },
                subject: `تحديث على طلبك ${sub.submissionNumber}`,
                body,
                templateKey: 'public-form.bulk-status-change',
              })
              .catch(() => {});
          }
        }

        if (sub.status === 'approved') results.approved += 1;
        else if (sub.status === 'rejected') results.rejected += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push({ id, error: err.message });
      }
    }

    res.json({ ok: true, ...results });
  } catch (err) {
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
  }
});

router.put('/submissions/:id/review', async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ID' });
    }
    const sub = await FormSubmission.findById(req.params.id);
    if (!sub) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

    const approved = req.body?.approved === true;
    const comment = req.body?.comment || '';
    const me = userInfo(req);
    const previousStatus = sub.status;

    const stepIdx = (sub.approvals || []).findIndex(a => a.status === 'pending');

    if (stepIdx >= 0) {
      // Workflow path — gate to admins or the role of the pending step.
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
    } else {
      // No-workflow path (used heavily by public submissions). Admins can
      // mark resolved/rejected directly; other roles can't.
      if (!isAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
      }
      sub.status = approved ? 'approved' : 'rejected';
      if (!approved) sub.rejectionReason = comment;
    }
    sub.reviewedAt = new Date();
    await sub.save();

    // ── Side-effects (best-effort, don't block the response) ────────────
    const isPublicSubmission =
      sub.submittedBy?.role === 'public' || /^PUB-/.test(sub.submissionNumber || '');
    const statusChanged = sub.status !== previousStatus;

    if (statusChanged && isPublicSubmission) {
      // Notify the visitor on phone or email if either was captured.
      const submitter = sub.submittedBy || {};
      const trackUrl = `https://alaweal.org/forms/track/${encodeURIComponent(sub.submissionNumber)}`;
      const statusLabel =
        sub.status === 'approved'
          ? 'تمت الموافقة على'
          : sub.status === 'rejected'
            ? 'الاعتذار عن'
            : sub.status;
      const body = [
        `مرحباً ${submitter.name || ''}،`,
        '',
        `بشأن طلبك (${sub.submissionNumber}) — "${sub.templateName}":`,
        `${statusLabel} طلبك.`,
        comment ? `\nالملاحظات: ${comment}` : '',
        '',
        `لمتابعة التفاصيل: ${trackUrl}`,
        '',
        '— منصة العواعل لإعادة التأهيل',
      ]
        .filter(Boolean)
        .join('\n');

      const to = {
        phone: submitter.phone || '',
        email: submitter.email || '',
      };
      if ((to.phone || to.email) && unifiedNotifier?.notify) {
        unifiedNotifier
          .notify({
            to,
            subject: `تحديث على طلبك ${sub.submissionNumber}`,
            body,
            templateKey: 'public-form.status-change',
            metadata: {
              submissionId: String(sub._id),
              submissionNumber: sub.submissionNumber,
              newStatus: sub.status,
            },
          })
          .catch(err => {
            // Don't fail the API call — log to NotificationLog already
            // captures failures; this is just for visibility.
            console.warn('public-form notify failed:', err.message);
          });
      }
    }

    // Auto-convert approved intake submissions to a real Beneficiary record.
    // Only for the registration template, only when status flips to approved,
    // and only if the model is loaded.
    if (
      statusChanged &&
      sub.status === 'approved' &&
      sub.templateId === 'beneficiary.intake.registration' &&
      Beneficiary
    ) {
      try {
        const data = sub.data || {};
        const submitter = sub.submittedBy || {};
        const fullName = data.full_name_ar || data.full_name || data.name || submitter.name;
        if (fullName) {
          const ben = await Beneficiary.create({
            fullName,
            fullNameEn: data.full_name_en || data.full_name,
            nationalId: data.national_id || data.id_number,
            dateOfBirth: data.date_of_birth || data.dob,
            gender: data.gender,
            phone: data.phone || submitter.phone,
            email: data.email || submitter.email,
            guardianName: data.guardian_name,
            guardianPhone: data.guardian_phone,
            address: data.address,
            disability: data.disability_type,
            notes: `تم الإنشاء تلقائياً من نموذج ${sub.submissionNumber}.`,
            status: 'pending_review',
            createdBy: me.userId,
            metadata: {
              sourceSubmissionId: sub._id,
              sourceSubmissionNumber: sub.submissionNumber,
            },
          });
          // Stamp the link back on the submission for traceability.
          sub.notes = `${sub.notes || ''}\nتم إنشاء ملف مستفيد: ${ben._id}`.trim();
          await sub.save();
        }
      } catch (err) {
        console.warn('intake → beneficiary conversion failed:', err.message);
      }
    }

    res.json({ ok: true, submission: sub.toObject() });
  } catch (err) {
    return safeError(res, err, 'formsSubmission', { shape: 'ok' });
  }
});

module.exports = router;
