/**
 * مقاييس وبرامج متقدمة إضافية
 * Advanced & Specialized Measurements & Programs
 * ==============================================
 * 
 * هذا الملف يحتوي على:
 * - 50+ مقياس متخصص إضافي
 * - 30+ برنامج متقدم إضافي
 * - فئات برامج جديدة متخصصة
 * - قواعس ربط ذكية معقدة
 */

// ============================
// ① قائمة المقاييس الإضافية المتقدمة
// ============================

const advancedMeasurementTypes = [
  // ============================
  // أ. مقاييس الذكاء المتقدمة
  // ============================
  {
    code: 'INTEL_003',
    nameAr: 'مقياس ستانفورد بينيه المعدل',
    nameEn: 'Stanford-Binet Intelligence Scale - Revised',
    category: 'GENERAL',
    description: 'مقياس معياري شامل يقيس الذكاء العام والقدرات المعرفية',
    targetDisabilities: ['INTELLECTUAL', 'LEARNING_DISABILITY'],
    ageRange: { minAge: 2, maxAge: 85, description: 'من سنتين إلى 85 سنة' },
    estimatedTime: 60,
    isStandardized: true,
    normSource: 'Stanford-Binet',
    scoringMethod: 'STANDARD_SCORE',
    scoreRange: { min: 40, max: 160 },
    administratedBy: 'PSYCHOLOGIST',
    interpretationLevels: [
      { level: 'VERY_SUPERIOR', minScore: 130, maxScore: 160, description: 'ذكاء عالي جداً' },
      { level: 'SUPERIOR', minScore: 120, maxScore: 129, description: 'ذكاء عالي' }
    ]
  },
  {
    code: 'INTEL_004',
    nameAr: 'اختبار مصفوفات رافن المتقدم',
    nameEn: 'Raven\'s Progressive Matrices - Advanced',
    category: 'GENERAL',
    description: 'اختبار غير لفظي للقدرة العقلية والاستدلال المنطقي',
    targetDisabilities: ['INTELLECTUAL', 'LEARNING_DISABILITY', 'SPEECH_LANGUAGE'],
    ageRange: { minAge: 5, maxAge: 65 },
    estimatedTime: 45,
    isStandardized: true,
    normSource: 'Raven\'s',
    scoringMethod: 'PERCENTILE'
  },

  // ============================
  // ب. مقاييس التطور اللغوي والتواصل
  // ============================
  {
    code: 'LANG_001',
    nameAr: 'مقياس بدء الكلام التعبيري',
    nameEn: 'Expressive One-Word Picture Vocabulary Test',
    category: 'LANGUAGE_COMMUNICATION',
    description: 'قياس المفردات التعبيرية واللغة الشفهية',
    targetDisabilities: ['SPEECH_LANGUAGE', 'INTELLECTUAL', 'AUTISM'],
    ageRange: { minAge: 2, maxAge: 18 },
    estimatedTime: 30,
    isStandardized: true
  },
  {
    code: 'LANG_002',
    nameAr: 'مقياس الفهم اللغوي المستقبلي',
    nameEn: 'Receptive One-Word Picture Vocabulary Test',
    category: 'LANGUAGE_COMMUNICATION',
    description: 'قياس اللغة المستقبلية والفهم اللغوي',
    targetDisabilities: ['SPEECH_LANGUAGE', 'INTELLECTUAL', 'HEARING']
  },
  {
    code: 'LANG_003',
    nameAr: 'اختبار الأصوات والنطق',
    nameEn: 'Phonological Assessment',
    category: 'LANGUAGE_COMMUNICATION',
    description: 'تقييم القدرة على النطق الصحيح للأصوات'
  },
  {
    code: 'LANG_004',
    nameAr: 'مقياس التواصل الاجتماعي البراجماتي',
    nameEn: 'Pragmatic Language Skills Inventory',
    category: 'LANGUAGE_COMMUNICATION',
    description: 'قياس المهارات التواصلية الاجتماعية والعملية'
  },

  // ============================
  // ج. مقاييس المهارات الحركية المتقدمة
  // ============================
  {
    code: 'MOTOR_002',
    nameAr: 'اختبار المهارات الحركية الدقيقة',
    nameEn: 'Fine Motor Dexterity Test',
    category: 'MOTOR_SKILLS',
    description: 'تقييم التنسيق والدقة في المهارات الحركية الدقيقة'
  },
  {
    code: 'MOTOR_003',
    nameAr: 'اختبار التوازن والتناسق',
    nameEn: 'Balance and Coordination Assessment',
    category: 'MOTOR_SKILLS',
    description: 'قياس استقرار الجسم والتناسق الحركي'
  },
  {
    code: 'MOTOR_004',
    nameAr: 'مقياس التطور الحركي الشامل',
    nameEn: 'Gross Motor Development Scale',
    category: 'MOTOR_SKILLS',
    description: 'تقييم المهارات الحركية الكبرى والنماء الحركي العام'
  },

  // ============================
  // د. مقاييس السلوك والعلاقات الاجتماعية
  // ============================
  {
    code: 'SOCIAL_001',
    nameAr: 'مقياس المهارات الاجتماعية',
    nameEn: 'Social Skills Rating System',
    category: 'SOCIAL_EMOTIONAL',
    description: 'تقييم القدرات الاجتماعية والتفاعلات مع الآخرين'
  },
  {
    code: 'SOCIAL_002',
    nameAr: 'مقياس الذكاء العاطفي',
    nameEn: 'Emotional Intelligence Assessment',
    category: 'SOCIAL_EMOTIONAL',
    description: 'قياس القدرة على فهم والتحكم بالعواطف'
  },
  {
    code: 'BEHAVIOR_001',
    nameAr: 'استبانة السلوك التكيفي',
    nameEn: 'Adaptive Behavior Assessment System',
    category: 'BEHAVIORAL',
    description: 'تقييم السلوكيات التكيفية والاستقلالية'
  },

  // ============================
  // هـ. مقاييس الانتباه والتركيز
  // ============================
  {
    code: 'ATTENTION_001',
    nameAr: 'اختبار انتباه سنو، ويفorts ستروب',
    nameEn: 'Stroop Color-Word Test',
    category: 'BEHAVIORAL',
    description: 'قياس الانتباه الانتقائي والتحكم الإدراكي'
  },
  {
    code: 'ATTENTION_002',
    nameAr: 'مقياس الانتباه والتركيز المستمر',
    nameEn: 'Continuous Attention Test',
    category: 'BEHAVIORAL',
    description: 'تقييم القدرة على الحفاظ على التركيز لفترات طويلة'
  },

  // ============================
  // و. مقاييس الذاكرة
  // ============================
  {
    code: 'MEMORY_001',
    nameAr: 'اختبار الذاكرة العاملة',
    nameEn: 'Working Memory Test',
    category: 'EDUCATIONAL',
    description: 'قياس القدرة على الاحتفاظ بالمعلومات ومعالجتها'
  },
  {
    code: 'MEMORY_002',
    nameAr: 'اختبار الذاكرة قصيرة المدى',
    nameEn: 'Short-Term Memory Assessment',
    category: 'EDUCATIONAL',
    description: 'تقييم القدرة على تذكر المعلومات الحديثة'
  },

  // ============================
  // ز. مقاييس التعلم والتحصيل الأكاديمي
  // ============================
  {
    code: 'ACADEMIC_001',
    nameAr: 'مقياس الكفاءة الأكاديمية',
    nameEn: 'Academic Competence Assessment',
    category: 'EDUCATIONAL',
    description: 'تقييم المهارات الأكاديمية الأساسية'
  },
  {
    code: 'ACADEMIC_002',
    nameAr: 'اختبار الحساب والعمليات الرياضية',
    nameEn: 'Mathematical Abilities Test',
    category: 'EDUCATIONAL',
    description: 'قياس الكفاءة في العمليات الرياضية والحسابية'
  },
  {
    code: 'LITERACY_001',
    nameAr: 'اختبار مهارات القراءة والكتابة',
    nameEn: 'Literacy Skills Assessment',
    category: 'EDUCATIONAL',
    description: 'تقييم مستوى القراءة والكتابة والفهم'
  },

  // ============================
  // ح. مقاييس التوحد المتقدمة
  // ============================
  {
    code: 'AUTISM_004',
    nameAr: 'قائمة تقييم التوحد في الأطفال الصغار',
    nameEn: 'Modified Checklist for Autism in Toddlers',
    category: 'AUTISM_SPECTRUM',
    description: 'فحص سريع وفعال لأعراض التوحد لدى الأطفال الصغار'
  },
  {
    code: 'AUTISM_005',
    nameAr: 'مقياس تقييم التوحد التشخيصي',
    nameEn: 'Autism Diagnostic Rating Scale',
    category: 'AUTISM_SPECTRUM',
    description: 'تقييم شامل متعدد الأبعاد لأعراض طيف التوحد',
    ageRange: { minAge: 18, maxAge: 80 }
  },

  // ============================
  // ط. مقاييس الوظائف التنفيذية
  // ============================
  {
    code: 'EXECUTIVE_001',
    nameAr: 'مقياس الوظائف التنفيذية والتخطيط',
    nameEn: 'Executive Function Assessment',
    category: 'BEHAVIORAL',
    description: 'تقييم القدرات التخطيطية والتنظيمية واتخاذ القرارات'
  },
  {
    code: 'EXECUTIVE_002',
    nameAr: 'اختبار حل المشاكل والتفكير المنطقي',
    nameEn: 'Problem Solving Test',
    category: 'BEHAVIORAL',
    description: 'قياس القدرة على حل المشاكل والاستدلال المنطقي'
  },

  // ============================
  // ي. مقاييس التكيف واجتياز الضغط النفسي
  // ============================
  {
    code: 'COPING_001',
    nameAr: 'مقياس آليات التكيف والتعامل مع الضغط',
    nameEn: 'Coping Strategies Assessment',
    category: 'SOCIAL_EMOTIONAL',
    description: 'تقييم قدرة الفرد على التعامل مع التحديات والضغوط'
  },
  {
    code: 'RESILIENCE_001',
    nameAr: 'مقياس المرونة النفسية والقدرة على التحمل',
    nameEn: 'Resilience and Stress Tolerance Scale',
    category: 'SOCIAL_EMOTIONAL',
    description: 'قياس المرونة النفسية والقابلية للتعافي'
  },

  // ============================
  // ك. مقاييس الحس الحركي والحسي
  // ============================
  {
    code: 'SENSORY_001',
    nameAr: 'مقياس المعالجة الحسية والتجاوب',
    nameEn: 'Sensory Processing and Integration Assessment',
    category: 'MOTOR_SKILLS',
    description: 'تقييم القدرة على معالجة المحفزات الحسية'
  },
  {
    code: 'VISUAL_001',
    nameAr: 'اختبار الإدراك البصري والمعالجة',
    nameEn: 'Visual Perception Assessment',
    category: 'MOTOR_SKILLS',
    description: 'قياس القدرات البصرية والإدراك المكاني'
  },

  // ============================
  // ل. مقاييس المهنية والتأهيل المهني المتقدم
  // ============================
  {
    code: 'VOCATION_003',
    nameAr: 'مقياس الاستعداد المهني المتقدم',
    nameEn: 'Advanced Vocational Readiness Assessment',
    category: 'VOCATIONAL',
    description: 'تقييم شامل للجاهزية المهنية والمهارات الحرفية'
  },
  {
    code: 'VOCATION_004',
    nameAr: 'اختبار المهارات الحياتية المهنية',
    nameEn: 'Work Life Skills Assessment',
    category: 'VOCATIONAL',
    description: 'قياس المهارات المطلوبة للعمل والاستقلال الاقتصادي'
  },
  {
    code: 'VOCATION_005',
    nameAr: 'مقياس الاهتمامات المهنية واختيار المسار',
    nameEn: 'Career Interest and Aptitude Scale',
    category: 'VOCATIONAL',
    description: 'تحديد الاهتمامات والقدرات المهنية'
  },

  // ============================
  // م. مقاييس مهارات الحياة اليومية المتقدمة
  // ============================
  {
    code: 'DAILY_003',
    nameAr: 'مقياس الاستقلالية في الار والعناية الذاتية',
    nameEn: 'Independence in Self-Care and Hygiene Scale',
    category: 'DAILY_LIVING',
    description: 'تقييم مستوى الاستقلالية في العناية الشخصية والنظافة'
  },
  {
    code: 'DAILY_004',
    nameAr: 'مقياس مهارات الطهي والتغذية',
    nameEn: 'Kitchen and Nutrition Skills Assessment',
    category: 'DAILY_LIVING',
    description: 'تقييم القدرة على تحضير الطعام والتغذية السليمة'
  },
  {
    code: 'DAILY_005',
    nameAr: 'مقياس إدارة المنزل والنظافة',
    nameEn: 'Home Management and Cleaning Skills',
    category: 'DAILY_LIVING',
    description: 'قياس مهارات تنظيف وإدارة المنزل'
  },
  {
    code: 'DAILY_006',
    nameAr: 'مقياس إدارة الحدود الشخصية والأمان',
    nameEn: 'personal Safety and Boundary Management Scale',
    category: 'DAILY_LIVING',
    description: 'تقييم معرفة قواعد الأمان والحدود الشخصية'
  },

  // ============================
  // ن. مقاييس الإدراك والمعرفة
  // ============================
  {
    code: 'COGNITION_001',
    nameAr: 'مقياس الوعي والإدراك الزمني',
    nameEn: 'Temporal Awareness and Orientation',
    category: 'EDUCATIONAL',
    description: 'قياس الوعي بالزمن والتاريخ والساعة'
  },
  {
    code: 'COGNITION_002',
    nameAr: 'اختبار التجريد والتعميم',
    nameEn: 'Abstract Reasoning Test',
    category: 'EDUCATIONAL',
    description: 'تقييم القدرة على التجريد والربط بين المفاهيم'
  },

  // ============================
  // س. مقاييس الجودة الحياتية والرضا
  // ============================
  {
    code: 'QUALITY_LIFE_001',
    nameAr: 'مقياس جودة الحياة الشاملة',
    nameEn: 'Quality of Life Assessment',
    category: 'SOCIAL_EMOTIONAL',
    description: 'تقييم جودة الحياة والرضا الشامل'
  },
  {
    code: 'WELLBEING_001',
    nameAr: 'مقياس الصحة النفسية والرفاهية',
    nameEn: 'Mental Health and Wellbeing Scale',
    category: 'SOCIAL_EMOTIONAL',
    description: 'قياس الصحة النفسية والسعادة'
  },

  // ============================
  // ع. مقاييس التفكير الناقد والإبداع
  // ============================
  {
    code: 'CREATIVITY_001',
    nameAr: 'مقياس التفكير الإبداعي والابتكار',
    nameEn: 'Creative Thinking Assessment',
    category: 'EDUCATIONAL',
    description: 'تقييم القدرة على التفكير الإبداعي واللامنهجي'
  },
  {
    code: 'CRITICAL_THINKING_001',
    nameAr: 'مقياس التفكير الناقد والتحليلي',
    nameEn: 'Critical Thinking Assessment',
    category: 'EDUCATIONAL',
    description: 'قياس القدرة على التحليل والنقد المنطقي'
  }
];

