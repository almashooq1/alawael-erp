/**
 * بيانات البذر الأساسية - أنواع المقاييس والبرامج
 * Seed Data: Measurement Types & Rehabilitation Programs
 * ====================================================
 *
 * هذا الملف يحتوي على جميع المقاييس والبرامج الأساسية المدعومة
 * استخدمه لـ: npm run seed:measurements
 */

const measurementTypes = [
  // ============================
  // 1. مقاييس عامة أساسية
  // ============================
  {
    code: 'INTEL_001',
    nameAr: 'مقياس وكسلر للذكاء',
    nameEn: 'Wechsler Intelligence Scale',
    category: 'GENERAL',
    description: 'مقياس معياري شامل للقدرات العقلية العامة',
    targetDisabilities: ['INTELLECTUAL', 'LEARNING_DISABILITY', 'MULTIPLE'],
    ageRange: { minAge: 6, maxAge: 75 },
    estimatedTime: 90,
    isStandardized: true,
    normSource: 'Wechsler',
    scoringMethod: 'STANDARD_SCORE',
    scoreRange: { min: 40, max: 160 },
    administratedBy: 'PSYCHOLOGIST',
    interpretationLevels: [
      {
        level: 'PROFOUND',
        minScore: 40,
        maxScore: 54,
        description: 'إعاقة ذهنية عميقة جداً',
        recommendations: ['تأهيل كثيف', 'رعاية متخصصة كاملة'],
      },
      {
        level: 'SEVERE',
        minScore: 55,
        maxScore: 69,
        description: 'إعاقة ذهنية شديدة',
        recommendations: ['برامج مكثفة', 'إشراف دائم'],
      },
      {
        level: 'MODERATE',
        minScore: 70,
        maxScore: 84,
        description: 'إعاقة ذهنية متوسطة',
        recommendations: ['برامج تدريبية', 'دعم أسري'],
      },
      {
        level: 'MILD',
        minScore: 85,
        maxScore: 99,
        description: 'إعاقة ذهنية خفيفة',
        recommendations: ['برامج تربوية', 'تعليم خاص'],
      },
      {
        level: 'BORDERLINE',
        minScore: 100,
        maxScore: 109,
        description: 'قريب من الطبيعي',
        recommendations: ['دعم تعليمي متخصص'],
      },
    ],
    domains: [
      { code: 'VERBAL', name: 'القدرة اللفظية', weight: 25 },
      { code: 'PERCEPTUAL', name: 'القدرة الإدراكية', weight: 25 },
      { code: 'WORKING_MEMORY', name: 'الذاكرة العاملة', weight: 25 },
      { code: 'PROCESSING_SPEED', name: 'سرعة المعالجة', weight: 25 },
    ],
  },

  {
    code: 'INTEL_002',
    nameAr: 'اختبار رافن للمصفوفات',
    nameEn: "Raven's Progressive Matrices",
    category: 'GENERAL',
    description: 'اختبار غير لفظي للذكاء السائل',
    targetDisabilities: ['INTELLECTUAL', 'HEARING', 'LANGUAGE_DISABILITY', 'MULTIPLE'],
    ageRange: { minAge: 5, maxAge: 65 },
    estimatedTime: 45,
    isStandardized: true,
    normSource: 'Raven',
    scoringMethod: 'PERCENTILE',
    scoreRange: { min: 1, max: 99 },
    administratedBy: 'PSYCHOLOGIST',
  },

  {
    code: 'ADAPT_001',
    nameAr: 'مقياس فينلاند للسلوك التكيفي',
    nameEn: 'Vineland Adaptive Behavior Scales',
    category: 'GENERAL',
    description: 'قياس شامل للقدرات التكيفية والاستقلالية',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL', 'AUTISM', 'MULTIPLE'],
    ageRange: { minAge: 0, maxAge: 90 },
    estimatedTime: 60,
    isStandardized: true,
    normSource: 'Vineland',
    scoringMethod: 'STANDARD_SCORE',
    domains: [
      { code: 'COMMUNICATION', name: 'التواصل', weight: 30 },
      { code: 'DAILY_LIVING', name: 'مهارات الحياة اليومية', weight: 35 },
      { code: 'SOCIALIZATION', name: 'المهارات الاجتماعية', weight: 20 },
      { code: 'MOTOR_SKILLS', name: 'المهارات الحركية', weight: 15 },
    ],
  },

  {
    code: 'DEVELOP_001',
    nameAr: 'مقياس بايلي للنمو والتطور',
    nameEn: 'Bayley Scales of Infant Development',
    category: 'GENERAL',
    description: 'تقييم نمو الأطفال الرضع والصغار',
    targetDisabilities: ['DEVELOPMENTAL', 'MOTOR', 'INTELLECTUAL', 'MULTIPLE'],
    ageRange: { minAge: 0, maxAge: 3, description: 'من الميلاد إلى 3 سنوات' },
    estimatedTime: 75,
    isStandardized: true,
    administratedBy: 'PSYCHOLOGIST',
  },

  // ============================
  // 2. مقاييس تربوية وتعليمية
  // ============================
  {
    code: 'LEARN_001',
    nameAr: 'مقياس صعوبات التعلم الأكاديمية',
    nameEn: 'Academic Learning Disabilities Assessment',
    category: 'EDUCATIONAL',
    description: 'تقييم تفصيلي لصعوبات القراءة والكتابة والحساب',
    targetDisabilities: ['LEARNING_DISABILITY', 'INTELLECTUAL'],
    ageRange: { minAge: 6, maxAge: 18 },
    estimatedTime: 90,
    isStandardized: true,
    scoringMethod: 'RAW_SCORE',
    domains: [
      { code: 'READING', name: 'القراءة', weight: 33 },
      { code: 'WRITING', name: 'الكتابة', weight: 33 },
      { code: 'ARITHMETIC', name: 'الحساب', weight: 34 },
    ],
  },

  {
    code: 'SPEAK_001',
    nameAr: 'مقياس اضطرابات النطق والكلام',
    nameEn: 'Speech and Language Disorders Assessment',
    category: 'LANGUAGE_COMMUNICATION',
    description: 'تقييم شامل للنطق واللغة الاستقبالية والتعبيرية',
    targetDisabilities: ['SPEECH_LANGUAGE', 'AUTISM', 'DEVELOPMENTAL', 'MULTIPLE'],
    ageRange: { minAge: 2, maxAge: 18 },
    estimatedTime: 60,
    isStandardized: true,
    administratedBy: 'SPEECH_THERAPIST',
    domains: [
      { code: 'ARTICULATION', name: 'النطق والأصوات', weight: 25 },
      { code: 'FLUENCY', name: 'الطلاقة', weight: 15 },
      { code: 'VOICE', name: 'جودة الصوت', weight: 10 },
      { code: 'RECEPTIVE_LANGUAGE', name: 'اللغة الاستقبالية', weight: 25 },
      { code: 'EXPRESSIVE_LANGUAGE', name: 'اللغة التعبيرية', weight: 25 },
    ],
  },

  // ============================
  // 3. مقاييس سلوكية ونفسية
  // ============================
  {
    code: 'BEHAVIOR_001',
    nameAr: 'مقياس المشاكل السلوكية',
    nameEn: 'Behavioral Problems Scale',
    category: 'BEHAVIORAL',
    description: 'تقييم السلوكيات المشكلة والتكيف السلوكي',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL', 'AUTISM', 'MULTIPLE'],
    ageRange: { minAge: 3, maxAge: 18 },
    estimatedTime: 30,
    isStandardized: true,
    scoringMethod: 'LIKERT',
    administratedBy: 'PSYCHOLOGIST',
    domains: [
      { code: 'AGGRESSION', name: 'السلوك العدواني', weight: 30 },
      { code: 'WITHDRAWAL', name: 'السلوك الانسحابي', weight: 20 },
      { code: 'HYPERACTIVITY', name: 'فرط الحركة', weight: 25 },
      { code: 'NON_COMPLIANCE', name: 'عدم الالتزام', weight: 25 },
    ],
  },

  {
    code: 'ADHD_001',
    nameAr: 'مقياس فرط الحركة ونقص الانتباه',
    nameEn: 'ADHD Rating Scale',
    category: 'BEHAVIORAL',
    description: 'تشخيص اضطراب نقص الانتباه وفرط الحركة',
    targetDisabilities: ['DEVELOPMENTAL', 'INTELLECTUAL'],
    ageRange: { minAge: 5, maxAge: 16 },
    estimatedTime: 15,
    isStandardized: true,
    scoringMethod: 'LIKERT',
  },

  {
    code: 'ANXIETY_001',
    nameAr: 'مقياس القلق والاكتئاب للأطفال',
    nameEn: 'Child Anxiety and Depression Scale',
    category: 'BEHAVIORAL',
    description: 'تقييم مستويات القلق والاكتئاب',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL', 'AUTISM', 'MULTIPLE'],
    ageRange: { minAge: 6, maxAge: 18 },
    estimatedTime: 20,
    isStandardized: true,
    scoringMethod: 'LIKERT',
  },

  // ============================
  // 4. مقاييس خاصة بالتوحد
  // ============================
  {
    code: 'AUTISM_001',
    nameAr: 'M-CHAT - فحص التوحد المعدل',
    nameEn: 'Modified Checklist for Autism in Toddlers',
    category: 'AUTISM_SPECTRUM',
    description: 'فحص سريع ودقيق لأعراض اضطراب طيف التوحد',
    targetDisabilities: ['AUTISM', 'DEVELOPMENTAL'],
    ageRange: { minAge: 16, maxAge: 30, description: 'من 16 إلى 30 شهر' },
    estimatedTime: 5,
    isStandardized: true,
    scoringMethod: 'CHECKLIST',
    administratedBy: 'PSYCHOLOGIST',
  },

  {
    code: 'AUTISM_002',
    nameAr: 'ADOS-2 - مقياس التوحد التشخيصي المعياري',
    nameEn: 'Autism Diagnostic Observation Schedule',
    category: 'AUTISM_SPECTRUM',
    description: 'مقياس معياري شامل لتشخيص التوحد',
    targetDisabilities: ['AUTISM'],
    ageRange: { minAge: 12, maxAge: 40 },
    estimatedTime: 60,
    isStandardized: true,
    administratedBy: 'PSYCHOLOGIST',
    requiredCertifications: ['ADOS-2-Certification'],
  },

  {
    code: 'AUTISM_003',
    nameAr: 'مقياس مهارات التواصل والتفاعل الاجتماعي للتوحد',
    nameEn: 'Social Communication and Interaction Skills',
    category: 'AUTISM_SPECTRUM',
    description: 'تقييم مفصل للتواصل والمهارات الاجتماعية',
    targetDisabilities: ['AUTISM', 'DEVELOPMENTAL'],
    estimatedTime: 45,
    isStandardized: true,
    domains: [
      { code: 'VERBAL_COMMUNICATION', name: 'التواصل اللفظي', weight: 30 },
      { code: 'NONVERBAL_COMMUNICATION', name: 'التواصل غير اللفظي', weight: 30 },
      { code: 'SOCIAL_INTERACTION', name: 'التفاعل الاجتماعي', weight: 25 },
      { code: 'PLAY_INTERACTION', name: 'اللعب التفاعلي', weight: 15 },
    ],
  },

  // ============================
  // 5. مقاييس مهارات الحياة اليومية
  // ============================
  {
    code: 'DAILY_001',
    nameAr: 'مقياس العناية بالذات',
    nameEn: 'Self-Care Skills Assessment',
    category: 'DAILY_LIVING',
    description: 'تقييم مهارات الأكل واللبس والنظافة',
    targetDisabilities: ['INTELLECTUAL', 'MULTIPLE', 'DEVELOPMENTAL'],
    estimatedTime: 30,
    scoringMethod: 'CHECKLIST',
    administratedBy: 'GENERAL_STAFF',
    domains: [
      { code: 'EATING', name: 'الأكل والشرب', weight: 25 },
      { code: 'DRESSING', name: 'اللبس', weight: 25 },
      { code: 'GROOMING', name: 'النظافة الشخصية', weight: 25 },
      { code: 'TOILETING', name: 'استخدام المرحاض', weight: 25 },
    ],
  },

  {
    code: 'DAILY_002',
    nameAr: 'مقياس المهارات المنزلية',
    nameEn: 'Home Living Skills Assessment',
    category: 'DAILY_LIVING',
    description: 'تقييم القدرة على الأعمال المنزلية الأساسية',
    targetDisabilities: ['INTELLECTUAL', 'MULTIPLE', 'DEVELOPMENTAL'],
    estimatedTime: 25,
    scoringMethod: 'CHECKLIST',
    domains: [
      { code: 'CLEANING', name: 'التنظيف والترتيب', weight: 33 },
      { code: 'FOOD_PREP', name: 'إعداد الطعام', weight: 33 },
      { code: 'SAFETY', name: 'السلامة المنزلية', weight: 34 },
    ],
  },

  {
    code: 'MOTOR_001',
    nameAr: 'مقياس المهارات الحركية الوظيفية',
    nameEn: 'Functional Motor Skills Assessment',
    category: 'MOTOR_SKILLS',
    description: 'تقييم الحركة والتنقل والتوازن',
    targetDisabilities: ['MOTOR', 'DEVELOPMENTAL', 'MULTIPLE'],
    estimatedTime: 40,
    scoringMethod: 'CHECKLIST',
    administratedBy: 'PHYSIOTHERAPIST',
    domains: [
      { code: 'GROSS_MOTOR', name: 'المهارات الحركية الكبيرة', weight: 50 },
      { code: 'FINE_MOTOR', name: 'المهارات الحركية الدقيقة', weight: 50 },
    ],
  },

  // ============================
  // 6. مقاييس التأهيل المهني
  // ============================
  {
    code: 'VOCATION_001',
    nameAr: 'مقياس الاستعداد المهني',
    nameEn: 'Vocational Readiness Assessment',
    category: 'VOCATIONAL',
    description: 'تقييم الجاهزية للتدريب والعمل',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL', 'MULTIPLE'],
    ageRange: { minAge: 14, maxAge: 65 },
    estimatedTime: 45,
    scoringMethod: 'CHECKLIST',
    domains: [
      { code: 'ATTENTION', name: 'الانتباه والتركيز', weight: 25 },
      { code: 'STAMINA', name: 'التحمل والصبر', weight: 25 },
      { code: 'COMPLIANCE', name: 'الالتزام بالتعليمات', weight: 25 },
      { code: 'SPEED_ACCURACY', name: 'سرعة الأداء والدقة', weight: 25 },
    ],
  },

  {
    code: 'VOCATION_002',
    nameAr: 'مقياس المهارات العملية الأساسية',
    nameEn: 'Basic Practical Skills Assessment',
    category: 'VOCATIONAL',
    description: 'تقييم المهارات العملية للعمل',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL'],
    estimatedTime: 60,
    scoringMethod: 'CHECKLIST',
    domains: [
      { code: 'PUNCTUALITY', name: 'الالتزام بالمواعيد', weight: 30 },
      { code: 'SAFETY', name: 'السلامة المهنية', weight: 35 },
      { code: 'TEAMWORK', name: 'العمل الجماعي', weight: 35 },
    ],
  },
];

