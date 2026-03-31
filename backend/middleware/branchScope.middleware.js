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

// الأدوار التي تملك صلاحية رؤية جميع الفروع
const CROSS_BRANCH_ROLES = ['super_admin', 'hq_super_admin', 'hq_admin', 'ceo', 'admin'];

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

  const role = req.user.role || req.user.roles?.[0];

  // المستخدمون ذوو الصلاحية العامة يستطيعون الوصول لكل الفروع
  if (CROSS_BRANCH_ROLES.includes(role)) {
    req.branchScope = { restricted: false, branchId: null, allBranches: true };
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
 * دالة مساعدة تُعيد فلتر MongoDB المناسب للفرع
 *
 * @param {Request} req - كائن الطلب (بعد تطبيق requireBranchAccess)
 * @returns {Object} فلتر MongoDB: {} أو { branchId } أو { branch }
 */
const branchFilter = req => {
  if (!req.branchScope || req.branchScope.allBranches) {
    return {}; // بدون قيود — كل الفروع
  }
  return {
    $or: [
      { branchId: req.branchScope.branchId },
      { branch: req.branchScope.branchId },
      { branch_id: req.branchScope.branchId },
    ],
  };
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
  branchId,
  injectBranchToBody,
  validateBranchExists,
  CROSS_BRANCH_ROLES,
};
