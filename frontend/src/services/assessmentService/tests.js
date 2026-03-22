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

  // ════════════════════════════════════════════════════════════
  // ── NEW: 6 Enhanced Assessment Tests (اختبارات تقييم محسّنة)
  // ════════════════════════════════════════════════════════════

  {
    id: 'executiveFunctionTest',
    name: 'اختبار الوظائف التنفيذية',
    nameEn: 'Executive Function Test',
    description: 'تقييم تفصيلي لمهارات التخطيط والتنظيم والذاكرة العاملة والتحكم المعرفي',
    type: 'itemLevel',
    maxScore: 75,
    icon: 'AccountTree',
    color: '#5c6bc0',
    sections: [
      {
        key: 'planning',
        name: 'التخطيط والتتابع',
        items: [
          {
            key: 'task_sequencing',
            name: 'ترتيب الخطوات',
            levels: ['لا يستطيع', 'بمساعدة كاملة', 'بمساعدة جزئية', 'مستقل تماماً'],
          },
          {
            key: 'goal_setting',
            name: 'تحديد الأهداف',
            levels: ['لا يفهم', 'يحتاج توجيه', 'يحدد بمساعدة', 'يحدد مستقلاً'],
          },
          {
            key: 'time_management',
            name: 'إدارة الوقت',
            levels: ['لا مفهوم للوقت', 'يحتاج تنبيه مستمر', 'يحتاج تنبيه أحياناً', 'يدير وقته'],
          },
        ],
      },
      {
        key: 'workingMemory',
        name: 'الذاكرة العاملة',
        items: [
          {
            key: 'verbal_wm',
            name: 'الذاكرة العاملة اللفظية',
            levels: ['يتذكر عنصر واحد', 'عنصران', '3 عناصر', '4+ عناصر'],
          },
          {
            key: 'visual_wm',
            name: 'الذاكرة العاملة البصرية',
            levels: ['يتذكر عنصر واحد', 'عنصران', '3 عناصر', '4+ عناصر'],
          },
          {
            key: 'dual_task',
            name: 'المهام المزدوجة',
            levels: ['لا يستطيع', 'بصعوبة كبيرة', 'بصعوبة محدودة', 'بسهولة'],
          },
        ],
      },
      {
        key: 'inhibition',
        name: 'الكبح والتحكم',
        items: [
          {
            key: 'impulse_control',
            name: 'التحكم في الاندفاع',
            levels: ['لا يتحكم', 'نادراً', 'أحياناً', 'غالباً'],
          },
          {
            key: 'emotional_inhibition',
            name: 'كبح الانفعالات',
            levels: ['لا يستطيع', 'بمساعدة', 'أحياناً مستقل', 'مستقل'],
          },
          {
            key: 'stop_signal',
            name: 'الاستجابة لأمر التوقف',
            levels: ['لا يستجيب', 'بعد تكرار', 'بعد أمر واحد', 'فوري'],
          },
        ],
      },
      {
        key: 'flexibility',
        name: 'المرونة المعرفية',
        items: [
          {
            key: 'task_switching',
            name: 'التنقل بين المهام',
            levels: ['يرفض التغيير', 'بمقاومة', 'بتأخر بسيط', 'بسلاسة'],
          },
          {
            key: 'problem_solving',
            name: 'حل المشكلات',
            levels: ['لا يحاول', 'طريقة واحدة فقط', 'يجرب بدائل بتوجيه', 'يبتكر حلول'],
          },
          {
            key: 'routine_change',
            name: 'تقبل تغيير الروتين',
            levels: ['انهيار تام', 'قلق شديد', 'قلق خفيف', 'يتقبل'],
          },
        ],
      },
      {
        key: 'metacognition',
        name: 'ما وراء المعرفة',
        items: [
          {
            key: 'self_monitoring',
            name: 'مراقبة الذات',
            levels: ['لا يراقب', 'بتوجيه مستمر', 'بتذكير', 'مستقل'],
          },
          {
            key: 'error_detection',
            name: 'اكتشاف الأخطاء',
            levels: ['لا يكتشف', 'بعد إشارة', 'يكتشف أحياناً', 'يكتشف ويصحح'],
          },
          {
            key: 'strategy_use',
            name: 'استخدام الاستراتيجيات',
            levels: ['لا يستخدم', 'بتعليم مباشر', 'يتعلم ويطبق', 'ينقل لمواقف جديدة'],
          },
        ],
      },
    ],
  },
  {
    id: 'sensoryProfileTest',
    name: 'اختبار الملف الحسي',
    nameEn: 'Sensory Profile Test',
    description: 'تقييم تفصيلي للاستجابات الحسية وأنماط المعالجة الحسية',
    type: 'itemLevel',
    maxScore: 60,
    icon: 'Sensors',
    color: '#00897b',
    sections: [
      {
        key: 'registration',
        name: 'التسجيل الحسي (ضعف الاستجابة)',
        items: [
          {
            key: 'low_registration_visual',
            name: 'ضعف التسجيل البصري',
            levels: ['دائماً', 'غالباً', 'أحياناً', 'نادراً/لا'],
          },
          {
            key: 'low_registration_auditory',
            name: 'ضعف التسجيل السمعي',
            levels: ['دائماً', 'غالباً', 'أحياناً', 'نادراً/لا'],
          },
          {
            key: 'low_registration_tactile',
            name: 'ضعف التسجيل اللمسي',
            levels: ['دائماً', 'غالباً', 'أحياناً', 'نادراً/لا'],
          },
        ],
      },
      {
        key: 'seeking',
        name: 'البحث عن المثيرات',
        items: [
          {
            key: 'movement_seeking',
            name: 'البحث عن الحركة',
            levels: ['مفرط', 'متكرر', 'ضمن الطبيعي', 'نادر'],
          },
          {
            key: 'oral_seeking',
            name: 'البحث الفموي',
            levels: ['مفرط', 'متكرر', 'ضمن الطبيعي', 'نادر'],
          },
          {
            key: 'tactile_seeking',
            name: 'البحث اللمسي',
            levels: ['مفرط', 'متكرر', 'ضمن الطبيعي', 'نادر'],
          },
        ],
      },
      {
        key: 'sensitivity',
        name: 'الحساسية المفرطة',
        items: [
          {
            key: 'auditory_sensitivity',
            name: 'الحساسية السمعية',
            levels: ['شديدة', 'متوسطة', 'خفيفة', 'طبيعية'],
          },
          {
            key: 'visual_sensitivity',
            name: 'الحساسية البصرية',
            levels: ['شديدة', 'متوسطة', 'خفيفة', 'طبيعية'],
          },
          {
            key: 'tactile_sensitivity',
            name: 'الحساسية اللمسية',
            levels: ['شديدة', 'متوسطة', 'خفيفة', 'طبيعية'],
          },
        ],
      },
      {
        key: 'avoidance',
        name: 'التجنب الحسي',
        items: [
          {
            key: 'movement_avoidance',
            name: 'تجنب الحركة',
            levels: ['تجنب كامل', 'غالباً', 'أحياناً', 'لا يتجنب'],
          },
          {
            key: 'social_avoidance',
            name: 'تجنب المواقف الاجتماعية',
            levels: ['تجنب كامل', 'غالباً', 'أحياناً', 'لا يتجنب'],
          },
          {
            key: 'texture_avoidance',
            name: 'تجنب القوام والملمس',
            levels: ['تجنب كامل', 'غالباً', 'أحياناً', 'لا يتجنب'],
          },
        ],
      },
      {
        key: 'impact',
        name: 'التأثير الوظيفي',
        items: [
          {
            key: 'academic_impact',
            name: 'التأثير الأكاديمي',
            levels: ['تأثير شديد', 'متوسط', 'خفيف', 'لا تأثير'],
          },
          {
            key: 'social_impact',
            name: 'التأثير الاجتماعي',
            levels: ['تأثير شديد', 'متوسط', 'خفيف', 'لا تأثير'],
          },
          {
            key: 'selfcare_impact',
            name: 'التأثير على الرعاية الذاتية',
            levels: ['تأثير شديد', 'متوسط', 'خفيف', 'لا تأثير'],
          },
        ],
      },
    ],
  },
  {
    id: 'academicReadinessTest',
    name: 'اختبار الجاهزية الأكاديمية',
    nameEn: 'Academic Readiness Test',
    description: 'تقييم المهارات السابقة للقراءة والكتابة والحساب ومهارات ما قبل المدرسة',
    type: 'itemLevel',
    maxScore: 60,
    icon: 'School',
    color: '#1565c0',
    sections: [
      {
        key: 'preReading',
        name: 'ما قبل القراءة',
        items: [
          {
            key: 'letter_recognition',
            name: 'التعرف على الحروف',
            levels: ['لا يتعرف', 'بعض الحروف', 'معظم الحروف', 'كل الحروف'],
          },
          {
            key: 'phonological_awareness',
            name: 'الوعي الصوتي',
            levels: ['لا يميز', 'يميز أصوات قليلة', 'يميز معظم الأصوات', 'يميز ويحلل'],
          },
          {
            key: 'print_concepts',
            name: 'مفاهيم الطباعة',
            levels: ['لا يفهم', 'يفهم الاتجاه', 'يمسك الكتاب صحيحاً', 'يفهم المفاهيم كاملة'],
          },
        ],
      },
      {
        key: 'preWriting',
        name: 'ما قبل الكتابة',
        items: [
          {
            key: 'pencil_grip',
            name: 'مسك القلم',
            levels: ['لا يمسك', 'قبضة كاملة', 'قبضة ثلاثية غير ناضجة', 'قبضة ثلاثية ناضجة'],
          },
          {
            key: 'line_tracing',
            name: 'تتبع الخطوط',
            levels: ['لا يستطيع', 'خطوط مستقيمة فقط', 'خطوط منحنية', 'أشكال معقدة'],
          },
          {
            key: 'letter_formation',
            name: 'تكوين الحروف',
            levels: ['لا يكتب', 'خربشة', 'حروف غير واضحة', 'حروف واضحة'],
          },
        ],
      },
      {
        key: 'preMath',
        name: 'ما قبل الحساب',
        items: [
          {
            key: 'counting',
            name: 'العد',
            levels: ['لا يعد', 'يعد حتى 5', 'يعد حتى 10', 'يعد حتى 20+'],
          },
          {
            key: 'number_recognition',
            name: 'التعرف على الأرقام',
            levels: ['لا يتعرف', 'أرقام 1-5', 'أرقام 1-10', 'أرقام 1-20+'],
          },
          {
            key: 'sorting_classifying',
            name: 'التصنيف والتنظيم',
            levels: ['لا يصنف', 'خاصية واحدة', 'خاصيتان', 'عدة خصائص'],
          },
        ],
      },
      {
        key: 'learningBehaviors',
        name: 'سلوكيات التعلم',
        items: [
          {
            key: 'attention_span',
            name: 'مدة الانتباه',
            levels: ['أقل من دقيقة', '1-3 دقائق', '3-5 دقائق', '5+ دقائق'],
          },
          {
            key: 'following_instructions',
            name: 'اتباع التعليمات',
            levels: ['لا يتبع', 'خطوة واحدة', 'خطوتان', 'تعليمات متعددة'],
          },
          {
            key: 'task_completion',
            name: 'إتمام المهام',
            levels: ['لا يبدأ', 'يبدأ ويتوقف', 'يكمل بمساعدة', 'يكمل مستقلاً'],
          },
        ],
      },
    ],
  },
  {
    id: 'oralMotorTest',
    name: 'اختبار الحركة الفموية',
    nameEn: 'Oral Motor Assessment',
    description: 'تقييم وظائف الحركة الفموية والبلع والتغذية',
    type: 'itemLevel',
    maxScore: 48,
    icon: 'Face',
    color: '#ef6c00',
    sections: [
      {
        key: 'jawFunction',
        name: 'وظائف الفك',
        items: [
          {
            key: 'jaw_stability',
            name: 'ثبات الفك',
            levels: ['غير مستقر', 'ضعيف', 'متوسط', 'ثابت'],
          },
          {
            key: 'jaw_movement',
            name: 'حركة الفك',
            levels: ['محدودة جداً', 'محدودة', 'وظيفية', 'كاملة'],
          },
          {
            key: 'biting',
            name: 'العض',
            levels: ['لا يعض', 'ضعيف', 'وظيفي', 'قوي ومتحكم'],
          },
          {
            key: 'chewing',
            name: 'المضغ',
            levels: ['لا يمضغ', 'حركة عمودية فقط', 'حركة دائرية ناشئة', 'حركة دائرية ناضجة'],
          },
        ],
      },
      {
        key: 'lipFunction',
        name: 'وظائف الشفتين',
        items: [
          {
            key: 'lip_closure',
            name: 'إغلاق الشفتين',
            levels: ['مفتوحتان', 'إغلاق جزئي', 'إغلاق مع جهد', 'إغلاق طبيعي'],
          },
          {
            key: 'lip_rounding',
            name: 'تدوير الشفتين',
            levels: ['لا يستطيع', 'حركة بسيطة', 'حركة وظيفية', 'حركة كاملة'],
          },
          {
            key: 'lip_retraction',
            name: 'سحب الشفتين',
            levels: ['لا يستطيع', 'حركة بسيطة', 'حركة وظيفية', 'حركة كاملة'],
          },
          {
            key: 'lip_strength',
            name: 'قوة الشفتين',
            levels: ['ضعيفة جداً', 'ضعيفة', 'وظيفية', 'قوية'],
          },
        ],
      },
      {
        key: 'tongueFunction',
        name: 'وظائف اللسان',
        items: [
          {
            key: 'tongue_protrusion',
            name: 'بروز اللسان',
            levels: ['لا يبرز', 'جزئي', 'يصل للشفة', 'يتجاوز الشفة'],
          },
          {
            key: 'tongue_lateralization',
            name: 'حركة اللسان الجانبية',
            levels: ['لا حركة', 'حركة بسيطة', 'يصل للزوايا', 'حركة سريعة ودقيقة'],
          },
          {
            key: 'tongue_elevation',
            name: 'رفع اللسان',
            levels: ['لا يرفع', 'حركة بسيطة', 'يصل للثة العلوية', 'حركة كاملة ومتحكمة'],
          },
          {
            key: 'tongue_bowl',
            name: 'تكوين الوعاء اللساني',
            levels: ['لا يستطيع', 'تكوين جزئي', 'تكوين غير مستقر', 'تكوين كامل ومستقر'],
          },
        ],
      },
    ],
  },
  {
    id: 'socialSkillsTest',
    name: 'اختبار المهارات الاجتماعية التفصيلي',
    nameEn: 'Social Skills Detailed Test',
    description: 'تقييم تفصيلي للتفاعل الاجتماعي والتواصل غير اللفظي ومهارات اللعب والصداقة',
    type: 'itemLevel',
    maxScore: 60,
    icon: 'Groups',
    color: '#ad1457',
    sections: [
      {
        key: 'socialInitiation',
        name: 'المبادرة الاجتماعية',
        items: [
          {
            key: 'greeting',
            name: 'التحية',
            levels: ['لا يحيي', 'بتوجيه بدني', 'بتذكير لفظي', 'مستقل'],
          },
          {
            key: 'conversation_initiation',
            name: 'بدء المحادثة',
            levels: ['لا يبدأ', 'بتوجيه', 'أحياناً عفوياً', 'يبدأ بعفوية'],
          },
          {
            key: 'requesting',
            name: 'تقديم الطلبات',
            levels: ['لا يطلب', 'بإيماء', 'بكلمة/جملة', 'بجمل مهذبة'],
          },
        ],
      },
      {
        key: 'socialResponse',
        name: 'الاستجابة الاجتماعية',
        items: [
          {
            key: 'eye_contact',
            name: 'التواصل البصري',
            levels: ['لا ينظر', 'عابر', 'متقطع', 'مناسب'],
          },
          {
            key: 'reciprocity',
            name: 'التبادل في المحادثة',
            levels: ['أحادي الاتجاه', 'يرد بكلمة', 'يرد بجملة', 'حوار متبادل'],
          },
          {
            key: 'emotional_response',
            name: 'الاستجابة للعواطف',
            levels: ['لا يلاحظ', 'يلاحظ دون استجابة', 'يستجيب بتوجيه', 'يستجيب عفوياً'],
          },
        ],
      },
      {
        key: 'playSkills',
        name: 'مهارات اللعب',
        items: [
          {
            key: 'parallel_play',
            name: 'اللعب الموازي',
            levels: ['لا يلعب قرب آخرين', 'يتحمل القرب', 'يلعب بجوار', 'يلعب بجوار وينتبه'],
          },
          {
            key: 'cooperative_play',
            name: 'اللعب التعاوني',
            levels: ['لا يشارك', 'بتوجيه كامل', 'بتوجيه جزئي', 'عفوياً'],
          },
          {
            key: 'turn_taking',
            name: 'تبادل الأدوار',
            levels: ['لا ينتظر', 'بمساعدة بدنية', 'بتذكير', 'مستقل'],
          },
        ],
      },
      {
        key: 'nonverbalCommunication',
        name: 'التواصل غير اللفظي',
        items: [
          {
            key: 'facial_expression',
            name: 'تعبيرات الوجه',
            levels: ['جامدة', 'محدودة', 'مناسبة أحياناً', 'مناسبة وطبيعية'],
          },
          {
            key: 'gestures',
            name: 'الإيماءات',
            levels: ['لا يستخدم', 'إيماءات بدائية', 'إيماءات وظيفية', 'إيماءات متنوعة'],
          },
          {
            key: 'personal_space',
            name: 'المسافة الشخصية',
            levels: ['غير مدرك', 'قريب جداً', 'مناسب أحياناً', 'مناسب دائماً'],
          },
        ],
      },
      {
        key: 'conflictResolution',
        name: 'حل النزاعات',
        items: [
          {
            key: 'sharing',
            name: 'المشاركة',
            levels: ['يرفض تماماً', 'بإصرار البالغ', 'بتذكير', 'عفوياً'],
          },
          {
            key: 'compromise',
            name: 'التنازل والتسوية',
            levels: ['لا يتنازل', 'بتوجيه مكثف', 'بتوجيه بسيط', 'مستقل'],
          },
          {
            key: 'problem_resolution',
            name: 'حل المشكلات مع الأقران',
            levels: ['يلجأ للعدوان', 'يلجأ للبالغ', 'يحاول لفظياً', 'يحل بفاعلية'],
          },
        ],
      },
    ],
  },
  {
    id: 'selfCareIndependenceTest',
    name: 'اختبار الاستقلالية في الرعاية الذاتية',
    nameEn: 'Self-Care Independence Test',
    description: 'تقييم تفصيلي لمستوى الاستقلالية في النظافة الشخصية واللبس والأكل',
    type: 'itemLevel',
    maxScore: 60,
    icon: 'Accessibility',
    color: '#00838f',
    sections: [
      {
        key: 'hygiene',
        name: 'النظافة الشخصية',
        items: [
          {
            key: 'hand_washing',
            name: 'غسل اليدين',
            levels: ['يحتاج مساعدة كاملة', 'بتوجيه بدني', 'بإشراف', 'مستقل'],
          },
          {
            key: 'teeth_brushing',
            name: 'تنظيف الأسنان',
            levels: ['يحتاج مساعدة كاملة', 'بتوجيه بدني', 'بإشراف', 'مستقل'],
          },
          {
            key: 'toileting',
            name: 'استخدام المرحاض',
            levels: ['حفاضات', 'يُذكّر ويُساعد', 'يُذكّر فقط', 'مستقل تماماً'],
          },
        ],
      },
      {
        key: 'dressing',
        name: 'اللبس والخلع',
        items: [
          {
            key: 'undressing',
            name: 'خلع الملابس',
            levels: ['يحتاج مساعدة كاملة', 'يساعد جزئياً', 'معظم الملابس', 'مستقل تماماً'],
          },
          {
            key: 'dressing_simple',
            name: 'لبس ملابس بسيطة',
            levels: ['يحتاج مساعدة كاملة', 'يدخل الأطراف', 'بمساعدة بسيطة', 'مستقل'],
          },
          {
            key: 'fasteners',
            name: 'الأزرار والسحابات',
            levels: ['لا يستطيع', 'سحاب فقط', 'أزرار كبيرة', 'كل الإغلاقات'],
          },
          {
            key: 'shoe_management',
            name: 'إدارة الأحذية',
            levels: ['لا يستطيع', 'خلع فقط', 'لبس وخلع بدون ربط', 'مستقل مع الربط'],
          },
        ],
      },
      {
        key: 'feeding',
        name: 'التغذية',
        items: [
          {
            key: 'utensil_use',
            name: 'استخدام الأدوات',
            levels: ['باليد فقط', 'ملعقة بمساعدة', 'ملعقة مستقل', 'ملعقة وشوكة'],
          },
          {
            key: 'drinking',
            name: 'الشرب',
            levels: ['رضاعة/كوب خاص', 'كوب مفتوح بمساعدة', 'كوب مفتوح مع انسكاب', 'مستقل'],
          },
          {
            key: 'food_variety',
            name: 'تنوع الطعام',
            levels: ['أقل من 5 أصناف', '5-10 أصناف', '10-20 صنف', 'تنوع كامل'],
          },
        ],
      },
      {
        key: 'safety',
        name: 'السلامة والوعي',
        items: [
          {
            key: 'danger_awareness',
            name: 'الوعي بالمخاطر',
            levels: ['غير مدرك', 'يعرف بعض المخاطر', 'يعرف المخاطر الشائعة', 'وعي كامل'],
          },
          {
            key: 'seeking_help',
            name: 'طلب المساعدة',
            levels: ['لا يطلب', 'يبكي/يصرخ', 'يشير أو يسحب', 'يطلب لفظياً'],
          },
          {
            key: 'personal_info',
            name: 'معرفة المعلومات الشخصية',
            levels: ['لا يعرف', 'الاسم فقط', 'الاسم والعمر', 'اسم وعنوان وهاتف'],
          },
        ],
      },
    ],
  },
  {
    id: 'vocationalReadinessTest',
    name: 'اختبار الجاهزية المهنية',
    nameEn: 'Vocational Readiness Test',
    description: 'تقييم المهارات المهنية والاستعداد للعمل والتدريب المهني',
    type: 'itemLevel',
    maxScore: 60,
    icon: 'Work',
    color: '#4527a0',
    sections: [
      {
        key: 'workHabits',
        name: 'عادات العمل',
        items: [
          {
            key: 'punctuality',
            name: 'الالتزام بالمواعيد',
            levels: ['غير منتظم', 'يحتاج تذكير دائم', 'غالباً ملتزم', 'دائماً ملتزم'],
          },
          {
            key: 'task_persistence',
            name: 'المثابرة في المهام',
            levels: ['يتوقف فوراً', 'يحاول قليلاً', 'يكمل معظم المهام', 'يكمل كل المهام'],
          },
          {
            key: 'quality_awareness',
            name: 'الوعي بالجودة',
            levels: ['لا يهتم', 'يلاحظ الأخطاء الكبرى', 'يصحح بتوجيه', 'يراجع ويحسّن'],
          },
        ],
      },
      {
        key: 'interpersonal',
        name: 'المهارات الشخصية',
        items: [
          {
            key: 'accepting_feedback',
            name: 'تقبل التغذية الراجعة',
            levels: ['يرفض', 'ينزعج ثم يقبل', 'يقبل بهدوء', 'يطلب ويطبق'],
          },
          {
            key: 'teamwork',
            name: 'العمل الجماعي',
            levels: ['يعمل منفرداً فقط', 'يتحمل الوجود', 'يتعاون بتوجيه', 'يتعاون عفوياً'],
          },
          {
            key: 'respectful_interaction',
            name: 'التفاعل المحترم',
            levels: ['سلوك غير مناسب', 'يحتاج تذكير متكرر', 'مناسب غالباً', 'مناسب دائماً'],
          },
        ],
      },
      {
        key: 'taskSkills',
        name: 'المهارات المهنية الأساسية',
        items: [
          {
            key: 'following_routine',
            name: 'اتباع الروتين',
            levels: ['لا يتبع', 'بتوجيه مستمر', 'بتذكير', 'مستقل'],
          },
          {
            key: 'tool_use',
            name: 'استخدام الأدوات',
            levels: ['لا يستخدم', 'أدوات بسيطة بمساعدة', 'أدوات بسيطة مستقل', 'أدوات متنوعة'],
          },
          {
            key: 'safety_compliance',
            name: 'الالتزام بقواعد السلامة',
            levels: ['غير مدرك', 'يحتاج إشراف', 'يلتزم غالباً', 'يلتزم دائماً'],
          },
        ],
      },
      {
        key: 'independence',
        name: 'الاستقلالية المهنية',
        items: [
          {
            key: 'self_initiation',
            name: 'بدء العمل ذاتياً',
            levels: ['لا يبدأ', 'بتوجيه بدني', 'بإشارة', 'يبدأ مستقلاً'],
          },
          {
            key: 'problem_encountered',
            name: 'التعامل مع المشكلات',
            levels: ['يتوقف', 'ينتظر المساعدة', 'يحاول ثم يطلب', 'يحل ذاتياً أو يطلب'],
          },
          {
            key: 'transition_tasks',
            name: 'الانتقال بين المهام',
            levels: ['يحتاج توجيه كامل', 'بتذكير', 'بتوجيه بسيط', 'مستقل وسلس'],
          },
        ],
      },
    ],
  },

  /* ───────────────────────────────────────────────────────────
   *  اختبارات متخصصة لتقييم ذوي الإعاقة  (8 اختبارات – 18‑25)
   * ─────────────────────────────────────────────────────────── */

  // 18 — اختبار تقييم الإعاقة الحركية الشامل
  {
    id: 'motorDisabilityAssessment',
    name: 'اختبار تقييم الإعاقة الحركية الشامل',
    nameEn: 'Comprehensive Motor Disability Assessment',
    description:
      'تقييم متعدد الأبعاد للقدرات الحركية والوظيفية لذوي الإعاقة الحركية شاملاً التنقل والتوازن والتحمل وقدرة الأطراف العلوية',
    ageRange: 'الكل',
    version: '1.0',
    icon: 'Accessible',
    color: '#1565c0',
    categories: [
      {
        key: 'grossMobility',
        name: 'التنقل والحركة الكبرى',
        items: [
          {
            key: 'transfer_bed_chair',
            name: 'الانتقال من السرير للكرسي',
            levels: ['غير قادر', 'بمساعدة كاملة', 'بمساعدة جزئية', 'بإشراف', 'مستقل'],
          },
          {
            key: 'walking_flat',
            name: 'المشي على سطح مستوٍ',
            levels: ['غير قادر', 'بأدوات مساعدة + مرافق', 'بأدوات مساعدة', 'بدعم خفيف', 'مستقل'],
          },
          {
            key: 'stair_climbing',
            name: 'صعود ونزول الدرج',
            levels: ['غير قادر', 'بمساعدة كاملة', 'بدرابزين + مرافق', 'بدرابزين فقط', 'مستقل'],
          },
          {
            key: 'wheelchair_operation',
            name: 'تشغيل الكرسي المتحرك',
            levels: ['لا ينطبق', 'بمساعدة كاملة', 'يحرك مسافة قصيرة', 'يتنقل داخلياً', 'يتنقل بحرية'],
          },
          {
            key: 'outdoor_mobility',
            name: 'التنقل في الأماكن العامة',
            levels: ['غير قادر', 'بمرافق دائم', 'بمرافق للمسافات الطويلة', 'بأدوات محدودة', 'مستقل'],
          },
        ],
      },
      {
        key: 'balance',
        name: 'التوازن والتنسيق',
        items: [
          {
            key: 'static_sitting',
            name: 'الجلوس الثابت',
            levels: ['يحتاج دعم كامل', 'بدعم جانبي', 'يجلس بمسند', 'يجلس حر لفترة', 'ثابت ومستقل'],
          },
          {
            key: 'static_standing',
            name: 'الوقوف الثابت',
            levels: ['غير قادر', 'بدعم كامل', 'بدعم خفيف', 'يقف مدة قصيرة', 'يقف مستقلاً'],
          },
          {
            key: 'dynamic_balance',
            name: 'التوازن الديناميكي',
            levels: ['غائب', 'ضعيف جداً', 'ضعيف', 'مقبول', 'جيد'],
          },
          {
            key: 'protective_reactions',
            name: 'ردود الفعل الوقائية',
            levels: ['غائبة', 'متأخرة وناقصة', 'متأخرة', 'حاضرة بشكل جزئي', 'حاضرة بالكامل'],
          },
        ],
      },
      {
        key: 'upperLimb',
        name: 'وظائف الأطراف العلوية',
        items: [
          {
            key: 'reaching',
            name: 'مد اليد والوصول',
            levels: ['غير قادر', 'محدود جداً', 'يصل لمستويات محددة', 'يصل لمعظم المستويات', 'كامل المدى'],
          },
          {
            key: 'grasping',
            name: 'القبض والإمساك',
            levels: ['غير قادر', 'بقبضة ضعيفة', 'يمسك أشياء كبيرة', 'يمسك معظم الأشياء', 'قبضة كاملة ودقيقة'],
          },
          {
            key: 'manipulation',
            name: 'التحكم الدقيق باليد',
            levels: ['غير قادر', 'بمساعدة', 'يتحكم ببطء', 'يتحكم بشكل مقبول', 'تحكم دقيق وسريع'],
          },
          {
            key: 'bilateral_coordination',
            name: 'التنسيق بين اليدين',
            levels: ['غائب', 'ضعيف', 'يستخدم يد واحدة مع تثبيت', 'تنسيق بسيط', 'تنسيق كامل'],
          },
        ],
      },
      {
        key: 'endurance',
        name: 'التحمل والقدرة البدنية',
        items: [
          {
            key: 'physical_stamina',
            name: 'القدرة على التحمل البدني',
            levels: ['أقل من 5 دقائق', '5-15 دقيقة', '15-30 دقيقة', '30-60 دقيقة', 'أكثر من ساعة'],
          },
          {
            key: 'fatigue_recovery',
            name: 'سرعة استعادة النشاط',
            levels: ['بطيء جداً', 'بطيء', 'متوسط', 'جيد', 'ممتاز'],
          },
          {
            key: 'pain_impact',
            name: 'تأثير الألم على الأداء',
            levels: ['يمنع الأداء', 'يقلل كثيراً', 'يقلل بشكل متوسط', 'تأثير طفيف', 'لا ألم/لا تأثير'],
          },
        ],
      },
    ],
  },

  // 19 — اختبار تقييم الإعاقة البصرية الوظيفي
  {
    id: 'visualDisabilityAssessment',
    name: 'اختبار تقييم الإعاقة البصرية الوظيفي',
    nameEn: 'Functional Visual Disability Assessment',
    description:
      'تقييم القدرات البصرية الوظيفية ومهارات التوجه والتنقل ومهارات الحياة اليومية لذوي الإعاقة البصرية',
    ageRange: 'الكل',
    version: '1.0',
    icon: 'VisibilityOff',
    color: '#4a148c',
    categories: [
      {
        key: 'functionalVision',
        name: 'الرؤية الوظيفية',
        items: [
          {
            key: 'light_perception',
            name: 'إدراك الضوء',
            levels: ['لا إدراك', 'إدراك ضوء فقط', 'يميز اتجاه الضوء', 'يميز الأشكال', 'رؤية وظيفية محدودة'],
          },
          {
            key: 'near_vision_use',
            name: 'استخدام الرؤية القريبة',
            levels: ['لا يستخدم', 'بمعينات مكبرة خاصة', 'بمعينات بسيطة', 'مع تقريب المسافة', 'وظيفية'],
          },
          {
            key: 'distance_vision',
            name: 'الرؤية البعيدة',
            levels: ['لا يميز', 'يميز أشخاصاً قريبين', 'يميز على بعد 3م', 'يميز على بعد 6م', 'وظيفية'],
          },
          {
            key: 'visual_field',
            name: 'مجال الرؤية',
            levels: ['لا يوجد', 'مجال ضيق جداً (<10°)', 'مجال محدود (10-30°)', 'مقبول (30-60°)', 'طبيعي (>60°)'],
          },
        ],
      },
      {
        key: 'orientationMobility',
        name: 'التوجه والتنقل',
        items: [
          {
            key: 'indoor_navigation',
            name: 'التنقل في البيئة المعروفة',
            levels: ['غير قادر', 'بمرافق دائم', 'بعصا بيضاء + إرشاد', 'بعصا بيضاء مستقلاً', 'مستقل تماماً'],
          },
          {
            key: 'outdoor_navigation',
            name: 'التنقل في الشارع',
            levels: ['غير قادر', 'بمرافق دائم', 'بمرافق أحياناً', 'مستقل مع احتياطات', 'مستقل تماماً'],
          },
          {
            key: 'public_transport',
            name: 'استخدام المواصلات العامة',
            levels: ['غير قادر', 'يحتاج مرافق', 'يستخدم خطوطاً محددة بمساعدة', 'يستخدم خطوطاً محددة', 'مستقل'],
          },
          {
            key: 'spatial_awareness',
            name: 'الوعي المكاني',
            levels: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
          },
        ],
      },
      {
        key: 'assistiveTech',
        name: 'التقنيات المساعدة البصرية',
        items: [
          {
            key: 'screen_reader',
            name: 'استخدام قارئ الشاشة',
            levels: ['لا يستخدم', 'أوامر أساسية', 'تصفح بسيط', 'استخدام متوسط', 'استخدام متقدم'],
          },
          {
            key: 'braille',
            name: 'قراءة وكتابة برايل',
            levels: ['لا يعرف', 'يتعلم الحروف', 'يقرأ كلمات', 'يقرأ ويكتب ببطء', 'طلاقة في القراءة والكتابة'],
          },
          {
            key: 'magnification',
            name: 'استخدام أدوات التكبير',
            levels: ['لا يستخدم', 'بمساعدة', 'معينات يدوية', 'معينات إلكترونية بسيطة', 'معينات متقدمة'],
          },
        ],
      },
    ],
  },

  // 20 — اختبار تقييم الإعاقة السمعية الوظيفي
  {
    id: 'hearingDisabilityAssessment',
    name: 'اختبار تقييم الإعاقة السمعية الوظيفي',
    nameEn: 'Functional Hearing Disability Assessment',
    description:
      'تقييم القدرات السمعية الوظيفية ومهارات التواصل واستخدام المعينات السمعية ولغة الإشارة',
    ageRange: 'الكل',
    version: '1.0',
    icon: 'HearingDisabled',
    color: '#00695c',
    categories: [
      {
        key: 'auditoryFunction',
        name: 'الوظائف السمعية',
        items: [
          {
            key: 'sound_awareness',
            name: 'الوعي الصوتي',
            levels: ['لا يستجيب', 'أصوات عالية جداً', 'أصوات عالية', 'أصوات متوسطة', 'أصوات خفيفة'],
          },
          {
            key: 'speech_detection',
            name: 'كشف الكلام',
            levels: ['لا يميز', 'يميز وجود كلام فقط', 'يميز بعض الكلمات', 'يفهم الجمل القصيرة', 'يفهم المحادثات'],
          },
          {
            key: 'hearing_aid_benefit',
            name: 'الاستفادة من المعينات السمعية',
            levels: ['لا يستخدم/لا فائدة', 'فائدة محدودة', 'فائدة متوسطة', 'فائدة جيدة', 'فائدة ممتازة'],
          },
          {
            key: 'noise_discrimination',
            name: 'التمييز في الضوضاء',
            levels: ['غير قادر', 'صعوبة كبيرة', 'صعوبة متوسطة', 'صعوبة خفيفة', 'يميز بشكل طبيعي'],
          },
        ],
      },
      {
        key: 'communicationModes',
        name: 'أنماط التواصل',
        items: [
          {
            key: 'sign_language',
            name: 'لغة الإشارة',
            levels: ['لا يعرف', 'إشارات مفردة', 'جمل بسيطة', 'يتحدث بطلاقة', 'متقدم ومترجم'],
          },
          {
            key: 'lip_reading',
            name: 'قراءة الشفاه',
            levels: ['لا يستخدم', 'كلمات مألوفة', 'جمل قصيرة مع سياق', 'جمل متوسطة', 'محادثات عادية'],
          },
          {
            key: 'spoken_language',
            name: 'اللغة المنطوقة',
            levels: ['لا ينتج كلاماً', 'كلمات مفردة', 'جمل قصيرة', 'كلام مفهوم', 'كلام واضح وطلق'],
          },
          {
            key: 'written_communication',
            name: 'التواصل الكتابي',
            levels: ['لا يكتب', 'كلمات بسيطة', 'جمل قصيرة', 'نصوص متوسطة', 'كتابة متقدمة'],
          },
        ],
      },
      {
        key: 'socialAuditory',
        name: 'التواصل الاجتماعي السمعي',
        items: [
          {
            key: 'group_conversation',
            name: 'المشاركة في المحادثات الجماعية',
            levels: ['لا يشارك', 'يشارك بمترجم فقط', 'يشارك بدعم', 'يشارك بفعالية محدودة', 'يشارك بفعالية كاملة'],
          },
          {
            key: 'phone_communication',
            name: 'التواصل الهاتفي',
            levels: ['لا يستخدم', 'رسائل نصية فقط', 'مكالمات فيديو بالإشارة', 'مكالمات صوتية قصيرة', 'تواصل هاتفي عادي'],
          },
          {
            key: 'environmental_sounds',
            name: 'الاستجابة لأصوات البيئة',
            levels: ['لا يستجيب', 'ينبهات بصرية فقط', 'يستجيب للأصوات العالية', 'يستجيب لمعظم الأصوات', 'استجابة طبيعية'],
          },
        ],
      },
    ],
  },

  // 21 — اختبار تقييم الإعاقة الذهنية والتكيفي
  {
    id: 'intellectualDisabilityAssessment',
    name: 'اختبار تقييم الإعاقة الذهنية والسلوك التكيفي',
    nameEn: 'Intellectual Disability & Adaptive Behavior Assessment',
    description:
      'تقييم شامل للقدرات المعرفية والسلوك التكيفي ومهارات الحياة المستقلة لذوي الإعاقة الذهنية',
    ageRange: '5+',
    version: '1.0',
    icon: 'Psychology',
    color: '#ad1457',
    categories: [
      {
        key: 'conceptualSkills',
        name: 'المهارات المفاهيمية',
        items: [
          {
            key: 'language_comprehension',
            name: 'فهم اللغة واستخدامها',
            levels: ['لا يفهم', 'كلمات مفردة', 'جمل بسيطة', 'محادثات يومية', 'مفاهيم مجردة'],
          },
          {
            key: 'reading_writing',
            name: 'القراءة والكتابة',
            levels: ['لا يقرأ/لا يكتب', 'يتعرف على حروف', 'كلمات بسيطة', 'جمل ونصوص قصيرة', 'يقرأ ويكتب وظيفياً'],
          },
          {
            key: 'number_concepts',
            name: 'المفاهيم العددية والحسابية',
            levels: ['لا يفهم الأعداد', 'يعد حتى 10', 'عمليات أساسية', 'يتعامل مع النقود', 'حساب وظيفي كامل'],
          },
          {
            key: 'time_concepts',
            name: 'مفاهيم الوقت والتخطيط',
            levels: ['لا يفهم الوقت', 'يميز النهار/الليل', 'يقرأ الساعة', 'يخطط ليومه', 'يخطط لأسبوعه'],
          },
          {
            key: 'self_direction',
            name: 'التوجيه الذاتي واتخاذ القرارات',
            levels: ['لا يتخذ قرارات', 'يختار بين خيارين', 'قرارات يومية بسيطة', 'قرارات متوسطة', 'تخطيط مستقل'],
          },
        ],
      },
      {
        key: 'socialAdaptive',
        name: 'المهارات الاجتماعية التكيفية',
        items: [
          {
            key: 'interpersonal',
            name: 'العلاقات مع الآخرين',
            levels: ['منعزل', 'يتفاعل بتوجيه بدني', 'يتفاعل بموجّه لفظي', 'يبادر بالتفاعل', 'علاقات متبادلة'],
          },
          {
            key: 'social_rules',
            name: 'فهم القواعد الاجتماعية',
            levels: ['لا يفهم', 'يستجيب للتوجيه المباشر', 'يتبع القواعد الأساسية', 'يفهم معظم القواعد', 'يطبق القواعد ذاتياً'],
          },
          {
            key: 'safety_awareness',
            name: 'الوعي بالسلامة الشخصية',
            levels: ['غير واعٍ', 'يستجيب للتحذير', 'يتجنب مخاطر واضحة', 'وعي جيد', 'وعي كامل ووقائي'],
          },
          {
            key: 'community_use',
            name: 'استخدام مرافق المجتمع',
            levels: ['غير قادر', 'بمرافق دائم', 'بدعم أحياناً', 'مستقل في أماكن مألوفة', 'مستقل بالكامل'],
          },
        ],
      },
      {
        key: 'practicalSkills',
        name: 'المهارات العملية',
        items: [
          {
            key: 'personal_care',
            name: 'العناية الشخصية',
            levels: ['اعتماد كامل', 'بمساعدة بدنية جزئية', 'بتوجيه لفظي', 'بإشراف بسيط', 'مستقل'],
          },
          {
            key: 'domestic_skills',
            name: 'المهارات المنزلية',
            levels: ['لا يؤدي', 'مهام بسيطة بمساعدة', 'مهام بسيطة مستقلاً', 'معظم المهام', 'جميع المهام المنزلية'],
          },
          {
            key: 'health_management',
            name: 'إدارة الصحة',
            levels: ['لا يشارك', 'يتناول أدوية بإشراف', 'يبلغ عن أعراض', 'يدير صحته جزئياً', 'يدير صحته بالكامل'],
          },
          {
            key: 'money_management',
            name: 'إدارة المال',
            levels: ['لا يفهم النقود', 'يعرف العملات', 'يشتري بمساعدة', 'يشتري مستقلاً', 'يدير ميزانية'],
          },
        ],
      },
    ],
  },

  // 22 — اختبار تقييم اضطراب طيف التوحد الوظيفي
  {
    id: 'autismFunctionalAssessment',
    name: 'اختبار تقييم اضطراب طيف التوحد الوظيفي',
    nameEn: 'Functional Autism Spectrum Assessment',
    description:
      'تقييم وظيفي شامل للأفراد ذوي اضطراب طيف التوحد عبر مجالات التواصل والتفاعل والسلوكيات النمطية والمهارات التكيفية',
    ageRange: '2+',
    version: '1.0',
    icon: 'Extension',
    color: '#7b1fa2',
    categories: [
      {
        key: 'socialCommunication',
        name: 'التواصل الاجتماعي',
        items: [
          {
            key: 'joint_attention',
            name: 'الانتباه المشترك',
            levels: ['غائب', 'يستجيب أحياناً', 'يستجيب دائماً', 'يبادر أحياناً', 'يبادر بانتظام'],
          },
          {
            key: 'social_reciprocity',
            name: 'التبادل الاجتماعي',
            levels: ['غائب', 'استجابة بسيطة للاسم', 'يتبادل بتوجيه', 'تبادل تلقائي محدود', 'تبادل طبيعي'],
          },
          {
            key: 'nonverbal_cues',
            name: 'فهم الإشارات غير اللفظية',
            levels: ['لا يفهم', 'يفهم إشارات واضحة', 'يفهم تعابير الوجه', 'يفهم لغة الجسد', 'فهم شامل للإشارات'],
          },
          {
            key: 'emotional_understanding',
            name: 'فهم المشاعر',
            levels: ['لا يفهم', 'يميز سعيد/حزين', 'يميز 4 مشاعر', 'يفهم المشاعر في السياق', 'يفهم المشاعر المعقدة'],
          },
          {
            key: 'friendship_skills',
            name: 'مهارات بناء الصداقة',
            levels: ['لا يبادر', 'يتفاعل بتوجيه', 'يلعب بالقرب', 'يتفاعل مع أقران', 'صداقات متبادلة'],
          },
        ],
      },
      {
        key: 'restrictedBehaviors',
        name: 'السلوكيات المقيدة والنمطية',
        items: [
          {
            key: 'stereotyped_movements',
            name: 'الحركات النمطية',
            levels: ['مستمرة وتعيق الأداء', 'متكررة وملاحظة', 'تظهر عند التوتر', 'نادرة', 'غائبة/مُدارة'],
          },
          {
            key: 'routine_insistence',
            name: 'التمسك بالروتين',
            levels: ['انهيار عند أي تغيير', 'اضطراب شديد', 'يقبل التغيير بتحضير طويل', 'يقبل بتحضير قصير', 'مرونة مقبولة'],
          },
          {
            key: 'restricted_interests',
            name: 'الاهتمامات المحدودة',
            levels: ['اهتمام واحد يسيطر', 'اهتمامات ضيقة جداً', 'اهتمامات ضيقة تتوسع', 'اهتمامات متنوعة محدودة', 'اهتمامات متنوعة'],
          },
          {
            key: 'sensory_reactivity',
            name: 'ردود الفعل الحسية',
            levels: ['شديدة التطرف', 'ملاحظة وتؤثر يومياً', 'متوسطة', 'خفيفة', 'ضمن المدى الطبيعي'],
          },
        ],
      },
      {
        key: 'functionalCommunication',
        name: 'التواصل الوظيفي',
        items: [
          {
            key: 'expressive_means',
            name: 'وسيلة التعبير',
            levels: ['سلوك فقط', 'إشارات بدنية', 'صور/PECS', 'كلمات + بدائل', 'كلام وظيفي'],
          },
          {
            key: 'requesting',
            name: 'طلب الاحتياجات',
            levels: ['لا يطلب', 'يأخذ يد الآخر', 'يشير', 'يسمي ما يريد', 'يطلب بجمل'],
          },
          {
            key: 'commenting',
            name: 'التعليق والمشاركة',
            levels: ['لا يعلق', 'يشير لأشياء', 'يسمي أشياء', 'يعلق بجمل قصيرة', 'يتحدث عن تجاربه'],
          },
          {
            key: 'conversation_skills',
            name: 'مهارات المحادثة',
            levels: ['لا يتحاور', 'يرد بكلمة', 'يرد بجملة', 'يبادل 2-3 دورات', 'محادثة متعددة الدورات'],
          },
        ],
      },
    ],
  },

  // 23 — اختبار تقييم الشلل الدماغي الوظيفي
  {
    id: 'cerebralPalsyAssessment',
    name: 'اختبار تقييم الشلل الدماغي الوظيفي',
    nameEn: 'Functional Cerebral Palsy Assessment',
    description:
      'تقييم شامل للقدرات الوظيفية لذوي الشلل الدماغي شاملاً الحركة والتواصل والأكل والنشاطات اليومية',
    ageRange: 'الكل',
    version: '1.0',
    icon: 'AccessibilityNew',
    color: '#0d47a1',
    categories: [
      {
        key: 'grossMotorFunction',
        name: 'الوظائف الحركية الكبرى (GMFCS)',
        items: [
          {
            key: 'head_control',
            name: 'التحكم بالرأس',
            levels: ['لا تحكم', 'يرفع لفترة قصيرة', 'يحافظ بجهد', 'تحكم جيد في الجلوس', 'تحكم كامل'],
          },
          {
            key: 'trunk_control',
            name: 'التحكم بالجذع',
            levels: ['لا تحكم', 'بدعم كامل', 'بدعم جزئي', 'جلوس مستقل', 'تحكم كامل ديناميكي'],
          },
          {
            key: 'locomotion_type',
            name: 'نمط التنقل',
            levels: ['محمول/كرسي كهربائي', 'كرسي يدوي بمساعدة', 'كرسي يدوي مستقل', 'مشاية/عكازات', 'مشي مستقل/بدعم خفيف'],
          },
          {
            key: 'position_changes',
            name: 'تغيير الأوضاع',
            levels: ['لا يغير وضعه', 'بمساعدة كاملة', 'بمساعدة جزئية', 'بعض التحولات مستقلاً', 'مستقل في التحولات'],
          },
        ],
      },
      {
        key: 'manualAbility',
        name: 'القدرات اليدوية (MACS)',
        items: [
          {
            key: 'object_handling',
            name: 'التعامل مع الأشياء',
            levels: ['لا يتعامل', 'بمساعدة كاملة', 'يتعامل ببطء مع أشياء سهلة', 'يتعامل مع معظم الأشياء', 'يتعامل بسهولة وبراعة'],
          },
          {
            key: 'eating_drinking',
            name: 'الأكل والشرب',
            levels: ['تغذية أنبوبية/بمساعدة كاملة', 'بمساعدة بدنية', 'بأدوات معدلة', 'بأدوات عادية ببطء', 'مستقل'],
          },
          {
            key: 'drawing_writing',
            name: 'الرسم والكتابة',
            levels: ['غير قادر', 'خربشات بمساعدة', 'أشكال بسيطة', 'يكتب ببطء/تقنية', 'يكتب وظيفياً'],
          },
          {
            key: 'self_care_hands',
            name: 'الرعاية الذاتية باليدين',
            levels: ['لا يشارك', 'مشاركة بدنية بسيطة', 'يساعد في ارتداء الملابس', 'يؤدي معظم المهام', 'مستقل'],
          },
        ],
      },
      {
        key: 'communicationCP',
        name: 'التواصل والنطق (CFCS)',
        items: [
          {
            key: 'speech_clarity',
            name: 'وضوح الكلام',
            levels: ['لا كلام مفهوم', 'مفهوم للمقربين فقط', 'مفهوم في السياق', 'مفهوم مع بعض الصعوبة', 'واضح ومفهوم'],
          },
          {
            key: 'oral_motor',
            name: 'الوظائف الفموية الحركية',
            levels: ['صعوبة شديدة (عسر بلع)', 'صعوبة في المضغ والبلع', 'يأكل أطعمة طرية', 'صعوبات خفيفة', 'وظائف طبيعية'],
          },
          {
            key: 'aac_use',
            name: 'استخدام التواصل البديل (AAC)',
            levels: ['لا يستخدم وسلة بديلة', 'يستخدم بتوجيه', 'يستخدم للطلب', 'يستخدم لمحادثات بسيطة', 'يستخدم لتواصل شامل'],
          },
          {
            key: 'swallowing_safety',
            name: 'سلامة البلع',
            levels: ['خطر شفط عالي', 'سوائل مثخنة فقط', 'طعام معدل القوام', 'احتياطات بسيطة', 'بلع آمن'],
          },
        ],
      },
    ],
  },

  // 24 — اختبار تقييم التأهيل المهني لذوي الإعاقة
  {
    id: 'vocationalRehabAssessment',
    name: 'اختبار تقييم التأهيل المهني لذوي الإعاقة',
    nameEn: 'Vocational Rehabilitation Assessment for PWD',
    description:
      'تقييم القدرات المهنية والتأهيلية لتحديد مسار التوظيف المناسب لذوي الإعاقة في سوق العمل',
    ageRange: '16+',
    version: '1.0',
    icon: 'Work',
    color: '#37474f',
    categories: [
      {
        key: 'workCapacity',
        name: 'القدرة على العمل',
        items: [
          {
            key: 'physical_demands',
            name: 'تحمل المتطلبات البدنية',
            levels: ['لا يتحمل', 'أعمال جلوس خفيفة فقط', 'أعمال خفيفة', 'أعمال متوسطة', 'أعمال متنوعة'],
          },
          {
            key: 'sustained_attention',
            name: 'الانتباه المستمر',
            levels: ['أقل من 5 دقائق', '5-15 دقيقة', '15-30 دقيقة', '30-60 دقيقة', 'أكثر من ساعة'],
          },
          {
            key: 'task_completion',
            name: 'إكمال المهام',
            levels: ['لا يكمل', 'مهام بسيطة جداً بتوجيه', 'مهام بسيطة مستقلاً', 'مهام متوسطة', 'مهام معقدة'],
          },
          {
            key: 'work_pace',
            name: 'وتيرة العمل',
            levels: ['بطيء جداً', 'بطيء', 'يحتاج وقت إضافي', 'متوسط', 'يلبي المعدل المطلوب'],
          },
          {
            key: 'work_quality',
            name: 'جودة العمل',
            levels: ['لا يلبي المعايير', 'أقل من المعيار', 'يلبي بإشراف', 'يلبي المعايير', 'يتخطى المعايير'],
          },
        ],
      },
      {
        key: 'workBehaviors',
        name: 'السلوكيات المهنية',
        items: [
          {
            key: 'punctuality',
            name: 'الالتزام بالمواعيد',
            levels: ['لا يلتزم', 'يتأخر كثيراً', 'يتأخر أحياناً', 'نادراً ما يتأخر', 'دائم الالتزام'],
          },
          {
            key: 'workplace_rules',
            name: 'اتباع قواعد العمل',
            levels: ['لا يفهم القواعد', 'يحتاج تذكير دائم', 'يحتاج تذكير أحياناً', 'يتبع معظم القواعد', 'يتبع جميع القواعد'],
          },
          {
            key: 'coworker_interaction',
            name: 'التفاعل مع زملاء العمل',
            levels: ['لا يتفاعل', 'يتفاعل بتوجيه', 'تفاعل محدود', 'تفاعل جيد', 'تفاعل ممتاز وتعاوني'],
          },
          {
            key: 'supervision_needed',
            name: 'مستوى الإشراف المطلوب',
            levels: ['إشراف كامل 1:1', 'إشراف مكثف', 'إشراف متكرر', 'إشراف دوري', 'مستقل'],
          },
        ],
      },
      {
        key: 'workplaceAccommodations',
        name: 'التعديلات والتسهيلات المطلوبة',
        items: [
          {
            key: 'physical_modifications',
            name: 'التعديلات البيئية المادية',
            levels: ['تعديلات جذرية', 'تعديلات كبيرة', 'تعديلات متوسطة', 'تعديلات بسيطة', 'لا يحتاج تعديلات'],
          },
          {
            key: 'assistive_tech_work',
            name: 'التقنيات المساعدة للعمل',
            levels: ['يحتاج تقنيات متعددة ومعقدة', 'تقنيات متخصصة', 'تقنيات بسيطة', 'برامج معدلة فقط', 'لا يحتاج تقنيات'],
          },
          {
            key: 'schedule_flexibility',
            name: 'مرونة جدول العمل',
            levels: ['ساعات مرنة ومخفضة جداً', 'دوام جزئي مخفض', 'دوام جزئي عادي', 'دوام كامل مع استراحات', 'دوام كامل عادي'],
          },
          {
            key: 'job_coaching',
            name: 'الحاجة للتدريب أثناء العمل',
            levels: ['مدرب مهني دائم', 'مدرب مهني مكثف', 'تدريب أولي مطول', 'تدريب أولي عادي', 'لا يحتاج دعم إضافي'],
          },
        ],
      },
    ],
  },

  // 25 — اختبار تقييم جودة الحياة لذوي الإعاقة
  {
    id: 'disabilityQoLAssessment',
    name: 'اختبار تقييم جودة الحياة لذوي الإعاقة',
    nameEn: 'Disability Quality of Life Assessment',
    description:
      'تقييم شامل لجودة الحياة من منظور ذوي الإعاقة عبر ثمانية مجالات: الرفاهية المادية والعاطفية والعلاقات والتضمين المجتمعي والحقوق',
    ageRange: '12+',
    version: '1.0',
    icon: 'Favorite',
    color: '#c62828',
    categories: [
      {
        key: 'emotionalWellbeing',
        name: 'الرفاهية العاطفية',
        items: [
          {
            key: 'life_satisfaction',
            name: 'الرضا عن الحياة',
            levels: ['غير راضٍ أبداً', 'نادراً ما يكون راضياً', 'أحياناً', 'غالباً', 'دائماً راضٍ'],
          },
          {
            key: 'self_concept',
            name: 'مفهوم الذات',
            levels: ['صورة سلبية جداً', 'صورة سلبية', 'محايدة', 'إيجابية', 'إيجابية عالية'],
          },
          {
            key: 'stress_management',
            name: 'إدارة التوتر والضغوط',
            levels: ['لا يستطيع التعامل', 'يتعامل بصعوبة شديدة', 'يحتاج دعماً', 'يتعامل جيداً', 'يتعامل باستقلالية'],
          },
          {
            key: 'emotional_stability',
            name: 'الاستقرار العاطفي',
            levels: ['تقلبات حادة متكررة', 'تقلبات ملحوظة', 'تقلبات أحياناً', 'مستقر غالباً', 'مستقر دائماً'],
          },
        ],
      },
      {
        key: 'socialInclusion',
        name: 'الاندماج المجتمعي',
        items: [
          {
            key: 'community_participation',
            name: 'المشاركة المجتمعية',
            levels: ['معزول تماماً', 'مشاركة نادرة ومحدودة', 'مشاركة بدعم', 'مشاركة منتظمة', 'مشاركة فعالة ومتنوعة'],
          },
          {
            key: 'social_network',
            name: 'شبكة العلاقات الاجتماعية',
            levels: ['لا علاقات', 'أفراد الأسرة فقط', 'بعض الأصدقاء', 'شبكة جيدة', 'شبكة واسعة ومتنوعة'],
          },
          {
            key: 'recreation_leisure',
            name: 'الأنشطة الترفيهية',
            levels: ['لا يشارك', 'أنشطة منزلية فقط', 'أنشطة محدودة', 'أنشطة متنوعة', 'أنشطة غنية ومتوازنة'],
          },
          {
            key: 'acceptance',
            name: 'القبول والتقدير المجتمعي',
            levels: ['رفض وتمييز', 'قبول محدود', 'قبول في دوائر معينة', 'قبول عام', 'تقدير واحتواء كامل'],
          },
        ],
      },
      {
        key: 'rightsEmpowerment',
        name: 'الحقوق والتمكين',
        items: [
          {
            key: 'rights_awareness',
            name: 'الوعي بالحقوق',
            levels: ['لا يعرف حقوقه', 'معرفة جزئية', 'يعرف الحقوق الأساسية', 'يعرف معظم حقوقه', 'وعي كامل ودفاع عن الحقوق'],
          },
          {
            key: 'self_determination',
            name: 'تقرير المصير',
            levels: ['الآخرون يقررون كلياً', 'مشاركة بسيطة', 'مشاركة في بعض القرارات', 'يقرر معظم أموره', 'يقرر جميع أموره'],
          },
          {
            key: 'accessibility',
            name: 'إمكانية الوصول',
            levels: ['عوائق كثيرة', 'عوائق متعددة', 'وصول جزئي', 'وصول جيد', 'وصول كامل ميسر'],
          },
          {
            key: 'autonomy',
            name: 'الاستقلالية في اتخاذ القرارات',
            levels: ['اعتماد كامل', 'بدعم مكثف', 'بدعم أحياناً', 'مستقل غالباً', 'مستقل تماماً'],
          },
        ],
      },
      {
        key: 'materialWellbeing',
        name: 'الرفاهية المادية',
        items: [
          {
            key: 'employment_status',
            name: 'الوضع الوظيفي',
            levels: ['غير موظف وغير مؤهل', 'في تدريب مهني', 'عمل محمي', 'عمل جزئي', 'عمل كامل منتج'],
          },
          {
            key: 'financial_security',
            name: 'الأمان المالي',
            levels: ['يعتمد كلياً على الإعانات', 'إعانات + دعم أسري', 'دخل محدود', 'دخل مستقر', 'أمان مالي كامل'],
          },
          {
            key: 'living_conditions',
            name: 'ظروف السكن',
            levels: ['غير ملائمة', 'ملائمة جزئياً', 'مقبولة', 'جيدة', 'ممتازة ومُيسرة'],
          },
        ],
      },
    ],
  },
];

export default ASSESSMENT_TESTS;
