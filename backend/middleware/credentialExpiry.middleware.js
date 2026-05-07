/**
 * checkCredentialExpiry — BC-07
 * يتحقق من صلاحية الاعتمادات الإلزامية للكوادر الصحية ويمنع
 * الوصول إلى المسارات السريرية إذا انتهت صلاحية:
 *   - SCFHS (الهيئة السعودية للتخصصات الصحية)
 *   - الإقامة (iqama_expiry)
 *   - الهوية الوطنية (national_id_expiry)
 *
 * يُطبَّق فقط على الأدوار السريرية. الموظفون الإداريون مستثنون.
 * يُسجَّل كل طلب مرفوض في Audit Trail.
 */
const Employee = require('../models/HR/Employee');
const logger = require('../utils/logger');

// الأدوار السريرية التي تستلزم التحقق من صلاحية SCFHS/الإقامة
const CLINICAL_ROLES = new Set([
  'therapist',
  'psychologist',
  'clinical_supervisor',
  'occupational_therapist',
  'speech_therapist',
  'physiotherapist',
  'behavioral_therapist',
  'nurse',
  'clinical_staff',
]);

/**
 * checkCredentialExpiry(options)
 *
 * @param {Object}  [opts]
 * @param {boolean} [opts.scfhs=true]        - تحقق من SCFHS
 * @param {boolean} [opts.iqama=true]         - تحقق من الإقامة
 * @param {boolean} [opts.nationalId=true]    - تحقق من الهوية الوطنية
 * @param {boolean} [opts.warnOnly=false]     - وضع التحذير فقط (لا يرفض الطلب)
 * @returns Express middleware function
 */
const checkCredentialExpiry =
  (opts = {}) =>
  async (req, res, next) => {
    const { scfhs = true, iqama = true, nationalId = true, warnOnly = false } = opts;

    try {
      // تخطي إذا لم يكن هناك مستخدم مُوثَّق
      if (!req.user) return next();

      const userRole = req.user.role || req.user.userType || '';

      // تخطي الأدوار غير السريرية
      if (!CLINICAL_ROLES.has(userRole)) return next();

      // استخراج employeeId من token أو user object
      const employeeId =
        req.user.employeeId || req.user.employee_id || req.user.employeeProfile?._id;

      if (!employeeId) return next(); // لا يوجد ربط بسجل موظف

      const employee = await Employee.findById(employeeId)
        .select('scfhs_expiry iqama_expiry national_id_expiry fullName')
        .lean();

      if (!employee) return next();

      const now = new Date();
      const expired = [];

      if (scfhs && employee.scfhs_expiry && new Date(employee.scfhs_expiry) < now) {
        expired.push({
          field: 'scfhs_expiry',
          label: 'ترخيص SCFHS',
          expiredAt: employee.scfhs_expiry,
        });
      }

      if (iqama && employee.iqama_expiry && new Date(employee.iqama_expiry) < now) {
        expired.push({
          field: 'iqama_expiry',
          label: 'الإقامة',
          expiredAt: employee.iqama_expiry,
        });
      }

      if (
        nationalId &&
        employee.national_id_expiry &&
        new Date(employee.national_id_expiry) < now
      ) {
        expired.push({
          field: 'national_id_expiry',
          label: 'الهوية الوطنية',
          expiredAt: employee.national_id_expiry,
        });
      }

      if (expired.length === 0) return next();

      logger.warn(
        `[credentialExpiry] Blocked request: employee=${employeeId} role=${userRole} path=${req.path} expired=${expired.map(e => e.field).join(',')}`,
        { userId: req.user._id, employeeId, expired }
      );

      if (warnOnly) {
        // أرفق التحذير دون حجب الطلب
        req.credentialWarning = expired;
        return next();
      }

      return res.status(403).json({
        success: false,
        credentialExpired: true,
        message: 'انتهت صلاحية اعتمادات الموظف — يرجى تجديدها قبل الاستمرار',
        expired,
      });
    } catch (err) {
      // لا نوقف تدفق الطلبات بسبب خطأ في التحقق
      logger.error('[credentialExpiry] middleware error', { error: err.message });
      return next();
    }
  };

/**
 * getExpiryReport — مساعد لمسار تقارير الاعتمادات المنتهية
 * يُستخدم مباشرة في مسار GET /api/admin/hr/credential-expiry
 */
const getExpiryReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 90;
    const employees = await Employee.findExpiringDocuments(days);
    return res.json({ success: true, data: employees, total: employees.length, days });
  } catch (err) {
    logger.error('[credentialExpiry] getExpiryReport error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في جلب تقرير الاعتمادات' });
  }
};

module.exports = { checkCredentialExpiry, getExpiryReport };
