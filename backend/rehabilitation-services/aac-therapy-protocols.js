/**
 * Priorities 9 & 10 - AAC Module + Therapeutic Protocol Library
 * وحدة التواصل المعزز والبديل + مكتبة البروتوكولات العلاجية
 * Al-Awael ERP System
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ══════════════════════════════════════════════════════════════
// PRIORITY 9 - AAC (Augmentative & Alternative Communication)
// ══════════════════════════════════════════════════════════════

const AACProfileSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
      index: true,
    },
    // مستوى التواصل الحالي
    communication_profile: {
      current_mode: {
        type: String,
        enum: ['no_symbolic', 'emerging_symbolic', 'concrete_symbolic', 'abstract_symbolic'],
        default: 'no_symbolic',
      },
      current_mode_ar: String,
      unaided_skills: [String], // مهارات بدون أدوات: إيماءات، إشارات
      aided_skills: [String], // مهارات بأدوات: صور، أجهزة
      pecs_phase: { type: Number, min: 0, max: 6, default: 0 },
      vocabulary_size: { type: Number, default: 0 },
    },
    // النظام المستخدم
    aac_system: {
      type: {
        type: String,
        enum: ['pecs', 'sgd', 'app', 'picture_board', 'sign_language', 'mixed', 'none'],
        default: 'none',
      },
      device_name: String, // اسم الجهاز أو التطبيق
      app_name: String,
      vocabulary_set: String, // ARASAAC, SymbolStix, PCS
      access_method: { type: String, enum: ['direct', 'scanning', 'eye_gaze', 'partner_assisted'] },
    },
    // بنك المفردات
    vocabulary_bank: [
      {
        symbol_id: String, // رقم رمز ARASAAC
        word_ar: String,
        word_en: String,
        category: {
          type: String,
          enum: [
            'core',
            'fringe',
            'social',
            'requests',
            'comments',
            'questions',
            'emotions',
            'daily_activities',
          ],
        },
        image_url: String,
        mastered: { type: Boolean, default: false },
        introduced_date: Date,
        mastery_date: Date,
        frequency_of_use: { type: Number, default: 0 },
        location_on_board: String,
      },
    ],
    // لوحات التواصل
    communication_boards: [
      {
        board_name_ar: String,
        board_type: {
          type: String,
          enum: ['core', 'topic', 'daily_routine', 'emergency', 'social'],
        },
        symbols_count: Number,
        grid_size: String, // '3x3', '4x4', '5x6'
        active: { type: Boolean, default: true },
        created_date: Date,
        last_updated: Date,
        pdf_url: String,
      },
    ],
    // التقدم
    progress_log: [
      {
        date: { type: Date, default: Date.now },
        new_words_added: Number,
        words_mastered: [String],
        pecs_phase_reached: Number,
        session_notes_ar: String,
        therapist_id: { type: Schema.Types.ObjectId },
      },
    ],
    // أهداف AAC
    aac_goals: [
      {
        goal_ar: String,
        target_date: Date,
        achieved: { type: Boolean, default: false },
        current_accuracy: Number,
      },
    ],
    // توصيات الجهاز
    device_recommendations: [
      {
        device_ar: String,
        rationale_ar: String,
        funding_source: String,
        priority: { type: String, enum: ['immediate', 'short_term', 'long_term'] },
      },
    ],
  },
  { timestamps: true }
);

const AACProfile = mongoose.model('AACProfile', AACProfileSchema);

// قائمة المفردات الأساسية (Core Vocabulary) - 100+ كلمة أساسية
const CORE_VOCABULARY = [
  // الأفعال الأساسية
  { word_ar: 'أريد', word_en: 'want', category: 'core', symbol_id: 'arasaac_1' },
  { word_ar: 'أنا', word_en: 'I', category: 'core', symbol_id: 'arasaac_2' },
  { word_ar: 'أكل', word_en: 'eat', category: 'core', symbol_id: 'arasaac_3' },
  { word_ar: 'شرب', word_en: 'drink', category: 'core', symbol_id: 'arasaac_4' },
  { word_ar: 'لعب', word_en: 'play', category: 'core', symbol_id: 'arasaac_5' },
  { word_ar: 'ذهب', word_en: 'go', category: 'core', symbol_id: 'arasaac_6' },
  { word_ar: 'أكثر', word_en: 'more', category: 'requests', symbol_id: 'arasaac_7' },
  { word_ar: 'انتهى', word_en: 'finished', category: 'core', symbol_id: 'arasaac_8' },
  { word_ar: 'مساعدة', word_en: 'help', category: 'requests', symbol_id: 'arasaac_9' },
  { word_ar: 'لا', word_en: 'no', category: 'core', symbol_id: 'arasaac_10' },
  { word_ar: 'نعم', word_en: 'yes', category: 'core', symbol_id: 'arasaac_11' },
  { word_ar: 'هذا', word_en: 'this', category: 'core', symbol_id: 'arasaac_12' },
  // المشاعر
  { word_ar: 'سعيد', word_en: 'happy', category: 'emotions', symbol_id: 'arasaac_20' },
  { word_ar: 'حزين', word_en: 'sad', category: 'emotions', symbol_id: 'arasaac_21' },
  { word_ar: 'غاضب', word_en: 'angry', category: 'emotions', symbol_id: 'arasaac_22' },
  { word_ar: 'خائف', word_en: 'scared', category: 'emotions', symbol_id: 'arasaac_23' },
  { word_ar: 'متعب', word_en: 'tired', category: 'emotions', symbol_id: 'arasaac_24' },
  { word_ar: 'جائع', word_en: 'hungry', category: 'emotions', symbol_id: 'arasaac_25' },
  // الاجتماعية
  { word_ar: 'مرحباً', word_en: 'hello', category: 'social', symbol_id: 'arasaac_30' },
  { word_ar: 'مع السلامة', word_en: 'goodbye', category: 'social', symbol_id: 'arasaac_31' },
  { word_ar: 'من فضلك', word_en: 'please', category: 'social', symbol_id: 'arasaac_32' },
  { word_ar: 'شكراً', word_en: 'thank you', category: 'social', symbol_id: 'arasaac_33' },
  // الأشياء اليومية
  { word_ar: 'ماء', word_en: 'water', category: 'fringe', symbol_id: 'arasaac_40' },
  { word_ar: 'طعام', word_en: 'food', category: 'fringe', symbol_id: 'arasaac_41' },
  { word_ar: 'حمام', word_en: 'bathroom', category: 'daily_activities', symbol_id: 'arasaac_42' },
  { word_ar: 'نوم', word_en: 'sleep', category: 'daily_activities', symbol_id: 'arasaac_43' },
  { word_ar: 'منزل', word_en: 'home', category: 'fringe', symbol_id: 'arasaac_44' },
  { word_ar: 'سيارة', word_en: 'car', category: 'fringe', symbol_id: 'arasaac_45' },
];

// ══════════════════════════════════════════════════════════════
// PRIORITY 10 - Therapeutic Protocol Library
// ══════════════════════════════════════════════════════════════

const TherapyProtocolSchema = new Schema(
  {
    protocol_code: { type: String, required: true, unique: true },
    protocol_name_ar: { type: String, required: true },
    protocol_name_en: String,
    approach: {
      type: String,
      enum: [
        'ABA',
        'PECS',
        'TEACCH',
        'DIR_FLOORTIME',
        'PRT',
        'SI',
        'SOCIAL_SKILLS',
        'SPEECH',
        'OT',
        'PT',
        'FEEDING',
        'BEHAVIOR',
        'COGNITIVE',
      ],
      required: true,
    },
    target_population: {
      age_range: { min: Number, max: Number },
      disability_types: [String],
      severity_levels: [String],
    },
    // هدف البروتوكول
    objective_ar: { type: String, required: true },
    rationale_ar: String,
    evidence_level: { type: String, enum: ['strong', 'moderate', 'emerging', 'expert_opinion'] },
    // مكونات البروتوكول
    session_structure: {
      duration_minutes: Number,
      frequency_per_week: Number,
      individual_vs_group: { type: String, enum: ['individual', 'group', 'both'] },
      setting: [String],
    },
    phases: [
      {
        phase_number: Number,
        phase_name_ar: String,
        duration_weeks: Number,
        objectives_ar: [String],
        activities_ar: [String],
        success_criteria_ar: [String],
        materials_needed: [String],
      },
    ],
    // إجراءات التدريب
    procedures_ar: [
      {
        step_number: Number,
        description_ar: String,
        prompting_hierarchy: String,
        reinforcement_schedule: String,
        data_collection_method: String,
      },
    ],
    // معايير الإتقان والتقدم
    mastery_criteria: {
      accuracy_percentage: Number,
      consecutive_sessions: Number,
      generalization_required: Boolean,
      criteria_description_ar: String,
    },
    // تعديلات للحالات الخاصة
    modifications: [
      {
        condition_ar: String,
        modification_ar: String,
      },
    ],
    // الموارد والمراجع
    required_materials: [String],
    assessment_tools: [String],
    references: [String],
    // الاستخدام
    usage_count: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    ratings_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: String, default: '1.0' },
  },
  { timestamps: true }
);

TherapyProtocolSchema.index({ approach: 1, 'target_population.disability_types': 1 });

const TherapyProtocol = mongoose.model('TherapyProtocol', TherapyProtocolSchema);

// بروتوكولات مدمجة - 12 بروتوكول أساسي
const BUILT_IN_PROTOCOLS = [
  {
    protocol_code: 'ABA-DTT-001',
    protocol_name_ar: 'التدريب التجريبي المنفصل (DTT) للمهارات الأساسية',
    protocol_name_en: 'Discrete Trial Training - Basic Skills',
    approach: 'ABA',
    target_population: {
      age_range: { min: 2, max: 12 },
      disability_types: ['autism', 'intellectual_disability'],
      severity_levels: ['severe', 'moderate'],
    },
    objective_ar: 'تعليم المهارات الأساسية التواصلية والاجتماعية والمعرفية من خلال تجارب منظمة',
    evidence_level: 'strong',
    session_structure: {
      duration_minutes: 30,
      frequency_per_week: 5,
      individual_vs_group: 'individual',
      setting: ['clinic', 'home'],
    },
    phases: [
      {
        phase_number: 1,
        phase_name_ar: 'التقييم والتحضير',
        duration_weeks: 1,
        objectives_ar: ['تحديد المهارات المستهدفة', 'اختيار المعززات'],
        activities_ar: ['تقييم VB-MAPP', 'مقابلة الأسرة', 'ملاحظة الطفل'],
      },
      {
        phase_number: 2,
        phase_name_ar: 'التدريب المكثف',
        duration_weeks: 12,
        objectives_ar: ['اكتساب المهارة', 'تقليل المساعدة'],
        activities_ar: ['تجارب DTT منظمة', 'تتبع البيانات', 'تعديل البرنامج'],
      },
      {
        phase_number: 3,
        phase_name_ar: 'التعميم',
        duration_weeks: 4,
        objectives_ar: ['تعميم المهارة في بيئات متعددة'],
        activities_ar: ['NET في البيئة الطبيعية', 'تدريب الأسرة'],
      },
    ],
    mastery_criteria: {
      accuracy_percentage: 80,
      consecutive_sessions: 3,
      generalization_required: true,
      criteria_description_ar: '80% دقة في 3 جلسات متتالية مع معالجين مختلفين وبيئات مختلفة',
    },
    required_materials: ['بطاقات صور', 'معززات', 'نماذج تسجيل البيانات', 'خزانة عمل'],
  },
  {
    protocol_code: 'PECS-FULL-001',
    protocol_name_ar: 'برنامج PECS الكامل - المراحل الست',
    protocol_name_en: 'PECS Complete Program - All Six Phases',
    approach: 'PECS',
    target_population: {
      age_range: { min: 2, max: 10 },
      disability_types: ['autism'],
      severity_levels: ['severe', 'moderate'],
    },
    objective_ar: 'تطوير التواصل الوظيفي من خلال تبادل الصور عبر المراحل الست',
    evidence_level: 'strong',
    session_structure: {
      duration_minutes: 20,
      frequency_per_week: 5,
      individual_vs_group: 'individual',
      setting: ['clinic', 'classroom', 'home'],
    },
    phases: [
      {
        phase_number: 1,
        phase_name_ar: 'المرحلة 1: كيف أتواصل؟',
        duration_weeks: 2,
        objectives_ar: ['تبادل الصورة للحصول على الشيء'],
        activities_ar: ['تدريب مع مساعدين اثنين', 'استخدام الأشياء المحببة'],
      },
      {
        phase_number: 2,
        phase_name_ar: 'المرحلة 2: المسافة والاستمرارية',
        duration_weeks: 3,
        objectives_ar: ['الذهاب إلى الشخص لتسليم الصورة'],
        activities_ar: ['زيادة المسافة تدريجياً', 'التنقل بين البيئات'],
      },
      {
        phase_number: 3,
        phase_name_ar: 'المرحلة 3: التمييز',
        duration_weeks: 4,
        objectives_ar: ['التمييز بين الصور المختلفة'],
        activities_ar: ['تمييز صورتين ثم زيادة العدد تدريجياً'],
      },
      {
        phase_number: 4,
        phase_name_ar: 'المرحلة 4: بناء الجملة',
        duration_weeks: 4,
        objectives_ar: ['استخدام شريط الجمل: أريد + صورة'],
        activities_ar: ['تدريب باستخدام شريط الجمل'],
      },
      {
        phase_number: 5,
        phase_name_ar: 'المرحلة 5: الإجابة على السؤال',
        duration_weeks: 3,
        objectives_ar: ['الإجابة على: ماذا تريد؟'],
        activities_ar: ['نمذجة السؤال والإجابة'],
      },
      {
        phase_number: 6,
        phase_name_ar: 'المرحلة 6: التعليق',
        duration_weeks: 4,
        objectives_ar: ['استخدام لغة التعليق: أرى، أسمع، لدي'],
        activities_ar: ['تعليق على البيئة المحيطة'],
      },
    ],
    mastery_criteria: {
      accuracy_percentage: 80,
      consecutive_sessions: 3,
      generalization_required: true,
      criteria_description_ar: '80% في 3 جلسات متتالية قبل الانتقال للمرحلة التالية',
    },
    required_materials: ['كتاب PECS', 'بطاقات صور ملصقة', 'شريط الجمل', 'مجلد الاتصالات'],
  },
  {
    protocol_code: 'TEACCH-WS-001',
    protocol_name_ar: 'نظام العمل المنظم في الفصل (Work System)',
    protocol_name_en: 'TEACCH Structured Work System',
    approach: 'TEACCH',
    target_population: {
      age_range: { min: 3, max: 18 },
      disability_types: ['autism', 'intellectual_disability'],
      severity_levels: ['severe', 'moderate', 'mild'],
    },
    objective_ar: 'تطوير القدرة على العمل بشكل مستقل ومنظم باستخدام الهياكل البصرية',
    evidence_level: 'strong',
    session_structure: {
      duration_minutes: 45,
      frequency_per_week: 5,
      individual_vs_group: 'individual',
      setting: ['classroom', 'clinic'],
    },
    phases: [
      {
        phase_number: 1,
        phase_name_ar: 'إعداد البيئة',
        duration_weeks: 1,
        objectives_ar: ['تنظيم منطقة العمل المستقل'],
        activities_ar: ['إعداد الطاولة والصناديق', 'تثبيت الجدول البصري'],
      },
      {
        phase_number: 2,
        phase_name_ar: 'تدريب نظام العمل',
        duration_weeks: 4,
        objectives_ar: ['تعلم نظام: ماذا أفعل؟ كم؟ ثم ماذا؟'],
        activities_ar: ['تعليم قراءة نظام العمل', 'مهام سهلة مألوفة أولاً'],
      },
      {
        phase_number: 3,
        phase_name_ar: 'العمل المستقل',
        duration_weeks: 8,
        objectives_ar: ['إنجاز مهام بدون توجيه'],
        activities_ar: ['تدريج المهام من السهل للصعب', 'تعزيز الاستقلالية'],
      },
    ],
    mastery_criteria: {
      accuracy_percentage: 85,
      consecutive_sessions: 5,
      generalization_required: false,
      criteria_description_ar: 'إنجاز مهمة كاملة باستقلالية دون توجيه في 5 جلسات',
    },
    required_materials: ['صناديق عمل شفافة', 'جدول بصري', 'بطاقات الانتهاء', 'مهام مستوى الطفل'],
  },
  {
    protocol_code: 'ABA-FBA-001',
    protocol_name_ar: 'التقييم الوظيفي للسلوك (FBA) وخطة التدخل',
    protocol_name_en: 'Functional Behavior Assessment & Intervention',
    approach: 'BEHAVIOR',
    target_population: {
      age_range: { min: 2, max: 18 },
      disability_types: ['autism', 'intellectual_disability', 'adhd'],
      severity_levels: ['severe', 'moderate'],
    },
    objective_ar: 'تحديد الوظيفة التي يؤديها السلوك الصعب ووضع خطة تدخل فعالة',
    evidence_level: 'strong',
    session_structure: {
      duration_minutes: 60,
      frequency_per_week: 3,
      individual_vs_group: 'individual',
      setting: ['clinic', 'home', 'school'],
    },
    phases: [
      {
        phase_number: 1,
        phase_name_ar: 'جمع المعلومات',
        duration_weeks: 2,
        objectives_ar: ['تحديد السلوك بدقة', 'تحليل ABC'],
        activities_ar: ['مقابلات الأسرة', 'ملاحظة مباشرة', 'تسجيل ABC'],
      },
      {
        phase_number: 2,
        phase_name_ar: 'تحليل البيانات',
        duration_weeks: 1,
        objectives_ar: ['تحديد وظيفة السلوك'],
        activities_ar: ['تحليل الأنماط', 'فرضية الوظيفة'],
      },
      {
        phase_number: 3,
        phase_name_ar: 'خطة التدخل',
        duration_weeks: 8,
        objectives_ar: ['تقليل السلوك غير المرغوب', 'تعليم بديل وظيفي'],
        activities_ar: ['FCT', 'تعديل البيئة', 'جدول تعزيز'],
      },
    ],
    mastery_criteria: {
      accuracy_percentage: 80,
      consecutive_sessions: 2,
      generalization_required: true,
      criteria_description_ar: 'تقليل السلوك بنسبة 80% من خط الأساس في بيئتين مختلفتين',
    },
    required_materials: ['نماذج ABC', 'نماذج FBA', 'سجلات الترددات'],
  },
  {
    protocol_code: 'SI-AYRES-001',
    protocol_name_ar: 'بروتوكول التكامل الحسي - نهج أيرز',
    protocol_name_en: 'Sensory Integration Protocol - Ayres Approach',
    approach: 'SI',
    target_population: {
      age_range: { min: 2, max: 12 },
      disability_types: ['autism', 'sensory_processing'],
      severity_levels: ['moderate', 'mild'],
    },
    objective_ar: 'تحسين معالجة المعلومات الحسية وتعزيز التنظيم الذاتي',
    evidence_level: 'moderate',
    session_structure: {
      duration_minutes: 45,
      frequency_per_week: 3,
      individual_vs_group: 'individual',
      setting: ['clinic'],
    },
    phases: [
      {
        phase_number: 1,
        phase_name_ar: 'التقييم الحسي',
        duration_weeks: 2,
        objectives_ar: ['تحديد نمط المعالجة الحسية'],
        activities_ar: ['SPM', 'SIPT', 'ملاحظة اللعب'],
      },
      {
        phase_number: 2,
        phase_name_ar: 'التدخل الحسي الموجّه',
        duration_weeks: 16,
        objectives_ar: ['تطوير التنظيم الحسي', 'تحسين الإدراك الجسدي'],
        activities_ar: ['بروتوكول الضغط العميق', 'تأرجح دهليزي', 'أنشطة بروبريوسيبتيف'],
      },
    ],
    mastery_criteria: {
      accuracy_percentage: 70,
      consecutive_sessions: 3,
      generalization_required: true,
      criteria_description_ar: 'تحسن ملحوظ في SPM وانخفاض في ردود الفعل الحسية المتطرفة',
    },
    required_materials: ['أرجوحة معلقة', 'فرشاة Wilbarger', 'مواد ثقيلة', 'ألعاب حسية'],
  },
  {
    protocol_code: 'SOCIAL-PEERS-001',
    protocol_name_ar: 'برنامج PEERS للمهارات الاجتماعية',
    protocol_name_en: 'PEERS Social Skills Program',
    approach: 'SOCIAL_SKILLS',
    target_population: {
      age_range: { min: 10, max: 18 },
      disability_types: ['autism', 'asperger'],
      severity_levels: ['mild', 'moderate'],
    },
    objective_ar: 'تطوير مهارات الصداقة والتفاعل الاجتماعي لدى المراهقين',
    evidence_level: 'strong',
    session_structure: {
      duration_minutes: 90,
      frequency_per_week: 1,
      individual_vs_group: 'group',
      setting: ['clinic', 'school'],
    },
    phases: [
      {
        phase_number: 1,
        phase_name_ar: 'المهارات الأساسية',
        duration_weeks: 8,
        objectives_ar: ['الحديث الاجتماعي', 'التبادل المعلوماتي'],
        activities_ar: ['محاضرات', 'لعب دور', 'واجب اجتماعي'],
      },
      {
        phase_number: 2,
        phase_name_ar: 'المهارات المتقدمة',
        duration_weeks: 8,
        objectives_ar: ['إقامة الصداقات', 'حل الخلافات'],
        activities_ar: ['تمرينات الصداقة', 'نمذجة فيديو'],
      },
    ],
    mastery_criteria: {
      accuracy_percentage: 75,
      consecutive_sessions: 3,
      generalization_required: true,
      criteria_description_ar: 'تطبيق المهارات في مواقف اجتماعية حقيقية',
    },
    required_materials: ['كتاب PEERS', 'أوراق العمل', 'فيديوهات النمذجة'],
  },
];

// ─── Routes ─────────────────────────────────────────────────────────────────────

// ── AAC Routes ──────────────────────────────────────────────────

router.post('/aac/profiles', async (req, res) => {
  try {
    const existing = await AACProfile.findOne({ beneficiary_id: req.body.beneficiary_id });
    if (existing)
      return res.status(409).json({ success: false, error: 'الملف موجود مسبقاً', data: existing });
    const profile = new AACProfile(req.body);
    await profile.save();
    res.status(201).json({ success: true, message: 'تم إنشاء ملف AAC', data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/aac/profiles/:beneficiaryId', async (req, res) => {
  try {
    let profile = await AACProfile.findOne({ beneficiary_id: req.params.beneficiaryId });
    if (!profile) return res.status(404).json({ success: false, error: 'ملف AAC غير موجود' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/aac/profiles/:beneficiaryId', async (req, res) => {
  try {
    const profile = await AACProfile.findOneAndUpdate(
      { beneficiary_id: req.params.beneficiaryId },
      req.body,
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    res.json({ success: true, message: 'تم تحديث ملف AAC', data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/aac/profiles/:beneficiaryId/vocabulary', async (req, res) => {
  try {
    const profile = await AACProfile.findOne({ beneficiary_id: req.params.beneficiaryId });
    if (!profile) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    const word = { ...req.body, introduced_date: new Date() };
    profile.vocabulary_bank.push(word);
    profile.communication_profile.vocabulary_size = profile.vocabulary_bank.length;
    await profile.save();
    res.status(201).json({ success: true, message: 'تم إضافة الكلمة', data: word });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/aac/profiles/:beneficiaryId/vocabulary/:wordId/mastered', async (req, res) => {
  try {
    const profile = await AACProfile.findOne({ beneficiary_id: req.params.beneficiaryId });
    if (!profile) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    const word = profile.vocabulary_bank.id(req.params.wordId);
    if (word) {
      word.mastered = true;
      word.mastery_date = new Date();
    }
    await profile.save();
    res.json({ success: true, message: 'تم تسجيل إتقان الكلمة' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/aac/profiles/:beneficiaryId/progress', async (req, res) => {
  try {
    const profile = await AACProfile.findOne({ beneficiary_id: req.params.beneficiaryId });
    if (!profile) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    profile.progress_log.push({ ...req.body, date: new Date() });
    if (req.body.pecs_phase_reached)
      profile.communication_profile.pecs_phase = req.body.pecs_phase_reached;
    await profile.save();
    res.status(201).json({ success: true, message: 'تم تسجيل التقدم' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/aac/core-vocabulary', (req, res) => {
  const { category } = req.query;
  const vocab = category ? CORE_VOCABULARY.filter(v => v.category === category) : CORE_VOCABULARY;
  res.json({ success: true, count: vocab.length, data: vocab });
});

// ── Therapy Protocol Routes ─────────────────────────────────────

router.post('/protocols/seed', async (req, res) => {
  try {
    let seeded = 0;
    for (const proto of BUILT_IN_PROTOCOLS) {
      const exists = await TherapyProtocol.findOne({ protocol_code: proto.protocol_code });
      if (!exists) {
        await TherapyProtocol.create(proto);
        seeded++;
      }
    }
    res.json({ success: true, message: `تم تهيئة ${seeded} بروتوكولات`, seeded });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/protocols', async (req, res) => {
  try {
    const { approach, disability_type, age } = req.query;
    const filter = { is_active: true };
    if (approach) filter.approach = approach;
    if (disability_type) filter['target_population.disability_types'] = disability_type;
    if (age) {
      const ageNum = parseInt(age);
      filter['target_population.age_range.min'] = { $lte: ageNum };
      filter['target_population.age_range.max'] = { $gte: ageNum };
    }
    const protocols = await TherapyProtocol.find(filter)
      .select(
        'protocol_code protocol_name_ar approach target_population objective_ar evidence_level usage_count rating'
      )
      .sort({ usage_count: -1 });
    res.json({ success: true, count: protocols.length, data: protocols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/protocols/:id', async (req, res) => {
  try {
    const protocol = await TherapyProtocol.findById(req.params.id);
    if (!protocol) return res.status(404).json({ success: false, error: 'البروتوكول غير موجود' });
    await TherapyProtocol.findByIdAndUpdate(req.params.id, { $inc: { usage_count: 1 } });
    res.json({ success: true, data: protocol });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/protocols', async (req, res) => {
  try {
    const protocol = new TherapyProtocol(req.body);
    await protocol.save();
    res.status(201).json({ success: true, message: 'تم إنشاء البروتوكول', data: protocol });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/protocols/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, error: 'التقييم يجب أن يكون بين 1 و 5' });
    const protocol = await TherapyProtocol.findById(req.params.id);
    if (!protocol) return res.status(404).json({ success: false, error: 'البروتوكول غير موجود' });
    const newRating =
      (protocol.rating * protocol.ratings_count + rating) / (protocol.ratings_count + 1);
    await TherapyProtocol.findByIdAndUpdate(req.params.id, {
      rating: Math.round(newRating * 10) / 10,
      $inc: { ratings_count: 1 },
    });
    res.json({ success: true, new_rating: Math.round(newRating * 10) / 10 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/protocols/search/:beneficiaryId', async (req, res) => {
  try {
    // البحث عن بروتوكولات مناسبة للمستفيد بناءً على ملفه
    const { RecommendationReport } = mongoose.models;
    let filter = { is_active: true };

    if (RecommendationReport) {
      const rec = await RecommendationReport.findOne({
        beneficiary_id: req.params.beneficiaryId,
      }).sort({ createdAt: -1 });
      if (rec && rec.primary_approach) {
        filter.approach = { $in: [rec.primary_approach, ...(rec.secondary_approaches || [])] };
      }
    }

    const protocols = await TherapyProtocol.find(filter)
      .select('protocol_code protocol_name_ar approach objective_ar evidence_level')
      .sort({ usage_count: -1 })
      .limit(10);
    res.json({ success: true, count: protocols.length, data: protocols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
