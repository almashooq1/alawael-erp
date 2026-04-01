/**
 * beneficiary.constants.js
 * ثوابت وتعدادات وحدة إدارة المستفيدين
 * Beneficiary Module Constants & Enums
 *
 * @module constants/beneficiary.constants
 */

'use strict';

// ─── نوع الإعاقة ──────────────────────────────────────────────────────────────
const DISABILITY_TYPES = {
  PHYSICAL: 'physical', // حركية
  INTELLECTUAL: 'intellectual', // ذهنية
  AUTISM: 'autism', // توحد
  HEARING: 'hearing', // سمعية
  VISUAL: 'visual', // بصرية
  SPEECH: 'speech', // نطقية
  MULTIPLE: 'multiple', // مزدوجة
  OTHER: 'other', // أخرى
};

const DISABILITY_TYPE_LABELS = {
  physical: { ar: 'إعاقة حركية', en: 'Physical Disability', icon: 'wheelchair' },
  intellectual: { ar: 'إعاقة ذهنية', en: 'Intellectual Disability', icon: 'brain' },
  autism: { ar: 'اضطراب طيف التوحد', en: 'Autism Spectrum', icon: 'puzzle-piece' },
  hearing: { ar: 'إعاقة سمعية', en: 'Hearing Impairment', icon: 'ear' },
  visual: { ar: 'إعاقة بصرية', en: 'Visual Impairment', icon: 'eye-slash' },
  speech: { ar: 'إعاقة نطقية', en: 'Speech Impairment', icon: 'comment-slash' },
  multiple: { ar: 'إعاقة مزدوجة', en: 'Multiple Disabilities', icon: 'layer-group' },
  other: { ar: 'أخرى', en: 'Other', icon: 'question-circle' },
};

// ─── شدة الإعاقة ───────────────────────────────────────────────────────────────
const DISABILITY_SEVERITIES = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
  PROFOUND: 'profound',
};

const DISABILITY_SEVERITY_LABELS = {
  mild: { ar: 'بسيطة', en: 'Mild', color: 'green', score: 10 },
  moderate: { ar: 'متوسطة', en: 'Moderate', color: 'yellow', score: 20 },
  severe: { ar: 'شديدة', en: 'Severe', color: 'orange', score: 30 },
  profound: { ar: 'شديدة جداً', en: 'Profound', color: 'red', score: 40 },
};

// ─── حالة المستفيد ─────────────────────────────────────────────────────────────
const BENEFICIARY_STATUSES = {
  WAITING: 'waiting', // في قائمة الانتظار
  ACTIVE: 'active', // مسجل فعال
  SUSPENDED: 'suspended', // معلق مؤقتاً
  DISCHARGED: 'discharged', // تم تخريجه
  TRANSFERRED: 'transferred', // تم نقله
};

const BENEFICIARY_STATUS_LABELS = {
  waiting: { ar: 'قائمة الانتظار', en: 'Waiting', color: 'gray' },
  active: { ar: 'مسجل فعال', en: 'Active', color: 'green' },
  suspended: { ar: 'معلق', en: 'Suspended', color: 'yellow' },
  discharged: { ar: 'تم التخريج', en: 'Discharged', color: 'red' },
  transferred: { ar: 'تم النقل', en: 'Transferred', color: 'blue' },
};

// ─── الجنس ─────────────────────────────────────────────────────────────────────
const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
};

const GENDER_LABELS = {
  male: { ar: 'ذكر', en: 'Male' },
  female: { ar: 'أنثى', en: 'Female' },
};

// ─── فصيلة الدم ────────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── صلات القرابة ──────────────────────────────────────────────────────────────
const RELATIONSHIPS = {
  FATHER: 'father',
  MOTHER: 'mother',
  BROTHER: 'brother',
  SISTER: 'sister',
  UNCLE: 'uncle',
  AUNT: 'aunt',
  GRANDFATHER: 'grandfather',
  GRANDMOTHER: 'grandmother',
  OTHER: 'other',
};

const RELATIONSHIP_LABELS = {
  father: { ar: 'أب', en: 'Father' },
  mother: { ar: 'أم', en: 'Mother' },
  brother: { ar: 'أخ', en: 'Brother' },
  sister: { ar: 'أخت', en: 'Sister' },
  uncle: { ar: 'عم / خال', en: 'Uncle' },
  aunt: { ar: 'عمة / خالة', en: 'Aunt' },
  grandfather: { ar: 'جد', en: 'Grandfather' },
  grandmother: { ar: 'جدة', en: 'Grandmother' },
  other: { ar: 'أخرى', en: 'Other' },
};

