/**
 * Therapist Portal — API Routes Skeleton (v1)
 *
 * Contract mirrors apps/web-therapist/src/lib/api.ts exactly.
 * Each endpoint returns 501 Not Implemented until wired to the domain layer.
 * The DEMO fixtures in the frontend produce the same shapes returned here,
 * so this file is the canonical schema reference.
 *
 * To activate: mount in backend/app.js via
 *   app.use('/api/v1/therapist', require('./routes/therapist-portal.routes'));
 * and implement each handler by delegating to:
 *   - existing therapist-workbench/services for sessions/schedule
 *   - beneficiary-red-flags.service for red-flags
 *   - CarePlan + GoalProgress models for goals
 *   - assessments-admin.service for assessments
 *   - employeeCredentials.service + cpe.service for credentials
 *
 * Auth: every route (except /auth/login) requires authenticate + requireRole('therapist')
 * Scope: responses must be scoped to req.user.employeeId — never return data for other therapists.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const isValidObjectId = id => mongoose.Types.ObjectId.isValid(String(id));

// Lazy requires so a missing dep never crashes module load (routes stay listable).
let _authenticate,
  _Employee,
  _Beneficiary,
  _Appointment,
  _RedFlagState,
  _CarePlan,
  _GoalProgressEntry;
function authenticate(req, res, next) {
  if (!_authenticate) _authenticate = require('../middleware/auth').authenticate;
  return _authenticate(req, res, next);
}
function Employee() {
  if (!_Employee) _Employee = require('../models/HR/Employee');
  return _Employee;
}
function Beneficiary() {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
}
function Appointment() {
  if (!_Appointment) _Appointment = require('../models/Appointment');
  return _Appointment;
}
function RedFlagState() {
  if (!_RedFlagState) _RedFlagState = require('../models/RedFlagState');
  return _RedFlagState;
}
function CarePlan() {
  if (!_CarePlan) _CarePlan = require('../models/CarePlan');
  return _CarePlan;
}
function GoalProgressEntry() {
  if (!_GoalProgressEntry) _GoalProgressEntry = require('../models/GoalProgressEntry');
  return _GoalProgressEntry;
}

const DISABILITY_LEVEL_MAP = {
  mild: 'MILD',
  moderate: 'MODERATE',
  severe: 'SEVERE',
  profound: 'PROFOUND',
};

const GENDER_MAP = { male: 'MALE', female: 'FEMALE' };

function ageInYears(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

/**
 * Resolve the caller's Employee._id from their User._id.
 * Appointment.therapist (and most therapist-linked fields) refer to
 * Employee, not User — skipping this causes empty result sets.
 *
 * Returns `null` if the caller has no Employee record yet.
 */
async function resolveEmployeeId(userId) {
  if (!userId) return null;
  const emp = await Employee().findOne({ user_id: userId }).select('_id').lean();
  return emp ? emp._id : null;
}

// Appointment.status → SessionStatus (therapist UI enum)
const APPT_STATUS_TO_SESSION_STATUS = {
  PENDING: 'SCHEDULED',
  CONFIRMED: 'SCHEDULED',
  CHECKED_IN: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED_SIGNED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'CANCELLED',
};

// Map the Arabic appointment type → a canonical serviceType key.
const APPT_TYPE_TO_SERVICE = {
  'علاج طبيعي': 'PT_INDIVIDUAL',
  'علاج وظيفي': 'OT_INDIVIDUAL',
  'نطق وتخاطب': 'SLP_INDIVIDUAL',
  'علاج سلوكي': 'ABA_INDIVIDUAL',
  'علاج نفسي': 'PSYCH_INDIVIDUAL',
  تقييم: 'ASSESSMENT',
  فحص: 'EXAM',
  'استشارة أولية': 'CONSULT',
  متابعة: 'FOLLOWUP',
};

/**
 * Compose an ISO datetime from Appointment.date (Date) + .startTime ("HH:mm").
 * Returns null if startTime is missing or malformed.
 */
