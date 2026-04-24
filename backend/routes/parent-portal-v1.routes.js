/**
 * Parent Portal — API Routes Skeleton (v1)
 *
 * Contract mirrors apps/web-portal/src/lib/api.ts exactly.
 * Each endpoint returns 501 Not Implemented until wired.
 *
 * NOTE: legacy parent portal lives at /api/parent-portal/* (see parentPortal.routes.js).
 * This v1 namespace is the new canonical surface that the web-portal app expects.
 * Handlers can delegate to existing services (guardian, appointment, invoice, message)
 * and just project the response into the shapes below.
 *
 * To activate: mount in backend/app.js via
 *   app.use('/api/v1/portal', require('./routes/parent-portal-v1.routes'));
 *
 * Auth: every route (except /auth/login) requires authenticate + requireRole('guardian')
 * Scope: responses must be scoped to req.user.guardianId and that guardian's beneficiaries only.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const isValidObjectId = id => mongoose.Types.ObjectId.isValid(String(id));

// Lazy requires so a missing dep never crashes module load.
let _authenticate, _Guardian, _Beneficiary, _Appointment, _Invoice, _Consent;
function authenticate(req, res, next) {
  if (!_authenticate) _authenticate = require('../middleware/auth').authenticate;
  return _authenticate(req, res, next);
}
function Guardian() {
  if (!_Guardian) _Guardian = require('../models/Guardian');
  return _Guardian;
}
function Invoice() {
  if (!_Invoice) _Invoice = require('../models/Invoice');
  return _Invoice;
}
function Consent() {
  if (!_Consent) _Consent = require('../models/Consent').Consent;
  return _Consent;
}
function Beneficiary() {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
}
function Appointment() {
  if (!_Appointment) _Appointment = require('../models/Appointment');
  return _Appointment;
}

/**
 * Verify the authenticated Guardian actually owns this beneficiary.
 * Required for every /beneficiaries/:id/* endpoint — without this a
 * guardian could probe other families' data by sniffing IDs.
 * Returns `true` if ownership is confirmed.
 */
async function guardianOwnsBeneficiary(userId, beneficiaryId) {
  if (!userId || !beneficiaryId) return false;
  if (!isValidObjectId(beneficiaryId)) return false;
  const g = await Guardian().findOne({ userId, beneficiaries: beneficiaryId }).select('_id').lean();
  return !!g;
}

const DISABILITY_LEVEL_MAP = {
  mild: 'MILD',
  moderate: 'MODERATE',
  severe: 'SEVERE',
  profound: 'PROFOUND',
};
const GENDER_MAP = { male: 'MALE', female: 'FEMALE' };

// Appointment.status → Parent-portal PortalAppointment.status
const APPT_STATUS_PUBLIC = {
  PENDING: 'SCHEDULED',
  CONFIRMED: 'SCHEDULED',
  CHECKED_IN: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'CANCELLED',
};