// ─── حالة قائمة الانتظار ───────────────────────────────────────────────────────
const WAITLIST_STATUSES = {
  PENDING: 'pending',
  CONTACTED: 'contacted',
  ASSESSMENT_SCHEDULED: 'assessment_scheduled',
  APPROVED: 'approved',
  ENROLLED: 'enrolled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

const WAITLIST_STATUS_LABELS = {
  pending: { ar: 'بانتظار التواصل', en: 'Pending', color: 'gray' },
  contacted: { ar: 'تم التواصل', en: 'Contacted', color: 'blue' },
  assessment_scheduled: { ar: 'تقييم مجدول', en: 'Assessment Scheduled', color: 'purple' },
  approved: { ar: 'تمت الموافقة', en: 'Approved', color: 'green' },
  enrolled: { ar: 'تم التسجيل', en: 'Enrolled', color: 'emerald' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: 'red' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: 'red' },
};

// ─── مستويات الأولوية ──────────────────────────────────────────────────────────
const PRIORITY_LEVELS = {
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

const PRIORITY_LEVEL_SCORES = {
  normal: 10,
  high: 20,
  urgent: 30,
};

// ─── نوع الوثيقة ───────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = {
  ID_COPY: 'id_copy',
  MEDICAL_REPORT: 'medical_report',
  DISABILITY_CARD: 'disability_card',
  INSURANCE_CARD: 'insurance_card',
  REFERRAL_LETTER: 'referral_letter',
  CONSENT_FORM: 'consent_form',
  PHOTO: 'photo',
  ASSESSMENT_REPORT: 'assessment_report',
  TREATMENT_PLAN: 'treatment_plan',
  PROGRESS_REPORT: 'progress_report',
  OTHER: 'other',
};

const DOCUMENT_TYPE_LABELS = {
  id_copy: { ar: 'صورة الهوية', en: 'ID Copy' },
  medical_report: { ar: 'تقرير طبي', en: 'Medical Report' },
  disability_card: { ar: 'بطاقة الإعاقة', en: 'Disability Card' },
  insurance_card: { ar: 'بطاقة التأمين', en: 'Insurance Card' },
  referral_letter: { ar: 'خطاب إحالة', en: 'Referral Letter' },
  consent_form: { ar: 'نموذج موافقة', en: 'Consent Form' },
  photo: { ar: 'صورة شخصية', en: 'Photo' },
  assessment_report: { ar: 'تقرير تقييم', en: 'Assessment Report' },
  treatment_plan: { ar: 'خطة علاجية', en: 'Treatment Plan' },
  progress_report: { ar: 'تقرير تقدم', en: 'Progress Report' },
  other: { ar: 'أخرى', en: 'Other' },
};

// ─── نوع التقييم ───────────────────────────────────────────────────────────────
const ASSESSMENT_TYPES = {
  INITIAL: 'initial',
  PERIODIC: 'periodic',
  RE_EVALUATION: 're_evaluation',
  DISCHARGE: 'discharge',
};

const ASSESSMENT_TYPE_LABELS = {
  initial: { ar: 'تقييم أولي', en: 'Initial Assessment' },
  periodic: { ar: 'دوري', en: 'Periodic Assessment' },
  re_evaluation: { ar: 'إعادة تقييم', en: 'Re-evaluation' },
  discharge: { ar: 'عند الخروج', en: 'Discharge Assessment' },
};

// ─── مستويات الأداء الوظيفي ────────────────────────────────────────────────────
const FUNCTIONAL_LEVELS = [
  'independent', // مستقل
  'minimal_support', // دعم بسيط
  'moderate_support', // دعم متوسط
  'extensive_support', // دعم كبير
  'total_support', // دعم كامل
];

const FUNCTIONAL_LEVEL_LABELS = {
  independent: { ar: 'مستقل', en: 'Independent' },
  minimal_support: { ar: 'دعم بسيط', en: 'Minimal Support' },
  moderate_support: { ar: 'دعم متوسط', en: 'Moderate Support' },
  extensive_support: { ar: 'دعم كبير', en: 'Extensive Support' },
  total_support: { ar: 'دعم كامل', en: 'Total Support' },
};

// ─── حالة النقل ────────────────────────────────────────────────────────────────
const TRANSFER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
};

// ─── طرق التواصل المفضلة ───────────────────────────────────────────────────────
const CONTACT_METHODS = {
  PHONE: 'phone',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
};

const CONTACT_METHOD_LABELS = {
  phone: { ar: 'هاتف', en: 'Phone' },
  sms: { ar: 'رسالة نصية', en: 'SMS' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  email: { ar: 'بريد إلكتروني', en: 'Email' },
};

// ─── نوع التاريخ الطبي ─────────────────────────────────────────────────────────
const MEDICAL_CONDITION_TYPES = {
  CURRENT_DIAGNOSIS: 'current_diagnosis',
  PAST_MEDICAL: 'past_medical',
  SURGICAL: 'surgical',
  FAMILY_HISTORY: 'family_history',
  ALLERGY: 'allergy',
  MEDICATION: 'medication',
  DEVELOPMENTAL_MILESTONE: 'developmental_milestone',
};

const MEDICAL_CONDITION_TYPE_LABELS = {
  current_diagnosis: { ar: 'تشخيص حالي', en: 'Current Diagnosis' },
  past_medical: { ar: 'تاريخ طبي سابق', en: 'Past Medical History' },
  surgical: { ar: 'عمليات جراحية', en: 'Surgical History' },
  family_history: { ar: 'تاريخ عائلي', en: 'Family History' },
  allergy: { ar: 'حساسية', en: 'Allergy' },
  medication: { ar: 'أدوية', en: 'Medication' },
  developmental_milestone: { ar: 'مراحل نمائية', en: 'Developmental Milestone' },
};

// ─── صادرات ────────────────────────────────────────────────────────────────────
module.exports = {
  DISABILITY_TYPES,
  DISABILITY_TYPE_LABELS,
  DISABILITY_SEVERITIES,
  DISABILITY_SEVERITY_LABELS,
  BENEFICIARY_STATUSES,
  BENEFICIARY_STATUS_LABELS,
  GENDERS,
  GENDER_LABELS,
  BLOOD_TYPES,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
  WAITLIST_STATUSES,
  WAITLIST_STATUS_LABELS,
  PRIORITY_LEVELS,
  PRIORITY_LEVEL_SCORES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
  ASSESSMENT_TYPE_LABELS,
  FUNCTIONAL_LEVELS,
  FUNCTIONAL_LEVEL_LABELS,
  TRANSFER_STATUSES,
  CONTACT_METHODS,
  CONTACT_METHOD_LABELS,
  MEDICAL_CONDITION_TYPES,
  MEDICAL_CONDITION_TYPE_LABELS,
};
