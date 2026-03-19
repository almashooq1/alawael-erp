/**
 * Assessment Tests — أدوات الاختبار (10 اختبارات)
 * Matches backend progress-assessment-service.getAssessmentTools
 */
import { statusColors, assessmentColors, scaleAccentColors } from 'theme/palette';

const ASSESSMENT_TESTS = [
  {
    id: 'social_development',
    name: 'مقياس التطور الاجتماعي',
    nameEn: 'Social Development Scale',
    description: 'تقييم مهارات التفاعل الاجتماعي والتواصل للأعمار 3-18 سنة',
    ageRange: '3-18',
    version: '2.0',
    icon: 'Groups',
    color: '#1565c0',
    categories: [
      {
        key: 'socialInteraction',
        name: 'التفاعل الاجتماعي',
        items: [
          {
            key: 'eye_contact',
            name: 'التواصل البصري',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          { key: 'sharing', name: 'المشاركة', levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'] },
          {
            key: 'turn_taking',
            name: 'تبادل الأدوار',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'cooperation',
            name: 'التعاون',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          { key: 'empathy', name: 'التعاطف', levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'] },
        ],
      },
      {
        key: 'communication',
        name: 'التواصل',
        items: [
          {
            key: 'verbal_requests',
            name: 'الطلبات اللفظية',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'comprehension',
            name: 'الفهم',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'expression',
            name: 'التعبير',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'conversation',
            name: 'المحادثة',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'playSkills',
        name: 'مهارات اللعب',
        items: [
          {
            key: 'solitary_play',
            name: 'اللعب الفردي',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'parallel_play',
            name: 'اللعب الموازي',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'group_play',
            name: 'اللعب الجماعي',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'imaginative_play',
            name: 'اللعب التخيلي',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
    ],
  },
  {
    id: 'daily_living_skills',
    name: 'اختبار مهارات الحياة اليومية',
    nameEn: 'Daily Living Skills Test',
    description: 'تقييم مستوى الاستقلالية في المهارات اليومية العملية',
    ageRange: 'الكل',
    version: '1.5',
    icon: 'AccessibilityNew',
    color: assessmentColors.normal,
    categories: [
      {
        key: 'selfCare',
        name: 'العناية الذاتية',
        items: [
          {
            key: 'dressing',
            name: 'ارتداء الملابس',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'eating',
            name: 'تناول الطعام',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'toileting',
            name: 'استخدام دورة المياه',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'grooming',
            name: 'النظافة الشخصية',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'bathing',
            name: 'الاستحمام',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
        ],
      },
      {
        key: 'mobility',
        name: 'التنقل',
        items: [
          {
            key: 'walking',
            name: 'المشي',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'stairs',
            name: 'صعود الدرج',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'transfers',
            name: 'الانتقال',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'wheelchair_use',
            name: 'استخدام الكرسي المتحرك',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
        ],
      },
      {
        key: 'homeLiving',
        name: 'المعيشة المنزلية',
        items: [
          {
            key: 'meal_prep',
            name: 'إعداد الطعام',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'cleaning',
            name: 'التنظيف',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'laundry',
            name: 'غسيل الملابس',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
          {
            key: 'money_management',
            name: 'إدارة المال',
            levels: ['مساعدة كاملة', 'مساعدة جزئية', 'إشراف', 'مستقل'],
          },
        ],
      },
    ],
  },
  {
    id: 'adaptive_behavior',
    name: 'اختبار السلوك التكيفي',
    nameEn: 'Adaptive Behavior Test',
    description: 'تقييم السلوك التكيفي في المجالات المفاهيمية والاجتماعية والعملية',
    ageRange: 'الكل',
    version: '3.0',
    icon: 'Psychology',
    color: statusColors.purple,
    categories: [
      {
        key: 'conceptual',
        name: 'المجال المفاهيمي',
        items: [
          {
            key: 'communication',
            name: 'التواصل',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'functional_academics',
            name: 'الأكاديمي الوظيفي',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'self_direction',
            name: 'التوجيه الذاتي',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'social',
        name: 'المجال الاجتماعي',
        items: [
          {
            key: 'leisure',
            name: 'وقت الفراغ',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'social_skills',
            name: 'المهارات الاجتماعية',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'social_responsibility',
            name: 'المسؤولية الاجتماعية',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'practical',
        name: 'المجال العملي',
        items: [
          {
            key: 'self_care',
            name: 'العناية الذاتية',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'home_living',
            name: 'المعيشة المنزلية',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'community_use',
            name: 'استخدام المجتمع',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'health_safety',
            name: 'الصحة والسلامة',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
          { key: 'work', name: 'العمل', levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'] },
        ],
      },
    ],
  },

  /* ────────────────── 4. Language Skills Test ────────────────── */
  {
    id: 'language_skills',
    name: 'اختبار المهارات اللغوية',
    nameEn: 'Language Skills Test',
    description: 'تقييم شامل للمهارات اللغوية الاستقبالية والتعبيرية والبراغماتية للأعمار 2-16 سنة',
    ageRange: '2-16',
    version: '1.0',
    icon: 'Translate',
    color: scaleAccentColors.language,
    categories: [
      {
        key: 'receptiveLanguage',
        name: 'اللغة الاستقبالية',
        items: [
          {
            key: 'word_comprehension',
            name: 'فهم المفردات',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'sentence_comprehension',
            name: 'فهم الجمل',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'instruction_following',
            name: 'اتباع التعليمات',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'story_comprehension',
            name: 'فهم القصص',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'expressiveLanguage',
        name: 'اللغة التعبيرية',
        items: [
          { key: 'naming', name: 'التسمية', levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'] },
          {
            key: 'sentence_formation',
            name: 'تكوين الجمل',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'narration',
            name: 'السرد والحكي',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'vocabulary_use',
            name: 'استخدام المفردات',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'pragmaticLanguage',
        name: 'اللغة البراغماتية (التداولية)',
        items: [
          {
            key: 'greetings',
            name: 'التحية والوداع',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'topic_maintenance',
            name: 'الحفاظ على الموضوع',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'turn_taking_verbal',
            name: 'تبادل الأدوار الكلامية',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'context_adaptation',
            name: 'التكيف مع السياق',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'phonologicalAwareness',
        name: 'الوعي الصوتي',
        items: [
          { key: 'rhyming', name: 'التقفية', levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'] },
          {
            key: 'syllable_segmenting',
            name: 'تجزئة المقاطع',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'sound_blending',
            name: 'دمج الأصوات',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'sound_discrimination',
            name: 'تمييز الأصوات',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
    ],
  },

  /* ────────────────── 5. Sensory Integration Test ────────────────── */
  {
    id: 'sensory_integration',
    name: 'اختبار التكامل الحسي',
    nameEn: 'Sensory Integration Test',
    description: 'تقييم قدرة الجهاز العصبي على تنظيم ودمج المعلومات الحسية من مصادر متعددة',
    ageRange: '3-14',
    version: '1.0',
    icon: 'TouchApp',
    color: scaleAccentColors.sensoryIntegration,
    categories: [
      {
        key: 'tactileProcessing',
        name: 'المعالجة اللمسية',
        items: [
          {
            key: 'light_touch',
            name: 'اللمس الخفيف',
            levels: ['دفاعي', 'حساس', 'طبيعي', 'باحث عن المثير'],
          },
          {
            key: 'texture_tolerance',
            name: 'تحمل الملمس',
            levels: ['دفاعي', 'حساس', 'طبيعي', 'باحث عن المثير'],
          },
          {
            key: 'temperature_response',
            name: 'الاستجابة للحرارة',
            levels: ['دفاعي', 'حساس', 'طبيعي', 'باحث عن المثير'],
          },
          {
            key: 'pain_response',
            name: 'الاستجابة للألم',
            levels: ['مفرطة', 'عالية', 'طبيعية', 'منخفضة'],
          },
        ],
      },
      {
        key: 'vestibularProcessing',
        name: 'المعالجة الدهليزية',
        items: [
          {
            key: 'motion_tolerance',
            name: 'تحمل الحركة',
            levels: ['شديد الحساسية', 'حساس', 'طبيعي', 'باحث عن الحركة'],
          },
          {
            key: 'balance_static',
            name: 'التوازن الثابت',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
          {
            key: 'balance_dynamic',
            name: 'التوازن الديناميكي',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
          {
            key: 'gravitational_security',
            name: 'الأمان الجاذبي',
            levels: ['قلق شديد', 'قلق', 'مريح', 'واثق'],
          },
        ],
      },
      {
        key: 'proprioceptiveProcessing',
        name: 'معالجة الحس العميق',
        items: [
          {
            key: 'body_awareness',
            name: 'الوعي بالجسم',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
          {
            key: 'force_grading',
            name: 'تدرج القوة',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
          {
            key: 'motor_planning',
            name: 'التخطيط الحركي',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
          {
            key: 'postural_control',
            name: 'التحكم الوضعي',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
        ],
      },
      {
        key: 'sensoryModulation',
        name: 'التنظيم الحسي',
        items: [
          {
            key: 'arousal_regulation',
            name: 'تنظيم الإثارة',
            levels: ['مفرط', 'عالٍ', 'منظم', 'منخفض'],
          },
          {
            key: 'attention_focus',
            name: 'الانتباه والتركيز',
            levels: ['شارد', 'متقطع', 'منتظم', 'مركّز'],
          },
          {
            key: 'emotional_regulation',
            name: 'التنظيم الانفعالي',
            levels: ['غير منظم', 'متقلب', 'مستقر غالباً', 'منظم'],
          },
          {
            key: 'transition_handling',
            name: 'التعامل مع الانتقالات',
            levels: ['صعوبة شديدة', 'صعوبة', 'مقبول', 'سلس'],
          },
        ],
      },
    ],
  },

  /* ────────────────── 6. Fine Motor Skills Test ────────────────── */
  {
    id: 'fine_motor_skills',
    name: 'اختبار المهارات الحركية الدقيقة',
    nameEn: 'Fine Motor Skills Test',
    description:
      'تقييم تفصيلي للمهارات الحركية الدقيقة بما يشمل القبض والإفلات والتنسيق اليدوي البصري والكتابة',
    ageRange: '3-18',
    version: '1.0',
    icon: 'PanTool',
    color: scaleAccentColors.fineMotor,
    categories: [
      {
        key: 'graspPatterns',
        name: 'أنماط القبض',
        items: [
          {
            key: 'palmar_grasp',
            name: 'القبض الراحي',
            levels: ['غائب', 'ناشئ', 'وظيفي', 'ناضج'],
          },
          {
            key: 'pincer_grasp',
            name: 'القبض الدقيق (الكمّاشة)',
            levels: ['غائب', 'ناشئ', 'وظيفي', 'ناضج'],
          },
          {
            key: 'tripod_grasp',
            name: 'القبض الثلاثي',
            levels: ['غائب', 'ناشئ', 'وظيفي', 'ناضج'],
          },
          {
            key: 'release_control',
            name: 'التحكم بالإفلات',
            levels: ['غائب', 'ناشئ', 'وظيفي', 'ناضج'],
          },
        ],
      },
      {
        key: 'handEyeCoordination',
        name: 'التنسيق اليدوي البصري',
        items: [
          {
            key: 'reaching',
            name: 'المدّ والوصول',
            levels: ['غائب', 'غير دقيق', 'متوسط الدقة', 'دقيق'],
          },
          {
            key: 'stacking',
            name: 'التكديس',
            levels: ['عاجز', 'مكعبان', '4-6 مكعبات', 'أكثر من 8'],
          },
          {
            key: 'threading',
            name: 'اللضم والتخريز',
            levels: ['عاجز', 'خرز كبير', 'خرز صغير', 'إبرة وخيط'],
          },
          {
            key: 'cutting',
            name: 'القص بالمقص',
            levels: ['غائب', 'فتح/إغلاق فقط', 'قص خط مستقيم', 'قص أشكال'],
          },
        ],
      },
      {
        key: 'writingSkills',
        name: 'مهارات الكتابة',
        items: [
          {
            key: 'pencil_grip',
            name: 'مسكة القلم',
            levels: ['قبض راحي', 'قبض رقمي', 'ثلاثي قريب', 'ثلاثي ناضج'],
          },
          {
            key: 'drawing_shapes',
            name: 'رسم الأشكال',
            levels: ['شخبطة', 'خطوط', 'أشكال بسيطة', 'أشكال معقدة'],
          },
          {
            key: 'letter_formation',
            name: 'تشكيل الحروف',
            levels: ['غائب', 'تقليد', 'نسخ', 'كتابة مستقلة'],
          },
          {
            key: 'writing_speed',
            name: 'سرعة الكتابة',
            levels: ['بطيء جداً', 'بطيء', 'متوسط', 'مناسب للعمر'],
          },
        ],
      },
      {
        key: 'bilateralCoordination',
        name: 'التنسيق الثنائي',
        items: [
          {
            key: 'midline_crossing',
            name: 'عبور خط الوسط',
            levels: ['غائب', 'ناشئ', 'متقطع', 'ثابت'],
          },
          {
            key: 'bilateral_tasks',
            name: 'المهام الثنائية',
            levels: ['عاجز', 'بمساعدة', 'بإشراف', 'مستقل'],
          },
          {
            key: 'hand_dominance',
            name: 'سيطرة اليد',
            levels: ['غير محددة', 'ناشئة', 'قيد التثبيت', 'ثابتة'],
          },
        ],
      },
    ],
  },

  /* ────────────────── 7. Vocational Aptitude Test ────────────────── */
  {
    id: 'vocational_aptitude',
    name: 'اختبار الميول والقدرات المهنية',
    nameEn: 'Vocational Aptitude Test',
    description:
      'تقييم الميول المهنية والقدرات العملية والاستعداد للتدريب والتوظيف للأعمار 14 سنة فما فوق',
    ageRange: '14+',
    version: '1.0',
    icon: 'Engineering',
    color: scaleAccentColors.vocationalAptitude,
    categories: [
      {
        key: 'workInterests',
        name: 'الميول المهنية',
        items: [
          {
            key: 'manual_work',
            name: 'الأعمال اليدوية',
            levels: ['غير مهتم', 'مهتم قليلاً', 'مهتم', 'شغوف'],
          },
          {
            key: 'clerical_work',
            name: 'الأعمال المكتبية',
            levels: ['غير مهتم', 'مهتم قليلاً', 'مهتم', 'شغوف'],
          },
          {
            key: 'service_work',
            name: 'الأعمال الخدمية',
            levels: ['غير مهتم', 'مهتم قليلاً', 'مهتم', 'شغوف'],
          },
          {
            key: 'technical_work',
            name: 'الأعمال التقنية',
            levels: ['غير مهتم', 'مهتم قليلاً', 'مهتم', 'شغوف'],
          },
          {
            key: 'creative_work',
            name: 'الأعمال الإبداعية',
            levels: ['غير مهتم', 'مهتم قليلاً', 'مهتم', 'شغوف'],
          },
        ],
      },
      {
        key: 'workCapacities',
        name: 'القدرات العملية',
        items: [
          {
            key: 'following_instructions',
            name: 'اتباع التعليمات',
            levels: ['عاجز', 'بسيطة', 'متعددة الخطوات', 'معقدة'],
          },
          {
            key: 'task_completion',
            name: 'إكمال المهام',
            levels: ['لا يكمل', 'بتذكير متكرر', 'بإشراف', 'مستقل'],
          },
          {
            key: 'time_management',
            name: 'إدارة الوقت',
            levels: ['غائب', 'ضعيف', 'متوسط', 'جيد'],
          },
          {
            key: 'quality_awareness',
            name: 'الوعي بالجودة',
            levels: ['غائب', 'محدود', 'متوسط', 'جيد'],
          },
        ],
      },
      {
        key: 'workBehaviors',
        name: 'السلوك المهني',
        items: [
          {
            key: 'punctuality',
            name: 'الالتزام بالمواعيد',
            levels: ['غير منتظم', 'أحياناً', 'غالباً', 'دائماً'],
          },
          {
            key: 'attendance',
            name: 'الحضور والانتظام',
            levels: ['ضعيف', 'متقطع', 'منتظم غالباً', 'منتظم دائماً'],
          },
          {
            key: 'peer_interaction',
            name: 'التعامل مع الزملاء',
            levels: ['صراع', 'صعوبة', 'مقبول', 'تعاوني'],
          },
          {
            key: 'supervisor_interaction',
            name: 'التعامل مع المشرف',
            levels: ['رفض', 'مقاومة', 'قبول', 'تجاوب'],
          },
        ],
      },
      {
        key: 'physicalCapacities',
        name: 'القدرات البدنية المهنية',
        items: [
          {
            key: 'standing_tolerance',
            name: 'تحمل الوقوف',
            levels: ['أقل من 15 دقيقة', '15-30 دقيقة', '30-60 دقيقة', 'أكثر من ساعة'],
          },
          {
            key: 'sitting_tolerance',
            name: 'تحمل الجلوس',
            levels: ['أقل من 15 دقيقة', '15-30 دقيقة', '30-60 دقيقة', 'أكثر من ساعة'],
          },
          {
            key: 'lifting_capacity',
            name: 'القدرة على الرفع',
            levels: ['لا شيء', 'خفيف (<5 كغ)', 'متوسط (<15 كغ)', 'ثقيل (>15 كغ)'],
          },
          {
            key: 'endurance',
            name: 'التحمل العام',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
        ],
      },
    ],
  },

  /* ────────────────── 8. Educational Performance Test ────────────────── */
  {
    id: 'educational_performance',
    name: 'اختبار الأداء التعليمي',
    nameEn: 'Educational Performance Test',
    description: 'تقييم شامل للقدرات الأكاديمية ومهارات التعلم والسلوك الصفّي للطلاب ذوي الإعاقة',
    ageRange: '5-18',
    version: '1.0',
    icon: 'School',
    color: scaleAccentColors.educationalPerformance,
    categories: [
      {
        key: 'readingSkills',
        name: 'مهارات القراءة',
        items: [
          {
            key: 'letter_recognition',
            name: 'التعرف على الحروف',
            levels: ['غائب', 'بعض الحروف', 'معظم الحروف', 'جميع الحروف'],
          },
          {
            key: 'word_reading',
            name: 'قراءة الكلمات',
            levels: ['غائب', 'كلمات بصرية', 'تهجئة', 'طلاقة'],
          },
          {
            key: 'text_comprehension',
            name: 'فهم المقروء',
            levels: ['غائب', 'حرفي', 'استنتاجي', 'نقدي'],
          },
        ],
      },
      {
        key: 'mathSkills',
        name: 'المهارات الحسابية',
        items: [
          {
            key: 'number_concepts',
            name: 'مفاهيم الأعداد',
            levels: ['غائب', 'عدّ فقط', 'قيمة مكانية', 'عمليات متقدمة'],
          },
          {
            key: 'basic_operations',
            name: 'العمليات الأساسية',
            levels: ['غائب', 'جمع/طرح', '+ضرب/قسمة', 'كسور/نسب'],
          },
          {
            key: 'problem_solving_math',
            name: 'حل المسائل',
            levels: ['غائب', 'بسيطة', 'متعددة الخطوات', 'تطبيقية'],
          },
        ],
      },
      {
        key: 'writingSkillsAcademic',
        name: 'مهارات الكتابة الأكاديمية',
        items: [
          {
            key: 'spelling',
            name: 'الإملاء',
            levels: ['غائب', 'كلمات بسيطة', 'كلمات شائعة', 'إملاء سليم'],
          },
          {
            key: 'sentence_writing',
            name: 'كتابة الجمل',
            levels: ['غائب', 'كلمات مفردة', 'جمل بسيطة', 'فقرات'],
          },
          {
            key: 'writing_organization',
            name: 'تنظيم الكتابة',
            levels: ['غائب', 'عشوائي', 'منظم جزئياً', 'منظم'],
          },
        ],
      },
      {
        key: 'learningBehaviors',
        name: 'سلوكيات التعلم',
        items: [
          {
            key: 'attention_in_class',
            name: 'الانتباه في الصف',
            levels: ['شارد دائماً', 'متقطع', 'غالباً منتبه', 'منتبه'],
          },
          {
            key: 'task_persistence',
            name: 'المثابرة على المهام',
            levels: ['يتوقف فوراً', 'محاولة قصيرة', 'يكمل بدعم', 'يكمل مستقلاً'],
          },
          {
            key: 'homework_completion',
            name: 'إكمال الواجبات',
            levels: ['لا يكمل', 'أحياناً', 'غالباً', 'دائماً'],
          },
          {
            key: 'classroom_participation',
            name: 'المشاركة الصفية',
            levels: ['لا يشارك', 'بتشجيع', 'أحياناً', 'يبادر'],
          },
        ],
      },
    ],
  },

  /* ────────────────── 9. Visual Perceptual Skills Test ────────────────── */
  {
    id: 'visual_perceptual',
    name: 'اختبار الإدراك البصري',
    nameEn: 'Visual Perceptual Skills Test',
    description: 'تقييم قدرات المعالجة البصرية والإدراك المكاني والتمييز البصري والذاكرة البصرية',
    ageRange: '4-14',
    version: '1.0',
    icon: 'Visibility',
    color: scaleAccentColors.visualPerceptual,
    categories: [
      {
        key: 'visualDiscrimination',
        name: 'التمييز البصري',
        items: [
          {
            key: 'matching',
            name: 'المطابقة',
            levels: ['غائب', 'أشكال بسيطة', 'أشكال معقدة', 'تفاصيل دقيقة'],
          },
          {
            key: 'form_constancy',
            name: 'ثبات الشكل',
            levels: ['غائب', 'أحجام مختلفة', 'زوايا مختلفة', 'في سياقات متعددة'],
          },
          {
            key: 'figure_ground',
            name: 'الشكل والخلفية',
            levels: ['غائب', 'خلفية بسيطة', 'خلفية متوسطة', 'خلفية مزدحمة'],
          },
        ],
      },
      {
        key: 'spatialRelations',
        name: 'العلاقات المكانية',
        items: [
          {
            key: 'position_in_space',
            name: 'الموقع في الفراغ',
            levels: ['غائب', 'يمين/يسار', '+ فوق/تحت', 'اتجاهات معقدة'],
          },
          {
            key: 'spatial_orientation',
            name: 'التوجه المكاني',
            levels: ['غائب', 'على الطاولة', 'في الغرفة', 'في المبنى'],
          },
          {
            key: 'depth_perception',
            name: 'إدراك العمق',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد'],
          },
        ],
      },
      {
        key: 'visualMemory',
        name: 'الذاكرة البصرية',
        items: [
          {
            key: 'short_term_visual',
            name: 'الذاكرة البصرية قصيرة المدى',
            levels: ['عنصر واحد', 'عنصران', '3-4 عناصر', '5+ عناصر'],
          },
          {
            key: 'sequential_memory',
            name: 'الذاكرة التسلسلية',
            levels: ['خطوتان', '3 خطوات', '4 خطوات', '5+ خطوات'],
          },
          {
            key: 'pattern_recognition',
            name: 'التعرف على الأنماط',
            levels: ['غائب', 'أنماط بسيطة', 'أنماط متوسطة', 'أنماط معقدة'],
          },
        ],
      },
      {
        key: 'visualMotorIntegration',
        name: 'التكامل البصري الحركي',
        items: [
          {
            key: 'copying_shapes',
            name: 'نسخ الأشكال',
            levels: ['خط عمودي', 'دائرة', 'مربع/مثلث', 'أشكال معقدة'],
          },
          {
            key: 'maze_tracing',
            name: 'تتبع المتاهات',
            levels: ['غائب', 'بسيطة', 'متوسطة', 'معقدة'],
          },
          {
            key: 'coloring_boundaries',
            name: 'التلوين ضمن الحدود',
            levels: ['خارج الحدود', 'جزئياً', 'غالباً ضمن', 'ضمن الحدود'],
          },
        ],
      },
    ],
  },

  /* ────────────────── 10. Behavioral Functional Analysis Test ────────────────── */
  {
    id: 'behavioral_functional',
    name: 'اختبار التحليل الوظيفي للسلوك',
    nameEn: 'Behavioral Functional Analysis Test',
    description:
      'تحليل وظيفي شامل للسلوكيات التحدّية يحدد المحفزات والوظائف والبدائل المناسبة لخطة التعديل السلوكي',
    ageRange: 'الكل',
    version: '1.0',
    icon: 'BubbleChart',
    color: scaleAccentColors.behavioralFunctional,
    categories: [
      {
        key: 'behaviorTopography',
        name: 'وصف السلوك',
        items: [
          {
            key: 'frequency',
            name: 'التكرار',
            levels: ['نادر (شهرياً)', 'أحياناً (أسبوعياً)', 'متكرر (يومياً)', 'مستمر'],
          },
          {
            key: 'intensity',
            name: 'الشدة',
            levels: ['خفيفة', 'متوسطة', 'شديدة', 'خطيرة'],
          },
          {
            key: 'duration',
            name: 'المدة',
            levels: ['< دقيقة', '1-5 دقائق', '5-15 دقيقة', '> 15 دقيقة'],
          },
          {
            key: 'latency',
            name: 'زمن الاستجابة',
            levels: ['فوري', '< 5 ثوانٍ', '5-30 ثانية', '> 30 ثانية'],
          },
        ],
      },
      {
        key: 'antecedents',
        name: 'المحفزات السابقة',
        items: [
          {
            key: 'environmental_triggers',
            name: 'المحفزات البيئية',
            levels: ['لا توجد', 'ضوضاء/ازدحام', 'تغيير روتين', 'حرمان حسي'],
          },
          {
            key: 'social_triggers',
            name: 'المحفزات الاجتماعية',
            levels: ['لا توجد', 'طلب مهمة', 'منع نشاط', 'تجاهل'],
          },
          {
            key: 'biological_triggers',
            name: 'المحفزات البيولوجية',
            levels: ['لا توجد', 'تعب/جوع', 'ألم', 'أدوية'],
          },
        ],
      },
      {
        key: 'behaviorFunction',
        name: 'وظيفة السلوك',
        items: [
          {
            key: 'attention_seeking',
            name: 'الحصول على الانتباه',
            levels: ['غير مرتبط', 'محتمل', 'مرتبط غالباً', 'الوظيفة الأساسية'],
          },
          {
            key: 'escape_avoidance',
            name: 'الهروب/التجنب',
            levels: ['غير مرتبط', 'محتمل', 'مرتبط غالباً', 'الوظيفة الأساسية'],
          },
          {
            key: 'tangible_access',
            name: 'الحصول على شيء ملموس',
            levels: ['غير مرتبط', 'محتمل', 'مرتبط غالباً', 'الوظيفة الأساسية'],
          },
          {
            key: 'sensory_stimulation',
            name: 'التحفيز الذاتي/الحسي',
            levels: ['غير مرتبط', 'محتمل', 'مرتبط غالباً', 'الوظيفة الأساسية'],
          },
        ],
      },
      {
        key: 'interventionResponse',
        name: 'الاستجابة للتدخل',
        items: [
          {
            key: 'verbal_redirection',
            name: 'التوجيه اللفظي',
            levels: ['لا يستجيب', 'أحياناً', 'غالباً', 'دائماً'],
          },
          {
            key: 'visual_supports',
            name: 'الدعم البصري',
            levels: ['لا يستجيب', 'أحياناً', 'غالباً', 'دائماً'],
          },
          {
            key: 'alternative_behavior',
            name: 'السلوك البديل',
            levels: ['لا يقبل', 'بتوجيه بدني', 'بنمذجة', 'مستقل'],
          },
          {
            key: 'calming_strategies',
            name: 'استراتيجيات التهدئة',
            levels: ['غير فعّالة', 'فعّالة أحياناً', 'فعّالة غالباً', 'فعّالة دائماً'],
          },
        ],
      },
    ],
  },
];

export default ASSESSMENT_TESTS;