function composeDateTimeISO(date, timeStr) {
  if (!date) return null;
  const d = new Date(date);
  if (typeof timeStr === 'string' && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d.toISOString();
}

// Relationship enum → Arabic label.
const RELATIONSHIP_LABEL_AR = {
  father: 'أب',
  mother: 'أم',
  grandfather: 'جد',
  grandmother: 'جدة',
  uncle: 'عم/خال',
  aunt: 'عمة/خالة',
  brother: 'أخ',
  sister: 'أخت',
  cousin: 'ابن/بنت عم',
  legal_guardian: 'ولي أمر قانوني',
  other: 'أخرى',
};

function notImplemented(contract) {
  return (_req, res) =>
    res.status(501).json({
      error: 'NotImplemented',
      message: 'This endpoint is scaffolded but not yet wired.',
      contract,
    });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post(
  '/auth/login',
  notImplemented({
    request: { phone: 'string', password: 'string' },
    response: {
      accessToken: 'string',
      guardianId: 'string',
      beneficiaryId: 'string',
      nameAr: 'string',
    },
  })
);

// ── Identity & Beneficiary ────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    }

    // Each Guardian.userId is unique (enforced by schema).
    const guardian = await Guardian()
      .findOne({ userId })
      .populate({
        path: 'beneficiaries',
        select: 'firstName_ar lastName_ar firstName_en lastName_en status branchId',
        populate: { path: 'branchId', select: 'name_ar name_en' },
      })
      .lean();

    if (!guardian) {
      return res.status(404).json({
        error: 'GuardianNotFound',
        message: 'No Guardian record linked to this user. Complete onboarding first.',
      });
    }

    // Portal app renders one active beneficiary at a time; pick the first
    // non-archived. Multi-child support is handled separately (UC-G2).
    const primary =
      Array.isArray(guardian.beneficiaries) && guardian.beneficiaries.length > 0
        ? guardian.beneficiaries[0]
        : null;

    const nameAr = [guardian.firstName_ar, guardian.lastName_ar].filter(Boolean).join(' ').trim();
    const relationshipLabel =
      RELATIONSHIP_LABEL_AR[guardian.relationship] || guardian.relationship || 'OTHER';

    // Map relationship to UI enum (the frontend uses FATHER/MOTHER/... caps).
    // We pass both: legacy label (Arabic) via the relationship string, and the UI uses its own map.
    const uiRelationship = (guardian.relationship || 'other')
      .toUpperCase()
      .replace('LEGAL_GUARDIAN', 'GUARDIAN');

    return res.json({
      id: String(guardian._id),
      nameAr: nameAr || relationshipLabel,
      relationship: uiRelationship,
      phone: guardian.phone || '',
      email: guardian.email || null,
      beneficiary: primary
        ? {
            id: String(primary._id),
            nameAr: [primary.firstName_ar, primary.lastName_ar].filter(Boolean).join(' ').trim(),
            nameEn:
              [primary.firstName_en, primary.lastName_en].filter(Boolean).join(' ').trim() || null,
            status: primary.status || 'ACTIVE',
            branch: { nameAr: primary.branchId?.name_ar || '—' },
          }
        : null,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load guardian profile',
    });
  }
});
router.get('/beneficiaries/:id/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!(await guardianOwnsBeneficiary(userId, req.params.id))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'beneficiary not linked to this guardian' });
    }

    const b = await Beneficiary()
      .findById(req.params.id)
      .select(
        'firstName_ar lastName_ar firstName_en lastName_en dateOfBirth gender disability branchId'
      )
      .populate('branchId', 'name_ar')
      .lean();
    if (!b) return res.status(404).json({ error: 'NotFound', message: 'beneficiary not found' });

    // Active care plan summary is optional (full plan lives at /care-plan).
    // We lazy-require CarePlan here to keep module load light.
    const CarePlan = require('../models/CarePlan');
    const activePlan = await CarePlan.findOne({ beneficiary: b._id, status: 'ACTIVE' })
      .select('planNumber startDate reviewDate status educational therapeutic lifeSkills')
      .lean();

    let summary = null;
    if (activePlan) {
      const parts = [];
      if (activePlan.educational?.enabled) parts.push('تعليمي');
      if (activePlan.therapeutic?.enabled) parts.push('علاجي');
      if (activePlan.lifeSkills?.enabled) parts.push('مهارات حياتية');
      summary = parts.length ? parts.join(' + ') : null;
    }

    return res.json({
      id: String(b._id),
      nameAr: [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() || '—',
      nameEn: [b.firstName_en, b.lastName_en].filter(Boolean).join(' ').trim() || null,
      dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth).toISOString().slice(0, 10) : null,
      gender: GENDER_MAP[b.gender] || (b.gender ? String(b.gender).toUpperCase() : 'MALE'),
      disabilityLevel: DISABILITY_LEVEL_MAP[b.disability?.severity] || 'MILD',
      branchNameAr: b.branchId?.name_ar || '—',
      activeCarePlanSummary: summary,
      activeCarePlanStatus: activePlan?.status || null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.get('/beneficiaries/:id/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!(await guardianOwnsBeneficiary(userId, req.params.id))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'beneficiary not linked to this guardian' });
    }

    // Latest 50 appointments — the portal shows a combined upcoming + recent timeline.
    const appts = await Appointment()
      .find({ beneficiary: req.params.id })
      .sort({ date: -1, startTime: -1 })
      .limit(50)
      .select('date startTime endTime status type therapist therapistName')
      .lean();

    return res.json(
      appts.map(a => ({
        id: String(a._id),
        sessionDate: new Date(a.date).toISOString(),
        startTime: a.startTime || '',
        endTime: a.endTime || '',
        status: APPT_STATUS_PUBLIC[a.status] || 'SCHEDULED',
        serviceType: a.type || 'OTHER',
        programNameAr: a.type || null,
        therapistId: a.therapist ? String(a.therapist) : '',
      }))
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.get('/beneficiaries/:id/appointments', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!(await guardianOwnsBeneficiary(userId, req.params.id))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'beneficiary not linked to this guardian' });
    }

    const now = new Date();
    // Past 60 days + all future — gives the guardian their full timeline.
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const appts = await Appointment()
      .find({ beneficiary: req.params.id, date: { $gte: sixtyDaysAgo } })
      .sort({ date: 1, startTime: 1 })
      .select('date startTime endTime status type therapist therapistName location')
      .lean();

    return res.json(
      appts.map(a => {
        const publicStatus = APPT_STATUS_PUBLIC[a.status] || 'SCHEDULED';
        return {
          id: String(a._id),
          sessionDate: composeDateTimeISO(a.date, a.startTime) || new Date(a.date).toISOString(),
          startTime: a.startTime || '',
          endTime: a.endTime || '',
          status: publicStatus,
          serviceType: a.type || 'OTHER',
          programNameAr: a.type || null,
          therapistNameAr: a.therapistName || '—',
          room: a.location || null,
          canReschedule: publicStatus === 'SCHEDULED',
        };
      })
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// Map CarePlan goal.status → PortalCarePlan.goals[].status
const GOAL_STATUS_PUBLIC = {
  PENDING: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  ACHIEVED: 'ACHIEVED',
  DISCONTINUED: 'ON_HOLD',
};

// Goals live across 13 embedded paths inside CarePlan — same paths as the
// therapist-portal goal lookup. We flatten them into a single array for
// the portal-simplified PortalCarePlan shape.
const PORTAL_GOAL_PATHS = [
  ['educational.domains.academic.goals', 'MEDIUM'],
  ['educational.domains.classroom.goals', 'MEDIUM'],
  ['educational.domains.communication.goals', 'HIGH'],
  ['therapeutic.domains.speech.goals', 'HIGH'],
  ['therapeutic.domains.occupational.goals', 'HIGH'],
  ['therapeutic.domains.physical.goals', 'MEDIUM'],
  ['therapeutic.domains.behavioral.goals', 'HIGH'],
  ['therapeutic.domains.psychological.goals', 'HIGH'],
  ['lifeSkills.domains.selfCare.goals', 'MEDIUM'],
  ['lifeSkills.domains.homeSkills.goals', 'LOW'],
  ['lifeSkills.domains.social.goals', 'MEDIUM'],
  ['lifeSkills.domains.transport.goals', 'LOW'],
  ['lifeSkills.domains.financial.goals', 'LOW'],
];

router.get('/beneficiaries/:id/care-plan', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!(await guardianOwnsBeneficiary(userId, req.params.id))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'beneficiary not linked to this guardian' });
    }

    const CarePlan = require('../models/CarePlan');
    const plan = await CarePlan.findOne({ beneficiary: req.params.id, status: 'ACTIVE' }).lean();
    if (!plan)
      return res
        .status(404)
        .json({ error: 'NotFound', message: 'no active care plan for this beneficiary' });

    // Flatten all embedded goal subdocs, projecting only the fields the portal UI needs.
    const goals = [];
    for (const [path, defaultPriority] of PORTAL_GOAL_PATHS) {
      const parts = path.split('.');
      let cursor = plan;
      for (const k of parts) {
        cursor = cursor?.[k];
        if (cursor == null) break;
      }
      if (Array.isArray(cursor)) {
        for (const g of cursor) {
          goals.push({
            id: String(g._id),
            nameAr: g.title || '—',
            status: GOAL_STATUS_PUBLIC[g.status] || 'NOT_STARTED',
            priority: defaultPriority,
          });
        }
      }
    }

    return res.json({
      id: String(plan._id),
      summary: plan.planNumber ? `خطة رقم ${plan.planNumber}` : null,
      status: plan.status || 'DRAFT',
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().slice(0, 10) : '',
      endDate: plan.reviewDate ? new Date(plan.reviewDate).toISOString().slice(0, 10) : null,
      goals,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Home pulse ────────────────────────────────────────────────────────────────
router.get('/home', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const guardian = await Guardian()
      .findOne({ userId })
      .populate({
        path: 'beneficiaries',
        select: 'firstName_ar lastName_ar status',
      })
      .lean();
    if (!guardian) {
      return res
        .status(404)
        .json({ error: 'GuardianNotFound', message: 'No Guardian record linked to this user.' });
    }
    const primary =
      Array.isArray(guardian.beneficiaries) && guardian.beneficiaries.length > 0
        ? guardian.beneficiaries[0]
        : null;
    if (!primary) {
      return res
        .status(404)
        .json({ error: 'NoBeneficiary', message: 'No beneficiary linked to this guardian.' });
    }

    const now = new Date();

    // Parallel fan-out: next session + last completed session + progress counts.
    const [nextAppt, lastCompleted, progressAgg] = await Promise.all([
      Appointment()
        .findOne({
          beneficiary: primary._id,
          date: { $gte: now },
          status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        })
        .sort({ date: 1, startTime: 1 })
        .select('date startTime therapistName')
        .lean(),
      Appointment()
        .findOne({ beneficiary: primary._id, status: 'COMPLETED' })
        .sort({ date: -1 })
        .select('_id date therapistName internalNotes')
        .lean(),
      Appointment().aggregate([
        {
          $match: {
            beneficiary: new mongoose.Types.ObjectId(String(primary._id)),
            date: { $gte: new Date(now.getTime() - 30 * 24 * 3600_000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            sessionsAttended: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            goalsProgressed: { $sum: 0 }, // placeholder until GoalProgressEntry join wired
          },
        },
      ]),
    ]);

    // Extract last report SOAP preview.
    let lastReport = null;
    if (lastCompleted) {
      try {
        const env = lastCompleted.internalNotes ? JSON.parse(lastCompleted.internalNotes) : null;
        const preview = env?.soap?.assessment || env?.soap?.plan || '';
        lastReport = {
          sessionId: String(lastCompleted._id),
          completedAt: new Date(lastCompleted.date).toISOString(),
          therapistNameAr: lastCompleted.therapistName || '—',
          summaryPreview: preview
            ? String(preview).slice(0, 220)
            : 'تم توقيع الجلسة. اضغط للقراءة الكاملة.',
        };
      } catch {
        lastReport = {
          sessionId: String(lastCompleted._id),
          completedAt: new Date(lastCompleted.date).toISOString(),
          therapistNameAr: lastCompleted.therapistName || '—',
          summaryPreview: 'تقرير الجلسة متاح للقراءة.',
        };
      }
    }

    // Fill 30-day window with zeros for days without data, then overlay aggs.
    const by = new Map(progressAgg.map(r => [r._id, r]));
    const progress30d = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600_000);
      const key = d.toISOString().slice(0, 10);
      const row = by.get(key);
      progress30d.push({
        date: key,
        sessionsAttended: row ? row.sessionsAttended : 0,
        goalsProgressed: row ? row.goalsProgressed : 0,
      });
    }

    // Relationship → uppercase UI enum (matches /me).
    const uiRelationship = (guardian.relationship || 'other')
      .toUpperCase()
      .replace('LEGAL_GUARDIAN', 'GUARDIAN');

    return res.json({
      guardian: {
        nameAr:
          [guardian.firstName_ar, guardian.lastName_ar].filter(Boolean).join(' ').trim() ||
          'ولي الأمر',
        relationship: uiRelationship,
      },
      beneficiary: {
        id: String(primary._id),
        nameAr: [primary.firstName_ar, primary.lastName_ar].filter(Boolean).join(' ').trim() || '—',
        status: primary.status || 'ACTIVE',
      },
      today: {
        hasSession: !!(nextAppt && new Date(nextAppt.date).toDateString() === now.toDateString()),
        nextSessionAt: nextAppt
          ? composeDateTimeISO(nextAppt.date, nextAppt.startTime) ||
            new Date(nextAppt.date).toISOString()
          : null,
        therapistNameAr: nextAppt?.therapistName || null,
      },
      // These three wire to services not yet integrated; return 0 so the
      // UI's chips render as "no action needed" instead of broken state.
      pendingApprovals: 0,
      unreadMessages: 0,
      outstandingBalance: 0,
      lastReport,
      recentMilestone: null,
      progress30d,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Appointments ──────────────────────────────────────────────────────────────
router.get('/beneficiaries/:id/appointments', notImplemented({ response: '[PortalAppointment]' }));
router.post(
  '/appointments/:appointmentId/reschedule-request',
  notImplemented({
    request: { reason: 'string' },
    response: { ok: true },
  })
);

// ── Reports ───────────────────────────────────────────────────────────────────
/**
 * A "report" in the Parent Portal = a signed Appointment with a SOAP envelope.
 * The therapist routes write that envelope in Appointment.internalNotes
 * (see therapist-portal.routes.js parseSoapEnvelope).
 */
function parseSoapEnvelope(internalNotes) {
  if (!internalNotes || typeof internalNotes !== 'string') return null;
  try {
    const parsed = JSON.parse(internalNotes);
    if (parsed && typeof parsed === 'object' && parsed.soap && parsed.signedAt) return parsed;
  } catch {
    /* not a SOAP envelope */
  }
  return null;
}

function buildReportPreview(env) {
  if (!env || !env.soap) return 'تقرير الجلسة متاح للقراءة.';
  const src =
    env.soap.assessment || env.soap.plan || env.soap.objective || env.soap.subjective || '';
  return String(src).slice(0, 240) || 'تقرير الجلسة متاح للقراءة.';
}

router.get('/beneficiaries/:id/reports', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!(await guardianOwnsBeneficiary(userId, req.params.id))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'beneficiary not linked to this guardian' });
    }

    // Completed appointments — filter to those carrying a signed SOAP envelope.
    const appts = await Appointment()
      .find({ beneficiary: req.params.id, status: 'COMPLETED' })
      .sort({ date: -1 })
      .limit(100)
      .select('_id date type therapistName internalNotes')
      .lean();

    const reports = [];
    for (const a of appts) {
      const env = parseSoapEnvelope(a.internalNotes);
      if (!env) continue; // not yet signed — don't expose drafts to parents
      reports.push({
        id: String(a._id),
        sessionDate: new Date(a.date).toISOString(),
        completedAt: env.signedAt,
        therapistNameAr: a.therapistName || '—',
        programNameAr: a.type || null,
        summaryPreview: buildReportPreview(env),
        hasAttachments: false, // document attachments wire into Documents service later
      });
    }

    return res.json(reports);
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.get('/reports/:reportId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    if (!isValidObjectId(req.params.reportId)) {
      return res
        .status(400)
        .json({ error: 'InvalidId', message: 'reportId is not a valid ObjectId' });
    }

    const appt = await Appointment()
      .findById(req.params.reportId)
      .select('_id date type therapistName internalNotes beneficiary status')
      .lean();
    if (!appt) return res.status(404).json({ error: 'NotFound', message: 'report not found' });

    // Guardian scope: confirm the caller owns this appointment's beneficiary.
    if (!(await guardianOwnsBeneficiary(userId, String(appt.beneficiary)))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'report belongs to another family' });
    }

    const env = parseSoapEnvelope(appt.internalNotes);
    if (!env) {
      return res
        .status(404)
        .json({ error: 'NotAvailable', message: 'report not yet signed by the therapist' });
    }

    // Build the narrative: concatenate SOAP sections with labels so parents
    // get a readable prose rather than clinical abbreviations.
    const narrative = [
      env.soap.subjective && `ملاحظاتي على الجلسة: ${env.soap.subjective}`,
      env.soap.objective && `الملاحظات الموضوعية: ${env.soap.objective}`,
      env.soap.assessment && `التحليل السريري: ${env.soap.assessment}`,
      env.soap.plan && `الخطوات التالية: ${env.soap.plan}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return res.json({
      id: String(appt._id),
      sessionDate: new Date(appt.date).toISOString(),
      completedAt: env.signedAt,
      therapistNameAr: appt.therapistName || '—',
      programNameAr: appt.type || null,
      summaryPreview: buildReportPreview(env),
      hasAttachments: false,
      narrative,
      goalsUpdates: [], // GoalProgressEntry join wires here in phase 16
      attachments: [], // Documents service integration pending
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Approvals ─────────────────────────────────────────────────────────────────
// An "approval" = a CarePlan with status=PENDING_SIGNATURE OR a Consent
// with grantedAt=null (pending). Returns both as a unified list so the
// guardian's inbox doesn't split across two pages.
router.get('/approvals', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const guardian = await Guardian().findOne({ userId }).select('beneficiaries').lean();
    if (
      !guardian ||
      !Array.isArray(guardian.beneficiaries) ||
      guardian.beneficiaries.length === 0
    ) {
      return res.json([]);
    }

    const CarePlan = require('../models/CarePlan');
    const [unsignedPlans, pendingConsents] = await Promise.all([
      CarePlan.find({
        beneficiary: { $in: guardian.beneficiaries },
        requiresSignature: true,
        signedAt: null,
      })
        .select('_id planNumber startDate createdAt beneficiary')
        .lean(),
      Consent()
        .find({
          beneficiaryId: { $in: guardian.beneficiaries },
          grantedAt: null,
          revokedAt: null,
        })
        .lean(),
    ]);

    const items = [];

    for (const plan of unsignedPlans) {
      items.push({
        id: String(plan._id),
        kind: 'CARE_PLAN',
        title: plan.planNumber ? `خطة رعاية ${plan.planNumber}` : 'خطة رعاية جديدة',
        summary: 'يرجى مراجعة الخطة والتوقيع عليها لتبدأ الجلسات.',
        createdAt: new Date(plan.createdAt || plan.startDate || Date.now()).toISOString(),
        dueBy: null,
        priority: 'HIGH',
      });
    }

    for (const c of pendingConsents) {
      items.push({
        id: String(c._id),
        kind: 'CONSENT',
        title: CONSENT_TYPE_LABELS_AR[c.type] || 'موافقة',
        summary: CONSENT_TYPE_DESCRIPTIONS_AR[c.type] || '',
        createdAt: new Date(c.createdAt || Date.now()).toISOString(),
        dueBy: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
        priority: ['treatment', 'data_sharing'].includes(c.type) ? 'CRITICAL' : 'NORMAL',
      });
    }

    // Sort newest first.
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(items);
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.post('/approvals/:id/decide', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'InvalidId', message: 'approval id is not valid' });
    }

    const { decision, note } = req.body || {};
    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'decision must be APPROVE or REJECT' });
    }
    const trimmedNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';

    // Same id could belong to CarePlan or Consent — probe both collections.
    // We check Consent first since it's cheaper (flat schema) than CarePlan.
    const consent = await Consent().findById(req.params.id);
    if (consent) {
      if (!(await guardianOwnsBeneficiary(userId, String(consent.beneficiaryId)))) {
        return res
          .status(403)
          .json({ error: 'Forbidden', message: 'consent belongs to another family' });
      }
      if (decision === 'APPROVE') {
        consent.grantedAt = new Date();
        consent.revokedAt = null;
        consent.revokedReason = null;
      } else {
        if (!trimmedNote || trimmedNote.length < 5) {
          return res
            .status(400)
            .json({
              error: 'InvalidBody',
              message: 'reason (note) required on REJECT (>=5 chars)',
            });
        }
        consent.revokedAt = new Date();
        consent.revokedReason = trimmedNote;
      }
      await consent.save();
      return res.json({ ok: true });
    }

    const CarePlan = require('../models/CarePlan');
    const plan = await CarePlan.findById(req.params.id);
    if (plan) {
      if (!(await guardianOwnsBeneficiary(userId, String(plan.beneficiary)))) {
        return res
          .status(403)
          .json({ error: 'Forbidden', message: 'care plan belongs to another family' });
      }
      if (decision === 'APPROVE') {
        plan.signedAt = new Date();
        // signedBy should be the guardian's user_id (not Guardian._id) since CarePlan.signedBy refs User.
        plan.signedBy = userId;
        if (plan.status === 'DRAFT') plan.status = 'ACTIVE';
      } else {
        if (!trimmedNote || trimmedNote.length < 5) {
          return res
            .status(400)
            .json({ error: 'InvalidBody', message: 'reason required on REJECT (>=5 chars)' });
        }
        plan.status = 'DRAFT';
        // Append rejection reason to requiresSignature flag so the admin knows.
        plan.requiresSignature = true;
      }
      await plan.save();
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'NotFound', message: 'approval not found' });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Billing ───────────────────────────────────────────────────────────────────
// Map backend Invoice.status → parent-portal PortalInvoice.status.
const INVOICE_STATUS_PUBLIC = {
  DRAFT: 'PENDING', // drafts shouldn't leak but be defensive
  ISSUED: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'PENDING',
  OVERDUE: 'OVERDUE',
};

router.get('/invoices', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    // Resolve the guardian's beneficiaries first — invoices scope to those only.
    const guardian = await Guardian().findOne({ userId }).select('beneficiaries').lean();
    if (
      !guardian ||
      !Array.isArray(guardian.beneficiaries) ||
      guardian.beneficiaries.length === 0
    ) {
      return res.json([]);
    }

    const invoices = await Invoice()
      .find({
        beneficiary: { $in: guardian.beneficiaries },
        status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
      })
      .sort({ issueDate: -1 })
      .limit(50)
      .lean();

    return res.json(
      invoices.map(inv => {
        const total = Number(inv.totalAmount) || 0;
        // Paid amount isn't stored directly — derive from status:
        //   PAID → full amount, PARTIALLY_PAID → insurance.coverageAmount, else 0.
        const paid =
          inv.status === 'PAID'
            ? total
            : inv.status === 'PARTIALLY_PAID'
              ? Number(inv.insurance?.coverageAmount) || 0
              : 0;
        const due = Math.max(0, total - paid);
        return {
          id: String(inv._id),
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : '',
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
          amount: total,
          amountPaid: paid,
          amountDue: due,
          currency: 'SAR',
          status: INVOICE_STATUS_PUBLIC[inv.status] || 'PENDING',
          items: Array.isArray(inv.items)
            ? inv.items.map(it => ({
                description: it.description || '',
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unitPrice) || 0,
              }))
            : [],
        };
      })
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

/**
 * Initiate a payment for an invoice.
 *
 * Full PCI-DSS compliant integration with MADA / Apple Pay / HyperPay gateway
 * is a dedicated infrastructure concern (zatca + PCI vault + webhooks), not
 * something to implement in a route file. This handler:
 *   1. Validates the invoice exists, is unpaid, and belongs to this family.
 *   2. Returns a paymentUrl the frontend redirects to.
 *
 * Until the gateway service is wired, we return a sentinel URL that the
 * frontend recognises (starts with `#`) and shows a friendly "demo mode"
 * alert instead of redirecting. This lets UX testing proceed without
 * gateway credentials. When the gateway lands, replace the paymentUrl
 * construction with a call to gatewayService.createCheckout(invoice).
 */
router.post('/invoices/:id/pay', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'InvalidId', message: 'invoice id is not valid' });
    }

    const invoice = await Invoice().findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ error: 'NotFound', message: 'invoice not found' });

    // Ownership scope.
    if (!(await guardianOwnsBeneficiary(userId, String(invoice.beneficiary)))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'invoice belongs to another family' });
    }

    if (invoice.status === 'PAID') {
      return res
        .status(409)
        .json({ error: 'AlreadyPaid', message: 'invoice is already fully paid' });
    }
    if (invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') {
      return res
        .status(409)
        .json({
          error: 'NotPayable',
          message: `invoice in status ${invoice.status} cannot be paid`,
        });
    }

    const total = Number(invoice.totalAmount) || 0;
    const paid =
      invoice.status === 'PARTIALLY_PAID' ? Number(invoice.insurance?.coverageAmount) || 0 : 0;
    const due = Math.max(0, total - paid);
    if (due <= 0) {
      return res
        .status(409)
        .json({ error: 'NothingDue', message: 'invoice has no outstanding balance' });
    }

    // Demo-mode placeholder. Frontend displays "Demo — gateway not wired" alert.
    // To activate: integrate HyperPay / PayTabs / STC Pay here.
    const paymentUrl = `#demo-payment-gateway?invoice=${encodeURIComponent(invoice.invoiceNumber)}&amount=${due}&currency=SAR`;

    return res.json({ paymentUrl });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────
