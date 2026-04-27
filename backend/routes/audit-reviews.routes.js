/**
 * Audit log — flattened review actions across FormSubmissions.
 *
 *   GET /api/v1/admin/audit/reviews
 *
 * Returns one row per (submission × completed approval step) so the admin
 * can see "who reviewed what when" in one chronological feed. Sources:
 *   - submission.approvals[] entries with status != 'pending'
 *   - submission.reviewedAt (when there was no workflow — admin direct
 *     status flip) — synthesized as a single "reviewer" row.
 *
 * Mount: app.use('/api/v1/admin/audit', router)
 */

'use strict';

const express = require('express');
const FormSubmission = require('../models/FormSubmission');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function isAdmin(req) {
  const u = req.user || {};
  return ['admin', 'super_admin'].includes(u.role);
}

router.get('/reviews', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });

    const filter = {};
    if (req.query.role) filter['submittedBy.role'] = req.query.role;
    if (req.query.from || req.query.to) {
      filter.reviewedAt = {};
      if (req.query.from) {
        const f = new Date(String(req.query.from));
        if (!isNaN(f)) filter.reviewedAt.$gte = f;
      }
      if (req.query.to) {
        const t = new Date(String(req.query.to));
        if (!isNaN(t)) {
          t.setHours(23, 59, 59, 999);
          filter.reviewedAt.$lte = t;
        }
      }
    } else {
      // Default to last 30 days when no range given.
      filter.reviewedAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }
    if (req.query.reviewerId) filter['approvals.approvedBy'] = req.query.reviewerId;

    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const submissions = await FormSubmission.find(filter)
      .sort({ reviewedAt: -1 })
      .limit(limit)
      .select(
        'submissionNumber templateName status reviewedAt approvals rejectionReason returnReason submittedBy submittedAt createdAt'
      )
      .lean();

    const events = [];
    for (const s of submissions) {
      const completed = (s.approvals || []).filter(
        a => a.status === 'approved' || a.status === 'rejected'
      );
      if (completed.length > 0) {
        for (const a of completed) {
          events.push({
            _id: `${s._id}-step-${a.step ?? 0}`,
            submissionId: s._id,
            submissionNumber: s.submissionNumber,
            templateName: s.templateName,
            submitterName: s.submittedBy?.name || '—',
            submitterRole: s.submittedBy?.role || null,
            stepLabel: a.label || a.role,
            action: a.status, // 'approved' or 'rejected'
            reviewerId: a.approvedBy ? String(a.approvedBy) : null,
            reviewerName: a.approverName || '—',
            comment: a.comment || '',
            at: a.date || s.reviewedAt,
            currentSubmissionStatus: s.status,
          });
        }
      } else if (s.reviewedAt && (s.status === 'approved' || s.status === 'rejected')) {
        // No-workflow direct admin action
        events.push({
          _id: `${s._id}-direct`,
          submissionId: s._id,
          submissionNumber: s.submissionNumber,
          templateName: s.templateName,
          submitterName: s.submittedBy?.name || '—',
          submitterRole: s.submittedBy?.role || null,
          stepLabel: 'مباشر',
          action: s.status,
          reviewerId: null,
          reviewerName: '—',
          comment: s.rejectionReason || s.returnReason || '',
          at: s.reviewedAt,
          currentSubmissionStatus: s.status,
        });
      }
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    res.json({ ok: true, events });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/reviews/stats', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const subs = await FormSubmission.find({ reviewedAt: { $gte: since } })
      .select('approvals reviewedAt status submittedAt createdAt')
      .lean();

    let approved = 0,
      rejected = 0;
    let totalMs = 0;
    let withMs = 0;
    for (const s of subs) {
      if (s.status === 'approved') approved += 1;
      if (s.status === 'rejected') rejected += 1;
      const start = new Date(s.submittedAt || s.createdAt || 0).getTime();
      const end = new Date(s.reviewedAt || 0).getTime();
      if (start && end && end > start) {
        totalMs += end - start;
        withMs += 1;
      }
    }
    res.json({
      ok: true,
      windowDays: days,
      total: subs.length,
      approved,
      rejected,
      avgReviewMs: withMs > 0 ? Math.round(totalMs / withMs) : 0,
      reviewedCount: withMs,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
