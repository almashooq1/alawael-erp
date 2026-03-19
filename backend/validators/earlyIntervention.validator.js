/**
 * Early Intervention Validators — مدققات نظام التدخل المبكر
 *
 * Express-validator chains for all EIS endpoints.
 */

const { body, param, query } = require('express-validator');

// ── Shared helpers ──
const mongoIdParam = (field = 'id') =>
  param(field).isMongoId().withMessage(`معرف ${field} غير صالح`);

const mongoIdBody = (field, label) => body(field).isMongoId().withMessage(`معرف ${label} غير صالح`);

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('رقم الصفحة غير صالح').toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('حد النتائج غير صالح').toInt(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['1', '-1', 'asc', 'desc']),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHILDREN — ملفات الأطفال
// ═══════════════════════════════════════════════════════════════════════════════

const validateCreateChild = [
  body('firstName').notEmpty().withMessage('الاسم الأول مطلوب').trim(),
  body('lastName').notEmpty().withMessage('اسم العائلة مطلوب').trim(),
  body('gender').isIn(['MALE', 'FEMALE']).withMessage('الجنس يجب أن يكون MALE أو FEMALE'),
  body('birthInfo.birthDate').notEmpty().withMessage('تاريخ الميلاد مطلوب').isISO8601().toDate(),
  body('birthInfo.gestationalAge')
    .optional()
    .isInt({ min: 20, max: 45 })
    .withMessage('عمر الحمل يجب أن يكون بين 20 و 45 أسبوع'),
  body('birthInfo.birthWeight').optional().isNumeric().withMessage('وزن الولادة يجب أن يكون رقماً'),
  body('birthInfo.apgarScore1Min')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('درجة أبغار يجب أن تكون بين 0 و 10'),
  body('birthInfo.apgarScore5Min')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('درجة أبغار يجب أن تكون بين 0 و 10'),
  body('birthInfo.deliveryType').optional().isIn(['VAGINAL', 'CESAREAN', 'ASSISTED', 'OTHER']),
  body('disabilityType')
    .optional()
    .isIn([
      'INTELLECTUAL',
      'PHYSICAL',
      'SENSORY_VISUAL',
      'SENSORY_AUDITORY',
      'SPEECH_LANGUAGE',
      'AUTISM_SPECTRUM',
      'DEVELOPMENTAL_DELAY',
      'GENETIC',
      'NEUROLOGICAL',
      'MULTIPLE',
      'AT_RISK',
      'UNDIAGNOSED',
      'OTHER',
    ]),
  body('disabilitySeverity').optional().isIn(['MILD', 'MODERATE', 'SEVERE', 'PROFOUND']),
  body('parents').optional().isArray().withMessage('بيانات الوالدين يجب أن تكون مصفوفة'),
  body('parents.*.name').optional().notEmpty().withMessage('اسم ولي الأمر مطلوب'),
  body('parents.*.relationship')
    .optional()
    .isIn(['MOTHER', 'FATHER', 'GUARDIAN', 'GRANDPARENT', 'OTHER']),
  body('referralSource')
    .optional()
    .isIn([
      'HOSPITAL',
      'PEDIATRICIAN',
      'SELF_REFERRAL',
      'NATIONAL_SCREENING',
      'SCHOOL',
      'COMMUNITY',
      'OTHER',
    ]),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'TRANSITIONED', 'DISCHARGED', 'WAITLISTED', 'REFERRED']),
];

const validateUpdateChild = [
  mongoIdParam('id'),
  body('firstName').optional().notEmpty().withMessage('الاسم الأول مطلوب').trim(),
  body('lastName').optional().notEmpty().withMessage('اسم العائلة مطلوب').trim(),
  body('gender').optional().isIn(['MALE', 'FEMALE']),
  body('birthInfo.birthDate').optional().isISO8601().toDate(),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'TRANSITIONED', 'DISCHARGED', 'WAITLISTED', 'REFERRED']),
  body('disabilityType')
    .optional()
    .isIn([
      'INTELLECTUAL',
      'PHYSICAL',
      'SENSORY_VISUAL',
      'SENSORY_AUDITORY',
      'SPEECH_LANGUAGE',
      'AUTISM_SPECTRUM',
      'DEVELOPMENTAL_DELAY',
      'GENETIC',
      'NEUROLOGICAL',
      'MULTIPLE',
      'AT_RISK',
      'UNDIAGNOSED',
      'OTHER',
    ]),
];