function composeDateTimeISO(date, timeStr) {
  if (!date) return null;
  const d = new Date(date);
  if (typeof timeStr === 'string' && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d.toISOString();
}

/**
 * Map an Appointment doc to the TodaySession shape the therapist portal
 * expects (apps/web-therapist/src/lib/api.ts).
 *
 * Special case: if internalNotes carries a SOAP envelope with signedAt=null
 * but the Appointment.status is still active (IN_PROGRESS), we surface
 * COMPLETED_DRAFT so the UI shows a "pending documentation" badge.
 */
function mapAppointmentToSession(appt) {
  const startISO = composeDateTimeISO(appt.date, appt.startTime);
  const endISO = composeDateTimeISO(appt.date, appt.endTime || appt.startTime);

  let status = APPT_STATUS_TO_SESSION_STATUS[appt.status] || 'SCHEDULED';

  // Promote IN_PROGRESS → COMPLETED_DRAFT when a SOAP envelope exists but
  // hasn't been signed yet. COMPLETED appointments with a signed envelope
  // already map to COMPLETED_SIGNED via the enum map above.
  if (status === 'IN_PROGRESS') {
    const env =
      typeof parseSoapEnvelope === 'function' ? parseSoapEnvelope(appt.internalNotes) : null;
    if (env && env.soap && !env.signedAt) status = 'COMPLETED_DRAFT';
  }

  return {
    id: String(appt._id),
    beneficiaryId: appt.beneficiary ? String(appt.beneficiary) : '',
    beneficiaryNameAr: appt.beneficiaryName || '—',
    startTime: startISO || new Date(appt.date).toISOString(),
    endTime: endISO || new Date(appt.date).toISOString(),
    status,
    serviceType: APPT_TYPE_TO_SERVICE[appt.type] || 'OTHER',
    programNameAr: appt.type || null,
    room: appt.location || null,
    isGroup: false,
    groupSize: 0,
  };
}

// ── Label maps for enum → Arabic label mapping ──────────────────────────────
const SPECIALIZATION_LABEL_AR = {
  pt: 'علاج طبيعي',
  ot: 'علاج وظيفي',
  speech: 'نطق ولغة',
  aba: 'تحليل سلوك تطبيقي',
  psychology: 'علم نفس',
  special_education: 'تربية خاصة',
  vocational: 'تأهيل مهني',
  nursing: 'تمريض',
  medical: 'طبي',
  admin: 'إداري',
  accounting: 'محاسبة',
  hr: 'موارد بشرية',
  driver: 'سائق',
  it: 'تقنية معلومات',
  other: 'أخرى',
};

const DEPARTMENT_LABEL_AR = {
  administration: 'الإدارة',
  clinical: 'الخدمات السريرية',
  support: 'الدعم',
  finance: 'المالية',
  hr: 'الموارد البشرية',
  transport: 'النقل',
  it: 'تقنية المعلومات',
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
    request: { identifier: 'string', password: 'string' },
    response: {
      accessToken: 'string',
      therapistId: 'string',
      employeeId: 'string',
      nameAr: 'string',
      specialty: 'string',
    },
  })
);

// ── Identity ──────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    }

    // Resolve the caller's Employee record (therapists have user_id → User).
    const emp = await Employee()
      .findOne({ user_id: userId })
      .populate('branch_id', 'name_ar name_en city')
      .lean();

    if (!emp) {
      return res.status(404).json({
        error: 'EmployeeNotFound',
        message: 'No Employee record linked to this user. Contact HR to enroll.',
      });
    }

    const scfhsNumber = emp.scfhs_number || null;
    const scfhsExpiresAt = emp.scfhs_expiry ? new Date(emp.scfhs_expiry).toISOString() : null;

    // CPE tracking is Phase 14 material; return sensible defaults until the
    // CPE service is wired so the UI's ring renders meaningfully.
    const cpeHoursYtd = Number(emp.cpe_hours_ytd) || 0;
    const cpeHoursRequired = Number(emp.cpe_hours_required) || 30;

    return res.json({
      id: String(emp._id),
      employeeId: emp.employee_number || String(emp._id),
      nameAr: emp.name_ar,
      nameEn: emp.name_en || null,
      specialty: SPECIALIZATION_LABEL_AR[emp.specialization] || emp.specialization || '—',
      departmentNameAr: DEPARTMENT_LABEL_AR[emp.department] || emp.department || '—',
      branchNameAr: emp.branch_id?.name_ar || '—',
      credentials: {
        scfhsNumber,
        scfhsExpiresAt,
        cpeHoursYtd,
        cpeHoursRequired,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load therapist profile',
    });
  }
});

// ── Today & Schedule ──────────────────────────────────────────────────────────
router.get('/today', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    }

    // Single Employee lookup gives us both the therapist identity fields
    // and the _id used to filter appointments.
    const emp = await Employee()
      .findOne({ user_id: userId })
      .select('_id name_ar specialization scfhs_expiry cpe_hours_ytd cpe_hours_required')
      .lean();
    if (!emp) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const appts = await Appointment()
      .find({ therapist: emp._id, date: { $gte: startOfDay, $lt: endOfDay } })
      .sort({ startTime: 1 })
      .lean();

    const sessions = appts.map(mapAppointmentToSession);

    const counts = {
      total: sessions.length,
      upcoming: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      pendingDocs: 0,
    };
    for (const s of sessions) {
      if (s.status === 'SCHEDULED') counts.upcoming++;
      else if (s.status === 'IN_PROGRESS') counts.inProgress++;
      else if (s.status === 'COMPLETED_SIGNED') counts.completed++;
      else if (s.status === 'COMPLETED_DRAFT') {
        counts.completed++;
        counts.pendingDocs++;
      } else if (s.status === 'CANCELLED' || s.status === 'NO_SHOW') counts.cancelled++;
    }

    // Pending-docs detail: appointments marked COMPLETED (in Appointment schema
    // that's our "completed" terminal) but not yet linked to a signed TherapySession.
    // Without TherapySession wiring we return an empty array; the UI tolerates it.
    const pendingDocs = [];

    // Red-flags + inbox counts: placeholder until beneficiary-red-flags
    // service is wired (Phase 16). Returning zeros keeps the UI clean.
    const redFlagsMine = { raised: 0, critical: 0 };
    const inboxUnread = 0;

    return res.json({
      therapist: {
        nameAr: emp.name_ar || '—',
        specialty: SPECIALIZATION_LABEL_AR[emp.specialization] || emp.specialization || '—',
      },
      date: startOfDay.toISOString().slice(0, 10),
      counts,
      sessions,
      pendingDocs,
      redFlagsMine,
      inboxUnread,
      cpe: {
        ytd: Number(emp.cpe_hours_ytd) || 0,
        required: Number(emp.cpe_hours_required) || 30,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load today',
    });
  }
});

