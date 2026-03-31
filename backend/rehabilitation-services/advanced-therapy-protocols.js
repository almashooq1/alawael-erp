/**
 * Advanced Therapy Protocols - بروتوكولات علاجية متقدمة
 * 20+ بروتوكول علاجي مبني على الأدلة لنظام الأوائل
 */

const mongoose = require('mongoose');

// ============================================================
// Schema تعريف نموذج البروتوكول العلاجي
// ============================================================
const TherapyProtocolSchema = new mongoose.Schema(
  {
    protocolId: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String },
    category: {
      type: String,
      enum: [
        'behavioral', // سلوكي
        'speech_language', // نطق ولغة
        'occupational', // وظيفي
        'physical', // جسدي
        'cognitive', // معرفي
        'sensory', // حسي
        'social_skills', // مهارات اجتماعية
        'family_training', // تدريب أسري
        'feeding', // تغذية وبلع
        'augmentative', // تواصل معزز
        'early_intervention', // تدخل مبكر
        'vocational', // مهني
        'play', // لعب
        'neurological', // عصبي
        'aquatic', // مائي
      ],
      required: true,
    },
    targetPopulation: [{ type: String }],
    ageRange: {
      minAge: { type: Number }, // بالأشهر
      maxAge: { type: Number },
    },
    evidenceLevel: {
      type: String,
      enum: ['Level_I', 'Level_II', 'Level_III', 'Level_IV', 'Expert_Opinion'],
      default: 'Level_II',
    },
    duration: {
      sessionsPerWeek: { type: Number },
      sessionDurationMinutes: { type: Number },
      totalWeeks: { type: Number },
    },
    prerequisites: [{ type: String }],
    contraindications: [{ type: String }],
    materials: [{ type: String }],
    steps: [
      {
        stepNumber: { type: Number },
        titleAr: { type: String },
        description: { type: String },
        duration: { type: Number }, // بالدقائق
        materialsNeeded: [{ type: String }],
        successCriteria: { type: String },
      },
    ],
    measurableOutcomes: [{ type: String }],
    references: [{ type: String }],
    isActive: { type: Boolean, default: true },
    version: { type: String, default: '1.0' },
  },
  { timestamps: true }
);

const TherapyProtocol = mongoose.model('TherapyProtocol', TherapyProtocolSchema);

