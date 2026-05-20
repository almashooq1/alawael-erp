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
// Day-rehab logs the parent gets a parent-scoped view onto (Wave 192). The
// admin /api/v1/daily-communication routes already serve these via the
// 'parent' read role, but the parent-portal-v2 router is the canonical
// surface the parent app talks to, so we re-expose with assertChildAccess.
const DailyCommunicationLog = require('../models/DailyCommunicationLog');
// Day-rehab attendance (W174 model). Parent gets a 30-day window via W193b.
const BeneficiaryDayAttendance = require('../models/BeneficiaryDayAttendance');
// HomeAssignment is the model the therapist uses today to send
// at-home tasks to the family. Wave 6 surfaces it on the parent
// side + lets the parent log execution per submission row. The
// model already supports `submissions: [{ status, parentNote,
// mediaUrl, ... }]` so we only add routes + UI, no schema change.
const HomeAssignment = require('../models/HomeAssignment');
const parentReportService = require('../services/parentReportService');
const { BlockchainCertificate } = require('../models/blockchain.model');
const { generateCertificatePdf } = require('../services/blockchainPdfService');
const certService = require('../services/blockchainCertService');

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

// ── GET /children/:id/communication-book — Wave 192 ──────────────────────
// Lists the kid's recent daily-communication entries (دفتر التواصل اليومي).
// Parent role: scoped via assertChildAccess; only published entries
// surface (drafts/amended drafts stay internal).
router.get('/children/:id/communication-book', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const items = await DailyCommunicationLog.find({
      beneficiaryId: req.params.id,
      status: { $in: ['published', 'amended'] },
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    const unseenCount = items.filter(it => !it.parentSeen).length;
    res.json({ success: true, items, count: items.length, unseenCount });
  } catch (err) {
    return safeError(res, err, 'parent-v2.communicationBook');
  }
});

// ── POST /children/:id/communication-book/:entryId/seen — Wave 192 ───────
// Parent marks a comm-book entry as seen. Mirrors admin /parent-seen but
// constrains the entry to belong to this child.
router.post('/children/:id/communication-book/:entryId/seen', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    if (!mongoose.isValidObjectId(req.params.entryId)) {
      return res.status(400).json({ success: false, message: 'معرّف المدخل غير صالح' });
    }
    const updated = await DailyCommunicationLog.findOneAndUpdate(
      { _id: req.params.entryId, beneficiaryId: req.params.id },
      { parentSeen: true, parentSeenAt: new Date() },
      { new: true }
    ).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على المدخل' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    return safeError(res, err, 'parent-v2.commSeen');
  }
});

// ── GET /children/:id/day-attendance — Wave 193b ─────────────────────────
// Returns the kid's last 30 days of BeneficiaryDayAttendance records +
// a summary breakdown. Day-rehab attendance is distinct from session
// attendance (TherapySession) — this answers "did the kid show up at
// the day-program today / this week / this month?" rather than "did
// they make their PT session?".
router.get('/children/:id/day-attendance', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const items = await BeneficiaryDayAttendance.find({
      beneficiaryId: req.params.id,
      date: { $gte: since },
    })
      .sort({ date: -1 })
      .lean();

    const summary = { present: 0, absent: 0, late: 0, excused: 0, sent_home: 0 };
    for (const r of items) {
      if (summary[r.status] != null) summary[r.status] += 1;
    }
    const presentish = summary.present + summary.late;
    const presentRate = items.length > 0 ? Math.round((presentish / items.length) * 100) : null;

    // Today's record (if any) for the "are they here right now?" tile.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = items.find(r => r.date && new Date(r.date).getTime() >= todayStart.getTime());

    res.json({
      success: true,
      windowDays: days,
      total: items.length,
      summary,
      presentRate,
      today: today || null,
      items,
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.dayAttendance');
  }
});

// ── GET /children/:id/certificates ───────────────────────────────────────
// Lists blockchain certificates issued to this child. Match key is
// `BlockchainCertificate.recipient.nationalId` ↔ `Beneficiary.nationalId`,
// since certs are minted with national-id rather than an internal beneficiary
// ref. Drafts and revoked certs are excluded — parents see issued/expired only.
router.get('/children/:id/certificates', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    const child = check.child;
    if (!child?.nationalId) {
      return res.json({ success: true, items: [] }); // no NID → no certs to show
    }

    const certs = await BlockchainCertificate.find({
      'recipient.nationalId': child.nationalId,
      isDeleted: { $ne: true },
      status: { $in: ['issued', 'verified', 'expired'] },
    })
      .select(
        'certificateNumber title category status issueDate expiryDate hash blockchain.network signatures'
      )
      .sort({ issueDate: -1 })
      .lean();

    res.json({ success: true, items: certs });
  } catch (err) {
    return safeError(res, err, 'parent-v2.certificates.list');
  }
});