// Portal messaging wires into the central Message service (backend/routes/messages.routes.js).
// Until that integration lands, we return empty lists — the UI shows
// "no conversations yet" cleanly rather than 404-ing.
router.get('/messages/threads', authenticate, (req, res) => {
  const userId = req.user?.id || req.user?._id || req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  // TODO(phase-16): query MessageThread where participants include this guardian.
  return res.json([]);
});

router.get('/messages/threads/:threadId', authenticate, (req, res) => {
  const userId = req.user?.id || req.user?._id || req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!isValidObjectId(req.params.threadId)) {
    return res.status(400).json({ error: 'InvalidId', message: 'threadId is not valid' });
  }
  // With no threads created yet, any specific ID is unknown.
  return res.status(404).json({
    error: 'NotFound',
    message: 'thread not found — messaging service wires in phase 16',
  });
});

router.post('/messages/threads/:threadId', authenticate, (req, res) => {
  const userId = req.user?.id || req.user?._id || req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.body?.body || typeof req.body.body !== 'string' || req.body.body.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'InvalidBody', message: 'body must be a non-empty string' });
  }
  // Return 503 (service unavailable) rather than 501, so the offline queue
  // knows to retry later rather than treating this as a permanent failure.
  return res.status(503).json({
    error: 'MessagingUnavailable',
    message: 'messaging service not yet wired for this portal',
  });
});