router.get('/schedule', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    // Defaults: today 00:00 → today + 7d. Accepts ISO in ?from and ?to.
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultTo = new Date(defaultFrom);
    defaultTo.setDate(defaultTo.getDate() + 7);

    const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom;
    const to = req.query.to ? new Date(String(req.query.to)) : defaultTo;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res
        .status(400)
        .json({ error: 'InvalidQuery', message: 'from/to must be valid ISO datetimes' });
    }

    const appts = await Appointment()
      .find({ therapist: employeeId, date: { $gte: from, $lte: to } })
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json(appts.map(mapAppointmentToSession));
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load schedule',
    });
  }
});

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ error: 'InvalidId', message: 'session id is not a valid ObjectId' });
    }

    const appt = await Appointment().findById(req.params.id).lean();
    if (!appt) return res.status(404).json({ error: 'NotFound', message: 'session not found' });

    // Scope: only the assigned therapist can read this session.
    if (String(appt.therapist) !== String(employeeId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'session belongs to another therapist' });
    }

    return res.json(mapAppointmentToSession(appt));
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load session',
    });
  }
});

router.post('/sessions/:id/start', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ error: 'InvalidId', message: 'session id is not a valid ObjectId' });
    }

    const appt = await Appointment().findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'NotFound', message: 'session not found' });

    if (String(appt.therapist) !== String(employeeId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'session belongs to another therapist' });
    }

    // Guard: only transition from SCHEDULED/CONFIRMED/CHECKED_IN → IN_PROGRESS.
    const allowedFrom = new Set(['PENDING', 'CONFIRMED', 'CHECKED_IN']);
    if (!allowedFrom.has(appt.status) && appt.status !== 'IN_PROGRESS') {
      return res.status(409).json({
        error: 'InvalidTransition',
        message: `cannot start a session in status ${appt.status}`,
      });
    }

    if (appt.status !== 'IN_PROGRESS') {
      appt.status = 'IN_PROGRESS';
      await appt.save();
    }

    return res.json({ id: String(appt._id), status: 'IN_PROGRESS' });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to start session',
    });
  }
});
/**
 * SOAP storage convention (until TherapySession is fully wired):
 *   Appointment.internalNotes = JSON.stringify({
 *     soap: { subjective, objective, assessment, plan },
 *     signedAt: ISO | null,
 *     lastDraftAt: ISO,
 *   })
 *
 * mapAppointmentToSession() inspects this envelope to surface
 * COMPLETED_DRAFT vs COMPLETED_SIGNED in the therapist UI.
 */
function parseSoapEnvelope(internalNotes) {
  if (!internalNotes || typeof internalNotes !== 'string') return null;
  try {
    const parsed = JSON.parse(internalNotes);
    if (parsed && typeof parsed === 'object' && parsed.soap) return parsed;
  } catch {
    // Legacy free-text internalNotes — not a SOAP envelope.
  }
  return null;
}

function validateSoapBody(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const fields = ['subjective', 'objective', 'assessment', 'plan'];
  for (const k of fields) {
    if (typeof body[k] !== 'string' || body[k].trim().length === 0) {
      return `${k} must be a non-empty string`;
    }
  }
  return null;
}

router.post('/sessions/:id/draft', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ error: 'InvalidId', message: 'session id is not a valid ObjectId' });
    }
    const bodyErr = validateSoapBody(req.body);
    if (bodyErr) return res.status(400).json({ error: 'InvalidBody', message: bodyErr });

    const appt = await Appointment().findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'NotFound', message: 'session not found' });
    if (String(appt.therapist) !== String(employeeId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'session belongs to another therapist' });
    }

    const existing = parseSoapEnvelope(appt.internalNotes);
    if (existing && existing.signedAt) {
      return res
        .status(409)
        .json({ error: 'AlreadySigned', message: 'session already signed — cannot overwrite' });
    }

    const savedAt = new Date().toISOString();
    const envelope = {
      soap: {
        subjective: String(req.body.subjective).trim(),
        objective: String(req.body.objective).trim(),
        assessment: String(req.body.assessment).trim(),
        plan: String(req.body.plan).trim(),
      },
      signedAt: null,
      lastDraftAt: savedAt,
    };
    appt.internalNotes = JSON.stringify(envelope);
    await appt.save();

    return res.json({ id: String(appt._id), status: 'COMPLETED_DRAFT', savedAt });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to save draft',
    });
  }
});

