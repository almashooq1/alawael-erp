/**
 * Therapist Portal — API Routes (v1)
 *
 * Contract mirrors apps/web-therapist/src/lib/api.ts exactly.
 * All endpoints are wired to the domain layer (sessions, schedule, red-flags,
 * goals, assessments, credentials). The DEMO fixtures in the frontend produce
 * the same shapes returned here, so this file remains the canonical schema
 * reference.
 *
 * Mounted in backend/app.js via
 *   app.use('/api/v1/therapist', require('./routes/therapist-portal.routes'));
 *
 * Auth: every route (except /auth/login) requires authenticate + requireRole('therapist')
 * Scope: responses are scoped to req.user.employeeId — never return data for other therapists.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// W458: brute-force defense on /auth/login. Pre-W458 the endpoint had
// NO rate limit at all — attacker could hammer credential guesses
// against any therapist email/username indefinitely. loginLimiter is
// the same gate used by sso.routes.js + montessoriAuth.js (5 req/15min
// per IP via securityConfig.rateLimit.login).
let _loginLimiter = null;
function loginLimiter(req, res, next) {
  if (!_loginLimiter) {
    try {
      _loginLimiter = require('../middleware/rateLimiter').loginLimiter;
    } catch {
      _loginLimiter = (_req, _res, _next) => _next();
    }
  }
  return _loginLimiter(req, res, next);
}

const isValidObjectId = id => mongoose.Types.ObjectId.isValid(String(id));

// Lazy requires so a missing dep never crashes module load (routes stay listable).
let _authenticate,
  _Employee,
  _Beneficiary,
  _Appointment,
  _RedFlagState,
  _CarePlan,
  _GoalProgressEntry,
  _User,
  _Notification,
  _AuditLog,
  _generateToken,
  _requireRole,
  _idempotency,
  _mutationIdAdapter;

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
function User() {
  if (!_User) _User = require('../models/User');
  return _User;
}
function Notification() {
  if (!_Notification) _Notification = require('../models/Notification');
  return _Notification;
}
function AuditLog() {
  if (!_AuditLog) {
    try {
      _AuditLog = require('../models/auditLog.model');
    } catch {
      _AuditLog = null;
    }
  }
  return _AuditLog;
}
function generateToken(...args) {
  if (!_generateToken) _generateToken = require('../middleware/auth').generateToken;
  return _generateToken(...args);
}

// Governance: only clinical staff may use the therapist portal.
// `super_admin` and any role at or above `supervisor` level pass via
// the requireRole hierarchy fallback in rbac.v2.middleware.
const THERAPIST_ROLES = [
  'therapist',
  'clinical_staff',
  'supervisor',
  'clinical_supervisor',
  'clinical_director',
  'manager',
  'admin',
];

function requireTherapistRole(req, res, next) {
  if (!_requireRole) _requireRole = require('../middleware/rbac.v2.middleware').requireRole;
  return _requireRole(...THERAPIST_ROLES)(req, res, next);
}

function idempotency() {
  if (!_idempotency) _idempotency = require('../middleware/idempotency.middleware');
  // Per-user namespace so two therapists cannot collide on the same mutation id.
  return _idempotency({
    scope: req => `therapist:${req.user?.id || req.user?._id || 'anon'}`,
  });
}

function mutationIdAdapter(req, res, next) {
  if (!_mutationIdAdapter)
    _mutationIdAdapter = require('../middleware/mutationIdAdapter.middleware');
  return _mutationIdAdapter(req, res, next);
}

/**
 * Best-effort audit log helper. AuditLog is optional in some test envs, and
 * we never want a logging failure to fail the user-facing request.
 */