// ── Consents (PDPL) ───────────────────────────────────────────────────────────
// Map the Consent model's `type` enum to the parent-portal display enum.
const CONSENT_TYPE_MAP_IN = {
  treatment: 'MEDICAL_PROCEDURE',
  photography: 'MEDIA_RELEASE',
  data_sharing: 'DATA_SHARING',
  trip: 'EDUCATIONAL',
  research: 'DATA_SHARING',
};

const CONSENT_TYPE_LABELS_AR = {
  treatment: 'الموافقة على العلاج',
  photography: 'الموافقة على التصوير',
  data_sharing: 'مشاركة البيانات',
  trip: 'الرحلات والأنشطة',
  research: 'المشاركة في الأبحاث',
};

const CONSENT_TYPE_DESCRIPTIONS_AR = {
  treatment: 'الموافقة على تطبيق الخطة العلاجية المعتمدة.',
  photography: 'السماح بتسجيل صور/فيديو الجلسات لأغراض التقييم الداخلي.',
  data_sharing: 'مشاركة البيانات مع مختصين خارجيين عند الحاجة.',
  trip: 'الموافقة على مشاركة المستفيد في الرحلات والأنشطة الخارجية.',
  research: 'المشاركة في دراسات بحثية مؤسسية (بيانات مجهَّلة).',
};