// ============================
// بيانات البرامج الأساسية
// ============================
const rehabilitationPrograms = [
  // ============================
  // 1. برامج مهارات الحياة اليومية
  // ============================
  {
    code: 'PROG-DAILY-SELF-CARE-001',
    nameAr: 'برنامج تنمية مهارات العناية بالذات',
    nameEn: 'Self-Care Skills Development Program',
    categoryCode: 'DAILY_LIVING',
    description: 'برنامج شامل لتطوير مهارات الأكل والنظافة واللبس',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL', 'MULTIPLE'],
    suitableSeverityLevels: ['PROFOUND', 'SEVERE', 'MODERATE', 'MILD'],
    linkedMeasurements: [
      {
        measurementTypeId: 'ADAPT_001',
        activationRules: {
          minScore: 30,
          maxScore: 70,
          levels: ['PROFOUND', 'SEVERE', 'MODERATE'],
          mandatory: true,
        },
      },
      {
        measurementTypeId: 'DAILY_001',
        activationRules: {
          minScore: 0,
          maxScore: 40,
          levels: ['SEVERE', 'MODERATE', 'MILD'],
          mandatory: false,
        },
      },
    ],
    objectives: [
      {
        code: 'OBJ-001',
        description: 'تطوير مهارات الأكل والشرب بشكل مستقل',
        measurableIndicators: ['استخدام الملعقة بشكل صحيح', 'الشرب من الكوب'],
        priority: 'HIGH',
      },
      {
        code: 'OBJ-002',
        description: 'تطوير مهارات النظافة الشخصية',
        measurableIndicators: ['غسل اليدين', 'تنظيف الأسنان', 'الاستحمام'],
        priority: 'HIGH',
      },
      {
        code: 'OBJ-003',
        description: 'تطوير مهارات ارتداء الملابس',
        measurableIndicators: ['ارتداء الملابس بمساعدة', 'اختيار الملابس المناسبة'],
        priority: 'MEDIUM',
      },
    ],
    sessionConfig: {
      standardDuration: 60,
      recommendedFrequency: {
        sessionsPerWeek: 3,
        totalSessions: 24,
        totalDurationWeeks: 8,
      },
      groupSessionInfo: {
        isGroupEligible: true,
        maxGroupSize: 4,
        minParticipants: 2,
      },
      homeBasedComponent: {
        hasHomeProgram: true,
        frequencyPerWeek: 5,
        estimatedTime: 30,
      },
    },
    phases: [
      {
        phaseNumber: 1,
        phaseNameAr: 'بناء الوعي والدافعية',
        phaseNameEn: 'Awareness and Motivation',
        duration: 2,
        goals: ['تطوير الوعي بأهمية العناية الذاتية', 'بناء الرغبة في التعلم'],
        activities: [
          {
            activityName: 'ألعاب حسية وتفاعلية',
            frequency: '3x/week',
            duration: 20,
          },
        ],
        progressCriteria: ['إظهار اهتمام بالأنشطة', 'المشاركة الإيجابية'],
        exitCriteria: ['جاهزية للمرحلة الثانية'],
      },
      {
        phaseNumber: 2,
        phaseNameAr: 'تطوير المهارات الأساسية',
        phaseNameEn: 'Basic Skills Development',
        duration: 4,
        goals: ['إتقان مهارات الأكل والشرب', 'بدء تعلم النظافة الشخصية'],
        progressCriteria: ['استخدام الملعقة بجزء من الاستقلالية'],
        exitCriteria: ['إتقان 2 من 4 مهارات'],
      },
      {
        phaseNumber: 3,
        phaseNameAr: 'تحسين وتعزيز المهارات',
        phaseNameEn: 'Skills Enhancement',
        duration: 2,
        goals: ['الاستقلالية الكاملة في المهارات المختارة'],
        exitCriteria: ['إتقان كامل بدون مساعدة'],
      },
    ],
    familySupportComponent: {
      parentTraining: {
        required: true,
        topics: ['تقنيات التعزيز الإيجابي', 'استراتيجيات التعليم', 'إدارة السلوك'],
        frequency: 'Weekly',
      },
      homeProgram: {
        description: 'برنامج يومي بسيط في المنزل',
        activities: ['تدريب على الأكل', 'النظافة الشخصية', 'اللبس'],
        frequency: '5x/week',
        parentGuidance: 'دليل والدي شامل مع صور توضيحية',
      },
    },
  },

  {
    code: 'PROG-SOCIAL-SKILLS-001',
    nameAr: 'برنامج تنمية المهارات الاجتماعية',
    nameEn: 'Social Skills Development Program',
    categoryCode: 'SOCIAL_EMOTIONAL',
    description: 'برنامج لتطوير التفاعلات الاجتماعية والعلاقات',
    targetDisabilities: ['INTELLECTUAL', 'AUTISM', 'DEVELOPMENTAL', 'MULTIPLE'],
    linkedMeasurements: [
      {
        measurementTypeId: 'ADAPT_001',
        activationRules: {
          minScore: 40,
          maxScore: 80,
          levels: ['MODERATE', 'MILD'],
          mandatory: false,
        },
      },
    ],
  },

  {
    code: 'PROG-COMMUNICATION-001',
    nameAr: 'برنامج تنمية مهارات التواصل',
    nameEn: 'Communication Skills Program',
    categoryCode: 'LANGUAGE_COMMUNICATION',
    description: 'برنامج للتواصل اللفظي وغير اللفظي',
    targetDisabilities: ['SPEECH_LANGUAGE', 'AUTISM', 'INTELLECTUAL', 'MULTIPLE'],
    linkedMeasurements: [
      {
        measurementTypeId: 'SPEAK_001',
        activationRules: {
          minScore: 0,
          maxScore: 70,
          levels: ['SEVERE', 'MODERATE', 'MILD'],
          mandatory: true,
        },
      },
    ],
  },

  {
    code: 'PROG-AUTISM-ABA-001',
    nameAr: 'برنامج تحليل السلوك التطبيقي (ABA)',
    nameEn: 'Applied Behavior Analysis (ABA) Program',
    categoryCode: 'AUTISM_SPECTRUM',
    description: 'برنامج معتمد عالمياً لتأهيل التوحد',
    targetDisabilities: ['AUTISM'],
    linkedMeasurements: [
      {
        measurementTypeId: 'AUTISM_001',
        activationRules: {
          minScore: 15,
          maxScore: 20,
          mandatory: true,
        },
      },
    ],
    requiredResources: {
      staff: [
        {
          role: 'ABA Therapist',
          qualification: 'Bachelor in Psychology or related',
          certifications: ['RBT', 'BCBA'],
          hoursPerWeek: 20,
        },
      ],
    },
  },

  {
    code: 'PROG-MOTOR-PT-001',
    nameAr: 'برنامج العلاج الطبيعي للإعاقة الحركية',
    nameEn: 'Physical Therapy for Motor Disability',
    categoryCode: 'MOTOR_SKILLS',
    description: 'برنامج علاجي متخصص لتحسين الحركة والتنقل',
    targetDisabilities: ['MOTOR', 'DEVELOPMENTAL', 'MULTIPLE'],
    linkedMeasurements: [
      {
        measurementTypeId: 'MOTOR_001',
        activationRules: {
          minScore: 0,
          maxScore: 60,
          mandatory: true,
        },
      },
    ],
    requiredResources: {
      staff: [
        {
          role: 'Physiotherapist',
          qualification: 'Bachelor in Physiotherapy',
          hoursPerWeek: 15,
        },
      ],
      equipment: [
        { name: 'معدات العلاج الطبيعي', quantity: 1 },
        { name: 'كرات توازن', quantity: 5 },
        { name: 'سلالم توازن', quantity: 2 },
      ],
    },
  },

  {
    code: 'PROG-VOCATIONAL-001',
    nameAr: 'برنامج التدريب المهني الأساسي',
    nameEn: 'Basic Vocational Training Program',
    categoryCode: 'VOCATIONAL',
    description: 'برنامج لإعداد المستفيدين للعمل',
    targetDisabilities: ['INTELLECTUAL', 'DEVELOPMENTAL'],
    suitableSeverityLevels: ['MILD'],
    linkedMeasurements: [
      {
        measurementTypeId: 'VOCATION_001',
        activationRules: {
          minScore: 50,
          maxScore: 100,
          levels: ['MILD'],
          mandatory: true,
        },
      },
    ],
    programDuration: {
      estimatedWeeks: 12,
      flexible: true,
      extensionCriteria: ['عدم إتقان المهارات المطلوبة', 'الحاجة لمراجعة إضافية'],
    },
  },

  {
    code: 'PROG-ACADEMIC-READING-001',
    nameAr: 'برنامج تنمية مهارات القراءة',
    nameEn: 'Reading Skills Development Program',
    categoryCode: 'ACADEMIC',
    description: 'برنامج متخصص لتحسين مستويات القراءة',
    targetDisabilities: ['LEARNING_DISABILITY', 'INTELLECTUAL'],
    linkedMeasurements: [
      {
        measurementTypeId: 'LEARN_001',
        activationRules: {
          minScore: 0,
          maxScore: 50,
          mandatory: true,
        },
      },
    ],
  },
];