router.post('/sessions/:id/sign', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ error: 'InvalidId', message: 'session id is not a valid ObjectId' });
    }

    const appt = await Appointment().findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'NotFound', message: 'session not found' });
    if (String(appt.therapist) !== String(employeeId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'session belongs to another therapist' });
    }

    // Sign accepts an inline SOAP body (skipping /draft) OR promotes an existing draft.
    let envelope = parseSoapEnvelope(appt.internalNotes);
    const inlineErr =
      req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
        ? validateSoapBody(req.body)
        : null;
    if (inlineErr === null && req.body && req.body.subjective) {
      envelope = {
        soap: {
          subjective: String(req.body.subjective).trim(),
          objective: String(req.body.objective).trim(),
          assessment: String(req.body.assessment).trim(),
          plan: String(req.body.plan).trim(),
        },
        signedAt: null,
        lastDraftAt: new Date().toISOString(),
      };
    }

    if (!envelope || !envelope.soap) {
      return res.status(400).json({
        error: 'NoDraft',
        message:
          'no SOAP draft to sign — POST /sessions/:id/draft first or include SOAP fields in body',
      });
    }
    if (envelope.signedAt) {
      return res.status(409).json({ error: 'AlreadySigned', message: 'session already signed' });
    }

    const signedAt = new Date().toISOString();
    envelope.signedAt = signedAt;
    appt.internalNotes = JSON.stringify(envelope);
    appt.status = 'COMPLETED';
    await appt.save();

    return res.json({ id: String(appt._id), status: 'COMPLETED_SIGNED', signedAt });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to sign session',
    });
  }
});

// ── Beneficiaries (assigned to therapist only) ────────────────────────────────
router.get('/beneficiaries', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    // "My beneficiaries" = distinct beneficiaries with an appointment with me
    // in the last 12 months OR scheduled in the future.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const ids = await Appointment().distinct('beneficiary', {
      therapist: employeeId,
      date: { $gte: twelveMonthsAgo },
    });

    if (!ids || ids.length === 0) {
      return res.json([]);
    }

    const beneficiaries = await Beneficiary()
      .find({ _id: { $in: ids } })
      .select('firstName_ar lastName_ar firstName_en lastName_en dateOfBirth gender disability')
      .lean();

    // Aggregate last + next appointment per beneficiary in a single query
    // (avoids N+1 when the therapist has many beneficiaries).
    const now = new Date();
    const apptAgg = await Appointment().aggregate([
      { $match: { therapist: employeeId, beneficiary: { $in: ids } } },
      {
        $group: {
          _id: '$beneficiary',
          nextSessionAt: { $min: { $cond: [{ $gte: ['$date', now] }, '$date', null] } },
          lastSessionAt: { $max: { $cond: [{ $lt: ['$date', now] }, '$date', null] } },
        },
      },
    ]);

    const apptById = new Map(apptAgg.map(a => [String(a._id), a]));

    const response = beneficiaries.map(b => {
      const appt = apptById.get(String(b._id)) || {};
      const dLevel = b.disability?.severity;
      return {
        id: String(b._id),
        nameAr: [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() || '—',
        nameEn: [b.firstName_en, b.lastName_en].filter(Boolean).join(' ').trim() || null,
        ageYears: ageInYears(b.dateOfBirth),
        gender: GENDER_MAP[b.gender] || (b.gender ? String(b.gender).toUpperCase() : 'MALE'),
        disabilityLevel: DISABILITY_LEVEL_MAP[dLevel] || 'MILD',
        // activeCarePlanId + goals fields require a CarePlan join we haven't
        // wired yet; return safe defaults so the UI degrades gracefully.
        activeCarePlanId: null,
        nextSessionAt: appt.nextSessionAt ? new Date(appt.nextSessionAt).toISOString() : null,
        lastSessionAt: appt.lastSessionAt ? new Date(appt.lastSessionAt).toISOString() : null,
        goalsCount: 0,
        goalsAtRisk: 0,
      };
    });

    return res.json(response);
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to list beneficiaries',
    });
  }
});