function consentPublicStatus(doc) {
  if (doc.revokedAt) return 'REVOKED';
  if (!doc.grantedAt) return 'PENDING';
  if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) return 'REVOKED';
  return 'GRANTED';
}

router.get('/consents', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const guardian = await Guardian().findOne({ userId }).select('beneficiaries').lean();
    if (
      !guardian ||
      !Array.isArray(guardian.beneficiaries) ||
      guardian.beneficiaries.length === 0
    ) {
      return res.json([]);
    }

    const consents = await Consent()
      .find({ beneficiaryId: { $in: guardian.beneficiaries } })
      .sort({ grantedAt: -1 })
      .lean();

    return res.json(
      consents.map(c => ({
        id: String(c._id),
        type: CONSENT_TYPE_MAP_IN[c.type] || 'MEDICAL_PROCEDURE',
        titleAr: CONSENT_TYPE_LABELS_AR[c.type] || c.type,
        descriptionAr: CONSENT_TYPE_DESCRIPTIONS_AR[c.type] || '',
        status: consentPublicStatus(c),
        grantedAt: c.grantedAt ? new Date(c.grantedAt).toISOString() : null,
        revokedAt: c.revokedAt ? new Date(c.revokedAt).toISOString() : null,
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
      }))
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.post('/consents/:id/grant', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'InvalidId', message: 'consent id is not valid' });
    }

    const doc = await Consent().findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'NotFound', message: 'consent not found' });

    // Ownership: the beneficiary must belong to the caller's guardian.
    if (!(await guardianOwnsBeneficiary(userId, String(doc.beneficiaryId)))) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'consent belongs to another family' });
    }

    if (doc.grantedAt && !doc.revokedAt) {
      return res
        .status(409)
        .json({ error: 'AlreadyGranted', message: 'consent is already granted' });
    }

    // If previously revoked, clear the revocation so the grant is fresh.
    doc.grantedAt = new Date();
    doc.revokedAt = null;
    doc.revokedReason = null;
    // grantedBy links to Guardian._id — resolve from userId.
    const guardian = await Guardian().findOne({ userId }).select('_id').lean();
    if (guardian) doc.grantedBy = guardian._id;
    await doc.save();

    return res.json({
      id: String(doc._id),
      type: CONSENT_TYPE_MAP_IN[doc.type] || 'MEDICAL_PROCEDURE',
      titleAr: CONSENT_TYPE_LABELS_AR[doc.type] || doc.type,
      descriptionAr: CONSENT_TYPE_DESCRIPTIONS_AR[doc.type] || '',
      status: 'GRANTED',
      grantedAt: doc.grantedAt.toISOString(),
      revokedAt: null,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.post('/consents/:id/revoke', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'InvalidId', message: 'consent id is not valid' });
    }
    const reason = req.body && typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 5) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'reason must be at least 5 characters' });
    }

    const doc = await Consent().findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'NotFound', message: 'consent not found' });

    // Ownership: the beneficiary must belong to the caller's guardian.
    const ownsChildren = await guardianOwnsBeneficiary(userId, String(doc.beneficiaryId));
    if (!ownsChildren) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'consent belongs to another family' });
    }
    if (doc.revokedAt) {
      return res
        .status(409)
        .json({ error: 'AlreadyRevoked', message: 'consent is already revoked' });
    }

    doc.revokedAt = new Date();
    doc.revokedReason = reason;
    await doc.save();

    return res.json({
      id: String(doc._id),
      type: CONSENT_TYPE_MAP_IN[doc.type] || 'MEDICAL_PROCEDURE',
      titleAr: CONSENT_TYPE_LABELS_AR[doc.type] || doc.type,
      descriptionAr: CONSENT_TYPE_DESCRIPTIONS_AR[doc.type] || '',
      status: 'REVOKED',
      grantedAt: doc.grantedAt ? new Date(doc.grantedAt).toISOString() : null,
      revokedAt: doc.revokedAt.toISOString(),
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Settings — Notifications ──────────────────────────────────────────────────
const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
  email: true,
  sms: true,
  push: true,
  channels: {
    appointmentReminders: true,
    sessionReports: true,
    approvalRequests: true,
    milestoneAchieved: true,
    billingReminders: true,
    therapistMessages: true,
  },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
});