function audit(eventType, req, extras = {}) {
  try {
    const Model = AuditLog();
    if (!Model || typeof Model.create !== 'function') return;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    Model.create({
      eventType,
      eventCategory: extras.category || 'clinical',
      severity: extras.severity || 'info',
      status: extras.status || 'success',
      ip: req.ip,
      userAgent: req.get && req.get('user-agent'),
      userId,
      actionDetails: extras.actionDetails || {},
      affectedResources: extras.affectedResources || [],
      result: extras.result || 'success',
    }).catch(() => {});
  } catch {
    /* swallow — audit must never break the request path */
  }
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

// Admin roles allowed to preview the therapist portal on behalf of any
// clinical employee. These are the only roles that can pass `?employeeId=`
// to target another therapist's view.
const ADMIN_VIEWER_ROLES = new Set(['admin', 'superadmin', 'super_admin']);

// Specializations considered "clinical" — used to filter the /therapists
// picker so admins don't see HR/finance/IT employees as targets.
const CLINICAL_SPECIALIZATIONS = [
  'pt',
  'ot',
  'speech',
  'aba',
  'psychology',
  'special_education',
  'vocational',
  'nursing',
  'medical',
];

function isAdminViewer(req) {
  return ADMIN_VIEWER_ROLES.has(req.user?.role || '');
}

/**
 * Resolve which Employee to scope reads against.
 *
 * Mirrors the workbench W232 helper so the two route files behave
 * identically for the admin-previewer use case (see CLAUDE.md known issues).
 *
 * Modes:
 *   - 'self'             — non-admin with own Employee → load own data
 *   - 'admin_targeted'   — admin passed ?employeeId=<id> resolving to a real Employee
 *   - 'admin_no_target'  — admin without target → caller should return empty payload
 *   - 'orphan'           — non-admin without Employee → caller should 404
 *
 * `opts.select` and `opts.populate` are forwarded to the Mongoose query so
 * each call site can keep its existing projection.
 */
async function resolveTargetEmployee(req, opts = {}) {
  const userId = req.user?.id || req.user?._id || req.user?.userId;

  const runQuery = q => {
    if (opts.populate) q = q.populate(opts.populate);
    if (opts.select) q = q.select(opts.select);
    return q.lean();
  };

  if (isAdminViewer(req)) {
    const wanted = req.query?.employeeId;
    if (wanted && isValidObjectId(wanted)) {
      const target = await runQuery(Employee().findById(wanted));
      if (target) {
        return {
          employee: target,
          employeeId: target._id,
          viewerMode: 'admin_targeted',
          viewing: {
            _id: String(target._id),
            nameAr: target.name_ar || null,
            specialization: target.specialization || null,
          },
        };
      }
    }
    if (userId) {
      const own = await runQuery(Employee().findOne({ user_id: userId }));
      if (own) {
        return { employee: own, employeeId: own._id, viewerMode: 'self', viewing: null };
      }
    }
    return { employee: null, employeeId: null, viewerMode: 'admin_no_target', viewing: null };
  }

  if (!userId) return { employee: null, employeeId: null, viewerMode: 'no_user', viewing: null };
  const own = await runQuery(Employee().findOne({ user_id: userId }));
  if (own) return { employee: own, employeeId: own._id, viewerMode: 'self', viewing: null };
  return { employee: null, employeeId: null, viewerMode: 'orphan', viewing: null };
}

function adminViewerEnvelope(extras = {}) {
  return {
    viewerMode: 'admin_no_target',
    viewing: null,
    message: 'اختر معالجاً من القائمة لمشاهدة لوحته',
    ...extras,
  };
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
function parseSoapEnvelope(internalNotes) {
  if (!internalNotes || typeof internalNotes !== 'string') return null;
  try {
    const parsed = JSON.parse(internalNotes);
    if (parsed && typeof parsed === 'object' && parsed.soap) return parsed;
  } catch {
    /* not a SOAP envelope */
  }
  return null;
}

function mapAppointmentToSession(appt, { includeSoap = false } = {}) {
  const startISO = composeDateTimeISO(appt.date, appt.startTime);
  const endISO = composeDateTimeISO(appt.date, appt.endTime || appt.startTime);

  let status = APPT_STATUS_TO_SESSION_STATUS[appt.status] || 'SCHEDULED';

  // Promote IN_PROGRESS → COMPLETED_DRAFT when a SOAP envelope exists but
  // hasn't been signed yet. COMPLETED appointments with a signed envelope
  // already map to COMPLETED_SIGNED via the enum map above.
  const env =
    typeof parseSoapEnvelope === 'function' ? parseSoapEnvelope(appt.internalNotes) : null;
  if (status === 'IN_PROGRESS' && env && env.soap && !env.signedAt) {
    status = 'COMPLETED_DRAFT';
  }

  const out = {
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

  // Expose SOAP envelope on the single-session read so the documentation
  // dialog can pre-populate from any prior draft. List endpoints (/today,
  // /schedule) skip this — clients should fetch the single session to edit.
  if (includeSoap && env && env.soap) {
    out.soap = {
      subjective: String(env.soap.subjective || ''),
      objective: String(env.soap.objective || ''),
      assessment: String(env.soap.assessment || ''),
      plan: String(env.soap.plan || ''),
    };
    out.signedAt = env.signedAt || null;
    out.lastDraftAt = env.lastDraftAt || null;
  }

  return out;
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

// ── Cross-cutting middleware ──────────────────────────────────────────────────
// 1. mutationIdAdapter copies x-client-mutation-id → Idempotency-Key so the
//    offline queue's replay tag is honored by the platform-wide idempotency layer.
// 2. idempotency() then dedupes POST/PUT/PATCH/DELETE per (user, route, key).
// Both are no-ops on requests without the relevant header — safe to apply globally.
router.use(mutationIdAdapter);
router.use(idempotency());

// ── Auth ──────────────────────────────────────────────────────────────────────
/**
 * POST /auth/login
 * Therapist-portal-specific login. Authenticates via User.comparePassword and
 * returns the JWT alongside the therapist's Employee identity, so the SPA can
 * pre-populate `/me` without an extra round-trip on first paint.
 *
 * The token shape and verification path are identical to the platform-wide
 * authenticate() middleware — this endpoint just bundles the Employee lookup.
 */
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (
      !identifier ||
      typeof identifier !== 'string' ||
      !password ||
      typeof password !== 'string'
    ) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'identifier and password are required' });
    }

    const trimmed = identifier.trim().toLowerCase();
    // identifier may be an email or an employee_number (national id login is
    // out of scope for v1 — therapists onboard with email by default).
    const user = await User()
      .findOne({ $or: [{ email: trimmed }, { username: trimmed }] })
      .select('+password +role +email +username +isActive');

    if (!user || (typeof user.isActive === 'boolean' && user.isActive === false)) {
      audit('auth.login_failed', req, {
        severity: 'medium',
        status: 'failure',
        actionDetails: { identifier: trimmed, reason: 'user_not_found_or_inactive' },
      });
      return res
        .status(401)
        .json({ error: 'InvalidCredentials', message: 'بيانات الدخول غير صحيحة' });
    }

    const ok =
      typeof user.comparePassword === 'function' ? await user.comparePassword(password) : false;
    if (!ok) {
      audit('auth.login_failed', req, {
        severity: 'medium',
        status: 'failure',
        actionDetails: { identifier: trimmed, reason: 'bad_password' },
      });
      return res
        .status(401)
        .json({ error: 'InvalidCredentials', message: 'بيانات الدخول غير صحيحة' });
    }

    // Resolve the Employee record so the SPA gets a complete identity envelope.
    const emp = await Employee()
      .findOne({ user_id: user._id })
      .select('_id employee_number name_ar specialization')
      .lean();

    if (!emp) {
      // The user authenticated but isn't enrolled as an Employee — block portal
      // access since every downstream route needs an Employee anchor.
      return res.status(403).json({
        error: 'EmployeeNotFound',
        message: 'الحساب غير مرتبط بسجل موظف. يرجى التواصل مع الموارد البشرية.',
      });
    }

    const token = generateToken(
      {
        id: String(user._id),
        email: user.email,
        role: user.role,
        permissions: [],
      },
      '8h'
    );

    audit('auth.login', req, {
      severity: 'info',
      status: 'success',
      actionDetails: { userId: String(user._id), employeeId: String(emp._id) },
    });

    return res.json({
      accessToken: token,
      therapistId: String(emp._id),
      employeeId: emp.employee_number || String(emp._id),
      nameAr: emp.name_ar || '—',
      specialty: SPECIALIZATION_LABEL_AR[emp.specialization] || emp.specialization || '—',
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'login failed',
    });
  }
});

