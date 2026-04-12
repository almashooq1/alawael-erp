'use strict';
/**
 * DddLocalizationEngine Model
 * Auto-extracted from services/dddLocalizationEngine.js
 */
const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    namespace: {
      type: String,
      default: 'common',
      index: true,
    },
    translations: {
      ar: { type: String },
      en: { type: String },
    },
    context: String,
    category: {
      type: String,
      enum: ['ui', 'clinical', 'domain', 'notification', 'report', 'error', 'system'],
      default: 'ui',
    },
    isCustom: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

translationSchema.index({ key: 1, namespace: 1 }, { unique: true });
translationSchema.index({ category: 1, namespace: 1 });

const DDDTranslation =
  mongoose.models.DDDTranslation || mongoose.model('DDDTranslation', translationSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Supported Locales
   ═══════════════════════════════════════════════════════════════════════ */
const SUPPORTED_LOCALES = ['ar', 'en'];
const DEFAULT_LOCALE = 'ar';

const LOCALE_META = {
  ar: {
    name: 'العربية',
    nativeName: 'العربية',
    dir: 'rtl',
    bcp47: 'ar-SA',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  en: {
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    bcp47: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   3. Built-in Translations — Common UI
   ═══════════════════════════════════════════════════════════════════════ */
const BUILTIN_TRANSLATIONS = {
  common: {
    /* General */
    'app.title': { ar: 'منصة التأهيل الموحدة الذكية', en: 'Unified Smart Rehabilitation Platform' },
    'app.subtitle': {
      ar: 'نظام شامل لإدارة خدمات التأهيل',
      en: 'Comprehensive Rehabilitation Services Management',
    },
    'nav.home': { ar: 'الرئيسية', en: 'Home' },
    'nav.dashboard': { ar: 'لوحة القيادة', en: 'Dashboard' },
    'nav.beneficiaries': { ar: 'المستفيدون', en: 'Beneficiaries' },
    'nav.episodes': { ar: 'حلقات الرعاية', en: 'Episodes of Care' },
    'nav.sessions': { ar: 'الجلسات', en: 'Sessions' },
    'nav.assessments': { ar: 'التقييمات', en: 'Assessments' },
    'nav.carePlans': { ar: 'خطط الرعاية', en: 'Care Plans' },
    'nav.goals': { ar: 'الأهداف العلاجية', en: 'Therapeutic Goals' },
    'nav.quality': { ar: 'الجودة والامتثال', en: 'Quality & Compliance' },
    'nav.reports': { ar: 'التقارير', en: 'Reports' },
    'nav.settings': { ar: 'الإعدادات', en: 'Settings' },

    /* Actions */
    'action.save': { ar: 'حفظ', en: 'Save' },
    'action.cancel': { ar: 'إلغاء', en: 'Cancel' },
    'action.delete': { ar: 'حذف', en: 'Delete' },
    'action.edit': { ar: 'تعديل', en: 'Edit' },
    'action.create': { ar: 'إنشاء', en: 'Create' },
    'action.search': { ar: 'بحث', en: 'Search' },
    'action.filter': { ar: 'تصفية', en: 'Filter' },
    'action.export': { ar: 'تصدير', en: 'Export' },
    'action.import': { ar: 'استيراد', en: 'Import' },
    'action.print': { ar: 'طباعة', en: 'Print' },
    'action.refresh': { ar: 'تحديث', en: 'Refresh' },
    'action.submit': { ar: 'إرسال', en: 'Submit' },
    'action.approve': { ar: 'موافقة', en: 'Approve' },
    'action.reject': { ar: 'رفض', en: 'Reject' },
    'action.confirm': { ar: 'تأكيد', en: 'Confirm' },
    'action.back': { ar: 'رجوع', en: 'Back' },
    'action.next': { ar: 'التالي', en: 'Next' },
    'action.previous': { ar: 'السابق', en: 'Previous' },
    'action.close': { ar: 'إغلاق', en: 'Close' },
    'action.viewDetails': { ar: 'عرض التفاصيل', en: 'View Details' },

    /* Status */
    'status.active': { ar: 'نشط', en: 'Active' },
    'status.inactive': { ar: 'غير نشط', en: 'Inactive' },
    'status.pending': { ar: 'قيد الانتظار', en: 'Pending' },
    'status.completed': { ar: 'مكتمل', en: 'Completed' },
    'status.cancelled': { ar: 'ملغي', en: 'Cancelled' },
    'status.draft': { ar: 'مسودة', en: 'Draft' },
    'status.approved': { ar: 'معتمد', en: 'Approved' },
    'status.rejected': { ar: 'مرفوض', en: 'Rejected' },
    'status.scheduled': { ar: 'مجدول', en: 'Scheduled' },
    'status.inProgress': { ar: 'قيد التنفيذ', en: 'In Progress' },
    'status.suspended': { ar: 'معلق', en: 'Suspended' },
    'status.discharged': { ar: 'خرج', en: 'Discharged' },

    /* Messages */
    'msg.success': { ar: 'تمت العملية بنجاح', en: 'Operation completed successfully' },
    'msg.error': { ar: 'حدث خطأ', en: 'An error occurred' },
    'msg.confirmDelete': { ar: 'هل أنت متأكد من الحذف؟', en: 'Are you sure you want to delete?' },
    'msg.noData': { ar: 'لا توجد بيانات', en: 'No data available' },
    'msg.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
    'msg.saved': { ar: 'تم الحفظ', en: 'Saved' },
    'msg.required': { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
    'msg.unauthorized': { ar: 'غير مصرح', en: 'Unauthorized' },
    'msg.notFound': { ar: 'غير موجود', en: 'Not found' },

    /* Labels */
    'label.name': { ar: 'الاسم', en: 'Name' },
    'label.date': { ar: 'التاريخ', en: 'Date' },
    'label.status': { ar: 'الحالة', en: 'Status' },
    'label.type': { ar: 'النوع', en: 'Type' },
    'label.description': { ar: 'الوصف', en: 'Description' },
    'label.notes': { ar: 'ملاحظات', en: 'Notes' },
    'label.total': { ar: 'الإجمالي', en: 'Total' },
    'label.from': { ar: 'من', en: 'From' },
    'label.to': { ar: 'إلى', en: 'To' },
    'label.branch': { ar: 'الفرع', en: 'Branch' },
  },

  /* ═══════════════════════════════ Clinical ═══════════════════════════ */
  clinical: {
    /* Beneficiary */
    'beneficiary.title': { ar: 'المستفيد', en: 'Beneficiary' },
    'beneficiary.titles': { ar: 'المستفيدون', en: 'Beneficiaries' },
    'beneficiary.firstName': { ar: 'الاسم الأول', en: 'First Name' },
    'beneficiary.lastName': { ar: 'اسم العائلة', en: 'Last Name' },
    'beneficiary.dateOfBirth': { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
    'beneficiary.gender': { ar: 'الجنس', en: 'Gender' },
    'beneficiary.gender.male': { ar: 'ذكر', en: 'Male' },
    'beneficiary.gender.female': { ar: 'أنثى', en: 'Female' },
    'beneficiary.nationalId': { ar: 'رقم الهوية', en: 'National ID' },
    'beneficiary.mrn': { ar: 'الرقم الطبي', en: 'MRN' },
    'beneficiary.disability': { ar: 'الإعاقة', en: 'Disability' },
    'beneficiary.guardian': { ar: 'ولي الأمر', en: 'Guardian' },

    /* Episode */
    'episode.title': { ar: 'حلقة الرعاية', en: 'Episode of Care' },
    'episode.titles': { ar: 'حلقات الرعاية', en: 'Episodes of Care' },
    'episode.startDate': { ar: 'تاريخ البدء', en: 'Start Date' },
    'episode.endDate': { ar: 'تاريخ الانتهاء', en: 'End Date' },
    'episode.phase': { ar: 'المرحلة', en: 'Phase' },
    'episode.careTeam': { ar: 'فريق الرعاية', en: 'Care Team' },

    /* Session */
    'session.title': { ar: 'الجلسة', en: 'Session' },
    'session.titles': { ar: 'الجلسات', en: 'Sessions' },
    'session.therapist': { ar: 'المعالج', en: 'Therapist' },
    'session.scheduledDate': { ar: 'موعد الجلسة', en: 'Scheduled Date' },
    'session.duration': { ar: 'المدة', en: 'Duration' },
    'session.soapNotes': { ar: 'ملاحظات SOAP', en: 'SOAP Notes' },
    'session.soap.subjective': { ar: 'شكوى المريض', en: 'Subjective' },
    'session.soap.objective': { ar: 'الملاحظات الموضوعية', en: 'Objective' },
    'session.soap.assessment': { ar: 'التقييم', en: 'Assessment' },
    'session.soap.plan': { ar: 'الخطة', en: 'Plan' },
    'session.noShow': { ar: 'لم يحضر', en: 'No Show' },

    /* Assessment */
    'assessment.title': { ar: 'التقييم', en: 'Assessment' },
    'assessment.titles': { ar: 'التقييمات', en: 'Assessments' },
    'assessment.score': { ar: 'الدرجة', en: 'Score' },
    'assessment.assessor': { ar: 'المقيّم', en: 'Assessor' },
    'assessment.domains': { ar: 'المجالات', en: 'Domains' },
    'assessment.baseline': { ar: 'القياس القاعدي', en: 'Baseline' },
    'assessment.followup': { ar: 'المتابعة', en: 'Follow-up' },
    'assessment.discharge': { ar: 'الخروج', en: 'Discharge' },

    /* Care Plan */
    'carePlan.title': { ar: 'خطة الرعاية', en: 'Care Plan' },
    'carePlan.titles': { ar: 'خطط الرعاية', en: 'Care Plans' },
    'carePlan.goals': { ar: 'الأهداف', en: 'Goals' },
    'carePlan.interventions': { ar: 'التدخلات', en: 'Interventions' },

    /* Goals */
    'goal.title': { ar: 'الهدف العلاجي', en: 'Therapeutic Goal' },
    'goal.titles': { ar: 'الأهداف العلاجية', en: 'Therapeutic Goals' },
    'goal.progress': { ar: 'التقدم', en: 'Progress' },
    'goal.target': { ar: 'المستهدف', en: 'Target' },
    'goal.met': { ar: 'تحقق', en: 'Met' },
    'goal.notMet': { ar: 'لم يتحقق', en: 'Not Met' },
    'goal.gas': { ar: 'مقياس تحقيق الأهداف', en: 'Goal Attainment Scale' },

    /* Behavior */
    'behavior.title': { ar: 'السلوك', en: 'Behavior' },
    'behavior.incident': { ar: 'الحادثة', en: 'Incident' },
    'behavior.severity': { ar: 'الشدة', en: 'Severity' },
    'behavior.antecedent': { ar: 'المقدمات', en: 'Antecedent' },
    'behavior.consequence': { ar: 'النتائج', en: 'Consequence' },
    'behavior.intervention': { ar: 'التدخل', en: 'Intervention' },

    /* Family */
    'family.title': { ar: 'الأسرة', en: 'Family' },
    'family.communication': { ar: 'التواصل الأسري', en: 'Family Communication' },
    'family.meeting': { ar: 'اجتماع أسري', en: 'Family Meeting' },
    'family.homeProgram': { ar: 'البرنامج المنزلي', en: 'Home Program' },
    'family.satisfaction': { ar: 'رضا الأسرة', en: 'Family Satisfaction' },
  },

  /* ═══════════════════════════ Disability Types ═══════════════════════ */
  disability: {
    'disability.intellectual': { ar: 'إعاقة فكرية', en: 'Intellectual Disability' },
    'disability.physical': { ar: 'إعاقة جسدية', en: 'Physical Disability' },
    'disability.visual': { ar: 'إعاقة بصرية', en: 'Visual Impairment' },
    'disability.hearing': { ar: 'إعاقة سمعية', en: 'Hearing Impairment' },
    'disability.speech': { ar: 'إعاقة نطقية', en: 'Speech Impairment' },
    'disability.autism': { ar: 'اضطراب طيف التوحد', en: 'Autism Spectrum Disorder' },
    'disability.learning': { ar: 'صعوبات التعلم', en: 'Learning Disability' },
    'disability.multiple': { ar: 'إعاقة متعددة', en: 'Multiple Disabilities' },
    'disability.cerebralPalsy': { ar: 'شلل دماغي', en: 'Cerebral Palsy' },
    'disability.downSyndrome': { ar: 'متلازمة داون', en: 'Down Syndrome' },
    'disability.adhd': { ar: 'اضطراب فرط الحركة وتشتت الانتباه', en: 'ADHD' },
    'disability.developmental': { ar: 'تأخر نمائي', en: 'Developmental Delay' },
  },

  /* ══════════════════════════ Therapy Disciplines ════════════════════ */
  therapy: {
    'therapy.pt': { ar: 'العلاج الطبيعي', en: 'Physical Therapy' },
    'therapy.ot': { ar: 'العلاج الوظيفي', en: 'Occupational Therapy' },
    'therapy.slp': { ar: 'علاج النطق واللغة', en: 'Speech-Language Pathology' },
    'therapy.psychology': { ar: 'علم النفس', en: 'Psychology' },
    'therapy.socialWork': { ar: 'الخدمة الاجتماعية', en: 'Social Work' },
    'therapy.specialEducation': { ar: 'التربية الخاصة', en: 'Special Education' },
    'therapy.behavioral': { ar: 'العلاج السلوكي', en: 'Behavioral Therapy' },
    'therapy.recreational': { ar: 'العلاج الترفيهي', en: 'Recreational Therapy' },
    'therapy.art': { ar: 'العلاج بالفن', en: 'Art Therapy' },
    'therapy.music': { ar: 'العلاج بالموسيقى', en: 'Music Therapy' },
    'therapy.aquatic': { ar: 'العلاج المائي', en: 'Aquatic Therapy' },
    'therapy.hippotherapy': { ar: 'العلاج بركوب الخيل', en: 'Hippotherapy' },
  },

  /* ═══════════════════════════ DDD Domains ═══════════════════════════ */
  domains: {
    'domain.core': { ar: 'النواة', en: 'Core' },
    'domain.episodes': { ar: 'حلقات الرعاية', en: 'Episodes' },
    'domain.timeline': { ar: 'الخط الزمني', en: 'Timeline' },
    'domain.assessments': { ar: 'التقييمات', en: 'Assessments' },
    'domain.care-plans': { ar: 'خطط الرعاية', en: 'Care Plans' },
    'domain.sessions': { ar: 'الجلسات', en: 'Sessions' },
    'domain.goals': { ar: 'الأهداف', en: 'Goals' },
    'domain.workflow': { ar: 'سير العمل', en: 'Workflow' },
    'domain.programs': { ar: 'البرامج', en: 'Programs' },
    'domain.ai-recommendations': { ar: 'التوصيات الذكية', en: 'AI Recommendations' },
    'domain.quality': { ar: 'الجودة', en: 'Quality' },
    'domain.family': { ar: 'الأسرة', en: 'Family' },
    'domain.reports': { ar: 'التقارير', en: 'Reports' },
    'domain.group-therapy': { ar: 'العلاج الجماعي', en: 'Group Therapy' },
    'domain.tele-rehab': { ar: 'التأهيل عن بعد', en: 'Tele-Rehabilitation' },
    'domain.ar-vr': { ar: 'الواقع المعزز/الافتراضي', en: 'AR/VR' },
    'domain.behavior': { ar: 'إدارة السلوك', en: 'Behavior Management' },
    'domain.research': { ar: 'البحث العلمي', en: 'Clinical Research' },
    'domain.field-training': { ar: 'التدريب الميداني', en: 'Field Training' },
    'domain.dashboards': { ar: 'لوحات القيادة', en: 'Dashboards' },
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   4. Translation Engine
   ═══════════════════════════════════════════════════════════════════════ */

/** In-memory cache of translations (refreshed periodically) */
let translationCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 300000; // 5 minutes

async function refreshCache() {
  if (Date.now() - cacheTimestamp < CACHE_TTL && Object.keys(translationCache).length > 0) return;

  const customTranslations = await DDDTranslation.find({ isDeleted: { $ne: true } }).lean();
  const cache = {};

  /* Load builtins first */
  for (const [ns, keys] of Object.entries(BUILTIN_TRANSLATIONS)) {
    if (!cache[ns]) cache[ns] = {};
    for (const [key, trans] of Object.entries(keys)) {
      cache[ns][key] = trans;
    }
  }

  /* Override with custom DB translations */
  for (const t of customTranslations) {
    const ns = t.namespace || 'common';
    if (!cache[ns]) cache[ns] = {};
    cache[ns][t.key] = t.translations;
  }

  translationCache = cache;
  cacheTimestamp = Date.now();
}

/**
 * Translate a key to the given locale.
 *
 * @param {string} key - Translation key (e.g., 'action.save')
 * @param {string} locale - 'ar' or 'en'
 * @param {string} namespace - Namespace (default: auto-detect)
 * @param {Object} params - Interpolation parameters (e.g., { count: 5 })
 * @returns {string}
 */
async function t(key, locale = DEFAULT_LOCALE, namespace, params = {}) {
  await refreshCache();

  locale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  /* Auto-detect namespace from key prefix */
  if (!namespace) {
    for (const ns of Object.keys(translationCache)) {
      if (translationCache[ns]?.[key]) {
        namespace = ns;
        break;
      }
    }
    if (!namespace) namespace = 'common';
  }

  const translation =
    translationCache[namespace]?.[key]?.[locale] ||
    translationCache[namespace]?.[key]?.en || // fallback to English
    key; // fallback to key itself

  /* Interpolation */
  return translation.replace(/\{\{(\w+)\}\}/g, (_, param) => params[param] ?? `{{${param}}}`);
}

/**
 * Get all translations for a locale and namespace.
 */
async function getTranslations(locale = DEFAULT_LOCALE, namespace) {
  await refreshCache();

  const result = {};
  const namespaces = namespace ? [namespace] : Object.keys(translationCache);

  for (const ns of namespaces) {
    if (!translationCache[ns]) continue;
    for (const [key, trans] of Object.entries(translationCache[ns])) {
      result[key] = trans[locale] || trans.en || key;
    }
  }

  return result;
}

/**
 * Get coverage statistics.
 */
async function getCoverage() {
  await refreshCache();

  const stats = { ar: { total: 0, translated: 0 }, en: { total: 0, translated: 0 } };
  const byNamespace = {};

  for (const [ns, keys] of Object.entries(translationCache)) {
    byNamespace[ns] = { ar: { total: 0, translated: 0 }, en: { total: 0, translated: 0 } };
    for (const trans of Object.values(keys)) {
      for (const locale of SUPPORTED_LOCALES) {
        stats[locale].total++;
        byNamespace[ns][locale].total++;
        if (trans[locale]) {
          stats[locale].translated++;
          byNamespace[ns][locale].translated++;
        }
      }
    }
  }

  for (const locale of SUPPORTED_LOCALES) {
    stats[locale].percentage =
      stats[locale].total > 0
        ? Math.round((stats[locale].translated / stats[locale].total) * 100)
        : 0;
  }

  return { overall: stats, byNamespace };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Custom Translation CRUD
   ═══════════════════════════════════════════════════════════════════════ */
async function setTranslation(key, translations, options = {}) {
  const result = await DDDTranslation.findOneAndUpdate(
    { key, namespace: options.namespace || 'common' },
    {
      $set: {
        translations,
        category: options.category || 'ui',
        context: options.context,
        isCustom: true,
      },
    },
    { upsert: true, new: true }
  ).lean();

  cacheTimestamp = 0; // invalidate cache
  return result;
}

async function deleteTranslation(key, namespace = 'common') {
  await DDDTranslation.findOneAndUpdate({ key, namespace }, { $set: { isDeleted: true } });
  cacheTimestamp = 0;
}

async function listCustomTranslations(filter = {}) {
  const query = { isCustom: true, isDeleted: { $ne: true } };
  if (filter.namespace) query.namespace = filter.namespace;
  if (filter.category) query.category = filter.category;
  return DDDTranslation.find(query).sort({ key: 1 }).lean();
}

async function seedBuiltinTranslations() {
  let created = 0;
  for (const [ns, keys] of Object.entries(BUILTIN_TRANSLATIONS)) {
    for (const [key, translations] of Object.entries(keys)) {
      const exists = await DDDTranslation.findOne({ key, namespace: ns });
      if (!exists) {
        await DDDTranslation.create({
          key,
          namespace: ns,
          translations,
          category: 'ui',
          isCustom: false,
        });
        created++;
      }
    }
  }
  cacheTimestamp = 0;
  return {
    created,
    total: Object.values(BUILTIN_TRANSLATIONS).reduce((s, k) => s + Object.keys(k).length, 0),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Locale Detection Middleware
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDTranslation,
};