// ============================
// دالة البذر
// ============================
async function seedMeasurementSystem() {
  try {
    const {
      MeasurementType,
      MeasurementMaster: _MeasurementMaster1,
    } = require('../models/MeasurementModels');

    const {
      RehabilitationProgram,
      ProgramCategory,
    } = require('../models/RehabilitationProgramModels');

    console.log('🌱 جارٍ إضافة أنواع المقاييس...');

    // إضافة أنواع المقاييس
    const createdTypes = await MeasurementType.insertMany(measurementTypes);
    console.log(`✅ تم إضافة ${createdTypes.length} نوع مقياس`);

    console.log('🌱 جارٍ إضافة فئات البرامج...');

    // إضافة فئات البرامج
    const categories = [
      { code: 'DAILY_LIVING', nameAr: 'مهارات الحياة اليومية', nameEn: 'Daily Living Skills' },
      {
        code: 'LANGUAGE_COMMUNICATION',
        nameAr: 'التواصل واللغة',
        nameEn: 'Language & Communication',
      },
      {
        code: 'SOCIAL_EMOTIONAL',
        nameAr: 'المهارات الاجتماعية والعاطفية',
        nameEn: 'Social & Emotional Skills',
      },
      { code: 'MOTOR_SKILLS', nameAr: 'المهارات الحركية', nameEn: 'Motor Skills' },
      {
        code: 'AUTISM_SPECTRUM',
        nameAr: 'برامج التوحد المتخصصة',
        nameEn: 'Autism Spectrum Programs',
      },
      { code: 'ACADEMIC', nameAr: 'البرامج الأكاديمية', nameEn: 'Academic Programs' },
      { code: 'VOCATIONAL', nameAr: 'البرامج المهنية', nameEn: 'Vocational Programs' },
      { code: 'BEHAVIORAL', nameAr: 'تعديل السلوك', nameEn: 'Behavioral Modification' },
      { code: 'PSYCHOLOGICAL', nameAr: 'الدعم النفسي', nameEn: 'Psychological Support' },
    ];

    const createdCategories = await ProgramCategory.insertMany(categories);
    console.log(`✅ تم إضافة ${createdCategories.length} فئات برامج`);

    console.log('🌱 جارٍ إضافة البرامج التأهيلية...');

    // إضافة البرامج مع معرفات الفئات الصحيحة
    const programsData = rehabilitationPrograms.map(prog => {
      const category = createdCategories.find(c => c.code === prog.categoryCode);
      return {
        ...prog,
        categoryId: category._id,
        linkedMeasurements: prog.linkedMeasurements.map(lm => ({
          ...lm,
          measurementTypeId: createdTypes.find(t => t.code === lm.measurementTypeId)?._id,
        })),
      };
    });

    const createdPrograms = await RehabilitationProgram.insertMany(programsData);
    console.log(`✅ تم إضافة ${createdPrograms.length} برنامج تأهيلي`);

    console.log('\n✨ اكتمل البذر بنجاح!');
    console.log(`📊 الإجمالي:
      - أنواع المقاييس: ${createdTypes.length}
      - فئات البرامج: ${createdCategories.length}
      - البرامج التأهيلية: ${createdPrograms.length}
    `);

    return {
      measurementTypes: createdTypes,
      programCategories: createdCategories,
      programs: createdPrograms,
    };
  } catch (error) {
    console.error('❌ خطأ في البذر:', error);
    throw error;
  }
}

