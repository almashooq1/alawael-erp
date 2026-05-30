/**
 * Branch Scope Middleware — middleware عزل بيانات الفروع
 *
 * يضمن أن كل مستخدم لا يرى أو يعدّل إلا بيانات فرعه.
 * يُطبَّق تلقائياً على كل طلب مصادق (authenticated request).
 *
 * الاستخدام في router:
 *   const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
 *   router.get('/beneficiaries', requireAuth, requireBranchAccess, async (req, res) => { ... });
 *   // ثم في الاستعلام:
 *   const filter = branchFilter(req); // { branchId: req.user.branchId } أو {}
 *   const records = await Model.find(filter);
 */
'use strict';

const logger = require('../utils/logger');
const {
  CROSS_BRANCH_ROLES,
  REGION_SCOPED_ROLES,
  resolveRole,
} = require('../config/constants/roles.constants');
const { TENANT_FIELD } = require('../config/constants/tenant.constants');

// ─────────────────────────────────────────────────────────────────────
// W597 — activate the dormant UserBranchRole secondment / acting-role
// model. Audit 2026-05-30 found UserBranchRole built+tested but with NO
// request-time consumer: a Riyadh→Jeddah secondment was unreachable; the
// only wired cross-branch paths were CROSS_BRANCH_ROLES (all 13) and
// REGION_SCOPED_ROLES (whole region). This wires the fine-grained,
// audited, time-windowed grant into the branch scope decision.
//
// BOTH new behaviours are env-gated and DEFAULT OFF so the wave is inert
// on deploy (zero new per-request query, byte-identical scope output):
//   • ENABLE_USER_BRANCH_ROLE_SCOPE=true → expand active secondments.
//   • BRANCH_SCOPE_FAIL_CLOSED=true      → deny (not allow-all) when a
//     restricted-tier user has no branchId AND no active secondment.
//       This closes the fail-OPEN hole at the no-branch path below; keep
//       OFF until `npm run audit:no-branch-users` confirms no legitimate
//       branch-less service/admin account would be locked out.
//
// Lazy process.env reads per the codebase Dynatrace doctrine.
const isSecondmentScopeEnabled = () =>
  String(process.env.ENABLE_USER_BRANCH_ROLE_SCOPE || '').toLowerCase() === 'true';
const isBranchScopeFailClosed = () =>
  String(process.env.BRANCH_SCOPE_FAIL_CLOSED || '').toLowerCase() === 'true';
// C4 — durable audit of cross-branch ACCESS DENIALS. A restricted user actively
// requesting another branch's data is the tenant-probing security signal; today
// it only hits logger.warn (invisible to alerting/forensics). When enabled this
// writes a fire-and-forget AuditLog row on the denial path. Env-gated DEFAULT
// OFF — inert on deploy AND in the middleware unit tests (where Mongoose has no
// connection and an un-gated .create() would buffer/hang per the CLAUDE.md
// gotcha). Lazy process.env read (Dynatrace doctrine).
const isBranchDenialAuditEnabled = () =>
  String(process.env.ENABLE_BRANCH_DENIAL_AUDIT || '').toLowerCase() === 'true';

/**
 * Resolve the set of branch IDs a user is actively seconded into via
 * UserBranchRole (status=active + window covers now). Lazy-require the
 * model (circular-import safety, matches the Branch lazy-require below).
 * On ANY error returns [] — secondment NEVER widens scope on failure
 * (fail-safe: the user keeps only their primary branch).
 *
 * @param {object} user - req.user
 * @returns {Promise<string[]>} distinct seconded branchId strings
 */
async function resolveSecondedBranchIds(user) {
  try {
    const UserBranchRole = require('../models/UserBranchRole');
    const userId = user.id || user._id;
    if (!userId) return [];
    const active = await UserBranchRole.findActiveForUser(userId);
    return [...new Set((active || []).map(a => String(a.branchId)).filter(Boolean))];
  } catch (err) {
    logger.error('[BranchScope] secondment expansion failed (fail-safe → []):', err.message);
    return [];
  }
}