router.get('/beneficiaries/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'InvalidId', message: 'beneficiary id is not valid' });
    }

    // Scope: therapist can only open beneficiaries they have appointments with.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const hasAccess = await Appointment().countDocuments({
      therapist: employeeId,
      beneficiary: req.params.id,
      date: { $gte: twelveMonthsAgo },
    });
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'no active assignment to this beneficiary' });
    }

    const b = await Beneficiary()
      .findById(req.params.id)
      .select(
        'firstName_ar lastName_ar firstName_en lastName_en dateOfBirth gender disability branchId moodLog'
      )
      .populate('branchId', 'name_ar')
      .lean();
    if (!b) return res.status(404).json({ error: 'NotFound', message: 'beneficiary not found' });

    // Parallel: active care plan, recent sessions, active red-flags.
    const [activePlan, recentSessions, rfDocs] = await Promise.all([
      CarePlan().findOne({ beneficiary: req.params.id, status: 'ACTIVE' }).lean(),
      Appointment()
        .find({ beneficiary: req.params.id, therapist: employeeId })
        .sort({ date: -1 })
        .limit(5)
        .select('_id date status type')
        .lean(),
      RedFlagState()
        .find({ beneficiaryId: String(req.params.id), status: 'active' })
        .sort({ raisedAt: -1 })
        .lean(),
    ]);

    // Flatten all goals from the active CarePlan.
    const GOAL_PATHS_PRIORITY = [
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
    const goals = [];
    if (activePlan) {
      for (const [path, defaultPriority] of GOAL_PATHS_PRIORITY) {
        const parts = path.split('.');
        let cursor = activePlan;
        for (const k of parts) {
          cursor = cursor?.[k];
          if (cursor == null) break;
        }
        if (Array.isArray(cursor)) {
          for (const g of cursor) {
            const goalStatus =
              g.status === 'ACHIEVED'
                ? 'ACHIEVED'
                : g.status === 'DISCONTINUED'
                  ? 'ON_HOLD'
                  : g.status === 'IN_PROGRESS'
                    ? 'IN_PROGRESS'
                    : 'NOT_STARTED';
            goals.push({
              id: String(g._id),
              beneficiaryId: String(b._id),
              carePlanId: String(activePlan._id),
              nameAr: g.title || '—',
              description: g.description || null,
              status: goalStatus,
              priority: defaultPriority,
              progressPct: Number(g.progress) || 0,
              targetDate: g.targetDate ? new Date(g.targetDate).toISOString() : null,
              lastUpdatedAt: null,
              milestonesAchieved: 0,
              milestonesTotal: 0,
            });
          }
        }
      }
    }

    return res.json({
      id: String(b._id),
      nameAr: [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() || '—',
      nameEn: [b.firstName_en, b.lastName_en].filter(Boolean).join(' ').trim() || null,
      ageYears: ageInYears(b.dateOfBirth),
      gender: GENDER_MAP[b.gender] || 'MALE',
      disabilityLevel: DISABILITY_LEVEL_MAP[b.disability?.severity] || 'MILD',
      branchNameAr: b.branchId?.name_ar || '—',
      activeCarePlan: activePlan
        ? {
            id: String(activePlan._id),
            summary: activePlan.planNumber ? `خطة ${activePlan.planNumber}` : null,
            startDate: activePlan.startDate
              ? new Date(activePlan.startDate).toISOString().slice(0, 10)
              : '',
            endDate: activePlan.reviewDate
              ? new Date(activePlan.reviewDate).toISOString().slice(0, 10)
              : null,
          }
        : null,
      recentSessions: recentSessions.map(s => ({
        id: String(s._id),
        sessionDate: new Date(s.date).toISOString(),
        status: APPT_STATUS_TO_SESSION_STATUS[s.status] || 'SCHEDULED',
        programNameAr: s.type || null,
      })),
      goals,
      recentAssessments: [], // Assessment service wires in phase 16
      // Last 7 mood check-ins give the therapist pre-session context.
      // Stored by the student portal (apps/web-student → /api/v1/student/mood).
      recentMoods: (Array.isArray(b.moodLog) ? b.moodLog : [])
        .filter(m => m && typeof m.mood === 'number')
        .sort(
          (a, z) =>
            new Date(z.date || z.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        )
        .slice(0, 7)
        .map(m => ({
          date: m.date ? new Date(m.date).toISOString() : new Date(m.createdAt).toISOString(),
          mood: m.mood,
        })),
      redFlagsActive: rfDocs.map(rf => ({
        id: String(rf._id),
        code: rf.flagId?.replace(/^manual:/, '') || 'UNKNOWN',
        label: rf.observedValue?.code || rf.flagId || 'علامة حمراء',
        priority:
          rf.severity === 'critical' ? 'CRITICAL' : rf.severity === 'warning' ? 'HIGH' : 'MEDIUM',
        raisedAt: rf.raisedAt ? new Date(rf.raisedAt).toISOString() : new Date().toISOString(),
      })),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});

// ── Goals ─────────────────────────────────────────────────────────────────────
// Goals live as embedded subdocs across many CarePlan paths
// (educational/therapeutic/lifeSkills × domains). To find a goal by its
// embedded _id, probe all known paths in parallel.
const GOAL_PATHS = [
  'educational.domains.academic.goals',
  'educational.domains.classroom.goals',
  'educational.domains.communication.goals',
  'therapeutic.domains.speech.goals',
  'therapeutic.domains.occupational.goals',
  'therapeutic.domains.physical.goals',
  'therapeutic.domains.behavioral.goals',
  'therapeutic.domains.psychological.goals',
  'lifeSkills.domains.selfCare.goals',
  'lifeSkills.domains.homeSkills.goals',
  'lifeSkills.domains.social.goals',
  'lifeSkills.domains.transport.goals',
  'lifeSkills.domains.financial.goals',
];

async function findCarePlanByGoalId(goalId) {
  // Build a $or of all possible embedded paths.
  const or = GOAL_PATHS.map(p => ({ [`${p}._id`]: goalId }));
  const plan = await CarePlan().findOne({ $or: or }).lean();
  if (!plan) return null;

  // Locate the goal subdoc so we can return its full shape.
  for (const p of GOAL_PATHS) {
    const parts = p.split('.');
    let cursor = plan;
    for (const k of parts) {
      cursor = cursor?.[k];
      if (cursor == null) break;
    }
    if (Array.isArray(cursor)) {
      const goal = cursor.find(g => String(g._id) === String(goalId));
      if (goal) return { plan, goal, path: p };
    }
  }
  return { plan, goal: null, path: null };
}

router.post('/goals/:goalId/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    if (!isValidObjectId(req.params.goalId)) {
      return res
        .status(400)
        .json({ error: 'InvalidId', message: 'goalId is not a valid ObjectId' });
    }

    const { progressPct, note } = req.body || {};
    const pct = Number(progressPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'progressPct must be a number between 0 and 100' });
    }

    const found = await findCarePlanByGoalId(req.params.goalId);
    if (!found)
      return res
        .status(404)
        .json({ error: 'NotFound', message: 'goal not found in any care plan' });
    const { plan, goal } = found;
    if (!goal)
      return res
        .status(404)
        .json({ error: 'NotFound', message: 'goal subdocument not resolvable' });

    const now = new Date();
    await GoalProgressEntry().create({
      carePlanId: plan._id,
      goalId: goal._id,
      beneficiaryId: plan.beneficiary,
      progressPercent: Math.round(pct),
      note: note ? String(note).trim().slice(0, 1000) : undefined,
      recordedBy: userId,
      recordedAt: now,
    });

    // Return the current TherapyGoal shape — frontend uses it for optimistic UI.
    const statusMap = {
      PENDING: 'NOT_STARTED',
      IN_PROGRESS: 'IN_PROGRESS',
      ACHIEVED: 'ACHIEVED',
      DISCONTINUED: 'ON_HOLD',
    };
    const priorityMap = { speech: 'HIGH', occupational: 'HIGH', behavioral: 'HIGH' };
    return res.json({
      id: String(goal._id),
      beneficiaryId: String(plan.beneficiary),
      carePlanId: String(plan._id),
      nameAr: goal.title || '—',
      description: goal.description || null,
      status: pct >= 100 ? 'ACHIEVED' : statusMap[goal.status] || 'IN_PROGRESS',
      priority: priorityMap[found.path?.split('.')[2]] || 'MEDIUM',
      progressPct: Math.round(pct),
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString() : null,
      lastUpdatedAt: now.toISOString(),
      milestonesAchieved: 0,
      milestonesTotal: 0,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to update goal progress',
    });
  }
});

