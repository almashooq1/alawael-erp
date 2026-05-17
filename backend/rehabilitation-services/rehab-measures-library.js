/**
 * Rehabilitation Measures Library — مكتبة مقاييس التأهيل الشاملة
 *
 * المقاييس المعتمدة دولياً ومحلياً لتقييم ذوي الإعاقة
 * تغطي: الحركة · الحياة اليومية · التواصل · السلوك · الإدراك · جودة الحياة · ICF
 *
 * كل مقياس يحتوي على:
 *  - البنود والمجالات المفصّلة
 *  - قواعد الحساب (scoringRules)
 *  - التفسير السريري حسب نطاقات الدرجات
 *  - البيانات المعيارية (normativeData)
 *  - دليل الموثوقية والصلاحية
 *  - التوصيات الذكية المرتبطة بالدرجة
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — مقاييس الوظيفة الحركية
// ─────────────────────────────────────────────────────────────────────────────

const MOTOR_MEASURES = {
  /**
   * Gross Motor Function Classification System (GMFCS)
   * تصنيف الوظيفة الحركية الكبرى — للشلل الدماغي
   */
  GMFCS: {
    id: 'GMFCS-E&R',
    name_ar: 'نظام تصنيف الوظيفة الحركية الكبرى',
    name_en: 'Gross Motor Function Classification System — Expanded & Revised',
    abbreviation: 'GMFCS',
    version: 'E&R 2007',
    category: 'motor',
    targetPopulation: ['شلل دماغي'],
    ageRanges: [
      { label: 'أقل من ٢ سنة', min: 0, max: 2 },
      { label: '٢–٤ سنوات', min: 2, max: 4 },
      { label: '٤–٦ سنوات', min: 4, max: 6 },
      { label: '٦–١٢ سنة', min: 6, max: 12 },
      { label: '١٢–١٨ سنة', min: 12, max: 18 },
    ],
    scoringType: 'ordinal_classification',
    levels: [
      {
        level: 1,
        label_ar: 'المستوى الأول',
        description_ar: 'يمشي دون قيود. قيود في المهارات الحركية الكبرى المتقدمة.',
        color: '#2e7d32',
        prognosis: 'ممتاز',
        interventionFocus: ['مهارات رياضية', 'تحسين الكفاءة', 'وقاية من الإصابات'],
      },
      {
        level: 2,
        label_ar: 'المستوى الثاني',
        description_ar: 'يمشي مع قيود. قيود في المشي خارج المنزل وفي المجتمع.',
        color: '#558b2f',
        prognosis: 'جيد',
        interventionFocus: ['تحسين التحمل', 'السلامة في البيئات المتنوعة', 'تكيف الأنشطة'],
      },
      {
        level: 3,
        label_ar: 'المستوى الثالث',
        description_ar: 'يمشي باستخدام أجهزة مساعدة. قيود في المشي خارج المنزل.',
        color: '#f9a825',
        prognosis: 'متوسط',
        interventionFocus: ['الأجهزة المساعدة', 'التنقل المستقل', 'التكيف البيئي'],
      },
      {
        level: 4,
        label_ar: 'المستوى الرابع',
        description_ar: 'قدرة محدودة على الحركة الذاتية. يستخدم كرسي متحرك.',
        color: '#e65100',
        prognosis: 'محدود',
        interventionFocus: [
          'تحسين التحكم بالجذع',
          'منع التقلصات',
          'وظيفة اليدين',
          'كرسي متحرك كهربائي',
        ],
      },
      {
        level: 5,
        label_ar: 'المستوى الخامس',
        description_ar: 'نقل يدوي في جميع البيئات. قيود شديدة في التحكم الوضعي والحركة الإرادية.',
        color: '#b71c1c',
        prognosis: 'محدود جداً',
        interventionFocus: [
          'الوضعية الآمنة',
          'منع الضغط',
          'الراحة',
          'المشاركة الأسرية',
          'التواصل التبادلي',
        ],
      },
    ],
    reliability: { ICC: 0.93, kappa: 0.89 },
    validity: { content: 0.91, construct: 0.88 },
    adminTime: 15,
    adminMode: 'observation_interview',
    training: 'يتطلب تدريباً أساسياً',
    references: ['Palisano RJ et al. (2008) Dev Med Child Neurol'],
    smartRecommendations: {
      1: ['برنامج رياضي مكيّف', 'متابعة سنوية', 'تعزيز الانخراط المجتمعي'],
      2: ['تقييم المشي كل 6 أشهر', 'تأهيل وقت الفراغ', 'تحسين التحمل القلبي التنفسي'],
      3: ['تقييم أجهزة المساعدة', 'تعديلات بيئية', 'تأهيل وظيفي'],
      4: ['تقييم كرسي متحرك مناسب', 'برنامج وضعية', 'تعديلات في المنزل والمدرسة'],
      5: ['تقييم شامل متعدد التخصصات', 'دعم الأسرة', 'خطة تواصل بديلة', 'فحص جهاز تنفسي'],
    },
  },

  /**
   * Functional Independence Measure — مقياس الاستقلالية الوظيفية
   */
  FIM: {
    id: 'FIM-v7',
    name_ar: 'مقياس الاستقلالية الوظيفية',
    name_en: 'Functional Independence Measure',
    abbreviation: 'FIM',
    version: '7.0',
    category: 'functional',
    targetPopulation: ['إعاقة حركية', 'إصابات دماغية', 'نخاع شوكي', 'شلل دماغي (>7 سنوات)'],
    ageRanges: [{ label: '7 سنوات فأكثر', min: 7, max: 120 }],
    scoringType: 'rating_scale',
    totalItems: 18,
    domains: {
      selfCare: {
        name_ar: 'العناية بالذات',
        items: [
          { id: 'FC_EAT', name_ar: 'تناول الطعام', maxScore: 7 },
          { id: 'FC_GROOM', name_ar: 'العناية الشخصية', maxScore: 7 },
          { id: 'FC_BATH', name_ar: 'الاستحمام', maxScore: 7 },
          { id: 'FC_DRESS_UP', name_ar: 'ارتداء ملابس الجسم العلوي', maxScore: 7 },
          { id: 'FC_DRESS_LO', name_ar: 'ارتداء ملابس الجسم السفلي', maxScore: 7 },
          { id: 'FC_TOILET', name_ar: 'استخدام المرحاض', maxScore: 7 },
        ],
        maxScore: 42,
      },
      sphincterControl: {
        name_ar: 'التحكم في الإخراج',
        items: [
          { id: 'FC_BLADDER', name_ar: 'التحكم في المثانة', maxScore: 7 },
          { id: 'FC_BOWEL', name_ar: 'التحكم في الأمعاء', maxScore: 7 },
        ],
        maxScore: 14,
      },
      transfers: {
        name_ar: 'الانتقالات',
        items: [
          { id: 'FC_TR_BED', name_ar: 'الانتقال: السرير / الكرسي / الكرسي المتحرك', maxScore: 7 },
          { id: 'FC_TR_TOILET', name_ar: 'الانتقال: المرحاض', maxScore: 7 },
          { id: 'FC_TR_TUB', name_ar: 'الانتقال: الحمام / الدش', maxScore: 7 },
        ],
        maxScore: 21,
      },
      locomotion: {
        name_ar: 'التنقل',
        items: [
          { id: 'FC_WALK', name_ar: 'المشي / الكرسي المتحرك', maxScore: 7 },
          { id: 'FC_STAIRS', name_ar: 'صعود الدرج', maxScore: 7 },
        ],
        maxScore: 14,
      },
      communication: {
        name_ar: 'التواصل',
        items: [
          { id: 'FC_COMP', name_ar: 'الفهم', maxScore: 7 },
          { id: 'FC_EXPR', name_ar: 'التعبير', maxScore: 7 },
        ],
        maxScore: 14,
      },
      socialCognition: {
        name_ar: 'الإدراك الاجتماعي',
        items: [
          { id: 'FC_SOCIAL', name_ar: 'التفاعل الاجتماعي', maxScore: 7 },
          { id: 'FC_PROBLEM', name_ar: 'حل المشكلات', maxScore: 7 },
          { id: 'FC_MEMORY', name_ar: 'الذاكرة', maxScore: 7 },
        ],
        maxScore: 21,
      },
    },
    ratingScale: {
      7: { label_ar: 'استقلالية تامة', description_ar: 'بدون مساعد، آمن، في وقت معقول' },
      6: { label_ar: 'استقلالية معدّلة', description_ar: 'جهاز مساعد / وقت أطول / اعتبارات سلامة' },
      5: { label_ar: 'إشراف / إعداد', description_ar: 'لا يحتاج تلامساً جسدياً' },
      4: { label_ar: 'مساعدة بسيطة', description_ar: 'يؤدي ≥75% من المهمة' },
      3: { label_ar: 'مساعدة متوسطة', description_ar: 'يؤدي 50–74% من المهمة' },
      2: { label_ar: 'مساعدة كبيرة', description_ar: 'يؤدي 25–49% من المهمة' },
      1: { label_ar: 'اعتماد كلي', description_ar: 'يؤدي أقل من 25% من المهمة' },
    },
    maxTotalScore: 126,
    minTotalScore: 18,
    interpretation: [
      { range: [18, 35], label_ar: 'اعتماد كلي', color: '#b71c1c', tier: 'severe' },
      { range: [36, 53], label_ar: 'اعتماد شديد', color: '#e53935', tier: 'severe' },
      { range: [54, 71], label_ar: 'اعتماد متوسط', color: '#f57c00', tier: 'moderate' },
      { range: [72, 89], label_ar: 'اعتماد خفيف', color: '#fbc02d', tier: 'mild' },
      { range: [90, 107], label_ar: 'استقلالية معدّلة', color: '#8bc34a', tier: 'modified' },
      { range: [108, 126], label_ar: 'استقلالية تامة', color: '#2e7d32', tier: 'independent' },
    ],
    motorScore: { items: 13, max: 91 },
    cognitiveScore: { items: 5, max: 35 },
    reliability: { ICC: 0.95, interRater: 0.87 },
    validity: { predictive: 0.84, convergent: 0.88 },
    adminTime: 30,
    adminMode: 'observation',
    references: ['Uniform Data System for Medical Rehabilitation (UDSMR)'],
    smartRecommendations: {
      severe: [
        'تأهيل مكثف متعدد التخصصات',
        'تقييم أجهزة مساعدة',
        'تدريب مقدمي الرعاية',
        'تقييم المنزل',
      ],
      moderate: ['برنامج تأهيل يومي', 'تدريب أنشطة الحياة اليومية', 'تعديلات المنزل'],
      mild: ['تأهيل محدد الأهداف', 'برنامج منزلي', 'متابعة شهرية'],
      modified: ['برنامج صيانة', 'مراجعة ربع سنوية', 'تعزيز الانخراط الاجتماعي'],
      independent: ['برنامج صيانة وقائي', 'متابعة نصف سنوية'],
    },
  },

  /**
   * WeeFIM — نسخة الأطفال من FIM (6 أشهر–7 سنوات)
   */
  WeeFIM: {
    id: 'WeeFIM-II',
    name_ar: 'مقياس الاستقلالية الوظيفية للأطفال',
    name_en: 'Functional Independence Measure for Children',
    abbreviation: 'WeeFIM',
    version: 'II',
    category: 'functional',
    targetPopulation: ['إعاقة حركية', 'شلل دماغي', 'إعاقة ذهنية'],
    ageRanges: [{ label: '6 أشهر – 7 سنوات', min: 0.5, max: 7 }],
    totalItems: 18,
    scoringType: 'rating_scale',
    domains: {
      selfCare: {
        name_ar: 'العناية بالذات',
        items: [
          { id: 'WF_EAT', name_ar: 'الأكل', maxScore: 7 },
          { id: 'WF_GROOM', name_ar: 'العناية الشخصية', maxScore: 7 },
          { id: 'WF_BATH', name_ar: 'الاستحمام', maxScore: 7 },
          { id: 'WF_DRESS_UP', name_ar: 'ارتداء الثياب (الجزء العلوي)', maxScore: 7 },
          { id: 'WF_DRESS_LO', name_ar: 'ارتداء الثياب (الجزء السفلي)', maxScore: 7 },
          { id: 'WF_TOILET', name_ar: 'استخدام المرحاض', maxScore: 7 },
        ],
        maxScore: 42,
      },
      sphincterControl: {
        name_ar: 'التحكم في الإخراج',
        items: [
          { id: 'WF_BLADDER', name_ar: 'التحكم في المثانة', maxScore: 7 },
          { id: 'WF_BOWEL', name_ar: 'التحكم في الأمعاء', maxScore: 7 },
        ],
        maxScore: 14,
      },
      mobility: {
        name_ar: 'الحركة والانتقال',
        items: [
          { id: 'WF_TR_CHAIR', name_ar: 'الانتقال إلى الكرسي / الأرض', maxScore: 7 },
          { id: 'WF_LOCOMOTION', name_ar: 'الحركة (مشي / زحف / كرسي)', maxScore: 7 },
          { id: 'WF_STAIRS', name_ar: 'الدرج', maxScore: 7 },
        ],
        maxScore: 21,
      },
      communication: {
        name_ar: 'التواصل',
        items: [
          { id: 'WF_COMPREHENSION', name_ar: 'الفهم', maxScore: 7 },
          { id: 'WF_EXPRESSION', name_ar: 'التعبير', maxScore: 7 },
        ],
        maxScore: 14,
      },
      socialCognition: {
        name_ar: 'الإدراك الاجتماعي والمعرفي',
        items: [
          { id: 'WF_SOCIAL', name_ar: 'التفاعل الاجتماعي', maxScore: 7 },
          { id: 'WF_PROBLEM', name_ar: 'حل المشكلات', maxScore: 7 },
          { id: 'WF_MEMORY', name_ar: 'الذاكرة', maxScore: 7 },
          { id: 'WF_SAFETY', name_ar: 'السلامة الذاتية', maxScore: 7 },
        ],
        maxScore: 28,
      },
    },
    ratingScale: {
      7: { label_ar: 'استقلالية تامة' },
      6: { label_ar: 'استقلالية معدّلة' },
      5: { label_ar: 'إشراف / إعداد' },
      4: { label_ar: 'مساعدة بسيطة' },
      3: { label_ar: 'مساعدة متوسطة' },
      2: { label_ar: 'مساعدة كبيرة' },
      1: { label_ar: 'اعتماد كلي' },
    },
    maxTotalScore: 126,
    minTotalScore: 18,
    normativeData: {
      // Typical developmental milestones for each item
      developmental: {
        6: { expectedTotal: 18, description_ar: 'اعتماد كلي طبيعي' },
        12: { expectedTotal: 24, description_ar: 'بداية الاستقلالية في الأكل' },
        18: { expectedTotal: 36, description_ar: 'تطور ملحوظ في التنقل' },
        24: { expectedTotal: 48, description_ar: 'بداية التحكم في الإخراج' },
        36: { expectedTotal: 65, description_ar: 'استقلالية في معظم المهام الأساسية' },
        48: { expectedTotal: 85, description_ar: 'استقلالية متطورة' },
        60: { expectedTotal: 100, description_ar: 'استقلالية شبه كاملة' },
        84: { expectedTotal: 120, description_ar: 'استقلالية تامة' },
      },
    },
    reliability: { ICC: 0.94, interRater: 0.88 },
    adminTime: 25,
    adminMode: 'observation',
    references: ['Msall ME et al. (1994) Arch Phys Med Rehabil'],
  },

  /**
   * Manual Ability Classification System (MACS) — تصنيف القدرة اليدوية
   */
  MACS: {
    id: 'MACS-2006',
    name_ar: 'نظام تصنيف القدرة اليدوية',
    name_en: 'Manual Ability Classification System',
    abbreviation: 'MACS',
    category: 'motor',
    targetPopulation: ['شلل دماغي'],
    ageRanges: [{ label: '4–18 سنة', min: 4, max: 18 }],
    scoringType: 'ordinal_classification',
    levels: [
      {
        level: 1,
        label_ar: 'يتعامل مع الأشياء بسهولة ونجاح',
        color: '#2e7d32',
        interventionFocus: ['تعزيز المهارات المتقدمة', 'الأنشطة الترفيهية'],
      },
      {
        level: 2,
        label_ar: 'يتعامل مع معظم الأشياء مع انخفاض في السرعة والجودة',
        color: '#558b2f',
        interventionFocus: ['تحسين الكفاءة', 'أدوات تكيفية خفيفة'],
      },
      {
        level: 3,
        label_ar: 'يتعامل مع الأشياء بصعوبة، يحتاج مساعدة للتحضير',
        color: '#f9a825',
        interventionFocus: ['أدوات تكيفية', 'تبسيط المهام', 'تعديل البيئة'],
      },
      {
        level: 4,
        label_ar: 'يتعامل مع مجموعة محدودة من الأشياء في مواقف مكيّفة',
        color: '#e65100',
        interventionFocus: ['أجهزة مساعدة متخصصة', 'تبسيط كامل للمهام', 'التواصل التبادلي'],
      },
      {
        level: 5,
        label_ar: 'لا يتعامل مع الأشياء وقدرة شديدة المحدودية',
        color: '#b71c1c',
        interventionFocus: ['الوضعية وبدائل التواصل', 'دعم مقدمي الرعاية'],
      },
    ],
    reliability: { ICC: 0.97, kappa: 0.92 },
    adminTime: 10,
    adminMode: 'observation_interview',
    references: ['Eliasson AC et al. (2006) Dev Med Child Neurol'],
  },

  /**
   * Berg Balance Scale — مقياس بيرغ للتوازن
   */
  BergBalance: {
    id: 'BBS-2024',
    name_ar: 'مقياس بيرغ للتوازن',
    name_en: 'Berg Balance Scale',
    abbreviation: 'BBS',
    category: 'motor',
    targetPopulation: ['إعاقة حركية', 'إصابات دماغية', 'نخاع شوكي'],
    ageRanges: [{ label: '18 سنة فأكثر', min: 18, max: 120 }],
    scoringType: 'rating_scale',
    totalItems: 14,
    items: [
      { id: 'B_SIT_STAND', name_ar: 'الوقوف من الجلوس', maxScore: 4 },
      { id: 'B_STAND_UNSUP', name_ar: 'الوقوف دون دعم', maxScore: 4 },
      { id: 'B_SIT_UNSUP', name_ar: 'الجلوس دون دعم', maxScore: 4 },
      { id: 'B_STAND_SIT', name_ar: 'الجلوس من الوقوف', maxScore: 4 },
      { id: 'B_TRANSFER', name_ar: 'الانتقال', maxScore: 4 },
      { id: 'B_EYES_CLOSED', name_ar: 'الوقوف بأعين مغمضة', maxScore: 4 },
      { id: 'B_FEET_TOGETHER', name_ar: 'الوقوف بقدمين متلاصقتين', maxScore: 4 },
      { id: 'B_REACH_FWD', name_ar: 'الإمساك للأمام ذراع ممدودة', maxScore: 4 },
      { id: 'B_PICK_FLOOR', name_ar: 'التقاط شيء من الأرض', maxScore: 4 },
      { id: 'B_TURN_AROUND', name_ar: 'الدوران والنظر للخلف', maxScore: 4 },
      { id: 'B_360_TURN', name_ar: 'الدوران 360 درجة', maxScore: 4 },
      { id: 'B_STOOL', name_ar: 'وضع القدم على الكرسي', maxScore: 4 },
      { id: 'B_TANDEM', name_ar: 'الوقوف في وضع القدم أمام الأخرى', maxScore: 4 },
      { id: 'B_ONE_LEG', name_ar: 'الوقوف على قدم واحدة', maxScore: 4 },
    ],
    maxTotalScore: 56,
    interpretation: [
      {
        range: [0, 20],
        label_ar: 'خطر سقوط عالٍ — يحتاج كرسي متحرك',
        color: '#b71c1c',
        tier: 'high_fall_risk',
      },
      {
        range: [21, 40],
        label_ar: 'خطر سقوط متوسط — يحتاج مساعدة في المشي',
        color: '#f57c00',
        tier: 'medium_fall_risk',
      },
      {
        range: [41, 56],
        label_ar: 'خطر سقوط منخفض — مستقل في المشي',
        color: '#2e7d32',
        tier: 'low_fall_risk',
      },
    ],
    reliability: { ICC: 0.98, interRater: 0.88 },
    validity: { predictive: 0.83 },
    adminTime: 15,
    adminMode: 'performance',
    references: ['Berg KO et al. (1992) Arch Phys Med Rehabil'],
    smartRecommendations: {
      high_fall_risk: [
        'برنامج تدريب التوازن المكثف',
        'تقييم مرافق كرسي متحرك',
        'تعديل بيئة المنزل (إزالة العوائق)',
        'تركيب مقابض في الحمام',
      ],
      medium_fall_risk: [
        'تدريب المشي مع جهاز مساعد',
        'تمارين تقوية الأطراف السفلية',
        'تدريب المشي على أسطح متنوعة',
      ],
      low_fall_risk: ['برنامج صيانة التوازن', 'تمارين وظيفية متقدمة', 'نشاط بدني منتظم'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — مقاييس التواصل واللغة
// ─────────────────────────────────────────────────────────────────────────────

const COMMUNICATION_MEASURES = {
  /**
   * Communication Function Classification System (CFCS)
   * تصنيف وظيفة التواصل — للشلل الدماغي
   */
  CFCS: {
    id: 'CFCS-2011',
    name_ar: 'نظام تصنيف وظيفة التواصل',
    name_en: 'Communication Function Classification System',
    abbreviation: 'CFCS',
    category: 'communication',
    targetPopulation: ['شلل دماغي'],
    ageRanges: [{ label: '2 سنة فأكثر', min: 2, max: 120 }],
    scoringType: 'ordinal_classification',
    levels: [
      {
        level: 1,
        label_ar: 'مُرسِل ومُستقبِل فعّال مع مخاطبين مألوفين وغير مألوفين',
        color: '#2e7d32',
      },
      { level: 2, label_ar: 'مُرسِل ومُستقبِل فعّال مع مخاطبين مألوفين فقط', color: '#558b2f' },
      {
        level: 3,
        label_ar: 'مُرسِل ومُستقبِل فعّال في بعض الأحيان مع مخاطبين مألوفين',
        color: '#f9a825',
      },
      {
        level: 4,
        label_ar: 'غير متسق في دوره كمُرسِل ومُستقبِل مع مخاطبين مألوفين',
        color: '#e65100',
      },
      { level: 5, label_ar: 'نادراً ما يتواصل فعلياً حتى مع مخاطبين مألوفين', color: '#b71c1c' },
    ],
    reliability: { kappa: 0.84 },
    adminTime: 10,
    adminMode: 'observation_interview',
    references: ['Hidecker MJ et al. (2011) Dev Med Child Neurol'],
    smartRecommendations: {
      1: ['تعزيز التواصل في السياقات الاجتماعية المتنوعة'],
      2: ['تدريب التعميم مع أشخاص جدد', 'تمارين التواصل الاجتماعي'],
      3: ['برنامج تدريب تواصل مكثف', 'استراتيجيات تواصل للمخاطبين'],
      4: ['تقييم تواصل بديل ومعزز (AAC)', 'تدريب المحيطين على التواصل'],
      5: ['نظام AAC شامل', 'تدريب مكثف للأسرة ومقدمي الرعاية', 'تقييم متعدد التخصصات'],
    },
  },

  /**
   * Social Communication Questionnaire (SCQ) — استبيان التواصل الاجتماعي
   */
  SCQ: {
    id: 'SCQ-2003',
    name_ar: 'استبيان التواصل الاجتماعي',
    name_en: 'Social Communication Questionnaire',
    abbreviation: 'SCQ',
    category: 'communication',
    targetPopulation: ['اضطراب طيف التوحد', 'إعاقة ذهنية'],
    ageRanges: [{ label: '4 سنوات فأكثر', min: 4, max: 120 }],
    scoringType: 'binary',
    totalItems: 40,
    sections: {
      lifetime: {
        name_ar: 'النموذج المدى الكلي',
        items: 40,
        description_ar: 'يقيّم السلوكيات والقدرات مدى الحياة',
        cutoffScore: 15,
      },
      current: {
        name_ar: 'النموذج الراهن',
        items: 40,
        description_ar: 'يقيّم السلوكيات في الأشهر الثلاثة الماضية',
        cutoffScore: 15,
      },
    },
    maxScore: 39,
    interpretation: [
      {
        range: [0, 14],
        label_ar: 'أقل من حد الفحص',
        color: '#2e7d32',
        recommendation: 'متابعة روتينية',
      },
      {
        range: [15, 39],
        label_ar: 'يُشير إلى التحقق من اضطراب طيف التوحد',
        color: '#b71c1c',
        recommendation: 'تقييم تشخيصي شامل (ADOS-2 / ADI-R)',
      },
    ],
    reliability: { alpha: 0.84, retest: 0.89 },
    adminTime: 10,
    adminMode: 'questionnaire_caregiver',
    references: ['Rutter M et al. (2003)'],
    smartRecommendations: {
      above_cutoff: ['تحويل لتقييم ADOS-2', 'استشارة طبيب متخصص', 'دعم الأسرة وتثقيفها'],
      below_cutoff: ['متابعة نمائية منتظمة', 'تقييم مهارات التواصل الوقائية'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — مقاييس طيف التوحد
// ─────────────────────────────────────────────────────────────────────────────

const AUTISM_MEASURES = {
  /**
   * Childhood Autism Rating Scale, 2nd Ed (CARS2)
   * مقياس تقييم التوحد في مرحلة الطفولة
   */
  CARS2: {
    id: 'CARS2-2010',
    name_ar: 'مقياس تقييم التوحد في مرحلة الطفولة — الإصدار الثاني',
    name_en: 'Childhood Autism Rating Scale, 2nd Edition',
    abbreviation: 'CARS2',
    category: 'autism',
    targetPopulation: ['اضطراب طيف التوحد'],
    ageRanges: [{ label: '2 سنة فأكثر', min: 2, max: 120 }],
    forms: {
      ST: {
        name_ar: 'الاستمارة المعيارية',
        description_ar: 'للأطفال دون سن 6 أو ذوي القدرات المعرفية المنخفضة',
        totalItems: 15,
        maxScore: 60,
        minScore: 15,
      },
      HF: {
        name_ar: 'استمارة الوظيفة العالية',
        description_ar: 'للأطفال ≥6 سنوات ذوي الوظائف المعرفية الأفضل',
        totalItems: 15,
        maxScore: 60,
        minScore: 15,
      },
    },
    items_ST: [
      { id: 'C_RELATIONSHIP', name_ar: 'العلاقة مع الناس', maxScore: 4 },
      { id: 'C_IMITATION', name_ar: 'التقليد', maxScore: 4 },
      { id: 'C_AFFECT', name_ar: 'الاستجابة الوجدانية', maxScore: 4 },
      { id: 'C_BODY', name_ar: 'استخدام الجسم', maxScore: 4 },
      { id: 'C_OBJECT', name_ar: 'استخدام الأشياء / الألعاب', maxScore: 4 },
      { id: 'C_ADAPT', name_ar: 'التكيف مع التغيير', maxScore: 4 },
      { id: 'C_VIS_RESPONSE', name_ar: 'الاستجابة البصرية', maxScore: 4 },
      { id: 'C_AUD_RESPONSE', name_ar: 'الاستجابة السمعية', maxScore: 4 },
      { id: 'C_TASTE_SMELL', name_ar: 'الاستجابة الذوقية والشمية واللمسية', maxScore: 4 },
      { id: 'C_FEAR', name_ar: 'الخوف والتوتر', maxScore: 4 },
      { id: 'C_VERBAL', name_ar: 'التواصل اللفظي', maxScore: 4 },
      { id: 'C_NONVERBAL', name_ar: 'التواصل غير اللفظي', maxScore: 4 },
      { id: 'C_COGNITIVE', name_ar: 'مستوى الاستجابة المعرفية واتساقها', maxScore: 4 },
      { id: 'C_GENERAL', name_ar: 'الانطباع العام', maxScore: 4 },
      { id: 'C_ACTIVITY', name_ar: 'مستوى النشاط', maxScore: 4 },
    ],
    ratingGuide: {
      1: { label_ar: 'ضمن الحدود الطبيعية لهذا العمر' },
      1.5: { label_ar: 'نادراً شاذ بدرجة خفيفة' },
      2: { label_ar: 'خفيف إلى متوسط الشذوذ' },
      2.5: { label_ar: 'متوسط إلى شديد الشذوذ' },
      3: { label_ar: 'شديد الشذوذ' },
      3.5: { label_ar: 'شديد الشذوذ بشكل متطرف' },
      4: { label_ar: 'شذوذ حاد جداً' },
    },
    interpretation: {
      ST: [
        {
          range: [15, 29.5],
          label_ar: 'لا توحد أو توحد خفيف جداً',
          color: '#2e7d32',
          tier: 'minimal',
        },
        {
          range: [30, 36.5],
          label_ar: 'توحد خفيف إلى متوسط',
          color: '#f57c00',
          tier: 'mild_moderate',
        },
        { range: [37, 60], label_ar: 'توحد شديد', color: '#b71c1c', tier: 'severe' },
      ],
    },
    reliability: { ICC: 0.96, interRater: 0.87, alpha: 0.92 },
    validity: { diagnostic: 0.91 },
    adminTime: 30,
    adminMode: 'clinician_rated_observation',
    references: ['Schopler E et al. (2010). WPS'],
    smartRecommendations: {
      minimal: ['دعم تنموي محدد', 'تثقيف الأسرة', 'متابعة تنموية منتظمة'],
      mild_moderate: [
        'برنامج ABA مكثف 20-30 ساعة/أسبوع',
        'علاج نطق وتواصل',
        'علاج وظيفي',
        'دعم أسري',
        'دمج مدرسي مع دعم',
      ],
      severe: [
        'ABA مكثف 40 ساعة/أسبوع',
        'علاج نطق مكثف + AAC',
        'علاج وظيفي للحسي',
        'علاج سلوكي',
        'تعليم خاص فردي',
        'دعم أسري مكثف',
        'تقييم دوائي إن لزم',
      ],
    },
  },

  /**
   * Autism Diagnostic Observation Schedule, 2nd Ed — Module 1 Checklist
   * قائمة مرجعية للتقييم التشخيصي لاضطراب طيف التوحد
   */
  ADOS2_Checklist: {
    id: 'ADOS2-CHECKLIST',
    name_ar: 'قائمة المراقبة التشخيصية لاضطراب طيف التوحد (مرجعية مبسّطة)',
    name_en: 'ADOS-2 Reference Checklist (Simplified)',
    abbreviation: 'ADOS2-CL',
    category: 'autism',
    note: 'هذه قائمة مرجعية مبسّطة. التطبيق الرسمي لـ ADOS-2 يتطلب تدريباً معتمداً.',
    targetPopulation: ['اضطراب طيف التوحد'],
    domains: {
      socialAffect: {
        name_ar: 'التأثير الاجتماعي',
        indicators: [
          'التواصل البصري المتبادل',
          'تعابير الوجه التلقائية',
          'الإشارة بالإصبع',
          'التشارك في الانتباه المشترك',
          'تبادل المشاعر الإيجابية',
          'الاستجابة للاسم',
          'مبادرة التواصل الاجتماعي',
        ],
      },
      restrictedRepetitive: {
        name_ar: 'السلوكيات المقيّدة والمتكررة',
        indicators: [
          'السلوكيات الحركية المتكررة',
          'التحديق أو الاستكشاف الحسي غير المعتاد',
          'الالتصاق بالروتين',
          'الاهتمامات المقيّدة',
        ],
      },
    },
    adminTime: 45,
    adminMode: 'structured_observation',
    references: ['Lord C et al. (2012). WPS'],
    note_ar:
      'يُستخدم هذا الإطار للتوثيق السريري فقط. التشخيص الرسمي يستلزم تطبيق ADOS-2 الكامل بواسطة محكّم معتمد.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — مقاييس السلوك التكيفي
// ─────────────────────────────────────────────────────────────────────────────

const ADAPTIVE_BEHAVIOR_MEASURES = {
  /**
   * Vineland Adaptive Behavior Scales, 3rd Ed (Vineland-3)
   * مقاييس فاينلاند للسلوك التكيفي
   */
  Vineland3: {
    id: 'VABS-III',
    name_ar: 'مقاييس فاينلاند للسلوك التكيفي — الإصدار الثالث',
    name_en: 'Vineland Adaptive Behavior Scales, Third Edition',
    abbreviation: 'Vineland-3',
    category: 'adaptive_behavior',
    targetPopulation: ['إعاقة ذهنية', 'اضطراب طيف التوحد', 'إعاقات نمائية'],
    ageRanges: [{ label: 'الولادة – 90 سنة', min: 0, max: 90 }],
    scoringType: 'standardized',
    forms: {
      interview: { name_ar: 'استمارة المقابلة', items: 383 },
      parentCaregiver: { name_ar: 'استمارة الوالدين/مقدم الرعاية', items: 383 },
      teacher: { name_ar: 'استمارة المعلم', items: 250 },
    },
    domains: {
      communication: {
        name_ar: 'التواصل',
        subdomains: ['الاستقبال', 'التعبير', 'الكتابة'],
        description_ar: 'قياس المهارات اللازمة لاستقبال المعلومات وإرسالها',
      },
      dailyLiving: {
        name_ar: 'مهارات الحياة اليومية',
        subdomains: ['شخصي', 'منزلي', 'مجتمعي'],
        description_ar: 'الأنشطة المطلوبة للعيش اليومي والانخراط في المجتمع',
      },
      socialization: {
        name_ar: 'التنشئة الاجتماعية',
        subdomains: ['علاقات شخصية', 'اللعب ووقت الفراغ', 'مهارات التكيف'],
        description_ar: 'قياس الكيفية التي يتفاعل بها الشخص مع الآخرين',
      },
      motorSkills: {
        name_ar: 'المهارات الحركية',
        subdomains: ['الحركة الكبرى', 'الحركة الدقيقة'],
        description_ar: 'قياس القدرات الحركية (أعمار الولادة–9 سنوات بشكل رئيسي)',
      },
    },
    scores: {
      type: 'standard_scores',
      mean: 100,
      sd: 15,
      interpretation: [
        { range: [130, 160], label_ar: 'متقدم جداً', color: '#1565c0' },
        { range: [115, 129], label_ar: 'فوق المتوسط', color: '#1976d2' },
        { range: [86, 114], label_ar: 'متوسط', color: '#2e7d32' },
        { range: [71, 85], label_ar: 'أدنى من المتوسط', color: '#f57c00' },
        { range: [50, 70], label_ar: 'منخفض', color: '#e65100' },
        { range: [20, 49], label_ar: 'منخفض جداً', color: '#b71c1c' },
      ],
    },
    reliability: { alpha: 0.9, retest: 0.93 },
    validity: { convergent: 0.88, discriminant: 0.85 },
    adminTime: 45,
    adminMode: 'interview_questionnaire',
    references: ['Sparrow SS, Cicchetti DV, Saulnier CA (2016). Pearson'],
    smartRecommendations: {
      very_low: [
        'برنامج تأهيل شامل متعدد التخصصات',
        'خطة تعليمية فردية (IEP)',
        'تدريب مهارات الحياة اليومية المكثف',
        'دعم أسري مكثف',
        'تقييم دعم السكن والوظيفة',
      ],
      low: ['برنامج تأهيل منتظم', 'خطة تعليمية فردية', 'دعم مهارات اجتماعية', 'تدريب الأسرة'],
      below_average: ['دعم تنموي مستهدف', 'استراتيجيات تكيفية بيئية', 'متابعة منتظمة'],
      average_above: ['متابعة نمائية دورية', 'تدعيم نقاط القوة', 'برامج إثراء'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — مقاييس جودة الحياة
// ─────────────────────────────────────────────────────────────────────────────

const QUALITY_OF_LIFE_MEASURES = {
  /**
   * PedsQL — مقياس جودة حياة الأطفال
   */
  PedsQL: {
    id: 'PedsQL-4.0',
    name_ar: 'مقياس جودة الحياة للأطفال',
    name_en: 'Pediatric Quality of Life Inventory',
    abbreviation: 'PedsQL',
    version: '4.0',
    category: 'quality_of_life',
    targetPopulation: ['جميع الإعاقات', 'الأمراض المزمنة'],
    ageRanges: [
      { label: '2–4 سنوات', min: 2, max: 4, form: 'toddler' },
      { label: '5–7 سنوات', min: 5, max: 7, form: 'young_child' },
      { label: '8–12 سنة', min: 8, max: 12, form: 'child' },
      { label: '13–18 سنة', min: 13, max: 18, form: 'teen' },
    ],
    reportTypes: ['self_report', 'parent_proxy'],
    domains: {
      physicalFunctioning: {
        name_ar: 'الوظيفة الجسدية',
        items: 8,
        weight: 1,
      },
      emotionalFunctioning: {
        name_ar: 'الوظيفة العاطفية',
        items: 5,
        weight: 1,
      },
      socialFunctioning: {
        name_ar: 'الوظيفة الاجتماعية',
        items: 5,
        weight: 1,
      },
      schoolFunctioning: {
        name_ar: 'الوظيفة المدرسية',
        items: 5,
        weight: 1,
      },
    },
    totalItems: 23,
    scoring: {
      method: 'reverse_linear',
      description_ar:
        'يُحوّل الإجابة (0=أبداً، 4=دائماً) إلى 0–100. الدرجات الأعلى تعني جودة حياة أفضل.',
      formula: '((4 - x) / 4) × 100',
    },
    interpretation: [
      { range: [0, 39], label_ar: 'جودة حياة منخفضة جداً', color: '#b71c1c' },
      { range: [40, 59], label_ar: 'جودة حياة منخفضة', color: '#f57c00' },
      { range: [60, 74], label_ar: 'جودة حياة متوسطة', color: '#f9a825' },
      { range: [75, 89], label_ar: 'جودة حياة جيدة', color: '#66bb6a' },
      { range: [90, 100], label_ar: 'جودة حياة ممتازة', color: '#2e7d32' },
    ],
    reliability: { alpha: 0.88, retest: 0.86 },
    adminTime: 10,
    adminMode: 'self_report_or_proxy',
    references: ['Varni JW et al. (2001) Med Care'],
    smartRecommendations: {
      very_low: [
        'تقييم شامل متعدد التخصصات لتحديد محددات جودة الحياة',
        'تدخل نفسي اجتماعي',
        'تعزيز الدعم الأسري',
        'مراجعة التدخلات الطبية',
      ],
      low: ['تدخل مستهدف في المجالات الأقل درجة', 'دعم نفسي للطفل والأسرة'],
      moderate: ['استمرار التأهيل الحالي مع مراجعة أهداف جودة الحياة'],
      good: ['المحافظة على المكاسب', 'تعزيز المشاركة الاجتماعية'],
    },
  },

  /**
   * Caregiver Strain Index (CSI) — مؤشر إجهاد مقدم الرعاية
   */
  CSI: {
    id: 'CSI-1983',
    name_ar: 'مؤشر إجهاد مقدم الرعاية',
    name_en: 'Caregiver Strain Index',
    abbreviation: 'CSI',
    category: 'caregiver_wellbeing',
    targetPopulation: ['أسر ذوي الإعاقة'],
    scoringType: 'binary',
    totalItems: 13,
    items: [
      { id: 'CS_SLEEP', name_ar: 'اضطراب النوم' },
      { id: 'CS_INCONVENIENT', name_ar: 'متطلب / إزعاج' },
      { id: 'CS_PHYSICAL', name_ar: 'إجهاد جسدي' },
      { id: 'CS_CONFINED', name_ar: 'تقييد للحرية' },
      { id: 'CS_FAMILY', name_ar: 'تعديلات في روتين العائلة' },
      { id: 'CS_EMOTIONAL', name_ar: 'تغيرات انفعالية' },
      { id: 'CS_UPSET', name_ar: 'مزعج / مؤلم' },
      { id: 'CS_WORK', name_ar: 'تعطل العمل' },
      { id: 'CS_FINANCIAL', name_ar: 'عبء مالي' },
      { id: 'CS_OVERWHELMED', name_ar: 'شعور بالإرهاق' },
      { id: 'CS_ISOLATION', name_ar: 'عزلة اجتماعية' },
      { id: 'CS_TIME', name_ar: 'غياب وقت شخصي' },
      { id: 'CS_OTHER', name_ar: 'ضغوط مرتبطة أخرى' },
    ],
    maxScore: 13,
    interpretation: [
      { range: [0, 6], label_ar: 'إجهاد منخفض إلى متوسط', color: '#66bb6a', tier: 'low' },
      { range: [7, 13], label_ar: 'إجهاد عالٍ — تدخل مطلوب', color: '#b71c1c', tier: 'high' },
    ],
    reliability: { alpha: 0.86 },
    adminTime: 5,
    adminMode: 'questionnaire_caregiver',
    references: ['Robinson BC (1983) Gerontologist'],
    smartRecommendations: {
      high: [
        'تقييم احتياجات مقدم الرعاية',
        'خدمات الاستراحة',
        'مجموعات الدعم',
        'إرشاد نفسي',
        'مراجعة خطة الرعاية',
        'تدريب إضافي على المهارات',
      ],
      low: ['الدعم الوقائي المستمر', 'تثقيف الأسرة', 'خطط الطوارئ'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — مقاييس ICF المبنية على التصنيف الدولي للوظائف
// ─────────────────────────────────────────────────────────────────────────────

const ICF_MEASURES = {
  /**
   * ICF Core Sets — Disability Categories
   * المجموعات الأساسية لـ ICF حسب نوع الإعاقة
   */
  ICF_CoreSet: {
    id: 'ICF-CS-REHAB',
    name_ar: 'مجموعات ICF الأساسية للتأهيل',
    name_en: 'ICF Core Sets for Rehabilitation',
    abbreviation: 'ICF-CS',
    category: 'icf_based',
    structure: {
      bodyFunctions: {
        code: 'b',
        name_ar: 'وظائف الجسم',
        chapters: [
          { code: 'b1', name_ar: 'الوظائف الذهنية' },
          { code: 'b2', name_ar: 'الوظائف الحسية والألم' },
          { code: 'b3', name_ar: 'وظائف الصوت والكلام' },
          { code: 'b4', name_ar: 'وظائف الجهاز القلبي التنفسي والمناعي والهضمي والغدد الصماء' },
          { code: 'b5', name_ar: 'وظائف الهضم والتمثيل الغذائي والغدد الصماء' },
          { code: 'b6', name_ar: 'الوظائف الجنسية والإنجابية' },
          { code: 'b7', name_ar: 'وظائف الجهاز العضلي الهيكلي والحركة' },
          { code: 'b8', name_ar: 'وظائف الجلد والشعر والأظافر' },
        ],
      },
      bodyStructures: {
        code: 's',
        name_ar: 'بنى الجسم',
        chapters: [
          { code: 's1', name_ar: 'بنى الجهاز العصبي' },
          { code: 's7', name_ar: 'بنى الحركة' },
        ],
      },
      activitiesParticipation: {
        code: 'd',
        name_ar: 'الأنشطة والمشاركة',
        chapters: [
          { code: 'd1', name_ar: 'التعلم وتطبيق المعرفة' },
          { code: 'd2', name_ar: 'المهام العامة والمطالب' },
          { code: 'd3', name_ar: 'التواصل' },
          { code: 'd4', name_ar: 'الحركة والتنقل' },
          { code: 'd5', name_ar: 'رعاية الذات' },
          { code: 'd6', name_ar: 'الحياة المنزلية' },
          { code: 'd7', name_ar: 'العلاقات الشخصية' },
          { code: 'd8', name_ar: 'مجالات الحياة الرئيسية' },
          { code: 'd9', name_ar: 'الحياة المجتمعية والاجتماعية والمدنية' },
        ],
      },
      environmentalFactors: {
        code: 'e',
        name_ar: 'العوامل البيئية',
        chapters: [
          { code: 'e1', name_ar: 'المنتجات والتكنولوجيا' },
          { code: 'e2', name_ar: 'البيئة الطبيعية والتغيرات البيئية' },
          { code: 'e3', name_ar: 'الدعم والعلاقات' },
          { code: 'e4', name_ar: 'الاتجاهات' },
          { code: 'e5', name_ar: 'الخدمات والأنظمة والسياسات' },
        ],
      },
    },
    qualifiers: {
      impairment: {
        0: { label_ar: 'لا إعاقة', pct: '0–4%' },
        1: { label_ar: 'إعاقة خفيفة', pct: '5–24%' },
        2: { label_ar: 'إعاقة متوسطة', pct: '25–49%' },
        3: { label_ar: 'إعاقة شديدة', pct: '50–95%' },
        4: { label_ar: 'إعاقة كاملة', pct: '96–100%' },
        8: { label_ar: 'غير محدد' },
        9: { label_ar: 'غير قابل للتطبيق' },
      },
    },
    adminMode: 'clinician_assessment',
    references: ['WHO ICF (2001)', 'Stucki G et al. (2002) Eur J Phys Med Rehabil'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — مقاييس التدخل المبكر والنمو
// ─────────────────────────────────────────────────────────────────────────────

const EARLY_INTERVENTION_MEASURES = {
  /**
   * Developmental Screening — فحص النمو
   */
  DevScreening: {
    id: 'DEV-SCREEN-AR',
    name_ar: 'بطارية فحص النمو المعيارية',
    name_en: 'Developmental Screening Battery (Arabic Validated)',
    abbreviation: 'DSB-AR',
    category: 'developmental',
    targetPopulation: ['تأخر نمائي', 'خطر بيولوجي/بيئي'],
    ageRanges: [{ label: '1–72 شهر', min: 0, max: 6 }],
    domains: {
      grossMotor: { name_ar: 'الحركة الكبرى', milestones: 15 },
      fineMotorAdaptive: { name_ar: 'الحركة الدقيقة والتكيفية', milestones: 15 },
      languageCommunication: { name_ar: 'اللغة والتواصل', milestones: 20 },
      personalSocial: { name_ar: 'الشخصي الاجتماعي', milestones: 15 },
      cognition: { name_ar: 'الإدراك', milestones: 10 },
    },
    scoring: {
      method: 'milestone_achievement',
      result: ['اجتاز', 'لم يجتز', 'يحتاج رصداً'],
    },
    adminTime: 20,
    adminMode: 'observation_interview',
    redFlags: [
      { age: 3, flag: 'لا تتابع الأشياء بالعين' },
      { age: 6, flag: 'لا يبتسم اجتماعياً' },
      { age: 12, flag: 'لا يشير بالإصبع' },
      { age: 16, flag: 'لا كلمات منفردة' },
      { age: 24, flag: 'لا جملتي كلمتين' },
      { age: 36, flag: 'لا ثلاث كلمات في الجملة' },
    ],
    smartRecommendations: {
      delay_detected: [
        'تحويل فوري لتقييم متخصص',
        'بدء خدمات التدخل المبكر خلال أسبوعين',
        'تثقيف الأسرة وتوجيهها',
        'إشراك الأسرة في البرنامج اليومي',
      ],
      at_risk: ['رصد مكثف كل 3 أشهر', 'أنشطة تحفيزية منزلية', 'توجيه الأسرة'],
      on_track: ['متابعة دورية حسب الجدول الوطني', 'أنشطة نمائية داعمة'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MASTER CATALOG — الفهرس الشامل للمقاييس
// ─────────────────────────────────────────────────────────────────────────────

const MEASURES_CATALOG = {
  ...MOTOR_MEASURES,
  ...COMMUNICATION_MEASURES,
  ...AUTISM_MEASURES,
  ...ADAPTIVE_BEHAVIOR_MEASURES,
  ...QUALITY_OF_LIFE_MEASURES,
  ...ICF_MEASURES,
  ...EARLY_INTERVENTION_MEASURES,
};

// Category metadata for filtering/display
const CATEGORIES = {
  motor: { label_ar: 'الحركة والوظيفة الحركية', icon: 'FitnessCenter', color: '#1565c0' },
  functional: { label_ar: 'الاستقلالية الوظيفية', icon: 'Accessibility', color: '#2e7d32' },
  communication: { label_ar: 'التواصل واللغة', icon: 'RecordVoiceOver', color: '#6a1b9a' },
  autism: { label_ar: 'طيف التوحد', icon: 'Psychology', color: '#e65100' },
  adaptive_behavior: { label_ar: 'السلوك التكيفي', icon: 'EmojiPeople', color: '#00695c' },
  quality_of_life: { label_ar: 'جودة الحياة', icon: 'Favorite', color: '#c62828' },
  caregiver_wellbeing: {
    label_ar: 'رفاهية مقدم الرعاية',
    icon: 'VolunteerActivism',
    color: '#ad1457',
  },
  icf_based: { label_ar: 'التصنيف الدولي (ICF)', icon: 'AccountTree', color: '#37474f' },
  developmental: { label_ar: 'النمو والتدخل المبكر', icon: 'ChildCare', color: '#f57f17' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all measures as a flat array with category metadata injected.
 */
function listAllMeasures() {
  return Object.entries(MEASURES_CATALOG).map(([key, m]) => ({
    key,
    ...m,
    categoryMeta: CATEGORIES[m.category] || {},
  }));
}

/**
 * Returns measures filtered by category.
 * @param {string} category
 */
function getMeasuresByCategory(category) {
  return listAllMeasures().filter(m => m.category === category);
}

/**
 * Returns measures applicable to a given population/diagnosis.
 * @param {string} population
 */
function getMeasuresForPopulation(population) {
  return listAllMeasures().filter(
    m => m.targetPopulation && m.targetPopulation.some(p => p.includes(population))
  );
}

/**
 * Returns a single measure by key or id.
 * @param {string} keyOrId
 */
function getMeasure(keyOrId) {
  if (MEASURES_CATALOG[keyOrId]) return MEASURES_CATALOG[keyOrId];
  return listAllMeasures().find(m => m.id === keyOrId) || null;
}

/**
 * Returns smart recommendations for a given measure + computed tier.
 * @param {string} measureKey
 * @param {string} tier
 */
function getSmartRecommendations(measureKey, tier) {
  const measure = getMeasure(measureKey);
  if (!measure || !measure.smartRecommendations) return [];
  return measure.smartRecommendations[tier] || [];
}

/**
 * Returns all categories with their metadata.
 */
function getCategories() {
  return CATEGORIES;
}

module.exports = {
  MEASURES_CATALOG,
  CATEGORIES,
  MOTOR_MEASURES,
  COMMUNICATION_MEASURES,
  AUTISM_MEASURES,
  ADAPTIVE_BEHAVIOR_MEASURES,
  QUALITY_OF_LIFE_MEASURES,
  ICF_MEASURES,
  EARLY_INTERVENTION_MEASURES,
  listAllMeasures,
  getMeasuresByCategory,
  getMeasuresForPopulation,
  getMeasure,
  getSmartRecommendations,
  getCategories,
};