// ============================================================
// 20+ بروتوكول علاجي متقدم
// ============================================================
const ADVANCED_THERAPY_PROTOCOLS = [
  // ===== 1. ABA - تحليل السلوك التطبيقي =====
  {
    protocolId: 'PROTO-ABA-001',
    titleAr: 'بروتوكول تحليل السلوك التطبيقي المكثف (DTT)',
    titleEn: 'Applied Behavior Analysis - Discrete Trial Training',
    category: 'behavioral',
    targetPopulation: ['autism', 'developmental_delay', 'ID'],
    ageRange: { minAge: 24, maxAge: 96 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 45, totalWeeks: 12 },
    prerequisites: ['تقييم سلوكي شامل', 'تحليل الوظيفة الوظيفي (FBA)'],
    contraindications: ['حالات طبية تمنع الجلوس المطول'],
    materials: ['بطاقات المثيرات', 'معززات متنوعة', 'سجلات البيانات', 'صناديق مهام'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'التقييم الأساسي',
        description: 'إجراء تقييم VB-MAPP أو ABLLS-R لتحديد المهارات الأساسية ومجالات التطوير',
        duration: 60,
        successCriteria: 'تحديد 10 مهارات مستهدفة بدقة',
      },
      {
        stepNumber: 2,
        titleAr: 'تحديد المعززات',
        description: 'إجراء تقييم التفضيل المنظم (PAS) لتحديد أقوى المعززات',
        duration: 30,
        successCriteria: 'قائمة بـ 5 معززات فعالة على الأقل',
      },
      {
        stepNumber: 3,
        titleAr: 'التدريب بالمحاولات المنفصلة',
        description: 'تقديم المثير > انتظار الاستجابة > تقديم المساعدة إن لزم > التعزيز',
        duration: 45,
        successCriteria: '80% دقة في 3 جلسات متتالية',
      },
      {
        stepNumber: 4,
        titleAr: 'التعميم',
        description: 'ممارسة المهارة في بيئات وأشخاص ومواد مختلفة',
        duration: 30,
        successCriteria: 'التعميم في 3 بيئات مختلفة',
      },
      {
        stepNumber: 5,
        titleAr: 'تقليل المساعدة والحفاظ',
        description: 'التقليل التدريجي للمساعدة حتى الاستقلالية التامة',
        duration: 30,
        successCriteria: '90% دقة بدون مساعدة',
      },
    ],
    measurableOutcomes: [
      'نسبة الاستجابات الصحيحة في كل مهمة',
      'عدد المهارات المكتسبة',
      'معدل التعميم',
      'نسبة تقليل السلوكيات غير المرغوبة',
    ],
    references: ['Lovaas (1987)', 'Cooper, Heron & Heward (2020)', 'BACB Guidelines'],
  },

  // ===== 2. PECS - نظام التواصل بتبادل الصور =====
  {
    protocolId: 'PROTO-PECS-001',
    titleAr: 'بروتوكول نظام التواصل بتبادل الصور (PECS)',
    titleEn: 'Picture Exchange Communication System',
    category: 'augmentative',
    targetPopulation: ['autism', 'non_verbal', 'CP', 'developmental_delay'],
    ageRange: { minAge: 18, maxAge: 216 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 30, totalWeeks: 20 },
    prerequisites: ['تقييم قدرات التواصل', 'تحديد المعززات الوظيفية'],
    materials: ['بطاقات PECS', 'لوحة التواصل', 'سجل التتبع', 'معززات وظيفية'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'المرحلة 1: كيفية التواصل',
        description: 'تعليم التبادل الجسدي للصورة للحصول على العنصر المرغوب',
        duration: 20,
        successCriteria: '80% في 3 جلسات',
      },
      {
        stepNumber: 2,
        titleAr: 'المرحلة 2: المثابرة',
        description: 'التبادل مع شريك تواصل بعيد ومن لوحة منفصلة',
        duration: 20,
        successCriteria: '80% دقة',
      },
      {
        stepNumber: 3,
        titleAr: 'المرحلة 3: التمييز',
        description: 'الاختيار من بين صورتين أو أكثر',
        duration: 25,
        successCriteria: 'تمييز 20 صورة وظيفية',
      },
      {
        stepNumber: 4,
        titleAr: 'المرحلة 4: بناء الجملة',
        description: 'استخدام "أريد + الصورة" في بناء جملة وظيفية',
        duration: 30,
        successCriteria: '80% جمل صحيحة بشكل مستقل',
      },
      {
        stepNumber: 5,
        titleAr: 'المرحلة 5: الإجابة عن "ماذا تريد؟"',
        description: 'استجابة لسؤال مباشر باستخدام PECS',
        duration: 25,
        successCriteria: '80% دقة',
      },
      {
        stepNumber: 6,
        titleAr: 'المرحلة 6: التعليق',
        description: 'إضافة بطاقات الصفات والأفعال للتعبير التوسعي',
        duration: 30,
        successCriteria: '80% تعليقات صحيحة',
      },
    ],
    measurableOutcomes: [
      'عدد الصور الوظيفية المستخدمة',
      'عدد التبادلات التلقائية',
      'تطور مستوى المرحلة',
    ],
    references: ['Frost & Bondy (1994)', 'Pyramid Educational Consultants Manual'],
  },

  // ===== 3. DIR/Floortime =====
  {
    protocolId: 'PROTO-DIR-001',
    titleAr: 'بروتوكول التدخل التنموي - الوقت الأرضي (DIR/Floortime)',
    titleEn: 'Developmental Individual Difference Relationship-Based / Floortime',
    category: 'early_intervention',
    targetPopulation: ['autism', 'developmental_delay', 'sensory_processing_disorder'],
    ageRange: { minAge: 6, maxAge: 144 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 20, totalWeeks: 16 },
    prerequisites: ['تقييم FEAS', 'تدريب الوالدين على النموذج'],
    materials: ['ألعاب تفاعلية متنوعة', 'مواد حسية', 'مساحة مريحة على الأرض'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'الملاحظة والتقييم',
        description: 'تحديد مستوى الطفل على المستويات الستة للتطور الوظيفي العاطفي',
        duration: 30,
        successCriteria: 'تحديد المستوى التطوري الحالي',
      },
      {
        stepNumber: 2,
        titleAr: 'الدخول إلى دائرة الاهتمام',
        description: 'الانضمام إلى نشاط الطفل المختار وإضفاء معنى عاطفي',
        duration: 20,
        successCriteria: '5 دوائر تواصل مفتوحة',
      },
      {
        stepNumber: 3,
        titleAr: 'توسيع الاهتمام المشترك',
        description: 'إدخال أفكار جديدة بلطف لتوسيع التفاعل',
        duration: 20,
        successCriteria: '10+ دوائر متتالية',
      },
      {
        stepNumber: 4,
        titleAr: 'تشجيع الإبداع',
        description: 'دعم اللعب الإبداعي والتفكير الرمزي',
        duration: 20,
        successCriteria: 'ظهور لعب رمزي تلقائي',
      },
    ],
    measurableOutcomes: ['عدد دوائر التواصل', 'مستوى الانخراط', 'تطور اللعب الرمزي'],
    references: ['Greenspan & Wieder (1998)', 'Greenspan & Shanker (2004)'],
  },

  // ===== 4. SI - التكامل الحسي =====
  {
    protocolId: 'PROTO-SI-001',
    titleAr: 'بروتوكول العلاج بالتكامل الحسي (Ayres SI)',
    titleEn: 'Ayres Sensory Integration Therapy',
    category: 'sensory',
    targetPopulation: ['autism', 'sensory_processing_disorder', 'DCD', 'ADHD'],
    ageRange: { minAge: 36, maxAge: 144 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 2, sessionDurationMinutes: 60, totalWeeks: 20 },
    prerequisites: ['تقييم SPM أو SP2', 'فحص حسي شامل', 'غرفة علاج حسي مجهزة'],
    contraindications: ['صرع غير مضبوط', 'إصابات في العمود الفقري', 'حساسية شديدة للحركة'],
    materials: [
      'أرجوحات بأنواعها',
      'برميل الحس العميق',
      'سطح متحرك',
      'ألعاب التوازن',
      'مواد لمسية متنوعة',
    ],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'المعايرة الحسية',
        description: 'تحديد المستوى التحريضي الأمثل عبر أنشطة تدريجية',
        duration: 15,
        successCriteria: 'استجابة منظمة للمدخلات',
      },
      {
        stepNumber: 2,
        titleAr: 'تنشيط الجهاز الدهليزي',
        description: 'أنشطة الأرجوحة والتوازن المنظمة',
        duration: 15,
        successCriteria: 'تحمل متزايد لحركة خطية',
      },
      {
        stepNumber: 3,
        titleAr: 'تنشيط الحس العميق',
        description: 'أنشطة الضغط والشد وحمل الأثقال',
        duration: 15,
        successCriteria: 'انتظام حسي ملحوظ',
      },
      {
        stepNumber: 4,
        titleAr: 'التكيف الحركي',
        description: 'نشاطات تتطلب الاستجابة التكيفية لتحديات معقدة',
        duration: 15,
        successCriteria: 'استجابات تكيفية متزايدة التعقيد',
      },
    ],
    measurableOutcomes: ['تحمل الحس اللمسي', 'التوازن والتآزر', 'الاستجابة التكيفية', 'نتائج SPM'],
    references: ['Ayres (1972)', 'Parham et al. (2011)', 'Roley et al. (2015)'],
  },

  // ===== 5. CIMT - العلاج المقيد المحفز =====
  {
    protocolId: 'PROTO-CIMT-001',
    titleAr: 'بروتوكول العلاج الوظيفي المقيد المحفز (CIMT) للأطفال',
    titleEn: 'Constraint-Induced Movement Therapy for Children',
    category: 'occupational',
    targetPopulation: ['hemiplegia_CP', 'brachial_plexus', 'acquired_hemiplegia'],
    ageRange: { minAge: 24, maxAge: 216 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 90, totalWeeks: 4 },
    prerequisites: ['تقييم تمرين اليد الوظيفي', 'إمكانية مد الرسغ 20 درجة', 'موافقة الأسرة'],
    contraindications: ['إعاقة معرفية شديدة', 'نوبات صرع غير مضبوطة', 'مشكلات سلوكية حادة'],
    materials: ['قفازة التقييد', 'ألعاب إمساك تدريجية', 'لوح الأنشطة', 'سجلات الاستخدام اليومي'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تقييم الأساسي',
        description: 'تطبيق ABILHAND-Kids وقياس حركة اليد',
        duration: 45,
        successCriteria: 'توثيق مستوى الأساس',
      },
      {
        stepNumber: 2,
        titleAr: 'تطبيق التقييد',
        description: 'وضع القفازة على اليد الأقوى 6 ساعات يومياً',
        duration: 15,
        successCriteria: 'تحمل التقييد لمدة المطلوبة',
      },
      {
        stepNumber: 3,
        titleAr: 'التدريب المكثف',
        description: 'أنشطة مكثفة باليد المشلولة من الإمساك البسيط للمعقد',
        duration: 60,
        successCriteria: 'تقدم في خطوة واحدة أسبوعياً',
      },
      {
        stepNumber: 4,
        titleAr: 'التدريب الثنائي',
        description: 'دمج كلتا اليدين في أنشطة ثنائية بعد رفع التقييد',
        duration: 30,
        successCriteria: 'استخدام ثنائي وظيفي',
      },
    ],
    measurableOutcomes: [
      'نتائج ABILHAND-Kids',
      'Box and Block Test',
      'استخدام اليد في الحياة اليومية',
    ],
    references: ['Taub et al. (2004)', 'Boyd et al. (2010)', 'NICE Guidelines CP'],
  },

  // ===== 6. بروتوكول علاج الديسفاجيا (الخنق/البلع) =====
  {
    protocolId: 'PROTO-DYS-001',
    titleAr: 'بروتوكول علاج صعوبات البلع (الديسفاجيا) للأطفال',
    titleEn: 'Pediatric Dysphagia Treatment Protocol',
    category: 'feeding',
    targetPopulation: ['CP', 'feeding_disorder', 'neurological_disorders', 'premature'],
    ageRange: { minAge: 0, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 3, sessionDurationMinutes: 45, totalWeeks: 12 },
    prerequisites: ['تقييم SLP شامل', 'فحص طبي للبلع', 'استشارة طبيب الجهاز الهضمي'],
    contraindications: ['استنشاق حاد غير مُدار', 'عدم استقرار طبي', 'رفض تام للطعام'],
    materials: ['قوام غذائي متدرج', 'ملاعق خاصة', 'أدوات تحفيز الفم', 'مواد NOMS'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تقييم البلع',
        description: 'إجراء تقييم سريري وأدواتي لوظيفة البلع',
        duration: 60,
        successCriteria: 'تصنيف على DOSS أو FOIS',
      },
      {
        stepNumber: 2,
        titleAr: 'تمارين القوة الفموية',
        description: 'تمرين الشفتين واللسان والخدين بأدوات المقاومة',
        duration: 15,
        successCriteria: 'زيادة قوة اللسان 20%',
      },
      {
        stepNumber: 3,
        titleAr: 'تعديل القوام',
        description: 'التدريب على أكل مواد بقوام تدريجي محكوم',
        duration: 20,
        successCriteria: 'تقبل مستوى قوام أعلى',
      },
      {
        stepNumber: 4,
        titleAr: 'مناورات البلع',
        description: 'تعليم مناورات بلع آمنة (Mendelsohn، supraglottic)',
        duration: 15,
        successCriteria: 'تنفيذ صحيح للمناورة',
      },
    ],
    measurableOutcomes: ['مستوى FOIS', 'نتائج DOSS', 'كمية الطعام المبتلعة آمناً'],
    references: ['Arvedson & Brodsky (2002)', 'ASHA Dysphagia Practice Guidelines'],
  },

  // ===== 7. PROMPT - دعم حركة النطق =====
  {
    protocolId: 'PROTO-PROMPT-001',
    titleAr: 'بروتوكول دعم حركة النطق (PROMPT)',
    titleEn: 'Prompts for Restructuring Oral Muscular Phonetic Targets',
    category: 'speech_language',
    targetPopulation: ['autism', 'apraxia', 'dysarthria', 'developmental_delay'],
    ageRange: { minAge: 24, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 3, sessionDurationMinutes: 45, totalWeeks: 16 },
    prerequisites: ['تدريب معالج PROMPT', 'تقييم نظام Motor Speech'],
    materials: ['مرآة كبيرة', 'مثيرات لمسية', 'قوائم كلمات مستهدفة'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تقييم نظام Motor Speech',
        description: 'تقييم MASS لنظام الكلام الحركي',
        duration: 60,
        successCriteria: 'تحديد الأنظمة المستهدفة',
      },
      {
        stepNumber: 2,
        titleAr: 'بناء الوعي الجسدي',
        description: 'تحفيز لمسي للهياكل الصوتية لبناء الإحساس',
        duration: 20,
        successCriteria: 'استجابة متسقة للإشارات',
      },
      {
        stepNumber: 3,
        titleAr: 'تشكيل الأصوات',
        description: 'إرشاد حركة الفم للنطق الصحيح',
        duration: 20,
        successCriteria: 'إنتاج صحيح في 70% محاولات',
      },
      {
        stepNumber: 4,
        titleAr: 'التعميم',
        description: 'نقل المهارة للكلمات والعبارات الوظيفية',
        duration: 15,
        successCriteria: 'استخدام في السياق التواصلي',
      },
    ],
    measurableOutcomes: ['وضوح الكلام', 'عدد الأصوات المكتسبة', 'مقياس MASS'],
    references: ['Square et al. (2014)', 'PROMPT Institute Publications'],
  },

  // ===== 8. RDI - مبادرة التطوير العلائقي =====
  {
    protocolId: 'PROTO-RDI-001',
    titleAr: 'بروتوكول مبادرة التطوير العلائقي (RDI)',
    titleEn: 'Relationship Development Intervention',
    category: 'social_skills',
    targetPopulation: ['autism', 'Asperger', 'social_communication_disorder'],
    ageRange: { minAge: 36, maxAge: 216 },
    evidenceLevel: 'Level_III',
    duration: { sessionsPerWeek: 4, sessionDurationMinutes: 30, totalWeeks: 24 },
    prerequisites: ['تقييم RDA', 'تدريب الوالدين على RDI'],
    materials: ['أنشطة مشتركة بدون كلام', 'ألعاب تعاونية', 'مرآة للاستجابة'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'بناء التنظيم المشترك',
        description: 'الانخراط في أنشطة إيقاعية متزامنة بدون هدف صريح',
        duration: 20,
        successCriteria: 'مزامنة حركية مع الشريك',
      },
      {
        stepNumber: 2,
        titleAr: 'التجربة المشتركة',
        description: 'مشاركة المشاعر في أنشطة مشتركة ممتعة',
        duration: 20,
        successCriteria: 'ابتسامة تشاركية ومشاركة نظرة',
      },
      {
        stepNumber: 3,
        titleAr: 'التفاوض الاجتماعي',
        description: 'تعلم التكيف مع شريك في السياقات المتغيرة',
        duration: 20,
        successCriteria: 'التكيف الناجح في 3 سياقات',
      },
      {
        stepNumber: 4,
        titleAr: 'التفكير العلائقي',
        description: 'تطوير فهم وجهات نظر الآخرين',
        duration: 30,
        successCriteria: 'اتخاذ وجهة نظر الآخر في مواقف بسيطة',
      },
    ],
    measurableOutcomes: ['نتائج تقييم RDA', 'عدد التفاعلات الاجتماعية التلقائية'],
    references: ['Gutstein & Sheely (2002)', 'RDI Foundations Manual'],
  },

  // ===== 9. SOS Approach - نهج SOS للتغذية =====
  {
    protocolId: 'PROTO-SOS-001',
    titleAr: 'بروتوكول نهج SOS لعلاج انتقائية الطعام',
    titleEn: 'SOS Approach to Feeding',
    category: 'feeding',
    targetPopulation: ['autism', 'feeding_disorder', 'sensory_processing_disorder'],
    ageRange: { minAge: 6, maxAge: 144 },
    evidenceLevel: 'Level_III',
    duration: { sessionsPerWeek: 2, sessionDurationMinutes: 45, totalWeeks: 16 },
    prerequisites: ['تقييم التغذية متعدد التخصصات', 'استبعاد المشكلات العضوية'],
    materials: ['أطعمة متدرجة الحساسية', 'أدوات لعب بالطعام', 'مخطط التقدم الغذائي'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'التفاعل مع الطعام عن بعد',
        description: 'التعرف البصري والشمي للطعام في بيئة لعب آمنة',
        duration: 15,
        successCriteria: 'تحمل وجود الطعام في المنطقة',
      },
      {
        stepNumber: 2,
        titleAr: 'اللعب بالطعام',
        description: 'لمس وعجن وتلوين الطعام كلعبة',
        duration: 20,
        successCriteria: 'تحمل اللمس للطعام 60 ثانية',
      },
      {
        stepNumber: 3,
        titleAr: 'التقبيل والتذوق',
        description: 'وضع الطعام على الشفاه ثم اللسان',
        duration: 15,
        successCriteria: 'قبول 5 طعمات صغيرة جديدة',
      },
      {
        stepNumber: 4,
        titleAr: 'التدريج للتناول الكامل',
        description: 'التقدم من التذوق للقضمة للمضغ والبلع',
        duration: 20,
        successCriteria: 'تناول وجبة كاملة من فئة جديدة',
      },
    ],
    measurableOutcomes: ['عدد الأطعمة المقبولة', 'مستوى الهرم الغذائي المُكمَل', 'التنوع الغذائي'],
    references: ['Toomey & Ross (2011)', 'ASHA SOS Protocol Guidelines'],
  },

  // ===== 10. SCERTS - تواصل اجتماعي ودعم عاطفي =====
  {
    protocolId: 'PROTO-SCERTS-001',
    titleAr: 'بروتوكول SCERTS للتواصل الاجتماعي والدعم العاطفي',
    titleEn: 'Social Communication, Emotional Regulation, Transactional Support',
    category: 'social_skills',
    targetPopulation: ['autism', 'social_communication_disorder'],
    ageRange: { minAge: 12, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 60, totalWeeks: 20 },
    prerequisites: ['تقييم SAP-O', 'تدريب فريق متعدد التخصصات'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تقييم التواصل الاجتماعي',
        description: 'تطبيق SCERTS SAP-O لتحديد مستوى التواصل الاجتماعي',
        duration: 60,
        successCriteria: 'تحديد مرحلة التواصل',
      },
      {
        stepNumber: 2,
        titleAr: 'بناء الانتباه المشترك',
        description: 'أنشطة لتعزيز الانتباه المشترك والقصد التواصلي',
        duration: 30,
        successCriteria: 'تحقيق 10 حالات انتباه مشترك',
      },
      {
        stepNumber: 3,
        titleAr: 'دعم التنظيم الانفعالي',
        description: 'استراتيجيات التنظيم الداخلي والخارجي',
        duration: 30,
        successCriteria: 'استخدام استراتيجية تنظيم بشكل مستقل',
      },
    ],
    measurableOutcomes: ['نتائج SAP-O', 'عدد حالات الانتباه المشترك', 'تحسن التنظيم الانفعالي'],
    references: ['Prizant et al. (2006)', 'SCERTS Model Vol I & II'],
  },

  // ===== 11. NDT/Bobath - علاج عصبي تطوري =====
  {
    protocolId: 'PROTO-NDT-001',
    titleAr: 'بروتوكول العلاج العصبي التطوري (NDT/Bobath) للشلل الدماغي',
    titleEn: 'Neurodevelopmental Treatment for Cerebral Palsy',
    category: 'physical',
    targetPopulation: ['CP', 'neurological_disorders', 'acquired_brain_injury'],
    ageRange: { minAge: 0, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 3, sessionDurationMinutes: 60, totalWeeks: 16 },
    prerequisites: ['تقييم GMFM', 'تقييم تونس العضلات', 'مؤهل NDT/Bobath'],
    contraindications: ['هشاشة العظام الشديدة', 'جلطات حديثة', 'ألم حاد'],
    materials: ['كرة بوباث', 'وسادة علاجية', 'جهاز تقييم التوتر', 'أجهزة مساعدة'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تقييم النمط الحركي',
        description: 'تحليل الوضعية والتوازن والأنماط الحركية الشاذة',
        duration: 30,
        successCriteria: 'خريطة حركية شاملة',
      },
      {
        stepNumber: 2,
        titleAr: 'تحرير نقاط المفتاح',
        description: 'التعامل مع نقاط التحكم الرئيسية لتطبيع التونس',
        duration: 20,
        successCriteria: 'تحسن التونس المقاس',
      },
      {
        stepNumber: 3,
        titleAr: 'أنشطة وظيفية معدلة',
        description: 'تنفيذ حركات وظيفية بنمط أقرب للطبيعي',
        duration: 30,
        successCriteria: 'تحسن GMFM بـ 5 نقاط',
      },
      {
        stepNumber: 4,
        titleAr: 'برنامج المنزل',
        description: 'تدريب الأسرة على التعامل والوضعيات الوظيفية',
        duration: 15,
        successCriteria: 'تنفيذ الأسرة 80% من البرنامج',
      },
    ],
    measurableOutcomes: ['GMFM-66', 'MACS', 'توتر العضلات (Ashworth)'],
    references: ['Bobath (1980)', 'Mayston (2016)', 'NDTA Evidence Review'],
  },

  // ===== 12. Hanen - تعزيز لغة الطفل بمشاركة الأسرة =====
  {
    protocolId: 'PROTO-HANEN-001',
    titleAr: 'بروتوكول هانن "أنا أتحدث" لتعزيز لغة الطفل',
    titleEn: 'Hanen "It Takes Two to Talk" Program',
    category: 'family_training',
    targetPopulation: ['language_delay', 'autism', 'hearing_impairment', 'developmental_delay'],
    ageRange: { minAge: 0, maxAge: 60 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 1, sessionDurationMinutes: 120, totalWeeks: 10 },
    prerequisites: ['تقييم لغوي شامل', 'التزام الوالدين بالحضور'],
    materials: ['دليل هانن للوالدين', 'تسجيلات فيديو', 'بطاقات تطبيق المنزل'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'الاتباع - الإيقاع الاجتماعي',
        description: 'تعليم الوالدين متابعة قيادة الطفل وتوقيت الاستجابة',
        duration: 90,
        successCriteria: 'اتباع قيادة الطفل في 70% تفاعلات',
      },
      {
        stepNumber: 2,
        titleAr: 'انتظر المبادرة',
        description: 'خلق فرص للطفل للتواصل واللعب',
        duration: 90,
        successCriteria: '3+ مبادرات تواصلية لكل وجبة',
      },
      {
        stepNumber: 3,
        titleAr: 'السقالة اللغوية',
        description: 'استخدام تقنيات التوسع والنمذجة والصدى',
        duration: 90,
        successCriteria: 'استخدام 5 تقنيات بشكل صحيح',
      },
      {
        stepNumber: 4,
        titleAr: 'الروتين اليومي كفرصة لغوية',
        description: 'دمج استراتيجيات الهانن في الروتين اليومي',
        duration: 90,
        successCriteria: '3 روتينات يومية مُوسَّعة لغوياً',
      },
    ],
    measurableOutcomes: ['عدد الكلمات الجديدة', 'مستوى التواصل', 'تفاعلات الوالدين'],
    references: ['Manolson (1992)', 'Girolametto et al. (1996)', 'Hanen Centre Publications'],
  },

  // ===== 13. PRT - التدريب بالمحور المحوري =====
  {
    protocolId: 'PROTO-PRT-001',
    titleAr: 'بروتوكول التدريب بالاستجابة المحورية (PRT)',
    titleEn: 'Pivotal Response Treatment',
    category: 'behavioral',
    targetPopulation: ['autism'],
    ageRange: { minAge: 24, maxAge: 144 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 60, totalWeeks: 16 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'الدافعية',
        description: 'استخدام اختيار الطفل والتعزيز المباشر لرفع الدافعية',
        duration: 20,
        successCriteria: 'ارتفاع مشاركة الطفل 50%',
      },
      {
        stepNumber: 2,
        titleAr: 'التعامل مع مثيرات متعددة',
        description: 'تعليم الانتباه لمثيرات متعددة في آن واحد',
        duration: 20,
        successCriteria: 'الاستجابة لمثيرين في وقت واحد',
      },
      {
        stepNumber: 3,
        titleAr: 'الإدارة الذاتية',
        description: 'تعليم الطفل تتبع وتعزيز سلوكه بنفسه',
        duration: 20,
        successCriteria: 'سجل ذاتي دقيق 80%',
      },
    ],
    measurableOutcomes: ['المبادرة التواصلية', 'الدافعية للتعلم', 'السلوكيات المحورية'],
    references: ['Koegel & Koegel (2006)', 'PRT Science and Practice'],
  },

  // ===== 14. LAMP - مسارات اللغة وتقييمها ونمذجتها =====
  {
    protocolId: 'PROTO-LAMP-001',
    titleAr: 'بروتوكول مسارات اللغة وتقييمها ونمذجتها (LAMP)',
    titleEn: 'Language Acquisition through Motor Planning',
    category: 'augmentative',
    targetPopulation: ['autism', 'non_verbal', 'apraxia'],
    ageRange: { minAge: 18, maxAge: 216 },
    evidenceLevel: 'Level_III',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 30, totalWeeks: 20 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'بناء الألفة بالجهاز',
        description: 'تعرف الطفل على الجهاز وأوضاع الأزرار',
        duration: 20,
      },
      {
        stepNumber: 2,
        titleAr: 'مسارات حركية متسقة',
        description: 'نمذجة متكررة بنفس الحركة لنفس الكلمة',
        duration: 20,
        successCriteria: 'ضغط مستقل على 10 رموز',
      },
      {
        stepNumber: 3,
        titleAr: 'الاستخدام الوظيفي',
        description: 'توليد الرسائل في السياق التواصلي الطبيعي',
        duration: 30,
        successCriteria: '20 رسالة مستقلة يومياً',
      },
    ],
    measurableOutcomes: ['عدد الكلمات الوظيفية', 'معدل التواصل في الدقيقة'],
    references: ['Porter & Cafiero (2009)', 'LAMP WFL Evidence Base'],
  },

  // ===== 15. PCIT - علاج التفاعل الوالدي =====
  {
    protocolId: 'PROTO-PCIT-001',
    titleAr: 'بروتوكول علاج التفاعل الوالدي للأطفال (PCIT)',
    titleEn: 'Parent-Child Interaction Therapy',
    category: 'behavioral',
    targetPopulation: ['ODD', 'conduct_disorder', 'ADHD', 'externalizing_behaviors'],
    ageRange: { minAge: 24, maxAge: 84 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 1, sessionDurationMinutes: 75, totalWeeks: 14 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'مرحلة CDI - قيادة الطفل',
        description: 'تدريب الوالدين على مهارات PRIDE: المديح، التجاهل، التقليد',
        duration: 45,
        successCriteria: 'مهارات CDI تتجاوز عتبة الإتقان',
      },
      {
        stepNumber: 2,
        titleAr: 'مرحلة PDI - قيادة الوالد',
        description: 'تطبيق تعليمات فعالة والتعامل مع عدم الامتثال',
        duration: 45,
        successCriteria: 'امتثال 75%+ للتعليمات المباشرة',
      },
    ],
    measurableOutcomes: ['ECBI', 'DPICS', 'مهارات CDI-PDI'],
    references: ['Eyberg & PCIT International', 'McNeil & Hembree-Kigin (2010)'],
  },

  // ===== 16. مهارات الحياة المستقلة للبالغين =====
  {
    protocolId: 'PROTO-ILS-001',
    titleAr: 'بروتوكول تنمية مهارات الحياة المستقلة للمراهقين والبالغين',
    titleEn: 'Independent Living Skills Training Protocol',
    category: 'vocational',
    targetPopulation: ['autism', 'ID', 'developmental_delay'],
    ageRange: { minAge: 156, maxAge: 360 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 3, sessionDurationMinutes: 60, totalWeeks: 24 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تقييم المهارات الحياتية',
        description: 'تطبيق ABAS-3 أو Vineland لتحديد نقاط القوة والضعف',
        duration: 60,
        successCriteria: 'خريطة مهارات شاملة',
      },
      {
        stepNumber: 2,
        titleAr: 'مهارات المنزل',
        description: 'تدريب على الطهي والنظافة والتسوق',
        duration: 60,
        successCriteria: 'إتقان 5 مهارات منزلية',
      },
      {
        stepNumber: 3,
        titleAr: 'مهارات المجتمع',
        description: 'تدريب على المواصلات والمتجر والبنك',
        duration: 60,
        successCriteria: 'استخدام وسيلة نقل بشكل مستقل',
      },
      {
        stepNumber: 4,
        titleAr: 'مهارات العمل',
        description: 'تدريب مهاري في بيئة عمل واقعية',
        duration: 60,
        successCriteria: 'إتمام مهمة عمل لمدة ساعة مستقلاً',
      },
    ],
    measurableOutcomes: ['نتائج ABAS-3', 'مهارات الاستقلالية', 'معدل التوظيف'],
    references: ['AAMR Adaptive Behavior Standards', 'Wehman (2012)'],
  },

  // ===== 17. Precision Teaching - التدريس الدقيق =====
  {
    protocolId: 'PROTO-PT-001',
    titleAr: 'بروتوكول التدريس الدقيق لاكتساب المهارات الأكاديمية',
    titleEn: 'Precision Teaching Protocol',
    category: 'cognitive',
    targetPopulation: ['SLD', 'ADHD', 'autism', 'ID'],
    ageRange: { minAge: 72, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 20, totalWeeks: 12 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'التحقق من الهدف',
        description: 'تحديد هدف دقيق قابل للقياس (حركة/دقيقة)',
        duration: 10,
        successCriteria: 'تحديد هدف SMART',
      },
      {
        stepNumber: 2,
        titleAr: 'التدريب الزمني',
        description: 'تدريبات مكثفة لمدة دقيقة واحدة يومياً',
        duration: 5,
        successCriteria: 'قياس معدل الاستجابة الدقيق',
      },
      {
        stepNumber: 3,
        titleAr: 'رسم التقدم',
        description: 'تتبع بياني يومي على standard celeration chart',
        duration: 5,
        successCriteria: 'تحقق معدل الاحتفال (×2 أسبوعياً)',
      },
    ],
    measurableOutcomes: ['معدل الطلاقة', 'خط الاحتفال', 'الحفاظ والتعميم'],
    references: ['Lindsley (1991)', 'Kubina & Yurich (2012)'],
  },

  // ===== 18. Video Modeling =====
  {
    protocolId: 'PROTO-VM-001',
    titleAr: 'بروتوكول النمذجة بالفيديو لتعليم المهارات',
    titleEn: 'Video Modeling Protocol',
    category: 'behavioral',
    targetPopulation: ['autism', 'social_communication_disorder'],
    ageRange: { minAge: 36, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 20, totalWeeks: 8 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'اختيار المهارة والنموذج',
        description: 'تحديد المهارة وإنتاج فيديو نموذج مناسب',
        duration: 30,
        successCriteria: 'فيديو واضح مدته 2-5 دقائق',
      },
      {
        stepNumber: 2,
        titleAr: 'المشاهدة',
        description: 'مشاهدة الفيديو مرتين قبل التدريب',
        duration: 10,
        successCriteria: 'انتباه كامل لمشاهدة الفيديو',
      },
      {
        stepNumber: 3,
        titleAr: 'الممارسة',
        description: 'محاكاة المهارة فوراً بعد المشاهدة',
        duration: 15,
        successCriteria: '80% دقة في التنفيذ',
      },
    ],
    measurableOutcomes: ['دقة تنفيذ المهارة', 'سرعة اكتسابها'],
    references: ['Bellini & Akullian (2007)', 'Gelbar et al. (2012)'],
  },

  // ===== 19. Self-Determination =====
  {
    protocolId: 'PROTO-SD-001',
    titleAr: 'بروتوكول تعزيز تقرير المصير للمراهقين والبالغين',
    titleEn: 'Self-Determination Training Protocol',
    category: 'vocational',
    targetPopulation: ['autism', 'ID', 'developmental_delay'],
    ageRange: { minAge: 144, maxAge: 360 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 2, sessionDurationMinutes: 60, totalWeeks: 20 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'الوعي الذاتي',
        description: 'تحديد نقاط القوة والاحتياجات والاهتمامات',
        duration: 45,
        successCriteria: 'ملف شخصي مكتمل',
      },
      {
        stepNumber: 2,
        titleAr: 'تحديد الأهداف',
        description: 'تعلم وضع أهداف SMART شخصية ومتابعتها',
        duration: 45,
        successCriteria: 'هدف SMART مكتمل مستقلاً',
      },
      {
        stepNumber: 3,
        titleAr: 'المناصرة الذاتية',
        description: 'تدريب على طلب التسهيلات والدعم بشكل مناسب',
        duration: 45,
        successCriteria: 'طلب تسهيل في سياق حقيقي',
      },
    ],
    measurableOutcomes: ['AIR Self-Determination Scale', 'ARC-IPDP'],
    references: ['Wehmeyer (1995)', 'Zarrow Center SD Materials'],
  },

  // ===== 20. Social Stories =====
  {
    protocolId: 'PROTO-SS-001',
    titleAr: 'بروتوكول القصص الاجتماعية لتعليم المهارات الاجتماعية',
    titleEn: 'Social Stories Protocol (Gray 2010)',
    category: 'social_skills',
    targetPopulation: ['autism', 'Asperger'],
    ageRange: { minAge: 36, maxAge: 216 },
    evidenceLevel: 'Level_II',
    duration: { sessionsPerWeek: 5, sessionDurationMinutes: 10, totalWeeks: 6 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'تحديد الموقف المستهدف',
        description: 'اختيار موقف اجتماعي صعب وكتابة قصة بمعايير Gray',
        duration: 30,
        successCriteria: 'قصة تستوفي معايير Gray 2010',
      },
      {
        stepNumber: 2,
        titleAr: 'قراءة القصة',
        description: 'قراءة القصة معاً يومياً قبل الموقف المتوقع',
        duration: 10,
        successCriteria: 'الطفل يتذكر محتوى القصة',
      },
      {
        stepNumber: 3,
        titleAr: 'الممارسة في الموقف',
        description: 'مراقبة التطبيق في البيئة الطبيعية وتعزيزه',
        duration: 10,
        successCriteria: 'تحسن 50% في الموقف المستهدف',
      },
    ],
    measurableOutcomes: ['تواتر السلوك المستهدف', 'التعميم في مواقف مشابهة'],
    references: ['Gray (2010)', 'Kokina & Kern (2010) Meta-analysis'],
  },

  // ===== 21. Lokomat - المشي الآلي =====
  {
    protocolId: 'PROTO-LOKO-001',
    titleAr: 'بروتوكول المشي الروبوتي المساعد (Lokomat)',
    titleEn: 'Robotic-Assisted Gait Training Protocol',
    category: 'physical',
    targetPopulation: ['CP', 'SCI', 'stroke', 'acquired_brain_injury'],
    ageRange: { minAge: 72, maxAge: 216 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 3, sessionDurationMinutes: 45, totalWeeks: 12 },
    prerequisites: ['تقييم GMFM', 'تقييم طبي شامل', 'اختيار المعلمات المناسبة'],
    contraindications: ['كسور غير مستقرة', 'تقرحات ضغط نشطة', 'تشنجات شديدة'],
    steps: [
      {
        stepNumber: 1,
        titleAr: 'المعايرة',
        description: 'ضبط المعلمات وفق قياسات المستفيد',
        duration: 15,
        successCriteria: 'ملاءمة تامة بدون ألم',
      },
      {
        stepNumber: 2,
        titleAr: 'التدريب بدعم كامل',
        description: 'المشي بمساعدة 100% من الجهاز',
        duration: 20,
        successCriteria: 'نمط مشي متماثل',
      },
      {
        stepNumber: 3,
        titleAr: 'تقليل الدعم',
        description: 'التقليل التدريجي لمستوى مساعدة الجهاز',
        duration: 20,
        successCriteria: 'المشي بـ 50% دعم بشكل مستقل',
      },
      {
        stepNumber: 4,
        titleAr: 'التكامل الوظيفي',
        description: 'نقل مكتسبات المشي الروبوتي للمشي المستقل',
        duration: 15,
        successCriteria: 'تحسن 10% في GMFM',
      },
    ],
    measurableOutcomes: ['GMFM-66', 'سرعة المشي على 10 أمتار', 'كفاءة المشي'],
    references: ['Borggraefe et al. (2010)', 'Westberry et al. (2019)'],
  },

  // ===== 22. MST - التدريب على المهارات الاجتماعية الجماعية =====
  {
    protocolId: 'PROTO-MST-001',
    titleAr: 'بروتوكول التدريب الجماعي على المهارات الاجتماعية (PEERS/SST)',
    titleEn: 'Group Social Skills Training - PEERS Program',
    category: 'social_skills',
    targetPopulation: ['autism', 'Asperger', 'social_anxiety', 'ADHD'],
    ageRange: { minAge: 120, maxAge: 216 },
    evidenceLevel: 'Level_I',
    duration: { sessionsPerWeek: 1, sessionDurationMinutes: 90, totalWeeks: 14 },
    steps: [
      {
        stepNumber: 1,
        titleAr: 'المحادثة والصداقة',
        description: 'تعلم بدء المحادثة وتعريف النفس وإيجاد الاهتمامات المشتركة',
        duration: 60,
        successCriteria: 'بدء 3 محادثات ناجحة',
      },
      {
        stepNumber: 2,
        titleAr: 'اللعب والنشاطات المشتركة',
        description: 'تعلم قواعد اللعب وتبادل الدور والتوقيت الصحيح',
        duration: 60,
        successCriteria: 'لعبة جماعية بنجاح',
      },
      {
        stepNumber: 3,
        titleAr: 'إدارة النزاعات',
        description: 'استراتيجيات إدارة النزاعات والسخرية وضغط المجموعة',
        duration: 60,
        successCriteria: 'تطبيق استراتيجية في موقف حقيقي',
      },
    ],
    measurableOutcomes: ['SSIS', 'SRS-2', 'عدد الصداقات', 'QoLI'],
    references: ['Laugeson & Frankel (2010)', 'PEERS UCLA Program'],
  },
];