function coerceNotificationPrefs(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const channels = src.channels && typeof src.channels === 'object' ? src.channels : {};
  const quiet = src.quietHours && typeof src.quietHours === 'object' ? src.quietHours : {};
  return {
    email: typeof src.email === 'boolean' ? src.email : DEFAULT_NOTIFICATION_PREFS.email,
    sms: typeof src.sms === 'boolean' ? src.sms : DEFAULT_NOTIFICATION_PREFS.sms,
    push: typeof src.push === 'boolean' ? src.push : DEFAULT_NOTIFICATION_PREFS.push,
    channels: {
      appointmentReminders:
        typeof channels.appointmentReminders === 'boolean' ? channels.appointmentReminders : true,
      sessionReports: typeof channels.sessionReports === 'boolean' ? channels.sessionReports : true,
      approvalRequests:
        typeof channels.approvalRequests === 'boolean' ? channels.approvalRequests : true,
      milestoneAchieved:
        typeof channels.milestoneAchieved === 'boolean' ? channels.milestoneAchieved : true,
      billingReminders:
        typeof channels.billingReminders === 'boolean' ? channels.billingReminders : true,
      therapistMessages:
        typeof channels.therapistMessages === 'boolean' ? channels.therapistMessages : true,
    },
    quietHours: {
      enabled: typeof quiet.enabled === 'boolean' ? quiet.enabled : false,
      start:
        typeof quiet.start === 'string' && /^\d{1,2}:\d{2}$/.test(quiet.start)
          ? quiet.start
          : '22:00',
      end: typeof quiet.end === 'string' && /^\d{1,2}:\d{2}$/.test(quiet.end) ? quiet.end : '07:00',
    },
  };
}