/**
 * C4 — fire-and-forget durable audit of a cross-branch access denial. NEVER
 * awaited, NEVER throws (wrapped + .catch), NEVER blocks the 403. No-op unless
 * ENABLE_BRANCH_DENIAL_AUDIT=true, so existing tests + un-migrated deploys are
 * unaffected. This is the "separate write, not the request txn" C4 prescribes:
 * an Express middleware denial is not inside a Mongo txn, so the row survives.
 *
 * @param {object} req
 * @param {string|number} attemptedBranchId - the foreign branch the user asked for
 * @param {string} reason - machine code, e.g. 'foreign_branch_request'
 */
function auditBranchDenial(req, attemptedBranchId, reason) {
  if (!isBranchDenialAuditEnabled()) return;
  try {
    const AuditLog = require('../models/AuditLog');
    const userId = (req.user && (req.user.id || req.user._id)) || null;
    AuditLog.create({
      action: 'branch.access.denied',
      userId,
      performedBy: userId,
      details: {
        reason,
        attemptedBranchId: String(attemptedBranchId || ''),
        userBranchId: String((req.user && (req.user.branchId || req.user.branch_id)) || ''),
        role: resolveRole((req.user && (req.user.role || req.user.roles?.[0])) || ''),
        path: req.originalUrl || req.path || '',
      },
      timestamp: new Date(),
      ip: (req.ip || (req.headers && req.headers['x-forwarded-for']) || '').toString(),
    }).catch(err =>
      logger.error('[BranchScope] denial audit write failed (non-blocking):', err.message)
    );
  } catch (err) {
    logger.error('[BranchScope] denial audit setup failed (non-blocking):', err.message);
  }
}

/**
 * requireBranchAccess
 * Middleware يتحقق من أن المستخدم إما:
 * - لديه دور عام (CROSS_BRANCH_ROLES) فيرى كل الفروع
 * - أو مرتبط بفرع محدد فيُقيَّد بفرعه فقط
 *
 * NOTE: async since W597 (secondment expansion may await a DB lookup).
 * When ENABLE_USER_BRANCH_ROLE_SCOPE is off, NO await is reached on any
 * path, so the function still completes synchronously — preserving the
 * direct-call ergonomics of the existing middleware unit tests.
 */
const requireBranchAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مصرح — يجب تسجيل الدخول' });
  }

  const role = resolveRole(req.user.role || req.user.roles?.[0]);

  // المستخدمون ذوو الصلاحية العامة يستطيعون الوصول لكل الفروع
  if (CROSS_BRANCH_ROLES.includes(role)) {
    req.branchScope = { restricted: false, branchId: null, allBranches: true };
    return next();
  }

  // Phase 7 — region-scoped roles see every branch in their
  // regionIds[]. The tenantScope plugin / consumers that read
  // `req.branchScope.regionIds` can expand to a branch $in via a
  // separate helper (resolveRegionBranches below). Without regionIds,
  // the user has no valid scope — deny (fall through to the no-branch
  // warning path is NOT safe for a regional role).
  if (REGION_SCOPED_ROLES.includes(role)) {
    const regionIds = req.user.regionIds || [];
    if (regionIds.length === 0) {
      logger.warn(
        `[BranchScope] Region-scoped user ${req.user.id || req.user._id} role=${role} ` +
          'has no regionIds — denying (config error).'
      );
      return res.status(403).json({
        success: false,
        message: 'غير مسموح — دورك يتطلب تخصيص منطقة لم يتم تعيينها بعد',
      });
    }
    req.branchScope = {
      restricted: true,
      regional: true,
      branchId: null,
      regionIds,
      allBranches: false,
    };
    return next();
  }

  // إذا طُلب فرع محدد عبر query parameter وكان المستخدم يملك صلاحية
  const requestedBranchId = req.query.branchId || req.body?.branchId || req.params?.branchId;
  const userBranchId = req.user.branchId || req.user.branch_id || req.user.branch;

  // W597 — active secondments / acting-role grants (env-gated, default
  // off → []). These widen the restricted user's accessible branch set
  // without granting a coarse CROSS_BRANCH / region role.
  const secondedBranchIds = isSecondmentScopeEnabled()
    ? await resolveSecondedBranchIds(req.user)
    : [];

  if (!userBranchId) {
    // A user with no primary branch but WITH an active secondment is
    // legitimately restricted to those seconded branches.
    if (secondedBranchIds.length > 0) {
      req.branchScope = {
        restricted: true,
        branchId: secondedBranchIds[0],
        branchIds: secondedBranchIds,
        allBranches: false,
      };
      return next();
    }
    logger.warn(`[BranchScope] User ${req.user.id || req.user._id} has no branchId assigned`);
    // W597 — fail-CLOSED (gated). Historically this path failed OPEN
    // (allBranches:true), so a misconfigured restricted-tier account read
    // every branch. With BRANCH_SCOPE_FAIL_CLOSED=true we deny instead,
    // matching the tenantScope plugin's `unscoped` fail-closed posture.
    if (isBranchScopeFailClosed()) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح — لا يوجد فرع مخصّص لحسابك (راجع المسؤول)',
      });
    }
    // Legacy fail-open (default) — preserved until the audit clears the flip.
    req.branchScope = { restricted: false, branchId: null, allBranches: true };
    return next();
  }

  // The user's full allowed set = primary branch ∪ active secondments.
  const allowedBranchIds = [...new Set([String(userBranchId), ...secondedBranchIds])];

  // إذا طلب المستخدم فرعاً مختلفاً، اسمح فقط إن كان ضمن نطاقه (فرعه أو ندب فعّال)
  if (requestedBranchId && !allowedBranchIds.includes(String(requestedBranchId))) {
    logger.warn(
      `[BranchScope] Access denied: user ${req.user.id} (branch ${userBranchId}) tried to access branch ${requestedBranchId}`
    );
    auditBranchDenial(req, requestedBranchId, 'foreign_branch_request'); // C4 (fire-and-forget, env-gated)
    return res.status(403).json({
      success: false,
      message: 'غير مسموح — لا يمكنك الوصول لبيانات فرع آخر',
    });
  }

  // When the caller explicitly names an allowed branch, narrow scope to
  // that single branch for this request (intuitive: they chose one).
  if (requestedBranchId) {
    req.branchScope = {
      restricted: true,
      branchId: String(requestedBranchId),
      allBranches: false,
    };
    return next();
  }

  req.branchScope = {
    restricted: true,
    branchId: userBranchId,
    // Only emit branchIds[] when there's a genuine multi-branch set —
    // keeps the single-branch output byte-identical to pre-W597 (exact
    // shape the existing middleware unit tests assert via toEqual()).
    ...(allowedBranchIds.length > 1 ? { branchIds: allowedBranchIds } : {}),
    allBranches: false,
  };

  return next();
};

/**
 * branchFilter(req)
 * Returns a synchronous MongoDB filter appropriate for the user's
 * scope.
 *
 *   • Unrestricted / allBranches  → {}
 *   • Single-branch restricted    → { branchId: <user's branch> }
 *   • Regional (Phase 7)          → emits `{ __pending_region_expand__:
 *     regionIds }` which the caller must resolve via
 *     `resolveRegionalBranchFilter(req)` below. Using a marker rather
 *     than a real $in keeps branchFilter synchronous; routes that
 *     serve region-scoped roles MUST await the async variant.
 */