// ============================================================
// AdvancedTherapyProtocolsService الخدمة الرئيسية
// ============================================================
class AdvancedTherapyProtocolsService {
  /**
   * تهيئة بنك البروتوكولات
   */
  async seedProtocols() {
    try {
      const count = await TherapyProtocol.countDocuments();
      if (count > 0)
        return {
          success: true,
          message: `البروتوكولات موجودة مسبقاً (${count})`,
          count,
        };
      await TherapyProtocol.insertMany(ADVANCED_THERAPY_PROTOCOLS);
      const total = await TherapyProtocol.countDocuments();
      return {
        success: true,
        message: `تم تهيئة ${total} بروتوكول علاجي`,
        count: total,
      };
    } catch (error) {
      throw new Error(`خطأ في تهيئة البروتوكولات: ${error.message}`);
    }
  }

  /**
   * استرجاع جميع البروتوكولات أو مصفاة
   */
  async getAllProtocols({
    category,
    targetPopulation,
    evidenceLevel,
    minAge,
    maxAge,
    page = 1,
    limit = 20,
  } = {}) {
    const query = { isActive: true };
    if (category) query.category = category;
    if (evidenceLevel) query.evidenceLevel = evidenceLevel;
    if (targetPopulation)
      query.targetPopulation = {
        $in: Array.isArray(targetPopulation) ? targetPopulation : [targetPopulation],
      };
    if (minAge) query['ageRange.maxAge'] = { $gte: parseInt(minAge) };
    if (maxAge) query['ageRange.minAge'] = { $lte: parseInt(maxAge) };

    const skip = (page - 1) * limit;
    const [protocols, total] = await Promise.all([
      TherapyProtocol.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ category: 1, protocolId: 1 }),
      TherapyProtocol.countDocuments(query),
    ]);

    return {
      success: true,
      data: protocols,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * استرجاع بروتوكول بالمعرف
   */
  async getProtocol(protocolId) {
    const protocol = await TherapyProtocol.findOne({ protocolId, isActive: true });
    if (!protocol) throw new Error(`البروتوكول ${protocolId} غير موجود`);
    return { success: true, data: protocol };
  }

  /**
   * اقتراح بروتوكولات بناءً على ملف المستفيد
   */
  async suggestProtocols({ diagnosis, ageMonths, domains = [] }) {
    const query = { isActive: true };
    if (diagnosis && diagnosis.length > 0) query.targetPopulation = { $in: diagnosis };
    if (ageMonths) query['ageRange.minAge'] = { $lte: ageMonths };
    if (ageMonths) query['ageRange.maxAge'] = { $gte: ageMonths };

    const categoryMap = {
      communication: ['speech_language', 'augmentative'],
      behavioral: ['behavioral'],
      sensory: ['sensory'],
      motor_fine: ['occupational'],
      motor_gross: ['physical', 'aquatic'],
      social_emotional: ['social_skills'],
      self_care: ['occupational', 'vocational'],
      feeding: ['feeding'],
    };

    const targetCategories = domains.flatMap(d => categoryMap[d] || []);
    if (targetCategories.length > 0) query.category = { $in: [...new Set(targetCategories)] };

    const protocols = await TherapyProtocol.find(query).sort({ evidenceLevel: 1 }).limit(10);
    return { success: true, data: protocols, count: protocols.length };
  }

  /**
   * إحصائيات بنك البروتوكولات
   */
  async getStatistics() {
    const stats = await TherapyProtocol.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          evidenceLevels: { $addToSet: '$evidenceLevel' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const total = await TherapyProtocol.countDocuments({ isActive: true });
    const level1 = await TherapyProtocol.countDocuments({
      isActive: true,
      evidenceLevel: 'Level_I',
    });
    return {
      success: true,
      data: {
        totalProtocols: total,
        level1Evidence: level1,
        byCategory: stats,
        targetReached: total >= 20 ? '✅ تم تجاوز 20 بروتوكول' : `⚠️ ${total}/20 بروتوكول`,
      },
    };
  }

  /**
   * إضافة بروتوكول جديد
   */
  async addProtocol(protocolData) {
    const existing = await TherapyProtocol.findOne({ protocolId: protocolData.protocolId });
    if (existing) throw new Error(`البروتوكول ${protocolData.protocolId} موجود مسبقاً`);
    const protocol = new TherapyProtocol(protocolData);
    await protocol.save();
    return { success: true, data: protocol, message: 'تم إضافة البروتوكول بنجاح' };
  }

  /**
   * قائمة الفئات
   */
  getCategories() {
    return {
      success: true,
      data: [
        { key: 'behavioral', label: 'السلوكية' },
        { key: 'speech_language', label: 'النطق واللغة' },
        { key: 'occupational', label: 'العلاج الوظيفي' },
        { key: 'physical', label: 'العلاج الجسدي' },
        { key: 'cognitive', label: 'المعرفية' },
        { key: 'sensory', label: 'التكامل الحسي' },
        { key: 'social_skills', label: 'المهارات الاجتماعية' },
        { key: 'family_training', label: 'تدريب الأسرة' },
        { key: 'feeding', label: 'التغذية والبلع' },
        { key: 'augmentative', label: 'التواصل المعزز (AAC)' },
        { key: 'early_intervention', label: 'التدخل المبكر' },
        { key: 'vocational', label: 'التأهيل المهني' },
        { key: 'play', label: 'العلاج باللعب' },
        { key: 'neurological', label: 'العلاج العصبي' },
        { key: 'aquatic', label: 'العلاج المائي' },
      ],
    };
  }
}

module.exports = new AdvancedTherapyProtocolsService();
module.exports.AdvancedTherapyProtocolsService = AdvancedTherapyProtocolsService;
module.exports.TherapyProtocol = TherapyProtocol;
module.exports.ADVANCED_THERAPY_PROTOCOLS = ADVANCED_THERAPY_PROTOCOLS;