// ── GET /children/:id/certificates/:certId ───────────────────────────────
// Detail view for a single cert, gated by both child access AND the cert's
// nationalId matching. Returns the same payload shape as the public verify
// page (no PII beyond what's already on the cert).
router.get('/children/:id/certificates/:certId', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    const child = check.child;
    if (!mongoose.isValidObjectId(req.params.certId)) {
      return res.status(400).json({ success: false, message: 'معرّف الشهادة غير صالح' });
    }
    const cert = await BlockchainCertificate.findById(req.params.certId).lean();
    if (!cert || cert.isDeleted)
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    if (cert.recipient?.nationalId !== child?.nationalId) {
      return res.status(403).json({ success: false, message: 'الشهادة لا تخص هذا الطفل' });
    }

    const verdict = cert.hash ? await certService.verifyByHash(cert.hash) : null;

    res.json({
      success: true,
      certificate: cert,
      integrity: verdict
        ? {
            verified: verdict.verified,
            hashMatch: verdict.hashMatch,
            merkleMatch: verdict.merkleMatch,
            blockchainMatch: verdict.blockchainMatch,
          }
        : null,
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.certificates.detail');
  }
});

// ── GET /children/:id/certificates/:certId/pdf ───────────────────────────
// PDF download with embedded QR linking to the public verify page.
router.get('/children/:id/certificates/:certId/pdf', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
    const child = check.child;
    if (!mongoose.isValidObjectId(req.params.certId)) {
      return res.status(400).json({ success: false, message: 'معرّف الشهادة غير صالح' });
    }
    const cert = await BlockchainCertificate.findById(req.params.certId).lean();
    if (!cert || cert.isDeleted)
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    if (cert.recipient?.nationalId !== child?.nationalId) {
      return res.status(403).json({ success: false, message: 'الشهادة لا تخص هذا الطفل' });
    }
    const verifyUrl = certService.publicVerifyUrl(cert.hash);
    const pdf = await generateCertificatePdf(cert, { verifyUrl });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${cert.certificateNumber || cert._id}.pdf"`
    );
    res.send(pdf);
  } catch (err) {
    return safeError(res, err, 'parent-v2.certificates.pdf');
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

// ── Wave 8: Parent Nafath Care-Plan Signing ─────────────────────────────
//
// Surfaces the existing nafathSigningService (services/nafathSigningService.js)
// to guardians for care-plan acknowledgement. The plan must already be marked
// `requiresSignature=true` by the therapist; this endpoint is the parent-side
// counterpart that issues a Nafath request scoped to `signerRole='guardian'`.
//
// Flow:
//   1. POST /children/:id/care-plan/:planId/sign-request
//      → creates NafathSignatureRequest, returns randomNumber + transactionId
//   2. Parent's mobile app matches randomNumber in Nafath app
//   3. Frontend polls /api/v1/nafath/signing/:requestId/status (shared route)
//   4. On APPROVED, the care plan can be marked parent-signed via
//      POST /children/:id/care-plan/:planId/mark-signed (idempotent;
//      verifies the Nafath request status before flipping `signedAt`).

// Heavy modules — lazily required so the route file stays cheap to load
// when these aren't installed (mock dev environment).
let nafathSigningServiceCache = null;
function getNafathService() {
  if (nafathSigningServiceCache) return nafathSigningServiceCache;
  try {
    const mod = require('../services/nafathSigningService');
    nafathSigningServiceCache = mod.createService ? mod.createService() : mod;
  } catch {
    nafathSigningServiceCache = null;
  }
  return nafathSigningServiceCache;
}

// POST /children/:id/care-plan/:planId/sign-request
// Body: { documentHash: string }
//   - documentHash is the SHA-256 of the rendered care-plan PDF/text the
//     parent sees on screen. Required so the signed evidence can be
//     re-verified later (Nafath JWS is bound to this hash).
router.post('/children/:id/care-plan/:planId/sign-request', async (req, res) => {
  try {
    const access = await assertChildAccess(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.msg });

    if (!mongoose.isValidObjectId(req.params.planId))
      return res.status(400).json({ success: false, message: 'معرّف الخطة غير صالح' });

    const { documentHash } = req.body || {};
    if (typeof documentHash !== 'string' || documentHash.length < 32) {
      return res.status(400).json({ success: false, message: 'documentHash مطلوب (SHA-256 hex)' });
    }

    // Confirm the plan actually belongs to the asserted child + is marked
    // for signature. A parent shouldn't be able to spin up a Nafath flow
    // on someone else's plan or on a plan that doesn't expect signature.
    const plan = await CarePlan.findOne({
      _id: req.params.planId,
      beneficiary: req.params.id,
    }).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (!plan.requiresSignature) {
      return res.status(400).json({ success: false, message: 'هذه الخطة لا تتطلب توقيعاً' });
    }
    if (plan.signedAt) {
      return res.status(409).json({ success: false, message: 'تم توقيع الخطة مسبقاً' });
    }

    // Guardian national ID is the legal anchor. Without it Nafath can't
    // bind the signature to a verifiable identity.
    const guardian = access.guardian || (await getMyGuardian(req));
    const nationalId = guardian?.nationalId || guardian?.identityNumber || null;
    if (!nationalId) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد رقم هوية وطنية مسجل لولي الأمر — يرجى تحديث الملف الشخصي',
      });
    }

    const svc = getNafathService();
    if (!svc) {
      return res.status(503).json({
        success: false,
        message: 'خدمة نفاذ غير متوفرة حالياً',
      });
    }

    let signatureRequest;
    try {
      signatureRequest = await svc.requestSignature({
        documentType: 'IRP',
        documentId: String(plan._id),
        documentHash,
        purpose: 'acknowledge',
        signerNationalId: nationalId,
        signerRole: 'guardian',
        signerUserId: req.user?.id || null,
        initiatedBy: req.user?.id || null,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (err) {
      // Map service-level error codes onto helpful HTTP responses.
      if (err.code === 'INVALID_ID') {
        return res.status(400).json({ success: false, message: err.message });
      }
      return safeError(res, err, 'parent-v2.carePlan.signRequest');
    }

    res.status(201).json({
      success: true,
      data: {
        requestId: signatureRequest._id || signatureRequest.requestId,
        transactionId: signatureRequest.transactionId,
        randomNumber: signatureRequest.randomNumber,
        expiresAt: signatureRequest.expiresAt,
        status: signatureRequest.status,
        mode: signatureRequest.mode,
        reused: !!signatureRequest.reused,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.carePlan.signRequest.outer');
  }
});

// POST /children/:id/care-plan/:planId/mark-signed
// Body: { requestId: string }
//   - Verifies the Nafath request is APPROVED before flipping the plan to
//     signed. Idempotent: if already signed (with a matching request ID),
//     returns 200 with no change.
router.post('/children/:id/care-plan/:planId/mark-signed', async (req, res) => {
  try {
    const access = await assertChildAccess(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.msg });

    const { requestId } = req.body || {};
    if (!requestId || !mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: 'requestId مطلوب وصالح' });
    }

    const svc = getNafathService();
    if (!svc) {
      return res.status(503).json({ success: false, message: 'خدمة نفاذ غير متوفرة' });
    }

    // Poll the service so a previously-PENDING request that completed
    // between requests gets its state advanced server-side before we
    // trust it. The service is idempotent on terminal states.
    let signatureRequest;
    try {
      signatureRequest = await svc.pollSignature(requestId);
    } catch (err) {
      return safeError(res, err, 'parent-v2.carePlan.markSigned.poll');
    }

    if (!signatureRequest || signatureRequest.status !== 'APPROVED') {
      return res.status(409).json({
        success: false,
        message: 'لم يكتمل التوقيع بعد عبر نفاذ',
        status: signatureRequest?.status || 'UNKNOWN',
      });
    }

    // Ensure the signed document points at THIS plan + THIS child. A
    // parent shouldn't be able to re-use a sibling's signature.
    if (
      signatureRequest.documentId !== String(req.params.planId) ||
      signatureRequest.signerUserId?.toString() !== req.user?.id
    ) {
      return res
        .status(403)
        .json({ success: false, message: 'التوقيع غير مطابق للخطة أو المستخدم' });
    }

    const updated = await CarePlan.findOneAndUpdate(
      { _id: req.params.planId, beneficiary: req.params.id, signedAt: null },
      {
        $set: {
          signedAt: signatureRequest.approvedAt || new Date(),
          signedBy: req.user?.id || null,
        },
      },
      { new: true }
    ).lean();

    // If updated is null, the plan was already signed by a prior call —
    // treat as success (idempotency keeps the UX simple).
    res.json({
      success: true,
      data: {
        planId: req.params.planId,
        signedAt: (updated && updated.signedAt) || new Date(),
        requestId,
        idempotent: !updated,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.carePlan.markSigned.outer');
  }
});

// ── Wave 6: Home Program endpoints ──────────────────────────────────────
//
// Why this lives here and not in the rehab routes: the therapist-facing
// CRUD already exists at `/api/v1/rehab/home-assignments` (admin/staff
// only). Wave 6 just exposes a read + log-execution surface scoped to
// the authenticated guardian, with the same `assertChildAccess` gate
// that protects every other parent-v2 endpoint.

// GET /children/:id/home-programs
// Returns active + recently-completed home assignments for the child.
// Sorted newest-first. Each item carries the latest 5 submissions so
// the parent can scan compliance history without a second round trip.
router.get('/children/:id/home-programs', async (req, res) => {
  try {
    const access = await assertChildAccess(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.msg });

    const rows = await HomeAssignment.find({
      beneficiary: req.params.id,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    })
      .sort({ status: 1, updatedAt: -1 }) // ACTIVE first, then COMPLETED
      .limit(50)
      .lean();

    const items = rows.map(r => {
      const submissions = Array.isArray(r.submissions) ? r.submissions : [];
      // Keep only the last 5 submissions in the list response —
      // older entries are lazily fetched if the parent opens detail.
      const recent = submissions
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Compliance summary across the last 14 days. Helps the parent
      // gauge "how am I doing?" without scrolling through entries.
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentWindow = submissions.filter(s => new Date(s.date).getTime() >= fourteenDaysAgo);
      const done = recentWindow.filter(s => s.status === 'DONE').length;
      const partial = recentWindow.filter(s => s.status === 'PARTIAL').length;
      const skipped = recentWindow.filter(s => s.status === 'SKIPPED').length;

      return {
        id: r._id,
        title: r.title,
        description: r.description,
        videoUrl: r.videoUrl || null,
        frequency: r.frequency,
        startDate: r.startDate,
        endDate: r.endDate || null,
        status: r.status,
        recentSubmissions: recent.map(s => ({
          date: s.date,
          status: s.status,
          parentNote: s.parentNote || null,
          mediaUrl: s.mediaUrl || null,
          feedbackFromTherapist: s.feedbackFromTherapist || null,
        })),
        complianceLast14d: { done, partial, skipped, total: recentWindow.length },
        updatedAt: r.updatedAt,
      };
    });

    res.json({ success: true, items, total: items.length });
  } catch (err) {
    return safeError(res, err, 'parent-v2.homePrograms.list');
  }
});

// POST /children/:id/home-programs/:programId/log
// Body: { status: 'DONE' | 'PARTIAL' | 'SKIPPED', parentNote?, mediaUrl? }
// Appends a new submission to the assignment. We do NOT update an
// existing submission for the same calendar day — therapists rely on
// the audit trail of every parent click, and overwrite would erase
// the original timestamp. If the parent really wants to revise their
// note, they submit a new entry; the therapist sees both.
router.post('/children/:id/home-programs/:programId/log', async (req, res) => {
  try {
    const access = await assertChildAccess(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.msg });

    const programId = req.params.programId;
    if (!mongoose.isValidObjectId(programId))
      return res.status(400).json({ success: false, message: 'معرّف البرنامج غير صالح' });

    const { status, parentNote, mediaUrl } = req.body || {};
    const ALLOWED_STATUSES = ['DONE', 'PARTIAL', 'SKIPPED'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: 'status يجب أن يكون DONE أو PARTIAL أو SKIPPED' });
    }

    // Defensive caps on user-supplied strings so a malicious parent
    // (or a confused one) can't bloat the parent submission with a
    // multi-megabyte note that would blow up the array doc-size.
    const safeNote = typeof parentNote === 'string' ? parentNote.slice(0, 1000) : undefined;
    const safeMedia = typeof mediaUrl === 'string' ? mediaUrl.slice(0, 500) : undefined;

    const updated = await HomeAssignment.findOneAndUpdate(
      { _id: programId, beneficiary: req.params.id, status: 'ACTIVE' },
      {
        $push: {
          submissions: {
            date: new Date(),
            status,
            ...(safeNote !== undefined ? { parentNote: safeNote } : {}),
            ...(safeMedia !== undefined ? { mediaUrl: safeMedia } : {}),
          },
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'البرنامج غير موجود أو غير نشط' });
    }

    const last = updated.submissions[updated.submissions.length - 1];
    res.status(201).json({
      success: true,
      data: {
        programId: updated._id,
        submission: {
          date: last.date,
          status: last.status,
          parentNote: last.parentNote || null,
          mediaUrl: last.mediaUrl || null,
        },
        totalSubmissions: updated.submissions.length,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.homePrograms.log');
  }
});

module.exports = router;