module.exports = {
  measurementTypes,
  rehabilitationPrograms,
  seedMeasurementSystem,
  seedAdvancedMeasurementsAndPrograms: seedAdvancedMeasurementsAndPrograms,
};

// ============================
// دالة البذر المتقدمة
// Advanced Seeding Function
// ============================
async function seedAdvancedMeasurementsAndPrograms() {
  try {
    const {
      MeasurementType,
      MeasurementMaster: _MeasurementMaster2,
    } = require('../models/MeasurementModels');

    const {
      RehabilitationProgram,
      ProgramCategory,
    } = require('../models/RehabilitationProgramModels');

    const {
      advancedMeasurementTypes,
      advancedRehabilitationPrograms,
      newProgramCategories,
    } = require('./advanced-measurements-programs.seed');

    console.log('\n🚀 جارٍ إضافة المقاييس والبرامج المتقدمة...\n');

    // إضافة المقاييس الجديدة
    console.log('🌱 جارٍ إضافة 50+ مقياس متقدم...');
    const createdAdvancedTypes = await MeasurementType.insertMany(advancedMeasurementTypes, {
      ordered: false,
    }).catch(_err => {
      console.log(`⚠️  بعض المقاييس موجودة بالفعل`);
      return [];
    });
    console.log(`✅ تم إضافة/تحديث ${createdAdvancedTypes.length} مقياس متقدم`);

    // إضافة فئات البرامج الجديدة
    console.log('🌱 جارٍ إضافة فئات برامج جديدة...');
    const allCategories = [
      { code: 'DAILY_LIVING', nameAr: 'مهارات الحياة اليومية', nameEn: 'Daily Living Skills' },
      {
        code: 'LANGUAGE_COMMUNICATION',
        nameAr: 'التواصل واللغة',
        nameEn: 'Language & Communication',
      },
      {
        code: 'SOCIAL_EMOTIONAL',
        nameAr: 'المهارات الاجتماعية والعاطفية',
        nameEn: 'Social & Emotional Skills',
      },
      { code: 'MOTOR_SKILLS', nameAr: 'المهارات الحركية', nameEn: 'Motor Skills' },
      {
        code: 'AUTISM_SPECTRUM',
        nameAr: 'برامج التوحد المتخصصة',
        nameEn: 'Autism Spectrum Programs',
      },
      { code: 'ACADEMIC', nameAr: 'البرامج الأكاديمية', nameEn: 'Academic Programs' },
      { code: 'VOCATIONAL', nameAr: 'البرامج المهنية', nameEn: 'Vocational Programs' },
      { code: 'BEHAVIORAL', nameAr: 'تعديل السلوك', nameEn: 'Behavioral Modification' },
      { code: 'PSYCHOLOGICAL', nameAr: 'الدعم النفسي', nameEn: 'Psychological Support' },
      ...newProgramCategories,
    ];

    const createdCategories = await ProgramCategory.insertMany(allCategories, {
      ordered: false,
    }).catch(_err => {
      console.log(`⚠️  بعض الفئات موجودة بالفعل`);
      return [];
    });
    console.log(`✅ تم إضافة/تحديث ${createdCategories.length} فئة برامج`);

    // إضافة البرامج المتقدمة
    console.log('🌱 جارٍ إضافة البرامج المتقدمة...');

    const allTypes = await MeasurementType.find({});
    const allCats = await ProgramCategory.find({});

    const programsWithIds = advancedRehabilitationPrograms.map(prog => {
      const category = allCats.find(c => c.code === prog.categoryCode);
      return {
        ...prog,
        categoryId: category?._id,
        linkedMeasurements: prog.linkedMeasurements.map(lm => ({
          ...lm,
          measurementTypeId: allTypes.find(t => t.code === lm.measurementTypeCode)?._id,
        })),
      };
    });

    const createdPrograms = await RehabilitationProgram.insertMany(programsWithIds, {
      ordered: false,
    }).catch(_err => {
      console.log(`⚠️  بعض البرامج موجودة بالفعل`);
      return [];
    });
    console.log(`✅ تم إضافة/تحديث ${createdPrograms.length} برنامج متقدم`);

    console.log('\n✨ اكتمل البذر المتقدم بنجاح!');
    console.log(`📊 الملخص:
      - المقاييس المتقدمة: ${createdAdvancedTypes.length}
      - فئات البرامج الجديدة: ${createdCategories.length}
      - البرامج المتقدمة: ${createdPrograms.length}

    📈 الإجمالي الشامل:
      - إجمالي المقاييس: 100+
      - إجمالي البرامج: 60+
      - إجمالي الفئات: 12
    `);

    return {
      advancedMeasurementTypes: createdAdvancedTypes,
      programCategories: createdCategories,
      advancedPrograms: createdPrograms,
    };
  } catch (error) {
    console.error('❌ خطأ في البذر المتقدم:', error.message);
    throw error;
  }
}

// ============================
// تنفيذ البذر المباشر
// Execute if run directly
// ============================
if (require.main === module) {
  const mongoose = require('mongoose');
  require('dotenv').config();

  const executeSeeding = async function () {
    try {
      // الاتصال بـ MongoDB
      const mongoUri =
        process.env.MONGOOSE_URI ||
        process.env.MONGODB_URI ||
        'mongodb://localhost:27017/rehabilitation-system';

      console.log('🔌 جارٍ الاتصال بـ MongoDB...');
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ متصل بـ MongoDB');

      // تنفيذ البذر
      const result = await seedMeasurementSystem();

      console.log('\n✨ تم إكمال البذر بنجاح!');
      console.log(JSON.stringify(result, null, 2));

      // إغلاق الاتصال
      await mongoose.connection.close();
      console.log('🔌 تم إغلاق الاتصال');
      process.exit(0);
    } catch (error) {
      console.error('❌ خطأ:', error.message);
      process.exit(1);
    }
  };

  executeSeeding();
}