// ── Red-Flags ─────────────────────────────────────────────────────────────────
// Canonical catalog. Mirrored in apps/web-therapist/src/lib/api.ts DEMO_FLAG_CODES
// so the UX is identical between demo mode and this live endpoint.
const RED_FLAG_CATALOG = [
  {
    code: 'DEVELOPMENTAL_REGRESSION',
    labelAr: 'تراجع نمائي مفاجئ',
    category: 'CLINICAL',
    defaultPriority: 'HIGH',
  },
  {
    code: 'GOAL_STAGNANT',
    labelAr: 'ركود في التقدم ≥ 4 أسابيع',
    category: 'CLINICAL',
    defaultPriority: 'MEDIUM',
  },
  {
    code: 'SAFEGUARDING_CONCERN',
    labelAr: 'قلق يتعلق بسلامة المستفيد',
    category: 'SAFEGUARDING',
    defaultPriority: 'CRITICAL',
  },
  {
    code: 'MEDICATION_SIDE_EFFECT',
    labelAr: 'أعراض جانبية محتملة لدواء',
    category: 'MEDICAL',
    defaultPriority: 'HIGH',
  },
  {
    code: 'BEHAVIOR_ESCALATION',
    labelAr: 'تصاعد سلوكي',
    category: 'BEHAVIORAL',
    defaultPriority: 'HIGH',
  },
  {
    code: 'ATTENDANCE_GAP',
    labelAr: 'انقطاع متكرر عن الحضور',
    category: 'ATTENDANCE',
    defaultPriority: 'MEDIUM',
  },
  {
    code: 'PARENT_COMPLIANCE',
    labelAr: 'ضعف التزام الأسرة بالخطة',
    category: 'ATTENDANCE',
    defaultPriority: 'LOW',
  },
  {
    code: 'OTHER',
    labelAr: 'أخرى (اشرح في الملاحظات)',
    category: 'CLINICAL',
    defaultPriority: 'MEDIUM',
  },
];