const branchFilter = req => {
  if (!req.branchScope || req.branchScope.allBranches) return {};
  if (req.branchScope.regional) {
    return { __pending_region_expand__: req.branchScope.regionIds };
  }
  // W597 — multi-branch (secondment) users filter by $in over their set.
  if (Array.isArray(req.branchScope.branchIds) && req.branchScope.branchIds.length > 1) {
    return { [TENANT_FIELD]: { $in: req.branchScope.branchIds } };
  }
  return { [TENANT_FIELD]: req.branchScope.branchId };
};

/**
 * resolveRegionalBranchFilter(req) — async variant that actually
 * resolves regionIds[] to the list of Branch._id in those regions.
 * Caches the result on `req.branchScope._resolvedBranchIds` so
 * repeated calls inside the same request don't re-query Branches.
 *
 * For non-regional users, behaves identically to branchFilter().
 */
const resolveRegionalBranchFilter = async req => {
  if (!req.branchScope || req.branchScope.allBranches) return {};
  if (!req.branchScope.regional) {
    // W597 — honour the multi-branch (secondment) set when present.
    if (Array.isArray(req.branchScope.branchIds) && req.branchScope.branchIds.length > 1) {
      return { [TENANT_FIELD]: { $in: req.branchScope.branchIds } };
    }
    return { [TENANT_FIELD]: req.branchScope.branchId };
  }

  if (!req.branchScope._resolvedBranchIds) {
    try {
      // Lazy-require Branch to avoid circular-import risk at middleware
      // load time.
      const Branch = require('../models/Branch');
      const branches = await Branch.find({
        regionId: { $in: req.branchScope.regionIds },
      })
        .select('_id')
        .lean();
      req.branchScope._resolvedBranchIds = branches.map(b => b._id);
    } catch (err) {
      logger.error('[BranchScope] resolveRegionalBranchFilter failed:', err.message);
      req.branchScope._resolvedBranchIds = [];
    }
  }

  return { [TENANT_FIELD]: { $in: req.branchScope._resolvedBranchIds } };
};

/**
 * branchId(req)
 * دالة مساعدة تُعيد branchId المستخدم الحالي (أو null للمدير العام)
 */
const branchId = req => {
  if (!req.branchScope || req.branchScope.allBranches) return null;
  return req.branchScope.branchId;
};

/**
 * injectBranchToBody
 * Middleware يضيف branchId تلقائياً لجسم الطلب (POST/PUT)
 * مفيد عند إنشاء أو تعديل سجلات
 */
const injectBranchToBody = (req, _res, next) => {
  if (req.branchScope?.branchId && req.method !== 'GET') {
    req.body = req.body || {};
    if (!req.body.branchId && !req.body.branch) {
      req.body.branchId = req.branchScope.branchId;
    }
  }
  next();
};

/**
 * validateBranchExists
 * Middleware يتحقق من وجود الفرع في قاعدة البيانات (اختياري)
 */
const validateBranchExists = async (req, res, next) => {
  try {
    const targetBranchId = req.params.branchId || req.query.branchId;
    if (!targetBranchId) return next();

    // تحقق أساسي من صيغة الـ ID
    if (!/^[a-fA-F0-9]{24}$/.test(String(targetBranchId))) {
      return res.status(400).json({ success: false, message: 'معرّف الفرع غير صحيح' });
    }

    // إذا كان المستخدم ليس مديراً عاماً، تحقق من أن الفرع هو فرعه
    if (req.branchScope?.restricted) {
      if (String(targetBranchId) !== String(req.branchScope.branchId)) {
        return res.status(403).json({
          success: false,
          message: 'غير مسموح — لا تملك صلاحية الوصول لهذا الفرع',
        });
      }
    }

    next();
  } catch (err) {
    logger.error('[BranchScope] validateBranchExists error:', err.message);
    next(err);
  }
};

module.exports = {
  requireBranchAccess,
  branchFilter,
  resolveRegionalBranchFilter,
  branchId,
  injectBranchToBody,
  validateBranchExists,
  CROSS_BRANCH_ROLES,
  REGION_SCOPED_ROLES,
};