// ── Identity ──────────────────────────────────────────────────────────────────
// ── /therapists — admin picker source ─────────────────────────────────────────
// Admin-only list of clinical employees, used by the workbench UI when the
// signed-in admin has no Employee record. Returns 403 for therapist roles
// (they have no need to enumerate other therapists from this endpoint).
router.get('/therapists', authenticate, requireTherapistRole, async (req, res) => {
  try {
    if (!isAdminViewer(req)) {
      return res.status(403).json({ error: 'Forbidden', message: 'admin-only endpoint' });
    }
    const items = await Employee()
      .find({
        status: { $ne: 'inactive' },
        specialization: { $in: CLINICAL_SPECIALIZATIONS },
      })
      .select('_id name_ar name_en specialization email')
      .sort({ name_ar: 1 })
      .lean();
    return res.json({
      items: items.map(e => ({
        id: String(e._id),
        nameAr: e.name_ar || null,
        nameEn: e.name_en || null,
        specialty: SPECIALIZATION_LABEL_AR[e.specialization] || e.specialization || '—',
        email: e.email || null,
      })),
      total: items.length,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to list therapists',
    });
  }
});

router.get('/me', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    }

    const {
      employee: emp,
      viewerMode,
      viewing,
    } = await resolveTargetEmployee(req, {
      populate: { path: 'branch_id', select: 'name_ar name_en city' },
    });

    if (!emp) {
      if (viewerMode === 'admin_no_target') {
        // Admin without a linked Employee record can preview the portal but
        // sees no profile until they pick a therapist. The workbench UI uses
        // viewerMode='admin_no_target' to render a picker.
        return res.json(adminViewerEnvelope({ profile: null }));
      }
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
      viewerMode,
      viewing,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load therapist profile',
    });
  }
});