router.get('/red-flags/catalog', authenticate, (_req, res) => {
  // No DB round-trip needed — this is a static enum that therapists pick from.
  res.json(RED_FLAG_CATALOG);
});
// Manual flag raises carry a `manual:` prefix in flagId to keep them
// distinct from engine-raised flags in the same RedFlagState collection.
// This preserves the unique (beneficiaryId, flagId, status) index without
// colliding with automated raises of the same CODE.
const PRIORITY_TO_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'info',
};

router.post('/red-flags', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const { beneficiaryId, code, priority, notes, sessionId } = req.body || {};

    // Validate body.
    if (!beneficiaryId || typeof beneficiaryId !== 'string') {
      return res.status(400).json({ error: 'InvalidBody', message: 'beneficiaryId is required' });
    }
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'InvalidBody', message: 'code is required' });
    }
    const validCode = RED_FLAG_CATALOG.find(c => c.code === code);
    if (!validCode) {
      return res.status(400).json({ error: 'InvalidBody', message: `unknown code '${code}'` });
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'priority must be LOW|MEDIUM|HIGH|CRITICAL' });
    }
    if (!notes || typeof notes !== 'string' || notes.trim().length < 10) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'notes must be at least 10 characters' });
    }

    const flagId = `manual:${code}`;
    const now = new Date();

    try {
      const doc = await RedFlagState().create({
        beneficiaryId: String(beneficiaryId),
        flagId,
        status: 'active',
        severity: PRIORITY_TO_SEVERITY[priority],
        domain: validCode.category,
        blocking: priority === 'CRITICAL',
        raisedAt: now,
        lastObservedAt: now,
        observedValue: {
          code,
          priority,
          notes: notes.trim(),
          raisedByUserId: String(userId),
          sessionId: sessionId ? String(sessionId) : null,
        },
      });
      return res.status(201).json({ id: String(doc._id) });
    } catch (dbErr) {
      // Duplicate key → flag already active for this beneficiary.
      if (dbErr && dbErr.code === 11000) {
        return res.status(409).json({
          error: 'AlreadyActive',
          message:
            'this flag is already active for this beneficiary — resolve it first before raising again',
        });
      }
      throw dbErr;
    }
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to raise red-flag',
    });
  }
});

// ── Assessments ───────────────────────────────────────────────────────────────
// Static catalog — mirrors DEMO_ASSESSMENT_TEMPLATES in the frontend so the
// picker UX is identical in demo and production.
const ASSESSMENT_TEMPLATES = [
  {
    code: 'REEL-4',
    labelAr: 'REEL-4 — مقياس النمو المبكر',
    descriptionAr: 'تقييم النمو اللغوي الاستقبالي والتعبيري للأعمار 0-3.',
    domains: ['استقبالي', 'تعبيري'],
    estimatedMinutes: 30,
  },
  {
    code: 'PLS-5',
    labelAr: 'PLS-5 — مقياس اللغة قبل المدرسي',
    descriptionAr: 'تقييم شامل للنطق واللغة لأعمار الولادة حتى 7 سنوات.',
    domains: ['نطق', 'لغة', 'تواصل'],
    estimatedMinutes: 45,
  },
  {
    code: 'GFTA-3',
    labelAr: 'GFTA-3 — تقييم النطق',
    descriptionAr: 'قياس دقة إنتاج الأصوات الكلامية.',
    domains: ['نطق'],
    estimatedMinutes: 25,
  },
  {
    code: 'VB-MAPP',
    labelAr: 'VB-MAPP — تقييم السلوك اللفظي',
    descriptionAr: 'تقييم المهارات اللفظية للأطفال ذوي اضطراب طيف التوحد.',
    domains: ['سلوك لفظي', 'اجتماعي'],
    estimatedMinutes: 60,
  },
  {
    code: 'FUNCTIONAL',
    labelAr: 'تقييم وظيفي حر',
    descriptionAr: 'نموذج مفتوح لتسجيل ملاحظات المعالج.',
    domains: ['متعدد'],
    estimatedMinutes: 20,
  },
];

router.get('/assessments/templates', authenticate, (_req, res) => {
  res.json(ASSESSMENT_TEMPLATES);
});

