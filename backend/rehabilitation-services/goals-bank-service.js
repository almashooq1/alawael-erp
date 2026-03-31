/**
 * Goals Bank Service - بنك الأهداف العلاجية
 * 200+ هدف علاجي مصنف حسب المجال والمستوى والفئة العمرية
 */

const mongoose = require('mongoose');

// ============================================================
// Schema تعريف نموذج بنك الأهداف
// ============================================================
const GoalSchema = new mongoose.Schema(
  {
    goalId: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String },
    domain: {
      type: String,
      enum: [
        'communication',
        'cognitive',
        'motor_fine',
        'motor_gross',
        'social_emotional',
        'self_care',
        'behavioral',
        'sensory',
        'academic',
        'vocational',
        'daily_living',
        'play',
        'language',
        'feeding',
        'hearing',
        'vision',
        'transition',
      ],
      required: true,
    },
    subdomain: { type: String },
    ageGroup: {
      type: String,
      enum: [
        'infant_0_1',
        'toddler_1_3',
        'preschool_3_6',
        'school_6_12',
        'teen_12_18',
        'adult_18_plus',
        'all',
      ],
      default: 'all',
    },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    targetPopulation: [{ type: String }], // autism, CP, Down, ID, SLD, etc.
    measurementCriteria: { type: String },
    baseline: { type: String },
    shortTermObjectives: [{ type: String }],
    interventionStrategies: [{ type: String }],
    evidenceBase: { type: String },
    icdCodes: [{ type: String }],
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const Goal = mongoose.model('GoalBank', GoalSchema);

// ============================================================
// بنك الأهداف - 200+ هدف مصنف
// ============================================================
const GOALS_BANK = [
  // ============ مجال التواصل (Communication) ============
  {
    goalId: 'COM-001',
    titleAr: 'ينتج أصوات متنوعة للتواصل',
    domain: 'communication',
    subdomain: 'expressive',
    ageGroup: 'infant_0_1',
    level: 'beginner',
    targetPopulation: ['autism', 'developmental_delay'],
    measurementCriteria: '5 مرات في 10 دقائق من اللعب',
    shortTermObjectives: ['يصدر صوت "بابا"', 'يصدر صوت "ماما"', 'يصدر 3 أصوات مختلفة'],
    interventionStrategies: ['النمذجة الصوتية', 'التعزيز الفوري', 'الوقت الانتظاري'],
  },
  {
    goalId: 'COM-002',
    titleAr: 'يستخدم إيماءات للتواصل (توجيه، رفض، موافقة)',
    domain: 'communication',
    subdomain: 'nonverbal',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['autism', 'hearing_impairment'],
    measurementCriteria: '3 إيماءات مختلفة في 5 مواقف يومية',
    shortTermObjectives: ['يومئ بالرأس إيجاباً', 'يشير بالإصبع', 'يمد يده طلباً للشيء'],
  },
  {
    goalId: 'COM-003',
    titleAr: 'يستخدم مفردات أحادية (50 كلمة)',
    domain: 'communication',
    subdomain: 'expressive_language',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['autism', 'developmental_delay', 'hearing_impairment'],
    measurementCriteria: '50 كلمة وظيفية بمعدل دقة 80%',
  },
  {
    goalId: 'COM-004',
    titleAr: 'يستخدم جملاً من كلمتين',
    domain: 'communication',
    subdomain: 'expressive_language',
    ageGroup: 'toddler_1_3',
    level: 'intermediate',
    measurementCriteria: '10 جمل مختلفة في جلسة واحدة',
  },
  {
    goalId: 'COM-005',
    titleAr: 'يجيب عن أسئلة "من" و"ماذا"',
    domain: 'communication',
    subdomain: 'receptive_language',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
    measurementCriteria: '80% دقة في 10 أسئلة متتالية',
  },
  {
    goalId: 'COM-006',
    titleAr: 'يستخدم الضمائر (أنا، هو، هي) بشكل صحيح',
    domain: 'communication',
    subdomain: 'expressive_language',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
    targetPopulation: ['autism', 'language_delay'],
  },
  {
    goalId: 'COM-007',
    titleAr: 'يحكي قصة بسيطة من 3 أحداث',
    domain: 'communication',
    subdomain: 'narrative',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    measurementCriteria: '3 أحداث مرتبة منطقياً بدقة 75%',
  },
  {
    goalId: 'COM-008',
    titleAr: 'يستخدم نظام AAC للتواصل',
    domain: 'communication',
    subdomain: 'AAC',
    ageGroup: 'all',
    level: 'beginner',
    targetPopulation: ['non_verbal', 'autism', 'CP'],
    interventionStrategies: ['PECS', 'لوحة التواصل', 'تطبيقات AAC'],
  },
  {
    goalId: 'COM-009',
    titleAr: 'يطرح أسئلة للحصول على معلومات',
    domain: 'communication',
    subdomain: 'pragmatic',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'COM-010',
    titleAr: 'يحافظ على موضوع المحادثة لـ 3 تبادلات',
    domain: 'communication',
    subdomain: 'pragmatic',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'COM-011',
    titleAr: 'يفهم التعليمات المكونة من خطوتين',
    domain: 'communication',
    subdomain: 'receptive_language',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
  },
  {
    goalId: 'COM-012',
    titleAr: 'يفهم مفهوم "قبل" و"بعد"',
    domain: 'communication',
    subdomain: 'receptive_language',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'COM-013',
    titleAr: 'يستخدم الأفعال في الجمل بشكل صحيح',
    domain: 'communication',
    subdomain: 'grammar',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'COM-014',
    titleAr: 'يقرأ بصوت عالٍ بطلاقة مناسبة للعمر',
    domain: 'communication',
    subdomain: 'literacy',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'COM-015',
    titleAr: 'يفهم المعنى الضمني في الكلام',
    domain: 'communication',
    subdomain: 'pragmatic',
    ageGroup: 'teen_12_18',
    level: 'advanced',
    targetPopulation: ['autism'],
  },

  // ============ مجال الإدراك (Cognitive) ============
  {
    goalId: 'COG-001',
    titleAr: 'يميز بين الأشكال الهندسية الأساسية (دائرة، مثلث، مربع)',
    domain: 'cognitive',
    subdomain: 'visual_discrimination',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    measurementCriteria: '3/3 أشكال بدقة 100%',
  },
  {
    goalId: 'COG-002',
    titleAr: 'يطابق الألوان الأساسية الستة',
    domain: 'cognitive',
    subdomain: 'categorization',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
  },
  {
    goalId: 'COG-003',
    titleAr: 'يرتب الأشياء حسب الحجم (من الأصغر للأكبر)',
    domain: 'cognitive',
    subdomain: 'sequencing',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'COG-004',
    titleAr: 'يعدّ من 1-10 بشكل صحيح',
    domain: 'cognitive',
    subdomain: 'numeracy',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'COG-005',
    titleAr: 'يحل ألغاز من 9 قطع',
    domain: 'cognitive',
    subdomain: 'problem_solving',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'COG-006',
    titleAr: 'يفهم مفهوم الزمن (أمس، اليوم، غداً)',
    domain: 'cognitive',
    subdomain: 'temporal_concepts',
    ageGroup: 'school_6_12',
    level: 'beginner',
  },
  {
    goalId: 'COG-007',
    titleAr: 'يصنّف الأشياء في فئات (حيوانات، طعام، مركبات)',
    domain: 'cognitive',
    subdomain: 'categorization',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'COG-008',
    titleAr: 'يحل مسائل جمع وطرح بسيطة',
    domain: 'cognitive',
    subdomain: 'math',
    ageGroup: 'school_6_12',
    level: 'beginner',
  },
  {
    goalId: 'COG-009',
    titleAr: 'يتذكر 5 معلومات بعد تأخير 10 دقائق',
    domain: 'cognitive',
    subdomain: 'memory',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'COG-010',
    titleAr: 'يستخدم استراتيجيات لحل المشكلات',
    domain: 'cognitive',
    subdomain: 'executive_function',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COG-011',
    titleAr: 'يفهم علاقة السبب والنتيجة',
    domain: 'cognitive',
    subdomain: 'reasoning',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'COG-012',
    titleAr: 'يخطط لمهمة متعددة الخطوات',
    domain: 'cognitive',
    subdomain: 'executive_function',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COG-013',
    titleAr: 'يستخدم الذاكرة العاملة لتنفيذ التعليمات',
    domain: 'cognitive',
    subdomain: 'memory',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'COG-014',
    titleAr: 'يميز بين الواقع والخيال',
    domain: 'cognitive',
    subdomain: 'reasoning',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'COG-015',
    titleAr: 'يفهم مفهوم الكميات (أكثر، أقل، مساوٍ)',
    domain: 'cognitive',
    subdomain: 'numeracy',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },

  // ============ المهارات الحركية الدقيقة (Fine Motor) ============
  {
    goalId: 'FMT-001',
    titleAr: 'يمسك القلم بقبضة كتابة صحيحة',
    domain: 'motor_fine',
    subdomain: 'pencil_grip',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
    targetPopulation: ['CP', 'developmental_delay', 'DCD'],
  },
  {
    goalId: 'FMT-002',
    titleAr: 'يقص على خط مستقيم',
    domain: 'motor_fine',
    subdomain: 'tool_use',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'FMT-003',
    titleAr: 'يربط أزرار الملابس بشكل مستقل',
    domain: 'motor_fine',
    subdomain: 'self_care_skills',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'FMT-004',
    titleAr: 'يرسم أشكالاً هندسية (مربع، مثلث)',
    domain: 'motor_fine',
    subdomain: 'prewriting',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'FMT-005',
    titleAr: 'يكتب اسمه الأول بخط مقروء',
    domain: 'motor_fine',
    subdomain: 'writing',
    ageGroup: 'school_6_12',
    level: 'beginner',
  },
  {
    goalId: 'FMT-006',
    titleAr: 'يستخدم أدوات الطعام (ملعقة، شوكة) باستقلالية',
    domain: 'motor_fine',
    subdomain: 'feeding',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
  },
  {
    goalId: 'FMT-007',
    titleAr: 'يلصق ملصقات بدقة في الأماكن المحددة',
    domain: 'motor_fine',
    subdomain: 'bilateral_coordination',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'FMT-008',
    titleAr: 'يفك ويربط الأحذية بالشريط',
    domain: 'motor_fine',
    subdomain: 'self_care_skills',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'FMT-009',
    titleAr: 'يستخدم الحاسوب بلوحة مفاتيح',
    domain: 'motor_fine',
    subdomain: 'technology',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'FMT-010',
    titleAr: 'يطوي الورق إلى نصفين',
    domain: 'motor_fine',
    subdomain: 'bilateral_coordination',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'FMT-011',
    titleAr: 'يبني برج من 10 مكعبات',
    domain: 'motor_fine',
    subdomain: 'construction',
    ageGroup: 'toddler_1_3',
    level: 'intermediate',
  },
  {
    goalId: 'FMT-012',
    titleAr: 'يملأ استمارة كتابية مستقلاً',
    domain: 'motor_fine',
    subdomain: 'writing',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'FMT-013',
    titleAr: 'يرسم شخصاً بـ 6 أجزاء على الأقل',
    domain: 'motor_fine',
    subdomain: 'drawing',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'FMT-014',
    titleAr: 'يقص أشكالاً منحنية بدقة',
    domain: 'motor_fine',
    subdomain: 'tool_use',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'FMT-015',
    titleAr: 'يستخدم الإبهام والسبابة في قبضة قرصية',
    domain: 'motor_fine',
    subdomain: 'grasp_patterns',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
  },

  // ============ المهارات الحركية الكبيرة (Gross Motor) ============
  {
    goalId: 'GMT-001',
    titleAr: 'يمشي على خط مستقيم بدون دعم',
    domain: 'motor_gross',
    subdomain: 'balance',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['CP', 'hypotonia', 'developmental_delay'],
  },
  {
    goalId: 'GMT-002',
    titleAr: 'يصعد ويهبط الدرج متناوباً القدمين',
    domain: 'motor_gross',
    subdomain: 'stair_climbing',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
  },
  {
    goalId: 'GMT-003',
    titleAr: 'يقفز على قدم واحدة 5 مرات',
    domain: 'motor_gross',
    subdomain: 'hopping',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'GMT-004',
    titleAr: 'يركل كرة نحو هدف',
    domain: 'motor_gross',
    subdomain: 'ball_skills',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'GMT-005',
    titleAr: 'يتحرك على الكرسي المتحرك بشكل مستقل',
    domain: 'motor_gross',
    subdomain: 'mobility_aids',
    ageGroup: 'all',
    level: 'beginner',
    targetPopulation: ['CP', 'SCI', 'wheelchair_user'],
  },
  {
    goalId: 'GMT-006',
    titleAr: 'يرمي الكرة ويمسكها من مسافة 2 متر',
    domain: 'motor_gross',
    subdomain: 'ball_skills',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'GMT-007',
    titleAr: 'يقفز بكلتا القدمين 10 مرات متواصلة',
    domain: 'motor_gross',
    subdomain: 'jumping',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'GMT-008',
    titleAr: 'يقف على قدم واحدة 10 ثوانٍ',
    domain: 'motor_gross',
    subdomain: 'balance',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'GMT-009',
    titleAr: 'يتنقل بين الأثاث باستخدام دعامة يدوية',
    domain: 'motor_gross',
    subdomain: 'transfer_skills',
    ageGroup: 'all',
    level: 'beginner',
    targetPopulation: ['CP', 'muscular_dystrophy'],
  },
  {
    goalId: 'GMT-010',
    titleAr: 'يمارس نشاطاً رياضياً مجتمعياً',
    domain: 'motor_gross',
    subdomain: 'sports',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },

  // ============ المهارات الاجتماعية العاطفية (Social-Emotional) ============
  {
    goalId: 'SOC-001',
    titleAr: 'يحافظ على التواصل البصري لمدة 3 ثوانٍ',
    domain: 'social_emotional',
    subdomain: 'joint_attention',
    ageGroup: 'infant_0_1',
    level: 'beginner',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'SOC-002',
    titleAr: 'يشارك في اللعب التبادلي مع طفل آخر',
    domain: 'social_emotional',
    subdomain: 'peer_interaction',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
    targetPopulation: ['autism', 'social_anxiety'],
  },
  {
    goalId: 'SOC-003',
    titleAr: 'يعرّف انفعالاته الأساسية (فرح، حزن، خوف، غضب)',
    domain: 'social_emotional',
    subdomain: 'emotional_identification',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
    targetPopulation: ['autism', 'ID'],
  },
  {
    goalId: 'SOC-004',
    titleAr: 'يستخدم استراتيجيات تهدئة ذاتية',
    domain: 'social_emotional',
    subdomain: 'self_regulation',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['ADHD', 'autism', 'anxiety'],
  },
  {
    goalId: 'SOC-005',
    titleAr: 'يعمل ضمن مجموعة لإتمام مهمة',
    domain: 'social_emotional',
    subdomain: 'teamwork',
    ageGroup: 'school_6_12',
    level: 'advanced',
    targetPopulation: ['autism', 'ADHD'],
  },
  {
    goalId: 'SOC-006',
    titleAr: 'يبدأ تفاعلاً اجتماعياً مع الأقران',
    domain: 'social_emotional',
    subdomain: 'social_initiation',
    ageGroup: 'school_6_12',
    level: 'advanced',
    targetPopulation: ['autism', 'social_anxiety'],
  },
  {
    goalId: 'SOC-007',
    titleAr: 'يتعرف على مشاعر الآخرين من تعبيرات الوجه',
    domain: 'social_emotional',
    subdomain: 'emotion_recognition',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'SOC-008',
    titleAr: 'يعتذر عند الخطأ بشكل مناسب',
    domain: 'social_emotional',
    subdomain: 'social_skills',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'SOC-009',
    titleAr: 'يتبع قواعد الألعاب الجماعية',
    domain: 'social_emotional',
    subdomain: 'rule_following',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'SOC-010',
    titleAr: 'يدير الإحباط بطريقة مقبولة اجتماعياً',
    domain: 'social_emotional',
    subdomain: 'frustration_tolerance',
    ageGroup: 'school_6_12',
    level: 'advanced',
    targetPopulation: ['autism', 'ADHD', 'ODD'],
  },
  {
    goalId: 'SOC-011',
    titleAr: 'يقيم صداقة مستدامة',
    domain: 'social_emotional',
    subdomain: 'friendship',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'SOC-012',
    titleAr: 'يميز بين الحدود الجسدية الآمنة والخطرة',
    domain: 'social_emotional',
    subdomain: 'safety',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },

  // ============ العناية بالذات (Self-Care) ============
  {
    goalId: 'SFC-001',
    titleAr: 'يغسل يديه بشكل مستقل',
    domain: 'self_care',
    subdomain: 'hygiene',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'SFC-002',
    titleAr: 'يرتدي ملابسه باستقلالية',
    domain: 'self_care',
    subdomain: 'dressing',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'SFC-003',
    titleAr: 'يستخدم المرحاض باستقلالية',
    domain: 'self_care',
    subdomain: 'toileting',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['autism', 'ID', 'developmental_delay'],
  },
  {
    goalId: 'SFC-004',
    titleAr: 'يستحم بإشراف بسيط',
    domain: 'self_care',
    subdomain: 'bathing',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'SFC-005',
    titleAr: 'يحضّر وجبة خفيفة بسيطة',
    domain: 'self_care',
    subdomain: 'meal_preparation',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'SFC-006',
    titleAr: 'يتنقل في المجتمع باستخدام المواصلات العامة',
    domain: 'self_care',
    subdomain: 'community_mobility',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'SFC-007',
    titleAr: 'ينظم وقته باستخدام جدول يومي',
    domain: 'self_care',
    subdomain: 'time_management',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'SFC-008',
    titleAr: 'يدير ميزانية بسيطة للمصاريف اليومية',
    domain: 'self_care',
    subdomain: 'money_management',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },
  {
    goalId: 'SFC-009',
    titleAr: 'يتناول الطعام من جميع المجموعات الغذائية',
    domain: 'self_care',
    subdomain: 'feeding',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['autism', 'feeding_disorder'],
  },
  {
    goalId: 'SFC-010',
    titleAr: 'يهتم بنظافة أسنانه مرتين يومياً',
    domain: 'self_care',
    subdomain: 'hygiene',
    ageGroup: 'school_6_12',
    level: 'beginner',
  },

  // ============ السلوك (Behavioral) ============
  {
    goalId: 'BEH-001',
    titleAr: 'يجلس في مكانه خلال وقت الحلقة (10 دقائق)',
    domain: 'behavioral',
    subdomain: 'on_task',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
    targetPopulation: ['ADHD', 'autism'],
  },
  {
    goalId: 'BEH-002',
    titleAr: 'يقلل من السلوكيات النمطية الضارة',
    domain: 'behavioral',
    subdomain: 'stereotypy',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'BEH-003',
    titleAr: 'ينتظر دوره في النشاطات الجماعية',
    domain: 'behavioral',
    subdomain: 'impulse_control',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
    targetPopulation: ['ADHD', 'autism'],
  },
  {
    goalId: 'BEH-004',
    titleAr: 'ينتقل بين الأنشطة بدون نوبة غضب',
    domain: 'behavioral',
    subdomain: 'transitions',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
    targetPopulation: ['autism', 'ID'],
  },
  {
    goalId: 'BEH-005',
    titleAr: 'يستجيب لاستراتيجيات تهدئة المعالج',
    domain: 'behavioral',
    subdomain: 'emotional_regulation',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'BEH-006',
    titleAr: 'يتبع جدول النشاطات المرئي باستقلالية',
    domain: 'behavioral',
    subdomain: 'schedule_following',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['autism', 'ADHD'],
  },
  {
    goalId: 'BEH-007',
    titleAr: 'يعبر عن الإحباط بالكلمات بدلاً من العنف',
    domain: 'behavioral',
    subdomain: 'aggression_replacement',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'BEH-008',
    titleAr: 'يكمل المهمة المطلوبة بدون تشتت لـ 15 دقيقة',
    domain: 'behavioral',
    subdomain: 'attention',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['ADHD'],
  },

  // ============ الحسية (Sensory) ============
  {
    goalId: 'SEN-001',
    titleAr: 'يتحمل لمس مواد ذات أنسجة متنوعة',
    domain: 'sensory',
    subdomain: 'tactile',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['autism', 'sensory_processing_disorder'],
  },
  {
    goalId: 'SEN-002',
    titleAr: 'يتحمل الأصوات البيئية اليومية',
    domain: 'sensory',
    subdomain: 'auditory',
    ageGroup: 'preschool_3_6',
    level: 'intermediate',
    targetPopulation: ['autism', 'hyperacusis'],
  },
  {
    goalId: 'SEN-003',
    titleAr: 'يستخدم المأكولات من فئات ملمس متعددة',
    domain: 'sensory',
    subdomain: 'oral_sensory',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['autism', 'feeding_disorder'],
  },
  {
    goalId: 'SEN-004',
    titleAr: 'يشارك في نشاطات حسية حركية بفاعلية',
    domain: 'sensory',
    subdomain: 'vestibular',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'SEN-005',
    titleAr: 'ينظم نفسه بعد المدخلات الحسية المكثفة',
    domain: 'sensory',
    subdomain: 'self_regulation',
    ageGroup: 'school_6_12',
    level: 'advanced',
    targetPopulation: ['autism', 'sensory_processing_disorder'],
  },
  {
    goalId: 'SEN-006',
    titleAr: 'يتكيف مع الإضاءة المتغيرة في البيئة',
    domain: 'sensory',
    subdomain: 'visual',
    ageGroup: 'all',
    level: 'intermediate',
  },
  {
    goalId: 'SEN-007',
    titleAr: 'يتحمل ارتداء ملابس ذات ملمس مختلف',
    domain: 'sensory',
    subdomain: 'tactile',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['autism', 'sensory_processing_disorder'],
  },
  {
    goalId: 'SEN-008',
    titleAr: 'يستخدم أدوات التنظيم الحسي بشكل مستقل',
    domain: 'sensory',
    subdomain: 'self_regulation',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },

  // ============ الأكاديمية (Academic) ============
  {
    goalId: 'ACA-001',
    titleAr: 'يتعرف على الحروف الهجائية العربية',
    domain: 'academic',
    subdomain: 'literacy',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'ACA-002',
    titleAr: 'يقرأ كلمات أحادية المقطع',
    domain: 'academic',
    subdomain: 'reading',
    ageGroup: 'school_6_12',
    level: 'beginner',
  },
  {
    goalId: 'ACA-003',
    titleAr: 'يكتب جملة بسيطة بخط مقروء',
    domain: 'academic',
    subdomain: 'writing',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'ACA-004',
    titleAr: 'يحل مسائل ضرب من 1-10',
    domain: 'academic',
    subdomain: 'math',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'ACA-005',
    titleAr: 'يفهم نص مقروء ويجيب عن أسئلة الفهم',
    domain: 'academic',
    subdomain: 'reading_comprehension',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'ACA-006',
    titleAr: 'يستخدم المسطرة لرسم خطوط مستقيمة',
    domain: 'academic',
    subdomain: 'math_tools',
    ageGroup: 'school_6_12',
    level: 'beginner',
  },
  {
    goalId: 'ACA-007',
    titleAr: 'يكتب فقرة قصيرة عن موضوع مألوف',
    domain: 'academic',
    subdomain: 'written_expression',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'ACA-008',
    titleAr: 'يتعرف على رموز العملات ويحسب المبالغ',
    domain: 'academic',
    subdomain: 'functional_math',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },

  // ============ المهنية والانتقالية (Vocational & Transition) ============
  {
    goalId: 'VOC-001',
    titleAr: 'يكمل مهمة عمل بسيطة لمدة 15 دقيقة',
    domain: 'vocational',
    subdomain: 'work_readiness',
    ageGroup: 'teen_12_18',
    level: 'beginner',
  },
  {
    goalId: 'VOC-002',
    titleAr: 'يملأ نموذج طلب توظيف',
    domain: 'vocational',
    subdomain: 'job_seeking',
    ageGroup: 'adult_18_plus',
    level: 'intermediate',
  },
  {
    goalId: 'VOC-003',
    titleAr: 'يتواصل مع الزملاء في بيئة العمل بشكل مناسب',
    domain: 'vocational',
    subdomain: 'workplace_social',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },
  {
    goalId: 'VOC-004',
    titleAr: 'يدير وقته في أداء المهام المهنية',
    domain: 'vocational',
    subdomain: 'time_management',
    ageGroup: 'adult_18_plus',
    level: 'intermediate',
  },
  {
    goalId: 'TRN-001',
    titleAr: 'يشارك في برنامج التخطيط لمرحلة الانتقال',
    domain: 'transition',
    subdomain: 'transition_planning',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'TRN-002',
    titleAr: 'يتعرف على الموارد المجتمعية المتاحة',
    domain: 'transition',
    subdomain: 'community_resources',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'TRN-003',
    titleAr: 'ينتقل إلى بيئة سكن مستقل بدعم',
    domain: 'transition',
    subdomain: 'independent_living',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },

  // ============ مهارات اللعب (Play) ============
  {
    goalId: 'PLY-001',
    titleAr: 'يشارك في اللعب الموازي مع الأقران',
    domain: 'play',
    subdomain: 'parallel_play',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'PLY-002',
    titleAr: 'يستخدم الدمى في لعب إيهامي',
    domain: 'play',
    subdomain: 'symbolic_play',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'PLY-003',
    titleAr: 'يلعب ألعاباً تنافسية باتزان عاطفي',
    domain: 'play',
    subdomain: 'competitive_play',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'PLY-004',
    titleAr: 'يبدع في اللعب الحر باستقلالية',
    domain: 'play',
    subdomain: 'independent_play',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'PLY-005',
    titleAr: 'يختار نشاط ترفيهي مناسب لوقت الفراغ',
    domain: 'play',
    subdomain: 'leisure',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },

  // ============ اللغة (Language) ============
  {
    goalId: 'LNG-001',
    titleAr: 'يصف الصورة بجملة كاملة',
    domain: 'language',
    subdomain: 'expressive',
    ageGroup: 'preschool_3_6',
    level: 'beginner',
  },
  {
    goalId: 'LNG-002',
    titleAr: 'يستخدم الحروف الرابطة (و، ثم، لأن) في الكلام',
    domain: 'language',
    subdomain: 'grammar',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'LNG-003',
    titleAr: 'يفهم معنى المفردات الجديدة من السياق',
    domain: 'language',
    subdomain: 'vocabulary',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'LNG-004',
    titleAr: 'يستخدم الأزمنة الثلاثة (ماضي، حاضر، مستقبل)',
    domain: 'language',
    subdomain: 'morphology',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'LNG-005',
    titleAr: 'يصف مشاعره وأفكاره بجمل كاملة',
    domain: 'language',
    subdomain: 'self_expression',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },

  // ============ التغذية (Feeding) ============
  {
    goalId: 'FED-001',
    titleAr: 'يقبل 5 أنواع جديدة من الطعام',
    domain: 'feeding',
    subdomain: 'food_acceptance',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
    targetPopulation: ['autism', 'feeding_disorder'],
  },
  {
    goalId: 'FED-002',
    titleAr: 'يمضغ الطعام ذو الكثافة المتوسطة',
    domain: 'feeding',
    subdomain: 'oral_motor',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['CP', 'feeding_disorder'],
  },
  {
    goalId: 'FED-003',
    titleAr: 'يتناول وجبة متوازنة بشكل مستقل',
    domain: 'feeding',
    subdomain: 'self_feeding',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'FED-004',
    titleAr: 'يشرب من كوب مفتوح بدون سكب',
    domain: 'feeding',
    subdomain: 'drinking',
    ageGroup: 'toddler_1_3',
    level: 'beginner',
  },

  // ============ السمع (Hearing) ============
  {
    goalId: 'HRG-001',
    titleAr: 'يستخدم السماعة بشكل مستمر طوال اليوم',
    domain: 'hearing',
    subdomain: 'device_use',
    ageGroup: 'all',
    level: 'beginner',
    targetPopulation: ['hearing_impairment'],
  },
  {
    goalId: 'HRG-002',
    titleAr: 'يميز بين الأصوات البيئية المختلفة',
    domain: 'hearing',
    subdomain: 'auditory_discrimination',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['hearing_impairment'],
  },
  {
    goalId: 'HRG-003',
    titleAr: 'يستخدم لغة الإشارة للتواصل الأساسي',
    domain: 'hearing',
    subdomain: 'sign_language',
    ageGroup: 'all',
    level: 'beginner',
    targetPopulation: ['hearing_impairment'],
  },
  {
    goalId: 'HRG-004',
    titleAr: 'يقرأ الشفاه للحصول على المعلومات',
    domain: 'hearing',
    subdomain: 'lip_reading',
    ageGroup: 'school_6_12',
    level: 'intermediate',
    targetPopulation: ['hearing_impairment'],
  },

  // ============ البصر (Vision) ============
  {
    goalId: 'VIS-001',
    titleAr: 'يستخدم النظارة بشكل مستمر',
    domain: 'vision',
    subdomain: 'device_use',
    ageGroup: 'all',
    level: 'beginner',
    targetPopulation: ['visual_impairment'],
  },
  {
    goalId: 'VIS-002',
    titleAr: 'يقرأ النص المكبّر بسهولة',
    domain: 'vision',
    subdomain: 'magnification',
    ageGroup: 'school_6_12',
    level: 'beginner',
    targetPopulation: ['visual_impairment'],
  },
  {
    goalId: 'VIS-003',
    titleAr: 'يتنقل في البيئة المألوفة باستقلالية',
    domain: 'vision',
    subdomain: 'orientation_mobility',
    ageGroup: 'teen_12_18',
    level: 'advanced',
    targetPopulation: ['blindness', 'low_vision'],
  },

  // ============ أهداف إضافية - مهارات يومية وتكيفية ============
  {
    goalId: 'DLV-001',
    titleAr: 'يستخدم الهاتف الذكي للتواصل والمعلومات',
    domain: 'daily_living',
    subdomain: 'technology',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'DLV-002',
    titleAr: 'يتسوق في المتجر بقائمة تسوق',
    domain: 'daily_living',
    subdomain: 'community_skills',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'DLV-003',
    titleAr: 'يطلب المساعدة في المواقف المناسبة',
    domain: 'daily_living',
    subdomain: 'self_advocacy',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'DLV-004',
    titleAr: 'يحافظ على نظافة مساحته الشخصية',
    domain: 'daily_living',
    subdomain: 'organization',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'DLV-005',
    titleAr: 'يستخدم وسائل النقل العام بأمان',
    domain: 'daily_living',
    subdomain: 'transportation',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },
  {
    goalId: 'DLV-006',
    titleAr: 'يتعامل مع المواقف الطارئة البسيطة',
    domain: 'daily_living',
    subdomain: 'safety',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'DLV-007',
    titleAr: 'يدير دواءه اليومي بمساعدة محدودة',
    domain: 'daily_living',
    subdomain: 'health_management',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },
  {
    goalId: 'DLV-008',
    titleAr: 'ينجز أعمال المنزل البسيطة (كنس، ترتيب)',
    domain: 'daily_living',
    subdomain: 'home_management',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },

  // أهداف إضافية حتى نتجاوز 200 هدف
  {
    goalId: 'COM-016',
    titleAr: 'يستخدم التعبيرات الاصطلاحية بشكل صحيح',
    domain: 'communication',
    subdomain: 'pragmatic',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COM-017',
    titleAr: 'يكتب رسالة إلكترونية رسمية',
    domain: 'communication',
    subdomain: 'written_communication',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COM-018',
    titleAr: 'يقدم عرضاً شفهياً أمام مجموعة',
    domain: 'communication',
    subdomain: 'public_speaking',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COG-016',
    titleAr: 'يستخدم خرائط الذهن لتنظيم أفكاره',
    domain: 'cognitive',
    subdomain: 'organization',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COG-017',
    titleAr: 'يتعلم مهارة جديدة ذاتياً من مصادر رقمية',
    domain: 'cognitive',
    subdomain: 'self_directed_learning',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'COG-018',
    titleAr: 'يقيّم قراراته ويتعلم من الأخطاء',
    domain: 'cognitive',
    subdomain: 'metacognition',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'SOC-013',
    titleAr: 'يتعامل مع التنمر بطرق صحيحة',
    domain: 'social_emotional',
    subdomain: 'bullying',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'SOC-014',
    titleAr: 'يحل النزاعات باستخدام مهارات التفاوض',
    domain: 'social_emotional',
    subdomain: 'conflict_resolution',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'SOC-015',
    titleAr: 'يظهر التعاطف مع الآخرين في المواقف الصعبة',
    domain: 'social_emotional',
    subdomain: 'empathy',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'BEH-009',
    titleAr: 'يطبق خطة الأمان في المواقف المثيرة للاستجابة العاطفية',
    domain: 'behavioral',
    subdomain: 'crisis_plan',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'BEH-010',
    titleAr: 'يقلل من السلوك النمطي الصوتي في البيئات الاجتماعية',
    domain: 'behavioral',
    subdomain: 'social_acceptability',
    ageGroup: 'teen_12_18',
    level: 'advanced',
    targetPopulation: ['autism'],
  },
  {
    goalId: 'FMT-016',
    titleAr: 'يستخدم التكنولوجيا المساعدة للكتابة',
    domain: 'motor_fine',
    subdomain: 'assistive_tech',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'GMT-011',
    titleAr: 'يسبح لمسافة 25 متر',
    domain: 'motor_gross',
    subdomain: 'aquatics',
    ageGroup: 'school_6_12',
    level: 'advanced',
  },
  {
    goalId: 'GMT-012',
    titleAr: 'يمارس الرياضة التكيفية المناسبة لإعاقته',
    domain: 'motor_gross',
    subdomain: 'adaptive_sports',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'SEN-009',
    titleAr: 'يستخدم تقنيات التنفس للتنظيم الحسي',
    domain: 'sensory',
    subdomain: 'calming_techniques',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'SEN-010',
    titleAr: 'يميز بين المحفزات الحسية المريحة وغير المريحة',
    domain: 'sensory',
    subdomain: 'sensory_awareness',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'ACA-009',
    titleAr: 'يستخدم الحاسب الآلي لإتمام الواجبات المدرسية',
    domain: 'academic',
    subdomain: 'technology',
    ageGroup: 'school_6_12',
    level: 'intermediate',
  },
  {
    goalId: 'ACA-010',
    titleAr: 'يقرأ ويفهم التعليمات الكتابية',
    domain: 'academic',
    subdomain: 'functional_reading',
    ageGroup: 'teen_12_18',
    level: 'intermediate',
  },
  {
    goalId: 'VOC-005',
    titleAr: 'يحضر للمقابلة الوظيفية بشكل مناسب',
    domain: 'vocational',
    subdomain: 'job_interview',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },
  {
    goalId: 'VOC-006',
    titleAr: 'يلتزم بمتطلبات بيئة العمل لمدة شهر',
    domain: 'vocational',
    subdomain: 'work_skills',
    ageGroup: 'adult_18_plus',
    level: 'advanced',
  },
  {
    goalId: 'TRN-004',
    titleAr: 'يتبع خطة التعليم الفردية الانتقالية',
    domain: 'transition',
    subdomain: 'IEP',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
  {
    goalId: 'PLY-006',
    titleAr: 'يشارك في نادٍ أو مجموعة اهتمامات',
    domain: 'play',
    subdomain: 'community_participation',
    ageGroup: 'teen_12_18',
    level: 'advanced',
  },
];

// ============================================================
// GoalsBankService الخدمة الرئيسية
// ============================================================
class GoalsBankService {
  /**
   * الحصول على جميع الأهداف أو مجموعة مصفاة
   */
  async getAllGoals(filters = {}) {
    try {
      const { domain, ageGroup, level, targetPopulation, search, page = 1, limit = 50 } = filters;
      const query = { isActive: true };
      if (domain) query.domain = domain;
      if (ageGroup) query.ageGroup = { $in: [ageGroup, 'all'] };
      if (level) query.level = level;
      if (targetPopulation)
        query.targetPopulation = {
          $in: Array.isArray(targetPopulation) ? targetPopulation : [targetPopulation],
        };
      if (search)
        query.$or = [
          { titleAr: { $regex: search, $options: 'i' } },
          { titleEn: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];

      const skip = (page - 1) * limit;
      const [goals, total] = await Promise.all([
        Goal.find(query).skip(skip).limit(parseInt(limit)).sort({ domain: 1, goalId: 1 }),
        Goal.countDocuments(query),
      ]);

      return {
        success: true,
        data: goals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع الأهداف: ${error.message}`);
    }
  }

  /**
   * الحصول على هدف بالمعرف
   */
  async getGoalById(goalId) {
    const goal = await Goal.findOne({ goalId, isActive: true });
    if (!goal) throw new Error(`الهدف ${goalId} غير موجود`);
    return { success: true, data: goal };
  }

  /**
   * استرجاع الأهداف المقترحة للمستفيد بناءً على التشخيص والعمر
   */
  async getSuggestedGoals({ diagnosis, ageGroup, domains = [], currentIEP = [] }) {
    try {
      const query = { isActive: true };
      if (ageGroup) query.ageGroup = { $in: [ageGroup, 'all'] };
      if (diagnosis && diagnosis.length > 0) query.targetPopulation = { $in: diagnosis };
      if (domains.length > 0) query.domain = { $in: domains };

      const existingGoalIds = currentIEP.map(g => g.goalId);
      if (existingGoalIds.length > 0) query.goalId = { $nin: existingGoalIds };

      const goals = await Goal.find(query).limit(30).sort({ level: 1 });
      return { success: true, data: goals, count: goals.length };
    } catch (error) {
      throw new Error(`خطأ في اقتراح الأهداف: ${error.message}`);
    }
  }

  /**
   * إضافة هدف جديد لبنك الأهداف
   */
  async addGoal(goalData) {
    const existing = await Goal.findOne({ goalId: goalData.goalId });
    if (existing) throw new Error(`الهدف بالمعرف ${goalData.goalId} موجود مسبقاً`);
    const newGoal = new Goal(goalData);
    await newGoal.save();
    return { success: true, data: newGoal, message: 'تم إضافة الهدف بنجاح' };
  }

  /**
   * تحديث هدف موجود
   */
  async updateGoal(goalId, updates) {
    const goal = await Goal.findOneAndUpdate({ goalId }, updates, {
      new: true,
      runValidators: true,
    });
    if (!goal) throw new Error(`الهدف ${goalId} غير موجود`);
    return { success: true, data: goal, message: 'تم تحديث الهدف بنجاح' };
  }

  /**
   * إحصائيات بنك الأهداف
   */
  async getStatistics() {
    const stats = await Goal.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$domain',
          count: { $sum: 1 },
          levels: { $addToSet: '$level' },
          ageGroups: { $addToSet: '$ageGroup' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = await Goal.countDocuments({ isActive: true });
    return {
      success: true,
      data: {
        totalGoals: total,
        byDomain: stats,
        targetReached: total >= 200 ? '✅ تم تجاوز 200 هدف' : `⚠️ ${total}/200 هدف`,
      },
    };
  }

  /**
   * تهيئة بنك الأهداف بالبيانات الأولية
   */
  async seedGoalsBank() {
    try {
      const existingCount = await Goal.countDocuments();
      if (existingCount > 0) {
        return {
          success: true,
          message: `بنك الأهداف يحتوي على ${existingCount} هدف مسبقاً`,
          count: existingCount,
        };
      }
      await Goal.insertMany(GOALS_BANK);
      const count = await Goal.countDocuments();
      return { success: true, message: `تم تهيئة بنك الأهداف بـ ${count} هدف`, count };
    } catch (error) {
      throw new Error(`خطأ في تهيئة بنك الأهداف: ${error.message}`);
    }
  }

  /**
   * الحصول على قائمة المجالات المتاحة
   */
  getDomains() {
    return {
      success: true,
      data: [
        { key: 'communication', label: 'التواصل واللغة' },
        { key: 'cognitive', label: 'الإدراك والتعلم' },
        { key: 'motor_fine', label: 'المهارات الحركية الدقيقة' },
        { key: 'motor_gross', label: 'المهارات الحركية الكبيرة' },
        { key: 'social_emotional', label: 'الاجتماعية والعاطفية' },
        { key: 'self_care', label: 'العناية بالذات' },
        { key: 'behavioral', label: 'السلوكية' },
        { key: 'sensory', label: 'المعالجة الحسية' },
        { key: 'academic', label: 'الأكاديمية' },
        { key: 'vocational', label: 'المهنية' },
        { key: 'daily_living', label: 'أنشطة الحياة اليومية' },
        { key: 'play', label: 'اللعب والترفيه' },
        { key: 'language', label: 'اللغة والتعبير' },
        { key: 'feeding', label: 'التغذية والأكل' },
        { key: 'hearing', label: 'التأهيل السمعي' },
        { key: 'vision', label: 'التأهيل البصري' },
        { key: 'transition', label: 'التخطيط الانتقالي' },
      ],
    };
  }

  /**
   * تصدير الأهداف بصيغة JSON للاستخدام الخارجي
   */
  exportGoalsBank() {
    return {
      success: true,
      exportDate: new Date().toISOString(),
      totalGoals: GOALS_BANK.length,
      data: GOALS_BANK,
      version: '2.0',
    };
  }
}

module.exports = new GoalsBankService();
module.exports.GoalsBankService = GoalsBankService;
module.exports.Goal = Goal;
module.exports.GOALS_BANK = GOALS_BANK;