router.get('/settings/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const g = await Guardian().findOne({ userId }).select('notificationPrefs').lean();
    if (!g) return res.status(404).json({ error: 'GuardianNotFound' });

    return res.json(coerceNotificationPrefs(g.notificationPrefs));
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

router.put('/settings/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const prefs = coerceNotificationPrefs(req.body);
    // Guardian schema is strict:true by default — using $set on a non-declared
    // field silently drops it. We rely on strictQuery:false being common at
    // project level; if it's not, migration should add the subdoc to Guardian.
    await Guardian().updateOne(
      { userId },
      { $set: { notificationPrefs: prefs } },
      { strict: false }
    );
    return res.json(prefs);
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Settings — Delegates ──────────────────────────────────────────────────────
// A "delegate" = a secondary Guardian linked to the same beneficiary.
// The primary guardian can see and manage them. This is a read endpoint;
// invite/revoke are handled separately once email/OTP invite flow lands.
router.get('/settings/delegates', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const me = await Guardian().findOne({ userId }).select('beneficiaries accountType').lean();
    if (!me) return res.json([]);
    if (!Array.isArray(me.beneficiaries) || me.beneficiaries.length === 0) return res.json([]);

    // Any *other* Guardian linked to the same beneficiaries.
    const others = await Guardian()
      .find({
        userId: { $ne: userId },
        beneficiaries: { $in: me.beneficiaries },
      })
      .select(
        'firstName_ar lastName_ar relationship phone email accountType accountStatus createdAt'
      )
      .lean();

    const RELATIONSHIP_UPPER = r =>
      (r || 'other').toUpperCase().replace('LEGAL_GUARDIAN', 'GUARDIAN');
    const ACCOUNT_TO_ACCESS = { primary: 'FULL', secondary: 'READ_ONLY' };
    const STATUS_MAP = { verified: 'ACTIVE', unverified: 'PENDING_INVITE', blocked: 'SUSPENDED' };

    return res.json(
      others.map(g => ({
        id: String(g._id),
        nameAr: [g.firstName_ar, g.lastName_ar].filter(Boolean).join(' ').trim() || 'ولي أمر ثانوي',
        relationship: RELATIONSHIP_UPPER(g.relationship),
        phone: g.phone || '',
        email: g.email || null,
        access: ACCOUNT_TO_ACCESS[g.accountType] || 'READ_ONLY',
        status: STATUS_MAP[g.accountStatus] || 'PENDING_INVITE',
        invitedAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
        acceptedAt:
          g.accountStatus === 'verified' && g.createdAt
            ? new Date(g.createdAt).toISOString()
            : null,
      }))
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

module.exports = router;
