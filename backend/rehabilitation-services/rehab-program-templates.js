/**
 * Rehab Program Templates Engine — محرك قوالب برامج التأهيل
 *
 * يوفر قوالب برامج تأهيل قائمة على الأدلة العلمية مصممة خصيصاً لـ:
 *  - نوع الإعاقة / التشخيص
 *  - المستوى الوظيفي (GMFCS / CARS2 / Vineland)
 *  - الفئة العمرية
 *  - التخصص العلاجي
 *
 * كل قالب يحتوي على:
 *  - أهداف قابلة للقياس مرتبطة بمؤشرات النتائج
 *  - بنك أنشطة جلسات مصنّفة حسب الأهداف
 *  - التكرار والكثافة الموصى بهما
 *  - مؤشرات النجاح وشروط الخروج
 *  - مسارات التصعيد والتعديل
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY BANKS — بنوك الأنشطة العلاجية
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_BANKS = {
  physioTherapy: {
    motorStrengthening: [
      {
        id: 'PT-01',
        name_ar: 'تمارين المقاومة التدريجية للطرف العلوي',
        duration: 15,
        equipment: 'أثقال خفيفة / مطاطات',
      },
      {
        id: 'PT-02',
        name_ar: 'تمارين المقاومة التدريجية للطرف السفلي',
        duration: 15,
        equipment: 'ضغط الساق / سلم مرن',
      },
      {
        id: 'PT-03',
        name_ar: 'تمارين تقوية الجذع (Core Stabilization)',
        duration: 10,
        equipment: 'كرة تمرين / وسادة توازن',
      },
    ],
    balance: [
      {
        id: 'PT-10',
        name_ar: 'تمارين التوازن الثابت على سطح مستوٍ',
        duration: 10,
        equipment: 'حصيرة',
      },
      {
        id: 'PT-11',
        name_ar: 'تمارين التوازن على الوسادة الهوائية',
        duration: 10,
        equipment: 'وسادة توازن BOSU',
      },
      {
        id: 'PT-12',
        name_ar: 'تمارين المشي الوظيفي والمناورة',
        duration: 20,
        equipment: 'ممر علاجي',
      },
      {
        id: 'PT-13',
        name_ar: 'تدريب المشي على جهاز المشاية بدعم جزئي للوزن',
        duration: 20,
        equipment: 'جهاز مشاية مع تعليق',
      },
    ],
    functionalMobility: [
      {
        id: 'PT-20',
        name_ar: 'تدريب الانتقال من الكرسي للسرير وعكسه',
        duration: 15,
        equipment: 'سرير علاجي / كرسي',
      },
      {
        id: 'PT-21',
        name_ar: 'تدريب الصعود والنزول على الدرج',
        duration: 15,
        equipment: 'سلّم علاجي',
      },
      {
        id: 'PT-22',
        name_ar: 'تدريب اعتماد الكرسي المتحرك',
        duration: 20,
        equipment: 'كرسي متحرك يدوي / كهربائي',
      },
    ],
    stretchingFlexibility: [
      {
        id: 'PT-30',
        name_ar: 'إطالة الجانب العضلي القاصر (Spastic muscles)',
        duration: 10,
        equipment: 'حصيرة / وسائد تموضع',
      },
      {
        id: 'PT-31',
        name_ar: 'التحريك السلبي لمدى الحركة المفصلية',
        duration: 15,
        equipment: 'سرير علاجي',
      },
    ],
  },

  occupationalTherapy: {
    adl: [
      {
        id: 'OT-01',
        name_ar: 'تدريب تناول الطعام باستخدام الأدوات المساعدة',
        duration: 20,
        equipment: 'ملاعق مقبض معدّل / طبق مضاد للانزلاق',
      },
      {
        id: 'OT-02',
        name_ar: 'تدريب الاستحمام وارتداء الملابس',
        duration: 25,
        equipment: 'مرفق استحمام معدّل / ملابس ولاصق فيلكرو',
      },
      {
        id: 'OT-03',
        name_ar: 'تدريب الكتابة والمهارات الدقيقة',
        duration: 20,
        equipment: 'أقلام خاصة / لوح تتبع',
      },
    ],
    sensoryIntegration: [
      {
        id: 'OT-10',
        name_ar: 'نشاط الدمج الحسي: الدوران واللمس والضغط',
        duration: 30,
        equipment: 'أرجوحة علاجية / كرة ضغط / مواد ذات قوام مختلف',
      },
      {
        id: 'OT-11',
        name_ar: 'نشاط التعرف الحسي بدون بصر (Stereognosis)',
        duration: 15,
        equipment: 'صندوق الأشياء المخفية',
      },
      {
        id: 'OT-12',
        name_ar: 'بروتوكول التحفيز الذاتي الحسي (Wilbarger)',
        duration: 20,
        equipment: 'فرشاة علاجية حسية',
      },
    ],
    fineMotor: [
      {
        id: 'OT-20',
        name_ar: 'بناء البرج بالمكعبات والألعاب التركيبية',
        duration: 15,
        equipment: 'مكعبات ألعاب',
      },
      {
        id: 'OT-21',
        name_ar: 'تدريب الإمساك والإفلات الدقيق',
        duration: 15,
        equipment: 'خرز ومنخل / ملاقط',
      },
      {
        id: 'OT-22',
        name_ar: 'التلوين وقص الورق ضمن الخطوط',
        duration: 20,
        equipment: 'ورق / مقص أمان / تلوين',
      },
    ],
  },

  speechTherapy: {
    expressiveLanguage: [
      {
        id: 'ST-01',
        name_ar: 'تدريب المفردات الوظيفية باستخدام البطاقات الصورية',
        duration: 20,
        equipment: 'بطاقات مصورة / لوحة PECS',
      },
      {
        id: 'ST-02',
        name_ar: 'تدريب بناء الجمل (موضوع + فعل + مفعول)',
        duration: 20,
        equipment: 'بطاقات جمل مصوّرة',
      },
      {
        id: 'ST-03',
        name_ar: 'تدريب التواصل التعزيزي البديل (AAC)',
        duration: 30,
        equipment: 'جهاز لوحي / برنامج PECS / Proloquo2go',
      },
    ],
    receptiveLanguage: [
      {
        id: 'ST-10',
        name_ar: 'تنفيذ تعليمات من خطوتين',
        duration: 15,
        equipment: 'ألعاب وأشياء مألوفة',
      },
      {
        id: 'ST-11',
        name_ar: 'فهم المفاهيم العلائقية (فوق/تحت/قبل/بعد)',
        duration: 15,
        equipment: 'بطاقات مفاهيم',
      },
    ],
    articulation: [
      {
        id: 'ST-20',
        name_ar: 'تدريب الأصوات الهدف باستخدام المحاكاة الفموية',
        duration: 20,
        equipment: 'مرآة / أدوات علاج المفصلية',
      },
      {
        id: 'ST-21',
        name_ar: 'أنشطة الوعي الصوتي (Phonological Awareness)',
        duration: 20,
        equipment: 'بطاقات الوعي الصوتي',
      },
    ],
    socialCommunication: [
      {
        id: 'ST-30',
        name_ar: 'تدريب التواصل البصري والدور التبادلي',
        duration: 20,
        equipment: 'ألعاب تبادلية',
      },
      {
        id: 'ST-31',
        name_ar: 'قصص اجتماعية لتعلم السلوك المناسب',
        duration: 15,
        equipment: 'كتيبات القصص الاجتماعية',
      },
    ],
  },

  behaviorTherapy: {
    aba: [
      {
        id: 'BT-01',
        name_ar: 'تدريب المحاولات المتقطعة (DTT) للمهارات الأكاديمية',
        duration: 30,
        equipment: 'مواد التعزيز / بيانات التتبع',
      },
      {
        id: 'BT-02',
        name_ar: 'التدريب في البيئة الطبيعية (NET) للتعميم',
        duration: 30,
        equipment: 'لعب وأنشطة تلقائية',
      },
      {
        id: 'BT-03',
        name_ar: 'تحليل الوظيفة السلوكية وبروتوكول التدخل',
        duration: 20,
        equipment: 'نماذج تسجيل ABC',
      },
    ],
    cognitiveBehavior: [
      {
        id: 'BT-10',
        name_ar: 'تدريب الاسترخاء والتنفس لإدارة القلق',
        duration: 20,
        equipment: 'بطاقات التنفس / بيوفيدباك',
      },
      {
        id: 'BT-11',
        name_ar: 'تحديد المشاعر واستراتيجيات التنظيم الذاتي',
        duration: 20,
        equipment: 'لوحات المشاعر / ترمومتر المشاعر',
      },
    ],
  },

  psychology: {
    assessment: [
      {
        id: 'PSY-01',
        name_ar: 'تطبيق وتفسير مقاييس الذكاء والتطور المعرفي',
        duration: 60,
        equipment: 'مقاييس معيارية',
      },
      {
        id: 'PSY-02',
        name_ar: 'تقييم الصحة النفسية للأسرة (CSI / PHQ-9)',
        duration: 30,
        equipment: 'نماذج التقييم',
      },
    ],
    counseling: [
      {
        id: 'PSY-10',
        name_ar: 'جلسة إرشاد أسري وتقبّل الإعاقة',
        duration: 50,
        equipment: 'غرفة إرشاد هادئة',
      },
      {
        id: 'PSY-11',
        name_ar: 'تدريب الوالدين على استراتيجيات إدارة السلوك',
        duration: 50,
        equipment: 'مواد تدريبية',
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM TEMPLATES — قوالب البرامج
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAM_TEMPLATES = {
  // ──────────────────── الشلل الدماغي ────────────────────────────────────────
  CP_GMFCS_1_2: {
    id: 'CP_GMFCS_1_2',
    name_ar: 'برنامج تأهيل الشلل الدماغي — GMFCS I-II',
    diagnosis: ['شلل دماغي'],
    functionalLevel: ['GMFCS_1', 'GMFCS_2'],
    ageRange: { min: 3, max: 18 },
    durationWeeks: 12,
    sessionsPerWeek: { min: 3, max: 5 },
    specialties: ['physio', 'occupational'],
    evidence: 'APTA CPG 2023 — Cerebral Palsy',
    goals: [
      {
        id: 'G-CP1-1',
        name_ar: 'تحسين المشي الوظيفي ومسافة الجلوس–وقوف خلال 8 أسابيع',
        measureLink: 'BergBalance',
        targetTier: 'low_fall_risk',
        outcome: 'درجة Berg ≥ 45',
      },
      {
        id: 'G-CP1-2',
        name_ar: 'الانخراط في نشاط رياضي مدرسي واحد أسبوعياً',
        measureLink: 'FIM',
        targetTier: 'modified_independent',
        outcome: 'FIM locomotion ≥ 6',
      },
    ],
    sessionPlan: {
      phase1: {
        weeks: '1-4',
        name_ar: 'تقييم وبناء الأساس',
        activities: ['PT-10', 'PT-11', 'PT-30', 'PT-31', 'OT-01', 'OT-20'],
        frequency: 'ثلاث مرات أسبوعياً',
        focus: 'تقليل التقلص العضلي وبناء مدى الحركة الوظيفي',
      },
      phase2: {
        weeks: '5-8',
        name_ar: 'تعزيز التحمل الحركي',
        activities: ['PT-02', 'PT-03', 'PT-12', 'OT-01', 'OT-21'],
        frequency: 'أربع مرات أسبوعياً',
        focus: 'بناء القوة الوظيفية وتحسين التوازن الديناميكي',
      },
      phase3: {
        weeks: '9-12',
        name_ar: 'التعميم والدمج المجتمعي',
        activities: ['PT-12', 'PT-21', 'OT-02', 'OT-22'],
        frequency: 'خمس مرات أسبوعياً',
        focus: 'تطبيق المهارات في البيئة الطبيعية',
      },
    },
    exitCriteria: ['تحقيق هدفين على الأقل من أصل ثلاثة', 'درجة Berg ≥ 45', 'FIM ≥ 90'],
    escalationTriggers: ['تراجع الدرجات رغم الحضور المنتظم', 'ظهور تقلصات جديدة'],
  },

  CP_GMFCS_3_4: {
    id: 'CP_GMFCS_3_4',
    name_ar: 'برنامج تأهيل الشلل الدماغي — GMFCS III-IV',
    diagnosis: ['شلل دماغي'],
    functionalLevel: ['GMFCS_3', 'GMFCS_4'],
    ageRange: { min: 2, max: 18 },
    durationWeeks: 16,
    sessionsPerWeek: { min: 4, max: 5 },
    specialties: ['physio', 'occupational', 'speech'],
    evidence: 'APTA CPG 2023 — Cerebral Palsy / NICE 2019',
    goals: [
      {
        id: 'G-CP3-1',
        name_ar: 'الانتقال من الجلوس إلى الوقوف بمساعدة واحدة',
        measureLink: 'FIM',
        targetTier: 'minimal',
        outcome: 'FIM transfers ≥ 3',
      },
      {
        id: 'G-CP3-2',
        name_ar: 'قيادة الكرسي المتحرك 30م بمفرده',
        measureLink: 'FIM',
        targetTier: 'modified_independent',
        outcome: 'FIM locomotion ≥ 5',
      },
      {
        id: 'G-CP3-3',
        name_ar: 'تناول الطعام باستقلالية معدّلة (FIM ≥ 5)',
        measureLink: 'FIM',
        outcome: 'FIM eating ≥ 5',
      },
    ],
    sessionPlan: {
      phase1: {
        weeks: '1-4',
        name_ar: 'التقييم والتموضع السليم',
        activities: ['PT-31', 'PT-30', 'OT-10', 'OT-11'],
        frequency: 'أربع مرات أسبوعياً',
      },
      phase2: {
        weeks: '5-10',
        name_ar: 'التدريب الوظيفي المكثف',
        activities: ['PT-20', 'PT-22', 'PT-13', 'OT-01', 'OT-02', 'ST-01'],
        frequency: 'خمس مرات أسبوعياً',
      },
      phase3: {
        weeks: '11-16',
        name_ar: 'الاستقلالية والدمج',
        activities: ['PT-22', 'PT-12', 'OT-01', 'OT-02', 'ST-30'],
        frequency: 'أربع مرات أسبوعياً',
      },
    },
    exitCriteria: ['FIM ≥ 70', 'تقدم قابل للقياس في هدفين على الأقل'],
    escalationTriggers: ['غياب التقدم بعد 6 أسابيع', 'تطور خلع الورك أو الجنف'],
  },

  // ──────────────────── اضطراب طيف التوحد ───────────────────────────────────
  ASD_EARLY_INTENSIVE: {
    id: 'ASD_EARLY_INTENSIVE',
    name_ar: 'برنامج تدخل مبكر مكثف — اضطراب طيف التوحد (3-6 سنوات)',
    diagnosis: ['اضطراب طيف التوحد'],
    functionalLevel: ['CARS2_severe', 'CARS2_mild_moderate'],
    ageRange: { min: 1.5, max: 6 },
    durationWeeks: 24,
    sessionsPerWeek: { min: 5, max: 7 },
    specialties: ['behavior', 'speech', 'occupational'],
    evidence: 'EIBI Evidence Base (Lovaas 1987 / Virués-Ortega 2010 meta-analysis) / NICE NG11',
    intensity: { minHours: 20, maxHours: 40, per: 'week' },
    goals: [
      {
        id: 'G-ASD1-1',
        name_ar: 'التواصل البصري التلقائي ≥ 3 ثوانٍ في 80% من المحاولات',
        measureLink: 'CARS2',
        outcome: 'انخفاض درجة CARS2 بمقدار 3 نقاط',
      },
      {
        id: 'G-ASD1-2',
        name_ar: 'تقليد 5 أفعال وظيفية بشكل مستقل',
        outcome: 'نجاح في 80% من المحاولات في 3 جلسات متتالية',
      },
      {
        id: 'G-ASD1-3',
        name_ar: 'تركيب 3 كلمات في طلب واحد أو استخدام AAC للتواصل',
        measureLink: 'CFCS',
        outcome: 'CFCS المستوى III أو أعلى',
      },
    ],
    sessionPlan: {
      phase1: {
        weeks: '1-6',
        name_ar: 'بناء المهارات التأسيسية (التقليد، التواصل البصري، الانتباه المشترك)',
        activities: ['BT-01', 'ST-30', 'OT-10', 'OT-11'],
        frequency: 'يومياً (20-25 ساعة أسبوعياً)',
        focus: 'المهارات التأسيسية المسبقة للتعلم',
      },
      phase2: {
        weeks: '7-16',
        name_ar: 'تطوير المهارات اللغوية والتواصلية',
        activities: ['BT-01', 'BT-02', 'ST-01', 'ST-30', 'ST-31', 'OT-10'],
        frequency: 'يومياً (25-30 ساعة أسبوعياً)',
      },
      phase3: {
        weeks: '17-24',
        name_ar: 'التعميم والمهارات الاجتماعية والأكاديمية',
        activities: ['BT-02', 'ST-31', 'BT-11', 'PSY-10'],
        frequency: 'يومياً مع دمج تدريجي في بيئات مجتمعية',
      },
    },
    familyTraining: {
      required: true,
      frequency: 'جلستان شهرياً للأسرة',
      components: ['تعليم تقنيات ABA', 'استراتيجيات التواصل في المنزل', 'إدارة السلوك التحدي'],
    },
    exitCriteria: ['انخفاض CARS2 بمقدار 4 نقاط أو أكثر', 'تحقيق 70% من الأهداف'],
  },

  ASD_SCHOOL_AGE: {
    id: 'ASD_SCHOOL_AGE',
    name_ar: 'برنامج تأهيل اضطراب طيف التوحد — السن المدرسي (6-12 سنة)',
    diagnosis: ['اضطراب طيف التوحد'],
    functionalLevel: ['CARS2_mild_moderate'],
    ageRange: { min: 6, max: 12 },
    durationWeeks: 20,
    sessionsPerWeek: { min: 3, max: 5 },
    specialties: ['behavior', 'speech', 'psychology'],
    goals: [
      {
        id: 'G-ASD2-1',
        name_ar: 'تعلم 3 مهارات اجتماعية جديدة عبر برنامج PEERS',
        measureLink: 'SCQ',
        outcome: 'انخفاض SCQ بمقدار 3 نقاط',
      },
      {
        id: 'G-ASD2-2',
        name_ar: 'إدارة الانتقالات دون نوبات ضيق في 80% من الحالات',
        outcome: '≤ 1 نوبة ضيق أسبوعياً',
      },
    ],
    sessionPlan: {
      phase1: {
        weeks: '1-5',
        name_ar: 'تقييم وبناء الألفة',
        activities: ['BT-03', 'ST-31', 'BT-11'],
      },
      phase2: {
        weeks: '6-14',
        name_ar: 'تدريب المهارات الاجتماعية والوظيفية',
        activities: ['ST-30', 'ST-31', 'BT-02', 'OT-01'],
      },
      phase3: {
        weeks: '15-20',
        name_ar: 'التعميم والدمج المدرسي',
        activities: ['BT-02', 'PSY-10', 'PSY-11'],
      },
    },
  },

  // ──────────────────── الإعاقة الذهنية ──────────────────────────────────────
  ID_ADAPTIVE_SKILLS: {
    id: 'ID_ADAPTIVE_SKILLS',
    name_ar: 'برنامج تنمية المهارات التكيفية — الإعاقة الذهنية',
    diagnosis: ['إعاقة ذهنية', 'متلازمة داون'],
    functionalLevel: ['Vineland3_very_low', 'Vineland3_low', 'Vineland3_below_average'],
    ageRange: { min: 3, max: 21 },
    durationWeeks: 16,
    sessionsPerWeek: { min: 3, max: 4 },
    specialties: ['occupational', 'speech', 'behavior'],
    evidence: 'AAIDD 2021 — Supports Intensity Scale',
    goals: [
      {
        id: 'G-ID1-1',
        name_ar: 'أداء 5 مهام يومية باستقلالية كاملة (النظافة الشخصية / الإفطار)',
        measureLink: 'Vineland3',
        outcome: 'رفع درجة الاتصال المعيشية بمقدار 5 نقاط',
      },
      {
        id: 'G-ID1-2',
        name_ar: 'استخدام 20 كلمة وظيفية للتواصل',
        outcome: 'قاموس وظيفي ≥ 20 كلمة مستخدمة تلقائياً',
      },
    ],
    sessionPlan: {
      phase1: {
        weeks: '1-4',
        name_ar: 'تقييم وتحديد الأهداف الوظيفية',
        activities: ['OT-01', 'ST-01', 'BT-01'],
      },
      phase2: {
        weeks: '5-12',
        name_ar: 'التدريب على المهارات التكيفية',
        activities: ['OT-01', 'OT-02', 'ST-01', 'ST-10', 'BT-01', 'BT-02'],
      },
      phase3: { weeks: '13-16', name_ar: 'التعميم والمتابعة', activities: ['BT-02', 'PSY-11'] },
    },
    familyTraining: {
      required: true,
      frequency: 'أسبوعياً',
      components: ['دعم التدريب المنزلي', 'استراتيجيات التعزيز'],
    },
  },

  // ──────────────────── التأخر في النطق ──────────────────────────────────────
  SPEECH_DELAY_PRESCHOOL: {
    id: 'SPEECH_DELAY_PRESCHOOL',
    name_ar: 'برنامج تحفيز اللغة المبكرة — تأخر النطق (2-5 سنوات)',
    diagnosis: ['تأخر في النطق واللغة'],
    ageRange: { min: 2, max: 5 },
    durationWeeks: 12,
    sessionsPerWeek: { min: 2, max: 3 },
    specialties: ['speech'],
    evidence: 'ASHA Practice Portal — Late Language Emergence',
    goals: [
      {
        id: 'G-SL1-1',
        name_ar: 'مضاعفة عدد الكلمات الوظيفية (من 10 إلى 20+ كلمة)',
        outcome: '≥ 20 كلمة مختلفة مستخدمة تلقائياً',
      },
      {
        id: 'G-SL1-2',
        name_ar: 'تركيب جمل مكوّنة من كلمتين',
        outcome: '≥ 50 صيغة مختلفة من كلمتين',
      },
    ],
    sessionPlan: {
      phase1: { weeks: '1-4', activities: ['ST-01', 'ST-10', 'ST-21'] },
      phase2: { weeks: '5-8', activities: ['ST-01', 'ST-02', 'ST-30'] },
      phase3: { weeks: '9-12', activities: ['ST-02', 'ST-31', 'PSY-10'] },
    },
  },

  // ──────────────────── الشلل الرباعي / إصابات النخاع الشوكي ───────────────
  SCI_REHAB: {
    id: 'SCI_REHAB',
    name_ar: 'برنامج تأهيل إصابات النخاع الشوكي / الشلل الرباعي',
    diagnosis: ['إصابة نخاع شوكي', 'شلل رباعي', 'شلل نصفي'],
    ageRange: { min: 14, max: 70 },
    durationWeeks: 20,
    sessionsPerWeek: { min: 5, max: 7 },
    specialties: ['physio', 'occupational', 'psychology'],
    evidence: 'SCIRE (Spinal Cord Injury Rehabilitation Evidence) 2023',
    goals: [
      {
        id: 'G-SCI-1',
        name_ar: 'تحقيق FIM ≥ 90 (استقلالية معدّلة في معظم الأنشطة)',
        measureLink: 'FIM',
        outcome: 'FIM total ≥ 90',
      },
      {
        id: 'G-SCI-2',
        name_ar: 'قيادة الكرسي المتحرك الكهربائي باستقلالية في البيئة الداخلية',
        outcome: 'FIM locomotion ≥ 5',
      },
    ],
    sessionPlan: {
      phase1: {
        weeks: '1-4',
        name_ar: 'الرعاية الحادة والوقاية من المضاعفات',
        activities: ['PT-20', 'PT-31', 'OT-01'],
      },
      phase2: {
        weeks: '5-12',
        name_ar: 'التدريب الوظيفي المكثف',
        activities: ['PT-02', 'PT-20', 'PT-22', 'OT-01', 'OT-02'],
      },
      phase3: {
        weeks: '13-20',
        name_ar: 'الدمج والتأهيل المجتمعي',
        activities: ['PT-22', 'OT-02', 'PSY-10', 'PSY-11'],
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING ENGINE — محرك مطابقة القوالب
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the best matching program templates for a beneficiary.
 * @param {Object} beneficiary  { diagnosis, age, functionalLevel, specialties? }
 * @returns {Array} matched templates sorted by relevance score
 */
