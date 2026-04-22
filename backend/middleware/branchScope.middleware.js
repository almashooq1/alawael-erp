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

/**
 * requireBranchAccess
 * Middleware يتحقق من أن المستخدم إما:
 * - لديه دور عام (CROSS_BRANCH_ROLES) فيرى كل الفروع
 * - أو مرتبط بفرع محدد فيُقيَّد بفرعه فقط
 */
const requireBranchAccess = (req, res, next) => {
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

  if (!userBranchId) {
    logger.warn(`[BranchScope] User ${req.user.id || req.user._id} has no branchId assigned`);
    // إذا لم يكن للمستخدم فرع، اسمح بالوصول مع تسجيل تحذير
    req.branchScope = { restricted: false, branchId: null, allBranches: true };
    return next();
  }

  // إذا طلب المستخدم فرعاً مختلفاً عن فرعه، ارفض
  if (requestedBranchId && String(requestedBranchId) !== String(userBranchId)) {
    logger.warn(
      `[BranchScope] Access denied: user ${req.user.id} (branch ${userBranchId}) tried to access branch ${requestedBranchId}`
    );
    return res.status(403).json({
      success: false,
      message: 'غير مسموح — لا يمكنك الوصول لبيانات فرع آخر',
    });
  }

  req.branchScope = {
    restricted: true,
    branchId: userBranchId,
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