const validateGetChildren = [
  ...paginationQuery,
  query('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'TRANSITIONED', 'DISCHARGED', 'WAITLISTED', 'REFERRED']),
  query('eligibilityStatus')
    .optional()
    .isIn(['PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE', 'CONDITIONAL']),
  query('disabilityType').optional().isString(),
  query('gender').optional().isIn(['MALE', 'FEMALE']),
  query('search').optional().isString().trim(),
  query('ageMinMonths').optional().isInt({ min: 0 }).toInt(),
  query('ageMaxMonths').optional().isInt({ min: 0, max: 48 }).toInt(),
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENINGS — الفحوصات
// ═══════════════════════════════════════════════════════════════════════════════

const validateCreateScreening = [
  mongoIdBody('child', 'الطفل'),
  body('screeningDate').notEmpty().withMessage('تاريخ الفحص مطلوب').isISO8601().toDate(),
  body('childAgeMonths')
    .notEmpty()
    .withMessage('عمر الطفل بالأشهر مطلوب')
    .isInt({ min: 0, max: 48 }),
  body('overallResult')
    .notEmpty()
    .withMessage('نتيجة الفحص الإجمالية مطلوبة')
    .isIn(['TYPICAL', 'AT_RISK', 'DELAYED', 'SIGNIFICANT_DELAY', 'INCONCLUSIVE']),
  body('screeningType')
    .optional()
    .isIn(['INITIAL', 'FOLLOW_UP', 'PERIODIC', 'REFERRAL_BASED', 'RE_EVALUATION']),
  body('recommendation')
    .optional()
    .isIn([
      'NO_ACTION',
      'RESCREEN',
      'MONITOR',
      'REFER_EVALUATION',
      'REFER_INTERVENTION',
      'IMMEDIATE_INTERVENTION',
    ]),
  body('toolResults').optional().isArray(),
  body('toolResults.*.toolName').optional().notEmpty().withMessage('اسم أداة الفحص مطلوب'),
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_FOLLOW_UP']),
];

const validateUpdateScreening = [
  mongoIdParam('id'),
  body('overallResult')
    .optional()
    .isIn(['TYPICAL', 'AT_RISK', 'DELAYED', 'SIGNIFICANT_DELAY', 'INCONCLUSIVE']),
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_FOLLOW_UP']),
];

const validateGetScreenings = [
  ...paginationQuery,
  query('child').optional().isMongoId(),
  query('status').optional().isString(),
  query('overallResult').optional().isString(),
  query('screeningType').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];

// ═══════════════════════════════════════════════════════════════════════════════
// MILESTONES — المعالم التنموية
// ═══════════════════════════════════════════════════════════════════════════════

const validateCreateMilestone = [
  mongoIdBody('child', 'الطفل'),
  body('domain')
    .notEmpty()
    .withMessage('المجال التنموي مطلوب')
    .isIn([
      'COGNITIVE',
      'COMMUNICATION',
      'GROSS_MOTOR',
      'FINE_MOTOR',
      'SOCIAL_EMOTIONAL',
      'ADAPTIVE',
      'SENSORY',
    ]),
  body('milestone').notEmpty().withMessage('وصف المعلم التنموي مطلوب').trim(),
  body('expectedAgeMonths')
    .notEmpty()
    .withMessage('العمر المتوقع بالأشهر مطلوب')
    .isInt({ min: 0, max: 48 }),
  body('actualAgeMonths').optional().isInt({ min: 0, max: 60 }),
  body('status')
    .optional()
    .isIn(['NOT_YET', 'EMERGING', 'ACHIEVED', 'SKIPPED', 'REGRESSED', 'NOT_APPLICABLE']),
];

const validateUpdateMilestone = [
  mongoIdParam('id'),
  body('status')
    .optional()
    .isIn(['NOT_YET', 'EMERGING', 'ACHIEVED', 'SKIPPED', 'REGRESSED', 'NOT_APPLICABLE']),
  body('actualAgeMonths').optional().isInt({ min: 0, max: 60 }),
  body('progress').optional().isInt({ min: 0, max: 100 }),
];

const validateGetMilestones = [
  ...paginationQuery,
  query('child').optional().isMongoId(),
  query('domain').optional().isString(),
  query('status').optional().isString(),
  query('isDelayed').optional().isBoolean().toBoolean(),
  query('delaySeverity').optional().isString(),
];

// ═══════════════════════════════════════════════════════════════════════════════
// IFSP — خطط الخدمات الأسرية الفردية
// ═══════════════════════════════════════════════════════════════════════════════

const validateCreateIFSP = [
  mongoIdBody('child', 'الطفل'),
  mongoIdBody('serviceCoordinator', 'منسق الخدمات'),
  body('startDate').notEmpty().withMessage('تاريخ بدء الخطة مطلوب').isISO8601().toDate(),
  body('planType').optional().isIn(['INITIAL', 'ANNUAL_REVIEW', 'PERIODIC_REVIEW', 'AMENDMENT']),
  body('goals').optional().isArray(),
  body('goals.*.domain')
    .optional()
    .isIn(['COGNITIVE', 'COMMUNICATION', 'PHYSICAL', 'ADAPTIVE', 'SOCIAL_EMOTIONAL', 'SENSORY']),
  body('goals.*.goalStatement').optional().notEmpty().withMessage('نص الهدف مطلوب'),
  body('services').optional().isArray(),
  body('services.*.serviceType')
    .optional()
    .isIn([
      'SPEECH_THERAPY',
      'OCCUPATIONAL_THERAPY',
      'PHYSICAL_THERAPY',
      'BEHAVIORAL_THERAPY',
      'SPECIAL_EDUCATION',
      'AUDIOLOGY',
      'VISION_SERVICES',
      'NUTRITION',
      'PSYCHOLOGY',
      'SOCIAL_WORK',
      'NURSING',
      'ASSISTIVE_TECHNOLOGY',
      'FAMILY_TRAINING',
      'TRANSPORTATION',
      'RESPITE_CARE',
      'OTHER',
    ]),
  body('status')
    .optional()
    .isIn([
      'DRAFT',
      'PENDING_APPROVAL',
      'ACTIVE',
      'IN_REVIEW',
      'AMENDED',
      'COMPLETED',
      'CANCELLED',
    ]),
];

const validateUpdateIFSP = [
  mongoIdParam('id'),
  body('status')
    .optional()
    .isIn([
      'DRAFT',
      'PENDING_APPROVAL',
      'ACTIVE',
      'IN_REVIEW',
      'AMENDED',
      'COMPLETED',
      'CANCELLED',
    ]),
  body('startDate').optional().isISO8601().toDate(),
];

const validateGetIFSPs = [
  ...paginationQuery,
  query('child').optional().isMongoId(),
  query('status').optional().isString(),
  query('planType').optional().isString(),
  query('serviceCoordinator').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];

const validateAddIFSPReview = [
  mongoIdParam('id'),
  body('reviewType')
    .notEmpty()
    .withMessage('نوع المراجعة مطلوب')
    .isIn(['6_MONTH', 'ANNUAL', 'PARENT_REQUEST', 'TEAM_REQUEST']),
  body('findings').optional().isString().trim(),
  body('modifications').optional().isString().trim(),
  body('nextReviewDate').optional().isISO8601().toDate(),
];

const validateUpdateGoalProgress = [
  mongoIdParam('id'),
  param('goalId').isMongoId().withMessage('معرف الهدف غير صالح'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('النسبة يجب أن تكون بين 0 و 100'),
  body('status')
    .optional()
    .isIn(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'MODIFIED', 'DISCONTINUED']),
  body('note').optional().isString().trim(),
];

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRALS — الإحالات
// ═══════════════════════════════════════════════════════════════════════════════

const validateCreateReferral = [
  body('referralDirection')
    .notEmpty()
    .withMessage('اتجاه الإحالة مطلوب')
    .isIn(['INBOUND', 'OUTBOUND']),
  body('sourceType')
    .notEmpty()
    .withMessage('نوع المصدر مطلوب')
    .isIn([
      'MATERNITY_HOSPITAL',
      'PEDIATRIC_CLINIC',
      'NICU',
      'NATIONAL_SCREENING_PROGRAM',
      'PRIMARY_CARE',
      'SELF_REFERRAL',
      'COMMUNITY_HEALTH',
      'DAYCARE',
      'EARLY_INTERVENTION_CENTER',
      'SPECIALIST',
      'OTHER',
    ]),
  body('referralDate').notEmpty().withMessage('تاريخ الإحالة مطلوب').isISO8601().toDate(),
  body('reason').notEmpty().withMessage('سبب الإحالة مطلوب').trim(),
  body('child').optional().isMongoId().withMessage('معرف الطفل غير صالح'),
  body('urgency').optional().isIn(['ROUTINE', 'URGENT', 'EMERGENT']),
  body('status')
    .optional()
    .isIn([
      'DRAFT',
      'SUBMITTED',
      'RECEIVED',
      'ACCEPTED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'EXPIRED',
    ]),
];

const validateUpdateReferral = [
  mongoIdParam('id'),
  body('status')
    .optional()
    .isIn([
      'DRAFT',
      'SUBMITTED',
      'RECEIVED',
      'ACCEPTED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'EXPIRED',
    ]),
  body('urgency').optional().isIn(['ROUTINE', 'URGENT', 'EMERGENT']),
];

const validateGetReferrals = [
  ...paginationQuery,
  query('child').optional().isMongoId(),
  query('status').optional().isString(),
  query('referralDirection').optional().isIn(['INBOUND', 'OUTBOUND']),
  query('sourceType').optional().isString(),
  query('urgency').optional().isIn(['ROUTINE', 'URGENT', 'EMERGENT']),
  query('search').optional().isString().trim(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];

const validateUpdateReferralStatus = [
  mongoIdParam('id'),
  body('status')
    .notEmpty()
    .withMessage('الحالة الجديدة مطلوبة')
    .isIn([
      'DRAFT',
      'SUBMITTED',
      'RECEIVED',
      'ACCEPTED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'EXPIRED',
    ]),
];

const validateAddCommunication = [
  mongoIdParam('id'),
  body('type')
    .notEmpty()
    .withMessage('نوع التواصل مطلوب')
    .isIn(['PHONE', 'EMAIL', 'FAX', 'IN_PERSON', 'SYSTEM']),
  body('direction').notEmpty().withMessage('اتجاه التواصل مطلوب').isIn(['INBOUND', 'OUTBOUND']),
  body('summary').notEmpty().withMessage('ملخص التواصل مطلوب').trim(),
  body('contact').optional().isString().trim(),
];

module.exports = {
  // Children
  validateCreateChild,
  validateUpdateChild,
  validateGetChildren,
  // Screenings
  validateCreateScreening,
  validateUpdateScreening,
  validateGetScreenings,
  // Milestones
  validateCreateMilestone,
  validateUpdateMilestone,
  validateGetMilestones,
  // IFSP
  validateCreateIFSP,
  validateUpdateIFSP,
  validateGetIFSPs,
  validateAddIFSPReview,
  validateUpdateGoalProgress,
  // Referrals
  validateCreateReferral,
  validateUpdateReferral,
  validateGetReferrals,
  validateUpdateReferralStatus,
  validateAddCommunication,
  // Shared
  mongoIdParam,
  paginationQuery,
};