function matchProgramTemplates(beneficiary) {
  const { diagnosis, age, functionalLevel } = beneficiary;
  const results = [];

  for (const [key, template] of Object.entries(PROGRAM_TEMPLATES)) {
    let score = 0;

    // Diagnosis match
    const diagMatch = template.diagnosis?.some(d => d.includes(diagnosis) || diagnosis.includes(d));
    if (!diagMatch) continue;
    score += 10;

    // Age range match
    if (template.ageRange) {
      const { min, max } = template.ageRange;
      if (age >= min && age <= max) {
        score += 5;
        // Bonus for closer age fit
        const midRange = (min + max) / 2;
        const proximity = 1 - Math.abs(age - midRange) / ((max - min) / 2 + 1);
        score += Math.round(proximity * 3);
      } else {
        score -= 5;
      }
    }

    // Functional level match
    if (functionalLevel && template.functionalLevel) {
      const levelMatch = template.functionalLevel.some(
        fl => fl.includes(String(functionalLevel)) || String(functionalLevel).includes(fl)
      );
      if (levelMatch) score += 8;
    }

    results.push({ key, template, score });
  }

  return results.filter(r => r.score > 5).sort((a, b) => b.score - a.score);
}

/**
 * Build a customized session plan from a template with specific beneficiary adaptations.
 * @param {string}  templateKey
 * @param {Object}  beneficiary    { name_ar, diagnosis, age, gmfcsLevel, specialties? }
 * @param {Date}    [startDate]
 * @returns {Object} customPlan
 */