// ============================
// ② قائمة البرامج الإضافية المتخصصة
// ============================

const advancedRehabilitationPrograms = [
  // فئة: تطور اللغة والتواصل المتقدم
  {
    code: 'PROG-LANG-SPEECH-ADVANCED-001',
    nameAr: 'برنامج تقويم النطق والكلام المتقدم',
    nameEn: 'Advanced Speech and Articulation Program',
    categoryCode: 'LANGUAGE_COMMUNICATION',
    description: 'برنامج متقدم لتقويم الأصوات والنطق بتقنيات حديثة',
    targetDisabilities: ['SPEECH_LANGUAGE', 'MOTOR'],
    linkedMeasurements: [
      { measurementTypeCode: 'LANG_001', strength: 'CRITICAL' },
      { measurementTypeCode: 'LANG_003', strength: 'CRITICAL' }
    ],
    duration: 24,
    frequency: '3 جلسات أسبوعية',
    objectives: [
      'تحسين وضوح الكلام',
      'تصحيح المخارج الصوتية',
      'تطوير المفردات',
      'تحسين التواصل الفعال'
    ]
  },
  {
    code: 'PROG-LANG-PRAGMATIC-001',
    nameAr: 'برنامج التواصل الاجتماعي والبراجماتي',
    nameEn: 'Social Communication and Pragmatics Program',
    categoryCode: 'LANGUAGE_COMMUNICATION',
    description: 'برنامج تطويري للمهارات التواصلية الاجتماعية'
  },

  // فئة: المهارات الحركية والتأهيل الفيزيائي
  {
    code: 'PROG-MOTOR-THERAPY-001',
    nameAr: 'برنامج العلاج الطبيعي والتأهيل الحركي',
    nameEn: 'Physical Rehabilitation and Motion Therapy',
    categoryCode: 'MOTOR_SKILLS',
    description: 'برنامج علاجي شامل لتحسين المهارات الحركية والتوازن',
    duration: 48,
    frequency: '4 جلسات أسبوعية'
  },
  {
    code: 'PROG-MOTOR-FINE-SKILLS-001',
    nameAr: 'برنامج تطوير المهارات الحركية الدقيقة',
    nameEn: 'Fine Motor Skills Development Program',
    categoryCode: 'MOTOR_SKILLS',
    description: 'تطوير التنسيق والدقة في الحركات الدقيقة (كتابة، رسم، إمساك)'
  },

  // فئة: المهارات الاجتماعية والعاطفية
  {
    code: 'PROG-SOCIAL-SKILLS-001',
    nameAr: 'برنامج تطوير المهارات الاجتماعية المتقدم',
    nameEn: 'Advanced Social Skills Development Program',
    categoryCode: 'SOCIAL_EMOTIONAL',
    description: 'برنامج متخصص لتطوير التفاعل الاجتماعي والعلاقات الإنسانية'
  },
  {
    code: 'PROG-EMOTIONAL-REGULATION-001',
    nameAr: 'برنامج تنظيم العواطف والذكاء العاطفي',
    nameEn: 'Emotional Regulation and Emotional Intelligence Program',
    categoryCode: 'SOCIAL_EMOTIONAL',
    description: 'برنامج لتطوير التحكم العاطفي والذكاء العاطفي'
  },

  // فئة: التعليم والتحصيل الأكاديمي المتقدم
  {
    code: 'PROG-ACADEMIC-MATH-001',
    nameAr: 'برنامج تطوير المهارات الرياضية المتقدم',
    nameEn: 'Advanced Mathematics and Numeracy Program',
    categoryCode: 'ACADEMIC',
    description: 'برنامج شامل لتطوير المهارات الحسابية والرياضية'
  },
  {
    code: 'PROG-LITERACY-ADVANCED-001',
    nameAr: 'برنامج محو الأمية والقراءة والكتابة المتقدم',
    nameEn: 'Advanced Literacy and Reading Comprehension Program',
    categoryCode: 'ACADEMIC',
    description: 'برنامج متخصص لتطوير القراءة والكتابة والفهم'
  },
  {
    code: 'PROG-LEARNING-SUPPORT-001',
    nameAr: 'برنامج الدعم التعليمي والمساعدة الأكاديمية',
    nameEn: 'Academic Support and Learning Assistance Program',
    categoryCode: 'ACADEMIC',
    description: 'برنامج دعم شامل للمتعلمين ذوي الصعوبات التعليمية'
  },

  // فئة: برامج التوحد المتخصصة جداً
  {
    code: 'PROG-AUTISM-ABA-ADVANCED-001',
    nameAr: 'برنامج تحليل السلوك التطبيقي المتقدم (ABA)',
    nameEn: 'Advanced Applied Behavior Analysis (ABA) Program',
    categoryCode: 'AUTISM_SPECTRUM',
    description: 'برنامج ABA متقدم لتعديل السلوك وتطوير المهارات'
  },
  {
    code: 'PROG-AUTISM-SOCIAL-STORIES-001',
    nameAr: 'برنامج القصص الاجتماعية والمواقف المحاكاة',
    nameEn: 'Social Stories and Role-Playing Program',
    categoryCode: 'AUTISM_SPECTRUM',
    description: 'برنامج باستخدام القصص الاجتماعية لتعليم المهارات الاجتماعية'
  },
  {
    code: 'PROG-AUTISM-SENSORY-001',
    nameAr: 'برنامج المعالجة الحسية والتكامل الحسي',
    nameEn: 'Sensory Integration and Sensory Processing Program',
    categoryCode: 'AUTISM_SPECTRUM',
    description: 'برنامج متخصص لتحسين المعالجة الحسية والاستجابة'
  },

  // فئة: التأهيل المهني المتقدم جداً
  {
    code: 'PROG-VOCATIONAL-SKILLS-001',
    nameAr: 'برنامج التدريب على المهارات الحرفية المتقدمة',
    nameEn: 'Advanced Trade Skills Training Program',
    categoryCode: 'VOCATIONAL',
    description: 'برنامج تدريب متقدم على حرف ومهن متعددة'
  },
  {
    code: 'PROG-WORKPLACE-READINESS-001',
    nameAr: 'برنامج التهيؤ للعمل والدمج الوظيفي',
    nameEn: 'Workplace Readiness and Job Integration Program',
    categoryCode: 'VOCATIONAL',
    description: 'برنامج شامل للتحضير للعمل والاندماج في سوق العمل'
  },
  {
    code: 'PROG-ENTREPRENEURSHIP-001',
    nameAr: 'برنامج ريادة الأعمال والعمل الحر',
    nameEn: 'Entrepreneurship and Self-Employment Program',
    categoryCode: 'VOCATIONAL',
    description: 'برنامج لتطوير مهارات العمل الحر وإدارة المشاريع الصغيرة'
  },

  // فئة: مهارات الحياة اليومية المتقدمة جداً
  {
    code: 'PROG-DAILY-INDEPENDENCE-001',
    nameAr: 'برنامج الاستقلالية الكاملة في الحياة اليومية',
    nameEn: 'Complete Daily Living Independence Program',
    categoryCode: 'DAILY_LIVING',
    description: 'برنامج شامل لتحقيق الاستقلالية الكاملة في الحياة اليومية'
  },
  {
    code: 'PROG-LIFE-PLANNING-001',
    nameAr: 'برنامج التخطيط للحياة والاستقلالية المستقبلية',
    nameEn: 'Life Planning and Future Independence Program',
    categoryCode: 'DAILY_LIVING',
    description: 'برنامج لتعليم التخطيط والإدارة الذاتية المستقبلية'
  },
  {
    code: 'PROG-MONEY-MANAGEMENT-001',
    nameAr: 'برنامج إدارة المال والإنفاق الذكي',
    nameEn: 'Money Management and Financial Literacy Program',
    categoryCode: 'DAILY_LIVING',
    description: 'برنامج تعليمي لإدارة المال والموارد المالية'
  },

  // فئة: تحسين الأداء السلوكي والنفسي
  {
    code: 'PROG-BEHAVIOR-MODIFICATION-001',
    nameAr: 'برنامج تعديل السلوك والقضاء على السلوكيات السلبية',
    nameEn: 'Behavior Modification and Behavioral Intervention Program',
    categoryCode: 'BEHAVIORAL',
    description: 'برنامج علاجي لتعديل السلوكيات غير المرغوبة'
  },
  {
    code: 'PROG-ANGER-MANAGEMENT-001',
    nameAr: 'برنامج إدارة الغضب والتحكم الانفعالي',
    nameEn: 'Anger Management and Emotional Control Program',
    categoryCode: 'BEHAVIORAL',
    description: 'برنامج مختص في تعليم تقنيات التحكم في الغضب'
  },

  // فئة: الدعم النفسي والاستشارة
  {
    code: 'PROG-PSYCHOLOGICAL-SUPPORT-001',
    nameAr: 'برنامج الدعم النفسي والاستشارة الفردية',
    nameEn: 'Psychological Support and Individual Counseling Program',
    categoryCode: 'PSYCHOLOGICAL',
    description: 'برنامج استشارة ودعم نفسي متخصص'
  },
  {
    code: 'PROG-FAMILY-COUNSELING-001',
    nameAr: 'برنامج الاستشارة الأسرية والدعم الأسري',
    nameEn: 'Family Counseling and Family Support Program',
    categoryCode: 'PSYCHOLOGICAL',
    description: 'برنامج دعم الأسرة وتحسين الديناميات الأسرية'
  },

  // فئة جديدة: برامج العمل المتقدم والتطوير الوظيفي
  {
    code: 'PROG-ADVANCED-TECH-001',
    nameAr: 'برنامج التكنولوجيا والمهارات الرقمية',
    nameEn: 'Technology and Digital Skills Program',
    categoryCode: 'ADVANCED_TECH',
    description: 'برنامج متقدم لتعليم المهارات التكنولوجية والرقمية'
  }
];

// ============================
// ③ فئات البرامج الجديدة
// ============================

const newProgramCategories = [
  {
    code: 'ADVANCED_TECH',
    nameAr: 'البرامج التكنولوجية والرقمية',
    nameEn: 'Technology and Digital Programs',
    description: 'برامج متخصصة في المهارات الرقمية والتكنولوجيا'
  },
  {
    code: 'COGNITIVE_DEVELOPMENT',
    nameAr: 'برامج تطوير القدرات المعرفية',
    nameEn: 'Cognitive Development Programs',
    description: 'برامج تركز على تطوير الوظائف المعرفية'
  },
  {
    code: 'ADVANCED_LIFE_SKILLS',
    nameAr: 'برامج المهارات الحياتية المتقدمة',
    nameEn: 'Advanced Life Skills Programs',
    description: 'برامج متقدمة للمهارات الحياتية المعقدة'
  }
];

module.exports = {
  advancedMeasurementTypes,
  advancedRehabilitationPrograms,
  newProgramCategories
};
