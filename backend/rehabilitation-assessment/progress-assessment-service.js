/* eslint-disable no-unused-vars */
/**
 * Progress Assessment Service for Disability Rehabilitation
 * خدمة تقييم التقدم الشاملة لتأهيل ذوي الإعاقة
 */

class ProgressAssessmentService {
  constructor() {
    this.assessments = new Map();
    this.progress = new Map();
    this.milestones = new Map();
  }

  // ==========================================
  // أدوات التقييم المعتمدة
  // ==========================================
  getAssessmentTools() {
    return {
      // مقياس التطور الاجتماعي
      socialDevelopment: {
        id: 'social_development',
        name: 'مقياس التطور الاجتماعي',
        nameEn: 'Social Development Scale',
        version: '2.0',
        applicableAges: '3-18',

        domains: {
          socialInteraction: {
            name: 'التفاعل الاجتماعي',
            skills: [
              {
                id: 'eye_contact',
                name: 'التواصل البصري',
                levels: ['never', 'rarely', 'sometimes', 'often', 'always'],
              },
              {
                id: 'sharing',
                name: 'المشاركة مع الآخرين',
                levels: ['never', 'with_prompt', 'independent', 'initiates'],
              },
              {
                id: 'turn_taking',
                name: 'أخذ الأدوار',
                levels: ['needs_support', 'verbal_prompt', 'independent'],
              },
            ],
          },
          communication: {
            name: 'التواصل',
            skills: [
              {
                id: 'verbal_requests',
                name: 'الطلبات اللفظية',
                levels: ['nonverbal', 'single_word', 'phrases', 'sentences'],
              },
              {
                id: 'comprehension',
                name: 'الفهم السمعي',
                levels: ['none', 'simple', 'moderate', 'complex'],
              },
              {
                id: 'expression',
                name: 'التعبير عن النفس',
                levels: ['limited', 'basic', 'adequate', 'fluent'],
              },
            ],
          },
        },
      },

      // مقياس المهارات الحياتية
      dailyLivingSkills: {
        id: 'daily_living_skills',
        name: 'مقياس المهارات الحياتية اليومية',
        version: '1.5',

        categories: {
          selfCare: {
            name: 'الاعتناء بالنفس',
            skills: ['dressing', 'eating', 'toileting', 'grooming', 'bathing'],
            levels: {
              1: 'يحتاج مساعدة كاملة',
              2: 'يحتاج مساعدة جزئية',
              3: 'يحتاج إشراف',
              4: 'مستقل',
            },
          },
          mobility: {
            name: 'الحركة والتنقل',
            skills: ['walking', 'stairs', 'transfers', 'wheelchair_use'],
            levels: {
              1: 'غير قادر',
              2: 'بمساعدة',
              3: 'بإشراف',
              4: 'مستقل',
            },
          },
          homeLiving: {
            name: 'الحياة المنزلية',
            skills: ['meal_prep', 'cleaning', 'laundry', 'money_management'],
            levels: {
              1: 'لا يستطيع',
              2: 'بمساعدة كبيرة',
              3: 'بمساعدة بسيطة',
              4: 'مستقل',
            },
          },
        },
      },

      // مقياس السلوك التكيفي
      adaptiveBehavior: {
        id: 'adaptive_behavior',
        name: 'مقياس السلوك التكيفي',

        domains: {
          conceptual: {
            name: 'المفاهيم',
            subdomains: ['communication', 'functional_academics', 'self_direction'],
          },
          social: {
            name: 'المهارات الاجتماعية',
            subdomains: ['leisure', 'social', 'self_direction'],
          },
          practical: {
            name: 'الممارسة',
            subdomains: ['self_care', 'home_living', 'community_use', 'health_safety'],
          },
        },
      },

      // ── الاختبارات الجديدة ──

      // اختبار المهارات اللغوية
      languageSkills: {
        id: 'language_skills',
        name: 'اختبار المهارات اللغوية',
        nameEn: 'Language Skills Test',
        version: '1.0',
        applicableAges: '2-16',
        domains: {
          receptiveLanguage: {
            name: 'اللغة الاستقبالية',
            skills: [
              {
                id: 'word_comprehension',
                name: 'فهم المفردات',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'sentence_comprehension',
                name: 'فهم الجمل',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'instruction_following',
                name: 'اتباع التعليمات',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'story_comprehension',
                name: 'فهم القصص',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
            ],
          },
          expressiveLanguage: {
            name: 'اللغة التعبيرية',
            skills: [
              {
                id: 'naming',
                name: 'التسمية',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'sentence_formation',
                name: 'تكوين الجمل',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'narration',
                name: 'السرد والحكي',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'vocabulary_use',
                name: 'استخدام المفردات',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
            ],
          },
          pragmaticLanguage: {
            name: 'اللغة البراغماتية',
            skills: [
              {
                id: 'greetings',
                name: 'التحية والوداع',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'topic_maintenance',
                name: 'الحفاظ على الموضوع',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'turn_taking_verbal',
                name: 'تبادل الأدوار الكلامية',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
              {
                id: 'context_adaptation',
                name: 'التكيف مع السياق',
                levels: ['absent', 'limited', 'moderate', 'good', 'excellent'],
              },
            ],
          },
        },
      },

      // اختبار التكامل الحسي
      sensoryIntegration: {
        id: 'sensory_integration',
        name: 'اختبار التكامل الحسي',
        nameEn: 'Sensory Integration Test',
        version: '1.0',
        applicableAges: '3-14',
        domains: {
          tactileProcessing: {
            name: 'المعالجة اللمسية',
            skills: [
              {
                id: 'light_touch',
                name: 'اللمس الخفيف',
                levels: ['defensive', 'sensitive', 'typical', 'seeking'],
              },
              {
                id: 'texture_tolerance',
                name: 'تحمل الملمس',
                levels: ['defensive', 'sensitive', 'typical', 'seeking'],
              },
              {
                id: 'temperature_response',
                name: 'الاستجابة للحرارة',
                levels: ['defensive', 'sensitive', 'typical', 'seeking'],
              },
              {
                id: 'pain_response',
                name: 'الاستجابة للألم',
                levels: ['over', 'high', 'typical', 'low'],
              },
            ],
          },
          vestibularProcessing: {
            name: 'المعالجة الدهليزية',
            skills: [
              {
                id: 'motion_tolerance',
                name: 'تحمل الحركة',
                levels: ['hypersensitive', 'sensitive', 'typical', 'seeking'],
              },
              {
                id: 'balance_static',
                name: 'التوازن الثابت',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
              {
                id: 'balance_dynamic',
                name: 'التوازن الديناميكي',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
              {
                id: 'gravitational_security',
                name: 'الأمان الجاذبي',
                levels: ['severe_anxiety', 'anxious', 'comfortable', 'confident'],
              },
            ],
          },
          proprioceptiveProcessing: {
            name: 'معالجة الحس العميق',
            skills: [
              {
                id: 'body_awareness',
                name: 'الوعي بالجسم',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
              {
                id: 'force_grading',
                name: 'تدرج القوة',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
              {
                id: 'motor_planning',
                name: 'التخطيط الحركي',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
              {
                id: 'postural_control',
                name: 'التحكم الوضعي',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
            ],
          },
        },
      },

      // اختبار المهارات الحركية الدقيقة
      fineMotorSkills: {
        id: 'fine_motor_skills',
        name: 'اختبار المهارات الحركية الدقيقة',
        nameEn: 'Fine Motor Skills Test',
        version: '1.0',
        applicableAges: '3-18',
        domains: {
          graspPatterns: {
            name: 'أنماط القبض',
            skills: [
              {
                id: 'palmar_grasp',
                name: 'القبض الراحي',
                levels: ['absent', 'emerging', 'functional', 'mature'],
              },
              {
                id: 'pincer_grasp',
                name: 'القبض الدقيق',
                levels: ['absent', 'emerging', 'functional', 'mature'],
              },
              {
                id: 'tripod_grasp',
                name: 'القبض الثلاثي',
                levels: ['absent', 'emerging', 'functional', 'mature'],
              },
              {
                id: 'release_control',
                name: 'التحكم بالإفلات',
                levels: ['absent', 'emerging', 'functional', 'mature'],
              },
            ],
          },
          handEyeCoordination: {
            name: 'التنسيق اليدوي البصري',
            skills: [
              {
                id: 'reaching',
                name: 'المدّ والوصول',
                levels: ['absent', 'inaccurate', 'moderate', 'accurate'],
              },
              {
                id: 'stacking',
                name: 'التكديس',
                levels: ['unable', '2_blocks', '4_6_blocks', '8_plus'],
              },
              {
                id: 'threading',
                name: 'اللضم والتخريز',
                levels: ['unable', 'large_beads', 'small_beads', 'needle_thread'],
              },
              {
                id: 'cutting',
                name: 'القص بالمقص',
                levels: ['absent', 'open_close', 'straight_line', 'shapes'],
              },
            ],
          },
          writingSkills: {
            name: 'مهارات الكتابة',
            skills: [
              {
                id: 'pencil_grip',
                name: 'مسكة القلم',
                levels: ['palmar', 'digital', 'near_tripod', 'mature_tripod'],
              },
              {
                id: 'drawing_shapes',
                name: 'رسم الأشكال',
                levels: ['scribble', 'lines', 'simple_shapes', 'complex_shapes'],
              },
              {
                id: 'letter_formation',
                name: 'تشكيل الحروف',
                levels: ['absent', 'imitation', 'copy', 'independent'],
              },
              {
                id: 'writing_speed',
                name: 'سرعة الكتابة',
                levels: ['very_slow', 'slow', 'moderate', 'age_appropriate'],
              },
            ],
          },
        },
      },

      // اختبار الميول والقدرات المهنية
      vocationalAptitude: {
        id: 'vocational_aptitude',
        name: 'اختبار الميول والقدرات المهنية',
        nameEn: 'Vocational Aptitude Test',
        version: '1.0',
        applicableAges: '14+',
        domains: {
          workInterests: {
            name: 'الميول المهنية',
            skills: [
              {
                id: 'manual_work',
                name: 'الأعمال اليدوية',
                levels: ['not_interested', 'somewhat', 'interested', 'passionate'],
              },
              {
                id: 'clerical_work',
                name: 'الأعمال المكتبية',
                levels: ['not_interested', 'somewhat', 'interested', 'passionate'],
              },
              {
                id: 'service_work',
                name: 'الأعمال الخدمية',
                levels: ['not_interested', 'somewhat', 'interested', 'passionate'],
              },
              {
                id: 'technical_work',
                name: 'الأعمال التقنية',
                levels: ['not_interested', 'somewhat', 'interested', 'passionate'],
              },
              {
                id: 'creative_work',
                name: 'الأعمال الإبداعية',
                levels: ['not_interested', 'somewhat', 'interested', 'passionate'],
              },
            ],
          },
          workCapacities: {
            name: 'القدرات العملية',
            skills: [
              {
                id: 'following_instructions',
                name: 'اتباع التعليمات',
                levels: ['unable', 'simple', 'multi_step', 'complex'],
              },
              {
                id: 'task_completion',
                name: 'إكمال المهام',
                levels: ['does_not_complete', 'with_reminders', 'supervised', 'independent'],
              },
              {
                id: 'time_management',
                name: 'إدارة الوقت',
                levels: ['absent', 'poor', 'moderate', 'good'],
              },
              {
                id: 'quality_awareness',
                name: 'الوعي بالجودة',
                levels: ['absent', 'limited', 'moderate', 'good'],
              },
            ],
          },
          workBehaviors: {
            name: 'السلوك المهني',
            skills: [
              {
                id: 'punctuality',
                name: 'الالتزام بالمواعيد',
                levels: ['irregular', 'sometimes', 'usually', 'always'],
              },
              {
                id: 'attendance',
                name: 'الحضور والانتظام',
                levels: ['poor', 'intermittent', 'mostly_regular', 'always_regular'],
              },
              {
                id: 'peer_interaction',
                name: 'التعامل مع الزملاء',
                levels: ['conflict', 'difficulty', 'acceptable', 'cooperative'],
              },
              {
                id: 'supervisor_interaction',
                name: 'التعامل مع المشرف',
                levels: ['refusal', 'resistance', 'acceptance', 'responsive'],
              },
            ],
          },
        },
      },

      // اختبار الأداء التعليمي
      educationalPerformance: {
        id: 'educational_performance',
        name: 'اختبار الأداء التعليمي',
        nameEn: 'Educational Performance Test',
        version: '1.0',
        applicableAges: '5-18',
        domains: {
          readingSkills: {
            name: 'مهارات القراءة',
            skills: [
              {
                id: 'letter_recognition',
                name: 'التعرف على الحروف',
                levels: ['absent', 'some', 'most', 'all'],
              },
              {
                id: 'word_reading',
                name: 'قراءة الكلمات',
                levels: ['absent', 'sight_words', 'decoding', 'fluent'],
              },
              {
                id: 'text_comprehension',
                name: 'فهم المقروء',
                levels: ['absent', 'literal', 'inferential', 'critical'],
              },
            ],
          },
          mathSkills: {
            name: 'المهارات الحسابية',
            skills: [
              {
                id: 'number_concepts',
                name: 'مفاهيم الأعداد',
                levels: ['absent', 'counting', 'place_value', 'advanced'],
              },
              {
                id: 'basic_operations',
                name: 'العمليات الأساسية',
                levels: ['absent', 'add_subtract', 'multiply_divide', 'fractions'],
              },
              {
                id: 'problem_solving_math',
                name: 'حل المسائل',
                levels: ['absent', 'simple', 'multi_step', 'applied'],
              },
            ],
          },
          learningBehaviors: {
            name: 'سلوكيات التعلم',
            skills: [
              {
                id: 'attention_in_class',
                name: 'الانتباه في الصف',
                levels: ['always_distracted', 'intermittent', 'mostly_attentive', 'attentive'],
              },
              {
                id: 'task_persistence',
                name: 'المثابرة على المهام',
                levels: [
                  'quits_immediately',
                  'short_attempt',
                  'completes_with_support',
                  'independent',
                ],
              },
              {
                id: 'homework_completion',
                name: 'إكمال الواجبات',
                levels: ['never', 'sometimes', 'usually', 'always'],
              },
              {
                id: 'classroom_participation',
                name: 'المشاركة الصفية',
                levels: ['none', 'with_encouragement', 'sometimes', 'initiates'],
              },
            ],
          },
        },
      },

      // اختبار الإدراك البصري
      visualPerceptual: {
        id: 'visual_perceptual',
        name: 'اختبار الإدراك البصري',
        nameEn: 'Visual Perceptual Skills Test',
        version: '1.0',
        applicableAges: '4-14',
        domains: {
          visualDiscrimination: {
            name: 'التمييز البصري',
            skills: [
              {
                id: 'matching',
                name: 'المطابقة',
                levels: ['absent', 'simple_shapes', 'complex_shapes', 'fine_details'],
              },
              {
                id: 'form_constancy',
                name: 'ثبات الشكل',
                levels: ['absent', 'different_sizes', 'different_angles', 'multiple_contexts'],
              },
              {
                id: 'figure_ground',
                name: 'الشكل والخلفية',
                levels: ['absent', 'simple_bg', 'moderate_bg', 'cluttered_bg'],
              },
            ],
          },
          spatialRelations: {
            name: 'العلاقات المكانية',
            skills: [
              {
                id: 'position_in_space',
                name: 'الموقع في الفراغ',
                levels: ['absent', 'left_right', 'plus_up_down', 'complex_directions'],
              },
              {
                id: 'spatial_orientation',
                name: 'التوجه المكاني',
                levels: ['absent', 'on_table', 'in_room', 'in_building'],
              },
              {
                id: 'depth_perception',
                name: 'إدراك العمق',
                levels: ['very_poor', 'poor', 'moderate', 'good'],
              },
            ],
          },
          visualMemory: {
            name: 'الذاكرة البصرية',
            skills: [
              {
                id: 'short_term_visual',
                name: 'الذاكرة البصرية قصيرة المدى',
                levels: ['1_item', '2_items', '3_4_items', '5_plus'],
              },
              {
                id: 'sequential_memory',
                name: 'الذاكرة التسلسلية',
                levels: ['2_steps', '3_steps', '4_steps', '5_plus'],
              },
              {
                id: 'pattern_recognition',
                name: 'التعرف على الأنماط',
                levels: ['absent', 'simple', 'moderate', 'complex'],
              },
            ],
          },
        },
      },

      // اختبار التحليل الوظيفي للسلوك
      behavioralFunctional: {
        id: 'behavioral_functional',
        name: 'اختبار التحليل الوظيفي للسلوك',
        nameEn: 'Behavioral Functional Analysis Test',
        version: '1.0',
        applicableAges: 'all',
        domains: {
          behaviorTopography: {
            name: 'وصف السلوك',
            skills: [
              {
                id: 'frequency',
                name: 'التكرار',
                levels: ['rare', 'sometimes', 'frequent', 'constant'],
              },
              {
                id: 'intensity',
                name: 'الشدة',
                levels: ['mild', 'moderate', 'severe', 'dangerous'],
              },
              {
                id: 'duration',
                name: 'المدة',
                levels: ['under_1min', '1_5min', '5_15min', 'over_15min'],
              },
              {
                id: 'latency',
                name: 'زمن الاستجابة',
                levels: ['immediate', 'under_5s', '5_30s', 'over_30s'],
              },
            ],
          },
          antecedents: {
            name: 'المحفزات السابقة',
            skills: [
              {
                id: 'environmental_triggers',
                name: 'المحفزات البيئية',
                levels: ['none', 'noise_crowd', 'routine_change', 'sensory_deprivation'],
              },
              {
                id: 'social_triggers',
                name: 'المحفزات الاجتماعية',
                levels: ['none', 'task_demand', 'activity_denied', 'ignored'],
              },
              {
                id: 'biological_triggers',
                name: 'المحفزات البيولوجية',
                levels: ['none', 'fatigue_hunger', 'pain', 'medication'],
              },
            ],
          },
          behaviorFunction: {
            name: 'وظيفة السلوك',
            skills: [
              {
                id: 'attention_seeking',
                name: 'الحصول على الانتباه',
                levels: ['unrelated', 'possible', 'likely', 'primary'],
              },
              {
                id: 'escape_avoidance',
                name: 'الهروب/التجنب',
                levels: ['unrelated', 'possible', 'likely', 'primary'],
              },
              {
                id: 'tangible_access',
                name: 'الحصول على شيء ملموس',
                levels: ['unrelated', 'possible', 'likely', 'primary'],
              },
              {
                id: 'sensory_stimulation',
                name: 'التحفيز الذاتي/الحسي',
                levels: ['unrelated', 'possible', 'likely', 'primary'],
              },
            ],
          },
          interventionResponse: {
            name: 'الاستجابة للتدخل',
            skills: [
              {
                id: 'verbal_redirection',
                name: 'التوجيه اللفظي',
                levels: ['no_response', 'sometimes', 'usually', 'always'],
              },
              {
                id: 'visual_supports',
                name: 'الدعم البصري',
                levels: ['no_response', 'sometimes', 'usually', 'always'],
              },
              {
                id: 'alternative_behavior',
                name: 'السلوك البديل',
                levels: ['refuses', 'with_physical', 'with_modeling', 'independent'],
              },
              {
                id: 'calming_strategies',
                name: 'استراتيجيات التهدئة',
                levels: [
                  'ineffective',
                  'sometimes_effective',
                  'usually_effective',
                  'always_effective',
                ],
              },
            ],
          },
        },
      },
    };
  }

  // ==========================================
  // إنشاء تقييم جديد
  // ==========================================
  async createAssessment(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      type: assessmentData.type,
      date: new Date(),
      assessor: assessmentData.assessorId,
      status: 'in_progress',

      baseline: await this._collectBaseline(beneficiaryId, assessmentData.type),
      domains: {},
      scores: {},
      recommendations: [],

      metadata: {
        session: assessmentData.session || 1,
        previousAssessment: assessmentData.previousAssessmentId,
      },
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  async _collectBaseline(beneficiaryId, assessmentType) {
    return {
      healthStatus: 'stable',
      medicationEffects: 'none',
      recentEvents: [],
      environmentalFactors: [],
    };
  }

  // ==========================================
  // تسجيل نتائج التقييم
  // ==========================================
  async recordDomainScore(assessmentId, domain, scores) {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    assessment.domains[domain] = {
      scores,
      maxPossible: this._getMaxScore(assessment.type, domain),
      percentage: this._calculatePercentage(scores, domain),
      level: this._determineLevel(scores, domain),
      timestamp: new Date(),
    };

    // تحديث النتيجة الإجمالية
    assessment.scores = this._calculateOverallScores(assessment.domains);

    return assessment;
  }

  _getMaxScore(assessmentType, domain) {
    const maxScores = {
      social_development: 100,
      daily_living_skills: 40,
      adaptive_behavior: 100,
      language_skills: 100,
      sensory_integration: 100,
      fine_motor_skills: 100,
      vocational_aptitude: 100,
      educational_performance: 100,
      visual_perceptual: 100,
      behavioral_functional: 100,
    };
    return maxScores[domain] || 100;
  }

  _calculatePercentage(scores, domain) {
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const max = Object.keys(scores).length * 4; // افتراض 4 مستويات
    return Math.round((total / max) * 100);
  }

  _determineLevel(scores, domain) {
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

    if (avg >= 3.5) return 'advanced';
    if (avg >= 2.5) return 'intermediate';
    if (avg >= 1.5) return 'basic';
    return 'emerging';
  }

  _calculateOverallScores(domains) {
    const domainNames = Object.keys(domains);
    const totalPercentage = domainNames.reduce((sum, d) => sum + domains[d].percentage, 0);

    return {
      overallPercentage: Math.round(totalPercentage / domainNames.length),
      domainsCount: domainNames.length,
      overallLevel: this._getOverallLevel(totalPercentage / domainNames.length),
    };
  }

  _getOverallLevel(percentage) {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'moderate';
    if (percentage >= 40) return 'low';
    return 'significant_support_needed';
  }

  // ==========================================
  // إنشاء التوصيات التلقائية
  // ==========================================
  async generateRecommendations(assessmentId) {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const recommendations = [];

    // تحليل كل مجال
    for (const [domain, data] of Object.entries(assessment.domains)) {
      if (data.percentage < 50) {
        recommendations.push({
          domain,
          priority: 'high',
          type: 'intensive_intervention',
          description: `برنامج تدخل مكثف في ${data.level}`,
          suggestedActivities: this._getSuggestedActivities(domain, data.level),
          frequency: 'daily',
          duration: '30-45 minutes',
        });
      } else if (data.percentage < 70) {
        recommendations.push({
          domain,
          priority: 'medium',
          type: 'focused_practice',
          description: 'تدريب مركز على المهارات الضعيفة',
          suggestedActivities: this._getSuggestedActivities(domain, data.level),
          frequency: '3-4 times/week',
          duration: '20-30 minutes',
        });
      } else {
        recommendations.push({
          domain,
          priority: 'maintenance',
          type: 'maintenance',
          description: 'الحفاظ على المستوى الحالي',
          suggestedActivities: this._getSuggestedActivities(domain, 'maintenance'),
          frequency: 'weekly',
          duration: '15-20 minutes',
        });
      }
    }

    assessment.recommendations = recommendations;
    return recommendations;
  }

  _getSuggestedActivities(domain, level) {
    const activities = {
      social_development: {
        emerging: ['ألعاب التواصل البصري', 'أنشطة المشاركة البسيطة'],
        basic: ['تمارين أخذ الأدوار', 'ألعاب جماعية موجهة'],
        intermediate: ['أنشطة المجموعات الصغيرة', 'لعب الأدوار'],
        advanced: ['المشاركة في الفعاليات المجتمعية', 'القيادة والمبادرة'],
      },
      daily_living_skills: {
        emerging: ['تمارين المهارات الأساسية', 'المساعدة التدريجية'],
        basic: ['تدريب على الاعتناء بالنفس', 'روتين يومي مبسط'],
        intermediate: ['مهارات منزلية بسيطة', 'استقلالية جزئية'],
        advanced: ['مهارات حياتية متقدمة', 'اتخاذ القرارات'],
      },
    };

    return activities[domain]?.[level] || ['أنشطة داعمة عامة'];
  }

  // ==========================================
  // تتبع التقدم
  // ==========================================
  async trackProgress(beneficiaryId, period = 'monthly') {
    const beneficiaryAssessments = Array.from(this.assessments.values())
      .filter(a => a.beneficiaryId === beneficiaryId && a.status === 'completed')
      .sort((a, b) => a.date - b.date);

    if (beneficiaryAssessments.length < 2) {
      return {
        message: 'تحتاج على الأقل تقييمين لتتبع التقدم',
        currentStatus: beneficiaryAssessments[0]?.scores || null,
      };
    }

    const progress = {
      beneficiaryId,
      period,
      startDate: beneficiaryAssessments[0].date,
      endDate: beneficiaryAssessments[beneficiaryAssessments.length - 1].date,
      assessmentsCount: beneficiaryAssessments.length,

      overall: this._calculateOverallProgress(beneficiaryAssessments),
      byDomain: this._calculateDomainProgress(beneficiaryAssessments),

      milestones: this._identifyMilestones(beneficiaryAssessments),
      trends: this._analyzeTrends(beneficiaryAssessments),

      nextSteps: await this._suggestNextSteps(beneficiaryId, beneficiaryAssessments),
    };

    this.progress.set(beneficiaryId, progress);
    return progress;
  }

  _calculateOverallProgress(assessments) {
    const first = assessments[0].scores.overallPercentage;
    const last = assessments[assessments.length - 1].scores.overallPercentage;

    return {
      startScore: first,
      currentScore: last,
      change: last - first,
      changePercent: Math.round(((last - first) / first) * 100),
      direction: last > first ? 'improving' : last < first ? 'declining' : 'stable',
    };
  }

  _calculateDomainProgress(assessments) {
    const domains = {};
    const domainNames = [...new Set(assessments.flatMap(a => Object.keys(a.domains)))];

    for (const domain of domainNames) {
      const scores = assessments
        .filter(a => a.domains[domain])
        .map(a => ({ date: a.date, score: a.domains[domain].percentage }));

      if (scores.length >= 2) {
        domains[domain] = {
          startScore: scores[0].score,
          currentScore: scores[scores.length - 1].score,
          change: scores[scores.length - 1].score - scores[0].score,
          trend: this._getTrend(scores),
        };
      }
    }

    return domains;
  }

  _getTrend(scores) {
    if (scores.length < 3) return 'insufficient_data';

    const recent = scores.slice(-3);
    const increasing = recent.every((s, i) => i === 0 || s.score >= recent[i - 1].score);
    const decreasing = recent.every((s, i) => i === 0 || s.score <= recent[i - 1].score);

    if (increasing) return 'improving';
    if (decreasing) return 'declining';
    return 'fluctuating';
  }

  _identifyMilestones(assessments) {
    const milestones = [];

    for (let i = 1; i < assessments.length; i++) {
      const prev = assessments[i - 1];
      const curr = assessments[i];

      // تحسين بنسبة 10% أو أكثر
      if (curr.scores.overallPercentage - prev.scores.overallPercentage >= 10) {
        milestones.push({
          type: 'significant_improvement',
          date: curr.date,
          description: `تحسن ملحوظ بنسبة ${curr.scores.overallPercentage - prev.scores.overallPercentage}%`,
          previousLevel: prev.scores.overallLevel,
          currentLevel: curr.scores.overallLevel,
        });
      }

      // الانتقال لمستوى جديد
      if (prev.scores.overallLevel !== curr.scores.overallLevel) {
        milestones.push({
          type: 'level_change',
          date: curr.date,
          description: `الانتقال من مستوى ${prev.scores.overallLevel} إلى ${curr.scores.overallLevel}`,
          level: curr.scores.overallLevel,
        });
      }
    }

    return milestones;
  }

  _analyzeTrends(assessments) {
    return {
      consistency: this._analyzeConsistency(assessments),
      pace: this._analyzePace(assessments),
      prediction: this._predictFutureProgress(assessments),
    };
  }

  _analyzeConsistency(assessments) {
    const scores = assessments.map(a => a.scores.overallPercentage);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;

    if (variance < 25) return 'consistent';
    if (variance < 100) return 'moderate_variation';
    return 'high_variation';
  }

  _analyzePace(assessments) {
    if (assessments.length < 2) return 'unknown';

    const totalChange =
      assessments[assessments.length - 1].scores.overallPercentage -
      assessments[0].scores.overallPercentage;
    const daysDiff =
      (assessments[assessments.length - 1].date - assessments[0].date) / (1000 * 60 * 60 * 24);

    if (daysDiff === 0) return 'unknown';

    const monthlyRate = (totalChange / daysDiff) * 30;

    if (monthlyRate >= 5) return 'fast';
    if (monthlyRate >= 2) return 'moderate';
    if (monthlyRate >= 0) return 'slow';
    return 'declining';
  }

  _predictFutureProgress(assessments) {
    const scores = assessments.map(a => a.scores.overallPercentage);
    const avgGrowth =
      scores.slice(-3).reduce((sum, s, i, arr) => {
        if (i === 0) return 0;
        return sum + (s - arr[i - 1]);
      }, 0) / (scores.length - 1 || 1);

    const currentScore = scores[scores.length - 1];
    const predictedScore = Math.min(100, Math.max(0, currentScore + avgGrowth * 3));

    return {
      currentScore,
      predictedScoreIn3Months: Math.round(predictedScore),
      confidence: scores.length >= 3 ? 'high' : 'moderate',
    };
  }

  async _suggestNextSteps(beneficiaryId, assessments) {
    const latest = assessments[assessments.length - 1];
    const steps = [];

    // بناءً على أضعف المجالات
    for (const [domain, data] of Object.entries(latest.domains)) {
      if (data.percentage < 50) {
        steps.push({
          type: 'priority_intervention',
          domain,
          action: `تعزيز مهارات ${domain}`,
          urgency: 'immediate',
        });
      }
    }

    // بناءً على التوجهات
    const trends = this._analyzeTrends(assessments);
    if (trends.consistency === 'high_variation') {
      steps.push({
        type: 'stability',
        action: 'تثبيت برنامج التدريب',
        reason: 'تذبذب في الأداء',
      });
    }

    return steps;
  }

  // ==========================================
  // التقارير
  // ==========================================
  async generateReport(beneficiaryId, reportType = 'comprehensive') {
    const assessments = Array.from(this.assessments.values()).filter(
      a => a.beneficiaryId === beneficiaryId
    );

    const progress = this.progress.get(beneficiaryId);

    switch (reportType) {
      case 'summary':
        return this._generateSummaryReport(assessments, progress);
      case 'detailed':
        return this._generateDetailedReport(assessments, progress);
      case 'progress':
        return this._generateProgressReport(progress);
      default:
        return this._generateComprehensiveReport(assessments, progress);
    }
  }

  _generateSummaryReport(assessments, progress) {
    const latest = assessments[assessments.length - 1];

    return {
      type: 'summary',
      generatedAt: new Date(),
      beneficiaryId: latest?.beneficiaryId,
      overallScore: latest?.scores.overallPercentage,
      overallLevel: latest?.scores.overallLevel,
      progressStatus: progress?.overall.direction || 'unknown',
      keyRecommendations: latest?.recommendations.slice(0, 3) || [],
    };
  }

  _generateDetailedReport(assessments, progress) {
    return {
      type: 'detailed',
      generatedAt: new Date(),
      assessmentsHistory: assessments.map(a => ({
        date: a.date,
        type: a.type,
        scores: a.scores,
        domains: a.domains,
      })),
      progressAnalysis: progress,
      recommendations: this._consolidateRecommendations(assessments),
    };
  }

  _generateProgressReport(progress) {
    return {
      type: 'progress',
      generatedAt: new Date(),
      ...progress,
    };
  }

  _generateComprehensiveReport(assessments, progress) {
    return {
      type: 'comprehensive',
      generatedAt: new Date(),
      executiveSummary: this._generateSummaryReport(assessments, progress),
      detailedAnalysis: this._generateDetailedReport(assessments, progress),
      visualData: this._prepareChartData(assessments, progress),
    };
  }

  _consolidateRecommendations(assessments) {
    const allRecs = assessments.flatMap(a => a.recommendations || []);
    const byPriority = {
      high: allRecs.filter(r => r.priority === 'high'),
      medium: allRecs.filter(r => r.priority === 'medium'),
      maintenance: allRecs.filter(r => r.priority === 'maintenance'),
    };

    return byPriority;
  }

  _prepareChartData(assessments, progress) {
    return {
      scoresOverTime: assessments.map(a => ({
        date: a.date,
        score: a.scores.overallPercentage,
      })),
      domainComparison: assessments[assessments.length - 1]?.domains || {},
      progressTrend: progress?.trends || null,
    };
  }
}

module.exports = { ProgressAssessmentService };