// ── Today & Schedule ──────────────────────────────────────────────────────────
router.get('/today', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });
    }

    const {
      employee: emp,
      viewerMode,
      viewing,
    } = await resolveTargetEmployee(req, {
      select: '_id name_ar specialization scfhs_expiry cpe_hours_ytd cpe_hours_required',
    });
    if (!emp) {
      if (viewerMode === 'admin_no_target') {
        return res.json(
          adminViewerEnvelope({
            date: new Date().toISOString().slice(0, 10),
            counts: {
              total: 0,
              upcoming: 0,
              inProgress: 0,
              completed: 0,
              cancelled: 0,
              pendingDocs: 0,
            },
            sessions: [],
            pendingDocs: [],
            redFlagsMine: { raised: 0, critical: 0 },
            inboxUnread: 0,
            cpe: { ytd: 0, required: 30 },
          })
        );
      }
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
      viewerMode,
      viewing,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load today',
    });
  }
});

// GET /schedule retired — use the unified DDD Sessions surface:
//   /api/v1/sessions/therapist/schedule

// ── Sessions retired ──────────────────────────────────────────────────────────
// Therapist portal session read/start/draft/sign are now served by the unified
// DDD Sessions surface: /api/v1/sessions/therapist/sessions
// parseSoapEnvelope is retained so /today can still render signed-draft state.

