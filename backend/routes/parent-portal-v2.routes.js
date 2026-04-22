/**
 * parent-portal-v2.routes.js — fresh parent portal wired to the
 * modules shipped today (Beneficiaries, TherapySessions, CarePlans,
 * ClinicalAssessments). Intentionally standalone — does not touch the
 * legacy parentPortal.routes.js which is kept for back-compat.
 *
 * Access model:
 *   authenticated user → Guardian (userId link) → Beneficiary.guardians[]
 *
 * Mount at /api/parent-v2. Guardians only (role === 'parent' | 'guardian').
 *
 * Endpoints:
 *   GET /me                           — my guardian profile
 *   GET /children                     — my children (beneficiaries)
 *   GET /children/:id/overview        — child profile + summary counts
 *   GET /children/:id/sessions        — upcoming + past sessions
 *   GET /children/:id/care-plan       — latest active plan + goals
 *   GET /children/:id/assessments     — recent assessments + trend
 *   GET /children/:id/attendance      — attendance stats (last 90d)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');
const TherapySession = require('../models/TherapySession');
const CarePlan = require('../models/CarePlan');
const ClinicalAssessment = require('../models/ClinicalAssessment');
const Complaint = require('../models/Complaint');
const PortalNotification = require('../models/PortalNotification');
const parentReportService = require('../services/parentReportService');

router.use(authenticateToken);

const ALLOWED_ROLES = ['parent', 'guardian', 'admin', 'superadmin', 'super_admin'];

// ── helpers ──────────────────────────────────────────────────────────────
async function getMyGuardian(req) {
  if (!req.user?.id) return null;
  return Guardian.findOne({ userId: req.user.id }).lean();
}

async function assertChildAccess(req, childId) {
  if (!mongoose.isValidObjectId(childId)) return { ok: false, status: 400, msg: 'معرّف غير صالح' };
  // Admin / HQ bypass
  if (['admin', 'superadmin', 'super_admin'].includes(req.user?.role)) {
    const child = await Beneficiary.findById(childId).lean();
    return child ? { ok: true, child } : { ok: false, status: 404, msg: 'الطفل غير موجود' };
  }
  const guardian = await getMyGuardian(req);
  if (!guardian) return { ok: false, status: 403, msg: 'لا يوجد سجل ولي أمر مرتبط بحسابك' };
  const child = await Beneficiary.findOne({
    _id: childId,
    guardians: guardian._id,
  }).lean();
  if (!child) return { ok: false, status: 403, msg: 'لا تملك صلاحية الوصول لهذا الطفل' };
  return { ok: true, child, guardian };
}

function gate(req, res, next) {
  const role = req.user?.role || '';
  if (!ALLOWED_ROLES.includes(role))
    return res.status(403).json({ success: false, message: 'الوصول مقتصر على أولياء الأمور' });
  next();
}

router.use(gate);

// ── GET /me ──────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res
        .status(404)
        .json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط — تواصل مع الإدارة' });
    res.json({ success: true, data: guardian });
  } catch (err) {
    return safeError(res, err, 'parent-v2.me');
  }
});

// ── GET /children ────────────────────────────────────────────────────────
router.get('/children', async (req, res) => {
  try {
    let filter;
    if (['admin', 'superadmin', 'super_admin'].includes(req.user?.role)) {
      filter = {};
    } else {
      const guardian = await getMyGuardian(req);
      if (!guardian)
        return res
          .status(404)
          .json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });
      filter = { guardians: guardian._id };
    }
    const children = await Beneficiary.find(filter)
      .select(
        'firstName lastName firstName_ar lastName_ar beneficiaryNumber dateOfBirth gender status disability.primaryType contact.primaryPhone enrollmentDate profilePhoto'
      )
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, items: children });
  } catch (err) {
    return safeError(res, err, 'parent-v2.children');
  }
});

// ── GET /children/:id/overview ───────────────────────────────────────────
router.get('/children/:id/overview', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [sessionsTotal, sessionsUpcoming, plansActive, assessmentsTotal, lastAssessment] =
      await Promise.all([
        TherapySession.countDocuments({ beneficiary: req.params.id }),
        TherapySession.countDocuments({
          beneficiary: req.params.id,
          date: { $gte: now, $lte: weekAhead },
          status: { $in: ['SCHEDULED', 'CONFIRMED'] },
        }),
        CarePlan.countDocuments({ beneficiary: req.params.id, status: 'ACTIVE' }),
        ClinicalAssessment.countDocuments({ beneficiary: req.params.id }),
        ClinicalAssessment.findOne({ beneficiary: req.params.id })
          .sort({ assessmentDate: -1 })
          .select('tool score assessmentDate interpretation')
          .lean(),
      ]);

    res.json({
      success: true,
      child: check.child,
      summary: {
        sessionsTotal,
        sessionsUpcomingWeek: sessionsUpcoming,
        activeCarePlans: plansActive,
        totalAssessments: assessmentsTotal,
        lastAssessment,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.overview');
  }
});

// ── GET /children/:id/sessions ───────────────────────────────────────────
router.get('/children/:id/sessions', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const { scope = 'all', limit = 50 } = req.query;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const filter = { beneficiary: req.params.id };
    if (scope === 'upcoming') {
      filter.date = { $gte: now };
      filter.status = { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] };
    } else if (scope === 'past') {
      filter.date = { $lt: now };
    }

    const items = await TherapySession.find(filter)
      .populate('therapist', 'firstName lastName fullName')
      .populate('room', 'name')
      .sort({ date: scope === 'upcoming' ? 1 : -1 })
      .limit(Math.min(200, Math.max(1, parseInt(limit, 10) || 50)))
      .select(
        'title sessionType date startTime endTime status therapist room attendance notes.assessment'
      )
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'parent-v2.sessions');
  }
});

// ── GET /children/:id/care-plan ──────────────────────────────────────────
router.get('/children/:id/care-plan', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const plan =
      (await CarePlan.findOne({ beneficiary: req.params.id, status: 'ACTIVE' })
        .sort({ startDate: -1 })
        .lean()) ||
      (await CarePlan.findOne({ beneficiary: req.params.id }).sort({ createdAt: -1 }).lean());

    if (!plan) return res.json({ success: true, data: null });

    // Collect all goals for a compact summary
    const collect = [];
    for (const section of ['educational', 'therapeutic', 'lifeSkills']) {
      const sec = plan[section];
      if (!sec?.enabled || !sec.domains) continue;
      for (const [domKey, dom] of Object.entries(sec.domains)) {
        if (!dom?.goals?.length) continue;
        for (const g of dom.goals) {
          collect.push({
            section,
            domain: domKey,
            title: g.title,
            type: g.type,
            status: g.status,
            progress: g.progress || 0,
            target: g.target,
            criteria: g.criteria,
            targetDate: g.targetDate,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        planNumber: plan.planNumber,
        startDate: plan.startDate,
        reviewDate: plan.reviewDate,
        status: plan.status,
        sections: {
          educational: plan.educational?.enabled || false,
          therapeutic: plan.therapeutic?.enabled || false,
          lifeSkills: plan.lifeSkills?.enabled || false,
        },
        goals: collect,
        totalGoals: collect.length,
        achievedGoals: collect.filter(g => g.status === 'ACHIEVED').length,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.carePlan');
  }
});

// ── GET /children/:id/assessments ────────────────────────────────────────
router.get('/children/:id/assessments', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const items = await ClinicalAssessment.find({
      beneficiary: req.params.id,
      status: { $ne: 'archived' },
    })
      .sort({ assessmentDate: -1 })
      .limit(30)
      .select(
        'tool toolVersion category assessmentDate score rawScore maxRawScore interpretation scoreChange improvement observations strengths concerns recommendations'
      )
      .lean();

    // Trend per tool (oldest → newest)
    const byTool = {};
    const chronological = [...items].reverse();
    for (const a of chronological) {
      (byTool[a.tool] ||= []).push({
        date: a.assessmentDate,
        score: a.score,
        interpretation: a.interpretation,
      });
    }

    res.json({ success: true, items, byTool });
  } catch (err) {
    return safeError(res, err, 'parent-v2.assessments');
  }
});

// ── GET /children/:id/attendance ─────────────────────────────────────────
router.get('/children/:id/attendance', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const since = new Date();
    since.setDate(since.getDate() - 90);

    const sessions = await TherapySession.find({
      beneficiary: req.params.id,
      date: { $gte: since },
    })
      .select('date status attendance')
      .lean();

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'COMPLETED').length;
    const noShow = sessions.filter(s => s.status === 'NO_SHOW').length;
    const cancelled = sessions.filter(s =>
      ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'].includes(s.status)
    ).length;
    const late = sessions.filter(s => (s.attendance?.lateMinutes || 0) > 0).length;
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : null;

    res.json({
      success: true,
      windowDays: 90,
      stats: {
        total,
        completed,
        noShow,
        cancelled,
        late,
        attendanceRate,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.attendance');
  }
});

// ── GET /children/:id/report/download ────────────────────────────────────
// Streams a monthly-progress PDF. Re-uses the same fetch shape as the
// other parent-v2 endpoints — no duplication of access logic.
router.get('/children/:id/report/download', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    const childId = req.params.id;

    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [
      sessionsTotal,
      sessionsUpcoming,
      plansActive,
      assessmentsTotal,
      plan,
      assessments,
      attSessions,
    ] = await Promise.all([
      TherapySession.countDocuments({ beneficiary: childId }),
      TherapySession.countDocuments({
        beneficiary: childId,
        date: { $gte: now, $lte: weekAhead },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      }),
      CarePlan.countDocuments({ beneficiary: childId, status: 'ACTIVE' }),
      ClinicalAssessment.countDocuments({ beneficiary: childId }),
      CarePlan.findOne({ beneficiary: childId, status: 'ACTIVE' }).sort({ startDate: -1 }).lean(),
      ClinicalAssessment.find({ beneficiary: childId, status: { $ne: 'archived' } })
        .sort({ assessmentDate: -1 })
        .limit(10)
        .select('tool assessmentDate score interpretation')
        .lean(),
      TherapySession.find({ beneficiary: childId, date: { $gte: since } })
        .select('date status attendance')
        .lean(),
    ]);

    // Flatten plan goals for the service's goalProgress helper.
    const flatGoals = [];
    if (plan) {
      for (const section of ['educational', 'therapeutic', 'lifeSkills']) {
        const sec = plan[section];
        if (!sec?.enabled || !sec.domains) continue;
        for (const dom of Object.values(sec.domains)) {
          if (!dom?.goals?.length) continue;
          for (const g of dom.goals) flatGoals.push({ status: g.status });
        }
      }
    }

    const attendanceSummary = {
      completed: attSessions.filter(s => s.status === 'COMPLETED').length,
      noShow: attSessions.filter(s => s.status === 'NO_SHOW').length,
      cancelled: attSessions.filter(s =>
        ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'].includes(s.status)
      ).length,
      lateArrival: attSessions.filter(s => (s.attendance?.lateMinutes || 0) > 0).length,
    };

    const tree = parentReportService.assembleReport({
      child: check.child,
      overview: {
        sessionCount: sessionsTotal,
        upcomingCount: sessionsUpcoming,
        activeCarePlansCount: plansActive,
        assessmentsCount: assessmentsTotal,
      },
      attendance: attendanceSummary,
      carePlan: plan
        ? {
            title: plan.planNumber || null,
            status: plan.status,
            startDate: plan.startDate,
            goals: flatGoals,
          }
        : null,
      assessments: {
        items: assessments.map(a => ({
          tool: a.tool,
          date: a.assessmentDate,
          score: a.score,
          interpretation: a.interpretation,
        })),
      },
    });

    const buf = await parentReportService.renderPdf(tree);
    const filename = `progress-report-${childId}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (err) {
    return safeError(res, err, 'parent-v2.report.download');
  }
});

// ── GET /complaints ──────────────────────────────────────────────────────
// List complaints/feedback the current guardian has submitted.
router.get('/complaints', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'غير مصرّح' });
    const items = await Complaint.find({
      submittedBy: req.user.id,
      source: 'parent',
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        'complaintId type category subject description priority status responses resolution resolvedAt rating createdAt updatedAt'
      )
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'parent-v2.complaints.list');
  }
});

// ── POST /complaints ─────────────────────────────────────────────────────
// Submit a complaint / suggestion / feedback from the parent portal.
// Auto-fills submitter details from the guardian profile; if childId is
// passed, gates it through assertChildAccess so a parent can't attach a
// complaint to a child they don't own.
router.post('/complaints', async (req, res) => {
  try {
    const {
      type = 'complaint',
      category = 'service',
      subject,
      description,
      priority = 'medium',
      childId,
    } = req.body || {};

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'الموضوع مطلوب (3 أحرف على الأقل)' });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'الوصف مطلوب (5 أحرف على الأقل)' });
    }
    if (!['complaint', 'suggestion', 'feedback', 'grievance'].includes(type)) {
      return res.status(400).json({ success: false, message: 'نوع غير صالح' });
    }
    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'أولوية غير صالحة' });
    }

    // If childId provided, verify access before accepting.
    let childLabel = null;
    if (childId) {
      const check = await assertChildAccess(req, childId);
      if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
      childLabel =
        check.child?.firstName_ar ||
        `${check.child?.firstName || ''} ${check.child?.lastName || ''}`.trim() ||
        null;
    }

    const guardian = await getMyGuardian(req);

    const decoratedDescription = childLabel
      ? `[يخص الطفل: ${childLabel}]\n\n${description.trim()}`
      : description.trim();

    const complaint = await Complaint.create({
      type,
      source: 'parent',
      category,
      subject: subject.trim(),
      description: decoratedDescription,
      priority,
      status: 'new',
      submittedBy: req.user?.id,
      submitterName: guardian
        ? `${guardian.firstName_ar || guardian.firstName_en || ''} ${guardian.lastName_ar || guardian.lastName_en || ''}`.trim()
        : undefined,
      submitterEmail: guardian?.email,
      submitterPhone: guardian?.phone,
    });

    res.status(201).json({
      success: true,
      data: {
        id: complaint._id,
        complaintId: complaint.complaintId,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.complaints.create');
  }
});

// ── GET /notifications ───────────────────────────────────────────────────
// List portal notifications addressed to the current guardian. Supports
// ?unreadOnly=true to filter, and a soft cap at 100 so a pathological
// inbox can't blow up the response.
router.get('/notifications', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian) {
      return res.json({ success: true, items: [], unreadCount: 0 });
    }
    const unreadOnly = req.query.unreadOnly === 'true';
    const filter = { guardianId: guardian._id, isArchived: false };
    if (unreadOnly) filter.isRead = false;

    const [items, unreadCount] = await Promise.all([
      PortalNotification.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .select('type title message priority isRead readAt createdAt beneficiaryId')
        .populate('beneficiaryId', 'firstName firstName_ar lastName lastName_ar')
        .lean(),
      PortalNotification.countDocuments({
        guardianId: guardian._id,
        isArchived: false,
        isRead: false,
      }),
    ]);
    res.json({ success: true, items, unreadCount });
  } catch (err) {
    return safeError(res, err, 'parent-v2.notifications.list');
  }
});

// ── PATCH /notifications/:id/read ────────────────────────────────────────
// Mark a single notification as read. Guardian-scoped — a parent can't
// flip the read flag on someone else's notification.
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const updated = await PortalNotification.findOneAndUpdate(
      { _id: req.params.id, guardianId: guardian._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
    res.json({ success: true, data: { id: updated._id, isRead: true } });
  } catch (err) {
    return safeError(res, err, 'parent-v2.notifications.markRead');
  }
});

// ── POST /notifications/read-all ─────────────────────────────────────────
// Bulk mark-as-read for the current guardian. Returns the count of rows
// updated so the UI can show "marked N as read".
router.post('/notifications/read-all', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const result = await PortalNotification.updateMany(
      { guardianId: guardian._id, isRead: false, isArchived: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({
      success: true,
      modifiedCount: result.modifiedCount || result.nModified || 0,
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.notifications.readAll');
  }
});

module.exports = router;