// Appointments of type="تقييم" act as assessment records until a dedicated
// Assessment collection lands (Phase 16). The therapist UI treats them as
// a separate stream to surface outstanding evaluations.
router.get('/assessments', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    const appts = await Appointment()
      .find({
        therapist: employeeId,
        type: { $in: ['تقييم', 'فحص'] },
      })
      .sort({ date: -1 })
      .limit(50)
      .select('_id beneficiary beneficiaryName date type status internalNotes')
      .lean();

    // Status mapping: draft (IN_PROGRESS with SOAP) → DRAFT,
    // COMPLETED → REVIEWED (signed) or COMPLETED (older).
    return res.json(
      appts.map(a => {
        const env = (() => {
          if (!a.internalNotes) return null;
          try {
            return JSON.parse(a.internalNotes);
          } catch {
            return null;
          }
        })();
        const signed = !!env?.signedAt;
        let status = 'DRAFT';
        if (a.status === 'COMPLETED') status = signed ? 'REVIEWED' : 'COMPLETED';
        else if (env?.soap) status = 'DRAFT';
        else status = 'DRAFT'; // default placeholder

        return {
          id: String(a._id),
          beneficiaryId: a.beneficiary ? String(a.beneficiary) : '',
          beneficiaryNameAr: a.beneficiaryName || '—',
          type: a.type || 'تقييم',
          typeLabelAr: a.type || 'تقييم',
          status,
          startedAt: new Date(a.date).toISOString(),
          completedAt: signed
            ? env.signedAt
            : a.status === 'COMPLETED'
              ? new Date(a.date).toISOString()
              : null,
          scoreLabel: null, // populated when Assessment service wires
        };
      })
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'InternalError', message: err instanceof Error ? err.message : 'failed' });
  }
});
router.post(
  '/assessments',
  notImplemented({
    request: { beneficiaryId: 'string', templateCode: 'string' },
    response: { id: 'string' },
  })
);

// ── Inbox ─────────────────────────────────────────────────────────────────────
// Returns tasks + consult requests + supervisor reviews + care-plan updates.
// Pending wiring to the Notification + ChangeRequest services (Phase 11/15);
// for now we return an empty array so the UI renders its "inbox is empty"
// state cleanly. When the services are wired, only this handler body changes.
router.get('/inbox', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    // TODO(phase-16): merge from Notification.find({ userId, type: { $in: [...] } })
    //                 and ChangeRequest/ConsultRequest services.
    return res.json([]);
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load inbox',
    });
  }
});

// ── Credentials & CPE ─────────────────────────────────────────────────────────
/**
 * Compute credential status + daysUntilExpiry relative to today.
 * Buckets: EXPIRED (<0), EXPIRING_SOON (≤90), VALID otherwise, with
 * null `expiresAt` treated as VALID indefinitely.
 */
function credentialStatus(expiresAt) {
  if (!expiresAt) return { status: 'VALID', daysUntilExpiry: null };
  const days = Math.round((new Date(expiresAt).getTime() - Date.now()) / (24 * 3600_000));
  if (days < 0) return { status: 'EXPIRED', daysUntilExpiry: days };
  if (days <= 90) return { status: 'EXPIRING_SOON', daysUntilExpiry: days };
  return { status: 'VALID', daysUntilExpiry: days };
}

router.get('/credentials', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const emp = await Employee()
      .findOne({ user_id: userId })
      .select(
        'scfhs_number scfhs_expiry scfhs_classification cpe_hours_ytd cpe_hours_required iqama_number iqama_expiry passport_number passport_expiry'
      )
      .lean();
    if (!emp) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    const credentials = [];

    // SCFHS — the primary professional registration for therapists.
    if (emp.scfhs_number || emp.scfhs_expiry) {
      const { status, daysUntilExpiry } = credentialStatus(emp.scfhs_expiry);
      credentials.push({
        type: 'SCFHS',
        typeLabelAr: 'بطاقة هيئة التخصصات الصحية',
        number: emp.scfhs_number || null,
        issuedAt: null,
        expiresAt: emp.scfhs_expiry ? new Date(emp.scfhs_expiry).toISOString() : null,
        status,
        daysUntilExpiry,
      });
    }

    // Iqama (for non-Saudi staff). Surface as LICENSE-type since the UI
    // doesn't have a dedicated residency bucket.
    if (emp.iqama_expiry) {
      const { status, daysUntilExpiry } = credentialStatus(emp.iqama_expiry);
      credentials.push({
        type: 'LICENSE',
        typeLabelAr: 'الإقامة',
        number: emp.iqama_number || null,
        issuedAt: null,
        expiresAt: new Date(emp.iqama_expiry).toISOString(),
        status,
        daysUntilExpiry,
      });
    }

    // Passport (non-Saudi only).
    if (emp.passport_expiry) {
      const { status, daysUntilExpiry } = credentialStatus(emp.passport_expiry);
      credentials.push({
        type: 'OTHER',
        typeLabelAr: 'جواز السفر',
        number: emp.passport_number || null,
        issuedAt: null,
        expiresAt: new Date(emp.passport_expiry).toISOString(),
        status,
        daysUntilExpiry,
      });
    }

    // CPE activities will move to a dedicated collection (Phase 17). For now
    // we return empty activities but the YTD/required counters are real.
    const cpe = {
      year: new Date().getFullYear(),
      ytd: Number(emp.cpe_hours_ytd) || 0,
      required: Number(emp.cpe_hours_required) || 30,
      activities: [],
    };

    return res.json({ credentials, cpe });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load credentials',
    });
  }
});

module.exports = router;