// ── Beneficiaries (assigned to therapist only) ────────────────────────────────
router.get('/beneficiaries', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
    if (!employeeId) {
      if (viewerMode === 'admin_no_target') return res.json([]);
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

router.get('/beneficiaries/:id', authenticate, requireTherapistRole, async (req, res) => {
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

    // PDPL Art.13: every read of a beneficiary's clinical record must be logged
    // so the DPO can answer "who viewed my data" subject requests.
    audit('pii.beneficiary_view', req, {
      severity: 'info',
      category: 'pii',
      actionDetails: { beneficiaryId: String(b._id), via: 'therapist-portal' },
      affectedResources: [{ type: 'Beneficiary', id: String(b._id) }],
    });

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

router.post('/goals/:goalId/progress', authenticate, requireTherapistRole, async (req, res) => {
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

    // W269d (security): caseload guard — therapist must have a recent
    // assignment to the beneficiary owning this goal. Without this,
    // any authenticated therapist could log progress on any goal in
    // the system by knowing its ObjectId.
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const hasAccess = await Appointment().countDocuments({
      therapist: employeeId,
      beneficiary: plan.beneficiary,
      date: { $gte: twelveMonthsAgo },
    });
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'no active assignment to this beneficiary' });
    }

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

router.get('/red-flags/catalog', authenticate, requireTherapistRole, (_req, res) => {
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

router.post('/red-flags', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const { beneficiaryId, code, priority, notes, sessionId } = req.body || {};

    // Validate body.
    if (!beneficiaryId || typeof beneficiaryId !== 'string') {
      return res.status(400).json({ error: 'InvalidBody', message: 'beneficiaryId is required' });
    }
    if (!isValidObjectId(beneficiaryId)) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'beneficiaryId is not a valid ObjectId' });
    }

    // W269d (security): caseload guard — therapist must have a recent
    // assignment to the beneficiary before raising a red flag against
    // their record. Without this, any authenticated therapist could
    // raise a red flag on any beneficiary (an audit-trail-tagged
    // event that surfaces on the supervisor dashboard).
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const hasAccess = await Appointment().countDocuments({
      therapist: employeeId,
      beneficiary: beneficiaryId,
      date: { $gte: twelveMonthsAgo },
    });
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'no active assignment to this beneficiary' });
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

      // Audit every raise — required for CBAHI / PDPL incident traceability.
      audit('clinical.red_flag_raised', req, {
        severity: priority === 'CRITICAL' ? 'high' : 'medium',
        category: 'clinical',
        actionDetails: {
          redFlagId: String(doc._id),
          beneficiaryId: String(beneficiaryId),
          code,
          priority,
        },
        affectedResources: [
          { type: 'RedFlagState', id: String(doc._id) },
          { type: 'Beneficiary', id: String(beneficiaryId) },
        ],
      });

      // Escalation: CRITICAL flags are blocking and must wake a supervisor.
      // We notify all active users with a clinical-supervisor level role.
      // Best-effort: if Notification or User querying fails, we still return
      // 201 — the audit trail is the authoritative record.
      if (priority === 'CRITICAL') {
        try {
          const supervisorRoles = [
            'clinical_supervisor',
            'clinical_director',
            'supervisor',
            'manager',
            'admin',
          ];
          const supervisors = await User()
            .find({ role: { $in: supervisorRoles }, isActive: { $ne: false } })
            .select('_id')
            .limit(50)
            .lean();

          if (supervisors && supervisors.length > 0) {
            await Notification().insertMany(
              supervisors.map(s => ({
                recipientId: s._id,
                userId: s._id,
                title: 'علامة حمراء حرجة تتطلب مراجعة فورية',
                message: `${validCode.labelAr} — ${notes.trim().slice(0, 160)}`,
                type: 'alert',
                category: 'clinical',
                priority: 'critical',
                actionUrl: `/admin/beneficiaries/${beneficiaryId}#red-flags`,
                metadata: {
                  redFlagId: String(doc._id),
                  beneficiaryId: String(beneficiaryId),
                  code,
                  raisedByUserId: String(userId),
                },
              })),
              { ordered: false }
            );
          }
        } catch (notifyErr) {
          // Escalation is best-effort; surface in audit but don't 500 the user.
          audit('clinical.red_flag_escalation_failed', req, {
            severity: 'high',
            status: 'failure',
            actionDetails: {
              redFlagId: String(doc._id),
              error: notifyErr instanceof Error ? notifyErr.message : 'unknown',
            },
          });
        }
      }

      return res.status(201).json({ id: String(doc._id), escalated: priority === 'CRITICAL' });
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

router.get('/assessments/templates', authenticate, requireTherapistRole, (_req, res) => {
  res.json(ASSESSMENT_TEMPLATES);
});

// Appointments of type="تقييم" act as assessment records until a dedicated
// Assessment collection lands (Phase 16). The therapist UI treats them as
// a separate stream to surface outstanding evaluations.
router.get('/assessments', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
    if (!employeeId) {
      if (viewerMode === 'admin_no_target') return res.json([]);
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
/**
 * POST /assessments
 *
 * Creates a placeholder assessment record by booking an Appointment of
 * type='تقييم' against today's date for the assigned therapist. This is
 * the same convention GET /assessments reads from. When a dedicated
 * Assessment collection lands (Phase 16), only this handler body changes.
 */
router.post('/assessments', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }

    const { beneficiaryId, templateCode } = req.body || {};
    if (!beneficiaryId || !isValidObjectId(beneficiaryId)) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: 'beneficiaryId must be a valid ObjectId' });
    }
    const tpl = ASSESSMENT_TEMPLATES.find(t => t.code === templateCode);
    if (!tpl) {
      return res
        .status(400)
        .json({ error: 'InvalidBody', message: `unknown templateCode '${templateCode}'` });
    }

    // Caseload guard: therapist must have a recent assignment to the beneficiary.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const hasAccess = await Appointment().countDocuments({
      therapist: employeeId,
      beneficiary: beneficiaryId,
      date: { $gte: twelveMonthsAgo },
    });
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'no active assignment to this beneficiary' });
    }

    const ben = await Beneficiary()
      .findById(beneficiaryId)
      .select('firstName_ar lastName_ar')
      .lean();

    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const endHour = String((now.getHours() + Math.ceil(tpl.estimatedMinutes / 60)) % 24).padStart(
      2,
      '0'
    );
    const endTime = `${endHour}:${String(now.getMinutes()).padStart(2, '0')}`;

    const doc = await Appointment().create({
      therapist: employeeId,
      beneficiary: beneficiaryId,
      beneficiaryName: ben
        ? [ben.firstName_ar, ben.lastName_ar].filter(Boolean).join(' ').trim()
        : '—',
      type: 'تقييم',
      date: now,
      startTime,
      endTime,
      status: 'PENDING',
      internalNotes: JSON.stringify({
        assessmentTemplate: tpl.code,
        domains: tpl.domains,
        createdAt: now.toISOString(),
      }),
    });

    audit('clinical.assessment_created', req, {
      severity: 'info',
      category: 'clinical',
      actionDetails: {
        assessmentId: String(doc._id),
        beneficiaryId: String(beneficiaryId),
        templateCode: tpl.code,
      },
      affectedResources: [
        { type: 'Appointment', id: String(doc._id) },
        { type: 'Beneficiary', id: String(beneficiaryId) },
      ],
    });

    return res.status(201).json({ id: String(doc._id) });
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to create assessment',
    });
  }
});