function buildCustomPlan(templateKey, beneficiary, startDate = new Date()) {
  const template = PROGRAM_TEMPLATES[templateKey];
  if (!template) return { error: `القالب '${templateKey}' غير موجود` };

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const endDate = new Date(startDate.getTime() + template.durationWeeks * weekMs);

  // Enrich activities with full detail
  const allActivities = Object.values(ACTIVITY_BANKS).flatMap(bank => Object.values(bank).flat());
  const activityMap = Object.fromEntries(allActivities.map(a => [a.id, a]));

  const enrichedPhases = Object.entries(template.sessionPlan || {}).map(([phaseKey, phase]) => ({
    phase: phaseKey,
    ...phase,
    activitiesDetail: (phase.activities || []).map(id => activityMap[id] || { id, name_ar: id }),
    scheduledPerWeek: template.sessionsPerWeek,
  }));

  return {
    templateKey,
    template: {
      id: template.id,
      name_ar: template.name_ar,
      evidence: template.evidence,
      durationWeeks: template.durationWeeks,
      specialties: template.specialties,
    },
    beneficiary,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    goals: template.goals || [],
    phases: enrichedPhases,
    familyTraining: template.familyTraining || null,
    exitCriteria: template.exitCriteria || [],
    escalationTriggers: template.escalationTriggers || [],
    totalEstimatedSessions:
      template.durationWeeks * ((template.sessionsPerWeek.min + template.sessionsPerWeek.max) / 2),
    intensity: template.intensity || null,
  };
}

/**
 * List all available templates (lightweight).
 */
function listTemplates() {
  return Object.entries(PROGRAM_TEMPLATES).map(([key, t]) => ({
    key,
    name_ar: t.name_ar,
    diagnosis: t.diagnosis,
    ageRange: t.ageRange,
    durationWeeks: t.durationWeeks,
    sessionsPerWeek: t.sessionsPerWeek,
    specialties: t.specialties,
    evidence: t.evidence,
    goalsCount: (t.goals || []).length,
  }));
}

/**
 * Get full template detail.
 */
function getTemplate(key) {
  return PROGRAM_TEMPLATES[key] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  PROGRAM_TEMPLATES,
  ACTIVITY_BANKS,
  matchProgramTemplates,
  buildCustomPlan,
  listTemplates,
  getTemplate,
};