// ── Inbox ─────────────────────────────────────────────────────────────────────
// Returns tasks + consult requests + supervisor reviews + care-plan updates.
// Pending wiring to the Notification + ChangeRequest services (Phase 11/15);
// for now we return an empty array so the UI renders its "inbox is empty"
// state cleanly. When the services are wired, only this handler body changes.
router.get('/inbox', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const docs = await Notification()
      .find({
        $or: [{ recipientId: userId }, { userId }, { recipient: userId }],
        deletedAt: { $exists: false },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        '_id title message type category priority read isRead actionUrl link metadata createdAt'
      )
      .lean();

    // Map server-side notification types to the therapist-portal taxonomy
    // (TASK | CONSULT | REVIEW | PLAN_UPDATE) the SPA filters by.
    const TYPE_MAP = {
      task: 'TASK',
      reminder: 'TASK',
      approval: 'REVIEW',
      message: 'CONSULT',
      update: 'PLAN_UPDATE',
      alert: 'REVIEW',
      info: 'TASK',
    };
    const PRIORITY_MAP = {
      critical: 'CRITICAL',
      urgent: 'HIGH',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
    };

    return res.json(
      docs.map(d => ({
        id: String(d._id),
        type: TYPE_MAP[d.type] || 'TASK',
        priority: PRIORITY_MAP[d.priority] || 'MEDIUM',
        title: d.title || '—',
        body: d.message || '',
        actionUrl: d.actionUrl || d.link || null,
        unread: !(d.read || d.isRead),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
        metadata: d.metadata || {},
      }))
    );
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

router.get('/credentials', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Unauthorized', message: 'user id missing from token' });

    const { employee: emp, viewerMode } = await resolveTargetEmployee(req, {
      select:
        'scfhs_number scfhs_expiry scfhs_classification cpe_hours_ytd cpe_hours_required iqama_number iqama_expiry passport_number passport_expiry',
    });
    if (!emp) {
      if (viewerMode === 'admin_no_target') {
        return res.json({
          credentials: [],
          cpe: { year: new Date().getFullYear(), ytd: 0, required: 30, activities: [] },
          viewerMode,
        });
      }
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

// ── Clinical signals (W237) ───────────────────────────────────────────────────
// Roll-up of the Outcomes-vertical (W210→W232) signals the therapist needs
// to act on today: W214 reassessment tasks + W221 measure alerts, grouped
// per beneficiary, sorted most-actionable first. Empty array when no
// beneficiary has any open signal.
//
// Bare-array contract: admin-no-target returns `[]`, matching /schedule,
// /beneficiaries, /assessments.
const _therapistClinicalSignalsSvc = require('../services/therapistClinicalSignals.service');
router.get('/clinical-signals', authenticate, requireTherapistRole, async (req, res) => {
  try {
    const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
    if (!employeeId) {
      if (viewerMode === 'admin_no_target') return res.json([]);
      return res
        .status(404)
        .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
    }
    const signals = await _therapistClinicalSignalsSvc.getSignalsForTherapist({ employeeId });
    return res.json(signals);
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to load clinical signals',
    });
  }
});

// ── Clinical signals drill-down (W239) ────────────────────────────────────────
// Per-beneficiary detail page for the row clicked on the
// ClinicalSignalsCard. Returns:
//   - beneficiary header (name + number)
//   - open W214 tasks (full detail including phase, dueAt, eventTriggerCode)
//   - open W221 alerts (evidence object, severity)
//   - W232 progress narratives (best-effort — interpreter may be unavailable)
//
// Therapist viewers are gated by 12-month caseload check; admin viewers
// (resolved via ?employeeId=) skip the gate because the picker already
// targeted a specific employee. Returns 404 when the beneficiary isn't
// reachable from the targeted therapist's caseload.
router.get(
  '/clinical-signals/:beneficiaryId',
  authenticate,
  requireTherapistRole,
  async (req, res) => {
    try {
      const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
      if (!employeeId) {
        // No target therapist resolved — admin previewer w/o pick, or
        // therapist w/o Employee record. Don't leak per-beneficiary data
        // in either case.
        if (viewerMode === 'admin_no_target') {
          return res.status(404).json({
            error: 'NoTargetTherapist',
            message: 'اختر معالجاً من قائمة الإدارة لعرض التفاصيل.',
          });
        }
        return res
          .status(404)
          .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
      }
      if (!isValidObjectId(req.params.beneficiaryId)) {
        return res
          .status(400)
          .json({ error: 'InvalidId', message: 'beneficiaryId is not a valid ObjectId' });
      }
      const detail = await _therapistClinicalSignalsSvc.getBeneficiaryDetail({
        employeeId,
        beneficiaryId: req.params.beneficiaryId,
        skipCaseloadCheck: viewerMode === 'admin_targeted',
      });
      if (!detail) {
        return res
          .status(404)
          .json({ error: 'NotFound', message: 'beneficiary not on your caseload or not found' });
      }
      return res.json(detail);
    } catch (err) {
      return res.status(500).json({
        error: 'InternalError',
        message: err instanceof Error ? err.message : 'failed to load beneficiary clinical detail',
      });
    }
  }
);

// ── Clinical signals mutations (W241) ─────────────────────────────────────────
// Lets the therapist close out the loop on items surfaced by W237/W239:
//   POST .../tasks/:taskId/ack    — acknowledge a W214 reassessment task
//   POST .../alerts/:alertId/ack  — acknowledge a W221 measure alert
//   POST .../alerts/:alertId/resolve — resolve a W221 measure alert
//
// Dismiss/cancel intentionally NOT exposed here — per CBAHI/SoD review
// those transitions likely need an actor different from the original
// raiser. Add later behind a separate role check if the workflow needs it.
//
// Authorization: same caseload predicate as the read endpoints — fetch
// the doc, verify Appointment.exists for (target therapist, beneficiary,
// 12-month window). Admin viewers (?employeeId=…) check against the
// previewed therapist, so admin can't act outside that scope either.

const _reassessmentLifecycleSvc = require('../services/reassessmentLifecycle.service');
const _measureAlertEngineSvc = require('../services/measureAlertEngine.service');

async function _ownsCaseloadItem(item, employeeId, skipCaseloadCheck) {
  if (!item) return false;
  if (skipCaseloadCheck) return true;
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const owned = await Appointment().exists({
    therapist: employeeId,
    beneficiary: item.beneficiaryId,
    date: { $gte: since },
  });
  return Boolean(owned);
}

router.post(
  '/clinical-signals/tasks/:taskId/ack',
  authenticate,
  requireTherapistRole,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
      if (!employeeId) {
        if (viewerMode === 'admin_no_target') {
          return res
            .status(404)
            .json({ error: 'NoTargetTherapist', message: 'اختر معالجاً قبل اتخاذ إجراء.' });
        }
        return res
          .status(404)
          .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
      }
      if (!isValidObjectId(req.params.taskId)) {
        return res
          .status(400)
          .json({ error: 'InvalidId', message: 'taskId is not a valid ObjectId' });
      }
      const MeasureReassessmentTask = require('../domains/goals/models/MeasureReassessmentTask');
      const task = await MeasureReassessmentTask.findById(req.params.taskId)
        .select('_id beneficiaryId status')
        .lean();
      const owned = await _ownsCaseloadItem(task, employeeId, viewerMode === 'admin_targeted');
      if (!owned) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'task not found or beneficiary not on your caseload',
        });
      }
      const updated = await _reassessmentLifecycleSvc.acknowledgeTask({
        taskId: req.params.taskId,
        actor: { userId },
      });
      audit('clinical.measure_task_acknowledged', req, {
        actionDetails: { taskId: req.params.taskId, beneficiaryId: String(task.beneficiaryId) },
        affectedResources: [{ type: 'MeasureReassessmentTask', id: req.params.taskId }],
      });
      return res.json({
        id: String(updated._id || updated.id),
        status: updated.status,
        acknowledgedAt: updated.acknowledgedAt
          ? new Date(updated.acknowledgedAt).toISOString()
          : null,
      });
    } catch (err) {
      return res.status(500).json({
        error: 'InternalError',
        message: err instanceof Error ? err.message : 'failed to acknowledge task',
      });
    }
  }
);

router.post(
  '/clinical-signals/alerts/:alertId/ack',
  authenticate,
  requireTherapistRole,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
      if (!employeeId) {
        if (viewerMode === 'admin_no_target') {
          return res
            .status(404)
            .json({ error: 'NoTargetTherapist', message: 'اختر معالجاً قبل اتخاذ إجراء.' });
        }
        return res
          .status(404)
          .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
      }
      if (!isValidObjectId(req.params.alertId)) {
        return res
          .status(400)
          .json({ error: 'InvalidId', message: 'alertId is not a valid ObjectId' });
      }
      const MeasureAlert = require('../domains/goals/models/MeasureAlert');
      const alert = await MeasureAlert.findById(req.params.alertId)
        .select('_id beneficiaryId status')
        .lean();
      const owned = await _ownsCaseloadItem(alert, employeeId, viewerMode === 'admin_targeted');
      if (!owned) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'alert not found or beneficiary not on your caseload',
        });
      }
      try {
        const updated = await _measureAlertEngineSvc.acknowledge(req.params.alertId, userId);
        audit('clinical.measure_alert_acknowledged', req, {
          actionDetails: {
            alertId: req.params.alertId,
            beneficiaryId: String(alert.beneficiaryId),
          },
          affectedResources: [{ type: 'MeasureAlert', id: req.params.alertId }],
        });
        return res.json({
          id: req.params.alertId,
          status: updated?.status || 'acknowledged',
          acknowledgedAt: updated?.acknowledgedAt
            ? new Date(updated.acknowledgedAt).toISOString()
            : null,
        });
      } catch (svcErr) {
        // Alert engine throws when status !== 'open' (already resolved /
        // dismissed). Translate to 409 so the UI shows "already handled"
        // instead of a generic 500.
        return res.status(409).json({
          error: 'Conflict',
          message: svcErr instanceof Error ? svcErr.message : 'cannot acknowledge alert',
        });
      }
    } catch (err) {
      return res.status(500).json({
        error: 'InternalError',
        message: err instanceof Error ? err.message : 'failed to acknowledge alert',
      });
    }
  }
);

router.post(
  '/clinical-signals/alerts/:alertId/resolve',
  authenticate,
  requireTherapistRole,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
      if (!employeeId) {
        if (viewerMode === 'admin_no_target') {
          return res
            .status(404)
            .json({ error: 'NoTargetTherapist', message: 'اختر معالجاً قبل اتخاذ إجراء.' });
        }
        return res
          .status(404)
          .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
      }
      if (!isValidObjectId(req.params.alertId)) {
        return res
          .status(400)
          .json({ error: 'InvalidId', message: 'alertId is not a valid ObjectId' });
      }
      const MeasureAlert = require('../domains/goals/models/MeasureAlert');
      const alert = await MeasureAlert.findById(req.params.alertId)
        .select('_id beneficiaryId status')
        .lean();
      const owned = await _ownsCaseloadItem(alert, employeeId, viewerMode === 'admin_targeted');
      if (!owned) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'alert not found or beneficiary not on your caseload',
        });
      }
      const updated = await _measureAlertEngineSvc.resolve(req.params.alertId, {
        actorId: userId,
        mode: 'manual',
      });
      audit('clinical.measure_alert_resolved', req, {
        actionDetails: { alertId: req.params.alertId, beneficiaryId: String(alert.beneficiaryId) },
        affectedResources: [{ type: 'MeasureAlert', id: req.params.alertId }],
      });
      return res.json({
        id: req.params.alertId,
        status: updated?.status || 'resolved',
        resolvedAt: updated?.resolvedAt ? new Date(updated.resolvedAt).toISOString() : null,
      });
    } catch (err) {
      return res.status(500).json({
        error: 'InternalError',
        message: err instanceof Error ? err.message : 'failed to resolve alert',
      });
    }
  }
);

// ── Alert dismiss (W250) ─────────────────────────────────────────────────────
// Closes a W221 alert as false-positive / no-action-needed. Distinct from
// `resolve` (which means "I addressed the underlying issue"). The W221
// model enforces a non-empty dismissalReason via Wave-18 invariant; we
// match the front-end audit standard (≥10 chars) to keep the audit log
// useful.
//
// SoD note: same caseload-gating as ack/resolve — therapist dismisses
// their own beneficiaries' alerts. The dismissedBy stamp is the audit
// trail; if dismissals later prove abusive, they're attributable. No
// "must differ from raiser" rule because the raiser is the engine, not
// a user. If a stricter SoD ever lands (e.g. supervisor-only dismiss),
// it goes behind a separate role gate, not in this route.
router.post(
  '/clinical-signals/alerts/:alertId/dismiss',
  authenticate,
  requireTherapistRole,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      const { employeeId, viewerMode } = await resolveTargetEmployee(req, { select: '_id' });
      if (!employeeId) {
        if (viewerMode === 'admin_no_target') {
          return res
            .status(404)
            .json({ error: 'NoTargetTherapist', message: 'اختر معالجاً قبل اتخاذ إجراء.' });
        }
        return res
          .status(404)
          .json({ error: 'EmployeeNotFound', message: 'No Employee record for this user.' });
      }
      if (!isValidObjectId(req.params.alertId)) {
        return res
          .status(400)
          .json({ error: 'InvalidId', message: 'alertId is not a valid ObjectId' });
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (reason.length < 10) {
        return res.status(400).json({
          error: 'InvalidReason',
          message: 'سبب الصرف مطلوب (١٠ أحرف على الأقل).',
        });
      }
      const MeasureAlert = require('../domains/goals/models/MeasureAlert');
      const alert = await MeasureAlert.findById(req.params.alertId)
        .select('_id beneficiaryId status')
        .lean();
      const owned = await _ownsCaseloadItem(alert, employeeId, viewerMode === 'admin_targeted');
      if (!owned) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'alert not found or beneficiary not on your caseload',
        });
      }
      try {
        const updated = await _measureAlertEngineSvc.dismiss(req.params.alertId, {
          actorId: userId,
          reason,
        });
        audit('clinical.measure_alert_dismissed', req, {
          actionDetails: {
            alertId: req.params.alertId,
            beneficiaryId: String(alert.beneficiaryId),
            reasonLen: reason.length,
          },
          affectedResources: [{ type: 'MeasureAlert', id: req.params.alertId }],
        });
        return res.json({
          id: req.params.alertId,
          status: updated?.status || 'dismissed',
          dismissedAt: updated?.dismissedAt ? new Date(updated.dismissedAt).toISOString() : null,
        });
      } catch (svcErr) {
        // Service throws on terminal status (resolved/dismissed) — surface
        // as 409 so the UI shows "أُغلق سابقاً" instead of a 500.
        return res.status(409).json({
          error: 'Conflict',
          message: svcErr instanceof Error ? svcErr.message : 'cannot dismiss alert',
        });
      }
    } catch (err) {
      return res.status(500).json({
        error: 'InternalError',
        message: err instanceof Error ? err.message : 'failed to dismiss alert',
      });
    }
  }
);

module.exports = router;
